import logging
from django.contrib.auth.password_validation import validate_password
from django.db import DatabaseError
from django.db import transaction
from datetime import timedelta
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import serializers

from .models import AEMUser, BroadcastMessage, Event, EventLike, Notification, Participation, UserSettings
from .participation_ops import calculate_no_show_count, count_joined_for_event


ONLINE_WINDOW = timedelta(minutes=5)
logger = logging.getLogger(__name__)


def is_data_image_url(value):
    return isinstance(value, str) and value.strip().lower().startswith('data:image/')


def sanitize_image_url(value):
    if not value:
        return None

    normalized = value.strip()
    if not normalized or is_data_image_url(normalized):
        return None

    return normalized


class UserSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()

    def get_is_owner(self, obj):
        return obj.is_owner

    class Meta:
        model = AEMUser
        fields = ('id', 'full_name', 'email', 'role', 'is_owner', 'is_active', 'created_at')
        read_only_fields = fields


class UserSettingsSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    def get_profile_image_url(self, obj):
        return sanitize_image_url(obj.profile_image_url)

    class Meta:
        model = UserSettings
        fields = ('notifications_enabled', 'theme', 'language_code', 'profile_image_url')
        read_only_fields = fields


class CurrentUserSerializer(serializers.ModelSerializer):
    settings = UserSettingsSerializer(read_only=True)
    created_events_count = serializers.SerializerMethodField()
    joined_events_count = serializers.SerializerMethodField()
    waitlisted_events_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    def get_created_events_count(self, obj):
        return obj.created_events.count()

    def get_joined_events_count(self, obj):
        return obj.participations.filter(status=Participation.Statuses.JOINED).count()

    def get_waitlisted_events_count(self, obj):
        return obj.participations.filter(status=Participation.Statuses.WAITLISTED).count()

    def get_is_owner(self, obj):
        return obj.is_owner

    class Meta:
        model = AEMUser
        fields = (
            'id',
            'full_name',
            'email',
            'role',
            'is_owner',
            'is_active',
            'created_at',
            'settings',
            'created_events_count',
            'joined_events_count',
            'waitlisted_events_count',
        )
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
    created_events_count = serializers.SerializerMethodField()
    joined_events_count = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    def get_created_events_count(self, obj):
        return obj.created_events.count()

    def get_joined_events_count(self, obj):
        return obj.participations.filter(status=Participation.Statuses.JOINED).count()

    def get_profile_image_url(self, obj):
        try:
            settings = obj.settings
        except UserSettings.DoesNotExist:
            return None
        return sanitize_image_url(settings.profile_image_url)

    def get_is_online(self, obj):
        if not obj.is_active or obj.last_seen_at is None:
            return False

        return obj.last_seen_at >= timezone.now() - ONLINE_WINDOW

    def get_is_owner(self, obj):
        return obj.is_owner

    class Meta:
        model = AEMUser
        fields = (
            'id',
            'full_name',
            'email',
            'role',
            'is_owner',
            'is_active',
            'is_online',
            'last_seen_at',
            'created_at',
            'created_events_count',
            'joined_events_count',
            'profile_image_url',
        )
        read_only_fields = fields


class SignUpSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate_full_name(self, value):
        full_name = value.strip()
        if not full_name:
            raise serializers.ValidationError('Full name is required.')
        return full_name

    def validate_email(self, value):
        email = value.strip().lower()
        if AEMUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        now = timezone.now()
        user = AEMUser(
            full_name=validated_data['full_name'],
            email=validated_data['email'],
            role=AEMUser.Roles.STUDENT,
            is_active=True,
            last_seen_at=now,
            created_at=now,
            updated_at=now,
        )
        user.set_password(validated_data['password'])
        user.save()

        UserSettings.objects.create(
            user=user,
            notifications_enabled=True,
            theme=UserSettings.Themes.LIGHT,
            language_code='en',
            profile_image_url=None,
            created_at=now,
            updated_at=now,
        )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        password = attrs['password']

        user = AEMUser.objects.filter(email__iexact=email).first()
        if user is None or not user.check_password(password):
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is inactive.'})

        attrs['user'] = user
        return attrs


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False)
    theme = serializers.ChoiceField(
        choices=[UserSettings.Themes.LIGHT, UserSettings.Themes.DARK],
        required=False,
    )
    language_code = serializers.ChoiceField(choices=['en', 'ru', 'uz'], required=False)
    notifications_enabled = serializers.BooleanField(required=False)
    profile_image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_full_name(self, value):
        full_name = value.strip()
        if not full_name:
            raise serializers.ValidationError('Full name is required.')
        return full_name

    def validate_profile_image_url(self, value):
        if value in (None, ''):
            return None

        sanitized = sanitize_image_url(value)
        if sanitized is None:
            raise serializers.ValidationError(
                'Please provide a direct profile image URL. Base64 images are not supported.',
            )
        return sanitized

    @transaction.atomic
    def update(self, instance, validated_data):
        now = timezone.now()

        if 'full_name' in validated_data:
            instance.full_name = validated_data['full_name']
            instance.updated_at = now
            instance.save(update_fields=['full_name', 'updated_at'])

        settings, _ = UserSettings.objects.get_or_create(
            user=instance,
            defaults={
                'notifications_enabled': True,
                'theme': UserSettings.Themes.LIGHT,
                'language_code': 'en',
                'profile_image_url': None,
                'created_at': now,
                'updated_at': now,
            },
        )

        settings_changed = False
        if 'theme' in validated_data:
            settings.theme = validated_data['theme']
            settings_changed = True
        if 'language_code' in validated_data:
            settings.language_code = validated_data['language_code']
            settings_changed = True
        if 'notifications_enabled' in validated_data:
            settings.notifications_enabled = validated_data['notifications_enabled']
            settings_changed = True
        if 'profile_image_url' in validated_data:
            settings.profile_image_url = validated_data['profile_image_url']
            settings_changed = True

        if settings_changed:
            settings.updated_at = now
            settings.save(
                update_fields=[
                    'theme',
                    'language_code',
                    'notifications_enabled',
                    'profile_image_url',
                    'updated_at',
                ],
            )

        return instance


class EventSerializer(serializers.ModelSerializer):
    creator_id = serializers.IntegerField(read_only=True)
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    image_url = serializers.SerializerMethodField()
    is_joined = serializers.SerializerMethodField()
    is_waitlisted = serializers.SerializerMethodField()
    waitlist_position = serializers.SerializerMethodField()
    joined_count = serializers.SerializerMethodField()
    waitlist_count = serializers.SerializerMethodField()
    checked_in_count = serializers.SerializerMethodField()
    no_show_count = serializers.SerializerMethodField()
    spots_remaining = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()

    def _safe_query_count(self, query_factory, *, fallback=0, label='query'):
        try:
            return query_factory().count()
        except DatabaseError as exc:
            logger.warning('Event serializer %s count failed: %s', label, exc)
            return fallback

    def _safe_query_exists(self, query_factory, *, fallback=False, label='query'):
        try:
            return query_factory().exists()
        except DatabaseError as exc:
            logger.warning('Event serializer %s exists check failed: %s', label, exc)
            return fallback

    def get_image_url(self, obj):
        return sanitize_image_url(obj.image_url)

    def _joined_count_value(self, obj):
        if hasattr(obj, 'joined_count'):
            return obj.joined_count
        return Participation.objects.filter(
            event_id=obj.id,
            status=Participation.Statuses.JOINED,
        ).count()

    def _waitlist_count_value(self, obj):
        if hasattr(obj, 'waitlist_count'):
            return obj.waitlist_count
        return Participation.objects.filter(
            event_id=obj.id,
            status=Participation.Statuses.WAITLISTED,
        ).count()

    def get_joined_count(self, obj):
        return self._joined_count_value(obj)

    def get_waitlist_count(self, obj):
        return self._waitlist_count_value(obj)

    def get_checked_in_count(self, obj):
        return self._safe_query_count(
            lambda: Participation.objects.filter(
                event_id=obj.id,
                status=Participation.Statuses.JOINED,
                checked_in_at__isnull=False,
            ),
            label='checked-in',
        )

    def get_spots_remaining(self, obj):
        if obj.capacity is None:
            return None
        return max(0, obj.capacity - self._joined_count_value(obj))

    def get_no_show_count(self, obj):
        joined = self._joined_count_value(obj)
        checked_in = self.get_checked_in_count(obj)
        return calculate_no_show_count(joined, checked_in)

    def get_is_joined(self, obj):
        current_user = self.context.get('current_user')
        if current_user is None:
            return False

        return Participation.objects.filter(
            user_id=current_user.id,
            event_id=obj.id,
            status=Participation.Statuses.JOINED,
        ).exists()

    def get_is_waitlisted(self, obj):
        current_user = self.context.get('current_user')
        if current_user is None:
            return False

        return Participation.objects.filter(
            user_id=current_user.id,
            event_id=obj.id,
            status=Participation.Statuses.WAITLISTED,
        ).exists()

    def get_waitlist_position(self, obj):
        current_user = self.context.get('current_user')
        if current_user is None:
            return None

        participation = Participation.objects.filter(
            user_id=current_user.id,
            event_id=obj.id,
            status=Participation.Statuses.WAITLISTED,
        ).first()
        if participation is None:
            return None

        ahead = Participation.objects.filter(
            event_id=obj.id,
            status=Participation.Statuses.WAITLISTED,
            joined_at__lt=participation.joined_at,
        ).count()
        same_time = Participation.objects.filter(
            event_id=obj.id,
            status=Participation.Statuses.WAITLISTED,
            joined_at=participation.joined_at,
            id__lt=participation.id,
        ).count()
        return ahead + same_time + 1

    def get_is_liked(self, obj):
        current_user = self.context.get('current_user')
        if current_user is None:
            return False

        return self._safe_query_exists(
            lambda: EventLike.objects.filter(user_id=current_user.id, event_id=obj.id),
            label='is-liked',
        )

    def get_likes_count(self, obj):
        return self._safe_query_count(
            lambda: EventLike.objects.filter(event_id=obj.id),
            label='likes',
        )

    class Meta:
        model = Event
        fields = (
            'id',
            'creator_id',
            'creator_name',
            'title',
            'description',
            'category',
            'location',
            'image_url',
            'event_date',
            'start_time',
            'end_time',
            'moderation_status',
            'capacity',
            'joined_count',
            'waitlist_count',
            'checked_in_count',
            'no_show_count',
            'spots_remaining',
            'is_joined',
            'is_waitlisted',
            'waitlist_position',
            'is_liked',
            'likes_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class ParticipationSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    event_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Participation
        fields = ('id', 'user_id', 'event_id', 'status', 'joined_at', 'checked_in_at')
        read_only_fields = fields


class ParticipationActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = Participation
        fields = ('id', 'user_id', 'event_id', 'user_name', 'event_title', 'status', 'joined_at')
        read_only_fields = fields


class JoinedParticipationSerializer(serializers.ModelSerializer):
    event = serializers.SerializerMethodField()

    def get_event(self, obj):
        event_serializer = EventSerializer(
            obj.event,
            context={'current_user': self.context.get('current_user')},
        )
        return event_serializer.data

    class Meta:
        model = Participation
        fields = ('id', 'status', 'joined_at', 'checked_in_at', 'event')
        read_only_fields = fields


class EventParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    profile_image_url = serializers.SerializerMethodField()

    def get_profile_image_url(self, obj):
        try:
            settings = obj.user.settings
        except UserSettings.DoesNotExist:
            return None
        return sanitize_image_url(settings.profile_image_url)

    class Meta:
        model = Participation
        fields = (
            'id',
            'user_id',
            'user_name',
            'email',
            'status',
            'joined_at',
            'checked_in_at',
            'profile_image_url',
        )
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    event_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Notification
        fields = (
            'id',
            'event_id',
            'notification_type',
            'title',
            'message',
            'link_url',
            'read_at',
            'created_at',
        )
        read_only_fields = fields


class BroadcastMessageSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = BroadcastMessage
        fields = (
            'id',
            'created_by',
            'created_by_name',
            'created_by_email',
            'subject',
            'body',
            'recipient_filter',
            'priority',
            'template_key',
            'scheduled_at',
            'status',
            'sent_at',
            'recipient_count',
            'email_delivered_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'created_by',
            'created_by_name',
            'created_by_email',
            'subject',
            'body',
            'recipient_filter',
            'priority',
            'template_key',
            'scheduled_at',
            'status',
            'sent_at',
            'recipient_count',
            'email_delivered_count',
            'created_at',
            'updated_at',
        )


class AdminBroadcastCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=200)
    body = serializers.CharField(max_length=20000)
    recipient_filter = serializers.ChoiceField(
        choices=[choice[0] for choice in BroadcastMessage.RecipientFilter.choices],
    )
    priority = serializers.ChoiceField(
        choices=[choice[0] for choice in BroadcastMessage.Priority.choices],
        default=BroadcastMessage.Priority.NORMAL,
    )
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    template_key = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)

    def validate_subject(self, value):
        cleaned = strip_tags(value).strip()
        if not cleaned:
            raise serializers.ValidationError('Subject is required.')
        return cleaned[:200]

    def validate_body(self, value):
        cleaned = strip_tags(value).strip()
        if not cleaned:
            raise serializers.ValidationError('Message body is required.')
        return cleaned


class EventCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=True, allow_blank=True)
    category = serializers.CharField(max_length=100, required=False, allow_blank=True)
    location = serializers.CharField(max_length=200)
    image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    event_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField(required=False, allow_null=True)
    capacity = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError('Event title is required.')
        return title

    def validate_description(self, value):
        description = value.strip()
        if not description:
            raise serializers.ValidationError('Description is required.')
        return description

    def validate_location(self, value):
        location = value.strip()
        if not location:
            raise serializers.ValidationError('Location is required.')
        return location

    def validate_image_url(self, value):
        sanitized = sanitize_image_url(value)
        if value and sanitized is None:
            raise serializers.ValidationError(
                'Please provide a direct image URL. Device-uploaded base64 images are not supported in this MVP.',
            )
        return sanitized

    def validate(self, attrs):
        start_time = attrs.get(
            'start_time',
            self.instance.start_time if self.instance is not None else None,
        )
        end_time = attrs.get(
            'end_time',
            self.instance.end_time if self.instance is not None else None,
        )

        if start_time is not None and end_time is not None and end_time <= start_time:
            raise serializers.ValidationError(
                {'end_time': 'End time must be later than start time.'},
            )
        return attrs

    def validate_capacity(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError('Capacity must be at least 1.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        creator = self.context['creator']
        now = timezone.now()

        event = Event(
            creator=creator,
            title=validated_data['title'],
            description=validated_data['description'],
            category=validated_data.get('category', '').strip() or 'general',
            location=validated_data['location'],
            image_url=sanitize_image_url(validated_data.get('image_url')),
            event_date=validated_data['event_date'],
            start_time=validated_data['start_time'],
            end_time=validated_data.get('end_time') or validated_data['start_time'],
            capacity=validated_data.get('capacity'),
            moderation_status=Event.ModerationStatuses.PENDING,
            created_at=now,
            updated_at=now,
        )
        event.save()
        return event

    @transaction.atomic
    def update(self, instance, validated_data):
        if 'capacity' in validated_data:
            new_cap = validated_data['capacity']
            if new_cap is not None:
                joined = count_joined_for_event(instance.id)
                if new_cap < joined:
                    raise serializers.ValidationError(
                        {
                            'capacity': (
                                f'Capacity cannot be lower than the number of registered attendees ({joined}).'
                            ),
                        },
                    )

        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.category = (
            validated_data.get('category', instance.category) or ''
        ).strip() or 'general'
        instance.location = validated_data.get('location', instance.location)
        instance.image_url = sanitize_image_url(
            validated_data.get('image_url', instance.image_url),
        )
        instance.event_date = validated_data.get('event_date', instance.event_date)
        instance.start_time = validated_data.get('start_time', instance.start_time)
        if 'end_time' in validated_data:
            instance.end_time = validated_data['end_time'] or instance.start_time
        if 'capacity' in validated_data:
            instance.capacity = validated_data['capacity']
        instance.updated_at = timezone.now()
        instance.save()
        return instance


class EventModerationSerializer(serializers.Serializer):
    moderation_status = serializers.ChoiceField(
        choices=[Event.ModerationStatuses.APPROVED, Event.ModerationStatuses.REJECTED],
    )
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
    )

    def update(self, instance, validated_data):
        instance.moderation_status = validated_data['moderation_status']
        
        # Store rejection reason if event is being rejected
        if validated_data['moderation_status'] == Event.ModerationStatuses.REJECTED:
            instance.rejection_reason = validated_data.get('rejection_reason', '')
        
        instance.updated_at = timezone.now()
        instance.save(update_fields=['moderation_status', 'rejection_reason', 'updated_at'])
        return instance


class AdminUserUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[AEMUser.Roles.STUDENT, AEMUser.Roles.ADMIN],
        required=False,
    )
    is_active = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Please provide at least one field to update.')
        return attrs

    def update(self, instance, validated_data):
        current_user = self.context.get('current_user')
        current_user_is_owner = bool(current_user and current_user.is_owner)
        target_user_is_owner = instance.is_owner

        if target_user_is_owner and current_user and instance.id != current_user.id:
            if 'role' in validated_data:
                raise serializers.ValidationError(
                    {'role': 'The owner account always keeps admin access.'},
                )

            if 'is_active' in validated_data:
                raise serializers.ValidationError(
                    {'is_active': 'The owner account cannot be deactivated.'},
                )

        if 'role' in validated_data:
            next_role = validated_data['role']
            touches_admin_access = (
                instance.role == AEMUser.Roles.ADMIN
                or next_role == AEMUser.Roles.ADMIN
            )
            if (
                touches_admin_access
                and not current_user_is_owner
                and (current_user is None or instance.id != current_user.id)
            ):
                raise serializers.ValidationError(
                    {'role': 'Only the owner account can grant or remove admin access.'},
                )

        if (
            'is_active' in validated_data
            and instance.role == AEMUser.Roles.ADMIN
            and not current_user_is_owner
            and (current_user is None or instance.id != current_user.id)
        ):
            raise serializers.ValidationError(
                {'is_active': 'Only the owner account can change another admin account.'},
            )

        if current_user and instance.id == current_user.id:
            next_role = validated_data.get('role', instance.role)
            next_active = validated_data.get('is_active', instance.is_active)

            if next_role != AEMUser.Roles.ADMIN:
                raise serializers.ValidationError({'role': 'You cannot remove your own admin role.'})

            if not next_active:
                raise serializers.ValidationError({'is_active': 'You cannot deactivate your own account.'})

        update_fields = []
        if 'role' in validated_data and validated_data['role'] != instance.role:
            instance.role = validated_data['role']
            update_fields.append('role')
        if 'is_active' in validated_data and validated_data['is_active'] != instance.is_active:
            instance.is_active = validated_data['is_active']
            update_fields.append('is_active')

        if update_fields:
            instance.updated_at = timezone.now()
            update_fields.append('updated_at')
            instance.save(update_fields=update_fields)

        return instance

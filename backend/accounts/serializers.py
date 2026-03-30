from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import AEMUser, Event, Participation, UserSettings


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
    class Meta:
        model = AEMUser
        fields = ('id', 'full_name', 'email', 'role', 'is_active', 'created_at')
        read_only_fields = fields


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ('notifications_enabled', 'theme', 'language_code')
        read_only_fields = fields


class CurrentUserSerializer(serializers.ModelSerializer):
    settings = UserSettingsSerializer(read_only=True)
    created_events_count = serializers.SerializerMethodField()
    joined_events_count = serializers.SerializerMethodField()

    def get_created_events_count(self, obj):
        return obj.created_events.count()

    def get_joined_events_count(self, obj):
        return obj.participations.filter(status=Participation.Statuses.JOINED).count()

    class Meta:
        model = AEMUser
        fields = (
            'id',
            'full_name',
            'email',
            'role',
            'is_active',
            'created_at',
            'settings',
            'created_events_count',
            'joined_events_count',
        )
        read_only_fields = fields


class SignUpSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    role = serializers.ChoiceField(
        choices=[AEMUser.Roles.STUDENT, AEMUser.Roles.ORGANIZER],
        default=AEMUser.Roles.STUDENT,
        required=False,
    )

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
            role=validated_data.get('role', AEMUser.Roles.STUDENT),
            is_active=True,
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

    def validate_full_name(self, value):
        full_name = value.strip()
        if not full_name:
            raise serializers.ValidationError('Full name is required.')
        return full_name

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

        if settings_changed:
            settings.updated_at = now
            settings.save(update_fields=['theme', 'language_code', 'notifications_enabled', 'updated_at'])

        return instance


class EventSerializer(serializers.ModelSerializer):
    creator_id = serializers.IntegerField(read_only=True)
    creator_name = serializers.CharField(source='creator.full_name', read_only=True)
    image_url = serializers.SerializerMethodField()
    is_joined = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        return sanitize_image_url(obj.image_url)

    def get_is_joined(self, obj):
        current_user = self.context.get('current_user')
        if current_user is None:
            return False

        return Participation.objects.filter(
            user_id=current_user.id,
            event_id=obj.id,
            status=Participation.Statuses.JOINED,
        ).exists()

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
            'is_joined',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class ParticipationSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    event_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Participation
        fields = ('id', 'user_id', 'event_id', 'status', 'joined_at')
        read_only_fields = fields


class EventCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    category = serializers.CharField(max_length=100, required=False, allow_blank=True)
    location = serializers.CharField(max_length=200)
    image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    event_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

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
            end_time=validated_data['end_time'],
            moderation_status=Event.ModerationStatuses.PENDING,
            created_at=now,
            updated_at=now,
        )
        event.save()
        return event

    @transaction.atomic
    def update(self, instance, validated_data):
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
        instance.end_time = validated_data.get('end_time', instance.end_time)
        instance.updated_at = timezone.now()
        instance.save()
        return instance

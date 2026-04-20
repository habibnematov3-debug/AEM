from collections import Counter
from datetime import datetime, time, timedelta
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.db.models.functions import TruncDate
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_tokens import AuthTokenError, issue_auth_token, read_auth_token
from .checkin_tokens import make_checkin_token, parse_checkin_token
from .core_schema import ensure_core_schema
from .google_auth import GoogleTokenVerificationError, verify_google_id_token
from .broadcast_ops import execute_broadcast_send
from .broadcast_schema import ensure_broadcast_schema
from .models import AEMUser, AdminAuditLog, BroadcastMessage, Event, EventLike, MessageDelivery, Notification, Participation, UserSettings
from .notifications import (
    dispatch_due_event_reminders,
    notify_event_moderation,
    notify_participation_cancelled,
    notify_participation_joined,
    notify_participation_waitlisted,
    notify_waitlist_promoted,
)
from .participation_ops import event_has_open_seat, promote_next_waitlisted
from .serializers import (
    AdminBroadcastCreateSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    BroadcastMessageSerializer,
    CurrentUserSerializer,
    EventParticipantSerializer,
    EventCreateSerializer,
    EventModerationSerializer,
    EventSerializer,
    JoinedParticipationSerializer,
    LoginSerializer,
    NotificationSerializer,
    ParticipationActivitySerializer,
    ParticipationSerializer,
    ProfileUpdateSerializer,
    SignUpSerializer,
    UserSerializer,
)


logger = logging.getLogger(__name__)


def _db_error_reason(exc):
    raw = str(exc or '').strip()
    if not raw:
        return 'Unknown database error.'
    return raw.splitlines()[0][:280]


def _core_schema_error_response(message, exc):
    return Response(
        {
            'detail': (
                f'{message} Apply `python backend/manage.py bootstrap_schema` on the target database '
                f'and retry. DB reason: {_db_error_reason(exc)}'
            ),
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


PRESENCE_HEARTBEAT = timedelta(minutes=1)
RECOMMENDED_EVENTS_LIMIT = 10
RECOMMENDED_EVENTS_CANDIDATE_POOL = 40
RECOMMENDED_CATEGORY_CAP = 3
RECOMMENDATION_LIKE_WEIGHT = 2
RECOMMENDATION_JOIN_WEIGHT = 4


def normalize_event_category_key(category):
    normalized = str(category or '').strip().lower()
    return normalized or 'general'


def build_recommended_category_scores(user):
    category_scores = Counter()

    try:
        liked_categories = EventLike.objects.filter(user=user).values_list('event__category', flat=True)
    except DatabaseError as exc:
        logger.warning('Recommended event like categories unavailable: %s', exc)
        liked_categories = []

    joined_categories = Participation.objects.filter(
        user=user,
        status=Participation.Statuses.JOINED,
    ).values_list('event__category', flat=True)

    for category in liked_categories:
        category_scores[normalize_event_category_key(category)] += RECOMMENDATION_LIKE_WEIGHT

    for category in joined_categories:
        category_scores[normalize_event_category_key(category)] += RECOMMENDATION_JOIN_WEIGHT

    return category_scores


def apply_recommendation_diversity(events, *, limit=RECOMMENDED_EVENTS_LIMIT):
    selected_events = []
    per_category_counts = Counter()

    for event in events:
        category_key = normalize_event_category_key(event.category)
        if per_category_counts[category_key] >= RECOMMENDED_CATEGORY_CAP:
            continue

        selected_events.append(event)
        per_category_counts[category_key] += 1
        if len(selected_events) >= limit:
            break

    return selected_events


def touch_user_presence(user, now=None, force=False):
    if user is None:
        return None

    current_time = now or timezone.now()
    if (
        force
        or user.last_seen_at is None
        or current_time - user.last_seen_at >= PRESENCE_HEARTBEAT
    ):
        user.last_seen_at = current_time
        user.save(update_fields=['last_seen_at'])

    return user


def get_session_user(request):
    auth_header = request.headers.get('Authorization', '')
    if auth_header:
        scheme, _, token = auth_header.partition(' ')
        if scheme.lower() == 'bearer' and token.strip():
            try:
                user_id = read_auth_token(token.strip())
            except AuthTokenError as exc:
                request._aem_auth_error = str(exc)
                return None

            user = AEMUser.objects.filter(id=user_id, is_active=True).first()
            return touch_user_presence(user)

    user_id = request.session.get('user_id')
    if not user_id:
        return None

    user = AEMUser.objects.filter(id=user_id, is_active=True).first()
    return touch_user_presence(user)


def auth_required_response(request):
    return Response(
        {'detail': getattr(request, '_aem_auth_error', 'Authentication required.')},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def ensure_user_settings(user, *, profile_image_url=None):
    now = timezone.now()
    settings_row, created = UserSettings.objects.get_or_create(
        user=user,
        defaults={
            'notifications_enabled': True,
            'theme': UserSettings.Themes.LIGHT,
            'language_code': 'en',
            'profile_image_url': profile_image_url,
            'created_at': now,
            'updated_at': now,
        },
    )

    if not created and profile_image_url and not settings_row.profile_image_url:
        settings_row.profile_image_url = profile_image_url
        settings_row.updated_at = now
        settings_row.save(update_fields=['profile_image_url', 'updated_at'])

    return settings_row


@transaction.atomic
def get_or_create_google_user(google_profile):
    now = timezone.now()
    google_sub = google_profile['sub']
    email = google_profile['email']
    full_name = google_profile['full_name']
    profile_image_url = google_profile['profile_image_url']

    user = AEMUser.objects.filter(google_sub=google_sub).first()
    if user is None:
        existing_user = AEMUser.objects.filter(email__iexact=email).first()
        if existing_user is not None:
            if existing_user.google_sub and existing_user.google_sub != google_sub:
                raise GoogleTokenVerificationError(
                    'This email is already linked to a different Google account.',
                )
            user = existing_user
            user.google_sub = google_sub
            user.last_seen_at = now
            user.updated_at = now
            user.save(update_fields=['google_sub', 'last_seen_at', 'updated_at'])
        else:
            user = AEMUser(
                full_name=full_name,
                email=email,
                google_sub=google_sub,
                role=AEMUser.Roles.STUDENT,
                is_active=True,
                last_seen_at=now,
                created_at=now,
                updated_at=now,
            )
            user.set_unusable_password()
            user.save()
    else:
        update_fields = []
        if user.email.strip().lower() != email:
            conflicting_user = AEMUser.objects.filter(email__iexact=email).exclude(id=user.id).first()
            if conflicting_user is None:
                user.email = email
                update_fields.append('email')

        if user.last_seen_at != now:
            user.last_seen_at = now
            update_fields.append('last_seen_at')
        user.updated_at = now
        update_fields.append('updated_at')
        if update_fields:
            user.save(update_fields=update_fields)

    if not user.is_active:
        raise GoogleTokenVerificationError('This account is inactive.')

    ensure_user_settings(user, profile_image_url=profile_image_url)
    return user


def is_admin(user):
    return user is not None and user.role == AEMUser.Roles.ADMIN


def can_view_event(user, event):
    # Approved events are visible to everyone
    if event.moderation_status == Event.ModerationStatuses.APPROVED:
        return True

    # Non-authenticated users can't see non-approved events
    if user is None:
        return False

    # Admins and creators can see their events regardless of status
    if is_admin(user) or event.creator_id == user.id:
        return True

    # Users who joined or are waitlisted can see the event
    if Participation.objects.filter(
        user_id=user.id,
        event_id=event.id,
        status__in=(Participation.Statuses.JOINED, Participation.Statuses.WAITLISTED),
    ).exists():
        return True

    return False


def event_schedule_has_ended(event, now=None):
    """True after the event's scheduled end (local date + end_time), matching admin stats logic."""
    now = now or timezone.localtime()
    today = now.date()
    current_time = now.time()
    if event.event_date < today:
        return True
    if event.event_date > today:
        return False
    return event.end_time < current_time


def exclude_ended_events(queryset, now=None):
    """Keep events that are still ongoing or upcoming (same boundary as finished admin counts)."""
    now = now or timezone.localtime()
    today = now.date()
    current_time = now.time()
    return queryset.filter(
        Q(event_date__gt=today) | Q(event_date=today, end_time__gte=current_time),
    )


def student_may_access_public_event(user, event):
    """Approved events past their end are hidden from the catalog; detail stays available for organizer, admin, or joined students."""
    if event.moderation_status != Event.ModerationStatuses.APPROVED:
        return True
    if user is None:
        return False
    if is_admin(user) or event.creator_id == user.id:
        return True
    # Allow access if user joined or is waitlisted, regardless of event status
    if Participation.objects.filter(
        user_id=user.id,
        event_id=event.id,
        status__in=(Participation.Statuses.JOINED, Participation.Statuses.WAITLISTED),
    ).exists():
        return True
    # For approved events, allow access even if ended (for viewing past events)
    if not event_schedule_has_ended(event):
        return True
    return False


def get_admin_dashboard_stats():
    now = timezone.localtime()
    today = now.date()
    current_time = now.time()

    event_queryset = Event.objects.all()

    return {
        'users': AEMUser.objects.count(),
        'events': event_queryset.count(),
        'pending': event_queryset.filter(moderation_status=Event.ModerationStatuses.PENDING).count(),
        'approved': event_queryset.filter(moderation_status=Event.ModerationStatuses.APPROVED).count(),
        'rejected': event_queryset.filter(moderation_status=Event.ModerationStatuses.REJECTED).count(),
        'joined': Participation.objects.filter(status=Participation.Statuses.JOINED).count(),
        'upcoming': event_queryset.filter(
            Q(event_date__gt=today)
            | Q(event_date=today, start_time__gt=current_time),
        ).count(),
        'in_progress': event_queryset.filter(
            event_date=today,
            start_time__lte=current_time,
            end_time__gte=current_time,
        ).count(),
        'finished': event_queryset.filter(
            Q(event_date__lt=today)
            | Q(event_date=today, end_time__lt=current_time),
        ).count(),
        'waitlisted': Participation.objects.filter(status=Participation.Statuses.WAITLISTED).count(),
        'attended': Participation.objects.filter(
            status=Participation.Statuses.JOINED,
            checked_in_at__isnull=False,
        ).count(),
        'no_shows': Participation.objects.filter(
            status=Participation.Statuses.JOINED,
            checked_in_at__isnull=True,
        )
        .filter(
            Q(event__event_date__lt=today)
            | Q(event__event_date=today, event__end_time__lt=current_time),
        )
        .count(),
    }


def get_admin_activity_timeline(days=7):
    timezone_info = timezone.get_current_timezone()
    today = timezone.localtime().date()
    start_date = today - timedelta(days=max(days - 1, 0))
    start_of_window = timezone.make_aware(
        datetime.combine(start_date, time.min),
        timezone_info,
    )

    join_rows = (
        Participation.objects.filter(joined_at__gte=start_of_window)
        .annotate(day=TruncDate('joined_at', tzinfo=timezone_info))
        .values('day')
        .annotate(total=Count('id'))
    )
    checkin_rows = (
        Participation.objects.filter(checked_in_at__isnull=False, checked_in_at__gte=start_of_window)
        .annotate(day=TruncDate('checked_in_at', tzinfo=timezone_info))
        .values('day')
        .annotate(total=Count('id'))
    )

    joins_by_day = {row['day']: row['total'] for row in join_rows}
    checkins_by_day = {row['day']: row['total'] for row in checkin_rows}

    return [
        {
            'date': current_date.isoformat(),
            'joins': joins_by_day.get(current_date, 0),
            'check_ins': checkins_by_day.get(current_date, 0),
        }
        for current_date in (
            start_date + timedelta(days=offset)
            for offset in range(days)
        )
    ]


def parse_boolean_query(value):
    if value is None:
        return None

    normalized = str(value).strip().lower()
    if normalized in {'true', '1', 'yes'}:
        return True
    if normalized in {'false', '0', 'no'}:
        return False
    return None


def _build_notifications_payload(current_user, limit):
    notifications = (
        Notification.objects.select_related('event')
        .filter(user_id=current_user.id)
        .order_by('-created_at', '-id')[:limit]
    )
    unread_count = Notification.objects.filter(user_id=current_user.id, read_at__isnull=True).count()

    return {
        'results': NotificationSerializer(notifications, many=True).data,
        'unread_count': unread_count,
    }


def _execute_with_repair(func, *args, **kwargs):
    """
    Выполняет функцию взаимодействия с БД. Если она падает из-за отсутствия колонок/таблиц,
    пытается исправить схему и повторяет попытку один раз.
    """
    try:
        return func(*args, **kwargs)
    except DatabaseError as exc:
        logger.warning('БД запрос не удался, попытка авто-исправления схемы: %s', exc)
        if ensure_core_schema():
            try:
                # Закрываем соединение, чтобы сбросить состояние транзакции/кэша схемы
                connection.close()
                return func(*args, **kwargs)
            except DatabaseError as retry_exc:
                logger.exception('Запрос к БД все еще не удается после авто-исправления')
                raise retry_exc
        raise exc


def _build_admin_dashboard_payload(current_user):
    recent_events = Event.objects.select_related('creator').order_by('-created_at', '-id')[:5]
    recent_users = AEMUser.objects.select_related('settings').order_by('-created_at', '-id')[:5]
    recent_participations = Participation.objects.select_related('user', 'event').order_by(
        '-joined_at',
        '-id',
    )[:5]

    return {
        'stats': get_admin_dashboard_stats(),
        'activity_timeline': get_admin_activity_timeline(),
        'recent_events': EventSerializer(
            recent_events,
            many=True,
            context={'current_user': current_user},
        ).data,
        'recent_users': AdminUserSerializer(recent_users, many=True).data,
        'recent_participations': ParticipationActivitySerializer(
            recent_participations,
            many=True,
        ).data,
    }


def is_event_active(event):
    """Check if an event is currently active (upcoming or in-progress)."""
    now = timezone.localtime()
    today = now.date()
    current_time = now.time()
    
    return (
        (event.event_date > today) or
        (event.event_date == today and event.start_time > current_time) or
        (event.event_date == today and event.start_time <= current_time and event.end_time >= current_time)
    )


def can_delete_event(event):
    """
    Check if an event can be deleted.
    Returns: (can_delete: bool, reason: str, details: dict)
    """
    if is_event_active(event):
        participant_count = Participation.objects.filter(
            event=event,
            status=Participation.Statuses.JOINED
        ).count()
        waitlist_count = Participation.objects.filter(
            event=event,
            status=Participation.Statuses.WAITLISTED
        ).count()
        return False, "active_event", {
            "participant_count": participant_count,
            "waitlist_count": waitlist_count,
            "event_date": event.event_date.isoformat(),
            "start_time": event.start_time.isoformat(),
        }
    
    return True, "", {}


def get_event_deletion_details(event):
    """Get detailed information about an event for audit logging."""
    participant_count = Participation.objects.filter(
        event=event,
        status=Participation.Statuses.JOINED
    ).count()
    waitlist_count = Participation.objects.filter(
        event=event,
        status=Participation.Statuses.WAITLISTED
    ).count()
    
    return {
        "event_id": event.id,
        "title": event.title,
        "creator": event.creator.full_name,
        "creator_email": event.creator.email,
        "event_date": event.event_date.isoformat(),
        "start_time": event.start_time.isoformat(),
        "end_time": event.end_time.isoformat(),
        "location": event.location,
        "participant_count": participant_count,
        "waitlist_count": waitlist_count,
        "moderation_status": event.moderation_status,
    }


def log_admin_action(admin, action, target_type, target_id, target_details, reason=None):
    """Log an admin action to the audit trail."""
    try:
        AdminAuditLog.objects.create(
            admin=admin,
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_details=target_details,
            reason=reason,
        )
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to log admin action: {e}")


@method_decorator(csrf_exempt, name='dispatch')
class HealthCheckAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class SignUpAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        request.session.cycle_key()
        request.session['user_id'] = user.id

        return Response(
            {
                'message': 'Signup successful.',
                'auth_token': issue_auth_token(user),
                'user': CurrentUserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        print(f"🔍 Login Request Debug:")
        print(f"  Headers: {dict(request.headers)}")
        print(f"  Data: {request.data}")
        print(f"  Method: {request.method}")
        print(f"  Content-Type: {request.content_type}")
        
        serializer = LoginSerializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            print(f"🔍 Serializer Validation Error: {e}")
            print(f"🔍 Serializer Errors: {serializer.errors}")
            raise
        
        user = serializer.validated_data['user']
        touch_user_presence(user, force=True)

        request.session.cycle_key()
        request.session['user_id'] = user.id

        return Response(
            {
                'message': 'Login successful.',
                'auth_token': issue_auth_token(user),
                'user': CurrentUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class GoogleAuthAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        credential = request.data.get('credential')

        try:
            google_profile = verify_google_id_token(credential)
            user = get_or_create_google_user(google_profile)
        except GoogleTokenVerificationError as exc:
            return Response(
                {'detail': str(exc)},
                status=getattr(exc, 'status_code', status.HTTP_400_BAD_REQUEST),
            )

        request.session.cycle_key()
        request.session['user_id'] = user.id

        return Response(
            {
                'message': 'Google sign-in successful.',
                'auth_token': issue_auth_token(user),
                'user': CurrentUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class AuthProvidersAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(
            {
                'google': {
                    'enabled': bool(getattr(settings, 'AEM_GOOGLE_CLIENT_IDS', ())),
                },
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class LogoutAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        request.session.flush()
        return Response({'message': 'Logout successful.'}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class CurrentUserAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        return Response(
            {'user': CurrentUserSerializer(current_user).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        serializer = ProfileUpdateSerializer(instance=current_user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        return Response(
            {
                'message': 'Profile updated successfully.',
                'user': CurrentUserSerializer(updated_user).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventListCreateAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        scope = request.query_params.get('scope')

        def _fetch():
            events = Event.objects.select_related('creator')
            if scope == 'organizer':
                if current_user is None:
                    return None
                events = events.filter(creator_id=current_user.id)
            else:
                events = events.filter(moderation_status=Event.ModerationStatuses.APPROVED)
                events = exclude_ended_events(events)

            events = events.annotate(
                joined_count=Count(
                    'participations',
                    filter=Q(participations__status=Participation.Statuses.JOINED),
                ),
                waitlist_count=Count(
                    'participations',
                    filter=Q(participations__status=Participation.Statuses.WAITLISTED),
                ),
            ).order_by('-created_at', '-id')
            return EventSerializer(
                events,
                many=True,
                context={'current_user': current_user},
            ).data

        try:
            data = _execute_with_repair(_fetch)
            if data is None:
                return auth_required_response(request)
            return Response({'results': data}, status=status.HTTP_200_OK)
        except DatabaseError as exc:
            return _core_schema_error_response('Events schema is not ready.', exc)

    def post(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        serializer = EventCreateSerializer(data=request.data, context={'creator': current_user})
        serializer.is_valid(raise_exception=True)

        try:
            event = _execute_with_repair(serializer.save)
        except DatabaseError as exc:
            return _core_schema_error_response('Event creation failed due to schema mismatch.', exc)

        return Response(
            {
                'message': 'Event created successfully.',
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventDetailAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, event_id):
        current_user = get_session_user(request)

        def _fetch():
            event = get_object_or_404(
                Event.objects.select_related('creator'),
                id=event_id,
            )
            if not can_view_event(current_user, event):
                return None
            if not student_may_access_public_event(current_user, event):
                return None
            return EventSerializer(event, context={'current_user': current_user}).data

        try:
            data = _execute_with_repair(_fetch)
            if data is None:
                return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(data, status=status.HTTP_200_OK)
        except DatabaseError as exc:
            return _core_schema_error_response('Event lookup failed due to schema mismatch.', exc)

    def patch(self, request, event_id):
        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
        )
        current_user = get_session_user(request)

        if current_user is None:
            return auth_required_response(request)

        if event.creator_id != current_user.id:
            return Response(
                {'detail': 'You are not allowed to edit this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EventCreateSerializer(instance=event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            updated_event = _execute_with_repair(serializer.save)
        except DatabaseError as exc:
            return _core_schema_error_response('Event update failed due to schema mismatch.', exc)

        return Response(
            {
                'message': 'Event updated successfully.',
                'event': EventSerializer(updated_event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, event_id):
        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
        )
        current_user = get_session_user(request)

        if current_user is None:
            return auth_required_response(request)

        if event.creator_id != current_user.id:
            return Response(
                {'detail': 'You are not allowed to delete this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        deleted_event_id = event.id
        event.delete()

        return Response(
            {
                'message': 'Event deleted successfully.',
                'deleted_event_id': deleted_event_id,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventParticipateAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(
            Event.objects.select_for_update().select_related('creator'),
            id=event_id,
        )

        if event.moderation_status != Event.ModerationStatuses.APPROVED:
            return Response(
                {'detail': 'This event is not publicly available yet.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if event_schedule_has_ended(event):
            return Response(
                {'detail': 'This event has already ended.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if event.creator_id == current_user.id:
            return Response(
                {'detail': 'You cannot participate in your own event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_participation = (
            Participation.objects.select_for_update()
            .filter(user_id=current_user.id, event_id=event.id)
            .first()
        )

        now = timezone.now()

        if existing_participation is not None:
            if existing_participation.status == Participation.Statuses.JOINED:
                return Response(
                    {'detail': 'You have already joined this event.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if existing_participation.status == Participation.Statuses.WAITLISTED:
                return Response(
                    {'detail': 'You are already on the waitlist for this event.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if event_has_open_seat(event):
                existing_participation.status = Participation.Statuses.JOINED
                existing_participation.joined_at = now
                existing_participation.checked_in_at = None
                existing_participation.save(update_fields=['status', 'joined_at', 'checked_in_at'])
                participation = existing_participation
                transaction.on_commit(lambda p=participation: notify_participation_joined(p))
                message = 'You joined the event successfully.'
            else:
                existing_participation.status = Participation.Statuses.WAITLISTED
                existing_participation.joined_at = now
                existing_participation.checked_in_at = None
                existing_participation.reminder_sent_at = None
                existing_participation.save(
                    update_fields=['status', 'joined_at', 'checked_in_at', 'reminder_sent_at'],
                )
                participation = existing_participation
                transaction.on_commit(lambda p=participation: notify_participation_waitlisted(p))
                message = 'The event is full. You have been added to the waitlist.'

            return Response(
                {
                    'message': message,
                    'participation': ParticipationSerializer(participation).data,
                    'event': EventSerializer(event, context={'current_user': current_user}).data,
                },
                status=status.HTTP_200_OK,
            )

        if event_has_open_seat(event):
            try:
                participation = Participation.objects.create(
                    user=current_user,
                    event=event,
                    status=Participation.Statuses.JOINED,
                )
            except IntegrityError:
                return Response(
                    {'detail': 'You have already joined this event.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            transaction.on_commit(lambda p=participation: notify_participation_joined(p))
            message = 'You joined the event successfully.'
            http_status = status.HTTP_201_CREATED
        else:
            try:
                participation = Participation.objects.create(
                    user=current_user,
                    event=event,
                    status=Participation.Statuses.WAITLISTED,
                )
            except IntegrityError:
                return Response(
                    {'detail': 'You have already joined this event.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            transaction.on_commit(lambda p=participation: notify_participation_waitlisted(p))
            message = 'The event is full. You have been added to the waitlist.'
            http_status = status.HTTP_201_CREATED

        return Response(
            {
                'message': message,
                'participation': ParticipationSerializer(participation).data,
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=http_status,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventLikeAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
        )

        if event.moderation_status != Event.ModerationStatuses.APPROVED:
            return Response(
                {'detail': 'Only approved events can be liked.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if event_schedule_has_ended(event):
            return Response(
                {'detail': 'This event has already ended.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            _, created = EventLike.objects.get_or_create(user_id=current_user.id, event_id=event.id)
        except DatabaseError as exc:
            logger.warning('Event like creation failed: %s', exc)
            return Response(
                {'detail': 'Event likes are temporarily unavailable.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not created:
            return Response(
                {'detail': 'You have already liked this event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'message': 'Event liked successfully.',
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
        )

        try:
            deleted_count, _ = EventLike.objects.filter(user_id=current_user.id, event_id=event.id).delete()
        except DatabaseError as exc:
            logger.warning('Event like deletion failed: %s', exc)
            return Response(
                {'detail': 'Event likes are temporarily unavailable.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if deleted_count == 0:
            return Response(
                {'detail': 'You have not liked this event.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                'message': 'Event like removed successfully.',
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class MyParticipationListAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        participations = (
            Participation.objects.select_related('event', 'event__creator')
            .filter(
                user_id=current_user.id,
                status__in=(
                    Participation.Statuses.JOINED,
                    Participation.Statuses.WAITLISTED,
                ),
            )
            .order_by('-joined_at', '-id')
        )

        return Response(
            {
                'results': JoinedParticipationSerializer(
                    participations,
                    many=True,
                    context={'current_user': current_user},
                ).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventCancelParticipationAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
        )

        participation = Participation.objects.filter(
            user_id=current_user.id,
            event_id=event.id,
            status__in=(
                Participation.Statuses.JOINED,
                Participation.Statuses.WAITLISTED,
            ),
        ).first()

        if participation is None:
            return Response(
                {'detail': 'You do not have an active participation for this event.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if event_schedule_has_ended(event):
            return Response(
                {'detail': 'This event has already ended.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        was_joined = participation.status == Participation.Statuses.JOINED
        participation.status = Participation.Statuses.CANCELLED
        participation.save(update_fields=['status'])
        transaction.on_commit(lambda: notify_participation_cancelled(participation))

        promoted = None
        if was_joined:
            promoted = promote_next_waitlisted(event.id)
            if promoted is not None:
                transaction.on_commit(lambda p=promoted: notify_waitlist_promoted(p))
                transaction.on_commit(lambda p=promoted: notify_participation_joined(p))

        # Re-load event values to reflect joined/waitlist counts and checked-in counts.
        response_event = EventSerializer(event, context={'current_user': current_user}).data

        return Response(
            {
                'message': 'Participation cancelled successfully.',
                'participation': ParticipationSerializer(participation).data,
                'promoted_participation': ParticipationSerializer(promoted).data if promoted else None,
                'event': response_event,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventParticipantListAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(Event.objects.select_related('creator'), id=event_id)

        if not is_admin(current_user) and event.creator_id != current_user.id:
            return Response(
                {'detail': 'You are not allowed to view the participants for this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        participations = (
            Participation.objects.select_related('user')
            .filter(
                event_id=event.id,
                status__in=(
                    Participation.Statuses.JOINED,
                    Participation.Statuses.WAITLISTED,
                ),
            )
            .annotate(
                status_order=Case(
                    When(status=Participation.Statuses.JOINED, then=Value(0)),
                    When(status=Participation.Statuses.WAITLISTED, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                ),
            )
            .order_by('status_order', 'joined_at', 'id')
        )

        return Response(
            {
                'event': EventSerializer(event, context={'current_user': current_user}).data,
                'total_participants': participations.count(),
                'results': EventParticipantSerializer(participations, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventParticipantCheckInAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, event_id, participation_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(Event.objects.select_related('creator'), id=event_id)

        if not (is_admin(current_user) or event.creator_id == current_user.id):
            return Response(
                {'detail': 'You are not allowed to check in participants for this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        participation = get_object_or_404(
            Participation.objects.select_related('user'),
            id=participation_id,
            event_id=event.id,
        )

        if participation.status != Participation.Statuses.JOINED:
            return Response(
                {'detail': 'Only joined participants can be checked in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if participation.checked_in_at is not None:
            return Response(
                {'detail': 'Participant is already checked in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if event_schedule_has_ended(event):
            return Response(
                {'detail': 'This event has already ended.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation.checked_in_at = timezone.now()
        participation.save(update_fields=['checked_in_at'])

        return Response(
            {
                'message': 'Participant checked in successfully.',
                'participation': EventParticipantSerializer(participation).data,
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventMyCheckInTokenAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(Event.objects.select_related('creator'), id=event_id)
        participation = Participation.objects.filter(
            user_id=current_user.id,
            event_id=event.id,
            status=Participation.Statuses.JOINED,
        ).first()

        if participation is None:
            return Response(
                {'detail': 'Only confirmed attendees can access a check-in QR code.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if event_schedule_has_ended(event):
            return Response(
                {'detail': 'This event has already ended.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'token': make_checkin_token(participation.id),
                'participation': ParticipationSerializer(participation).data,
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventTokenCheckInAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        event = get_object_or_404(Event.objects.select_related('creator'), id=event_id)

        if not (is_admin(current_user) or event.creator_id == current_user.id):
            return Response(
                {'detail': 'You are not allowed to check in participants for this event.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        token = str(request.data.get('token', '')).strip()
        if not token:
            return Response(
                {'detail': 'A check-in token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = parse_checkin_token(token)
            participation_id = int(payload['p'])
        except (signing.BadSignature, signing.SignatureExpired, KeyError, TypeError, ValueError):
            return Response(
                {'detail': 'Invalid or expired check-in token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation = get_object_or_404(
            Participation.objects.select_related('user'),
            id=participation_id,
            event_id=event.id,
        )

        if participation.status != Participation.Statuses.JOINED:
            return Response(
                {'detail': 'Only joined participants can be checked in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if participation.checked_in_at is not None:
            return Response(
                {'detail': 'Participant is already checked in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if event_schedule_has_ended(event):
            return Response(
                {'detail': 'This event has already ended.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation.checked_in_at = timezone.now()
        participation.save(update_fields=['checked_in_at'])

        return Response(
            {
                'message': 'Participant checked in successfully.',
                'participation': EventParticipantSerializer(participation).data,
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class MyNotificationListAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        limit = 20
        raw_limit = request.query_params.get('limit')
        if raw_limit is not None:
            try:
                limit = max(1, min(50, int(raw_limit)))
            except (TypeError, ValueError):
                limit = 20

        try:
            payload = _execute_with_repair(_build_notifications_payload, current_user, limit)
        except DatabaseError as exc:
            return _core_schema_error_response('Notifications schema is not ready.', exc)

        return Response(payload, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class NotificationReadAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, notification_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        notification = get_object_or_404(
            Notification.objects.select_related('event'),
            id=notification_id,
            user_id=current_user.id,
        )

        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.updated_at = notification.read_at
            notification.save(update_fields=['read_at', 'updated_at'])
            
            # Send real-time unread count update
            send_unread_count_update(current_user.id)

        return Response(
            {
                'message': 'Notification marked as read.',
                'notification': NotificationSerializer(notification).data,
                'unread_count': Notification.objects.filter(
                    user_id=current_user.id,
                    read_at__isnull=True,
                ).count(),
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class NotificationReadAllAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        now = timezone.now()
        Notification.objects.filter(user_id=current_user.id, read_at__isnull=True).update(
            read_at=now,
            updated_at=now,
        )
        
        # Send real-time unread count update
        send_unread_count_update(current_user.id)

        return Response(
            {
                'message': 'All notifications marked as read.',
                'unread_count': 0,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminReminderDispatchAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        raw_hours = request.data.get('hours_ahead', 24)
        try:
            hours_ahead = max(1, min(168, int(raw_hours)))
        except (TypeError, ValueError):
            hours_ahead = 24

        force = parse_boolean_query(request.data.get('force'))
        sent_count = dispatch_due_event_reminders(hours_ahead=hours_ahead, force=bool(force))

        return Response(
            {
                'message': f'Reminders sent: {sent_count}.',
                'sent_count': sent_count,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminDashboardAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            payload = _execute_with_repair(_build_admin_dashboard_payload, current_user)
        except DatabaseError as exc:
            return _core_schema_error_response('Admin dashboard schema is not ready.', exc)

        return Response(payload, status=status.HTTP_200_OK)


class RecommendedEventsAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        category_scores = build_recommended_category_scores(current_user)

        events = exclude_ended_events(
            Event.objects.select_related('creator').filter(
                moderation_status=Event.ModerationStatuses.APPROVED,
            ),
        ).exclude(
            participations__user_id=current_user.id,
            participations__status__in=(
                Participation.Statuses.JOINED,
                Participation.Statuses.WAITLISTED,
            ),
        )

        score_annotation = Value(0, output_field=IntegerField())
        if category_scores:
            score_annotation = Case(
                *[
                    When(category__iexact=category, then=Value(score))
                    for category, score in sorted(category_scores.items())
                ],
                default=Value(0),
                output_field=IntegerField(),
            )

        ranked_events = list(
            events.annotate(
                joined_count=Count(
                    'participations',
                    filter=Q(participations__status=Participation.Statuses.JOINED),
                ),
                waitlist_count=Count(
                    'participations',
                    filter=Q(participations__status=Participation.Statuses.WAITLISTED),
                ),
                score=score_annotation,
            ).order_by('-score', '-joined_count', '-created_at', '-id')[
                :RECOMMENDED_EVENTS_CANDIDATE_POOL
            ]
        )
        recommended_events = apply_recommendation_diversity(ranked_events)

        return Response(
            {
                'results': EventSerializer(
                    recommended_events,
                    many=True,
                    context={'current_user': current_user},
                ).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminEventListAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get('status')
        search_query = request.query_params.get('q', '').strip()
        events = Event.objects.select_related('creator')
        if status_filter in {
            Event.ModerationStatuses.PENDING,
            Event.ModerationStatuses.APPROVED,
            Event.ModerationStatuses.REJECTED,
        }:
            events = events.filter(moderation_status=status_filter)

        if search_query:
            events = events.filter(
                Q(title__icontains=search_query)
                | Q(description__icontains=search_query)
                | Q(location__icontains=search_query)
                | Q(category__icontains=search_query)
                | Q(creator__full_name__icontains=search_query)
                | Q(creator__email__icontains=search_query)
            )

        events = events.annotate(
            moderation_order=Case(
                When(moderation_status=Event.ModerationStatuses.PENDING, then=Value(0)),
                When(moderation_status=Event.ModerationStatuses.APPROVED, then=Value(1)),
                When(moderation_status=Event.ModerationStatuses.REJECTED, then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            )
        ).order_by('moderation_order', '-created_at', '-id')

        return Response(
            {
                'results': EventSerializer(
                    events,
                    many=True,
                    context={'current_user': current_user},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        event_ids = request.data.get('event_ids')
        if not isinstance(event_ids, list) or not event_ids:
            return Response(
                {'detail': 'event_ids must be a non-empty list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event_ids = [int(event_id) for event_id in event_ids]
        except (TypeError, ValueError):
            return Response(
                {'detail': 'event_ids must contain integers only.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        events_to_delete = Event.objects.filter(id__in=event_ids)
        
        # Check for active events
        blocked_events = []
        deletable_events = []
        
        for event in events_to_delete:
            can_delete, reason, details = can_delete_event(event)
            if can_delete:
                deletable_events.append(event)
            else:
                blocked_events.append({
                    'id': event.id,
                    'title': event.title,
                    'reason': reason,
                    'details': details,
                })
        
        # Return error if any active events
        if blocked_events:
            return Response(
                {
                    'detail': f'Cannot delete {len(blocked_events)} active event(s). Please delete them when they are finished.',
                    'blocked_events': blocked_events,
                    'deletable_count': len(deletable_events),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Delete all non-active events
        deleted_count = 0
        for event in deletable_events:
            event_details = get_event_deletion_details(event)
            event.delete()
            log_admin_action(
                admin=current_user,
                action=AdminAuditLog.Actions.EVENT_DELETED,
                target_type='event',
                target_id=event.id,
                target_details=event_details,
            )
            deleted_count += 1

        return Response(
            {
                'message': f'{deleted_count} event(s) deleted successfully.',
                'stats': get_admin_dashboard_stats(),
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminEventModerationAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def patch(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        event = get_object_or_404(Event.objects.select_related('creator'), id=event_id)
        previous_status = event.moderation_status
        serializer = EventModerationSerializer(instance=event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_event = serializer.save()

        if updated_event.moderation_status != previous_status:
            transaction.on_commit(
                lambda: notify_event_moderation(updated_event, updated_event.moderation_status),
            )

        return Response(
            {
                'message': 'Event moderation updated successfully.',
                'event': EventSerializer(updated_event, context={'current_user': current_user}).data,
                'stats': get_admin_dashboard_stats(),
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminEventDeleteAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def delete(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        event = get_object_or_404(Event, id=event_id)
        
        # Check if event can be deleted
        can_delete, reason, details = can_delete_event(event)
        if not can_delete:
            return Response(
                {
                    'detail': f'Cannot delete this event. It is currently active.',
                    'reason': reason,
                    'details': details,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        event_title = event.title
        event_details = get_event_deletion_details(event)
        
        # Delete the event
        event.delete()
        
        # Log the action
        log_admin_action(
            admin=current_user,
            action=AdminAuditLog.Actions.EVENT_DELETED,
            target_type='event',
            target_id=event_id,
            target_details=event_details,
        )

        return Response(
            {
                'message': f'Event "{event_title}" has been deleted successfully.',
                'stats': get_admin_dashboard_stats(),
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminEventParticipantsAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, event_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        event = get_object_or_404(Event, id=event_id)
        status_filter = request.query_params.get('status', '')  # joined, attended, no_show, waitlisted
        search_query = request.query_params.get('q', '').strip()
        
        # Get all participations for this event
        participations = Participation.objects.filter(event=event).select_related('user')
        
        # Filter by status if provided
        if status_filter == 'joined':
            participations = participations.filter(status=Participation.Statuses.JOINED)
        elif status_filter == 'waitlisted':
            participations = participations.filter(status=Participation.Statuses.WAITLISTED)
        elif status_filter == 'attended':
            now = timezone.localtime()
            participations = participations.filter(
                status=Participation.Statuses.JOINED,
                checked_in_at__isnull=False,
            )
        elif status_filter == 'no_show':
            now = timezone.localtime()
            today = now.date()
            current_time = now.time()
            participations = participations.filter(
                status=Participation.Statuses.JOINED,
                checked_in_at__isnull=True,
            ).filter(
                Q(event__event_date__lt=today) |
                Q(event__event_date=today, event__end_time__lt=current_time),
            )
        
        # Search by name or email
        if search_query:
            participations = participations.filter(
                Q(user__full_name__icontains=search_query) |
                Q(user__email__icontains=search_query)
            )
        
        participations = participations.order_by('-joined_at')
        
        # Build participant list with status
        participant_list = []
        for p in participations:
            if p.checked_in_at:
                p_status = 'attended'
            elif p.status == Participation.Statuses.WAITLISTED:
                p_status = 'waitlisted'
            elif p.status == Participation.Statuses.JOINED:
                # Check if event is finished
                now = timezone.localtime()
                if p.event.event_date < now.date() or (
                    p.event.event_date == now.date() and p.event.end_time < now.time()
                ):
                    p_status = 'no_show'
                else:
                    p_status = 'joined'
            else:
                p_status = 'cancelled'
            
            participant_list.append({
                'id': p.id,
                'user_id': p.user.id,
                'name': p.user.full_name,
                'email': p.user.email,
                'status': p_status,
                'joined_at': p.joined_at.isoformat(),
                'checked_in_at': p.checked_in_at.isoformat() if p.checked_in_at else None,
            })
        
        # Calculate summary
        total = Participation.objects.filter(event=event).count()
        joined = Participation.objects.filter(
            event=event,
            status=Participation.Statuses.JOINED,
        ).count()
        waitlisted = Participation.objects.filter(
            event=event,
            status=Participation.Statuses.WAITLISTED,
        ).count()
        attended = Participation.objects.filter(
            event=event,
            checked_in_at__isnull=False,
        ).count()
        
        now = timezone.localtime()
        today = now.date()
        current_time = now.time()
        no_shows = Participation.objects.filter(
            event=event,
            status=Participation.Statuses.JOINED,
            checked_in_at__isnull=True,
        ).filter(
            Q(event__event_date__lt=today) |
            Q(event__event_date=today, event__end_time__lt=current_time),
        ).count()
        
        return Response(
            {
                'event': {
                    'id': event.id,
                    'title': event.title,
                    'date': event.event_date.isoformat(),
                    'time': f"{event.start_time.isoformat()} - {event.end_time.isoformat()}",
                },
                'summary': {
                    'total': total,
                    'joined': joined,
                    'attended': attended,
                    'waitlisted': waitlisted,
                    'no_shows': no_shows,
                },
                'participants': participant_list,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, event_id):
        """Remove a participant from an event"""
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        participation_id = request.data.get('participation_id')
        if not participation_id:
            return Response(
                {'detail': 'participation_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation = get_object_or_404(Participation, id=participation_id, event_id=event_id)
        user = participation.user
        event = participation.event
        
        participation.delete()
        
        # Log the action
        log_admin_action(
            admin=current_user,
            action='participant_removed',
            target_type='participation',
            target_id=participation_id,
            target_details={
                'event_id': event.id,
                'event_title': event.title,
                'user_id': user.id,
                'user_name': user.full_name,
                'user_email': user.email,
            },
        )

        return Response(
            {
                'message': f'{user.full_name} has been removed from the event.',
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserListAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        role_filter = request.query_params.get('role')
        search_query = request.query_params.get('q', '').strip()
        active_filter = parse_boolean_query(request.query_params.get('is_active'))
        users = AEMUser.objects.select_related('settings')

        if role_filter == AEMUser.Roles.ADMIN:
            users = users.filter(role=AEMUser.Roles.ADMIN)
        elif role_filter == AEMUser.Roles.STUDENT:
            users = users.filter(role__in=[AEMUser.Roles.STUDENT, AEMUser.Roles.ORGANIZER])

        if search_query:
            users = users.filter(
                Q(full_name__icontains=search_query)
                | Q(email__icontains=search_query)
            )

        if active_filter is not None:
            users = users.filter(is_active=active_filter)

        users = users.annotate(
            role_order=Case(
                When(role=AEMUser.Roles.ADMIN, then=Value(0)),
                When(role=AEMUser.Roles.ORGANIZER, then=Value(1)),
                When(role=AEMUser.Roles.STUDENT, then=Value(1)),
                default=Value(3),
                output_field=IntegerField(),
            )
        ).order_by('role_order', 'full_name', 'id')

        return Response(
            {
                'results': AdminUserSerializer(users, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminUserUpdateAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def patch(self, request, user_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(AEMUser.objects.select_related('settings'), id=user_id)
        serializer = AdminUserUpdateSerializer(
            instance=user,
            data=request.data,
            partial=True,
            context={'current_user': current_user},
        )
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        return Response(
            {
                'message': 'User updated successfully.',
                'user': AdminUserSerializer(updated_user).data,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminBroadcastListCreateAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            broadcasts = (
                BroadcastMessage.objects.select_related('created_by')
                .order_by('-created_at', '-id')[:50]
            )
        except DatabaseError as exc:
            logger.exception('Failed to load broadcasts list for admin user %s', current_user.id)
            if ensure_broadcast_schema():
                try:
                    broadcasts = (
                        BroadcastMessage.objects.select_related('created_by')
                        .order_by('-created_at', '-id')[:50]
                    )
                except DatabaseError as retry_exc:
                    logger.exception('Broadcast list query still failing after schema bootstrap')
                    return Response(
                        {
                            'detail': (
                                'Broadcast tables are not ready. Apply database/migrations/002_admin_broadcast.sql '
                                f'on the target database and retry. DB reason: {_db_error_reason(retry_exc)}'
                            ),
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            else:
                return Response(
                    {
                        'detail': (
                            'Broadcast tables are not ready. Apply database/migrations/002_admin_broadcast.sql '
                            f'on the target database and retry. DB reason: {_db_error_reason(exc)}'
                        ),
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        return Response(
            {'results': BroadcastMessageSerializer(broadcasts, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminBroadcastCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        rate_key = f'aem:broadcast_cooldown:{current_user.id}'
        if cache.get(rate_key):
            return Response(
                {'detail': 'Please wait about a minute before sending another broadcast.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        now = timezone.now()
        scheduled_at = data.get('scheduled_at')
        is_future = bool(scheduled_at and scheduled_at > now)

        broadcast = BroadcastMessage(
            created_by=current_user,
            subject=data['subject'],
            body=data['body'],
            recipient_filter=data['recipient_filter'],
            priority=data['priority'],
            template_key=data.get('template_key') or None,
            scheduled_at=scheduled_at if is_future else None,
            status=(
                BroadcastMessage.Status.SCHEDULED
                if is_future
                else BroadcastMessage.Status.DRAFT
            ),
            created_at=now,
            updated_at=now,
        )
        try:
            broadcast.save()
        except DatabaseError as exc:
            logger.exception('Failed to create broadcast for admin user %s', current_user.id)
            if ensure_broadcast_schema():
                try:
                    broadcast.save()
                except DatabaseError as retry_exc:
                    logger.exception('Broadcast create still failing after schema bootstrap')
                    return Response(
                        {
                            'detail': (
                                'Could not create broadcast. Apply database/migrations/002_admin_broadcast.sql '
                                f'and check server logs. DB reason: {_db_error_reason(retry_exc)}'
                            ),
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            else:
                return Response(
                    {
                        'detail': (
                            'Could not create broadcast. Apply database/migrations/002_admin_broadcast.sql '
                            f'and check server logs. DB reason: {_db_error_reason(exc)}'
                        ),
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if not is_future:
            try:
                execute_broadcast_send(broadcast.id)
            except Exception:
                logger.exception('Failed to send broadcast %s immediately', broadcast.id)
                broadcast.status = BroadcastMessage.Status.FAILED
                broadcast.updated_at = timezone.now()
                broadcast.save(update_fields=['status', 'updated_at'])
            broadcast.refresh_from_db()

        cache.set(rate_key, True, timeout=60)

        return Response(
            BroadcastMessageSerializer(broadcast).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminBroadcastDetailAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, broadcast_id):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            broadcast = get_object_or_404(
                BroadcastMessage.objects.select_related('created_by'),
                pk=broadcast_id,
            )

            delivery_stats = MessageDelivery.objects.filter(broadcast_message_id=broadcast_id).aggregate(
                deliveries=Count('id'),
                read_receipts=Count('id', filter=Q(notification__read_at__isnull=False)),
                emails_sent=Count('id', filter=Q(email_sent=True)),
            )
        except DatabaseError as exc:
            logger.exception(
                'Failed to load broadcast detail %s for admin user %s',
                broadcast_id,
                current_user.id,
            )
            if ensure_broadcast_schema():
                try:
                    broadcast = get_object_or_404(
                        BroadcastMessage.objects.select_related('created_by'),
                        pk=broadcast_id,
                    )

                    delivery_stats = MessageDelivery.objects.filter(broadcast_message_id=broadcast_id).aggregate(
                        deliveries=Count('id'),
                        read_receipts=Count('id', filter=Q(notification__read_at__isnull=False)),
                        emails_sent=Count('id', filter=Q(email_sent=True)),
                    )
                except DatabaseError as retry_exc:
                    logger.exception('Broadcast detail query still failing after schema bootstrap')
                    return Response(
                        {
                            'detail': (
                                'Broadcast analytics tables are not ready. Apply database/migrations/002_admin_broadcast.sql '
                                f'on the target database and retry. DB reason: {_db_error_reason(retry_exc)}'
                            ),
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            else:
                return Response(
                    {
                        'detail': (
                            'Broadcast analytics tables are not ready. Apply database/migrations/002_admin_broadcast.sql '
                            f'on the target database and retry. DB reason: {_db_error_reason(exc)}'
                        ),
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response(
            {
                'broadcast': BroadcastMessageSerializer(broadcast).data,
                'analytics': {
                    'deliveries': delivery_stats['deliveries'] or 0,
                    'read_receipts': delivery_stats['read_receipts'] or 0,
                    'emails_sent': delivery_stats['emails_sent'] or 0,
                },
            },
            status=status.HTTP_200_OK,
        )


def send_unread_count_update(user_id):
    """Send unread count update via WebSocket"""
    try:
        channel_layer = get_channel_layer()
        
        # Get current unread count
        unread_count = Notification.objects.filter(
            user_id=user_id,
            read_at__isnull=True
        ).count()
        
        # Send to user's personal channel
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                'type': 'unread_count_update',
                'count': unread_count
            }
        )
    except Exception as e:
        # Log error but don't fail the request
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f'Failed to send unread count update: {e}')

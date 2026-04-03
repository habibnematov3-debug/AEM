from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Case, IntegerField, Q, Value, When
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_tokens import AuthTokenError, issue_auth_token, read_auth_token
from .models import AEMUser, Event, EventLike, Participation
from .notifications import (
    notify_event_moderation,
    notify_participation_cancelled,
    notify_participation_joined,
)
from .serializers import (
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    CurrentUserSerializer,
    EventParticipantSerializer,
    EventCreateSerializer,
    EventModerationSerializer,
    EventSerializer,
    JoinedParticipationSerializer,
    LoginSerializer,
    ParticipationActivitySerializer,
    ParticipationSerializer,
    ProfileUpdateSerializer,
    SignUpSerializer,
    UserSerializer,
)


PRESENCE_HEARTBEAT = timedelta(minutes=1)


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


def is_admin(user):
    return user is not None and user.role == AEMUser.Roles.ADMIN


def can_view_event(user, event):
    if event.moderation_status == Event.ModerationStatuses.APPROVED:
        return True

    if user is None:
        return False

    return is_admin(user) or event.creator_id == user.id


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
    }


def parse_boolean_query(value):
    if value is None:
        return None

    normalized = str(value).strip().lower()
    if normalized in {'true', '1', 'yes'}:
        return True
    if normalized in {'false', '0', 'no'}:
        return False
    return None


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
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name='dispatch')
class LoginAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        touch_user_presence(user, force=True)

        request.session.cycle_key()
        request.session['user_id'] = user.id

        return Response(
            {
                'message': 'Login successful.',
                'auth_token': issue_auth_token(user),
                'user': UserSerializer(user).data,
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
        events = Event.objects.select_related('creator')

        if scope == 'organizer':
            if current_user is None:
                return auth_required_response(request)
            events = events.filter(creator_id=current_user.id)
        else:
            events = events.filter(moderation_status=Event.ModerationStatuses.APPROVED)

        events = events.order_by('-created_at', '-id')
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

    def post(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        serializer = EventCreateSerializer(data=request.data, context={'creator': current_user})
        serializer.is_valid(raise_exception=True)
        event = serializer.save()

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
        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
        )
        if not can_view_event(current_user, event):
            return Response({'detail': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            EventSerializer(event, context={'current_user': current_user}).data,
            status=status.HTTP_200_OK,
        )

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
        updated_event = serializer.save()

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
            Event.objects.select_related('creator'),
            id=event_id,
        )

        if event.moderation_status != Event.ModerationStatuses.APPROVED:
            return Response(
                {'detail': 'This event is not publicly available yet.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if event.creator_id == current_user.id:
            return Response(
                {'detail': 'You cannot participate in your own event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Participation.objects.filter(user_id=current_user.id, event_id=event.id).exists():
            return Response(
                {'detail': 'You have already joined this event.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

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

        transaction.on_commit(lambda: notify_participation_joined(participation))

        return Response(
            {
                'message': 'You joined the event successfully.',
                'participation': ParticipationSerializer(participation).data,
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_201_CREATED,
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

        _, created = EventLike.objects.get_or_create(user_id=current_user.id, event_id=event.id)
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

        deleted_count, _ = EventLike.objects.filter(user_id=current_user.id, event_id=event.id).delete()
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
            .filter(user_id=current_user.id, status=Participation.Statuses.JOINED)
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
            status=Participation.Statuses.JOINED,
        ).first()

        if participation is None:
            return Response(
                {'detail': 'You have not joined this event.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        participation.status = Participation.Statuses.CANCELLED
        participation.save(update_fields=['status'])
        transaction.on_commit(lambda: notify_participation_cancelled(participation))

        return Response(
            {
                'message': 'Participation cancelled successfully.',
                'participation': ParticipationSerializer(participation).data,
                'event': EventSerializer(event, context={'current_user': current_user}).data,
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
            .filter(event_id=event.id, status=Participation.Statuses.JOINED)
            .order_by('-joined_at', '-id')
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
class AdminDashboardAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return auth_required_response(request)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        recent_events = Event.objects.select_related('creator').order_by('-created_at', '-id')[:5]
        recent_users = AEMUser.objects.select_related('settings').order_by('-created_at', '-id')[:5]
        recent_participations = Participation.objects.select_related('user', 'event').order_by(
            '-joined_at',
            '-id',
        )[:5]

        return Response(
            {
                'stats': get_admin_dashboard_stats(),
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

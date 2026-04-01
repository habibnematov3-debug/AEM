from django.db import IntegrityError, transaction
from django.db.models import Case, IntegerField, Q, Value, When
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AEMUser, Event, Participation
from .serializers import (
    CurrentUserSerializer,
    EventCreateSerializer,
    EventModerationSerializer,
    EventSerializer,
    LoginSerializer,
    ParticipationSerializer,
    ProfileUpdateSerializer,
    SignUpSerializer,
    UserSerializer,
)


def get_session_user(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return None

    return AEMUser.objects.filter(id=user_id, is_active=True).first()


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


@method_decorator(csrf_exempt, name='dispatch')
class SignUpAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                'message': 'Signup successful.',
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

        request.session.cycle_key()
        request.session['user_id'] = user.id

        return Response(
            {
                'message': 'Login successful.',
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
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(
            {'user': CurrentUserSerializer(current_user).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

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
                return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
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
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

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
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

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
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

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
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
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

        return Response(
            {
                'message': 'You joined the event successfully.',
                'participation': ParticipationSerializer(participation).data,
                'event': EventSerializer(event, context={'current_user': current_user}).data,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name='dispatch')
class AdminDashboardAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        return Response({'stats': get_admin_dashboard_stats()}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class AdminEventListAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        current_user = get_session_user(request)
        if current_user is None:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get('status')
        events = Event.objects.select_related('creator')
        if status_filter in {
            Event.ModerationStatuses.PENDING,
            Event.ModerationStatuses.APPROVED,
            Event.ModerationStatuses.REJECTED,
        }:
            events = events.filter(moderation_status=status_filter)

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
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_admin(current_user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        event = get_object_or_404(Event.objects.select_related('creator'), id=event_id)
        serializer = EventModerationSerializer(instance=event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_event = serializer.save()

        return Response(
            {
                'message': 'Event moderation updated successfully.',
                'event': EventSerializer(updated_event, context={'current_user': current_user}).data,
                'stats': get_admin_dashboard_stats(),
            },
            status=status.HTTP_200_OK,
        )

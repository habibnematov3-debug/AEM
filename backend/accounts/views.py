from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AEMUser, Event
from .serializers import (
    EventCreateSerializer,
    EventSerializer,
    LoginSerializer,
    SignUpSerializer,
    UserSerializer,
)


def get_session_user(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return None

    return AEMUser.objects.filter(id=user_id, is_active=True).first()


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
class EventListCreateAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        events = Event.objects.select_related('creator').order_by('-created_at', '-id')
        return Response({'results': EventSerializer(events, many=True).data}, status=status.HTTP_200_OK)

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
                'event': EventSerializer(event).data,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_exempt, name='dispatch')
class EventDetailAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, event_id):
        event = get_object_or_404(
            Event.objects.select_related('creator'),
            id=event_id,
        )
        return Response(EventSerializer(event).data, status=status.HTTP_200_OK)

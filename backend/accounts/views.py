from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, SignUpSerializer, UserSerializer


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

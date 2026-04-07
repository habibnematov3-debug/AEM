from django.urls import path

from .views import (
    AuthProvidersAPIView,
    CurrentUserAPIView,
    GoogleAuthAPIView,
    LoginAPIView,
    LogoutAPIView,
    SignUpAPIView,
)

urlpatterns = [
    path('providers/', AuthProvidersAPIView.as_view(), name='auth-providers'),
    path('signup/', SignUpAPIView.as_view(), name='signup'),
    path('google/', GoogleAuthAPIView.as_view(), name='google-auth'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('me/', CurrentUserAPIView.as_view(), name='current-user'),
]

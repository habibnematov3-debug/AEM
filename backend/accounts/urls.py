from django.urls import path

from .views import CurrentUserAPIView, LoginAPIView, LogoutAPIView, SignUpAPIView

urlpatterns = [
    path('signup/', SignUpAPIView.as_view(), name='signup'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('me/', CurrentUserAPIView.as_view(), name='current-user'),
]

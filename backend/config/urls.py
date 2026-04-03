from django.urls import include, path

from accounts.views import (
    AdminDashboardAPIView,
    AdminEventListAPIView,
    AdminEventModerationAPIView,
    AdminUserListAPIView,
    AdminUserUpdateAPIView,
    EventCancelParticipationAPIView,
    EventDetailAPIView,
    EventLikeAPIView,
    EventListCreateAPIView,
    EventMyCheckInTokenAPIView,
    EventParticipantCheckInAPIView,
    EventParticipantListAPIView,
    EventParticipateAPIView,
    EventTokenCheckInAPIView,
    MyParticipationListAPIView,
)

urlpatterns = [
    path('api/auth/', include('accounts.urls')),
    path('api/events/', EventListCreateAPIView.as_view(), name='events-list-create'),
    path('api/events/<int:event_id>/', EventDetailAPIView.as_view(), name='events-detail'),
    path(
        'api/events/<int:event_id>/participate/',
        EventParticipateAPIView.as_view(),
        name='events-participate',
    ),
    path('api/events/<int:event_id>/like/', EventLikeAPIView.as_view(), name='events-like'),
    path(
        'api/events/<int:event_id>/cancel-participation/',
        EventCancelParticipationAPIView.as_view(),
        name='events-cancel-participation',
    ),
    path(
        'api/events/<int:event_id>/participants/',
        EventParticipantListAPIView.as_view(),
        name='events-participants',
    ),
    path(
        'api/events/<int:event_id>/participants/<int:participation_id>/checkin/',
        EventParticipantCheckInAPIView.as_view(),
        name='events-participants-checkin',
    ),
    path(
        'api/events/<int:event_id>/my-checkin-token/',
        EventMyCheckInTokenAPIView.as_view(),
        name='events-my-checkin-token',
    ),
    path(
        'api/events/<int:event_id>/checkin-token/',
        EventTokenCheckInAPIView.as_view(),
        name='events-checkin-token',
    ),
    path('api/participations/me/', MyParticipationListAPIView.as_view(), name='participations-me'),
    path('api/admin/dashboard/', AdminDashboardAPIView.as_view(), name='admin-dashboard'),
    path('api/admin/events/', AdminEventListAPIView.as_view(), name='admin-events'),
    path('api/admin/users/', AdminUserListAPIView.as_view(), name='admin-users'),
    path('api/admin/users/<int:user_id>/', AdminUserUpdateAPIView.as_view(), name='admin-users-update'),
    path(
        'api/admin/events/<int:event_id>/moderate/',
        AdminEventModerationAPIView.as_view(),
        name='admin-events-moderate',
    ),
]

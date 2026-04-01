from django.urls import include, path

from accounts.views import (
    AdminDashboardAPIView,
    AdminEventListAPIView,
    AdminEventModerationAPIView,
    EventDetailAPIView,
    EventListCreateAPIView,
    EventParticipateAPIView,
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
    path('api/admin/dashboard/', AdminDashboardAPIView.as_view(), name='admin-dashboard'),
    path('api/admin/events/', AdminEventListAPIView.as_view(), name='admin-events'),
    path(
        'api/admin/events/<int:event_id>/moderate/',
        AdminEventModerationAPIView.as_view(),
        name='admin-events-moderate',
    ),
]

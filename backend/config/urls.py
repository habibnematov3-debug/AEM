from django.urls import include, path

from accounts.views import EventDetailAPIView, EventListCreateAPIView

urlpatterns = [
    path('api/auth/', include('accounts.urls')),
    path('api/events/', EventListCreateAPIView.as_view(), name='events-list-create'),
    path('api/events/<int:event_id>/', EventDetailAPIView.as_view(), name='events-detail'),
]

from django.urls import include, path

from accounts.views import EventListCreateAPIView

urlpatterns = [
    path('api/auth/', include('accounts.urls')),
    path('api/events/', EventListCreateAPIView.as_view(), name='events-list-create'),
]

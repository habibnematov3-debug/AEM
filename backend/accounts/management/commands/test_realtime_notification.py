from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from accounts.models import Event
from accounts.notifications import create_in_app_notification
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Test real-time notification system'

    def handle(self, *args, **options):
        # Get first user (or create a test user)
        user = User.objects.first()
        if not user:
            self.stdout.write('No users found. Please create a user first.')
            return

        # Get first event (or create a test event)
        event = Event.objects.first()
        if not event:
            self.stdout.write('No events found. Creating a test event...')
            event = Event.objects.create(
                creator=user,
                title='Test Event for Real-time Notifications',
                description='This is a test event to verify real-time notifications work.',
                location='Test Location',
                event_date=timezone.now().date(),
                start_time=timezone.now().time(),
                end_time=(timezone.now() + timezone.timedelta(hours=2)).time(),
                moderation_status=Event.ModerationStatuses.APPROVED,
                capacity=50,
            )

        # Create a test notification
        notification = create_in_app_notification(
            user=user,
            notification_type='event_approved',
            title='🧪 Test Real-time Notification',
            message='This is a test to verify real-time notifications are working!',
            event=event,
            link_url=f'/events/{event.id}'
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Test notification created!\n'
                f'User: {user.email}\n'
                f'Event: {event.title}\n'
                f'Notification ID: {notification.id}\n'
                f'Check your browser - you should see a toast notification!'
            )
        )

import logging
from datetime import datetime, timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Event, Notification, Participation, UserSettings


logger = logging.getLogger(__name__)


def format_event_schedule(event):
    event_date = event.event_date.strftime('%B %d, %Y')
    start_time = event.start_time.strftime('%H:%M')
    end_time = event.end_time.strftime('%H:%M')
    return f'{event_date} from {start_time} to {end_time}'


def build_event_path(event):
    return f'/events/{event.id}' if event is not None else ''


def user_wants_notifications(user):
    if user is None or not user.is_active or not user.email:
        return False

    try:
        settings_row = user.settings
    except UserSettings.DoesNotExist:
        return True

    return settings_row.notifications_enabled


def send_notification_email(*, subject, message, recipient):
    if not settings.AEM_EMAIL_ENABLED:
        logger.info('AEM email notifications are disabled; skipped email to %s.', recipient)
        return False

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception('Failed to send AEM email notification to %s.', recipient)
        return False


def create_in_app_notification(
    *,
    user,
    notification_type,
    title,
    message,
    event=None,
    link_url='',
):
    if user is None or not user.is_active:
        return None

    now = timezone.now()
    notification = Notification.objects.create(
        user=user,
        event=event,
        notification_type=notification_type,
        title=title,
        message=message,
        link_url=link_url or build_event_path(event),
        created_at=now,
        updated_at=now,
    )
    
    # Send real-time notification via WebSocket
    send_real_time_notification(notification)
    
    return notification


def send_real_time_notification(notification):
    """Send notification via WebSocket to user"""
    try:
        channel_layer = get_channel_layer()
        
        # Prepare notification data for frontend
        notification_data = {
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'notification_type': notification.notification_type,
            'link_url': notification.link_url,
            'created_at': notification.created_at.isoformat(),
            'read_at': notification.read_at.isoformat() if notification.read_at else None,
            'event': {
                'id': notification.event.id,
                'title': notification.event.title,
            } if notification.event else None,
        }
        
        # Send to user's personal channel
        async_to_sync(channel_layer.group_send)(
            f"user_{notification.user.id}",
            {
                'type': 'notification_message',
                'notification': notification_data
            }
        )
        
        # Update unread count
        unread_count = Notification.objects.filter(
            user=notification.user,
            read_at__isnull=True
        ).count()
        
        async_to_sync(channel_layer.group_send)(
            f"user_{notification.user.id}",
            {
                'type': 'unread_count_update',
                'count': unread_count
            }
        )
        
    except Exception as e:
        logger.warning(f'Failed to send real-time notification: {e}')


def notify_event_moderation(event, moderation_status):
    organizer = event.creator
    status_copy = {
        Event.ModerationStatuses.APPROVED: {
            'type': Notification.Types.EVENT_APPROVED,
            'title': f'Event approved: {event.title}',
            'message': (
                f'Your event "{event.title}" was approved and is now visible to students.'
            ),
            'email_subject': f'Your AEM event was approved: {event.title}',
            'email_message': (
                f'Hello {organizer.full_name},\n\n'
                f'Your event "{event.title}" has been approved and is now visible to students.\n\n'
                f'Location: {event.location}\n'
                f'Schedule: {format_event_schedule(event)}\n\n'
                'You can open AEM to review or manage the event.'
            ),
        },
        Event.ModerationStatuses.REJECTED: {
            'type': Notification.Types.EVENT_REJECTED,
            'title': f'Event rejected: {event.title}',
            'message': (
                f'Your event "{event.title}" was rejected by an administrator. Review it and update it if needed.'
            ),
            'email_subject': f'Your AEM event was rejected: {event.title}',
            'email_message': (
                f'Hello {organizer.full_name},\n\n'
                f'Your event "{event.title}" was rejected by an administrator.\n\n'
                f'Location: {event.location}\n'
                f'Schedule: {format_event_schedule(event)}\n\n'
                'Please review the event details in AEM and update it if needed.'
            ),
        },
    }

    payload = status_copy.get(moderation_status)
    if payload is None:
        return False

    create_in_app_notification(
        user=organizer,
        event=event,
        notification_type=payload['type'],
        title=payload['title'],
        message=payload['message'],
    )

    if not user_wants_notifications(organizer):
        return True

    return send_notification_email(
        subject=payload['email_subject'],
        message=payload['email_message'],
        recipient=organizer.email,
    )


def notify_participation_joined(participation):
    attendee = participation.user
    event = participation.event
    create_in_app_notification(
        user=attendee,
        event=event,
        notification_type=Notification.Types.PARTICIPATION_JOINED,
        title=f'Joined event: {event.title}',
        message=f'Your seat is confirmed for "{event.title}".',
    )

    attendee_email_sent = True
    if user_wants_notifications(attendee):
        attendee_email_sent = send_notification_email(
            subject=f'Participation confirmed: {event.title}',
            message=(
                f'Hello {attendee.full_name},\n\n'
                f'You have successfully joined "{event.title}".\n\n'
                f'Organizer: {event.creator.full_name}\n'
                f'Location: {event.location}\n'
                f'Schedule: {format_event_schedule(event)}\n\n'
                'We look forward to seeing you there.'
            ),
            recipient=attendee.email,
        )

    organizer = event.creator
    create_in_app_notification(
        user=organizer,
        event=event,
        notification_type=Notification.Types.PARTICIPATION_JOINED,
        title=f'New participant: {event.title}',
        message=f'{attendee.full_name} joined your event "{event.title}".',
    )

    organizer_email_sent = True
    if user_wants_notifications(organizer):
        organizer_email_sent = send_notification_email(
            subject=f'New participant in your event: {event.title}',
            message=(
                f'Hello {organizer.full_name},\n\n'
                f'{attendee.full_name} ({attendee.email}) has joined your event "{event.title}".\n\n'
                f'Location: {event.location}\n'
                f'Schedule: {format_event_schedule(event)}\n\n'
                'Open AEM to review your attendee list.'
            ),
            recipient=organizer.email,
        )

    return attendee_email_sent and organizer_email_sent


def notify_participation_waitlisted(participation):
    attendee = participation.user
    event = participation.event
    create_in_app_notification(
        user=attendee,
        event=event,
        notification_type=Notification.Types.PARTICIPATION_WAITLISTED,
        title=f'Added to waitlist: {event.title}',
        message=f'The event is full, so you were placed on the waitlist for "{event.title}".',
    )

    attendee_email_sent = True
    if user_wants_notifications(attendee):
        attendee_email_sent = send_notification_email(
            subject=f'Waitlist update: {event.title}',
            message=(
                f'Hello {attendee.full_name},\n\n'
                f'"{event.title}" is currently full, so you were added to the waitlist.\n\n'
                f'Location: {event.location}\n'
                f'Schedule: {format_event_schedule(event)}\n\n'
                'We will notify you if a confirmed seat opens up.'
            ),
            recipient=attendee.email,
        )

    organizer = event.creator
    create_in_app_notification(
        user=organizer,
        event=event,
        notification_type=Notification.Types.PARTICIPATION_WAITLISTED,
        title=f'New waitlisted attendee: {event.title}',
        message=f'{attendee.full_name} joined the waitlist for your event "{event.title}".',
    )

    organizer_email_sent = True
    if user_wants_notifications(organizer):
        organizer_email_sent = send_notification_email(
            subject=f'New waitlisted attendee in your event: {event.title}',
            message=(
                f'Hello {organizer.full_name},\n\n'
                f'{attendee.full_name} ({attendee.email}) joined the waitlist for "{event.title}".\n\n'
                f'Location: {event.location}\n'
                f'Schedule: {format_event_schedule(event)}\n\n'
                'Open AEM to review your attendee list and waitlist.'
            ),
            recipient=organizer.email,
        )

    return attendee_email_sent and organizer_email_sent


def notify_participation_cancelled(participation):
    attendee = participation.user
    event = participation.event
    create_in_app_notification(
        user=attendee,
        event=event,
        notification_type=Notification.Types.PARTICIPATION_CANCELLED,
        title=f'Participation cancelled: {event.title}',
        message=f'Your registration for "{event.title}" was cancelled.',
    )

    if not user_wants_notifications(attendee):
        return True

    return send_notification_email(
        subject=f'Participation cancelled: {event.title}',
        message=(
            f'Hello {attendee.full_name},\n\n'
            f'Your participation in "{event.title}" has been cancelled.\n\n'
            f'Location: {event.location}\n'
            f'Schedule: {format_event_schedule(event)}\n\n'
            'You can join again later if the event is still open.'
        ),
        recipient=attendee.email,
    )


def notify_waitlist_promoted(participation):
    attendee = participation.user
    event = participation.event
    create_in_app_notification(
        user=attendee,
        event=event,
        notification_type=Notification.Types.WAITLIST_PROMOTED,
        title=f'Seat confirmed: {event.title}',
        message=f'You were promoted from the waitlist and now have a confirmed seat for "{event.title}".',
    )

    if not user_wants_notifications(attendee):
        return True

    return send_notification_email(
        subject=f'You are confirmed for: {event.title}',
        message=(
            f'Hello {attendee.full_name},\n\n'
            f'Great news! Your waitlist spot for "{event.title}" has been promoted to confirmed attendance.\n\n'
            f'Location: {event.location}\n'
            f'Schedule: {format_event_schedule(event)}\n\n'
            'We look forward to seeing you there.'
        ),
        recipient=attendee.email,
    )


def notify_event_reminder(participation, *, hours_left):
    attendee = participation.user
    event = participation.event
    hours_label = max(1, int(round(hours_left)))
    create_in_app_notification(
        user=attendee,
        event=event,
        notification_type=Notification.Types.EVENT_REMINDER,
        title=f'Upcoming event reminder: {event.title}',
        message=(
            f'"{event.title}" starts in about {hours_label} hour'
            f'{"s" if hours_label != 1 else ""}.'
        ),
    )

    if not user_wants_notifications(attendee):
        return True

    return send_notification_email(
        subject=f'Reminder: {event.title} starts soon',
        message=(
            f'Hello {attendee.full_name},\n\n'
            f'This is a reminder that "{event.title}" starts in about {hours_label} hour'
            f'{"s" if hours_label != 1 else ""}.\n\n'
            f'Location: {event.location}\n'
            f'Schedule: {format_event_schedule(event)}\n\n'
            'Open AEM to review your event details and QR check-in pass.'
        ),
        recipient=attendee.email,
    )


def get_event_start_datetime(event):
    current_timezone = timezone.get_current_timezone()
    return timezone.make_aware(
        datetime.combine(event.event_date, event.start_time),
        current_timezone,
    )


def dispatch_due_event_reminders(*, now=None, hours_ahead=24, force=False):
    current_time = timezone.localtime(now or timezone.now())
    upper_bound = current_time + timedelta(hours=hours_ahead)
    participations = (
        Participation.objects.select_related('user', 'event', 'event__creator')
        .filter(
            status=Participation.Statuses.JOINED,
            checked_in_at__isnull=True,
            event__moderation_status=Event.ModerationStatuses.APPROVED,
        )
        .order_by('joined_at', 'id')
    )

    sent_count = 0
    for participation in participations:
        if not force and participation.reminder_sent_at is not None:
            continue

        event = participation.event
        start_at = get_event_start_datetime(event)
        if start_at <= current_time or start_at > upper_bound:
            continue

        hours_left = (start_at - current_time).total_seconds() / 3600
        notify_event_reminder(participation, hours_left=hours_left)
        participation.reminder_sent_at = current_time
        participation.save(update_fields=['reminder_sent_at'])
        sent_count += 1

    return sent_count

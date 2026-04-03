import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import Event, Participation, UserSettings


logger = logging.getLogger(__name__)


def format_event_schedule(event):
    event_date = event.event_date.strftime('%B %d, %Y')
    start_time = event.start_time.strftime('%H:%M')
    end_time = event.end_time.strftime('%H:%M')
    return f'{event_date} from {start_time} to {end_time}'


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


def notify_event_moderation(event, moderation_status):
    organizer = event.creator
    if not user_wants_notifications(organizer):
        return False

    status_copy = {
        Event.ModerationStatuses.APPROVED: {
            'subject': f'Your AEM event was approved: {event.title}',
            'message': (
                f'Hello {organizer.full_name},\n\n'
                f'Your event "{event.title}" has been approved and is now visible to students.\n\n'
                f'Location: {event.location}\n'
                f'Schedule: {format_event_schedule(event)}\n\n'
                'You can open AEM to review or manage the event.'
            ),
        },
        Event.ModerationStatuses.REJECTED: {
            'subject': f'Your AEM event was rejected: {event.title}',
            'message': (
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

    return send_notification_email(
        subject=payload['subject'],
        message=payload['message'],
        recipient=organizer.email,
    )


def notify_participation_joined(participation):
    attendee = participation.user
    event = participation.event

    if not user_wants_notifications(attendee):
        return False

    return send_notification_email(
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


def notify_participation_cancelled(participation):
    attendee = participation.user
    event = participation.event

    if not user_wants_notifications(attendee):
        return False

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

    if not user_wants_notifications(attendee):
        return False

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

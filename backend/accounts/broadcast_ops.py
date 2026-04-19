import logging

from django.utils import timezone
from django.utils.html import strip_tags

from .models import AEMUser, BroadcastMessage, MessageDelivery, Notification
from .notifications import create_in_app_notification, send_notification_email, user_wants_notifications

logger = logging.getLogger(__name__)


def recipients_queryset(recipient_filter: str):
    users = AEMUser.objects.filter(is_active=True)
    if recipient_filter == BroadcastMessage.RecipientFilter.STUDENTS:
        return users.filter(role=AEMUser.Roles.STUDENT)
    if recipient_filter == BroadcastMessage.RecipientFilter.ORGANIZERS:
        return users.filter(role=AEMUser.Roles.ORGANIZER)
    if recipient_filter == BroadcastMessage.RecipientFilter.ADMINS:
        return users.filter(role=AEMUser.Roles.ADMIN)
    return users


def execute_broadcast_send(broadcast_id: int) -> None:
    """Deliver a draft or scheduled broadcast to all targeted users."""
    try:
        broadcast = BroadcastMessage.objects.select_related('created_by').get(pk=broadcast_id)
    except BroadcastMessage.DoesNotExist:
        logger.warning('Broadcast %s not found.', broadcast_id)
        return

    if broadcast.status == BroadcastMessage.Status.SENT:
        return

    if broadcast.status not in (
        BroadcastMessage.Status.DRAFT,
        BroadcastMessage.Status.SCHEDULED,
    ):
        return

    now = timezone.now()
    queryset = recipients_queryset(broadcast.recipient_filter)
    total_targets = queryset.count()

    subject = strip_tags(broadcast.subject).strip() or 'Message from AEM'
    plain_body = strip_tags(broadcast.body).strip() or ''
    if broadcast.priority == BroadcastMessage.Priority.HIGH:
        subject = f'[Important] {subject}'

    email_ok = 0
    delivered = 0

    for user in queryset.iterator(chunk_size=200):
        try:
            notification = create_in_app_notification(
                user=user,
                notification_type=Notification.Types.ADMIN_BROADCAST,
                title=subject[:200],
                message=plain_body,
                event=None,
                link_url='/students',
            )
        except Exception:
            logger.exception('Broadcast %s: failed notification for user %s', broadcast_id, user.id)
            continue

        sent_email = False
        if user_wants_notifications(user) and user.email:
            try:
                sent_email = send_notification_email(
                    subject=subject,
                    message=f'{plain_body}\n',
                    recipient=user.email,
                )
            except Exception:
                logger.exception('Broadcast %s: failed email for user %s', broadcast_id, user.id)

        if sent_email:
            email_ok += 1

        try:
            MessageDelivery.objects.create(
                broadcast_message=broadcast,
                user=user,
                notification=notification,
                email_sent=bool(sent_email),
                created_at=now,
            )
        except Exception:
            logger.exception('Broadcast %s: failed delivery row for user %s', broadcast_id, user.id)
            continue

        delivered += 1

    broadcast.recipient_count = total_targets
    broadcast.email_delivered_count = email_ok
    broadcast.sent_at = now
    broadcast.updated_at = now
    broadcast.status = (
        BroadcastMessage.Status.SENT if delivered > 0 else BroadcastMessage.Status.FAILED
    )
    broadcast.save(
        update_fields=[
            'recipient_count',
            'email_delivered_count',
            'sent_at',
            'updated_at',
            'status',
        ],
    )


def process_due_scheduled_broadcasts() -> int:
    """Send scheduled broadcasts whose time has passed. Returns number started."""
    now = timezone.now()
    due_ids = list(
        BroadcastMessage.objects.filter(
            status=BroadcastMessage.Status.SCHEDULED,
            scheduled_at__isnull=False,
            scheduled_at__lte=now,
        ).values_list('id', flat=True)[:50],
    )

    for broadcast_id in due_ids:
        execute_broadcast_send(broadcast_id)

    return len(due_ids)

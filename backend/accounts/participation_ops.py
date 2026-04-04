from django.db import transaction
from django.utils import timezone

from .models import Participation


def count_joined_for_event(event_id):
    return Participation.objects.filter(
        event_id=event_id,
        status=Participation.Statuses.JOINED,
    ).count()


def calculate_no_show_count(joined_count, checked_in_count):
    return max(0, joined_count - checked_in_count)


def event_has_open_seat(event):
    if event.capacity is None:
        return True
    return count_joined_for_event(event.id) < event.capacity


@transaction.atomic
def promote_next_waitlisted(event_id):
    next_p = (
        Participation.objects.select_for_update()
        .filter(
            event_id=event_id,
            status=Participation.Statuses.WAITLISTED,
        )
        .order_by('joined_at', 'id')
        .first()
    )
    if next_p is None:
        return None
    now = timezone.now()
    next_p.status = Participation.Statuses.JOINED
    next_p.joined_at = now
    next_p.checked_in_at = None
    next_p.reminder_sent_at = None
    next_p.save(update_fields=['status', 'joined_at', 'checked_in_at', 'reminder_sent_at'])
    return next_p

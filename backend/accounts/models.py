from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


class AEMUser(models.Model):
    class Roles(models.TextChoices):
        STUDENT = 'student', 'Student'
        ORGANIZER = 'organizer', 'Organizer'
        ADMIN = 'admin', 'Admin'

    id = models.BigAutoField(primary_key=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=254, unique=True)
    password_hash = models.CharField(max_length=128)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.STUDENT)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'users'
        managed = False

    def __str__(self):
        return f'{self.full_name} <{self.email}>'

    @property
    def is_owner(self):
        normalized_email = (self.email or '').strip().lower()
        return bool(normalized_email and normalized_email in getattr(settings, 'AEM_OWNER_EMAILS', ()))

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)


class UserSettings(models.Model):
    class Themes(models.TextChoices):
        LIGHT = 'light', 'Light'
        DARK = 'dark', 'Dark'

    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        AEMUser,
        on_delete=models.CASCADE,
        related_name='settings',
        db_column='user_id',
    )
    notifications_enabled = models.BooleanField(default=True)
    theme = models.CharField(max_length=20, choices=Themes.choices, default=Themes.LIGHT)
    language_code = models.CharField(max_length=10, default='en')
    profile_image_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'settings'
        managed = False


class Event(models.Model):
    class ModerationStatuses(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    id = models.BigAutoField(primary_key=True)
    creator = models.ForeignKey(
        AEMUser,
        on_delete=models.CASCADE,
        related_name='created_events',
        db_column='creator_id',
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=100, default='general')
    location = models.CharField(max_length=200)
    image_url = models.TextField(blank=True, null=True)
    event_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    moderation_status = models.CharField(
        max_length=20,
        choices=ModerationStatuses.choices,
        default=ModerationStatuses.PENDING,
    )
    capacity = models.PositiveIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'events'
        managed = False


class Participation(models.Model):
    class Statuses(models.TextChoices):
        JOINED = 'joined', 'Joined'
        WAITLISTED = 'waitlisted', 'Waitlisted'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        AEMUser,
        on_delete=models.CASCADE,
        related_name='participations',
        db_column='user_id',
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='participations',
        db_column='event_id',
    )
    status = models.CharField(max_length=20, choices=Statuses.choices, default=Statuses.JOINED)
    joined_at = models.DateTimeField(default=timezone.now)
    checked_in_at = models.DateTimeField(blank=True, null=True)
    reminder_sent_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'participations'
        managed = False
        unique_together = (('user', 'event'),)


class EventLike(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        AEMUser,
        on_delete=models.CASCADE,
        related_name='event_likes',
        db_column='user_id',
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='likes',
        db_column='event_id',
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'event_likes'
        managed = False
        unique_together = (('user', 'event'),)


class Notification(models.Model):
    class Types(models.TextChoices):
        EVENT_APPROVED = 'event_approved', 'Event approved'
        EVENT_REJECTED = 'event_rejected', 'Event rejected'
        PARTICIPATION_JOINED = 'participation_joined', 'Participation joined'
        PARTICIPATION_WAITLISTED = 'participation_waitlisted', 'Participation waitlisted'
        PARTICIPATION_CANCELLED = 'participation_cancelled', 'Participation cancelled'
        WAITLIST_PROMOTED = 'waitlist_promoted', 'Waitlist promoted'
        EVENT_REMINDER = 'event_reminder', 'Event reminder'

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        AEMUser,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_column='user_id',
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_column='event_id',
        blank=True,
        null=True,
    )
    notification_type = models.CharField(max_length=40, choices=Types.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link_url = models.CharField(max_length=255, blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'notifications'
        managed = False

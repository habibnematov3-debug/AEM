import logging

from django.db import connection


logger = logging.getLogger(__name__)


def ensure_core_schema() -> bool:
    """Repair optional core schema extensions used by notifications and admin analytics."""
    if connection.vendor != 'postgresql':
        return False

    statements = (
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL,
            event_id BIGINT NULL,
            notification_type VARCHAR(40) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            link_url VARCHAR(255) NULL,
            read_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_notifications_user
                FOREIGN KEY (user_id)
                REFERENCES users (id)
                ON DELETE CASCADE,
            CONSTRAINT fk_notifications_event
                FOREIGN KEY (event_id)
                REFERENCES events (id)
                ON DELETE CASCADE,
            CONSTRAINT chk_notifications_type
                CHECK (
                    notification_type IN (
                        'event_approved',
                        'event_rejected',
                        'participation_joined',
                        'participation_waitlisted',
                        'participation_cancelled',
                        'waitlist_promoted',
                        'event_reminder',
                        'admin_broadcast'
                    )
                )
        )
        """,
        'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL',
        'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        'ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL',
        'ALTER TABLE participations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NULL',
        'ALTER TABLE participations ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ NULL',
        (
            'CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at '
            'ON notifications (user_id, created_at DESC)'
        ),
        (
            'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at '
            'ON notifications (user_id, read_at)'
        ),
        (
            'CREATE INDEX IF NOT EXISTS idx_participations_event_status_joined_at '
            'ON participations (event_id, status, joined_at)'
        ),
    )

    try:
        with connection.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
        return True
    except Exception:
        logger.exception('Failed to auto-bootstrap core schema extensions')
        return False

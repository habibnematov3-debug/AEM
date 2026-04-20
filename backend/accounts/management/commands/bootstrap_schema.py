from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import connection, transaction
import sqlparse


class Command(BaseCommand):
    help = 'Create the AEM MVP PostgreSQL schema in the current database if it does not exist.'

    def handle(self, *args, **options):
        existing_tables = set(connection.introspection.table_names())
        core_tables = {'users', 'settings', 'events', 'participations'}

        with transaction.atomic():
            with connection.cursor() as cursor:
                # Ensure optional columns exist before any logic that might trigger queries

                if not core_tables.issubset(existing_tables):
                    schema_path = Path(__file__).resolve().parents[4] / 'database' / 'aem_schema_v1.sql'
                    sql_script = schema_path.read_text(encoding='utf-8')
                    statements = [statement.strip() for statement in sqlparse.split(sql_script) if statement.strip()]

                    for statement in statements:
                        cursor.execute(statement)

                cursor.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ')
                cursor.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)')
                cursor.execute(
                    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique '
                    'ON users (google_sub) WHERE google_sub IS NOT NULL'
                )
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS event_likes (
                        id BIGSERIAL PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        event_id BIGINT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        CONSTRAINT fk_event_likes_user
                            FOREIGN KEY (user_id)
                            REFERENCES users (id)
                            ON DELETE CASCADE,
                        CONSTRAINT fk_event_likes_event
                            FOREIGN KEY (event_id)
                            REFERENCES events (id)
                            ON DELETE CASCADE,
                        CONSTRAINT uq_event_likes_user_event
                            UNIQUE (user_id, event_id)
                    )
                    """
                )
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON event_likes (event_id)'
                )
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON event_likes (user_id)'
                )

                cursor.execute('ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER NULL')
                cursor.execute('ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL')
                cursor.execute('ALTER TABLE participations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NULL')
                cursor.execute('ALTER TABLE participations ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ NULL')
                cursor.execute('ALTER TABLE participations DROP CONSTRAINT IF EXISTS chk_participations_status')
                cursor.execute(
                    """
                    ALTER TABLE participations ADD CONSTRAINT chk_participations_status
                        CHECK (status IN ('joined', 'cancelled', 'waitlisted'))
                    """
                )
                cursor.execute(
                    'ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_capacity_positive'
                )
                cursor.execute(
                    """
                    ALTER TABLE events ADD CONSTRAINT chk_events_capacity_positive
                        CHECK (capacity IS NULL OR capacity >= 1)
                    """
                )
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_participations_event_status_joined_at '
                    'ON participations (event_id, status, joined_at)'
                )
                cursor.execute(
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
                    """
                )
                cursor.execute('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL')
                cursor.execute(
                    'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()'
                )
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at '
                    'ON notifications (user_id, created_at DESC)'
                )
                cursor.execute(
                    'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_at '
                    'ON notifications (user_id, read_at)'
                )

        self.stdout.write(self.style.SUCCESS('AEM schema synchronized successfully.'))

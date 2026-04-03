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
                if not core_tables.issubset(existing_tables):
                    schema_path = Path(__file__).resolve().parents[4] / 'database' / 'aem_schema_v1.sql'
                    sql_script = schema_path.read_text(encoding='utf-8')
                    statements = [statement.strip() for statement in sqlparse.split(sql_script) if statement.strip()]

                    for statement in statements:
                        cursor.execute(statement)

                cursor.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ')
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
                cursor.execute('ALTER TABLE participations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NULL')
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

        self.stdout.write(self.style.SUCCESS('AEM schema synchronized successfully.'))

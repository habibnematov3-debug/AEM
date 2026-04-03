-- AEM: capacity, waitlist, check-in (run once on existing databases)
BEGIN;

ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_capacity_positive;
ALTER TABLE events ADD CONSTRAINT chk_events_capacity_positive CHECK (capacity IS NULL OR capacity >= 1);

ALTER TABLE participations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ NULL;

ALTER TABLE participations DROP CONSTRAINT IF EXISTS chk_participations_status;
ALTER TABLE participations ADD CONSTRAINT chk_participations_status
    CHECK (status IN ('joined', 'cancelled', 'waitlisted'));

CREATE INDEX IF NOT EXISTS idx_participations_event_status_joined_at
    ON participations (event_id, status, joined_at);

COMMIT;

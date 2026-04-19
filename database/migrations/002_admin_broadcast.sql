-- Admin broadcast messaging: extend notifications + new tables.
-- Run against an existing AEM database (after aem_schema_v1).

BEGIN;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (
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
);

CREATE TABLE IF NOT EXISTS broadcast_messages (
    id BIGSERIAL PRIMARY KEY,
    created_by_id BIGINT NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    recipient_filter VARCHAR(20) NOT NULL DEFAULT 'all',
    priority VARCHAR(10) NOT NULL DEFAULT 'normal',
    template_key VARCHAR(40) NULL,
    scheduled_at TIMESTAMPTZ NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMPTZ NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    email_delivered_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_broadcast_messages_creator
        FOREIGN KEY (created_by_id)
        REFERENCES users (id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_broadcast_messages_recipient_filter
        CHECK (recipient_filter IN ('all', 'students', 'organizers', 'admins')),
    CONSTRAINT chk_broadcast_messages_priority
        CHECK (priority IN ('normal', 'high')),
    CONSTRAINT chk_broadcast_messages_status
        CHECK (status IN ('draft', 'scheduled', 'sent', 'failed'))
);

CREATE TABLE IF NOT EXISTS message_deliveries (
    id BIGSERIAL PRIMARY KEY,
    broadcast_message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    notification_id BIGINT NULL,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_message_deliveries_broadcast
        FOREIGN KEY (broadcast_message_id)
        REFERENCES broadcast_messages (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_message_deliveries_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_message_deliveries_notification
        FOREIGN KEY (notification_id)
        REFERENCES notifications (id)
        ON DELETE SET NULL,
    CONSTRAINT uq_message_deliveries_broadcast_user
        UNIQUE (broadcast_message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at
    ON broadcast_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status_scheduled
    ON broadcast_messages (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_message_deliveries_broadcast
    ON message_deliveries (broadcast_message_id);

COMMIT;

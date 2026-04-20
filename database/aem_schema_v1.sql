-- AEM MVP PostgreSQL schema v1.5 (capacity, waitlist, check-in)
-- For pgAdmin 4
-- Create a database first, for example: aem_db
-- Then connect to that database and run this script.

BEGIN;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    google_sub VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_role
        CHECK (role IN ('student', 'organizer', 'admin')),
    CONSTRAINT chk_users_full_name_not_blank
        CHECK (CHAR_LENGTH(BTRIM(full_name)) > 0)
);

CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    theme VARCHAR(20) NOT NULL DEFAULT 'light',
    language_code VARCHAR(10) NOT NULL DEFAULT 'en',
    profile_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_settings_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_settings_theme
        CHECK (theme IN ('light', 'dark')),
    CONSTRAINT chk_settings_language_code
        CHECK (language_code IN ('en', 'ru', 'uz'))
);

CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    location VARCHAR(200) NOT NULL,
    image_url TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    capacity INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_events_capacity_positive
        CHECK (capacity IS NULL OR capacity >= 1),
    CONSTRAINT fk_events_creator
        FOREIGN KEY (creator_id)
        REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_events_title_not_blank
        CHECK (CHAR_LENGTH(BTRIM(title)) > 0),
    CONSTRAINT chk_events_description_not_blank
        CHECK (CHAR_LENGTH(BTRIM(description)) > 0),
    CONSTRAINT chk_events_category_not_blank
        CHECK (CHAR_LENGTH(BTRIM(category)) > 0),
    CONSTRAINT chk_events_location_not_blank
        CHECK (CHAR_LENGTH(BTRIM(location)) > 0),
    CONSTRAINT chk_events_image_url_not_blank
        CHECK (image_url IS NULL OR CHAR_LENGTH(BTRIM(image_url)) > 0),
    CONSTRAINT chk_events_moderation_status
        CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT chk_events_time_order
        CHECK (end_time > start_time)
);

CREATE TABLE participations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'joined',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_in_at TIMESTAMPTZ NULL,
    reminder_sent_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_participations_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_participations_event
        FOREIGN KEY (event_id)
        REFERENCES events (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_participations_status
        CHECK (status IN ('joined', 'cancelled', 'waitlisted')),
    CONSTRAINT uq_participations_user_event
        UNIQUE (user_id, event_id)
);

CREATE TABLE event_likes (
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
);

CREATE TABLE notifications (
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
);

CREATE TABLE broadcast_messages (
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

CREATE TABLE message_deliveries (
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

CREATE INDEX idx_events_creator_id
    ON events (creator_id);

CREATE INDEX idx_events_moderation_status_event_date
    ON events (moderation_status, event_date, start_time);

CREATE INDEX idx_participations_event_id
    ON participations (event_id);

CREATE INDEX idx_participations_event_status_joined_at
    ON participations (event_id, status, joined_at);

CREATE INDEX idx_participations_user_id
    ON participations (user_id);

CREATE INDEX idx_event_likes_event_id
    ON event_likes (event_id);

CREATE INDEX idx_event_likes_user_id
    ON event_likes (user_id);

CREATE INDEX idx_notifications_user_created_at
    ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_read_at
    ON notifications (user_id, read_at);

CREATE INDEX idx_broadcast_messages_created_at
    ON broadcast_messages (created_at DESC);

CREATE INDEX idx_broadcast_messages_status_scheduled
    ON broadcast_messages (status, scheduled_at);

CREATE INDEX idx_message_deliveries_broadcast
    ON message_deliveries (broadcast_message_id);

COMMIT;

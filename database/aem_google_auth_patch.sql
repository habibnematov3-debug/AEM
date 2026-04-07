BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique
    ON users (google_sub)
    WHERE google_sub IS NOT NULL;

COMMIT;

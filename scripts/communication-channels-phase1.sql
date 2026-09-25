BEGIN;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS communication_preference text NOT NULL DEFAULT 'portal',
  ADD COLUMN IF NOT EXISTS whatsapp_number_e164 text,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_withdrawn_at timestamptz;

DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_communication_preference_check
    CHECK (communication_preference IN ('portal', 'email', 'whatsapp'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_whatsapp_e164_check
    CHECK (whatsapp_number_e164 IS NULL OR whatsapp_number_e164 ~ '^\+[1-9][0-9]{7,14}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


ALTER TABLE notification_delivery_attempts
  DROP CONSTRAINT IF EXISTS notification_delivery_attempts_status_check;

ALTER TABLE notification_delivery_attempts
  ADD CONSTRAINT notification_delivery_attempts_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped', 'ready', 'manually_sent', 'cancelled'));

ALTER TABLE notification_delivery_attempts
  ADD COLUMN IF NOT EXISTS prepared_message text,
  ADD COLUMN IF NOT EXISTS prepared_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS manually_sent_by uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS manually_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_delivery_channel
  ON notification_delivery_attempts (notification_id, channel);

CREATE INDEX IF NOT EXISTS idx_manual_whatsapp_delivery_queue
  ON notification_delivery_attempts (status, attempted_at DESC)
  WHERE channel = 'whatsapp' AND status IN ('pending', 'ready');

COMMIT;

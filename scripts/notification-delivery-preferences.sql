-- Communication-preference-aware notification delivery.
-- Portal notifications remain canonical in public.notifications.

CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id),
  event_type text NOT NULL,
  resource_type text,
  resource_id text,
  channel text NOT NULL,
  destination text,
  status text NOT NULL DEFAULT 'pending',
  provider text,
  preference text,
  sensitivity text NOT NULL DEFAULT 'brief',
  fallback_of uuid REFERENCES notification_delivery_attempts(id),
  error_code text,
  error_message text,
  idempotency_key text NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT notification_delivery_attempts_status_check
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'skipped')),
  CONSTRAINT notification_delivery_attempts_channel_check
    CHECK (channel IN ('email', 'whatsapp'))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_delivery_attempts'
      AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE notification_delivery_attempts
      ADD COLUMN idempotency_key text;
  END IF;
END $$;

UPDATE notification_delivery_attempts
SET idempotency_key = notification_id::text || ':' || channel
WHERE idempotency_key IS NULL
  AND notification_id IS NOT NULL;

UPDATE notification_delivery_attempts
SET idempotency_key = user_id::text || ':' || event_type || ':' || channel || ':' || id::text
WHERE idempotency_key IS NULL;

ALTER TABLE notification_delivery_attempts
  ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE notification_delivery_attempts
  ALTER COLUMN notification_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notification_delivery_attempts_dedupe_idx
  ON notification_delivery_attempts (
    notification_id,
    channel
  );

CREATE UNIQUE INDEX IF NOT EXISTS notification_delivery_attempts_idempotency_idx
  ON notification_delivery_attempts(idempotency_key);

CREATE INDEX IF NOT EXISTS notification_delivery_attempts_notification_idx
  ON notification_delivery_attempts(notification_id);

CREATE INDEX IF NOT EXISTS notification_delivery_attempts_user_status_idx
  ON notification_delivery_attempts(user_id, status, attempted_at DESC);

ALTER TABLE notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON notification_delivery_attempts FROM anon;
REVOKE ALL ON notification_delivery_attempts FROM authenticated;

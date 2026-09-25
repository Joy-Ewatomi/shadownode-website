BEGIN;

CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  generation_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT two_factor_recovery_codes_hash_length CHECK (char_length(code_hash) = 64),
  CONSTRAINT two_factor_recovery_codes_user_hash_unique UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_two_factor_recovery_codes_active
  ON two_factor_recovery_codes (user_id, code_hash)
  WHERE used_at IS NULL;

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS password_login_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS welcome_email_deliveries (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT welcome_email_deliveries_status_check
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  CONSTRAINT welcome_email_deliveries_attempt_count_check CHECK (attempt_count >= 0)
);

COMMIT;

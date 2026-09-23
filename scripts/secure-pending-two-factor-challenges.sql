BEGIN;

CREATE TABLE IF NOT EXISTS pending_two_factor_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  login_attempt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  primary_auth_method text NOT NULL DEFAULT 'password',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_ip text,
  created_user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_2fa_user_active
  ON pending_two_factor_challenges (user_id, expires_at)
  WHERE consumed_at IS NULL;

COMMIT;

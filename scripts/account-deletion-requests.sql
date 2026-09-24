BEGIN;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'approved', 'rejected', 'completed')),
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  cooling_off_ends_at timestamptz NOT NULL,
  reviewed_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_ip text,
  created_user_agent text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_one_pending
  ON account_deletion_requests (user_id) WHERE status = 'pending';

COMMIT;

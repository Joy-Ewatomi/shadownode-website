BEGIN;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS custom_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_country varchar(2),
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_key uuid,
  ADD COLUMN IF NOT EXISTS admin_recommendation jsonb,
  ADD COLUMN IF NOT EXISTS super_admin_decision jsonb,
  ADD COLUMN IF NOT EXISTS internal_decision_reason text,
  ADD COLUMN IF NOT EXISTS client_facing_status_explanation text,
  ADD COLUMN IF NOT EXISTS decision_confirmed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_custom_submission_key
  ON requests (user_id, submission_key)
  WHERE submission_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_custom_review_queue
  ON requests (status, created_at DESC)
  WHERE service_type = 'custom_service';

CREATE TABLE IF NOT EXISTS request_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES app_users(id),
  amendment_type varchar(40) NOT NULL DEFAULT 'additional_information',
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_amendments_request_created
  ON request_amendments (request_id, created_at ASC);

COMMIT;

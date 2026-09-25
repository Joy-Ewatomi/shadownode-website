BEGIN;

CREATE TABLE IF NOT EXISTS service_launch_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL CHECK (service_key IN (
    'digital_forensics', 'ethical_hacking', 'government_consulting',
    'correctional_intelligence', 'legal_advisory',
    'research_threat_intelligence', 'opsec_consulting'
  )),
  email_normalized text NOT NULL,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'public_homepage',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified', 'unsubscribed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  unsubscribed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_launch_interest_email
  ON service_launch_interests (service_key, lower(email_normalized));

CREATE TABLE IF NOT EXISTS service_launch_interest_rate_limits (
  request_fingerprint_hash text NOT NULL,
  window_started_at timestamptz NOT NULL,
  submission_count integer NOT NULL DEFAULT 1 CHECK (submission_count > 0),
  PRIMARY KEY (request_fingerprint_hash, window_started_at)
);

COMMIT;

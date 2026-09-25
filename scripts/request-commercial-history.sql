BEGIN;

ALTER TABLE quote_versions
  ADD COLUMN IF NOT EXISTS scope_summary text,
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES app_users(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS supersedes_quote_version_id uuid REFERENCES quote_versions(id),
  ADD COLUMN IF NOT EXISTS negotiation_id uuid REFERENCES quote_negotiations(id);

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS accepted_quote_version_id uuid REFERENCES quote_versions(id);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS quote_version_id uuid REFERENCES quote_versions(id),
  ADD COLUMN IF NOT EXISTS provider_reference text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason_category text,
  ADD COLUMN IF NOT EXISTS provider_event_reference text;

UPDATE payments
SET provider_reference = transaction_id
WHERE provider_reference IS NULL AND transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_reference
  ON payments (provider, provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_successful_payment_per_quote
  ON payments (quote_version_id)
  WHERE status = 'paid' AND quote_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_versions_request_history
  ON quote_versions (request_id, version_number, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_request_history
  ON payments (request_id, created_at);

COMMIT;

-- Historical backfill is intentionally not automatic. Link only rows where the
-- accepted quote can be proven from audit history, amount, currency and timing.
-- Ambiguous historical payments must remain unlinked for manual review.

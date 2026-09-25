BEGIN;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS initiated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_transaction_id
  ON payments (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

COMMIT;

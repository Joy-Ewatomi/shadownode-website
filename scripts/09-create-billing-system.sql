-- Case Request and Billing Workflow foundation.
-- Extends the existing requests table used by the public request flow.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS urgency VARCHAR(40),
  ADD COLUMN IF NOT EXISTS preferred_deadline DATE,
  ADD COLUMN IF NOT EXISTS quote_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS quote_currency VARCHAR(10) DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS quote_notes TEXT,
  ADD COLUMN IF NOT EXISTS converted_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requests_client
  ON requests(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_status
  ON requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  client_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'paid', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_client
  ON invoices(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_case
  ON invoices(case_id);

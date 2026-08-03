-- Production request analysis, quote review, negotiation, and conversion workflow.
-- Review and apply manually in Supabase before deploying the application code.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS ai_complexity VARCHAR(40),
  ADD COLUMN IF NOT EXISTS ai_estimated_hours NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS ai_suggested_service VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ai_suggested_priority VARCHAR(40),
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS approved_quote_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS approved_quote_currency VARCHAR(10) DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS approved_quote_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_estimated_completion DATE,
  ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_quote_action VARCHAR(40),
  ADD COLUMN IF NOT EXISTS admin_quote_notes TEXT,
  ADD COLUMN IF NOT EXISTS super_admin_reviewed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS super_admin_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS super_admin_quote_action VARCHAR(40),
  ADD COLUMN IF NOT EXISTS super_admin_quote_notes TEXT;

CREATE TABLE IF NOT EXISTS quote_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  assigned_reviewer_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  owner_approver_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(40) NOT NULL DEFAULT 'requested',
  original_ai_estimate NUMERIC(12, 2),
  original_quote_amount NUMERIC(12, 2),
  approved_quote_currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  requested_budget NUMERIC(12, 2),
  client_reason TEXT NOT NULL,
  client_notes TEXT,
  administrator_recommendation TEXT,
  revised_quote_amount NUMERIC(12, 2),
  owner_decision VARCHAR(40),
  owner_decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quote_negotiations_status_check
    CHECK (status IN ('requested', 'reviewing', 'approved', 'rejected', 'revised_quote_sent', 'closed')),
  CONSTRAINT quote_negotiations_owner_decision_check
    CHECK (owner_decision IS NULL OR owner_decision IN ('approved', 'rejected', 'modified'))
);

CREATE INDEX IF NOT EXISTS idx_quote_negotiations_request
  ON quote_negotiations(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_negotiations_reviewer
  ON quote_negotiations(assigned_reviewer_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS request_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_audit_events_request
  ON request_audit_events(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_request_audit_events_action
  ON request_audit_events(action, created_at DESC);

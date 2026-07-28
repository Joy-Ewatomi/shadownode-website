-- Intelligence Report Generation System.
-- Run after the case, auth, evidence, and investigation graph migrations.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS case_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title VARCHAR(255),
  report_type VARCHAR(80),
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  classification VARCHAR(80),
  executive_summary TEXT,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_reports_status_check
    CHECK (status IN ('draft', 'review', 'approved', 'published'))
);

CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES case_reports(id) ON DELETE CASCADE,
  section_type VARCHAR(80),
  title VARCHAR(255),
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES case_reports(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES evidence_files(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS report_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES case_reports(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES investigation_entities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_case_reports_case
  ON case_reports(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_sections_report
  ON report_sections(report_id, order_index);

CREATE INDEX IF NOT EXISTS idx_report_evidence_links_report
  ON report_evidence_links(report_id);

CREATE INDEX IF NOT EXISTS idx_report_entity_links_report
  ON report_entity_links(report_id);

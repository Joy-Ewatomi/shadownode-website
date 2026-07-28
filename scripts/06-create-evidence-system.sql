CREATE TABLE IF NOT EXISTS evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT,
  sha256_hash TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evidence_files_status_check
    CHECK (status IN ('submitted', 'verified', 'rejected', 'archived'))
);

CREATE TABLE IF NOT EXISTS evidence_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID REFERENCES evidence_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_files_case
  ON evidence_files(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_files_hash
  ON evidence_files(sha256_hash);

CREATE INDEX IF NOT EXISTS idx_evidence_activity_evidence
  ON evidence_activity(evidence_id, created_at DESC);

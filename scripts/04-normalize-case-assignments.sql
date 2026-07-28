-- Normalize case assignments without rewriting or deleting existing rows.
-- Existing case_assignments.assigned_to values remain intact for compatibility.

ALTER TABLE case_assignments
  ADD COLUMN IF NOT EXISTS assignment_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE case_assignments ca
SET assignment_role = COALESCE(ca.assignment_role, u.role, 'investigator')
FROM user_profiles up
LEFT JOIN app_users u ON u.id = up.user_id
WHERE ca.assigned_to = up.id
  AND ca.assignment_role IS NULL;

UPDATE case_assignments
SET status = 'assigned'
WHERE status IS NULL;

ALTER TABLE case_assignments
  DROP CONSTRAINT IF EXISTS case_assignments_status_check;

ALTER TABLE case_assignments
  ADD CONSTRAINT case_assignments_status_check
  CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed', 'removed'));

CREATE INDEX IF NOT EXISTS idx_case_assignments_case_role
  ON case_assignments(case_id, assignment_role);

CREATE INDEX IF NOT EXISTS idx_case_assignments_assigned_status
  ON case_assignments(assigned_to, status)
  WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES case_assignments(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_case
  ON notifications(case_id, created_at DESC);

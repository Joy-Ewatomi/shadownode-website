-- Migration: Add training modules/sessions/materials/progress tables
-- Note: Assumes Postgres with gen_random_uuid() available (pgcrypto extension)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_engagement_id UUID NOT NULL REFERENCES training_engagements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  module_order INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_engagement_id UUID NOT NULL REFERENCES training_engagements(id) ON DELETE CASCADE,
  module_id UUID REFERENCES training_modules(id) NULL,
  trainer_id UUID REFERENCES user_profiles(id) NULL,
  scheduled_at TIMESTAMPTZ NULL,
  duration_minutes INTEGER NULL,
  session_type VARCHAR(50) NULL,
  meeting_url TEXT NULL,
  location TEXT NULL,
  status VARCHAR(30) DEFAULT 'scheduled',
  attendance_status VARCHAR(30) DEFAULT 'pending',
  session_notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_engagement_id UUID NOT NULL REFERENCES training_engagements(id) ON DELETE CASCADE,
  module_id UUID REFERENCES training_modules(id) NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  material_type VARCHAR(50) DEFAULT 'other',
  file_url TEXT NULL,
  external_url TEXT NULL,
  visibility VARCHAR(30) DEFAULT 'private',
  uploaded_by UUID REFERENCES user_profiles(id) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_engagement_id UUID NOT NULL REFERENCES training_engagements(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  client_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0,
  trainer_notes TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  updated_by UUID REFERENCES user_profiles(id) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_modules_engagement ON training_modules(training_engagement_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_engagement ON training_sessions(training_engagement_id);
CREATE INDEX IF NOT EXISTS idx_training_materials_engagement ON training_materials(training_engagement_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_engagement ON training_module_progress(training_engagement_id);

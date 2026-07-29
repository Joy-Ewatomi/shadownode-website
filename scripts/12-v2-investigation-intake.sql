-- ShadowNode Intelligence Bureau
-- Investigation Request Intake v2 — Professional Service Expansion
-- Adds fields for enhanced investigation intake workflow
-- Does NOT alter existing request/quote/workflow relationships

-- ================================================================
-- STEP 3 — Additional Identifying Information (OSINT only, optional)
-- ================================================================

-- Physical Description
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS subject_approximate_age VARCHAR(20),
  ADD COLUMN IF NOT EXISTS subject_height VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subject_weight VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subject_hair_color VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subject_eye_color VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subject_skin_tone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subject_distinguishing_marks TEXT,
  ADD COLUMN IF NOT EXISTS subject_nationality VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subject_languages_spoken VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_last_known_address TEXT,
  ADD COLUMN IF NOT EXISTS subject_last_known_occupation VARCHAR(255);

-- Digital Information
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS subject_additional_usernames TEXT,
  ADD COLUMN IF NOT EXISTS subject_gaming_ids TEXT,
  ADD COLUMN IF NOT EXISTS subject_cryptocurrency_wallets TEXT,
  ADD COLUMN IF NOT EXISTS subject_domain_names TEXT,
  ADD COLUMN IF NOT EXISTS subject_ip_addresses TEXT,
  ADD COLUMN IF NOT EXISTS subject_vehicle_registration TEXT;

-- ================================================================
-- STEP 4 — Supporting Intelligence & Evidence
-- ================================================================

-- Supporting links stored as JSONB array of {type, url} objects
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS supporting_links JSONB DEFAULT '[]'::jsonb;

-- Evidence upload placeholder (JSONB array of file metadata)
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS evidence_uploads JSONB DEFAULT '[]'::jsonb;

-- Additional Notes
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- ================================================================
-- STEP 7 — Communication Preferences & Country
-- ================================================================

-- Rename communication_channel to communication_method
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'communication_channel'
  ) THEN
    ALTER TABLE requests RENAME COLUMN communication_channel TO communication_method;
  END IF;
END $$;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS communication_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS communication_country_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS communication_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS communication_whatsapp VARCHAR(50),
  ADD COLUMN IF NOT EXISTS communication_signal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(10);

-- ================================================================
-- CYBERSECURITY TRAINING FIELDS
-- ================================================================

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS training_organization_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS training_client_type VARCHAR(20),       -- 'individual' | 'organization'
  ADD COLUMN IF NOT EXISTS training_participant_count INTEGER,
  ADD COLUMN IF NOT EXISTS training_skill_level VARCHAR(20),       -- 'beginner' | 'intermediate' | 'advanced'
  ADD COLUMN IF NOT EXISTS training_goal TEXT,
  ADD COLUMN IF NOT EXISTS training_topics TEXT,
  ADD COLUMN IF NOT EXISTS training_preferred_dates TEXT,
  ADD COLUMN IF NOT EXISTS training_additional_requirements TEXT;

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_requests_client_country
  ON requests(client_country, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_preferred_currency
  ON requests(preferred_currency, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_communication_method
  ON requests(communication_method, created_at DESC);

-- ShadowNode Intelligence Bureau
-- Enhanced Investigation Intake Fields
-- Adds professional investigation request fields to the requests table

-- Step 1: Service Selection (detailed professional service stored in service_type)
-- Category already exists for division (osint, cybersecurity, etc.)

-- Step 2: Investigation Objective
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS investigation_objective TEXT;

-- Step 3: Subject / Target Information
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS subject_type VARCHAR(30),           -- 'person', 'company', 'digital_asset'
  ADD COLUMN IF NOT EXISTS subject_full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_known_usernames TEXT,
  ADD COLUMN IF NOT EXISTS subject_emails TEXT,
  ADD COLUMN IF NOT EXISTS subject_phone_numbers TEXT,
  ADD COLUMN IF NOT EXISTS subject_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_organization VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_websites TEXT,
  ADD COLUMN IF NOT EXISTS subject_company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_company_website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_company_country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subject_company_industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subject_domain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subject_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS subject_ip_address VARCHAR(45),
  ADD COLUMN IF NOT EXISTS subject_platform VARCHAR(100);

-- Step 4: Existing Information
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS existing_information TEXT;

-- Step 5: Investigation Scope / Depth
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS investigation_depth VARCHAR(30) DEFAULT 'standard';

-- Step 7: Confidentiality
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS confidentiality_level VARCHAR(30) DEFAULT 'standard';

-- Step 8: Authorization Confirmation
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS authorization_confirmed BOOLEAN DEFAULT false;

-- Part 2: Communication channel for quote delivery
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS communication_channel VARCHAR(50) DEFAULT 'portal_notification';

-- Index for new fields used in admin filtering
CREATE INDEX IF NOT EXISTS idx_requests_investigation_depth
  ON requests(investigation_depth, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_subject_type
  ON requests(subject_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_confidentiality
  ON requests(confidentiality_level, created_at DESC);

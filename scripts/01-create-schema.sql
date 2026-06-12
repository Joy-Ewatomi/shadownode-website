-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'client', -- 'admin', 'agent', 'client'
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client accounts table (for anonymous clients)
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  display_name VARCHAR(255),
  email_hash VARCHAR(255), -- Hash for optional email verification
  access_token VARCHAR(255) UNIQUE NOT NULL, -- Token-based access
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create intelligence cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  case_number VARCHAR(50) UNIQUE NOT NULL,
  client_id UUID REFERENCES client_accounts(id) ON DELETE SET NULL, -- Anonymous or authenticated
  case_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Authenticated user
  title VARCHAR(255) NOT NULL,
  description TEXT,
  service_type VARCHAR(50) NOT NULL, -- 'osint', 'forensics', 'ethical-hacking'
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'active', 'completed', 'archived'
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Agent assignment
  budget DECIMAL(12, 2),
  estimated_completion DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create case updates/timeline table
CREATE TABLE case_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  update_type VARCHAR(50) NOT NULL, -- 'status_change', 'assignment', 'comment', 'file_added'
  title VARCHAR(255),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create encrypted messaging table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID, -- Can be NULL for anonymous
  sender_type VARCHAR(20) NOT NULL, -- 'client', 'agent'
  encrypted_content TEXT NOT NULL,
  encryption_algorithm VARCHAR(50) DEFAULT 'AES-256', -- For reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forensics evidence/files table
CREATE TABLE forensic_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  file_hash VARCHAR(255), -- SHA-256 or similar
  uploaded_by UUID REFERENCES profiles(id),
  storage_path TEXT, -- Path in Vercel Blob or similar
  is_evidence BOOLEAN DEFAULT TRUE,
  evidence_type VARCHAR(100), -- 'network_capture', 'disk_image', 'memory_dump', 'logs', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analysis results table
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  forensic_file_id UUID REFERENCES forensic_files(id) ON DELETE CASCADE,
  analysis_type VARCHAR(100) NOT NULL, -- 'metadata', 'timeline', 'network', etc.
  findings TEXT,
  severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity log table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_cases_organization ON cases(organization_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_case_updates_case ON case_updates(case_id);
CREATE INDEX idx_messages_case ON messages(case_id);
CREATE INDEX idx_forensic_files_case ON forensic_files(case_id);
CREATE INDEX idx_analysis_case ON analysis_results(case_id);
CREATE INDEX idx_activity_organization ON activity_logs(organization_id);
CREATE INDEX idx_activity_case ON activity_logs(case_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Profiles are viewable by self or admins"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Profiles can be updated by self"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for cases table
CREATE POLICY "Cases viewable by assigned agent, client, or admin"
  ON cases FOR SELECT
  USING (
    assigned_to = auth.uid() OR 
    case_user_id = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Cases can be created by authenticated users"
  ON cases FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Cases can be updated by assigned agent or admin"
  ON cases FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policies for messages table
CREATE POLICY "Messages viewable by case participants or admin"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases WHERE cases.id = messages.case_id AND (
        cases.assigned_to = auth.uid() OR 
        cases.case_user_id = auth.uid() OR
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

CREATE POLICY "Messages can be created by case participants"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases WHERE cases.id = messages.case_id AND (
        cases.assigned_to = auth.uid() OR 
        cases.case_user_id = auth.uid() OR
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

-- RLS Policies for forensic_files table
CREATE POLICY "Forensic files viewable by case participants"
  ON forensic_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases WHERE cases.id = forensic_files.case_id AND (
        cases.assigned_to = auth.uid() OR 
        cases.case_user_id = auth.uid() OR
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

CREATE POLICY "Forensic files can be uploaded by agents or admin"
  ON forensic_files FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('agent', 'admin')
  );

-- RLS Policies for analysis_results table
CREATE POLICY "Analysis results viewable by case participants"
  ON analysis_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases WHERE cases.id = analysis_results.case_id AND (
        cases.assigned_to = auth.uid() OR 
        cases.case_user_id = auth.uid() OR
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );

CREATE POLICY "Analysis results can be created by agents"
  ON analysis_results FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('agent', 'admin')
  );

-- Create default organization
INSERT INTO organizations (name, description) 
VALUES ('ShadowNode Intelligence Bureau', 'Private Intelligence Firm - OSINT, Forensics, Ethical Hacking')
ON CONFLICT DO NOTHING;

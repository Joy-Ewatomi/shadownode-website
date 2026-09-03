-- Migration: Create training_session_attendees table for per-attendee RSVP tracking

CREATE TABLE IF NOT EXISTS training_session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  training_engagement_id UUID NOT NULL REFERENCES training_engagements(id) ON DELETE CASCADE,
  profile_id UUID NULL REFERENCES user_profiles(id),
  user_id UUID NULL REFERENCES app_users(id),
  email TEXT NULL,
  partstat VARCHAR(30) NULL,
  responded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_attendees_session ON training_session_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendees_user ON training_session_attendees(user_id);

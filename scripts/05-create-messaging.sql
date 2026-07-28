-- Messaging foundation. This preserves the existing messages table and adds
-- normalized conversation support without deleting old message rows.

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE messages
  ALTER COLUMN case_id DROP NOT NULL,
  ALTER COLUMN encrypted_content DROP NOT NULL,
  ALTER COLUMN sender_type DROP NOT NULL;

UPDATE messages
SET message = COALESCE(message, encrypted_content)
WHERE message IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_case
  ON conversations(case_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON conversation_members(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at);

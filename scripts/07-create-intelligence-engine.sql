-- OSINT Investigation Intelligence Engine.
-- This extends the existing investigation graph. It intentionally reuses
-- investigation_entities and entity_relationships instead of creating
-- duplicate case/entity graph tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'investigation_entities'
  ) THEN
    RAISE EXCEPTION 'Required table investigation_entities does not exist. Run the existing investigation graph migration first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'entity_relationships'
  ) THEN
    RAISE EXCEPTION 'Required table entity_relationships does not exist. Run the existing investigation graph migration first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS intelligence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  source_type TEXT,
  source_name TEXT,
  url TEXT,
  description TEXT,
  reliability_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT intelligence_sources_reliability_check
    CHECK (reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 100))
);

CREATE TABLE IF NOT EXISTS entity_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES investigation_entities(id) ON DELETE CASCADE,
  source_id UUID REFERENCES intelligence_sources(id) ON DELETE CASCADE,
  UNIQUE (entity_id, source_id)
);

CREATE TABLE IF NOT EXISTS entity_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES investigation_entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  title TEXT,
  finding TEXT,
  confidence_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT investigation_findings_confidence_check
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_intelligence_sources_case
  ON intelligence_sources(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entity_sources_entity
  ON entity_sources(entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_sources_source
  ON entity_sources(source_id);

CREATE INDEX IF NOT EXISTS idx_entity_notes_entity
  ON entity_notes(entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investigation_findings_case
  ON investigation_findings(case_id, created_at DESC);

-- OSINT investigation graph workspace enhancement.
-- Apply this after the existing schema. It preserves the current graph tables
-- and adds provenance, staged result review, relationship source links, and
-- node position persistence fields expected by the enhanced workspace.

ALTER TABLE investigation_entities
  ADD COLUMN IF NOT EXISTS value text,
  ADD COLUMN IF NOT EXISTS source_provider text,
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS retrieved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS classification text DEFAULT 'confidential',
  ADD COLUMN IF NOT EXISTS client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS original_result_id uuid,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS stale_at timestamp with time zone;

ALTER TABLE entity_relationships
  ADD COLUMN IF NOT EXISTS direction text DEFAULT 'directed',
  ADD COLUMN IF NOT EXISTS source_reference text,
  ADD COLUMN IF NOT EXISTS client_visible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

CREATE TABLE IF NOT EXISTS osint_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id),
  query_entity_id uuid REFERENCES investigation_entities(id),
  exact_query_value text NOT NULL,
  query_type text NOT NULL,
  provider text NOT NULL,
  transform text NOT NULL,
  title text NOT NULL,
  entity_type text NOT NULL,
  value text NOT NULL,
  description text,
  source_url text,
  retrieved_at timestamp with time zone NOT NULL DEFAULT now(),
  search_time_ms integer,
  normalized_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_result_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_entity_id uuid REFERENCES investigation_entities(id),
  imported_relationship_id uuid REFERENCES entity_relationships(id),
  imported_by uuid REFERENCES user_profiles(id),
  import_decision text NOT NULL DEFAULT 'staged',
  confidence numeric DEFAULT 0,
  verification_status text NOT NULL DEFAULT 'candidate',
  terms_classification text NOT NULL DEFAULT 'manual_open_source',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS osint_search_results_case_idx
  ON osint_search_results(case_id, created_at DESC);

ALTER TABLE investigation_entities
  DROP CONSTRAINT IF EXISTS investigation_entities_original_result_fk;

ALTER TABLE investigation_entities
  ADD CONSTRAINT investigation_entities_original_result_fk
  FOREIGN KEY (original_result_id)
  REFERENCES osint_search_results(id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS relationship_sources (
  relationship_id uuid NOT NULL REFERENCES entity_relationships(id),
  source_id uuid NOT NULL REFERENCES intelligence_sources(id),
  analyst_notes text,
  created_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (relationship_id, source_id)
);

CREATE TABLE IF NOT EXISTS entity_evidence (
  entity_id uuid NOT NULL REFERENCES investigation_entities(id),
  forensic_file_id uuid NOT NULL REFERENCES forensic_files(id),
  analyst_notes text,
  created_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (entity_id, forensic_file_id)
);

CREATE TABLE IF NOT EXISTS relationship_evidence (
  relationship_id uuid NOT NULL REFERENCES entity_relationships(id),
  forensic_file_id uuid NOT NULL REFERENCES forensic_files(id),
  analyst_notes text,
  created_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (relationship_id, forensic_file_id)
);

DELETE FROM entity_positions
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY entity_id
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id DESC
      ) AS duplicate_rank
    FROM entity_positions
  ) ranked_positions
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS entity_positions_entity_unique
  ON entity_positions(entity_id);

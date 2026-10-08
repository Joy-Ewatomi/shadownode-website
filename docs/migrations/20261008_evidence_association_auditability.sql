-- Manual migration. Do not apply automatically.
-- Existing historical associations remain NULL because their creator cannot be
-- reconstructed safely.
--
-- The table/column checks deliberately fail rather than guessing how an
-- undocumented production schema should be altered. Indexes are created
-- concurrently after the transactional schema change to minimize write impact.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.entity_evidence') IS NULL
    OR to_regclass('public.relationship_evidence') IS NULL
    OR to_regclass('public.user_profiles') IS NULL THEN
    RAISE EXCEPTION 'Expected public.entity_evidence, public.relationship_evidence, and public.user_profiles tables.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.user_profiles'::regclass
      AND attname = 'id'
      AND atttypid = 'uuid'::regtype
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Expected public.user_profiles.id to be uuid.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.entity_evidence'::regclass
      AND attname = 'forensic_file_id'
      AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.relationship_evidence'::regclass
      AND attname = 'forensic_file_id'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Expected forensic_file_id on both evidence association tables.';
  END IF;
END
$$;

ALTER TABLE public.entity_evidence
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.relationship_evidence
  ADD COLUMN IF NOT EXISTS created_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.entity_evidence'::regclass
      AND attname = 'created_by'
      AND atttypid = 'uuid'::regtype
      AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.relationship_evidence'::regclass
      AND attname = 'created_by'
      AND atttypid = 'uuid'::regtype
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Existing created_by columns must be uuid.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint
    WHERE constraint.conname = 'entity_evidence_created_by_fkey'
      AND constraint.contype = 'f'
      AND constraint.conrelid = 'public.entity_evidence'::regclass
      AND constraint.confrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.entity_evidence
      ADD CONSTRAINT entity_evidence_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint
    WHERE constraint.conname = 'relationship_evidence_created_by_fkey'
      AND constraint.contype = 'f'
      AND constraint.conrelid = 'public.relationship_evidence'::regclass
      AND constraint.confrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.relationship_evidence
      ADD CONSTRAINT relationship_evidence_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.user_profiles(id);
  END IF;
END
$$;

COMMIT;

-- Must remain outside BEGIN/COMMIT: PostgreSQL does not allow concurrent
-- index creation inside a transaction block.
CREATE INDEX CONCURRENTLY IF NOT EXISTS entity_evidence_forensic_file_id_idx
  ON public.entity_evidence (forensic_file_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS relationship_evidence_forensic_file_id_idx
  ON public.relationship_evidence (forensic_file_id);

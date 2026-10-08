-- Manual migration. Do not apply automatically.
-- Existing historical associations remain NULL because their creator cannot be
-- reconstructed safely.

BEGIN;

ALTER TABLE public.entity_evidence
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.relationship_evidence
  ADD COLUMN IF NOT EXISTS created_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'entity_evidence_created_by_fkey'
  ) THEN
    ALTER TABLE public.entity_evidence
      ADD CONSTRAINT entity_evidence_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.user_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'relationship_evidence_created_by_fkey'
  ) THEN
    ALTER TABLE public.relationship_evidence
      ADD CONSTRAINT relationship_evidence_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.user_profiles(id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS entity_evidence_forensic_file_id_idx
  ON public.entity_evidence (forensic_file_id);

CREATE INDEX IF NOT EXISTS relationship_evidence_forensic_file_id_idx
  ON public.relationship_evidence (forensic_file_id);

COMMIT;

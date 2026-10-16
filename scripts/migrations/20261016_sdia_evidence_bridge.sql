-- SDIA evidence-provenance bridge.
-- The original report remains in analysis_results.findings for compatibility.
-- These tables index report identity, artifact metadata, and graph references
-- without copying raw RDAP response bodies.
-- The import route validates that the locked analysis result and every
-- selected graph row belong to the requested case. The existing schema does
-- not expose the composite unique keys required for a cross-table FK, so
-- case consistency remains an explicit application invariant.

CREATE TABLE IF NOT EXISTS public.sdia_analysis_reports (
  analysis_result_id uuid NOT NULL,
  case_id uuid NOT NULL,
  schema_version text,
  evidence_contract_version text,
  tool text,
  tool_version text,
  domain text,
  run_id text,
  investigation jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  producer_authenticity text NOT NULL DEFAULT 'not_established'::text,
  verification jsonb NOT NULL DEFAULT '{"status":"unavailable"}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sdia_analysis_reports_pkey PRIMARY KEY (analysis_result_id),
  CONSTRAINT sdia_analysis_reports_result_fk FOREIGN KEY (analysis_result_id) REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  CONSTRAINT sdia_analysis_reports_case_fk FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sdia_analysis_reports_case_idx
  ON public.sdia_analysis_reports (case_id, created_at, analysis_result_id);

CREATE TABLE IF NOT EXISTS public.sdia_evidence_artifacts (
  report_id uuid NOT NULL,
  artifact_id text NOT NULL,
  artifact_type text,
  source text,
  collected_at text,
  sha256 text,
  collector text,
  collector_version text,
  classification text,
  parent_artifacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_locator text NOT NULL,
  CONSTRAINT sdia_evidence_artifacts_pkey PRIMARY KEY (report_id, artifact_id),
  CONSTRAINT sdia_evidence_artifacts_report_fk FOREIGN KEY (report_id) REFERENCES public.sdia_analysis_reports(analysis_result_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.sdia_graph_provenance (
  report_id uuid NOT NULL,
  case_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('entity', 'relationship', 'finding')),
  target_id uuid NOT NULL,
  source_record_id text NOT NULL,
  source_reference text NOT NULL,
  evidence_artifact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_artifact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sdia_graph_provenance_pkey PRIMARY KEY (report_id, target_type, source_record_id),
  CONSTRAINT sdia_graph_provenance_report_fk FOREIGN KEY (report_id) REFERENCES public.sdia_analysis_reports(analysis_result_id) ON DELETE CASCADE,
  CONSTRAINT sdia_graph_provenance_case_fk FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sdia_graph_provenance_target_idx
  ON public.sdia_graph_provenance (case_id, target_type, target_id);

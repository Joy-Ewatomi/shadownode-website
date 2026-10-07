# Intelligence Verifier

The Case Graph Intelligence Verifier answers one narrow question: does the evidence currently stored with this case support the selected entity or relationship?

It is a deterministic, static evidence-consistency check. It does not contact DNS, certificate transparency services, HTTP endpoints, or other intelligence providers. A future live recheck must create a new observation and evidence artifact instead of modifying an earlier observation.

## Authority and flow

Existing ShadowNode evidence remains authoritative. The verifier consumes case-scoped `forensic_files`, graph evidence links, source provenance, and SDIA analysis results. It does not maintain a parallel evidence store.

For each graph item it checks evidence references, artifact record and content availability, SHA-256 integrity, authoritative provenance, schema-aware semantic agreement, evidentiary classification, currency, and any required parent observations. Analyst confidence is displayed as contextual metadata and never creates evidence support.

Ordinary uploaded evidence is verified against the exact bytes downloaded from storage. Parsing those bytes for semantic evaluation does not change the integrity input. Storage filename and upload time are storage metadata; they are not substituted for source identity or observation time.

## States

- `SUPPORTED`: valid observed evidence directly supports the graph item.
- `SUPPORTED_AS_DERIVED`: independently supported parent observations reproduce a valid derivation.
- `LIMITED_SUPPORT`: relevant evidence exists, but integrity, provenance, classification, source, or timestamp metadata is incomplete.
- `INSUFFICIENT_EVIDENCE`: required evidence references or artifacts are unavailable.
- `FAILED_VERIFICATION`: available evidence fails integrity, semantic, confidence, or derivation checks.

## Semantics

An observed relationship records what a source returned at a collection time. A derived relationship is reproducible from supported parent observations. For example, two independently supported `resolves_to` observations to the same IP may support `shares_observed_ip_with`.

These states do not establish permanent truth, ownership, administrative control, organizational affiliation, wrongdoing, or legal admissibility. Shared infrastructure remains an investigative interpretation, not proof of common ownership.

Semantic verification is schema-aware and fails closed. DNS requires one coherent structured observation containing the exact normalized hostname and IP. CT/certificate hostname collections and IP-to-ASN observations are checked only through recognized structured fields. Unsupported or unknown artifact schemas return insufficient evidence; arbitrary text and analyst notes are never searched for supporting words.

Hostnames are lowercased, converted through IDNA, and stripped of a trailing dot. Wildcards remain distinguishable where certificate semantics require them. IPv4 and IPv6 values are parsed and canonicalized before exact comparison.

`classification` on a graph entity remains its handling classification. The verifier separately reports evidence classification as `OBSERVED` or `DERIVED`. Staleness is also separate from integrity: intact historical evidence may remain supported while its currency is `STALE`.

## SDIA integrity

SDIA's artifact and manifest contract remains authoritative. This repository does not contain SDIA's canonical serializer or manifest verifier, so the website does not reconstruct SDIA hashes with `JSON.stringify`. An SDIA result without an authoritative verifiable contract fails integrity closed. Integrating that contract requires importing a versioned verifier from SDIA or consuming an SDIA-produced signed manifest; inventing a website-specific hash interpretation is prohibited.

## API and access

`GET /api/cases/[id]/graph/verification?target_type=entity|relationship&target_id=...` uses `requireCaseOperationalAccess()` and scopes every graph, evidence, source, and SDIA lookup to the authorized case. Verification never uses evidence from another case.

The existing graph inspector requests this endpoint when an investigator selects a node or edge and displays the structured checks, evidence basis, conclusion, and limitations.

The verifier determines whether a graph claim is supported by the stored evidence. It does not establish permanent truth, ownership, administrative control, attribution, or legal admissibility.

Focused tests cover exact DNS matching, mismatches, missing and cross-case artifacts, invalid hashes, independent derived parents, missing provenance, storage unavailability, stale evidence, hostname/IPv6 normalization, unsupported schemas, ownership overclaims, and fail-closed SDIA integrity. Route authorization and real storage remain deployment integration boundaries and must be exercised with the project's configured test database and storage service.

## Isolated route integration harness

Run `npm run test:verifier:integration`. The command explicitly sets `NODE_ENV=test` and `VERIFIER_TEST_MODE=isolated`. The harness refuses to start if a PostgreSQL connection string or Supabase service-role credential is present, replaces the route's database, authorization, and evidence-storage boundaries with resettable in-memory adapters, and makes every global `fetch` fail. It never loads `.env.local`, creates a database, applies migrations, contacts Supabase, or contacts an intelligence provider.

The harness invokes the actual verification route with `NextRequest`, runs the production verifier, dispatches the route's real SQL statements against deterministic relational fixtures, and retrieves exact bytes through the storage boundary. Fixtures are recreated before every test, so teardown is an in-memory reset with no persistent state.

Coverage includes supported and mismatched DNS observations, missing and cross-case evidence, missing objects, storage errors, tampered bytes, provenance limitations, stale evidence, authorization outcomes, deterministic repeated responses, duplicate-safe and valid shared-IP derivations, and SDIA fail-closed integrity. The authorization adapter supplies the outcomes of `requireCaseOperationalAccess`; detailed session parsing and assignment SQL remain covered by their owning authentication subsystem rather than duplicated here.

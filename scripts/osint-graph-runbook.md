# OSINT Graph Workspace Runbook

## 1. Local Static Verification

Run:

```bash
npm run verify:osint-graph
npm run lint
npm run build
```

The production build may require an environment that allows Next/Turbopack to create its internal worker process/socket.

## 2. Database Migration

Apply the SQL in `scripts/osint-graph-workspace.sql` through the Supabase SQL Editor for the target project.

After applying it, confirm the SQL editor reports success before running the case graph smoke test.

## 3. Case Graph Smoke Test

Use a staff, investigator, analyst, administrator, or super-administrator account with case workspace access.

1. Open `/cases/{caseId}/graph`.
2. Confirm existing entities and relationships still load.
3. Drag or click a palette entity type and create an entity.
4. Move a node, refresh, and confirm the position persists.
5. Create a relationship by connecting two nodes.
6. Use `Review State` to set confidence and verification status on an entity and a relationship.
7. Stage a manual OSINT result with a source URL and analyst notes.
8. Add the staged result as an entity.
9. Stage another result, select a query entity, and use `Add + link`.
10. Link an existing source or evidence item through `Provenance Linker`.
11. Run `Automate` and confirm review tasks are created for unresolved or low-confidence graph records.
12. Generate or preview report automation and confirm `GRAPH PROVENANCE LINKS` data is available to the report prompt.

## Provider Safety

The current implementation does not call private, commercial, or credentialed OSINT providers. The enabled transform is `manual_open_source_review`, which stages investigator-entered data for review. `configured_provider_lookup` remains disabled until lawful provider credentials, terms, and licensing are configured.

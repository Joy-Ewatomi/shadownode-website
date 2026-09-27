# Production Launch Runbook

This runbook contains no credentials. ShadowNode Operations Bureau Limited must use its approved change, backup, and access procedures.

## Pre-deployment

- [ ] Create and verify a restorable database backup; record its protected reference.
- [ ] Record the current successful Netlify deploy ID and current Git commit.
- [ ] Confirm the canonical HTTPS origin and all required environment variables without copying values into this document.
- [ ] Confirm the Resend domain, authentication sender, operational sender fallback, and monitored Reply-To mailbox.
- [ ] Confirm Paystack mode and webhook URL. Keep Flutterwave unavailable unless all test credentials and webhook secret are valid.
- [ ] Confirm active administrator and super-administrator accounts and verified email addresses.
- [ ] Confirm the private evidence bucket and retention/access policy.

## Migration Register

Inspect before applying. Apply through the approved process only after backup. A code rollback does not safely reverse data migrations; prefer reviewed forward fixes.

| Order | Migration | Purpose / dependency | Criticality | Inspection and post-check |
|---:|---|---|---|---|
| 1 | secure-pending-two-factor-challenges.sql | Pending 2FA challenges; depends on app_users | Authentication critical | Check information_schema.tables for pending_two_factor_challenges; test valid, expired and replayed challenges. |
| 2 | secure-recovery-codes-and-welcome-email.sql | One-time recovery codes, password-login state, welcome-email idempotency | Authentication critical when features enabled | Check two_factor_recovery_codes, welcome_email_deliveries and app_users.password_login_enabled; regenerate/use one code once. |
| 3 | custom-service-workflow.sql | Custom fields, submission_key uniqueness and amendments; depends on requests/app_users | Launch critical for all three idempotent request routes | Check requests.submission_key and pg_indexes.idx_requests_custom_submission_key; submit and retry each request type. |
| 4 | communication-channels-phase1.sql | Preferences, consent and delivery-attempt queue; depends on user_profiles, notification_delivery_attempts, app_users | Launch critical for external notifications | Check added columns/constraints/indexes; test portal, email and consented WhatsApp queue behavior. |
| 5 | request-commercial-history.sql | Quote/payment lineage; depends on quote_versions, quote_negotiations, requests, payments | Commercial critical | Check accepted_quote_version_id and payment provider-reference indexes; accept a quote and verify history. |
| 6 | flutterwave-payment-provider.sql | Provider transaction fields; depends on payments and commercial history | Optional while Flutterwave disabled | Check payment columns/index; provider must remain hidden when configuration is incomplete. |
| 7 | service-launch-interests.sql | Public launch-interest records and persistent throttling | Public-page critical if form is enabled | Check both tables/index; submit once and confirm duplicate/rate handling. |
| 8 | account-deletion-requests.sql | Reviewable deletion requests | Security Center feature | Check table/index; create/cancel a test request without deleting retained records. |
| 9 | osint-graph-workspace.sql | Internal graph provenance/evidence structures | Not public-launch critical | Apply only with internal workspace rollout; verify existing graph foreign keys first. |

Example read-only inspection pattern (substitute reviewed names only):

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('pending_two_factor_challenges','two_factor_recovery_codes','welcome_email_deliveries','request_amendments','service_launch_interests');

SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name IN ('submission_key','accepted_quote_version_id','provider_transaction_id','communication_preference');

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname IN ('idx_requests_custom_submission_key','uq_notification_delivery_channel','uq_payments_provider_reference','uq_payments_provider_transaction_id');
```

## Deployment

1. Apply reviewed migrations in order through the approved process.
2. Deploy the exact recorded commit and record deploy ID/time.
3. Confirm the build completed and function configuration loaded.
4. Run the production smoke sequence from the launch record.
5. Do not declare launch complete until request, notification, payment, upload, and certificate checks pass.

## Rollback

Rollback the application for a confirmed code regression, widespread authentication/request failure, sensitive-data exposure, or unsafe payment state. Restore the previously successful Netlify deploy using Netlify's approved rollback process. Do not automatically reverse migrations: schema/data changes may be shared with newly written records. Preserve the backup and migration record and prefer a reviewed forward fix. Rotate credentials immediately if exposure is suspected.

## Incident Contacts and Evidence

Use the monitored address configured by CLIENT_SERVICES_REPLY_TO and the authorized Netlify, database/Supabase, Resend, Paystack, and OAuth dashboards. Inspect application/function logs, delivery attempts, audit events, and provider event references. Never copy passwords, session cookies, OAuth codes, reset/verification tokens, 2FA secrets, recovery codes, full payment payloads, encryption keys, evidence contents, or database connection strings into tickets.

## First 24 Hours

| Signal | Default response |
|---|---|
| Build/function errors, isolated rate limits, storage/DB/runtime usage | Observe; investigate trends and capacity. |
| Signup/login/verification, request, attachment, Resend or reviewer-notification failures | Investigate promptly; correlate safe IDs and timestamps. |
| Duplicate requests, payment initialization errors or verification mismatches | Investigate immediately; temporarily disable the affected payment/request action if integrity is uncertain. |
| Certificate generation/download failures | Investigate; temporarily disable issuance/download if generated files are corrupt. |
| Unauthorized access attempts or evidence-access anomalies | Investigate immediately; preserve audit evidence and disable affected access where necessary. |
| Sensitive-data exposure, forged payment success, cross-account access, active compromise | Roll back/disable affected feature and rotate relevant credentials immediately. |
| Confirmed credential exposure | Immediate rotation, session invalidation where applicable, incident record and impact review. |

Malware scanning is not currently implemented. Uploaded files must remain private and must never be automatically executed or rendered as trusted active content.

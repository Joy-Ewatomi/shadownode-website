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

## Database Schema Verification

Database definitions and backups are maintained privately outside this repository. Before deployment, compare the deployed database with the protected canonical schema and confirm all required tables, constraints, foreign-key actions, and indexes are present. Apply database changes only through the approved process after a restorable backup. A code rollback does not safely reverse data changes; prefer reviewed forward fixes.

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

1. Confirm the deployed database matches the reviewed private canonical schema.
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

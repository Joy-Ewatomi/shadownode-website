# ShadowNode Operations Bureau
# Official PostgreSQL Database Schema Reference

Version: Current Production Schema

This file is the single source of truth for future development against the ShadowNode Supabase PostgreSQL database.

Before writing SQL, editing API routes, creating migrations, or building dashboard logic, read this file and verify every table, column, and relationship used by the code.

---

# Core Rules

- Application authentication uses `public.app_users`.
- Do not use `auth.users` except where explicitly referenced by legacy Supabase-auth tables.
- Profile/business identity flows through `public.user_profiles`.
- Most business tables reference `user_profiles.id`, not `app_users.id`.
- Never invent columns.
- Never assume a foreign key relationship.
- Never create duplicate tables for an existing domain.
- Use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in migrations.
- Raw SQL migrations must not contain application placeholders like `$1`, `$2`, etc.

---

# Authentication

## app_users

Main application authentication table for login, sessions, roles, and permissions.

Columns:

```sql
id UUID PRIMARY KEY
username VARCHAR UNIQUE
email VARCHAR UNIQUE
password_hash TEXT
status VARCHAR
email_verified_at TIMESTAMPTZ
role VARCHAR
totp_secret_encrypted TEXT
recovery_codes_encrypted TEXT
totp_enabled BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Role values:

```text
client
investigator
analyst
administrator
super_administrator
```

Relationship:

```text
app_users.id
      |
      |
user_profiles.user_id
```

## sessions

Application-owned session table.

Columns:

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES app_users(id)
token CHAR(64) UNIQUE
ip INET
user_agent TEXT
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
last_activity TIMESTAMPTZ
```

## email_verifications

Columns:

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES app_users(id)
token_hash CHAR(64) UNIQUE
expires_at TIMESTAMPTZ
used_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

## password_resets

Columns:

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES app_users(id)
token_hash CHAR(64) UNIQUE
expires_at TIMESTAMPTZ
used_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

## roles

Columns:

```sql
id UUID PRIMARY KEY
name VARCHAR UNIQUE
display_name VARCHAR
```

## permissions

Columns:

```sql
id UUID PRIMARY KEY
name VARCHAR UNIQUE
description TEXT
```

## role_permissions

Columns:

```sql
role_id UUID REFERENCES roles(id)
permission_id UUID REFERENCES permissions(id)
```

Primary key:

```text
(role_id, permission_id)
```

## user_roles

Columns:

```sql
user_id UUID REFERENCES app_users(id)
role_id UUID REFERENCES roles(id)
```

Primary key:

```text
(user_id, role_id)
```

## oauth_accounts

Columns:

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES app_users(id)
provider VARCHAR
provider_account_id TEXT
email VARCHAR
created_at TIMESTAMPTZ
```

Constraint:

```text
UNIQUE(provider, provider_account_id)
```

---

# User Profiles

## user_profiles

Profile layer connected to authenticated users.

Columns:

```sql
id UUID PRIMARY KEY
organization_id UUID
full_name VARCHAR
is_anonymous BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
user_id UUID REFERENCES app_users(id)
```

Important:

```text
Business tables generally reference user_profiles.id.
Authentication/session tables reference app_users.id.
```

---

# Organizations

## organizations

Columns:

```sql
id UUID PRIMARY KEY
name VARCHAR
description TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

# Cases

## cases

Main investigation table.

Columns:

```sql
id UUID PRIMARY KEY
organization_id UUID
case_number VARCHAR UNIQUE
client_profile_id UUID
case_user_id UUID
title VARCHAR
description TEXT
service_type VARCHAR
status VARCHAR
priority VARCHAR
assigned_to UUID
budget NUMERIC
estimated_completion DATE
completed_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
progress INTEGER
payment_status VARCHAR
started_at TIMESTAMPTZ
final_report_url TEXT
```

Relationships:

```text
cases.organization_id -> organizations.id
cases.client_profile_id -> user_profiles.id
cases.case_user_id -> user_profiles.id
cases.assigned_to -> user_profiles.id
```

Important forbidden column:

```text
cases.client_id DOES NOT EXIST
```

Correct client ownership query:

```sql
SELECT *
FROM cases c
WHERE c.client_profile_id = $1;
```

---

# Case Updates

## case_updates

Visible client timeline updates.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
updated_by UUID
update_type VARCHAR
title VARCHAR
content TEXT
created_at TIMESTAMPTZ
```

Relationships:

```text
case_updates.case_id -> cases.id
case_updates.updated_by -> user_profiles.id
```

---

# Case Assignments

## case_assignments

Investigator and analyst assignment table.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
assigned_to UUID
assigned_by UUID
assigned_at TIMESTAMPTZ
removed_at TIMESTAMPTZ
```

Relationship:

```text
case_assignments.case_id -> cases.id
case_assignments.assigned_to -> user_profiles.id
case_assignments.assigned_by -> app_users.id
```

---

# Requests

## requests

Client and public investigation request intake table.

Columns currently used by the application:

```sql
id UUID PRIMARY KEY
token TEXT
case_number VARCHAR
title VARCHAR
service_type VARCHAR
description TEXT
timeline TEXT
contact_method TEXT
client_email VARCHAR
status VARCHAR
progress INTEGER
estimated_price INTEGER
final_price INTEGER
price_notes TEXT
currency VARCHAR
is_anonymous BOOLEAN
priority VARCHAR
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Request/billing workflow extension columns:
None documented in current production schema.

Request statuses used by the client-to-bureau workflow:

```text
pending_review
reviewing
approved
quote_sent
payment_pending
active
rejected
```

Legacy/public request statuses may also appear:

```text
submitted
completed
```

---

# Messaging

## conversations

Conversation container.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
created_at TIMESTAMPTZ
```

Relationship:

```text
conversations.case_id -> cases.id
```

## conversation_members

Conversation participants.

Columns:

```sql
conversation_id UUID
user_id UUID
created_at TIMESTAMPTZ
```

Relationship:

```text
conversation_members.conversation_id -> conversations.id
conversation_members.user_id -> app_users.id
```

Important:

```text
conversation_members.user_id references app_users.id, NOT user_profiles.id.
```

## messages

Message storage.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
sender_id UUID
sender_type VARCHAR
encrypted_content TEXT
encryption_algorithm VARCHAR
created_at TIMESTAMPTZ
read_at TIMESTAMPTZ
conversation_id UUID
message TEXT
```

Relationships:

```text
messages.case_id -> cases.id
messages.sender_id -> user_profiles.id
messages.conversation_id -> conversations.id
```

Important:

```text
messages.sender_id references user_profiles.id.
conversation_members.user_id references app_users.id.
```

---

# Notifications

## notifications

User notification table.

Columns:

```sql
id UUID PRIMARY KEY
user_id UUID
case_id UUID
type VARCHAR
title VARCHAR
message TEXT
is_read BOOLEAN
created_at TIMESTAMPTZ
```

Relationships:

```text
notifications.user_id -> app_users.id
notifications.case_id -> cases.id
```

---

# Evidence

## forensic_files

Evidence storage and chain-of-custody record.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
file_name VARCHAR
file_size BIGINT
file_type VARCHAR
file_hash VARCHAR
uploaded_by UUID
storage_path TEXT
is_evidence BOOLEAN
evidence_type VARCHAR
description TEXT
chain_of_custody JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Relationships:

```text
forensic_files.case_id -> cases.id
forensic_files.uploaded_by -> user_profiles.id
```

Important:

```text
Use forensic_files.
Do not assume evidence_files exists in production.
Use file_hash, not sha256_hash, unless a future migration explicitly adds sha256_hash.
```

---

# Analysis

## analysis_results

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
forensic_file_id UUID
analysis_type VARCHAR
findings TEXT
severity VARCHAR
created_by UUID
created_at TIMESTAMPTZ
```

Relationships:

```text
analysis_results.case_id -> cases.id
analysis_results.forensic_file_id -> forensic_files.id
analysis_results.created_by -> user_profiles.id
```

---

# Reports

## case_reports

Existing published report table.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
title VARCHAR
file_url TEXT
summary TEXT
created_by UUID
created_at TIMESTAMPTZ
```

Relationships:

```text
case_reports.case_id -> cases.id
case_reports.created_by -> user_profiles.id
```

Important:

```text
The existing production case_reports table does not include:
report_type
status
classification
executive_summary
approved_by
updated_at
```

Do not query those fields unless a migration has been applied and this document has been updated.

---

# OSINT Intelligence

## investigation_entities

OSINT entity graph nodes.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
entity_type VARCHAR
name VARCHAR
description TEXT
aliases JSONB
verification_status VARCHAR
confidence_score NUMERIC
created_by UUID
created_at TIMESTAMP
updated_at TIMESTAMP
```

Relationships:

```text
investigation_entities.case_id -> cases.id
investigation_entities.created_by -> user_profiles.id
```

## entity_relationships

Entity graph relationships.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
source_entity_id UUID
target_entity_id UUID
relationship_type VARCHAR
description TEXT
confidence_score NUMERIC
verification_status VARCHAR
created_by UUID
```

Relationships:

```text
entity_relationships.case_id -> cases.id
entity_relationships.source_entity_id -> investigation_entities.id
entity_relationships.target_entity_id -> investigation_entities.id
entity_relationships.created_by -> user_profiles.id
```

## intelligence_sources

Collected intelligence sources.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
source_type VARCHAR
title VARCHAR
url TEXT
description TEXT
reliability_score NUMERIC
collected_by UUID
collected_at TIMESTAMP
created_at TIMESTAMP
```

Relationships:

```text
intelligence_sources.case_id -> cases.id
intelligence_sources.collected_by -> user_profiles.id
```

Important:

```text
Use intelligence_sources.title.
Do not assume source_name exists in production.
```

## intelligence_observations

Analyst observations and intelligence findings.

Columns:

```sql
id UUID PRIMARY KEY
case_id UUID
observation_type VARCHAR
title VARCHAR
description TEXT
confidence_score NUMERIC
status VARCHAR
reviewed_by UUID
reviewed_at TIMESTAMP
created_at TIMESTAMP
```

Relationships:

```text
intelligence_observations.case_id -> cases.id
intelligence_observations.reviewed_by -> user_profiles.id
```

---

# Security Logging

## activity_logs

Operational activity log.

Columns:

```sql
id UUID PRIMARY KEY
organization_id UUID
case_id UUID
user_id UUID
action VARCHAR
details JSONB
ip_address VARCHAR
created_at TIMESTAMPTZ
```

Relationships:

```text
activity_logs.organization_id -> organizations.id
activity_logs.case_id -> cases.id
activity_logs.user_id -> user_profiles.id
```

## audit_logs

Security and authentication audit log.

Columns:

```sql
id UUID PRIMARY KEY
user_id UUID
action VARCHAR
ip INET
user_agent TEXT
metadata JSONB
created_at TIMESTAMPTZ
```

Relationships:

```text
audit_logs.user_id -> app_users.id
```

## login_history

Columns:

```sql
id UUID PRIMARY KEY
user_id UUID
identifier TEXT
ip INET
user_agent TEXT
browser TEXT
operating_system TEXT
country TEXT
city TEXT
device TEXT
success BOOLEAN
failure_reason TEXT
created_at TIMESTAMPTZ
```

Relationship:

```text
login_history.user_id -> app_users.id
```

---

# Client Security Rules

Client users can only access their own cases.

Correct client ownership:

```text
cases.client_profile_id -> user_profiles.id
user_profiles.user_id -> app_users.id
```

Allowed client-facing data:

```text
case overview
case progress
case_updates
published case_reports
messages where the user is a conversation member
notifications addressed to the client app_users.id
client invoices
client request status
```

Forbidden client-facing data:

```text
forensic_files
analysis_results
case_notes
investigation_entities
entity_relationships
intelligence_sources
intelligence_observations
analyst findings
investigator notes
assignments
internal reports
```

Administrator-only surfaces must require:

```text
app_users.role IN ('administrator', 'super_administrator')
```

Investigator/analyst assignment checks must resolve:

```text
app_users.id -> user_profiles.user_id -> user_profiles.id
case_assignments.assigned_to -> user_profiles.id
```

---

# Developer Rules

Before writing SQL:

1. Verify table exists.
2. Verify column exists.
3. Verify foreign key relationship.
4. Confirm whether the ID belongs to `app_users` or `user_profiles`.

Common mistakes:

Wrong:

```sql
cases.client_id
```

Correct:

```sql
cases.client_profile_id
```

Wrong:

```text
conversation_members.user_id -> user_profiles.id
```

Correct:

```text
conversation_members.user_id -> app_users.id
```

Wrong:

```text
messages.sender_id -> app_users.id
```

Correct:

```text
messages.sender_id -> user_profiles.id
```

Wrong:

```text
case_reports.status
case_reports.report_type
case_reports.executive_summary
case_reports.updated_at
```

Correct production fields:

```text
case_reports.title
case_reports.file_url
case_reports.summary
case_reports.created_by
case_reports.created_at
```

Wrong:

```text
forensic_files.sha256_hash
```

Correct:

```text
forensic_files.file_hash
```

Wrong:

```text
intelligence_sources.source_name
```

Correct:

```text
intelligence_sources.title
```

---

# Future Migration Plans

The fields in this section are not part of the current documented Supabase production schema. Do not query them from application code until a migration has been applied and this file has been updated to move them into the production schema sections above.

Potential request workflow fields:

```sql
requests.client_id UUID REFERENCES app_users(id)
requests.category VARCHAR
requests.urgency VARCHAR
requests.preferred_deadline DATE
requests.quote_amount NUMERIC
requests.quote_currency VARCHAR
requests.quote_notes TEXT
requests.converted_case_id UUID REFERENCES cases(id)
requests.reviewed_by UUID REFERENCES app_users(id)
```

Potential billing table:

```sql
invoices.id UUID PRIMARY KEY
invoices.case_id UUID REFERENCES cases(id)
invoices.client_id UUID REFERENCES app_users(id)
invoices.amount NUMERIC
invoices.currency VARCHAR
invoices.status VARCHAR
invoices.created_at TIMESTAMPTZ
invoices.paid_at TIMESTAMPTZ
```

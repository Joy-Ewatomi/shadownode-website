# ShadowNode Intelligence Bureau
# Official PostgreSQL Database Schema Reference

Version: Current Production Schema

---

# Purpose

This document describes the REAL database schema currently used by ShadowNode Intelligence Bureau.

This file exists to prevent incorrect SQL generation, wrong table assumptions, and broken database queries.

Any developer or AI coding assistant MUST read this file before:

- Creating SQL queries
- Editing API routes
- Creating migrations
- Building dashboard logic
- Writing database access code

Rules:

- Never invent columns.
- Never assume relationships.
- Never use columns not listed here.
- Never create duplicate tables.
- Always follow the existing PostgreSQL schema.

Database:

- PostgreSQL
- Supabase hosted database
- Node.js PostgreSQL (`pg`) connection
- Custom authentication system

---

# Database Architecture Overview


```
app_users
     |
     |
user_profiles
     |
     |
cases
     |
     |
requests
quote_negotiations
request_audit_events
case_updates
case_reports
messages
forensic_files
investigation_entities
```


---

# Authentication System


## app_users

Main application authentication table.

Used for login, sessions, roles, and permissions.


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


Available roles:

```
client
investigator
analyst
administrator
super-administrator
```


IMPORTANT:

Application authentication uses:

```
app_users
```

NOT:

```
auth.users
```

except where explicitly referenced.

---

# User Profile System


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


Relationship:

```
app_users.id
      |
      |
user_profiles.user_id
```


IMPORTANT:

Most business tables reference:

```
user_profiles.id
```

NOT:

```
app_users.id
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

# Case Management


## requests


Client investigation intake records. A request is not a case until the client accepts a final quote.


Columns:

```sql
id UUID PRIMARY KEY
token TEXT
case_number VARCHAR
title VARCHAR
category VARCHAR                              -- Division: 'osint' | 'cybersecurity'
service_type VARCHAR                          -- Specific professional service (e.g. 'Digital Identity Analysis')
description TEXT
timeline VARCHAR
urgency VARCHAR                               -- 'low' | 'normal' | 'high' | 'critical'
preferred_deadline DATE
contact_method VARCHAR
client_email VARCHAR
client_id UUID REFERENCES app_users(id)
is_anonymous BOOLEAN
status VARCHAR
priority VARCHAR
progress INTEGER
currency VARCHAR
estimated_price INTEGER
final_price INTEGER
price_notes TEXT
ai_price_estimate INTEGER
ai_complexity VARCHAR
ai_estimated_hours NUMERIC
ai_suggested_service VARCHAR
ai_suggested_priority VARCHAR
ai_confidence NUMERIC
ai_reasoning TEXT
quote_notes TEXT
approved_quote_amount NUMERIC
approved_quote_currency VARCHAR
approved_quote_notes TEXT
approved_estimated_completion DATE
quote_sent_at TIMESTAMPTZ
client_decision_at TIMESTAMPTZ
declined_reason TEXT
converted_case_id UUID REFERENCES cases(id)
reviewed_by UUID REFERENCES app_users(id)
investigation_objective TEXT                  -- What is the objective (Step 2)
subject_type VARCHAR                          -- 'person' | 'company' | 'digital_asset'
subject_full_name VARCHAR(255)               -- Person: full name
subject_known_usernames TEXT                 -- Person: comma-separated usernames
subject_emails TEXT                          -- Person: comma-separated emails
subject_phone_numbers TEXT                    -- Person: comma-separated phone numbers
subject_location VARCHAR(255)                -- Person: location
subject_organization VARCHAR(255)            -- Person: org/company
subject_websites TEXT                        -- Person: known websites/social profiles
subject_company_name VARCHAR(255)            -- Company: name
subject_company_website VARCHAR(255)          -- Company: website
subject_company_country VARCHAR(100)          -- Company: country
subject_company_industry VARCHAR(100)         -- Company: industry
subject_domain VARCHAR(255)                  -- Digital Asset: domain
subject_url VARCHAR(500)                     -- Digital Asset: URL
subject_ip_address VARCHAR(45)               -- Digital Asset: IP address
subject_platform VARCHAR(100)                -- Digital Asset: platform
existing_information TEXT                    -- Supporting Intelligence & Evidence summary
investigation_depth VARCHAR(30)              -- 'basic' | 'standard' | 'deep' | 'comprehensive'
confidentiality_level VARCHAR(30)            -- 'standard' | 'confidential' | 'highly_confidential'
authorization_confirmed BOOLEAN              -- Lawful authorization confirmation
communication_method VARCHAR(50)             -- 'portal_notification' | 'email' | 'phone' | 'whatsapp' | 'signal'
communication_email VARCHAR(255)             -- Email address for email comms
communication_country_code VARCHAR(10)       -- Country code for phone/whatsapp/signal
communication_phone VARCHAR(50)              -- Phone number
communication_whatsapp VARCHAR(50)           -- WhatsApp number
communication_signal VARCHAR(50)             -- Signal number
client_country VARCHAR(100)                  -- Client's country for currency auto-detection
preferred_currency VARCHAR(10)               -- Auto-detected quote currency based on country
additional_notes TEXT                        -- Additional notes (Section D)
supporting_links JSONB                       -- Array of {type, url} objects
evidence_uploads JSONB                       -- Array of {id, name, size, type} objects
subject_approximate_age VARCHAR(20)          -- Physical: age range
subject_height VARCHAR(50)                   -- Physical: height
subject_weight VARCHAR(50)                   -- Physical: weight
subject_hair_color VARCHAR(50)               -- Physical: hair color
subject_eye_color VARCHAR(50)                -- Physical: eye color
subject_skin_tone VARCHAR(50)                -- Physical: skin tone
subject_distinguishing_marks TEXT            -- Physical: tattoos, scars, etc.
subject_nationality VARCHAR(100)             -- Physical: nationality
subject_languages_spoken VARCHAR(255)        -- Physical: languages
subject_last_known_address TEXT              -- Physical: address
subject_last_known_occupation VARCHAR(255)   -- Physical: occupation
subject_additional_usernames TEXT            -- Digital: extra usernames
subject_gaming_ids TEXT                      -- Digital: gaming platform IDs
subject_cryptocurrency_wallets TEXT          -- Digital: wallet addresses
subject_domain_names TEXT                    -- Digital: domain names
subject_ip_addresses TEXT                    -- Digital: IP addresses
subject_vehicle_registration TEXT            -- Digital: vehicle registration (lawful only)
training_organization_name VARCHAR(255)      -- Training: org name
training_client_type VARCHAR(20)             -- Training: 'individual' | 'organization'
training_participant_count INTEGER          -- Training: number of participants
training_skill_level VARCHAR(20)             -- Training: 'beginner' | 'intermediate' | 'advanced'
training_goal TEXT                           -- Training: primary goal
training_topics TEXT                         -- Training: topics of interest
training_preferred_dates TEXT                -- Training: preferred dates
training_additional_requirements TEXT        -- Training: extra requirements
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```


IMPORTANT:

A request must stay in request/quote workflow until client acceptance. Do not create a case during admin review.


---


## quote_negotiations


Dedicated quote negotiation history.


Columns:

```sql
id UUID PRIMARY KEY
request_id UUID REFERENCES requests(id)
client_id UUID REFERENCES app_users(id)
assigned_reviewer_id UUID REFERENCES app_users(id)
owner_approver_id UUID REFERENCES app_users(id)
round_number INTEGER
status VARCHAR
original_ai_estimate NUMERIC
original_quote_amount NUMERIC
approved_quote_currency VARCHAR
requested_budget NUMERIC
client_reason TEXT
client_notes TEXT
administrator_recommendation TEXT
revised_quote_amount NUMERIC
owner_decision VARCHAR
owner_decision_notes TEXT
decided_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```


---


## request_audit_events


Permanent audit history for request, quote, negotiation, and conversion actions.


Columns:

```sql
id UUID PRIMARY KEY
request_id UUID REFERENCES requests(id)
actor_user_id UUID REFERENCES app_users(id)
action VARCHAR
details JSONB
created_at TIMESTAMPTZ
```


---


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


Organization:

```
cases.organization_id

        |

organizations.id
```


Client ownership:

```
cases.client_profile_id

        |

user_profiles.id
```


Case owner:

```
cases.case_user_id

        |

user_profiles.id
```


Assigned investigator:

```
cases.assigned_to

        |

user_profiles.id
```


IMPORTANT:

This column DOES NOT EXIST:

```sql
cases.client_id
```


Wrong:

```sql
WHERE c.client_id = $1
```


Correct:

```sql
WHERE c.client_profile_id = $1
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


Relationship:

```
case_updates.case_id

        |

cases.id
```


---

# Case Assignments


## case_assignments


Used for investigator and analyst assignment.


Columns:

```sql
id UUID PRIMARY KEY

case_id UUID

assigned_to UUID

assigned_by UUID

assignment_role VARCHAR

status VARCHAR

accepted_at TIMESTAMPTZ

rejected_at TIMESTAMPTZ

rejection_reason TEXT

deadline DATE

notes TEXT

assigned_at TIMESTAMPTZ

removed_at TIMESTAMPTZ
```


Relationship:


```
case_assignments.assigned_to

        |

user_profiles.id
```


---

# Messaging System


## conversations


Conversation container.


Columns:

```sql
id UUID PRIMARY KEY

case_id UUID

created_at TIMESTAMPTZ
```


Relationship:

```
conversations.case_id

        |

cases.id
```


---

## conversation_members


Conversation participants.


Columns:

```sql
conversation_id UUID

user_id UUID

created_at TIMESTAMPTZ
```


IMPORTANT:

This table references:

```
app_users.id
```


NOT:

```
user_profiles.id
```


Relationship:

```
conversation_members.user_id

        |

app_users.id
```


---

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


Sender:

```
messages.sender_id

        |

user_profiles.id
```


Conversation:

```
messages.conversation_id

        |

conversations.id
```


---

# Client Dashboard Security Rules


Client users can ONLY access their own cases.


Client ownership query:


```sql
SELECT *
FROM cases c
WHERE c.client_profile_id = user_profile_id;
```


Allowed:

```
case overview
case progress
case updates
published reports
messages
notifications
```


Forbidden:


```
forensic_files
analysis_results
case_notes
investigation_entities
entity_relationships
intelligence_sources
analyst findings
investigator notes
internal reports
```


---

# Reports


## case_reports


Published reports.


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


Relationship:

```
case_reports.case_id

        |

cases.id
```


---

# Notifications


## notifications


User notification system.


Columns:

```sql
id UUID PRIMARY KEY

user_id UUID

case_id UUID

assignment_id UUID

type VARCHAR

title VARCHAR

message TEXT

is_read BOOLEAN

read_at TIMESTAMPTZ

metadata JSONB

created_at TIMESTAMPTZ
```


Relationships:


User:

```
notifications.user_id

        |

app_users.id
```


Case:

```
notifications.case_id

        |

cases.id
```


---

# Evidence System


## forensic_files


Evidence storage.


Columns:


```sql
id UUID

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


---

# Analysis System


## analysis_results


Columns:

```sql
id UUID

case_id UUID

forensic_file_id UUID

analysis_type VARCHAR

findings TEXT

severity VARCHAR

created_by UUID

created_at TIMESTAMPTZ
```


---

# OSINT Intelligence System


## investigation_entities


OSINT entities.


Columns:


```sql
id UUID

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


---

## entity_relationships


Entity graph connections.


Columns:


```sql
id UUID

case_id UUID

source_entity_id UUID

target_entity_id UUID

relationship_type VARCHAR

description TEXT

confidence_score NUMERIC

verification_status VARCHAR

created_by UUID
```


---

## intelligence_sources


Collected intelligence sources.


Columns:


```sql
id UUID

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


---

## intelligence_observations


Analyst observations.


Columns:


```sql
id UUID

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


---

# Security Logging


## activity_logs


Columns:


```sql
id UUID

organization_id UUID

case_id UUID

user_id UUID

action VARCHAR

details JSONB

ip_address VARCHAR

created_at TIMESTAMPTZ
```


---

## audit_logs


Columns:


```sql
id UUID

user_id UUID

action VARCHAR

ip INET

user_agent TEXT

metadata JSONB

created_at TIMESTAMPTZ
```


---

# Database Query Rules


Before writing any SQL:

Check:

1. Does the table exist?
2. Does the column exist?
3. Is the foreign key correct?
4. Is the relationship through app_users or user_profiles?


Common mistakes:


## WRONG

```sql
SELECT *
FROM cases c
WHERE c.client_id = $1;
```


## CORRECT

```sql
SELECT *
FROM cases c
WHERE c.client_profile_id = $1;
```



## WRONG

```sql
conversation_members.user_id = user_profiles.id
```


## CORRECT

```sql
conversation_members.user_id = app_users.id
```



This file represents the source of truth for ShadowNode Intelligence Bureau database design.

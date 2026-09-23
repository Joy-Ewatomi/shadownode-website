# ShadowNode Operations Bureau

The official digital operations platform of **ShadowNode Operations Bureau Limited**.

ShadowNode is a secure investigation, intelligence, cybersecurity, and professional-training platform designed to manage client requests from initial submission through review, quotation, payment, case execution, reporting, and completion.

Website: [shadownodebureau.com](https://shadownodebureau.com)

---

## Platform Overview

The platform provides separate, role-aware workspaces for:

- Clients
- Operational staff
- Administrators
- Super administrators
- Assigned investigators, analysts, reviewers, and trainers

Access to operational case information is controlled by both the user’s permanent platform role and their assignment to the relevant case or training engagement.

---

## Core Capabilities

### Client Services

- Submit investigation and cybersecurity requests
- Submit professional-training requests
- Upload supporting information
- Receive and respond to quotations
- Complete approved payments
- Monitor case and training progress
- Communicate through secure case conversations
- View released reports and certificates
- Receive portal and approved external notifications

### Case Management

- Request-to-case conversion
- Payment and activation workflow
- Assignment-based workspace access
- Case status and progress tracking
- Team management
- Secure client and staff messaging
- Investigation timeline and case updates
- Evidence management
- Report preparation, review and delivery

### OSINT Intelligence Workspace

The investigation graph supports:

- Searchable entity palette
- Manual entity and relationship creation
- Node-position persistence
- Confidence and verification states
- Source and evidence provenance
- Staged external-search results
- Investigator review before graph import
- Investigation pivots
- Graph-assisted automation
- Integration with report preparation

External provider integrations must use approved APIs, valid licences and properly configured credentials. The platform does not authorize unlawful access, prohibited scraping or unauthorized data collection.

### Evidence and Reporting

- Evidence metadata management
- SHA-256 integrity hashes
- Chain-of-custody records
- Evidence and source linkage
- Investigation timeline
- Structured report sections
- Internal review and approval workflow
- Client-controlled report release
- Editable document export
- Evidence register and integrity manifest

The platform supports professional evidence documentation but does not independently guarantee legal admissibility. Admissibility depends on applicable law, collection authority, handling procedures and judicial requirements.

### Training Management

- Training engagement creation
- Trainer assignment
- Plans, schedules and materials
- Participant progress
- Assessments and feedback
- Completion workflow
- Certificate generation and verification

### Notifications

- Canonical in-platform notifications
- Communication-preference-aware delivery
- Brief email alerts for portal-selected communication
- Full approved email notifications where appropriate
- WhatsApp-ready provider architecture
- Per-user message receipts and unread counts
- Delivery status and audit records

WhatsApp delivery requires an approved provider, configured credentials and valid recipient consent.

---

## Technology Stack

- **Framework:** Next.js
- **Language:** TypeScript
- **Interface:** React and Tailwind CSS
- **Database:** PostgreSQL through Supabase
- **Storage:** Supabase Storage
- **Authentication:** Application-managed authentication and authorization
- **Email:** Resend-compatible delivery architecture
- **Payments:** Paystack
- **Graph interface:** React Flow
- **Deployment:** Netlify
- **Domain and DNS:** Cloudflare

---

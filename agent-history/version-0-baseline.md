# Version 0 — Baseline Project Definition

Baseline File:

```text
agent-history/version-0-baseline.md
```

Status:

```text
APPROVED
```

Created Date:

```text
2026-07-01
```

Project Owner:

```text
Carlo Mauring Lidres
```

Source:

```text
reference/starter.md (local; not committed to repository)
```

## Purpose

This file is the permanent approved baseline for **eDoc**.

It defines the project objective, scope, business requirements, architecture, security controls, data model, workflow, verification expectations, and implementation constraints.

This file may only be revised with explicit project-owner approval. Future implementation changes must be documented through versioned handoff files.

---

# Project Information

- Project name: `eDoc`
- Project folder: `C:\Users\Carlo Mauring Lidres\OneDrive\Desktop\Projects\00 Working Projects\eDoc`
- Repository: `https://github.com/carlolidres/eDoc.git`
- Project type: `NEW_APPLICATION` (incremental transformation of existing scaffold)
- Project owner: `Carlo Mauring Lidres`
- Reviewers: `Project owner`

# Project Objective

Build a secure, online, DocuSign-style electronic document routing, review, approval, acknowledgment, and electronic-signature application. Transform the existing eDoc scaffold incrementally. Do not replace the active project wholesale or copy Documenso unchanged.

# Reference Priority

When references conflict, follow this order:

1. Security, authorization, data integrity, and stated project requirements
2. Existing working code in the active project
3. UI appearance and navigation from `reference/src` (local visual reference; do not modify)
4. Functional and workflow patterns from `reference/documenso-main/documenso-main` (local functional reference; do not modify)
5. New implementation decisions required to complete missing functionality

# Scope

## In Scope

- User authentication with organization-based and department-based access
- Document upload, PDF viewing, preparation, and signature-field placement
- Review, approval, signature, and acknowledgment routing (sequential, parallel, and mixed)
- Comments, return for revision, rejection, delegation, due dates, reminders, and escalations
- Electronic signatures with re-authentication, immutable signed PDFs, and audit events
- Document versioning, completion certificates, notifications, audit trails, reports, and administration
- Secure private file storage in Cloudflare R2
- Static frontend on GitHub Pages; Nhost for auth, PostgreSQL, and Hasura GraphQL; Cloudflare Workers for privileged operations
- UI that closely follows the supplied visual reference; not a pure Ant Design interface
- PostgreSQL-first schema design in `database/sqlite/`, validated locally before applying migrations and Hasura metadata to Nhost.
- Local workflow app for baseline approval, handoff, and agent coordination

## Out of Scope

- Replacing the active project with Documenso or importing the entire Documenso repository
- Modifying either reference folder (`reference/src`, `reference/documenso-main/`)
- Retaining Documenso branding, logos, or product names
- Copying server-specific code incompatible with GitHub Pages or Cloudflare Workers
- Automatic compliance claims with GMP, 21 CFR Part 11, EU Annex 11, GAMP 5, the Philippine Data Privacy Act, or the Electronic Commerce Act
- Permanent mock data in production code
- Hardcoded users, roles, organizations, or credentials

# Business Goals

1. Provide a SaaS-style document management and routing platform for regulated and professional workflows.
2. Enforce authorization and auditability at database, API, and UI layers.
3. Deliver a professional UI aligned with the supplied reference design, not a generic admin template.
4. Support deployment on free-tier-friendly infrastructure (GitHub Pages, Nhost, Cloudflare Workers, R2).
5. Preserve incremental delivery: the application remains runnable after every phase.

# Success Criteria

- Authenticated users can create, route, review, approve, sign, and complete documents with immutable version history.
- Authorization is enforced at Hasura permissions, Worker/API, and frontend route levels—not UI hiding alone.
- Private documents remain in R2 with temporary preview/download URLs only.
- Audit records are append-only and include integrity-relevant context for signature and route events.
- Frontend deploys as a static GitHub Pages build with HashRouter, lint, type-check, tests, and CI validation.
- SQLite schema is validated locally before any Supabase/PostgreSQL migration work begins.
- `REFERENCE_ANALYSIS.md`, `IMPLEMENTATION_PLAN.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `SETUP.md`, `DEPLOYMENT.md`, and `TESTING.md` remain accurate as implementation progresses.

# Users, Roles, and Permissions

| Role | Data Scope | Allowed Modules | Allowed Actions |
|---|---|---|---|
| Super Administrator | Organization-wide | All modules | Full system configuration, users, roles, retention, security settings |
| Organization Administrator | Organization | Admin, users, departments, templates, reports | Manage org structure, roles, templates, notification settings |
| Document Controller | Organization / department | Documents, templates, reports | Oversee document lifecycle, templates, retention-related actions |
| Document Owner | Owned documents | Documents, inbox, dashboard | Create, edit drafts, send routes, view owned document history |
| Reviewer | Assigned tasks | Inbox, signing workspace | Review, comment, return, reject per assignment |
| Approver | Assigned tasks | Inbox, signing workspace | Approve, reject, return, delegate per assignment |
| Signer | Assigned tasks | Inbox, signing workspace | Sign with re-authentication, reject, delegate per assignment |
| Viewer | Granted documents | Documents (read) | View authorized documents and status |
| Auditor | Audit/report scope | Audit, reports | Read-only access to audit trails and authorized reports |

Authorization requirements:

- Use flexible permission assignments rather than fixed role names alone.
- UI visibility does not replace backend enforcement.
- Direct-route access must enforce the same permissions.
- Permission and user-status changes must be auditable.
- Least-privilege access shall be applied.
- Default inactivity timeout: 15 minutes (configurable).
- No protected-page flash before authentication verification.
- Do not retain session after browser closure unless explicitly enabled.

# Approved Workflow

```text
Draft → Preparing → Ready for Routing → In Routing
  → Review / Approval / Signature / Acknowledgment (sequential or parallel steps)
  → Returned (revision cycle) | Rejected | Completed | Cancelled | Expired | Archived
```

Approved document statuses:

```text
draft
preparing
ready_for_routing
in_routing
awaiting_action
returned
rejected
completed
cancelled
expired
archived
```

Workflow rules:

1. Sequential steps activate in order.
2. Parallel recipients may act simultaneously; groups may require all, any, majority, or configurable minimum count.
3. Rejection may terminate or return the route.
4. Return for revision creates a documented revision cycle and new document version.
5. New versions invalidate pending actions on superseded versions; historical actions remain unchanged.
6. Never overwrite routed or signed documents; every revision creates a new version with separate R2 object and SHA-256 hash.
7. Delegation records both original and delegated user.
8. Required steps cannot be skipped without authorized override, reason, and audit event.
9. Completed routes are read-only.
10. Route advancement must occur in a transaction or transaction-like protected operation.

# Technology Stack

## Current Source Application

- Frontend: React + Vite + TypeScript scaffold with HashRouter, TanStack Query, page shells, and UI reference–aligned AppShell
- Backend: Cloudflare Worker scaffold (Hono)
- Database: SQLite placeholder in `database/sqlite/`; PostgreSQL via Nhost (target)
- Authentication: Nhost-ready auth scaffold with local development fallback
- Hosting: GitHub Pages (frontend target), Cloudflare Workers (API target)

## Target Application

- Frontend: React + Vite + TypeScript, HashRouter, TanStack Query, React Hook Form, Zod, PDF.js, pdf-lib, reference-aligned CSS/components
- Backend: Cloudflare Workers (Hono) for privileged operations; Nhost serverless functions where appropriate
- Database: PostgreSQL via Nhost; Hasura GraphQL API and subscriptions; SQLite-first design in `database/sqlite/` before migration
- Authentication: Nhost (sign-in, sign-out, forgot/reset password, email verification, invitations, session timeout, MFA-ready structure)
- Hosting: GitHub Pages (static frontend), Cloudflare Workers, Cloudflare R2 (private storage)
- UI framework: Custom components and styling from `reference/src` visual language—not default Ant Design layouts

# Architecture Decisions

1. Static frontend on GitHub Pages; no Node.js application server for production frontend.
2. All privileged operations (R2 presign, hashing, signing, route advancement, certificates, email) execute through Cloudflare Workers or protected Nhost functions.
3. R2 bucket remains private; use temporary preview/download URLs only.
4. Database changes shall use version-controlled migrations; SQLite validated first, then PostgreSQL/Nhost.
5. Sensitive operations shall not rely exclusively on client-side validation.
6. Audit records shall be protected from unauthorized modification or deletion through standard application functions.
7. Documenso is a functional reference only; adapt concepts to eDoc architecture without copying incompatible code.
8. Deployment shall use a repeatable and verifiable process (GitHub Actions, Wrangler, documented setup).

Target architecture:

```text
GitHub Pages
    └── React + Vite + TypeScript frontend
            ├── Nhost Authentication
            ├── Hasura GraphQL API
            ├── GraphQL subscriptions
            └── Cloudflare Worker API
                    ├── Nhost PostgreSQL
                    ├── Cloudflare R2
                    ├── PDF processing
                    ├── File hashing
                    ├── Signature processing
                    ├── Completion certificates
                    └── Email notifications
```

# Data Model

Authoritative schema location:

```text
database/sqlite/          (editable SQLite-first design)
database/migrations/      (PostgreSQL migration drafts)
workflow-app/database/schema.sql   (local workflow app only)
```

Primary entities (application):

| Entity group | Tables | Purpose |
|---|---|---|
| Organization & identity | organizations, profiles, departments, business_units, organization_members, roles, permissions, role_permissions, user_roles, user_delegations, user_notification_preferences, user_signature_profiles, user_sessions | Tenant isolation, auth metadata, delegation |
| Documents | documents, document_versions, document_files, document_attachments, document_categories, document_types, document_tags, document_tag_assignments, document_access_grants, document_retention_rules | Document lifecycle and access |
| Routing | routing_templates, routing_template_steps, document_routes, route_steps, route_step_assignees, route_step_actions, route_step_delegations, route_reminders, route_escalations | Sequential/parallel/mixed routing |
| Signatures | signature_fields, signature_events, signature_authentication_events, completion_certificates | Field placement and signing evidence |
| Collaboration | document_comments, comment_replies, comment_mentions, notifications, notification_deliveries, email_templates | Comments and notifications |
| Compliance | audit_events, system_settings, security_settings, system_logs, file_access_logs, data_export_logs | Audit and system records |

Key relationships:

```text
organizations
    ├── departments, business_units, organization_members
    ├── documents → document_versions → document_files (R2)
    │       ├── document_routes → route_steps → route_step_assignees
    │       ├── signature_fields → signature_events
    │       └── document_comments
    └── audit_events (append-only)
```

Critical data rules:

- Every document version has a separate R2 object and SHA-256 hash.
- Every signature links to one exact document version.
- Completed versions are immutable.
- Pending actions on superseded versions must be invalidated.
- Tenant-isolation columns on all organization-scoped tables.
- Hasura relationships and permissions required before production use.

R2 storage paths (private):

```text
organizations/{organizationId}/documents/{documentId}/versions/{versionId}/original/{fileName}
organizations/{organizationId}/documents/{documentId}/versions/{versionId}/signed/{fileName}
organizations/{organizationId}/documents/{documentId}/attachments/{attachmentId}/{fileName}
organizations/{organizationId}/documents/{documentId}/certificates/{certificateId}.pdf
```

# Application Modules

1. **Authentication** — Sign-in/out, password reset, email verification, invitations, profile, protected routes, 15-minute inactivity default, auth audit events.
2. **Dashboard** — Awaiting action, drafts, in routing, due soon, overdue, returned, rejected, completed, activity, volume/completion/bottleneck KPIs (backend data, not permanent mocks).
3. **My Inbox** — Review, approval, signature, acknowledgment, returned, delegated, overdue tasks with applicable actions.
4. **Documents** — Filtered views, search, sort, pagination, saved views, export, status/priority/due indicators.
5. **Document creation wizard** — Metadata, upload with validation/hashing, recipients/routing, PDF field placement, review and send.
6. **Routing templates** — Reusable SOP, protocol, validation, change control, CAPA, training acknowledgment, contract, and general approval templates.
7. **Signing workspace** — PDF viewer, thumbnails, zoom, field navigation, route progress, comments, audit activity, assignment-dependent actions.
8. **Electronic signature workflow** — Re-authentication, consent, meaning, identity/role/step recording, immutable signed PDF, hash and audit events, route advancement only after success.
9. **Version control** — No overwrite of routed/signed documents; controlled revision cycles.
10. **Comments** — General and route-step comments, replies, mentions, private comments, attachments, resolution.
11. **Notifications** — In-app and email; preferences, digests, reminders, escalations.
12. **Completion certificate** — Immutable PDF with participants, hashes, verification code/URL; stored privately in R2.
13. **Audit trail** — Append-only events with integrity hash; not editable/deletable via standard app functions.
14. **Administration** — Users, roles, permissions, org structure, categories, templates, security/session/signature/retention settings.
15. **Reports** — Status, department, category, turnaround, workload, rejection/return rates, bottlenecks, expiring/archived documents; CSV and Excel export.

# Worker API (privileged)

Representative endpoints:

```text
POST /api/files/upload-url
POST /api/files/complete-upload
GET  /api/files/:fileId/preview-url
GET  /api/files/:fileId/download-url
POST /api/documents/:documentId/hash
POST /api/documents/:documentId/sign
POST /api/documents/:documentId/certificate
POST /api/routes/:routeId/advance
POST /api/routes/:routeId/remind
POST /api/notifications/send
GET  /api/verification/:certificateId
```

Every endpoint must authenticate, validate with Zod, enforce organization isolation and document authorization, return structured errors, use request IDs, avoid stack trace exposure, write audit records where applicable, and rate-limit sensitive operations.

# Notifications

Notification triggers:

- New assignment; review, approval, signature, or acknowledgment required
- Due soon, overdue, returned, rejected, approved, completed, delegated
- Mentioned in comment; route cancelled; administrative change

Recipients and escalation:

- Assigned recipient first; reminder intervals and escalation rules per route configuration
- Delegation notifies both original and delegated parties where applicable

Duplicate-notification rule:

```text
Deduplicate by recipient, document, route step, and notification type within configured cooldown windows.
```

# Dashboard and Reporting

Required dashboards and KPIs:

- Awaiting my action, drafts, in routing, due soon, overdue, returned, rejected, completed
- Recent activity, monthly document volume, completion rate, average routing time, current bottlenecks

Required reports and exports:

- Documents by status, department, category, owner; turnaround time; overdue tasks; user workload
- Rejection rate, return-for-revision rate, completion rate, signature activity, route bottlenecks
- Expiring and archived documents
- Export formats: CSV, Excel
- Export scope: Authorized dataset with role-based filtering

# Audit Trail

Audit records shall include:

- Event ID, organization ID, user ID, display name, event type
- Entity type, entity ID, document ID, version ID, route ID, step ID
- Previous value, new value, reason
- Timestamp, IP address, browser/device, session ID, request ID, source
- Integrity hash

Audit requirements:

- Append-only; not editable or deletable through standard application functions
- Signature, route advancement, override, and authentication events are mandatory
- Retention per approved retention settings
- Audit records must not contain passwords, tokens, or restricted secrets

# Security Requirements

1. Nhost authentication with session timeout and optional MFA-ready structure.
2. Authorization at database (Hasura RLS/permissions), Worker/API, and frontend route levels.
3. Organization-scoped row-level isolation on all tenant data.
4. Default 60-minute inactivity timeout; configurable; clear credentials after sign-in submission.
5. Password re-entry, OTP, or configured re-authentication for electronic signatures.
6. Input validation with Zod at API boundaries; file MIME, size, and hash validation on upload.
7. Secrets only in Worker/backend environments; never in frontend bundles.
8. Do not commit real credentials or environment files (`.env`, `.dev.vars`).
9. Do not expose Nhost admin secret, Hasura admin secret, R2 keys, email keys, or signing keys to browser code.
10. Only public frontend values may use `VITE_` environment variables.
11. Rotate any exposed credential before production use.

# Migration Requirements

- Source: Validated SQLite schema in `database/sqlite/`
- Scope: Application PostgreSQL schema via Nhost; workflow app remains local SQLite
- Mapping: Document SQLite-to-PostgreSQL mapping in `DATABASE.md` and `DATA_MAP.md` before Supabase/Nhost migration
- Duplicate handling: Enforce unique constraints; reject or upsert per entity rules
- Re-import behavior: Idempotent migrations with explicit reconciliation
- Reconciliation: Schema validation scripts and representative integration tests
- Rollback: Version-controlled migration rollback scripts; R2 objects versioned separately
- Approval evidence: Baseline approval and handoff record before production migration

# Non-Functional Requirements

- Page-load target: Responsive static SPA; lazy-load PDF viewer where practical
- Dashboard-response target: Authorized GraphQL queries with pagination; no unbounded list loads
- Supported users: Multi-tenant organization model
- Availability target: Dependent on GitHub Pages, Nhost, and Cloudflare SLAs
- Supported browsers and devices: Modern evergreen browsers; responsive mobile navigation per UI reference
- Accessibility target: Keyboard navigation and accessible primitives (e.g., Radix) where custom components are used
- Backup and recovery: PostgreSQL via Nhost; immutable R2 object versioning for document artifacts
- Compliance and retention: Configurable retention settings; no automatic regulatory compliance claims

# Verification Requirements

Required checks:

- ESLint (`npm run lint`)
- TypeScript (`npm run typecheck` or build)
- Unit tests: routing rules, status transitions, permissions, file validation, hash utilities, field coordinates
- Integration tests: document creation, upload, routing, signing, tenant isolation, authorization
- Playwright E2E: sign-in through complete route and certificate verification flows
- Workflow app: `python workflow-app/scripts/validate_schema.py`, `python workflow-app/scripts/smoke_test.py`
- Worker: Wrangler dev/typecheck where applicable
- Production build: `npm run build` with GitHub Pages base path
- User acceptance: Manual walkthrough per `agent-workflow/BROWSER_TESTING.md`

# Implementation Phases

1. **Inspection and analysis** — Reference analysis, architecture docs, package decisions (largely complete).
2. **UI foundation** — App shell, side panel, header, shared components from UI reference (partially complete).
3. **Authentication and foundation** — Nhost, route guards, session timeout, GraphQL, TanStack Query.
4. **Database and authorization** — Migrations, Hasura metadata, permissions, seed data.
5. **Documents and storage** — Lists, creation, R2 uploads, versioning, secure preview/download.
6. **Routing** — Recipients, steps, templates, sequential/parallel logic, reminders, escalation, delegation.
7. **PDF preparation and signing** — Viewer, field placement, signing, PDF generation, hashing.
8. **Completion and audit** — Certificates, verification, audit trail, reports.
9. **Administration** — Users, roles, departments, templates, system settings.
10. **Testing and deployment** — Full test suite, GitHub Actions, Pages and Worker deployment.

# Definition of Done

A task is complete only when:

- The requested behavior is implemented.
- Applicable verification is completed.
- Relevant documentation is updated.
- The current handoff is updated.
- A versioned handoff is created when required.
- Known issues, risks, and next steps are documented.
- Git and deployment evidence is recorded when those actions were requested.

# Version Handover Workflow

Current operational status:

```text
agent-workflow/HANDOFF.md
```

Historical version handoffs:

```text
agent-history/version-X-handoff.md
```

Each historical handoff must reference this baseline and record the implementation scope, files changed, verification, known issues, commit, deployment, rollback, and next steps.

# Work Rules (from starter requirements)

1. Do not modify either reference folder.
2. Do not replace the active project wholesale.
3. Do not copy Documenso branding.
4. Do not use a pure Ant Design UI.
5. Follow the supplied UI reference for visual design.
6. Use Documenso for functional and architectural guidance only.
7. Keep the application runnable after every phase.
8. Fix TypeScript errors before continuing.
9. Run linting and tests after major changes.
10. Do not leave buttons that appear functional but have no action.
11. Clearly mark unfinished features.
12. Do not store permanent mock data in production code.
13. Do not hardcode users, roles, organizations, or credentials.
14. Do not expose secrets.
15. Do not claim deployment succeeded unless verified.
16. Avoid paid dependencies when a stable free-tier alternative exists.
17. Document anything that may create future cost.
18. Preserve existing working functionality unless replacement is necessary and documented.
19. Use Windows-compatible commands and paths in setup instructions.
20. Do not claim automatic compliance with GMP, 21 CFR Part 11, EU Annex 11, GAMP 5, the Philippine Data Privacy Act, or the Electronic Commerce Act.

# Reviewers Feedback

- Reviewers: `Project owner`
- Comments: `Baseline populated from reference/starter.md on 2026-07-01. Pending formal approval.`

# Baseline Approval

- Baseline version: `v0`
- Status: `FOR_REVIEW`
- Approved by: `[Pending project owner approval]`
- Approval date: `[Pending]`

This baseline remains the permanent source of truth unless explicitly revised and approved by the project owner.

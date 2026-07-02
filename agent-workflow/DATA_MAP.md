# Data Map

Last Updated: `2026-07-01`

## Purpose

Use this file for SQLite, migration, API data flow, reporting, integrity, authorization, and schema-navigation work.

This is a concise human map. It does not replace executable SQL.

## Two Schema Domains

| Domain | Authoritative SQL | Runtime data | Purpose |
|---|---|---|---|
| eDoc application | `database/sqlite/` → PostgreSQL/Nhost | Nhost PostgreSQL + R2 | Document routing, signing, audit |
| Workflow app (local) | `workflow-app/database/schema.sql` | `workflow-app/data/` (gitignored) | Baseline approval, handoff, agent coordination |

Do not merge these schemas. Cross-link only through Markdown files (`version-0-baseline.md`, handoffs).

## SQLite Sources

| Path | Role | Editing rule |
|---|---|---|
| `database/sqlite/` | Editable application schema (SQLite-first design) | Edit here first |
| `database/migrations/` | PostgreSQL migration drafts for Nhost | After SQLite validation |
| `workflow-app/database/schema.sql` | Workflow app SQLite | Edit for workflow app only |
| `sqlite-out/` | Generated schema map | Never edit manually |

## SQLite-First Migration Rule

Build, validate, and stabilize the SQLite database before preparing any Nhost/PostgreSQL migration.

Required order:

1. Model baseline entities in `database/sqlite/` per `agent-history/version-0-baseline.md`.
2. Generate `sqlite-out/` and review relationships, indexes, and constraints.
3. Run local SQLite validation with representative inserts and workflow queries.
4. Record accepted entities here and in `HANDOFF.md`.
5. Create PostgreSQL migrations and Hasura metadata only after SQLite structure is stable.

## Planned Application Entities (Phase 4)

Source: `reference/starter.md` / `version-0-baseline.md`. SQL not yet implemented in `database/sqlite/schema.sql`.

### Organization and identity

`organizations`, `profiles`, `departments`, `business_units`, `organization_members`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_delegations`, `user_notification_preferences`, `user_signature_profiles`, `user_sessions`

### Documents

`documents`, `document_versions`, `document_files`, `document_attachments`, `document_categories`, `document_types`, `document_tags`, `document_tag_assignments`, `document_access_grants`, `document_retention_rules`

### Routing

`routing_templates`, `routing_template_steps`, `document_routes`, `route_steps`, `route_step_assignees`, `route_step_actions`, `route_step_delegations`, `route_reminders`, `route_escalations`

### Signatures

`signature_fields`, `signature_events`, `signature_authentication_events`, `completion_certificates`

### Collaboration

`document_comments`, `comment_replies`, `comment_mentions`, `notifications`, `notification_deliveries`, `email_templates`

### Compliance and system

`audit_events`, `system_settings`, `security_settings`, `system_logs`, `file_access_logs`, `data_export_logs`

### Planned relationship tree

```text
organizations
    ├── departments, business_units, organization_members
    ├── user_roles → roles → permissions
    └── documents
            ├── document_versions → document_files (R2 key + sha256)
            ├── document_routes → route_steps → route_step_assignees
            ├── signature_fields → signature_events
            ├── document_comments
            └── audit_events (append-only)
```

### Critical application data rules

- Tenant isolation: `organization_id` on all scoped tables.
- Never overwrite signed/routed PDFs; new version = new row + new R2 object + new hash.
- Signatures bind to exactly one `document_version_id`.
- Superseded versions invalidate pending route actions.
- `audit_events` append-only; include integrity hash.
- R2 paths are private; store object keys, not public URLs.

## Workflow App Tables (implemented)

| Entity | Table | Purpose | Primary Key | Source SQL |
|---|---|---|---|---|
| Workflow record | `workflow_records` | Baseline/planning/execution workflow items | `id` | `workflow-app/database/schema.sql` |
| Workflow version | `workflow_versions` | Immutable JSON payload versions | `id` | same |
| Approval | `approvals` | User approval decisions | `id` | same |
| Audit event | `audit_events` | Append-only workflow app trace | `id` | same |
| Baseline snapshot | `baseline_snapshots` | Approved baseline Markdown checkpoints | `id` | same |
| Project brief | `project_briefs` | Conversational project intake | `id` | same |
| Handoff entry | `handoff_entries` | UI/UX feedback and debugging queue items | `id` | same |
| Selected element | `selected_elements` | Inspected UI context for handoff | `id` | same |
| Attachment | `attachments` | Files linked to brief or handoff | `id` | same |

### Workflow app relationships

```text
workflow_records
    ├── workflow_versions, comments, approvals, audit_events, baseline_snapshots
project_briefs → baseline_record_id → workflow_records
handoff_entries → selected_elements, attachments, baseline_snapshot_id
```

## Status and Workflow Map (application — planned)

| Stage | Allowed statuses | Owner | Exit condition |
|---|---|---|---|
| Draft | `draft`, `preparing` | Document owner | Upload + preparation complete |
| Ready | `ready_for_routing` | Document owner | Route configured and sent |
| Active route | `in_routing`, `awaiting_action` | Assignees | All required steps complete or terminal action |
| Terminal | `completed`, `rejected`, `cancelled`, `expired` | System/owner | No further route actions |
| Archive | `archived` | Admin/controller | Retention policy applied |

## Document status values (planned)

```text
draft | preparing | ready_for_routing | in_routing | awaiting_action
returned | rejected | completed | cancelled | expired | archived
```

## Route advancement rules

Implemented in `src/utils/routingRules.ts` (unit-tested); must align with Worker transaction logic when backend is built.

1. Sequential steps activate in order.
2. Parallel groups: all, any, majority, or minimum count.
3. Rejection/return triggers revision cycle or termination per configuration.
4. Delegation records original and delegate.
5. Overrides require reason + audit event.

## Data Ownership (application — planned)

| Data area | Create | Edit | Approve | View |
|---|---|---|---|---|
| Documents | Owner, controller | Owner (draft/returned) | Assignees per step | Role-granted |
| Routes/templates | Owner, admin | Owner, admin | Baseline policy | Org members |
| Audit/report | System | — | — | Auditor, admin |
| Admin settings | Org admin, super admin | Admin | — | Admin |

## API Data Flow

```text
Browser (JWT)
    ├── Hasura GraphQL → authorized reads/writes (RLS permissions)
    └── Worker API (JWT) → R2 presign, hash, sign, advance, certificate, notify
            └── PostgreSQL (service role) + R2 (private)
```

Privileged writes that affect signatures, immutable PDFs, or route state must not use client-only logic.

## Migration Rules

- Application migration source: validated `database/sqlite/` → `database/migrations/`
- Workflow app source: `workflow-app/database/schema.sql` only
- Nhost/PostgreSQL gate: no migration until SQLite validation passes
- Mapping file: `DATABASE.md` (update when mapping is explicit)
- Duplicate keys: natural keys per entity (e.g., org-scoped reference numbers)
- Rollback: version-controlled down migrations; R2 objects versioned separately

## Data Integrity Rules

- SQLite/PostgreSQL constraints for enforceable invariants
- Transactions for multi-step route advancement and signing
- Append-only audit triggers where applicable
- Foreign-key enforcement enabled
- No privileged credentials in client code
- File access logged for preview/download via Worker

## Update Rule

Update this file when application entities move from planned to implemented SQL, or when workflow app schema, relationships, or integrity controls change.

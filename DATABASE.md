# Database

## Source

Initial schema draft: `database/migrations/0001_initial.sql`.

## Core Entities

- organizations
- profiles
- departments
- roles, permissions, role_permissions, user_roles
- documents
- document_versions
- document_files
- document_routes
- route_steps
- route_step_assignees
- signature_fields
- signature_events
- audit_events

## Rules

- Every tenant-owned table carries `organization_id`.
- Routed and signed document files are never overwritten.
- Every routed document version has independent storage records and hashes.
- Signature events link to the exact document version and assignee.
- Audit events are append-only through normal application behavior.
- Hasura permissions must enforce organization isolation in addition to Worker checks.

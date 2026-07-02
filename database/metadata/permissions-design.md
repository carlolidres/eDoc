# Hasura Permissions Design (Draft)

Status: `APPLIED` (dev) — user-role permissions applied via `database/scripts/setup_hasura_metadata.py` on 2026-07-02.

Source schema: validated SQLite in [`database/sqlite/schema.sql`](../sqlite/schema.sql) (48 tables).

## Principles

1. **Organization isolation** — every role filter includes `organization_id` matching the user's active organization (from `profiles.organization_id` or session claim).
2. **Least privilege** — default deny; grant column-level access only where needed.
3. **Worker boundary** — signing, route advancement, file hash, and certificate issuance use Hasura `select` only; mutations go through Cloudflare Worker with service role.
4. **Append-only audit** — `audit_events` has `insert` + `select` only for authorized roles; no `update`/`delete`.

## Session variables (JWT custom claims)

| Claim | Purpose |
|---|---|
| `x-hasura-user-id` | Nhost user UUID → `profiles.id` |
| `x-hasura-organization-id` | Active tenant for row filters |
| `x-hasura-default-role` | Primary Hasura role |
| `x-hasura-allowed-roles` | All roles assigned to user |

## Role mapping

| Baseline role | Hasura role | Scope |
|---|---|---|
| Super Administrator | `super_admin` | Cross-org read for support; org-scoped write |
| Organization Administrator | `org_admin` | Full org management |
| Document Controller | `doc_controller` | Documents, templates, retention |
| Document Owner | `document_owner` | Owned documents + inbox |
| Reviewer / Approver / Signer | `assignee` | Assigned route steps + granted documents |
| Viewer | `viewer` | Read grants only |
| Auditor | `auditor` | Audit + reports read-only |

## Row filters (examples)

### `documents` — document_owner

```yaml
filter:
  organization_id:
    _eq: X-Hasura-Organization-Id
  _or:
    - owner_id:
        _eq: X-Hasura-User-Id
    - document_access_grants:
        grantee_id:
          _eq: X-Hasura-User-Id
```

### `documents` — assignee (inbox)

```yaml
filter:
  organization_id:
    _eq: X-Hasura-Organization-Id
  document_routes:
    route_steps:
      route_step_assignees:
        assignee_id:
          _eq: X-Hasura-User-Id
        status:
          _in: [pending, active]
```

### `audit_events` — auditor

```yaml
filter:
  organization_id:
    _eq: X-Hasura-Organization-Id
```

Permissions: `select` only.

## Table permission matrix (summary)

| Table group | org_admin | document_owner | assignee | viewer | auditor |
|---|---|---|---|---|---|
| organizations | select, update (own) | select (own) | select (own) | select (own) | select (own) |
| profiles | select, update (org) | select (org) | select (org) | select (org) | select (org) |
| documents | select, insert, update | select, insert, update (owned draft/returned) | select (assigned/granted) | select (granted) | select |
| document_versions | select, insert | select, insert (owned doc) | select | select (granted) | select |
| document_files | select | select (owned/granted) | select | select (granted) | select |
| document_routes / route_steps / assignees | select, insert, update | select, insert (owned doc) | select, update (own assignee row) | — | select |
| signature_fields / events | select | select, insert (prep) | select, insert (sign) via Worker | — | select |
| notifications | select, update (own) | select, update (own) | select, update (own) | — | — |
| audit_events | select | — | — | — | select |
| system_settings / security_settings | select, insert, update | — | — | — | select (security only) |

## Mutations restricted to Worker

These operations must **not** have client Hasura `insert`/`update` permissions:

- `signature_events` finalization (immutable PDF hash binding)
- `route_step_actions` that advance route state
- `document_files` after upload complete (hash verification)
- `completion_certificates` issuance
- `audit_events` with integrity hash (Worker may use admin secret)

## Subscriptions

Enable for real-time UI when metadata is applied:

- `route_step_assignees` where `assignee_id = X-Hasura-User-Id` and `status in (pending, active)`
- `notifications` where `recipient_id = X-Hasura-User-Id` and `read_at is null`
- `documents` status changes for owned documents

## Next steps

1. Apply `database/migrations/0001_initial.sql` to Nhost dev PostgreSQL.
2. Track tables in Hasura; create relationships matching foreign keys.
3. Export metadata to this folder after dev validation.
4. Run permission tests with seed org/users from `database/sqlite/seed.sql` equivalents.

# Database

## Source

| Layer | Path | Status |
|---|---|---|
| SQLite (authoritative design) | `database/sqlite/schema.sql` | Implemented — 48 tables |
| Seed fixtures | `database/sqlite/seed.sql` | Test org, users, sample document |
| PostgreSQL draft | `database/migrations/0001_initial.sql` | Aligned with SQLite; not yet applied to Nhost |
| Hasura permissions draft | `database/metadata/permissions-design.md` | Org-scoped role matrix |
| Generated map | `sqlite-out/` | Regenerated from SQLite schema |

## Validation

```powershell
python database/scripts/validate_schema.py
python database/scripts/generate_schema_map.py
```

## Core Entity Groups

- Organization and identity (13 tables)
- Documents (10 tables)
- Routing (9 tables)
- Signatures (4 tables)
- Collaboration (6 tables)
- Compliance and system (6 tables)

## Rules

- Every tenant-owned table carries `organization_id`.
- Routed and signed document files are never overwritten.
- Every routed document version has independent storage records and hashes.
- Signature events link to the exact document version and assignee.
- `audit_events` are append-only (SQLite triggers + PostgreSQL triggers).
- Hasura permissions must enforce organization isolation in addition to Worker checks.
- Document status uses `awaiting_action` (not `awaiting_my_action`).

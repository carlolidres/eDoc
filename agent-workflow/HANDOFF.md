# Current Handoff

Last Updated: `2026-07-02`
Version: `v6`
Branch: `master`
Commit: `pending`
Deployment: `DEPLOYED`

## Current Status

Baseline approved. Phase 4 Nhost migration applied (48 tables). Hasura tables tracked with org-scoped `user` role permissions. Phase 5 started: Documents, Dashboard, and Inbox pages wired to Hasura GraphQL.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 5 — document creation wizard, R2 upload, profile-to-auth user mapping.`
- Progress: `Nhost schema live; Hasura permissions applied; GraphQL list/metrics/inbox queries on UI pages.`
- Remaining: `Map profiles to Nhost user UUIDs; enable R2; creation wizard persistence; deploy frontend with GraphQL changes.`

## Recently Completed

- Baseline formally approved by project owner (2026-07-02).
- Applied `0001_initial.sql` and `0002_seed_dev.sql` to Nhost PostgreSQL (48 tables).
- Ran `setup_hasura_metadata.py` — tracked tables, relationships, user-role permissions.
- Wired `DocumentsPage`, `DashboardPage`, `InboxPage` to Hasura via `useDocumentData` hooks.
- Fixed document status enum: `awaiting_action` in types and `StatusBadge`.
- Added `database/scripts/apply_nhost_migration.py` and `setup_hasura_metadata.py`.

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — Phase 4 Nhost apply complete; Phase 5 GraphQL reads live; writes/R2 pending.
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` — Phase 4/5 changes pending commit.
- Build/database/runtime status: `BUILD_PASSING`
- Last known working state: `Nhost Hasura returns authorized queries for authenticated user role.`

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Seed profiles use fixed UUIDs, not Nhost auth user IDs | Empty lists until profile row matches signed-in user | Insert profile with Nhost user UUID + org |
| Medium | Cloudflare R2 not enabled | Upload endpoints return stubs | Owner enables R2 per `SETUP.md` |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |
| Low | Due soon/overdue metrics not computed | Dashboard shows 0 for those cards | Add date-filtered aggregates in Phase 5 |

## Verification

| Check | Status | Result |
|---|---|---|
| SQLite validate | `PASS` | 48 tables |
| Nhost migration apply | `PASS` | 48 public tables on Nhost PostgreSQL |
| Hasura metadata | `PASS` | Tables tracked; user permissions applied |
| Build | `PASS` | Vite production build with GraphQL hooks |
| Lint / test | `NOT_RUN` | Run before commit |

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `APPLIED` (dev, `user` role)

## Next Action

1. Create `profiles` row in Nhost DB matching signed-in user UUID and seed organization.
2. Enable Cloudflare R2; wire Worker presign endpoints.
3. Implement document creation wizard persistence (Phase 5).
4. Commit and deploy frontend GraphQL changes.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

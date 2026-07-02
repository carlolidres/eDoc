# Current Handoff

Last Updated: `2026-07-02`
Version: `v6`
Branch: `master`
Commit: `89c5456`
Deployment: `DEPLOYED` (frontend GitHub Pages run `28574815381`, 2026-07-02)

## Current Status

Baseline approved. Phase 4 Nhost migration applied (48 tables). Hasura tables tracked with org-scoped `user` role permissions. Phase 5 in progress: GraphQL reads on UI pages; document creation wizard (metadata + upload) and Worker R2 proxy flow implemented locally.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 5 — document creation wizard, R2 upload, profile-to-auth user mapping.`
- Progress: `Wizard steps 1–2 persist metadata via Hasura and upload PDF via Worker→R2; complete-upload hashes file and inserts document_files.`
- Remaining: `Apply document_versions Hasura permissions on Nhost; map profiles to auth UUIDs; E2E test wizard upload in production.`

## Recently Completed

- Committed `89c5456` — Hasura `x-hasura-role: user` header for authenticated GraphQL queries.
- Deployed frontend via GitHub Pages CI (run `28574815381`).
- Committed `7c8cc9c` — document creation wizard, Worker R2 upload, Hasura `document_versions` permissions script.
- Deployed Worker `a4f1816e` with R2 binding `edoc-dev`; frontend via GitHub Pages CI (run `28573704291`).
- Committed `f3b0dc6` — Phase 4/5 Nhost schema, Hasura GraphQL reads, database scripts.
- Document creation wizard: metadata save (`documents` + `document_versions`) and PDF upload flow.
- Worker: `PUT /api/files/upload-content`, R2 put, SHA-256 hash, `document_files` insert via Hasura admin, status → `preparing`.
- Added `document_versions` insert/select permissions to `setup_hasura_metadata.py`.

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — creation wizard + R2 flow coded; needs Nhost profile mapping and R2 enablement to test end-to-end.
- Instruction conflicts: `NONE`
- Repository status: `CLEAN` (`.cursor/` untracked only).
- Build/database/runtime status: `BUILD_PASSING`
- Last known working state: `npm run build` and `npm run worker:check` pass locally.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Seed profiles use fixed UUIDs, not Nhost auth user IDs | Empty lists / wizard blocked until profile row matches signed-in user | Insert profile with Nhost user UUID + org |
| Medium | R2 binding deployed but upload not E2E verified in production | Upload may still fail on auth/profile gaps | Test wizard after profile + Hasura permissions |
| Medium | `document_versions` permissions not yet re-applied on Nhost | Version insert may fail until metadata script rerun | Run `python database/scripts/setup_hasura_metadata.py` |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |
| Low | Due soon/overdue metrics not computed | Dashboard shows 0 for those cards | Add date-filtered aggregates in Phase 5 |

## Verification

| Check | Status | Result |
|---|---|---|
| SQLite validate | `PASS` | 48 tables |
| Nhost migration apply | `PASS` | 48 public tables on Nhost PostgreSQL |
| Hasura metadata | `PARTIAL` | User permissions applied; rerun for `document_versions` |
| Build | `PASS` | Vite production build with wizard |
| Worker typecheck | `PASS` | `npm run worker:check` |
| Lint | `PASS` | CI run `28574815381` |
| E2E wizard upload | `NOT_RUN` | Blocked on profile + R2 |

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `APPLIED` (dev, `user` role); `document_versions` pending re-apply

## Next Action

1. Insert `profiles` row in Nhost matching signed-in user UUID and seed organization.
2. Enable Cloudflare R2; redeploy Worker with R2 binding.
3. Run `setup_hasura_metadata.py` to apply `document_versions` permissions.
4. E2E test document creation wizard on production URLs.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

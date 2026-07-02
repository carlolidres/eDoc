# Current Handoff

Last Updated: `2026-07-02`
Version: `v7`
Branch: `master`
Commit: `uncommitted`
Deployment: `NOT_DEPLOYED` (local changes pending commit + Pages CI)

## Current Status

Baseline approved. Phase 4 Nhost migration applied (48 tables). Phase 5 wizard steps 0–2 complete: metadata, R2 upload, and recipients/routing (sequential draft route). Hasura owner-scoped routing insert permissions applied on Nhost dev.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 5/6 — wizard routing step, route activation, dashboard metrics.`
- Progress: `Wizard step 3 (recipients & routing) implemented; Hasura routing permissions re-applied.`
- Remaining: `Deploy frontend; E2E routing smoke with owner credentials; Phase 6 Worker route activation; dashboard due-soon/overdue metrics.`

## Recently Completed

- Wizard step 3: sequential route builder in `CreateDocumentPage` (action, assignee, optional due date).
- GraphQL: `ORG_PROFILES`, nested `CREATE_DOCUMENT_ROUTE`, `UPDATE_DOCUMENT_STATUS` → `ready_for_routing`.
- Hasura: org peer `profiles` select; owner insert/select on `document_routes`, `route_steps`, `route_step_assignees`.
- Extended `e2e_wizard_upload.py` with route create + status update steps (8-step flow).
- Committed `89c5456` — Hasura `x-hasura-role: user` header for authenticated GraphQL queries.
- E2E API smoke PASS (prior): profile → document create → Worker R2 upload → complete-upload.

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — routing UI + permissions implemented; full E2E routing smoke not run (needs owner sign-in).
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` — wizard routing step changes uncommitted.
- Build/database/runtime status: `BUILD_PASSING`
- Last known working state: `npm run build`, `npm run lint`, `npm run worker:check` pass locally.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | Route stays `draft` after wizard save | Inbox empty until Phase 6 activation | Worker `start-route` endpoint |
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Due soon/overdue metrics not computed | Dashboard shows 0 for those cards | Add date-filtered aggregates |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |

## Verification

| Check | Status | Result |
|---|---|---|
| Hasura metadata (routing) | `PASS` | `setup_hasura_metadata.py` applied on Nhost dev |
| Build | `PASS` | Vite production build with routing wizard |
| Worker typecheck | `PASS` | `npm run worker:check` |
| Lint | `PASS` | 0 errors (2 pre-existing warnings) |
| E2E wizard + routing | `NOT_RUN` | Requires owner `--email` + `E2E_PASSWORD` in `.dev.vars` |

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `APPLIED` (dev, `user` role, routing insert + org profiles)

## Next Action

1. Commit and deploy frontend so production `#/documents/new` includes routing step.
2. Run `python database/scripts/e2e_wizard_upload.py --email <owner>` to verify full 8-step API flow.
3. Phase 6: Worker route activation so draft routes populate inbox.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

# Current Handoff

Last Updated: `2026-07-02`
Version: `v11`
Branch: `master`
Commit: `uncommitted`
Deployment: `DEPLOYED` — Worker `cb63a841` live with route advance

## Current Status

Phase 6 route advancement implemented. Worker `POST /api/routes/:routeId/advance` completes assignee actions (review/approve/acknowledge/reject/return), evaluates step completion rules, activates next sequential steps, completes routes/documents, records audit events, and supports `Idempotency-Key` replay.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 6+ — inbox UI actions, dashboard due-soon/overdue metrics, signing workspace.`
- Progress: `Route start + advance deployed; E2E 10-step smoke PASS.`
- Remaining: `Wire inbox/signing UI to advance API; dashboard date-filtered aggregates; PDF field placement.`

## Recently Completed

- Worker `POST /api/routes/:routeId/advance` with transactional Hasura mutation, completion rules, idempotency.
- `worker/src/routing.ts` + extended `src/utils/routingRules.ts` for completion thresholds.
- `src/lib/workerApi.ts` `advanceDocumentRoute` client helper.
- E2E extended: route start → review advance → route/document `completed`.
- Worker deployed version `cb63a841`.

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — ROUTE-AC-006/009 met for sequential single-step review; parallel/mixed/reject flows need broader tests.
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` — worker advance implementation uncommitted
- Build/database/runtime status: `BUILD_PASSING`, `E2E_PASSING`
- Last known working state: `npm run build`, `npm run worker:check`, `npm run test`, `e2e_wizard_upload.py` pass.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Due soon/overdue metrics not computed | Dashboard shows 0 for those cards | Add date-filtered aggregates |
| Low | Inbox UI has no advance action buttons | Users cannot complete tasks from UI yet | Wire Inbox/Signing workspace to Worker |
| Low | Sign steps blocked on advance endpoint | Sign completion needs signing workspace | Phase 7 signing flow |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |

## Verification

| Check | Status | Result |
|---|---|---|
| Hasura metadata (routing) | `PASS` | Owner insert/select on routes, steps, assignees |
| Build | `PASS` | Vite production build |
| Worker typecheck | `PASS` | `npm run worker:check` |
| Unit tests | `PASS` | `npm run test` (routing rules extended) |
| Worker deploy | `PASS` | `edoc-worker` version `cb63a841` |
| E2E wizard + routing + start + advance | `PASS` | `e2e_wizard_upload.py --email carlolidres@gmail.com` |
| GitHub Pages deploy | `NOT_RUN` | No frontend changes requiring deploy |

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `APPLIED` (dev, `user` role, routing + org profiles)

## Next Action

1. Wire Inbox/Signing workspace UI to `advanceDocumentRoute` Worker API.
2. Add dashboard due-soon/overdue date-filtered aggregates.
3. Begin Phase 7: PDF viewer and signing workspace with re-authentication.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

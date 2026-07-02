# Current Handoff

Last Updated: `2026-07-02`
Version: `v10`
Branch: `master`
Commit: `464eac4`
Deployment: `DEPLOYED` — GitHub Pages CI triggered; Worker `092ec360` live

## Current Status

Baseline approved. Phase 5 wizard routing complete. Phase 6 route activation live: Worker `POST /api/routes/:routeId/start` activates draft routes, sets document `in_routing`, activates first sequential step assignees, and records `route.started` audit event.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 6+ — route advancement, dashboard due-soon/overdue metrics, signing workspace.`
- Progress: `Route start endpoint deployed; wizard auto-sends route; E2E 9-step smoke PASS.`
- Remaining: `Worker route advance; dashboard date-filtered aggregates; PDF field placement.`

## Recently Completed

- `464eac4` — Phase 6: `POST /api/routes/:routeId/start`, wizard send, inbox query filters active steps only.
- `21dd3da` — Phase 5: wizard routing step, Hasura routing permissions, E2E smoke script.
- E2E API smoke PASS: sign-in → profile → document → R2 upload → draft route → `ready_for_routing` → route start → 1 inbox assignee.
- Worker deployed with R2 binding (`edoc-dev`).

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — route activation meets ROUTE-AC-006; advance/signing not yet implemented.
- Instruction conflicts: `NONE`
- Repository status: `CLEAN`
- Build/database/runtime status: `BUILD_PASSING`, `E2E_PASSING`
- Last known working state: `npm run build`, `npm run worker:check`, `e2e_wizard_upload.py` pass.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Due soon/overdue metrics not computed | Dashboard shows 0 for those cards | Add date-filtered aggregates |
| Low | `advance` endpoint still 501 | Steps cannot complete yet | Phase 6 continuation |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |

## Verification

| Check | Status | Result |
|---|---|---|
| Hasura metadata (routing) | `PASS` | Owner insert/select on routes, steps, assignees |
| Build | `PASS` | Vite production build with route send |
| Worker typecheck | `PASS` | `npm run worker:check` |
| Worker deploy | `PASS` | `edoc-worker` version `092ec360` |
| E2E wizard + routing + start | `PASS` | `e2e_wizard_upload.py --email carlolidres@gmail.com` |
| GitHub Pages deploy | `PENDING` | CI for commit `464eac4` |

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `APPLIED` (dev, `user` role, routing + org profiles)

## Next Action

1. Confirm GitHub Pages CI green for `464eac4`.
2. Manual UI check: create document → routing → verify inbox shows active task.
3. Implement `POST /api/routes/:routeId/advance` for step completion.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

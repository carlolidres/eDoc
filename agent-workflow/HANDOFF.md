# Current Handoff

Last Updated: `2026-07-02`
Version: `v11`
Branch: `master`
Commit: `a804cf3` (2 commits ahead of origin)
Deployment: `DEPLOYED` — Worker `cb63a841` live with route advance

## Current Status

Phase 6 route advancement committed (`8db4327`). Inbox and signing workspace UI call `advanceDocumentRoute` for review/approve/acknowledge; sign steps open the workspace scaffold pending PDF signing.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 6+ — inbox UI actions, dashboard due-soon/overdue metrics, signing workspace.`
- Progress: `Route advance API committed; inbox quick-complete + workspace wiring added.`
- Remaining: `Dashboard date-filtered aggregates; PDF viewer and sign-step completion.`

## Recently Completed

- Worker route advance endpoint committed (`8db4327`).
- Inbox table actions: Open workspace, quick-complete review/approve/acknowledge via Worker API.
- Signing workspace loads assignment by id and completes non-sign actions.
- `useRouteAdvance` hook invalidates inbox, dashboard, and documents queries after advance.

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — ROUTE-AC-006/009 met for sequential single-step review; parallel/mixed/reject flows need broader tests.
- Instruction conflicts: `NONE`
- Repository status: `CLEAN` — 2 commits ahead of origin
- Build/database/runtime status: `BUILD_PASSING`, `E2E_PASSING`
- Last known working state: `npm run build`, `npm run worker:check`, `npm run test`, `e2e_wizard_upload.py` pass.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Due soon/overdue metrics not computed | Dashboard shows 0 for those cards | Add date-filtered aggregates |
| Low | Sign steps cannot complete from UI yet | Sign assignments open workspace but advance is disabled | Phase 7 PDF signing flow |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |

## Verification

| Check | Status | Result |
|---|---|---|
| Hasura metadata (routing) | `PASS` | Owner insert/select on routes, steps, assignees |
| Build | `PASS` | Vite production build after inbox wiring |
| Unit tests | `PASS` | `npm run test` (9 tests) |
| GitHub Pages deploy | `NOT_RUN` | Frontend inbox wiring not yet pushed |

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `APPLIED` (dev, `user` role, routing + org profiles)

## Next Action

1. Push to origin for GitHub Pages deploy.
2. Add dashboard due-soon/overdue date-filtered aggregates.
3. Begin Phase 7: PDF viewer and signing workspace with re-authentication.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

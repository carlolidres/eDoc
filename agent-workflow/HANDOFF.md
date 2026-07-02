# Current Handoff

Last Updated: `2026-07-02`
Version: `v11`
Branch: `master`
Commit: `3666ac1`
Deployment: `DEPLOYED` — Pages CI success; Worker `0cd9cac4`

## Current Status

Phase 7 PDF preview, PDF.js viewer, and sign-step completion with re-authentication implemented locally. Signing workspace renders authorized PDFs and completes sign assignments through the Worker sign endpoint.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 8 — completion certificates and audit trail UI.`
- Progress: `Phase 7 PDF preview, PDF.js viewer, and sign-step completion with re-authentication implemented.`
- Remaining: `Deploy Worker signing endpoints; apply Hasura Phase 7 permissions; live sign-step E2E with R2 PDF.`

## Recently Completed

- Worker `GET /api/files/:fileId/preview-url` and `preview-content` with assignee/owner authorization and access logging.
- Worker `POST /api/documents/:documentId/sign` — password re-auth, version hash check, pdf-lib signature apply, signed PDF in R2, signature events, route advance.
- Signing workspace: lazy PDF.js viewer (zoom, pages, thumbnails), sign dialog with consent and re-authentication.
- Hasura metadata script extended for `document_files`, `signature_fields`, assignee `document_versions` read, and signing relationships.

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — ROUTE-AC-006/009 met for sequential single-step review; parallel/mixed/reject flows need broader tests.
- Instruction conflicts: `NONE`
- Repository status: `CLEAN` — synced with origin
- Build/database/runtime status: `BUILD_PASSING`, `E2E_PASSING`
- Last known working state: `npm run build`, `npm run worker:check`, `npm run lint`, `npm run test` pass.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Worker sign endpoint not yet deployed | Production sign steps still blocked until redeploy | Deploy Worker after review |
| Low | Hasura Phase 7 permissions need re-apply | Assignees may not see PDF metadata until metadata script runs | Run `setup_hasura_metadata.py` |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |

## Verification

| Check | Status | Result |
|---|---|---|
| Hasura metadata (routing) | `PASS` | Owner insert/select on routes, steps, assignees |
| Build | `PASS` | Vite production build with lazy PDF.js chunk |
| Unit tests | `PASS` | `npm run test` (11 tests) |
| Worker type-check | `PASS` | `npm run worker:check` |
| Lint | `PASS` | `npm run lint` |
| GitHub Pages deploy | `NOT_RUN` | Pending commit/deploy of Phase 7 frontend |
| Worker deploy | `NOT_RUN` | Pending deploy of Phase 7 signing/preview endpoints |

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `PENDING_REAPPLY` — Phase 7 `document_files` / `signature_fields` / assignee version reads in metadata script

## Next Action

1. Deploy Worker with Phase 7 signing and preview endpoints.
2. Re-run `database/scripts/setup_hasura_metadata.py` for Phase 7 read permissions.
3. Begin Phase 8: completion certificates and audit trail UI.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

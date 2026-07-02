# Current Handoff

Last Updated: `2026-07-02`
Version: `v14` (Phase 8 integrity hash + auditor scope)
Branch: `master`
Commit: `e938c95` (local changes pending commit)
Deployment: `PARTIAL` — Hasura metadata applied; Worker deploy needed for integrity_hash on new audit events

## Current Status

Phase 8 remaining gaps implemented locally: SHA-256 integrity hashes on Worker audit inserts (DEC-014), auditor-scoped Hasura reads (org-wide via `user_roles` check + dedicated `auditor` role), and UI/export exposure of `integrity_hash`.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 8 — completion certificates and audit trail UI.`
- Progress: `Integrity hash + auditor permissions implemented; Hasura metadata applied.`
- Remaining: `Deploy Worker (integrity hash), deploy Pages (UI), assign Auditor role to test user, optional Nhost JWT allowed-role for auditor.`

## Recently Completed

- `worker/src/auditIntegrity.ts` — SHA-256 canonical JSON hash per DEC-014; applied to route start, route advance, certificate issuance audit inserts.
- `database/scripts/setup_hasura_metadata.py` — auditor org-scoped reads (`auditor` role + `user` role expansion via `user_roles`), `integrity_hash` column on audit select, supporting relationships.
- UI — `integrity_hash` in audit trail panel and reports CSV export.
- Seed — `Auditor` role (`00000000-0000-4000-8000-000000000053`) in SQLite seed + Postgres `0002_seed_dev.sql`.
- `e2e_sign_flow.py` — step 13 validates `integrity_hash` on `certificate.issued` audit event.

## Reliability Snapshot

- Acceptance criteria: `NEAR_COMPLETE` — AUDIT-AC-003 and auditor scope implemented; live Worker deploy + auditor user assignment remain.
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` (Phase 8 gap closure changes)
- Build/database/runtime status: `BUILD_PASSING`, `HASURA_METADATA_APPLIED`, `UNIT_TESTS_PASSING`, `WORKER_TYPECHECK_PASSING`
- Last known working state: `npm run test`, `npm run worker:check`, `npm run lint`, `npm run build` pass.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |
| Low | Existing audit events lack integrity_hash | Pre-deploy events have null hash | Expected; new Worker events will populate hash |

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run test` | `PASS` | 15/15 including `auditIntegrity.test.ts` |
| `npm run worker:check` | `PASS` | Worker TypeScript clean |
| `npm run lint` | `PASS` | 0 errors (2 pre-existing warnings) |
| `npm run build` | `PASS` | Production build |
| Hasura metadata (auditor + integrity_hash column) | `PASS` | `setup_hasura_metadata.py` exit 0 |
| Live Worker integrity_hash E2E | `NOT_RUN` | Requires Worker deploy |

## Next Action

1. Deploy Worker (`wrangler deploy`) so new audit events include `integrity_hash`.
2. Deploy Pages for audit trail / reports UI changes.
3. Assign Auditor role to a test user: `sync_nhost_profile.py --role-id 00000000-0000-4000-8000-000000000053`.
4. Optional: add `auditor` to Nhost JWT allowed roles for dedicated Hasura role header.
5. Phase 9 administration or Phase 7 field-placement wizard.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

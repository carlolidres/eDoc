# Current Handoff

Last Updated: `2026-07-02`
Version: `v13` (Phase 8 E2E verified)
Branch: `master`
Commit: `bd336e0` (+ Hasura relationship + E2E scripts uncommitted)
Deployment: `DEPLOYED` — Worker `af39241e`; GitHub Pages live

## Current Status

Phase 8 certificate issuance and authenticated UI walkthrough verified on production. Hasura `route_steps.route_step_actions` relationship added (required for certificate participant lookup). Live sign + certificate API E2E and Playwright Pages walkthrough pass.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 8 — completion certificates and audit trail UI.`
- Progress: `Live certificate E2E + authenticated Pages walkthrough complete.`
- Remaining: `Phase 8 gaps — auditor-role scoped reads, integrity hash on audit events.`

## Recently Completed

- Hasura metadata — `route_steps → route_step_actions` relationship (fixes silent certificate issuance failure).
- `e2e_sign_flow.py` — extended to steps 13–15 (certificate row, audit event, verification API).
- Playwright live walkthrough — dashboard, inbox, documents, reports, signing workspace audit/certificate card, public verify form (5/5 pass).
- Production certificate sample — `cea5232a-5006-4f64-810a-901daef81ab6` / code `MR778NA2` (from latest E2E run).

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — CERT/AUDIT baseline largely met; integrity hash and auditor role scope remain.
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` — Hasura metadata + E2E scripts uncommitted
- Build/database/runtime status: `BUILD_PASSING`, `HASURA_METADATA_APPLIED`, `CERTIFICATE_E2E_PASSING`, `LIVE_UI_WALKTHROUGH_PASSING`
- Last known working state: `npm run build`, `npm run worker:check`, `npm run lint`, `npm run test` pass.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |

## Verification

| Check | Status | Result |
|---|---|---|
| Hasura `route_step_actions` relationship | `PASS` | `setup_hasura_metadata.py` exit 0 |
| Live sign + certificate API E2E | `PASS` | `e2e_sign_flow.py` steps 1–15 |
| Authenticated Pages walkthrough | `PASS` | Playwright `phase8-live.spec.ts` 5/5 |
| Signing workspace audit + certificate card | `PASS` | `#/sign/:assigneeId` on live Pages |
| Public verify form submission | `PASS` | `Certificate verified` on live Pages |
| Worker deploy (Phase 8) | `PASS` | `edoc-worker` version `af39241e` |
| GitHub Pages deploy (Phase 8) | `PASS` | workflow `28586057558` success |

## Manual UI Verification (2026-07-02)

```text
Route: https://carlolidres.github.io/eDoc/ (authenticated + verify)
Tested by: Agent (Playwright against production Pages)
Original issue: Phase 8 authenticated walkthrough + certificate E2E

Verification steps:
1. Sign in with Nhost test account
2. Open dashboard, inbox, documents, reports (certificate audit events visible)
3. Open signing workspace for completed assignee — audit trail + certificate card + verify link
4. Submit public verify form with issued certificate id + code

Result: PASSED
Console: NO_NEW_ERRORS in Playwright run
Network: Worker verification API returned valid certificate
Comments: Re-run with `python database/scripts/e2e_live_walkthrough.py --assignee-id ... --certificate-id ... --verification-code ...`
```

## SQLite Sync

- Nhost migration status: `APPLIED` — `0001_initial.sql`, `0002_seed_dev.sql`
- Hasura permissions: `APPLIED` — Phase 7 + Phase 8 assignee/audit reads + `route_step_actions` relationship

## Next Action

1. Commit Hasura relationship fix and E2E/walkthrough scripts.
2. Phase 8 remaining: auditor-role scoped reads, integrity hash on audit events.
3. Phase 9 administration or Phase 7 field-placement wizard.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

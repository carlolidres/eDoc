# Current Handoff

Last Updated: `2026-07-03`
Version: `v17` (Phase 10 CI/test expansion; v16 Phase 7 field-placement wizard deployed; v15 Phase 9 admin reads deployed)
Branch: `master`
Commit: `6e0d91a` (v16, deployed to Pages); Phase 10 changes pending commit as v17
Deployment: `PAGES_DEPLOYED` (v16 live at https://carlolidres.github.io/eDoc/); Worker unchanged (v14)

## Current Status

v15 (Phase 9 administration reads + multi-user profile-lookup fix) and v16 (Phase 7 field-placement wizard) both committed, pushed, and deployed live — both deploys hit the same transient GitHub Pages "Deployment failed, try again later." error on the first attempt, resolved by re-running the failed `deploy-pages` job.

Phase 7 (field-placement wizard): the document creation wizard's "PDF field placement" step (previously a placeholder) now lets the document owner draw signature/approval/review/acknowledgment fields directly on the uploaded PDF, per routing-step assignee, before sending. The wizard's routing step no longer starts the route immediately — it now defers `startDocumentRoute` and the `ready_for_routing` status update to the new "Review and send" step, so fields can be placed on a still-draft route beforehand.

Phase 10 (started): found and fixed a stale, always-failing Playwright test (`tests/e2e/app.spec.ts` used a `getByLabel` locator that timed out against the current login markup); wired a credential-free `e2e` CI job into `pages.yml` that runs this smoke test on every push without blocking deploys; added a unit test for the new Phase 7 field-type mapping.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 10 — testing and CI expansion (started after Phase 7 field-placement wizard).`
- Progress: `Fixed stale Playwright scaffold; added credential-free e2e CI job; added Phase 7 unit test.`
- Remaining: `Live end-to-end wizard walkthrough; live-credential Playwright specs in CI (needs secrets decision); Worker deploy via CI (needs Cloudflare API token secret).`

## Recently Completed

### v17 — Phase 10 CI/test expansion

- `tests/e2e/app.spec.ts` — fixed a broken locator (`getByLabel('Email'/'Password')` timed out; switched to `getByRole('textbox', { name })`, the same pattern already used by the newer live specs). Verified locally with `.env` temporarily removed (simulating CI, where the `e2e` job intentionally sets no `VITE_NHOST_*` vars) — passes in ~26s using the local-fallback auth path.
- `.github/workflows/pages.yml` — new `e2e` job: installs Chromium, runs `tests/e2e/app.spec.ts` (only — the two live-credential specs self-skip without `E2E_EMAIL`/`E2E_PASSWORD` and were left out of CI rather than skipped-but-run, since Playwright's browser install adds ~2 min either way), uploads the HTML report as a build artifact. Runs independently of `build`/`deploy` so a flaky/failing e2e run cannot block a Pages deploy.
- `src/types/domain.test.ts` (new) — unit coverage for `fieldTypesForAction`/`signatureFieldTypeLabel` (the Phase 7 field-type-per-route-action mapping), satisfying the Ponytail "one small runnable check" rule for that non-trivial logic.
- `agent-workflow/CODEMAP.md` — documented the two previously-undocumented live Playwright specs (`login-nav-fix.spec.ts`, `phase8-live.spec.ts`) and the Python live-smoke scripts, so future agents don't need to rediscover them.
- Not done: wiring the live-credential Playwright specs or a Worker/Wrangler deploy job into CI — both require adding secrets (a live test-user password; a Cloudflare API token) to the GitHub repo, which is a credential/scope decision for the project owner, not something to add unilaterally.

### v16 — Phase 7 field-placement wizard

- `src/components/pdf/FieldPlacementViewer.tsx` (new) — pdf.js page renderer with a drag-to-draw overlay; normalizes drag rectangles to the same top-left-origin 0–1 `x/y/width/height` contract already used by `worker/src/pdfCoordinates.ts`. Toolbar selects assignee (from the routing step just created) and field type (filtered by that assignee's route action via `fieldTypesForAction`). Lazy-loaded like the existing `PdfViewer`.
- `src/types/domain.ts` — added `SignatureFieldType`, `signatureFieldTypeLabel`, `fieldTypesForAction` (maps `sign`→signature/initial/name/date/job_title/text, `approve`→approval_meaning, `review`→review_meaning, `acknowledge`→acknowledgment, all matching the `signature_fields.field_type` CHECK constraint).
- `src/pages/CreateDocumentPage.tsx` — restructured the wizard: routing submit now only creates the draft route/steps/assignees (no longer calls `startDocumentRoute` or updates document status); the returned `route_step_assignees` ids populate the field-placement assignee list. New "PDF field placement" step (index 3) renders `FieldPlacementViewer` against the just-uploaded file's preview URL, requires at least one field per assignee before continuing (client-side gate). New "Review and send" step (index 4) bulk-inserts `signature_fields`, then updates document status to `ready_for_routing` and starts the route — i.e. persistence to Hasura only happens once, at send time, from local wizard state.
- `src/graphql/mutations.ts` — `INSERT_SIGNATURE_FIELDS` bulk insert mutation.
- `database/scripts/setup_hasura_metadata.py` — `signature_fields` insert permission for the `user` role, scoped to the document owner via the existing `assignee_row` relationship + `OWNER_STEP_FILTER` (same pattern as `route_steps`/`document_routes` insert); extended the existing assignee-only select permission to also allow the owner to read fields they placed. Applied to dev Hasura (`PASS: Hasura metadata configured.`).
- `database/metadata/permissions-design.md` — documented the new Phase 7 permission section.
- Verification evidence: one-off live GraphQL check (temporary script, deleted after use) signed in as the dev test user, created a document/version/draft route/assignee, inserted a `signature_fields` row as the owner, and read it back — `PASS: owner insert+select on signature_fields works.`

### v15 — Phase 9 administration reads (deployed)

- `src/pages/AdminPage.tsx` — real data: users + role assignments, roles, departments, document types, security settings (session timeout/MFA); links to Routing templates and Reports; gated behind `useIsOrgAdmin`.
- `src/hooks/useAdminData.ts`, `src/graphql/queries.ts` (ADMIN_* queries) — Phase 9 data hooks.
- `database/scripts/setup_hasura_metadata.py` — `ADMIN_ORG_FILTER` (mirrors the auditor pattern: same `user` Hasura role, row filter checks `user_roles` for an admin role name); new relationships; `user`-role select permissions on org-configuration tables. Applied to dev Hasura.
- **Bug fix (multi-user profile lookup):** `CURRENT_PROFILE` and the E2E scripts' "load current profile" query used unfiltered `profiles(limit: 1)`, ambiguous once an org has 2+ profiles — now filtered by the caller's Nhost user id.
- Deployed: pushed as commit `321fdc0`; GitHub Actions run `28665492942` — first attempt failed at the `deploy-pages` step with a transient "Deployment failed, try again later." (build/lint/type-check/test all passed); `gh run rerun --failed` succeeded on retry. Live site confirmed serving the new build (HTTP 200, login page renders).

## Reliability Snapshot

- Acceptance criteria: `COMPLETE` for Phase 8 AUDIT-AC-003/auditor scope and Phase 9 read views. Phase 7 field-placement UI `COMPLETE` for placement + persistence; drawn/uploaded signature *image* modes remain out of scope (typed signature only, unchanged from existing sign flow).
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` (Phase 10 changes pending commit as v17 at time of writing; v15/v16 committed and deployed)
- Build/database/runtime status: `BUILD_PASSING`, `HASURA_METADATA_APPLIED` (dev, Phase 9 and Phase 7 permissions), `WORKER_DEPLOYED` (v14; unchanged), `PAGES_DEPLOYED` (v16 live)
- Last known working state: `npm run type-check`, `npm run test` (18/18, 8 files), `npm run worker:check`, `npm run lint`, `npm run build` all pass. `npx playwright test tests/e2e/app.spec.ts` passes locally without Nhost env configured.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Phase 9 admin views are read-only | No in-app user invite, role assignment, or department/document-type creation yet | Add Worker mutation endpoints with admin-role check if in-app management is required; SQL scripts remain the workaround |
| Medium | Field-placement wizard not yet exercised live end-to-end (create→route→place→send→sign) | Only the Hasura permission path was live-verified in isolation, not the full UI flow | Manual/Playwright walkthrough after v16 Pages deploy |
| Low | Worker `applySignatureToPdf` only draws text for `signature`/`initial`/`date_signed`/`*_meaning` field types | `name`, `job_title`, `text`, `checkbox` fields can be placed but render blank on the signed PDF | Extend `worker/src/signing.ts` if those field types need visible output |
| Low | No update/delete permission on `signature_fields` | Once sent, fields cannot be edited via Hasura (by design — wizard batches locally pre-send) | Add scoped update/delete permission if post-send correction is required |
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |
| Low | Existing audit events lack integrity_hash | Pre-deploy events have null hash | Expected; new Worker events will populate hash |
| Low | Permissions/retention-rules/email-template admin views still placeholders | Not yet backed by Hasura data | Scope as follow-up Phase 9 work |
| Low | Live-credential Playwright specs and Worker deploy not wired into CI | `login-nav-fix.spec.ts`/`phase8-live.spec.ts` and a Wrangler deploy job both need secrets not available in this session (test-user password, Cloudflare API token) | Owner adds GitHub Actions secrets if desired |

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run type-check` | `PASS` | Clean after Phase 7 + Phase 10 changes |
| `npm run test` | `PASS` | 18/18 (8 files, incl. new `domain.test.ts`) |
| `npm run worker:check` | `PASS` | Worker TypeScript clean (no Worker changes) |
| `npm run lint` | `PASS` | 0 errors (2 pre-existing warnings, unrelated) |
| `npm run build` | `PASS` | Production build; new `FieldPlacementViewer` chunk lazy-loaded (4.6 kB gzip 1.9 kB) |
| Hasura metadata (Phase 7 `signature_fields` insert/select) | `PASS` | `setup_hasura_metadata.py` exit 0 against dev Hasura |
| Live owner insert+select check on `signature_fields` | `PASS` | One-off script: created document/route/assignee, inserted a field as owner, read it back |
| v15 GitHub Pages deploy | `PASS` (after 1 retry) | Run `28665492942`; build/lint/type-check/test/build all green; first `deploy-pages` attempt hit a transient platform error, `gh run rerun --failed` succeeded |
| v16 GitHub Pages deploy | `PASS` (after 1 retry) | Run `28665746876`; same transient `deploy-pages` error on first attempt, succeeded on retry; live site returns HTTP 200 |
| `npx playwright test tests/e2e/app.spec.ts` | `PASS` | Ran locally with `.env` temporarily removed to simulate the CI `e2e` job (no live credentials) |
| v17 GitHub Pages deploy + new `e2e` CI job | `NOT_RUN` | Pending commit + push |
| Live wizard walkthrough (create→route→place fields→send→sign) | `NOT_RUN` | Not attempted this session; recommend after v17 push, using a browser session against the live site |

## Next Action

1. Commit and push Phase 10 (v17); confirm the new `e2e` CI job passes on GitHub Actions (not just locally).
2. Manually or via Playwright, walk through the full wizard (metadata → upload → routing → field placement → send) against the live site, then sign as the assignee to confirm end-to-end.
3. Decide whether to add `E2E_EMAIL`/`E2E_PASSWORD` as GitHub secrets to run the live Playwright specs in CI, and whether to add a Cloudflare API token secret for Worker deploy via CI.
4. Phase 9 admin write endpoints (invite/assign-role/manage-department) remain deferred — no blocker surfaced that requires them.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

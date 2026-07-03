# Current Handoff

Last Updated: `2026-07-03`
Version: `v16` (Phase 7 field-placement wizard; v15 Phase 9 admin reads deployed)
Branch: `master`
Commit: `321fdc0` (v15, deployed to Pages); Phase 7 changes pending commit as v16
Deployment: `PAGES_DEPLOYED` (v15 live at https://carlolidres.github.io/eDoc/); Worker unchanged (v14); v16 Pages deploy pending push

## Current Status

v15 (Phase 9 administration reads + multi-user profile-lookup fix) committed, pushed, and deployed live — first attempt hit a transient GitHub Pages "Deployment failed, try again later." error, resolved by re-running the same successful build artifact.

Phase 7 (field-placement wizard) implemented next: the document creation wizard's "PDF field placement" step (previously a placeholder) now lets the document owner draw signature/approval/review/acknowledgment fields directly on the uploaded PDF, per routing-step assignee, before sending. The wizard's routing step no longer starts the route immediately — it now defers `startDocumentRoute` and the `ready_for_routing` status update to the new "Review and send" step, so fields can be placed on a still-draft route beforehand.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 7 — PDF field-placement wizard step (PDF-AC: upload, viewing, preparation, signature-field placement).`
- Progress: `Field placement UI implemented and wired to signature_fields via Hasura; Hasura owner-scoped insert/select permission applied to dev and live-verified.`
- Remaining: `Live end-to-end wizard walkthrough (create → route → place fields → send → sign) once deployed; Phase 10 test/CI expansion.`

## Recently Completed

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
- Repository status: `DIRTY` (Phase 7 changes pending commit as v16 at time of writing; v15 committed and deployed)
- Build/database/runtime status: `BUILD_PASSING`, `HASURA_METADATA_APPLIED` (dev, both Phase 9 and Phase 7 permissions), `WORKER_DEPLOYED` (v14; unchanged), `PAGES_DEPLOYED` (v15 live; v16 not yet pushed)
- Last known working state: `npm run type-check`, `npm run test`, `npm run worker:check`, `npm run lint`, `npm run build` all pass after Phase 7 changes.

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

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run type-check` | `PASS` | Clean after Phase 7 changes |
| `npm run test` | `PASS` | 15/15 (7 files) |
| `npm run worker:check` | `PASS` | Worker TypeScript clean (no Worker changes) |
| `npm run lint` | `PASS` | 0 errors (2 pre-existing warnings, unrelated) |
| `npm run build` | `PASS` | Production build; new `FieldPlacementViewer` chunk lazy-loaded (4.6 kB gzip 1.9 kB) |
| Hasura metadata (Phase 7 `signature_fields` insert/select) | `PASS` | `setup_hasura_metadata.py` exit 0 against dev Hasura |
| Live owner insert+select check on `signature_fields` | `PASS` | One-off script: created document/route/assignee, inserted a field as owner, read it back |
| v15 GitHub Pages deploy | `PASS` (after 1 retry) | Run `28665492942`; build/lint/type-check/test/build all green; first `deploy-pages` attempt hit a transient platform error, `gh run rerun --failed` succeeded |
| v16 GitHub Pages deploy | `NOT_RUN` | Pending commit + push |
| Live wizard walkthrough (create→route→place fields→send→sign) | `NOT_RUN` | Not attempted this session; recommend after v16 deploy |
| Phase 10 Playwright/CI expansion | `NOT_RUN` | Deferred per approved sequence — next after Phase 7 |

## Next Action

1. Commit and push Phase 7 (v16); deploy Pages.
2. Manually or via Playwright, walk through the full wizard (metadata → upload → routing → field placement → send) against the live site, then sign as the assignee to confirm end-to-end.
3. Begin Phase 10 (expand automated test coverage, add Playwright to CI, Worker deploy via CI).
4. Phase 9 admin write endpoints (invite/assign-role/manage-department) remain deferred — no blocker surfaced that requires them before Phase 10.

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

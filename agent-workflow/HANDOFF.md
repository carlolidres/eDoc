# Current Handoff

Last Updated: `2026-07-03`
Version: `v15` (Phase 9 administration reads + multi-user profile bug fix)
Branch: `master`
Commit: `ba717eb` (v15 changes pending commit)
Deployment: `PARTIAL` — Hasura metadata applied (dev); Pages deploy needed for v15 UI

## Current Status

Phase 9 (Administration) started: Admin page now reads real Hasura data (users + roles, roles, departments, document types, security settings) instead of static placeholders, gated to `Organization Administrator`/`Super Administrator` via a Hasura row filter (not UI-only). While verifying live, found and fixed a real multi-user bug: `profiles(limit: 1)` (frontend `CURRENT_PROFILE` and two E2E scripts) returned an arbitrary org peer's profile once the org had 2+ profiles — fixed by filtering on the signed-in user's id everywhere. Live E2E sign flow re-verified 15/15 after the fix.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| Hasura GraphQL | https://xiwmhvwuvondikmiutnn.hasura.ap-southeast-1.nhost.run/v1/graphql |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 9 — administration (users, roles, departments, document types, security settings).`
- Progress: `Read-only admin views wired to Hasura; admin-role gate verified live; profile-lookup bug fixed and re-verified.`
- Remaining: `Admin write endpoints (Worker + role check); Pages deploy for v15; Phase 7 wizard or Phase 10 test/CI expansion.`

## Recently Completed

- `src/pages/AdminPage.tsx` — real data: users + role assignments, roles, departments, document types, security settings (session timeout/MFA); links to Routing templates and Reports; gated behind `useIsOrgAdmin`.
- `src/hooks/useAdminData.ts`, `src/graphql/queries.ts` (ADMIN_* queries) — Phase 9 data hooks.
- `database/scripts/setup_hasura_metadata.py` — `ADMIN_ORG_FILTER` (mirrors the auditor pattern: same `user` Hasura role, row filter checks `user_roles` for an admin role name); new relationships (`roles.organization`, `roles.user_roles`, `departments.organization`, `document_types.organization`/`.category`, `document_categories.organization`, `system_settings.organization`, `user_roles.profile`); `user`-role select permissions on `organizations`, `roles`, `user_roles`, `departments`, `document_types`, `document_categories`, `system_settings`, `security_settings`. Applied to dev Hasura (`PASS: Hasura metadata configured.`).
- **Bug fix (multi-user profile lookup):** `CURRENT_PROFILE` (`src/graphql/queries.ts`, used by `useCurrentProfile`) and the "load current profile" query in `e2e_sign_flow.py` / `e2e_wizard_upload.py` used unfiltered `profiles(limit: 1)`, which is ambiguous once an org has 2+ profiles (returns an arbitrary row, not necessarily the caller's). Now filtered by the caller's Nhost user id (`useAuth().user.id` on the frontend; `--user-id` in the scripts). Also added `useMyRoles`/`useIsOrgAdmin` using the same id-scoped pattern.
- Test fixture — assigned `Organization Administrator` role to the existing dev test profile `carlolidres@gmail.com` (`a69fc4d4-52c4-4066-9b62-0f2587a4ff96`) via `sync_nhost_profile.py --role-id 00000000-0000-4000-8000-000000000052`, to live-verify the admin gate (mirrors the Phase 8 Auditor test user pattern).
- Verification evidence: live GraphQL check confirmed the org-admin profile sees all 4 org roles / 1 department / 1 security_settings row / 1 organization, while the (non-admin) Auditor profile sees only its own role and zero admin-scoped rows. Re-ran `e2e_sign_flow.py` after the fix — 15/15 steps pass.

## Reliability Snapshot

- Acceptance criteria: `COMPLETE` for Phase 8 AUDIT-AC-003 and auditor scope. Phase 9 read views `IN_PROGRESS` (write endpoints not started).
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` (Phase 9 changes pending commit — not requested this session)
- Build/database/runtime status: `BUILD_PASSING`, `HASURA_METADATA_APPLIED` (dev), `WORKER_DEPLOYED` (v14; unchanged this session), `PAGES_DEPLOYED` (v14; v15 UI not yet deployed)
- Last known working state: `npm run test`, `npm run worker:check`, `npm run lint`, `npm run build` pass. Live `e2e_sign_flow.py` 15/15 after the profile-lookup fix.

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Phase 9 admin views are read-only | No in-app user invite, role assignment, or department/document-type creation yet | Add Worker mutation endpoints with admin-role check if in-app management is required; SQL scripts remain the workaround |
| Low | Only synced profiles appear as assignees | Multi-user routing needs more `sync_nhost_profile.py` runs | Sync additional Nhost users |
| Low | Nhost production redirect URLs not confirmed | Reset/verify may fail on Pages | Owner adds URLs per `SETUP.md` |
| Low | Existing audit events lack integrity_hash | Pre-deploy events have null hash | Expected; new Worker events will populate hash |
| Low | Permissions/retention-rules/email-template admin views still placeholders | Not yet backed by Hasura data | Scope as follow-up Phase 9 work |

## Verification

| Check | Status | Result |
|---|---|---|
| `npm run type-check` | `PASS` | Clean after Phase 9 changes |
| `npm run test` | `PASS` | 15/15 (7 files) |
| `npm run worker:check` | `PASS` | Worker TypeScript clean (no Worker changes this session) |
| `npm run lint` | `PASS` | 0 errors (2 pre-existing warnings, unrelated) |
| `npm run build` | `PASS` | Production build |
| Hasura metadata (Phase 9 admin permissions) | `PASS` | `setup_hasura_metadata.py` exit 0 against dev Hasura |
| Live admin-scope check (org-admin profile) | `PASS` | Sees 4 roles, 1 department, 1 security_settings row, 1 organization |
| Live admin-scope check (non-admin Auditor profile) | `PASS` | Sees only its own role; 0 rows on all other admin-scoped tables |
| Live E2E sign flow (`e2e_sign_flow.py`) after profile-lookup fix | `PASS` | 15/15 steps; certificate `6b9b31ea-081e-45e7-b2fb-436b42aa66cb` |
| Worker deploy / GitHub Pages deploy for v15 | `NOT_RUN` | Not requested this session; no Worker code changed, only frontend + Hasura metadata |

## Next Action

1. Deploy Pages (v15) so the live app reflects the new Admin page.
2. Decide whether Phase 9 needs in-app write operations (invite user, assign role, manage departments/document types) via new Worker endpoints, or whether SQL/script-based administration remains sufficient for now.
3. Phase 7 field-placement wizard, or begin Phase 10 (expanded automated test coverage, Playwright in CI, Worker deploy via CI).

Historical evidence: `agent-history/version-1-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

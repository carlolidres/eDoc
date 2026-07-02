# Current Handoff

Last Updated: `2026-07-02`
Version: `v4`
Branch: `master`
Commit: `b4f7cd7`
Deployment: `DEPLOYED`

## Current Status

Phase 3 (Nhost auth and application foundation) committed, pushed, and deployed. Frontend live on GitHub Pages; Worker live on Cloudflare Workers. Baseline status is `FOR_REVIEW`.

## Deployment URLs

| Service | URL |
|---|---|
| GitHub Pages (frontend) | https://carlolidres.github.io/eDoc/ |
| Cloudflare Worker API | https://edoc-worker.carlolidres.workers.dev |
| CI workflow | https://github.com/carlolidres/eDoc/actions/workflows/pages.yml |

## Active Work

- Objective: `Phase 4 — SQLite entity model and Hasura authorization foundation.`
- Progress: `Phase 3 complete and deployed; Worker stub live; R2 binding deferred.`
- Remaining: `Nhost production redirect URLs in dashboard; enable Cloudflare R2; baseline approval; Phase 4 SQLite schema.`

## Recently Completed

- Committed Phase 3 auth foundation (`7d8e6be`) and Worker deploy config (`b4f7cd7`).
- Fixed `.github/workflows/pages.yml` for `master` branch and GitHub Variables build env.
- Set GitHub repository Variables for production Vite build.
- Deployed Cloudflare Worker to `https://edoc-worker.carlolidres.workers.dev` with Nhost JWKS/Hasura secrets.
- Enabled GitHub Pages (Actions source); CI deploy run `28570304508` passed.
- Verified live site loads login UI with Nhost authentication at Pages URL.

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — Phase 3 auth foundation deployed; Phase 4+ not started.
- Instruction conflicts: `NONE`
- Repository status: `CLEAN` — all Phase 3 and deploy changes pushed to `master`.
- Build/database/runtime status: `BUILD_PASSING` — local and CI lint, type-check, test, build pass.
- Last known working state: `GitHub Pages and Worker deployed; Nhost production redirects pending owner action.`

## Minimal Read Set for the Next Agent

| Path | Reason |
|---|---|
| `agent-history/version-0-baseline.md` | Approved requirements (FOR_REVIEW) |
| `database/sqlite/` | Phase 4 entity model starting point |
| `agent-workflow/DATA_MAP.md` | Planned entities and relationships |
| `src/hooks/useGraphQLQuery.ts` | GraphQL query pattern for Phase 5 |
| `worker/src/auth.ts` | JWT verification for privileged routes |

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Baseline status `FOR_REVIEW`, not `APPROVED` | Regulated-scope work should wait for owner approval | Project owner review and approval |
| Medium | `database/sqlite/schema.sql` is still a placeholder | Phase 4+ blocked on entity model | Implement baseline entities in SQLite |
| Medium | Cloudflare R2 not enabled on account | Worker R2 binding commented out in `wrangler.toml` | Enable R2 in dashboard, create `edoc-dev` bucket, restore binding |
| Low | Nhost production redirect URLs not confirmed in dashboard | Password reset/verify may fail on Pages | Add URLs listed in `SETUP.md` |
| Low | Placeholder data in `src/data/placeholderData.ts` | Lists not production-ready | GraphQL after Phase 4 schema |

## Task History and Comments

| Time | Type | Note | Files or checks |
|---|---|---|---|
| `2026-07-02` | `DEPLOY` | GitHub Pages live; Worker deployed; CI run 28570304508 green. | `.github/workflows/pages.yml`, `worker/wrangler.toml` |
| `2026-07-02` | `CHANGE` | Phase 3 auth committed and pushed (`7d8e6be`, `b4f7cd7`). | `src/`, `worker/`, docs |
| `2026-07-02` | `CHANGE` | Fixed Nhost sign-in under React StrictMode via auth listener bridge in `nhost.ts`. | `src/lib/nhost.ts`, `AuthProvider.tsx` |
| `2026-07-01` | `CHANGE` | Initial git init, commit, push to GitHub (93 files). | Repository root |

## Decisions and Simplifications

- Decision: `SQLite-first for application schema; Nhost PostgreSQL only after local validation.`
- Decision: `Worker accepts unverified Bearer token only when NHOST_JWKS_URL is placeholder (local dev).`
- Decision: `Defer R2 binding until Cloudflare R2 enabled on account; Worker deploys without storage.`
- `ponytail:` `GraphQL hooks added without page migration until Phase 4 schema exists.`

## Verification

| Check | Status | Result |
|---|---|---|
| Lint | `PASS` | 0 errors, 2 pre-existing react-refresh warnings |
| Type-check | `PASS` | App and worker |
| Unit tests | `PASS` | 6 tests (includes `authRedirect.test.ts`) |
| Build | `PASS` | Vite production build (local and CI) |
| Worker check | `PASS` | `tsc -p worker/tsconfig.json` |
| Worker deploy | `PASS` | `https://edoc-worker.carlolidres.workers.dev` |
| GitHub Pages deploy | `PASS` | CI run `28570304508`; site loads at Pages URL |
| Live Nhost on Pages | `PARTIAL` | Login UI shows Nhost mode; owner must verify sign-in and add redirect URLs |
| Deployment | `DEPLOYED` | Frontend + Worker stub live |

## SQLite Sync

- Editable SQL changed: `NONE` (application schema still placeholder)
- Workflow app schema: unchanged since v3
- SQLite-first gate: `BASELINE_UPDATED` — entity list documented; SQL implementation pending Phase 4
- Nhost migration status: `AUTH_READY` — frontend/Worker auth wired; Hasura schema not migrated

## Next Action

1. Add Nhost production redirect URLs in dashboard (see `SETUP.md`).
2. Enable Cloudflare R2, create `edoc-dev` bucket, restore R2 binding in `worker/wrangler.toml`, redeploy Worker.
3. Project owner reviews and approves `agent-history/version-0-baseline.md`.
4. Begin Phase 4: baseline entities in `database/sqlite/`, regenerate `sqlite-out/`, Hasura permissions design.

Historical evidence: `agent-history/version-1-handoff.md`, `agent-history/version-1-workflow-app-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

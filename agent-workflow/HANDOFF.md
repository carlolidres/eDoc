# Current Handoff

Last Updated: `2026-07-02`
Version: `v4`
Branch: `master`
Commit: `cca585c` (initial push); Phase 3 auth changes uncommitted
Deployment: `NOT_DEPLOYED`

## Current Status

Phase 3 (Nhost auth and application foundation) implemented. Live Nhost wiring is ready when `.env` contains real subdomain/region values. Local development fallback remains when Nhost is not configured. Baseline status is `FOR_REVIEW`.

## Active Work

- Objective: `Phase 4 — SQLite entity model and Hasura authorization foundation.`
- Progress: `Phase 3 complete — auth flows, GraphQL hooks, Worker JWT verification, SETUP.md.`
- Remaining: `Project owner baseline approval; Phase 4 SQLite schema; Hasura metadata; replace placeholder lists.`

## Recently Completed

- Phase 3: password reset/change routes, email verification banner, `useGraphQLClient`/`useGraphQLQuery`, Worker JWKS JWT verification.
- Extended `SETUP.md` with Nhost redirect URL and env mapping guidance.
- Initial git commit and push to `https://github.com/carlolidres/eDoc.git` (93 files, `cca585c`).

## Reliability Snapshot

- Acceptance criteria: `PARTIAL` — Phase 3 auth foundation complete; Phase 4+ not started.
- Instruction conflicts: `NONE`
- Repository status: `DIRTY` — Phase 3 code and workflow doc updates uncommitted.
- Build/database/runtime status: `BUILD_PASSING` — lint (2 pre-existing warnings), type-check, test, build, worker:check pass.
- Last known working state: `Local auth E2E passes; live Nhost requires owner `.env` credentials.`

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
| Low | Live Nhost manual walkthrough not run in agent session | Owner must verify sign-in/reset/verify with real creds | Part 2 sign-in verified; continue Parts 3–5 |
| Low | Placeholder data in `src/data/placeholderData.ts` | Lists not production-ready | GraphQL after Phase 4 schema |

## Task History and Comments

| Time | Type | Note | Files or checks |
|---|---|---|---|
| `2026-07-02` | `CHANGE` | Fixed Nhost sign-in under React StrictMode via auth listener bridge in `nhost.ts`. | `src/lib/nhost.ts`, `AuthProvider.tsx` |
| `2026-07-02` | `CHANGE` | Part 0 env check: fixed Hasura URL placeholder; added `.dev.vars`. | `.env`, `.dev.vars`, `.env.example` |
| `2026-07-01` | `CHANGE` | Populated baseline and agent workflow docs from `reference/starter.md`. | `agent-history/version-0-baseline.md`, `agent-workflow/*` |
| `2026-07-01` | `CHANGE` | Initial git init, commit, push to GitHub (93 files). | Repository root |

## Decisions and Simplifications

- Decision: `SQLite-first for application schema; Nhost PostgreSQL only after local validation.`
- Decision: `Worker accepts unverified Bearer token only when NHOST_JWKS_URL is placeholder (local dev).`
- `ponytail:` `GraphQL hooks added without page migration until Phase 4 schema exists.`

## Verification

| Check | Status | Result |
|---|---|---|
| Lint | `PASS` | 0 errors, 2 pre-existing react-refresh warnings |
| Type-check | `PASS` | App and worker |
| Unit tests | `PASS` | 6 tests (includes `authRedirect.test.ts`) |
| Build | `PASS` | Vite production build |
| Worker check | `PASS` | `tsc -p worker/tsconfig.json` |
| Live Nhost manual | `PARTIAL` | Sign-in verified with live credentials; reset/verify banner pending |
| Deployment | `NOT_RUN` | Not requested |

## SQLite Sync

- Editable SQL changed: `NONE` (application schema still placeholder)
- Workflow app schema: unchanged since v3
- SQLite-first gate: `BASELINE_UPDATED` — entity list documented; SQL implementation pending Phase 4
- Nhost migration status: `AUTH_READY` — frontend/Worker auth wired; Hasura schema not migrated

## Next Action

1. Project owner reviews and approves `agent-history/version-0-baseline.md`.
2. Fill `.env` / `.dev.vars` with Nhost dev credentials and run manual auth walkthrough per `SETUP.md`.
3. Begin Phase 4: baseline entities in `database/sqlite/`, regenerate `sqlite-out/`, Hasura permissions design.

Historical evidence: `agent-history/version-1-handoff.md`, `agent-history/version-1-workflow-app-handoff.md`

Keep this file concise. Do not copy full logs, diffs, or historical narratives here.

# Current Handoff

Last Updated: `2026-06-27`
Version: `v3`
Branch: `[BRANCH]`
Commit: `NOT_COMMITTED`
Deployment: `NOT_DEPLOYED`

## Current Status

Workflow app v3 simplifies navigation and adds Project Brief → AI requirements → baseline → feedback → debugging → handoff flow. Preserves SQLite records, baseline snapshots, audit trail, preview inspector, and stdlib-only stack.

## Active Work

- Objective: `Simplify workflow app UX around Project Brief → AI requirements → Baseline → Feedback → Debugging → Handoff.`
- Progress: `Phases 1–6 implemented in workflow-app/ (nav, dashboard, brief, baseline UX, tasks/history merge, styling).`
- Remaining: `Manual browser walkthrough; legacy .doc/.xls extraction is best-effort only.`

## Recently Completed

- Simplified nav to 8 items; merged Generated Tasks and Project History tabs; legacy stages under History.
- Added Project Brief with autosave, reference attachments, AI structuring, and load-into-baseline.
- Enhanced dashboard with Continue Workflow, recommended action, and recent activity.
- Baseline: expanded fields, Submit/Update Baseline with change summary, versioned markdown files.
- Phase-specific AI prompts for UI/UX and debugging; task export to `agent-workflow/tasks/`.
- Schema: `project_briefs`, `reference_attachments`, `baseline_snapshots.change_summary`.

## Reliability Snapshot

- Acceptance criteria: `SATISFIED` - `Local app, SQLite initialization, forms, approvals, version history, audit trail, rollback support, config, and README/docs updates implemented.`
- Instruction conflicts: `NONE`
- Repository status: `NOT_A_GIT_REPO` - `git status reports this folder is not a Git repository.`
- Build/database/runtime status: `READY` - `Schema validation, smoke test, and local HTTP GET checks passed.`
- Last known working state: `Workflow app served / and /api/config successfully on 127.0.0.1:8765.`

## Minimal Read Set for the Next Agent

List no more than five task-specific files; omit standard startup files.

| Path | Reason |
|---|---|
| `workflow-app/server.py` | Local API, SQLite access, handoff/AI/settings/preview endpoints, and baseline writes |
| `workflow-app/database/schema.sql` | Workflow app SQLite source of truth (incl. handoff tables) |
| `workflow-app/static/app.js` | Workflow UI behavior (all phases, composer, queue, settings) |
| `workflow-app/static/inspector.js` | Injected preview element-selector contract |
| `workflow-app/scripts/smoke_test.py` | End-to-end workflow + handoff data check |

## Known Issues

| Severity | Issue | Impact | Next action |
|---|---|---|---|
| Medium | Automated checks (`validate_schema.py`, `smoke_test.py`) were NOT_RUN this session because the execution shell returned no exit status for every command. | Code is unverified by execution; review-only. | Run both scripts and a manual browser walkthrough on a working shell before relying on v2. |
| Low | Preview proxy uses `<base href>`, so complex SPA client routing / absolute API calls may not navigate cleanly inside the inspection iframe. | Some targets need the route bar or new-tab preview. | Use the route input or "Open in new tab"; consider full subresource proxy only if required. |
| Low | Console/network auto-capture runs only inside the proxied iframe (best-effort). | Some runtime errors may not be captured automatically. | Paste console/network details manually when needed. |
| Low | The preview proxy serves the target page same-origin, so the target's scripts execute in the workflow app origin. | Trust boundary: only point the preview at your own trusted local app. The proxy also restricts requests to the configured target origin. | Document the trust requirement; add iframe sandboxing only if untrusted targets must be supported. |
| Low | No authentication in workflow app. | Local users identify themselves by submitter text only. | Add authentication only if local trust boundary changes. |
| Low | Supabase sync is intentionally not implemented. | Workflow data remains local SQLite only. | Create a separate SQLite-validated Supabase mapping plan when needed. |

## Task History and Comments

Record only decisions, errors, failed attempts, recovery notes, and comments that affect future work.

| Time | Type | Note | Files or checks |
|---|---|---|---|
| `2026-06-22` | `DECISION` | Implemented workflow app with Python stdlib and SQLite to avoid dependency installation after template copy. | `workflow-app/` |
| `2026-06-22` | `CHANGE` | Baseline approval writes `agent-history/version-0-baseline.md` with backups and audit events. | `workflow-app/server.py` |
| `2026-06-25` | `DECISION` | v2 feedback/bug submissions modeled as new `handoff_entries` tables (not `workflow_records`) to keep their distinct status lifecycle and avoid changing existing CHECK constraints/immutability triggers. | `workflow-app/database/schema.sql` |
| `2026-06-25` | `DECISION` | Phase 2 selector uses a same-origin `<base>` HTML proxy + injected `inspector.js`; OpenAI improve runs through stdlib `urllib`. Kept zero runtime dependencies per Ponytail. | `workflow-app/server.py`, `workflow-app/static/inspector.js` |
| `2026-06-27` | `CHANGE` | Stdlib extraction for `.docx`, `.xlsx`, `.pdf`, and plain text brief attachments; restart required for `/api/brief` on port 8765. | `workflow-app/server.py`, `workflow-app/scripts/smoke_test.py` |

## Decisions and Simplifications

- Decision: `Use Python standard library HTTP server plus SQLite for reusable local workflow app.`
- `ponytail:` `No external dependencies in v1; add a framework only if local workflow complexity exceeds the simple API/static UI.`

## Context Refresh

| Checkpoint | Files changed | Verification status | Open assumptions | Remaining work |
|---|---|---|---|---|
| `Workflow app v1` | `workflow-app/, README.md, AGENTS.md, CODEMAP.md, DATA_MAP.md, HANDOFF.md, .gitignore` | `Schema, smoke, and HTTP checks passed` | `Local text submitter is acceptable for v1` | `Manual user walkthrough` |

## Dumb-Zone Recovery

- Status: `NOT_TRIGGERED`
- Trigger: `NONE`
- Repair attempts: `2 smoke-test assertion/setup fixes, both resolved`
- Original objective: `Implement reusable local workflow app`
- Changes already made: `Complete v1 app and docs`
- Errors encountered: `Smoke test initially used paths outside app contract, then checked unresolved baseline path`
- Confirmed findings: `Relative in-app paths work; schema and smoke flows pass`
- Unverified assumptions: `User accepts no-auth local submitter model for v1`
- Files affected: `workflow-app/, workflow docs, README.md, .gitignore`
- Recommended next action: `Project owner manual walkthrough`
- Approval needed: `NO`

## Verification

| Check | Status | Result |
|---|---|---|
| Lint | `N/A` | `No linter configured for stdlib Python/vanilla JS template.` |
| Type-check | `N/A` | `No type checker configured.` |
| Tests/self-check | `PASS` | `python workflow-app/scripts/validate_schema.py` and `python workflow-app/scripts/smoke_test.py` passed 2026-06-27.` |
| Build | `N/A` | `Python stdlib app; no build step required.` |
| Smoke/manual | `NOT_RUN` | `Manual browser walkthrough not run this session.` |
| Deployment | `NOT_RUN` | `Not requested.` |

Never mark a task complete without supporting validation results. Record unavailable checks as `NOT_RUN` with a reason.

## SQLite Sync

- Editable SQL changed: `workflow-app/database/schema.sql` (added `handoff_entries`, `selected_elements`, `attachments`)
- Migration: `ADDITIVE` - `New tables via CREATE TABLE IF NOT EXISTS; existing tables unchanged. Local runtime DBs are gitignored and re-initialized on startup.`
- Generated map: `NOT_REQUIRED`
- Map command/result: `N/A; intended validation is python workflow-app/scripts/validate_schema.py (NOT_RUN this session, shell unavailable)`
- SQLite-first gate: `SCHEMA_UPDATED_PENDING_VALIDATION`
- SQLite relationship validation: `NOT_RUN` - `validate_schema.py updated to cover new tables + FK enforcement but could not be executed this session.`
- Supabase migration status: `NOT_STARTED`; no Supabase migration created in v1.
- Applied to: `Local template only`
- Rollback: `Remove workflow-app/ additions and restore previous docs from backup/VCS when available.`

## Next Action

`Run python workflow-app/server.py and walk through Project Brief → AI structure → baseline approval → UI/UX feedback → debugging → task export.`

Historical evidence: `agent-history/version-[X]-handoff.md`

Keep this file concise. Do not copy full logs, diffs, generated maps, or historical narratives here.

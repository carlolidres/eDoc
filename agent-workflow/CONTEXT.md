# Project Context

Last Updated: `2026-07-02`

## Identity

- Project: `eDoc`
- Repository: `https://github.com/carlolidres/eDoc.git`
- Owner: `Carlo Mauring Lidres`
- Type: `NEW_APPLICATION` (incremental transformation of existing scaffold)
- Environment: `LOCAL` (development); production targets GitHub Pages + Nhost + Cloudflare

## Purpose

Secure, online electronic document routing, review, approval, acknowledgment, and electronic-signature application deployed as a static SaaS-style web app.

## Users and Workflow

- Users: Organization members with role-based permissions (administrators, document controllers, owners, reviewers, approvers, signers, viewers, auditors)
- Workflow: `Draft → Preparing → Ready for Routing → In Routing → Review/Approve/Sign/Acknowledge → Completed | Returned | Rejected | Archived`

## Technology

- Frontend: React + Vite + TypeScript, HashRouter, TanStack Query, reference-aligned UI (not pure Ant Design)
- Backend: Cloudflare Workers (Hono) for privileged ops; Nhost serverless functions where appropriate
- Database: SQLite first in `database/sqlite/`; PostgreSQL via Nhost + Hasura GraphQL after local validation
- Authentication: Nhost (15-minute inactivity default, MFA-ready structure)
- Hosting: GitHub Pages (frontend), Cloudflare Workers + R2 (backend/storage)
- UI: Visual language from local `reference/src`; functional patterns from local Documenso reference only

## Reference Folders (local; not in git)

| Reference | Path | Use |
|---|---|---|
| UI / layout | `reference/src` | Primary visual reference—shell, nav, components, styling |
| Functional | `reference/documenso-main/documenso-main` | Workflow, signing, PDF, audit concepts—adapt, do not copy wholesale |

Do not modify reference folders. Source requirements: `reference/starter.md`.

## Current Priorities

1. Formal baseline review and approval (`agent-history/version-0-baseline.md`) — status `FOR_REVIEW`
2. Phase 4: SQLite entity model in `database/sqlite/`, regenerate `sqlite-out/`, Hasura permissions design
3. Project owner: Nhost production redirect URLs and Cloudflare R2 bucket `edoc-dev` (see `SETUP.md`)

**Completed:** Phase 3 — Nhost auth, protected routes, session timeout, GraphQL hooks, Worker JWT auth (deployed).

## Critical Constraints

- Authorization at database, Hasura, Worker, and frontend layers—not UI-only hiding
- R2 private; temporary URLs only; no secrets in frontend (`VITE_` public config only)
- SQLite-first schema gate before PostgreSQL/Nhost migration
- Incremental delivery; app runnable after each phase; no wholesale Documenso replacement
- Do not claim automatic GxP/regulatory compliance

## Sources of Truth

| Area | Source |
|---|---|
| Agent routing | `AGENTS.md` |
| Simplicity rule | `agent-workflow/PONYTAIL.md` |
| Current status | `agent-workflow/HANDOFF.md` |
| Active work | `agent-workflow/PLAN.md` |
| Approved requirements | `agent-history/version-0-baseline.md` |
| Starter requirements | `reference/starter.md` (local) |
| Editable SQLite schema | `database/sqlite/` |
| Generated schema map | `sqlite-out/` |
| Human data map | `agent-workflow/DATA_MAP.md` |
| Architecture | `ARCHITECTURE.md` |
| Deployment | `DEPLOYMENT.md` |

`database/sqlite/` is authoritative for initial application schema design. `sqlite-out/` is generated and read-only. PostgreSQL/Nhost migrations must follow validated SQLite design documented in `DATA_MAP.md`.

Keep this file limited to stable identity, stack, priorities, and constraints. Put implementation, schema, task, and history details in their dedicated files.

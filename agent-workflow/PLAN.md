# Active Plan — eDoc Application Implementation

Last Updated: `2026-07-01`
Plan Owner: `AI Agent / Project owner`
Status: `IN_PROGRESS`

## Objective

Implement eDoc incrementally per `reference/starter.md` and `agent-history/version-0-baseline.md`: secure document routing, review, approval, acknowledgment, and electronic signatures on GitHub Pages + Nhost + Cloudflare Workers + R2, with UI aligned to `reference/src`.

## Task Restatement and Acceptance

- Objective restated: Transform the existing scaffold into a production-ready document-signing platform without replacing the project wholesale or copying Documenso unchanged.
- Acceptance criteria source: `reference/starter.md`, `agent-history/version-0-baseline.md`
- Essential context status: `READY` (baseline and workflow docs synced 2026-07-01)
- Instruction conflicts: `NONE`

## Approval and GxP Gate

- GxP impact: `INDIRECT` (audit trail, signatures, authorization—design for traceability; no automatic compliance claims)
- Approved task plan: `agent-history/version-0-baseline.md` (`FOR_REVIEW`)
- Approval status: `PENDING_PROJECT_OWNER`

## Ponytail Simplicity Gate

Chosen rung: `REUSE` — extend existing React scaffold, Worker stub, workflow app, and documentation; add dependencies only when required by baseline (PDF, signing, drag-and-drop).

## Current State Summary

| Area | Current implementation | Gap vs baseline |
|---|---|---|
| Docs & analysis | `REFERENCE_ANALYSIS.md`, `IMPLEMENTATION_PLAN.md`, `ARCHITECTURE.md`, etc. | Keep synced as implementation progresses |
| UI shell | `AppShell`, pages, navigation, theme hook | Match reference UI more closely; replace placeholder data |
| Auth | Live Nhost + local fallback, reset/change password, email verification banner, `ProtectedRoute`, 15-min timeout | Invitations, profile page, auth audit events |
| Data | Placeholder lists; `useGraphQLQuery` hook ready | Hasura GraphQL queries with permissions |
| Database | SQLite placeholder; `0001_initial.sql` draft | Full entity model from baseline in SQLite first |
| Worker | Hono routes + JWKS JWT verification in `worker/src/auth.ts` | R2 presign, hash, sign, advance, certificate endpoints |
| Storage | Not connected | Private R2 with org-scoped paths |
| Signing | Page scaffold only | PDF viewer, fields, re-auth signing flow |
| Workflow app | v3 complete (brief → baseline → handoff) | Use for baseline approval and agent handoffs |

## Implementation Phases

### Phase 1: Inspection and analysis — `COMPLETE`

- Inspect active project, UI reference, Documenso reference
- Create analysis and architecture docs
- Package decisions documented in `IMPLEMENTATION_PLAN.md`

### Phase 2: UI foundation — `PARTIAL`

- App shell and side navigation from reference visual language
- Shared `EmptyState`, `StatusBadge`, global styles
- **Remaining:** closer reference parity, responsive drawer, shared table/form/modal patterns

### Phase 3: Authentication and application foundation — `COMPLETE`

- Configure Nhost project and env examples (`SETUP.md`, `.env.example`)
- Wire live auth; forgot/reset/change password flows; email verification banner
- Route guards without auth flash; session timeout
- TanStack Query + GraphQL client hooks; global query error logging

**Files:** `src/features/auth/*`, `src/pages/LoginPage.tsx`, `ChangePasswordPage.tsx`, `VerifyEmailPage.tsx`, `src/hooks/useGraphQL*.ts`, `worker/src/auth.ts`

### Phase 4: Database and authorization — `NEXT`

- Model baseline entities in `database/sqlite/`
- Regenerate `sqlite-out/`; validate constraints and FKs
- PostgreSQL migration + Hasura metadata and permissions
- Organization isolation; seed test org/users

**Files:** `database/sqlite/*`, `database/migrations/*`, `DATA_MAP.md`

### Phase 5: Documents and storage — `NOT_STARTED`

- Document lists with authorized GraphQL
- Creation wizard persistence (steps 1–2: metadata + upload)
- R2 presigned upload/complete; versioning and hashes
- Secure preview/download via Worker

### Phase 6: Routing — `NOT_STARTED`

- Recipients, steps, templates; sequential/parallel/mixed logic
- Inbox assignments; due dates, reminders, escalation, delegation
- Route advancement via Worker transaction

### Phase 7: PDF preparation and signing — `NOT_STARTED`

- PDF.js viewer; normalized field placement (pdf-lib)
- Signing workspace actions; re-authentication
- Immutable signed PDF generation and signature events

### Phase 8: Completion and audit — `NOT_STARTED`

- Completion certificates and verification endpoint
- Append-only audit trail UI and reports

### Phase 9: Administration — `NOT_STARTED`

- Users, roles, permissions, departments, templates, settings

### Phase 10: Testing and deployment — `NOT_STARTED`

- Unit, integration, Playwright suites per baseline
- GitHub Actions: lint, typecheck, test, Pages deploy
- Worker Wrangler deployment; documentation verification

## Expected Files (near term)

| Path | Expected change |
|---|---|
| `agent-history/version-0-baseline.md` | Synced from starter.md (`FOR_REVIEW`) |
| `agent-workflow/CONTEXT.md`, `HANDOFF.md`, `CODEMAP.md`, `DATA_MAP.md` | Synced with baseline |
| `database/sqlite/schema.sql` | Replace placeholder with application entities |
| `src/lib/nhost.ts`, `src/features/auth/*` | Live Nhost integration |
| `worker/src/index.ts` | Auth middleware + first R2 presign endpoint |

## Verification Plan

- [x] `npm run lint` and `npm run build`
- [x] `npm run test` (unit)
- [ ] `python workflow-app/scripts/validate_schema.py` (when app schema changes)
- [ ] Manual auth + protected route walkthrough (live Nhost)
- [ ] Baseline formally approved by project owner

## Risks and Blockers

| Risk | Mitigation |
|---|---|
| Baseline not yet formally approved | Mark `FOR_REVIEW`; proceed only with owner acknowledgment |
| Reference folders local-only | Document paths in baseline; agents need local copies |
| SQLite schema still placeholder | Phase 4 blocked until entities modeled |
| Nhost/Cloudflare credentials not configured | Use `.env.example`; document setup in `SETUP.md` |

## Out of Scope (this plan)

- Modifying `reference/` folders
- Importing Documenso as a dependency
- Supabase migration before SQLite validation
- Automatic regulatory compliance claims

## Next Action

Project owner reviews updated baseline. Fill Nhost credentials per `SETUP.md`. Then begin **Phase 4** (SQLite entity model and Hasura authorization).

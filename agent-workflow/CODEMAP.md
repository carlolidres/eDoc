# Code Map

Last Updated: `2026-07-01`

## Purpose

Use this map to locate implementation areas without scanning the repository. List only high-value paths that agents regularly need.

Do not duplicate database schema details here. Database work belongs in `DATA_MAP.md`, `database/sqlite/`, and `sqlite-out/`.

## Application Entry Points

| Path | Responsibility |
|---|---|
| `src/main.tsx` | React DOM bootstrap |
| `src/app/App.tsx` | HashRouter, routes, auth and theme providers |
| `index.html` | Vite HTML entry |
| `worker/src/index.ts` | Cloudflare Worker API (Hono); privileged backend operations |
| `worker/src/auth.ts` | JWKS JWT verification for Worker routes |
| `workflow-app/server.py` | Local workflow app HTTP server, SQLite, baseline/handoff APIs |

## Pages and Major Modules

| Module | Path | Responsibility |
|---|---|---|
| Dashboard | `src/pages/DashboardPage.tsx` | KPI cards, awaiting action, activity (placeholder → GraphQL) |
| Inbox | `src/pages/InboxPage.tsx` | Assigned review/approve/sign/ack tasks |
| Documents | `src/pages/DocumentsPage.tsx` | Document lists, filters, status views |
| Create document | `src/pages/CreateDocumentPage.tsx` | 5-step creation wizard: metadata, upload, routing, PDF field placement, review and send |
| Routing templates | `src/pages/RoutingTemplatesPage.tsx` | Reusable route templates |
| Signing workspace | `src/pages/SigningWorkspacePage.tsx` | PDF viewer, fields, route actions |
| PDF viewer | `src/components/pdf/PdfViewer.tsx` | Lazy PDF.js rendering with zoom and thumbnails |
| Field placement viewer | `src/components/pdf/FieldPlacementViewer.tsx` | Lazy PDF.js rendering with drag-to-draw signature-field overlay (creation wizard step) |
| Sign dialog | `src/components/signing/SignDialog.tsx` | Re-auth, consent, typed signature |
| Reports | `src/pages/ReportsPage.tsx` | Reporting and export scaffold |
| Admin | `src/pages/AdminPage.tsx` | Users/roles/departments/document types/security settings (Hasura-scoped to admin role); links to routing templates and reports |
| Auth pages | `src/pages/LoginPage.tsx`, `ResetPasswordPage.tsx`, `ChangePasswordPage.tsx`, `VerifyEmailPage.tsx` | Sign-in, password reset/change, email verification |
| Workflow app UI | `workflow-app/static/app.js` | Brief, baseline, feedback, debugging, handoff queue |

## Shared Components

| Path | Responsibility |
|---|---|
| `src/components/layout/AppShell.tsx` | Sidebar, header, collapse, mobile nav (reference-aligned) |
| `src/components/ui/EmptyState.tsx` | Empty list/state presentation |
| `src/components/ui/StatusBadge.tsx` | Document/route status badges |
| `workflow-app/static/inspector.js` | Preview element selector for UI/UX feedback |

## Services and Data Access

| Path | Responsibility |
|---|---|
| `src/lib/nhost.ts` | Nhost client configuration |
| `src/lib/graphql.ts` | Hasura GraphQL client factory |
| `src/lib/authRedirect.ts` | HashRouter redirect URLs for Nhost auth callbacks |
| `src/lib/workerApi.ts` | Authenticated Worker API calls |
| `src/lib/env.ts` | Public `VITE_` environment validation |
| `src/features/auth/AuthProvider.tsx` | Auth context, session, inactivity timeout, verification email |
| `src/features/auth/ProtectedRoute.tsx` | Route guard without auth flash |
| `src/data/placeholderData.ts` | Temporary mock lists (replace with GraphQL) |
| `workflow-app/database/schema.sql` | Workflow app SQLite schema |

## State, Hooks, Utilities, and Types

| Path | Responsibility |
|---|---|
| `src/hooks/useTheme.tsx` | Light/dark theme toggle |
| `src/hooks/useGraphQLClient.ts` | GraphQL client bound to auth access token |
| `src/hooks/useGraphQLQuery.ts` | TanStack Query wrapper for GraphQL requests |
| `src/hooks/useAdminData.ts` | Phase 9 admin reads (users/roles/departments/document types/security settings) and `useIsOrgAdmin` gate |
| `src/hooks/useCurrentProfile.ts` | Current user's own profile, filtered by Nhost user id (not an unfiltered `limit: 1`) |
| `src/utils/routingRules.ts` | Sequential/parallel routing logic |
| `src/utils/fileValidation.ts` | Upload MIME, size, hash validation |
| `src/types/domain.ts` | Shared domain types |
| `src/config/navigation.ts` | Sidebar nav items and routes |

## Configuration

| Path | Responsibility |
|---|---|
| `vite.config.ts` | Vite build; GitHub Pages base path |
| `worker/wrangler.toml` | Worker deployment and bindings |
| `.env.example` | Frontend public env template |
| `.dev.vars.example` | Worker local secrets template |
| `workflow-app/config.example.json` | Workflow app path configuration |
| `eslint.config.js`, `playwright.config.ts` | Lint and E2E configuration |

## Tests

| Path | Responsibility |
|---|---|
| `src/utils/routingRules.test.ts` | Routing rule unit tests |
| `src/utils/fileValidation.test.ts` | File validation unit tests |
| `src/types/domain.test.ts` | Field-type-per-route-action mapping unit tests |
| `tests/e2e/app.spec.ts` | Playwright smoke test (local-fallback auth, no credentials needed); runs in CI (`.github/workflows/pages.yml` `e2e` job) |
| `tests/e2e/login-nav-fix.spec.ts`, `tests/e2e/phase8-live.spec.ts` | Playwright live-Nhost regression checks; self-skip without `E2E_EMAIL`/`E2E_PASSWORD` — not run in CI (would need live test-user secrets) |
| `database/scripts/e2e_wizard_upload.py`, `database/scripts/e2e_sign_flow.py` | Live smoke scripts against deployed Worker/Hasura (manual, need `.dev.vars`/`.env` credentials) |
| `workflow-app/scripts/validate_schema.py` | Workflow SQLite schema validation |
| `workflow-app/scripts/smoke_test.py` | Workflow app end-to-end smoke test |

## Reference Folders (local; do not edit)

| Path | Use |
|---|---|
| `reference/src` | Primary UI/layout reference |
| `reference/documenso-main/documenso-main` | Functional/signing workflow reference |
| `reference/starter.md` | Authoritative starter requirements |

## Editing Guidance

- Add new pages under: `src/pages/`
- Add reusable UI under: `src/components/ui/` or `src/components/layout/`
- Add feature logic under: `src/features/<feature>/`
- Add Worker routes/services under: `worker/src/`
- Add editable application schema under: `database/sqlite/`
- Add workflow app schema under: `workflow-app/database/schema.sql`
- Do not manually edit: `sqlite-out/`, `reference/`
- Add tests beside utilities or under: `tests/`

## Important Boundaries

- Presentation components must not bypass GraphQL/Worker APIs for privileged operations.
- Protected routes must use `ProtectedRoute` and server-side permission checks.
- Permission checks must be enforced in Hasura, Worker, and UI layers.
- Browser code must not hold R2 keys, admin secrets, or email API keys.
- Reuse existing scaffold before adding abstractions or dependencies.
- Update this map when important paths are added, moved, or renamed.

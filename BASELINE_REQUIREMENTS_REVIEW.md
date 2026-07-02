# Baseline Requirements Review — eDoc

**Review date:** 2026-07-01  
**Reviewer role:** Senior BA / Solution Architect / Security & Quality Review  
**Baseline source:** `agent-history/version-0-baseline.md` (`FOR_REVIEW`), `reference/starter.md`, supporting project docs  
**Implementation snapshot:** Commit `cca585c` + uncommitted workflow doc updates; Phases 1–2 partial, Phases 3–10 not started  
**Reference folders:** `reference/src` and `reference/documenso-main/` are gitignored and were **not accessible** in this review workspace; analysis relies on `REFERENCE_ANALYSIS.md`, `reference/starter.md`, and prior inspection notes.

---

## Executive Summary

The eDoc baseline defines a **broad, credible scope** for a DocuSign-style document routing and electronic-signature platform on GitHub Pages + Nhost + Hasura + Cloudflare Workers + R2. Functional modules, roles, workflow stages, data entities, security principles, and phased delivery are documented at a **product-requirements level**.

However, the baseline is **not ready for regulated or production implementation** without project-owner approval and resolution of **critical conflicts**, especially:

1. **Database strategy conflict** — This review mandate requires **PostgreSQL-first** schema under `database/postgresql/` with local PostgreSQL validation. The approved baseline, `AGENTS.md`, `CONTEXT.md`, `DATA_MAP.md`, and `HANDOFF.md` require **SQLite-first** design under `database/sqlite/` before Nhost migration.
2. **Internal baseline contradictions** — Session timeout (15 vs 60 minutes), document status naming (`awaiting_action` vs `awaiting_my_action`), and contradictory wording (“PostgreSQL-first” stored in `database/sqlite/`).
3. **Missing operational decisions** — File size limits, re-authentication method, rejection/return semantics, email provider, malware scanning, retention periods, multi-tenant model details, and public verification scope are undefined or placeholder-level.
4. **Implementation gap** — Application schema is a placeholder; Worker endpoints are stubs without JWT verification, R2 presign, or transactional route logic; UI uses placeholder data; Hasura metadata absent.

**Recommendation:** **NO-GO** for Phase 3+ feature implementation until the project owner approves a revised baseline that resolves conflicts, records explicit decisions, and aligns the database path with the chosen PostgreSQL-first strategy.

---

## Overall Baseline Assessment

| Dimension | Rating | Notes |
|---|---|---|
| Completeness | **Medium** | Modules and entities listed comprehensively; many behavioral rules underspecified |
| Clarity | **Medium-Low** | Duplication across starter/baseline/docs; several ambiguous or conflicting statements |
| Feasibility | **High** (architecture) | Target stack is viable with Workers/Nhost for privileged ops |
| Security design | **Medium** | Principles sound; missing enforceable specs (CSP, rate limits, JWT validation, idempotency) |
| Data model | **Medium-Low** | Entity inventory strong; draft SQL covers ~40% of entities; constraints incomplete |
| Workflow logic | **Medium-Low** | High-level rules present; state machines and exception paths not fully defined |
| E-signature controls | **Medium** | Strong intent in starter/baseline; missing rollback, duplicate-submit, and method decisions |
| Audit trail | **Medium** | Field list defined; event catalog, immutability enforcement, and retention mechanics incomplete |
| UI/UX | **Medium-Low** | Navigation scaffold exists; reference UI not verifiable here; page-level acceptance criteria sparse |
| Non-functional | **Low-Medium** | Mostly qualitative; few measurable SLOs |

---

## Strengths

1. **Clear product vision** — Document routing, review, approval, acknowledgment, signing, audit, and admin are scoped coherently.
2. **Architecture fit** — Static SPA + Nhost auth + Hasura + Worker/R2 correctly separates trust boundaries.
3. **Security posture (intent)** — Four-layer authorization, private R2, no secrets in frontend, re-auth for signing, append-only audit.
4. **Workflow fundamentals** — Sequential/parallel/mixed routing, version immutability, SHA-256 hashing, delegation, and override-with-audit are stated.
5. **Entity inventory** — Baseline lists ~40 application tables across org, documents, routing, signatures, collaboration, compliance.
6. **Phased delivery** — Ten phases with incremental runnable milestones reduce delivery risk.
7. **Reference discipline** — Documenso as functional reference only (AGPL noted); UI reference as visual source of truth; no wholesale copy mandate.
8. **Existing scaffold** — React shell, navigation, auth provider pattern, Worker route skeleton, routing utility tests provide a starting point.

---

## Critical Gaps

| ID | Severity | Gap |
|---|---|---|
| GAP-001 | **Critical** | Database authority conflict: PostgreSQL-first (`database/postgresql/`) vs SQLite-first (`database/sqlite/`) across baseline, AGENTS.md, and this review mandate |
| GAP-002 | **Critical** | Baseline status `FOR_REVIEW` — not formally approved by project owner |
| GAP-003 | **Critical** | Application schema not implemented (`database/sqlite/schema.sql` placeholder; `0001_initial.sql` partial draft only) |
| GAP-004 | **Critical** | Electronic signature workflow undefined at transaction level (rollback, idempotency, duplicate submission, failure paths) |
| GAP-005 | **Critical** | Hasura permissions and organization isolation — no metadata, no RLS/permission rules in repo |
| GAP-006 | **Critical** | Worker `requireAuth` checks Bearer presence only — does not validate JWT against Nhost JWKS (security scaffold gap) |
| GAP-007 | **Critical** | Re-authentication method undecided (password vs OTP vs MFA); blocks signing acceptance criteria |
| GAP-008 | **Critical** | Rejection vs return-for-revision behavior not fully specified (terminate route vs revision cycle triggers) |

---

## Major Gaps

| ID | Severity | Gap |
|---|---|---|
| GAP-009 | **High** | Session timeout conflict: 15 minutes (roles/auth modules) vs 60 minutes (security section) |
| GAP-010 | **High** | Document status enum conflict: `awaiting_action` (baseline) vs `awaiting_my_action` (code, migration draft) |
| GAP-011 | **High** | Multi-tenancy model underspecified (single org per deployment vs multi-org SaaS; cross-org user membership) |
| GAP-012 | **High** | Maximum file size, supported MIME types beyond PDF attachments, malware scanning scope not defined |
| GAP-013 | **High** | Email/notification provider, templates, and delivery guarantees not decided |
| GAP-014 | **High** | Rate limiting thresholds for signing, upload, auth endpoints not specified |
| GAP-015 | **High** | Data retention and audit retention periods not quantified |
| GAP-016 | **High** | ~25 baseline entities missing from `0001_initial.sql` (comments, notifications, templates, certificates, delegations, etc.) |
| GAP-017 | **High** | Route-step state machine incomplete (skipped, invalidated, delegated transitions; mixed-mode parallel groups) |
| GAP-018 | **High** | Completion certificate verification page scope (public vs authenticated) undecided |
| GAP-019 | **High** | No CSP, CSRF, or dependency security requirements in baseline |
| GAP-020 | **High** | UI reference folder inaccessible in repo — visual parity criteria cannot be verified in CI |

---

## Minor Gaps

| ID | Severity | Gap |
|---|---|---|
| GAP-021 | **Medium** | Dashboard KPI calculation formulas undefined |
| GAP-022 | **Medium** | Saved views and column selection behavior not specified |
| GAP-023 | **Medium** | Time zone handling for due dates and audit timestamps not defined |
| GAP-024 | **Medium** | Optimistic locking (`lock_version`) mentioned in draft SQL but not in workflow rules |
| GAP-025 | **Medium** | External signing links (Documenso pattern) explicitly out of scope but not documented as exclusion |
| GAP-026 | **Low** | README.md still describes generic workflow template, not eDoc product |
| GAP-027 | **Low** | Playwright coverage limited to login/dashboard smoke |
| GAP-028 | **Informational** | Documenso reference not browsable in workspace for live cross-check |

---

## Conflicting Requirements

### CONF-001 — Database design authority (Critical)

| Source A | Source B |
|---|---|
| **This review mandate:** PostgreSQL-first; schema under `database/postgresql/`; local PostgreSQL validation; must not use SQLite as primary schema baseline | **Baseline §Scope, §Data Model, §Migration; AGENTS.md; DATA_MAP.md; HANDOFF.md:** SQLite-first in `database/sqlite/` before Nhost migration |

**Recommendation:** **PostgreSQL-first under `database/postgresql/` should prevail** for eDoc application schema if the project owner confirms this review mandate. Rationale: production target is Nhost PostgreSQL + Hasura; designing twice (SQLite then PostgreSQL) adds migration risk and dialect drift. Retain SQLite **only** for the local workflow app (`workflow-app/database/schema.sql`), which is a separate domain.

**Action:** Revise baseline, AGENTS.md, CONTEXT.md, DATA_MAP.md, and PLAN.md consistently after owner decision.

---

### CONF-002 — Session inactivity timeout (High)

| Source A | Source B |
|---|---|
| `version-0-baseline.md` §Users, Roles — **15 minutes** default | `version-0-baseline.md` §Security Requirements item 4 — **60 minutes** default |
| `reference/starter.md` §Authentication — **15 minutes** | `SECURITY.md`, `AuthProvider.tsx`, `VITE_SESSION_TIMEOUT_MINUTES` — **15 minutes** (implementation scaffold) |

**Recommendation:** **15 minutes** should prevail (matches starter, SECURITY.md, and implemented scaffold). Update baseline §Security Requirements item 4.

---

### CONF-003 — Document status: awaiting_action vs awaiting_my_action (High)

| Source A | Source B |
|---|---|
| `version-0-baseline.md` §Approved document statuses — `awaiting_action` | `database/migrations/0001_initial.sql`, `src/types/domain.ts`, `StatusBadge.tsx` — `awaiting_my_action` |
| `DATA_MAP.md` — `awaiting_action` | Documents list filter in starter — "Awaiting My Action" (UI label) |

**Recommendation:** Use **`awaiting_action`** as the **persisted document status** (org-wide state: document waiting on assignees). Use **"Awaiting my action"** as a **user-specific inbox/dashboard filter**, not a document status enum value. Remove `awaiting_my_action` from schema and types.

---

### CONF-004 — PostgreSQL-first wording vs SQLite path (Medium)

`version-0-baseline.md` line 79: *"PostgreSQL-first schema design in `database/sqlite/`"* — internally inconsistent phrasing.

**Recommendation:** Replace with explicit path and validation target per CONF-001 decision.

---

### CONF-005 — Local development auth privilege (High — security)

`AuthProvider.tsx` local fallback assigns **Super Administrator** to any email/password without verification.

**Recommendation:** Local fallback is acceptable for dev **only** with explicit env flag, fixed test users, and documented prohibition in production builds. Baseline should require this.

---

## Ambiguous Requirements

| ID | Original statement | Problem | Proposed testable form |
|---|---|---|---|
| AMB-001 | "Flexible permission assignments rather than fixed role names alone" | No permission key catalog or inheritance rules | Given a user with permission set P, when action A is attempted on resource R, then allow/deny per documented permission matrix |
| AMB-002 | "Rejection may terminate or return the route" | No decision tree for which applies when | Given route config `rejection_policy`, when assignee rejects, then apply policy (`terminate` \| `return_for_revision`) and record audit event |
| AMB-003 | "Majority approval" for parallel groups | Undefined rounding (50% vs >50%) | Given N assignees and rule `majority`, required count = floor(N/2)+1 |
| AMB-004 | "Malware-scanning integration placeholder" | Unknown if/when required | Decision record required; until then, block non-PDF uploads and log scan status `not_configured` |
| AMB-005 | "MFA-ready structure" | No acceptance criteria for MFA | Given MFA enabled for org, when user signs in, then second factor required before session issued |
| AMB-006 | "Configurable retention settings" | No default periods or legal hold behavior | Decision record for default document and audit retention days |
| AMB-007 | "Rate limiting to sensitive endpoints" | No thresholds | Given >N sign attempts per user per minute, then HTTP 429 with structured error |

---

## Missing Decisions

See `REQUIREMENTS_DECISION_LOG.md` for 24 decision records (DEC-001 through DEC-024). Highest priority: database authority, re-authentication method, file size limits, rejection policy, email provider, retention, multi-tenancy model, public verification page.

---

## Technical Feasibility Concerns

| Feature | Feasible on target stack? | Required backend |
|---|---|---|
| PDF upload/preview | Yes | Worker presigned R2 URLs; PDF.js in browser for preview |
| SHA-256 hashing | Yes | Worker (Web Crypto) on complete-upload |
| PDF field placement | Yes | Browser pdf-lib; normalized coordinates stored in PostgreSQL |
| Signed PDF generation | Yes | Worker pdf-lib; cannot be frontend-only (integrity) |
| Route advancement | Yes | Worker transactional PostgreSQL via Hasura actions or direct PG |
| Email notifications | Yes | Worker + email provider (Resend, SendGrid, etc.) |
| Scheduled reminders/escalations | Partial on free tier | Cloudflare Cron Triggers or Nhost scheduled functions |
| Malware scanning | Requires external service | ClamAV VM, Cloudflare Gateway, or third-party API via Worker |
| OTP re-authentication | Requires provider | Nhost MFA, or Worker-issued TOTP/email OTP |
| GraphQL subscriptions (inbox) | Yes | Hasura on Nhost |
| GitHub Pages SPA | Yes | HashRouter; no SSR |
| Completion certificate QR verification | Yes | Public Worker GET endpoint with rate limit (decision on public scope) |

**Cannot be securely frontend-only:** R2 credentials, signing transactions, route advancement, audit append with integrity hash, certificate generation, email send, JWT validation for Worker, Hasura admin operations.

---

## Security Concerns

| Severity | Concern |
|---|---|
| Critical | Worker auth stub accepts any Bearer token without JWKS validation |
| Critical | No Hasura row-level permissions in repository |
| Critical | Local auth fallback grants Super Administrator |
| High | No idempotency keys specified for sign/advance endpoints |
| High | No CSP or security headers requirements for GitHub Pages deployment |
| High | Signed URL expiration mentioned (300s in stub) but not specified in baseline |
| High | Audit `integrity_hash` algorithm and chain-of-custody undefined |
| Medium | No password policy requirements beyond Nhost defaults |
| Medium | No explicit CSRF strategy for Worker API (Bearer mitigates but document) |
| Medium | Error responses in Worker avoid stack traces (good); baseline should require consistent error codes |
| Informational | Documenso AGPL — current approach avoids code copy (good) |

---

## Recommended Baseline Changes

1. **Approve or revise baseline** — Change status from `FOR_REVIEW` to `APPROVED` only after conflicts resolved.
2. **Resolve CONF-001** — Adopt PostgreSQL-first under `database/postgresql/` (if owner confirms) and update all agent workflow docs.
3. **Fix CONF-002, CONF-003, CONF-004** — Single session timeout; single document status enum; fix path wording.
4. **Add permission matrix** — Document permission keys and role mappings as appendix.
5. **Add state machine appendix** — Adopt `WORKFLOW_STATE_REVIEW.md` transitions into baseline.
6. **Add measurable NFRs** — File size (e.g., 25 MB PDF default), preview URL TTL (e.g., 5 min), rate limits.
7. **Add event catalog** — Mandatory audit events per action (see gap analysis).
8. **Complete schema specification** — All baseline entities with constraints before Phase 4 coding.
9. **Add security appendix** — CSP, JWT validation, idempotency, secret rotation, dev-auth restrictions.
10. **Mark UI reference dependency** — Document that clones need local `reference/src` for visual acceptance.

---

## Go / No-Go Recommendation

| Gate | Status |
|---|---|
| Baseline formally approved | **NO** (`FOR_REVIEW`) |
| Conflicts resolved | **NO** |
| Critical decisions recorded | **NO** |
| Schema specification complete | **NO** |
| Security design implementable | **PARTIAL** |
| Phase 2 UI foundation | **PARTIAL** |

### Verdict: **NO-GO** for implementation beyond baseline/doc alignment

**Conditional GO** for:
- Project owner review of these six documents
- Baseline revision and approval workshop
- Phase 0: Decision log resolution + PostgreSQL schema design + Hasura permission design (no feature coding)

**Do not proceed** with Nhost production wiring, R2 integration, or signing workflows until **GO** criteria above are met.

---

## Related Deliverables

| Document | Purpose |
|---|---|
| `REQUIREMENTS_TRACEABILITY_MATRIX.md` | Requirement-level status and evidence |
| `REQUIREMENTS_GAP_ANALYSIS.md` | Detailed gaps with acceptance criteria |
| `REQUIREMENTS_DECISION_LOG.md` | Owner decisions required |
| `WORKFLOW_STATE_REVIEW.md` | State machines and transitions |
| `BASELINE_ACCEPTANCE_CRITERIA.md` | Testable criteria by domain |

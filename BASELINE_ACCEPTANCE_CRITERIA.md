# Baseline Acceptance Criteria — eDoc

**Review date:** 2026-07-01  
**Format:** Given [precondition], when [action/event], then [result], and [security/audit/exception behavior].  
**Scope:** Rewrites baseline requirements into testable criteria. Assumes approved decisions in `REQUIREMENTS_DECISION_LOG.md` where noted.

---

## Authentication

### AUTH-AC-001 — Sign in
Given a registered active user with valid credentials and configured Nhost project, when the user submits sign-in, then the user receives a valid session and is redirected to the dashboard, and failed attempts do not reveal whether the email exists.

### AUTH-AC-002 — Protected route gate
Given an unauthenticated user, when they navigate to any protected route, then they are redirected to login with no protected content flash, and the intended route is preserved for post-login redirect.

### AUTH-AC-003 — Session inactivity timeout
Given an authenticated session and default org settings, when the user is inactive for 15 minutes (configurable), then the session ends and the user must sign in again, and an audit event `auth.session_expired` is recorded when audit is enabled.

### AUTH-AC-004 — Sign out
Given an authenticated user, when they sign out, then local session state is cleared and subsequent protected routes require authentication, and no credentials remain in form fields.

### AUTH-AC-005 — Deactivated account
Given a user with profile status `deactivated`, when they attempt sign-in, then access is denied with a generic message, and an audit event `auth.login_denied` is recorded.

### AUTH-AC-006 — Password reset
Given a registered email, when the user requests password reset, then Nhost sends reset instructions (or dev mock logs request), and the response does not confirm email existence to unauthorized parties.

### AUTH-AC-007 — Local dev auth restriction
Given production build (`VITE_ALLOW_LOCAL_AUTH` not true), when Nhost is unavailable, then local password bypass is disabled and sign-in fails safely.

### AUTH-AC-008 — Authentication audit
Given successful sign-in, sign-out, and failed login, when each event occurs, then corresponding append-only audit events are created with user_id, timestamp, IP (if available), and request_id.

---

## Dashboard

### DASH-AC-001 — Awaiting my action count
Given an authenticated user with pending assignee tasks, when the dashboard loads, then the "Awaiting my action" widget shows the count from authorized GraphQL/Worker data matching pending assignee rows, not placeholder constants.

### DASH-AC-002 — Status widgets
Given org documents in various statuses, when the dashboard loads, then widgets for drafts, in routing, due soon, overdue, returned, rejected, and completed reflect authorized filtered counts.

### DASH-AC-003 — KPI accuracy
Given completed routes in the last 30 days, when completion rate is displayed, then value equals `completed / (completed + rejected + cancelled)` for that period per defined formula.

### DASH-AC-004 — Empty state
Given a new user with no assignments, when the dashboard loads, then empty states display per UI reference with no mock production data.

### DASH-AC-005 — Performance
Given a typical org dataset (≤10k documents), when the dashboard loads, then initial GraphQL queries complete within 3 seconds on broadband (NFR target — measure in staging).

---

## Documents

### DOC-AC-001 — Create draft
Given an authenticated document owner, when they create a document with required title, then a document row with status `draft` and version 1 `draft` is created scoped to their organization_id.

### DOC-AC-002 — Document list authorization
Given User A in Org 1, when querying documents, then only Org 1 documents visible per Hasura permissions; direct ID access to Org 2 document returns empty/denied.

### DOC-AC-003 — Status filters
Given documents in all baseline statuses, when user applies status filter, then results match persisted status enum (not user-specific conflation).

### DOC-AC-004 — Search
Given documents with title and reference_number, when user searches by partial match, then results are case-insensitive scoped to authorized set.

### DOC-AC-005 — Reference number uniqueness
Given an existing reference_number in org, when owner creates duplicate reference in same org, then creation fails with structured validation error.

### DOC-AC-006 — Document read-only when completed
Given a completed document, when non-admin user attempts metadata edit, then operation is denied at Hasura/Worker layer.

### DOC-AC-007 — Archive
Given retention policy triggers archive, when job runs, then document status becomes `archived` and content remains readable to authorized roles only.

---

## Upload and Storage

### UPL-AC-001 — PDF-only upload
Given a non-PDF file, when user attempts upload, then client rejects with validation message before network call, and Worker rejects if bypass attempted.

### UPL-AC-002 — File size limit
Given a PDF exceeding configured max (default 25 MB), when upload is attempted, then upload is rejected at client and Worker with `VALIDATION_FAILED`.

### UPL-AC-003 — Presigned upload
Given authorized owner and draft version, when requesting upload URL, then Worker returns time-limited authorized upload target and private R2 object key matching baseline path convention, and no R2 secrets appear in browser.

### UPL-AC-004 — Upload complete hashing
Given successful R2 upload, when complete-upload is called, then Worker computes SHA-256, stores hash on document_files row, and writes audit event `file.uploaded`.

### UPL-AC-005 — Preview URL
Given authorized viewer, when preview is requested, then Worker returns URL expiring in ≤5 minutes (default), and file_access_log entry is created.

### UPL-AC-006 — Download URL
Given authorized user with download permission, when download is requested, then temporary download URL is issued and access is logged.

### UPL-AC-007 — Private bucket
Given any user, when attempting direct unauthenticated R2 URL access, then access is denied.

### UPL-AC-008 — Version immutability
Given a signed document version, when upload to same version original path is attempted, then operation is rejected; new version required.

---

## Routing

### ROUTE-AC-001 — Sequential activation
Given a sequential route with steps 1→2→3, when step 1 completes, then only step 2 assignees become `active`; step 3 remains `pending`.

### ROUTE-AC-002 — Parallel all
Given parallel step with rule `all` and 3 assignees, when 2 complete, then step remains active; when 3rd completes, then step completes.

### ROUTE-AC-003 — Parallel any
Given parallel step with rule `any`, when one assignee completes, then step completes and remaining pending assignees are `invalidated` or marked no-longer-required per policy.

### ROUTE-AC-004 — Parallel majority
Given 5 assignees and majority rule, when 3 complete, then step completes (floor(5/2)+1 = 3).

### ROUTE-AC-005 — Mixed routing
Given mixed mode route (sequential groups of parallel steps), when group N completes, then group N+1 activates per sequence.

### ROUTE-AC-006 — Send route
Given document `ready_for_routing`, when owner sends route, then document becomes `in_routing`, route becomes `active`, first step(s) activate, and notifications sent to assignees.

### ROUTE-AC-007 — Rejection terminate
Given route with rejection_policy `terminate`, when assignee rejects, then document becomes `rejected`, route `rejected`, pending actions invalidated, and owner notified.

### ROUTE-AC-008 — Return for revision
Given rejection_policy `return_for_revision`, when assignee returns with reason, then document becomes `returned`, new version workflow initiated, pending actions on old version invalidated, and audit records reason.

### ROUTE-AC-009 — Route advancement transaction
Given step completion triggers route advance, when Worker processes advance, then document/route/step/assignee updates commit atomically or fully rollback on error.

### ROUTE-AC-010 — Delegation
Given step with delegation_allowed and active assignee, when delegate action is used, then delegated assignee receives task, delegated_from_id recorded, and both parties notified.

### ROUTE-AC-011 — Due date reminder
Given assignee task due in 24h and reminder configured, when scheduler runs, then notification sent once per cooldown window.

### ROUTE-AC-012 — Escalation
Given overdue assignee task and escalation rule, when escalation triggers, then escalation recipient notified and audit event recorded.

### ROUTE-AC-013 — Cancel route
Given active route, when owner cancels with reason, then route `cancelled`, document `cancelled`, assignees invalidated, and audit event recorded.

### ROUTE-AC-014 — Admin override skip
Given admin with override permission, when skipping required step with reason, then step `skipped`, audit `route.override` recorded, route continues.

---

## PDF Preparation

### PDF-AC-001 — Field placement coordinates
Given a field placed on page 2 of PDF, when saved, then coordinates stored normalized 0–1 relative to page width/height per draft SQL constraints.

### PDF-AC-002 — Field assignment
Given a signature field, when saved, then field links to exactly one route_step_assignee.

### PDF-AC-003 — Required fields
Given required fields unset, when route send attempted, then validation fails listing missing fields.

### PDF-AC-004 — PDF viewer
Given authorized user in signing workspace, when document loads, then PDF.js renders with zoom, page navigation, and thumbnails per UI reference.

### PDF-AC-005 — Wizard step persistence
Given owner completes steps 1–4, when navigating back, then entered data persists from backend not session-only mock.

---

## Review

### REV-AC-001 — Review action
Given active reviewer assignment, when review submitted with comment, then assignee status `completed`, step completion evaluated, and comment stored.

### REV-AC-002 — Review without approve
Given review-only step, when reviewer completes review, then document is not marked approved unless step action requires it.

### REV-AC-003 — Review meaning field
Given review meaning field on PDF, when reviewer completes, then meaning value captured in action record.

---

## Approval

### APP-AC-001 — Approve action
Given active approver assignment, when approve submitted, then assignee completes, audit `assignee.approved` recorded, route evaluates advance.

### APP-AC-002 — Approve with visible meaning
Given approval meaning field configured, when approved, then meaning stored on action and visible on completion certificate.

### APP-AC-003 — Approval without signature image
Given "approval without visible signature" setting, when approved, then audit and certificate show approval without signature image on PDF.

---

## Signing

### SIGN-AC-001 — Assignment verification
Given User A logged in, when attempting to sign assignment for User B, then Worker returns 403 and no signature_event created.

### SIGN-AC-002 — Version verification
Given document version updated after user opened signing page, when sign attempted, then hash mismatch detected and user prompted to reload; sign blocked until current version confirmed.

### SIGN-AC-003 — Re-authentication
Given org requires password re-entry, when user signs without re-auth, then sign rejected; after valid re-auth, sign proceeds and signature_authentication_event recorded.

### SIGN-AC-004 — Consent and meaning
Given signing dialog, when user has not checked consent, then sign button disabled/submission rejected; meaning displayed matches field configuration.

### SIGN-AC-005 — Immutable signed PDF
Given successful sign, when complete, then new R2 signed object exists, final_sha256 stored, prior original unchanged, signature_event links exact version_id.

### SIGN-AC-006 — Audit on sign
Given successful sign, when complete, then append-only audit event includes signer_id, version_id, document_hash, IP, user_agent, session_id, request_id.

### SIGN-AC-007 — Advance after sign only
Given sign transaction, when PDF storage fails, then route does not advance and no signature_event in completed state.

### SIGN-AC-008 — Idempotency
Given duplicate sign request with same Idempotency-Key, when second request arrives, then response matches first without duplicate signature_event.

### SIGN-AC-009 — Signature types
Given typed/drawn/uploaded signature modes enabled, when user signs, then representation stored per org policy (DEC-016) and applied to PDF.

### SIGN-AC-010 — Reject from signing workspace
Given signer assignment, when reject with reason, then rejection policy applied (terminate or return) per route config.

---

## Versioning

### VER-AC-001 — New version on revision
Given returned document, when owner uploads revised PDF, then version_number increments, new R2 object, new hash, prior version `superseded`.

### VER-AC-002 — Pending invalidation
Given version 1 route in progress, when version 2 created and sent, then version 1 assignee actions `invalidated`, historical actions remain readable.

### VER-AC-003 — Signature version binding
Given signature_event, when queried, then version_id matches exactly one document_versions row and never changes.

### VER-AC-004 — Completed version immutable
Given version status `completed`, when file replace attempted, then operation denied.

---

## Comments

### CMT-AC-001 — General comment
Given authorized user on document, when comment posted, then comment visible per privacy rules and timestamp recorded.

### CMT-AC-002 — Route-step comment
Given assignee on active step, when step comment posted, then comment linked to route_step_id.

### CMT-AC-003 — Mentions
Given comment with @mention, when submitted, then mentioned user receives notification.

### CMT-AC-004 — Private comment
Given private comment flag, when posted, then visible only to author and roles per policy.

### CMT-AC-005 — Comment edit audit
Given edited comment, when saved, then edited indicator shown and audit event records change.

---

## Notifications

### NOTIF-AC-001 — New assignment
Given route step activated, when assignee becomes active, then in-app notification created and email sent per user preferences.

### NOTIF-AC-002 — Deduplication
Given duplicate trigger within cooldown, when notification job runs, then only one delivery per recipient/document/step/type.

### NOTIF-AC-003 — Preferences
Given user disabled email for reminders, when reminder due, then in-app only.

### NOTIF-AC-004 — Digest
Given daily digest preference, when digest window closes, then single email summarizes pending items.

---

## Audit Trail

### AUDIT-AC-001 — Append-only
Given standard user/admin, when delete or update audit_events attempted via app/Hasura, then operation denied.

### AUDIT-AC-002 — Mandatory fields
Given any audited action, when recorded, then event includes organization_id, event_type, entity_type, timestamp, user_id (if applicable), request_id.

### AUDIT-AC-003 — Integrity hash
Given audit event created, when stored, then integrity_hash = SHA-256(canonical payload) per DEC-014.

### AUDIT-AC-004 — Signature audit linkage
Given signature_event, when audit queried, then related audit event shares version_id and document_id.

### AUDIT-AC-005 — Export
Given auditor role, when exporting audit for date range, then export scoped to org and logged in data_export_logs.

### AUDIT-AC-006 — No secrets in audit
Given authentication events, when recorded, then passwords and tokens are never stored in previous_value/new_value.

---

## Completion Certificates

### CERT-AC-001 — Generation on complete
Given route completion, when certificate job runs, then immutable PDF stored in R2 with certificate ID, hashes, participants, timestamps.

### CERT-AC-002 — Verification code
Given certificate, when generated, then unique verification code and URL created.

### CERT-AC-003 — Public verification
Given valid certificate ID and code (DEC-015), when public verification endpoint called, then response confirms authenticity without exposing unauthorized document content, rate limited.

### CERT-AC-004 — Certificate immutability
Given generated certificate, when replace attempted, then denied; new certificate only for new completion event.

---

## Reports

### RPT-AC-001 — Documents by status
Given auditor, when report run, then counts grouped by status match database for authorized scope.

### RPT-AC-002 — Turnaround time
Given completed documents, when turnaround report run, then metric equals completed_at minus route started_at per document.

### RPT-AC-003 — Export CSV/Excel
Given authorized report, when export clicked, then file downloads with correct columns and row filter.

### RPT-AC-004 — Workload report
Given users with assignments, when workload report run, then pending and completed counts per user accurate.

---

## Administration

### ADMIN-AC-001 — User invite
Given org admin, when inviting user, then invitation sent and profile status `invited` until acceptance.

### ADMIN-AC-002 — Role assignment
Given org admin, when role assigned, then user_roles updated and audit `role.assigned` recorded.

### ADMIN-AC-003 — Permission enforcement
Given permission removed from role, when user attempts action, then denied on next request without UI-only hiding.

### ADMIN-AC-004 — Department management
Given org admin, when department created, then unique within organization_id.

### ADMIN-AC-005 — Routing template CRUD
Given document controller, when template saved, then reusable template available in creation wizard.

### ADMIN-AC-006 — Retention settings
Given org admin updates retention, when saved, then system_settings updated and audit recorded.

---

## Security

### SEC-AC-001 — Worker JWT validation
Given invalid JWT, when Worker privileged endpoint called, then 401 with structured error, no side effects.

### SEC-AC-002 — Hasura tenant isolation
Given JWT for Org A, when GraphQL query mutations on Org B row attempted, then denied.

### SEC-AC-003 — No secrets in bundle
Given production frontend build, when static assets analyzed, then no admin secrets, R2 keys, or email keys present.

### SEC-AC-004 — Rate limiting
Given >10 sign attempts/minute/user, when additional attempts made, then 429 returned.

### SEC-AC-005 — CSP
Given production Pages deployment, when security headers checked, then CSP restricts script sources appropriately.

### SEC-AC-006 — Error sanitization
Given server error, when API responds, then no stack trace in client response; requestId included.

### SEC-AC-007 — CSRF/Bearer API
Given Worker API, when request lacks valid Bearer token, then 401; cross-origin requests require CORS allowlist.

---

## Performance

### PERF-AC-001 — Document list pagination
Given >50 documents, when list loads, then paginated GraphQL query default page size ≤50.

### PERF-AC-002 — PDF lazy load
Given signing workspace, when route navigated, then PDF.js loaded on demand not in initial bundle critical path.

### PERF-AC-003 — Upload throughput
Given 10 MB PDF on broadband, when uploading, then progress indicator updates and complete within reasonable timeout (2 min).

---

## Deployment

### DEP-AC-001 — GitHub Pages build
Given main branch push, when CI runs, then lint, typecheck, test, build pass and artifact deploys to GitHub Pages.

### DEP-AC-002 — HashRouter base path
Given repo subpath deployment, when app loads, then assets resolve with configured VITE_GITHUB_PAGES_BASE.

### DEP-AC-003 — Worker health
Given deployed Worker, when GET /api/health, then 200 with service identifier.

### DEP-AC-004 — Environment separation
Given production, when Nhost/Worker/Pages configured, then dev credentials not used.

---

## Accessibility

### A11Y-AC-001 — Keyboard navigation
Given main navigation, when user tabs through, then all interactive elements reachable with visible focus.

### A11Y-AC-002 — Form labels
Given login and wizard forms, when inspected, then inputs have associated labels per WCAG 2.1 Level A minimum.

### A11Y-AC-003 — Status announcements
Given async loading/error states, when state changes, then screen reader appropriate live region or text provided.

### A11Y-AC-004 — Color contrast
Given UI reference theme, when measured, then text meets WCAG AA contrast for normal text (4.5:1) on primary surfaces.

---

## Traceability

Each acceptance criterion maps to requirements in `REQUIREMENTS_TRACEABILITY_MATRIX.md`. Verification methods:

| Method | Applies to |
|---|---|
| Unit test | Routing rules, validation, hash utils |
| Integration test | Auth, upload, sign, tenant isolation |
| Playwright E2E | End-to-end workflows |
| Manual browser | UI reference parity |
| Security test | JWT, Hasura, secret scan |
| Load test (staging) | PERF-AC-* |

**Total acceptance criteria:** 98

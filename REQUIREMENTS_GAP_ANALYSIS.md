# Requirements Gap Analysis — eDoc

**Review date:** 2026-07-01  
**Related documents:** `BASELINE_REQUIREMENTS_REVIEW.md`, `REQUIREMENTS_TRACEABILITY_MATRIX.md`, `REQUIREMENTS_DECISION_LOG.md`

---

## Critical Gaps

### GAP-001 — Database schema authority conflict

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Data model / migration |
| **Existing statement** | Baseline: "PostgreSQL-first schema design in `database/sqlite/`"; AGENTS.md: SQLite-first gate; Review mandate: PostgreSQL-first in `database/postgresql/` |
| **Problem** | Two incompatible authoritative schema paths and validation workflows |
| **Risk** | Wasted effort, dialect drift, agent instruction conflicts, blocked Phase 4 |
| **Recommended requirement** | Given the project owner selects PostgreSQL-first, all application DDL and migrations SHALL be maintained under `database/postgresql/` and validated against local PostgreSQL before Nhost/Hasura apply |
| **Proposed acceptance criteria** | (1) `database/postgresql/` exists with initial schema; (2) AGENTS.md and baseline updated; (3) local validation script passes FK/constraint checks; (4) no application DDL in `database/sqlite/` except deprecated readme pointer |
| **Dependencies** | DEC-001 |
| **Recommended phase** | Phase 0 — before Phase 4 |

---

### GAP-002 — Baseline not formally approved

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Governance |
| **Existing statement** | `version-0-baseline.md` Status: `FOR_REVIEW` |
| **Problem** | Implementation proceeds without signed-off requirements |
| **Risk** | Rework, scope creep, unauthorized architectural changes |
| **Recommended requirement** | No Phase 3+ feature implementation until baseline status is `APPROVED` with owner name and date |
| **Proposed acceptance criteria** | Baseline approval section completed; workflow app approval record if used |
| **Dependencies** | Resolution of CONF-001 through CONF-003 |
| **Recommended phase** | Immediate |

---

### GAP-003 — Application schema not implemented

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Data model |
| **Existing statement** | Baseline lists ~40 entities; `database/sqlite/schema.sql` is placeholder; `0001_initial.sql` has ~15 tables |
| **Problem** | Cannot enforce workflow, audit, or permissions without complete schema |
| **Risk** | Incorrect early UI/API contracts; missing tenant isolation on new tables |
| **Recommended requirement** | Complete PostgreSQL schema covering all baseline entities with PKs, FKs, checks, indexes, and tenant columns |
| **Proposed acceptance criteria** | Schema validation script passes; entity count matches baseline inventory; DATA_MAP.md updated |
| **Dependencies** | DEC-001 |
| **Recommended phase** | Phase 4 (after Phase 0 decisions) |

---

### GAP-004 — Signing transaction specification missing

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Electronic signature |
| **Existing statement** | Starter lists 20 signing steps; no rollback, idempotency, or failure specification |
| **Problem** | Cannot implement secure signing without atomic transaction design |
| **Risk** | Partial signatures, hash mismatch, double-advance, audit gaps |
| **Recommended requirement** | Signing SHALL be a single Worker-orchestrated transaction: validate auth → re-auth → hash verify → apply signature → store signed PDF → insert signature_event → insert audit_event → advance route; on failure, rollback all DB changes and do not store partial signed PDF |
| **Proposed acceptance criteria** | Integration test: concurrent duplicate sign requests yield one success; failed PDF write leaves no signature_event; audit links exact version_id |
| **Dependencies** | DEC-002, GAP-003, SEC-006 |
| **Recommended phase** | Phase 7 |

---

### GAP-005 — Hasura permissions absent

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Authorization |
| **Existing statement** | "Hasura permissions required before production" |
| **Problem** | No metadata in repo; GraphQL would expose tenant data |
| **Risk** | Cross-organization data leakage |
| **Recommended requirement** | Hasura metadata SHALL enforce organization_id from JWT claims on all tenant tables before any environment beyond local dev |
| **Proposed acceptance criteria** | Integration test: User A cannot query Org B document by ID; insert/update denied without role |
| **Dependencies** | GAP-003, AUTH-001 |
| **Recommended phase** | Phase 4 |

---

### GAP-006 — Worker JWT validation not implemented

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Security |
| **Existing statement** | "Every endpoint must authenticate the user" |
| **Problem** | `requireAuth` only checks Bearer header presence |
| **Risk** | Any token string accesses Worker endpoints |
| **Recommended requirement** | Worker SHALL validate JWT signature via Nhost JWKS, expiry, and required claims before privileged operations |
| **Proposed acceptance criteria** | Invalid/expired/missing JWT returns 401; valid org member can call authorized endpoint |
| **Dependencies** | AUTH-001 |
| **Recommended phase** | Phase 3 |

---

### GAP-007 — Re-authentication method undecided

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Electronic signature |
| **Existing statement** | "Password re-entry, OTP, or configured re-authentication" |
| **Problem** | No default or configuration model |
| **Risk** | Inconsistent signing evidence; blocked implementation |
| **Recommended requirement** | Given org signature_settings.reauth_method, when user submits sign action, then system validates using configured method and records method in signature_authentication_events |
| **Proposed acceptance criteria** | Sign without re-auth fails; successful re-auth creates authentication event linked to signature_event |
| **Dependencies** | DEC-002 |
| **Recommended phase** | Phase 0 decision; Phase 7 implementation |

---

### GAP-008 — Rejection and return behavior incomplete

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Requirement area** | Routing |
| **Existing statement** | "Rejection may terminate or return the route" |
| **Problem** | No per-route or per-step configuration; resubmission rules unclear |
| **Risk** | Incorrect document states; regulatory traceability gaps |
| **Recommended requirement** | Each route SHALL define rejection_policy (`terminate` \| `return_for_revision`) and return SHALL create new document_version, set document status `returned`, invalidate pending assignee actions on superseded version |
| **Proposed acceptance criteria** | E2E: return creates version 2; assignee actions on version 1 show invalidated; terminate sets `rejected` |
| **Dependencies** | DEC-006, DEC-007 |
| **Recommended phase** | Phase 0 decision; Phase 6 implementation |

---

## High-Priority Gaps

### GAP-009 — Session timeout conflict

| **Severity** | High |
| **Recommended requirement** | Single default: 15 minutes inactivity; org-configurable via security_settings |
| **Acceptance criteria** | Baseline §Security item 4 matches AUTH-007; E2E timeout test with shortened env var |
| **Phase** | Phase 0 doc fix |

### GAP-010 — Document status enum mismatch

| **Severity** | High |
| **Recommended requirement** | Persisted statuses exclude user-specific filters; inbox uses queries not status enum |
| **Acceptance criteria** | Single enum in SQL, types, UI mapping; migration removes `awaiting_my_action` |
| **Phase** | Phase 0 |

### GAP-011 — Multi-tenancy model underspecified

| **Severity** | High |
| **Recommended requirement** | Document whether users belong to one org or many; how org switching works; super-admin cross-org scope |
| **Acceptance criteria** | DATA_MAP organization membership rules; Hasura claims documented |
| **Phase** | Phase 0 (DEC-005) |

### GAP-012 — File size and type limits undefined

| **Severity** | High |
| **Recommended requirement** | Default max PDF 25 MB; attachments PDF/PNG/JPG max 10 MB unless configured |
| **Acceptance criteria** | Upload rejected client and Worker with VALIDATION_FAILED; configurable in system_settings |
| **Phase** | Phase 0 (DEC-004); Phase 5 implementation |

### GAP-013 — Notification/email infrastructure undecided

| **Severity** | High |
| **Recommended requirement** | Email provider, from-address, retry policy, and mock mode for dev |
| **Acceptance criteria** | Assignment creates notification_delivery row; email sent or logged in dev |
| **Phase** | Phase 0 (DEC-011); Phase 6/8 |

### GAP-014 — Rate limiting unspecified

| **Severity** | High |
| **Recommended requirement** | Sign: 10/min/user; upload-url: 30/min/user; auth: Nhost defaults + Worker throttle on verification |
| **Acceptance criteria** | 11th request in window returns 429 with requestId |
| **Phase** | Phase 0 (DEC-013); Phase 3+ |

### GAP-015 — Retention periods not quantified

| **Severity** | High |
| **Recommended requirement** | Default document retention 7 years (configurable); audit retention ≥ document retention |
| **Acceptance criteria** | Retention job marks eligible documents archived; audit not deleted before policy |
| **Phase** | Phase 0 (DEC-009, DEC-010); Phase 9 |

### GAP-016 — Missing tables in draft SQL

| **Severity** | High |
| **Recommended requirement** | Add all baseline entities: comments, notifications, templates, certificates, delegations, settings, logs |
| **Acceptance criteria** | Schema diff vs baseline entity list is empty |
| **Phase** | Phase 4 |

### GAP-017 — Route state machine incomplete

| **Severity** | High |
| **Recommended requirement** | Adopt WORKFLOW_STATE_REVIEW.md transitions as baseline appendix |
| **Acceptance criteria** | Unit tests cover all valid/invalid transitions per entity |
| **Phase** | Phase 0 doc; Phase 6 code |

### GAP-018 — Certificate verification scope undecided

| **Severity** | High |
| **Recommended requirement** | Public read-only verification by certificate ID + code without auth, rate-limited |
| **Acceptance criteria** | GET verification returns status only, no PII beyond participant names on certificate |
| **Phase** | Phase 0 (DEC-015); Phase 8 |

### GAP-019 — Security headers and CSP missing

| **Severity** | High |
| **Recommended requirement** | GitHub Pages/_headers or meta CSP restricting script-src; Worker CORS allowlist |
| **Acceptance criteria** | Security review checklist; no inline eval in production build |
| **Phase** | Phase 3/10 |

### GAP-020 — UI reference not in repository

| **Severity** | High |
| **Recommended requirement** | Document mandatory local reference setup; optional screenshot baseline pack for CI |
| **Acceptance criteria** | SETUP.md lists reference paths; BROWSER_TESTING visual checklist |
| **Phase** | Phase 2 completion |

---

## Medium and Low Gaps

| Gap ID | Severity | Area | Recommended requirement summary | Phase |
|---|---|---|---|---|
| GAP-021 | Medium | Dashboard | Define KPI formulas (completion rate = completed/(completed+rejected+cancelled) in period) | Phase 8 |
| GAP-022 | Medium | Documents | Saved views stored per user in user_preferences table | Phase 5+ |
| GAP-023 | Medium | Dates | All timestamps UTC in DB; display in user/org timezone | Phase 4 |
| GAP-024 | Medium | Concurrency | Document update requires matching lock_version | Phase 5 |
| GAP-025 | Medium | Scope | Document external signing links as out-of-scope in baseline | Phase 0 |
| GAP-026 | Low | Docs | Replace README with eDoc product overview | Phase 10 |
| GAP-027 | Low | Testing | Expand Playwright beyond login smoke | Phase 10 |
| GAP-028 | Informational | Reference | Documenso folder not accessible in CI workspace | N/A |

---

## Actions That Should Create Audit Events (Currently Uncovered)

The baseline mandates audit for signature, route, override, and authentication events. The following should be explicitly added to the event catalog:

| Action | Suggested event_type | Priority |
|---|---|---|
| File preview/download | `file.accessed` | High |
| Permission grant/revoke | `permission.changed` | Critical |
| Role assignment change | `role.assigned` / `role.removed` | Critical |
| Delegation created/revoked | `delegation.created` / `delegation.revoked` | High |
| Route cancelled | `route.cancelled` | High |
| Document expired | `document.expired` | Medium |
| Retention archive | `document.archived` | Medium |
| Failed sign attempt | `signature.failed` | High |
| Admin override step skip | `route.override` | Critical |
| Export report | `report.exported` | Medium |
| Settings change | `settings.changed` | High |

---

## Gap Count Summary

| Severity | Count |
|---|---|
| Critical | 8 |
| High | 12 |
| Medium | 5 |
| Low | 2 |
| Informational | 1 |
| **Total** | **28** |

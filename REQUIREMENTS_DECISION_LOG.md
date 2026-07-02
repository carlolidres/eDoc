# Requirements Decision Log — eDoc

**Review date:** 2026-07-01  
**Last updated:** 2026-07-01 (project owner decisions recorded)  
**Purpose:** Decisions that must be confirmed before implementation proceeds.  
**Status values:** `Open` | `Recommended` | `Approved` | `Rejected` | `Deferred`

---

| Decision ID | Question | Available options | Approved option | Security impact | Cost impact | Implementation impact | Decision owner | Status |
|---|---|---|---|---|---|---|---|---|
| DEC-001 | Primary application database design path? | A) SQLite-first; B) PostgreSQL-first; C) Direct Nhost-only | **B) PostgreSQL-first in `database/postgresql/` with local PG validation** | Low | Low | High — update AGENTS.md, baseline, DATA_MAP, PLAN | Carlo Mauring Lidres | **Approved** |
| DEC-002 | Re-authentication method for signing? | A) Password; B) Email OTP; C) TOTP MFA; D) Org-configurable | **D) Org-configurable; default password re-entry for v1** | High | Low–Medium | Medium | Carlo Mauring Lidres | **Approved** |
| DEC-003 | MFA scope for v1? | A) Not in v1; B) Optional per org; C) Required for admins | **A) Not in v1; MFA-ready structure only** | Medium | Low | Low deferral | Carlo Mauring Lidres | **Approved** |
| DEC-004 | Maximum PDF upload size? | A) 10 MB; B) 25 MB; C) 50 MB; D) Org-configurable | **D) Org-configurable; 25 MB suggested default per org (DEC-004a)** | Medium | Org-dependent | Medium — admin UI + validation per org | Carlo Mauring Lidres | **Approved** |
| DEC-005 | Multi-tenancy / organization model? | A) Single org; B) Multi-org one org/user; C) Multi-org multi-membership | **C) Multi-org SaaS; users may belong to multiple orgs with org switcher** | Critical | Medium | High | Carlo Mauring Lidres | **Approved** |
| DEC-006 | Default rejection behavior? | A) Terminate; B) Return; C) Per-route configurable | **C) Per-route configurable; default return for revision on approval workflows** | Medium | None | Medium | Carlo Mauring Lidres | **Approved** |
| DEC-007 | Return-for-revision resubmission path? | A) Same draft version; B) Always new version; C) Owner chooses | **B) Always create new document version** | High | None | Medium | Carlo Mauring Lidres | **Approved** |
| DEC-008 | Delegation permissions? | A) Assignees only; B) Assignees + admins; C) Per-step flag | **C) Per-step `delegation_allowed` flag** | Medium | None | Low | Carlo Mauring Lidres | **Approved** |
| DEC-009 | Document retention default? | A) 1 year; B) 7 years; C) Indefinite; D) Org-configurable | **D) Org-configurable (suggest 7 years default for regulated use)** | Medium | Storage over time | Medium | Carlo Mauring Lidres | **Approved** |
| DEC-010 | Audit log retention? | A) Match document; B) ≥ document; C) Indefinite | **B) ≥ document retention; never shorter than document retention** | High | Storage | Low | Carlo Mauring Lidres | **Approved** |
| DEC-011 | Email provider? | A) Resend; B) SendGrid; C) Nhost; D) Mock-only v1 | **D) Mock-only v1; production: Resend (DEC-011a)** | Medium | None v1 | Low v1; Resend before production | Carlo Mauring Lidres | **Approved** |
| DEC-012 | Malware scanning? | A) None; B) ClamAV; C) Cloud API; D) Placeholder | **D) Placeholder v1; block non-PDF uploads** | Medium | None v1 | Low v1 | Carlo Mauring Lidres | **Approved** |
| DEC-013 | Rate limit thresholds? | A) Platform defaults; B) Per-endpoint; C) None v1 | **B) Documented per-endpoint rate limits** | High | None | Low | Carlo Mauring Lidres | **Approved** |
| DEC-014 | Audit integrity hash algorithm? | A) SHA-256 canonical JSON; B) Hash chain; C) HMAC | **A) SHA-256 of canonical JSON payload** | High | None | Low | Carlo Mauring Lidres | **Approved** |
| DEC-015 | Public verification page? | A) Fully public; B) Auth required; C) Public ID+code | **C) Public with certificate ID + verification code; rate limited** | Medium | Low | Medium Phase 8 | Carlo Mauring Lidres | **Approved** |
| DEC-016 | Signature image storage? | A) R2 org-scoped; B) DB blob; C) On-the-fly only | **A) R2 org-scoped paths per user profile** | Medium | R2 storage | Low | Carlo Mauring Lidres | **Approved** |
| DEC-017 | Time zone handling? | A) UTC store + user display; B) UTC only; C) Org TZ | **A) Store UTC; display in user timezone** | Low | None | Medium UI | Carlo Mauring Lidres | **Approved** |
| DEC-018 | Backup requirements? | A) Provider only; B) Runbook only; C) Provider + runbook; D) Scheduled export | **C) Rely on Nhost/R2 provider backup + documented export/restore runbook** | Medium | None | Low documentation | Carlo Mauring Lidres | **Approved** |
| DEC-019 | Production deployment order? | A) Frontend first; B) Backend first; C) Staged | **C) Staged: Nhost dev → Worker dev → Pages staging** | High | None | Process | Carlo Mauring Lidres | **Approved** |
| DEC-020 | Parallel majority rule? | A) floor(N/2)+1; B) ≥50%; C) Configurable | **A) Strict majority: floor(N/2)+1** | Low | None | Low | Carlo Mauring Lidres | **Approved** |
| DEC-021 | Signed URL TTL? | A) 5 min; B) 15 min; C) Configurable | **A) 5 minutes default** | Medium | None | Low | Carlo Mauring Lidres | **Approved** |
| DEC-022 | Local dev auth fallback? | A) Always; B) Env flag; C) Remove | **B) Only when `VITE_ALLOW_LOCAL_AUTH=true`** | High | None | Low | Carlo Mauring Lidres | **Approved** |
| DEC-023 | Idempotency for sign/advance? | A) Required; B) Optional; C) None | **A) Required `Idempotency-Key` header** | Critical | None | Medium Worker | Carlo Mauring Lidres | **Approved** |
| DEC-024 | Data residency / region? | A) Default Nhost region documented; B) Specific region | **A) Default Nhost region; document in DEPLOYMENT.md at project creation (DEC-024a)** | Medium | Plan-dependent | Low | Carlo Mauring Lidres | **Approved** |

---

## Deviations from review recommendations

| Decision ID | Review recommended | Owner approved | Follow-up |
|---|---|---|---|
| DEC-004 | 25 MB global default, org-configurable | Org-configurable; **25 MB org onboarding default (DEC-004a)** | Resolved |
| DEC-011 | Resend or Nhost email | Mock-only v1; **Resend at production (DEC-011a)** | Resolved — in-app notifications still required v1 |

---

## Follow-up decisions (approved — suggested defaults)

| ID | Question | Approved option | Approved by | Date | Notes |
|---|---|---|---|---|---|
| DEC-004a | Suggested org default PDF limit when org is created? | **25 MB** as org onboarding default (org-configurable; not a global hard cap) | Carlo Mauring Lidres | 2026-07-01 | Matches review suggestion; admins may change per org |
| DEC-011a | Production email provider (when mock-only ends)? | **Resend** (preferred); evaluate Nhost built-in at cutover if sufficient | Carlo Mauring Lidres | 2026-07-01 | Mock-only remains v1 per DEC-011; wire Resend before production |
| DEC-024a | Specific Nhost region for data residency? | **Default Nhost region**; document chosen region in `DEPLOYMENT.md` when project is created | Carlo Mauring Lidres | 2026-07-01 | Revisit if PH Data Privacy requires a specific region |

---

## Decision Priority Order (completed)

All 24 primary decisions and follow-ups **DEC-004a**, **DEC-011a**, **DEC-024a** are **Approved**.

---

## Approval Record

| Decision ID | Approved option | Approved by | Date | Notes |
|---|---|---|---|---|
| DEC-001 – DEC-024 | See table above | Carlo Mauring Lidres | 2026-07-01 | Recorded via baseline review questionnaire |
| DEC-004a, DEC-011a, DEC-024a | Suggested defaults | Carlo Mauring Lidres | 2026-07-01 | Owner confirmed "use suggested defaults" |

---

## Next steps

1. Revise `agent-history/version-0-baseline.md` to reflect approved decisions (especially DEC-001 PostgreSQL-first path).
2. Update `AGENTS.md`, `CONTEXT.md`, `DATA_MAP.md`, and `PLAN.md` to remove SQLite-first application schema gate.
3. Resolve session timeout conflict (15 min) and document status enum (`awaiting_action`) in baseline revision.
4. Do not begin Phase 4 schema implementation until baseline revision is approved.

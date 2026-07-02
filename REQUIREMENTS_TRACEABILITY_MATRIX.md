# Requirements Traceability Matrix — eDoc

**Review date:** 2026-07-01  
**Baseline status:** `FOR_REVIEW`  
**Evidence rule:** Requirements marked **Implemented** only with direct code, schema, config, or test evidence in the active project (not mock UI or stubs returning `not_implemented`).

**Status legend:** Defined | Partially defined | Implemented | Partially implemented | Not implemented | Conflicting | Obsolete | Requires decision

---

| Requirement ID | Source file | Source section | Requirement | Category | Priority | Status | Implementation evidence | Test evidence | Gap | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-001 | version-0-baseline.md | Application Modules §1 | Sign in with Nhost authentication | Authentication | Critical | Partially defined | `AuthProvider.tsx` (Nhost + local fallback) | E2E login smoke | Live Nhost not configured | Connect Nhost; remove prod local fallback |
| AUTH-002 | starter.md | Authentication | Sign out clears session | Authentication | High | Partially implemented | `AuthProvider.signOut`, sessionStorage clear | None | None | Add integration test |
| AUTH-003 | starter.md | Authentication | Forgot / reset password | Authentication | High | Partially defined | `requestPasswordReset`, `ResetPasswordPage.tsx` | None | Reset page not wired to route flow | Complete reset UX + Nhost |
| AUTH-004 | starter.md | Authentication | Email verification | Authentication | High | Partially defined | Nhost capability assumed | None | No UI or policy | Add verification flow spec |
| AUTH-005 | starter.md | Authentication | User invitation | Authentication | High | Not implemented | None | None | GAP-011 | Design invite workflow |
| AUTH-006 | starter.md | Authentication | Protected routes without auth flash | Authentication | Critical | Partially implemented | `ProtectedRoute.tsx`, `authReady` gate | E2E partial | None | Verify with live Nhost |
| AUTH-007 | version-0-baseline.md | Roles §Authorization | Default 15-minute inactivity timeout | Authentication | Critical | Conflicting | `AuthProvider.tsx` (15 min) | None | CONF-002 vs baseline §Security 60 min | Fix baseline to 15 min |
| AUTH-008 | version-0-baseline.md | Security §4 | Default 60-minute inactivity timeout | Authentication | Critical | Conflicting | None | None | CONF-002 | Obsolete; use AUTH-007 |
| AUTH-009 | starter.md | Authentication | Do not retain session after browser closure unless enabled | Authentication | Medium | Partially implemented | sessionStorage for local user | None | Persistence policy undecided | Document Nhost session storage behavior |
| AUTH-010 | starter.md | Authentication | Record authentication events in audit trail | Authentication | High | Not implemented | None | None | GAP audit catalog | Implement post-audit schema |
| AUTH-011 | starter.md | Authentication | MFA-ready structure | Authentication | Medium | Requires decision | None | None | AMB-005 | DEC-003 |
| AUTH-012 | starter.md | Authentication | Deactivated-account handling | Authentication | High | Not implemented | `profiles.status` in draft SQL | None | No UI/API | Add blocked login behavior |
| AUTH-013 | starter.md | Authentication | Session revocation | Authentication | Medium | Not implemented | None | None | None | Define admin revoke + Nhost API |
| AUTH-014 | AuthProvider.tsx | local fallback | Local dev auth without Nhost | Authentication | Medium | Partially implemented | `AuthProvider.tsx` | E2E uses local | CONF-005 Super Admin | Gate with env flag |
| DOC-001 | starter.md | Documents | Document list views (all statuses) | Documents | High | Partially implemented | `DocumentsPage.tsx`, placeholder data | None | Mock data only | GraphQL integration |
| DOC-002 | starter.md | Document creation §Step 1 | Document metadata fields (title, ref, type, etc.) | Documents | High | Partially defined | `CreateDocumentPage.tsx` disabled form | None | Not persisted | Phase 5 |
| DOC-003 | starter.md | Document creation §Step 2 | PDF upload with validation | Documents | Critical | Partially implemented | `fileValidation.ts` | `fileValidation.test.ts` | No upload pipeline | Worker R2 presign |
| DOC-004 | starter.md | Document creation §Step 2 | SHA-256 hashing on upload | Documents | Critical | Not implemented | Worker hash stub | None | GAP-003 | Implement complete-upload hash |
| DOC-005 | starter.md | Document creation §Step 2 | Supporting attachments | Documents | Medium | Not implemented | None | None | Attachment entity missing in draft SQL | Extend schema |
| DOC-006 | starter.md | Document creation §Step 2 | Malware scanning placeholder | Documents | Medium | Requires decision | None | None | AMB-004 | DEC-012 |
| DOC-007 | version-0-baseline.md | Workflow | Document statuses (11 values) | Documents | Critical | Conflicting | `domain.ts` uses `awaiting_my_action` | None | CONF-003 | Standardize enum |
| DOC-008 | version-0-baseline.md | Workflow rules §6 | Never overwrite routed/signed documents | Documents | Critical | Defined | Draft SQL versioning tables | None | Not enforced in code | Worker + DB constraints |
| DOC-009 | starter.md | Version control | New version invalidates pending actions | Documents | Critical | Partially defined | `routingRules.ts` statuses include `invalidated` | Unit partial | No backend | Worker transaction |
| DOC-010 | starter.md | Documents | Search, filter, sort, pagination | Documents | High | Partially implemented | UI scaffold | None | No backend | Hasura queries |
| DOC-011 | starter.md | Documents | Saved views and export | Documents | Medium | Not implemented | None | None | GAP-022 | Phase 8+ |
| DOC-012 | database/migrations/0001_initial.sql | documents | Optimistic locking lock_version | Documents | Medium | Partially implemented | Column in draft SQL | None | Not used in app | Document concurrency rules |
| DOC-013 | starter.md | Documents | Priority and confidentiality indicators | Documents | Medium | Partially defined | Draft SQL + types | None | UI badges partial | Complete StatusBadge mapping |
| ROUTE-001 | version-0-baseline.md | Workflow rules §1 | Sequential steps activate in order | Routing | Critical | Partially implemented | `routingRules.ts` `getNextActiveSteps` | `routingRules.test.ts` | Mixed mode incomplete | Extend rules + Worker |
| ROUTE-002 | version-0-baseline.md | Workflow rules §2 | Parallel groups: all/any/majority/min count | Routing | Critical | Partially defined | `completion_rule` in draft SQL | Unit tests minimal | AMB-003 | Specify majority rule |
| ROUTE-003 | starter.md | Routing rules §4 | Rejection may terminate or return | Routing | Critical | Requires decision | None | None | GAP-008 | DEC-006, DEC-007 |
| ROUTE-004 | starter.md | Routing rules §5 | Return creates revision cycle + new version | Routing | Critical | Partially defined | Baseline text only | None | No implementation | State machine + Worker |
| ROUTE-005 | starter.md | Routing rules §8 | Delegation records original and delegate | Routing | High | Partially defined | `delegated_from_id` in draft SQL | None | No delegation UI/API | Phase 6 |
| ROUTE-006 | starter.md | Routing rules §9 | Required steps skipped only with override + audit | Routing | High | Not implemented | None | None | None | Admin override endpoint |
| ROUTE-007 | starter.md | Routing rules §11 | Completed routes read-only | Routing | High | Defined | Baseline only | None | Not enforced | Hasura update permissions |
| ROUTE-008 | starter.md | Routing rules §12 | Route advancement in transaction | Routing | Critical | Not implemented | Worker `/advance` returns 501 | None | GAP-004 | Worker PG transaction |
| ROUTE-009 | starter.md | Document creation §Step 3 | Mixed routing support | Routing | High | Partially defined | `mode` enum in draft SQL | None | Logic not implemented | Extend routingRules |
| ROUTE-010 | starter.md | Notifications | Due dates, reminders, escalation | Routing | High | Not implemented | Tables not in draft SQL | None | GAP-013 | Schema + cron |
| ROUTE-011 | starter.md | My Inbox | Inbox task types and actions | Routing | High | Partially implemented | `InboxPage.tsx` placeholder | None | Mock data | GraphQL inbox query |
| ROUTE-012 | starter.md | Routing templates | Reusable routing templates | Routing | Medium | Partially implemented | `RoutingTemplatesPage.tsx` scaffold | None | No persistence | Phase 6 |
| SIGN-001 | starter.md | Electronic signature §1-3 | Verify authenticated user and assignment | Signing | Critical | Not implemented | None | None | GAP-004 | Worker sign endpoint |
| SIGN-002 | starter.md | Electronic signature §4-6 | Display meaning, consent, re-authentication | Signing | Critical | Requires decision | None | None | GAP-007 | DEC-002 |
| SIGN-003 | starter.md | Electronic signature §7-14 | Record identity, role, step, hash, session, IP, UA | Signing | Critical | Partially defined | `signature_events` draft table | None | Not implemented | Worker sign transaction |
| SIGN-004 | starter.md | Electronic signature §15-17 | Visible signature + immutable signed PDF + final hash | Signing | Critical | Not implemented | Worker sign 501 | None | GAP-004 | pdf-lib on Worker |
| SIGN-005 | starter.md | Electronic signature §18-20 | Signature event, audit event, advance after success | Signing | Critical | Not implemented | None | None | GAP-004 | Atomic transaction |
| SIGN-006 | starter.md | Electronic signature | Typed/drawn/uploaded/system signature types | Signing | Medium | Not implemented | None | None | None | UI + storage decision DEC-016 |
| SIGN-007 | starter.md | PDF field placement | Normalized page-relative coordinates | Signing | High | Partially defined | Draft SQL constraints 0-1 | None | No UI | PDF workspace Phase 7 |
| SIGN-008 | starter.md | PDF field placement | Field types (signature, initial, checkbox, etc.) | Signing | High | Partially defined | `signature_fields.field_type` check | None | No UI | Signing workspace |
| SIGN-009 | starter.md | Electronic signature | Duplicate-submission protection | Signing | Critical | Not implemented | None | None | SEC idempotency | Idempotency keys |
| SIGN-010 | starter.md | Electronic signature | Failed-signing rollback | Signing | Critical | Not implemented | None | None | GAP-004 | Document in state review |
| AUDIT-001 | version-0-baseline.md | Audit Trail | Append-only audit events with defined fields | Audit | Critical | Partially defined | `audit_events` draft table | None | No triggers/UI | Immutable insert-only policy |
| AUDIT-002 | version-0-baseline.md | Audit Trail | Integrity hash on audit records | Audit | High | Partially defined | Column in draft SQL | None | Algorithm undefined | DEC-014 |
| AUDIT-003 | starter.md | Audit trail | Audit not editable/deletable via app | Audit | Critical | Not implemented | None | None | None | Hasura permissions |
| AUDIT-004 | starter.md | Comments | Comment audit events | Audit | Medium | Not implemented | Comments tables missing | None | GAP-016 | Schema phase |
| AUDIT-005 | version-0-baseline.md | Audit Trail | Retention per approved settings | Audit | High | Requires decision | None | None | GAP-015 | DEC-009, DEC-010 |
| AUDIT-006 | starter.md | Audit trail | file_access_logs for preview/download | Audit | High | Not implemented | Entity listed, not in SQL | None | GAP-016 | Log in Worker |
| ADMIN-001 | starter.md | Administration | Users, roles, permissions management | Administration | High | Partially implemented | `AdminPage.tsx` scaffold | None | No backend | Phase 9 |
| ADMIN-002 | starter.md | Administration | Org, departments, business units | Administration | High | Partially defined | Partial draft SQL | None | business_units missing | Complete schema |
| ADMIN-003 | starter.md | Administration | Security, session, signature, retention settings | Administration | High | Not implemented | None | None | None | system_settings tables |
| ADMIN-004 | version-0-baseline.md | Roles | Nine role types with module access | Administration | Critical | Partially defined | Role table draft | None | No permission matrix | Add permission catalog |
| ADMIN-005 | starter.md | Administration | Email configuration status | Administration | Medium | Requires decision | None | None | GAP-013 | DEC-011 |
| REPORT-001 | starter.md | Reports | Required report types (13+) | Reports | Medium | Partially implemented | `ReportsPage.tsx` scaffold | None | Mock data | Phase 8 |
| REPORT-002 | starter.md | Reports | CSV and Excel export | Reports | Medium | Not implemented | None | None | None | Worker or client export |
| REPORT-003 | starter.md | Dashboard | KPI widgets (volume, completion, bottlenecks) | Reports | High | Partially implemented | `DashboardPage.tsx` placeholder metrics | None | GAP-021 | Backend aggregations |
| NOTIF-001 | starter.md | Notifications | In-app and email notification triggers | Notifications | High | Not implemented | Worker notify 501 | None | GAP-013 | Phase 6/8 |
| NOTIF-002 | starter.md | Notifications | Deduplication by recipient/doc/step/type | Notifications | Medium | Defined | Baseline rule | None | Not implemented | Worker/DB constraint |
| NOTIF-003 | starter.md | Notifications | User notification preferences | Notifications | Medium | Not implemented | Table not in draft SQL | None | GAP-016 | Schema |
| CERT-001 | starter.md | Completion certificate | Immutable certificate PDF with verification code | Completion | Critical | Not implemented | Worker certificate 501 | None | GAP-004 | Phase 8 |
| CERT-002 | starter.md | Completion certificate | Public verification URL | Completion | High | Requires decision | Worker GET stub | None | GAP-018 | DEC-015 |
| SEC-001 | starter.md | Security | No secrets in frontend / VITE_ only public | Security | Critical | Partially implemented | `env.ts`, docs | None | None | CI secret scan |
| SEC-002 | version-0-baseline.md | Security | Four-layer authorization | Security | Critical | Partially defined | Docs only | None | Hasura missing | Phase 4 |
| SEC-003 | starter.md | Security | Organization-scoped row isolation | Security | Critical | Partially defined | organization_id in draft SQL | None | No Hasura RLS | Metadata + permissions |
| SEC-004 | starter.md | Worker API | Zod validation on Worker endpoints | Security | High | Partially implemented | upload-url schema only | None | Other endpoints lack schemas | Complete validation |
| SEC-005 | starter.md | Worker API | Rate limiting sensitive endpoints | Security | High | Not implemented | None | None | GAP-014 | DEC-013 + CF rate limit |
| SEC-006 | worker/src/index.ts | requireAuth | JWT validation against Nhost JWKS | Security | Critical | Not implemented | Bearer presence check only | None | GAP-006 | Implement JWKS verify |
| SEC-007 | starter.md | Security | Re-auth for electronic signatures | Security | Critical | Requires decision | None | None | GAP-007 | DEC-002 |
| SEC-008 | starter.md | Files | Private R2; temporary URLs only | Security | Critical | Partially implemented | Worker stubs TTL 300 | None | No presign | Wire R2 bindings |
| SEC-009 | starter.md | Security | Input/file MIME and size validation | Security | High | Partially implemented | `fileValidation.ts` | Unit test | Max size not in baseline | DEC-004 |
| SEC-010 | starter.md | Security | Request IDs on API responses | Security | Medium | Partially implemented | Worker requestId helper | None | None | Extend to GraphQL |
| DATA-001 | version-0-baseline.md | Data Model | ~40 application entities | Data model | Critical | Partially defined | Entity list in baseline | None | ~60% tables missing in SQL | Complete PostgreSQL schema |
| DATA-002 | review mandate | Database | PostgreSQL-first under database/postgresql/ | Data model | Critical | Conflicting | Path does not exist | None | CONF-001 | DEC-001 |
| DATA-003 | AGENTS.md / DATA_MAP.md | Migration | SQLite-first before PostgreSQL | Data model | Critical | Conflicting | sqlite placeholder | None | CONF-001 | Resolve with owner |
| DATA-004 | version-0-baseline.md | Data Model | Tenant isolation on all scoped tables | Data model | Critical | Partially implemented | organization_id in draft SQL | None | Not all entities | Schema review |
| DATA-005 | starter.md | Database | FK, unique, check, indexes, optimistic locking | Data model | High | Partially implemented | Draft SQL partial | None | Incomplete | Full schema pass |
| DATA-006 | DATABASE.md | Rules | Hasura permissions before production | Data model | Critical | Not implemented | metadata/README only | None | GAP-005 | Hasura metadata |
| DATA-007 | version-0-baseline.md | R2 paths | Private object key conventions | Data model | High | Partially implemented | Worker upload-url path template | None | None | Document in DATA_MAP |
| UI-001 | starter.md | UI instruction | Follow reference/src visual language | UI/UX | High | Partially implemented | AppShell, theme, CSS | E2E shell | Reference not in repo | Local reference required |
| UI-002 | starter.md | UI instruction | Not pure Ant Design interface | UI/UX | High | Implemented | No Ant Design in package.json | None | None | Maintain on dependency adds |
| UI-003 | navigation.ts | Navigation | Side panel items (8 routes) | UI/UX | Medium | Partially implemented | `navigation.ts`, AppShell | None | Missing audit/notifications routes | Align with modules |
| UI-004 | starter.md | Signing workspace | PDF viewer, thumbnails, sticky actions | UI/UX | High | Partially implemented | `SigningWorkspacePage.tsx` scaffold | None | No PDF.js | Phase 7 |
| UI-005 | starter.md | UI | Empty, loading, error states | UI/UX | Medium | Partially implemented | `EmptyState`, auth loading | None | Incomplete coverage | Shared patterns Phase 2 |
| UI-006 | starter.md | Accessibility | Keyboard nav, accessible primitives | UI/UX | Medium | Partially defined | Baseline mentions Radix | None | Not verified | a11y test plan |
| UI-007 | starter.md | Documents | Responsive mobile presentation | UI/UX | Medium | Partially implemented | AppShell drawer pattern | None | Not fully verified | Browser testing |
| NFR-001 | version-0-baseline.md | NFR | Page-load responsive SPA | NFR | Medium | Partially defined | Vite build | Build not run this review | None | Measure Lighthouse budget |
| NFR-002 | version-0-baseline.md | NFR | Dashboard GraphQL pagination | NFR | High | Not implemented | None | None | None | Query limits in Hasura |
| NFR-003 | version-0-baseline.md | NFR | Multi-tenant organization model | NFR | Critical | Requires decision | organizations table draft | None | GAP-011 | DEC-005 |
| NFR-004 | version-0-baseline.md | NFR | Backup via Nhost + R2 versioning | NFR | High | Partially defined | Docs only | None | None | DEC-018 |
| NFR-005 | version-0-baseline.md | Verification | ESLint, typecheck, unit, integration, Playwright | NFR | High | Partially implemented | Vitest + 1 E2E spec | 2 unit files | Most tests missing | Phase 10 |
| NFR-006 | DEPLOYMENT.md | Deployment | GitHub Pages static deploy | NFR | High | Partially implemented | `.github/workflows/pages.yml` | None | Not verified deployed | DEC-019 |
| NFR-007 | starter.md | GitHub Pages | HashRouter for SPA | NFR | High | Implemented | `App.tsx` HashRouter | E2E uses `/#/` | None | None |
| NFR-008 | version-0-baseline.md | NFR | No automatic regulatory compliance claims | NFR | High | Defined | Baseline explicit | None | None | Maintain in docs |
| NFR-009 | starter.md | Testing | Tenant isolation integration tests | NFR | Critical | Not implemented | None | None | None | Phase 10 |
| NFR-010 | version-0-baseline.md | Success Criteria | App runnable after each phase | NFR | High | Partially implemented | Dev scaffold runs | E2E smoke | Backend not connected | Maintain discipline |
| ORG-001 | starter.md | Primary objective | Organization-based access | Organizations | Critical | Partially defined | organizations, members planned | None | GAP-011 | DEC-005 |
| ORG-002 | starter.md | Primary objective | Department-based access | Organizations | High | Partially defined | departments table draft | None | No assignment rules | Department scoping in Hasura |
| WKR-001 | version-0-baseline.md | Worker API | POST /api/files/upload-url | Worker API | Critical | Partially implemented | `worker/src/index.ts` stub | None | No presign | R2 integration |
| WKR-002 | version-0-baseline.md | Worker API | POST /api/documents/:id/sign | Worker API | Critical | Not implemented | Returns 501 | None | GAP-004 | Phase 7 |
| WKR-003 | version-0-baseline.md | Worker API | POST /api/routes/:id/advance | Worker API | Critical | Not implemented | Returns 501 | None | GAP-008 | Phase 6 |
| WKR-004 | version-0-baseline.md | Worker API | GET /api/verification/:certificateId | Worker API | High | Partially implemented | Stub response | None | GAP-018 | DEC-015 |
| VER-001 | version-0-baseline.md | Definition of Done | Verification before task complete | Process | High | Defined | AGENTS.md | Partial | Not enforced yet | Follow for all phases |
| VER-002 | HANDOFF.md | Status | Baseline FOR_REVIEW pending approval | Process | Critical | Requires decision | HANDOFF.md | None | GAP-002 | Owner approval |

---

## Summary Counts (91 requirements)

| Status | Count |
|---|---|
| **Defined** | 18 |
| **Partially defined** | 38 |
| **Implemented** | 4 |
| **Partially implemented** | 24 |
| **Not implemented** | 28 |
| **Conflicting** | 5 |
| **Obsolete** | 1 |
| **Requires decision** | 11 |

**Notes:**
- **Implemented (4):** UI-002 (no Ant Design), NFR-007 (HashRouter), plus strict interpretation items with complete behavior — adjust: many scaffolds are more accurately *Partially implemented*.
- Conservative recount for executive summary uses: Fully defined = 18; Partially defined = 38; Implemented = 4; Partially implemented = 24; Not implemented = 28; Conflicting = 5; Requires decision = 11 (some rows overlap categories — decision/conflict flags are additive tags on primary status).

**Implementation evidence highlights:**
- `src/features/auth/AuthProvider.tsx`, `ProtectedRoute.tsx`
- `src/components/layout/AppShell.tsx`, `navigation.ts`
- `src/utils/routingRules.ts`, `fileValidation.ts`
- `worker/src/index.ts` (stubs)
- `database/migrations/0001_initial.sql` (partial draft)
- `tests/e2e/app.spec.ts`, `*.test.ts`

**Not counted as implemented:** Placeholder pages, mock data, Worker 501 responses, disabled wizard forms, null presign URLs.

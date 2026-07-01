# Active Plan — Workflow App UX Simplification

Last Updated: `2026-06-27`
Plan Owner: `AI Agent`
Status: `COMPLETE`

## Objective

Redesign the local workflow app (`workflow-app/`) around a simpler owner → AI → baseline → feedback → debugging → handoff flow. Preserve existing SQLite records, baseline snapshots, audit trail, handoff queue, preview inspector, and zero-runtime-dependency constraints. Do not rebuild from scratch.

## Task Restatement and Acceptance

- Objective restated: Add a conversational **Project Brief** entry point, AI structuring into requirements, clearer baseline approval UX, simplified navigation, an actionable dashboard with **Continue Workflow**, and improved UI/UX + debugging task generation—while retaining all existing data and core features.
- Acceptance criteria source: `USER_REQUEST`
- Essential context status: `READY`
- Instruction conflicts: `NONE`

## Approval and GxP Gate

- GxP impact: `INDIRECT` (baseline approval and audit trail; no weakening of controls)
- Approved task plan: `NOT_REQUIRED` (local workflow tooling; not regulated product behavior)
- Approval status: `NOT_REQUIRED`

## Ponytail Simplicity Gate

Chosen rung: `REUSE` — extend existing stdlib server, SQLite schema (additive), `app.js` views, attachment store, OpenAI proxy, and baseline snapshot logic rather than new frameworks or dependencies.

## Current State Summary

| Area | Current implementation | Gap vs target |
|---|---|---|
| Navigation | 14 items in 6 groups (Dashboard, baseline, feedback, bug, queue, submissions, 5 stage views, comments, history, audit, settings) | Too many top-level items; stages overlap proposed flow |
| Project Brief | None; baseline is 9 fixed textarea fields | No conversational brief or multi-format attachments |
| AI — requirements | None | Need structured requirements generation with open questions / assumptions |
| AI — feedback/bug | `POST /api/ai/improve` with generic agent prompt | Needs phase-specific structured outputs; bug prompt must not state unverified root cause |
| Requirements & Baseline | Generic `stageView`; Approve creates snapshot | Missing explicit Submit/Update Baseline labels, change summary, expanded requirement sections |
| UI/UX Feedback | Preview proxy, inspector, composer, screenshots, AI improve | Largely meets target; rename nav label to **UI/UX Feedback** (done) |
| Debugging | `bugView` with auto-capture, structured fields | Rename **Bug Reports** → **Debugging**; tighten AI output schema |
| Handoff | Queue + Submission History + `handoff-queue.md` | Merge UI; add per-task export with scoped baseline context |
| Dashboard | Stat cards only | Missing project context, next action, recent activity, Continue Workflow |
| Attachments | Images only (`.png`, `.jpg`, `.gif`, `.webp`) on handoff entries | Brief needs PDF, Word, Excel, text files; reuse/dedupe |
| Drafts / autosave | `state.dirty` + beforeunload guard only | No persisted drafts |
| Baseline versions | `baseline_snapshots` + backups; active file always `version-0-baseline.md` | Need versioned markdown paths, change summaries, superseded status in UI |

## Proposed Workflow (Target)

```text
Dashboard → Project Brief → AI structure → Requirements & Baseline → approve baseline
    → UI/UX Feedback ──┐
    → Debugging ───────┼→ Generated Tasks / Handoff → agent execution
Project History ←──────┘ (comments, versions, audit, legacy stages)
Settings / Administration
```

### Step logic (Continue Workflow)

| Condition | Next step |
|---|---|
| No project brief or brief status `draft` | Project Brief |
| Brief submitted, requirements not generated | Project Brief → Process with AI |
| AI output exists, baseline not reviewed | Requirements & Baseline |
| Baseline draft exists, not approved | Requirements & Baseline → Submit/Update Baseline |
| Approved baseline, open UI/UX handoff items | UI/UX Feedback or Generated Tasks |
| Open debugging handoff items | Debugging or Generated Tasks |
| Pending handoff tasks | Generated Tasks |
| Otherwise | Dashboard (idle / maintenance) |

## Page and Component Map

| Target nav item | Action | Source |
|---|---|---|
| **Dashboard** | MODIFY | `loadDashboard()`, `/api/dashboard` |
| **Project Brief** | ADD | New view + API; conversational form + attachments |
| **Requirements & Baseline** | MODIFY | Dedicated view (fork from `stageView` baseline-only); expanded fields; baseline action buttons |
| **UI/UX Feedback** | RETAIN + polish | Existing `feedbackView`; minor copy/layout |
| **Debugging** | RENAME + MODIFY | Existing `bugView`; AI prompt/schema update |
| **Generated Tasks / Handoff** | MERGE | `queueView` + `submissionsView` + export actions |
| **Project History** | MERGE | `historyView` + `auditView` + `commentsView`; legacy stage records as tab |
| **Settings** | RETAIN | Existing `settingsView`; optional “Advanced workflow stages” link |
| Planning / Execution / Review / Deployment / Maintenance | HIDE (not delete) | Accessible under Project History → **Legacy stages** tab; data preserved |

## Implementation Phases

### Phase 1 — Navigation and dashboard (low risk)

**Goal:** Simpler IA and actionable dashboard without schema changes.

- Restructure sidebar to 8 primary items (+ collapsed Advanced).
- Dashboard cards: current project name, baseline version/status, pending counts, recent activity (audit + handoff, last 10), recommended next action.
- **Continue Workflow** button → `setView(nextStep)` from server-computed `recommended_view`.
- Extend `/api/dashboard` with: `project_title`, `baseline_status`, `brief_status`, `recommended_view`, `recent_activity[]`.

**Files:** `index.html`, `app.js`, `styles.css`, `server.py` (dashboard only)

### Phase 2 — Project Brief (schema + AI)

**Goal:** Conversational project intake with attachments and AI structuring.

**Schema (additive):**

```sql
CREATE TABLE project_briefs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Project Brief',
  description TEXT NOT NULL DEFAULT '',
  workflow_notes TEXT NOT NULL DEFAULT '',
  features_notes TEXT NOT NULL DEFAULT '',
  additional_instructions TEXT NOT NULL DEFAULT '',
  ai_structured_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'converted')),
  baseline_record_id TEXT,
  content_hash TEXT NOT NULL DEFAULT '',
  submitter TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (baseline_record_id) REFERENCES workflow_records(id)
);

-- Extend attachments: add parent_type + parent_id (nullable handoff_entry_id for backward compat)
-- OR new reference_attachments table linked to brief_id with content_hash for dedupe
```

**API:**

- `GET/POST/PUT /api/brief` — CRUD draft brief
- `POST /api/brief/attachments` — upload reference files
- `GET /api/brief/attachments/:id/file` — serve file
- `POST /api/ai/structure-requirements` — ChatGPT JSON output:

```json
{
  "project_objective": "",
  "scope": "",
  "functional_requirements": [],
  "non_functional_requirements": [],
  "user_roles": [],
  "user_workflows": [],
  "business_rules": [],
  "ui_ux_expectations": [],
  "technical_considerations": [],
  "constraints": [],
  "assumptions": [],
  "open_questions": [],
  "acceptance_criteria": []
}
```

**AI rules:** Never invent facts; unknowns → `open_questions` or `assumptions`. Include extracted text from `.txt`, `.md`, `.csv` attachments; binary files referenced by name only.

**Attachments (extend `ATTACHMENT_EXTENSIONS`):** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.md`, `.csv` (store all; extract text stdlib-only for plain-text types).

**UI:** Single scrollable conversational page—not a rigid multi-step wizard. Autosave draft to SQLite on debounced input (2s). Attachment library with dedupe by `content_hash`.

**Files:** `schema.sql`, `validate_schema.py`, `server.py`, `index.html`, `app.js`, `styles.css`, `smoke_test.py`

### Phase 3 — Requirements and Baseline

**Goal:** Load AI output into editable baseline; explicit approval workflow.

- Expand `FIELD_DEFINITIONS["baseline"]` to align with AI sections (map arrays to bullet lists in textareas).
- **Load from brief** button: populate baseline fields from `ai_structured_json`; mark open questions inline for user answers.
- Replace generic Approve with context-aware buttons:
  - No approved snapshot → **Submit Baseline**
  - Active snapshot exists, draft changes → **Update Baseline** (save draft) + **Submit Updated Baseline** (approve → new snapshot)
- Approval modal: required **Summary of changes** field stored in `approvals.notes` and snapshot metadata.
- Baseline markdown: write `agent-history/version-{N}-baseline.md` where N = `snapshot_number`; keep `version-0-baseline.md` as symlink/copy of active or document active path in dashboard.
- UI: section cards with edit/add/remove list items for requirements; revision history panel (existing).

**Files:** `server.py`, `app.js`, `index.html`, `styles.css`, `render_baseline_markdown`

### Phase 4 — UI/UX Feedback and Debugging polish

**Goal:** Phase-specific AI schemas and clearer labels.

- Rename nav **Bug Reports** → **Debugging**.
- Split AI prompts:
  - `feedback` → implementation task (page, current/expected behavior, design, responsive, a11y, acceptance criteria)
  - `bug` → debugging task (severity, repro, evidence, areas to inspect, diagnostic steps; **suspected cause** only if labeled `unverified`)
- Optional: embed compact preview toolbar on Debugging page (reuse preview functions) so bug flow does not require visiting Feedback first.
- Handoff markdown: include structured fields from new AI JSON keys.

**Files:** `server.py` (`improve_text` → phase prompts), `app.js`, `index.html`

### Phase 5 — Generated Tasks and Project History

**Goal:** Merge related views; token-efficient agent export.

- **Generated Tasks** tabbed view: Open | All | Completed; detail drawer with full instruction + copy/export.
- `POST /api/handoff/:id/export` → write scoped task file under `agent-workflow/tasks/{reference_id}.md` containing: objective, context, relevant baseline sections (by category tag, not full baseline), attachment paths, affected files/routes, constraints, acceptance criteria, validation commands placeholder, status.
- **Project History** tabs: Baseline versions | Handoff submissions | Comments | Audit | Legacy stages.
- Remove duplicate top-level nav entries; keep routes as `setView` aliases for bookmark compatibility.

**Files:** `app.js`, `index.html`, `server.py`, `styles.css`

### Phase 6 — Design modernization

**Goal:** SaaS-style polish without new dependencies.

- CSS variables for spacing scale, elevation, motion tokens.
- `@media (prefers-reduced-motion: reduce)` disables transitions.
- Card layout, empty states, loading skeletons on AI calls, success/warn/error toasts (existing message bar enhanced).
- Responsive sidebar → collapsible drawer on `<768px`.
- Subtle hover/focus transitions only.

**Files:** `styles.css`, minor markup in `index.html`

## Database Migration and Data Preservation

| Change | Type | Preservation |
|---|---|---|
| `project_briefs` table | ADDITIVE | N/A (new) |
| `reference_attachments` or extended `attachments` | ADDITIVE | Existing handoff attachments unchanged |
| `baseline_snapshots` metadata (change_summary column) | ADDITIVE nullable column | Existing snapshots retain empty summary |
| `workflow_records` types | NO CHANGE | All stage records remain queryable |
| `handoff_entries` | NO CHANGE | All records remain |
| Versioned baseline markdown paths | BEHAVIOR | Copy current `version-0-baseline.md` to snapshot backup pattern already exists; add numbered files going forward |

**Rollback:** Drop new tables/columns only on fresh DB; production rollback = restore SQLite backup + git revert.

## Reuse Checklist (do not reimplement)

- SQLite store, immutable versions, audit events
- Baseline snapshot + backup mechanism
- Handoff entry lifecycle, content-hash dedupe, queue markdown
- Preview proxy + `inspector.js`
- OpenAI proxy via stdlib `urllib`
- Attachment storage under `data/attachments/`
- Smoke test and schema validation scripts

## Expected Files

| Path | Expected change |
|---|---|
| `workflow-app/database/schema.sql` | `project_briefs`, attachment parent linkage, optional `change_summary` on snapshots |
| `workflow-app/server.py` | Brief API, structure-requirements AI, dashboard workflow state, baseline versioning, export endpoint, attachment types |
| `workflow-app/static/index.html` | Nav restructure, new brief view, merged history/tasks views |
| `workflow-app/static/app.js` | View routing, brief composer, autosave, baseline load/approve UX, merged lists |
| `workflow-app/static/styles.css` | Modern SaaS layout, reduced-motion, responsive nav |
| `workflow-app/scripts/validate_schema.py` | New table/FK checks |
| `workflow-app/scripts/smoke_test.py` | Brief → AI mock → baseline → handoff path |
| `agent-workflow/CODEMAP.md` | Update paths after implementation |
| `agent-workflow/HANDOFF.md` | Record completion and verification |

## Security and Compliance Impact

`AUDIT | DATA_INTEGRITY`

- No API keys in frontend; brief attachments served only via authenticated-local trust model (unchanged).
- AI must not invent requirements or confirm unverified bug causes.
- Baseline immutability via version append + snapshot backups preserved.
- Preview proxy trust boundary unchanged.

## Verification Plan

- [ ] `python workflow-app/scripts/validate_schema.py`
- [ ] `python workflow-app/scripts/smoke_test.py` (extended)
- [ ] Manual: brief + attachments → AI structure → edit requirements → Submit Baseline → Update Baseline → UI/UX feedback task → Debugging task → export scoped handoff
- [ ] Manual: legacy stage records visible under Project History
- [ ] Manual: responsive layout + prefers-reduced-motion
- [ ] Confirm existing SQLite records load after migration

## Risks and Blockers

| Risk | Mitigation |
|---|---|
| Binary document content not extractable without dependencies | Store files; extract plain text only; list binaries in AI context as references; open questions for missing detail |
| OpenAI API unavailable | Graceful fallback; manual baseline entry still works |
| Large brief attachments | Existing 5 MB limit; dedupe by hash |
| Baseline path change breaks agent docs | Keep `version-0-baseline.md` as active canonical file; numbered files are historical |

## Out of Scope (this plan)

- Authentication / multi-user
- Supabase sync
- Full PDF/Word parsing libraries
- Removing legacy workflow stage **data** (hidden only)

## Next Action

Begin **Phase 1** (navigation + dashboard) after plan approval, then proceed phase-by-phase with verification between phases.

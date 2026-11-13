# Trillionaire Me Unified Upgrade Blueprint

Status: planning only; major v2 implementation is not authorized in this task.

Architecture rule: **REUSE → EXTEND → MERGE → NEW only when necessary → DEFER**.

## Product outcome

The app should help one person capture a thought, find it later, place it in the right venture or life area, see the next sensible action, adapt the plan when reality changes, and compare estimates without turning them into facts. The ambition remains a North Star, never a promised financial result.

## Architecture decision

Keep the existing strict TypeScript PWA, pure `src/core` rules, adapter boundaries, Dexie/IndexedDB persistence, demo/real namespaces, local-first consent, versioned migration, and EN/BN/Mix UI. Add capability through narrow contracts:

1. **Record layer:** continue using `TMRecord` and catalog-defined fields. Add fields/entities only with schema version, migration, backup/restore and demo/real tests.
2. **Relationship layer:** introduce a pure derived graph over existing goal, venture, project, task, habit, resource and dependency fields. Do not force every record into one tree.
3. **Recall layer:** one index derives searchable summaries and lifecycle states from existing records; source records remain authoritative.
4. **Guidance layer:** deterministic rules return `recommendation + reasons + missing inputs + source/date`, never silent mutation.
5. **Scenario layer:** a separate `scenario` aggregate stores assumptions and results as estimates. It cannot write FACT/ACTUAL fields.
6. **Apply layer:** “Apply to my plan” produces a proposed diff and uses the existing Reality-Changed/PlanVersion approval path.
7. **Presentation layer:** routes consume pure view models; charts always have textual equivalents; expensive recalculation is debounced or explicit-run.

## Shared data model additions (proposed)

These are contracts for later approved packages, not code in this integration.

| Concept | Minimal shape | Safety rule |
|---|---|---|
| Lifecycle metadata | `state: inbox|active|waiting|paused|done|archived`, `changedAt`, optional `reason` | Archive never deletes; previous intent remains in history. |
| Relationship edge | `fromId`, `toId`, `kind: part_of|supports|depends_on|shared_with|blocks`, namespace | Validate same namespace; deletion previews dangling edges. |
| Recall document | derived `recordId`, title, type, status, venture/goal links, searchable text, dates | Rebuildable index; never a second source of truth. |
| Domain pack | id/version, questions, templates, rules, formula references, guidance, locale text, source/review metadata | No invented benchmark; formulas use typed units and Unknown. |
| Scenario | id, scope links, horizon, assumptions, formula plug-ins, result snapshots, created/updated dates | Always ESTIMATE/SIMULATED; no automatic application. |
| Scenario comparison | scenario ids, normalized result rows, missing inputs, sensitivity notes | Compare like units/horizons only. |
| Plan proposal | scenario id, before snapshot, proposed changes, reasons, warnings | Explicit review and approval through plan history. |
| Experiment | hypothesis, 7/14-day window, evidence fields, stop rule, outcome | Gentle language; no streak, grade or shame mechanics. |

## Workflow and navigation

### P0 — Capture, recall and organization

Reuse `#/capture`, notes, goals, tasks and ventures. After save, offer three optional actions: **Keep in Inbox**, **Link**, **Do next**. A new Recall view filters by lifecycle, type, venture, goal and date; it searches local derived text only. “Paused” and “Archived” remain searchable. Duplicate suggestions show side-by-side and never merge automatically.

### P1 — Guided breakdown

Create one guided flow that calls existing goal worksheet, goal tree, backward plan, task/habit link and capacity rules. Ask only for the next missing essential input. Show a breadcrumb such as `Vision → Venture → Outcome → Project → Next action`, while shared work appears as a link, not a copied task.

### P2 — Context-aware guidance

Build a domain-pack registry around the existing sector/system/content patterns. The screen asks the user’s context, then shows only relevant questions and tools. Every suggestion includes “Why this appears” and “What is missing.” AI remains off.

### P3 — Universal simulation

Add `#/journey/simulations` as the standalone lab and a shared Quick Simulation sheet on relevant pages. Flow: choose scope → baseline/alternative/custom → enter typed assumptions → Run → results + text equivalent → compare → Save Scenario. “Apply to my plan” is separate and opens a diff; cancel changes nothing.

### P4 — Validation and adaptive support

Extend existing KPI/review/reality rules with 7/14-day experiments, bottleneck and sensitivity summaries, cross-goal impacts and assumption review. Results are evidence, not forecasts. The system proposes at most three calm options.

### P5 — Optional integrations

ERP, cloud sync, AI, marketing and public/staff editions stay off. Each needs a separate owner decision covering purpose, data sent, provider, cost, consent, retention, undo and release gate.

## 360px mobile examples

**Today:** header; one “Next action” card with reason; up to two secondary actions; blocked/review-needed line; collapsed venture summary; bottom tabs. No large dashboard grid.

**Recall:** search field; compact filter button with selected-count text; list cards showing title, type, lifecycle, venture/goal, last changed; one primary action per card. At 200% text, filters wrap vertically and no horizontal scrolling is allowed.

**Simulation:** sticky scenario name and Run button are avoided because they can obscure content. Each assumption is a labelled numeric input with unit and Unknown option. Results appear first as text, then an optional chart. Comparison becomes stacked cards at 360px.

**Guided breakdown:** one question per card; Back, Save for later and Continue; current context summary remains visible; no exhaustive form.

## Delivery phases and acceptance gates

| Phase | Deliverable | Entry dependency | Acceptance gate |
|---|---|---|---|
| 0A | Current-record inventory and recall index contract | Current schema/catalog | Index rebuild produces identical results; no source mutation; demo/real isolation. |
| 0B | Inbox lifecycle and Recall UI | 0A | Capture survives reload/offline; paused/archived searchable; delete remains separate and confirmed. |
| 0C | Cross-venture action clarity | 0B | Next action gives reason, blocker/wait state and review signal; no duplicate tasks created. |
| 1 | Guided goal breakdown | 0A | Existing worksheet/tree/backward/capacity functions are reused; shared links round-trip. |
| 2 | Domain-pack contract and first neutral packs | 1 | Versioned pack validates EN/BN/Mix, sources, units and Unknown behavior; no benchmark claims. |
| 3A | Pure scenario core and persistence | 0A, 2 | Scenario never changes FACT/ACTUAL records; unit/horizon validation; migration/backup tests. |
| 3B | Simulation Lab and Quick Simulation | 3A | 360px/200%/keyboard/TalkBack automation; textual equivalents; explicit Run; offline. |
| 3C | Plan-apply review | 3A, Reality Loop | Diff/approve/cancel/history/rollback tests; cancel is zero-write. |
| 4 | Experiments and adaptive review | 3C | Evidence vs estimate clear; at most three options; no shame mechanics. |
| 5 | Optional integrations | Separate owner approval | Provider-specific privacy, cost, consent, failure and rollback gate. |

## Cross-cutting acceptance suite

- Strict types, full unit/integration suite, plan/link checker, production build and required Chromium suite.
- 360px at 50/100/150% plus 200% stress; EN/BN/Mix; light/dark; reduced motion; keyboard focus.
- Offline cold start, reload persistence, failed write, interrupted update and restore/go-back.
- Demo/real isolation; vault on/off; encrypted/plain backup as applicable; export/import round-trip.
- Unknown is never coerced to 0; units and horizon are visible; estimates are labelled.
- No network before explicit consent/action; AI/cloud ports remain null by default.
- Physical Android/TalkBack and native Bangla review remain human gates and cannot be marked done by automation.

## Migration and recovery

Use additive schema versions only. Before any migration, save a recoverable snapshot; if snapshot or write-back fails, keep the old records untouched. New derived indexes must be disposable and rebuildable. Scenario exports need a versioned section that older builds reject truthfully rather than partially import. Rollback removes the new UI/index and preserves source records; scenario records may be exported before removal.

## Non-goals

- No duplicate app, framework rewrite or new cloud backend.
- No accounting ledger, ERP replacement, wealth guarantee or fabricated benchmark.
- No AI activation, provider spend, real-data transmission or public/staff release.
- No automatic deduplication, plan overwrite or scenario-to-fact conversion.
- No dropdown conversion in the Text Size Lock work.

## Explicit owner decisions before affected phases

1. Approve the phase/work package before implementation of the major upgrade.
2. For P3, approve the first scenario domains and whether saved scenarios are included in standard backup by default (recommendation: yes, clearly versioned, because they are user-created plans).
3. For P5 only, decide provider, purpose, data scope, consent, spend cap and retention.
4. Supply physical Android/TalkBack results and named Bangla review before a production-ready claim.

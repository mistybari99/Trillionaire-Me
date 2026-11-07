# Usability and model architecture recommendation

Date: 2026-11-05. Scope: independent source inspection and A/B design debate during `feat/usability-controls` work. This report recommends a target; it does not certify current implementation, performance, accessibility or release status. No application code was edited for this review.

## Recommendation

Keep a **domain-first, offline modular application**: existing goal/task/planning/money/Deen models and calculations, explicit application commands, a versioned local record store, and small reusable UI controls. Improve its boundaries incrementally. A Notion-style universal block model or framework rewrite has no demonstrated benefit for this phone-first personal app.

The present foundation fits the use case: TypeScript, local IndexedDB/Dexie, bundled fonts, explicit unknown/provenance states and mostly independent domain calculations. The main architectural weakness is that screen builders also coordinate mutations and global state. The main usability weakness is inconsistent control composition and useful destinations buried inside long screens. Those are addressable without replacing the core model.

## What was actually inspected

| Source | Observed evidence |
| --- | --- |
| [Autonomy charter](../../CLAUDE.md) | Phone-only Bangla owner, offline personal data, consent, theme history, unknown≠0 and private Deen constraints. Historical visual decisions were treated as context rather than proof of good usability. |
| [package.json](../../package.json), [app.ts](../../src/app.ts) | Vite/TypeScript, Dexie dependency, direct DOM/hash routes, some lazy screen imports, route-aware focus and full app subtree replacement on render. No React/native runtime is present. |
| [types.ts](../../src/core/types.ts), [entities.ts](../../src/schema/entities.ts), [catalog/types.ts](../../src/catalog/types.ts) | Generic `TMRecord` envelope, string entity/field keys, value-or-unknown union, provenance labels, privacy metadata, schema version 3, choice/multichoice distinction. |
| [goalTree.ts](../../src/core/goalTree.ts), [taskGoals.ts](../../src/core/taskGoals.ts) | Goal/subgoal/project hierarchy with one parent, task/habit multi-goal ID arrays, max five links, retained dangling IDs, distinct-task branch aggregation and unknown progress when no steps. |
| [repo.ts](../../src/core/repo.ts), [store.ts](../../src/core/store.ts), [persist.ts](../../src/core/persist.ts) | Async repository contract, synchronous memory/localStorage interface, namespace guards, serialized asynchronous mirroring, failure monitor and explicit flush. `LocalKV` directly accesses browser storage despite living under `core/`. |
| [dexie.ts](../../src/adapters/dexie.ts), [state.ts](../../src/ui/state.ts), [migrate.ts](../../src/core/migrate.ts) | IndexedDB record key `[ns+id]`, local snapshots, startup hydration/migration, UI preferences in localStorage, versioned migrations. Startup catches hydration and migration errors without returning an explicit readiness/error result to the caller. |
| [entry.ts](../../src/ui/entry.ts), [lifeUi.ts](../../src/ui/lifeUi.ts) | Active-namespace readers/writers and direct screen mutations. Some goal forms set saved text immediately after synchronous `put`, before asynchronous mirror completion. |
| [screens.ts](../../src/ui/screens.ts), [styles.css](../../src/ui/styles.css), [themes.ts](../../src/ui/themes.ts), [goalLinks.ts](../../src/ui/goalLinks.ts) | Implemented Action Desk hierarchy; mixed width/margin/height overrides and theme effects; goal picker uses branch toggles plus a single-part select even though the stored relationship supports multiple IDs. |

This was a focused architectural review, not a full import, security, migration or specification audit. Source can change while parallel implementation proceeds; identified patterns should be checked against the final diff.

## A/B chosen information architecture

Both agents independently considered work-first pages with stable shortcuts, a customizable dashboard, and a catalog/launcher-first experience. Both selected **work-first with a small stable shortcut block** after debate. The earlier Action Desk decision is refined rather than treated as unquestionable.

Today: priority storage/consent/security warnings → compact date/title/mode → four neutral navigation shortcuts **Plan / Goals / Money / Capture** → existing next-action reason where needed → today's actual agenda → due attention → secondary context/summaries/exploration. Remove repeated greeting/logo emphasis from the local header; retain a single meaningful page heading. No task reranking, duplicate task action or invented recommendation.

Journey: compact orientation/stage → directly reachable Plan and Goals → active goals → existing grouped planning/review/exploration tools and secondary stage context. Existing five tabs and supported routes remain. Dedicated money, personal context and Deen workspaces retain content-specific layouts.

The four shortcuts are practical defaults inferred from supported create/work/review flows, **not a claim about measured usage**. Customization and analytics are unnecessary to ship this improvement. At 360px, normal text may use 2×2 shortcuts; intrinsic sizing wraps to one column at 200%. Priority warnings can legitimately dominate the viewport.

Controls need roles rather than another blanket CSS patch: primary action, secondary action, navigation row/tile and choice control. Primary and secondary buttons within an action group share a 52px minimum, typography and alignment; their emphasis differs. Use 12px container-owned gaps; no automatic last-child spanning. Neutral navigation anchors are start-aligned, minimum 52px, with full labels. Choice rows can be 48px, compact utilities never below 44px. All heights are minimums, never text-clipping fixed heights. Theme-specific shape tokens preserve the other looks; Light Futuristic can use a coherent 12px button radius and existing purple.

A initially favored consistent 52px action geometry; B challenged applying identical visual prominence to all navigation and mutations. Agreement: consistent geometry inside an action group, distinct semantic roles, neutral shortcuts. B argued against customization persistence and catalog-first navigation; A agreed. Neither recommendation requires owner clarification to proceed.

## Target technical boundaries

Recommended dependency direction:

```text
route + screen + transient form draft
          ↓
application queries / validated commands
          ↓
existing pure domain rules + typed domain readers
          ↓
repository contract ← IndexedDB adapter / test adapter
```

Network/external providers remain adapters invoked only by explicitly supported features. They must not become prerequisites for local work. UI preferences are separate from domain records; form drafts are transient unless a supported explicit draft feature exists. The existing record envelope remains the storage/export format.

1. **Models:** retain current goals, tasks/habits, finance entries, profile/context, logs and source/provenance concepts. Add narrow typed readers/constructors for high-use models over `TMRecord`; do not convert every domain at once. Validate record shape at import/storage boundaries. A generic field catalog remains useful for intake/help, but should not decide the whole workspace layout.
2. **Queries:** derive screen read models from one active-namespace record snapshot. Keep progress/planning formulas in existing core functions. Profile before caching/indexing; repeated `allRecs()` scans are an observable pattern, not yet a measured bottleneck. Never persist redundant dashboard totals just to render them faster.
3. **Commands:** move mutating orchestration out of individual screen event handlers into small application operations such as updating goal placement, linking task goals and completing a task. Commands validate consent/namespace/cardinality, invoke the existing rules and return an explicit durable result. UI displays pending/success/failure based on that result.
4. **Storage:** keep IndexedDB as durable local storage with the current namespace key and snapshots. Preserve serialized ordering and latest-value retry. Make initialization return ready/degraded/failed rather than treating inaccessible persistence as an ordinary empty dataset. For truly atomic multi-record changes, introduce a narrow repository batch/transaction capability with adapter contract tests; do not assume the current single-record API provides atomicity.
5. **UI/state:** split large screen assembly by domain as it is changed; extract semantic control primitives before removing legacy selectors. Keep current DOM rendering unless testing demonstrates a framework is necessary. Local input state, focus and validation errors should survive unrelated redraws; preference accessors should not become business state. Feature-specific view models make this testable without depending on DOM structure.

An application-command layer is a target refinement, not an instruction to rewrite every handler in this usability PR. The current synchronous store can remain behind a compatibility adapter while high-risk save flows migrate.

## Cardinality: multi-select where the model supports it

Task/habit→goal is already many-to-many, represented by ID lists and the `goalIdsOf`/`withGoals` readers/writers. Goal→parent is one relationship constrained by hierarchy. Status, theme, language, duration and similar scalar choices remain single-select. Habit weekdays are a catalog `multichoice` field. No blanket conversion of dropdowns is appropriate.

The inspected goal picker can replace all selected IDs within a branch when its single-part select changes; toggling a root can clear every selected descendant. Replace that presentation with native checkboxes for **each actual selectable node**, visually grouped by root. A root's checkbox selects that root itself, not an implicit cascade. Count/validate the global five-ID limit, retain initial retired/dangling IDs and use the existing writer. Full titles must wrap; selected state must be visible without color alone. Selecting one sibling must not clear another. No storage/schema migration is required for this UI correction.

## Concrete risks and priorities

| Priority | Evidence/risk | Next refinement |
| --- | --- | --- |
| High | Direct screen `put` plus immediate saved message can acknowledge memory before IndexedDB durability. Existing failure banner does not make that message accurate. | Shared pending/durable-success/error command result; check current fixes before widening the change. |
| High | `initStorage()` catches hydration failures with an empty-start comment; an unreadable store can look like an ordinary empty app. This is a risk of misleading state, not proof of data loss. | Explicit startup readiness/error state; recovery path and banner; avoid writing defaults over uncertain data. |
| High | Generic `values` and string entity keys provide weak compile-time guarantees at domain edges; picker UI cardinality diverges from the stored model. | Typed domain readers/validated constructors plus ID-preserving checkbox presentation. |
| Medium | `RecordRepo` exposes individual mutations only; multi-record operations cannot infer transactional guarantees from it. | Inventory multi-record operations; add a narrow atomic operation only where consistency requires it. |
| Medium | Large `screens.ts`/global `state.ts` and full subtree render couple forms, routes and persistence. | Incremental feature modules, preserved draft/focus state, command/query seams; no mass rewrite. |
| Medium | CSS combines full-width global buttons, inline compact overrides, `!important` corrections and last-child spans. | Semantic control roles and container-owned layout; migrate changed surfaces, then remove obsolete rules after verification. |
| Lower | Browser `LocalKV` lives in `core/store.ts`; the folder is not wholly platform-free. | Move browser implementation behind an adapter when that boundary is touched; retain pure interfaces/tests. |

## Alternatives not selected

- **Notion-like generic block/database engine:** flexible documents, but does not itself enforce goal cardinality, financial unknown states, provenance, privacy or planned-task semantics. It adds schema/editor configuration burden on a 360px phone. A future rich note editor could be isolated inside notes; it should not replace transactional domain records.
- **Fully rigid per-entity storage migration now:** stronger schema typing, but unnecessary export/migration risk for a usability change. Typed domain projections over the versioned envelope offer gradual improvement.
- **React/native rewrite:** a different renderer alone fixes neither persistence acknowledgement nor model semantics. No inspected evidence shows current DOM rendering cannot meet these flows. Reconsider only for measured complexity/performance or failed real-device requirements.
- **Server-first/cloud/collaboration architecture:** adds identity, sync/conflict and connectivity costs without a current personal/offline requirement. Do not introduce it implicitly through UI organization.
- **Event sourcing/global state framework/universal plugin engine:** more concepts than this personal app currently needs. Use explicit commands and targeted history where already supported.

## Validation and handoff

This review ran source inspection only. No tests, benchmarks or fresh screenshots were run by this architecture reviewer. Existing candidate suites discovered include `tests/persist.test.ts`, `tests/schema_migration.test.ts` and `tests/restore_persistence_ui.test.ts`; listing them does not assert they pass or cover every risk.

Current root implementation should verify: consistent action geometry across all four themes; 360px Bangla/English at 100% and 200%; no clipped labels or hidden controls; actual nav-height clearance; each shortcut destination; no duplicate task action; sibling goal selections survive save/reload; global max-five behavior; retained dangling/retired selections; scalar controls stay scalar. Persistence refinement needs delayed/rejected repository-write tests, startup-read failure distinction and namespace isolation. Model changes must preserve existing unknown, progress and migration fixtures.

Root can append final implementation/test evidence separately. Technical follow-ups above remain recommendations until corresponding code and evidence exist.

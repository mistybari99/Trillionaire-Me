# Codex Next Execution Queue

These packages implement the approved blueprint in small, reviewable steps. None is authorized by the present Text Size Lock task. Run one package at a time in a fresh isolated worktree, reconcile current GitHub first, and require independent evidence before marking it done.

| Order | Package | Scope and principal paths | Acceptance evidence | Depends on | Complexity |
|---:|---|---|---|---|---|
| 1 | TMV2-01 Recall contract and gap test | Inventory capture/notes/tasks/goals/ventures/history; define lifecycle and derived recall interfaces in `src/core`; no UI/schema write yet. | Contract tests prove index derivation, namespace isolation, Unknown handling and zero mutation; capability matrix updated. | None | Medium |
| 2 | TMV2-02 Inbox lifecycle | Extend capture save flow and catalog/schema with additive lifecycle metadata; migrate old records to a truthful default without deleting anything. Paths: `src/core/capture.ts`, catalog/schema/migrate/store, capture UI. | Old fixtures migrate; reload/offline; failed write; demo/real; backup/restore/CSV decision; EN/BN/Mix. | TMV2-01 | High |
| 3 | TMV2-03 Recall and local search UI | Add a mobile Recall route over the derived index; filters for state/type/venture/goal/date; archived and paused remain searchable. | 360px and 200% stress, keyboard focus, local-only search, no horizontal scroll, route/link checks. | TMV2-02 | High |
| 4 | TMV2-04 Cross-venture next-action reasons | Extend `nextAction.ts`/`advice.ts` to include blocker, waiting and review reasons across ventures without adding tasks. | Deterministic fixtures, max three suggestions, no shame language, same results offline, no duplicate writes. | TMV2-01 | Medium |
| 5 | TMV2-05 Guided breakdown journey | Orchestrate existing worksheet/tree/backward/task-goal/capacity functions into one progressive flow; do not replace source modules. | Save/resume/back, shared task links, missing-input prompts, capacity failure, 360px EN/BN/Mix. | TMV2-01 | High |
| 6 | TMV2-06 Domain-pack contract | Versioned pack schema for questions/templates/rules/formulas/guidance/source metadata; adapt one existing neutral system and one sector family as proofs. | Validator rejects missing units/sources/locales and invented defaults; existing packs unchanged until adapter succeeds. | TMV2-05 | High |
| 7 | TMV2-07 Scenario core | Pure scenario types, formula plug-in contract, unit/horizon checks, separate persistence and versioned migration; no screen beyond test harness. | Baseline/alternative/custom; Unknown propagation; no FACT mutation; snapshot/backup/restore/vault tests; performance bound. | TMV2-01, TMV2-06 | High |
| 8 | TMV2-08 Simulation Lab and embeds | Standalone route, shared Quick Simulation component, comparison text/chart, explicit Run and Save Scenario. | 360px/200%, keyboard/TalkBack automation, reduced motion, debounce/run behavior, offline, EN/BN/Mix. | TMV2-07 | High |
| 9 | TMV2-09 Apply-to-plan review | Translate a saved scenario into a proposed diff through Reality Loop/PlanVersion; review, approve, cancel and rollback. | Cancel writes nothing; approve creates a version; old plan remains; cross-goal impacts and restore pass. | TMV2-07 | High |
| 10 | TMV2-10 Experiment and release gate | 7/14-day evidence experiment, sensitivity/bottleneck summary, then full regression and phone checklist. | Evidence vs estimate labels, stop rule, full suite/build/e2e, physical Android/TalkBack and Bangla reviewer records. | TMV2-04, TMV2-09 | High |

## Required work-package format

Each execution task must state the real user problem, current code to reuse, in/out scope, migration effect, data-flow trace, tests, rollback, human gates and exact evidence paths. It must not modify production, push, enable AI/cloud, or broaden scope without separate authority.

## Continuation prompt

> Continue Trillionaire Me from `docs/charter/2026-11-08/`. First fetch and verify the current GitHub default branch and SHA, inventory and preserve all local pending work, and create a separate local worktree. Read `CLAUDE.md`, the canonical spec, current tracker/decisions, `CURRENT_CAPABILITY_EVIDENCE_MATRIX.md`, `TRILLIONAIRE_ME_UNIFIED_UPGRADE_BLUEPRINT.md`, and `CODEX_NEXT_EXECUTION_QUEUE.md`. Implement only package `<PACKAGE-ID>` by reusing current modules. Keep AI/cloud/off-device data off, Unknown distinct from 0, demo/real isolated, and EN/BN/Mix at 360px. Add migration/backup/restore evidence when the schema changes. Run focused tests, full suite, plan/link check, build and required Chromium checks. Record an independent audit result. Do not push, deploy or begin later packages.

# Production integration and independent audit

Production advanced to38c8c2f while the contextual-help branch was being implemented. The integration preserves its component kit, audio-slot work, disclaimer deduplication and bounded transient-CI polling. Production UI-04 remains its kit work package; contextual help is UI-05. The original Register and historical snapshots remain unchanged.

A separate read-only Prompt-Engineer produced the integration work order before builders resolved conflicts: preserve both implementations, keep exact-SHA CI checks, reconcile tracker IDs/counts, regenerate browser evidence, then obtain independent Audit PASS and remote deployment verification. Naming and the new dominant Focus action remain previews, outside this implementation.

## Independent result

The separate read-only `/root/independent_audit` returned **PASS** on6November2026. It did not build these changes. It independently checked typecheck, maintained links/plan integrity and22focused tests, and inspected2151passing full-suite unit tests,107passing whole-app browser checks and263passing merged presentation/layout checks. It traced preferences/storage failure feedback, private read-only maps, existing-profile reuse, prayer put/undo durability/consent, routes, kit/audio preservation and exact-CI verification. Additional merged dark-overlay checks pass16/16.

Its PASS excludes remote deployment verification, physical Android/TalkBack and human reviews; no human gate is closed by this report.

## Two reproduced failures and fixes

1. A keyboard-activated underlying Owner Profile link while the nonmodal menu was open left a duplicate Today entry in Back history. The shared coordinator now consumes the transient stop for ordinary internal links too, including the asynchronous outside-pointer dismissal race. Modified clicks, downloads, targets and menu-owned prevented events retain their behavior. [Final history receipt](merged/tm-overlay-underlying.json).
2. An actual LocalKV write rejection during a quick prayer mark emitted SaveMonitor failure and globally rerendered the app, losing an unrelated unfinished intake draft. Main now patches only the recovery banner; successful retry also avoids a hashchange rerender. [Actual rejection/recovery receipt](merged/tm-save-draft.json) preserves the original node, draft and caret throughout. Two new banner unit regressions and permanent failure/retry/keyboard-Back browser regressions cover the behavior.

## Fresh evidence

- [Merged presentation report](merged/report.json):164interaction +96look/text geometry +3populated-demo fold checks, all pass;12fresh representative EN/BN frames.
- [Merged dark report](merged-dark/report.json):16additional dark100/200% Help and Deen-menu checks, all pass.
- `evidence/e2e-report.json` was regenerated from the merged build; all107checks pass, including offline install/update, failure/retry, Profile Back behavior and no unintended external requests.
- The build was generated from the integration working tree before the merge commit, so its stamp is not a production-release identity. Exact remote SHA/CI/deployment records will be added separately.

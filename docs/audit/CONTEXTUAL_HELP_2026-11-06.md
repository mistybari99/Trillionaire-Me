# Contextual help, navigation and owner workspace

Approved implementation scope, 6 November 2026. Baseline production f3c7604. This report tracks engineering evidence; physical phone and TalkBack acceptance remain open.

## Product contract

Keep actions, actual values, units, input limits, Unknown/provenance, save failures, consent, restore/delete consequences and Deen cautions visible. Move only reviewed optional explanations behind small named information controls with 44px targets. Keep reference material readable in its own destination. Centralize engineering diagnostics on Build status.

Twelve guide families cover app/data, Today, goals, profile/resources, money, habits, business, decisions, knowledge, Deen, backup and settings. Every guide has a wrapping HTML diagram and clearly fictional examples. An optional decorative static SVG illustration adds no network dependency. Actual data maps are separate, lazy and read-only; they use the active namespace and existing domain calculations, with consent/lock/privacy checks and honest empty/unsupported/error states.

Four independent device preferences live in Settings → Look: inline/sheet help, diagram/illustrated visuals, guide/guide+My map, navigate/menu-first tabs. Defaults: inline, diagram, guide, navigate. Invalid stored values fall back safely; storage failure applies the session choice with failure feedback. Reset Look resets presentation only and reports persistence failure.

Default bottom tabs retain native routes; five root screens have canonical quick tools. Menu-first tabs open one nonmodal menu without replacing forms; Close, Escape, outside tap and Back dismiss it. Help sheets are native modal dialogs outside the replaceable app root. Only one transient surface can be open. Route, namespace, lock and consent changes clear private content.

Deen shows five individual prayer marks at the front and in its quick panel. All entry points use one durable asynchronous idempotent command, including undo, consent and day/namespace validation. Unknown timetable does not prohibit a manual mark. Completion is never inferred from time; no scoring or comparison. A pending save does not replace page drafts or claim durable success.

Owner Profile is globally available through the named header icon. It reuses the existing profile read-back and consent-gated edit form; language, text size, Look, privacy, backup, data mode, prayer and About are linked. It is a device-local profile, not online authentication; no new personal fields or cloud sync.

## Inventory and evidence

- [Classification ledger](contextual-help/CLASSIFICATION_LEDGER.md): 144 explanatory keys, baseline34 settings rows,12guides,186catalog fields. Current settings add4 presentation rows; route patterns extend57→59 with Owner Profile and Deen targets.
- [Preview operations](../deployment/PREVIEWS.md): pinned Wrangler, empty Preview opt-in and separate exact-CI nonproduction gate. Production gate stays production-only.
- Static checks: source TypeScript and ordinary production build passed during integration.
- Focused regressions: help15, shared prayer9, overlay regressions, navigation4, preference3, combined presentation18, reset regressions2; full suite and browser release verification are recorded below when complete.
- Fresh baseline/current route captures are produced by `tools/contextual_audit.mjs`. No real owner data is used in testing.

## Deferred design choices

Owner rejected the initial library-style names. Updated two-agent debate selected **Build Yourself** with tagline **Build skills. Practice with purpose.** as the recommendation, with **Train Yourself** and **Build to Lead** alternatives. The [three visual previews](../design/build-yourself-previews/comparison.png) include motivating Bangla copy and a conceptual practice → capability → next-action diagram. Selection is pending; the production title has not been silently changed.

A second two-agent debate recommends one prominent Today action **কাজে ফোকাস করুন / Focus on task**, actual scheduled task title, linking to the existing focus chooser. Context alternatives: Return to focus, Open plan, Add a task, View plan. Quick Capture stays secondary because it captures notes rather than executable tasks. This is a recommendation awaiting owner selection, not an implemented action or automatic timer start.

## Release record

Local unit verification: **2102 tests in177files passed**; production build and typecheck passed. New presentation interaction audit: **164checks passed across16combinations**. All104whole-app browser checks passed. The populated-demo Settings first-fold regression is fixed and all3final-language fold checks pass. The [full audit evidence](contextual-help/README.md) retains the earlier failures and final passing results:96all-look geometry checks and16additional dark-overlay checks also pass. Wrangler packaging dry run passed with no bindings.

Implementation in progress. Do not treat local code, a URL, a screenshot or a CI status as evidence of a live release. Final exact-SHA CI, Preview, production deployment and offline smoke receipts are required.

## Integration with newer production work

Production38c8c2f was merged without dropping its kit/audio changes. [Independent merge audit](contextual-help/MERGE_AUDIT.md) records Prompt-Engineer scope, separate Audit PASS,2151full-suite unit tests plus20latest storage/prayer regressions,107whole-app browser checks,263merged presentation checks and16additional dark-overlay checks. It also records the two actual history/draft-loss failures and permanent fixes. Contextual-help work is now UI-05; production retains UI-04 for its component kit. Remote exact-SHA release verification remains outstanding.

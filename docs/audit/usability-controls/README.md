# Usability controls — fresh browser QA

Captured 2026-11-05 against the local production preview on `feat/usability-controls`. All records and device consent are synthetic. No production data was read or changed.

The verified build passed 128 frames at 360×800: Today, Journey, Plan and Habits across all four looks, English/Bangla, light/dark and 100%/200% text. `report.json` records the full geometry and 15 passing functional/update checks; `failures.json` is empty. Full original JPGs remain at `/tmp/usability-controls-final/`; this directory contains bounded representatives and contact sheets.

## Verified behavior

- Today retains four neutral in-flow shortcut links; Journey retains two Plan/Goals launches. Shortcut counts are stable in every captured combination.
- The native checkbox picker selects same-branch siblings independently. Keyboard Space selects the focused choice without selecting its parent.
- An actual newly created task saves both sibling IDs to IndexedDB. Reload/edit restores them. Checking then unchecking their parent preserves both siblings. A sixth choice is rejected with a live five-goal explanation; exactly five IDs persist. Removing one sibling preserves the other after another save/reload.
- An actual newly created habit saves both siblings durably. Reloading its edit controls restores both, and removing one preserves its sibling after another save/reload.
- Switching to real mode shows only the real synthetic goal. Demo task edits remain absent there, and demo task/habit operations create no real records.
- No matrix page has horizontal overflow, missing navigation labels or an obscured last reachable control. Measured action/shortcut, choice, icon and input height floors are 52/48/44/48px respectively, with a 0.5px rounding tolerance. Visible goal-choice rows measure at least 48px.
- Navigation measures 57px normally and 130.59px with large text. A mocked waiting-worker registration renders the actual updater component; its banner clears the measured navigation by 12px at both 100% and 200%. The probe changes neither dist/sw.js nor real service-worker state.

Visual review included all four looks in light/dark through the Bangla contact sheets, LF English/Bangla normal/large text, actual persisted checkbox selections, the live limit explanation and the large-text update banner. Bangla labels wrap without clipped marks in the inspected views. Picker element screenshots are taller than the viewport and can contain the fixed navigation at one captured scroll position; this is not a claim that the entire form is simultaneously visible.

## Findings and follow-up deltas

The first pass found Habits range choices at 44px; an overriding inline height was removed, and the complete 128-frame matrix then passed with the shared 48px choice rule. The first functional probe waited for an edit form inside closed details, and its original bottom-clearance measurement included closed-details descendants. These were harness errors: the corrected flow opens the actual summary, and geometry uses browser visibility checks. The original JSON is retained as `first-pass-report.json`/`first-pass-failures.json` for traceability, not as unresolved product failures.

After the passing matrix, engineering changed the Bangla picker help wording from “প্রতিটি” to “প্রতিটা” and removed optional button transition declarations. The 128-frame matrix was not repeated after those two small changes. Its screenshots therefore retain the earlier help wording; any final functional-only retest must be recorded separately. A later Settings-only flex sizing correction restored the Quick card above the bottom navigation: the final whole-app e2e checks pass in English, Bangla and Mix (card bottom571/546/571px vs navigation683px at360×740). The matrix routes do not include Settings. Unit-suite and whole-app e2e results are owned by the parent release report.

## Reproduce

```sh
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/tm-pw-browsers TM_USABILITY_OUT=/tmp/usability-controls-final node tools/usability_controls_qa.mjs
```

Functional-only retest (preserves the full-matrix output):

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/tm-pw-browsers TM_USABILITY_MATRIX=0 TM_USABILITY_OUT=/tmp/usability-controls-functional-final node tools/usability_controls_qa.mjs
```

The harness exits nonzero for failed functional checks or recorded geometry failures. This browser review does not establish TalkBack/physical-device behavior or a comprehensive contrast audit.

Final rebuilt functional-only retest after the wording, transition and Settings-specific flex changes: all13 checks passed; see [report](functional-final-report.json). Final whole-app browser regression also passes92/92; see [report](e2e-report.json).

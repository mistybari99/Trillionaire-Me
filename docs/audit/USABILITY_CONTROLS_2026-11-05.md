# Controls, shortcuts and multiple selection — 5 November 2026

This follow-up addresses the owner's request to improve button appearance and sizing, place useful tools near the front, and support meaningful multiple selections without changing the app's core calculations. The earlier Action Desk release is live as production `0eca3ea`; this follow-up is implemented separately on `feat/usability-controls` and uses the existing exact-production-CI deployment gate.

## Selected architecture and changes

The [independent architecture review](../design/USABILITY_ARCHITECTURE_2026-11-05.md) recommends preserving the offline domain model and improving typed controls and UI boundaries incrementally. Two independently reviewing agents compared a dashboard of metrics, a tool catalog, a customizable dashboard and a work-first workspace. They chose a compact Today title/date followed by four stable, neutral tool links: Time & tasks, Goals, Money and Capture. These are informed defaults, not claims backed by usage analytics. Required warnings stay ahead of the workspace; existing task order and one recommendation remain intact. Journey promotes Plan and a single Goals link while retaining all 18 grouped tools and the Wheel link.

Buttons now share defined roles: filled primary and calm secondary actions use consistent 52px minimum geometry, choice controls 48px and icon utilities at least 44px. Controls grow with wrapped labels. The purple default and all four saved looks remain. Shortcut tiles are neutral navigation links, not four competing primary actions.

The [selection audit](MULTISELECT_AUDIT_2026-11-05.md) distinguishes genuine multi-valued controls from exclusive settings. The shared task/habit goal picker now selects individual goal IDs with native checkboxes. Selecting or clearing a parent no longer replaces sibling or descendant selections. The existing global five-goal limit includes retained hidden/dangling links. Existing saved IDs and storage schema stay intact. The generic field renderer also honors existing `multichoice` and `list` types as arrays; it does not turn exclusive status, theme, hierarchy or unit fields into arrays.

## Verification

- Build/typecheck and plan integrity pass. No catalog field, schema version or core calculation changed.
- [Browser evidence](usability-controls/README.md): 128 frames across four looks, English/Bangla, light/dark, 100%/200%, and 15 functional/updater checks pass with no recorded geometry violation. Final rebuilt functional-only retest: 13/13 pass; [report](usability-controls/functional-final-report.json).
- Final whole-app Chromium regression: 92/92 pass, including offline install interruption/retry/update, namespace/consent and all Settings routes. [Report](usability-controls/e2e-report.json).
- Local full unit run covered 2,006 tests in 168 files: 1,999 passed and seven failed. Failures identified one forbidden Bangla spelling, two old logo-placement assumptions, the old greeting assumption and three broad CSS-slice assertions triggered by optional transitions. Corrected the spelling, explicitly updated tests for the selected compact header and removed optional transitions. All 74 tests in those six affected files then passed. A final chart/range focused run also passed 28 tests. The complete final suite is required again by CI before production deployment; no passing local 2,006-test rerun is claimed here.
- The first whole-app browser run caught an actual Settings Quick-card regression from fixed flex bases. Intrinsic wrapping restored the card above the tabs in English/Bangla/Mix; the final 92-check run passes. The source remains frozen after that run.

Physical Android/TalkBack behavior and a comprehensive contrast audit remain outstanding; browser screenshots do not establish those results. The technical architecture report lists future command/storage-boundary work as recommendations, not features delivered by this controls release.

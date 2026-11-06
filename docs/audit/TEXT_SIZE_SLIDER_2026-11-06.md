# Text-size slider — 6 November 2026

Owner request: drag to any text size between75% and150%. Settings → Quick → Text size now uses a native range input with min75, max150 and step1. Its current percentage updates visibly while dragging; the same focused DOM node remains mounted. Every input updates root font size and the existing device preference key. No record/schema changes.

Finite positive stored values are rounded and clamped to75–150; old200% becomes150%. Missing, nonpositive and nonfinite settings use100%. The native slider supports touch/mouse drag, arrow keys and Home/End; accessible name and percent-valuetext are localized through the existing text-size label.

Validation: typecheck/production build pass;49 focused preference/settings tests pass. [Whole-app browser report](text-size-slider/e2e-report.json):96/96 checks pass, including real English/Bangla thumb drags to117%, keyboard bounds, arbitrary113% persistence after reload, endpoint sizing and offline/update checks. Separate200% CSS/OS accessibility stress checks remain in the browser suite. A fresh [Bangla117% preview](text-size-slider/bn-117.jpg) was captured at360×800.

The previous preset-button tests were updated for the owner's new control/range. The original Register and archived plans remain unchanged. Production CI must pass the full final suite before deployment; physical-device/TalkBack acceptance remains open in the tracker.

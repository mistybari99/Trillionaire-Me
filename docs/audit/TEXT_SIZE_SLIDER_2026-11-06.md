# Text-size slider — 6 November 2026

Owner request: drag to any text size between50% and150%. Settings → Quick → Text size uses a native range input with min50, max150 and step1. Its current percentage updates visibly while dragging; the same focused DOM node remains mounted. Every input updates root font size and the existing device preference key. No record/schema changes.

Finite positive stored values are rounded and clamped to50–150; old200% becomes150%. Missing, nonpositive and nonfinite settings use100%. The native slider supports touch/mouse drag, arrow keys and Home/End; accessible name and percent-valuetext are localized through the existing text-size label.

Validation after the50% expansion: typecheck/production build and all2,155 unit tests pass; [107/107 whole-app browser checks](../../evidence/e2e-report.json) pass. Browser evidence includes English/Bangla50% and150% endpoint sizing at360px, real thumb drags to117%, Home/End keyboard bounds, arbitrary113% persistence after reload, offline/update checks, and separate200% CSS/OS accessibility stress. The earlier [Bangla117% preview](text-size-slider/bn-117.jpg) remains the original slider screenshot evidence.

The previous preset-button tests were updated for the owner's new control/range. The original Register and archived plans remain unchanged. Production CI must pass the full final suite before deployment; physical-device/TalkBack acceptance remains open in the tracker.

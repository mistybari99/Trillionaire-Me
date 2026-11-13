# Text-size slider — 6 November 2026

Owner request: drag to any text size between50% and150%. Settings → Quick → Text size uses a native range input with min50, max150 and step1. Its current percentage updates visibly while dragging; the same focused DOM node remains mounted. Every input updates root font size and the existing device preference key. No record/schema changes.

Finite positive stored values are rounded and clamped to50–150; old200% becomes150%. Missing, nonpositive and nonfinite settings use100%. The native slider supports touch/mouse drag, arrow keys and Home/End; accessible name and percent-valuetext are localized through the existing text-size label.

Validation after the50% expansion: typecheck/production build and all2,155 unit tests pass; [107/107 whole-app browser checks](../../evidence/e2e-report.json) pass. Browser evidence includes English/Bangla50% and150% endpoint sizing at360px, real thumb drags to117%, Home/End keyboard bounds, arbitrary113% persistence after reload, offline/update checks, and separate200% CSS/OS accessibility stress. The earlier [Bangla117% preview](text-size-slider/bn-117.jpg) remains the original slider screenshot evidence.

The previous preset-button tests were updated for the owner's new control/range. The original Register and archived plans remain unchanged. Production CI must pass the full final suite before deployment; physical-device/TalkBack acceptance remains open in the tracker.

## Recovered Text Size Lock — 8 November 2026

The recovered lock intent was reconciled against GitHub baseline `3a5cc325`. A named Lock/Unlock button now keeps the exact 50–150% value, uses native disabled slider semantics, exposes localized action and state text in EN/BN/Mix, restores focus after activation, and keeps a 44px target at every supported size. A rejected device write falls back to the page session with truthful feedback; the session value overrides a contradictory durable value and is cleared after a later durable save. No record, schema or backup-format field was added.

The old package's 2,161-test and 115-browser-check results are historical only. Fresh integration results and open physical checks are recorded in `docs/charter/2026-11-08/PENDING_LOCK_INTEGRATION_REPORT.md`.

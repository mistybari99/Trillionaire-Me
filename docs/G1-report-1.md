# G1 report — work block 1

## Changed
- PWA shell (hash router, 5 tabs, offline service worker), Ink-and-Paper theme with light/dark, bn/en switch, text size up to 200%.
- One-Focus Home on demo data (1–2 actions + current gate). Gate ladder has a text equivalent.
- Field catalog v1: 43 fields × 22 entities, each with what/why/example/format, privacy class, purpose, access rule, unknown states, bn + en.
- Schema skeletons incl. business-neutral venture registry and Deen entities (schema + privacy only; no scripture text).
- Capability Status registry for all 24 modules, visible in UI. Only M22 is "implemented"; "offline-ok" is claimed only where the offline e2e passes.
- FACT/ESTIMATE/INFERENCE/EXTERNAL/DEMO chip on every rendered value.
- Guided intake (7 steps, ≤5 fields each), completeness bar, next-needed + reason. Secrets rejected; nothing saved on rejection.
- Demo/real isolation: real namespace locked; no promote API.

## Evidence (all from `evidence/`)
Pass (G1 scope): TM-TST-006, 017, 021, 034, 092, 100, 114, 143, 144.
Partial (automated part passes, manual/human gate open): TM-TST-010, 066, 067 (usability sessions), 130 (owner confirmation), 161 (Bangla reviewer sign-off).
Register copy updated for these 14 rows only; the other 158 stay "Not verified".

## Failed / not done
- Usability tests (3–5 users) and Bangla human review not run — cannot be automated.
- Screenshots: 32 (16 routes × bn/en) at 360 px, 0 horizontal overflow. Full-page captures show the fixed nav mid-page; that is a capture artifact.

## Owner decisions / checks
1. Theme preview showed "ধাপ ২/৮"; the spec's Gate A (Clarity) matches the demo tasks, so Home shows 1/8. Confirm.
2. Fonts are bundled locally (no Google Fonts call) to honour "no network calls".
3. Bangla copy and glossary are working drafts — need a native reviewer.
4. D-B (when real data may enter) still open; real namespace stays locked.

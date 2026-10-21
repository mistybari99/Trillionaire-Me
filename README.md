# Trillionaire Me — G1 (safe shell + field catalog)

Demo data only. No AI, no network calls, no paid services. Spec of record: `docs/spec/`.

```
npm install
npm run dev          # local dev
npm test             # 39 tests (property, static-scan, DOM audit, i18n parity)
npm run build && node tools/e2e.mjs && npm run screenshots && npm run evidence
python3 -I tools/update_register.py <register.xlsx> <out.xlsx>   # evidence → Register copy
```

Stack (D-A approved): PWA, portable TypeScript, no framework. Theme (D-E approved): "Ink and Paper" — tokens at the top of `src/ui/styles.css`.

| Path | What |
|---|---|
| `src/core` | unknown≠0 value model, namespaced store (no promote path), secret rejection, export guard, intake engine |
| `src/catalog` | versioned field catalog (what/why/example/format/privacy/purpose/access, bn+en), glossary, validator |
| `src/schema` | entity skeletons (profile, assessment, goals/tasks, venture, habit, finance, Deen, journey/gate) |
| `src/modules` | Capability Status registry (24 modules) |
| `evidence/` | test, e2e, catalog and screenshot reports (360 px, bn + en) |
| `docs/register` | original Register + `…_v2_1_G1_evidence.xlsx` (statuses upgraded only where evidence passes) |

Report of the first work block: `docs/G1-report-1.md`.

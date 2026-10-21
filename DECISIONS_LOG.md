# DECISIONS_LOG
Format: what · why · alternatives · how to undo. Owner decisions (D-A, D-E) are in CLAUDE.md §2.

| # | Decision | Why | Alternatives | Undo |
|---|---|---|---|---|
| L-01 | G1 UI is vanilla TypeScript (no framework) | G1 has ~10 static screens; zero deps = smallest, fastest. Charter says "small UI framework" | Preact/Svelte now | Screens are pure fns returning DOM; port to Preact in G2/G3 when forms get complex |
| L-02 | G1 storage = localStorage KV behind a `KV` interface; IndexedDB (Dexie) arrives in G2 | Brief puts local DB in G2 | Dexie now | Swap `KV` adapter; records unchanged |
| L-03 | User-facing journey = Stage A–H; build = G0–G8 (renamed all UI/schema "gate" → "stage") | CLAUDE.md §2 | — | rename back (`stage_pass` → `gate_pass`) |
| L-04 | Home shows Stage A = ১/৮ (preview's ২/৮ ignored) | CLAUDE.md §2 | 2/8 | `DEMO_CURRENT_STAGE` in `src/demo/seed.ts` |
| L-05 | Fonts bundled via @fontsource (no Google Fonts) | CLAUDE.md §2 | system fonts | remove imports in `styles.css` |
| L-06 | Glossary shown in-app, every term tagged "যাচাই হয়নি" | CLAUDE.md §2, TM-TST-161 | hide until reviewed | — |
| L-07 | Demo answers live in the demo namespace; Home seed is constants (never stored) | TM-REQ-143 | seed into store | — |
| L-08 | Register copy `…_v2_1_G1_evidence.xlsx` kept beside the original; original untouched | evidence-only updates | edit in place | delete the copy |

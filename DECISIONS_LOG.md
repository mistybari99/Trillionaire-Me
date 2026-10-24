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
| L-09 | G2 slice 1: `RecordRepo` contract + Dexie adapter + checksum backup/restore (not yet wired to UI) | charter stack; pure core + adapters | wire UI first | adapter is isolated in `src/adapters`; UI still uses G1 KV store |
| L-10 | G2 slice 3: pure op-queue + deterministic field-level conflict rule (highest ts/device/opId wins, loser kept in `conflicts`) | no server exists yet; rules must be testable offline; never lose data silently | CRDT lib (more deps) | `src/core/sync.ts` is unused by UI until a sync target is approved |
| L-11 | Bangla version keeps common English words (Demo, Backup, Online…); allowlist in tests | owner request: easier to read | full translation | edit `COMMON_ENGLISH_KEYS` + pack |
| L-12 | Research = injected provider + consent contract now; engine choice deferred to G4 | Google API key cannot live in a browser; paid beyond free quota (§4.1) | wire Google now | swap provider |
| L-13 | App storage = in-memory store mirrored write-through to IndexedDB; old localStorage records imported once | screens stay synchronous; durable data | rewrite screens async | `initStorage()` in `src/ui/state.ts`; remove MirrorKV |
| L-14 | Notifications hide worship/health/money/third-party details by default | MR-14 | show details | `hideDetails:false` pref |
| L-15 | In-app Suggest uses Wikipedia (free, no key) behind click-consent; sends only the typed search words; Wikipedia adapter is the only network file | owner asked for it (23 Oct); CLAUDE.md §4.2 satisfied by explicit request + per-click consent | Google via Supabase function (needs key/cap approval) | delete `src/adapters/wikipedia.ts` + `SUGGESTABLE` in screens.ts |
| L-16 | Scheduler: deterministic first-fit by priority; minimum_week = max 3 tasks, 1/day; pause = none; unknown capacity or minutes → deferred with a reason code, never 0 | CLAUDE.md §6 (overload adds no tasks, unknown≠0) | optimiser/ILP | `src/core/planner.ts` |
| L-17 | Deleting a goal-tree node re-attaches children to its parent, or refuses | no orphans (TM-TST-037) | cascade delete | `remove()` in goals.ts |
| L-18 | Scheduler fills the week starting from TODAY, inside the daily free window the user sets (not blocked windows) | non-programmer-friendly: "when am I free?"; worship/family/rest are outside the window by construction | ask for each blocked window | `startDay`, `freeWindow()` |
| L-19 | Capacity is "known" only if weekly hours AND daily window are both known; real 0 hours is respected as 0 | unknown≠0 | assume default window | `capacityState()` |

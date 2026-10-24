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
| L-20 | Stage A auto-checks (required diary answered incl. "Later" + ≥1 goal); stages B–H need the user's own written evidence; stage order fixed; pass records are never deleted; unmet = calm "what is left" | Spec §3.4, DP-04, no shame copy | free pass / manual tick only | `src/core/stages.ts` |
| L-21 | Owner's 20 categories become a knowledge library (+ Deen as 21st); navigation stays 5 phone tabs | Spec DP-03 one-focus; DP-12 Deen first-class | 9-item sidebar | `docs/design/life-system-integration.md` |
| L-22 | No streak counters; habits use consistency trend + recovery plan | CLAUDE.md §2/§6 no streak-shame | streaks | n/a |
| L-23 | Library content ships only with sources, date, evidence level and reviewed=true; emotional/health entries need human review | never invent facts; safety | ship drafts | `LibraryEntry` in `src/library/categories.ts` |
| L-24 | First build slice = "I'm stuck" Obstacle Center (rule-based, no AI) | brief's signature feature; works offline | start with content library | phase P1 in the plan |
| L-25 | Quick capture = rule-based finder + mandatory confirm step; bare numbers never guessed as money; "কাল" flagged low-confidence; raw note kept on device, reports use only confirmed items | owner request 24 Oct; no AI; unknown≠guess | auto-save extracted items | `src/core/capture.ts` |
| L-26 | SUPERSEDES L-21, L-23, L-24: owner said do not apply the whole brief → removed `src/library` and 5 of 8 new requirements (173,176,177,179,180); adopt only features that fit the running app; first = "I'm stuck" | owner instruction 24 Oct | build the library | git history has the removed skeleton |
| L-27 | SUPERSEDES L-26 partly: no topic is dropped. 21 topics × 2 short tips + visuals, tags link related tips, ☰ drawer for topics, reward picture (stars per finished task, garden layer per stage). Tips are practice-based drafts marked unreviewed | owner 24 Oct (second instruction) | full evidence database | `src/library/topics.ts`, `src/core/reward.ts` |

## L-28 — Daily inspiration board (owner request, batch 7 follow-up)
- What: Today screen shows one bilingual (Bangla + English) card per day from a bundled list of 15 neutral lines (motivation, discipline, patience, care). Changes at local midnight.
- Why: owner wants motivation + discipline daily, both languages, no streak/shame copy.
- Alternatives: fetch quotes from an online service. Not done: external integration needs owner approval (Charter §4.3/§8). Offline bundled list works without network.
- How to undo: remove the `aside.inspire` block in `today()` in src/ui/screens.ts and delete src/library/inspiration.ts.
- Open for owner: approve an online quote source (e.g. a free API) if the daily online change is wanted.

## Language mode "Mix" (owner request)
- What: third language mode "mix" next to English and Bangla. Mix = the Bangla pack with whole standalone words swapped for English (Stage, Goal, Journey, Diary, Demo, Backup, Online, Offline). Keys in COMMON_ENGLISH_KEYS show the English text. Switch on More shows English / বাংলা / Mix. Default stays Bangla.
- Why: owner wants Bangla sentences that keep common English words readable.
- Alternatives: a separate hand-written mix pack (more work, drifts from bn). Swapping inside suffixed words (e.g. "Offlineে") was rejected because it produces broken spelling.
- How to undo: remove "mix" from Locale/LOCALES/LOCALE_ORDER in src/i18n/registry.ts and the mix pack in src/i18n/packs.ts; the switch falls back to Bangla for unknown values.
- Also: fixed mixed-script strings in the Bangla pack (e.g. "Offlineে চলে", "এই deviceে") and plain-language wording of cap.intro and safety.demo (no internal "G1" name shown to users).

## Plan flow diagram (R6, ROADMAP B9)
- What: Plan screen shows an inline SVG flow: Time / Tools / Skills → Research → Plan → AI step (disabled, "later") → Your goal. Data model in src/core/planFlow.ts; SVG in planScreen (src/ui/screens.ts). Demo data only, same as the rest of the plan screen.
- Why: owner wants to see how a plan is made, from his own inputs, with no AI.
- Rules chosen: a missing value shows "unknown" (EN and BN), never 0. Tools/skills count = records entered, so zero records = unknown. Research = intake answers so far. Plan = placed open tasks, only when capacity is known. Goal = first goal title, shortened to 24 characters.
- Reduced motion: the diagram has no animation at all. The AI step is dimmed (opacity), not dashed, because the R4 reduced-motion guard flags any stroke-dasharray outside the motion-allowed block.
- Alternatives: HTML boxes (rejected: the roadmap asks for SVG). Dashed AI box (rejected, see above).
- How to undo: remove `planFlow(cp, lang),` from planScreen, delete the `planFlow` and SVG helper functions in src/ui/screens.ts, the `plan.flow.*` keys in src/i18n/packs.ts, the `.flow` CSS block in src/ui/styles.css, and src/core/planFlow.ts plus tests/b9_plan_flow.test.ts.

## O6 — reality-changed loop, 90-day review, stage templates (ROADMAP §2)
- What: (a) a plan step can be marked "No longer true" from the Plan screen. The step stays on record, gets `task.not_true_on` (new optional date field, additive, schema version unchanged; absence = open), is dropped from the scheduler input (`isOpenTask` in `src/core/planInputs.ts`), and a new `journey_log` record is appended. Nothing is deleted. (b) New screen `#/journey/review` (pure rules in `src/core/review.ts`): finished tasks, focus minutes and stage passes in the last 90 calendar days. (c) Stage-name templates (`src/core/stageTemplates.ts`): default (the Spec journey), learning, business. Only names and exit text change; codes A–H, order and past passes stay.
- Why: owner asked for the Spec §3.6 loop, a 90-day look back, and editable stage names. Scope kept to the three items.
- Rules chosen: unknown ≠ 0. A measure with no record in the window shows "Not enough data yet". Focus sessions with no minutes are not summed and are counted in a separate note. The template choice is a per-viewer pref (`tm:ui:stageTemplate`), same pattern as the horizon view; unknown values fall back to default. Past journey-log text keeps its wording.
- Bangla: the new strings and the learning/business template names are a draft pending native review (TM-TST-161).
- Alternatives: a full plan-diff with PlanVersion and approval (Spec §3.6 steps 2–6) was not built; that needs the dependency graph, which is later work. A confirm dialog before "No longer true" was not added because the step is kept and nothing is lost.
- Known gap: no undo for "No longer true" (the Remove button still deletes the step, as before). Add an undo that clears `task.not_true_on` and logs the reversal if the owner asks.
- How to undo: remove the `journey/review` route in `src/app.ts`; delete `src/core/review.ts`, `src/core/reality.ts`, `src/core/stageTemplates.ts`; revert the `isOpenTask` filter in `src/core/planInputs.ts`; delete `task.not_true_on` from `src/catalog/fields.ts`; remove the `review.*`, `reality.*`, `stage.tpl.*` keys in `src/i18n/packs.ts`. Existing `task.not_true_on` values are then ignored, and `journey_log` entries stay (append-only).


## O5 — assessment scoring + path fit (ROADMAP §2)
- What: (a) `src/core/assessment.ts` reads interest, skill and strength answers from records and returns a 0–100 level per dimension (mean of the given 1–5 ratings / 5) and a count of dimensions with data. (b) `pathFit()` in the same file matches the user's items to `PATHS` in `src/library/paths.ts` by theme and returns up to 3 matches with a plain reason for each. (c) `src/ui/assessment.ts` renders both as simple cards at the top of the Plan screen.
- Why: Spec §3.1 (Discover) and §3.3 (Path fit) need an assessment that works without AI and shows why each path was suggested.
- Rules chosen: unknown ≠ 0. A missing rating stays null ("No rating given yet"); a dimension with no items is "Not enough data yet"; a user with no answers gets no paths, not a guess. Weights are fixed and visible in code: skill 3, interest 2, strength 1, one weight per theme (strongest source wins). Items no keyword can place are listed as "could not place yet", not dropped. Ties keep library order, and record order is by id, so the output is stable. No rank, grade or percentage of the person is shown; the 0–100 level is internal and the card shows the average out of 5.
- Path library: 10 generic, neutral paths drafted by the builder. Each has what it needs, a first small test and, where relevant, a check before starting (privacy of client records, local food-sale rules, interest-based credit). No income, return or success figures. Marked as a draft that has not been reviewed (যাচাই হয়নি). Halal filter (Spec MR-31) is partly covered by the "avoid interest-based deals" caution only; a full filter needs a qualified reviewer (Owner, D-D/MR-31).
- Matching: theme keywords in Bangla and English (English matches at word start). Matching is keyword-based, so it is rough; it can miss or mis-tag a phrase. The fix is to add keywords in `THEME_KEYWORDS`, not to add AI.
- Bangla: new strings are a draft pending native review (TM-TST-161).
- Alternatives: a numeric fit percentage (rejected: looks like a prediction and invites ranking); AI matching (rejected: D-C); keeping matches on a separate Journey page (rejected for now: Plan already has the answers and the cards are short).
- How to undo: remove `assessmentSection(cp.recs, lang),` from planScreen in `src/ui/screens.ts`; delete `src/ui/assessment.ts`, `src/core/assessment.ts`, `src/library/paths.ts`, `tests/o5_assessment_fit.test.ts`; delete the `assess.*` and `fit.*` keys in `src/i18n/packs.ts`.

## O7 — Own options, saved offline search list (G4)
- What: (a) on the 5 search fields, the user can save what they typed ("Save what I typed") and it shows above the search button next time; (b) the 2–3 Wikipedia results the user taps from are saved per field and term. A saved term is read from the phone first, so no network call happens, online or offline. Caps: 20 entries per field, oldest removed first. Re-saving a term moves it to the top.
- Where: `src/core/savedLists.ts` (pure), `src/core/research.ts` (saved-first read), `src/ui/screens.ts` (`suggestPanel`). Stored as `own_option` / `saved_search` records in the demo namespace (IndexedDB through the existing mirror).
- Why: stays on the device, no new external call, no new table or schema version (reuses the record store).
- Privacy: text that looks like a password, OTP, ID or card number is refused before it is stored (`detectSecret`).
- Alternatives: a new Dexie table (rejected: schema change for no gain); localStorage (rejected: state should survive like other demo records); no cap (rejected: brief says 20).
- How to undo: remove the `ownBox`/`saveOwn` lines and the `saveSearchResults` call in `suggestPanel`; drop the cached-first branch in `research()`; delete `src/core/savedLists.ts` and `tests/o7_own_saved_lists.test.ts`. Stored records can be cleared with the demo clear action.

### O7 addendum — "more screens" check and traceability (2026-10-24)
- What: checked every intake field. Only the 5 suggestable fields (`interest.topic`, `skill.name`, `strength.name`, `value.name`, `goal.title`) get a suggestion panel, and all 5 go through `suggestPanel`, which already has own options and the saved list. No intake screen was missing support, so no UI change was made.
- Traceability: 3 test files mapped to TM-TST ids where the criterion really fits: `o7_own_saved_lists` to TM-TST-053, `wikipedia` to TM-TST-146, `o5_assessment_fit` to TM-TST-165. All are Partial. The 8 other unmapped files are listed in `docs/register/EVIDENCE_REFRESH.md`, with the reason for each.
- Why: the evidence gate counts only tests whose describe title carries the id, so the describe titles were tagged (same convention as `tests/g1.test.ts`). Only the titles changed; no assertions.
- How to undo: remove the three `TM-TST-` rows from `tools/traceability.json` and the prefixes from the describe titles.

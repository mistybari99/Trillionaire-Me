# Trillionaire Me: Build-Completeness Audit (structure, not data)

Date: 2 Nov 2026 · Branch `ccr-8b686ba2-vitt45` · Auditor: independent, read-only on `src/`, `tests/`, `tools/`. Working tree had the builder's uncommitted Settings-tab edits (`src/app.ts`, `src/ui/screens.ts`, `src/i18n/packs.ts` and others); the audit ran on that live tree.

The question asked: ignore whether the user has typed anything. If a user did give all the data, is every step built end to end (input form, storage, rules or calculation, every output view, export, links to dependent screens)?

---

## 0. সারসংক্ষেপ (বাংলা)

সফটওয়্যার "অনেকটা" তৈরি, কিন্তু "পুরোটা" নয়। ২৫টি মডিউলের মধ্যে: **সম্পূর্ণ ৬টি, আংশিক ১৭টি, তৈরি হয়নি ১টি (M14), মালিকের অনুমতির অপেক্ষায় ১টি (M23 AI)**।

- যা সত্যিই শেষ পর্যন্ত চলে (আমি নিজে চালিয়ে দেখেছি): ডায়েরি ফর্ম → সেভ → প্ল্যানার → আজকের কাজ/অগ্রগতি/লক্ষ্য/টাকার হিসাব/রিপোর্ট; ব্যাকআপ → রিস্টোর; CSV export → import; এনক্রিপ্টেড ব্যাকআপ; Wikipedia অপশন (নকল নেটওয়ার্কে)।
- যা নেই বা মাঝপথে থেমে যায়: **দ্বীন (কুরআন, যাকাত, দান, হজ, শিক্ষা, হক) এর কোনো ইনপুট ফর্ম নেই**; **স্বাস্থ্য-পরিবার ট্র্যাকে লেখার জায়গা নেই**; **North Star-এ "এখন কোথায়" সংখ্যা নেই**, তাই লক্ষ্যের দিকে কতটা এগোলাম হিসাব হয় না; **উদ্যোগের মূল্য/আয়/খরচ নেই**; **KPI টার্গেট নেই**; **স্টেজ B-H এর পাস-শর্ত শুধু নিজের লেখা প্রমাণ**; **"বাস্তবতা বদলেছে" লুপে ইমপ্যাক্ট, ৩ অপশন, প্ল্যান-ডিফ, PlanVersion নেই**; PDF export নেই; ডিভাইসে এনক্রিপশন নেই (শুধু PIN)।
- ১২টি ফিল্ড ডেটা দিলেও কোনো স্ক্রিনে দেখা যায় না (নিচে তালিকা)।
- স্ট্যাটাস কার্ড "ডেটা আছে কি না" (Demo) আর "কতটা বানানো" মিশিয়ে ফেলেছে। প্রস্তাব: দুটি আলাদা ঘর (সেকশন ৫)।

---

## 1. Verdict counts

| Verdict | Count | Modules |
|---|---|---|
| STRUCTURE COMPLETE | 6 | M01, M11, M19, M22, M24, M25 |
| STRUCTURE PARTIAL | 17 | M02, M03, M04, M05, M06, M07, M08, M09, M10, M12, M13, M15, M16, M17, M18, M20, M21 |
| NOT BUILT | 1 | M14 (as a track with its own input and output) |
| BLOCKED-ON-OWNER-APPROVAL | 1 | M23 (port and null adapter exist) |

Honest note: "complete" here means the pipeline for the scope the owner approved is reachable end to end. Several complete modules still have Spec items deferred to later gates (for example Google search, G8 public edition).

---

## 2. What was verified by execution and what only by reading

All executions used throwaway scripts in the scratchpad (`/tmp/claude-0/-home-user-Trillionaire-Me/9b8053b7-4992-5b73-97da-e00dc36d192d/scratchpad/*.scratch.ts`), run with the repo's own vitest and jsdom, synthetic fake data in the DEMO namespace. Nothing was added to the repo except this file.

**Proved by execution**
1. Full suite on the live tree: **1216 passed, 8 failed** (1224 tests, 101 files, 81 s). The 8 failures are in `connections`, `design_version`, `g1` (route coverage: `/more/connections`), `lang_menu`, `m_list_status` (2), `m_systems_rules_ui`, `screen_views_more`. Each is a route or link that the Settings-tab work is moving (`#/more/rules`, `/more/connections`). I did not check whether they pass at HEAD; they look transient from the in-flight edit. `tsc --noEmit`: clean.
2. **Route crawl:** every one of 68 concrete paths (all ROUTES, all 21 topic pages, 5 settings pages, 3 intake steps) rendered with a maximal synthetic seed. 0 exceptions. Link scan found **1 broken internal link**: `#/more/topics` (crumb on the Flashcards screen, `src/ui/screens.ts:821`; no such route). `/reward` is a route nothing links to (it duplicates `/journey/art`).
3. **Form-driven end-to-end journey** (typing into the real forms and submitting): intake steps 1 to 7 (profile, interests/strengths/values, skills, free hours and window, resources, goal, income) then task with "after" dependency and goal link, five money lines, North Star, venture, team role, risk, habit, flashcard, capture. All saved to the right entities (counts checked). Outputs then read from the screens: planner placed 2 of 2 tasks inside the 14 h/week, 18:00-22:00 window; Today, Journey, goal progress (50%), Report goal rings, weekly review, 90-day review, Four legs, Leak audit, plan history, horizon, personal/business money (net worth, monthly cash flow, runway, 90-day flow) all produced correct output. Unknown liability amount correctly produced "Not known yet", not 0.
4. **Data out and back:** JSON backup 4 records then clear then restore 4/4; CSV export then import 2/2 (health and worship fields are withheld unless authorised per record, confirmed); encrypted backup round trip; Wikipedia provider with a mocked fetch returned 3 option cards, and the offline path returned "offline"; AI and cloud ports return "not connected"; pure sync op applies.
5. **Sentinel test:** 13 distinctive values written into catalog fields, then 11 screens searched for them. 12 never appear anywhere (list in section 4).

**Only by reading code (not executed)**: PWA install and offline behaviour, notification delivery, azan sound, PIN lock flow, Bangla text quality, `tools/e2e.mjs` (not run here), prayer-time accuracy.

---

## 3. Module by module

Pipeline stages used: **I** input form, **S** storage/namespace, **C** pure calculation or rule, **O** output screens/charts/reports, **X** export/backup coverage, **L** links to dependent screens. All stored entities are in the generic record store, so S and X (JSON backup, CSV) hold automatically for anything that is stored.

| Module | Verdict | What is built (stage) | What is missing |
|---|---|---|---|
| M01 Profile and consent | COMPLETE | I intake 7 steps, save/resume, 4 unknown states, consent gate; S; O completeness %, "next needed" | Minor: `profile.language`, `profile.timezone`, `profile.birth_year` are saved but nothing reads them; `profile.health_note` has no input (step 0) |
| M02 Discover | PARTIAL | I interests (+energy), strengths, values, skills (+level, evidence), constraints, resources; C per-dimension level, path matching; O "what you bring" and path cards with why / unknown | Spec asks also experience, risk preference, learning style; values, constraint kind, `skill.evidence`, `resource.description` never used or shown; no Strength/Interest/Gap map; no explanation edit ("correct a decision"); no explicit "preliminary/incomplete" label |
| M03 North Star and ladder | PARTIAL | I metric/unit/baseline/target (many measures); C linear ladder; O ladder steps; goals by horizon (funnel, horizon arc) | No "current value" field, so no progress against the ladder; no link to Money net worth or Ventures; no "what does Trillionaire mean" selector (net worth / equity / business value / revenue); no weighting of several measures; no edit (add/remove only) |
| M04 Paths and opportunity library | PARTIAL | C keyword-theme match, shows why and unknown; O path cards on Plan; halal-check question page | Only 10 paths; entries have no source or date (Spec asks both and a stale flag); no numeric fit score or configurable weights; "my current business as an option" absent; halal flags are not attached to path cards |
| M05 Stage engine and journey log | PARTIAL | I/C Stage A auto-checks (diary required answers + 1 goal); pass with evidence; append-only stage pass and journey log; O ladder, passed banner, garden art, 3 stage-name templates | Stages B-H have one condition: "you wrote evidence" (no measurable exit, no data-linked check); no entry condition, review date, pause/rollback per stage; "before and after" is a single progress % |
| M06 Goals, tasks, habits | PARTIAL | I goal form (SMART, SWOT, area, status, progress mode), task (minutes, size, priority, after, goal link), habit + check-ins, focus timer, flashcards; C progress, planner; O many | Goal to subgoal to project tree: `src/core/goals.ts` is tested but **imported by nothing**; `goal.kind` and `goal.metric_label` have no input or reader; one level only (task to goal). No task edit found beyond done/not-true/remove |
| M07 Resources and finance | PARTIAL | I item form (asset/liability/income/expense, personal/business, period); C net worth, monthly flow, 90-day flow, runway; O summary, chart, leak audit, legs | No multi-currency/FX (BDT only); one-off and yearly lines counted but not converted; no budget template; no zakat snapshot calc; no unit economics; no link from a finance line to a venture; no edit |
| M08 Time and capacity | PARTIAL | I weekly hours + daily window; C planner (priority, dependency, minimum-week, pause); O week schedule, deferred reasons, feasibility note | Prayer/family/rest are "outside the free window by design", not placed as blocks (`blocked: []`); energy not modelled; `constraint.kind` and `hours_per_week` unused; `src/core/override.ts` (place on a hard constraint with log) is **imported by nothing** |
| M09 Venture portfolio | PARTIAL | I name/stage/ownership %; O list | `venture.valuation` field exists, no input, never shown (sentinel confirmed); no income/expense accounts per venture; no unit economics; no portfolio total; no edit |
| M10 Team and delegation | PARTIAL | I role + holder (me/someone/nobody); C count of gaps; O list | Tasks have no owner/role link; no hand-over step, no hiring step; no gap analysis beyond a count |
| M11 Research and options | COMPLETE (approved scope) | Wikipedia, tap-only, 2-3 cards, save/own/replace, cached offline with date and stale badge, secret check on query (executed with mock) | Used only on 5 fields (interest, skill, strength, value, goal title); Google search is BLOCKED (owner approval and key) |
| M12 Reality-changed and plan history | PARTIAL | "No longer true" on a task + log entry; plan history list (done, no-longer-true); minimum-week and pause modes | No event entry (income change, illness etc.); no dependency-graph impact analysis; no "max 3 options"; no plan-diff; no PlanVersion record; no approval step; "Reduce scope" and "Resume gently" not present; history shows task changes only |
| M13 Deen, ibadah, akhirah | PARTIAL | Prayer times (local calc), per-prayer marks, fast mark, azan and reminders with privacy, halal-check questions, Deen goal area is private | **No input forms** for Quran, zakat, giving, hajj/umrah, Deen learning, rights and duties (entities exist; Deen screen only shows field help). No zakat calculation. No Hijri calendar or Ramadan mode. Prayer note field never shown. Scripture content blocked (D-D) |
| M14 Health and family | NOT BUILT | Only the catalog field `profile.health_note` and the Life wheel areas health/family, Goal area "health"/"family" | No input for `health_note`, no health/family routine or goal track, no output |
| M15 Risk and stop criteria | PARTIAL | I risk, likelihood, stop rule, review date; C count without stop rule; O list, Today advice card | `risk.review_on` has no output: a past date (2026-11-01 in my run) shows no "due" flag or reminder; stop rule is never compared with any data |
| M16 Reviews and KPIs | PARTIAL | Weekly and 90-day review (tasks done, focus minutes, stage passes, habit check-ins), activity chart | KPI targets absent; no planned vs actual (estimate vs actual minutes or money); no monthly review; no assumptions check; finance and risk not in any review; no review save or note |
| M17 Knowledge and sources | PARTIAL | 21 topic guides, flashcards (boxes, due), saved option cards with fetch date and stale badge, glossary 34 terms (all marked unreviewed) | No Source entity; no notes/SOP store; topic and path entries carry no source and date |
| M18 Visual layer | PARTIAL | Stage ladder, journey art, money bars, goal rings, activity bars, habit grid, life wheel, goal universe, funnel, horizon arc, flow diagram. Every chart has "Show as text" | Goal tree, timeline/Gantt, Kanban, resource map, readiness map, plan-diff, option board: none exist |
| M19 Automation rules | COMPLETE | 4 local rules, default off, shown on Today, systems add/undo; no notification, rules never add tasks | Rule preview and rollback are limited to "undo the system you added" |
| M20 Sync, backup, recovery, export | PARTIAL | JSON backup/restore (atomic, "go back" snapshot), encrypted backup, CSV export and import with undo, weekly reminder, snapshots, storage status (all executed) | **PDF export not built**; offline op-queue and conflict rules exist (`src/core/sync.ts`, tested) but **imported by nothing**; real sync is BLOCKED (cloud, owner approval) |
| M21 Security and privacy | PARTIAL | Secret blocking on all free text, per-device consent tick, worship/health per-item authorisation on export, PIN lock, notification privacy, delete demo/real with typed confirm | Local encryption of data at rest not built (PIN is a screen cover only; documented as such); legal review at G7 |
| M22 Capability status and demo | COMPLETE (screen) | Status list, demo labelling, namespaces | Status model mixes two ideas (section 5) |
| M23 AI layer | BLOCKED-ON-OWNER | `AiAssistantPort`, null adapter, connected stub that throws, registry (executed: returns "not connected"); `adapters/onlineAdvice.ts` is **imported by nothing** | Needs D-C approval (cost, provider, cap) |
| M24 Template library | COMPLETE (personal edition) | 6 ready systems (one tap add, remove), 3 stage-name templates, goal-plan helpers | Public-edition templates and achievements (G8) |
| M25 When stuck | COMPLETE | 6 taps, causes, small helpers, logged | none found |

Also noted: schema skeleton has no `PlanVersion`, `PlanDiff`, `Decision`, `Option`, `Source`, `Achievement`, `Currency/FX`, `Review`, `SyncOp` entity (Spec section 8 lists them). Decision helper and Ownership check are stateless by design ("nothing is saved").

---

## 4. Stored but never shown (executed sentinel test)

Written into the store, then 11 screens searched. Never appeared anywhere:
`quran_activity.note`, `zakat_snapshot.note`, `giving.amount`, `hajj_plan.note`, `learning_item.title`, `right_duty.note`, `profile.health_note`, `venture.valuation`, `skill.evidence`, `resource.description`, `prayer_log.note`, `goal.metric_label`.
The first seven and `venture.valuation`, `goal.metric_label` also have no input form. `skill.evidence` and `resource.description` can be typed (intake) but nothing displays them afterwards.

Code present but unreachable from the app: `src/core/goals.ts` (goal tree), `src/core/override.ts` (hard-constraint override), `src/core/sync.ts` (op queue), `src/adapters/onlineAdvice.ts`.

---

## 5. Misleading status text and a better definition

Current card (`src/modules/capability.ts`, shown at `/more/status` and on each tab) has seven values in one list: `implemented`, `partial`, `demo`, `offline-ok`, `internet-needed`, `saved-background`, `not-built`. It mixes three things: how much is built, whether this device has demo data, and an attribute (works offline).

Mismatches found
- **Shows "implemented" but the note admits a gap:** M16 ("KPI targets not built"), M17 ("sources not tracked"), M05 (stages B-H are free text), M07 (BDT only, no zakat/unit economics), M08 (prayer not placed as blocks), M21 (no encryption at rest).
- **Shows "partial" but means "no input at all":** M14 (field defined, nowhere to type).
- **Shows "not-built" for something with a ready port:** M23 is really "ready, blocked on owner".
- **"Demo" appears on almost every card.** That is data presence for the current mode, and it hides the real question (is it built). In Real mode it would disappear, which would wrongly look like the build changed.
- **M13 "partial" is correct but too soft:** half of the module has no entry path.
- **Reverse case (understated):** M11 and M19 are reported fine; M20 says "partial" mainly because of sync, while backup, restore and CSV are fully built. Splitting M20 (local safety vs cloud sync vs PDF) would be more honest.

Proposed definition
1. **Build status (per module, from the code, not from data):** a six-box pipeline checklist `Input · Store · Calc · Output · Export · Links`, each box Built / Missing / Not needed, and one rolled-up label: **Complete** (all needed boxes built), **Partial** (list the missing boxes by name), **Not built**, **Blocked: needs your approval** (port ready, with D-number).
2. **Data status (per module, per device, per mode):** Empty / Has demo data / Has real data / Needs more data for this output. This is the only place the word Demo appears.
3. **Attributes (small chips, not statuses):** works offline, uses the internet only after a tap, private by default.
4. **Evidence rule:** each box points to a route or function plus a test (extend `src/modules/evidence.ts`, which already does this for the module as a whole). A test fails if a box says Built and the route or function is missing, or if a catalog field has no input and no reader and the module still claims Complete. The crawl and sentinel scripts used here are a starting point.

---

## 6. Summary table: module, verdict, missing pieces, effort, order

Effort: S = under a day, M = 1-3 days, L = a week or more. Order = suggested build sequence (1 first).

| Module | Verdict | Missing pieces | Effort | Order |
|---|---|---|---|---|
| M22 | COMPLETE | Redefine status (build vs data, pipeline boxes) | M | 1 |
| M13 | PARTIAL | Input + simple output for Quran, zakat (calc from own numbers, no ruling), giving, hajj plan, learning, rights; Hijri date and Ramadan view; prayer note shown | L | 6 |
| M14 | NOT BUILT | Health/family track: note input, routine/goal link, private view | M | 5 |
| M03 | PARTIAL | Current-value entry, progress on ladder, link to net worth, definition selector, several measures side by side | M | 2 |
| M09 | PARTIAL | Valuation input, per-venture income/expense (link finance lines), portfolio total, edit | M | 4 |
| M07 | PARTIAL | Link to ventures, yearly/one-off conversion option, FX, zakat snapshot, unit economics | L | 4 |
| M16 | PARTIAL | KPI targets, planned vs actual, monthly review, assumptions, include money and risk | M | 3 |
| M15 | PARTIAL | Review-date due flag and reminder; stop-rule check prompt | S | 2 |
| M05 | PARTIAL | Measurable exit conditions B-H linked to data, review date, pause/rollback, entry condition | L | 5 |
| M12 | PARTIAL | Event entry, impact scan over dependencies, up to 3 options, plan-diff, PlanVersion, approval, reduce-scope / resume-gently | L | 6 |
| M06 | PARTIAL | Wire goal tree (subgoal, project), `goal.kind`, task edit | M | 3 |
| M08 | PARTIAL | Prayer and rest blocks inside window, energy, wire `override.ts` | M | 4 |
| M10 | PARTIAL | Task owner/role link, hand-over step, role gap output | M | 5 |
| M02 | PARTIAL | Missing question sets (experience, risk, learning style), use of values/constraints, gap map | M | 4 |
| M04 | PARTIAL | Source and date per path, more paths, fit weights, halal flag on cards, own-business option | M | 5 |
| M17 | PARTIAL | Source entity, notes/SOP, source on topics | M | 6 |
| M18 | PARTIAL | Goal tree, timeline, Kanban, resource map, readiness map, plan-diff, option board (all with text version) | L | 7 (after the data they draw exists) |
| M20 | PARTIAL | PDF export; wire sync queue only when cloud is approved | S (PDF) | 3 (PDF) |
| M21 | PARTIAL | Encrypt data at rest (key from PIN or passphrase) | L | 7 |
| M23 | BLOCKED | Owner approval D-C; then adapter | n/a | after approval |
| M01, M11, M19, M24, M25 | COMPLETE | Housekeeping: unused profile fields; Google search needs approval | S | any |

## 7. Prioritised completion plan

1. **Truth first (M22, S-M).** Replace the single status list with Build pipeline boxes plus a separate Data status, and add the test that fails on stored-but-unreachable fields. Fix the broken `#/more/topics` link and decide on `/reward`. Cheap, and it stops the app from misleading the owner.
2. **Close the core promise: "where am I against the target".** M03 current value and progress, M15 review-date flag. These two small changes make the headline goal measurable.
3. **Reviews and structure.** M16 KPI targets and planned-vs-actual, M06 wire the goal tree, M20 PDF export.
4. **Money and ventures.** M09 valuation and venture-linked income/expense, M07 FX and conversions, M08 prayer and rest blocks and override wiring, M02 missing question sets.
5. **Gates and people.** M05 measurable exits and review dates, M10 task owner and hand-over, M04 sources and weights, M14 health/family track.
6. **Deen and reality loop.** M13 full set of inputs and outputs (the largest gap against the owner's stated intent INT-06/07), M12 full loop with plan versions and diff, M17 sources.
7. **Visuals and hardening.** M18 remaining visuals once their data exists, M21 encryption at rest.
8. **Needs the owner:** M23 AI and cloud sync (D-C), Google search key, scripture (D-D), Bangla reviewer sign-off.

Caveats: counts of "unreachable" rely on grep and on the sentinel run, so a field read by dynamic key could be missed (SWOT fields use a dynamic key and are excluded from the list). The 8 failing tests were observed on a tree with unfinished Settings work and are not attributed to HEAD.

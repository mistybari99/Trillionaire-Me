# Full App Review, function by function (6 Nov 2026)

## সারাংশ (মালিকের জন্য)
1. আপনি বলেছিলেন: অ্যাপের প্রতিটা ফাংশন ধরে দেখো, ডাটা, টুল আর তথ্য যথেষ্ট আছে কি না। এটা তার রিপোর্ট।
2. মোট 84টা ফাংশন দেখা হয়েছে। এর মধ্যে 52টা যথেষ্ট, 28টা আংশিক, 4টা এখনো অনেক বাকি।
3. যথেষ্ট মানে: কোড আছে এবং টেস্ট আছে। কিছু ফাংশনে আসল ফোনে হাতে টেস্ট এখনো বাকি। সেগুলোতে "ফোনে টেস্ট বাকি" চিহ্ন আছে। এতে অবস্থা কমানো হয়নি।
4. 25টা মডিউলের মধ্যে অ্যাপের নিজের হিসাবে 22টা কমপ্লিট, 2টা আংশিক (M09, M21), 1টা আটকে আছে (M23, আপনার খরচের অনুমতির অপেক্ষায়)।
5. কোনো রিকোয়ারমেন্ট এখানে "ভেরিফায়েড" লেখা হয়নি। রেজিস্টারে 86টা রিকোয়ারমেন্টের সাথে টেস্টের লিংক নেই।
6. সবচেয়ে বড় ফাঁক 1: টাকার হিসাবের গভীরতা। ব্যবসার ইউনিট ইকোনমিক্স ও ব্রেক-ইভেন (M09) নেই। ঋণের প্ল্যান, জরুরি রিজার্ভ আর খারাপ অবস্থার হিসাব (M07) নেই।
7. সবচেয়ে বড় ফাঁক 2: ডাটা সুরক্ষা। ফোনের ভেতরের রেকর্ড এনক্রিপ্ট করা নেই (আপনার সিদ্ধান্ত লাগবে)। অডিট লগ নেই। হাতে বসানোর ওভাররাইড বানানো নেই।
8. সবচেয়ে বড় ফাঁক 3: কনটেন্ট ও প্রমাণ কম। পথের লাইব্রেরিতে মাত্র 10টা এন্ট্রি, সব "যাচাই হয়নি"। 86টা রিকোয়ারমেন্টের টেস্ট লিংক নেই।
9. AI (M23) ইচ্ছা করেই বন্ধ। আপনার খরচের অনুমতি (D-C) ছাড়া চালু হবে না। ক্লাউড সিঙ্কও একই কারণে বন্ধ।
10. ফোনে পরীক্ষা আপনার কাজ: OWNER-01 (ইনস্টল, অফলাইন, রিস্টোর), OWNER-02 (রিমাইন্ডার, লক-স্ক্রিন), OWNER-03 (নামাজের সময়)।
11. রিভিউয়ার লাগবে: বাংলা (OWNER-04), হাদিস ও হালাল-চেক কনটেন্ট (OWNER-06)।
12. সেকশন 4-এ 22টা আইডিয়া আছে, গুরুত্ব অনুযায়ী সাজানো। কোনো স্কোর, র‍্যাংক বা স্ট্রিক নেই। অজানা মানে 0 নয়। সম্পদের কোনো গ্যারান্টি নেই।
13. সেকশন 5-এ দেখানো আছে: অ্যাপের সব 57টা রুট, 4টা রিডাইরেক্ট এবং M01–M25 সব মডিউল ঠিক একবার করে আছে।
14. সেকশন 6-এ বলা আছে কী যাচাই করা হয়নি: টেস্ট আবার চালানো হয়নি, ফোনে দেখা হয়নি।
15. সিদ্ধান্ত লাগবে: ডাটা এনক্রিপশন করবেন কি না (DECISION-01) · আমার সুপারিশ: হ্যাঁ, রিকভারি ফাইলসহ · না বললে আমি কোনো এনক্রিপশন যোগ করব না।

**Method.** Three slice reviews (A1 Plan/Journey, A2 Life/Money, A3 Platform/Trust) were merged. Sources: `src/app.ts` ROUTES/REDIRECTS, `src/modules/capability.ts`, `docs/design/m-list-status.md`, `docs/register/EVIDENCE_GAPS_2026-11-06.md`, `docs/audit/OWNER_DEMAND_AUDIT_2026-11-03.md`, `docs/audit/VERIFY-01_2026-11-06.md`, `docs/plan/PLAN_TRACKER.md`, `DECISIONS_LOG.md`, tests by file name. Status rules: ENOUGH = code and a test file exist (a missing physical-phone check adds a "phone proof pending" mark, never lowers the status); PARTIAL = something real is missing; MISSING = not built (BLOCKED = waits for an owner decision). Where drafts disagreed, code or test evidence decided; equal evidence = lower status (see Section 6).

## 1. ENOUGH (52)
| ID | Function | Route | Source / test | Note (phone proof pending, or small gap) |
|---|---|---|---|---|
| E1 | First-run start | /start | `src/ui/onboardUi.ts`; `tests/onboarding.test.ts` | |
| E2 | Journey home, stage ladder (M05) | /journey | `src/ui/screens.ts` journey; `tests/stages.test.ts` | Stage label "Stage n / total" built (screens.ts:1063) |
| E3 | Stage gates, own exit rules | /journey/gates | `src/ui/planScreens.ts`; `tests/stage_gates.test.ts` | Reads only own numbers, correct |
| E4 | Life Areas Wheel | /journey/wheel | `src/ui/lifeUi.ts`; `tests/life_goal_step5.test.ts` | No wheel history over time (idea) |
| E5 | Goal Universe | /journey/universe | `src/ui/universeUi.ts`; `tests/goal_universe.test.ts` | |
| E6 | Goals tree list | /journey/goals | `src/ui/lifeUi.ts`; `tests/goal_tree.test.ts`, `goal_overview`, `goal_delete` | |
| E7 | North Star + ladder (M03) | /journey/northstar | `src/ui/planScreens.ts`; `tests/north_star.test.ts` | REQ-001 not linked to a TM-TST |
| E8 | Decision tool | /journey/decide | `src/ui/decisionUi.ts`; `tests/decisions.test.ts` | |
| E9 | Four legs + leak review | /journey/legs, /journey/leak | `src/ui/legsUi.ts`; `tests/legs.test.ts` | No time-funnel visual |
| E10 | Reality-changed loop (M12) | /journey/reality | `src/ui/realityUi.ts`; `tests/reality_loop.test.ts`, `o6_reality_review_templates.test.ts` | Fixed rules, no AI (D-C) |
| E11 | Plan history + compare (M12) | /journey/history | `src/ui/planScreens.ts`, `src/core/planHistory.ts`; `tests/m_screens_ui.test.ts` l.96,133,143, `reality_loop.test.ts` | Screen test is smoke + links; Register REQ-008/046 not linked |
| E12 | Risk + stop criteria (M15) | /journey/risks | `src/ui/planScreens.ts`; `tests/risk_review.test.ts` | No heat map, no starter risk list |
| E13 | Weekly review | /journey/week | `src/ui/screens.ts`; `tests/weekly_review.test.ts` | |
| E14 | Monthly review + money | /journey/month | `src/ui/monthUi.ts`; `tests/month_review.test.ts` | No month-vs-baseline chart |
| E15 | 90-day review | /journey/review | `src/ui/screens.ts` reviewScreen; `tests/o6_reality_review_templates.test.ts` | |
| E16 | Print / Save as PDF | /journey/print/:x | `src/ui/printUi.ts`, `src/core/printDoc.ts`; `tests/print_pdf.test.ts`, `multi_goal_print.test.ts` | Phone PDF output: phone proof pending OWNER-01. No venture/health/team/deen sheet |
| E17 | Boards (timeline/task/option) | /journey/boards | `src/ui/boardsUi.ts`; `tests/boards.test.ts`, `maps.test.ts` | |
| E18 | Backward planning wizard | /journey/backward(/:id) | `src/ui/backwardUi.ts`; `tests/backward_plan.test.ts` | Audit row 114 says MISSING: stale |
| E19 | Visual charts (M18) | inside Money/Report/Review | `src/ui/charts.ts`; `tests/charts.test.ts` | Template chooser on 7 screens only |
| E20 | Automation rules (M19) | /settings/plan/automation | `src/core/rules.ts`; `tests/rules.test.ts`, `m_systems_rules_ui.test.ts` | 4 rules, default OFF |
| E21 | Profile + consent intake (M01) | /diary, /diary/intake(/:n) | `src/core/profileView.ts`, `src/ui/screens.ts` intake; `tests/profile_view.test.ts`, `g3ui.test.ts` | REQ-012/013/016/018 fields have no linked test |
| E22 | Time and capacity (M08) | /today | `src/core/planner.ts`, `timeBlocks.ts`, `reminders.ts`, `ics.ts`; `tests/b9_plan_flow.test.ts`, `time_blocks`, `ics` | Planned-vs-actual (REQ-138) not found |
| E23 | Team and delegation (M10) | /diary/team | `src/core/team.ts`; `tests/team_handover.test.ts` | Hiring plan thin |
| E24 | Salah times, one-tap marks (M13) | /deen | `src/core/prayer.ts`, `prayerLog.ts`; `tests/prayer.test.ts` | Times vs timetable: phone proof pending OWNER-03 |
| E25 | Deen plans: learning, family, giving | /deen/plans | `src/core/deenPlans.ts`; `tests/deen_plans.test.ts` | Rights/duties not a separate tool |
| E26 | Health and family (M14) | /diary/health | `src/core/health.ts`; `tests/health.test.ts` (11 it) | No ranges by design |
| E27 | Flashcards (M17) | /cards | `src/core/cards.ts`; `tests/focus_habits_cards.test.ts` | |
| E28 | Notes, sources, SOPs (M17) | /notes | `src/core/knowledge.ts`; `tests/notes_sops.test.ts` | |
| E29 | Quick capture | /capture | `src/core/capture.ts`; `tests/capture.test.ts` | REQ-181 not linked |
| E30 | Backup save + encrypted backup (M20) | /settings/backup | `src/core/backup.ts`, `cryptoBackup.ts`; `tests/g2.test.ts`, `crypto_backup`, `backup_page` | |
| E31 | Restore: preview, atomic, Cancel default | /settings/backup/restore | `src/core/restore.ts`; `tests/restore_safety.test.ts`, `restore_ui` | Phone proof pending OWNER-01 |
| E32 | Auto snapshots | /settings/backup/snapshots | `src/ui/backupUi.ts`; `tests/snapshot_restore_ui.test.ts` | |
| E33 | CSV export / import | /settings/backup/csv | `src/core/csv.ts`; `tests/csv_export.test.ts`, `csv_import` | Worship/health fields left out unless authorised (csv.ts header) |
| E34 | Weekly backup reminder, storage persistence | /settings/backup/reminder | prefs `backupRemind`; `tests/storage_status.test.ts` | Browser may evict storage: platform limit |
| E35 | Secret blocking (password, OTP, card, NID) | free-text forms; /more/safety | `src/core/safety.ts`; `tests/g1.test.ts`, `o8_*` | TM-REQ-004/034 not linked to TM-TST |
| E36 | App PIN lock | /settings/privacy/applock | `src/core/appLock.ts` (PBKDF2 310k; forgot-PIN removes only the PIN after 15 min wait, data untouched); `tests/app_lock.test.ts` | Screen cover only; no biometrics. Encryption = X1 |
| E37 | Real-data consent (D-B), withdraw | /settings/privacy/consent | `src/core/consent.ts`; `tests/settings_gaps`, VERIFY-01 | Phone proof pending OWNER-01 |
| E38 | Privacy readout | /settings/privacy | `src/ui/privacyUi.ts`; `tests/privacy_page.test.ts` | Recheck when D-C opens |
| E39 | Safety and limits page | /more/safety | `src/ui/screens.ts` safety; `tests/g1.test.ts` | Legal review at G7 |
| E40 | Capability status (M22) | /more/status | `src/modules/capability.ts`; `tests/m_list_status.test.ts` | |
| E41 | Demo vs real labelling | /settings/data, banner | `src/ui/dataUi.ts`, `modeUi.ts` | |
| E42 | Where-we-are page | /more/where | `src/ui/whereUi.ts`; `tests/where_page.test.ts` | |
| E43 | Data dictionary | /more/dictionary | `IM.dictionaryScreen`; `tests/g1.test.ts` | |
| E44 | Field guide | /more/fields | `src/ui/screens.ts` fieldsGuide; `tests/field_reach.test.ts` | |
| E45 | Settings shell, search, quick card | /settings(/:a(/:b)) | `src/ui/settingsUi.ts`, `settingsRegistry.ts` (34 rows); `tests/settings_shell.test.ts`, `settings_search` | settings-inventory.md is stale |
| E46 | Old-address redirects + "moved" note | REDIRECTS | `src/app.ts` l.99; `tests/settings_redirects.test.ts` | |
| E47 | Plan mode, stage template, weighting | /settings/plan | `src/ui/planSettings.ts`; `tests/plan_settings.test.ts` | |
| E48 | Lock-screen notification privacy | /settings/privacy/lockscreen | `src/core/notify.ts`; `tests/notify.test.ts`, `o8_notify_privacy` | Phone proof pending OWNER-02 |
| E49 | Reminders engine (in-app, .ics) | /settings/prayer/reminders | `src/core/reminders.ts`; `tests/reminders*.test.ts` (5) | Closed-app delivery: phone proof pending OWNER-02 |
| E50 | Azan / prayer alerts | /settings/prayer/prayeralerts | `src/core/azanSlots.ts`; `tests/azan_slots` | Phone proof pending OWNER-02 |
| E51 | Offline app shell | public/sw.js | `public/sw.js`; `tests/sw_install_failure.test.ts`; e2e `tools/e2e.mjs` 104 PASS (VERIFY-01) | Phone proof pending OWNER-01; hadith chunk 541 kB (PERF-01) |
| E52 | Prayer method / place settings | /settings/prayer/* | `src/core/prayerMethod.ts`; `tests/prayer.test.ts` | Phone proof pending OWNER-03 |

## 2. PARTIAL (28)
| ID | Function | Route | Source / test | Exactly what is missing |
|---|---|---|---|---|
| P1 | Journey log (M05) | /journey/log | `screens.ts` journeyLog; `tests/stages.test.ts`, `r5_stuck_log.test.ts` | Ups-and-downs wave (audit batch4 #37) |
| P2 | Goal page: why, SMART, SWOT | /journey/goal/:id | `lifeUi.ts`; `tests/goal_form.test.ts`, `goal_credit` | Milestones, obstacle, if-then, Want-Feel-Do card, action-plan table |
| P3 | Planner: tasks, schedule | /diary/plan | `screens.ts` planScreen; `tests/task_goals.test.ts`, `m_dependency` | Must-do vs if-time, tomorrow list, effort buffer, time batching |
| P4 | Habits + restart plan | /habits | `src/core/habits.ts`, `habitGoals.ts`; `tests/habit_grid`, `focus_habits_cards_ui` | Categories, start/end dates, reminders, micro-habit starter (audit rows 86, 87, 145) |
| P5 | Horizon view (M03) | /journey/horizon | `screens.ts` horizonScreen; `tests/horizon.test.ts` | Moving marker, 5y-to-now cascade with "one thing" |
| P6 | Assessment + path fit (M02/M04) | /diary/plan (section) | `src/ui/assessment.ts`, `src/library/paths.ts`; `tests/o5_assessment_fit`, `path_sources_weights` | Only 10 builder-written paths, no outside source; no working-style chooser, no "where am I" check |
| P7 | Ownership triage | /journey/mine | `decisionUi.ts` (answers in a Map, memory only); `tests/decisions.test.ts` | Answers not stored |
| P8 | Report | /journey/report | `screens.ts` reportScreen; `tests/charts.test.ts`, `o6_*` | Only smoke (g1) names the screen; no own render test |
| P9 | KPI targets (M16) | /journey/kpi | `planScreens.ts`; `tests/kpi.test.ts` | Starter KPI sets, per-KPI trend, CSV export |
| P10 | Journey art | /journey/art | `screens.ts` artScreen (linked screens.ts:1158); `tests/r4_motion.test.ts` | One metaphor only, no choice; no own art test |
| P11 | Reward | /reward | `ui/rewardArt.ts`, `core/reward.ts`; `tests/topics_rewards.test.ts` | Metaphor picker, particles to goal cup (audit rows 112, 161) |
| P12 | Template library (M24) | /more/library | `libraryScreens.ts`, `library/systems/*.json`; `tests/systems.test.ts` | Only 6 systems; no situation picker, no goal/KPI/risk templates (public pack = G8) |
| P13 | When stuck (M25) | /stuck | `screens.ts` stuckScreen; `tests/stuck.test.ts` (7 it) | Setback journey, courage bridge, emotion card |
| P14 | Money (M07) | /diary/money | `core/finance.ts`, `financeInputs.ts`; `tests/money.test.ts` (6), `money_fx` (20) | Debt plan (REQ-027), emergency reserve (026), downside scenarios (029), budget templates (024), 4-account routing (025) |
| P15 | Ventures (M09) | /diary/ventures | `core/ventures.ts`; `tests/venture_value.test.ts`, `m_registers` | Calc box missing (capability.ts BBMBBB): unit economics, margin, break-even, working capital (057), valuation note (031) |
| P16 | Research options (M11) | /diary/intake | `core/research.ts`, `adapters/wikipedia.ts`; `tests/research`, `wikipedia`, `m11_background_cache` | Wikipedia only; Google card needs server function + owner key (D-C); needs internet |
| P17 | Fasting + Hijri (M13) | /deen | `core/fastLog.ts`, `hijri.ts`, `ui/hijriUi.ts` (Ramadan view exists); `tests/fast_log`, `hijri` | Qada/fidya/kaffara tools (REQ-105), moon-sighting status (112) |
| P18 | Zakat | /deen/plans | `core/deenPlans.ts` zakatFigure; `tests/deen_plans.test.ts` | Per-asset-class lines (106), Zakat al-Fitr (107), sadaqah/waqf/Qurbani kinds (109); scholar review owner task; no fatwa |
| P19 | Hadith reader (D-D) | /hadith | `core/hadith.ts`, `src/library/hadithPack.json` (212 entries); `tests/hadith.test.ts` (8) | Reviewer sign-off OWNER-06; Quran text not built; few tests |
| P20 | Topics + content packs (M17) | /topics, /topic/:id | `library/topics.ts`, `public/content/pack-001..009`; `tests/topics_rewards`, `content_pack` | Bangla review OWNER-04; generic sources; no digital-safety topic |
| P21 | Focus timer | /focus/:id | `core/focus.ts`; `tests/focus_habits_cards_ui.test.ts` | Subject totals/rings (audit rows 70, 137) |
| P22 | Cloud sync, conflicts (own row) | /settings/connections | `connectionsUi.ts`, `adapters/connectedStubs.ts`; `tests/connections.test.ts` | BLOCKED by D-C (cost). Multi-device sync and conflict UI (REQ-085-087, 090); op-queue code removed (DECISIONS_LOG) |
| P23 | Delete demo / real data | /settings/delete | `deleteUi.ts`; `tests/delete_page.test.ts` | No delete-one-type, no retention page (REQ-094/156) |
| P24 | Glossary (Bangla) | /more/glossary | `screens.ts`; `tests/g1.test.ts`, `bangla_plain` | Marked "যাচাই হয়নি"; reviewer OWNER-04 (TM-TST-161) |
| P25 | Halal-check flags | /more/halal-flags | `lazyScreens` HALAL; tests in g1 | Draft content, review OWNER-06; no scripture (D-D) |
| P26 | Look: language, theme, size, motion | /settings/home, /settings/look | `settingsRegistry.ts`; `tests/i18n_modes`, `a11y_looks` | No high-contrast, font choice, week start, date/currency format (REQ-011/069) |
| P27 | Accessibility | all screens | `tests/a11y*.test.ts`, `settings_gaps` | Text equivalents for visuals (REQ-068) not linked; TalkBack pass is phone proof pending |
| P28 | Prayer-time sync (opt-in) | /settings/prayer/prayersync | `core/prayerSource.ts`; `tests/prayer_sync.test.ts` | builder check VERIFY-03 was run on 6 Nov 2026, 20 of 20 checks pass (`evidence/verify03-prayer-sync.json`: zero requests when consent off, request fields, withdraw, fallback; provider mocked); still open: compare against the official timetable (OWNER-03) |

## 3. STILL MUCH MISSING (4)
| ID | Function | Route | Source | What is missing |
|---|---|---|---|---|
| X1 | At-rest encryption of records (M21 store box) | /more/safety (text only) | `capability.ts` M21 BMBBBB; PLAN_TRACKER DECISION-01 (Blocked); `docs/design/at-rest-encryption.md` | Records sit plain in IndexedDB. Needs owner decision + key and recovery design. REQ-096 |
| X2 | Hand-placing over a hard block (override), REQ-040 | none | DECISIONS_LOG (2 Nov) removed `src/core/override.ts`; commit 244d6f8 | Needs block length (prayer), stored placement, migration. Archive row says Built: wrong |
| X3 | Audit log, REQ-097 | none | grep "audit log" in `src` = no hit | Only plan history and journey log exist. No trail of restore/delete/consent changes |
| X4 | AI layer (M23), BLOCKED D-C | /settings/connections | `capability.ts` M23 `--MM--`; `adapters/connectedStubs.ts` throws NotEnabledError | Calc and output absent on purpose. Waits for provider, cap, cost, key custody (owner) |

## 4. Ideas to make it super-perfect (ranked)
| # | Idea | Tag / guardrail |
|---|---|---|
| 1 | Venture unit economics + break-even + margin card: user's own price, cost, units; Unknown if any blank | unknown is not 0; no return promise (closes P15) |
| 2 | Money depth: emergency reserve from own obligations, "income drops X" runway, two debt payoff orders side by side (no "best"), budget templates | arithmetic, not advice; no guarantees (P14) |
| 3 | Link the 86 unlinked Register rows to existing tests; show the count on /more/status | Register rule: never Verified without artifact |
| 4 | Path library 10 to 40+, each with source name, date, "stale after 180 days", Bangladesh first | no invented stats; "যাচাই হয়নি"; D-C only if fetched live |
| 5 | Goal worksheet (3 milestones, obstacle, if-then, first action) + planner extras (must-do vs if-time, tomorrow list) | overload mode adds no tasks; no missed-goal red copy |
| 6 | At-rest encryption: random data key wrapped by passphrase + mandatory recovery file | DECISION-01 owner, D-B |
| 7 | Time-cascade horizon (5y, 1y, month, week, today) with moving marker and "one thing" | no streaks |
| 8 | "Safety check" screen: lock, backup age, last restore test, storage, consent as done / not done | no scores or ranks |
| 9 | Zakat sheet by asset class with as-of date; Zakat al-Fitr; qada/fidya as plain typed counts | no fatwa, no default nisab, no piety score; scholar review (owner) |
| 10 | Settings parity: high contrast, font choice, week start, date/number format, currency (BDT default) | Latin digits; REQ-011/069 |
| 11 | Reward metaphor picker (jar, bridge, rings) with calm reduced-motion SVG; habit categories and micro-habit starter | CLAUDE s9; no ranks, no streak shame |
| 12 | Setback journey + "where am I" (lost / learning / executing) routed into Stuck | missed goals never red; no AI |
| 13 | KPI starter sets per stage + sparkline + CSV; risk starter templates and user-rated grid | unknown is not 0; no return promises |
| 14 | Portability pack (JSON + CSV + print + dictionary) and per-type deletion with undo window and receipt | D-B; REQ-094/156; irreversible-action rule |
| 15 | Restore rehearsal into a throwaway namespace, compare counts | OWNER-01 evidence; irreversible rule |
| 16 | Local append-only audit list of restore / delete / consent changes, no personal content | REQ-097; D-B (closes X3) |
| 17 | More ready systems (20+) and a situation picker; user-made rules | public pack = G8 new owner approval; no off-device push |
| 18 | Per-module PDF/ICS (health week, team table, venture sheet, deen plan) | real data stays on device (D-B) |
| 19 | Named-reviewer flow for Bangla and hadith: "reviewed by / date" per line | OWNER-04, OWNER-06, D-D |
| 20 | Google option card via server function; save an option card into Notes with source + date | D-C cost + owner key |
| 21 | Optional AI re-plan / stuck coach / habit coach, off by default, rule-based stays default | D-C owner cost approval |
| 22 | Cloud sync with conflict screen and freshness line; offline self-test button and smaller hadith chunk | D-C + owner account step; PERF-01 |

## 5. Coverage proof
### 5a. Routes of `src/app.ts` (57 ROUTES + 4 REDIRECTS), each exactly once
| # | Route | Row | # | Route | Row |
|---|---|---|---|---|---|
| 1 | /start | E1 | 32 | /journey/kpi | P9 |
| 2 | /today | E22 | 33 | /diary/ventures | P15 |
| 3 | /journey | E2 | 34 | /diary/health | E26 |
| 4 | /journey/log | P1 | 35 | /diary/team | E23 |
| 5 | /journey/wheel | E4 | 36 | /stuck | P13 |
| 6 | /journey/universe | E5 | 37 | /topics | P20 |
| 7 | /journey/goals | E6 | 38 | /topic/:id | P20 |
| 8 | /journey/goal/:id | P2 | 39 | /reward | P11 |
| 9 | /journey/horizon | P5 | 40 | /journey/art | P10 |
| 10 | /diary | E21 | 41 | /focus/:id | P21 |
| 11 | /diary/intake(/:n) | E21 | 42 | /habits | P4 |
| 12 | /diary/plan | P3 | 43 | /hadith | P19 |
| 13 | /diary/money | P14 | 44 | /cards | E27 |
| 14 | /capture | E29 | 45 | /notes | E28 |
| 15 | /journey/report | P8 | 46 | /deen | E24 |
| 16 | /journey/print(/:x) | E16 | 47 | /deen/plans | E25 |
| 17 | /journey/week | E13 | 48 | /settings/connections | P22 |
| 18 | /journey/month | E14 | 49 | /settings(/:a(/:b)) | E45 |
| 19 | /journey/decide | E8 | 50 | /more/where | E42 |
| 20 | /journey/mine | P7 | 51 | /more/status | E40 |
| 21 | /journey/legs | E9 | 52 | /more/fields | E44 |
| 22 | /journey/leak | E9 | 53 | /more/glossary | P24 |
| 23 | /journey/review | E15 | 54 | /more/safety | E39 |
| 24 | /journey/risks | E12 | 55 | /more/dictionary | E43 |
| 25 | /journey/history | E11 | 56 | /more/library | P12 |
| 26 | /journey/northstar | E7 | 57 | /more/halal-flags | P25 |
| 27 | /journey/reality | E10 | R1 | /more -> /settings | E46 |
| 28 | /journey/boards | E17 | R2 | /more/data -> /settings/data | E46 |
| 29 | /journey/backward | E18 | R3 | /more/connections -> /settings/connections | E46 |
| 30 | /journey/backward/:id | E18 | R4 | /more/rules -> /settings/plan/automation | E46 (target E20) |
| 31 | /journey/gates | E3 | | | |

Settings sub-pages under row 49 are covered by E30-E34, E36-E38, E41, E47-E50, E52, P23, P26, P28. Non-route entry points: lock screen (E36), first-run screen (E37), service-worker notification click (E51).

### 5b. Modules M01-M25 (label from `capability.ts` / `m-list-status.md`: 22 complete, 2 partial, 1 blocked)
| Module | Build label | Rows | Module | Build label | Rows |
|---|---|---|---|---|---|
| M01 Profile | complete | E21 | M14 Health | complete | E26 |
| M02 Discover | complete | P6 | M15 Risk | complete | E12 |
| M03 North Star | complete | E7, P5 | M16 Reviews, KPIs | complete | E13-E15, P9 |
| M04 Paths | complete | P6 | M17 Knowledge | complete | E27, E28, P20 |
| M05 Stages, log | complete | E2, E3, P1 | M18 Visual layer | complete | E17, E19, P10 |
| M06 Goals, tasks, habits | complete | E6, P2, P3, P4 | M19 Automation | complete | E20 |
| M07 Finance | complete | P14 | M20 Sync, backup, export | complete | E30-E34, P22 |
| M08 Time | complete | E22 | M21 Security | partial | E35-E39, E48, X1 |
| M09 Ventures | partial | P15 | M22 Status, demo | complete | E40-E42 |
| M10 Team | complete | E23 | M23 AI layer | blocked D-C | X4 |
| M11 Research | complete | P16 | M24 Template library | complete | P12 |
| M12 Reality, history | complete | E10, E11 | M25 When stuck | complete | P13 |
| M13 Deen | complete | E24, E25, P17-P19 | | | |

Note: the build label counts only six software boxes. This review is stricter (data depth, owner asks), so M07, M11, M13, M17, M24, M25 show PARTIAL rows although their label says complete.

## 6. Disagreements, checks and limits
| Item | Result |
|---|---|
| Disagreement: /journey/log | A1 PARTIAL (visual ask), A2 ENOUGH. Equal evidence, lower status kept (P1) |
| Disagreement: /journey/report | A1 ENOUGH, A2 PARTIAL (screen only in smoke tests). Lower kept (P8); /journey/review stays ENOUGH (own o6 tests) |
| Disagreement: audit log | A1 PARTIAL, A2/A3 MISSING. No code found, so MISSING (X3); plan history noted |
| Disagreement: M23 label | A3 "MISSING", A2 "blocked". Shown as BLOCKED inside Section 3; counted in the 4 |
| Disagreement: Habits/Reward | Listed once each (P4 /habits, P11 /reward, P10 /journey/art), no double count |
| Open: /diary/intake M11 reach | A2 said research is reachable only from intake; no separate line cited, kept as stated |
| Corrected by me: PIN reset | Not "unclear": `src/core/appLock.ts` documents it (E36) |
| Corrected: Ramadan view | Exists (`src/ui/hijriUi.ts` imports ramadanView), A2 draft was wrong |
| Corrected: settings rows | `src/ui/settingsRegistry.ts` has 34 `R(` rows, not 38 (A3 draft) |
| Corrected: money tests | 6 (money.test.ts) + 20 (money_fx.test.ts) `it(` hits, not "6 only" |
| Corrected: history test | `tests/m_screens_ui.test.ts` l.96, 133, 143 open /journey/history (A1 said none) |
| Corrected: Stage label | Built: `stage.progress` at `src/ui/screens.ts:1063`, `src/i18n/packs.ts:735, 2663` (earlier greps missed it) |
| Also verified in repo | paths.ts = 10 `P(` entries; hadithPack.json = 212 entries; no break-even/unit-economics code in `src/core`; override.ts and sync.ts removed; /journey/art linked at screens.ts:1158; EVIDENCE_GAPS lists 86 rows; capability.ts M09 BBMBBB, M21 BMBBBB, M23 --MM-- |
| Not checked | Tests were not re-run (statuses rest on file names and greps, "it(" counts are rough). No physical phone was used. Bangla wording quality, legal and scholar review, real prayer times were not judged. No requirement is marked Verified here |

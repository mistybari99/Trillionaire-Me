# Owner demand audit (read-only)

Date: 25 Oct 2026 (full re-check 31 Oct 2026, see the end) · Branch: `ccr-8b686ba2-vitt45` · Method: read the owner sources (ROADMAP, PLAN, early-plan and M-list status, visual-references batches 1–9, life-system brief, content-first brief, DECISIONS_LOG, CLAUDE §8–9), then checked each demand against `src/` and `tests/`. `npx vitest run` on the 25 Oct reading: 44 files, 606 tests, all passing. The 31 Oct full re-check is described in section 4.

Status rules used:
- **DONE**: reachable from a screen (route or visible button) AND a test covers it.
- **PARTIAL**: some part is reachable or built in code; the rest the owner asked for is missing, or the piece has no test, or it is only text.
- **MISSING**: no code path the owner can reach. Items blocked by an owner approval (D-B, D-C, D-D, G8) are MISSING with the reason in Gap.
- Owner-only tasks (phone tests, native review, hosting account) are listed as MISSING because the builder cannot do them.
- Declined items (clinical self-assessment tests, streak freeze) are not counted; they are correctly absent (see the end).

Counts are in the summary at the bottom.

## 1. Owner rules and requests (CLAUDE, DECISIONS_LOG, owner messages)

| Item | Source | Status | Evidence | Gap |
|---|---|---|---|---|
| Bangla / English / Mix switch, common English words kept | CLAUDE §8; DECISIONS L-11, Mix | DONE | `src/i18n/registry.ts`, `src/i18n/packs.ts`; `tests/i18n_modes.test.ts` | Bangla text is a draft until reviewed (O2). |
| Latin digits 0–9 in Bangla and Mix | owner phone feedback; DECISIONS L-digits | DONE | `src/i18n/digits.ts`, applied in `t()`; `tests/latin_digits.test.ts` | None. |
| Plain, simple Bangla copy | owner feedback; DECISIONS L-digits | PARTIAL | Bangla pack rewritten in plain words (`src/i18n/packs.ts`); banned-word guard `tests/copy_review.test.ts` | No native reader has checked it (TM-TST-161). No test measures "simple". |
| No streak, shame, grades or red copy | CLAUDE §6; DECISIONS L-22 | DONE | No streak counter in `src/` (only a comment in `src/library/inspiration.ts`); `BANNED_EN` and `BANNED_BN` in `tests/copy_review.test.ts` | Guard works on listed words only. |
| Unknown ≠ 0 in every number | CLAUDE §6; DECISIONS L-16, L-19 | DONE | `src/core/planner.ts` (deferred with reason), `src/core/finance.ts` (null stays null), `src/core/prayer.ts` (null, never 00:00), `src/core/review.ts` ("not enough data"); `tests/g3.test.ts`, `tests/money.test.ts`, `tests/prayer.test.ts`, `tests/o6_reality_review_templates.test.ts` | None found. |
| One-tap prayer marks (tap to mark, tap to undo, no count) | owner request (M13) | DONE | `prayerTimesCard` and `togglePrayerMark` in `src/ui/screens.ts` (Deen tab); `src/core/prayerLog.ts`; `tests/prayer.test.ts` (demo mode) | Marks are saved through `putMode`, so they follow the active mode and the consent gate. The test runs in demo mode only; the real-mode path has no test of its own. Marks are not shown on Today. |
| Prayer times calculated on the phone | DECISIONS M13; Blocks 3 and 4 | PARTIAL | `src/core/prayer.ts`, `src/core/prayerMethod.ts` (Karachi default; MWL, Egyptian, ISNA; standard or Hanafi Asr; offsets of -30 to 30 min; Unknown without a place); `tests/prayer.test.ts` (reference file within 1 to 2 min, `tools/prayer_reference.py`) | The reference is the builder's own formula, not an official timetable. Owner must compare Dhaka times with the official Bangladesh timetable (TM-TST-101 is a device row). |
| Azan and pre-prayer alerts default OFF | owner request (M13) | PARTIAL | Defaults OFF (`DEFAULT_ALERT_PREFS`: both false, sound false); per-prayer choice, volume, preview, presence check, offline cache (`src/core/prayerSound.ts`, `src/ui/prayerAlerts.ts`, `public/sw.js`); `docs/azan.md`; `tests/prayer.test.ts` (mocked file) | Re-rated 31 Oct: the defaults and settings work, but no azan audio file exists (`public/audio/` holds only `.gitkeep`), so no azan sound plays today (vibration or silence). Alerts fire only while the app is open; phone delivery is untested (O1). Owner supplies a licensed MP3. |
| Wikipedia search; first result saved in background | owner request (M11) | DONE | `suggestPanel` and `saveSearchResults` in `src/ui/screens.ts`; `src/core/savedLists.ts`; `tests/m11_background_cache.test.ts`, `tests/wikipedia.test.ts`; e2e check M11-CACHE | "Background" means saved on the first tap. Nothing is fetched in the background. Source name and date shown on each card. |
| Google search option | CLAUDE §8; PLAN D13 | MISSING | None | Blocked: key and daily cap need owner approval (D-C). |
| Automation rules (4 on-device rules, switchable) | owner request (25 Oct; M19) | DONE | `src/core/rules.ts`; route `#/more/rules` (More list); `rulesTodayCard` on Today; `tests/rules.test.ts`, `tests/m_systems_rules_ui.test.ts` (4 `data-rule` switches) | Rules never add tasks or send notifications (by design). |
| One-click ready systems (6), add and undo | owner request (M24) | DONE | `src/core/systems.ts`; route `#/more/library`; `tests/systems.test.ts`, `tests/m_systems_rules_ui.test.ts` (new test: habits and tasks added in real mode show on Habits and Plan) | Bangla text is flagged unreviewed in the app. Gap in the 25 Oct reading (real records not read by Today, Habits, Plan) is closed: `allRecs()` reads the active mode. |
| Real-data consent (on this phone only, tick, turn on, clear all) | DECISIONS D-B (25 Oct) | DONE | `src/core/consent.ts`; `consentCard` and `clearRealCard` in `src/ui/screens.ts` (More > Data); `tests/real_data.test.ts` (15 tests) | Consent only opens storage. See row 14. |
|  Real-data entry forms (intake, plan, habits, money, Deen) | D-B; DECISIONS line 205 | DONE | All register forms save to the active mode only, with the consent gate and Real tag; `tests/register_real.test.ts`, `tests/real_entry.test.ts` | None for forms. Owner has not entered real data yet (D-B consent is the owner's tick). |
|  Today, Habits and Plan read real data | DECISIONS line 222 | DONE | `allRecs()` (`src/ui/entry.ts`) reads the active mode only; `tests/data_mode.test.ts` ("Only demo / Only real"), `tests/home_counts.test.ts` | None found. |
|  Encrypted backup (and backup of real data) | owner list | DONE | `src/core/cryptoBackup.ts`, `src/ui/encBackup.ts`, local snapshots `src/core/snapshots.ts`; `tests/crypto_backup.test.ts`, `tests/enc_backup_ui.test.ts`, `tests/snapshots.test.ts` (secrets and real data rules) | Cloud copy is a port only and stays OFF (D-C). |
| Template chooser on every dashboard | owner (batch 1: "setting to choose the view"); ROADMAP B4 | PARTIAL | Detailed or compact view on 7 screens (Journey, Money, Habits, Plan, Report, Review, Today) with the choice kept per screen (`VIEW_SCREENS` in `src/ui/state.ts`; `tests/screen_views.test.ts`); Horizon stack or compact (`tests/horizon.test.ts`); stage-name templates; Design version chooser with 4 looks (`tests/design_version.test.ts`) | No view chooser on Deen, Stuck, Cards, Risk, Venture, Team, North Star, History, Diary, Topics. The two views show the same records (a layout switch, not different pattern templates such as grids or timelines). Owner has not yet picked a look. |
| Premium visuals per screen | owner (batches 1–9; CLAUDE §9) | PARTIAL | Four looks with light and dark (default Light / Futuristic), AA contrast, focus and 44 px checks (`tests/a11y_looks.test.ts`); 3D-style logo (`tests/logo3d.test.ts`); Goal Universe, progress ring, SMART funnel, life wheel, charts; polish commits for Today, Journey, Plan, Money, Deen, More, Focus, Reward, Stuck, Diary, Intake | Taste cannot be proven by tests: needs the owner's phone check. Screens not in any polish commit: Habits, Cards, Report, Review, Topics, Capture, Library and Rules, Risk, Venture, Team, History, North Star. |
| Micro-animations with reduced motion | owner (batches 2, 8, 9; CLAUDE §9) | PARTIAL | `src/ui/styles.css` has 14 keyframes (arrow draw, star twinkle and pop, shooting star, stair light, inspiration fade, step-done tick, ring and star, progress-ring draw, pop and glow, logo shine, SMART funnel fade), each behind `prefers-reduced-motion`; `tests/r4_motion.test.ts`, `tests/a11y.test.ts`, `tests/a11y_looks.test.ts`, `tests/progress_ring.test.ts`, `tests/logo3d.test.ts`, `tests/smart_funnel.test.ts` | Motions from the batches that are still missing are in section 3 (converging focus, bridge, particles, moving horizon marker). |
|  Visual layer: charts (M18) | ROADMAP; M-list M18 | DONE | `src/ui/charts.ts`: Money chart, Report goal rings, Review activity chart, Habits 14-day grid, each with a title and a hidden text summary; Goal Universe, progress ring, SMART funnel; `tests/charts.test.ts`, `tests/goal_universe.test.ts`, `tests/progress_ring.test.ts`, `tests/smart_funnel.test.ts` | None found. |
| Source tracking | DECISIONS L-23 (superseded by L-26, L-27); M-list M17 | PARTIAL | Wikipedia option cards show source name and date (`suggest.source`, `sourceUrl` in `src/core/research.ts`); topic tips show the entry kind and a source kind label (`data-source` in `src/ui/screens.ts`); packs validate `kind`, `source`, `reviewer` (`tests/content_pack.test.ts`) | Tips name a kind of source (general, wikipedia, reviewer), never a link or a date. Systems and glossary have no source, date or evidence level. M17 says so itself. |
| Deen: private, no scripture text, no scores | CLAUDE §2, §6; DECISIONS D-D | DONE | "private" tag and noFatwa disclaimers on Deen (`src/ui/screens.ts`); no score code; `tests/g1.test.ts` (Deen guard); `tests/content_pack.test.ts` (scripture guard) | Quran, zakat and giving logs not built (see row 25). |
| Health and family entries (M14) | M-list M14; PLAN §7 | MISSING | Field catalog entries only (`profile.health_note` and others in `src/catalog/fields.ts`); `src/modules/capability.ts` M14 says "no place to write yet" | No entry screen. Owner privacy decision (TM-REQ-017) and G7 review first. |
| Quran, zakat and giving logs (M13 rest) | M-list M13; PLAN §7 | MISSING | Field catalog entries only (`quran_activity`, `zakat_snapshot`, `giving` in `src/catalog/fields.ts`). Prayer marks and a fasting mark exist (`src/core/fastLog.ts`, `tests/fast_log.test.ts`) | No screen for Quran, zakat or giving. Waits for D-D and content review. |
| Stage A–H (journey) and G0–G8 (build) names kept apart; Home shows ১/৮ | CLAUDE §2; DECISIONS L-03, L-04 | DONE | `src/demo/seed.ts`, `src/core/stageTemplates.ts` (codes A–H kept in every template); `tests/o6_reality_review_templates.test.ts` | None. |
| Daily inspiration card, bilingual, changes daily, offline | owner batch 7/8; DECISIONS L-28 | DONE | `src/library/inspiration.ts` (15 lines, 4 themes); Today aside; `tests/inspiration.test.ts` | No online quote source (L1, owner approval). |

## 2. Owner build list (ROADMAP §2 open items and §3 B1–B11)

| Item | Source | Status | Evidence | Gap |
|---|---|---|---|---|
| O1 Real-phone airplane-mode test | ROADMAP O1 | MISSING | none | Owner-only. |
| O2 Bangla glossary native review (TM-TST-161) | ROADMAP O2 | MISSING | glossary marked unreviewed in `src/catalog/glossary.ts` | Owner-only (reviewer). |
| O3 Usability sessions | ROADMAP O3 | MISSING | none | Owner-only. |
| O4 Hosting account (Cloudflare Pages) | ROADMAP O4; CLAUDE §8 | MISSING | steps in `docs/design/in-app-search-and-hosting.md` | Owner-only account step. |
| O5 Assessment scoring, path fit, library | ROADMAP O5 | DONE | `src/core/assessment.ts`, `src/library/paths.ts`, `src/ui/assessment.ts` (Plan); `tests/o5_assessment_fit.test.ts` | Path text is a draft (যাচাই হয়নি). |
| O6 Reality-changed loop, 90-day review, stage templates | ROADMAP O6 | DONE | `src/core/reality.ts`, `src/core/review.ts`, `src/core/stageTemplates.ts`; `tests/o6_reality_review_templates.test.ts` | Three-question prompt not built (row 46). |
| O7 Own options and saved offline search list | ROADMAP O7 | DONE | `src/core/savedLists.ts`, `suggestPanel`; `tests/o7_own_saved_lists.test.ts` | None. |
| O8 Lock-screen privacy per category | ROADMAP O8 | PARTIAL | `src/core/notify.ts`, More > Lock-screen details; `tests/o8_notify_privacy.test.ts` | Phone lock-screen behaviour is not checked (owner, TM-TST-155). |
|  O9 Register updated from real test runs | ROADMAP O9 | DONE | Regenerated 31 Oct 2026: 963 of 963 tests, browser e2e 0 FAIL, 42 TM-TST rows linked (13 Pass, 29 Partial, 0 Fail) in `..._v2_1_evidence_refresh.xlsx`; original v2_0 unchanged (`docs/register/EVIDENCE_REFRESH.md`, Run 3) | 130 of the 172 requirements still have no test row. Rows stay Partial where a device test, usability session or reviewer sign-off is open. |
| B1 Motivation / discipline board (Today + Inspiration page) | ROADMAP B1; batches 8, 9 | PARTIAL | `src/library/inspiration.ts`; Today aside; `tests/inspiration.test.ts` | No separate Inspiration page; no motivation-vs-discipline card (row 84). |
| B2 Horizon view (today → month → year marker and arc) | ROADMAP B2; batches 8, 9 | PARTIAL | `horizonScreen` (stack / compact), `src/core/horizon.ts`; `tests/horizon.test.ts` | Plain list. No moving marker or arc (row 75). Early-plan file says "Built" for the arc; it is not. |
| B3 "My why" and success criteria per goal | ROADMAP B3; batches 1, 6 | DONE | `goal.why`, `goal.success` in `src/catalog/fields.ts`; set in the goal form (intake step 6) and edited in the SMART guide on the goal page (`src/ui/lifeUi.ts`); "why" also on the horizon card; `tests/goal_form.test.ts`, `tests/life_goal_step5.test.ts` | Success criteria are shown only inside the goal page form, not on the horizon card or Today. |
| B4 Template chooser per screen | ROADMAP B4; batches 1, 5 | PARTIAL | Same as the row in section 1 (7 dashboards plus Horizon) | Remaining screens have no chooser. |
| B5 Micro-animations, reduced motion (step done) | ROADMAP B5 | DONE | `src/ui/rewardArt.ts` arrow draw and star pop on the newest reward path; `fresh` flag in `rewardScreen`; `src/ui/styles.css` guards; `tests/r4_motion.test.ts` | Other batch motions not built (section 3). |
| B6 Next-step highlight on Today | ROADMAP B6; batch 8 | DONE | "Next best action" card on Today with its reason and a button (`src/ui/homeUi.ts`, `src/core/nextAction.ts`); `tests/home_cards.test.ts` (rule order, reason, no percent or amount). The `data-next-step` aside in `src/ui/screens.ts` belongs to the intake screen | No stepping-stone visual (row "Stepping-stones path"). |
| B7 Two-path reflection card and effort-timing tip | ROADMAP B7; batch 9 | PARTIAL | `reflectionCards` in `src/ui/screens.ts` (Stuck); `tests/r5_stuck_log.test.ts` | Text only. The fork and the quadrant visuals are not built (rows 81, 88). |
| B8 "Where my time goes" funnel | ROADMAP B8; batch 9 | PARTIAL | `stuck.time.1–3` bullets on Stuck; `tests/stuck.test.ts` | Text bullets, no funnel visual (row 85). |
| B9 Plan flow diagram | ROADMAP B9; batch 9 | DONE | `src/core/planFlow.ts`; `planFlow` SVG in `planScreen`; `tests/b9_plan_flow.test.ts` (unknown shown as unknown) | AI step is dimmed by design (no AI). |
| B10 Word chain "what I learned" on the journey log | ROADMAP B10; batch 9 | DONE | `wordChain` in `src/core/learning.ts`, used in `journeyLog` (`src/ui/screens.ts`); `tests/r5_stuck_log.test.ts` | None. |
| B11 Focus tip "one target at a time" and converging motion | ROADMAP B11; batch 9 | PARTIAL | `focus.tip` in `src/i18n/packs.ts`; `tests/r4_motion.test.ts` (focus tip) | No converging motion (row 82). |

## 3. Visual reference batches 1–9 (every noted idea)

| Item | Source | Status | Evidence | Gap |
|---|---|---|---|---|
| Time-cascade ladder: 5y → 1y → month → week → day → now, each level derived from the one above, with the "one thing" prompt | batch 1 #1 | PARTIAL | Stage ladder (`stageLadder`); horizon groups (`groupByHorizon`) | No cascade, no "one thing" prompt per level. |
| Discipline flow: systems → routines → habits → identity | batch 1 #2 | PARTIAL | Habits topic tips with step diagram (`src/library/topics.ts`, `src/ui/diagram.ts`) | Text tips only. No identity flow visual. |
| Goal funnel hero (dream → 5y → 1y → month → week → day → now) | batch 1 #3 | PARTIAL | Funnel hero on Journey (`goalFunnelHero`, `funnelBands`); `tests/horizon_art.test.ts` | Dream > 5 years > 1 year > month > week > today > now with own counts; dashed "Not set" when unknown. Not a time cascade with the "one thing" prompt. |
| Grid trackers: daily 31×5, weekly, monthly 12×5, long-range list | batch 1 #4 | PARTIAL | 14-day grid, 28-day figure, and the long view for 31 days / 12 weeks / 12 months on Habits (`habitRange`, `habitGridTracker`); `tests/habit_grid.test.ts` | Habits only. No weekly or monthly grid for other trackers, no long-range list outside the text equivalent. |
| Challenge tracker: targets, 30-day grid, monthly review, rules, final mission, trophy | batch 1 #5 | MISSING | "My why" field only | Not built. Keep no grades. |
| Action-plan table: objective, tasks, success criteria, time frame, resources | batch 1 #6 | PARTIAL | Goal fields (`src/catalog/fields.ts`); success criteria and time frame in the SMART guide on the goal page; task form in `planScreen` | No table view. No resources column. |
|  Life-area map and Life Areas Wheel (8 areas, rate 1–10, radial view; Deen always present) | batch 1 #7; batch 3 #25 | DONE | Route `#/journey/wheel`, `src/core/lifeWheel.ts`; `tests/life_goal_step5.test.ts` | Rating is the user's own; unrated areas are Unknown. |
| Working-style chooser (Planner / Arranger / Visualizer / Prioritizer → routine) | batch 1 #8 | MISSING | None | Not built. |
| Venture "everything it takes" map; benefit map; strategy blueprint | batch 1 #9; batch 2 #19; batch 3 #33 | MISSING | Venture list only (`src/core/ventures.ts`, `ventureScreen`) | Clusters with checklists, benefit map and blueprint not built. |
| Want → Feel → Do goal card with tiny-action row bank | batch 2 #10; batch 2 extra | MISSING | Goal form has why and success only | Not built. |
| Micro-habit starter (≤2 min, attach to routine, one habit at a time) | batch 2 #11 | MISSING | Habit form (name, days, target) | No starter flow; "one habit at a time" not enforced. |
| "Systems, not goals": 5-box flow and no-zero minimum | batch 2 #12 | PARTIAL | Restart plan `smallest_version` (`src/core/habits.ts` `restartPlan`, shown on habit card) | No 5-box visual. |
|  Colour themes per template (beige, sage, ink, dark-gold, neon-dark) | batch 2 #13; batch 3 extra; batch 3 #28, #33 | PARTIAL | Four Design versions with light and dark tokens, AA contrast tested (`src/ui/themes.ts`, `tests/design_version.test.ts`) | Chosen per app, not per template. |
| Focus acronym card-grid (16 steps, tick each) | batch 2 #14 | MISSING | None | Not built. |
| Snake-path progress map (S-curve with milestone tiles) | batch 2 #15 | PARTIAL | Stage ladder; garden layers (`src/ui/rewardArt.ts`) | No S-curve path. |
| Numbered principles list, quick-pick checklist ("1–3 ways this week"), staircase list with figure | batch 2 #16, #17, #18 | MISSING | None | Patterns not built as templates. |
| Maturity funnel (6 levels: does / result / next) | batch 2 #20 | MISSING | None | Not built. AI parts stay G6. |
| Daily planner sheet: mantra, top 3, must-do, if-time, tomorrow, "make time for" | batch 3 #22 | PARTIAL | Plan has priority field, week view and free window (`planScreen`) | No mantra, must-do / if-time split, tomorrow list or "make time for" first. |
| Goal breakdown worksheet: 3 milestones, first 5 actions, obstacle, if-then backup plan, first action and when | batch 3 #24; batch 4 #53 | PARTIAL | Goal why and success fields; "do this after" link (`src/core/planner.ts`) | No milestones, obstacle or backup-plan (if-then) fields. |
| Goal-setting planner: 3 goal columns, multi-year milestone timeline, monthly focus | batch 3 #25 | MISSING | Horizon sections only | No timeline, no monthly focus. |
|  SWOT 2×2 (tap chips + own items) | batch 3 #26, #29 | DONE | SWOT four lists per goal (`goal.swot_*`, `src/ui/lifeUi.ts`, `src/core/goalPlan.ts`); `tests/life_goal_step5.test.ts` | No tap-chip suggestions. |
| Four-strategy card (break down, distractions, emotions, self-discipline) | batch 3 #27 | PARTIAL | Stuck helpers (`stuckScreen`); procrastination tips | No emotion-strategy card; text only. |
|  SMART wizard (5 questions), SMART checklist (7 yes/no), SMART target wheel | batch 3 #28, #46; batch 4 #34, #50 | PARTIAL | SMART guide with five questions (Specific, Measurable, Achievable, Relevant, Time-bound), saved into the goal, plus the SMART funnel (`src/ui/lifeUi.ts`, `src/ui/smartFunnel.ts`, `src/core/goalPlan.ts`); `tests/smart_funnel.test.ts`, `tests/life_goal_step5.test.ts` | Five questions are on one form, not a step-by-step wizard. No 7-question yes/no checklist, no target wheel. |
| Problem-framing four questions (problem, who, why, outcome) | batch 3 #30 | MISSING | None | Not built. |
| SOP template (task, purpose, owner, trigger, steps, check, handoff) | batch 3 #31 | MISSING | Ready systems are not SOPs; team roles only (`src/core/team.ts`) | Not built. |
| Time batching (group similar tasks into one block) | batch 3 #32 | MISSING | None | Not built. |
| Creator routine by life situation (job + side project) | batch 4 #35 | PARTIAL | Six ready systems in `src/library/systems/` | No situation picker; no "show up as" traits. |
| Momentum square → circle as consistency grows | batch 4 #36 | MISSING | None | Micro-visual not built. |
| "Real journey" wave on the journey log (ups and downs) | batch 4 #37; batch 6 #84 | MISSING | None | Not built. |
| "Where am I?" three-state check (lost / learning / executing) with routing | batch 4 #38 | MISSING | None | Not built. |
| Hierarchy icons (mission → goal → project → task) and a goal-tree view | batch 4 #39; batch 9 | PARTIAL | Goal tree (Goal → sub-goal → task) in `src/core/goals.ts`; `tests/g3.test.ts` | No tree screen; no icons. |
| Dream / goal / plan horizon arrows with tick checkpoints | batch 4 #40 | MISSING | None | Not built. |
| Courage bridge (each awkward try fills the bridge) | batch 4 #41 | MISSING | None | Not built. |
| Change rings (idea → lifestyle) | batch 4 #42 | MISSING | None | Not built. |
| Setback journey (six panels) and "you must fall to rise" curve on Stuck | batch 4 #47; batch 8 | MISSING | Stuck has helpers and reflection cards only | Not built. |
| Mindset stair: one private tap per day ("which step today?") | batch 4 #44 | MISSING | None | Not built. |
| Reward metaphors offered as a choice: pebble jar, drop on stone, rings, bridge; calm particles to goal cup | batch 4 #43, #45; batch 9 #7 | MISSING | Rewards are stars and garden only (`src/ui/rewardArt.ts`), no choice | Not built. |
| Goal page: why, success, projects, dated tasks, progress %, status chips | batch 4 #51; batch 5 #55 | PARTIAL | Goal page (`#/journey/goal/:id`) with why, success, SMART guide, SWOT, life area, progress ring and percent, 50% milestone sentence (`tests/life_goal_step5.test.ts`, `tests/progress_ring.test.ts`); tasks link to goals | No status chips. No list of projects (sub-goals) on the page. |
| Backward-planning wizard (last step → today) | batch 4 #52 | MISSING | "Plan backwards" appears in topic tips only | Wizard not built. |
| "Make it concrete" bank (big task → tiny first action pairs) | batch 4 #53 | PARTIAL | Stuck `tiny_step` helper asks for a 5-minute step | No example bank. |
| Ownership triage: is it mine? → Do / Delegate / Let go | batch 5 #54 | PARTIAL | `#/journey/mine` (`decisions.ts` `triage`); `tests/decisions.test.ts` | Own open tasks only; suggestion Do / Hand over / Let go with reason; answers kept in memory only, nothing is written to the task. |
| Goal → milestone → action → today journey with High / Medium / Low chips and % from ticks | batch 5 #55, #59, #60 | PARTIAL | Per-goal percent from ticks and an overall percent (`src/core/goalPlan.ts`, `src/core/overallProgress.ts`); priority select on tasks; week placements | No milestone layer between goal and task, no % per milestone, no journey view. |
| Hidden-effort buffer visual (planned vs hidden effort) | batch 5 #56 | PARTIAL | Buffer appears as a tip only (`src/library/topics.ts`, "Add a time buffer") | Planner adds no buffer; no visual. |
| Weekly design loop (plan → prioritise → execute → review → reflect) and weekly "what got in the way" | batch 5 #57; ROADMAP life brief | MISSING | 90-day review only (`src/core/review.ts`) | Weekly review not built ("still planned" in life brief). |
| Real-life planning around existing blocks | batch 5 #62 | PARTIAL | Free window and weekly hours (`src/core/planner.ts`, `freeWindow`) | No calendar blocks (no external link, by rule). |
| Reality-changed three questions (what changed / still matters / what next) | batch 5 #63 | PARTIAL | "No longer true" button, log and history (`src/core/reality.ts`, `planHistoryScreen`) | Three-question prompt not built. |
| Starting-point prompt for new goals (clarify, break down, begin) | batch 5 #64 | MISSING | None | Not built. |
| Big-decision wizard (reversible? time? uncertainty? regret in 10 years) and 7 questions | batch 5 #65, #67, #73 | PARTIAL | `#/journey/decide` (`src/core/decisions.ts`, `src/ui/decisionUi.ts`); `tests/decisions.test.ts` | Four questions (reversible, time, learn, regret) with a rule-based suggestion and reason. The 7-question version and the frameworks picker are not built. |
| Decision frameworks picker (10/10/10, pros and cons, six hats, OODA) and decide-faster tips | batch 5 #68, #70 | PARTIAL | "decisions" topic with tips from the bundled library and packs 003 to 008 (`public/content/`, `src/library/topics.ts`) | No framework picker. Tips are drafts (reviewer pending). |
| Attention-leak audit (silence, close, clarify, bound) | batch 5 #71; batch 6 #76 | PARTIAL | `#/journey/leak` (`src/core/legs.ts`, `src/ui/legsUi.ts`); `tests/legs.test.ts` | Four levers shown as a tick list (not saved) plus a money review of own monthly expense lines. No link to focus topics or planner tips yet. |
| Phased system-setup checklist (foundation, build, maintain) | batch 5 #72, #74 | MISSING | Ready systems only | Not built. |
| Life four-legs status (Finance, Tasks, Weekly review, Habits; weakest leg) | batch 6 #75 | PARTIAL | `#/journey/legs` (`legs.ts` `fourLegs`); `tests/legs.test.ts` | Finance, Tasks, Weekly review, Habits from own entries; Unknown when data is missing; lists legs worth a look. Not on the Home dashboard yet. |
| Deadline breakdown with buffer day and back-computed steps | batch 6 #80 | MISSING | None | Not built. |
| Clarity 2×2 (impact / effort) → top 3 → next 7 days | batch 6 #81 | MISSING | None | Not built. |
| Thinking-mode picker (Think / Tell / Act) | batch 6 #82 | MISSING | None | Not built. |
|  30-day dot-grid heatmap and week rings for habits | batch 6 #85 | PARTIAL | Habits 14-day grid with text summary (`habitChart`, `tests/charts.test.ts`) | 14 days, not 30; no week rings. |
| Habit matrix (habits × days, no red) for the weekly review | batch 6 #86 | PARTIAL | One card per habit with 7 dots | No matrix view. |
| Measured habits (numeric target, e.g. 4/8 glasses) | batch 6 #88; batch 7 #103–107 | DONE | Target, unit and +/- buttons in `habitsScreen`; `habit_log` records; `tests/focus_habits_cards_ui.test.ts` | None. |
| Habit consistency without one score | batch 6 #88, #89 | DONE | "x of y planned days" (`habits.month`, labelled INFERENCE); no single score | Per-area progress not built. |
| Backfill past days from a calendar | batch 6 #90 | PARTIAL | Habit dots cover the last 7 days only (`addDays(today, -6..0)`) | No calendar; older days cannot be marked. |
| Journey timeline entries with optional photo or note (kept on device) | batch 6 #87 | PARTIAL | Journey log text entries (`journeyLog`) | No photo; list only. |
| Subject / skill progress rings (time spent and % of items) | batch 6 #92 | MISSING | Focus minutes stored per task only (`focusMinutesOf`) | No subject grouping, no rings. |
|  Nested progress tree (% rolls up from children) | batch 6 #93; batch 4 #51 | PARTIAL | Overall progress % and per-goal % with Unknown when no task (`src/core/overallProgress.ts`, `src/core/goalPlan.ts`); `tests/overall_progress.test.ts`, `tests/overall_progress_ui.test.ts` | No tree screen. |
| Home-screen widget | batch 6 #91 | MISSING | None | Deferred (needs native wrap). |
| Spaced-repetition flashcards (own cards, boxes 1/2/4/8/16 days) | batch 7 #94 | DONE | `src/core/cards.ts` (`INTERVALS`); `cardsScreen` (`#/cards`); `tests/focus_habits_cards.test.ts`, `tests/focus_habits_cards_ui.test.ts` | No subject grouping. |
| Focus timer tied to a task (10 / 25 / 45 min, ±5 min, minutes recorded, done → star) | batch 7 #95, #102 | DONE | `src/core/focus.ts` (`PRESETS`, ±5 adjust); `focusScreen` (`#/focus/:id`); `recordFocus`; `tests/focus_habits_cards_ui.test.ts` | Totals per task only. |
| Share progress card, colour picker | batch 7 #96 | MISSING | None | Deferred (sharing leaves the device; owner OK each time). |
| Ambient sounds, voice, sound sheets | batch 7 #102; batch 8 #94 | MISSING | None | Deferred (needs licensed audio and owner OK). |
| Searchable template library beyond the six systems | batch 7 #97; ROADMAP L4 | PARTIAL | Six ready systems (`src/library/systems/`); tips in `public/content/` packs | No search, no more templates. |
| Habit fields: categories, start and end date, reminders, extra goals | batch 7 #103–107 | PARTIAL | Weekday chips, numeric target and unit, week dots (`habitsScreen`) | No categories, no start/end dates, no habit reminders. |
| Clarify-style "one task at a time" Today | batch 7 #98–99 | DONE | One-focus Today (`today()`, `todaysActions` in `src/core/planner.ts`); Spec DP-03 | Shows up to 3 actions by design (Spec), not one. `tests/g3.test.ts` covers `todaysActions`. |
| AI coaches (time sculptor, focus toolkit, motivation booster); AI plan help | batch 7 #100; ROADMAP L7 | MISSING | M23 "not built" (`src/modules/capability.ts`) | Blocked: D-C owner approval. |
| Stepping-stones path (current step highlighted) | batch 8 #1 | PARTIAL | `data-next-step` aside; stage rungs on Today | No stepping-stone visual. |
| Plan → action → success path with glowing reward | batch 8 #2 | PARTIAL | Journey art (`src/ui/rewardArt.ts`), milestone moments | No path with climbing figure. |
| Success gauge with Planning / Action / Discipline pillars (no score) | batch 8 #3 | MISSING | None | Not built. |
| Horizon arc (year ago → today) and today → month → year marker | batch 8 #5; batch 9 #4 | PARTIAL | Arc with stops and a marker on the nearest horizon with a goal on the Horizon screen (`src/ui/horizonArt.ts`); `tests/horizon_art.test.ts` | Marker is static (a short pop-in only when motion is allowed). No "year ago" side and no moving marker over time. |
| "My why" reveal; goal reached through a question path | batch 8 #6 | PARTIAL | Why shown on horizon card | No reveal, no path. |
| Setback-to-recovery message on Stuck | batch 8 #7 | MISSING | None | Not built. |
| Quote cards (Day N / 365) | batch 8 #9 | DONE | Daily inspiration card (`src/library/inspiration.ts`, `tests/inspiration.test.ts`) | No "Day N" counter, by design (no counting). |
| Mute notifications toggle | batch 8 #8 | MISSING | None | Deferred. |
| "What I learned" word chain on the journey log | batch 9 #1 | DONE | `wordChain` (`src/core/learning.ts`), `journeyLog`; `tests/r5_stuck_log.test.ts` | None. |
| Effort-timing quadrant (hard now / easy later) explainer | batch 9 #2 | PARTIAL | Text card `stuck.timing` on Stuck | No quadrant visual; not in the topic library. |
| Motivation vs discipline comparison card | batch 9 #5 | PARTIAL | Themes `motivation` and `discipline` in `src/library/inspiration.ts` | No comparison card. |
| Bike timeline: today → in a month → in a year, moving marker | batch 9 #4 | MISSING | None | Not built. |
| Two-path fork (fun now vs struggle now) | batch 9 #9 | PARTIAL | Text cards (`stuck.two.*`) | No fork visual. |
| Calm particle motion to goal cup on reward | batch 9 #7 | MISSING | None | Not built. |

## 4. Summary (full re-check, 31 Oct 2026)

Re-run method: this time all 132 rows were re-opened, not only the ones that changed. Every file path named in the table was checked to exist; each DONE row was matched to a screen or route and a test file; each MISSING row was searched for in `src/` (route table in `src/app.ts`, i18n keys, screens, core, library; the topic tips and packs were counted as text only). Newer work found since the 25 Oct reading: detailed or compact views on 7 dashboards (`tests/screen_views.test.ts`), the Next best action card, the SMART guide and funnel, progress ring, Goal Universe, life wheel, SWOT, encrypted backup, snapshots, the real-data forms, prayer-time methods, 14 motion keyframes. Run on this branch: `npx tsc --noEmit` clean, `npx vitest run` all passing (69 test files), build clean, browser e2e 0 FAIL (see `docs/register/EVIDENCE_REFRESH.md`, Run 3).

Counts (132 rows in sections 1–3; owner-only and approval-blocked items are counted as MISSING):

| Status | 25 Oct | 31 Oct first re-run (13 rows) | 31 Oct full re-check |
|---|---|---|---|
| DONE | 25 | 32 | 34 |
| PARTIAL | 46 | 48 | 47 |
| MISSING | 61 | 52 | 51 |

Rows changed in the full re-check (8 rows moved status, others only got better evidence):
- Up to DONE (3): ready systems (M24) now show in Habits and Plan in real mode (new test in `tests/m_systems_rules_ui.test.ts`); B3 My why and success criteria (both are on the goal page and in the goal form); B6 next-step highlight (the Next best action card is tested).
- Down to PARTIAL (1): azan and pre-prayer alerts. The defaults work, but no azan file exists, so no azan plays; alerts run only while the app is open.
- Up from MISSING to PARTIAL (1): grid trackers (14-day habit grid and 28-day figure exist, the 31-day and monthly grids do not).
- Corrected text, same status (many): template chooser (7 dashboards, not 2), micro-animations (14 keyframes), source tracking (tips show a kind and source label), SMART (five-question guide exists), goal page and journey (percent and ring exist), prayer times (methods added), O9 numbers, M14 and Quran logs (field definitions exist, no screen).

Closed since 25 Oct: real-data entry forms, real data read by Today, Habits and Plan, encrypted backup and local snapshots, charts, life wheel, SWOT, SMART guide and funnel, per-screen detailed or compact view (7 screens), Goal Universe, progress ring, Next best action, rule-based advice cards, Register evidence refresh.

### Owner TODO list: real gaps that remain (honest, in order)
1. Owner-only, nobody else can do them:
   - Open the app on the real phone: offline test (O1), lock-screen check (O8, TM-TST-155), look and 360 px check, choose a look.
   - Compare Dhaka prayer times with the official Bangladesh timetable.
   - Supply a licensed azan MP3 (`public/audio/azan.mp3`, see `docs/azan.md`); until then no azan sound plays.
   - Bangla reviewer sign-off (O2, TM-TST-161); usability sessions (O3); hosting account (O4).
2. Waiting for an owner approval (cost or content rule): online suggestions and AI coaches (D-C), cloud copy, Google search key, scripture and Quran, zakat and giving logs (D-D), health and family entries (M14, privacy decision).
3. Builder can still build (largest first):
   - Weekly review and the "what got in the way" question (only a 90-day review exists).
   - Decision wizard and frameworks picker, ownership triage, attention-leak audit, life four-legs status, deadline breakdown, clarity 2×2.
   - Visual patterns from the batches that are still missing: goal funnel hero and time cascade, horizon arc and moving marker, grid trackers beyond 14 days, challenge tracker, working-style chooser, Want-Feel-Do card, micro-habit starter, setback and recovery visuals, reward metaphors as a choice, calm particle motion.
   - Detailed or compact view on the remaining screens (Deen, Stuck, Cards, Risk, Venture, Team, North Star, History, Diary, Topics).
   - Small items: success criteria on the horizon card and Today, a real-mode test for prayer marks, habit categories, start and end dates and reminders, backfill older than 7 days, searchable template library, source date on tips.
   - Register-linked behaviours with no code yet: "baseline needed" rule (TM-TST-005), no reminders for a paused goal (TM-TST-009), stale badge for expired items (TM-TST-007), explicit infeasible-plan flag (TM-TST-015), CSV and PDF export (TM-TST-153), logged override of a hard constraint (TM-TST-040).

Declined, not counted (owner's batch 7 said NO): clinical self-assessment tests (batch 7 #108–113, ROADMAP X1) and streak with streak freeze (#101, X3). Both are correctly absent.

### Status documents that are out of date
- (Fixed 26 Oct 2026; kept as history) `docs/design/m-list-status.md` says M19 is "নেই", M24 is "আংশিক" and the count is 14 / 9 / 2. The code (`src/modules/capability.ts`) says 16 implemented, 8 partial, 1 not built (M23). The test `tests/m_list_status.test.ts` checks the code, so the doc is the stale part.
- `docs/design/early-plan-status.md` marks B2 (arc) as "Built" in full. The arc is not built (B2 stays PARTIAL). B3 and B6 are now true (DONE above).
- `docs/ROADMAP.md` section 1 quoted "162 unit tests" (fixed 31 Oct 2026; the number has grown since, so check the latest run).


## 5. Update 1 Nov 2026 (Block 8)
Moved from MISSING to PARTIAL (6 rows): big-decision wizard, ownership triage, attention-leak audit, four-legs status, horizon arc, goal funnel hero. The grid-tracker row stays PARTIAL but now covers 31 days, 12 weeks and 12 months. Not recounted in the table in section 4 (that count is the 31 Oct state): DONE 34, PARTIAL 53, MISSING 45 after these moves.
CSV import and the data dictionary page (TM-REQ-153) are built; PDF export is still missing, so the register row stays Partial. Hard-constraint override screen (TM-REQ-040) was not built, see DECISIONS_LOG.


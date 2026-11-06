# Visual reference build queue (BUILD-03, checked 6 Nov 2026)

## 1. সারাংশ (Bangla)
1. মালিকের চাওয়া মোট 97টা সারি কোডের সাথে মিলিয়ে দেখা হয়েছে।
2. DONE-NOW (এখন তৈরি আছে): 8টা।
3. STILL-PARTIAL (আংশিক তৈরি): 45টা।
4. STILL-MISSING (এখনো নেই): 29টা।
5. BLOCKED (আপনার সিদ্ধান্ত বা ফোনের কাজ লাগবে): 15টা।
6. আংশিক ও নেই, মোট 74টা সারি মিলিয়ে 34টা ছোট বিল্ডার টাস্ক বানানো হয়েছে (Q-01 থেকে Q-34)।
7. ছোট টাস্ক আগে, বড় টাস্ক পরে; একই কাজ একাধিক সারিতে থাকলে এক টাস্কে মেলানো হয়েছে।
8. প্রতিটা টাস্কে স্কোর, র‍্যাঙ্ক, স্ট্রিক নেই; অজানা মানে 0 নয়; ডেমো লেবেল থাকবে।
9. প্রতিটা টাস্কে EN/BN/Mix টেক্সট, 360 px, আর টেক্সট 75-150% চেক আছে।
10. BLOCKED তালিকায় লেখা আছে কোন সিদ্ধান্ত বা ফোনের কাজের জন্য কোনটা আটকে আছে।

Status counts: DONE-NOW 8 · STILL-PARTIAL 45 · STILL-MISSING 29 · BLOCKED 15 (total 97).
Row ids: numbers 1-38 (part 1, visual-references rows) · V1-V39 (visual) · O1-O20 (owner-rule / build-list). Source evidence: BUILD-03 reconcile outputs 1 and 2.

Corrections made after spot-check of 10+ evidence paths (all other paths exist; the audit found one more wrong path, `src/library/stageTemplates.ts`, now corrected to `src/core/stageTemplates.ts`):
- Rows 4 and V16: `habitGrid` data function lives in `src/core/chartData.ts:61`; the UI renderer in `src/ui/charts.ts` is `habitGridTracker` (line 128), not `habitGrid`.
- Row 13: `src/ui/focus*` does not exist; the focus timer lives in `src/ui/screens.ts` (tests/focus_habits_cards*.test.ts).
- Row 19: `timelineChart` is not in `src/ui/mapsUi.ts` (it has goalTreeChart, resourceMapChart, readinessChart). Treat the board timeline as not present.

## 2. Reconciliation table (97 rows)
Paths are repo-relative. "t:" = tests/ file.

| id | item | status | evidence | note |
|---|---|---|---|---|
| 1 | Time cascade + "one thing" | STILL-PARTIAL | src/core/horizon.ts, src/ui/horizonArt.ts, t:horizon_art.test.ts | levels and own counts only; no per-level one thing (Q-15) |
| 2 | Systems>routines>habits>identity flow | STILL-PARTIAL | src/library/topics.ts (text tips) | no flow SVG (Q-16) |
| 3 | Goal funnel hero | DONE-NOW | src/ui/horizonArt.ts goalFunnelHero; t:horizon_art.test.ts | DONE-NOW covers only the funnel hero itself; the time cascade and the "one thing" prompt that the source gap still names are NOT done and are tracked by row 1 |
| 4 | Grid trackers | STILL-PARTIAL | src/core/chartData.ts habitGrid + GRID_RANGES, src/ui/charts.ts habitGridTracker; t:habit_grid.test.ts | daily/weekly/monthly; 31 days, 12 weeks, 12 months, no streak. the habit grid is done; weekly and monthly grids for other trackers are NOT done (Q-34) |
| 5 | Challenge tracker | STILL-MISSING | grep "challenge" in src/ and tests/: nothing | Q-21 |
| 6 | Action-plan table | STILL-PARTIAL | src/ui/lifeUi.ts steps as cards; t:goal_tree.test.ts | no table view (Q-11) |
| 7 | Working-style chooser | STILL-MISSING | no code | Q-31 |
| 8 | Venture map / benefit map / blueprint | STILL-PARTIAL | src/ui/mapsUi.ts resourceMapChart, readinessChart; src/ui/ventureCard.ts; t:maps.test.ts | no cluster checklist, benefit map, blueprint (Q-22) |
| 9 | Want>Feel>Do card + tiny-action bank | STILL-MISSING | no code | Q-10 |
| 10 | Micro-habit starter | STILL-MISSING | t:goal_tree.test.ts habit form only | Q-13 |
| 11 | Systems 5-box flow + no-zero minimum | STILL-PARTIAL | src/core/systems.ts, t:systems.test.ts; src/core/stuck.ts minimum week, t:stuck.test.ts | flow SVG missing (Q-16) |
| 12 | Colour theme per template | STILL-PARTIAL | src/ui/themes.ts DESIGNS (4 looks), t:look_page.test.ts, t:looks_matrix.test.ts | colours app-wide; per-screen override (Q-33). Do not add colours the owner did not ask for |
| 13 | Focus acronym card grid | STILL-MISSING | focus timer in src/ui/screens.ts; t:focus_habits_cards.test.ts (path corrected) | Q-32 |
| 14 | Snake-path progress map | STILL-PARTIAL | src/ui/rewardArt.ts; t:topics_rewards.test.ts | no S-curve (Q-17) |
| 15 | Numbered list / quick-pick / staircase | STILL-MISSING | topics tips only; t:topics_rewards.test.ts | Q-31 |
| 16 | Maturity funnel (6 levels) | STILL-MISSING | no code | Q-31; AI part stays G6/D-C, excluded |
| 17 | Daily planner sheet | STILL-PARTIAL | src/ui/screens.ts Today; t:action_desk_today.test.ts, t:action_desk_journey.test.ts | no mantra, tomorrow, make-time-for (Q-25) |
| 18 | Goal breakdown worksheet | STILL-PARTIAL | src/core/backwardPlan.ts, src/ui/backwardUi.ts; t:backward_plan.test.ts | no obstacle/backup/first action fields (Q-11) |
| 19 | Goal-setting planner / timeline | STILL-PARTIAL | src/core/monthlyReview.ts, t:month_review.test.ts | board timelineChart not found (corrected); multi-year line on horizon (Q-15) |
| 20 | Four-strategy card | STILL-PARTIAL | src/library/topics.ts text; t:stuck.test.ts | Q-14 |
| 21 | SMART wizard / checklist / wheel | STILL-PARTIAL | src/ui/smartFunnel.ts, t:smart_funnel.test.ts; lifeUi.ts smartForm | one-page form only (Q-30). Wheel skipped, funnel covers it |
| 22 | Problem framing 4 questions | STILL-MISSING | src/core/stageTemplates.ts stage text only | Q-10 |
| 23 | SOP template | STILL-PARTIAL | src/core/knowledge.ts, src/ui/notesUi.ts, t:notes_sops.test.ts | missing purpose, trigger, check, handoff (Q-23) |
| 24 | Time batching | STILL-MISSING | src/core/timeBlocks.ts is commitments; t:time_blocks.test.ts | Q-26 |
| 25 | Creator routine by situation | STILL-PARTIAL | src/catalog/fields.ts situation field | no picker (Q-27) |
| 26 | Momentum square>circle | STILL-MISSING | no code | Q-18 |
| 27 | Real-journey wave | STILL-MISSING | journey log word chain only; t:r5_stuck_log.test.ts | Q-28 |
| 28 | "Where am I?" 3-state | STILL-MISSING | src/ui/whereUi.ts is a project-status doc; t:where_page.test.ts | Q-20 |
| 29 | Hierarchy icons + goal tree | STILL-PARTIAL | src/core/goalTree.ts, src/ui/mapsUi.ts goalTreeChart; t:goal_tree.test.ts, t:maps.test.ts | tree done; level icons missing (Q-09) |
| 30 | Horizon arrows with ticks | STILL-MISSING | arc in src/ui/horizonArt.ts, t:horizon_art.test.ts | no ticks (Q-15) |
| 31 | Courage bridge | STILL-MISSING | topics tip text only | Q-19 |
| 32 | Change rings | STILL-MISSING | no code | Q-19 |
| 33 | Setback journey + fall-to-rise curve | STILL-MISSING | src/core/stuck.ts, src/ui/riskCard.ts; t:r5_stuck_log.test.ts | no curve, no panels (Q-28) |
| 34 | Mindset stair daily tap | STILL-MISSING | no code | Q-28 |
| 35 | Reward metaphor choice | STILL-MISSING | src/ui/rewardArt.ts sky+garden only; t:topics_rewards.test.ts, t:r4_motion.test.ts | Q-19 |
| 36 | Goal page status chips + parts | DONE-NOW | src/ui/lifeUi.ts statusCard; t:goal_tree.test.ts, t:goal_status_reminders.test.ts | none |
| 37 | Backward-planning wizard | DONE-NOW | src/ui/backwardUi.ts, src/core/backwardPlan.ts, #/journey/backward; t:backward_plan.test.ts | docs/audit/FULL_APP_REVIEW_2026-11-06.md E18 says audit row stale |
| 38 | "Make it concrete" bank | STILL-PARTIAL | t:stuck.test.ts (too big gives 5-min step) | no example pairs (Q-02) |
| V1 | Ownership triage Do/Delegate/Let go | DONE-NOW | src/core/decisions.ts triage(); src/ui/decisionUi.ts triageScreen; t:decisions.test.ts | memory-only answers by design |
| V2 | Goal>milestone>action>today + High/Med/Low chips | STILL-PARTIAL | src/core/goalTree.ts; t:goal_tree.test.ts; task.priority in screens.ts:240 | chip on tree rows (Q-09) |
| V3 | Hidden-effort buffer visual | STILL-MISSING | text tip ti2 only, src/library/topics.ts:72 | Q-12 |
| V4 | Weekly loop + "what got in the way" | STILL-PARTIAL | weeklyScreen screens.ts:1106; t:weekly_review.test.ts | Q-06 |
| V5 | Plan around existing blocks | DONE-NOW | src/core/timeBlocks.ts, src/ui/blocksUi.ts; t:time_blocks.test.ts, t:ics.test.ts | own typed blocks only |
| V6 | Reality-changed 3 questions | STILL-PARTIAL | src/ui/realityUi.ts; t:reality_loop.test.ts | no "still matters?" step (Q-08) |
| V7 | Starting-point prompt for new goals | STILL-MISSING | none; backward plan in src/ui/backwardUi.ts | Q-10 |
| V8 | Big-decision wizard 4 Q + 7 Q | STILL-PARTIAL | src/core/decisions.ts decide(); t:decisions.test.ts; docs/design/visual-references.md:115 | 7 prompts missing (Q-14) |
| V9 | Frameworks picker + decide-faster tips | STILL-MISSING | grep 10/10/10, six hats, OODA: none | Q-14 |
| V10 | Attention-leak audit | STILL-PARTIAL | src/ui/legsUi.ts leakScreen; t:legs.test.ts | levers not saved, no topic links (Q-07) |
| V11 | Phased setup checklist | STILL-MISSING | no code | Q-20 |
| V12 | Four-legs status on Home | STILL-PARTIAL | src/ui/legsUi.ts, t:legs.test.ts; linked from Journey only (screens.ts:1158) | Q-07 |
| V13 | Deadline breakdown with buffer day | STILL-PARTIAL | src/core/backwardPlan.ts; t:backward_plan.test.ts | no buffer day (Q-12) |
| V14 | Clarity 2x2 impact/effort > top 3 | STILL-MISSING | diagram.ts "matrix" text-only | Q-26 |
| V15 | Thinking-mode picker Think/Tell/Act | STILL-MISSING | no code | Q-14 |
| V16 | 30-day dot grid + week rings | DONE-NOW | src/core/chartData.ts habitRange, src/ui/charts.ts; t:habit_grid.test.ts | week view = 12-week range; no streak field |
| V17 | Habit matrix in weekly review | STILL-PARTIAL | src/ui/charts.ts habitGridTracker on #/habits | not on weeklyScreen (Q-06) |
| V18 | Backfill past days | STILL-PARTIAL | t:focus_habits_cards_ui.test.ts:48; src/core/habits.ts canLog | 28-day strip only (Q-13) |
| V19 | Journey timeline with photo/note | STILL-PARTIAL | notes counted in weeklySummary; no photo field in src/catalog/fields.ts | Q-29, needs short DECISIONS_LOG entry |
| V20 | Subject/skill progress rings | STILL-MISSING | skill.name/level src/catalog/fields.ts:87-93; src/ui/ring.ts | Q-18 |
| V21 | Nested progress tree | DONE-NOW | src/core/goalTree.ts; t:goal_tree.test.ts:87; mapsUi.ts goalTreeChart | none |
| V22 | Home-screen widget | BLOCKED | PWA-first D-A | needs native wrap |
| V23 | Share progress card, colour picker | BLOCKED | CLAUDE.md section 4 item 2 | data leaves device |
| V24 | Ambient sounds, voice, sound sheets | BLOCKED | public/audio has azan-manifest.json only | licensed audio |
| V25 | Searchable template library | STILL-PARTIAL | src/library/systems/*.json (6), src/library/systemList.ts; t:systems.test.ts | search box (Q-24); more templates need reviewer |
| V26 | Habit fields: category, start/end, reminders | STILL-PARTIAL | src/catalog/fields.ts 416-608; src/core/reminders.ts:12 | missing category, start, end (Q-13); schema note needed |
| V27 | AI coaches / AI plan help | BLOCKED | D-C | owner approval |
| V28 | Stepping-stones path | STILL-PARTIAL | journey-stage-strip src/ui/screens.ts:1148; t:action_desk_journey.test.ts:45 | text strip only (Q-17) |
| V29 | Plan>action>success path with glow | STILL-PARTIAL | src/ui/rewardArt.ts journeyArt; t:r4_motion.test.ts:74 | no labelled nodes (Q-17) |
| V30 | Success gauge, 3 pillars, no score | STILL-MISSING | none | Q-18 |
| V31 | Horizon arc year-ago>today, moving marker | STILL-PARTIAL | src/ui/horizonArt.ts horizonArc; t:horizon_art.test.ts 63-69 | static marker (Q-15) |
| V32 | "My why" reveal | STILL-PARTIAL | goal.why in src/catalog/fields.ts:256 | not shown on goal page (Q-04) |
| V33 | Setback-to-recovery message on Stuck | STILL-MISSING | stuck.done.* in src/i18n/packs.ts:1074 | Q-01 |
| V34 | Mute notifications toggle | DONE-NOW | src/ui/remindersSettingsUi.ts; t:reminders_settings.test.ts | master switch OFF by default + quiet hours |
| V35 | Effort-timing quadrant explainer | STILL-PARTIAL | text card screens.ts:729; t:r5_stuck_log.test.ts | Q-03 |
| V36 | Motivation vs discipline card | STILL-PARTIAL | src/library/inspiration.ts, screens.ts:1065; t:inspiration.test.ts | no comparison (Q-05) |
| V37 | Bike timeline today>month>year | STILL-MISSING | none | built with V31 (Q-15) |
| V38 | Two-path fork | STILL-PARTIAL | text card screens.ts:726; t:r5_stuck_log.test.ts | Q-03 |
| V39 | Calm particle motion to goal cup | STILL-MISSING | rewardArt.ts glow only | Q-19 |
| O1 | Plain simple Bangla copy | BLOCKED | t:bangla_plain.test.ts, t:copy_review.test.ts | native reader TM-TST-161 |
| O2 | Prayer times vs official timetable | BLOCKED | src/core/prayer.ts, t:prayer.test.ts | TM-TST-101 owner compares Dhaka times |
| O3 | Azan + pre-prayer alerts default OFF | BLOCKED | src/ui/azanSoundUi.ts, src/core/azanSlots.ts, t:azan_slots.test.ts | no mp3 in public/audio |
| O4 | Google search option | BLOCKED | D-C | key and cap approval |
| O5 | Template chooser on every dashboard | STILL-PARTIAL | VIEW_SCREENS (18) in src/ui/state.ts:70; t:screen_views_more.test.ts; src/ui/lookUi.ts | missing Deen, Stuck, Topics, North Star, Capture (Q-05) |
| O6 | Premium visuals per screen | BLOCKED | t:looks_matrix.test.ts, docs/audit/LOOKS_EVIDENCE_2026-11-03.md | owner phone taste check |
| O7 | Micro-animations with reduced motion | STILL-PARTIAL | t:r4_motion.test.ts 49-58, t:progress_ring.test.ts 76 | rule enforced; missing motions in Q-15, Q-19 |
| O8 | Source tracking | STILL-PARTIAL | TipSource in src/library/topics.ts | systems and glossary have none (Q-24) |
| O9 | Quran, zakat, giving logs | BLOCKED | D-D | owner approval + content review |
| O10 | O1 real-phone airplane-mode test | BLOCKED | owner device task | owner only |
| O11 | O2 Bangla glossary native review | BLOCKED | TM-TST-161; tag glossary.unreviewed screens.ts:1413 | reviewer |
| O12 | O3 usability sessions | BLOCKED | real-user tests | owner only |
| O13 | O4 hosting account | BLOCKED | CLAUDE.md section 8 | owner account step |
| O14 | O8 lock-screen privacy per category | BLOCKED | t:o8_notify_privacy.test.ts; TM-TST-155 | owner device task |
| O15 | B1 Motivation/discipline board + Inspiration page | STILL-PARTIAL | Today card screens.ts:1065; t:inspiration.test.ts | no page (Q-05) |
| O16 | B2 Horizon view | STILL-PARTIAL | src/ui/horizonArt.ts; t:horizon_art.test.ts | moving marker (Q-15) |
| O17 | B4 Template chooser per screen | STILL-PARTIAL | same as O5 | Q-05 |
| O18 | B7 Two-path card + effort-timing tip | STILL-PARTIAL | screens.ts:726-729 | Q-03 |
| O19 | B8 "Where my time goes" funnel | STILL-PARTIAL | text list screens.ts:730 (stuck.time.*) | Q-03 |
| O20 | B11 Focus tip + converging motion | STILL-PARTIAL | t:r4_motion.test.ts 86-93 | motion missing (Q-19) |

## 3. BUILD QUEUE
Every task keeps: no scores/ranks/streaks/grades, unknown is not 0 (show "Unknown"/dashed), DEMO label in demo and none of it in real mode, text in EN, BN and Mix (plain per bangla-plain pass 2, Latin digits, keys in src/i18n/packs.ts), 360 px layout, text 75-150% without clipping, motion only under no-preference with the reduce-off rule (t:r4_motion.test.ts), decorative visuals have a text equivalent. Each task adds the test named. Rows listed are covered rows. Order: small first, then by value. "Dep" = must be built after.

| Q | title | exact scope | files likely touched | test to add | rows | dep |
|---|---|---|---|---|---|---|
| Q-01 | Recovery line | After any Stuck helper show one calm line: "A pause is part of the path. Come back when ready." No judging words | src/core/stuck.ts, screens.ts, packs.ts | extend t:stuck.test.ts (3 languages, no judging words) | V33 | none |
| Q-02 | Make-it-concrete bank | 8 fixed big-task to tiny-first-action pairs on Stuck; tap fills the step name | stuck.ts, Stuck UI, packs.ts | t:concrete_bank.test.ts | 38 | none |
| Q-03 | Stuck card pictures | CSS two-branch picture over the two-paths lines; "matrix" diagram tip (Hard now / Easy later) on effort-timing card; 3 stacked bands (Time, Distractions, Goals) for time funnel, no counts; aria-hidden, text stays | screens.ts:726-730, src/library/topics.ts, diagram.ts, styles.css | extend t:r5_stuck_log.test.ts + t:content_pack.test.ts | V38, V35, O19, O18 | none |
| Q-04 | Show my why | Collapsed details on goal page with own goal.why; empty = prompt to add | src/ui/lifeUi.ts | t:goal_overview.test.ts | V32 | none |
| Q-05 | Motivation/discipline compare + Inspiration page + chooser coverage | 2-column Motivation/Discipline tip under habits topic; route #/diary/inspiration listing 4 themes and the compare card; add Deen, Stuck, Topics, North Star, Capture to VIEW_SCREENS with withView() | topics.ts, inspiration.ts, screens.ts, state.ts, app.ts | extend t:inspiration.test.ts, t:link_check.test.ts, t:screen_views_more.test.ts, t:content_pack.test.ts | V36, O15, O5, O17 | none |
| Q-06 | Weekly additions | Card "what got in the way" with 4-5 taps + Skip kept in prefs; last 7 days of habit matrix under weekly counts (no habits = Unknown note, unplanned day = none not miss) | screens.ts weeklyScreen, charts.ts | extend t:weekly_review.test.ts | V4, V17 | none |
| Q-07 | Four-legs line + lever links | One calm "Worth a look: X" line on Today from fourLegs() (nothing when steady/unknown); lever rows link to matching topic card and mark kept in prefs | src/ui/homeUi.ts or screens.ts, legsUi.ts | extend t:home_cards.test.ts, t:legs.test.ts | V12, V10 | none |
| Q-08 | Still matters tap | Yes / No / Not sure step before options in reality loop; Not sure never reads as No | src/ui/realityUi.ts | extend t:reality_loop.test.ts | V6 | none |
| Q-09 | Priority chips + level icons | Show task.priority as a tag on goal-tree step rows (none when unknown) and "Today" tag if planned today; 4 small SVG icons (mission, goal, project, task) beside level names | goalLinks.ts, lifeUi.ts, mapsUi.ts, svg.ts | extend t:goal_tree.test.ts; t:goal_icons.test.ts | V2, 29 | none |
| Q-10 | Goal-page starter cards | Start card (Clarify / Break down / Begin with links) on empty goal; 4-field problem frame (problem, who, why, outcome); 3-field want/feel/do card with 5 fixed tiny-action examples | lifeUi.ts, ventureCard.ts, catalog/fields.ts | t:goal_form.test.ts (+link_check), t:problem_frame.test.ts, t:want_feel_do.test.ts | V7, 22, 9 | none |
| Q-11 | Goal worksheet fields + plan table | Optional obstacle, if-then backup, first action/when fields; "Table" view (objective, steps, success, time frame, resources; empty = Not set). Schema note + migration if fields stored | catalog/fields.ts, lifeUi.ts, DECISIONS_LOG.md | t:goal_obstacle.test.ts, t:goal_plan_table.test.ts, t:schema_constant.test.ts | 18, 6 | none |
| Q-12 | Buffer day + buffer bar | "Keep last day free" toggle in backward plan (calm note if no room); on plan commit card own estimated minutes plus lighter +25% segment labelled ESTIMATE, Unknown if any task lacks minutes | backwardUi.ts, blocksUi.ts | extend t:backward_plan.test.ts; t:buffer_bar.test.ts | V13, V3 | none |
| Q-13 | Habit extras | Earlier-day date input (max today, reuse canLog); optional habit.category, start_on, end_on (grid shows outside range as none); micro-habit starter (title, "after I..." anchor, max 2 min, offered when no other new habit active, not blocking) | habits UI, catalog/fields.ts, charts.ts, DECISIONS_LOG.md | extend t:focus_habits_cards_ui.test.ts, t:habit_grid.test.ts, t:schema_constant.test.ts; t:micro_habit.test.ts | V18, V26, 10 | none |
| Q-14 | Decision and thinking helpers | 7 thinking prompts list on decision screen (outcome of decide() unchanged); 4 framework cards (10/10/10, pros and cons, six hats, OODA) as tips with reviewer pending plus picker; Think/Tell/Act picker; 4 strategy cards each saving one private note | decisionUi.ts, topics.ts, Stuck/Focus UI | extend t:decisions.test.ts, t:content_pack.test.ts; t:thinking_mode.test.ts; t:strategy_cards.test.ts | V8, V9, V15, 20 | none |
| Q-15 | Horizon upgrades | Per level "one thing" line (none = Not set); tick checkpoints on arc from own milestones; arc start from earliest own record date (Unknown if none) with marker placed between start and farthest goal date, pop-in only under no-preference; multi-year milestone line plus one monthly focus text | horizon.ts, horizonArt.ts, packs.ts | extend t:horizon_art.test.ts; t:horizon_one_thing.test.ts, t:horizon_ticks.test.ts, t:horizon_timeline.test.ts | 1, 30, 19, V31, V37, O16, O7 | none |
| Q-16 | Flow diagrams | Vertical 4-step flow (systems, routines, habits, identity) on discipline topic; 5-box flow (goal, system, minimum, review, adjust) on systems screen; text equivalents | diagram.ts, topics UI, planScreens.ts | t:topics_flow.test.ts, t:systems_flow.test.ts | 2, 11 | none |
| Q-17 | Path pictures | S-curve snake path with milestone tiles from own goal steps (none = Not set); 8 stones A-H on journey strip (current highlighted, passed filled); Plan/Action/Success captions on reward card lit by own data, Unknown dim | diagram.ts, screens.ts, rewardArt.ts, styles.css | t:snake_path.test.ts; extend t:action_desk_journey.test.ts, t:topics_rewards.test.ts | 14, V28, V29 | none |
| Q-18 | Progress shapes | Skill rings from level/max (no level = dashed "?"); momentum shape morphing by own habit consistency, Unknown = plain outline; 3 pillar bars (planned steps, done this week, habit check-ins), each Unknown if no data, no total | ring.ts, Journey UI, assessment UI | t:progress_ring.test.ts (extend), t:momentum_shape.test.ts, t:pillars.test.ts | V20, 26, V30 | none |
| Q-19 | Reward metaphors and motion | Settings choice of 3 metaphors (pebble jar, rings, bridge) from tier() count; courage bridge with planks from own "tried" taps; 5 change rings with private current-ring tap; 6 drifting dots to cup and 3 converging lines beside focus tip, no-preference only | rewardArt.ts, settingsRegistry.ts, svg.ts, styles.css | t:reward_choice.test.ts, t:courage_bridge.test.ts, t:change_rings.test.ts; extend t:r4_motion.test.ts | 35, 31, 32, V39, O20 | Q-17 (shared cup/art) |
| Q-20 | Setup checklist + Where am I | 3-phase setup card on Journey tools (foundation, build, maintain; ticks in prefs, no percent score); 3-button check (lost / learning / executing) routing to Stuck / Learn / Today | screens.ts, new UI, app.ts | t:setup_checklist.test.ts, t:where_am_i.test.ts (+link_check) | V11, 28 | none |
| Q-21 | Challenge tracker | #/journey/challenge: name, my why, N-day grid (reuse habit grid cell logic), rules text, final-mission checklist, calm finished moment | new src/ui/challengeUi.ts, app.ts, entities/fields | t:challenge.test.ts | 5 | none |
| Q-22 | Venture clusters | "Everything it takes" cluster checklist on venture card with tick items and own text | ventureCard.ts, ventures.ts | t:venture_clusters.test.ts | 8 | none |
| Q-23 | SOP fields | Optional purpose, trigger, check, handoff in SOP form and print | knowledge.ts, notesUi.ts, fields.ts, printUi.ts | extend t:notes_sops.test.ts | 23 | none |
| Q-24 | Source line + systems search | Show source kind + reviewer-pending + added date under each system and glossary term (fields source, addedOn; never a link); search box filtering systems list by title/tag (EN+BN) | systems/*.json, systemList.ts, libraryScreens.ts | extend t:systems.test.ts, t:copy_review.test.ts, t:m_systems_rules_ui.test.ts | O8, V25 | none |
| Q-25 | Daily plan sheet | Today card: mantra line, tomorrow list (own tasks), make-time-for text; reuse task priority for must-do/if-time | screens.ts, fields | t:today_sheet.test.ts | 17 | Q-09 (priority tag style) |
| Q-26 | Sort my tasks + batching | Screen from Plan: own open tasks tapped High/Low impact and effort (memory only), 4 quadrants, top 3 (High impact + Low effort), unrated in "Unrated"; "Batch" action picks 2+ own tasks into one block label (no new tasks) | planScreens.ts, diagram.ts | t:clarity_grid.test.ts, t:time_batch.test.ts | V14, 24 | none |
| Q-27 | Situation picker | 3 options (job + side project, full-time, student) showing a sample week from existing time blocks | blocksUi.ts | t:situation_picker.test.ts | 25 | none |
| Q-28 | Reflection visuals | Gentle wave from own optional felt up/down log entries; 6 calm setback panels plus fall-to-rise curve on Stuck, no red; one private daily tap on 4-step mindset stair on Today, own history only | journey log UI, stuck UI, screens.ts | t:journey_wave.test.ts, t:setback_curve.test.ts, t:mindset_stair.test.ts | 27, 33, 34 | Q-01 |
| Q-29 | Photo on a note | Optional image (downscaled to 300 KB) stored on device in note record, excluded from exports unless ticked, delete removes it; DECISIONS_LOG entry (D-B covers) | notes UI, fields.ts, backup code | t:note_photo.test.ts | V19 | none |
| Q-30 | SMART wizard | Step-by-step 5-question mode and 7 yes/no checklist (Unknown allowed); funnel stays | lifeUi.ts, goalPlan.ts | t:smart_wizard.test.ts | 21 | none |
| Q-31 | Small choosers | Working-style 4 cards saved as private pref (suggest one routine, no type score); 6-level maturity funnel own pick (does / result / next, no score); quick-pick card tick 1-3 ways this week saved private | new UIs, topics UI | t:work_style.test.ts, t:maturity_funnel.test.ts, t:quick_pick.test.ts | 7, 16, 15 | none |
| Q-32 | Focus grid | 16-card tick grid page, steps from visual-references.md text, ticks private | new UI, fields | t:focus_grid.test.ts | 13 | none |
| Q-33 | Per-screen look override | Optional per-screen look in Settings > Look; master look stays default; no new colours | lookUi.ts, themes.ts | t:look_per_screen.test.ts | 12 | Q-05 |
| Q-34 | Weekly and monthly grid for other trackers | Reuse the habit grid cell logic (31 days, 12 weeks, 12 months, no streak, unknown cell is blank not 0) for the other trackers the owner named; same component, per-tracker data only | src/core/chartData.ts, src/ui/charts.ts, the tracker screens | extend t:habit_grid.test.ts | 4 | none |

Ordering note: Q-01 to Q-09 are small and independent; Q-10 to Q-20 are medium; Q-21 to Q-34 are larger or lower value. Q-28 follows Q-01, Q-19 follows Q-17, Q-25 follows Q-09, Q-33 follows Q-05.

## 4. BLOCKED list
| id | item | waits for |
|---|---|---|
| V22 | Home-screen widget | G2 device test result; native wrap only if PWA fails (D-A). Owner phone task |
| V23 | Share progress card, colour picker | Owner approval each time (data leaves device, section 4 item 2) |
| V24 | Ambient sounds, voice, sound sheets | Owner supplies licensed audio and OK |
| V27 | AI coaches / AI plan help | D-C: owner approves provider and spend cap |
| O1 | Plain simple Bangla copy | TM-TST-161 native Bangla reader sign-off |
| O2 | Prayer times check | TM-TST-101: owner compares Dhaka times with official timetable on phone |
| O3 | Azan + pre-prayer alerts | Owner supplies licensed MP3 files, then phone test |
| O4 | Google search option | D-C: owner approves key and cap |
| O6 | Premium visuals per screen | Owner taste check on phone (evidence: t:looks_matrix.test.ts) |
| O9 | Quran, zakat, giving logs | D-D decision plus content review |
| O10 | Real-phone airplane-mode test | Owner phone task |
| O11 | Bangla glossary native review | Reviewer (TM-TST-161) |
| O12 | Usability sessions | Owner arranges real users |
| O13 | Hosting account | Owner does Cloudflare Pages account step (CLAUDE.md section 8) |
| O14 | Lock-screen privacy per category | Owner phone check (TM-TST-155) |

# B1 Daily and Plan: screen design (6 Nov 2026)

Docs only. Nothing in src/ is changed. Look: D-E Light, Colorful, Futuristic. Companion picture file: `B1_daily_plan.html` (before/after phone frames).

## বাংলা সারসংক্ষেপ (সহজ বাংলা)
1. এই ডকে Today, Journey, Diary, Habits, Focus, Stuck, Reward আর Capture স্ক্রিনের নতুন ডিজাইন আছে।
2. গোল: 360 px ফোনে স্ক্রল সর্বোচ্চ দেড় স্ক্রিন। এখন Journey প্রায় 14 স্ক্রিন, Today প্রায় 4.7 স্ক্রিন।
3. উপায়: ট্যাব, অ্যাকর্ডিয়ন, বটম শিট ফর্ম, কুইক অ্যাকশন রো আর সার্চ বার। পেজের ভিতরে পেজ, ফাংশনের ভিতরে ফাংশন।
4. কোনো ফাংশন বাদ যায়নি। প্রতিটা রুটের জন্য ম্যাপ টেবিল আছে: কোন ফাংশন এখন কোথায় পাওয়া যাবে।
5. জরুরি সতর্কতা (সেভ ফেইল, কনসেন্ট পজ) কখনো ভাঁজ হবে না। আগের Action Desk ক্রম ঠিক থাকবে।
6. Journey এর 18টা টুল 3টা ট্যাবে যাবে (প্ল্যান 7, রিভিউ 6, এক্সপ্লোর 5) আর সার্চ বার থেকেও খোঁজা যাবে।
7. গোল পেজে স্টেপ, প্ল্যান, কোথায় যায়, SMART/SWOT, স্ট্যাটাস আলাদা ট্যাবে থাকবে।
8. ফর্মগুলো (নতুন গোল, হ্যাবিট, ক্যাপচার) বটম শিটে খুলবে, তাই পেজ ছোট থাকবে।
9. নতুন বানাতে হবে: k-tabs, k-sheet, k-cmd, k-help কম্পোনেন্ট আর একটা নতুন রুট `#/journey/tools`।
10. কোনো স্কোর, র‍্যাংক, স্ট্রিক বা লাল ব্যর্থতার লেখা নেই। প্রোফাইলে পার্সেন্ট নেই, শুধু কোনটা ভরা আর কোনটা অজানা। অজানা মানে 0 না।

## 0. How I measured (no guessing)
| Source | What it gives | Limit |
|---|---|---|
| `docs/audit/action-desk-ui/after-final/*-full.jpg` (pixel height, 360 px wide) | Today **3488 px**, Journey **10310 px** (EN, 100%, Light Futuristic, demo fixtures, 5 Nov) | Journey taken before the 6 Nov "Feature details" collapse. Closed height not re-captured; still holds 18 links + stage ladder + stage panel + 4 cards |
| `docs/audit/action-desk-ui/after-stress/state-long-title-100-*.jpg` | Goal page **4559 px** (long title stress, 100%), 9792 px at 200% | Stress fixture, upper bound |
| `evidence/screenshots/en-*.png` (width 720 = 2x, so CSS px = height/2) | diary 1864, diary/plan 2376, diary/money 1476, intake step 1251-1714, stuck 1819, habits 968 (few habits), capture 745 | Older run (before Action Desk). Value 740 = clipped to one viewport, true length unknown (>= 1 screen) |
| Source count (`src/ui/screens.ts`, `lifeUi.ts`, `planScreens.ts`: cards / forms / inputs per builder) | Where the length comes from | Counts are a proxy, not pixels |
One screen = 740 px (matrix viewport 360x740). 1.5 screens = **1110 px**. Heights quoted below are those numbers; "est." means my estimate from block counts.
Route names: owner list says `/wheel`, `/goals`; real routes are `#/journey/wheel`, `#/journey/goals`, `#/journey/goal/:id`, and so on (`src/app.ts` ROUTES). Habits is `#/habits`, Focus `#/focus/:id`, Stuck `#/stuck`, Reward `#/reward`, Capture `#/capture`, Start `#/start`, print `#/journey/print/:kind?`.

## 1. Shared patterns (one kit, used by all screens)
| Pattern | Kit status | Rule |
|---|---|---|
| Tabs inside page `k-tabs` | **new, needs build** (base = existing `.seg` buttons; add `role=tablist`, arrow keys; tab choice kept per screen in the `screenView` prefs like `viewBar`) | Max 5 tabs, labels one line at 150%, count badge = `kChip` |
| Accordion | exists: `:where(main) details:not(.help)` + `.module-details` | Native `<details>`, summary 48 px, count badge in summary |
| Bottom sheet `k-sheet` for forms | **new, needs build** (native `<dialog>`, `--r-lg` top corners, `--e2`, scrim `--scrim`, focus trap, Esc/back closes, inputs kept on failure) | Same form code, only the container changes |
| Quick-action row | exists: `workspaceShortcuts()` + `.k-actions--row` | 3 to 5 chips, 44 px (`--tap`), wraps, never scrolls sideways |
| Search / command bar `k-cmd` | **new, needs build** (copy of `settingsSearch.ts`: `norm`, recents; index = route labels from ROUTES + tool names; local only, no AI) | Sits under the title; empty = recents |
| Help (i) `k-help` | **new, needs build**; content = existing `details.help` text (`dl`) | 44 px (i) button opens it inline under the heading |
| Profile | exists: `profileCard` (Diary), Settings > Profile | Shown as chip "Profile" that opens it in a sheet: plain list of filled parts and unknown parts, no percent, no inferred value |
| Count badge | exists: `kChip` (`--tint-primary`) | Counts only real numbers; unknown shows "?" never 0 |
Never collapsed: `pausedCard`, save/storage/namespace banners, `disclaimers`, DEMO chips (`--tint-demo`, `--demo`). Tokens are defined in `src/ui/styles.css` and used by `src/ui/kit.css`. Tokens used: `--paper --card --ink --muted --rule --primary --on-primary --ember --moss --calm --danger --demo --demo-bg --tint-primary --tint-calm --tint-moss --s1..--s7 --r-md --r-lg --e1 --e2 --hair --tap --ctl-h --fs-sm..--fs-2xl --lh-ui --focus --scrim`.

## 2. Today and Capture (`#/today`, `#/capture`)
**Problems (source: `today()` screens.ts 1013-1071, 3488 px).** About 24 conditional blocks stacked: pausedCard, header, 4 shortcuts, nextActionCard, agenda + 3 buttons, 6 attention cards, 3 context, 12 summary cards, stage + rungs, inspiration, rules, disclaimers. Tasks start at ~451 px (ACTION_DESK note). Summary and inspiration are always open. Capture 745+ px has a 3-input form always open.
**Proposal (keeps Action Desk order from ui-reconcile-plan / decision doc).** Header row: title, date, pauseChip, `k-cmd` icon, `k-help`. Then warnings (never folded) > ONE recommended task / reason band > agenda rows (first 3, "All n" link) > quick-action row [Add step, Capture, Habits, Stuck, Plan, Money, Goals] > Attention accordion (open only when it has due items, badge n) > tabs **[Summary n][Context n][Stage and idea]**. Disclaimers + rules last in a closed "Notes" accordion that still shows the one-line disclaimer.
**Capture:** input line + Save visible; "How it understood" result and Found list in a sheet after Save. Intro text goes in `k-help`.
| Existing function (builder) | New place |
|---|---|
| pausedCard, save/consent banners | top, always open |
| greeting/date, pauseChip | header |
| workspaceShortcuts (plan, goals, money, capture) | quick-action row |
| nextActionCard / selected task highlight | recommended band (once) |
| todayFromPlan, DEMO_TASKS, viewBar("today") | agenda rows + view toggle in agenda header |
| `#/diary/intake` (home.start), `#/habits`, `#/stuck` | quick-action row (intake is first, primary) |
| riskDueCard, gateDueCard, remindersTodayCard, missedTodayCard, goalDateReminders, backupReminderCard | Attention accordion (6 items, badge) |
| welcomeBackCard, movedNoteCard, next-step aside | tab Context |
| overallProgressCard, homeCountCards, kpiTodayCard, northStarCard, teamCard, blocksTodayCard, healthCard, deenTodayCard, realityTodayCard, homeSummaryCards, portfolioCard, adviceCardsView | tab Summary, same order, each its own row-card |
| stage text + rungs (A-H "1/8"), inspiration card | tab Stage and idea |
| rulesTodayCard, disclaimers | Notes accordion (disclaimer line stays visible) |
| captureScreen: input, parse, found/none, confirmLow, saveNote | input + sheet (same code) |
**Target:** Today first view = header + 1 band + 3 rows + chip row = ~560 px; tab content opens in place, page <= 1100 px (from 3488, **-68%**). Capture <= 740 px.

## 3. Journey home (`#/journey`) and Start (`#/start`)
**Problems (`journey()` 1132-1168, 10310 px, 13.9 screens).** 18 equal tool buttons in 3 grids (~1000 px), goals card, funnel hero, overallProgress, northStar, templatePicker, viewBar, 8-rung stageLadder, stagePanel (3 cards), module details. The goal/plan entry is repeated (shortcut, goals card, tool grid).
**Proposal.** Title + stage strip (1 line "Stage A · 1/8" with `valueEl` DEMO/ESTIMATE) > `k-cmd` "Find a tool" > goals card (top 3 active, "All n" > `#/journey/goals`, "+ New goal" opens `k-sheet` = `newGoalForm`) > tabs **[Plan 7][Review 6][Explore 5]** (2-column tool grid, one tab at a time) > Overview accordions (closed, badges): Progress, North Star, Goal funnel, Stages (8), Stage detail, Look (template + view), Feature details. `#/journey/tools` = full searchable list of all 18 + sub-pages (**new, needs build**; optional "All tools" link at the end of the tab).
| Existing function | New place |
|---|---|
| 18 tool links (boards, horizon, decide, risks, reality, northstar, kpi / log, report, week, month, review, history / universe, art, mine, legs, leak) | 3 tabs, same labels (`bd.link` ...), plus `k-cmd` and `#/journey/tools` |
| passedBanner, journeyStage strip | top, open |
| workspaceShortcuts (plan, goals) | quick-action row |
| journeyGoalsCard, goalFunnelHero | goals card; funnel in Overview accordion |
| overallProgressCard, northStarCard | Overview accordions |
| templatePicker, viewBar("journey") | Overview > Look |
| stageLadder, stagePanel (gate card, stage data) | Overview > Stages / Stage detail |
| moduleDetails("journey"), disclaimers | unchanged, bottom |
| Start `#/start` (onboardScreen) | unchanged 1-step flow; skip stays; help text in `k-help` |
**Target:** first view = goals + tabs ~ 700 px; page <= 1100 px (from 10310, **-89%**).

## 4. Goals and goal pages (`#/journey/goals`, `#/journey/goal/:id`, `#/journey/wheel`, `#/journey/universe`)
**Problems.** `goalScreen` (lifeUi 287-360, 4559 px stress): progress, remindRow, stepsCard, weightCard, placeCard (form), statusCard, goalAreaCard, SMART form (5 labels + date), SWOT view + SWOT form (4 textareas), goalDeleteCard, all stacked. `goalsScreenInner` = newGoalForm (6 inputs) + tree. Wheel and universe are long lists.
**Proposal.** Goal page: header (title, tags, parent crumb) > progress ring + bar + milestone line > quick-action row [Add step, Done, Remind, Move] > tabs **[Steps n][Plan][Where][SMART/SWOT][Status]** > Delete inside Status tab (`calm-danger`, confirm as today). Edit forms open in `k-sheet`. Goals list: tree rows (`k-row`), "+ New goal" = sheet. Wheel: ring on top, area list in accordion. Universe: area chips as tabs, list below.
| Function | New place |
|---|---|
| goalProgress, milestone, progressRing | header block |
| remindRow | quick action Remind (sheet) |
| stepsCard (+ taskEditForm, step edit sheet) | tab Steps |
| weightCard | tab Steps > "Weighting" accordion |
| placeCard, goalLinks "Where does this go?" | tab Where |
| goalAreaCard (universe) | tab Plan |
| smartForm, swotView, swotForm | tab SMART/SWOT (view first, edit in sheet) |
| statusCard, goalDeleteCard | tab Status |
| `#/journey/backward/:id` link | tab Plan, "Backward plan" row |
| newGoalForm | sheet from Goals list + Journey home |
| wheelScreen, universeScreen | same routes, ring + accordion / chips |
**Target:** default tab <= 1000 px (from 4559, **-78%**).

## 5. Journey review and history (`log, report, print, week, month, review, history`)
**Problems.** `reportContent` (3 cards, 2 headings), `weeklyScreen`, `reviewScreen`, `monthScreen` (4 cards), `planHistory`: each a vertical card stack; evidence shots are clipped at 740 (true length unknown, >= 1 screen). Four near-identical period screens.
**Proposal.** One "Review" shell with period tabs **[Week][Month][Review][Report][Log][History]** that load the existing screens' content inline (routes stay: each tab = its existing route, deep links work). Print: `#/journey/print/:kind` stays, entry = button "Print / Save" at the top of Report. Empty periods say "Not enough data yet" (unknown, not 0).
| Function | Place |
|---|---|
| journeyLog, reportScreen+reportContent, weeklyScreen, monthScreen, reviewScreen, planHistory | six tabs, own routes unchanged |
| printScreen (kinds) | Report > Print sheet |
| moneyReviewCard, riskReviewCard, assumptionRow (month) | Month tab, accordions with badges |
**Target:** each tab <= 1100 px; shell adds 56 px (est.).

## 6. Journey plan tools (`decide, mine, legs, leak, risks, northstar, reality, boards, backward, backward/:id, gates, kpi, horizon`)
**Problems (source counts).** gates: 4 cards, 3 forms, 9 inputs. northstar 91 lines, 2 forms, 8 inputs. kpi 2 forms, 7 inputs. risks form 4 inputs. reality: eventForm + waiting + resume + parked + history. backward: 4 cards. Forms always open; lists below them.
**Proposal.** Same skeleton on all: title + `k-help` > list first (the person's own entries) > "+ Add" opens `k-sheet` with the existing form > secondary lists in accordions with badges (reality: Waiting n, Parked n, History n; gates: Due, Passed; kpi: Metrics, Entries). boards: tabs [Timeline][Tasks][Options] (`timelineChart`, `taskBoardView`, `optionBoardView`).
| Route | Functions kept, place |
|---|---|
| risks | riskScreenInner list + form (sheet) |
| reality | eventForm (sheet), waitingCard, resumeCard, parkedList, historySections (accordions) |
| northstar, kpi, gates | forms into sheets, lists open, gate cards in Due/Passed accordions |
| boards | 3 tabs |
| backward, backward/:id | list; detail = steps list + planByTag in accordion |
| decide, mine, legs, leak, horizon | list/chart first, entry form in sheet |
**Target:** <= 1100 px each; gates/northstar est. -60%.

## 7. Diary (`#/diary`, `intake`, `plan`, `money`, `ventures`, `health`, `team`)
**Problems.** `diary()` 1864 px: profileCard, completeness card, next card, CTA + 5 ghost buttons, module details. plan 2376, money 1476, intake step 1251-1714 (7 steps), ventures (3 forms, 9 inputs), team (3 forms, 9 buttons), health (5 cards).
**Proposal.** Diary home: title + Profile chip (sheet: filled parts / unknown parts list, no percent) > next step band + "Continue intake" CTA > **tab bar of 6 sections [Plan][Money][Ventures][Team][Health][Intake]** as a 2-row tile grid (icon + count badge) > `k-cmd`. Each section keeps its route; inside: list first, add form in sheet, extras in accordions. Plan: [Today][Week][Later] tabs; money: [Summary][Entries][Currency] tabs; intake: sticky step chips 1-7 with progress.
| Function | Place |
|---|---|
| profileCard | Profile chip > sheet (also Settings) |
| completeness (shown as list of filled / unknown parts, no percent), nextText | Profile sheet + band |
| 6 links (intake, plan, money, ventures, team, health) | tile grid with badges |
| planScreen: task add/edit, hours, mode, role, size, planFlow, feasibilityNote | tabs Today/Week/Later; add = sheet |
| moneyScreen: add, cash90, runway, networth, fx rate, remove | tabs Summary/Entries/Currency |
| intake steps, suggestPanel, freshBadge | step chips; suggestions in accordion |
| ventureScreen, teamScreen, healthScreen | list + sheet forms, accordions |
| moduleDetails("diary") | bottom, unchanged |
**Target:** home <= 740 px (from 1864, **-60%**); sections <= 1100 px.

## 8. Habits, Focus, Stuck, Reward, Art
**Problems.** `habitsScreen` 968 px with few habits: each habit card = name row, button, 7 dots, chart, goals row, reminder row, 2 notes, ~500 px (est.); add form (7 inputs) always open; habit grid tracker. Stuck 1819 px. Focus 10 buttons. Reward/art clipped 740.
**Proposal.** Habits: today strip (one `k-row` per habit, tick button, 7 dots inline) > grid tracker tab **[Today][Grid][Add]**; per-habit details (chart, goals, reminder, restart note) in an accordion on the row; Add = sheet. Stuck: causes as a question list (Yes / No / Not sure) one at a time, helpers in accordion. Focus: timer + 3 buttons visible, minutes picker and total in a details row. Reward: ring + latest picture; `#/journey/art` gallery stays.
| Function | Place |
|---|---|
| habit tick/plus, dots, consistency (shown as "x of y planned days", no score), restart plan, remindRow, habitGoalsRow, delete | row + row accordion |
| habitGridTracker, viewBar("habits"), add form + goalPicker + consent gate | tabs Grid / Add (sheet) |
| stuckScreen causes, helpers, stepAdd, plan link | question list + accordion |
| focusScreen (pick, pause, stop, markDone, total, tip) | timer + details |
| rewardScreen/rewardRing/pictureBlock, artScreen | unchanged routes, compact |
**Target:** Habits <= 740 px for 3 habits (from ~1700 est.), Stuck <= 1100, Focus/Reward <= 740.

## 9. Checklist (every screen above)
| Check | How |
|---|---|
| Text 75-150% no clipping | Slider test from reconcile plan R3; tabs wrap to 2 rows, never clip; badges `min-width:24px` |
| Touch targets >= 44 px | tabs, chips, (i), sheet close: `min-height:var(--tap)`; 8 px gaps (`--s2`) |
| Contrast | text `--ink` on `--card`; chip text `--ink` on `--tint-*`; do not rely on colour alone (badge has number) |
| Focus order | title > search > warnings > primary > quick row > tabs > panel; sheet traps focus, returns it to the opener; skip link stays |
| Labels EN / BN / Mix | every new key has 3 forms; Bangla via CLAUDE.md 2b (স্টাফ, ট্যাব, স্ট্যাটাস, মেসেজ, দরকার, বা, সাথে, এটা); no ব্যক্তিগত, বিরতি, মাপকাঠি |
| Copy rules | no score, rank, streak, red missed-goal text; unknown shown as "?", never 0; DEMO chip on demo data; no scripture; no AI |
| Reduced motion | sheet slide only under `prefers-reduced-motion:no-preference` |
| Link check | each route in sections 2-8 appears in the new tests' link list; Action Desk tests keep their selectors (add classes, never rename) |
New items needing build: `k-tabs`, `k-sheet`, `k-cmd`, `k-help` (components), route `#/journey/tools`. Everything else is an existing route or builder.

## 10. Help (i) text, every group that uses k-help (EN / BN, plain)
| Group | EN | BN |
|---|---|---|
| Today | Your tasks for today. Tap Done when finished. Other cards open below. | আজকের কাজ এখানে। শেষ হলে Done চাপুন। বাকি কার্ড নিচে খোলে। |
| Journey | Your goals and all tools. Pick a tab or search for a tool. | আপনার গোল আর সব টুল। ট্যাব বাছুন বা টুল সার্চ করুন। |
| Goal page | One goal: steps, plan, where it goes, SMART and SWOT, status. | একটা গোল: স্টেপ, প্ল্যান, কোথায় যায়, SMART ও SWOT, স্ট্যাটাস। |
| Review | Look back by week, month or report. Not enough data stays "unknown". | সপ্তাহ, মাস বা রিপোর্টে পেছনে তাকান। ডাটা কম হলে "অজানা" থাকে। |
| Plan tools | Your own lists. Tap Add to open the form. Nothing leaves this phone. | আপনার নিজের লিস্ট। Add চাপলে ফর্ম খোলে। কিছু ফোনের বাইরে যায় না। |
| Diary | Your details and next step. Fill only what you want. | আপনার তথ্য আর পরের ধাপ। যা ইচ্ছা শুধু তা ভরুন। |
| Habits | Tick today. Open a habit for chart, goals and reminder. | আজকের টিক দিন। চার্ট, গোল ও রিমাইন্ডারের জন্য হ্যাবিট খুলুন। |
| Stuck | Answer Yes, No or Not sure. You get one small step. | Yes, No বা Not sure বলুন। একটা ছোট স্টেপ পাবেন। |
| Focus | Pick a task and a time. Pause or stop any time. | একটা কাজ আর সময় বাছুন। যেকোনো সময় পজ বা স্টপ করুন। |
| Reward | Your latest picture and small wins. No ranks. | আপনার সর্বশেষ ছবি আর ছোট জয়। কোনো র‍্যাংক নেই। |
Profile sheet (Diary): list "Filled: name, city" and "Unknown: income, goals" with no percent; unknown stays unknown, never 0.

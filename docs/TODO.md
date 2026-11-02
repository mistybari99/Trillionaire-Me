# Trillionaire Me — Master To-Do (saved 26 Oct 2026)

How to use: owner says "শুরু করো" (or "start") and the builder runs Block 1 → Block 6 in order, one agent at a time. After each block: tsc, vitest, build, e2e all green; revert evidence/ churn; DECISIONS_LOG entry; push; short report. Owner-only items are in Part B and never block the builder.

## Part A — Builder tasks (in order)

### Block 1 — Finish design items
- [x] SMART funnel visual (S-M-A-R-T -> committed goal), replaces text-only guide; text equivalent; EN/BN/mix.
- [x] Home cards: add Tasks and Goal-steps cards; Saving card only from the user's own entries; Unknown when empty.
- [x] Check new looks at 360px, dark mode, reduced motion; run tools/screenshots.mjs and fix layout faults (all 4 Design versions: Light Futuristic, Ink & Paper, Emerald Obsidian, Classic).
- [ ] Check Goal Universe, overall progress card, language icon in rendered UI.

### Block 2 — Real-data ready forms (D-B approved, device only)
- [x] Risk register form (real namespace, consent tick, clear-all covers it).
- [x] Venture form, Team form, North Star form.
- [x] Flashcards and prayer-place forms.
- [x] Each: demo/real guards, Unknown not 0, no mixing in totals, tests.

### Block 3 — Deen features (private, no score, no scripture text)
- [x] Verify exact Bangladesh prayer times logic (Asia/Dhaka) and add method/adjustment setting (Karachi default, Hanafi Asr option, per-prayer minute offset, "verify with your local timetable", Unknown when no location); owner checks against official timetable (Part B).
- [x] Notifications per prayer (opt-in, OFF by default, neutral lock-screen text, clear unsupported/blocked messages); azan sound toggle OFF by default with vibrate fallback (audio file must be supplied by owner, Part B); one-tap prayer mark with undo.
- [x] Deen items = plans and reminders only (D-D open).

### Block 4 — Overall progress polish (owner rules, 26 Oct)
- [x] Goal creation: manual % or auto; auto = equal or by task size.
- [x] Prompt "more tasks left for this aim?" (overall card and each goal page); % recalculates; neutral wording, never red.
- [x] Per-goal progress stays; no tasks => Unknown.

### Block 5 — Knowledge and advice
- [x] Azan system: audio-ready slot public/audio/azan.mp3 (+ azan-fajr.mp3), presence check, volume, preview, offline cache, docs/azan.md (owner supplies the file later).
- [x] Rule-based advice cards from built-in knowledge (reason always shown, no invented amounts).
- [x] Offline knowledge base wider coverage; mark source/kind/reviewer pending.
- [x] Port-ready slot for online suggestions (off until owner approves D-C cost/provider).
- [x] Free-cloud sync port option only (off; text stays "Saved on this device").

### Block 6 — Docs, evidence, quality
- [x] Fix docs/design/m-list-status.md (M19 etc.).
- [x] Refresh Register evidence (v2_1 copy; never edit original v2_0) and traceability.
- [x] Re-run owner-demand audit (docs/design/owner-demand-audit.md) and update counts.
- [x] DECISIONS_LOG: add language-icon entry.
- [x] Accessibility pass (contrast, focus, 44px, reduced motion) over all 4 looks.
- [x] Security review (secrets excluded from backups/exports; keys device-only).

### Block 7 — Builder run 31 Oct 2026
- [x] Step 1: Detailed/Compact chooser on 10 more screens (log, goals, risks, ventures, team, history, cards, library, rules, wheel). Compact = denser rows, intro hidden; same records.
- [x] Step 2: Weekly review screen `#/journey/week` (`src/core/weeklyReview.ts`, `tests/weekly_review.test.ts`): own entries, last 7 days, Unknown when empty, neutral wording.
- [x] Step 3: bundled inline-SVG 3D-style logo (32 px) on the Today header; static, no network, nothing moves so reduced motion needs no fallback (`tests/logo3d.test.ts`).
- [x] Step 4a (TM-REQ-015): infeasible-plan flag `feasibility()` in `src/core/planner.ts`, notice on the plan screen, 20-case test, mapped to TM-TST-015.
- [x] Step 4b (TM-REQ-005): `runwayFor()` returns baseline needed without an own Asset line; prompt on Money; TM-TST-005 mapped as Partial (only runway exists).
- [x] Step 4c (TM-REQ-040): `src/core/override.ts` (`placeByHand`, confirmation required, log entry); core only, no screen yet; TM-TST-040 stays Partial.
- [x] Step 4d (TM-REQ-007): `freshnessOf()` + stale badge on saved Wikipedia option cards (30 days); TM-TST-007 mapped Partial.
- [x] Step 4e (TM-REQ-009): goal status active/paused/retired (`src/core/goalStatus.ts`, goal page buttons), calm date reminders on Today for active goals only; TM-TST-009 mapped.
- [x] Step 5 (TM-REQ-153): CSV export on More > Data (`src/core/csv.ts`): demo and real in separate files, real needs the consent tick, no secrets; TM-TST-153 mapped Partial (no CSV import, PDF or dictionary).

### Block 8 — Builder run 1 Nov 2026
- [x] Step 1: Register v2_1 evidence copy regenerated (47 rows linked) + Change Log line; v2_0 untouched.
- [x] Step 2: Decision helper `#/journey/decide` and ownership check `#/journey/mine` (`src/core/decisions.ts`, `src/ui/decisionUi.ts`, `tests/decisions.test.ts`): rule-based, reason shown, own open tasks only, nothing saved.
- [x] Step 3: Four legs `#/journey/legs` and Leak audit `#/journey/leak` (`src/core/legs.ts`, `src/ui/legsUi.ts`, `tests/legs.test.ts`): own entries only, Unknown when missing, personal and business kept apart.
- [x] Step 4: Goal funnel hero on Journey and horizon arc on Horizon (`src/ui/horizonArt.ts`, `funnelBands`/`arcMarker` in `src/core/horizon.ts`, `tests/horizon_art.test.ts`): own counts, "Not set" when unknown, text equivalent, reduced-motion safe.
- [x] Step 5: Habit long view (31 days / 12 weeks / 12 months) on Habits (`habitRange` in `src/core/chartData.ts`, `habitGridTracker` in `src/ui/charts.ts`, `tests/habit_grid.test.ts`): planned days only, nothing before the habit existed, text equivalent.
- [x] Step 6: CSV import on More > Data (`src/core/csvImport.ts`, `src/ui/importUi.ts`, `tests/csv_import.test.ts`): file decides demo or real, real needs the consent tick, whole file validated, secrets/worship/health refused, existing ids skipped, undo of last import. Data dictionary page `#/more/dictionary`. TM-TST-153 stays Partial (no PDF).
- [ ] Step 7 (TM-REQ-040 override screen): not built on purpose. A real hard block (prayer) needs a block length the documents do not give, and a hand-placed step needs a stored placement (new task field + migration). Reasons and next step in DECISIONS_LOG. Core `src/core/override.ts` unchanged.
- [x] Audit and DECISIONS_LOG updated; e2e 0 FAIL; Register v2_1 regenerated again at the end.

### Block 9 — Data safety (real data), 1 Nov 2026
- [x] Step 1: visible save-failed banner with retry and one-tap backup file (`SaveMonitor` in `src/core/persist.ts`, `src/ui/saveBanner.ts`, `tests/save_failed.test.ts`).
- [x] Step 2: `navigator.storage.persist()` after the tick (`src/core/storageStatus.ts`, `src/ui/storageCard.ts`, `tests/storage_status.test.ts`); status and usage on More > Data, Unknown when unsupported.
- [x] Step 3: weekly backup reminder is ON by default once real data exists (`reminderEnabled` in `src/core/snapshots.ts`); own on/off always wins; snooze and "turn off" on the card; prayer alerts stay off by default.
- [x] Step 4: optional PIN app lock, off by default (`src/core/appLock.ts`, `src/ui/lockUi.ts`, `tests/app_lock.test.ts`): PBKDF2 salted hash under `tm:secret:` (never in backups), lock on hide/after N min, forgot-PIN removes only the PIN after a 15 min wait + tick, data never wiped.
- [x] Step 5: at-rest encryption design note only (`docs/design/at-rest-encryption.md`); nothing built; waits for the owner (recommended default: not yet).
- [x] Step 6: own options and saved search results follow the active namespace (`src/core/savedLists.ts`, one-time repair `repairListNamespaces`, `tests/lists_namespace.test.ts`).
- [x] Step 7: record migration `src/core/migrate.ts` (steps table, copy saved first via snapshot, failure keeps original), fixtures v0/v1, schema fingerprint bump check (`tests/schema_migration.test.ts`).
- [x] End: e2e, DECISIONS_LOG entries with undo steps.

### Block 10 — Audit plan, builder run 1 Nov 2026
- [x] Step 1: stale docs fixed (README, capability notes, PLAN, audit text) and Register v2_1 copy regenerated (Decisions D-B/D-E, Start Here, Summary note); v2_0 untouched.
- [x] Step 2: 3-screen first-run onboarding (`src/core/onboarding.ts`, `src/ui/onboardUi.ts`, route `#/start`, `tests/onboarding.test.ts`, e2e ONB-*): choice (1/3), one goal, one small step + first win; skippable; local time-to-first-step kept on the device only.
- [x] Step 3: owner phone-test checklist (`docs/owner/PHONE_TEST_CHECKLIST.md`, 10 steps + report template) and 5-user usability kit (`docs/owner/USABILITY_KIT.md`). Owner runs them; nothing marked Verified until he does.
- [x] Step 4: bundle split: main chunk 713 kB to 339 kB (i18n 195 kB, library 60 kB, dexie 96 kB, 4 lazy screen chunks, content packs already lazy); no chunk over 500 kB; all 52 files precached; e2e offline opens the lazy screens (`src/ui/lazy.ts`, `lazyScreens.ts`, `adapters/lazyDexie.ts`, `tests/lazy_screens.test.ts`). Not split: Today/Journey/Data cards (they sit inside `screens.ts`).
- [x] Step 5: Bangladesh starter pack DRAFT `public/content/pack-009.json` (18 entries, generated by `tools/make_pack009.py`, reviewer pending, no rates or prices, `tests/bd_pack.test.ts`) and halal-check flags DRAFT (`src/library/halalFlags.ts`, page `#/more/halal-flags`, lazy chunk): 12 questions in 6 groups, banner "Not a fatwa. Ask a qualified person."
- [x] Step 6: Bangla review sheet `docs/owner/BANGLA_REVIEW_SHEET.md` (1,329 strings in 10 screen groups) generated by `node tools/bangla_review_sheet.mjs` from `src/i18n/packs.ts`. TM-TST-161 stays Partial until a named reviewer signs. Catalog, glossary and library text are not in it yet.
- [x] End: e2e 61 PASS 0 FAIL, DECISIONS_LOG entries with undo steps, Register v2_1 copy regenerated.

### Block 11 — Settings redesign (docs/design/settings-final-decision.md), 2 Nov 2026
- [x] PR1 Restore safety: `src/core/restore.ts` (planRestore, restoreBackupAtomic, goBack), `replaceNamespace` (no clear-before-write, rollback), 7-day "Before restore" copy outside keep-N, preview/PIN re-ask/numbered confirm/Go back for backup file, encrypted backup and snapshots (`src/ui/restoreUi.ts`), "Contains:" labels. Tests `tests/restore_safety.test.ts`, `tests/restore_ui.test.ts`.
- [x] PR2 Settings shell: registry `src/ui/settingsRegistry.ts` (29 rows, 9 guide links), screen `src/ui/settingsUi.ts`, route `#/settings[/cat[/row]]`, 5th tab "Settings", quick card (language/theme/text size), computed status strip, 8 category cards, Guides & info, compact DEMO banner on `/settings*`, "← More" crumbs now go to Settings. Old `/more*` routes untouched (redirects come in PR4). Tests `tests/settings_shell.test.ts` (registry owns every prefs field and storage key; link check).
- [x] PR3c (Delete data part): `#/settings/delete` (`src/ui/deleteUi.ts`, `src/core/typedConfirm.ts`): live counts, typed word delete/DELETE/ডিলিট/ডিলেট (NFC, trim, case fold) + "I cannot type this" fallback, PIN again, backup link, two-step demo delete with "Save a demo copy first". Old clear buttons removed from `/more/data` (it links here). 5 test files migrated. Test `tests/delete_page.test.ts`. Not yet in 3c: mode switch and Start-real page (still on `/more/data`).
- [x] PR3b Privacy & lock: single `consentGate()` and single `grantRealConsent()` (`src/ui/consentGate.ts`; first-run/Start-real keep their own tick text but call it), page `#/settings/privacy` (`src/ui/privacyUi.ts`): live "private by default" read-out, Withdraw (revoke only), lock-screen details (Show asks first), app lock + forgot-PIN help moved here from `/more` and `/more/data`; Today "Real data is paused" card; in-app text now points to Settings. Test `tests/privacy_page.test.ts`.
- [x] PR3d Backup & export: `#/settings/backup` (`src/ui/backupUi.ts`): status lines (last file, real-data backup), save (JSON "Contains: demo only", encrypted "Contains: demo and real" + "I wrote it down" tick), ONE reminder switch with computed default + reason (Today card keeps Later + link, no second on/off), storage status, snapshots + CSV folds, "settings not in backup" note; Restore on its own page `#/settings/backup/restore`. All save paths call `markBackupFile`. New additive keys `tm:ui:realBackupAt`. Test `tests/backup_page.test.ts`; 6 test files migrated.
- [x] PR3c second part: `#/settings/data` (`src/ui/dataUi.ts`: mode switch, counts, consent gate, links) and full page `#/settings/data/start-real` (demo copy first, explicit tick, confirm; banner and ask card open it). `/more/data` renders the same page until PR4. Test `tests/data_page.test.ts`.
- [x] PR3g Connections: `#/settings/connections` (lazy chunk), computed "N of 4 on. Nothing leaves this phone." line, fixed order Approve, Turn on, Key, Withdraw, equal weight. Test `tests/connections_page.test.ts`.
- [x] PR3f Plan & progress: `#/settings/plan` (`src/ui/planSettings.ts`): plan mode, progress weighting, stage names, four rules (one implementation `ruleRows`); Today/Journey/Diary plan show a chip + link, Today shows an "end the pause" chip, `/stuck` says it can be changed back in Settings. Test `tests/plan_settings.test.ts`; 3 tests migrated.
- [x] PR3a Look & screens: `#/settings/look` (`src/ui/lookUi.ts`): design version, master Detailed/Compact (additive `tm:ui:view:_default`, never writes the 18 keys, "Different on N screens" + Follow master, on-screen bar equal to master clears override), link rows for horizon/universe/habit grid (habit grid now through `prefs.habitGrid`), Reduce motion (`tm:ui:reduceMotion`), Reset look & layout (look and view keys only). Test `tests/look_page.test.ts`.
- [x] PR3e Prayer & alerts: `#/settings/prayer` (`src/ui/prayerSettingsUi.ts`): method/Asr/offsets, place (namespace tag, real place needs the gate), alerts, phone notification permission line; Deen keeps times + fast card + one link row. Test `tests/prayer_page.test.ts`; prayer/register tests migrated.
- [x] PR3h Guides & info: `#/settings/about` lists Topics, Ready systems, Cards, Capability status, Field guide, Glossary, Data dictionary, Halal-check flags, Safety & limits + the welcome replay (deletes nothing).
- [x] PR4 Redirects: `REDIRECTS` in `render()` (`/more`, `/more/data`, `/more/connections`, `/more/rules`) with `history.replaceState`; `/more` screen, old Display cards and `rulesScreen` removed; ~30 test files and `tools/e2e.mjs` / `tools/screenshots.mjs` migrated; orphan keys (`nav.more`, `more.title`, ...) removed; one-time dismissible "what moved" card on Today (`tm:ui:movedNote`, 14 days). Test `tests/settings_redirects.test.ts` (includes a link check that no source or test still points at a removed address).
- [x] PR5 Search: magnifier on every Settings page (`src/ui/settingsSearch.ts`), static EN/BN/mix registry search + Bangla keywords (`SEARCH_BN`), results show category and link to the row, last 3 opened results remembered (`tm:ui:settingsRecent`, convenience). Test `tests/settings_search.test.ts` (every entry findable in 3 languages, every hit a real route, no network).
- [x] PR6 Polish: focus to h1 + page title on route change, translated aria-label, Settings en/bn/mix parity + wording test (`tests/settings_a11y_i18n.test.ts`), e2e SET-OFFLINE / SET-200 / SET-SEARCH (e2e 64 PASS, 0 FAIL), 12 Settings routes x 2 languages screenshotted at 360 px (no overflow), Register mapping (traceability + TM-REQ-186..189 Draft), DECISIONS_LOG entries with undo steps.

### Block 12 — Build completeness (owner order 2 Nov 2026)
- [x] Step 1: capability card = build pipeline (six boxes) + separate data status; field-reach and link-check tests; dead code removed (goals, override, sync, onlineAdvice); `#/more/topics` fixed.
- [x] Step 2: M16 KPI targets: `#/journey/kpi` (`src/core/kpi.ts`, `src/ui/kpiUi.ts`, `kpiScreen`), shown on weekly review, 90-day review, report, Today, Journey; `tests/kpi.test.ts`, e2e cold-start check.
- [x] Step 3: M09 venture value and income/expense: value + edit on `#/diary/ventures`, venture-linked money lines (`links.venture`), Money venture picker, portfolio card on page/Today/report (`src/core/ventures.ts`, `src/ui/ventureCard.ts`, `tests/venture_value.test.ts`). Unit economics still missing.
- [x] Step 4: M12 full reality-changed loop: `#/journey/reality` (event, impact, 3 options, old/new plan-diff, approval, plan versions, Resume gently), history, Today, report; `src/core/realityLoop.ts`, `src/ui/realityUi.ts`, `tests/reality_loop.test.ts`; schema additive (catalog 6).
- [x] Step 5: M03 North Star "where I am now" (typed, or from Money net worth / ventures), progress, steps passed, metric weights, one weighted overall (page, Journey, Today, report), edit form; `src/core/northStar.ts`, `src/ui/northStarCard.ts`, `tests/north_star.test.ts`; schema additive (catalog 7).
- [x] Step 6: M10 steps tied to roles, hand-over (plan, mark done, delegated steps leave the schedule), hiring step, gap analysis (team page, Today, report); `src/core/team.ts`, `src/ui/teamCard.ts`, `tests/team_handover.test.ts`; schema additive (catalog 8).
- [x] Step 7: M15 review-date trigger: due/soon tags, Today and report cards, stop-rule question ("Not yet" sets next date; "It has happened" starts a reality event); `src/core/risk.ts`, `src/ui/riskCard.ts`, `tests/risk_review.test.ts`; no schema change.
- [x] Step 8: M06 goal tree (level, parent, branch progress, goal page), goal measure, step edit, habit days a week, SWOT literals, skill example and resource shown back; `src/core/goalTree.ts`, `src/ui/lifeUi.ts`, `tests/goal_tree.test.ts`; no schema change. Still open (no approval needed): `constraint.hours_per_week`, profile birth year / name / time zone readers, M02 extra question sets. Needs approval: Deen forms (D-D), health track.
- [x] Run 2, step 9 (M20): Save as PDF for report, plan and hand-over through the phone's print window (`src/core/printDoc.ts`, `src/ui/printUi.ts`, `tests/print_pdf.test.ts`, e2e PDF-PRINT); no library, no network.
- [x] Run 2, step 10 (M05): stage rules page, measurable exit conditions B-H read from own records, review date card on Today, report, stage panel (`src/core/stageGates.ts`, `src/ui/gateCard.ts`, `tests/stage_gates.test.ts`); schema additive (catalog 8).
- [x] Run 2, step 11 (M16): monthly review `#/journey/month`, money and risk blocks in weekly, monthly and 90-day reviews, assumptions check (`src/core/monthlyReview.ts`, `src/ui/monthUi.ts`, `tests/month_review.test.ts`); no schema change.

## Part B — Owner-only tasks
- [ ] Phone offline test: open online once, visit all pages, airplane mode, reopen (O1).
- [ ] Lock-screen privacy check on a real device (O8).
- [ ] Verify prayer times against the official Bangladesh timetable.
- [ ] Bangla reviewer sign-off (TM-TST-161).
- [ ] Look at the 4 Design versions on the phone (More > Display) and say which to keep.
- [ ] Approvals still closed: D-C (AI / online suggestions / cost), cloud sync, Google/Supabase keys, D-D (scripture/licensed content), any paid service.

## Done so far (reference)
Content packs (21 topics), Connections ports, language menu, Design version chooser + 4 looks, overall progress %, Goal Universe, Home money cards, Next best action, reward animation, bundled logo, local auto-snapshots, full offline cache, prayer times, ready systems, charts, encrypted backup, demo/real switch.

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

## Part B — Owner-only tasks
- [ ] Phone offline test: open online once, visit all pages, airplane mode, reopen (O1).
- [ ] Lock-screen privacy check on a real device (O8).
- [ ] Verify prayer times against the official Bangladesh timetable.
- [ ] Bangla reviewer sign-off (TM-TST-161).
- [ ] Look at the 4 Design versions on the phone (More > Display) and say which to keep.
- [ ] Approvals still closed: D-C (AI / online suggestions / cost), cloud sync, Google/Supabase keys, D-D (scripture/licensed content), any paid service.

## Done so far (reference)
Content packs (21 topics), Connections ports, language menu, Design version chooser + 4 looks, overall progress %, Goal Universe, Home money cards, Next best action, reward animation, bundled logo, local auto-snapshots, full offline cache, prayer times, ready systems, charts, encrypted backup, demo/real switch.

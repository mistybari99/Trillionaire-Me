# Trillionaire Me — Master Roadmap (rebuilt 24 Oct 2026)

Replaces the living plan in `docs/PLAN.md` for sequencing. Source order stays: Spec > Register > Brief > Preview (CLAUDE.md §1).
Status words: **Done** (built + tested) · **Next** (decided, build now) · **Later** (approved idea, not now) · **Declined** (we will not build; reason kept) · **Owner** (only the owner can do it).

---

## 1. Where we are (evidence: 162 unit tests passing, TypeScript clean)

| Area | Status | Notes |
|---|---|---|
| Core rules: scheduler, goal tree, finance maths, stages, stuck flow, capture, notifications, focus timer, habits, flashcards, reward picture | Done | Pure core, no UI imports |
| Data: IndexedDB store, demo/real guard, backup/restore, field-level sync rules | Done | Real-data namespace stays closed (D-B) |
| Screens: Today, Journey + log + report, Time & tasks, Money, Deen (private), Diary, Capture, Stuck, Topics library, Reward art, Focus, Habits, Cards, Glossary, Data | Done | 24 routes |
| Bilingual EN/BN with common English words kept | Done | Parity test with allowlist |
| Daily inspiration card (offline, bilingual, daily change) | Done | L-28; online quote source still open |
| Wikipedia search cards on 5 intake fields | Done | No key needed |
| Install icons, offline shell, service worker | Done (G1/G2 work) | Real-phone install test still Owner |
| Visual reference batches 1–9 | Notes done | Build list in §3 below |

## 2. Open items from earlier gates (still owed)

| # | Item | Gate | Who |
|---|---|---|---|
| O1 | Real-phone airplane-mode test | G2 | Owner |
| O2 | Bangla glossary native review (TM-TST-161) | G1 | Owner (reviewer) |
| O3 | Usability sessions | G1 | Owner |
| O4 | Hosting account (Cloudflare Pages) step | §8 | Owner |
| O5 | Assessment scoring, path fit + opportunity library | G3 | Builder · **Done** (tests/o5_assessment_fit.test.ts; see DECISIONS_LOG O5). Path list is a draft (যাচাই হয়নি) |
| O6 | Reality-changed loop, 90-day review, editable stage templates | G3 | Builder · **Done** (tests/o6_reality_review_templates.test.ts; see DECISIONS_LOG O6) |
| O7 | Own-options list, saved offline search list, more screens | G4 | Builder · **Done** (was partly done): own options + saved offline search list (tests/o7_own_saved_lists.test.ts; see DECISIONS_LOG O7). "More screens": checked, none missing (all 5 suggestable intake fields already have own options and the saved list) |
| O8 | Notification lock-screen privacy settings (verify on device) | G2 | Builder · **Done** in code (per-category "Show details" in More → Lock-screen details; neutral text en/bn/mix; tests/o8_notify_privacy.test.ts; see DECISIONS_LOG O8). **Owner-only, still open:** on-device lock-screen check (TM-TST-155 device part) |
| O9 | Evidence update in Register from real test runs (only where tests pass) | all | Builder |

## 3. New ideas from visual batches 1–9 — decision for each

### BUILD (approved by owner's feedback)
| # | Idea | Where it lands | Batch |
|---|---|---|---|
| B1 | Motivation / Discipline board: daily card, bilingual, premium look | Today + Inspiration page | 8, 9 |
| B2 | Horizon view: today → month → year marker and arc (one goal, many levels) | Journey | 8, 9 |
| B3 | "My why" + success criteria per goal/challenge | Goal detail | 1, 6 |
| B4 | Template chooser per dashboard (same data, different view) | Settings per screen | 1, 5 |
| B5 | Micro-animations: step done (arrows draw, star appears, stair step lights) — reduced-motion respected | Journey, Reward | 2, 8, 9 |
| B6 | "Next step" highlight (stepping-stone style) | Today | 8 |
| B7 | Two-path reflection card (fun-now vs struggle-now) and "effort timing" tip | Stuck / Topics | 9 |
| B8 | "Where my time goes" funnel (time → distractions → goals) | Stuck: diagnose step | 9 |
| B9 | Plan flow diagram (time + tools + skills → plan → goal) without AI | Plan | 9 |
| B10 | Word chain "what I learned" | Journey log | 9 |
| B11 | Focus tip "one target at a time" + converging micro-animation | Focus | 9 |

### LATER (approved idea, waits for an earlier item or owner input)
| # | Idea | Why later |
|---|---|---|
| L1 | Online daily quote (auto-change when online) | Needs external source → owner approval (§4 rule 2/8) |
| L2 | Background sounds, timer presets sheet, voice | Needs licensed audio assets; no external files without approval |
| L3 | Share card / share screen | Privacy review first (G7) |
| L4 | Templates library beyond chooser | After B4 is used in practice |
| L5 | Staff/customer viewing edition | G8, consent + legal review |
| L6 | Google search option | Needs key → owner approval |
| L7 | AI plan help | Needs D-C approval |

### DECLINED (not building — reason recorded)
| # | Idea | Reason |
|---|---|---|
| X1 | Clinical self-assessment tests (depression, anxiety, PTSD, bipolar, etc.) | Medical scoring and labels could harm; out of product purpose; needs clinical review we cannot give |
| X2 | AI coaches / AI therapist chat | D-C not approved; safety risk without human review |
| X3 | Streak freeze / streak counters | Conflicts with no-streak rule (CLAUDE §6) |
| X4 | Relationship, family and personality scores | Personal-data heavy, grades people; no real-data approval |
| X5 | Feed-style "motivation video" stream | Off-purpose; we use one card a day instead |

## 4. Sequenced build plan (each step ends with tests + Register evidence)

| Sprint | Build | Acceptance (proof) |
|---|---|---|
| R1 (now) | B1 premium motivation/discipline board; B6 next-step highlight | unit tests for daily pick, copy guard; e2e check Today shows card |
| R2 | B2 horizon view; B3 my-why + success criteria fields | catalog fields versioned; journey renders horizon levels; validator tests |
| R3 | B4 template chooser per screen (setting stored in prefs) | tests per template same data; prefs migration note |
| R4 | B5 micro-animations + reduced-motion; B11 focus tip | visual check via screenshot; `prefers-reduced-motion` test |
| R5 | B7, B8, B10 Stuck + log additions | calm copy guard (no red, no grades) tests |
| R6 | B9 plan flow diagram | renders from plan data; unknown values shown as unknown |
| R7 | O5–O7 gate items (G3/G4 open work) | Register rows updated only with passing tests |
| R8 | Owner-only checks (O1, O2, O4, O8) | Owner reports result; builder logs it |

Each sprint = one PR (draft), small commits, DECISIONS_LOG entry for any choice.

## 5. Owner needs to do (only these)
1. Real-phone airplane-mode install test (O1).
2. Bangla glossary review (O2).
3. Hosting account step when ready (O4).
4. Approve or refuse: online quote source (L1), Google search key (L6), AI plan help (L7), real data (D-B). Default if no answer: stay offline/no key/no AI.

## 6. Guardrails (apply to every item)
- No streaks, ranks, grades, scores or shame copy. Missed goals never red.
- Unknown ≠ 0 in every number.
- No invented money or return figures.
- Demo data only until D-B is approved.
- Deen content private, unscored, no scripture text until D-D.
- Nothing published or connected without the owner's account step.
- Visual ideas: our own design; no third-party brand marks, figures or copied frames.

## 7. Change log
- 24 Oct 2026: roadmap rebuilt from PLAN.md + visual batches 1–9; status verified against 162 passing tests.
- 24 Oct 2026: O8 built in code (lock-screen privacy per category). On-device check stays Owner-only. O9: traceability extended to more feature test files (see docs/register/EVIDENCE_REFRESH.md).
- 24 Oct 2026 (early-plan pass): early items checked in `docs/design/early-plan-status.md`. Built: M11 background cache label, M15 risks, M09 ventures, M10 team roles, M12 plan history, M03 North Star ladder, M06 "do this after", 90-day cash flow, M13 fasting mark, online/offline badge fix. Skipped items and owner needs listed there (§7, §9).

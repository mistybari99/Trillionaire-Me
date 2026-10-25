# Early plan status (before M11) — built / partial / missing, with evidence

Date: 24 Oct 2026 · Branch: `ccr-8b686ba2-vitt45`
Scope: the first plan items: G0–G3 gate deliverables (Spec §13, G1 Brief §1–§3), the first owner decisions (CLAUDE §2, D-A…D-E), the owner additions (CLAUDE §8), ROADMAP §2 (O1–O9) and §3 (B1–B11), and M-list modules M01–M10.

"Start" = status when this pass began. "Now" = after this pass. Evidence paths are relative to the repo root.

## 1. Owner decisions and additions

| # | Item | Source | Start | Now | Evidence | Note |
|---|---|---|---|---|---|---|
| D1 | PWA-first stack (D-A) | CLAUDE §2 | Built | Built | `docs/design/pwa-vs-native.md`, `public/manifest.webmanifest` | Device parts are Owner (O1) |
| D2 | "Ink & Paper" look, phone first (D-E) | CLAUDE §2 | Built | Built | `src/ui/styles.css`, `tests/a11y.test.ts` | Contrast checked for every token pair |
| D3 | Bangla-first, EN / BN / Mix switch, common English words kept | CLAUDE §8 | Built | Built | `src/i18n/registry.ts`, `src/i18n/packs.ts`, `tests/i18n_modes.test.ts` | Mix is derived from Bangla |
| D4 | Latin digits in Bangla and Mix | Owner feedback | Built | Built | `src/i18n/digits.ts`, `tests/latin_digits.test.ts` | |
| D5 | Stage A–H (journey) and G0–G8 (build) names kept apart; Home shows ১/৮ | CLAUDE §2 | Built | Built | `src/demo/seed.ts`, `DECISIONS_LOG.md` L-03, L-04 | |
| D6 | Bangla glossary shipped as "যাচাই হয়নি" | CLAUDE §2, L-06 | Built | Built | `src/catalog/glossary.ts` | Native review is Owner (O2, TM-TST-161) |
| D7 | Fonts bundled, no network calls on device | CLAUDE §2, L-05 | Built | Built | `src/ui/styles.css` (font imports), `tools/e2e.mjs` (no third-party requests) | |
| D8 | Real-data namespace closed until D-B approved | CLAUDE §2, §4 | Built | Built (blocked by owner) | `src/core/store.ts`, `tools/e2e.mjs` TM-TST-143 | |
| D9 | No AI, no paid service, no external integration (D-C) | CLAUDE §2, §4 | Built | Built (blocked by owner) | M23 is "not built" in `src/modules/capability.ts` | |
| D10 | Deen: no score/rank/streak, private, no scripture text (D-D) | CLAUDE §2 | Built | Built (content blocked by owner) | `tests/g1.test.ts` (deen guard) | |
| D11 | Hosting: free static site, installable, offline after first visit | CLAUDE §8 | Partial | Built (guide) | `npm run build` → `dist/`; owner steps in `docs/design/in-app-search-and-hosting.md` | Account step is Owner (O4) |
| D12 | In-app search: 2–3 cards, Wikipedia first | CLAUDE §8, L-15 | Built | Built | `src/core/research.ts`, `src/adapters/wikipedia.ts` | See M11 for the owner's new rule |
| D13 | Google search via server function | CLAUDE §8 | Missing | Blocked (owner) | — | Needs key and daily cap approval |
| D14 | Database: IndexedDB on device; Supabase optional later | PLAN | Built (IndexedDB) | Built / Blocked (Supabase, D-B) | `src/adapters/dexie.ts`, `src/ui/state.ts` | |
| D15 | Personal edition first; staff/customer edition at G8 | CLAUDE §8 | Built (personal) | Built / Later | `src/schema/entities.ts` (personal defaults) | G8 needs owner approval |
| D16 | Visual reference batches: notes only, no reply | CLAUDE §9 | Built | Built | `docs/design/visual-references.md` (batches 1–9) | |

## 2. Gate G0

| # | Item | Start | Now | Evidence | Note |
|---|---|---|---|---|---|
| G0-1 | Spec and Register v2.0 frozen | Built | Built | `docs/spec/Trillionaire_Me_Canonical_Spec_v2_0.md`, `docs/register/Trillionaire_Me_Requirements_Register_v2_0.xlsx` | The owner's written "ok" is not in the repo. Owner to confirm. |

## 3. Gate G1 (Brief §1 deliverables)

| # | Item | Start | Now | Evidence | Note |
|---|---|---|---|---|---|
| G1-1 | App shell with module slots, navigation | Built | Built | `src/app.ts` (ROUTES), `tests/g1.test.ts` | |
| G1-2 | One-Focus Home (next 1–3 actions) | Built | Built | `src/ui/screens.ts` (`today`), `src/core/planner.ts` (`todaysActions`) | TM-REQ-171 |
| G1-3 | Field catalog, versioned, help + privacy + Bangla/English | Built | Built | `src/catalog/fields.ts` (`CATALOG_VERSION`), `src/catalog/validate.ts`, `evidence/catalog-report.json` | This pass added 10 fields (risk, team role, North Star) |
| G1-4 | Schema skeletons (profile, goals, venture, habits, finance, Deen, journey log) | Built | Built | `src/schema/entities.ts` | Three entities added this pass (additive) |
| G1-5 | Capability Status registry visible in UI | Built | Built | `src/modules/capability.ts`, `src/ui/screens.ts` (`status`), `docs/design/m-list-status.md` | |
| G1-6 | Label system FACT / ESTIMATE / INFERENCE / EXTERNAL / DEMO on every value | Partial | Partial | `src/core/types.ts`, `src/ui/components.ts` (`valueEl`) | Screens use only DEMO and INFERENCE. FACT, ESTIMATE, EXTERNAL need the real-data rule (D-B). Skipped, see §7 |
| G1-7 | Guided intake, completeness indicator, next-step guide | Built | Built | `src/ui/screens.ts` (`intake`, `diary`), `src/core/intake.ts` (`completeness`, `nextStep`) | TM-REQ-010, 067, 145 |
| G1-8 | Secret rejection in free text | Built | Built | `src/core/safety.ts` (`checkFreeText`, `detectSecret`), `tools/e2e.mjs` TM-TST-034 | |
| G1-9 | Advice-boundary and no-guarantee notes | Built | Built | `src/ui/components.ts` (`disclaimers`), `tests/copy_review.test.ts` | TM-REQ-004 |
| G1-10 | Accessibility baseline (contrast, focus, headings, 44 px targets) | Built | Built | `tests/a11y.test.ts`, `DECISIONS_LOG.md` (A11y) | |
| G1-11 | Empty-start test; demo cannot become real | Built | Built | `tools/e2e.mjs` TM-TST-143, `src/core/store.ts` | |
| G1-12 | Screenshot report at 360 px, Bangla and English | Built | Built | `evidence/screenshot-report.json`, `evidence/screenshots/`, `tools/screenshots.mjs` | |
| G1-13 | Bangla glossary and field-help library | Built | Built (review pending) | `src/catalog/glossary.ts` | Native review is Owner (O2) |
| G1-14 | Usability sessions (TM-TST-010, 067) | Missing | Owner | — | Owner task (O3) |
| G1-15 | Research images are conceptual, not evidence (TM-REQ-130) | Built | Built | `docs/design/visual-references.md` | |

## 4. Gate G2 (Android offline prototype)

| # | Item | Start | Now | Evidence | Note |
|---|---|---|---|---|---|
| G2-1 | Local database (IndexedDB via Dexie) | Built | Built | `src/adapters/dexie.ts`, `src/adapters/storeRepo.ts` | |
| G2-2 | App data written through to IndexedDB; old localStorage imported once | Built | Built | `src/core/persist.ts`, `src/ui/state.ts` (`initStorage`), `DECISIONS_LOG.md` L-13 | |
| G2-3 | Checksum backup and restore (demo data) | Built | Built | `src/core/backup.ts`, `tests/g2.test.ts` | |
| G2-4 | Operation queue and deterministic conflict rule | Partial | Partial | `src/core/sync.ts`, `tests/sync.test.ts` | Rules only. No sync target, which needs a server (Owner approval). Skipped, see §7 |
| G2-5 | Notifications with lock-screen privacy | Partial | Partial | `src/core/notify.ts`, `src/ui/prayerAlerts.ts`, `tests/o8_notify_privacy.test.ts` | Prayer alerts and privacy are built. Closed-app delivery needs a phone test (O1) |
| G2-6 | Installable manifest, PNG icons, offline shell | Built | Built | `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`, `public/sw.js` | Browser-verified; phone install is Owner |
| G2-7 | PWA vs native comparison note | Built | Built | `docs/design/pwa-vs-native.md` | Device items open |
| G2-8 | Real-phone airplane-mode run | Missing | Owner | — | Owner task (O1) |
| G2-9 | Interrupted sync, duplicate replay, clean-device restore | Partial | Partial | `tests/sync.test.ts`, `tests/g2.test.ts` | Rule tests exist; device runs are Owner |

## 5. Gate G3 (rule-based planner, AI-free ≈80%)

| # | Item | Start | Now | Evidence | Note |
|---|---|---|---|---|---|
| G3-1 | Planner: capacity, unknown ≠ 0, deterministic | Built | Built | `src/core/planner.ts` (`schedule`), `src/core/planInputs.ts`, `tests/g3.test.ts` | |
| G3-2 | Overload / minimum-week and pause modes | Built | Built | `src/ui/state.ts` (`PlanMode`), `src/core/planner.ts` | Modes only shrink the plan |
| G3-3 | Goal tree (Goal → sub-goal → task), no orphans | Built | Built | `src/core/goals.ts`, `DECISIONS_LOG.md` L-17 | |
| G3-4 | Task dependency ("do this after") | Missing | Built (basic) | `src/core/planner.ts`, `src/ui/screens.ts` (`planScreen`), `tests/m_dependency.test.ts` | One prerequisite per task. No graph view yet |
| G3-5 | Finance maths: net worth, monthly cash flow, runway | Built | Built | `src/core/finance.ts`, `tests/money.test.ts` | |
| G3-6 | 90-day cash-flow review (TM-REQ-023) | Partial | Built | `src/core/finance.ts` (`cashFlow90Days`), `src/ui/screens.ts` (`moneyScreen`), `tests/m_registers.test.ts` | Three months of monthly flows; one-off and yearly items counted, not converted |
| G3-7 | Stage rules, journey log, achievement | Built | Built | `src/core/stages.ts`, `src/ui/screens.ts` (`journeyLog`), `tests/stages.test.ts` | |
| G3-8 | Assessment scoring (internal level, no rank shown) | Built | Built | `src/core/assessment.ts`, `tests/o5_assessment_fit.test.ts` | O5 |
| G3-9 | Path fit and opportunity library | Built | Built | `src/core/assessment.ts` (`pathFit`), `src/library/paths.ts` | Path text is a draft (যাচাই হয়নি) |
| G3-10 | Reality-changed loop | Built | Built | `src/core/reality.ts`, `tests/o6_reality_review_templates.test.ts` | O6 |
| G3-11 | 90-day review | Built | Built | `src/core/review.ts`, `src/ui/screens.ts` (`reviewScreen`) | O6 |
| G3-12 | Editable stage templates | Built | Built | `src/core/stageTemplates.ts` | O6. Three templates |
| G3-13 | North Star measures and milestone ladder (M03) | Partial | Partial | `src/core/northStar.ts`, `src/ui/planScreens.ts` (`northStarScreen`), `tests/m_registers.test.ts` | Horizon view was built before. Several measures stay separate; no weighting |
| G3-14 | Venture / asset registry (M09) | Partial | Partial | `src/core/ventures.ts`, `src/ui/planScreens.ts` (`ventureScreen`), `src/catalog/fields.ts` | Name, stage, ownership (unknown stays unknown). No value maths |
| G3-15 | Team and delegation (M10) | Missing | Partial | `src/core/team.ts`, `src/ui/planScreens.ts` (`teamScreen`), `tests/m_screens_ui.test.ts` | Roles only; contact details refused. No handover or hiring |
| G3-16 | Risk and stop criteria (M15) | Missing | Built | `src/core/risk.ts`, `src/ui/planScreens.ts` (`riskScreen`), `tests/m_registers.test.ts` | Risk, likelihood (unknown allowed), stop rule, review date |
| G3-17 | Reality-changed and plan history (M12) | Partial | Partial | `src/core/planHistory.ts`, `src/ui/planScreens.ts` (`planHistoryScreen`) | History list added. No plan versions or diff |
| G3-18 | Deen tracking without content (M13) | Partial | Partial | `src/core/prayerLog.ts`, `src/core/fastLog.ts`, `src/core/prayer.ts`, `src/ui/screens.ts` (`deen`), `tests/prayer.test.ts`, `tests/fast_log.test.ts` | Prayer marks, prayer times and fasting marks built. Quran, zakat, giving not built. Prayer work arrived in commit f60c8b7 from another session; the M-list note had been out of date |
| G3-19 | Health and family entries (M14) | Partial | Partial | `src/catalog/fields.ts` (`profile.health_note`) | Field only. Entry screen skipped, see §7 |
| G3-20 | Visual component catalogue (TM-REQ-158) | Partial | Partial | `src/ui/diagram.ts`, `src/ui/rewardArt.ts`, `src/core/planFlow.ts` | Individual visuals exist. No catalogue. Later |
| G3-21 | Extensible fields and domains without rebuild (TM-REQ-154) | Built | Built | `src/schema/entities.ts`, `src/catalog/fields.ts`, `tests/g1.test.ts` | |
| G3-22 | Public-edition readiness (owner_id, templates) (TM-REQ-170) | Partial | Partial | `src/core/types.ts` (`ownerId`), `src/library/topics.ts` | G8 |
| G3-23 | Horizon view (B2) and template chooser (B4) | Built | Built | `src/core/horizon.ts`, `src/ui/state.ts` (`horizonView`), `tests/horizon.test.ts` | |

## 6. Roadmap items (ROADMAP §2 and §3)

| # | Item | Start | Now | Evidence | Note |
|---|---|---|---|---|---|
| O1 | Real-phone airplane-mode test | Owner | Owner | — | Owner |
| O2 | Bangla glossary review | Owner | Owner | — | Owner |
| O3 | Usability sessions | Owner | Owner | — | Owner |
| O4 | Hosting account step | Owner | Owner | `docs/design/in-app-search-and-hosting.md` (steps) | Owner |
| O5 | Assessment scoring, path fit, library | Built | Built | `tests/o5_assessment_fit.test.ts` | |
| O6 | Reality-changed loop, 90-day review, stage templates | Built | Built | `tests/o6_reality_review_templates.test.ts` | |
| O7 | Own options, saved offline search list | Built | Built | `src/core/savedLists.ts`, `tests/o7_own_saved_lists.test.ts` | Now saves on the first search (M11) |
| O8 | Lock-screen privacy per category | Built (code) | Built (code) | `src/core/notify.ts`, `tests/o8_notify_privacy.test.ts` | On-device check is Owner |
| O9 | Register updated from real test runs | Partial | Partial | `docs/register/EVIDENCE_REFRESH.md` | `tools/update_register.py` needs input files; the xlsx was not changed in this pass |
| B1 | Motivation / discipline daily card | Built | Built | `src/library/inspiration.ts`, `tests/inspiration.test.ts` | L-28 |
| B2 | Horizon view | Built | Built | `src/core/horizon.ts` | |
| B3 | "My why" and success criteria | Built | Built | `src/catalog/fields.ts` (`goal.why`, `goal.success`) | |
| B4 | Template chooser per screen | Built | Built | `src/ui/state.ts` (`horizonView`, `stageTemplate`) | |
| B5 | Micro-animations, reduced motion | Built | Built | `tests/r4_motion.test.ts` | |
| B6 | Next-step highlight | Built | Built | `src/ui/screens.ts` (`data-next-step`) | |
| B7 | Two-path reflection card | Built | Built | `src/ui/screens.ts` (`reflectionCards`), `tests/r5_stuck_log.test.ts` | |
| B8 | "Where my time goes" funnel | Built | Built | `src/core/stuck.ts`, `tests/stuck.test.ts` | |
| B9 | Plan flow diagram | Built | Built | `src/core/planFlow.ts`, `tests/b9_plan_flow.test.ts` | |
| B10 | Word chain on the journey log | Built | Built | `src/core/learning.ts`, `tests/r5_stuck_log.test.ts` | |
| B11 | Focus tip and converging motion | Built | Built | `src/i18n/packs.ts` (`focus.tip`) | |
| M-list | Modules M01–M10 | 7 built, 2 partial, 1 missing | 7 built, 3 partial | `docs/design/m-list-status.md`, `src/modules/evidence.ts` | M01, M02, M04–M08 built. M03 and M09 partial at start; M10 missing at start, partial now |

Module detail for M01–M10 (status at start → now):

| ID | Module | Start | Now | Evidence |
|---|---|---|---|---|
| M01 | Profile and consent | Built | Built | `src/ui/screens.ts` (`intake`) |
| M02 | Discover (assessment) | Built | Built | `src/core/assessment.ts` |
| M03 | North Star and ladder | Partial | Partial | `src/core/northStar.ts` (new), `src/core/horizon.ts` |
| M04 | Paths and opportunity library | Built | Built | `src/library/paths.ts` |
| M05 | Stages and journey log | Built | Built | `src/core/stages.ts` |
| M06 | Goals, tasks and habits | Built | Built | `src/core/planner.ts` (dependency added) |
| M07 | Resources and finance | Built | Built | `src/core/finance.ts` (90-day view added) |
| M08 | Time and capacity | Built | Built | `src/core/planner.ts` |
| M09 | Venture portfolio | Partial | Partial | `src/core/ventures.ts` (new screen) |
| M10 | Team and delegation | Missing | Partial | `src/core/team.ts` (new screen) |

## 7. Skipped (needs owner approval or a later gate)

| Item | Reason |
|---|---|
| M14 health and family entries | Health notes are sensitive. Needs the owner's privacy and safety decision (TM-REQ-017) and the G7 review before an entry screen. |
| G1-6 full label set (FACT / ESTIMATE / EXTERNAL) | Which label a user value gets depends on the real-data rule (D-B). Demo values stay DEMO. |
| G2-4 sync to a server | Needs a server or cloud target, which is outside the approved stack (D-B / cloud approval). |
| G2-5 closed-app notification delivery | Needs a real-phone test (O1) before it can be claimed. The code path exists (prayer alerts). |
| M19 automation rules | Gate G6. Waits for the owner's go for G6. |
| M23 AI layer | D-C not approved. |
| M24 larger template library | Needs native-reviewed content. Current drafts are marked যাচাই হয়নি. |
| G5 Deen content (Quran text, zakat rules, prayer-time method check) | D-D not approved; needs qualified review. |
| Google search (D13) | Needs a key and a daily cap approved by the owner. |
| TM-REQ-170 public edition | Gate G8, new owner approval. |
| Quran, zakat and giving trackers (M13) | Not built in this pass. Zakat rules are G5 content. Quran log is content-free and can be the next Deen item. |
| TM-REQ-158 visual catalogue, more M18 charts | Larger visual work. Next pass. |
| O9 Register (.xlsx) update | `tools/update_register.py` needs its input files; the xlsx was not edited. Next pass. |

## 8. What was built in this pass (priority order)

1. M11 (owner): label "Wikipedia (saved in background)"; first search saved on the phone; offline reuse; no search at start; consent text; M23 "internet" tag removed.
2. Online/offline badge: it used to re-render the whole screen (closing the Suggest panel and losing typed text). Now only the badge updates. Found by the e2e check.
3. M15 risk register with stop rule and review date.
4. M09 venture list (ownership unknown stays unknown).
5. M10 team roles (roles only, no names).
6. M12 plan history list.
7. M03 North Star measures and ladder.
8. M06 "do this after" task link in the planner.
9. TM-REQ-023 90-day cash flow.
10. M13 fasting day mark (content-free) and correction of the M13 status.
11. Owner hosting steps (no account created).
12. E2E check for the offline cache (M11-CACHE).

## 9. Owner needs to do (only these)
1. Airplane-mode test on the phone (O1).
2. Bangla review of the glossary (O2).
3. Hosting account when you decide (O4).

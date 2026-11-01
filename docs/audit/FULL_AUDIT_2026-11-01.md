# Trillionaire Me: Full Independent Audit

Date: 1 Nov 2026 · Branch: `ccr-8b686ba2-vitt45` · Audited commit: `ba586f1` (HEAD at the time) · Auditor: independent, read-only (no code, test, tool or existing doc was edited).

**Scope:** everything from the first Spec (22 Oct 2026) to today: 131 commits, 22 Oct to 1 Nov 2026.
**Not audited:** the builder's uncommitted work in the same checkout (`src/core/decisions.ts`, `src/ui/decisionUi.ts`, `tests/decisions.test.ts`, edits in `src/app.ts`, `src/i18n/packs.ts`, `src/ui/screens.ts`). All findings below are about committed code. I ran everything on a clean `git archive HEAD` copy, so the live checkout was not disturbed.

---

## 0. Summary (সারসংক্ষেপ)

**বাংলা:** অ্যাপটি এখন ফোনে চলার মতো অনেক বড় একটা শেল: ৪১টা স্ক্রিন, ১০২০টা টেস্ট পাস, অফলাইনে চলে, কোনো ডেটা ফোন থেকে বের হয় না (শুধু ইউজার ট্যাপ করলে Wikipedia খোঁজ)। কিন্তু আসল ফোনে একবারও টেস্ট হয়নি, কোনো আসল ইউজার ব্যবহার করেনি, বাংলা লেখা কেউ রিভিউ করেনি, আর দ্বীন ও AI অংশ প্রায় খালি। পুরো ভিশনের হিসাবে আমার অনুমান প্রায় ৪০%।

**English:**

| Item | Result |
|---|---|
| tsc (strict) | Clean |
| vitest | 1020 passed, 0 failed, 77 files (about 54 s) |
| vite build | OK. Main JS 632 kB (184 kB gzip), one chunk; whole build 2.3 MB, 45 files precached |
| Browser e2e (`tools/e2e.mjs`, headless Chromium) | 59 PASS, 0 FAIL; 0 third-party requests; 0 CSP violations |
| Overall completion | About **40%** of the full vision (Spec through G8). Range 17% to 80% depending on the yardstick; method in section 4 |
| Verified requirements | 15 of 180 Register rows Verified, 32 Partial, 133 with no evidence |
| Real-world validation | None: no real phone, no real user, no Bangla reviewer, no usability session |

**Top 5 risks:** (1) nothing is validated on a real phone or by a real user; (2) silent data loss is possible (write errors are swallowed, no persistent-storage request, snapshots live in the same database, backup reminder off); (3) real data is stored unencrypted with no app lock; (4) docs and Register have drifted from the code; (5) all content, Bangla text and prayer times are unreviewed and the Deen and Bangladesh parts are thin. Details in section 3.

---

## 1. What the owner asked for, from the beginning

**বাংলা:** মালিকের মূল চাওয়া: নিজের লক্ষ্য ("Trillionaire") ধাপে ধাপে ভাঙা, নিজেকে আগে চেনা (assessment), বাস্তব বদলালে প্ল্যান বদলানো কিন্তু লক্ষ্য ঠিক রাখা, দ্বীন ও আখিরাত সমান গুরুত্ব, ফোন আগে, AI ছাড়া ৮০% কাজ, ডায়েরির মতো সহজ, বাংলা ও ইংরেজি, প্রাইভেসি, পরে পাবলিক ভার্সন। পরে যোগ হয়েছে: ভিজ্যুয়াল রেফারেন্স ব্যাচ, ডিজাইন ভার্সন, প্রার্থনার সময়, আসল ডেটা (ফোনেই), এবং বাংলায় ইংরেজি কমন শব্দ রাখার নিয়ম।

### 1.1 Original asks (Spec v2.0 §1 to §3, Intent Register INT-01 to INT-36)

Sources: `docs/spec/Trillionaire_Me_Canonical_Spec_v2_0.md`, Register sheet "Intent Register" in `docs/register/Trillionaire_Me_Requirements_Register_v2_0.xlsx`.

| Theme | What the owner said | Origin |
|---|---|---|
| Goal and plan | People fall behind from unclear goals and no plan; wants a concrete plan, simple like a diary (INT-25). Goal in money terms ("Trillionaire"), broken down to start work (INT-27) | U, 22 Oct |
| Reality | Reality rarely follows the plan; keep the main target, change the path, keep consistency (INT-26) | U |
| Know yourself first | Full analysis of strengths and interests before the journey starts (INT-30). Business-neutral, any skill, matched to the assessment (INT-31) | U |
| Stage-gates | Gates should give self-satisfaction and inspiration; every element designed that way (INT-33) | U |
| Deen | Muslim identity: ibadah, prayer, akhirah, zakat, hajj, roza, dan (INT-06). A worldly trillion is pointless without akhirah (INT-07) | U |
| Platform | Phone first (Android), PC later (INT-34). PWA-first approved as D-A | U |
| AI | Cannot set up AI now; about 80% must work without AI (INT-35) | U |
| Tool first | Tool first, then profile, then data; fields explain themselves (INT-03, INT-04) | U |
| Research | On an update or exception: click, go online, 2 to 3 best options, save, customise (INT-05) | U |
| Scale | Start local, then national, then international (INT-01) | U |
| Public edition | Personal first; later anyone sets any goal and sees achievements (INT-29) | U |
| Images | Reference images are ideas, not to be copied (INT-32) | U |
| Safe data | No personal data now; demo data separate (INT-10) | U+B |
| Intent files | "Explain intent simply in an md file + a file of the user's exact words" (INT-08). **No such file exists in the repo** (not found under `docs/`). Possibly kept outside the repo; unverified |

The Register holds 172 rows (170 active). The v2_1 evidence copy holds 180 rows (8 appended later, none verified).

### 1.2 Decisions (CLAUDE.md §2, Register sheet "Decisions", `DECISIONS_LOG.md`)

| ID | Decision | State in code |
|---|---|---|
| D-A | PWA-first, strict TypeScript, Dexie | Done. PWA vs native comparison note exists; the real-phone test that could flip it is not done (`docs/design/pwa-vs-native.md`) |
| D-B | Real data on device only, per-device consent tick | Approved 25 Oct. Built: `src/core/consent.ts`, `src/core/dataMode.ts`, real-ready forms for goal, task, habit, money, risk, venture, team, North Star, cards, prayer place |
| D-C | AI provider and spend cap | Not approved. Ports exist and are OFF (`src/core/ports.ts`, `src/adapters/registry.ts`, `src/adapters/connectedStubs.ts`) |
| D-D | Scripture content | Not approved. No scripture text anywhere (guard test `tests/content_pack.test.ts`) |
| D-E | Look | Register says "Ink & Paper approved" (22 Oct). CLAUDE.md §2 says default is now Light / Colorful / Futuristic (25 Oct). Code follows CLAUDE.md (`src/ui/themes.ts`, e2e DESIGN-VER). Register not updated (see 3.5) |
| Other owner rules | Latin digits (L-digits), Mix language mode, Stage A to H vs G0 to G8, no streaks (L-22), demo is not permanent (25 Oct), language and loanword rules (26 Oct, 1 Nov), overall progress rules (26 Oct) | Done and tested |
| Declined | Clinical self-tests, AI coach, streak freeze, scoring of relationships, motivation feed (ROADMAP X1 to X5) | Correctly absent |

### 1.3 Timeline of what was built (from `git log`)

| Date | Work |
|---|---|
| 21 to 23 Oct | G1 safe shell and field catalog; charter; G2 slices (Dexie, backup, op-queue); in-app Wikipedia Suggest |
| 24 Oct (45 commits) | G3 planner, Money, Stages, Capture, Stuck, Topics library, reward picture; visual batches 1 to 9 noted; R1 to R6; O5 to O8; prayer times; early-plan pass |
| 25 Oct (13) | Content packs, real-data consent (D-B), ready systems and rules, real entry forms, first-run demo/real choice, owner demand audit |
| 26 Oct (38) | Template chooser, charts, encrypted backup, life wheel, SWOT/SMART, language menu, connections ports, 125 topic entries, four Design versions, Goal Universe, Home cards, logo, snapshots, precache, real-ready register forms, prayer methods |
| 31 Oct (25) | Alerts and azan slot, advice cards, accessibility pass, security review and CSP, Bangla loanword pass (1088 swaps), Register mapping (42 rows), audit re-run, weekly review, CSV export, five Register gaps |
| 1 Nov (1) | Register v2_1 evidence copy refreshed (47 rows linked) |

---

## 2. What has been built

**বাংলা:** ২৫টা মডিউলের মধ্যে কোডে ১৬টা "আছে", ৮টা "আংশিক", ১টা "নেই" (AI)। গেট হিসেবে G0 শেষ, G1 প্রায় শেষ, G2 ও G3 অনেকটা, G4 অর্ধেকের কম, G5 শুরুই হয়নি, G6 ও G8 বন্ধ আছে। নিচে প্রতিটার প্রমাণ ও সৎ স্ট্যাটাস।

Status words: **Built** (reachable screen + passing test), **Partial**, **Missing**, **Blocked-on-owner** (needs an owner approval or a human check).

Size: 9,690 lines in `src/`, 8,040 lines in `tests/`, 80 test files, 41 routes (`src/app.ts`), 8 content packs with 202 tips (`public/content/pack-001..008.json`), 6 ready systems (`src/library/systems/`), 10 opportunity paths (`src/library/paths.ts`), 15 inspiration lines (`src/library/inspiration.ts`).

### 2.1 Per module (M01 to M25; M25 "When stuck" was added by the builder)

Status in the app: `src/modules/capability.ts`. I re-checked each against code and tests.

| Module | My status | Evidence (files / tests) | Honest gap |
|---|---|---|---|
| M01 Profile and consent | Built | `src/ui/screens.ts` intake; `src/catalog/fields.ts` (518 lines, help and privacy class per field); `tests/g1.test.ts`, `tests/goal_form.test.ts`, e2e TM-TST-143 | Usability with a real person not run (TM-TST-066) |
| M02 Discover (assessment) | Built (basic) | `src/core/assessment.ts`, `src/ui/assessment.ts`; `tests/o5_assessment_fit.test.ts` | Answers are free text with keyword themes; shallow compared to Spec §3.1 (question sets, Strength/Interest/Gap map) |
| M03 North Star and ladder | Partial | `src/core/northStar.ts`, `src/core/horizon.ts`; `tests/horizon.test.ts`, `tests/m_registers.test.ts` | No multi-metric weighting; horizon is a list, no arc |
| M04 Paths and opportunity library | Partial | `src/library/paths.ts` (10 paths, no figures); `tests/o5_assessment_fit.test.ts` | Only 10 generic paths. No halal filter (MR-31), no local/national/international gates (Spec §3.3, INT-01, INT-18) |
| M05 Stages and journey log | Built | `src/core/stages.ts`, `src/core/stageTemplates.ts`; `tests/stages.test.ts`, e2e G3-STAGE | Templates beyond Stage A are generic |
| M06 Goals, tasks, habits | Built | `src/core/planner.ts`, `goals.ts`, `habits.ts`, `focus.ts`, `cards.ts`; `tests/g3.test.ts`, `focus_habits_cards*.test.ts`, `m_dependency.test.ts` | No goal-tree screen; habits have no categories or reminders |
| M07 Resources and finance | Built (basic) | `src/core/finance.ts`; `tests/money.test.ts`, `finance_labels.test.ts` | No multi-currency/FX, no zakat snapshot, no budget templates, no loan schedule |
| M08 Time and capacity | Built | `planner.ts` (`freeWindow`, `feasibility`); `tests/g3.test.ts`, `infeasible_plan.test.ts` | No energy/rest model beyond Minimum week |
| M09 Venture portfolio | Partial | `src/core/ventures.ts`; `tests/m_registers.test.ts`, `register_real.test.ts` | No value or unit economics |
| M10 Team and delegation | Partial | `src/core/team.ts` (roles only, no names stored) | No handover or hiring flow |
| M11 Research and options | Built | `src/adapters/wikipedia.ts`, `src/core/research.ts`, `savedLists.ts`; `tests/research.test.ts`, `wikipedia.test.ts`, `m11_background_cache.test.ts`, e2e G4-SUGGEST | Wikipedia only. No compare/reject/replace flow (TM-TST-053 Partial). Google blocked on owner |
| M12 Reality-changed and plan history | Partial | `src/core/reality.ts`, `planHistory.ts`; `tests/o6_reality_review_templates.test.ts` | No PlanVersion diff or three-option proposal (Spec §3.6) |
| M13 Deen | Partial | `src/core/prayer.ts`, `prayerMethod.ts`, `prayerLog.ts`, `fastLog.ts`, `prayerAlerts.ts`; `tests/prayer.test.ts`, `deen_wording.test.ts`, `fast_log.test.ts` | No Quran, zakat, giving, hajj, learning, rights/duties logs; no Hijri calendar; no halal check; azan file absent (`public/audio/` is empty); alerts work only while the app is open |
| M14 Health and family | Missing (field definitions only) | `src/catalog/fields.ts` | No entry screen; owner privacy decision pending |
| M15 Risk and stop criteria | Built | `src/core/risk.ts`; `tests/m_registers.test.ts` | None noted |
| M16 Reviews and KPIs | Built (basic) | `src/core/review.ts`, `weeklyReview.ts`; `tests/o6_*`, `tests/weekly_review.test.ts` | No KPI targets |
| M17 Knowledge and sources | Built (basic) | `src/library/topics.ts`, packs; `tests/content_pack.test.ts`, `topics_rewards.test.ts` | All 202 tips "reviewer pending"; sources are a kind label, not a link and date |
| M18 Visual layer | Partial | `src/ui/charts.ts`, `ring.ts`, `smartFunnel.ts`, `universeUi.ts`, `rewardArt.ts`; `tests/charts.test.ts`, `goal_universe.test.ts`, `smart_funnel.test.ts` | Many batch patterns still missing (51 MISSING rows in owner-demand audit) |
| M19 Automation rules | Built | `src/core/rules.ts`; `tests/rules.test.ts` | Local only, by design |
| M20 Sync, backup, export | Partial | `src/core/backup.ts`, `cryptoBackup.ts`, `snapshots.ts`, `csv.ts`, `sync.ts`; `tests/g2.test.ts`, `crypto_backup.test.ts`, `snapshots.test.ts`, `csv_export.test.ts`, `sync.test.ts` | Sync rules exist but no sync target; no PDF export, no CSV import. The app note in `capability.ts` still says "Demo backup only" (stale) |
| M21 Security and privacy | Partial | `src/core/safety.ts`, `consent.ts`, `notify.ts`, CSP in `index.html`; `tests/security_review.test.ts`, `o8_notify_privacy.test.ts` | No app lock, no at-rest encryption, no data-rights flow, no legal review (G7) |
| M22 Capability status and demo | Built | `src/modules/capability.ts`, `evidence.ts`; `tests/m_list_status.test.ts` | Some notes stale (M17, M18, M20) |
| M23 AI layer | Blocked-on-owner (D-C) | Ports only | By design |
| M24 Template library | Built (small) | `src/library/systems/*.json` (6), `src/core/systems.ts`; `tests/systems.test.ts` | Only 6 templates; no TemplatePack format for public edition yet |
| M25 When stuck | Built | `src/core/stuck.ts`; `tests/stuck.test.ts`, e2e G3-STUCK | Rule-based; helpful but small |

**Count (25 modules):** Built 14 (M01, M02, M05, M06, M07, M08, M11, M15, M16, M17, M19, M22, M24, M25; several are "basic"), Partial 9 (M03, M04, M09, M10, M12, M13, M18, M20, M21), Missing 1 (M14), Blocked-on-owner 1 (M23). The app's own count is 16 / 8 / 1: I am stricter on M04 and M21 (depth) and I count M14 as missing, not partial, because nothing can be written.

### 2.2 Per gate (G0 to G8; Spec §13, Register "Gates")

| Gate | Pass evidence the Spec asks for | What exists | Honest status |
|---|---|---|---|
| G0 Spec freeze | Spec + Register + owner "ok" | Spec and Register exist; owner approved by working on it. TM-TST-130 checklist has one open owner line | Built (one owner confirmation open) |
| G1 Safe shell + field catalog | 100% fields help + privacy class; empty-start; demo to real impossible; screenshots | `src/catalog/validate.ts`, `tests/g1.test.ts`, e2e TM-TST-143, `evidence/screenshots/` | Built. Open: usability sessions (O3), Bangla review (O2) |
| G2 Android offline prototype | Real device airplane run, interrupted sync, duplicate replay, clean-device restore, device matrix | Dexie, backup, snapshots, op-queue (`tests/g2.test.ts`, `sync.test.ts`, `persist.test.ts`, `precache.test.ts`), headless offline e2e | **Partial.** Everything except the real-device part. Spec says the gate passes only on a real device. Blocked-on-owner (O1) |
| G3 Rule-based planner | Golden tests, unknown≠0 property test, constraint tests, usability study | `planner.ts`, `finance.ts`, `assessment.ts`, `reality.ts`; `tests/g3.test.ts`, `hard_constraint_override.test.ts`, `infeasible_plan.test.ts` | Built for the engine; usability study not run |
| G4 Research and options | 0 network calls without click; fewer than 2 options invents nothing; source + date | `research.ts`, `tests/research.test.ts`, e2e | Partial: Wikipedia only; compare/replace flow missing |
| G5 Deen content verification | Licence, verse counts, scholar note, string scan | Prayer times formula; no scripture; no zakat rules; no halal filter | **Missing** (about 10%). Blocked-on-owner (D-D, reviewer) |
| G6 AI and automation | Server proxy, red-team, spend cap | Ports and null adapters only (`tests/connections.test.ts`) | Blocked-on-owner (D-C) |
| G7 Privacy, recovery, real data | Lawyer review, data-rights flows, incident runbook | Encrypted backup, secret rejection, consent, clear-all | Partial (about 25%); legal review is human |
| G8 Pilot, PC, public | Regression report; tenant isolation | None. `ownerId` and `ns` fields exist as a base | Missing; needs new owner approval |

### 2.3 Quality evidence I re-ran today

| Check | Command (on clean HEAD copy) | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | Clean |
| Unit/DOM tests | `npx vitest run` | 77 files, 1020 tests, all pass |
| Build | `npx vite build` | OK; warning: main chunk over 500 kB |
| Browser | `node tools/e2e.mjs` | 59 PASS, 0 FAIL (includes PRECACHE 45 files, G1-NONET, SEC-CSP, MODE-*, DESIGN-VER) |

Not run by me: `tools/screenshots.mjs` (writes `evidence/`), real device, TalkBack, 200% font on a phone.

---

## 3. Gaps and risks

**বাংলা:** সবচেয়ে বড় ঝুঁকি: (১) আসল ফোনে ও আসল ইউজারে টেস্ট নেই; (২) সেভ ব্যর্থ হলে কোনো সতর্কতা নেই, ডেটা চুপচাপ হারাতে পারে; (৩) আসল ডেটা এনক্রিপশন ও অ্যাপ লক ছাড়া থাকে; (৪) ডক্স ও Register কোডের চেয়ে পুরোনো; (৫) কনটেন্ট, বাংলা ও নামাজের সময় কেউ রিভিউ করেনি। গার্ডরেল (সংখ্যা বানানো, স্কোর, লাল কপি, নেটওয়ার্ক) মোটামুটি ভালো আছে।

Severity: **High** = could lose data, trust or the owner's decisions. **Medium** = should fix soon. **Low** = tidy up.

### 3.1 Guardrail checks (verified by reading and grepping code)

| Guardrail | Result | Evidence |
|---|---|---|
| No invented numbers | **OK** | Advice cards use counts of the user's own entries only (`src/core/advice.ts`); paths have no income figures (`src/library/paths.ts`); 0 matches for `%`, `৳`, `$` or BDT in the 202 pack tips (my scan of `public/content/*.json`); finance outputs carry an ESTIMATE label (`tests/finance_labels.test.ts`). One fixed rule threshold (`MANY_OPEN_TASKS = 8`) is disclosed in code |
| No scores, ranks, streaks | **OK** | No streak/leaderboard code in `src/` (only a comment in `src/library/inspiration.ts`); `tests/g1.test.ts:135` scans all `src` for banned terms; habits use "x of y planned days" labelled INFERENCE. Overall % and per-goal % exist because the owner asked (26 Oct) and come only from the user's own tasks |
| Unknown ≠ 0 | **OK** | `src/core/types.ts` (`numberOrNull`, `sumKnown`); property tests in `tests/g3.test.ts`, `money.test.ts`; e2e TM-TST-021 |
| No red or punishing copy | **OK, with a note** | Banned-word scan on all three language packs and on the content packs (`tests/copy_review.test.ts`, `tests/content_pack.test.ts`). Red (`--danger`) is used only for form validation messages (27 `class: "err"` places), never for missed goals. Note: even the gentle "please tick the box" prompts use the danger colour (`src/ui/modeUi.ts:71,90,117`); consider a calmer colour. The banned-word scan does not cover `src/library/*.ts` text, catalog help text or glossary |
| Demo/real mixing | **Mostly OK, one leak** | Store guard refuses DEMO values in real and non-DEMO in demo (`src/core/repo.ts` `guardWrite`); no promote path; `tests/data_mode.test.ts`, `real_entry.test.ts`. **Leak (Medium):** "own options" and "saved Wikipedia results" are always written to the demo namespace even in real mode (`src/ui/screens.ts:1048-1069`, `src/core/savedLists.ts:50,74`). The user's typed text sits in a bucket labelled demo and is deleted by "delete demo data". Documented as a limit in `DECISIONS_LOG.md` ("Demo is not permanent"), but it surprises users |
| Data leaving the device | **OK** | Only `src/adapters/wikipedia.ts` calls `fetch` (plus the azan presence check for the app's own files); user-tapped, consent line shown (`suggest.consent`), query is secret-checked first; enforced by `tests/security_review.test.ts` and e2e G1-NONET (0 third-party requests). Note: Wikipedia sees the search words and the IP address; the consent text says "your search words" only |
| Network calls at runtime | **OK** | `public/sw.js` handles same-origin GET only. No analytics, no remote fonts or scripts. CSP `connect-src` allows only self and the two Wikipedia hosts (`index.html`) |
| Secrets in backups/exports | **OK** | Keys use the `tm:secret:` prefix, never read by backup, export, encrypted bundle or snapshot (`tests/security_review.test.ts`, `docs/design/connections.md`). CSV export is consent-gated and separates demo and real |

### 3.2 Data safety and storage (High)

| # | Finding | Evidence | Why it matters | Fix |
|---|---|---|---|---|
| S1 | **Write errors are swallowed.** If an IndexedDB write fails (quota, private mode, eviction), the screen shows "saved" because memory is updated, but the record is lost when the app closes | `src/core/persist.ts` `mirrorToRepo`: `.catch(() => { /* memory copy stays valid; next write retries */ })` | Real data has been accepted since 25 Oct. Silent loss breaks trust | Surface a visible "not saved on this phone" state; retry queue; test with a failing repo |
| S2 | **No persistent-storage request.** No `navigator.storage.persist()` anywhere in `src/` | grep found nothing | The browser may evict IndexedDB under storage pressure (documented as unverified in `docs/design/pwa-vs-native.md`) | Call `persist()` after first real consent; show the result in More > Data |
| S3 | **Snapshots sit in the same database as the data** (`src/adapters/dexie.ts` `snapshots` table). If the database is evicted, snapshots go with it. The backup-file reminder is OFF by default (`src/core/snapshots.ts` `reminderDue`) | | Only a saved file protects against loss | Default the reminder ON once real data exists (it is an in-app reminder, not a network feature) |
| S4 | **No at-rest encryption or app lock** for the live database. Spec M21 lists "local encryption, app-lock". Only exported backups are encrypted (`src/core/cryptoBackup.ts`: PBKDF2-SHA256 600k + AES-GCM, good) | grep for lock/passcode found nothing | A lost or shared phone exposes finance and Deen entries | Optional PIN/passphrase lock screen (builder can build); full database encryption is a bigger design |
| S5 | **Record migration is thin.** `schemaVersion: 1` is hard-coded in about 10 places; only the Dexie table upgrade v1 to v2 is tested (`tests/snapshots.test.ts`). No record-level migrate function, no failed-migration test (TM-TST-089 is Partial) | `src/ui/screens.ts:94,437,563`, `src/ui/entry.ts:59` | The first schema change on a phone holding real data is the riskiest day of the project | Add `migrateRecord(v)` with a version table and a "restore from snapshot before migrating" test, before any field change |
| S6 | Tests write into the repo: `tests/g1.test.ts:111` writes `evidence/catalog-report.json`, so every test run dirties the tree. `evidence/` (including 60+ PNGs) is tracked in git | `git status` shows it modified | Noisy diffs, accidental commits | Write to a temp folder or gitignore `evidence/` output |

### 3.3 Security (Medium)

| # | Finding | Evidence | Fix |
|---|---|---|---|
| X1 | CSP is a `<meta>` tag. `frame-ancestors` is ignored in meta; there is no `public/_headers` file, so the host will send no `X-Content-Type-Options`, `Referrer-Policy` or clickjacking protection | `index.html`, `ls public/` | Add `public/_headers` for Cloudflare Pages when hosting is set up (owner account step O4) |
| X2 | `style-src 'unsafe-inline'` (inline styles from the DOM helper) | `index.html` | Acceptable now (no `innerHTML` except a constant icon in `src/ui/langMenu.ts:17`, no `eval`); reduce later |
| X3 | Connection keys, once ever used, would sit in `localStorage` (`tm:secret:conn:<id>`) in plain text | `docs/design/connections.md` | Fine while all ports are OFF; before any key is stored, keep it in a server function instead (Spec §6 says no client keys) |
| X4 | Backup passphrase minimum is 8 characters, no strength hint | `src/core/cryptoBackup.ts` `MIN_PASSPHRASE` | Add a hint; keep the file local |
| X5 | Strength: strict secret detector (passwords, OTP, card, ID) on free text and on search queries; tested | `src/core/safety.ts`, e2e TM-TST-034 | None |

### 3.4 Offline, performance, size

| # | Finding | Evidence | Rating |
|---|---|---|---|
| P1 | Offline works in headless Chromium: 45 files precached, cold start offline opens the new screens | e2e PRECACHE / TM-TST-084 | Good, **but real phone untested** (O1) |
| P2 | Service worker is **network-first** for everything: on a weak mobile connection each load waits for the network to fail before showing the cache | `public/sw.js` fetch handler | Medium. Stale-while-revalidate for the app shell is faster and still updates |
| P3 | Install uses `Promise.allSettled`, so a failed file is silent: the app can look installed but be only partly cached | `public/sw.js` install | Low to Medium. Log failures to the status screen |
| P4 | `skipWaiting` + `clients.claim` plus deleting old caches at activate: a page that is already open and later loads a hashed chunk from the old build could miss it | `public/sw.js` activate | Low. Test an update while offline |
| P5 | One 632 kB JS chunk (184 kB gzip) holds all screens and all three language packs (`src/i18n/packs.ts` about 172 kB source) | `vite build` output | Medium on low-end Android. Split by route with dynamic import |
| P6 | Every state change re-renders the whole screen by replacing DOM (`src/app.ts` `render`); scroll is kept, but keyboard or screen-reader focus after a re-render is unverified | `src/app.ts:103-106` | Medium (accessibility and speed on long lists) |
| P7 | `screens.ts` is 1,476 very long lines; `packs.ts` 1,705 lines | `wc -l` | Maintainability risk; split by screen |
| P8 | Manifest has no maskable icon, no `id`, no `lang`; `theme_color` is the old paper colour `#F5F1E8`, not the default Light Futuristic colour | `public/manifest.webmanifest`, `index.html` | Low |
| P9 | Prayer alerts and azan only run **while the app is open**; a PWA cannot reliably wake a closed app without a push server. This is the main Deen feature a Muslim user will test first | `docs/design/pwa-vs-native.md`, owner-demand audit row "Azan" | **High for product value.** Decide early: Capacitor wrapper (Android) vs push server (needs D-C-style approval) |

### 3.5 Docs and Register drift (High, because the owner reads these)

| # | Stale item | Evidence | What is true now |
|---|---|---|---|
| R1 (fixed 1 Nov, Block 10) | `README.md` said 39 tests, "G1", "Ink and Paper", only G1 | `README.md` | 1020 tests, Light Futuristic default, G1 to G4 work. `package.json` is still `0.1.0-g1`, "G1 safe shell" |
| R2 | `docs/PLAN.md` "Next actions": "App storage to IndexedDB, PNG icons..." and 163 tests | `docs/PLAN.md` | Those are done. ROADMAP sprint table says "R1 (now)" |
| R3 (fixed 1 Nov, Block 10, copy only) | Register v2_1 copy said: "Decisions" sheet still says D-B "Open" and D-E "Ink & Paper approved"; "Start Here" says "NOTHING is implemented"; Summary says "Implemented = 0 by design" | `docs/register/Trillionaire_Me_Requirements_Register_v2_1_evidence_refresh.xlsx` | D-B approved 25 Oct; D-E superseded. Rule in CLAUDE.md §1 says to fix the lower doc and log it. The Spec itself is still Spec v2.0 with the old D-E, and CLAUDE.md puts Spec above everything, so the two top docs disagree |
| R4 | Two evidence copies of the Register (`..._v2_1_G1_evidence.xlsx` and `..._v2_1_evidence_refresh.xlsx`) | `docs/register/` | Remove or label the older one |
| R5 | `docs/register/EVIDENCE_REFRESH.md` last section is Run 3 (964 tests, 42 rows); the xlsx Change Log says 1020 tests, 47 rows | both files | Add the 1 Nov run to the md |
| R6 | `docs/design/owner-demand-audit.md` (31 Oct counts 34 / 47 / 51): weekly review is listed MISSING, but `#/journey/week` was built later that day; "Register-linked behaviours with no code yet" (TM-TST-005, 007, 009, 015, 040, 153) were built in Block 7; chooser now on 17 screens, not 7 | `docs/TODO.md` Block 7, `src/core/weeklyReview.ts` | Re-run the audit |
| R7 | `docs/design/early-plan-status.md` D2 says "Ink & Paper built" as the look; B2 arc said Built | file | Superseded by D-E update |
| R8 | `src/modules/capability.ts` notes: M17 "sources not tracked", M18 "other charts come later", M20 "Demo backup only" | file | Charts, encrypted backup, snapshots and CSV exist |
| R9 | `docs/TODO.md` Block 1 last item unchecked (Goal Universe, overall progress card, language icon in rendered UI) | file | Run `tools/screenshots.mjs` and tick |
| R10 | INT-08 intent md file and the owner's "exact words" file are not in the repo | search of `docs/` | Create or locate them (they protect the owner's original intent) |

### 3.6 Test and evidence coverage

| Measure | Value | Source |
|---|---|---|
| TM-TST rows with linked evidence | 47 of 180 requirement rows (26%) | Register v2_1 "Requirements v2" column O |
| Verified (Pass) / Partial | 15 / 32 | same |
| Requirements with no evidence | 133 | same |
| Features built but not mapped to any TM-TST row | motion (`r4_motion`), capture (`capture`), persistence (`persist`), sync replay (`sync`), plan UI (`g3ui`), inspiration (`inspiration`) and others | `docs/register/EVIDENCE_REFRESH.md` "Not yet mapped" |
| UI files tested only indirectly (no test imports them by name) | `connectionsUi`, `encBackup`, `entry`, `langMenu`, `modeUi`, `planScreens`, `viewBar` | my scan of `tests/` |
| Test style | Mostly jsdom DOM tests; only one browser e2e script (59 checks) | `tools/e2e.mjs` |
| What no test can prove | Real phone, TalkBack, 200% font, closed-app notifications, storage eviction, low-end speed, whether a person understands the screens | owner-only items O1 to O3, O8 |

Good practice noted: the builder never marks a requirement Verified without a test, keeps the original v2_0 Register untouched (sha256 checked), and says "Partial" when a human gate is open.

### 3.7 Accessibility

| Item | Status |
|---|---|
| Contrast tokens for all 4 looks, light and dark; focus rings; 44 px targets; skip link; heading order | Tested (`tests/a11y.test.ts`, `a11y_looks.test.ts`) |
| Reduced motion | Tested (`tests/r4_motion.test.ts`); 14 keyframes all behind `prefers-reduced-motion` |
| Charts have text equivalents | Tested (`tests/charts.test.ts`) |
| `html lang` set per language; font scale preference | Yes (`applyPrefs` in `src/ui/state.ts`). Mix mode sets `lang="bn"` |
| TalkBack, 200% font, one-hand use on a real phone | **Not tested** (TM-TST-117 Partial). Full re-render (P6) may drop focus |
| Validation messages use `role="alert"` | Yes |

### 3.8 Bangla quality

| Item | Finding |
|---|---|
| Review | No native reviewer has signed off (TM-TST-161, O2). Glossary, content packs and templates are marked "যাচাই হয়নি" in the app, which is honest |
| Automated rewrite | On 31 Oct a script made **1,088 word swaps in 25 files** (`docs/design/bangla-loanword-swaps.md`). It follows the owner's loanword rule, but swaps by pattern can leave awkward grammar (case endings, plural forms). A reader should check at least Today, Plan, Money, Deen and More |
| Parity | Every key exists in en, bn and mix (`tests/i18n_modes.test.ts`); banned-word list in Bangla (`tests/copy_review.test.ts`). The tests check presence and forbidden words, not naturalness |
| Digits | Latin digits in Bangla/Mix by owner request (`tests/latin_digits.test.ts`) |
| Fonts | Bundled Hind Siliguri and Noto Serif Bengali (no network); Fraunces for English |

### 3.9 Content quality and Bangladesh context

| Item | Finding |
|---|---|
| Volume | 202 pack tips + 21 topics + 10 paths + 6 systems + 15 inspiration lines. All pending reviewer. Good practical tone, no figures |
| Bangladesh context | Thin. BDT and Asia/Dhaka prayer times exist, but I found **no** bKash/Nagad, DPS/savings certificates, ঢাকা job market, freelancing platforms, SSC/HSC/study paths, NBR/trade licence, or samity in `src/library` or `public/content` (my grep). The opportunity library is neutral on purpose (DP-06) but not locally useful yet |
| Deen | The product's stated differentiator (INT-06, INT-07) is the least built part: prayer times + marks + fasting mark. Prayer times were checked only against the builder's own formula (`tools/prayer_reference.py`), not the official Bangladesh timetable (owner task) |
| Halal filter (MR-31), zakat, hajj plan, Quran log, Hijri calendar | Missing |
| Sensitive topics (health, emotions) | Flagged, non-clinical, no scores; reviewer pending |

### 3.10 Other risks

| # | Risk | Note |
|---|---|---|
| O-1 | **No real users yet.** Every claim like "simple like a diary" (INT-25) is untested | Usability sessions (O3) not run; TM-TST-010, 066, 067, 171 Partial |
| O-2 | Scope growth: many visual patterns were built or planned before the core was validated (51 MISSING pattern rows, 4 Design versions) | Risk of polishing before learning what the owner actually uses |
| O-3 | One-agent, one-checkout workflow: uncommitted work from another agent sits beside committed work | Keep one writer per file; commit small |
| O-4 | Cloudflare `wrangler.jsonc` is present but nothing is deployed; no CI file in repo | No `.github/workflows` found; tests run only by hand |
| O-5 | Spec §14 wants human gates for legal and religious checks. None scheduled | G5/G7 need named people |

---

## 4. Overall completion estimate

**বাংলা:** একটা সংখ্যা মিথ্যা দেখাতে পারে, তাই চারটা ভিন্ন মাপ দিয়েছি। পুরো ভিশনের (G8 পর্যন্ত) হিসাবে প্রায় ৪০%। শুধু "মালিকের নিজের ফোনের জন্য পার্সোনাল অ্যাপ"-এর হিসাবে কোড প্রায় ৭০% তৈরি, কিন্তু যাচাই প্রায় ০%।

Each % is a judgement based on the stated counts. I did not inflate; where a yardstick is generous I say so.

| Yardstick | Calculation | Result | What it really measures |
|---|---|---|---|
| A. Register evidence (strictest) | (15 Verified + 0.5 × 32 Partial) / 180 rows | **17%** | Requirements with test evidence only. Low because 133 rows were never mapped to tests, not because 133 are unbuilt |
| B. Owner-demand audit (31 Oct) | (34 DONE + 0.5 × 47 PARTIAL) / 132 owner asks | **44%** (about 47% if Block 7 items are counted; not re-audited) | Breadth of owner asks reachable in the app. 51 MISSING include owner-only and approval-blocked items |
| C. Module status | (16 implemented + 0.5 × 8 partial) / 25 modules | **80%** | A screen exists and has a test. Says nothing about depth or real use. Most generous |
| D. Gates, equal weight | G0 100, G1 85, G2 70, G3 75, G4 45, G5 10, G6 3, G7 25, G8 0, average | **46%** | Progress against the Spec's build plan |
| **My headline** | Blend of B and D, then reduced because nothing is validated on a real phone or by a user | **about 40%** of the full vision | |
| Personal-edition MVP (G1 to G4 + real-data forms, no AI/scripture/cloud) | Built features / what the Spec lists for those gates | **about 70% built, about 0% validated** | What the owner could use on his own phone this month once S1 to S3 and the real-phone test are done |

Not counted: G6 AI, G8 public edition, PC version, Quran/zakat content. Those are approval-gated and are 0% by design.

---

## 5. New ideas to make the product succeed

**বাংলা:** আইডিয়াগুলো তিন ভাগে: দ্রুত (১ সপ্তাহের মধ্যে), মাঝারি (১ মাস), বড় (পরে)। প্রতিটার পাশে লেখা আছে বিল্ডার নিজে করতে পারবে, নাকি মালিকের অনুমোদন লাগবে (AI, ক্লাউড, টাকা, স্ক্রিপচার)।

Tag: **[B]** builder can build now · **[O]** needs owner approval or an owner-only action first.

### 5.1 Quick wins (days)

| # | Idea | Why | Tag |
|---|---|---|---|
| Q1 | Fix data-safety trio S1 to S3: visible save-failed state, `storage.persist()`, backup reminder ON when real data exists | Protects real data; cheapest trust win | [B] |
| Q2 | Refresh the stale docs R1 to R9 (README, PLAN, Register Decisions sheet via the copy, capability notes, audit) and add a one-page "Where we are" for the owner in Bangla | The owner reads these on a phone and decides from them | [B] |
| Q3 | Add `public/_headers` (nosniff, referrer policy, frame-ancestors) and a maskable icon/theme colour fix | Ready for hosting the day the owner connects Cloudflare | [B] (hosting is [O]) |
| Q4 | Move own options and saved search results into the active namespace (real when in real mode) | Closes the demo/real leak | [B] |
| Q5 | Calmer colour for "please tick" and "write something first" prompts; keep red-orange for none | Matches the no-red-copy spirit | [B] |
| Q6 | Owner 10-minute phone checklist in Bangla (install, airplane mode, lock-screen, 3 prayer times vs timetable) with a single "pass/fail" reply | Unblocks O1, O8 and prayer verification at once | [B] writes it; [O] owner runs it |
| Q7 | Gate CI: add a GitHub Actions workflow running tsc, vitest, build, e2e | Stops regressions while several agents write | [B] |

### 5.2 Medium (weeks)

| # | Idea | Why | Tag |
|---|---|---|---|
| M1 | **First-run onboarding in 3 screens:** pick one goal, one 10-minute first step, see it on Today. Measure "time to first completed step" in a local-only counter | Today the first screen is a demo/real choice and a large menu; the "one focus" promise (DP-03) needs a guided first win | [B] |
| M2 | **Retention without streaks:** weekly "what went well / what got in the way" card (exists), a gentle "welcome back" after a gap that offers Minimum week, a monthly "then vs now" before/after picture, and quiet milestone moments | Fits CLAUDE §6 and Spec "gate pass" feeling | [B] |
| M3 | **Prayer-first closed-app solution:** test a Capacitor Android wrapper just for local notifications and the azan sound | PWA cannot ring when closed (P9). Decide with evidence, record in DECISIONS_LOG | [B] builds the test; [O] owner device and Play account/cost |
| M4 | **Bangladesh starter pack:** local-context topics and ready systems (savings groups, mobile money safety, freelancing basics, study/job search in Bangladesh, small shop bookkeeping, trade licence steps), each with source, date and "reviewer pending". No figures unless sourced | Makes the neutral library locally useful | [B] writes drafts; reviewer is [O] |
| M5 | **Halal-check flags (MR-31):** an informational checklist on paths (interest, uncertainty, prohibited sectors) with "ask a qualified scholar"; no ruling | Spec §3.3, G5 piece that needs no scripture | [B] draft; scholar review [O] |
| M6 | **Plan versions and "what changed":** PlanVersion diff plus max 3 rule-based options (move date, reduce scope, change path, pause) | Spec §3.6 core promise, still partial (M12) | [B] |
| M7 | **Goal tree screen and backward-planning wizard** (end date to today) | Owner batches 4, 8; INT-16/17; core exists, no screen | [B] |
| M8 | **Bangla review sprint:** export all Bangla strings to one readable sheet by screen; owner or a reviewer marks OK/change; apply with a script | Unblocks TM-TST-161; fixes risk from the 1,088 automated swaps | [B] prepares; reviewer [O] |
| M9 | **5-user usability test kit:** 5 tasks, a short script in Bangla, a form for results (time, stuck points). Use the owner plus 4 people he trusts, on their own phones, demo data only | Turns "simple like a diary" into evidence (TM-TST-010, 066, 067, 171) | [B] kit; people [O] |
| M10 | Split the JS bundle by route; lazy-load language packs and content packs | Speed on low-end Android | [B] |
| M11 | Optional PIN lock screen for real data | Closes S4 for most real risks | [B] |
| M12 | Record-level `migrateRecord` + failed-migration test + "snapshot before migrate" | Closes S5 before the first schema change | [B] |

### 5.3 Big bets (months, mostly approval-gated)

| # | Idea | Why | Tag |
|---|---|---|---|
| B1 | **Online "suggest" with AI behind a server function** with spend cap, kill switch, no raw records sent, structured output | Spec §6 / G6; makes research and explanations richer | [O] D-C (cost, provider, key) |
| B2 | **Google search option** through a server function | CLAUDE §8 | [O] key and daily cap |
| B3 | **Encrypted cloud copy** (free tier): upload only the already encrypted backup blob | Protects against phone loss without exposing data; port exists (`cloudSync`) | [O] cloud approval; builder writes the adapter |
| B4 | **Deen content layer:** Quran reading plan (references and links first), zakat calculator with versioned rules, giving log, Hijri calendar, hajj plan | The owner's INT-06/07 centrepiece | [O] D-D (scripture), scholar review (G5) |
| B5 | **Public edition (G8):** TemplatePack format (any goal), templates marketplace of the owner's own packs, achievements; later accounts | INT-29 | [O] new approval, legal review, tenant isolation tests; **monetisation** options are [O]: free core with paid packs, a small one-time unlock, or sponsor-free donation; no ads or data selling (conflicts with privacy promise). Cost and pricing need the owner's decision; Bangladesh payment (bKash/card) needs a business account |
| B6 | **Staff/customer viewing edition** (owner's businesses) | PLAN G8 | [O] consent model, legal review; keep separate from the personal app and from the owner's ERP |
| B7 | **Opportunity engine with local data:** curated, dated, sourced lists of local courses/jobs/markets, refreshed by the owner or a reviewer | INT-01, INT-18 | [O] sources/licences; builder can build the viewer |
| B8 | **Real-user pilot (G8):** 10 to 20 users, two weeks, local-only counters shared by them voluntarily (copy/paste text, no server) | Real evidence before any public decision | [O] people, consent |

### 5.4 Testing with real users (how)

1. Start with the owner for 7 days on real data only after Q1 is done. Ask him one question daily: "What did you open and what did you skip?"
2. Then M9 with 4 more people. Success looks like: a new user completes a first step in under 3 minutes without help.
3. Record results in `docs/audit/` or the Register as Partial to Verified only when a person actually ran the test.

---

## 6. Next 30 days: one ordered plan

**বাংলা:** ৩০ দিনের ক্রম: আগে ডেটা সেফটি ও ডক ঠিক করা, তারপর মালিকের ফোনে টেস্ট, তারপর অনবোর্ডিং ও বাংলা রিভিউ, তারপর ইউজার টেস্ট। বিল্ডার একা যা পারে সেগুলো আগে; মালিকের কাজ আলাদা চিহ্নিত।

| Week | Order | Task | Who | Done when (evidence) |
|---|---|---|---|---|
| 1 | 1 | Q1: visible save-failed state, `storage.persist()`, backup reminder rules | Builder | New tests with a failing repo; manual check in e2e |
| 1 | 2 | Q4: own options and saved results follow the active namespace | Builder | Test in `tests/real_entry.test.ts` style |
| 1 | 3 | Q2: refresh README, PLAN, Register copy "Decisions" and "Start Here", capability notes; one Bangla "Where we are" page | Builder | Docs match audit numbers; DECISIONS_LOG entry |
| 1 | 4 | Q7: CI workflow (tsc, vitest, build, e2e) and stop tests writing into `evidence/` (S6) | Builder | Green run on the branch |
| 1 | 5 | Q6: owner phone checklist (install, airplane, lock-screen, prayer times vs official timetable) | Builder writes; **Owner runs** | Owner replies pass/fail per line; log in DECISIONS_LOG |
| 2 | 6 | M12: `migrateRecord` and failed-migration test | Builder | Test file + Register TM-TST-089 evidence |
| 2 | 7 | M11: optional PIN lock | Builder | Test + e2e |
| 2 | 8 | Q3 and P8: `_headers`, manifest fixes, theme colour | Builder | e2e SEC check extended |
| 2 | 9 | If owner's phone test fails on closed-app alerts: M3 Capacitor test build | Builder + **Owner device** | Recorded result; decision in DECISIONS_LOG |
| 3 | 10 | M1: three-screen onboarding and "first step" flow | Builder | DOM test + e2e flow; time-to-first-step measured locally |
| 3 | 11 | M8: Bangla string sheet and apply-back script | Builder prepares; **Reviewer/Owner** checks | TM-TST-161 moves from Partial only when signed off |
| 3 | 12 | P2 and M10: stale-while-revalidate shell cache and route splitting | Builder | Bundle size down; offline e2e still 100% |
| 3 | 13 | M4: Bangladesh starter pack drafts (sources and dates, reviewer pending) | Builder | Content-pack tests pass; no figures without a source |
| 4 | 14 | M9: usability kit; 5 sessions (owner plus 4 people, demo data) | Builder kit; **Owner recruits** | Notes saved; TM-TST-010/066/067/171 updated honestly |
| 4 | 15 | M2: "welcome back" and monthly then-vs-now (no streaks) | Builder | Copy-guard tests pass |
| 4 | 16 | Re-run the owner-demand audit and the Register mapping; republish this audit's numbers | Builder | Updated counts and a new line in the Register Change Log |
| 4 | 17 | Owner decision round (one question each, with recommended default): hosting account (O4), halal/Deen content path (D-D), online suggestions (D-C), cloud copy | **Owner** | Answers logged in DECISIONS_LOG; nothing enabled without them |

**Rules that stay on during all 30 days:** no AI, no key, no paid service, no scripture text, no data off the device; demo and real stay separate; unknown is never 0; no streaks, scores or red copy; every claim of "done" has a test or a logged human check.

---

## Appendix A: How I verified (reproducible)

```
git archive HEAD | tar -x -C <scratch>/snap ; ln -s <repo>/node_modules <scratch>/snap/node_modules
cd <scratch>/snap
npx tsc --noEmit            # clean
npx vitest run              # 77 files, 1020 tests, passed
npx vite build              # ok, main chunk 631.77 kB (gzip 184.24 kB)
node tools/e2e.mjs          # 59 PASS, 0 FAIL
```

Other checks: `grep` for `fetch(`, `XMLHttpRequest`, `WebSocket`, `innerHTML`, `eval`, `persist()`, lock/passcode, `schemaVersion`, `streak|score|rank`; Python scan of `public/content/*.json` (202 tips, 0 percent/currency matches, all `reviewStatus: pending_reviewer`); `openpyxl` read of both Register files (counts in 3.6); reading `src/core/persist.ts`, `src/adapters/dexie.ts`, `src/core/cryptoBackup.ts`, `public/sw.js`, `index.html`, `src/ui/screens.ts:1040-1072`.

## Appendix B: Limits of this audit

- I did not run `tools/screenshots.mjs`, a real phone, TalkBack or any user session.
- I did not audit the builder's uncommitted decision-wizard work.
- Percentages are judgement from counts, not measurements; the yardsticks are shown so the owner can disagree with the weighting.
- The INT-08 intent files may exist outside the repo; I could only say they are not in it.

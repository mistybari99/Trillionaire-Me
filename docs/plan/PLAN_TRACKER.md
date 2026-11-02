# PLAN TRACKER (master list of every planned step)

Keeper: plan-keeper agent. Last check: 2 Nov 2026 11:43 UTC (check #1, see `PLAN_CHECK_LOG.md`). Branch `ccr-8b686ba2-vitt45`, HEAD `c9fbaac`.

## বাংলা সারাংশ
- এই ফাইলে সব প্ল্যানের প্রতিটি ধাপ এক লাইনে আছে। কোনো ধাপ হারালে এখানে ধরা পড়বে।
- নিয়ম (CLAUDE.md §3): ধাপ "শেষ" তখনই যখন UI পর্যন্ত সম্পূর্ণ, যেখানে যেখানে লাগে সেখানে লিংক করা, এবং link-check test পাস করেছে। এর কম হলে "Built" বা "In progress"।
- এখন পর্যন্ত: Settings PR1a (restore core) commit হয়েছে। PR1b (UI জোড়া) চলছে, commit হয়নি। বাকি সব (PR2 থেকে PR6) শুরু হয়নি। পুরোনো Block 1-10 কোডে তৈরি, কিন্তু কোনোটারই link-check test নেই।
- বড় ফাঁক: CI নেই, `_headers` নেই, "welcome back" ও "then vs now" নেই, TODO.md-তে Block 11 (Settings) এখনও লেখা হয়নি, DECISIONS_LOG-এ Settings এন্ট্রি নেই।

## How to read / update this file
- Status words: **Not started**, **In progress**, **Built** (code + a test exists, but not fully linked/checked), **Built+Linked+Tested** (all DoD columns pass, incl. a link-check test), **Blocked** (needs owner or approval).
- Owner column: **builder**, **owner** (only he can do it), **needs-approval** (charter section 4 gate).
- DoD check codes (all must be Y for Built+Linked+Tested): `UI` complete in UI · `LK` linked everywhere it is used (no orphan old route/key/label) · `DR` demo/real handled · `L3` EN/BN/mix · `4L` four looks · `OFF` works offline (precache) · `TS` tests incl. link-check. `Y` pass, `N` fail, `-` not applicable, `?` not verified yet.
- "Legacy" rows (Block 1-10, audit): code and tests exist and were reported done by earlier agents. This keeper did not re-run them. No repo-wide link-check test exists (grep of `tests/` and `tools/` found none), so none can be `Built+Linked+Tested` until one is added (see GAP-01). They are marked Built.
- To update after a build step: change Status, Evidence (commit hash, file, test name), DoD codes, then append a line to `PLAN_CHECK_LOG.md`.

---

## A. Settings redesign (`docs/design/settings-final-decision.md`)

### A1. PR 1 Restore safety (section 5 PR1, section 3.1)
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-1.01 | final §5 PR1, §3.1 | `restoreBackupAtomic`, `planRestore`, `goBack` in core; no clear-before-write | builder | Built | `c9fbaac`; `src/core/restore.ts`, `src/core/backup.ts` `replaceNamespace` | JSON/encrypted/snapshot restore, Go back | UI N · LK ? · DR Y · L3 - · 4L - · OFF - · TS Y |
| SET-1.02 | §3.1 step 4 | "Before restore" snapshot, kept 7 days, outside keep-N, scrubbed on Clear real | builder | Built | `c9fbaac`; `src/core/snapshots.ts`; tests "kept 7 days outside the keep-N count", "Clear real removes the real copy" | Snapshots list, Clear real, Go back | UI N · LK ? · DR Y · TS Y |
| SET-1.03 | §5 PR1 | Wire existing JSON restore button to new flow | builder | In progress | uncommitted: `src/ui/screens.ts:1484` calls `startRestore("json")`; `src/ui/restoreUi.ts` (untracked) | `/more/data` Backup section | UI ? · LK ? · TS N (no UI test) |
| SET-1.04 | §5 PR1 | Wire encrypted restore (passphrase first, then same preview; passphrase not stored) | builder | In progress | uncommitted: `src/ui/encBackup.ts:46` | `/more/data` encrypted card | UI ? · TS N |
| SET-1.05 | §5 PR1 | Wire snapshot restore and snapshot load-from-file | builder | In progress | uncommitted: `src/ui/snapshotsUi.ts:51` | Snapshots card | UI ? · TS N |
| SET-1.06 | §5 PR1, §3.1 | Label Save buttons "Contains: ..." (JSON = demo only, encrypted = demo and real) | builder | In progress | i18n keys `backup.contains.demo`, `enc.contains` added (uncommitted `packs.ts`); no screen use found yet | Backup cards | UI N · L3 ? |
| SET-1.07 | §3.1 | Status line "Real data backup: none yet / last on <date>" | builder | Not started | no key or code found | Backup page, Clear real "save a backup first" link | - |
| SET-1.08 | §3.1 | Encrypted save asks "I wrote the passphrase down" tick | builder | Not started | not found in `encBackup.ts` diff scope | Encrypted backup card | - |
| SET-1.09 | §3.1 step 3 | PIN re-ask before restore when lock is on | builder | In progress | `restoreUi.ts` uses `lockEnabled`/`verifyPin` (uncommitted) | Restore | TS N |
| SET-1.10 | §3.1 step 6-7 | Confirm text names both numbers; Cancel default focus; result card with Go back | builder | In progress | `restoreUi.ts` (uncommitted) | Restore | TS N |
| SET-1.11 | §3.1 step 2 | Real file + consent off: stop with message and gate link, nothing written | builder | In progress | core Built (`RealPermissionError`); UI link goes to `#/more/data` (will need `/settings/privacy` later, see GAP-07) | Restore, Privacy | TS core Y, UI N |
| SET-1.T1 | §5 PR1 test | Failing `put` mid-restore keeps originals, reports "Nothing was changed" | builder | Built | `tests/restore_safety.test.ts` (2 tests) | - | TS Y |
| SET-1.T2 | PR1 test | Real file with consent off writes nothing | builder | Built | same file, "real data without the tick writes nothing" | - | TS Y |
| SET-1.T3 | PR1 test | Preview counts equal file and phone | builder | Built | "counts equal the file and the phone" | - | TS Y |
| SET-1.T4 | PR1 test | Confirm text contains both numbers | builder | Not started | key exists; no UI test | - | TS N |
| SET-1.T5 | PR1 test | Cancel changes nothing | builder | Not started | no UI test | - | TS N |
| SET-1.T6 | PR1 test | Go back restores previous records | builder | Built | "saves a Before restore copy, replaces, and Go back puts the old records back" | - | TS Y |
| SET-1.T7 | PR1 test | `scrubRealParts` removes pre-restore real copy | builder | Built | "Clear real removes the real copy inside it" | - | TS Y |
| SET-1.T8 | PR1 test | Corrupt / newer-schema file rejected before touching anything | builder | Built | "a corrupt file is rejected before anything is touched" | - | TS Y |
| SET-1.T9 | PR1 test | App lock on asks PIN | builder | Not started | no UI test | - | TS N |
| SET-1.X1 | §5 "Every PR" | PR1 housekeeping: lint/test/build green, 360 px screenshot, DECISIONS_LOG entry with undo, Register Change Log line | builder | Not started | no Settings entry in `DECISIONS_LOG.md`; no screenshot | - | - |
| SET-1.X2 | §6 risk | Keep old `restoreBackup` as validator only; remove direct `clear`+`put` path from UI | builder | In progress | `restoreBackup` now uses `replaceNamespace` (no clear). No UI calls it directly any more (grep). OK | - | - |

### A2. PR 2 Shell, registry, tab rename (§1.1, §1.2, §5 PR2)
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-2.01 | §5 PR2 | `settingsRegistry.ts` (id, category, row, labels en/bn/mix, keywords, storage key, namespace, computed-default reason) | builder | Not started | file absent | Search, status strip, redirects, link-check | - |
| SET-2.02 | R6, §4 | Route family `^/settings(?:/([a-z]+))?(?:/([a-z-]+))?$`; unknown row id still renders; known row scrolls + highlights once (no pulse under reduced motion) | builder | Not started | no `settings` route in `src/app.ts` | All Settings links | - |
| SET-2.03 | §1.2 | Settings home: `h1`, always-visible magnifier button, Quick card (Language, Theme, Text size; moved from `more()`), status strip, 8 category cards, "Guides & info" row, nothing destructive on home | builder | Not started | none | Tab bar, globe, search | - |
| SET-2.04 | §1.1 | Rename 5th tab More to Settings (gear icon, `nav.settings`, keep `nav.more` until PR4), EN Settings / BN সেটিংস / Mix Settings | builder | Not started | `nav.more` still in `packs.ts` 173/1086 | Tab bar, tests asserting tab highlight | - |
| SET-2.05 | §5 PR2 | Content routes tagged tab `settings` | builder | Not started | - | Topics, status, fields, glossary, safety, dictionary, library, halal-flags, cards | - |
| SET-2.06 | R8, §1.2 | Compact one-line DEMO banner on `/settings*`; hide "delete demo?" ask card and backup reminder card there; prayer reminders stay | builder | Not started | - | `demoPanels()`, Today cards | - |
| SET-2.07 | §1.3 | 8 category stub pages linking to existing screens (order: look, prayer, backup, privacy, data, plan, connections, delete) + about | builder | Not started | - | PR3 | - |
| SET-2.08 | §1.3 | Category names checked against `bangla-loanword-swaps.md`; add new words (এক্সপোর্ট, রিয়েল) if absent; no "Danger/বিপদ" | builder | Not started | - | swap file, copy_review | - |
| SET-2.T1 | PR2 accept | Registry test: every `prefs` key and every inventory row appears exactly once; no control outside documented exceptions (globe, per-screen view bars, rows 49-51) | builder | Not started | - | - | - |
| SET-2.T2 | PR2 accept | Tab bar at 360 px and 200 % text: no clipping, no horizontal scroll | builder | Not started | - | - | - |
| SET-2.T3 | PR2 accept | Quick card visible without scrolling in demo mode at 360 px | builder | Not started | - | - | - |
| SET-2.T4 | PR2 accept, §3.4 | Locked deep link ends on lock screen and returns to same route after unlock | builder | Not started | - | `isLocked()` first in `render()` | - |
| SET-2.T5 | PR2 accept | Unknown row id still renders | builder | Not started | - | - | - |

### A3. PR 3 Categories
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-3a.1 | §5 PR3a | Look: Design version (3 radio cards) | builder | Not started | - | `tm:ui:design` | - |
| SET-3a.2 | PR3a, R-"master density" | Master Detailed/Compact via additive `tm:ui:view:_default` with set-vs-never-set reader; "Different on N screens" list with "Follow master"; all 18 keys folded | builder | Not started | - | `viewBar` in 18 screens | - |
| SET-3a.3 | PR3a | Reduce motion (Follow phone / Always reduce) | builder | Not started | - | CSS media query | - |
| SET-3a.4 | PR3a | Link rows for Horizon layout, Universe view, Habit grid; Habit grid read via `prefs` (same key `tm:ui:habitGrid`) | builder | Not started | `GRID_KEY` still raw localStorage (inventory problem 7) | Horizon, Universe, Habits | - |
| SET-3a.5 | PR3a, R3 | Reset look & layout (only look and view keys; one confirm line) | builder | Not started | - | - | - |
| SET-3a.T | PR3a tests | Old per-screen keys keep values; master never writes the 18 keys; on-screen bar equal to master clears override; reset touches only look/view keys | builder | Not started | - | - | - |
| SET-3b.1 | PR3b, §3.3 | `consentGate()` single component and single wording; replace all copies (first-run, Start real, entry forms, Deen place, import, Privacy) without changing wording | builder | Not started | consent copies still in `modeUi.ts`, `entry.ts`, `screens.ts`, Deen | D-B | - |
| SET-3b.2 | PR3b, §3.4 | Privacy page with live "Private by default" read-out (6 lines, computed, neutral colours) | builder | Not started | - | Status strip, connections flags | - |
| SET-3b.3 | PR3b | Lock-screen details x4 (Show asks one confirm line) | builder | Not started | exists on `/more` today | `tm:ui:notifyShow` | - |
| SET-3b.4 | PR3b | App lock set/timing/lock now/remove; forgot-PIN help line (15 min, never data) | builder | Not started | exists on `/more/data` today | lock screen | - |
| SET-3b.5 | PR3b, R4 | Withdraw consent v1 = `revokeConsent` only; page shows "Your N real entries are still on this phone" + link to Delete; Today card "Real data is paused" in real mode | builder | Not started | - | `guardWrite`, entry/capture/import/restore/prayer place | - |
| SET-3b.T | PR3b tests | Only one consent sentence in code; after withdraw all real write paths refuse (entry, capture, import, restore, prayer place); withdraw deletes nothing; read-out matches state in each combination; "no score/rank/streak" scan of Settings+Deen strings (§3.4) | builder | Not started | - | - | - |
| SET-3c.1 | PR3c | Demo or real: mode seg + gate; `/settings/data/start-real` full page (gate, "Save a demo copy first", confirm); DEMO banner button goes there | builder | Not started | - | banner, ask card | - |
| SET-3c.2 | PR3c, §3.2, R5 | `/settings/delete`: Delete demo (two-step, live count, demo copy first); Clear real (typed word + "I cannot type this" fallback, live count, backup link, PIN re-ask, calm copy, red only on final button); revokes consent; says no undo | builder | Not started | - | `scrubRealParts` | - |
| SET-3c.T | PR3c tests | Accepted words `delete`, `DELETE`, `ডিলিট`, `ডিলেট` with spaces/NFC variants; fallback works; no countdown; Clear real scrubs snapshots and revokes consent; demo two-step; nothing destructive on home | builder | Not started | - | - | - |
| SET-3d.1 | PR3d | Backup & export: move JSON, encrypted, snapshots (fold), CSV (fold "Spreadsheet copy"), storage persist, reminder; restore sub-page link `/settings/backup/restore` | builder | Not started | - | `/more/data` cards | - |
| SET-3d.2 | PR3d, R2 | Backup reminder one on/off here; Today card keeps "Later" + link; show computed default and reason | builder | Not started | duplicate exists today | `tm:ui:backupRemind` | - |
| SET-3d.3 | R9 | Note on Backup page: look/language settings not in backup file; backlog entry for optional prefs block | builder | Not started | - | DECISIONS_LOG backlog | - |
| SET-3d.T | PR3d tests | Reminder has one on/off; Today card has none; default and reason shown | builder | Not started | - | - | - |
| SET-3e.1 | PR3e | Prayer & alerts: method, Asr, offsets (fold), place (Private tag, gate for real), alerts, sound, volume, preview; notification permission state line; Deen tab keeps a link row | builder | Not started | - | Deen tab, `tm:ui:prayer*` | - |
| SET-3e.T | PR3e tests | Namespace-aware place; real place needs gate; Clear real wipes it; permission state for granted/denied/default | builder | Not started | - | - | - |
| SET-3f.1 | PR3f | Plan & progress: plan mode, progress weighting, stage names, automation rules (explanation moves from `/more/rules`) | builder | Not started | - | `/more/rules`, Journey, Today | - |
| SET-3f.2 | PR3f, §4 | Chips + links on Today, Journey, Diary Plan; "end pause" chip on Today; `/stuck` says "change back in Settings" | builder | Not started | - | `/stuck`, `overallProgressCard` x2 | - |
| SET-3f.T | PR3f tests | One control per key; `/stuck` still writes mode | builder | Not started | - | - | - |
| SET-3g.1 | PR3g | Connections page: fixed order Approve, Turn on, Key, Withdraw; computed "0 of 4 on. Nothing leaves this phone" | builder | Not started | - | `connectionsUi.ts`, Privacy read-out | - |
| SET-3g.T | PR3g tests | Existing connection tests migrated | builder | Not started | - | - | - |
| SET-3h.1 | PR3h | Guides & info list (Topics, Ready systems, Cards, Capability status, Field guide, Glossary, Data dictionary, Halal-check flags, Safety & limits, module status cards, disclaimers) + "Show the welcome again" (deletes nothing, says so) | builder | Not started | onboarding has no re-run entry (inventory row 74) | `tm:ui:onboard` | - |

### A4. PR 4 Redirects, test migration, what-moved note
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-4.01 | R7, §4 | `REDIRECTS` table in `render()` before route loop, `history.replaceState`, no second render; lock check stays first | builder | Not started | - | all `#/more*` links | - |
| SET-4.02 | R7 | Redirect map: `/more`, `/more/data`, `/more/connections`, `/more/rules`, DEMO banner Start real, Deen prayer link row, Today/Journey/Diary Plan chips, save-failed banner link to `/settings/backup` | builder | Not started | - | banner, Deen, Today, Journey, Diary | - |
| SET-4.03 | R7 | Remove `/more` screen; migrate ~21 test files (76 refs) by the mapping; remove `nav.more` | builder | Not started | 76 refs counted by judge | tests | - |
| SET-4.04 | R13 | "What moved" dismissible card on Today, key `tm:ui:movedNote`, gone after 1 tap or 14 days | builder | Not started | - | Today | - |
| SET-4.T1 | PR4 accept | All old routes end on right screen; Back does not loop; hash updated; full suite green; only content routes + 2 redirect tests still reference `#/more` | builder | Not started | - | - | - |
| SET-4.T2 | R7 | 2 explicit redirect tests | builder | Not started | - | - | - |

### A5. PR 5 Search
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-5.01 | PR5 | Magnifier field; case-insensitive search over registry labels+keywords (active language + English, Bangla normalisation); result = row + category chip to `/settings/<cat>/<row>`; empty state shows last 3 changed (localStorage, try/catch) | builder | Not started | - | registry | - |
| SET-5.T | PR5 accept | "dark", "অন্ধকার", "font", "pin", "backup" find the right row; every registry entry findable; works offline; usable at 200 % text; highlight respects reduced motion | builder | Not started | - | - | - |

### A6. PR 6 Polish and evidence
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-6.01 | R11 | Focus to new `h1` and `document.title` on route change only (not same-screen re-render, not first load); confirm steps focus heading, Cancel first, Esc closes | builder | Not started | - | `render()` all routes | - |
| SET-6.02 | R11 | Fix hard-coded `aria-label="Language"` in `langButtons()` (`modeUi.ts`) | builder | Not started | - | first-run, Quick card | - |
| SET-6.03 | PR6 | 44 px targets, 8 px gaps; switch rows 48 px with On/Off words | builder | Not started | - | all Settings | - |
| SET-6.04 | PR6 | `storage`-event refresh of consent and lock state across tabs | builder | Not started | - | Privacy, lock | - |
| SET-6.05 | R12 | `settings_i18n.test.ts`: every registry/screen key in en and bn; Mix non-empty; no swap-file "avoid" words; no "বিপদ"/"Danger"/score/rank/streak | builder | Not started | - | `copy_review`, `i18n_modes`, `latin_digits` | - |
| SET-6.06 | R10 | Settings home + Quick card + Look in main bundle; other pages via `viaLazy`; `precache.test.ts` extended; offline test opens every `/settings/*` route | builder | Not started | - | `tools/precache.ts`, `tests/lazy_screens.test.ts` | - |
| SET-6.07 | PR6 | Screenshots at 360 px and 200 % text, 3 languages, light/dark; also 4 looks per owner rule | builder | Not started | `tools/screenshots.mjs` exists | evidence/ | - |
| SET-6.08 | R14 | Register: map backup/restore (M20), consent (D-B), app lock, notifications/prayer, display/language/accessibility, offline; add Draft rows (settings registry, restore safety, typed-word guard, focus on route change); Change Log from artifacts only | builder | Not started | - | Register v2_1 copy | - |
| SET-6.09 | CLAUDE.md §3 DoD | Add the link-check test (every registry entry, every old key/label/route resolves; no orphan `#/more` for moved items; every Settings link target exists) | builder | Not started | none exists | whole Settings | - |

### A7. Rulings that imply extra work (not in PR bullets)
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-R.01 | R4/§7 | DECISIONS_LOG entry: Withdraw v1 = stop new real writes only; owner may later choose read-only/hidden | builder | Not started | no entry | Privacy | - |
| SET-R.02 | R9 | DECISIONS_LOG backlog entry: optional versioned prefs block in backups | builder | Not started | - | Backup | - |
| SET-R.03 | §1.4 | DECISIONS_LOG backlog: high contrast, week start, notification master switch (deliberately not now) | builder | Not started | - | - | - |
| SET-R.04 | §3.4 | Settings never reads/exports `tm:secret:*`; test it | builder | Not started | - | backups, registry | - |
| SET-R.05 | §3.3 | Test greps Settings and entry code for a second consent sentence | builder | Not started | - | consent | - |
| SET-R.06 | §1.4 | First-run language control uses the Quick-card component and gains Mix | builder | Not started | first-run still en/bn only | `firstRunScreen` | - |
| SET-R.07 | §1.4 | Prayer/place tagged Private with namespace shown | builder | Not started | - | 3e | - |
| SET-R.08 | §3.4 | Re-ask PIN before Restore, Start real, Delete demo, Clear real when lock on | builder | In progress | only Restore (uncommitted) | 3c | - |
| SET-R.09 | §3.5 | Undo map honoured (Look reset, CSV undo, Go back, etc.) and stated in UI | builder | Not started | - | all | - |
| SET-R.10 | §1.4 | Remove 3 duplicate controls: Overall weighting card on Today/Journey, backup-reminder checkbox, plan mode on Diary Plan become chip+link | builder | Not started | duplicates still present | 3d, 3f | - |
| SET-R.11 | §0 | Every one of the 73 inventory settings has a home and is reachable (see section F) | builder | Not started | - | registry | - |
| SET-R.O1 | §2 R5, §7 | Real Android Bangla-keyboard test of the typed word (G2 device test) | owner | Not started | - | 3c | - |
| SET-R.O2 | §7 | Bangla reviewer sign-off of new Settings strings (all marked "যাচাই হয়নি") | owner | Blocked | TM-TST-161 | 6.05 | - |

---

## B. `docs/TODO.md` blocks
All items below are ticked `[x]` in the file unless noted. Evidence is what TODO.md and DECISIONS_LOG state; this keeper spot-checked file existence only.

| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| TD-1.1 | TODO B1 | SMART funnel visual | builder | Built | `src/ui/smartFunnel.ts` | Plan | TS ? · LK ? |
| TD-1.2 | B1 | Home cards Tasks, Goal-steps, Saving | builder | Built | `src/ui/homeUi.ts` | Today | ? |
| TD-1.3 | B1 | Screenshots 360 px, dark, reduced motion, 4 Design versions | builder | Built | `tools/screenshots.mjs` | looks | ? |
| TD-1.4 | B1 **unticked** | Check Goal Universe, overall progress card, language icon in rendered UI | builder | Not started | `[ ]` in TODO.md line 11 | Universe, Today, top bar | - |
| TD-2.1 | B2 | Risk, Venture, Team, North Star, Flashcards, Prayer-place real-data forms with guards | builder | Built | `src/core/risk.ts`, `ventures.ts`, `team.ts`, `northStar.ts`, `entry.ts` | Diary, Deen | ? |
| TD-3.1 | B3 | Prayer method/offsets, Hanafi Asr | builder | Built | `src/core/prayerMethod.ts` | Deen (moves to Settings in 3e) | ? |
| TD-3.2 | B3 | Prayer notifications opt-in, azan toggle, one-tap mark with undo | builder | Built | `prayerAlerts.ts`, `prayerLog.ts` | Deen | ? |
| TD-3.3 | B3 | Deen = plans/reminders only (D-D open) | builder | Built | DECISIONS_LOG | Deen | ? |
| TD-4.1 | B4 | Goal progress manual/auto; "more tasks left?" prompt; per-goal; Unknown if no tasks | builder | Built | `src/core/overallProgress.ts` | Today, Journey, goal page | ? |
| TD-5.1 | B5 | Azan system (slot, check, volume, preview, offline, `docs/azan.md`) | builder | Built | `prayerSound.ts`, `public/audio/` | Deen | ? |
| TD-5.2 | B5 | Rule-based advice cards; wider offline knowledge; port slots for online suggest and free-cloud sync (off) | builder | Built | `advice.ts`, `ports.ts`, `sync.ts` | Today, Connections | ? |
| TD-6.1 | B6 | m-list-status fix, Register v2_1 refresh, owner-demand re-run, language-icon entry, a11y pass, security review | builder | Built | `docs/design/m-list-status.md`, `docs/register/` | docs | ? |
| TD-7.1 | B7 s1 | Detailed/Compact on 10 more screens | builder | Built | `src/ui/viewBar.ts`; will be reshaped by SET-3a | 18 view keys | ? |
| TD-7.2 | B7 s2 | Weekly review `#/journey/week` | builder | Built | `src/core/weeklyReview.ts`, `tests/weekly_review.test.ts` | Journey | ? |
| TD-7.3 | B7 s3 | Bundled SVG logo | builder | Built | `tests/logo3d.test.ts` | Today header | ? |
| TD-7.4 | B7 s4a-e | TM-REQ-015 feasibility; 005 runway; 040 override core; 007 freshness; 009 goal status | builder | Built | `planner.ts`, `override.ts`, `freshness.ts`, `goalStatus.ts` | Plan, Money, goal page | TS partial (TM-TST-005/007/040 Partial) |
| TD-7.5 | B7 s5 | CSV export (TM-REQ-153) | builder | Built | `src/core/csv.ts` | `/more/data` (moves 3d) | ? |
| TD-8.1 | B8 s1 | Register v2_1 regenerated | builder | Built | `docs/register/*v2_1*` | Register | - |
| TD-8.2 | B8 s2-s3 | Decision helper, ownership check, four legs, leak audit | builder | Built | `decisions.ts`, `legs.ts` | Journey | ? |
| TD-8.3 | B8 s4-s6 | Goal funnel hero + horizon arc; habit long view; CSV import + data dictionary | builder | Built | `horizonArt.ts`, `csvImport.ts` | Journey, Habits, `/more/data` | ? |
| TD-8.4 | B8 s7 **unticked** | TM-REQ-040 override screen: not built on purpose (needs block length + `task.manual_slot` migration) | builder | Blocked | DECISIONS_LOG Block 8 | Plan | needs owner/product input |
| TD-9.1 | B9 s1-s7 | Save-failed banner, storage persist, backup reminder default, PIN lock, at-rest design note, namespaced lists, record migration | builder | Built | `persist.ts`, `storageStatus.ts`, `appLock.ts`, `migrate.ts` | `/more/data` (moves to Settings) | ? |
| TD-10.1 | B10 s1-s6 | Docs refresh, onboarding, owner checklists, bundle split, BD pack draft + halal flags, Bangla review sheet | builder | Built | `onboarding.ts`, `lazy.ts`, `pack-009.json`, `halalFlags.ts` | Start, More | ? |
| TD-11.0 | TODO Block 11 | **Block 11 (Settings redesign) does not exist in `docs/TODO.md`**; must list PR1-PR6 (this tracker section A) | builder | Not started | `grep "Block 11" docs/TODO.md` = none | whole plan | see GAP-02 |
| TD-O.1 | TODO Part B | Phone offline test (O1) | owner | Not started | `docs/owner/PHONE_TEST_CHECKLIST.md` ready | offline claim | - |
| TD-O.2 | Part B | Lock-screen privacy check on a real device (O8) | owner | Not started | same checklist | notify.ts | - |
| TD-O.3 | Part B | Verify prayer times against official Bangladesh timetable | owner | Not started | `tools/prayer_reference.py` only | Deen | - |
| TD-O.4 | Part B | Bangla reviewer sign-off TM-TST-161 | owner | Not started | `docs/owner/BANGLA_REVIEW_SHEET.md` ready | all bn text | - |
| TD-O.5 | Part B | Look at 4 Design versions on phone, say which to keep | owner | Not started | - | Look page | - |
| TD-O.6 | Part B | Approvals closed: D-C (AI/online/cost), cloud sync, Google/Supabase keys, D-D (scripture), paid services | needs-approval | Blocked | CLAUDE.md §4 | Connections | - |

## C. Audit next-30-days plan (`docs/audit/FULL_AUDIT_2026-11-01.md` section 6)
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| AU-01 | audit W1-1 | Q1 save-failed, persist, reminder | builder | Built | Block 9 s1-3, commits `3a1a24e`.. `10e9e81` range | Banner, `/more/data` | TS Y · LK ? |
| AU-02 | W1-2 | Q4 namespaced lists | builder | Built | `34c6436`; `tests/lists_namespace.test.ts` | saved lists | TS Y |
| AU-03 | W1-3 | Q2 doc refresh + one Bangla "Where we are" page | builder | In progress | docs refreshed (`096fa17`); **Bangla "Where we are" page not found** | README, PLAN | partial, see GAP-09 |
| AU-04 | W1-4 | Q7 CI workflow (tsc, vitest, build, e2e) | builder | Not started | **no `.github/` dir** | repo | N |
| AU-05 | W1-4 | S6: stop tests writing into `evidence/` | builder | Not started | `tests/g1.test.ts:111` still writes `evidence/catalog-report.json`; file shows modified in `git status` | git hygiene (can be committed by accident) | N |
| AU-06 | W1-5 | Q6 owner phone checklist | builder / owner | Built (checklist) / owner run Not started | `docs/owner/PHONE_TEST_CHECKLIST.md`, `73e77e1` | owner | - |
| AU-07 | W2-6 | M12 `migrateRecord` + failed-migration test | builder | Built | `e5241d5`; `tests/schema_migration.test.ts` | Register TM-TST-089 | TS Y · Register ? |
| AU-08 | W2-7 | M11 PIN lock | builder | Built | `44090a6`; `tests/app_lock.test.ts` | Settings 3b | TS Y |
| AU-09 | W2-8 | Q3/P8 `public/_headers`, manifest, theme colour | builder | Not started | `public/_headers` absent | hosting day | N |
| AU-10 | W2-9 | M3 Capacitor test build (only if phone test fails closed-app alerts) | builder + owner | Blocked | waits for TD-O.1 result | alerts | - |
| AU-11 | W3-10 | M1 3-screen onboarding | builder | Built | `1d8a007`; `tests/onboarding.test.ts` | `#/start`; no re-run entry (SET-3h.1) | TS Y · LK partial |
| AU-12 | W3-11 | M8 Bangla sheet + **apply-back script** | builder / reviewer | In progress | sheet built (`57cdc50`); DECISIONS_LOG says apply-back script not done | TM-TST-161 | partial |
| AU-13 | W3-12 | P2 stale-while-revalidate shell cache | builder | Not started | `grep revalidate public/sw.js` = none | offline | N |
| AU-14 | W3-12 | M10 route splitting | builder | Built | `b5cb1f5`; `tests/lazy_screens.test.ts` | precache | TS Y |
| AU-15 | W3-13 | M4 Bangladesh starter pack | builder | Built | `e1c6f5c`; `tests/bd_pack.test.ts` | Topics | TS Y; reviewer pending |
| AU-16 | W4-14 | M9 usability kit; 5 sessions | builder / owner | Built (kit) / sessions Not started | `docs/owner/USABILITY_KIT.md` | TM-TST-010/066/067/171 | owner |
| AU-17 | W4-15 | M2 "welcome back" and monthly then-vs-now (no streaks) | builder | Not started | grep finds no such feature in `src/` | Today, Review | N |
| AU-18 | W4-16 | Re-run owner-demand audit + Register mapping; republish audit numbers | builder | In progress | `owner-demand-audit.md` last full re-check 31 Oct; Block 7-10 not re-audited (audit says 44-47 %) | Register Change Log | stale |
| AU-19 | W4-17 | Owner decision round: hosting (O4), D-D, D-C, cloud copy | needs-approval | Blocked | owner | Connections | - |
| AU-20 | audit 5.2 M5 | Halal-check flags (MR-31) | builder | Built | `src/library/halalFlags.ts` | More | scholar review owner |
| AU-21 | audit 5.2 M6 | Plan versions + "what changed" diff with max 3 options | builder | Not started | audit lists it, not in 30-day table | Plan | - |
| AU-22 | audit 5.2 M7 | Goal tree screen + backward-planning wizard | builder | Not started | not in 30-day table | Plan | - |
| AU-23 | audit 5.1 Q5 | Calmer colour for "please tick" prompts | builder | Not started | not in 30-day table, no evidence | forms | - |
| AU-24 | audit 5.3 B1-B8 | Big bets (AI, Google search, encrypted cloud, Deen content, public edition, staff edition, opportunity engine, pilot) | needs-approval | Blocked | D-C, D-D, G8 | - | - |
| AU-25 | audit 5.4 | Real-user testing sequence (owner 7 days on real data after Q1; then M9) | owner | Not started | - | Register | - |

## D. DECISIONS_LOG open items
| ID | Source | Step | Owner | Status | Evidence | Linked to |
|---|---|---|---|---|---|---|
| DL-01 | log L-?? (quotes, line 39) | Online quote source approval | needs-approval | Blocked | "Open for owner" | Today quote |
| DL-02 | Block 8 | TM-REQ-040 override screen (block length, `manual_slot` migration) | builder + owner input | Blocked | line ~462 | Plan |
| DL-03 | Block 9 s5 | At-rest encryption: owner decision (recommended: not yet) | owner | Blocked | `docs/design/at-rest-encryption.md` | Data |
| DL-04 | Block 10 | Not done: CI, AI/cloud/Capacitor/scripture, `screens.ts` split, apply-back script, catalog/glossary/library text in Bangla sheet | builder / owner | Not started | line 483 | see AU-04, AU-12 |
| DL-05 | Block 10 | BD pack facts need local reviewer | owner | Blocked | line 480 | pack-009 |
| DL-06 | Settings | **No Settings-redesign entry exists** (what/why/alternatives/undo) for the judge ruling or PR1 | builder | Not started | grep "Settings" finds only old entries | see SET-1.X1 |
| DL-07 | CLAUDE.md §4 | Withdraw v1 question to owner (read-only vs hidden), default "stop new writes only" | builder → owner | Not started | final §7 | Privacy |

## E. Owner-only tasks (consolidated)
TD-O.1 phone offline test · TD-O.2 lock-screen check · TD-O.3 prayer times vs timetable · TD-O.4 Bangla reviewer · TD-O.5 pick design · SET-R.O1 Bangla keyboard typed-word test · AU-16 usability sessions · AU-25 7-day real use · AU-19 decision round · DL-03 at-rest encryption · DL-05 BD pack reviewer · AU-20 scholar review of halal flags · hosting account (O4).

## F. Settings inventory coverage (`settings-inventory.md`, 73 rows) -> planned home (final §1.4) and tracker row
Every inventory row has a planned home in the judge's table, so none is orphaned on paper. Nothing is built yet (all rows reachable only via old `/more*`, `/deen`, `/diary/plan`, `/journey` paths). Check each when its row is Built.

| Inventory rows | Home | Tracker row | Reachable via new route today |
|---|---|---|---|
| 1, 2, 4 Language, Theme, Text size | Settings home Quick card | SET-2.03 | N |
| 3 Design version | `/settings/look` | SET-3a.1 | N |
| 5-8 Lock-screen details | `/settings/privacy` | SET-3b.3 | N |
| 9 Data mode | `/settings/data` | SET-3c.1 | N |
| 10 Consent | `/settings/privacy` + gate | SET-3b.1, 3b.5 | N |
| 11 Start real | `/settings/data/start-real` | SET-3c.1 | N |
| 12 Keep demo | daily ask card (stays) | - | Y (unchanged) |
| 13, 14 Delete demo, Clear real | `/settings/delete` | SET-3c.2 | N |
| 15 Storage persist | `/settings/backup` | SET-3d.1 | N |
| 16-20 App lock | `/settings/privacy` (20 stays on lock screen) | SET-3b.4 | N |
| 21-25 CSV | `/settings/backup` fold | SET-3d.1 | N |
| 26, 28 Save JSON / encrypted | `/settings/backup` | SET-3d.1, 1.06 | N |
| 27, 29, 36, 37 Restores | `/settings/backup/restore` | SET-1.03-1.05, 3d.1 | N (old path only, new safe flow in progress) |
| 30, 31, 34, 35 Snapshots | `/settings/backup` fold | SET-3d.1 | N |
| 32 Backup reminder | `/settings/backup` | SET-3d.2 | N |
| 33 Remind tomorrow | Today card (stays) | - | Y |
| 38-41 Connections x4 | `/settings/connections` | SET-3g.1 | N |
| 42-45 Rules x4 | `/settings/plan/automation` | SET-3f.1 | N |
| 46-48 Plan mode, Stage names, Progress weighting | `/settings/plan` | SET-3f.1-3f.2 | N |
| 49-51 Horizon, Universe, Habit grid | stay on screens + link rows in Look | SET-3a.4 | Y on screen |
| 52-60 (18 view keys) | `/settings/look` master | SET-3a.2 | N |
| 61-64 Prayer method, Asr, offsets, reset | `/settings/prayer` | SET-3e.1 | N |
| 65, 66 Place, Use Dhaka | `/settings/prayer` | SET-3e.1 | N |
| 67-73 Alerts, Azan, sound, volume, preview | `/settings/prayer` | SET-3e.1 | N |
| 74 Welcome again | `/settings/about` | SET-3h.1 | N |
| 75 Topic drawer | top bar (not a setting) | - | Y |
| new: Reduce motion; Reset look; Private-by-default read-out; Withdraw | Look / Privacy | SET-3a.3, 3a.5, 3b.2, 3b.5 | N |

---

## G. Gaps and risks (check #1, 2 Nov 2026 11:43 UTC)

**Missing from the build agent's work / not tracked in any build list**
- GAP-01 No link-check test exists anywhere (CLAUDE.md §3 requires one). Without it no row can reach Built+Linked+Tested. Planned only as SET-6.09, which is too late: write the registry/route link-check in PR2 and extend it every PR.
- GAP-02 `docs/TODO.md` has no Block 11. The Settings plan lives only in `settings-final-decision.md`; the work can be lost between sessions. Add Block 11 with PR1-PR6.
- GAP-03 `DECISIONS_LOG.md` has no Settings entry (no undo steps for PR1a). Required by "Every PR" rule.
- GAP-04 Audit items not in the 30-day table but still unbuilt: M2 welcome-back / then-vs-now (AU-17), M6 plan diff (AU-21), M7 goal tree + wizard (AU-22), Q5 calmer prompt colour (AU-23).
- GAP-05 Audit week 1-2 items still not done: CI (AU-04), `evidence/` churn (AU-05), `_headers` (AU-09), stale-while-revalidate (AU-13), Bangla "Where we are" page (AU-03), apply-back script (AU-12), owner-demand audit refresh (AU-18).
- GAP-06 TODO line 11 (Block 1: check Goal Universe, overall card, language icon) still unticked since 26 Oct (TD-1.4).

**Built but not linked / partial (PR1 right now, uncommitted)**
- GAP-07 `restoreUi.ts` "Open the real-data permission" links to `#/more/data`. When `/more/data` is split (3c/3d) and redirected (PR4), this link must go to `/settings/privacy`. Add to the link-check.
- GAP-08 PR1 UI is wired in 3 screens but has no UI test yet: confirm text with both numbers, cancel, PIN re-ask, blocked-real message, Go back button (SET-1.T4, T5, T9). Core tests (8 of 9 acceptance items) pass in `tests/restore_safety.test.ts` per file contents; this keeper did not run them.
- GAP-09 "Contains: ..." keys exist but no screen uses them yet (SET-1.06); "Real data backup: none yet" status line and "I wrote the passphrase down" tick have no code (SET-1.07, 1.08).
- GAP-10 `src/modules/evidence.ts` M20 still lists `restoreBackup` and route `#/more/data`; update to `restore.ts` and new routes, otherwise evidence links go stale.
- GAP-11 Uncommitted changes in the shared checkout (`src/i18n/packs.ts`, `src/ui/*`, `evidence/catalog-report.json`). The `evidence/catalog-report.json` churn is a test side effect; it must not be committed (TODO.md rule "revert evidence/ churn").

**Duplicated controls that the plan removes (must be removed, not just copied)**
- GAP-12 Language (globe + `/more` + first-run), consent wording (5+ copies), progress weighting (Today + Journey), backup-reminder switch (`/more/data` + Today), plan mode (Diary Plan + `/stuck`), CSV/save buttons. Each needs a "no second control" assertion (registry test SET-2.T1, SET-3d.T, SET-3f.T).

**Orphan risks when routes move (PR4)**
- GAP-13 76 `#/more...` references in ~21 test files; `src/modules/evidence.ts` route lists; `docs/` and the owner checklists (`PHONE_TEST_CHECKLIST.md`, `USABILITY_KIT.md`, `docs/design/*`) name "More > Data". Update docs and in-app help text in PR4, and the Bangla review sheet regenerates.
- GAP-14 `nav.more` and `more.*` i18n keys, "More" label in owner docs, and `src/ui/state.ts` references must be deleted or left as intentionally-kept (the link-check should list kept ones).
- GAP-15 Habit grid still uses raw `localStorage` (`GRID_KEY`); the registry test will fail until it goes through `prefs` (SET-3a.4).

**Other risks**
- GAP-16 "Both parallel" 3e-3h require 3b first; `consentGate()` (3b) touches first-run, entry forms, Deen: highest D-B risk; needs the every-real-write-path-refuses test before merge.
- GAP-17 Four looks rule: no Settings row defines a 4-looks screenshot check except SET-6.07; PR2 acceptance only checks 360 px. Add 4 looks to each PR screenshot step.
- GAP-18 Register: no "Draft" rows added yet for the new requirements (SET-6.08); evidence only counts when a test file is linked.

## O. Build-completeness order (owner approved 2 Nov 2026; audit `docs/audit/BUILD_COMPLETENESS_2026-11-02.md`)
| ID | Step | Owner | Status | Evidence | DoD |
|---|---|---|---|---|---|
| BC-1.1 | Capability card = six build boxes + computed label; separate per-device data status | builder | Built+Linked+Tested | `src/modules/capability.ts`, `dataStatus.ts`, `src/ui/capabilityUi.ts`; `tests/m_list_status.test.ts`, `tests/g1.test.ts` | UI Y · LK Y (status page and journey/diary/deen tabs) · DR Y · L3 Y · TS Y |
| BC-1.2 | Test that finds stored-but-never-shown and never-typable fields | builder | Built+Linked+Tested | `tests/field_reach.test.ts` (known lists DEAD / NO_INPUT only shrink) | TS Y |
| BC-1.3 | Repo-wide link check (all routes, en/bn/mix, literal addresses, orphans) | builder | Built+Linked+Tested | `tests/link_check.test.ts`; closes GAP-01 | TS Y |
| BC-1.4 | Dead code removed: goals.ts, override.ts, sync.ts, onlineAdvice.ts | builder | Built | DECISIONS_LOG 2 Nov 2026 | - |
| BC-1.5 | Broken `#/more/topics` link on Flashcards | builder | Built+Linked+Tested | `src/ui/screens.ts`, `tests/link_check.test.ts` | LK Y · TS Y |
| BC-2 | M16 KPI targets (form, storage, calc, weekly/90-day review, report, Today, Journey) | builder | Built+Linked+Tested | `src/core/kpi.ts`, `src/ui/kpiUi.ts`, `src/ui/planScreens.ts#kpiScreen`, route `#/journey/kpi`; `tests/kpi.test.ts`, `tests/link_check.test.ts`, e2e KPI cold-start check | UI Y · LK Y · DR Y · L3 Y · OFF Y · TS Y (4L not re-run) |
| BC-3 | M09 venture value, your share, income/expense per venture, portfolio totals (venture page, Money picker, Today, report) | builder | Built+Linked+Tested | `src/core/ventures.ts`, `src/ui/ventureCard.ts`, `src/ui/planScreens.ts#ventureScreen`, `src/ui/screens.ts#moneyScreen`; `tests/venture_value.test.ts`, `tests/link_check.test.ts`, `tests/field_reach.test.ts` | UI Y · LK Y · DR Y · L3 Y · OFF Y · TS Y (4L not re-run; unit economics still missing) |

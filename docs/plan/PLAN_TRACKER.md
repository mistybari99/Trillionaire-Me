# PLAN TRACKER (master list of every planned step)

Keeper: plan-keeper agent. Last check: 3 Nov 2026 00:15 UTC (check #2, see `PLAN_CHECK_LOG.md`). Branch `ccr-8b686ba2-vitt45`, HEAD `045f1d4`.

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
| SET-1.01 | final §5 PR1, §3.1 | `restoreBackupAtomic`, `planRestore`, `goBack` in core; no clear-before-write | builder | Built+Linked+Tested | c9fbaac + 1ea7c87; tests/restore_safety.test.ts, tests/restore_ui.test.ts | JSON/encrypted/snapshot restore, Go back | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.02 | §3.1 step 4 | "Before restore" snapshot, kept 7 days, outside keep-N, scrubbed on Clear real | builder | Built+Linked+Tested | c9fbaac + 1ea7c87; tests/restore_safety.test.ts, tests/restore_ui.test.ts | Snapshots list, Clear real, Go back | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.03 | §5 PR1 | Wire existing JSON restore button to new flow | builder | Built+Linked+Tested | 1ea7c87; tests/restore_ui.test.ts (preview both numbers, Go back, PIN re-ask, Contains labels) | `/more/data` Backup section | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.04 | §5 PR1 | Wire encrypted restore (passphrase first, then same preview; passphrase not stored) | builder | Built+Linked+Tested | 1ea7c87; tests/enc_backup_ui.test.ts | `/more/data` encrypted card | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.05 | §5 PR1 | Wire snapshot restore and snapshot load-from-file | builder | Built | 1ea7c87 snapshots wired; no snapshot-specific UI test found (restore_ui covers json) | Snapshots card | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS N |
| SET-1.06 | §5 PR1, §3.1 | Label Save buttons "Contains: ..." (JSON = demo only, encrypted = demo and real) | builder | Built+Linked+Tested | 1ea7c87; tests/restore_ui.test.ts (preview both numbers, Go back, PIN re-ask, Contains labels) | Backup cards | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.07 | §3.1 | Status line "Real data backup: none yet / last on <date>" | builder | Built+Linked+Tested | 38cd450; tests/backup_page.test.ts (status lines, wrote-it-down tick) | Backup page, Clear real "save a backup first" link | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.08 | §3.1 | Encrypted save asks "I wrote the passphrase down" tick | builder | Built+Linked+Tested | 38cd450; tests/backup_page.test.ts (status lines, wrote-it-down tick) | Encrypted backup card | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.09 | §3.1 step 3 | PIN re-ask before restore when lock is on | builder | Built+Linked+Tested | 1ea7c87; tests/restore_ui.test.ts (preview both numbers, Go back, PIN re-ask, Contains labels) | Restore | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.10 | §3.1 step 6-7 | Confirm text names both numbers; Cancel default focus; result card with Go back | builder | Built+Linked+Tested | 1ea7c87; tests/restore_ui.test.ts (preview both numbers, Go back, PIN re-ask, Contains labels) | Restore | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.11 | §3.1 step 2 | Real file + consent off: stop with message and gate link, nothing written | builder | Built+Linked+Tested | 1ea7c87 + 38cd450; restoreUi no longer links #/more/data; link_check.test.ts | Restore, Privacy | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T1 | §5 PR1 test | Failing `put` mid-restore keeps originals, reports "Nothing was changed" | builder | Built+Linked+Tested | tests/restore_safety.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T2 | PR1 test | Real file with consent off writes nothing | builder | Built+Linked+Tested | tests/restore_safety.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T3 | PR1 test | Preview counts equal file and phone | builder | Built+Linked+Tested | tests/restore_safety.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T4 | PR1 test | Confirm text contains both numbers | builder | Built+Linked+Tested | tests/restore_ui.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T5 | PR1 test | Cancel changes nothing | builder | Built+Linked+Tested | tests/settings_gaps.test.ts (Cancel by name, default focus, nothing changes) | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS N |
| SET-1.T6 | PR1 test | Go back restores previous records | builder | Built+Linked+Tested | tests/restore_safety.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T7 | PR1 test | `scrubRealParts` removes pre-restore real copy | builder | Built+Linked+Tested | tests/restore_safety.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T8 | PR1 test | Corrupt / newer-schema file rejected before touching anything | builder | Built+Linked+Tested | tests/restore_safety.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.T9 | PR1 test | App lock on asks PIN | builder | Built+Linked+Tested | tests/restore_ui.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.X1 | §5 "Every PR" | PR1 housekeeping: lint/test/build green, 360 px screenshot, DECISIONS_LOG entry with undo, Register Change Log line | builder | Built | DECISIONS_LOG Settings entries (lines ~486-496); screenshots 508dc80; Register mapping in 06f6c18 | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-1.X2 | §6 risk | Keep old `restoreBackup` as validator only; remove direct `clear`+`put` path from UI | builder | Built+Linked+Tested | no UI path calls clear+put; replaceNamespace rollback | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |

### A2. PR 2 Shell, registry, tab rename (§1.1, §1.2, §5 PR2)
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-2.01 | §5 PR2 | `settingsRegistry.ts` (id, category, row, labels en/bn/mix, keywords, storage key, namespace, computed-default reason) | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | Search, status strip, redirects, link-check | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.02 | R6, §4 | Route family `^/settings(?:/([a-z]+))?(?:/([a-z-]+))?$`; unknown row id still renders; known row scrolls + highlights once (no pulse under reduced motion) | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | All Settings links | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.03 | §1.2 | Settings home: `h1`, always-visible magnifier button, Quick card (Language, Theme, Text size; moved from `more()`), status strip, 8 category cards, "Guides & info" row, nothing destructive on home | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | Tab bar, globe, search | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.04 | §1.1 | Rename 5th tab More to Settings (gear icon, `nav.settings`, keep `nav.more` until PR4), EN Settings / BN সেটিংস / Mix Settings | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | Tab bar, tests asserting tab highlight | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.05 | §5 PR2 | Content routes tagged tab `settings` | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | Topics, status, fields, glossary, safety, dictionary, library, halal-flags, cards | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.06 | R8, §1.2 | Compact one-line DEMO banner on `/settings*`; hide "delete demo?" ask card and backup reminder card there; prayer reminders stay | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | `demoPanels()`, Today cards | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.07 | §1.3 | 8 category stub pages linking to existing screens (order: look, prayer, backup, privacy, data, plan, connections, delete) + about | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | PR3 | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.08 | §1.3 | Category names checked against `bangla-loanword-swaps.md`; add new words (এক্সপোর্ট, রিয়েল) if absent; no "Danger/বিপদ" | builder | Built+Linked+Tested | 06f6c18; tests/settings_a11y_i18n.test.ts wording test | swap file, copy_review | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.T1 | PR2 accept | Registry test: every `prefs` key and every inventory row appears exactly once; no control outside documented exceptions (globe, per-screen view bars, rows 49-51) | builder | Built+Linked+Tested | tests/settings_shell.test.ts (prefs owned once, storage keys have a row, locked deep link) | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.T2 | PR2 accept | Tab bar at 360 px and 200 % text: no clipping, no horizontal scroll | builder | Built+Linked+Tested | e2e SET-200 (tools/e2e.mjs, 06f6c18) | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.T3 | PR2 accept | Quick card visible without scrolling in demo mode at 360 px | builder | Built | status strip/quick card tested; 'visible without scrolling at 360 px in demo' not asserted (screenshots 508dc80 only) | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS N |
| SET-2.T4 | PR2 accept, §3.4 | Locked deep link ends on lock screen and returns to same route after unlock | builder | Built+Linked+Tested | tests/settings_shell.test.ts (prefs owned once, storage keys have a row, locked deep link) | `isLocked()` first in `render()` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-2.T5 | PR2 accept | Unknown row id still renders | builder | Built+Linked+Tested | d5927fb; src/ui/settingsRegistry.ts, settingsUi.ts; tests/settings_shell.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |

### A3. PR 3 Categories
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-3a.1 | §5 PR3a | Look: Design version (3 radio cards) | builder | Built+Linked+Tested | 758a36e; src/ui/lookUi.ts; tests/look_page.test.ts (10 tests) | `tm:ui:design` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3a.2 | PR3a, R-"master density" | Master Detailed/Compact via additive `tm:ui:view:_default` with set-vs-never-set reader; "Different on N screens" list with "Follow master"; all 18 keys folded | builder | Built+Linked+Tested | 758a36e; src/ui/lookUi.ts; tests/look_page.test.ts (10 tests) | `viewBar` in 18 screens | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3a.3 | PR3a | Reduce motion (Follow phone / Always reduce) | builder | Built+Linked+Tested | 758a36e; src/ui/lookUi.ts; tests/look_page.test.ts (10 tests) | CSS media query | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3a.4 | PR3a | Link rows for Horizon layout, Universe view, Habit grid; Habit grid read via `prefs` (same key `tm:ui:habitGrid`) | builder | Built+Linked+Tested | 758a36e; src/ui/lookUi.ts; tests/look_page.test.ts (10 tests) | Horizon, Universe, Habits | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3a.5 | PR3a, R3 | Reset look & layout (only look and view keys; one confirm line) | builder | Built+Linked+Tested | 758a36e; src/ui/lookUi.ts; tests/look_page.test.ts (10 tests) | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3a.T | PR3a tests | Old per-screen keys keep values; master never writes the 18 keys; on-screen bar equal to master clears override; reset touches only look/view keys | builder | Built+Linked+Tested | 758a36e; src/ui/lookUi.ts; tests/look_page.test.ts (10 tests) | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3b.1 | PR3b, §3.3 | `consentGate()` single component and single wording; replace all copies (first-run, Start real, entry forms, Deen place, import, Privacy) without changing wording | builder | Built+Linked+Tested | d85acc4; src/ui/consentGate.ts, privacyUi.ts; tests/privacy_page.test.ts | D-B | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3b.2 | PR3b, §3.4 | Privacy page with live "Private by default" read-out (6 lines, computed, neutral colours) | builder | Built+Linked+Tested | d85acc4; src/ui/consentGate.ts, privacyUi.ts; tests/privacy_page.test.ts | Status strip, connections flags | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3b.3 | PR3b | Lock-screen details x4 (Show asks one confirm line) | builder | Built+Linked+Tested | d85acc4; src/ui/consentGate.ts, privacyUi.ts; tests/privacy_page.test.ts | `tm:ui:notifyShow` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3b.4 | PR3b | App lock set/timing/lock now/remove; forgot-PIN help line (15 min, never data) | builder | Built+Linked+Tested | d85acc4; src/ui/consentGate.ts, privacyUi.ts; tests/privacy_page.test.ts | lock screen | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3b.5 | PR3b, R4 | Withdraw consent v1 = `revokeConsent` only; page shows "Your N real entries are still on this phone" + link to Delete; Today card "Real data is paused" in real mode | builder | Built | d85acc4 + privacy test 'revokes only the permission...' (writes and imports refused, Today paused card) | `guardWrite`, entry/capture/import/restore/prayer place | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3b.T | PR3b tests | Only one consent sentence in code; after withdraw all real write paths refuse (entry, capture, import, restore, prayer place); withdraw deletes nothing; read-out matches state in each combination; "no score/rank/streak" scan of Settings+Deen strings (§3.4) | builder | Built+Linked+Tested | tests/settings_gaps.test.ts: refusal on store, entry, app-made, restore, CSV import, prayer place after Withdraw; wording scan over all en/bn/mix keys; one consent wording incl. first-run and Start-real | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS N |
| SET-3c.1 | PR3c | Demo or real: mode seg + gate; `/settings/data/start-real` full page (gate, "Save a demo copy first", confirm); DEMO banner button goes there | builder | Built+Linked+Tested | 04ba4ab; src/ui/dataUi.ts; tests/data_page.test.ts | banner, ask card | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3c.2 | PR3c, §3.2, R5 | `/settings/delete`: Delete demo (two-step, live count, demo copy first); Clear real (typed word + "I cannot type this" fallback, live count, backup link, PIN re-ask, calm copy, red only on final button); revokes consent; says no undo | builder | Built+Linked+Tested | 83fb96b; src/core/typedConfirm.ts, deleteUi.ts; tests/delete_page.test.ts | `scrubRealParts` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3c.T | PR3c tests | Accepted words `delete`, `DELETE`, `ডিলিট`, `ডিলেট` with spaces/NFC variants; fallback works; no countdown; Clear real scrubs snapshots and revokes consent; demo two-step; nothing destructive on home | builder | Built+Linked+Tested | 83fb96b; src/core/typedConfirm.ts, deleteUi.ts; tests/delete_page.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3d.1 | PR3d | Backup & export: move JSON, encrypted, snapshots (fold), CSV (fold "Spreadsheet copy"), storage persist, reminder; restore sub-page link `/settings/backup/restore` | builder | Built+Linked+Tested | 38cd450; src/ui/backupUi.ts; tests/backup_page.test.ts | `/more/data` cards | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3d.2 | PR3d, R2 | Backup reminder one on/off here; Today card keeps "Later" + link; show computed default and reason | builder | Built+Linked+Tested | 38cd450; src/ui/backupUi.ts; tests/backup_page.test.ts | `tm:ui:backupRemind` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3d.3 | R9 | Note on Backup page: look/language settings not in backup file; backlog entry for optional prefs block | builder | Built+Linked+Tested | 38cd450; src/ui/backupUi.ts; tests/backup_page.test.ts | DECISIONS_LOG backlog | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3d.T | PR3d tests | Reminder has one on/off; Today card has none; default and reason shown | builder | Built+Linked+Tested | 38cd450; src/ui/backupUi.ts; tests/backup_page.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3e.1 | PR3e | Prayer & alerts: method, Asr, offsets (fold), place (Private tag, gate for real), alerts, sound, volume, preview; notification permission state line; Deen tab keeps a link row | builder | Built+Linked+Tested | 294a784; tests/prayer_page.test.ts | Deen tab, `tm:ui:prayer*` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3e.T | PR3e tests | Namespace-aware place; real place needs gate; Clear real wipes it; permission state for granted/denied/default | builder | Built+Linked+Tested | 294a784; tests/prayer_page.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3f.1 | PR3f | Plan & progress: plan mode, progress weighting, stage names, automation rules (explanation moves from `/more/rules`) | builder | Built+Linked+Tested | 4021706; tests/plan_settings.test.ts | `/more/rules`, Journey, Today | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3f.2 | PR3f, §4 | Chips + links on Today, Journey, Diary Plan; "end pause" chip on Today; `/stuck` says "change back in Settings" | builder | Built+Linked+Tested | 4021706; tests/plan_settings.test.ts | `/stuck`, `overallProgressCard` x2 | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3f.T | PR3f tests | One control per key; `/stuck` still writes mode | builder | Built+Linked+Tested | 4021706; tests/plan_settings.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3g.1 | PR3g | Connections page: fixed order Approve, Turn on, Key, Withdraw; computed "0 of 4 on. Nothing leaves this phone" | builder | Built+Linked+Tested | 65d1811; tests/connections_page.test.ts | `connectionsUi.ts`, Privacy read-out | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3g.T | PR3g tests | Existing connection tests migrated | builder | Built+Linked+Tested | 65d1811; tests/connections_page.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-3h.1 | PR3h | Guides & info list (Topics, Ready systems, Cards, Capability status, Field guide, Glossary, Data dictionary, Halal-check flags, Safety & limits, module status cards, disclaimers) + "Show the welcome again" (deletes nothing, says so) | builder | Built+Linked+Tested | PR3h in Block 11; tests/settings_shell.test.ts 'welcome replay deletes nothing' | `tm:ui:onboard` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |

### A4. PR 4 Redirects, test migration, what-moved note
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-4.01 | R7, §4 | `REDIRECTS` table in `render()` before route loop, `history.replaceState`, no second render; lock check stays first | builder | Built+Linked+Tested | 216fe50; src/app.ts REDIRECTS (4 entries); tests/settings_redirects.test.ts | all `#/more*` links | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-4.02 | R7 | Redirect map: `/more`, `/more/data`, `/more/connections`, `/more/rules`, DEMO banner Start real, Deen prayer link row, Today/Journey/Diary Plan chips, save-failed banner link to `/settings/backup` | builder | Built+Linked+Tested | 216fe50; src/app.ts REDIRECTS (4 entries); tests/settings_redirects.test.ts | banner, Deen, Today, Journey, Diary | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-4.03 | R7 | Remove `/more` screen; migrate ~21 test files (76 refs) by the mapping; remove `nav.more` | builder | Built+Linked+Tested | 216fe50; src/app.ts REDIRECTS (4 entries); tests/settings_redirects.test.ts | tests | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-4.04 | R13 | "What moved" dismissible card on Today, key `tm:ui:movedNote`, gone after 1 tap or 14 days | builder | Built+Linked+Tested | 216fe50; src/app.ts REDIRECTS (4 entries); tests/settings_redirects.test.ts | Today | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-4.T1 | PR4 accept | All old routes end on right screen; Back does not loop; hash updated; full suite green; only content routes + 2 redirect tests still reference `#/more` | builder | Built+Linked+Tested | 216fe50; src/app.ts REDIRECTS (4 entries); tests/settings_redirects.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-4.T2 | R7 | 2 explicit redirect tests | builder | Built+Linked+Tested | 216fe50; src/app.ts REDIRECTS (4 entries); tests/settings_redirects.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |

### A5. PR 5 Search
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-5.01 | PR5 | Magnifier field; case-insensitive search over registry labels+keywords (active language + English, Bangla normalisation); result = row + category chip to `/settings/<cat>/<row>`; empty state shows last 3 changed (localStorage, try/catch) | builder | Built+Linked+Tested | 39a87f8; src/ui/settingsSearch.ts; tests/settings_search.test.ts | registry | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-5.T | PR5 accept | "dark", "অন্ধকার", "font", "pin", "backup" find the right row; every registry entry findable; works offline; usable at 200 % text; highlight respects reduced motion | builder | Built+Linked+Tested | 39a87f8; src/ui/settingsSearch.ts; tests/settings_search.test.ts | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |

### A6. PR 6 Polish and evidence
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-6.01 | R11 | Focus to new `h1` and `document.title` on route change only (not same-screen re-render, not first load); confirm steps focus heading, Cancel first, Esc closes | builder | Built+Linked+Tested | 06f6c18; tests/settings_a11y_i18n.test.ts | `render()` all routes | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-6.02 | R11 | Fix hard-coded `aria-label="Language"` in `langButtons()` (`modeUi.ts`) | builder | Built+Linked+Tested | 06f6c18; tests/settings_a11y_i18n.test.ts | first-run, Quick card | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-6.03 | PR6 | 44 px targets, 8 px gaps; switch rows 48 px with On/Off words | builder | Built+Linked+Tested | tests/settings_gaps.test.ts: CSS floors 44/48 and inline-height scan on 12 Settings routes x en/bn (jsdom cannot measure layout) | all Settings | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS N |
| SET-6.04 | PR6 | `storage`-event refresh of consent and lock state across tabs | builder | Built+Linked+Tested | src/ui/crossTab.ts, wired in main.ts; tests/settings_gaps.test.ts (storage event redraws consent and lock, writes nothing) | Privacy, lock | - |
| SET-6.05 | R12 | `settings_i18n.test.ts`: every registry/screen key in en and bn; Mix non-empty; no swap-file "avoid" words; no "বিপদ"/"Danger"/score/rank/streak | builder | Built+Linked+Tested | 06f6c18; tests/settings_a11y_i18n.test.ts | `copy_review`, `i18n_modes`, `latin_digits` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-6.06 | R10 | Settings home + Quick card + Look in main bundle; other pages via `viaLazy`; `precache.test.ts` extended; offline test opens every `/settings/*` route | builder | Built | e2e SET-OFFLINE (06f6c18); tests/precache.test.ts; per-chunk precache assertion not confirmed | `tools/precache.ts`, `tests/lazy_screens.test.ts` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-6.07 | PR6 | Screenshots at 360 px and 200 % text, 3 languages, light/dark; also 4 looks per owner rule | builder | Built | 508dc80: 12 routes x 2 languages at 360 px; NOT 200 % text x mix x dark x 4 looks | evidence/ | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS N |
| SET-6.08 | R14 | Register: map backup/restore (M20), consent (D-B), app lock, notifications/prayer, display/language/accessibility, offline; add Draft rows (settings registry, restore safety, typed-word guard, focus on route change); Change Log from artifacts only | builder | Built | 06f6c18 Register mapping (traceability + Change Log); Draft rows for new requirements not confirmed | Register v2_1 copy | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-6.09 | CLAUDE.md §3 DoD | Add the link-check test (every registry entry, every old key/label/route resolves; no orphan `#/more` for moved items; every Settings link target exists) | builder | Built+Linked+Tested | 244d6f8; tests/link_check.test.ts (3 tests), tests/field_reach.test.ts, settings_shell link tests | whole Settings | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |

### A7. Rulings that imply extra work (not in PR bullets)
| ID | Source | Step | Owner | Status | Evidence | Linked to | DoD |
|---|---|---|---|---|---|---|---|
| SET-R.01 | R4/§7 | DECISIONS_LOG entry: Withdraw v1 = stop new real writes only; owner may later choose read-only/hidden | builder | Built | DECISIONS_LOG PR3b entry (Withdraw v1 default) | Privacy | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.02 | R9 | DECISIONS_LOG backlog entry: optional versioned prefs block in backups | builder | Built | DECISIONS_LOG line ~496 'not done on purpose' list; backlog of optional prefs block not seen | Backup | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.03 | §1.4 | DECISIONS_LOG backlog: high contrast, week start, notification master switch (deliberately not now) | builder | Built | DECISIONS_LOG line ~496 'not done on purpose' list; backlog of optional prefs block not seen | - | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.04 | §3.4 | Settings never reads/exports `tm:secret:*`; test it | builder | Built+Linked+Tested | tests/privacy_page.test.ts 'never reads or shows the PIN data'; settings_shell storage-key test | backups, registry | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.05 | §3.3 | Test greps Settings and entry code for a second consent sentence | builder | Built+Linked+Tested | tests/privacy_page.test.ts 'consent sentence exists once'. Note: first-run/Start-real keep own tick wording (DECISIONS_LOG PR3b) - differs from §3.3, logged | consent | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.06 | §1.4 | First-run language control uses the Quick-card component and gains Mix | builder | Built | registry row 'language'; first-run Mix not re-verified | `firstRunScreen` | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS ? |
| SET-R.07 | §1.4 | Prayer/place tagged Private with namespace shown | builder | Built | tests/prayer_page.test.ts namespace tag | 3e | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.08 | §3.4 | Re-ask PIN before Restore, Start real, Delete demo, Clear real when lock on | builder | Built+Linked+Tested | restore_ui + delete_page tests (PIN re-ask); Start real PIN re-ask not confirmed | 3c | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.09 | §3.5 | Undo map honoured (Look reset, CSV undo, Go back, etc.) and stated in UI | builder | Built | undo lines per page; no single undo-map test | all | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS N |
| SET-R.10 | §1.4 | Remove 3 duplicate controls: Overall weighting card on Today/Journey, backup-reminder checkbox, plan mode on Diary Plan become chip+link | builder | Built+Linked+Tested | chips+links on Today/Journey/Diary plan (4021706); reminder single switch (38cd450); tests plan_settings, backup_page | 3d, 3f | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
| SET-R.11 | §0 | Every one of the 73 inventory settings has a home and is reachable (see section F) | builder | Built+Linked+Tested | tests/settings_shell.test.ts: every prefs field and storage key owned by one row; registry 29 rows + 9 guides | registry | UI Y · LK Y · L3 Y · 4L ? · OFF Y · TS Y |
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
| TD-11.0 | TODO Block 11 | Block 11 (Settings redesign) listed in `docs/TODO.md` with PR1-PR6 | builder | Built+Linked+Tested | `docs/TODO.md` lines 84-98 (check #2); Block 12 also added (line 100) | whole plan | docs |
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
| AU-03 | W1-3 | Q2 doc refresh + one Bangla "Where we are" page | builder | Built+Linked+Tested | docs refreshed; `docs/owner/WHERE_WE_ARE_BN.md` (counts checked by tests/where_we_are.test.ts), linked from README | README, PLAN | partial, see GAP-09 |
| AU-04 | W1-4 | Q7 CI workflow (tsc, vitest, build, e2e) | builder | Built+Linked+Tested | `.github/workflows/ci.yml` (tsc, vitest, build, e2e; read-only, no secrets); tests/hosting_headers.test.ts. First green run happens when pushed to GitHub | repo | N |
| AU-05 | W1-4 | S6: stop tests writing into `evidence/` | builder | Built+Linked+Tested | tests/g1.test.ts writes to a temp folder unless TM_WRITE_EVIDENCE=1 (set by tools/evidence.mjs); tests/hosting_headers.test.ts | git hygiene (can be committed by accident) | N |
| AU-06 | W1-5 | Q6 owner phone checklist | builder / owner | Built (checklist) / owner run Not started | `docs/owner/PHONE_TEST_CHECKLIST.md`, `73e77e1` | owner | - |
| AU-07 | W2-6 | M12 `migrateRecord` + failed-migration test | builder | Built | `e5241d5`; `tests/schema_migration.test.ts` | Register TM-TST-089 | TS Y · Register ? |
| AU-08 | W2-7 | M11 PIN lock | builder | Built | `44090a6`; `tests/app_lock.test.ts` | Settings 3b | TS Y |
| AU-09 | W2-8 | Q3/P8 `public/_headers`, manifest, theme colour | builder | Built+Linked+Tested | `public/_headers` (CSP = page policy + frame-ancestors, nosniff, DENY, permissions, cache rules); tests/hosting_headers.test.ts. Not tried on the real host (owner hosting step) | hosting day | N |
| AU-10 | W2-9 | M3 Capacitor test build (only if phone test fails closed-app alerts) | builder + owner | Blocked | waits for TD-O.1 result | alerts | - |
| AU-11 | W3-10 | M1 3-screen onboarding | builder | Built | `1d8a007`; `tests/onboarding.test.ts` | `#/start`; no re-run entry (SET-3h.1) | TS Y · LK partial |
| AU-12 | W3-11 | M8 Bangla sheet + **apply-back script** | builder / reviewer | Built (reviewer sign-off Not started) | `tools/bangla_apply_back.mjs` + `tools/banglaApplyBack.ts`; tests/bangla_apply_back.test.ts; TM-TST-161 stays Partial until a named reviewer signs | TM-TST-161 | partial |
| AU-13 | W3-12 | P2 stale-while-revalidate shell cache | builder | Built+Linked+Tested | public/sw.js staleWhileRevalidate for files not in the saved list; fake-worker test in tests/hosting_headers.test.ts; e2e offline 0 FAIL | offline | N |
| AU-14 | W3-12 | M10 route splitting | builder | Built | `b5cb1f5`; `tests/lazy_screens.test.ts` | precache | TS Y |
| AU-15 | W3-13 | M4 Bangladesh starter pack | builder | Built | `e1c6f5c`; `tests/bd_pack.test.ts` | Topics | TS Y; reviewer pending |
| AU-16 | W4-14 | M9 usability kit; 5 sessions | builder / owner | Built (kit) / sessions Not started | `docs/owner/USABILITY_KIT.md` | TM-TST-010/066/067/171 | owner |
| AU-17 | W4-15 | M2 "welcome back" and monthly then-vs-now (no streaks) | builder | Built+Linked+Tested | `src/core/welcomeBack.ts`, `src/ui/welcomeUi.ts` (Today card, monthly "Then and now"); tests/welcome_back.test.ts | Today, Review | N |
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

## H. Block 12 build completeness and module list (`docs/TODO.md` Block 12, `docs/design/m-list-status.md`)
Module labels come from `src/modules/capability.ts` (six boxes: Input, Storage, Calculation, Output, Export, Links); checks `tests/m_list_status.test.ts`, `tests/field_reach.test.ts`, `tests/link_check.test.ts` (19 tests, run by the keeper at check #2: all pass). Status here: Built+Linked+Tested only when the module reads "complete" AND its feature test exists; "Built" if a box is still missing.

| ID | Source | Step / module | Owner | Status | Evidence | Missing / open |
|---|---|---|---|---|---|---|
| B12-01 | Block 12 s1 | Capability card = six boxes + separate data status; field-reach + link-check tests; dead code removed; `#/more/topics` fixed | builder | Built+Linked+Tested | 244d6f8; field_reach, link_check, m_list_status tests | - |
| B12-02 | s2 / M16 | KPI targets `#/journey/kpi`, weekly/90-day/report/Today/Journey | builder | Built+Linked+Tested | fc5e726; tests/kpi.test.ts; M16 complete | - |
| B12-03 | s3 / M09 | Venture value, share, income/expense, portfolio | builder | Built | d227ce3; tests/venture_value.test.ts; M09 label **partial (Calculation missing)** | unit economics (price/cost per unit) |
| B12-04 | s4 / M12 | Reality-changed loop, plan versions, resume gently | builder | Built+Linked+Tested | b22745d; tests/reality_loop.test.ts; M12 complete | - |
| B12-05 | s5 / M03 | North Star current value, progress, weights | builder | Built+Linked+Tested | 5f8cd89; tests/north_star.test.ts; complete | - |
| B12-06 | s6 / M10 | Team: role-linked steps, hand-over, hiring, gap analysis | builder | Built+Linked+Tested | 501204b; tests/team_handover.test.ts; complete | - |
| B12-07 | s7 / M15 | Risk review-date trigger, stop-rule question | builder | Built+Linked+Tested | 408ff90; tests/risk_review.test.ts; complete | - |
| B12-08 | s8 / M06 | Goal tree, measure, step edit, habit days | builder | Built+Linked+Tested | c2c57b9; tests/goal_tree.test.ts; complete | TODO notes "profile ..." items still open (see line 114 of TODO) |
| B12-09 | r2 s9 / M20 | Save as PDF (print window) for report, plan, hand-over | builder | Built+Linked+Tested | 30903ac; tests/print_pdf.test.ts; e2e PDF-PRINT; M20 complete | - |
| B12-10 | r2 s10 / M05 | Stage rules, measurable exit conditions B-H | builder | Built+Linked+Tested | 96c3932; tests/stage_gates.test.ts; complete | - |
| B12-11 | r2 s11 / M16 | Monthly review, money/risk in reviews, assumptions check | builder | Built+Linked+Tested | 9a53a39; tests/month_review.test.ts | - |
| B12-12 | r2 s12 / M07 | Yearly/one-off lines, other currencies with typed rate | builder | Built+Linked+Tested | d8954c3, d0047f7; tests/money_fx.test.ts; complete | - |
| B12-13 | r2 s13 / M08 | Prayer/rest blocks in scheduler, weekly hours budget | builder | Built+Linked+Tested | 67b6630; tests/time_blocks.test.ts; complete | - |
| B12-14 | r2 s14 / M04 | Path sources/dates/stale flag, weights | builder | Built+Linked+Tested | ddf745b; tests/path_sources_weights.test.ts; complete | "More paths wait for ..." (TODO line) |
| B12-15 | r2 s15 / M17 | Notes, sources, SOPs `#/notes` | builder | Built+Linked+Tested | d752a85; tests/notes_sops.test.ts; complete | - |
| B12-16 | r2 s16 / M01 | Profile name, birth year, time zone read back | builder | Built+Linked+Tested | d65d9bc; tests/profile_view.test.ts; complete | - |
| B12-17 | r2 s17 / M02 | Skippable way-of-working questions | builder | Built+Linked+Tested | 2e99444; tests/approach.test.ts; complete | - |
| B12-18 | r2 s18 / M14 | Health and family, separate consent tick, no scores | builder | Built+Linked+Tested | dce0e63; tests/health.test.ts; complete. Owner-approved | - |
| B12-19 | r2 s19 / D-D | Hadith reader structure, off by default | builder | Built | 6b77b8f; tests/hadith.test.ts | scripture is D-D; reviewer pending |
| B12-20 | r2 s20 / M13 | Deen plans, reminders, one-tap marks, private notes, zakat from own numbers | builder | Built+Linked+Tested | 7975af7 + Hijri/Ramadan (src/core/hijri.ts, tests/hijri.test.ts); M13 now complete (calculated, approximate) | Hijri date, Ramadan view |
| B12-21 | s21 / D-D | Hadith pack 212 entries (HadeethEnc.com, unchanged), importer, read-only verifier | builder | Built | c2d2d35; tests/hadith.test.ts; docs/design/hadith-pack.md | default off, "unreviewed" label; scholar review is owner task (TODO Part B); thin topics: time, patience, halal earning |
| B12-22 | s22 / M18 | Drawn timeline, task board, option board `#/journey/boards` | builder | Built | 045f1d4; tests/boards.test.ts; M18 label **partial (Output missing)** | drawn goal tree, resource map, readiness map, plan-diff |
| B12-23 | m-list | M21 Security & privacy | builder / owner | Blocked | M21 partial: Storage missing = at-rest encryption (DL-03, owner decision) | owner |
| B12-26 | owner 3 Nov | Prayer times auto-update when online (Aladhan, off until ticked, cache, local fallback, source line) | builder | Built+Linked+Tested (live UNTESTED) | tests/prayer_sync.test.ts (26); DECISIONS_LOG "Automatic prayer times" | owner compares with Islamic Foundation timetable |
| B12-27 | owner 3 Nov | Text size scales (rem), saved size applied before first paint; app update banner + build stamp in About | builder | Built+Linked+Tested | tests/text_size.test.ts, tests/update_flow.test.ts, e2e TEXTSIZE / UPDATE-* | owner confirms on his phone after one fresh open |
| B12-24 | m-list | M23 AI layer | needs-approval | Blocked | D-C | - |
| B12-25 | m-list | M11, M19, M22, M24, M25 complete | builder | Built+Linked+Tested | m_list_status table | - |

Module summary (m-list-status.md, 3 Nov): complete 21, partial 3 (M09, M18, M21), not-built 0, blocked 1 (M23) of 25.

## G. Gaps and risks (check #2, 3 Nov 2026 00:15 UTC)

**Closed since check #1:** GAP-01 (link-check test now exists: `tests/link_check.test.ts`), GAP-02 (Block 11 and 12 in TODO), GAP-03 (Settings entries in DECISIONS_LOG), GAP-07 (restoreUi link), GAP-08/09 (restore UI tests, Contains labels, status line, tick), GAP-10 (evidence.ts lists restore.ts and `#/settings/*`), GAP-13/14 (only content routes and the redirect test still use `#/more`; `nav.more` removed), GAP-15 (habit grid via prefs), GAP-06 not checked.

**Still missing / dropped from the plan**
- G-01 Audit week-1/2 items still not built: CI workflow (no `.github/`), `public/_headers`, stale-while-revalidate (`sw.js`), Bangla "Where we are" page, apply-back script for the Bangla sheet (AU-04, AU-09, AU-13, AU-03, AU-12). 3 Nov: CI, `_headers`, stale-while-revalidate built; Bangla "Where we are" page and apply-back script still to do (see (c)). 3 Nov: Bangla "Where we are" page and apply-back script built too (G-01 closed).
- G-02 `tests/g1.test.ts:111` still writes `evidence/catalog-report.json` (AU-05); the file keeps showing modified in `git status`. CLOSED 3 Nov.
- G-03 Audit ideas never scheduled: M2 welcome-back / then-vs-now (AU-17), M6 plan "what changed" with up to 3 options (partly covered by M12 loop; confirm), M7 goal tree screen (covered by M06 goal tree; backward-planning wizard not seen), Q5 calmer prompt colour (AU-21..23). 3 Nov: M2 welcome-back and then-vs-now built (AU-17). M6 plan-diff beyond M12 loop, backward-planning wizard, calmer prompt colour still open.
- G-04 SET-6.04 `storage`-event refresh of consent/lock across browser tabs: not found in src. CLOSED 3 Nov: `src/ui/crossTab.ts`.
- G-05 PR6 screenshots cover 360 px in 2 languages only. Owner rule needs 4 looks, 200 % text, mix, dark mode (SET-6.07). Same 4-looks risk applies to every new page (none of the Settings/Block 12 tests assert 4 looks; `tests/a11y_looks.test.ts` exists, scope not checked).
- G-06 Tests not found for: restore Cancel by name (SET-1.T5), snapshot restore UI (SET-1.05), refusal on EVERY real write path after Withdraw (capture, restore, prayer place) and the no score/rank/streak string scan of Settings+Deen (SET-3b.T), Quick card visible without scrolling at 360 px in demo (SET-2.T3), 44/48 px targets (SET-6.03), single undo-map test (SET-R.09). CLOSED 3 Nov for Cancel, Withdraw paths, wording scan, 44/48 rules (tests/settings_gaps.test.ts). Still open: snapshot restore UI, Quick card without scrolling, single undo-map test.
- G-07 `consentGate()` is used on Privacy and Data only. First-run and Start-real keep their own tick text (logged in DECISIONS_LOG PR3b). Final decision §3.3 said one wording everywhere; this is a logged deviation, but the owner/judge should confirm. CLOSED 3 Nov: first-run and Start-real now show the single consent wording (no deviation left).
- G-08 Module gaps: M09 unit economics, M13 Hijri/Ramadan, M18 goal tree/resource map/readiness map/plan-diff boards, M21 at-rest encryption (owner), M23 AI (owner). TD-1.4 (Block 1 visual check) still unticked. 3 Nov: M13 Hijri/Ramadan built (approximate, offline).
- G-09 Hadith pack (D-D): content comes from a third-party site; reviewer sign-off and the licence note must stay visible ("unreviewed" label, default off). Owner task: scholar review. Keep it in the owner list.
- G-10 Owner-demand audit (44-47 %) and the audit's completion estimate are stale after ~25 build steps; re-run (AU-18). Register v2_1 copy: confirm regenerated after Block 12.
- G-11 Owner-only list unchanged: O1 phone offline test, O8 lock-screen, prayer times vs timetable, Bangla reviewer (TM-TST-161 now covers many more strings), Bangla keyboard typed-word test, pick design, usability sessions.

**Duplicates / orphans:** none found in this pass for `#/more` (only content routes + redirect table). Checked by grep and `tests/settings_redirects.test.ts` 'no source or test still points at a removed /more address'.

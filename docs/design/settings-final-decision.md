# Settings: final decision (judge ruling, 2 Nov 2026)

Judge: neutral senior product designer + engineer. Read-only on code. Inputs: `CLAUDE.md`, `settings-inventory.md`, proposals A and B, both debate rounds, and the code facts checked below. Status: decision only, nothing built.

## বাংলা সারাংশ

- নিচের ৫টি ট্যাবই থাকবে। শেষ ট্যাব "More" এর নাম হবে **Settings / সেটিংস**। ৬ নম্বর ট্যাব নয়।
- Settings হোমে ওপরে একটি ছোট "দ্রুত সেটিং" কার্ড: ভাষা, থিম, লেখার সাইজ (এদের একমাত্র ঘর এটাই)। তার নিচে এক লাইনের স্ট্যাটাস (ব্যাকআপ কবে, লক চালু কিনা), তারপর ৮টি ক্যাটাগরি, শেষে "গাইড ও তথ্য"। সার্চ সবসময় আইকন হিসেবে থাকবে।
- ক্যাটাগরি (ক্রম): লুক ও স্ক্রিন · নামাজ ও অ্যালার্ট · ব্যাকআপ ও এক্সপোর্ট · প্রাইভেসি ও লক · ডেমো না রিয়েল ডেটা · প্ল্যান ও প্রোগ্রেস · কানেকশন · ডেটা ডিলিট।
- সবচেয়ে জরুরি আগে: **Restore এখন আগে সব মুছে তারপর বসায়** (`repo.clear` তারপর `put`)। এটা প্রিভিউ + আগে অটো-সেফটি কপি + ফেল করলে ফেরত, এই নিয়মে ঠিক হবে। এটাই প্রথম PR।
- Consent: বসানোর সময় সবসময় টিক (সুইচ নয়)। Settings-এ শুধু অবস্থা দেখা ও "Withdraw"। "Clear real data" এ টাইপ করে কনফার্ম ("DELETE" বা "ডিলিট"), টাইপ করতে না পারলে বিকল্প রাস্তা আছে।
- কোনো storage key বদলাবে না। পুরোনো লিংক নিজে নতুন জায়গায় যাবে।

---

## 0. Code facts I checked (they decide several rulings)

| Fact | Evidence | Consequence |
|---|---|---|
| `restoreBackup` validates, then `await repo.clear(b.ns)`, then puts each record. A failure after `clear` leaves an empty namespace. A confirm that says "same ids" would be false. | `src/core/backup.ts` lines 37-42 | B is right. Restore safety is PR 1. |
| Router matches `location.hash` (minus `#`) against anchored regexes (`/^\/more\/data$/` and so on). No query parsing. Unknown path sets `location.hash = "#/today"`. | `render()` in `src/app.ts` | `?hl=` would fall through to Today. A's search and redirects need a router change or a different anchor scheme. |
| Nav is a `TABS` array of 5 entries; tab highlight comes from the 3rd element of each `ROUTES` entry (`"more"` for 14 routes). `nav.more` exists in the en and bn packs. | `src/app.ts` lines 22-70, `packs.ts` 173 / 1066 | Rename = one array entry, one tab tag, one new `nav.settings` key. |
| `#/more...` appears 76 times in tests and src (`#/more/data` 28, `#/more` 21, `/library` 11, `/connections` 11, `/rules` 6, others 12). About 21 test files. | grep | Test migration is a real cost, see ruling 7. |
| `render()` replaces the page with `skip, top, ...demoPanels(), saveFailedBanner, ...inAppReminders, body, nav, drawer`. It only scrolls on route change; it does not move focus to the new heading. | `src/app.ts` | The first fold of Settings is shared with the DEMO banner. Focus on route change is missing everywhere. |
| `locked` check is first in `render()` and `renderApp()`. | `src/app.ts` | Deep links to `/settings/*` cannot bypass the lock. Keep it first. |
| Consent: `readConsent` fails closed. `grantConsent`, `revokeConsent` exist. `guardWrite(rec, realEnabled)` rejects real writes when consent is off. | `src/core/consent.ts`, `src/core/repo.ts` | After `revokeConsent`, new real writes are already blocked by the core. Withdraw v1 needs no new write path. |
| `viewBar(screen)` reads `screenView(screen)` (default `full`) and writes `tm:ui:view:<screen>`. | `src/ui/viewBar.ts` | Master density needs a reader that tells "never set" from "set to full". |
| `scrubRealParts` removes real data from snapshots on Clear real. | `src/core/snapshots.ts`, `screens.ts` 1421 | The new "Before restore" snapshot must be scrubbed too. |
| Precache is generated (`tools/precache.ts`, `tests/precache.test.ts`, `tests/lazy_screens.test.ts`). `viaLazy` exists. | repo | New chunks must pass the precache test. |
| Lock config is `tm:secret:applock`; the PIN hash is never in snapshots. | `src/core/appLock.ts` header | Settings must never export it. |

Both experts agreed (and I confirm) on: 5 tabs with the 5th renamed Settings; restore under Backup with B's safe flow; one `consentGate()`; a live "private by default" read-out; master Detailed/Compact via an additive key; A's registry test; redirects for old routes; no storage key renamed.

---

## 1. FINAL structure

### 1.1 Tab

| | English | Bangla | Mix |
|---|---|---|---|
| 5th tab | Settings | সেটিংস | Settings |

Gear icon, same slot as "More". Route root `#/settings`. New key `nav.settings`; keep `nav.more` until the test migration PR removes it. `aria-label` of the nav is unchanged.

### 1.2 Settings home layout (top to bottom)

1. `h1` Settings. A magnifier button at the right of the heading row (always present at every text size; opens the search field, see PR 5).
2. **Quick settings card** (the only home of these three): Language (English / বাংলা / Mix), Theme (Auto / Light / Dark), Text size (100 / 125 / 150 / 200). The top-bar globe stays and writes the same key (the one allowed duplicate).
3. **Status strip** (read-only, one card, up to 3 lines, each a link): Backup ("Last file backup 12 Oct" or "No backup file yet"), Real data ("Demo only" or "Real: permission on"), Lock ("Off" or "On"). Computed from real state, never fixed text.
4. **8 category cards**, order below, each with icon, name, and one line of current values.
5. One plain row: **Guides & info** (opens `#/settings/about`).
6. Nothing destructive on the home. "Delete data" is the 8th card, last of the cards, with 24 px extra space above it and a neutral outline.

Compact demo banner: on every `/settings*` route the DEMO banner renders as one line, and the daily "delete demo?" ask card and the backup reminder card are not shown there (they are prompts, they stay on Today). In-app prayer reminders stay (time sensitive). This keeps the first fold usable at 360 px.

### 1.3 Categories: exact list and order

| # | Key | English | Bangla | Mix | Route |
|---|---|---|---|---|---|
| 1 | look | Look & screens | লুক ও স্ক্রিন | Look ও Screen | `/settings/look` |
| 2 | prayer | Prayer & alerts | নামাজ ও অ্যালার্ট | নামাজ ও Alert | `/settings/prayer` |
| 3 | backup | Backup & export | ব্যাকআপ ও এক্সপোর্ট | Backup ও Export | `/settings/backup` |
| 4 | privacy | Privacy & lock | প্রাইভেসি ও লক | Privacy ও Lock | `/settings/privacy` |
| 5 | data | Demo or real data | ডেমো না রিয়েল ডেটা | Demo বা Real ডেটা | `/settings/data` |
| 6 | plan | Plan & progress | প্ল্যান ও প্রোগ্রেস | Plan ও Progress | `/settings/plan` |
| 7 | connections | Connections | কানেকশন | Connections | `/settings/connections` |
| 8 | delete | Delete data | ডেটা ডিলিট | Delete ডেটা | `/settings/delete` |
| - | about | Guides & info | গাইড ও তথ্য | Guides ও Info | `/settings/about` |

Naming checks against `bangla-loanword-swaps.md`: প্রাইভেসি, ব্যাকআপ, এক্সপোর্ট, অ্যালার্ট, স্ক্রিন, প্ল্যান, প্রোগ্রেস, কানেকশন, ডেটা, ডিলিট are English words in Bangla script; "নামাজ" is a Deen term and stays. Mix keeps the English word where the swap file says so. "Danger" does not appear in any language. The builder checks each string against the swap file and adds the new words (এক্সপোর্ট, রিয়েল) to it if absent. All Bangla stays marked "যাচাই হয়নি" until TM-TST-161.

Ordering reason: what a first-time phone user needs most (looks, prayer alerts), then "save my stuff", then privacy and data mode, then rarely changed planning, then connections (all off), then deletion last. Judgement call, low stakes; no owner question.

### 1.4 Every inventory setting, one home

Control: seg, switch, select, number, slider, btn, two-step (ask then confirm), typed (typed word), gate (consent gate), link.

| Inventory rows | Setting | Home | Control |
|---|---|---|---|
| 1 | Language | Settings home, Quick card (globe writes same key; first-run uses the same component and gains Mix) | seg 3 |
| 2 | Theme | Settings home, Quick card | seg 3 |
| 4 | Text size | Settings home, Quick card | seg 4 + preview line |
| 3 | Design version | `/settings/look` | 3 radio cards |
| 52-60 (18 keys) | Detailed / Compact | `/settings/look`: master seg, "Different on N screens" list with "Follow master", all 18 folded; on-screen bar stays as the override setter | seg + list |
| 49, 50, 51 | Horizon layout, Universe view, Habit grid range | stay on their screens (they change what is drawn); `/settings/look` shows 3 link rows with current value. Habit grid read via `prefs`, same key `tm:ui:habitGrid` | seg on screen; link rows |
| new | Reduce motion (Follow phone / Always reduce) | `/settings/look` | seg 2 |
| new | Reset look & layout (only `tm:ui` look and view keys; one confirm line; never data, consent, lock, prayer, connections) | `/settings/look` bottom | two-step |
| 61-64 | Prayer method, Asr, offsets x5, reset method | `/settings/prayer` (offsets and Asr under a "Fine tune" fold) | select, seg, number, btn |
| 65, 66 | Prayer place, Use Dhaka | `/settings/prayer`, tagged Private, namespace shown, real place needs consent via the gate | number x2, btn |
| 67-73 | Pre-prayer alert, minutes, Azan, which prayers x5, sound, volume, preview | `/settings/prayer`; top line shows the phone's real notification permission state (yes / no / not asked) and the fix | switch, number, slider, btn |
| 32 | Backup reminder on/off | `/settings/backup` (Today card keeps "Later" and a link) | switch; shows computed default and why |
| 33 | Remind me tomorrow | stays on the Today card (an action of that card) | btn |
| 15 | Ask browser to keep storage | `/settings/backup`, "Keep my data safe" status | btn + status |
| 26, 28 | Save JSON (demo only), encrypted backup (demo + real) | `/settings/backup`, "Save a backup"; each button states "Contains: ..." and a status line "Real data backup: none yet" | btn, passphrase form with "I wrote it down" tick |
| 27, 29, 36, 37 | Restore JSON, encrypted restore, snapshot restore, snapshot load from file | `/settings/backup/restore` (own page, not beside Save) | file + preview + confirm |
| 30, 31, 34, 35 | Snapshots auto, keep N, take now, save to file | `/settings/backup` (fold) | switch, seg, btn |
| 21-25 | CSV export demo/real, import check/apply/undo | `/settings/backup` (fold "Spreadsheet copy") | btn, file |
| 5-8 | Lock-screen details x4 | `/settings/privacy`; Show direction asks one confirm line | switch x4, default hide |
| 10 | Real-data consent | `/settings/privacy`: status, date, Withdraw. Grant only through `consentGate()` | status + gate; Withdraw btn |
| 16-19 | App lock set PIN, timing, lock now, remove | `/settings/privacy` | pin form, seg, btn, pin |
| 20 | Forgot PIN | stays on lock screen; Privacy shows a help line (15 min wait removes the PIN only, never data) | link |
| new | Private by default: live read-out | top of `/settings/privacy` | computed lines |
| 9 | Data mode (demo/real) | `/settings/data` | seg + gate |
| 11 | Start real now | `/settings/data/start-real` (full page; DEMO banner button goes here) | page with gate + "Save a demo copy first" + confirm |
| 12 | Keep demo / not now | stays the daily ask card (a prompt, not a setting) | btn |
| 13 | Delete my demo entries | `/settings/delete` | two-step, live count, "Save a demo copy first" |
| 14 | Clear all real data | `/settings/delete` | typed word (+ fallback), live count, "Save a backup file first" link |
| 38-41 | Connections x4: approve, on/off, key, withdraw | `/settings/connections`: one page with 4 cards, always in order Approve, Turn on, Key, Withdraw, equal weight; opens with a computed line "0 of 4 on. Nothing leaves this phone" | existing controls |
| 42-45 | Automation rules x4 | `/settings/plan` (section Automation; the `/more/rules` explanation moves here, results stay on Today) | switch x4 |
| 46 | Plan mode | `/settings/plan`; Diary Plan and Today show a chip + link; `/stuck` still writes it and says "change back in Settings"; Today shows an "end pause" chip while paused | seg 3 |
| 47 | Stage names | `/settings/plan`; Journey keeps a link row | select + preview |
| 48 | Overall progress weighting | `/settings/plan`; Today and Journey cards become a read-only chip + link | seg 2 |
| 74 | Show the welcome again | `/settings/about` (deletes nothing, says so) | btn |
| 75 | Topic drawer | top bar, not a setting | - |

Content that is not a setting keeps its URL (see section 4) and lists under Guides & info: Topics, Ready systems, Cards, Capability status, Field guide, Glossary, Data dictionary, Halal-check flags, Safety & limits, module status cards, disclaimers.

Deliberately not added now: high contrast (needs an AA audit across 3 designs x 2 themes; log as backlog), week start, currency (BDT fixed by Spec), notification master switch, "ask me about demo data" switch, any account or profile item. Reduce motion is added because the CSS already honours the media query and a manual override is cheap.

---

## 2. Rulings on the open disputes

### R1. Settings home content for a first-timer: inline Language, Theme, Text size? Backup status? Search?
**Ruling: Quick card with the three inline controls, one-line status strip including backup, search as an always-visible icon, no big search box.**
Reasons: a first-time phone user's most likely needs are "make it Bangla / bigger / darker". Hiding them one tap deep is slower for exactly the people who need them most; B is right. A's objection (category named "Language and look" would then have a hole) is solved by naming the category "Look & screens" and by the registry: language, theme and text size have one home, the home page, and search for "language" jumps there. Backup status is on the home because B's strongest failure case is the false sense of safety (JSON save is demo only); one line with a link costs little. The full "Backup" card from B is not used; a status strip line is enough and does not push the categories down. Search stays but as an icon (A is right that hiding it at large text is backwards; B is right that a big box adds weight), so it is available at 200 %.

### R2. Where does the backup reminder live?
**Ruling: `/settings/backup`.** It is a backup safety control; a person fixing backup problems will look there. Prayer & alerts holds prayer only. There is no "Reminders" category (grouping by mechanism, not by task). The Today reminder card keeps "Later" and a link, no second on/off. The row shows the effective value and its reason ("on because you have real data and permission").

### R3. Where does "Reset settings" go?
**Ruling: `/settings/look`, at the bottom, named "Reset look & layout", and it resets only look and view keys.** It does no data harm, so it must not sit on the page that holds data deletion (A's own critique from B stands). It never touches consent, lock, connections, prayer or data. One confirm line before it runs. There is no "reset everything" button; that would be a second data-risk path and nobody asked for it.

### R4. Consent as a switch? Withdraw behaviour in v1?
**Ruling: no switch for granting. Granting always goes through `consentGate()` (explanation text, a tick, a button).** D-B requires an explicit tick, and a one-tap switch on a settings page is exactly the autopilot tap D-B exists to prevent. The Privacy page shows state ("Allowed since 25 Oct" / "Not allowed"), what it covers, and a **Withdraw** button (a button, not a switch; one tap, since it moves toward privacy). When consent is off the row shows "Allow real data" which opens the gate inline.
**Withdraw v1 = `revokeConsent` only.** Effects, all already enforced by the core: new real writes are refused (`guardWrite`), real CSV and backup exports are disabled with a reason. Existing real entries are not touched and not hidden. The page says "Your N real entries are still on this phone" with a link to Delete data. No new read-only or hidden mode in v1 (A is right that read-only touches every real write path; it is a product question). Log in `DECISIONS_LOG.md` with the default "stop new real writes only"; the owner may later choose read-only or hidden. If the app is in real mode when consent is withdrawn, Today shows one calm card "Real data is paused. Allow it again to add entries." No red, no shame. Test: after withdraw, every real write path in `entry.ts`, capture, import, restore and prayer place is refused.

### R5. Typed-word confirm for Clear real data
**Ruling: yes, for Clear real data only. Accept `delete`, `DELETE`, `ডিলিট` and `ডিলেট` after trim, Unicode NFC normalisation, and case folding, in every language mode.** Delete demo entries keeps ask-then-confirm (low stakes, disposable). Reasons: this is the one action with no undo by design (`scrubRealParts` removes snapshot copies), so one extra deliberate step is proportionate; a countdown would exclude slow readers (B). A's concern about Bangla typing is real, so:
- Fallback path, always visible under the field: "I cannot type this" reveals "I understand that N entries will be deleted" tick on a separate step with Cancel as the default focus. Nobody is locked out.
- Live count shown first; "Save a backup file first" link goes to `/settings/backup` (its status line says whether real data is in the file); if the app lock is on, the PIN is asked again on this page.
- Red appears only on the final button. Copy is calm, no exclamation marks.
- A real Android Bangla-keyboard check is a human task for the G2 device test (owner); tracked, not claimed.

### R6. Query-string anchors (`?hl=`) vs router regexes
**Ruling: no query strings. Use a path segment instead.** `?hl=` fails today (all regexes end in `$`; an unmatched path redirects to Today). Changing the router to split on `?` is possible but touches every route and every test for no gain. Instead one new route regex family handles Settings:
`^/settings(?:/([a-z]+))?(?:/([a-z-]+))?$` where segment 1 is a category key (or `about`) and segment 2 is a row id or sub-page (`restore`, `start-real`, `automation`, `progress`, `stages`, `textsize` ...). The Settings screen looks up both in the registry; an unknown row id is ignored (the page still renders); a known row id scrolls to the row and highlights it once (no pulse under reduced motion). One new route, not twelve. Search results and redirects use these paths. Rows of the Quick card live on the home, so segment 1 may be `home`: `#/settings/home/textsize` opens the home and highlights that row.

### R7. Migrating about 76 `#/more...` references (about 21 test files)
**Ruling: redirects resolve inside `render()` without a second hashchange, and old tests are migrated in one mechanical PR with a mapping table.**
- A `REDIRECTS` map is applied to `path` before the route loop; it calls `history.replaceState` to put the new hash in the address bar and continues rendering the new route. No `location.replace`, no double render (A's `location.replace` would re-trigger `hashchange` and break click-then-assert tests; B's "moved" stub pages would leave dead screens to test in three languages).
- PR 2 (shell) keeps all old routes rendering their old screens, so no test breaks.
- PR 4 (redirects) flips them and migrates tests in the same PR: `sed`-style mapping `#/more/data` -> the new home of the card the test touches (data / backup / privacy / delete), `#/more/connections` -> `#/settings/connections`, `#/more/rules` -> `#/settings/plan/automation`, `#/more` -> `#/settings`. Content routes (`library`, `status`, `safety`, `glossary`, `fields`, `dictionary`, `halal-flags`, `topics`, `cards`) do not move, so their ~25 references stay unchanged. Keep 2 explicit redirect tests (old path ends on the new screen, hash updated, Back does not loop). The tests that assert tab highlight change `more` -> `settings`.
- Selector helpers: tests that click `[data-act]` on `/more/data` keep their selectors if the card builders are moved unchanged (the rule for the split of `dataScreen()`).

### R8. DEMO banner and reminder cards eating the first screen
**Ruling: compact one-line DEMO banner on `/settings*`; ask card and backup reminder card suppressed there.** Details in 1.2. The banner stays honest (demo must be labelled). A screenshot test at 360 px checks that the Quick card is visible without scrolling in demo mode.

### R9. Settings in backups
**Ruling for v1: say it plainly on the Backup page ("Look and language settings are not in the backup file; after a restore or a browser clear you may need to set them again") and do not include them.** Reason: files then stay records-only and schema stays stable. Later, a versioned optional block of non-sensitive look and layout prefs may be added (never consent, PIN, keys, connections). Logged as backlog with a schema note.

### R10. Offline precache and lazy loading
**Ruling: Settings home, Quick card and Look are in the main bundle; every other `/settings/*` page loads through `viaLazy`; all chunks must be in the generated precache.** The existing `tests/precache.test.ts` is extended to assert the Settings chunks are listed, and an offline test opens each `/settings/*` route with the network down. Reason: "offline after first visit" is a charter rule.

### R11. Focus and announcement on route change
**Ruling: yes, in `render()`.** When `routeChanged` is true (not on same-screen re-render, not on first load), move focus to the new `h1` (`tabIndex=-1`, `preventScroll`) and set `document.title` to the screen name. Applies to all routes; tested on `/settings/*` and one non-Settings route. Confirm steps (restore, delete) move focus to their heading; Cancel is first in tab order for destructive confirms; Esc closes. Fix the hard-coded English `aria-label="Language"` in `langButtons()` (`modeUi.ts`).

### R12. About 150 new en/bn/mix keys
**Ruling: allowed, with a parity test.** New test `settings_i18n.test.ts`: every key referenced by the registry and the Settings screens exists in the en pack and the bn pack, and Mix renders a non-empty string (Mix falls back through the existing mechanism); no new Bangla string may contain a word from the swap file's "avoid" list; none contains "বিপদ", "Danger", a score, rank or streak word. Existing `copy_review`, `i18n_modes`, `latin_digits` stay green. Strings land with the PR that uses them, not in one dump.

### R13. One-time "what moved" note
**Ruling: yes.** A single dismissible card on Today (not a modal): "Settings and Guides are now in the last tab." Stored in `tm:ui:movedNote` (new additive key, per-device). Disappears after one tap or after 14 days. This also replaces B's first-run "want to change text size?" card (one note only).

### R14. Register mapping
**Ruling:** the builder looks up the existing Register rows for backup/restore (code header cites TM-REQ M20), real-data consent (D-B), app lock, notifications/prayer alerts, display/language/accessibility, and offline; links each new test file to them; marks a row Verified only with the test artifact; records new tests as evidence in the Change Log. New requirement rows (settings registry, restore safety, typed-word guard, focus on route change) are added as "Draft" with their tests. No row is marked done from this document.

### Smaller points settled
- 5 tabs, not 6; no gear in the top bar (not needed).
- Level A/B folds only inside long pages (Prayer fine-tune, Backup snapshots and CSV, Look "All 18 screens"); Connections and Plan are not folded.
- Typed Delete-demo confirm: not needed.
- `/more` is removed as a screen; its content routes keep URLs and are tagged `settings`.
- Start real is a full page (`/settings/data/start-real`), but Place and other small items are row ids, not pages.
- Re-ask PIN (when the lock is on) before Restore, Start real, Delete demo, Clear real.

---

## 3. Safety design

### 3.1 Restore (first thing to build)
Flow on `/settings/backup/restore`:
1. Pick a file (JSON, encrypted, snapshot, or a snapshot from the list). Nothing changes yet.
2. **Preview card**: file date, which namespace (Demo / Real / Both), entry count in the file, entry count on this phone now. Text states the truth: "All N Demo entries on this phone will be replaced by the M entries in this file." If the file holds real data and consent is off: stop with a plain message and the gate; nothing is written.
3. App lock on: ask the PIN again.
4. Automatic **"Before restore" snapshot** of the target namespace (marked, kept 7 days, outside the "keep N" pruning). It follows `scrubRealParts` and the lock like any snapshot.
5. **Atomic replace**: new core function `restoreBackupAtomic` that validates everything, then writes in a way that a failure cannot leave an empty store: stage the new records first, then swap; on any error automatically restore from the step-4 snapshot and report "Nothing was changed". `restoreBackup` stays as the validation primitive and the one `clear`+`put` path is removed from the UI.
6. Confirm button text names the numbers ("Replace my 42 entries with the 30 in this file"); Cancel is default focus.
7. Result card: "Done. 30 entries restored." with **Go back** (restores the step-4 snapshot, one tap, 7 days).
8. Encrypted restore: passphrase first, then the same preview. Passphrase is never stored.

Also: JSON save button label "Contains: Demo only"; encrypted label "Contains: Demo and real"; status line "Real data backup: none yet / last on <date>"; encrypted save asks "I wrote the passphrase down" because a lost passphrase cannot be recovered.

### 3.2 Delete data page (`/settings/delete`)
Only two actions, in this order: Delete my demo entries; Clear all real data. Each card says what goes (live count), what stays, and whether undo exists. Delete demo: "Save a demo copy first" button, then two-step. Clear real: live count, "Save a backup file first" link, typed word (R5) or the fallback, PIN re-ask when locked, no undo (by design: `scrubRealParts` removes snapshot copies; say so plainly). Clear real revokes consent as today and says so. Page opens with "Nothing here happens until you confirm." No banner, toast or card elsewhere links to this page except the Settings home card and the Withdraw message. Results render from state, so Back never replays the action.

### 3.3 Consent
One component `consentGate()` with one wording, one tick, one `grantConsent` call. It is used by first-run, Start real, entry forms, Deen/prayer place, import, and Privacy. No local copies of the wording; a test greps the Settings and entry code for a second consent sentence. Gates at the moment of entry stay (breaking this would break D-B). Do not change the consent wording itself while moving it (D-B scope).

### 3.4 Lock and privacy
- `isLocked()` stays first; a deep link while locked ends on the lock screen and returns to the same route after unlock (test).
- Privacy page top: live "Private by default" lines, each a link: your data stays on this phone; real-data permission (Off / On since date); app lock (Off / On, auto-lock N min); lock screen ("Nothing shown" or "Shows: health, financial"); connections ("0 of 4 on. Nothing leaves this phone" or names); storage protection. The weaker state is shown neutrally with a calm "Turn on" link, no warning colours, no shaming.
- The "nothing leaves this phone" line is computed from the connection flags, not static copy.
- Lock-screen details: Hide is one tap; Show asks one line ("Anyone holding your phone can read this. Show anyway?").
- Settings never reads or exports `tm:secret:*`.
- Footer promise "No scores, ranks or streaks in Deen" is backed by a test that scans the Settings and Deen strings for those words.

### 3.5 Undo map
Look/layout: change back or "Reset look & layout". CSV import: Undo last import. Restore: Go back (7 days). Delete demo: none after confirm (offered demo copy). Clear real: none, stated. Remove lock: set again. Withdraw consent: allow again, data untouched. Withdraw connection: approve again.

---

## 4. Route map and redirects

```
#/settings                      home (Quick card, status strip, 8 cards, Guides row)
#/settings/home/<row>           highlight a Quick-card row (language, theme, textsize)
#/settings/look[/<row>]         design, detail level, layout links, reduce motion, reset look
#/settings/prayer[/<row>]
#/settings/backup[/<row>]
#/settings/backup/restore       restore sub-page (preview, confirm, result)
#/settings/privacy[/<row>]
#/settings/data[/<row>]
#/settings/data/start-real      start-real page
#/settings/plan[/<row>]         automation, progress, stages, plan mode
#/settings/connections
#/settings/delete
#/settings/about                guides list + welcome again
```
One regex family; the registry validates category and row ids. Content routes do not move: `/topics`, `/topic/<id>`, `/cards`, `/more/status`, `/more/fields`, `/more/glossary`, `/more/safety`, `/more/dictionary`, `/more/library`, `/more/halal-flags`. Their tab tag becomes `settings`. (A later tidy-up may move them under `/settings/about/...`; not now.)

Redirects (a `REDIRECTS` table applied in `render()` before matching; `history.replaceState`, no second render):

| Old | New |
|---|---|
| `/more` | `/settings` |
| `/more/data` | `/settings/data` (cards that moved are reached via the status strip and category summaries) |
| `/more/connections` | `/settings/connections` |
| `/more/rules` | `/settings/plan/automation` |
| DEMO banner "Start real" | `/settings/data/start-real` |
| Deen tab prayer cards | stay as a one-line link row "Prayer settings: ..." to `/settings/prayer`; prayer times and fast card remain |
| Today / Journey / Diary Plan cards (progress, stages, plan mode) | chip + link to `/settings/plan/<row>` |
| Save-failed banner | keeps its buttons, plus a link to `/settings/backup` |

The lock check stays first. Anything unmatched still goes to Today.

---

## 5. BUILD PLAN (small PRs, in this order)

Every PR: tests with the feature, `lint`, `test`, `build` green, 360 px screenshot, `DECISIONS_LOG.md` entry with undo steps, Register Change Log only from real evidence. No storage key is renamed or migrated in any PR.

**PR 1. Restore safety (core + existing screen, before any layout work)**
- `restoreBackupAtomic`, `planRestore` (preview data), "Before restore" snapshot (7-day hold, scrubbed on Clear real), result with Go back; wire the existing JSON, encrypted and snapshot restore buttons on `/more/data` to the new flow; label the Save buttons "Contains: ..."; PIN re-ask when locked.
- Acceptance tests: a failing `put` mid-restore leaves the original records and reports "Nothing was changed"; restore with real data and consent off writes nothing; preview counts equal the file and the phone; confirm text contains both numbers; cancel changes nothing; Go back restores the previous records; `scrubRealParts` removes the pre-restore real copy on Clear real; a corrupt or newer-schema file is rejected before anything is touched; app lock on asks the PIN.

**PR 2. Settings shell + registry + tab rename (old routes untouched)**
- `settingsRegistry.ts` (id, category, row id, labels en/bn/mix, keywords, storage key, namespace, computed-default reason); route family `^/settings...`; Settings home with Quick card (moved from `more()`), status strip, 8 category cards pointing to stub category pages that link to the existing screens for now; `nav.settings`; tab tag `settings` on content routes; compact DEMO banner on `/settings*`; `/more` still renders.
- Acceptance: registry test (every `prefs` key and every inventory row appears exactly once; no control for a registry key outside the documented exceptions: globe, per-screen view bars, rows 49-51); tab bar at 360 px with 200 % text, no clipping or horizontal scroll; Quick card visible without scrolling in demo mode at 360 px; locked deep link ends on lock screen and returns after unlock; unknown row id still renders.

**PR 3. Categories (one sub-PR each, in this order)**
- 3a Look & screens: Design version, master Detailed/Compact with the additive `tm:ui:view:_default` and "set vs never set" reader, "Different on N screens", reduce motion, link rows for rows 49-51, Reset look & layout, habit grid via `prefs`. Tests: fixtures with old per-screen keys keep their values; master never writes the 18 keys; tapping an on-screen bar equal to master clears the override; reset touches only look and view keys.
- 3b Privacy & lock: `consentGate()` single source (replace all copies), Privacy page with live read-out, lock-screen details, app lock, Withdraw v1. Tests: only one consent sentence exists in code; after withdraw all real write paths refuse; withdraw deletes nothing; read-out matches real state in each combination; lock-screen Show asks to confirm.
- 3c Demo or real data + Delete data: mode, `/settings/data/start-real` page, counts, `/settings/delete` with typed word and fallback. Tests: accepted words (`delete`, `DELETE`, `ডিলিট`, `ডিলেট`, with spaces and NFC variants), fallback path works, no countdown, clear real still scrubs snapshots and revokes consent, two-step for demo, nothing destructive on Settings home.
- 3d Backup & export: move the cards unchanged (JSON, encrypted, snapshots, CSV, reminder, storage persistence), restore sub-page link, status lines, "settings not in the backup" note. Tests: reminder has one on/off; Today card has none; the computed default and its reason are shown.
- 3e Prayer & alerts: move method, place, alerts; Deen tab keeps a link row; notification permission state line. Tests: namespace-aware place, real place needs the gate, Clear real wipes it, permission state shown for granted / denied / default.
- 3f Plan & progress: plan mode, progress weighting, stage names, rules; chips/links on Today, Journey, Diary Plan; "end pause" chip. Tests: one control per key; `/stuck` still writes mode.
- 3g Connections: move page, fixed control order, computed "nothing leaves this phone" line. Tests: existing connection tests migrated.
- 3h Guides & info: list of content links, welcome-again button.

**PR 4. Redirects + test migration + what-moved note**
- `REDIRECTS` in `render()` with `history.replaceState`; remove `/more` screen; migrate the ~21 test files by the mapping in R7; remove `nav.more`; add the dismissible "what moved" card.
- Acceptance: all old routes end on the right screen; Back does not loop; hash updated; the full suite is green; the only remaining `#/more` references are content routes and the 2 redirect tests.

**PR 5. Search**
- Magnifier opens a field; case-insensitive `includes` over registry labels and keywords in the active language and English, with simple Bangla normalisation; results as row name + category chip linking to `/settings/<cat>/<row>`; empty state shows the last 3 changed (localStorage convenience, safe if unavailable).
- Acceptance: "dark", "অন্ধকার", "font", "pin", "backup" each find the right row; every registry entry is findable; works offline; available at 200 % text; highlight respects reduced motion.

**PR 6. Polish and evidence**
- Focus to `h1` and `document.title` on route change (R11), translated `aria-label` fix, 44 px targets and 8 px gaps check, switch rows at least 48 px with On/Off words, `storage`-event refresh of consent and lock state across tabs, i18n parity test, precache and offline test for every Settings chunk, screenshots at 360 px and 200 % text in all three languages and both themes, Register and Change Log update from the artifacts.
- Acceptance: focus lands on the h1 after navigation (and not on same-screen re-render); offline load of each `/settings/*` route; 360 px / 200 % has no horizontal scroll; every new string present in en, bn and mix.

Parallelisable: 3e, 3f, 3g, 3h after 3b. PR 1 must be first and must not wait for anything.

---

## 6. Risks and rollback

| Risk | Mitigation | Rollback |
|---|---|---|
| Restore rewrite introduces a data-loss bug | PR 1 first, alone, with the failure-injection test; old function kept as the validator | Revert PR 1; old restore returns (known risk, document it) |
| Splitting `dataScreen()` breaks module-level state flags (`realClearAsk` etc.) | Move card builders unchanged, each with its own state flag | Revert that sub-PR; old `/more/data` still exists until PR 4 |
| Master density reader resets existing choices | "Never set" is absence of key; fixtures with old keys | Remove `_default` key; screens read their own key as before |
| Test migration noise hides real regressions | Mechanical mapping, migrated in the same PR as the redirects, 2 explicit redirect tests | Revert PR 4 alone; PR 2-3 keep old routes alive |
| Consent refactor weakens D-B | Wording untouched; one component; fail-closed `readConsent` unchanged; tests that every real write path refuses without consent | Revert PR 3b |
| Typed word locks out a Bangla user | Normalisation, four accepted forms, always-visible fallback; real device check at G2 | Fall back to tick-only path via a constant |
| Hash/redirect loop or lost lock precedence | `isLocked()` first, redirect applied once, test for loop and for lock | Remove `REDIRECTS` entries; old screens still render until PR 4 removes them |
| Tab labels clip at 200 % text | 5 tabs, screenshot test in PR 2 | Keep the label "More" until fixed |
| Registry drifts | Registry test fails on any new `prefs` key or duplicate control | n/a |
| First fold still heavy | Compact banner, Quick card first, 8 cards, one-line summaries; measure at 360 px | Drop the status strip to one line |
| Settings not in backups surprises the user | Plain note on Backup page now | Optional versioned block later |
| Precache or lazy chunk missing offline | Precache assertion and offline test | Move the page into the main bundle |
| Scope creep (high contrast, week start, currency, accounts) | Explicit "not now" list in 1.4 | n/a |

Rollback in general: this work is routing and layout over unchanged storage keys. The only additive keys are `tm:ui:view:_default` and `tm:ui:movedNote` (and the optional search-recent list); removing them restores previous behaviour. The only new data is the 7-day "Before restore" snapshot, which is scrubbed with real data on Clear real and is deletable.

## 7. Owner items (only what the charter requires)
- No money, no external service, no AI, no new data leaves the device: nothing here needs approval.
- One logged default, changeable by the owner later: Withdraw v1 = "stop new real writes only" (read-only or hidden is a product choice). Format when asked: "সিদ্ধান্ত লাগবে: Withdraw করলে আগের real entry কি শুধু দেখা যাবে (read-only), নাকি লুকানো থাকবে? · আমার সুপারিশ: আপাতত কিছু বদলাবে না, শুধু নতুন entry বন্ধ · না বললে আমি X ধরে এগোব।"
- Human task later: Bangla keyboard test of the typed word on a real phone (G2 device test); Bangla reviewer sign-off (TM-TST-161).

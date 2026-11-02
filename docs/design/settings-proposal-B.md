# Settings tab: proposal B (UX, accessibility, privacy, safety)

Author: Expert B. Independent proposal. Read-only audit; no code changed. Sources read: `CLAUDE.md`, `docs/design/settings-inventory.md`, `src/app.ts`, `more()` / `dataScreen()` / `clearRealCard()` in `src/ui/screens.ts`, `src/ui/modeUi.ts`, `src/core/consent.ts`, `src/core/appLock.ts`, `src/core/backup.ts`, `docs/design/bangla-loanword-swaps.md`, `src/ui/styles.css`.

## বাংলা সারাংশ

- নতুন "সেটিংস" ট্যাব: ওপরে ৩টি সবচেয়ে দরকারি জিনিস সরাসরি (ভাষা, থিম, লেখার সাইজ), তার নিচে ব্যাকআপ ও রিমাইন্ডারের অবস্থা, তারপর ৮টি ক্যাটাগরি। বিপজ্জনক বোতাম (ডিলিট) একদম শেষে, আলাদা "ডেঞ্জার জোন"-এ।
- প্রতিটা সেটিংয়ের ঠিক একটাই ঘর। অনুমতির টিক (consent) একটাই উৎস: সেটিংস > প্রাইভেসি ও লক। বাকি জায়গায় একই কম্পোনেন্ট দেখাবে, আলাদা লেখা নয়।
- "Restore" এখন কোনো কনফার্ম ছাড়াই পুরো ডেটা মুছে নতুন করে বসায় (`restoreBackup` আগে `repo.clear` করে)। এটা সবচেয়ে জরুরি ঠিক করার বিষয়: প্রিভিউ, কনফার্ম, আগে অটো-সেফটি কপি।
- "প্রাইভেট বাই ডিফল্ট" শুধু লেখা নয়; সেটিংসের প্রাইভেসি পাতায় লাইভ অবস্থা দেখাবে (লক বন্ধ/চালু, কানেকশন সব বন্ধ, লক-স্ক্রিনে কিছু দেখায় না)।
- পুরোনো রুট ও storage key বদলাবে না, তাই migration লাগবে না।

---

## 0. Principles (the rules I design by)

1. One setting, one home. A shortcut elsewhere is allowed only if it is a link, or writes the same key with the same component (language globe is the one allowed exception).
2. Order by how often a first-time phone user needs it, not by how the code is organised.
3. Moving toward more privacy or safety = one tap. Moving away from it, or anything that deletes = a deliberate extra step.
4. "Private by default" must be a live read-out of real state, never a fixed sentence (hard rule: never claim what is not true).
5. No Settings page may show a score, rank, streak, or red "missed" copy (Deen and goals included).
6. Do not rename storage keys (`tm:ui:*`, `tm:secret:*`, `tm:consent:*`). Settings is a new view over existing keys. No migration.
7. Changes apply instantly, with a small "Saved" status line (`role="status"`). No global Save button. Only PIN, key and confirm flows have their own buttons.

## 1. Navigation

- New bottom tab: **Settings** (gear icon + label). `More` stays as the content hub (Topics, Glossary, Safety, Field guide, Dictionary, Library, Halal flags, Status, module cards). Setting-like items leave More.
- Route family: `#/settings` (home), `#/settings/look`, `/reminders`, `/backup`, `/backup/restore`, `/privacy`, `/data-mode`, `/plan`, `/connections`, `/help`, `/danger`. Old routes (`/more/data`, `/more/connections`, `/more/rules`) keep working and show a one-line "moved to Settings" link, so no bookmark or test breaks.
- Six tabs on a 360 px phone is about 60 px each. At 200 % text size Bangla labels will wrap. Fallback if the 360 px / 200 % test fails: keep five tabs and put a gear button in the top bar next to the language globe. Decide by screenshot evidence, log it in `DECISIONS_LOG.md`.
- Back button: every sub-screen has a `← Settings` crumb (existing `.crumb`, 44 px) and Android back returns to the category, never to the previous destructive confirm.

### 1.1 Settings home (top to bottom)

1. h1 "Settings".
2. Three inline controls (the real home of these three): **Language** (English / বাংলা / Mix), **Theme** (Auto / Light / Dark), **Text size** (100 / 125 / 150 / 200 %).
3. Two status cards (read-only plus one button each): **Backup** ("Last file backup: 12 Oct" or "No backup file yet" + [Save backup now]), **Reminders** ("Prayer alerts: off · Backup reminder: on" + [Change]).
4. Category list (cards, one line description each), in this order: Language & look, Reminders & prayer, Backup & export, Privacy & lock, Demo or real data, My plan & screens, Connections, Help & welcome.
5. A visually separate last block: **Danger zone** (link only, grey-red border, 24 px gap above). Nothing destructive is on the home page itself.
6. Small search box (filters category and setting names) shown only when text size is 100 or 125 %, hidden otherwise; it is advanced convenience, not required.

## 2. Category names (plain words)

| # | EN | BN | Mix |
|---|----|----|-----|
| 1 | Language & look | ভাষা ও লুক | ভাষা & Look |
| 2 | Reminders & prayer | রিমাইন্ডার ও নামাজ | Reminders & নামাজ |
| 3 | Backup & export | ব্যাকআপ ও এক্সপোর্ট | Backup & Export |
| 4 | Privacy & lock | প্রাইভেসি ও লক | Privacy & Lock |
| 5 | Demo or real data | ডেমো না আসল ডেটা | Demo বা Real ডেটা |
| 6 | My plan & screens | আমার প্ল্যান ও স্ক্রিন | আমার Plan & Screens |
| 7 | Connections | কানেকশন (সব বন্ধ) | Connections (all off) |
| 8 | Help & welcome | সাহায্য ও স্বাগত | সাহায্য & Welcome |
| 9 | Danger zone | ডিলিট ও রিসেট (সাবধান) | Delete & Reset (careful) |

Words follow the loanword rule (ব্যাকআপ, রিমাইন্ডার, প্রাইভেসি, লক, কানেকশন, ডিলিট, প্ল্যান, স্ক্রিন, ডেটা). "নামাজ" stays. "Danger zone" in Bangla avoids the word "বিপদ" because it frightens; the red tone is limited to the final confirm button only. All Bangla stays "যাচাই হয়নি" until TM-TST-161.

## 3. Every inventory setting, one home

Control types: seg = segmented buttons, switch = on/off switch, step = number stepper (+/- buttons plus typed value), slider, select, btn = button, danger = button with confirm flow, pin = PIN form, link = link only.
Level: **B** basic (visible by default), **A** advanced (inside a "More options" fold on that sub-screen).
"Shortcut" = allowed secondary entry, same key.

### A. Look, language, accessibility

| # | Setting | Category > sub-screen | Control, level |
|---|---------|-----------------------|----------------|
| 1 | Language | Settings home (inline) | seg 3, B. Shortcut: top-bar globe. First-run uses the same component and gains Mix |
| 2 | Theme | Settings home (inline) | seg 3, B |
| 3 | Design version | Language & look > Look | 3 preview cards (radio), B |
| 4 | Text size | Settings home (inline) | seg 4, B. Live preview line under it |
| 5 | Lock-screen details: worship | Privacy & lock > Lock-screen details | switch "Show on lock screen", B. Default hide |
| 6 | Lock-screen details: health | same | switch, B |
| 7 | Lock-screen details: financial | same | switch, B |
| 8 | Lock-screen details: third party | same | switch, B |

### B. Data mode, consent, privacy

| # | Setting | Category > sub-screen | Control, level |
|---|---------|-----------------------|----------------|
| 9 | Data mode (demo / real) | Demo or real data > Mode | seg 2, B. Real needs consent gate (row 10) |
| 10 | Real-data consent | Privacy & lock > Real-data permission (the single source) | status card + switch "Allow real data on this phone", B. Everywhere else the same `consentGate` component or a link |
| 11 | Start real now | Demo or real data > Start real | danger flow page, B (see section 4.3). Banner button leads here |
| 12 | Keep demo / not now | Demo or real data > Mode | transient prompt only; Settings shows read-only "Asked on: date" |
| 13 | Delete my demo entries | Danger zone | danger |
| 14 | Clear all real data | Danger zone | danger (strongest) |
| 15 | Ask browser to keep storage | Backup & export > Keep my data safe | btn + status ("Protected" / "Not protected"), B |
| 16 | App lock: set PIN | Privacy & lock > App lock | pin form, B |
| 17 | App lock: auto-lock timing | Privacy & lock > App lock | seg 4 (at once / 1 / 5 / 15 min), A |
| 18 | App lock: lock now | Privacy & lock > App lock | btn, B |
| 19 | App lock: remove | Privacy & lock > App lock | danger-lite (PIN required), B |
| 20 | App lock: forgot PIN | Control stays on lock screen only; Privacy & lock shows a help text explaining the 15 minute wait | link/text |

### C. Backup, export, import

| # | Setting | Category > sub-screen | Control, level |
|---|---------|-----------------------|----------------|
| 21 | CSV export, demo | Backup & export > Spreadsheet copy | btn, A |
| 22 | CSV export, real | same | btn, A. Disabled with reason text until consent |
| 23 | CSV import: check file | Backup & export > Spreadsheet copy | file btn, A |
| 24 | CSV import: apply | same | btn with preview + confirm, A |
| 25 | CSV import: undo last | same | btn, A (stays here because it is undo, not destructive) |
| 26 | JSON backup save (demo only) | Backup & export > Save a backup | btn, B. Label shows exactly what it contains |
| 27 | JSON restore | Backup & export > Restore (careful) | file btn + preview + confirm, B (see 4.2) |
| 28 | Encrypted backup save | Backup & export > Save a backup | btn + passphrase form, B |
| 29 | Encrypted backup restore | Backup & export > Restore (careful) | same flow as 27, B |
| 30 | Snapshots: automatic | Backup & export > Snapshots | switch, A |
| 31 | Snapshots: keep how many | Backup & export > Snapshots | seg 3/5/10, A. Text says "older copies are removed" |
| 32 | Backup reminder | Reminders & prayer > Backup reminder | switch, B. Today card keeps only [Later] and a link here (no second on/off) |
| 33 | Reminder: remind me tomorrow | Reminders & prayer > Backup reminder (shows "snoozed until") | transient action on Today card |
| 34 | Snapshot: take now | Backup & export > Snapshots | btn, A |
| 35 | Snapshot: save to file | Backup & export > Snapshots | btn, A |
| 36 | Snapshot: restore | Backup & export > Restore (careful) | same confirm flow as 27, A |
| 37 | Snapshot: load from file | Backup & export > Restore (careful) | file btn, A |

### D. Connections

| # | Setting | Category > sub-screen | Control, level |
|---|---------|-----------------------|----------------|
| 38 | Approve a connection (x4) | Connections > one page per facility | danger-lite (cost and data-leaves-phone text, tick), A |
| 39 | Enable / disable (x4) | same | switch, enabled only after approval, A |
| 40 | Save / remove API key (x4) | same | text field + btn; remove = confirm, A |
| 41 | Withdraw approval (x4) | same | btn, one tap (moves toward privacy), A |

### E. Plan, progress, layout

| # | Setting | Category > sub-screen | Control, level |
|---|---------|-----------------------|----------------|
| 42 | Rule: smaller step | My plan & screens > Automation rules | switch, A |
| 43 | Rule: next stage | same | switch, A |
| 44 | Rule: break after focus | same | switch, A |
| 45 | Rule: focus again | same | switch, A |
| 46 | Plan mode | My plan & screens > Plan mode | seg 3 (Normal / Minimum week / Pause), B. Current mode shown at top of Today as a chip. /stuck writes it and says so |
| 47 | Stage names template | My plan & screens > Stage names | select + preview, A |
| 48 | Overall progress weighting | My plan & screens > Progress | seg 2, A. The two cards on Today and Journey become a read-only line + link |
| 49 | Horizon layout | My plan & screens > Screens & views | seg 2, A. Shortcut allowed on screen |
| 50 | Universe view | same | seg 2, A. Shortcut allowed |
| 51 | Habit grid range | same | seg 3, A. Move to `prefs` (key stays) |

### F. Per-screen Detailed / Compact (rows 52-60, 18 keys)

| # | Setting | Category > sub-screen | Control, level |
|---|---------|-----------------------|----------------|
| 52-59, 60 | Detailed/Compact for Today, Journey, Plan, Money, Habits, Report, Review, Weekly, Log, Goals, Wheel, Cards, Library, Rules, Risks, Ventures, Team, History | My plan & screens > Screens & views | One **master** seg "Detail level: Detailed / Compact" (B) that sets all; an A-level list of 18 rows "Same as master / Detailed / Compact" for overrides. Existing on-screen bar stays as shortcut writing the same key |

Master semantics: "Same as master" is the default stored as absence of a key, so no migration. Existing explicit choices are preserved as overrides.

### G. Prayer (moved from the Deen tab; Deen tab keeps a one-line "Prayer settings" link)

| # | Setting | Category > sub-screen | Control, level |
|---|---------|-----------------------|----------------|
| 61 | Method | Reminders & prayer > Prayer times | select, B. Note "Check with an official timetable" stays |
| 62 | Asr rule | same | seg 2, A |
| 63 | Minute offsets (x5) | same | step x5, A |
| 64 | Reset method to default | same | btn, A (confirm line, harmless) |
| 65 | Prayer place (lat, lon) | Reminders & prayer > Prayer times > Place | number x2, B. Tagged "Private". Real place needs consent gate |
| 66 | Use Dhaka | same | btn, B |
| 67 | Pre-prayer alert | Reminders & prayer > Prayer alerts | switch, B. Shows phone permission state |
| 68 | Minutes before | same | step 1-60, A |
| 69 | Azan alert | same | switch, B |
| 70 | Which prayers alert (x5) | same | switch x5, A |
| 71 | Sound | same | switch, B (default off) |
| 72 | Volume | same | slider with number, A |
| 73 | Azan preview | same | btn, A |

### H. Not settings, but assigned

| Item | Home |
|------|------|
| Onboarding re-run (row 74) | Help & welcome > "Show the welcome again" (btn; deletes nothing; text says so) |
| Topic drawer (row 75) | stays in top bar (content, not a setting) |
| Reduce motion (new) | Language & look > Text & comfort: seg "Follow phone / Always reduce", B |
| High contrast (new) | same: seg "Follow phone / On", B |
| Notification status (new, read-only) | Reminders & prayer top: "Phone allows notifications: yes / no / not asked" + how to fix |
| Reset look & layout (new) | Help & welcome: btn, resets only `tm:ui` look and view keys; never touches data |

Deliberately not added: currency (BDT only per spec), week-start, unit options, profile photo, accounts. Add later only on a real need.

Coverage check: rows 1-73 each appear once above (52-60 as the grouped F row).

## 4. Safety design

### 4.1 Danger zone

- Last item on Settings home, own page `#/settings/danger`. Page order inside: (1) Delete my demo entries, (2) Clear all real data. Nothing else is on it (restore and remove-lock are not deletion of the user's life data, so they live with their topic).
- Each action is a card with: what it does in one sentence, **how many entries** will go (live count), what it does not touch (e.g. "Your real data is not touched"), then one grey button "Continue". Red appears only on the final confirm button.
- The danger page is not reachable from a banner, a toast, or a card on another screen. Only the Settings link.
- DOM order = visual order = last, so a screen-reader user meets it last, with `h2` "Danger zone" and a `role="group"` per action.

### 4.2 Restore (today: no confirm, and it wipes first)

Evidence: `restoreBackup()` validates, then `repo.clear(b.ns)` and puts every record. The inventory says "replaces matching ids", but the code removes the whole namespace first. The UI calls it straight from `onchange`, so picking a file is enough.

Design:
1. Pick file (nothing happens yet).
2. **Preview card**: file date, which data it holds (Demo / Real / Both), number of entries, compared with entries on this phone now ("This phone: 42 entries. File: 30 entries. Restoring will replace the 42."). If file has real data and consent is off: stop with a plain message and a link to the consent card.
3. Auto-create a **"Before restore" snapshot** first (marked as such, not pruned by "keep N" for 7 days).
4. Confirm button text states the effect: "Replace my 42 entries with the 30 in this file". Cancel is the default focus.
5. Engineering note for the builder: do the replace so a failure part-way cannot leave an empty store (write to a staging step or restore the pre-snapshot automatically on error). Today a failed `put` after `clear` loses data.
6. Result card: "Done. 30 entries restored. [Undo: go back to before]" using the snapshot from step 3.

### 4.3 Start real now (deletes demo)

Today the banner on every screen opens an inline confirm card. Proposal: banner button only navigates to `#/settings/data-mode/start-real`, a full page with: what will happen (demo entries deleted, count), what stays (language, look, settings), the consent gate (one component), and an optional [Save a demo copy first] button. Then one confirm. A page, not an overlay, so there is room to read in Bangla and no accidental tap.

### 4.4 Undo map

| Action | Undo |
|--------|------|
| Language, theme, text size, layout, switches | change it back; "Reset look & layout" |
| CSV import | "Undo last import" (exists) |
| Restore (any kind) | Auto "before restore" snapshot, one-tap "go back" for 7 days |
| Delete demo | Demo is disposable; offer [Save a demo copy first]. No undo after confirm |
| Clear all real data | **No undo, by design**: clear-real scrubs all snapshots (`scrubRealParts`) so no hidden copy stays. Safety comes from before-steps: live count, "Save a backup file first" button, and typing the word (see 4.5). Say this plainly in the card |
| Remove app lock | Set it again |
| Withdraw consent | Tick again; data is not deleted (see 4.6) |
| Withdraw connection approval | Approve again |

### 4.5 What must never be one tap

Clear all real data; delete demo; any restore; start real now; show worship/health/financial/third-party on the lock screen (moves away from privacy: one tap to open, then a one-line "Anyone holding your phone can read this. Show anyway?" confirm); approve or enable a connection; save or remove an API key; remove the app lock (PIN needed); forgot-PIN flow; change the real prayer place when consent is off; "Reset look & layout" (one confirm line, since it changes many things).

Clear all real data additionally: the user types a short word (BN: "ডিলিট", EN: "DELETE") in a field with a 48 px target. A tick alone is too easy to do on autopilot. Chosen over a countdown because a countdown excludes slow readers. Not used for delete demo (low stake).

Everything else (hide on lock screen, withdraw a connection, lock now) stays one tap because it moves toward safety.

### 4.6 Consent ticks, one source of truth

Today the tick exists in 5+ places with different wording (first-run, Start-real, data page, Deen place form, entry forms). Design:

- One module-level component `consentGate()` with one text, one tick, one function (`grantConsent`). Settings > Privacy & lock > Real-data permission is its **home** and the only place that shows status, date given, and withdraw.
- Other places (first-run, start-real page, Deen place, entry forms) must use `consentGate()` or show a link "Allow real data in Settings". No local copies of the wording.
- Withdraw (new, today it only happens as a side effect of Clear all): "Stop adding real data." Effect: no new real writes, no real CSV/backup export, existing real entries stay on the phone and are shown read-only. This is an owner-level product semantic (D-B scope), so log it in `DECISIONS_LOG.md` and ask once if the owner wants "read-only" or "hidden". Recommended default: read-only.
- Reading is fail-closed already (`readConsent` returns false on any problem). Keep that.

## 5. Privacy and Deen grouping

**Privacy & lock** page, top to bottom:

1. **Private by default: live read-out** (computed, each line a link to its control):
   - "Your data stays on this phone." (true by architecture; D-B)
   - Real data permission: Off / On since 25 Oct.
   - App lock: Off / On, locks after N min.
   - Lock screen: "Nothing shown" or "Shows: health, financial" (lists what is on).
   - Connections: "0 of 4 on. Nothing leaves this phone" or names the ones on.
   - Storage protection: Protected / Not protected.
   If a line is the weaker state (e.g. lock off), show it neutrally with a calm [Turn on] link, no warning colours or shaming.
2. Real-data permission (consent source).
3. App lock (set, timing, lock now, remove, forgot-PIN help text).
4. Lock-screen details: worship, health, financial, third party. Order by sensitivity, worship first, each with its own plain example line.
5. Footer: "Deen notes are private. No scores, no ranks, no streaks." (a design promise, true as of code audit; keep as a test in the repo, not only text).

**Deen**: there is no separate Deen settings category, because grouping Deen alone invites a "religion section" with a score feel. Deen-specific settings live where their function is: prayer times and alerts under Reminders & prayer; worship lock-screen privacy under Privacy; prayer place (a personal location) tagged **Private**, needs consent in real mode and is wiped by Clear real data. Prayer alert copy stays calm; no "missed" counters in Settings. Scripture text stays out until D-D.

## 6. Accessibility

- **Targets**: every control at least 44 px (seg buttons already 44, `.btn` 52). Switches are full-width rows (label + switch) at least 48 px high, the whole row tappable. The two checkbox rows today use a 24 px input; the new switch row replaces them. At least 8 px between neighbouring targets; 24 px between a danger button and any safe button; never put a danger button inside a seg group.
- **Screen-reader order**: skip link, h1, home inline controls, status cards, categories, Danger zone last. One `h1` per page, `h2` per section, no heading skips. Seg groups keep `role="group"` with a translated `aria-label`. Fix: `langButtons()` in `modeUi.ts` hard-codes `aria-label="Language"` in English, so a Bangla screen-reader user hears English. Use the translated label.
- **Status**: "Saved", errors and results use `role="status"` / `role="alert"`; after opening a confirm step move focus to its heading; Esc and the Cancel button close it; Cancel is first in tab order for destructive confirms.
- **Text size**: keep 100/125/150/200 %; add "Follow phone" as an option when the browser exposes it, otherwise leave out. Settings layout is single column, no horizontal scroll at 200 % on 360 px; the seg group wraps (`flex-wrap` exists). Bangla needs more line-height at larger sizes (matras); test with Hind Siliguri bundled font at 200 %.
- **Contrast**: AA minimum (4.5:1 text, 3:1 controls) in all three designs and both themes. New "High contrast" switch follows `prefers-contrast` by default, manual override available. State is never colour only: on/off switches have the words On/Off.
- **Reduced motion**: CSS already honours `prefers-reduced-motion`; add a manual "Always reduce" so a user whose phone setting is hidden can still stop animations. The prayer sound plan already reads this media query.
- **Sound and vibration**: default off; preview button; volume has a number readout, not only a slider (sliders are hard with one thumb).
- **Language**: switching language re-renders in place and keeps scroll and open sub-screen. Open confirm flows reset (safe direction).

## 7. Progressive disclosure

- Level B (visible): language, theme, text size, backup status and save, backup reminder, prayer alerts on/off, prayer place, app lock set/remove, consent status, demo/real switch, restore (with its care), master Detail level, plan mode.
- Level A (behind "More options", closed by default, one fold per sub-screen): minute offsets, Asr, volume, which prayers, snapshot keep count, auto-lock timing, CSV, rules, stage names, progress weighting, 18 per-screen overrides, connections.
- First visit shows B only; the fold remembers its state per sub-screen (localStorage convenience, harmless if lost).
- A section's header says how many options are folded ("6 more options").
- Connections stays visible as a category because "everything is off" is itself reassurance, but its page opens with that sentence, then a collapsed list.

## 8. First-run onboarding and the "Start real now" banner

- First-run screen stays tiny: language (en / bn / **Mix added**) and demo vs real. It reads and writes the same pref and uses the same `consentGate()`. It does not duplicate other settings.
- After the first-run, a one-time dismissible card on Today (not a modal): "Want to change text size, language or alerts? Settings." Gone after one tap.
- The DEMO banner stays (honest label; demo must be labelled). Its button becomes "Start real data" and navigates to the Settings start-real page (section 4.3). It stops being a place where deletion starts.
- The daily "delete demo?" ask card: keep, but cap it (it already supports "not now"); add a Settings switch "Ask me about demo data" (A) so a user is never nagged. Default on.
- Settings > Help & welcome > "Show the welcome again" re-runs onboarding (`resetOnboard` + `prefs.onboard = "pending"`), clearly says it deletes nothing.

## 9. Failure cases (non-programmer on a phone)

1. **Restore wipes data**: file picker = instant replace (section 4.2). Highest risk. Failure part-way (`clear` then a failing `put`) can leave an empty namespace.
2. **False sense of backup**: JSON "Save" is demo only (`createBackup(...,"demo")`). A user with real data presses it and believes they are safe. The Backup page must show, per file type, "Contains: Demo only / Real + Demo" and a status line "Real data backup: none yet".
3. **Lost passphrase**: encrypted backup cannot be opened without it (never stored). Say so before creating, with a "I wrote it down" tick.
4. **Forgot PIN and no backup**: the 15 minute wait removes the PIN only, not data. Explain this on the lock help text so the user does not delete the app in panic.
5. **Notification permission blocked**: a switch showing "On" while the phone blocks notifications is a silent failure. Show the real permission state and fix steps; fall back to in-app reminders (exist) and say which one is active. Also, prayer alerts when the app is closed may not fire on some phones; the page should say "alerts need the app open or installed" only after checking what actually works (G2 device test).
6. **Settings are not in backups** (they are `tm:ui:*` in localStorage as far as read). After a restore or browser data clear, the phone looks reset. Say so, and consider including non-sensitive look settings in the file later.
7. **Storage cleared by the browser** (private window, low space): data and settings vanish. Hence the "Keep my data safe" status and backup nudge.
8. **200 % text** breaks tab bar and seg rows: test at 360 px.
9. **Mis-tap** between adjacent segs (Hide / Show on lock screen): 8 px gap, and Show asks to confirm.
10. **Someone else holds the unlocked phone**: Danger zone and Restore ask for the PIN again when lock is on (re-auth within the page, no extra setting).
11. **Language switch mid-flow**: confirm flags are per page view and reset; the user must start the confirm again. Acceptable and safe.
12. **Consent withdrawn but data still there**: user thinks data was deleted. Withdraw text and the status card must say "Your 42 entries are still on this phone" and link to Danger zone.
13. **Daily demo-delete nag** annoys, user presses the wrong button. Cap and the switch in section 8.
14. **Hash-route back** after a destructive result must not replay the action; results are rendered from state, buttons are not re-run.
15. **Overload**: 9 categories plus 73 settings could still feel big. Counts: home shows 3 controls, 2 cards, 8 categories, 1 link. If screenshots look heavy, merge "Help & welcome" into More and keep 7.

## 10. What I expect the other expert to get wrong

- Mirroring the inventory letters A-H as the categories. That is a code view; users think "my alerts", "my backup", "my privacy".
- Leaving prayer settings on the Deen tab ("keep Deen together"), or making a Deen category that feels like a piety dashboard.
- Keeping dangerous actions inline on their topic pages (restore next to save), or a danger zone placed high on the page.
- A consent link on Settings but still 5 local tick copies elsewhere; or removing the just-in-time tick from entry forms (breaking D-B, which needs consent at the point of entering real data).
- Treating "private by default" as a paragraph of text instead of a live status.
- Offering undo for Clear real data via a hidden snapshot, which would contradict the existing `scrubRealParts` privacy guarantee.
- Adding a sixth tab without testing 360 px at 200 % text.
- Listing 18 per-screen Detailed/Compact switches as 18 front-line rows instead of one master plus folded overrides.
- Renaming storage keys or adding a migration; unnecessary here.
- Adding items outside the charter (accounts, cloud sync, currency, profile photo) or red "missed" language.
- Not noticing that the JSON backup is demo-only and that `restoreBackup` clears first.

## 11. Build order (suggestion, small PRs)

1. Settings home + routes + redirects from old paths (no setting moves yet).
2. Move Look/Language/Text size to home; add reduce-motion and contrast.
3. Restore flow with preview, pre-snapshot, confirm (safety fix first, it is the biggest risk).
4. `consentGate()` single component and Privacy page with live read-out.
5. Move Reminders & prayer; Backup & export regroup; Danger zone page.
6. Master Detail level + folded overrides; remaining plan items.
7. Start-real page and banner redirect; onboarding re-run.
Each PR: tests (route renders, one home per key, restore preview, consent single source), screenshots at 360 px and 200 % text, DECISIONS_LOG entry, Register update from real evidence only.

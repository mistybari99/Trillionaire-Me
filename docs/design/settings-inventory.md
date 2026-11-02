# Settings inventory (audit, 2 Nov 2026)

Scope: the whole app as built on branch `ccr-8b686ba2-vitt45`. Read-only audit of `src/app.ts`, `src/ui/*.ts`, `src/ui/state.ts`, `src/core/*` keys. No code was changed.

## বাংলা সারাংশ (short)

- অ্যাপে মোট **৭৩টি সেটিং/অ্যাকশন** (বিস্তারিত ধরলে প্রায় ১০২টি) আছে। এর মধ্যে বেশিরভাগ "More" এ নেই, ছড়িয়ে আছে Today, Journey, Diary, Deen, Habits ও More > Data-তে।
- সবচেয়ে বড় সমস্যা: (১) ভাষা ৩ জায়গায়, Overall-progress ওজন ২ জায়গায়, backup-reminder ২ জায়গায়; (২) নামাজের সেটিং Deen পাতায় (More-এ নয়); (৩) মুছে ফেলার বিপজ্জনক বোতাম সাধারণ backup/CSV বোতামের পাশে; (৪) ১৮টি পাতায় আলাদা "Detailed/Compact" বোতাম, আরও ৩টি আলাদা layout বোতাম; (৫) More > Data পাতায় ১৫টির বেশি কার্ড একটানা, ৩৫+ বোতাম।
- প্রস্তাব: একটাই "Settings" ঘর (More থেকে), গ্রুপ করা: Look, Language, Privacy & lock, Data & backup, Prayer, Alerts, Connections, Danger zone। এই ফাইলে শুধু অডিট; কোড বদল হয়নি।

## 1. Navigation today

Bottom tabs (`TABS` in `src/app.ts`): Today, Journey, Diary, Deen, More. Top bar: menu button (topic drawer), online badge, DEMO badge, language globe.

Routes tagged "more" tab: `/more`, `/more/status`, `/more/fields`, `/more/glossary`, `/more/safety`, `/more/dictionary`, `/more/data`, `/more/connections`, `/more/library`, `/more/halal-flags`, `/more/rules`, `/topics`, `/topic/<id>`, `/cards`. `/start` (onboarding) and `/capture`, `/stuck`, `/reward`, `/focus/<id>`, `/habits` sit under the Today tab.

### 1.1 Everything under More today, in current order (`more()` in `src/ui/screens.ts`)

| # | Item | Type | Route |
|---|------|------|-------|
| 1 | Topics (intro card) | content link | `/topics` |
| 2 | Capability status | info link | `/more/status` |
| 3 | Field guide | info link | `/more/fields` |
| 4 | Glossary (unreviewed draft) | content link | `/more/glossary` |
| 5 | Safety & limits | info link | `/more/safety` |
| 6 | Demo & real data | SETTINGS hub (mode, consent, clear, storage, lock, CSV, backup, snapshots) | `/more/data` |
| 7 | Data dictionary | info link | `/more/dictionary` |
| 8 | Connections | SETTINGS (optional facilities) | `/more/connections` |
| 9 | Ready systems (library) | content, has Detailed/Compact | `/more/library` |
| 10 | Automation rules | SETTINGS (4 switches), has Detailed/Compact | `/more/rules` |
| 11 | Halal-check flags (draft) | content | `/more/halal-flags` |
| 12 | Heading "Display" | | |
| 13 | Language (English / Bangla / Mix) | choice, inline | `/more` |
| 14 | Theme (Auto / Light / Dark) | choice, inline | `/more` |
| 15 | Design version (3 radio cards) | choice, inline | `/more` |
| 16 | Text size (100/125/150/200) | choice, inline | `/more` |
| 17 | Lock-screen details (4 categories, Hide/Show) | choice x4, inline | `/more` |
| 18 | Heading "Other sections" | | |
| 19 | Module status cards M11, M17, M18, M19, M20, M21, M23, M24 (M22 skipped) | info only | `/more` |
| 20 | Disclaimers | info | `/more` |

Mixed order: 11 navigation cards first, then Display settings, then status cards. Real settings are in 3 different shapes (link cards, inline controls, a hub page).

### 1.2 `/more/data` order today (`dataScreen()`)

1 Demo/Real switch · 2 Real data count card · 3 Real-data consent card (only until ticked) · 4 Clear all real data (danger) · 5 Demo count card · 6 note · 7 Delete demo entries (danger) · 8 Storage on this device · 9 App lock · 10 CSV export · 11 CSV import (+ undo) · 12 heading "Backup" + JSON save + JSON restore (bare buttons, no card) · 13 Encrypted backup · 14 Local snapshots (auto, keep, reminder, take, save to file, restore, load file) · 15 disclaimers.

## 2. Inventory table

Legend. Type: toggle / choice / number / action / danger. Scope: G = global (whole device), S = per screen, NS = per namespace (demo vs real). Risk: safe / confirm (asks first or should) / destructive. Consent: D-B = needs the real-data tick; D-C = AI/spend approval; owner = owner approval; "-" none. Storage keys: `tm:ui:*` = localStorage via `prefs` in `src/ui/state.ts` unless noted; `tm:secret:*` / `tm:consent:*` = per-device store (`consentKv`, never in backups).

### A. Look, language, accessibility

| # | Setting | EN label | Where today (route + screen) | Storage key / function | Default | Type | Scope | Risk | Consent | Current path |
|---|---------|----------|------------------------------|------------------------|---------|------|-------|------|---------|--------------|
| 1 | Language | Language | 3 places: top-bar globe (every screen), More inline card, first-run screen (only en/bn, no Mix) | `tm:ui:lang` (`prefs.lang`) | bn | choice (en / bn / mix) | G | safe | - | globe: 1 tap; More > Display > Language |
| 2 | Theme | Theme | `/more` inline | `tm:ui:theme` | auto | choice (auto/light/dark) | G | safe | - | More > Display > Theme |
| 3 | Design version | Design version | `/more` inline (radio cards) | `tm:ui:design` | light-futuristic | choice (light-futuristic / emerald-obsidian / broadsheet "Classic") | G | safe | - | More > Display > Design version |
| 4 | Text size | Text size | `/more` inline | `tm:ui:scale` | 100 | choice (100/125/150/200) | G | safe | - | More > Display > Text size |
| 5 | Lock-screen details, worship | Lock-screen details > Worship | `/more` inline | `tm:ui:notifyShow` (JSON) | hide | toggle (hide/show) | G | safe (but privacy-relevant) | - | More > Display > Lock-screen details |
| 6 | Lock-screen details, health | same card | `/more` | same key | hide | toggle | G | safe | - | same |
| 7 | Lock-screen details, financial | same card | `/more` | same key | hide | toggle | G | safe | - | same |
| 8 | Lock-screen details, third party | same card | `/more` | same key | hide | toggle | G | safe | - | same |

Not present anywhere: reduce-motion switch, high-contrast switch, font choice, week-start day, currency, time/date format, units. (Search found no key or control.)

### B. Data mode, consent, privacy

| # | Setting | EN label | Where today | Storage / function | Default | Type | Scope | Risk | Consent | Current path |
|---|---------|----------|-------------|--------------------|---------|------|-------|------|---------|--------------|
| 9 | Data mode (Only demo / Only real) | Demo & real data > mode switch | `/more/data` card; first-run screen (`firstRunScreen`); DEMO banner "Start real" (every screen in demo); daily "delete demo?" ask card | `tm:ui:dataMode` (`prefs.dataMode`, `switchMode()`) | unset until first-run choice; effective demo | choice | G (decides NS) | confirm (real needs tick) | D-B | More > Demo & real data (3 other entry points) |
| 10 | Real-data consent tick | "I understand... data stays on this phone" | `/more/data` consent card; first-run real-confirm; Start-real confirm card; Deen place form (`consentPrompt`); data-entry forms (`realConsent` in `entry.ts`) | `tm:consent:real:v1` (`grantConsent` / `revokeConsent`) | off | toggle (tick) | G | confirm | D-B | at least 5 places |
| 11 | Start real now (delete demo, turn real on) | Start real now | DEMO banner (all screens), `/more/data` mode card, daily ask card | `confirmStartReal()` (clears `store.demo`, grants consent, sets mode) | - | danger | NS (demo) | destructive (demo only) | D-B | banner on every screen; More > Demo & real data |
| 12 | Keep demo / "not now" | Keep demo | daily ask card | `tm:ui:demoAskedOn` | - | action | G | safe | - | appears on its own |
| 13 | Delete my demo entries | Delete my demo entries | `/more/data` (2 taps) | `store.demo.clear()` | - | danger | NS (demo) | destructive, 2-tap confirm | - | More > Demo & real data |
| 14 | Clear all real data | Clear all real data | `/more/data` (2 taps) | `store.real.clear()`, `prefs.clearRealPrayerPlace()`, `scrubRealParts`, `revokeConsent` | - | danger | NS (real) | destructive, 2-tap confirm | D-B | More > Demo & real data |
| 15 | Ask browser to keep storage | (storage persist button) | `/more/data` storage card; also auto-fired when consent given | `askPersistence()` / `requestPersist` | auto on tick | action | G | safe | - | More > Demo & real data |
| 16 | App lock: set PIN | App lock (optional) > set | `/more/data` | `tm:secret:applock` (`setPin`) | off | action (PIN 4-8 digits) | G | confirm | - | More > Demo & real data > App lock |
| 17 | App lock: auto-lock timing | Lock after | `/more/data` (only once lock is on) | `setAuto` inside `tm:secret:applock`; choices 0/1/5/15 min | 0 (at once) | choice | G | safe | - | same |
| 18 | App lock: lock now | Lock now | `/more/data` | `lockNow()` | - | action | G | safe | - | same |
| 19 | App lock: remove | Turn off lock | `/more/data` (needs PIN) | `removeWithPin` | - | action | G | confirm (PIN) | - | same |
| 20 | App lock: forgot PIN | Forgot PIN | lock screen only | `startForgot` / `finishForgot` (15 min wait + tick) | - | danger | G | destructive to lock | - | only reachable when locked |

### C. Backup, export, import

| # | Setting | EN label | Where today | Storage / function | Default | Type | Scope | Risk | Consent | Current path |
|---|---------|----------|-------------|--------------------|---------|------|-------|------|---------|--------------|
| 21 | CSV export, demo | Spreadsheet copy > demo | `/more/data` | `exportCsv(store,"demo")` | - | action | NS | safe | - | More > Demo & real data |
| 22 | CSV export, real | Spreadsheet copy > real | `/more/data` (disabled until tick) | `exportCsv(store,"real")` | - | action | NS | safe (file leaves app) | D-B | same |
| 23 | CSV import: check file | Import from CSV > check | `/more/data` | `planImport` | - | action | NS | safe | - | same |
| 24 | CSV import: apply | Import from CSV > import | `/more/data` | `applyImport` | - | action | NS | confirm | D-B for real | same |
| 25 | CSV import: undo last | Undo last import | `/more/data` | `undoImport` | - | action | NS | confirm | - | same |
| 26 | JSON backup save (demo only) | Backup > Save | `/more/data` bare button | `createBackup(...,"demo")` | - | action | NS (demo) | safe | - | same |
| 27 | JSON restore | Backup > Restore | `/more/data` bare file input | `restoreBackup` (no confirm step, replaces matching ids) | - | danger | NS | destructive (no confirm) | - | same |
| 28 | Encrypted backup save | Encrypted backup > save | `/more/data` | `encryptBackup` (passphrase never stored) | - | action | G (demo + real) | safe | D-B for real part | same |
| 29 | Encrypted backup restore | Encrypted backup > open | `/more/data` (confirm box) | `decryptBackup` + `restoreBackup` | - | danger | G | destructive, has confirm | D-B for real part | same |
| 30 | Snapshots: automatic | Local snapshots > automatic | `/more/data` | `tm:ui:snapAuto` | on | toggle | G | safe | - | same |
| 31 | Snapshots: how many to keep | Keep | `/more/data` | `tm:ui:snapKeep` (3/5/10) | 5 | choice | G | confirm (prunes older ones) | - | same |
| 32 | Backup reminder | Remind me to save a backup file | `/more/data` checkbox AND Today reminder card ("turn off") | `tm:ui:backupRemind` | on only if real data + tick, else off | toggle | G | safe | - | More > Demo & real data; Today |
| 33 | Reminder: remind me tomorrow | Later | Today card only | `tm:ui:remindSnoozedOn` | - | action | G | safe | - | Today |
| 34 | Snapshot: take now | Take snapshot | `/more/data` | `takeSnapshot(manual)` | - | action | G | safe | - | More > Demo & real data |
| 35 | Snapshot: save to file | Save to file | `/more/data` (also per row) | `snapshotToFile`; sets `tm:ui:fileBackupAt` | - | action | G | safe | D-B for real part | same |
| 36 | Snapshot: restore | Restore | `/more/data` per row + load-from-file | `restoreSnapshot` (confirm box) | - | danger | G | destructive, has confirm | D-B for real part | same |
| 37 | Snapshot: load from file | Restore from file | `/more/data` | `parseSnapshotFile` | - | action | G | confirm | - | same |

### D. Connections (all off by default; nothing makes a network call yet)

Each of the 4 facilities (`aiAssistant`, `cloudSync`, `webSearch`, `licensedContent`) has the same 4 controls on `/more/connections`; listed once, count x4 = 16 controls.

| # | Setting | EN label | Where today | Storage / function | Default | Type | Scope | Risk | Consent | Current path |
|---|---------|----------|-------------|--------------------|---------|------|-------|------|---------|--------------|
| 38 | Approve a connection (x4) | Approve | `/more/connections` | `tm:ui:conn:approved:<id>` | off | action (confirm panel with tick) | G | confirm | D-C (cost) / owner; cloud and AI send data off device | More > Connections |
| 39 | Enable / disable a connection (x4) | Turn on / off | same | `tm:ui:conn:on:<id>` | off | toggle | G | confirm | D-C | same |
| 40 | Save / remove API key (x4) | Key | same | `tm:secret:conn:<id>` | none | action | G | confirm | D-C | same |
| 41 | Withdraw approval (x4) | Withdraw | same | `withdrawApproval` | - | action | G | safe | - | same |

### E. Automation, planning, progress, layout choosers

| # | Setting | EN label | Where today | Storage / function | Default | Type | Scope | Risk | Consent | Current path |
|---|---------|----------|-------------|--------------------|---------|------|-------|------|---------|--------------|
| 42 | Rule: smaller step (calm) | Automation rules | `/more/rules` | `tm:ui:rules` (JSON per rule) | on | toggle | G | safe | - | More > Automation rules |
| 43 | Rule: next stage (calm) | same | same | same | on | toggle | G | safe | - | same |
| 44 | Rule: break after focus (calm) | same | same | same | on | toggle | G | safe | - | same |
| 45 | Rule: focus again | same | same | same | off | toggle | G | safe | - | same |
| 46 | Plan mode (Normal / Minimum week / Pause) | Plan mode | `/diary/plan` (seg); also set silently by the "Stuck" flow `/stuck` (pause / minimum choice writes it) | `tm:ui:mode` (`prefs.mode`) | normal | choice | G | safe (changes what Today shows) | - | Diary > Plan; Today > Stuck |
| 47 | Stage names template | Stage names | `/journey` card | `tm:ui:stageTemplate` | default (3 templates) | choice | G | safe | - | Journey (middle of page) |
| 48 | Overall progress weighting | How to weigh tasks | Today AND Journey (same card in both) | `tm:ui:progressMode` | equal | choice (equal/size) | G | safe | - | Today; Journey |
| 49 | Horizon layout | Layout (Stack / Compact) | `/journey/horizon` | `tm:ui:horizonView` | stack | choice | S | safe | - | Journey > Horizon |
| 50 | Goal universe view | View (Map / List) | `/journey/universe` | `tm:ui:universeView` | map | choice | S | safe | - | Journey > Universe |
| 51 | Habit grid range | (31 days / 12 weeks / 12 months) | `/habits` | `tm:ui:habitGrid` (raw `localStorage`, not through `prefs`) | days31 | choice | S | safe | - | Today > Habits |

### F. Per-screen Detailed / Compact choosers (`tm:ui:view:<screen>`)

Component `viewBar()` / `withView()` in `src/ui/viewBar.ts`. Default `full` (Detailed). 18 independent switches, no global switch. Each is a seg control right under the page title.

| # | Key suffix | Screen | Route | Wired in |
|---|------------|--------|-------|----------|
| 52 | `today` | Today | `/today` | `screens.ts` viewBar |
| 53 | `journey` | Journey | `/journey` | `screens.ts` viewBar |
| 54 | `plan` | Plan | `/diary/plan` | `screens.ts` viewBar |
| 55 | `money` | Money | `/diary/money` | `screens.ts` viewBar |
| 56 | `habits` | Habits | `/habits` | `screens.ts` viewBar |
| 57 | `report` | Report | `/journey/report` | `screens.ts` viewBar |
| 58 | `review` | Review | `/journey/review` | `screens.ts` viewBar |
| 59 | `weekly` | Weekly | `/journey/week` | `screens.ts` viewBar |
| 60 | `log`, `goals`, `wheel`, `cards`, `library`, `rules`, `risks`, `ventures`, `team`, `history` (10 screens) | Journey log, Goals, Wheel, Cards, Ready systems, Automation rules, Risks, Ventures, Team, Plan history | `/journey/log`, `/journey/goals`, `/journey/wheel`, `/cards`, `/more/library`, `/more/rules`, `/journey/risks`, `/diary/ventures`, `/diary/team`, `/journey/history` | `withView()` wrappers |

(Rows 52-60 = 18 choosers, counted as 9 rows above; each is its own storage key.)

### G. Deen / prayer (all on the Deen tab, none in More)

| # | Setting | EN label | Where today | Storage / function | Default | Type | Scope | Risk | Consent | Current path |
|---|---------|----------|-------------|--------------------|---------|------|-------|------|---------|--------------|
| 61 | Prayer-time method | Method | `/deen` method card | `tm:ui:prayerSettings` (JSON) | Karachi | choice (select) | G | safe (calculation only; "check with an official timetable") | - | Deen tab, card 3 |
| 62 | Asr rule | Asr | `/deen` method card | same key | standard | choice | G | safe | - | same |
| 63 | Per-prayer minute offsets (x5) | Offsets | `/deen` method card | same key (-MAX..+MAX min) | 0 | number x5 | G | safe | - | same |
| 64 | Reset method to default | Reset | `/deen` method card | `parsePrayerSettings(null)` | - | action | G | safe | - | same |
| 65 | Prayer place (lat, lon) | Place | `/deen` settings card | `tm:ui:prayerCoords` (demo) or `tm:ui:prayerCoords:real` | Dhaka | number x2 | NS | confirm (location is personal) | D-B in real | Deen tab, card 4 |
| 66 | Use Dhaka | Use Dhaka | same | `prefs.prayerCoords` | - | action | NS | safe | - | same |
| 67 | Pre-prayer alert on/off | Pre-prayer alert | same | `tm:ui:prayerAlerts` (JSON) | off | toggle | G | confirm (asks browser notification permission) | - | same |
| 68 | Minutes before | Minutes before | same | same key (1-60) | 10 | number | G | safe | - | same |
| 69 | Azan alert on/off | Azan | same | same key | off | toggle | G | confirm (permission) | - | same |
| 70 | Which prayers alert (x5) | Which prayers | same | same key | all on | toggle x5 | G | safe | - | same |
| 71 | Sound on/off | Sound | same | same key | off | toggle | G | safe | - | same |
| 72 | Volume | Volume | same | same key (0-100, step 5) | `DEFAULT_AZAN_VOLUME` | number (slider) | G | safe | - | same |
| 73 | Azan preview | Preview | same | `previewAzan()` | - | action | G | safe | - | same |

### H. Onboarding and learning/content (checked, mostly not settings)

| # | Item | Where | Note |
|---|------|-------|------|
| 74 | Onboarding state (pending / done / skipped) | `/start`; first-run buttons | `tm:ui:onboard`. No More/Settings entry to re-run or skip onboarding was found. |
| 75 | Topic drawer (menu button) | every screen, `render()` in `src/app.ts` | content browser, not a setting, but sits in the top bar next to the language globe. |

Internal state, NOT user settings (do not show): `tm:ui:focus`, `tm:ui:focusEnd`, `tm:ui:restAt`, `tm:ui:prayerFired`, `tm:ui:overallMem:*`, `tm:ui:listsNs`, `tm:ui:demoDays`, `tm:ui:onboardT`, `tm:ui:fileBackupAt`, session keys `tm:passed`, `tm:newStar`.

### Totals

- Table rows (distinct settings or actions): **73** (rows 1-73; rows 74-75 are not settings).
- Individual settings if grouped rows are expanded: **about 102** (73 rows + 9 extra view choosers in row 60 group and rows 52-59 pairs: 18 total instead of 9, + 12 extra for 4 facilities x 3 more, + 4 extra prayer offsets, + 4 extra alert-prayer toggles).
- Of the 73 rows: 8 Look/language/accessibility, 12 privacy/data-mode/lock, 17 backup/export/import, 4 connections, 10 planning/automation/layout, 9 per-screen view rows (18 switches), 13 prayer.

## 3. Duplicated in several places

| Setting | Places | Evidence |
|---------|--------|----------|
| Language | top-bar globe on every screen; `/more` inline card; first-run screen (`langButtons()` in `modeUi.ts`, only en/bn - Mix missing) | `src/app.ts` `langMenu(lang)`; `screens.ts` `more()`; `modeUi.ts` line ~63 |
| Data mode / start real | `/more/data` mode card; DEMO banner on every screen; daily ask card; first-run screen | `modeUi.ts` `demoPanels()`, `modeSwitchCard()`, `firstRunScreen()` |
| Real-data consent tick | `/more/data` consent card; first-run real confirm; start-real confirm; Deen place form; entry forms | `screens.ts` `consentCard`, `modeUi.ts`, `entry.ts`, Deen `consentPrompt` |
| Overall progress weighting | Today and Journey (`overallProgressCard(lang,"today")` and `"journey"`) | `screens.ts` lines ~876 and ~982 |
| Backup reminder on/off | `/more/data` snapshot card checkbox and Today reminder card ("turn off") | `snapshotsUi.ts` `snapshotsCard` and `backupReminderCard` |
| Plan mode | `/diary/plan` seg control and silently changed by `/stuck` buttons | `screens.ts` line 229 and 580 |
| Automation rules | settings on `/more/rules`; results shown on Today (`rulesTodayCard`); also has its own Detailed/Compact | `libraryScreens.ts` |
| Save backup file | `/more/data` (JSON, encrypted, snapshot-file) and the save-failed banner (`saveBanner.ts`) | `saveBanner.ts` sets `fileBackupAt` |

## 4. Buried deep (more than 2 taps from the first screen or hidden away from the obvious place)

- All prayer settings (method, Asr, place, alerts, sound, volume): Deen tab, scroll past fast card and prayer times, cards 3 and 4. Not reachable from More.
- Lock-screen details: bottom of More, below 11 link cards.
- App lock, storage, CSV, backup, encrypted backup, snapshots, delete/clear: all inside one long `/more/data` page (More > "Demo & real data" - the name does not hint at security or backup).
- Forgot-PIN: only on the lock screen.
- Backup reminder switch: inside snapshots card at the very bottom of `/more/data`.
- Stage-name template: middle of the Journey page.
- Habit grid range, Horizon layout, Universe view: on their own screens only.
- Notification permission: asked implicitly when a prayer alert is switched on (no visible status except small text).
- Onboarding: no re-run entry.

## 5. Per-screen chooser summary

- 18 Detailed/Compact switches (`tm:ui:view:<screen>`, section F). No master switch, so the owner must flip each screen.
- 3 more layout choosers with different names and keys: Horizon "Layout" (`stack/compact`), Universe "Map/List", Habit grid range. Same idea, three different vocabularies, three storage styles (one bypasses `prefs`).
- Result: 21 view-like choosers.

## 6. Dangerous actions mixed with safe ones

- `/more/data`: "Clear all real data" and "Delete my demo entries" are in the middle of the page, between informational cards and the storage/lock/CSV cards.
- "Restore" JSON file input sits right under "Save" with no confirm step; it replaces records (`restoreBackup`).
- "Start real now" (deletes demo data) is a button on the DEMO banner on every screen next to normal content.
- Snapshot "Restore" is beside the harmless "Save to file" in each snapshot row.
- Connections: "Approve", "Turn on" and "Remove key" are the same visual weight as "Withdraw".
- Language, theme and text size (safe) share the page with Lock-screen details (privacy) with no grouping.

## 7. Problems found (max 15, with evidence)

1. **No Settings home.** `More` mixes 11 content/info links, 5 inline settings and 8 status cards (`more()` in `src/ui/screens.ts`). Display settings appear only after the 11 links.
2. **Language lives in 3 places** (globe in `src/app.ts` top bar, `/more` card, `firstRunScreen` in `src/ui/modeUi.ts`); first-run offers only en/bn, not Mix.
3. **Prayer settings are on the Deen tab, not in Settings** (`/deen`, `prayerMethodCard` + `prayerSettingsCard`, `src/ui/screens.ts` ~1200-1290); 13 controls with the notification permission request hidden inside a toggle.
4. **`/more/data` is a dumping ground** (15 cards, 35+ controls: mode, consent, clear, storage, lock, CSV, backup, snapshots). Its title "Demo & real data" hides security (App lock) and backup.
5. **Dangerous actions not isolated** (clear real, delete demo, restore, start real) and one has no confirm: JSON restore (`/more/data`, `restoreBackup` called directly in `onchange`).
6. **18 per-screen Detailed/Compact switches** with no global default (`VIEW_SCREENS` in `src/ui/state.ts`), plus 3 other chooser styles (Horizon, Universe, Habit grid).
7. **Habit grid key bypasses `prefs`** (`GRID_KEY` raw `localStorage` in `screens.ts` line 751) and Focus saves too; inconsistent storage handling.
8. **Overall-progress weighting duplicated** on Today and Journey (`overallProgressCard`), a setting inside a daily-content card.
9. **Backup reminder on/off in two places** (`/more/data` and the Today card), and it has a computed default (on only after real data) that the user cannot see.
10. **Plan mode is a setting disguised as a Plan control** and also silently set by `/stuck` (`screens.ts` 229, 580); no place to see or reset it centrally.
11. **Consent tick repeated in 5+ places** with different wording; no single "Privacy" page showing current consent state and a way to withdraw (withdraw only happens as a side effect of "Clear all real data").
12. **Connections (D-C) are a separate top-level link** with 4 x 4 controls, away from Privacy; "Approve / Turn on / Key / Withdraw" order differs by state (`connectionsUi.ts`).
13. **JSON backup saves demo only** (`createBackup(...,"demo")`, `/more/data`), while the encrypted backup saves both; two backup buttons with different scope and no explanation next to each.
14. **Missing common settings**: no reduce-motion, no high-contrast, no week start, no currency/number style, no master notification switch, no "re-run onboarding", no "reset all settings".
15. **Stage-name template and Horizon layout live in the middle of content screens** (`/journey`, `/journey/horizon`) instead of one Layout/Personalise page.

## 8. Suggested target (for the next block, not done here)

Single `/more/settings` page with sections in this order: Look (language, theme, design, text size, default view Detailed/Compact with per-screen override), Privacy & lock (consent state, lock-screen details, app lock), Data & backup (mode, export/import, backups, snapshots, reminder), Prayer & alerts, Connections, Planning (plan mode, progress weighting, stage names, rules), and a separate collapsed Danger zone (clear real, delete demo, restore, forgot PIN). Keep globe in the top bar as a shortcut. Link Settings from the top of More. Needs a migration note only if keys are renamed (recommended: do not rename).

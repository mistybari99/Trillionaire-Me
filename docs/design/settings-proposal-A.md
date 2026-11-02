# Settings tab: proposal A (Expert A, information architecture)

Date: 2 Nov 2026. Status: proposal only, no code changed. Input: `settings-inventory.md` (73 rows, 15 problems), `src/app.ts` routes, `more()` in `src/ui/screens.ts`, batch 1 and 2 notes, loanword rules.

## বাংলা সারাংশ

- নিচের ৫টি ট্যাবই থাকবে। শেষ ট্যাব "More" এর নাম হবে **Settings / সেটিংস** (গিয়ার আইকন)। ৬ নম্বর ট্যাব নয়, কারণ ৩৬০ px ফোনে বাংলা লেবেল ঠেসে যায়।
- সেটিংস হোমে ৮টি গ্রুপ, ব্যবহারের ক্রমে: লুক ও ভাষা, প্ল্যান ও প্রোগ্রেস, নামাজ ও অ্যালার্ট, প্রাইভেসি ও লক, ডেমো ও রিয়েল ডেটা, ব্যাকআপ ও ফাইল, কানেকশন, ডিলিট ও রিসেট। তারপর "গাইড ও তথ্য" (Topics, Glossary, Safety ইত্যাদি, আগের More-এর বাকি অংশ)।
- প্রতিটি সেটিংসের ঠিক একটাই ঘর। অন্য পাতায় থাকবে শুধু ছোট লিংক/চিপ ("এখন: Equal · বদলান")। অন্য কোনো পাতায় দ্বিতীয় বোতাম নয়।
- Detailed/Compact: একটা মাস্টার সুইচ + শুধু যেগুলো আলাদা করা সেগুলোর তালিকা (exceptions)।
- মুছে ফেলার কাজ আলাদা শেষ পাতায়। Restore ওখানে নয়, Backup পাতায় থাকবে (ভয়ের সময় খুঁজে পাওয়া যায়), কিন্তু confirm ধাপ বাধ্যতামূলক।
- কোনো pref key বদলাবে না, কোনো ডেটা হারাবে না। পুরনো লিংক নিজে নিজে নতুন জায়গায় যাবে।

## 1. Top-level structure

### 1.1 Where Settings lives

- Bottom nav stays 5 tabs: Today, Journey, Diary, Deen, **Settings** (the old "More" tab, renamed, gear icon). The owner asked for a Settings tab; this gives one without a 6th slot.
- Route `#/settings` is the tab root. `/more` redirects to it.
- The top bar keeps the language globe and the topic drawer. The globe is the only control allowed to duplicate a Settings control, because it writes the same `tm:ui:lang` key and is a universal widget (see 2).
- Home layout (top to bottom): quick-find box; a one-line status strip (`Language: Bangla · Data: Demo · Lock: off · Backup: 3 days ago`, read-only, each chip a link); the 8 category cards; then the "Guides and info" group.
- Each category card: icon, name, one-line summary of current values (not a description), chevron. Max 8 cards, so no scrolling on most phones.
- "Guides and info" is where today's reference links go so nothing is orphaned: Topics, Ready systems, Cards, Capability status, Field guide, Glossary, Data dictionary, Halal-check flags, Safety and limits, module status cards, disclaimers, plus "Show the welcome tour again" (onboarding re-run, inventory row 74). These are content, not settings; they sit last and are visually plainer (list rows, not cards).

### 1.2 Categories, in order

Order = how often a normal person needs it, with the risky ones last.

| # | Key | English | Bangla | Mix | Route |
|---|-----|---------|--------|-----|-------|
| 1 | look | Look and language | লুক ও ভাষা | Look ও Language | `#/settings/look` |
| 2 | plan | Plan and progress | প্ল্যান ও প্রোগ্রেস | Plan ও Progress | `#/settings/plan` |
| 3 | prayer | Prayer and alerts | নামাজ ও অ্যালার্ট | Prayer ও Alert | `#/settings/prayer` |
| 4 | privacy | Privacy and lock | প্রাইভেসি ও লক | Privacy ও Lock | `#/settings/privacy` |
| 5 | data | Demo and real data | ডেমো ও রিয়েল ডেটা | Demo ও Real data | `#/settings/data` |
| 6 | backup | Backup and files | ব্যাকআপ ও ফাইল | Backup ও File | `#/settings/backup` |
| 7 | connections | Connections | কানেকশন | Connection | `#/settings/connections` |
| 8 | danger | Delete and reset | ডিলিট ও রিসেট | Delete ও Reset | `#/settings/danger` |
| - | about | Guides and info | গাইড ও তথ্য | Guide ও Info | `#/settings/about` |

Naming notes: the last one is called "Delete and reset", not "Danger zone", because the name should say what is inside and not frighten a non-technical user. Words follow the loanword rule (প্রাইভেসি, ব্যাকআপ, ফাইল, কানেকশন, অ্যালার্ট, রিসেট, ডিলিট). "নামাজ" stays Bangla (Deen term).

### 1.3 Every inventory row has exactly one home

Numbers are the inventory row numbers. "Home" = the only place the control lives. Control types: seg = segmented buttons, switch, select, stepper/number, slider, button, two-step = ask then confirm.

| Row | Setting | Category | Home route | Control |
|-----|---------|----------|-----------|---------|
| 1 | Language | look | `/settings/look` (globe in top bar writes same key) | seg x3 (en/bn/mix) |
| 2 | Theme | look | `/settings/look` | seg x3 |
| 3 | Design version | look | `/settings/look` | 3 radio cards |
| 4 | Text size | look | `/settings/look` | seg x4 |
| 5-8 | Lock-screen details: worship, health, financial, third party | privacy | `/settings/privacy` | 4 rows, switch (hide/show), default hide |
| 9 | Data mode (demo/real) | data | `/settings/data` | seg + consent gate |
| 10 | Real-data consent | privacy | `/settings/privacy` (state + withdraw); point-of-use gates stay as gates, see 2.3 | switch with explanation |
| 11 | Start real now | data | `/settings/data` (banner links here) | button, two-step |
| 12 | Keep demo / not now | data | stays the daily ask card (it is a prompt, not a setting) | button |
| 13 | Delete my demo entries | danger | `/settings/danger` | two-step |
| 14 | Clear all real data | danger | `/settings/danger` | two-step + backup-first link |
| 15 | Ask browser to keep storage | data | `/settings/data` (storage card shows status) | button |
| 16 | App lock: set PIN | privacy | `/settings/privacy` | button, PIN form |
| 17 | App lock: lock after | privacy | `/settings/privacy` (shown when lock on) | seg x4 |
| 18 | App lock: lock now | privacy | `/settings/privacy` | button |
| 19 | App lock: remove | privacy | `/settings/privacy` (needs PIN, so it is already guarded) | button + PIN |
| 20 | Forgot PIN | privacy | lock screen only (cannot move); Privacy page has a help line explaining it | link on lock screen |
| 21 | CSV export, demo | backup | `/settings/backup` | button |
| 22 | CSV export, real | backup | `/settings/backup` | button (disabled until consent) |
| 23 | CSV import: check | backup | `/settings/backup` | file + button |
| 24 | CSV import: apply | backup | `/settings/backup` | button, confirm |
| 25 | CSV import: undo last | backup | `/settings/backup` | button, confirm |
| 26 | JSON backup save | backup | `/settings/backup` | button |
| 27 | JSON restore | backup | `/settings/backup`, sub-section "Bring a backup back" | file + new confirm step |
| 28 | Encrypted backup save | backup | `/settings/backup` | passphrase + button |
| 29 | Encrypted backup restore | backup | `/settings/backup`, "Bring back" | passphrase + confirm |
| 30 | Snapshots: automatic | backup | `/settings/backup` | switch |
| 31 | Snapshots: keep | backup | `/settings/backup` | seg x3 (3/5/10) |
| 32 | Backup reminder | backup | `/settings/backup` (Today card keeps only "Later" and a link) | switch |
| 33 | Reminder: remind tomorrow | backup | stays on the Today card (it is an action on that card) | button |
| 34 | Snapshot: take now | backup | `/settings/backup` | button |
| 35 | Snapshot: save to file | backup | `/settings/backup` | button |
| 36 | Snapshot: restore | backup | `/settings/backup`, "Bring back" | button + confirm |
| 37 | Snapshot: load from file | backup | `/settings/backup`, "Bring back" | file + confirm |
| 38-41 | Connections x4: approve, on/off, key, withdraw | connections | `/settings/connections` | per facility card; order always Approve, Turn on, Key, Withdraw; withdraw visually lowest weight is wrong, make it equal weight |
| 42-45 | Automation rules x4 | plan | `/settings/plan` section "Automation" | 4 switches |
| 46 | Plan mode | plan | `/settings/plan` (Diary Plan screen shows a chip with a link; Stuck flow still writes it, then shows "Change back in Settings") | seg x3 |
| 47 | Stage names template | plan | `/settings/plan` (Journey keeps a link row) | select x3 |
| 48 | Overall progress weighting | plan | `/settings/plan` (Today and Journey cards become a read-only chip + link) | seg x2 |
| 49 | Horizon layout | look (listed), lives on screen | `/journey/horizon` | seg; Settings shows link row |
| 50 | Universe view | look (listed), lives on screen | `/journey/universe` | seg; Settings shows link row |
| 51 | Habit grid range | look (listed), lives on screen | `/habits` | seg; key moved through `prefs`, same key name |
| 52-60 | 18 Detailed/Compact choosers | look | master in `/settings/look`; per-screen override stays as small bar on each screen, see 3 | seg + exceptions list |
| 61 | Prayer method | prayer | `/settings/prayer` | select |
| 62 | Asr rule | prayer | `/settings/prayer` | seg x2 |
| 63 | Minute offsets x5 | prayer | `/settings/prayer` | stepper x5, collapsed under "Fine tune" |
| 64 | Reset method | prayer | `/settings/prayer` | button |
| 65 | Prayer place | prayer | `/settings/prayer` (still namespace-aware, real place needs consent) | 2 numbers |
| 66 | Use Dhaka | prayer | `/settings/prayer` | button |
| 67 | Pre-prayer alert | prayer | `/settings/prayer` | switch (permission asked here, status line shown) |
| 68 | Minutes before | prayer | `/settings/prayer` | stepper 1-60 |
| 69 | Azan alert | prayer | `/settings/prayer` | switch |
| 70 | Which prayers x5 | prayer | `/settings/prayer` | 5 switches |
| 71 | Sound | prayer | `/settings/prayer` | switch |
| 72 | Volume | prayer | `/settings/prayer` | slider |
| 73 | Azan preview | prayer | `/settings/prayer` | button |
| 74 | Onboarding re-run | about | `/settings/about` | link to `/start` |
| 75 | Topic drawer | not a setting | stays in top bar | - |

Row 49-51 are the only rows whose home is not under `/settings`. Reason: they change what the current screen draws and the person needs to see the result at once. Their Settings entry is a link row with the current value, so nobody has to remember where they are.

Optional additions, not for this block: reduce-motion (follow phone / always reduce), because batch 1 already promises reduced-motion safety. High contrast, week start, currency: do not add now; BDT is fixed by the Spec and the rest has no owner request.

## 2. Shortcuts that stay on screens (links, not duplicates)

Rule: a preference has one control. Everywhere else it appears as a read-only chip plus a link to its Settings row (`Weigh tasks: Equal · Change`).

### 2.1 Stay as links or chips

| Screen | Today | After |
|--------|-------|-------|
| Today and Journey | full "How to weigh tasks" card | chip + link to `/settings/plan#progress` |
| Journey | Stage names card in the middle of the page | link row to `/settings/plan#stages` |
| Diary Plan | Plan mode seg | chip + link (Stuck still writes it) |
| Deen tab | method card and alert card (13 controls) | one row "Prayer settings: Karachi, Dhaka, alerts off" linking to `/settings/prayer`; prayer times and fast card stay |
| Today | backup reminder "turn off" | keep only "Later" and "Open backup settings" |
| DEMO banner | "Start real" confirm | link to `/settings/data#start-real` (the confirm card lives there) |
| Save-failed banner | save buttons | keep (it is an alert about a failure, deep-links to `/settings/backup`) |

### 2.2 Stay as real controls

- Language globe in the top bar (same key, one tap, safe, used when the page is unreadable). Documented exception.
- Per-screen Detailed/Compact bar and the three layout choosers (49-51): in-context view toggles, see 3.
- Daily "Keep demo" ask card, Today "Later" button: prompts or actions on a card, not preferences.

### 2.3 Consent gates

Consent appears in 5 places today. Split the idea in two:
- A gate = a short prompt at the moment real data is about to be saved (first-run, Start real, entry forms, Deen place). These stay where the person is, because moving them would break the D-B flow. They all use one shared component with one wording, and a "Read more" link to `/settings/privacy`.
- The setting = `/settings/privacy` shows consent state (given on date / not given), what it covers, and a new **Withdraw consent** button (stops saving real data; does not delete anything). Today withdrawal only happens as a side effect of "Clear all real data" (problem 11).

## 3. Detailed / Compact consolidation (master plus exceptions)

- In `/settings/look`, section "Screen detail": one master seg, **Detailed / Compact**, default Detailed.
- Below it a line "Different on N screens" opening a list of only the exceptions (screen name, its value, button "Follow master"). Full list of the 18 sits under "All screens" collapsed. Nothing to scan when there are no exceptions.
- Effective value = the screen's own stored value if the person ever set it, else the master. This needs one new additive key (`tm:ui:view:_default`, default `full`) and a reader that tells "never set" from "set to full". No existing key is renamed or rewritten. Result for existing users: everything looks exactly as before until they touch the master (the master never overwrites explicit screen choices; it only changes screens that follow it).
- Screens keep their small bar under the title. Tapping it sets an override for that screen. If it equals the master, it clears the override (so exceptions list stays honest).
- The three other layout choosers (Horizon, Universe, Habit grid) keep their own vocabulary because they are not density, they are different views of the data (stack/compact, map/list, range). They are listed under "Screen layouts" in Look as three link rows with current value.

## 4. Dangerous actions

Two groups, handled differently, because "scary" and "needed in a hurry" are different.

**Destroys data: lives only in `/settings/danger` ("Delete and reset"), last card on home, never mixed with normal buttons.**
- Delete my demo entries (13), Clear all real data (14), plus a new "Reset all settings to default" (preferences only, no data).
- Each is its own card with: what will be deleted, what stays, current counts, a "Save a backup file first" link (goes to `/settings/backup`), then a two-step confirm. Clear-real keeps today's two-step and also revokes consent as now; explain that in the text.
- Distinct visual weight: outlined, calm colour, no flashing red and no exclamation marks. Rule 6 of the charter (no punishing copy) is about goals, but the same tone is right here.
- The page opens with one sentence ("Nothing on this page happens until you confirm twice") and has no other controls.

**Replaces data but is a recovery tool: stays in `/settings/backup`, sub-section "Bring a backup back".**
- JSON restore (27), encrypted restore (29), snapshot restore and load (36, 37).
- Why not the danger page: when a person has lost data they look for Backup, not Delete. Hiding restore behind a scary page costs trust at the worst moment.
- Fix real problem 5: JSON restore gets a confirm step ("This replaces N records with the same ids in Demo/Real. Continue?") like encrypted restore already has, and shows which namespace.
- JSON save (26) says clearly "Demo only"; encrypted backup says "Demo and real". One sentence next to each (problem 13).

**Other guarded actions stay with their feature:** remove app lock (needs PIN) in Privacy; remove API key in Connections; Start real now (deletes demo) in Data, with its own confirm that names the consequence. Forgot PIN stays on the lock screen.

## 5. Search / quick-find

- A search box at the top of `#/settings` (and a small magnifier on every `/settings/*` page header).
- Backed by one static registry, e.g. `src/ui/settingsRegistry.ts`: for each setting `id`, `category`, `route`, `anchor`, labels (en, bn, mix), 3-6 keywords in both languages (e.g. "dark", "অন্ধকার", "font", "বড় লেখা", "pin", "পাসওয়ার্ড"). No libraries, simple lowercase `includes` plus Bangla normalisation; works offline.
- Results: row name, category chip, jump link `#/settings/look?hl=textsize`. The target page scrolls to the row and pulses it once (no pulse when reduced motion).
- Empty search shows "Recently changed" (last 3, kept in `localStorage` as a per-viewer convenience, safe if empty).
- The registry also powers the status strip and category summaries, and is the base of a test: every key in `prefs` and every row in this table appears in the registry exactly once. That test guards "exactly one home" for the future.

## 6. Route map and redirects

```
#/settings                    home (search, status strip, 8 categories, about)
#/settings/look               language, theme, design, text size, screen detail, layout links
#/settings/plan               plan mode, progress weighting, stage names, automation rules
#/settings/prayer             method, place, alerts, sound
#/settings/privacy            consent state, lock-screen details, app lock
#/settings/data               mode, start real, storage, counts
#/settings/backup             CSV, backups, snapshots, reminder, bring back
#/settings/connections        4 facilities
#/settings/danger             delete demo, clear real, reset settings
#/settings/about              reference list + welcome tour
```
In-page anchors: `#progress`, `#stages`, `#automation`, `#start-real`, `#bring-back`. They are given as `?hl=<id>` because the hash is the route.

Content routes do not move: `/more/status`, `/fields`, `/glossary`, `/safety`, `/dictionary`, `/library`, `/halal-flags`, `/topics`, `/topic/<id>`, `/cards`. They keep their URLs and tab tag changes from `more` to `settings`, so Settings is highlighted. Less churn, and every old bookmark just works.

Redirects (a `REDIRECTS` table checked first in `render()`, using `location.replace` so Back does not loop):

| Old | New |
|-----|-----|
| `/more` | `/settings` |
| `/more/data` | `/settings/data` |
| `/more/connections` | `/settings/connections` |
| `/more/rules` | `/settings/plan?hl=automation` |
| `/habits`, `/deen` etc. | unchanged |

`/more/rules` screen content (rules explanation, its Detailed/Compact) folds into the Plan page "Automation" section. Ready systems `/more/library` stays a content page. The locked state still wins over any route (`isLocked()` is checked first), so deep links to Settings cannot bypass the lock. Back crumb on every sub-page: `← Settings`.

## 7. Migration plan

1. **No existing `tm:ui:*`, `tm:secret:*` or `tm:consent:*` key is renamed, moved or rewritten.** Controls just move; they read and write the same `prefs` properties.
2. One additive key: `tm:ui:view:_default`. Absent means `full`; behaviour identical to today. Also `settingsRecent` (optional, per-viewer).
3. `habitGrid` (raw `localStorage` today): read through `prefs` using the same key `tm:ui:habitGrid`. Value format unchanged. No data copy needed.
4. Real data, consent, PIN, API keys and backups are untouched. Nothing is deleted by the move.
5. Order of work (small PRs, each with tests): (a) registry + `/settings` home + redirects + tab rename; (b) move Look, Privacy, Data pages from `more()` and `dataScreen()` (split `dataScreen()` into data / backup / danger / privacy by moving existing card builders, not rewriting them); (c) prayer settings move + Deen link row; (d) Plan page + chips on Today/Journey/Diary; (e) master density; (f) search; (g) restore confirm step.
6. Tests: every old route resolves (redirect or same page); every inventory row maps to one registry entry; no duplicated control for any `prefs` key outside the documented exceptions (globe, per-screen view bars, 49-51); locked state blocks `/settings/*`; consent withdraw does not delete; clear-real keeps two steps; both languages and Mix render every label; 360 px layout has no horizontal scroll.
7. Undo: the whole change is routing and layout. Reverting the PR restores the old More screen, and nothing in storage depends on the new layout.
8. Record in `DECISIONS_LOG.md` and the Register Change Log (tab rename, new additive key, restore confirm).

## 8. Risks and what I would NOT do

Risks
- Renaming "More" to "Settings" changes a tab the owner already knows. Mitigation: About group keeps all old content one tap away; status strip makes the page feel alive.
- Splitting `dataScreen()` touches 15 cards and module-level state (`realClearAsk` etc.). Move card builders as they are; keep each state flag with its card.
- Moving prayer settings off the Deen tab makes the Deen tab less self-contained. Mitigation: summary row with current values plus one tap; the notification permission status becomes visible in the Settings row.
- The master density needs a "set versus never set" reader; get this wrong and existing choices reset. Test with fixtures that contain old keys.
- Search registry can drift. The registry test (5) is the guard.

What I would NOT do
- Not add a 6th tab, and not hide Settings behind the top-bar menu.
- Not one very long single page (the current `/more/data` problem again).
- Not rename or merge any storage key, and not write the master value into the 18 screen keys.
- Not put restore in the danger page, and not use the word "Danger" in the Bangla UI.
- Not duplicate a control on two screens; chips and links only.
- Not move content (Topics, Glossary, Safety, Ready systems) into setting categories, and not move their URLs.
- Not add new settings (high contrast, week start, currency, notifications master) in this block.
- Not make Settings send or store anything new; no network, no AI, no new consent paths.
- Not touch the consent wording itself (D-B scope) while moving it.

## 9. What I expect Expert B to get wrong

- Making Settings a 6th tab, or keeping "More" and burying Settings as a card, so the owner's tab request is only half met.
- Putting every destructive action, including restore, into one red "Danger zone", which hides recovery and makes the person afraid of Backup.
- Moving the content links (Topics, Glossary, Safety, Library) into setting categories, or breaking their URLs, instead of keeping them as an "About" group.
- Leaving duplicates in place "for convenience" (progress weighting on Today, plan mode on Diary, backup switch on Today) so the 15 problems remain; or the opposite, removing the language globe and per-screen quick bars and making common taps slower.
- Treating the master Detailed/Compact switch as "set all 18 keys", which erases the person's exceptions, or forgetting that unset and "full" must be told apart.
- Forgetting the lock screen (Forgot PIN cannot move), namespaces (real prayer place needs consent), the Mix label column, and the 360 px width.
- No search, or a search with no test that every setting has exactly one registry entry.
- Renaming pref keys for tidiness and calling the migration trivial.

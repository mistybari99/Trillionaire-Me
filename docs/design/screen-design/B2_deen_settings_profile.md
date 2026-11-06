# B2: Deen, Knowledge, Settings, Profile and global pieces (design, 6 Nov 2026)

## বাংলা সারাংশ
- এই ডকুমেন্ট শুধু ডিজাইন। কোড, ডাটা, কমিট কিছু বদলায়নি।
- আসল ব্রাউজারে (360 px, বাংলা, 100% সাইজ, ডেমো মোড) মেপে দেখা গেছে: সবচেয়ে লম্বা পেজ Fields গাইড (44 স্ক্রিন), Status (19), Topic (7.8), Deen (6.2), নামাজ সেটিংস (5.5)।
- সমাধান: প্রতি পেজে ট্যাব, অ্যাকর্ডিয়ন, নিচ থেকে ওঠা শিট, কাউন্ট ব্যাজ, আর প্রতি গ্রুপে ⓘ হেল্প।
- সব পেজে এক লাইনের ডেমো ব্যানার (এখন 120 px), ডিসক্লেমার এক লাইনের চিপ।
- সব ট্যাবে 🔍 কমান্ড বার: অ্যাকশন, পেজ, সেটিংস, টপিক, গ্লসারি, অফলাইনে খোঁজে।
- প্রোফাইল পেজ (/profile) আগে থেকেই আছে: তার ওপর ট্যাব ও স্ট্যাটাস লাইন যোগ হবে। কোনো স্কোর, পার্সেন্ট বা র‍্যাঙ্ক নেই।
- নিচের ম্যাপ দেখায় কোনো ফাংশন বাদ যায়নি। আগের লিংক সব কাজ করবে।
- গোল: ডিফল্ট ভিউ 1.5 স্ক্রিনের মধ্যে। এগুলো বাজেট, বানানো হয়নি।
- নতুন রুট দরকার নেই। হেল্প (i), কুইক অ্যাকশন, /profile, নিচের ট্যাব আগেই বানানো; শুধু বাড়ানো হবে। নতুন: কমান্ড বার (k-cmd)।
- ছবিতে দেখুন: `B2_deen_settings_profile.html` (আগে/পরে 5টি ফ্রেম)।

## 0. How I measured (no guessing)
Built the app (branch before merge 7d34280; re-measure after it) in a scratch copy (docs untouched), served `vite preview`, opened each route in Chrome 153 with Playwright: viewport 360x740, language bn, text 100%, DEMO mode, onboarding done. "Screens" = `document.documentElement.scrollHeight / 740`. Counts by script (not by hand): `main.querySelectorAll(".card, .k-card")` (nested cards counted), `h2`, `details`, `button, .btn`, `input,select,textarea`; script re-run a second time on 6 Nov and every row matched (the topic row was corrected to 7.8 screens, 13 h2, 8 buttons). Block heights via `getBoundingClientRect` of each child of `main`. Chrome overhead per screen: top bar 45, DEMO note 120 (60 on settings), nav 57, disclaimer note 135. Targets below are **budgets** (rows x measured heights), not rendered prototypes. Target: default view <= 1.5 screens (<= 1110 px page height); an opened panel scrolls inside its page.

Measured today (screens / cards / h2 / folded details / buttons / inputs):

| Route | Screens | Cards | h2 | details | btn | inputs |
|---|---|---|---|---|---|---|
| /deen | 6.24 | 16 | 15 | 22 | 7 | 0 |
| /deen/plans | 3.77 | 2 | 4 | 0 | 3 | 14 |
| /hadith (off state) | 1.33 | 1 | 1 | 0 | 1 | 1 |
| /cards | 1.34 | 0 | 1 | 0 | 3 | 2 |
| /notes | 3.39 | 3 | 3 | 0 | 3 | · |
| /topics | 3.97 | 21 | 25 | 0 | 0 | 0 |
| /topic/self-awareness | 7.8 | 11 | 13 | 0 | 8 | 0 |
| /settings | 2.69 | 14 | 2 | 0 | 7 | 2 |
| /settings/look | 2.47 | · | 4 | 1 | 6 | 5 |
| /settings/prayer | 5.53 | 5 | 4 | 0 | 26 | 16 |
| /settings/backup | 3.38 | 11 | 11 | 2 | 13 | 8 |
| /settings/privacy | 3.30 | 5 | 5 | 0 | 11 | 4 |
| /settings/data | 2.41 | 8 | 7 | 0 | 5 | 2 |
| /settings/plan | 2.56 | 8 | 8 | 0 | 19 | 1 |
| /settings/connections | 3.83 | 5 | 4 | 0 | 12 | 4 |
| /settings/delete | 1.65 | 3 | 2 | 0 | 6 | 2 |
| /settings/about | 2.97 | 15 | 1 | 0 | 3 | 1 |
| /more/where | 3.92 | 6 | 5 | 0 | 0 | 0 |
| /more/status | 18.8 | 25 | 25 | 0 | 0 | 0 |
| /more/fields | 44.43 | 186 | 233 | 186 | 0 | 0 |
| /more/glossary | 6.10 | 34 | 34 | 0 | 0 | 0 |
| /more/safety | 1.32 | 3 | 0 | 0 | 0 | 0 |
| /more/dictionary | 4.75 | 1 | 1 | 47 | 0 | 0 |
| /more/library | 3.32 | 6 | 6 | 0 | 8 | 0 |
| /more/halal-flags | 2.57 | 6 | 6 | 0 | 0 | 0 |
| /diary (profile card lives here) | 2.05 | · | 8 | 1 | 5 | 0 |

Biggest single blocks: Deen prayer-times card 800 px; prayer settings card 1908 px; Settings quick card 434 px; Privacy readout 569 px; each topic tip card 320-550 px.

## 1. Global pieces (all screens)

| Piece | Problem today (source) | Proposal | Status |
|---|---|---|---|
| Top bar | After Codex merge (src/app.ts `render()`): menu, title, online badge, DEMO badge, `langMenu` (globe), `ownerProfileLink` (person icon to `/profile`). No search. | Keep as built. Add only **🔍** after the person icon; to make room the online badge text moves into the one-line banner (never "synced"). | person icon exists; 🔍 new, needs build |
| DEMO banner | `demoPanels()` 120 px on every route (60 on settings) | One line 36 px: "DEMO · নমুনা ডাটা · আসল শুরু" with the same Start real link. Full text one tap away. Still labelled on every screen | edit of existing |
| Disclaimers | `disclaimers()` 135 px at the end of each screen | One-line chip row ("ফতোয়া নয় · গ্যারান্টি নয় ⓘ") keeping `data-legal`; full text in the ⓘ sheet. Still once per route (ui-reconcile R4) | edit of existing |
| Bottom nav | Built: `createBottomNavigation` (quickNavigationUi.ts), `TAB_DEFINITIONS`, optional `tabNavigation: menu` mode opening a non-modal tab panel from `TAB_ACTIONS` (tabActions.ts), `rootBar` "Quick tools" on tab roots, `observeNavLayout`. Knowledge routes are tagged "settings" | Keep all of it. Add only: re-tap active tab returns to its root; calm dot on Settings if no file backup yet (no red, no count); crumb "← Guides & info" on knowledge pages | built, extend (dot, re-tap new) |
| Search / command bar | Checked quickNavigationUi.ts, tabActions.ts, overlayCoordinator.ts: no search there. Only `withSearch()` (settingsSearch.ts) exists, inside Settings | `k-cmd` command bar: full-width sheet, input focus on open, chips All / Actions / Pages / Settings / Topics, grouped results with count badges, "recent 3", empty state = built TAB_ACTIONS of the current tab. Static registry, offline: ROWS, GUIDES, CATEGORIES + ROUTES labels + TOPICS names + GLOSSARY terms. Last row "Wikipedia" = existing in-app search card, only on tap. Reuse the built `overlayCoordinator` for open/close/focus. No AI (D-C) | `k-cmd` new, needs build; extends settingsSearch |
| Quick actions | **Built:** `TAB_ACTIONS` per tab (Today, Journey, Diary, Deen, Settings), `rootBar` grid, tab panel, and the prayer quick-mark (`prayerControls(lang,"compact")` from prayerMarksUi.ts, `quickPrayer` on Deen). Deen built: Home, `#/deen/prayers`, `#/deen/fasting`, `#/deen/plans`, `#/settings/prayer`. Settings built: Home, Look, Backup, Privacy, Prayer | **Exists, extend only.** Additions: Deen: Give and Records (sheets on /deen, no new route); Settings: Language and Text size (`#/settings/home/language`, `#/settings/home/textsize`), Backup now (`#/settings/backup/savebackup`). Command-bar empty state reuses TAB_ACTIONS. No second quick-action component | exists, extend |
| Help (i) |  **Built:** `helpTrigger(topic, lang, context, notes)` (helpUi.ts), 12 `HELP_TOPIC_IDS` in helpTopics.ts, `enhanceScreenHelp` + `screenHelpTopic(path)` (screenHelp.ts) put an "i" button beside every screen `h1`; sheet or inline per `helpPlacement`; guide + "my map". | **Exists, extend.** `k-help` is not a new component: it must reuse `helpTrigger` / `helpTopics`. Add only the group texts of section 7 as extra lines in the matching topics (deen, knowledge, settings, backup, profile) and 3 new group topics if needed; keep the "what / what changes / where data stays" lines and the fictional-example rule; 44 px target | exists, extend |
| Sheet | Built: help sheet/dialog and `overlayCoordinator` (`openTransientOverlay`) | Reuse for record forms and k-cmd. Record-form sheet = thin wrapper, no separate "kSheet" system | extend |
| Count badge | none | `k-chip` + number, not a score. Counts only things that exist (entries, rows, rules on) | uses kit |

New kit builders go in `src/ui/kit/` as `k-*` classes. The tokens are defined in `src/ui/styles.css` (colours per look in `src/ui/themes.ts`) and used by `src/ui/kit.css`; names: `--paper --card --ink --muted --rule --primary --on-primary --ember --moss --calm --demo --demo-bg --danger --s1..--s7 --r-md --r-lg --tap --ctl-h --tint-primary --hair --e1 --e2 --fs-sm --lh-ui`. Look: Light Futuristic radius 12/18, opaque cards, one primary action per view.

## 2. Group G1: Deen (/deen, /deen/plans)
**Problems.** /deen is 6.24 screens: `deen()` in screens.ts stacks `fastCard`, `prayerTimesCard` (800 px), `hijriCard` (329), `prayerLinkRow`, 8 entity cards (each repeats the "Private" tag and a field list, 22 folded lists), `deen_plan` (475), `deen_mark`, `moduleDetails`, disclaimers. /deen/plans is 3.77 screens: one 14-input form (748 px), numbers card (772), notes/giving (470).
**Proposal.**
1. Heading row with Private chip and ⓘ. Today strip (one card, ~130 px) **keeps the built prayer quick-mark** (`prayerControls` compact: the mark buttons stay one tap from the strip): next prayer + source chip DEMO/method, today's fast ("no record" = Unknown, not 0), Hijri date as one line.
2. Quick actions = the built Deen TAB_ACTIONS (Prayers `#/deen/prayers`, Fasting `#/deen/fasting`, Plans `#/deen/plans`, Prayer settings `#/settings/prayer`; the two /deen/* routes render Deen and focus `deen-prayers` / `deen-fasting`). Only additions: Give and Records open sheets with the existing form fields (same `fieldHelp`, consent gate, D-B rules).
3. In-page tabs (state in the page, no route): **Today** (5 prayer rows, next highlighted, rest folded) | **Records 8** (8 rows with count badge, tap = sheet) | **Plan** (deen_plan, deen_mark) | **Learn** (Quran activity, learning, Feature details; one row "Knowledge ›" to G2, no duplicate list).
4. Prayer settings stay in Settings; Deen shows one row "Prayer & alerts ›".
5. /deen/plans: tabs **Plan | Numbers | Notes & giving**, form in a sheet, 3 inputs visible per step.
6. No piety score, rank, streak or shame wording; no scripture text (D-D); "Not a fatwa" one-line chip stays visible.
**Target.** /deen 6.24 to ~1.4; /deen/plans 3.77 to ~1.4.

| Today's function | Route / source | Where after |
|---|---|---|
| Fast today | `fastCard` | Today strip + Records > Fast |
| Prayer times, 5 ways | `prayerTimesCard` | Tab Today (rows) |
| Hijri / Ramadan | `hijriCard` | Today strip line + sheet |
| Prayer settings link | `prayerLinkRow` -> /settings/prayer | row in Today tab |
| Prayer marks, fasting focus | `/deen/prayers`, `/deen/fasting` (render `S.deen()`, focus `#deen-prayers`, `#deen-fasting`) | same routes; open Today tab (prayers) or Records > Fast (fasting) and focus it; quick-mark stays in the strip |
| prayer_log, quran_activity, fast, zakat_snapshot, giving, hajj_plan, learning_item, right_duty | entity cards (M13) | Records tab rows, sheet each |
| deen_plan, deen_mark | entity cards | Plan tab |
| Deen plans page | /deen/plans | stays route, 3 tabs |
| Feature details | `moduleDetails("deen")` | Learn tab |
| Not a fatwa / no guarantee | `disclaimers` | chip + ⓘ |

## 3. Group G2: Knowledge (ONE group: Topics, Library, Cards, Notes, Hadith)
**Problems.** Five routes tagged "settings" tab and split across two lists (More, Guides); /topics 3.97 screens (21 link cards, 89 px each); /topic/:id 7.8 (tip cards 320-550 px); /notes 3.39; /more/library 3.32; /hadith 1.33 (off state); /cards 1.34.
**Proposal. One home per function:** the page **Settings > Guides & info** has two in-page tabs. Tab **Knowledge** holds exactly Topics, Library, Cards, Notes, Hadith and nothing else lists them (Deen "Learn" tab shows one row "Knowledge ›" to this tab, no copies). Tab **About the app** holds Where, Status, Fields, Glossary, Dictionary, Halal flags, Safety, Version, Welcome (see G4).
- Shared `knowledgeTabs()` strip on the five pages: **Topics | Library | Cards | Notes | Hadith** (existing routes). Crumb "← Guides & info".
- /topics: search + 4 layer accordions with count badges; rows 56 px. /topic/:id: accordion tips (~64 px), first open, "Related" folded.
- /notes: tabs Sources | Notes | SOP, add-form in sheet. /more/library: accordions per section.
- /hadith: honest off state, one consent action, no text until D-D. /cards: form in a sheet, list first.
**Target.** Topics 3.97 to 1.3; topic 7.8 to 1.5; notes 3.39 to 1.4; library 3.32 to 1.4; hadith/cards ~1.1.

| Function | Route (unchanged) | Single home after |
|---|---|---|
| Topics, topic detail | /topics, /topic/:id | Guides & info > Knowledge |
| Ready systems (Library) | /more/library | Guides & info > Knowledge |
| Cards | /cards | Guides & info > Knowledge |
| Notes | /notes | Guides & info > Knowledge |
| Hadith | /hadith | Guides & info > Knowledge |

## 4. Group G3: Settings (/settings, /settings/:a/:b, /settings/connections)
**Problems.** Home 2.69 screens (quick 434 + status 214 + · cards of 89-111 px). Prayer 5.53 (one 1908 px card with 26 buttons, 16 inputs); Connections 3.83 (4 cards of ~560 px, equal); Backup 3.38; Privacy 3.3 (readout 569); About 2.97 (15 cards). Category pages in registry order (settingsRegistry.ts, 34 rows).
**Proposal.**
- Home: heading + 🔍 + ⓘ; "Owner profile" row (the built `/profile`); one compact Quick card (language seg, theme seg, text slider 50-150, all in ~210 px); status as 3 chips (backup, data, lock) each a link; **2-column tiles** for the 8 categories with one value line; Delete tile last, dashed neutral border; Guides & info row. ~1.4 screens.
- Every category page: summary line + **accordion per registry row** (`data-setting-row` kept). Summary shows current value + count badge; open = the existing control. `#/settings/<cat>/<row>` opens and highlights that row (extends `highlight()`).
- Long forms (prayer offsets x5, alert prayers x5, passphrase, CSV import) go to bottom sheets.
- Prayer: accordions Times (method, Asr), Fine tune (offsets, sheet), Alerts, Place, Auto-update, Reminders.
- Connections: one list of 4 rows (Approve / Turn on / Key / Withdraw inside each, same order), line "0 of 4 on. Nothing leaves this phone".
- Delete: unchanged two actions, typed word, calm copy.
**Target (default view).** Home 1.4; look 1.3; prayer 1.5; backup 1.4; privacy 1.4; data 1.3; plan 1.3; connections 1.5; delete 1.2; about 1.4.

| Route | Rows (registry ids) now to after |
|---|---|
| /settings | language, theme, textsize (Quick card); status strip; 8 tiles; about row |
| /settings/home/<row> | row ids language, theme, textsize (registry `home` rows) | same URL: opens the home and highlights the Quick-card control; also used by /profile links |
| /settings/look | design, density, horizon, universe, habitgrid, motion, resetlook = 7 accordions |
| /settings/prayer | prayermethod, prayersync, prayerplace, prayeralerts, reminders = 5 accordions |
| /settings/backup | reminder, storage, savebackup, restore, snapshots, csv, PDF print card = 7 accordions |
| /settings/privacy | lockscreen, consent, applock = 3 registry rows as accordions, plus the "private by default" readout, which is **not** in the 34-row ROWS registry: new row, needs build (read-only summary, no storage key) |
| /settings/data, /settings/data/mode, /settings/data/start-real | mode, startreal | mode accordion; `start-real` stays a full page (gate, demo copy, confirm) |
| /settings/plan | rules (4 switches), planmode, stages, weighting |
| /settings/connections | 4 facility rows |
| /settings/delete | deletedemo, deletereal |
| /settings/about | tab Knowledge (5 pages, G2) + tab About the app (version, 7 guides, welcome, G4) |
| Redirects | /more, /more/data, /more/connections, /more/rules unchanged (`REDIRECTS`) |

## 5. Group G4: More / Guides pages (all stay at their URLs)
**Problems.** Fields 44.4 screens (186 field cards + 47 entity headings, each card with a folded help); Status 18.8 (25 module cards); Glossary 6.1 (34 cards); Dictionary 4.75 (47 folded rows at 56+ px); Where 3.92; Library 3.32; Halal flags 2.57; Safety 1.32 (fine).
**Proposal.** This group is the **About the app** tab of Guides & info (the other tab is Knowledge, G2) (Where, Status, Fields, Glossary, Dictionary, Halal flags, Safety, Version, Welcome). Each page:
- **Fields:** search box + 25 module tiles (2-col, count badge = fields); tile opens a sheet with entity accordions; field = one row, help folded. 44 to ~1.5.
- **Status:** legend chips as filters (built / partly / blocked, with counts); 25 rows grouped in 3 accordions, closed. 18.8 to ~1.4.
- **Glossary / Dictionary:** search-first, first 8 rows, "Show all 34 / 47"; row opens meaning inline. Keep "যাচাই হয়নি" tag. ~1.4.
- **Where, Library, Halal flags:** accordions per section, first open, count badges.
- **Safety:** unchanged, three short cards, ⓘ not needed.

| Route | Kept | Functions kept |
|---|---|---|
| /more/where | yes | built/permission/waiting sections |
| /more/status | yes | all 25 module cards, legend |
| /more/fields | yes | all 186 fields, privacy tags, help |
| /more/glossary | yes | 34 terms, unreviewed tag |
| /more/dictionary | yes | 47 entries |
| /more/library | yes | 6 sections, view bar |
| /more/halal-flags | yes (lazy) | all flags, draft label |
| /more/safety | yes | 3 safety cards |

## 6. Group G5: Owner profile (`/profile`, EXISTS: extend)
Built (src/ui/ownerProfileUi.ts, route in app.ts, entry = person icon in the top bar): h1 "Owner profile", namespace tag, a device-only note, `profileCard` (name, birth year, age as ESTIMATE, time zone, Unknown when empty), then a link list: language, look, text size, privacy, backup, data, prayer, about, Settings. **Confirmed by reading the source: no percent, no ring, no inferred value, no tabs, no stored key.** My rule stands and overrides the 62% ring in B1: nothing inferred, no completeness percent, no "x of y done".
**Add on top (no new route, no new key):**

| Addition | State | Source / route |
|---|---|---|
| Group the link list into 4 in-page tabs: Me / Permissions / Look & language / Backup | **new, needs build** (page edit) | same links as built |
| Status line under each link (value from existing state: mode, consent date, lock on/off, last file backup, look name, language, text size %) | **new, needs build** | `rowValue()` in settingsUi.ts (already exported) |
| Permissions tab: real-data consent, app lock, mode with Withdraw links | built targets | `#/settings/privacy`, `#/settings/privacy/consent`, `#/settings/data/mode` |
| My data at a glance (demo n / real n) | **new, needs build**, existing counts | data page counts |
| Initial-letter avatar | optional, no photo | none |
| Ⓘ on the page | exists, via `enhanceScreenHelp` (topic `profile`) | none |
Unchanged: edit via `#/diary/intake/1`; greeting; real values need the D-B tick first. No owner-profile spec exists in the docs; the additions are proposals.

## 7. Help (i) text, every group (EN / BN, plain)
| Group | English | বাংলা |
|---|---|---|
| Deen | Your private worship notes and prayer times. Changes only what you record. Data stays on this phone. Not a fatwa. | আপনার প্রাইভেট ইবাদতের নোট ও নামাজের সময়। শুধু আপনার রেকর্ড বদলায়। ডাটা এই ফোনেই থাকে। ফতোয়া নয়। |
| Deen plans | Plan reminders from your own numbers. No score. | নিজের সংখ্যা থেকে প্ল্যান ও রিমাইন্ডার। কোনো স্কোর নেই। |
| Knowledge | Topics, Library, Cards, Notes and Hadith. Read only; nothing is sent out. | টপিক, লাইব্রেরি, কার্ড, নোট ও হাদিস। শুধু পড়া; কিছু বাইরে যায় না। |
| Topics | Short guides by theme. Not advice. | থিম ধরে ছোট গাইড। উপদেশ নয়। |
| Hadith | Off until you allow it. No text is shown before that. | আপনি না দিলে বন্ধ। আগে কোনো লেখা দেখায় না। |
| Settings home | Language, theme and text size are here only. Each tile opens a group. | ভাষা, থিম ও লেখার সাইজ শুধু এখানে। প্রতিটি টাইল একটি গ্রুপ খোলে। |
| Look | Changes colors and layout only. Never data. | শুধু রং ও লেআউট বদলায়। ডাটা না। |
| Prayer & alerts | Times and alerts use your place. Real place needs your tick. | সময় ও অ্যালার্ট আপনার জায়গা ধরে। আসল জায়গার জন্য টিক লাগে। |
| Backup | A file copy you keep. Look settings are not inside it. | আপনার রাখা ফাইল কপি। লুক সেটিংস এতে নেই। |
| Privacy & lock | Who can see your data. Does not delete anything. | কে ডাটা দেখতে পারে। কিছু মোছে না। |
| Demo or real | Demo is sample data. Real data stays on this phone, after your tick. | ডেমো নমুনা ডাটা। আসল ডাটা টিকের পর শুধু এই ফোনে থাকে। |
| Plan & progress | How plans and progress are shown. Unknown stays Unknown. | প্ল্যান ও প্রোগ্রেস কীভাবে দেখাবে। জানা না থাকলে Unknown থাকে। |
| Connections | Optional, all off. Nothing leaves this phone unless you approve. | ঐচ্ছিক, সব বন্ধ। আপনি অনুমতি না দিলে কিছু বাইরে যায় না। |
| Delete data | Removes entries from this phone. Real data cannot be undone. | এই ফোন থেকে এন্ট্রি মোছে। আসল ডাটা ফেরত আসে না। |
| Guides & info | Reference pages about the app. | অ্যাপ নিয়ে রেফারেন্স পেজ। |
| Glossary | Draft word list, marked "যাচাই হয়নি" until reviewed. | খসড়া শব্দতালিকা, যাচাই না হওয়া পর্যন্ত "যাচাই হয়নি" লেখা। |
| Profile | Your details in one place. Empty means Unknown. | আপনার তথ্য এক জায়গায়। খালি থাকলে Unknown। |
| Search | Finds actions, pages and settings on this phone. Works offline. | এই ফোনের অ্যাকশন, পেজ ও সেটিংস খোঁজে। অফলাইনে চলে। |

## 8. New routes / components needing build
| Item | Kind | Note |
|---|---|---|
| `/profile` | **exists** (ownerProfileUi.ts) | extend with tabs and status lines only; no key, no schema change |
| `k-cmd` command bar + 🔍 in top bar | new component + top-bar edit | extends settingsSearch registry; reuse overlayCoordinator; no route |
| Deen and Notes tabs | in-page state | no route; optional deep link `/deen/records` new, needs build (not required) |
| Help (i) (`helpTrigger`, `helpTopics`, `screenHelp`), quick actions (`TAB_ACTIONS`, `rootBar`, prayer quick-mark), bottom navigation | **exist, extend** | extra help lines, extra actions only |
| `knowledgeTabs`, accordion, record-form sheet wrapper | new kit builders | all other routes above exist |
| One-line DEMO banner, disclaimer chip | edit of `demoPanels`, `disclaimers` | keep `data-legal` and Start real link |

Every other route in this document exists today in `ROUTES` / `REDIRECTS` (src/app.ts).

## 9. Acceptance checklist (per screen, per language EN / BN / Mix)
- [ ] Text 50, 75, 100, 125, 150% (slider min 50, settingsUi.ts:89): no clipped Bangla vowel marks, no horizontal scroll, tabs wrap to two rows, tiles go to one column at 150%.
- [ ] Every target >= 44 px (ⓘ, 🔍, tabs, chips that are links, accordion headers, tiles); no two targets under 8 px apart.
- [ ] Contrast: text 4.5:1, icons and borders 3:1 in Light and dark; DEMO chip keeps `--demo` on `--demo-bg`.
- [ ] Focus order: skip link, top bar, 🔍, heading, ⓘ, content, nav. Sheets trap focus, Esc closes, focus returns to the opener. Route change moves focus to h1 (settings-final-decision R11).
- [ ] Labels exist in EN, BN and Mix; Bangla follows CLAUDE.md 2b passes (ডাটা, প্রাইভেট, ব্যাকআপ, অ্যাপ, আসল ডাটা, ডেমো, দরকার, আপনি form, Latin digits); Bangla stays marked "যাচাই হয়নি".
- [ ] Default view <= 1.5 screens at 360 px / 100% (re-measure with the script method in section 0).
- [ ] Unknown is never 0; no score, rank, streak, piety wording, scripture text; no red on missed items; DEMO label on every sample number.
- [ ] Old links still land (`#/more/*`, `#/settings/<cat>/<row>`); link-check test passes; disclaimers once per route.
- [ ] Offline: all new components in the precache; no network for search except the tapped Wikipedia card.

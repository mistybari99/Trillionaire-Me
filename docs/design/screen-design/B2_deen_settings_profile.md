# B2: Deen, Knowledge, Settings, Profile and global pieces (design, 6 Nov 2026)

## বাংলা সারাংশ
- এই ডকুমেন্ট শুধু ডিজাইন। কোড, ডাটা, কমিট কিছু বদলায়নি।
- আসল ব্রাউজারে (360 px, বাংলা, 100% সাইজ, ডেমো মোড) মেপে দেখা গেছে: সবচেয়ে লম্বা পেজ Fields গাইড (44 স্ক্রিন), Status (19), Topic (7.4), Deen (6.2), নামাজ সেটিংস (5.5)।
- সমাধান: প্রতি পেজে ট্যাব, অ্যাকর্ডিয়ন, নিচ থেকে ওঠা শিট, কাউন্ট ব্যাজ, আর প্রতি গ্রুপে ⓘ হেল্প।
- সব পেজে এক লাইনের ডেমো ব্যানার (এখন 120 px), ডিসক্লেমার এক লাইনের চিপ।
- সব ট্যাবে 🔍 কমান্ড বার: অ্যাকশন, পেজ, সেটিংস, টপিক, গ্লসারি, অফলাইনে খোঁজে।
- নতুন "আমার প্রোফাইল" হাব: নাম, পারমিশন, লুক, ভাষা, ব্যাকআপ এক জায়গায়। কোনো স্কোর বা র‍্যাঙ্ক নেই।
- নিচের ম্যাপ দেখায় কোনো ফাংশন বাদ যায়নি। আগের লিংক সব কাজ করবে।
- লক্ষ্য: ডিফল্ট ভিউ ১.৫ স্ক্রিনের মধ্যে। এগুলো বাজেট, বানানো হয়নি।
- নতুন রুট মাত্র ৩টি (নিচে)। ৫টি ট্যাব একই থাকে।
- ছবিতে দেখুন: `B2_deen_settings_profile.html` (আগে/পরে ৫টি ফ্রেম)।

## 0. How I measured (no guessing)
Built the current app in a scratch copy (docs untouched), served `vite preview`, opened each route in Chrome 153 with Playwright: viewport 360x740, language bn, text 100%, DEMO mode, onboarding done. "Screens" = `document.documentElement.scrollHeight / 740`. Counts via `main.querySelectorAll`. Block heights via `getBoundingClientRect` of each child of `main`. Chrome overhead per screen: top bar 45, DEMO note 120 (60 on settings), nav 57, disclaimer note 135. Targets below are **budgets** (rows x measured heights), not rendered prototypes. Target: default view <= 1.5 screens (<= 1110 px page height); an opened panel scrolls inside its page.

Measured today (screens / cards / h2 / folded details / buttons / inputs):

| Route | Screens | Cards | h2 | details | btn | inputs |
|---|---|---|---|---|---|---|
| /deen | 6.24 | 16 | 15 | 22 | 7 | 0 |
| /deen/plans | 3.77 | 2 | 4 | 0 | 3 | 14 |
| /hadith (off state) | 1.33 | 1 | 1 | 0 | 1 | 1 |
| /cards | 1.34 | 0 | 1 | 0 | 3 | 2 |
| /notes | 3.39 | 3 | 3 | 0 | 3 | 9 |
| /topics | 3.97 | 21 | 25 | 0 | 0 | 0 |
| /topic/self-awareness | 7.4 | 11 tips | 3 | 0 | 0 | 0 |
| /settings | 2.69 | 14 | 2 | 0 | 7 | 2 |
| /settings/look | 2.47 | 9 | 4 | 1 | 6 | 5 |
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
| /diary (profile card lives here) | 2.05 | 9 | 8 | 1 | 5 | 0 |

Biggest single blocks: Deen prayer-times card 800 px; prayer settings card 1908 px; Settings quick card 434 px; Privacy readout 569 px; each topic tip card 320-550 px.

## 1. Global pieces (all screens)

| Piece | Problem today (source) | Proposal | Status |
|---|---|---|---|
| Top bar | `render()` in src/app.ts: menu, title, online badge, DEMO badge, globe. No search. | menu, title, **🔍**, globe. Online state moves into the one-line banner ("Online" only as text, never "synced"). Globe keeps writing `tm:ui:lang` (settings-final-decision 1.1) | 🔍 new, needs build |
| DEMO banner | `demoPanels()` 120 px on every route (60 on settings) | One line 36 px: "DEMO · নমুনা ডাটা · আসল শুরু" with the same Start real link. Full text one tap away. Still labelled on every screen | edit of existing |
| Disclaimers | `disclaimers()` 135 px at the end of each screen | One-line chip row ("ফতোয়া নয় · গ্যারান্টি নয় ⓘ") keeping `data-legal`; full text in the ⓘ sheet. Still once per route (ui-reconcile R4) | edit of existing |
| Bottom nav | 5 tabs, `TABS` + `observeNavLayout` (navLayout.ts); knowledge routes are tagged "settings" | Keep 5 labelled tabs, wrap at large text, no icon-only. Add: re-tap active tab returns to its root; calm dot on Settings if no file backup yet (no red, no count). Knowledge pages show crumb "← Guides & info" | re-tap + dot new |
| Search / command bar | Only `withSearch()` in settingsSearch.ts, inside Settings | `commandBar()` full-width sheet: input (focus on open), chips All / Actions / Pages / Settings / Topics, grouped results with count badges, "recent 3", empty state = quick actions. Static registry, offline: ROWS, GUIDES, CATEGORIES (settingsRegistry.ts) + ROUTES labels + TOPICS names + GLOSSARY terms + actions list. Last row "Wikipedia" = the existing in-app search card (in-app-search-and-hosting.md), only on tap. No AI (D-C) | extends existing |
| Quick actions | Action Desk has a tool grid on Today only | `quickActions(context)` row of 4 (2x2 under 300 px or 150% text): Deen: Prayer log, Fast, Give, Plan. Settings: Language, Dark, Text size, Backup now. Default (command-bar empty): Capture `#/capture`, Stuck `#/stuck`, Habits `#/habits`, Intake `#/diary/intake`, Backup `#/settings/backup/savebackup` | component new |
| Help (i) | None; long intro text inline | `kHelp(id)`: 44 px ⓘ button in the heading row opens a bottom sheet (role=dialog, Esc, focus back to ⓘ). 3 lines: what / what changes / where data stays, + one "more" link. Texts in section 7 | new component |
| Sheet | Forms inline | `kSheet` used by Help, record forms, command bar. Scrim, 44 px grab bar, max 85% height, content scrolls inside | new component |
| Count badge | none | `k-chip` + number, not a score. Counts only things that exist (entries, rows, rules on) | uses kit |

New kit builders go in `src/ui/kit/` as `k-*` classes using real tokens: `--paper --card --ink --muted --rule --primary --on-primary --ember --moss --calm --demo --demo-bg --danger --s1..--s7 --r-md --r-lg --tap --ctl-h --tint-primary --hair --e1 --e2 --fs-sm --lh-ui`. Look: Light Futuristic radius 12/18, opaque cards, one primary action per view.

## 2. Group G1: Deen (/deen, /deen/plans)
**Problems.** /deen is 6.24 screens: `deen()` in screens.ts stacks `fastCard`, `prayerTimesCard` (800 px), `hijriCard` (329), `prayerLinkRow`, 8 entity cards (each repeats the "Private" tag and a field list, 22 folded lists), `deen_plan` (475), `deen_mark`, `moduleDetails`, disclaimers. /deen/plans is 3.77 screens: one 14-input form (748 px), numbers card (772), notes/giving (470).
**Proposal.**
1. Heading row with Private chip and ⓘ. Today strip (one card, ~130 px): next prayer + source chip DEMO/method, today's fast ("no record" = Unknown, not 0), Hijri date as one line.
2. Quick actions: Prayer log, Fast, Give, Plan. Each opens a bottom sheet with the existing form fields (same `fieldHelp`, same consent gate, same D-B rules).
3. In-page tabs (state in the page, no route): **Today** (5 prayer rows, next highlighted, rest folded) | **Records 8** (8 rows with count badge, tap = sheet) | **Plan** (deen_plan, deen_mark) | **Learn** (Quran activity, learning, links to Hadith/Cards/Topics, Feature details).
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
| prayer_log, quran_activity, fast, zakat_snapshot, giving, hajj_plan, learning_item, right_duty | entity cards (M13) | Records tab rows, sheet each |
| deen_plan, deen_mark | entity cards | Plan tab |
| Deen plans page | /deen/plans | stays route, 3 tabs |
| Feature details | `moduleDetails("deen")` | Learn tab |
| Not a fatwa / no guarantee | `disclaimers` | chip + ⓘ |

## 3. Group G2: Knowledge (Hadith, Cards, Notes, Topics)
**Problems.** Four routes tagged "settings" tab; /topics 3.97 screens (21 link cards, 89 px each); /topic/:id 7.4 screens (tip cards 320-550 px); /notes 3.39 (3 big sections); /hadith 1.33 (off state, consent card); /cards 1.34 (form).
**Proposal.**
- Shared `knowledgeTabs()` strip on all four: **Topics | Cards | Notes | Hadith** (uses existing routes; hub = Settings > Guides & info, "Learn" group). Crumb "← Guides & info".
- /topics: search box + 4 layer accordions with count badges (first open); topic rows 56 px not 89 px.
- /topic/:id: header + "Try it" button + tip list as accordion rows (title only, ~64 px), first tip open; "Related" folded.
- /notes: tabs **Sources | Notes | SOP**; add-form in sheet.
- /hadith stays honest: "Off" state card with one consent action, no text until D-D resolved. /cards: form moves to a sheet; list first.
**Target.** Topics 3.97 to 1.3; topic 7.4 to 1.5; notes 3.39 to 1.4; hadith/cards ~1.1 (banner and disclaimer savings).

| Route | Kept as | Functions kept |
|---|---|---|
| /topics | route | 4 layers, 21 topics, drawer links (`#/topic/<id>` from the drawer unchanged) |
| /topic/:id | route | safety note, Try it link, tips, related |
| /cards | route | add / list cards, seg view |
| /notes | route | sources, notes, SOP, crumbs |
| /hadith | route | off/consent state, pack info |

## 4. Group G3: Settings (/settings, /settings/:a/:b, /settings/connections)
**Problems.** Home 2.69 screens (quick 434 + status 214 + 9 cards of 89-111 px). Prayer 5.53 (one 1908 px card with 26 buttons, 16 inputs); Connections 3.83 (4 cards of ~560 px, equal); Backup 3.38; Privacy 3.3 (readout 569); About 2.97 (15 cards). Category pages in registry order (settingsRegistry.ts, 34 rows).
**Proposal.**
- Home: heading + 🔍 + ⓘ; "My profile" row (new); one compact Quick card (language seg, theme seg, text slider 75-150, all in ~210 px); status as 3 chips (backup, data, lock) each a link; **2-column tiles** for the 8 categories with one value line; Delete tile last, dashed neutral border; Guides & info row. ~1.4 screens.
- Every category page: summary line + **accordion per registry row** (`data-setting-row` kept). Summary shows current value + count badge; open = the existing control. `#/settings/<cat>/<row>` opens and highlights that row (extends `highlight()`).
- Long forms (prayer offsets x5, alert prayers x5, passphrase, CSV import) go to bottom sheets.
- Prayer: accordions Times (method, Asr), Fine tune (offsets, sheet), Alerts, Place, Auto-update, Reminders.
- Connections: one list of 4 rows (Approve / Turn on / Key / Withdraw inside each, same order), line "0 of 4 on. Nothing leaves this phone".
- Delete: unchanged two actions, typed word, calm copy.
**Target (default view).** Home 1.4; look 1.3; prayer 1.5; backup 1.4; privacy 1.4; data 1.3; plan 1.3; connections 1.5; delete 1.2; about 1.4.

| Route | Rows (registry ids) now to after |
|---|---|
| /settings | language, theme, textsize (Quick card); status strip; 8 tiles; about row |
| /settings/look | design, density, horizon, universe, habitgrid, motion, resetlook = 7 accordions |
| /settings/prayer | prayermethod, prayersync, prayerplace, prayeralerts, reminders = 5 accordions |
| /settings/backup | reminder, storage, savebackup, restore, snapshots, csv, PDF print card = 7 accordions |
| /settings/privacy | readout, lockscreen, consent, applock = 4 accordions |
| /settings/data | mode, startreal (`/settings/data/start-real` page stays) |
| /settings/plan | rules (4 switches), planmode, stages, weighting |
| /settings/connections | 4 facility rows |
| /settings/delete | deletedemo, deletereal |
| /settings/about | version, 12 guides, welcome (see G4) |
| Redirects | /more, /more/data, /more/connections, /more/rules unchanged (`REDIRECTS`) |

## 5. Group G4: More / Guides pages (all stay at their URLs)
**Problems.** Fields 44.4 screens (186 field cards + 47 entity headings, each card with a folded help); Status 18.8 (25 module cards); Glossary 6.1 (34 cards); Dictionary 4.75 (47 folded rows at 56+ px); Where 3.92; Library 3.32; Halal flags 2.57; Safety 1.32 (fine).
**Proposal.** Settings > Guides & info becomes two in-page tabs: **Learn** (Topics, Library, Cards, Notes, Hadith) | **About the app** (Where, Status, Fields, Glossary, Dictionary, Halal flags, Safety, Version, Welcome). Each page:
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

## 6. Group G5: Profile hub (new `/profile`)
Entry points: Settings home first row, command bar, Today greeting (name links to it). Top bar stays unchanged. Hub only links and summarises; it stores nothing and adds no key.

| Part | State | Source / route |
|---|---|---|
| Header: name, age (ESTIMATE), time zone, Unknown if empty | built (card) / hub **new** | `profileCard`, `profileView` in src/ui/profileCard.ts, edit `#/diary/intake/1` |
| Greeting | built | `greeting()` |
| Data mode demo/real | built | `#/settings/data/mode` |
| Real-data permission (consent, date, Withdraw) | built | `#/settings/privacy/consent` |
| App lock + PIN | built | `#/settings/privacy/applock` |
| Look, language, text size | built | `#/settings/look`, Quick card |
| Backup status, last file | built | `#/settings/backup` |
| Hub page, tabs Me / Permissions / Look & language / Backup | **new, needs build** | `/profile` |
| My data at a glance (demo n / real n entries) | **new, needs build**, uses existing counts | data page counts |
| Initial-letter avatar chip | **new, optional** | no photo, no upload |
No owner-profile spec exists in the repo (searched docs); the extra ideas above are proposals only. Rules: nothing inferred, all typed by the person, no completeness percent, no rank. Real values need the D-B tick first.

## 7. Help (i) text, every group (EN / BN, plain)
| Group | English | বাংলা |
|---|---|---|
| Deen | Your private worship notes and prayer times. Changes only what you record. Data stays on this phone. Not a fatwa. | আপনার প্রাইভেট ইবাদতের নোট ও নামাজের সময়। শুধু আপনার রেকর্ড বদলায়। ডাটা এই ফোনেই থাকে। ফতোয়া নয়। |
| Deen plans | Plan reminders from your own numbers. No score. | নিজের সংখ্যা থেকে প্ল্যান ও রিমাইন্ডার। কোনো স্কোর নেই। |
| Knowledge | Guides, cards and notes. Read only; nothing is sent out. | গাইড, কার্ড ও নোট। শুধু পড়া; কিছু বাইরে যায় না। |
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
| `/profile` | new route | add to ROUTES, tab tag "settings"; no key, no schema change |
| Command bar (🔍 in top bar) | new component + top-bar edit | extends settingsSearch registry; no route |
| Deen and Notes tabs | in-page state | no route; optional deep link `/deen/records` new, needs build (not required) |
| `kHelp`, `kSheet`, `knowledgeTabs`, `quickActions`, accordion | new kit builders | all other routes above exist |
| One-line DEMO banner, disclaimer chip | edit of `demoPanels`, `disclaimers` | keep `data-legal` and Start real link |

Every other route in this document exists today in `ROUTES` / `REDIRECTS` (src/app.ts).

## 9. Acceptance checklist (per screen, per language EN / BN / Mix)
- [ ] Text 75, 100, 125, 150%: no clipped Bangla vowel marks, no horizontal scroll, tabs wrap to two rows, tiles go to one column at 150%.
- [ ] Every target >= 44 px (ⓘ, 🔍, tabs, chips that are links, accordion headers, tiles); no two targets under 8 px apart.
- [ ] Contrast: text 4.5:1, icons and borders 3:1 in Light and dark; DEMO chip keeps `--demo` on `--demo-bg`.
- [ ] Focus order: skip link, top bar, 🔍, heading, ⓘ, content, nav. Sheets trap focus, Esc closes, focus returns to the opener. Route change moves focus to h1 (settings-final-decision R11).
- [ ] Labels exist in EN, BN and Mix; Bangla follows CLAUDE.md 2b passes (ডাটা, প্রাইভেট, ব্যাকআপ, অ্যাপ, আসল ডাটা, ডেমো, দরকার, আপনি form, Latin digits); Bangla stays marked "যাচাই হয়নি".
- [ ] Default view <= 1.5 screens at 360 px / 100% (re-measure with the script method in section 0).
- [ ] Unknown is never 0; no score, rank, streak, piety wording, scripture text; no red on missed items; DEMO label on every sample number.
- [ ] Old links still land (`#/more/*`, `#/settings/<cat>/<row>`); link-check test passes; disclaimers once per route.
- [ ] Offline: all new components in the precache; no network for search except the tapped Wikipedia card.

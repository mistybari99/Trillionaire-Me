# Bangla plain-language review A (read-only audit)

Reviewer: Bangla language expert A. Date: 3 Nov 2026. Scope: every Bangla string in `src/i18n/packs.ts` (bn pack, lines 1881-4085, about 2200 keys), `src/catalog/fields.ts`, `src/catalog/glossary.ts`, `src/modules/capability.ts`, `src/schema/entities.ts`, `src/library/*.ts`, `src/library/systems/*.json`, `src/core/*` (stage, rule, stuck, notify text), `src/demo/seed.ts`, `public/content/pack-001..009.json`, `docs/owner/BANGLA_REVIEW_SHEET.md`. No source file was edited.

How the counts were made: a scan of every line that holds Bangla text. "Lines" = lines containing the word (a line can hold several keys, so real occurrences are slightly higher). `src/library/hadithPack.json` is a translated source text and is out of scope (see Risks).

## 0. Honest starting point

The 1 Nov loanword pass (`bangla-loanword-swaps.md`, 1088 swaps) already fixed most "pure shuddho" words: ইনকাম, লোন, স্টাফ, প্ল্যান, রিস্ক, নোটিফিকেশন, ডিলিট, সেভ, স্ক্রিন, রিভিউ and so on are in place. The two examples in the owner complaint ("সরাসরি সম্প্রচার" for Live, "নিরীক্ষা" for Test) are **not in the code today** (0 matches for সম্প্রচার and নিরীক্ষা). They are the pattern the owner fears, and the same pattern still exists in a smaller form. The remaining problems are:

1. Spelling choices that differ from what the owner wrote (ডেটা vs ডাটা; লক্ষ্য vs গোল; Demo/রিয়েল/আসল mixed).
2. A second layer of formal words that are still in the text (ব্যক্তিগত, হস্তান্তর, সরান, সরঞ্জাম, আনুমানিক, বরাদ্দ, মাপকাঠি, পরীক্ষা, সুরক্ষিত, তালাবদ্ধ ...).
3. Stiff sentence shapes (long, passive, "করা হয়", stacked nouns) in a few dozen strings.
4. Small inconsistencies (ডিলিট/ডিলেট, বাটন/বোতাম, সেটিং/সেটিংস, Latin words left inside Bangla text).

## 1. Style rules (one-page guide)

### 1.1 When to keep the English word (in Bangla script) and when to use Bangla

Use the English word in Bangla script when **all three** are true: (a) people say it that way on a phone or in a shop, (b) the Bangla word is longer, rarer or bookish, (c) it is not a Deen term. Use plain Bangla when the Bangla word is the one people really say, or when the English word would be less clear to an older or less-schooled reader.

Test sentence: "Would my cousin say this word to me on a voice call?" If yes, use it.

| Keep English-in-Bangla-script | Keep Bangla |
|---|---|
| লাইভ, টেস্ট, ব্যাকআপ, সেটিংস, স্ক্রিন, ডাটা, অ্যাপ, নোটিফিকেশন, রিমাইন্ডার, গোল, প্ল্যান, টাস্ক (as a label), রিপোর্ট, ড্যাশবোর্ড, ফাইল, লিস্ট, ডিলিট, সেভ, এডিট, চেক, আপডেট, ইমপোর্ট, এক্সপোর্ট, পারমিশন, প্রাইভেসি, ইনকাম, লোন, রিস্ক, ডেডলাইন, শিডিউল, ব্রেক | দিন, টাকা, খরচ, হিসাব, কাজ (in a sentence), সময়, সপ্তাহ, মাস, ফোন, ব্যবসা, লাভ, বেতন, কিস্তি, পরিবার, স্বাস্থ্য, ঘুম, বিশ্রাম, শুরু, শেষ, খুলুন, বন্ধ, চালু, যোগ করুন, জানি না |
| Deen terms are **never** swapped: নামাজ, রোজা, যাকাত, সদকা, হজ, উমরাহ, হালাল, সুদ, ইবাদত, দ্বীন, আখিরাত, আজান, ওয়াক্ত | |

### 1.2 Spelling conventions for loanwords (one spelling per word, everywhere)

| Rule | Use | Do not use |
|---|---|---|
| Short "a/e" sound at the start, as in "app", "alert", "account", "assistant": অ্যা | অ্যাপ, অ্যালার্ট, অ্যাকাউন্ট, অ্যাসিস্ট্যান্ট | এপ, এপ্স, এলার্ট, একাউন্ট |
| "data": the owner wrote ডাটা. This is also how mobile-data offers are written in Bangladesh | ডাটা (proposed, replaces ডেটা, 115 lines) | ডেটা, ডাটাবেজ |
| "backup" | ব্যাকআপ (one word, no hyphen) | ব্যাক-আপ, ব্যাকাপ |
| "settings" plural, as on every phone | সেটিংস | সেটিং, সেটিঙ্গ |
| "test" | টেস্ট | টেষ্ট, নিরীক্ষা, পরীক্ষণ |
| "live" | লাইভ | সরাসরি সম্প্রচার, জীবন্ত |
| "screen" | স্ক্রিন | স্ক্রীন, পর্দা |
| "notification" | নোটিফিকেশন | নোটিফিকেশান, বিজ্ঞপ্তি |
| "reminder" | রিমাইন্ডার | রিমাইণ্ডার, স্মারক |
| "delete", "cancel" | ডিলিট, ক্যানসেল (keep the form already used 4 times) | ডিলেট (still accepted as typed input only), মুছুন |
| "import/export" | ইমপোর্ট, এক্সপোর্ট (already used everywhere) | ইম্পোর্ট, আমদানি, রপ্তানি |
| "button" | বাটন | বোতাম |
| "goal" | গোল | লক্ষ্য, উদ্দেশ্য (see risk R3) |
| "task" as a label or tab | টাস্ক; in running sentences keep কাজ | কর্ম, দায়িত্ব |
| "folder", "file", "link" | ফোল্ডার, ফাইল, লিংক | নথি, সংযোগসূত্র |
| ending "-tion", "-ment" words | -শন, -মেন্ট (নোটিফিকেশন, ম্যানেজমেন্ট) | -শান, -মেণ্ট |
| ending "-er/-or" | -ার (রিমাইন্ডার, প্রোভাইডার, রিভিউয়ার) | -র without আ |
| compound words | write as the phone shows them: লক-স্ক্রিন, পাসওয়ার্ড, পাসফ্রেজ, ব্যাকআপ | split into two words |

Suffix rule: the Bangla suffix goes straight on the word (গোলের, ডাটায়, অ্যাপে, ফাইলটি). In Mix the app already turns this into `Goal-এর` (hyphen before a Bangla suffix). Keep that.

### 1.3 Tone

- Polite "আপনি" form only. Verbs end in -ুন (করুন, দেখুন) or are plain statements. No "তুমি", no "ভাই", no slang, no emoji.
- Short sentences: aim for 12 words or fewer. One idea per sentence. Split with "।" instead of ";" where possible.
- Active voice. "সেভ হয়েছে" is better than "সংরক্ষণ করা হয়েছে". Avoid "করা হয়" chains.
- Say what to do first, then why. Button text is a verb: "সেভ করুন", "ডিলিট করুন".
- No red or punishing words for missed goals. "এখনো হয়নি" is fine; "ব্যর্থ", "দুর্বল", "পিছিয়ে" are not.
- Words that sound like a court or a form are replaced: প্রদান, সম্পন্ন, অবগত, উল্লেখিত, উপরোক্ত, নিম্নোক্ত, প্রয়োজনীয়, অনুগ্রহপূর্বক. The current text uses "অনুগ্রহ করে" twice (packs.ts 3763, 3792); plain verb form is better.

### 1.4 Numbers, dates, money

- Latin digits 0-9 everywhere (owner rule, already enforced at display time by `latinDigits` in `src/i18n/digits.ts`). Bangla digits remain in the source in about 500 places in `fields.ts` and about 300 more across other files, but the display layer converts them. Low risk; clean them up in the script anyway so the source reads the same as the screen.
- Money: "100 টাকা" or "BDT 100"; never "৳" next to a Bangla word. Keep "100,000" with the English comma and a space before টাকা. Use "লাখ", "কোটি" only in explanation text, never in a field or a result.
- Dates: "12 নভেম্বর 2026" (day, month name, year). Month names in Bangla (জানুয়ারি, ফেব্রুয়ারি, মার্চ, এপ্রিল, মে, জুন, জুলাই, আগস্ট, সেপ্টেম্বর, অক্টোবর, নভেম্বর, ডিসেম্বর). Time: "9:30" with "সকাল", "দুপুর", "বিকেল", "রাত"; 24-hour only in a form hint.
- Percent: "50%" in numbers, "পার্সেন্ট" only in sentences.
- Prayer names keep the existing words (ফজর, যোহর, আসর, মাগরিব, ইশা).

### 1.5 How Mix should differ from Bangla

Mix mode today is derived from the Bangla pack by `MIX_TERMS` (a find-and-replace). Rules:

1. Mix = plain Bangla sentence with the **same loanwords written in English letters** (Goal, Data, Backup, Settings, Task, Plan, Report, Dashboard, Live, Test). Grammar stays Bangla.
2. Every loanword spelling in 1.2 must have exactly one entry in `MIX_TERMS`. After the spelling change (ডেটা to ডাটা, লক্ষ্য to গোল), update `MIX_TERMS` in the same commit or Mix will show Bangla for these words.
3. Words that stay Bangla in Bangla also stay Bangla in Mix (দিন, টাকা, কাজ, নামাজ).
4. The 13 `COMMON_ENGLISH_KEYS` stay fully English in Mix. Do not extend this list for style reasons.
5. Mix must never produce a half-converted word. The `mixRe` look-around already blocks this. Add a test (section 5.3).

## 2. Findings table (hard, stiff or wrong words)

Line numbers are in `src/i18n/packs.ts` unless a file is named. Action: "A" = apply by script; "R" = rewrite by hand (section 3); "K" = keep (see Risks).

### 2.1 Owner's list: spelling and word choice

| # | Current | Proposed | Count (lines) | Where | Reason | Action |
|---|---|---|---|---|---|---|
| 1 | ডেটা | ডাটা | 115 | packs.ts 109, capability.ts 6; includes `Demo ডেটা`, `আসল ডেটা`; inflected ডেটার (17), ডেটায় (4), ডেটাতে (3) | Owner spelling; matches "মোবাইল ডাটা" | A |
| 2 | লক্ষ্য, লক্ষ্যের, লক্ষ্যে, উপ-লক্ষ্য, মূল লক্ষ্য | গোল, গোলের, গোলে, সাব-গোল, মেইন গোল | 242 (packs.ts 150, fields.ts 45, capability.ts 9, content packs 28, topics.ts 3, other 7) | e.g. 2639 `chart.goal.title` "লক্ষ্য অনুযায়ী প্রোগ্রেস" to "গোল অনুযায়ী প্রোগ্রেস"; 2355 `bd.rd.intro` | Owner list has গোল. Reverses the 1 Nov decision to keep লক্ষ্য (see R3) | A with review |
| 3 | কেন্দ্রীয় লক্ষ্য (3650 `univ.intro`, 3651 `univ.centre`) | মূল গোল | 4 | 3650, 3651 | "কেন্দ্রীয়" is a government word | A by phrase |
| 4 | পরীক্ষা (meaning test or trial) | টেস্ট | 29 total; bn pack 2 | 3487 `fit.test` "প্রথম ছোট পরীক্ষা" to "প্রথম ছোট টেস্ট"; pack-006.json 12 (section "আইডিয়া থেকে পরীক্ষায়") | Owner list: টেস্ট. 2229 `ap.intro` "এটি পরীক্ষা নয়" becomes "এটা কোনো টেস্ট নয়" | A by key, check each |
| 5 | সরাসরি (meaning live or in person) | লাইভ / সামনাসামনি | 2 | paths.ts 69 "সরাসরি বা অনলাইনে" means in person: "সামনাসামনি বা অনলাইনে". pack-001.json 1 means "directly" | Do not blanket-replace | R |
| 6 | সম্প্রচার, নিরীক্ষা | none present | 0 | n/a | Add both to the banned-word test | test |
| 7 | বোতাম | বাটন | 3 | fields.ts 2, packs.ts 1 | One spelling; বাটন already used 5 times | A |
| 8 | সেটিং (singular alone) | সেটিংস | 26 lines hold both forms | packs.ts | The screen is "সেটিংস" | check by hand |
| 9 | ডিলেট | ডিলিট | 2 | `src/core/typedConfirm.ts` 2-3 | Accepted typed words (user types it to confirm). Keep ডিলেট accepted; visible prompt says ডিলিট | K |
| 10 | এপ | অ্যাপ | 1 | packs.ts near 2008 (`print.saveNote` context) | Wrong spelling; check the exact word before replacing | A after check |
| 11 | রিয়েল / আসল mixed | one name: আসল | রিয়েল 31 lines (packs.ts 28, settingsRegistry.ts 3) vs আসল 51 | 3813 `restore.part.real`, 3815-3816, 3828 | Two names for one thing confuse a first-time reader. If the owner prefers রিয়েল, flip the rule; the point is one name | A |
| 12 | আসল তথ্য | আসল ডাটা | about 12 | 1934 `mode.switch.note` | তথ্য should stay only for "information" | A by phrase |

### 2.2 Second layer of formal or bookish words still in the text

| # | Current | Proposed | Count | Example place | Reason | Action |
|---|---|---|---|---|---|---|
| 13 | ব্যক্তিগত | প্রাইভেট (labels); শুধু আপনার (sentences) | 36 | 2692 `privacy.personal`, 2733 `deen.private`, 2300 `dp.notes.title` "ব্যক্তিগত নোট ও দান" to "প্রাইভেট নোট ও দান" | প্রাইভেসি already used 11 times; 2074 `mo.money.personal` means personal money, keep | A by key |
| 14 | হস্তান্তর | হ্যান্ডওভার | 28 | 1999, 2002, 2005, 2017, 2198, 2486, fields.ts 8 | Business word people say in English | A |
| 15 | সরান, সরিয়ে, সরানো | রিমুভ করুন (buttons); সরিয়ে দিন (text) | 50 | 1987 `risk.remove` "সরান" | A bare "সরান" is ambiguous (move or delete?) | A buttons only |
| 16 | বদল, বদলান | keep বদল; "বদলান" button to "এডিট করুন" where English says Edit | 156 | 2434 `ven.edit.title` | বদল is the everyday word | K, about 6 buttons A |
| 17 | বিবরণ | ডিটেইল | 7 | 2434, 2718 | Phone word | A |
| 18 | সরঞ্জাম | টুল | 5 | 2353 `bd.rm.area.tools`, 2624 `disclaimer.advice` | Bookish | A |
| 19 | আনুমানিক | প্রায় / আন্দাজ | 16 | 1911 `onb.min.label` "আনুমানিক কতক্ষণ?" to "প্রায় কতক্ষণ?"; 2412 `ven.value` | Everyday word is "প্রায়" | A |
| 20 | বরাদ্দ সময় | ঠিক করা সময় | 10 | 2124 `blk.title`, 2133 `blk.add`, fields.ts 5 | "বরাদ্দ" is a budget-office word | A with review |
| 21 | মাপকাঠি | মাপ (labels); "যা দিয়ে মাপবেন" (sentences) | 23 | 2357 `bd.rd.fact.measure`, 2527 `ns.title` | Stiff | R |
| 22 | উদ্যোগ | ভেঞ্চার (label, matches English "Venture"); "ব্যবসার আইডিয়া" (sentences) | 47 | 2036 `gate.why.no_ventures` | "উদ্যোগ" means initiative | A by key + R |
| 23 | ন্যূনতম, সর্বোচ্চ | মিনিমাম, ম্যাক্সিমাম (labels); কমপক্ষে, বেশি হলে (sentences) | 11 + 16 | 3069 `stuck.h.minimum_week`; 2215 `kn.err.p.steps_many` "সর্বোচ্চ {n}টি ধাপ রাখুন" to "বেশি হলে {n}টি ধাপ রাখুন" | Bookish | A labels, R sentences |
| 24 | সর্বশেষ | শেষ | 4 | 2248 `hl.latest`, 3759 | Common word | A |
| 25 | সুরক্ষিত | সেফ | 3 | 3768 `store.persist.yes`, 3769 `.no` | Bookish | R |
| 26 | তালাবদ্ধ | লক করা | 2 | 3615 `conn.cloudSync.does`, 3749 `snap.fileNote` | Phones say "লক" | R |
| 27 | লাইসেন্সপ্রাপ্ত | লাইসেন্স করা | 3 | 3620-3621 | Legal suffix | A |
| 28 | ভবিষ্যদ্বাণী | আগাম বলা কথা | 3 | 2623, 2846 | Rare word, but inside no-guarantee lines (R4) | R, owner may keep |
| 29 | প্রতিশ্রুতি | গ্যারান্টি | 3 | 2166 `fit.w.note`, 3529 `overall.note` | "গ্যারান্টি" already used 5 times | A |
| 30 | সম্প্রতি | নতুন / আগে | 2 | 3137 `fresh.recent`, 3958 `set.search.recent` | Bookish | A |
| 31 | অনুগ্রহ করে | (drop) | 2 | 3763 `save.fail.retryStill`, 3792 `lock.err.wait` | Letter-style | R |
| 32 | ব্যবহৃত | drop / "নিয়েছে" | 4 | 3771 `store.usage`, 2162 `fit.w.title` | Form word | R |
| 33 | ক্রম | আগে-পরে / অর্ডার | 23 | 1946 `plan.after.none` "ক্রম লাগে না" to "আগে-পরে লাগে না"; 2162 | Context decides | R |
| 34 | নির্ধারিত | ঠিক করা | 12 | 2788 `rules.s.smaller_step`, 3961 `gl.habit.week` | Bookish | A |
| 35 | চিহ্নিত | মার্ক | 20 | 2411, 2505-2506 | "মার্ক করুন" is the phone word | A |
| 36 | পূরণ (for conditions) | মেলা / হওয়া | 26 | 2022 `gate.note`, 2032 `gate.exit.met` "পূরণ হয়েছে।" to "মিলেছে।" ("ফর্ম পূরণ" stays) | | R |
| 37 | বের-শর্ত | বের হওয়ার শর্ত | 3 | 2022, 2401 `risk.review.nostop` | Made-up compound | R |
| 38 | অজানা (in sentences) | জানা নেই | 58 | 3308 `imp.err.entity`, 3309 `imp.err.field`. Column label 2637 `chart.unknown` "অজানা" stays | Product rule: unknown is not zero (R5) | label K, sentence R |
| 39 | গোনা | হিসাব / ধরা হয় | 56 | 1934, 2061, 2071, 2252, 3529 | Reads as counting on fingers | R |
| 40 | স্থানীয় স্ন্যাপশট | ফোনের সেভ-কপি | 15 | 3731 `snap.title`, 3733 `snap.auto` | Unfamiliar word | R |
| 41 | নিশ্চিত করুন (button) | কনফার্ম করুন | 18 | buttons only; 1912 "নিশ্চিত নই" stays | | A buttons |
| 42 | বিশ্বস্ত | ভরসার | 8 | 1892 `halal.intro`, 3190 | Shorter | R |
| 43 | খসড়া | ড্রাফট | 12 | 1888 `more.halal`, 1891 `halal.draft` | Keep "যাচাই হয়নি" untouched | A |
| 44 | ধারণা যাচাই | ধারণা টেস্ট | 1 | 2087 `mo.asm.title` | The other 69 "যাচাই" stay (R6) | A |
| 45 | ডিভাইস | ফোন | 9 | 3759 | Phone-only user | A |
| 46 | প্রভাবিত | বদলে যেতে পারে | 6 | 2836 `rl.check`, 2854 `rl.impact.none` | Stiff passive | R |
| 47 | অপ্রয়োজনীয় | দরকার নেই এমন | 2 | 3256 `leak.att.silence.tip` | | A |
| 48 | পদ্ধতি | নিয়ম / মেথড | 8 | packs.ts 4, pack-004 2, pack-006 1 | | A with review |
| 49 | সম্পন্ন | শেষ হয়েছে | 5 | fields.ts 4, weekly-money-check.json 1 | Court word | A |
| 50 | জিজ্ঞাসা | জিজ্ঞেস | 3 | pack-001.json 117 | One spelling (packs.ts already জিজ্ঞেস) | A |
| 51 | বিনামূল্যের | ফ্রি | 1-2 | pack-005.json | Phone word | A |
| 52 | রানওয়ে, বেসলাইন, রেডিনেস, ফানেল, ফ্ল্যাশকার্ড | plain Bangla in UI sentences | 2, 1, 4, 3, 3 | 3134 `money.baselineNeeded`, 2355 `bd.rd.title` | Not common words in Bangladesh. রানওয়ে to "কত মাস চলবে", বেসলাইন to "শুরুর হিসাব", রেডিনেস ম্যাপ to "প্রস্তুতির ম্যাপ" | R |

Kept on purpose (K): ফাঁকা (84, blank field, plain), খালি, পুরোনো (32), এন্ট্রি (118), অপশনাল (17), সুবিধা (17), উদাহরণ (36), শর্ত (57; formal is safer in halal and contract pages), যাচাই হয়নি, পাসফ্রেজ, আর্থিক in the advice disclaimer, সাধারণ লাইন, অজানা as a column label.

Totals: about **1,250 lines** across about 30 files have a clear replacement. About **480** of these are the two spelling decisions (ডাটা and গোল); about 770 are second-layer words.

### 2.3 Other inconsistencies

| # | Issue | Count | Fix |
|---|---|---|---|
| 53 | Bangla digits in source | fields.ts 498, topics.ts 45, content packs about 330, capability.ts 13, paths.ts 11 | Display already converts; clean in script group 1 |
| 54 | এখনো / এখনও | 159 / 17 | One spelling: এখনো |
| 55 | কোনো / কোন | 156 / 17 | "কোন" only for "which"; check the 17 by hand |
| 56 | হিসেবে / হিসাবে | 17 / 3 | One spelling: হিসেবে (as). হিসাব stays the noun |
| 57 | সাথে / সঙ্গে | 12 / 13 | One: সাথে (spoken); keep সঙ্গে in Deen lines |
| 58 | "আপনার" repeated | 211 | Many lines read better without it; do it only in the rewrite list |
| 59 | Acronyms inside Bangla (SMART, SOP, AI, PDF, PIN, CSV, North Star) | about 50 | K |

## 3. Strings that need a full rewrite (not a word swap)

All keep the same meaning and the same placeholders (`{n}`, `{d}`, `{s}`, `{u}`, `{text}`, `{title}`).

| Key (packs.ts line) | Current | Proposed |
|---|---|---|
| `halal.intro` (1892) | লিখিত শর্ত হাতে নিয়ে এই প্রশ্নগুলো আপনার বিশ্বস্ত যোগ্য আলেমকে জিজ্ঞেস করুন। এখানে কিছু সেভ বা গোনা হয় না। | শর্তগুলো লিখে নিয়ে এই প্রশ্নগুলো আপনার ভরসার যোগ্য আলেমকে জিজ্ঞেস করুন। এখানে কিছু সেভ হয় না। |
| `halal.draft` (1891) | খসড়া। যোগ্য রিভিউয়ার এখনো প্রশ্নগুলো দেখেননি। এই পাতা কোনো সিদ্ধান্ত বা রায় দেয় না। | ড্রাফট। যোগ্য রিভিউয়ার এখনো প্রশ্নগুলো দেখেননি (যাচাই হয়নি)। এই পাতা কোনো সিদ্ধান্ত বা রায় দেয় না। |
| `ap.intro` (2229) | তিনটি অপশনাল প্রশ্ন। যেকোনোটি বাদ দিতে পারেন। উত্তর পথের কার্ডে ফিরিয়ে দেখানো হয়; এটি পরীক্ষা নয়। | তিনটি অপশনাল প্রশ্ন। যেটা ইচ্ছা বাদ দিন। আপনার উত্তর পথের কার্ডে দেখানো হবে। এটা কোনো টেস্ট নয়। |
| `fit.test` (3487) | প্রথম ছোট পরীক্ষা: {text} | প্রথম ছোট টেস্ট: {text} |
| `save.fail.text` (3759) | এই ডিভাইসে সেভ করা যায়নি। এখনই একটি ব্যাকআপ এক্সপোর্ট করুন। আপনার সর্বশেষ পরিবর্তন স্ক্রিনে আছে ... | ফোনে সেভ হয়নি। এখনই ব্যাকআপ এক্সপোর্ট করুন। আপনার শেষ চেঞ্জ স্ক্রিনে আছে ... (rest unchanged) |
| `save.fail.retryStill` (3763) | এখনো সেভ করা যায়নি। অনুগ্রহ করে ব্যাকআপ এক্সপোর্ট করুন ... | এখনো সেভ হয়নি। ব্যাকআপ এক্সপোর্ট করে নিন ... |
| `lock.err.wait` (3792) | অনুগ্রহ করে {s} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন। | {s} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন। |
| `store.persist.yes` (3768) | সুরক্ষিত: ব্রাউজার আপনার ডেটা রাখতে রাজি হয়েছে। | সেফ আছে: ব্রাউজার আপনার ডাটা রাখবে বলেছে। |
| `store.persist.no` (3769) | এখনো সুরক্ষিত নয়: ফোনে জায়গা কম পড়লে ব্রাউজার ডেটা মুছতে পারে। নিরাপদ থাকতে একটি ব্যাকআপ ফাইল সেভ করুন। | এখনো সেফ নয়: ফোনে জায়গা কম পড়লে ব্রাউজার ডাটা ডিলিট করে দিতে পারে। তাই একটি ব্যাকআপ ফাইল সেভ করুন। |
| `store.usage` (3771) | ব্যবহৃত জায়গা: প্রায় {u}। | ফোনের জায়গা নিয়েছে: প্রায় {u}। |
| `conn.cloudSync.does` (3615) | একটি তালাবদ্ধ (এনক্রিপ্টেড) ব্যাকআপ কপি অনলাইনে রাখে ও ফেরত আনে। | ব্যাকআপ কপি লক করে (এনক্রিপ্ট করে) অনলাইনে রাখে। দরকার হলে ফেরত আনে। |
| `snap.fileNote` (3749) | ফাইলটি তালাবদ্ধ নয়। এটি গোপন রাখুন। তালাবদ্ধ ফাইল চাইলে উপরের এনক্রিপ্টেড ব্যাকআপ ব্যবহার করুন। | ফাইলটি লক করা নয়। এটা কাউকে দেবেন না। লক করা ফাইল চাইলে ওপরের এনক্রিপ্টেড ব্যাকআপ নিন। |
| `snap.title` (3731) / `snap.auto` (3733) | স্থানীয় স্ন্যাপশট / অ্যাপ খুললে দিনে প্রায় একবার নিজে থেকে স্ন্যাপশট নিন | ফোনের সেভ-কপি / অ্যাপ খুললে দিনে একবার নিজে থেকে সেভ-কপি রাখুন |
| `fit.w.note` (2166) | ওজন বেশি হলে তার সাথে জড়ানো পথ আগে আসে। কোনো ওজন কোনো ফলের প্রতিশ্রুতি নয়। | ওজন বেশি হলে সেই পথ আগে আসে। কোনো ওজন ভালো ফলের গ্যারান্টি নয়। |
| `overall.note` (3529) | শুধু আপনার দেওয়া কাজ থেকে গোনা। এটি নম্বর বা প্রতিশ্রুতি নয়। | শুধু আপনার দেওয়া কাজ থেকে হিসাব। এটা নম্বর বা গ্যারান্টি নয়। |
| `month.intro` (2061) | গত 30 দিন, শুধু আপনার লেখা রেকর্ড থেকে গোনা। ফাঁকা মানে এখনো যথেষ্... | গত 30 দিনের হিসাব, শুধু আপনার লেখা রেকর্ড থেকে। ফাঁকা মানে এখনো যথেষ্... (rest unchanged) |
| `month.unknownFocus` (2071) | মিনিট ছাড়া {n}টি ফোকাস সেশন গোনা হয়নি। | মিনিট লেখা না থাকায় {n}টি ফোকাস সেশন হিসাবে ধরা হয়নি। |
| `hl.note` (2252) | গোনা হয় শুধু যেসব দিন আপনি কিছু লিখেছেন। এন্ট্রি ছাড়া দিন শূন্য নয়। | শুধু যেসব দিন আপনি কিছু লিখেছেন, সেগুলো ধরা হয়। এন্ট্রি না থাকা দিন শূন্য নয়, জানা নেই। |
| `mode.switch.note` (1934) | একবারে শুধু এক ধরনের তথ্য দেখানো ও গোনা হয়। Demo আর আসল তথ্য কখনো যোগ হয় না। | একবারে একটাই দেখানো হয়: Demo অথবা আসল ডাটা। দুটো কখনো মেশে না। |
| `disclaimer.advice` (2624) | এটা একটা প্ল্যানের সরঞ্জাম। আর্থিক, আইনি বা করের পরামর্শ নয়। | এটা প্ল্যান করার একটা টুল। আর্থিক, আইনি বা ট্যাক্সের পরামর্শ নয়। |
| `disclaimer.noGuarantee` (2623) | সম্পদ, লাভ বা সফলতার কোনো গ্যারান্টি নেই। সংখ্যাগুলো আপনার দেওয়া আন্দাজ, ভবিষ্যদ্বাণী নয়। | সম্পদ, লাভ বা সফলতার কোনো গ্যারান্টি নেই। সংখ্যাগুলো আপনার দেওয়া আন্দাজ। এগুলো আগাম বলা কথা নয়। |
| `rl.impact.rule` (2846) | এটি আপনার নিজের রেকর্ডের ওপর নিয়ম-ভিত্তিক হিসাব। এটি পরামর্শ নয়, ভবিষ্যদ্বাণীও নয়। | এটা আপনার নিজের রেকর্ড থেকে নিয়ম ধরে করা হিসাব। এটা পরামর্শ নয়, আগাম বলাও নয়। |
| `rl.check` (2836) / `rl.impact.none` (2854) | কী কী প্রভাবিত হতে পারে দেখুন / আপনার প্ল্যানের কিছুই প্রভাবিত হচ্ছে না। | কী কী বদলে যেতে পারে দেখুন / আপনার প্ল্যানের কিছুই বদলাচ্ছে না। |
| `rl.resume.p` (2901) | বিরতি বা ন্যূনতম সপ্তাহ শেষ করে সরিয়ে রাখা কাজ থেকে সর্বোচ্চ {n}টি ফিরিয়ে আনে ... | ব্রেক বা মিনিমাম সপ্তাহের পর সরিয়ে রাখা কাজ থেকে বেশি হলে {n}টি ফিরিয়ে আনে ... (rest unchanged) |
| `gate.note` (2022) | আপনার লেখা প্রতিটি বের-শর্ত পূরণ হলে এবং নিজের প্রমাণ লিখলে ... | আপনার লেখা বের হওয়ার প্রতিটি শর্ত মিললে এবং নিজের প্রমাণ লিখলে ... |
| `gate.exit.met` (2032) | পূরণ হয়েছে। | মিলেছে। |
| `money.baselineNeeded` (3134) | বেসলাইন লাগবে। এখন হাতে যা আছে (ক্যাশ ও সঞ্চয়) তা সম্পদ লাইন হিসেবে যোগ করুন। তার আগে রানওয়ে অজানা থাকবে। | আগে শুরুর হিসাব লাগবে। এখন হাতে যা আছে (ক্যাশ ও সেভিংস) তা সম্পদ লাইন হিসেবে যোগ করুন। তার আগে কত মাস চলবে, তা জানা যাবে না। |
| `fresh.recent` (3137) / `set.search.recent` (3958) | সম্প্রতি সেভ করা / সম্প্রতি খোলা | নতুন সেভ করা / আগে খোলা |
| `onb.min.label` (1911) | আনুমানিক কতক্ষণ? | প্রায় কতক্ষণ? |
| `deen.set.lock` (2718) | ... বিবরণ দেখাতে চাইলে সেটিংস > প্রাইভেসি ও লক থেকে পারমিশন দিন। | ... ডিটেইল দেখাতে চাইলে সেটিংস > প্রাইভেসি ও লক থেকে পারমিশন দিন। |
| `imp.err.entity` (3308) / `imp.err.field` (3309) | অজানা রেকর্ডের ধরন। / এই রেকর্ডের জন্য অজানা ফিল্ড। | এই রেকর্ডের ধরন চেনা যায়নি। / এই রেকর্ডে এমন ফিল্ড নেই। |
| `leak.att.silence.tip` (3256) | ফোকাস সময়ে অপ্রয়োজনীয় নোটিফিকেশন মিউট করুন। | ফোকাসের সময় দরকার নেই এমন নোটিফিকেশন মিউট করুন। |
| `ns.title` (2527) | মূল মাপকাঠি (North Star) | মূল মাপ (North Star) |
| `fit.stale` (2158) | {n} দিনের বেশি পুরোনো: ভরসা করার আগে এই এন্ট্রি আবার দেখে নিন। | {n} দিনের বেশি পুরোনো। ভরসা করার আগে এন্ট্রিটা আবার দেখে নিন। |
| `univ.intro` / `univ.centre` (3650-3651) | একটি কেন্দ্রীয় লক্ষ্যের চারপাশে ... / কেন্দ্রীয় লক্ষ্য: {title} | একটি মূল গোলের চারপাশে ... / মূল গোল: {title} |
| `print.saveNote` area (2008) | contains the mis-spelling "এপ" | fix to "অ্যাপ" after reading the exact line |

Rewrite budget: about 40 strings in `packs.ts`, plus about 25 help lines in `fields.ts` that use "অনুযায়ী", "সম্পর্কে", "নিম্নরূপ" style (find them after the first script pass), plus the content packs, whose sentences are already short; only word swaps are needed there, except pack-006.json lines 760-806 ("আইডিয়া থেকে পরীক্ষায়"), which needs টেস্ট and গোল and a re-read.

## 4. Risks (meaning loss, Deen, money, where the formal word is safer)

- **R1: Deen terms never change.** No rule may touch: নামাজ, রোজা, যাকাত, সদকা, ফিতরা, কুরবানি, হজ, উমরাহ, হালাল, সুদ, রিবা, আখিরাত, ইবাদত, দ্বীন, দ্বীনি, আজান, ওয়াক্ত, ফজর, যোহর, আসর, মাগরিব, ইশা, নিসাব, কাজা, নিয়ত, আলেম, মাসআলা, হাদিস, কুরআন, মসজিদ, ফতোয়া, হিজরি, রমজান, দান. "ফতোয়া" appears only in "no fatwa" lines; do not simplify.
- **R2: Money and legal words where the formal word is safer.** "সুদ" stays. In halal and contract pages (`halalFlags.ts`, pack-003.json, pack-009.json) keep "শর্ত", "চুক্তি", "জামানত": clarity of the condition matters more than a phone word. In `disclaimer.advice` change only clearly everyday nouns (সরঞ্জাম to টুল, কর to ট্যাক্স) and keep the phrase order.
- **R3: লক্ষ্য to গোল reverses the 1 Nov decision.** `bangla-loanword-swaps.md` says লক্ষ্য was kept ("গোল is not clearly more common ... also means a football goal"). The owner list now says গোল. Recommendation: change everywhere (242 lines), because লক্ষ্য in sentences and গোল on buttons is worse than either. Log the reversal in DECISIONS_LOG and update the swaps doc. Keep টার্গেট as is (22 lines). 95 test files hold Bangla strings, so run the full suite.
- **R4: "ভবিষ্যদ্বাণী" is inside no-guarantee wording.** The meaning must stay "not a promise or forecast". "আগাম বলা কথা নয়" keeps it. The owner may prefer no change; it is 3 lines.
- **R5: Unknown is not zero.** Never replace "অজানা", "জানা নেই", "ফাঁকা মানে অজানা" with words that read as 0, "খালি" or "শূন্য". The rewrites in section 3 keep the three-way difference (unknown, zero, blank).
- **R6: Fixed wording "যাচাই হয়নি".** Owner-fixed phrase for unreviewed Bangla (70 lines). Only the one use meaning "test an assumption" (2087) may change.
- **R7: Typed confirm words.** `src/core/typedConfirm.ts` accepts delete, ডিলিট, ডিলেট. Never remove an accepted spelling.
- **R8: Input-matching lists.** `src/core/capture.ts`, `src/core/safety.ts` match Bangla words the user types. The script must skip them (excluded in the 1 Nov pass; keep excluded).
- **R9: Hadith pack and scripture.** `src/library/hadithPack.json` (3,852 lines) is translated source text under D-D. Out of scope; words such as প্রবেশ, অবশ্যই, প্রদর্শন in it are translation wording.
- **R10: Mix breakage.** Mix comes from `MIX_TERMS`. Changing a Bangla spelling without the same change in `MIX_TERMS` leaves Bangla words in Mix. Longer phrases must be listed before shorter ones ("মূল গোল" before "গোল").
- **R11: Suffix collisions.** `MIX_SUFFIX` handles গোলের, গোলে, গোলটি but not গোলগুলোর. Add "গুলোর" or add a test.
- **R12: Loanwords that are less clear than Bangla.** Do not swap: সম্পদ/দায়, সিদ্ধান্ত, অভ্যাস, পরামর্শ, অনুমোদন, সম্মতি, নিরাপত্তা, পরিবার, ভাষা, ধাপ (small step), যাত্রা, দল, কাজ (in sentences). Older readers know these better than "অ্যাসেট", "ডিসিশন".
- **R13: Rare English words kept in the 1 Nov pass** (ভ্যালুয়েশন, ইকুইটি, ওয়ার্কিং ক্যাপিটাল, ইউনিট ইকোনমিক্স, রানওয়ে, বেসলাইন, ফানেল, রেডিনেস). Fine in the glossary where a plain meaning line follows; harmful in UI sentences (row 52).
- **R14: Do not chase an English-word quota.** A plain Bangla word people say (দিন, কাজ, বদল, ফাঁকা) beats a forced English one.

## 5. Safe way to apply: `tools/bangla_plain_apply.mjs`

### 5.1 Design

Reuse the pattern already in the repo (`tools/banglaApplyBack.ts`, `tools/bangla_apply_back.mjs`): edit only inside the Bangla value, per key, with a refusal list. No global regex over source files.

Input `tools/bangla_plain_rules.json` (new):
- `words`: ordered `{ id, from, to, mode, scope, note }`. `mode` is `word` (whole word, same Bangla-suffix handling as `mixRe`) or `phrase`. `scope` is file globs, key patterns, or `"all"`.
- `keys`: `{ "<file>#<key>": { from: "<exact current text>", to: "<new text>" } }` for section 3. If the current text no longer matches `from`, the script refuses that key.
- `deny`: files and keys never touched (`hadithPack.json`, `capture.ts`, `safety.ts`, `typedConfirm.ts`), and the R1 word list.

Behaviour:
1. `node tools/bangla_plain_apply.mjs` is a **dry run by default**. It prints per key `file:line  key  old -> new`, a count per rule id, and the total. It writes `tmp/bangla_plain_report.md` (untracked). It changes nothing.
2. `--apply` writes files. It refuses if target files have uncommitted changes or if any check below fails.
3. `--only <rule-id>` and `--files <glob>` apply one group at a time; one commit per group (digits and singletons, ডাটা, গোল, second-layer words, rewrites).
4. Undo = `git revert` of the group commit. No extra state.

Edits touch string values only. For `packs.ts` parse with the TypeScript compiler API (`ts.createSourceFile`), find string-literal initializers inside the `bn` object (lines 1881-4085), and splice by position so quoting and line numbers stay. For `fields.ts`, `glossary.ts`, `capability.ts`, `entities.ts` handle the first argument of `bi(bn, en)` and `{ bn, en }` objects. For content JSON, walk every `bn` property and write back with the original indentation. The `en` side is never touched.

Checks the script runs (all must pass for `--apply`):
- Placeholders identical before and after, per key.
- Latin digits stay; no new Bangla digits.
- Unknown rule: counts of অজানা, জানা নেই, ফাঁকা, শূন্য, জানি না per key may not drop to 0 if above 0.
- No key loses all Bangla.
- "যাচাই হয়নি" count per key unchanged; every R1 word count unchanged.
- Banned-word scan on the result.
- `MIX_TERMS` check: for each new loanword (ডাটা, গোল, প্রাইভেট, হ্যান্ডওভার, ড্রাফট, টুল, টেস্ট, মেইন, লাইভ ...) a pair must exist; if not, print the exact pair to add and stop. `MIX_TERMS` is code, so it is edited by hand in the same commit.

### 5.2 Order of work

1. Add rules file and script; run the dry run; read the report (about 1,250 lines).
2. Group 1: digits and singletons (বোতাম, জিজ্ঞাসা, এখনও, হিসাবে, এপ). Mechanical, low risk.
3. Group 2: ডেটা to ডাটা, with `MIX_TERMS` in the same commit.
4. Group 3: লক্ষ্য to গোল, with `MIX_TERMS`, the swaps doc and DECISIONS_LOG entry in the same commit.
5. Group 4: second-layer words (section 2.2 rows marked A).
6. Group 5: the per-key rewrites (section 3).
7. Regenerate `docs/owner/BANGLA_REVIEW_SHEET.md` with `node tools/bangla_review_sheet.mjs`.
8. Run lint, typecheck, full tests, build. Screenshot a few screens in Bangla and Mix at 360 px (check the handover tab: হ্যান্ডওভার is slightly longer than হস্তান্তর).

### 5.3 Tests to add (`tests/bangla_plain.test.ts`)

1. **Key parity**: en, bn, mix have the same key set (exists; extend to `fields.ts` labels and the 9 content packs: every `bn` has an `en`).
2. **No regression in string counts**: constant per pack (en/bn/mix and each content pack); changes only by editing the test on purpose.
3. **Banned words** (whole-word, suffix-aware) over bn pack, fields, glossary, capability, entities, content packs (not hadithPack): সম্প্রচার, নিরীক্ষা, ডেটা, লক্ষ্য, বোতাম, ডিলেট (except typedConfirm.ts), স্ক্রীন, এপ, এপ্স, একাউন্ট, নোটিফিকেশান, ব্যাক-আপ, জিজ্ঞাসা, অনুগ্রহ করে, প্রদান, সম্পন্ন, অবগত, উল্লেখিত, উপরোক্ত, নিম্নোক্ত, সরঞ্জাম, হস্তান্তর, আনুমানিক, বরাদ্দ, তালাবদ্ধ, সুরক্ষিত, সম্প্রতি, বিবরণ, ব্যক্তিগত (allow `mo.money.personal`), ভবিষ্যদ্বাণী (allow if owner keeps it), পরীক্ষা (allowlist for real exams, currently none). Data in `tests/fixtures/bangla_banned.json` as `{ word, replacement, allowedKeys }` so the reviewer can add words without code.
4. **Required spellings**: positive checks for ডাটা, অ্যাপ, ব্যাকআপ, সেটিংস, নোটিফিকেশন, রিমাইন্ডার, স্ক্রিন, ইমপোর্ট, এক্সপোর্ট.
5. **Mix**: every `MIX_TERMS` Bangla word occurs in bn; every loanword used 3 or more times in bn has a pair; `swapMixTerms` never leaves Latin letters glued to Bangla letters without a hyphen.
6. **Protected phrases**: "যাচাই হয়নি" on every draft key; Deen word counts per pack unchanged (snapshot).
7. **Placeholders**: `{...}` tokens equal across en, bn, mix for every key.
8. **Unknown not zero**: for a short key list (`chart.unknown`, `money.baselineNeeded`, `hl.note`, `month.unknownFocus`), bn still contains অজানা, জানা নেই or জানি না.
9. **No Bangla digits** in the bn pack output.
10. **Link-check** (project rule) still passes; the script never touches ids or links.
11. **Length guard** for button keys (`*.btn`, `*.add`, `*.save`): 24 characters or fewer.

### 5.4 Limits of this review

- Screens were not viewed on a phone; wrapping of longer words is untested (step 8).
- No native-speaker sign-off. All proposals are unreviewed Bangla and stay marked "যাচাই হয়নি" until TM-TST-161. Borderline choices (ডেটা vs ডাটা, লক্ষ্য vs গোল, প্রাইভেট vs ব্যক্তিগত, সেফ vs সুরক্ষিত) are taste; the owner list settles the first two, and the rules file makes the rest a one-line change.

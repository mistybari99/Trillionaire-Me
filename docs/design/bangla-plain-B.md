# Bangla plain-language review B (user angle)

Reviewer: Bangla expert B, 3 Nov 2026. Read-only review. No source file was changed. Based on `docs/owner/BANGLA_REVIEW_SHEET.md` (1329 strings), `MIX_TERMS` and `bangla-loanword-swaps.md`.

Picture the reader: a small-business owner, on a phone, in a hurry, reads Bangla but says "লাইভ", "টেস্ট", "রিপোর্ট", "ফাইল", "পাসওয়ার্ড" every day. He wants to understand a line in one glance. He does not want to feel he is filling a government form.

Finding in one line: the last swap (1 Nov) fixed single words, but the words around them are still textbook Bangla, a few swaps are wrong in meaning (horizon, test), and the same thing is spelled two or three ways. Fixing the sentence shape and the spelling matters more than adding more loanwords.

Note: the strings "সরাসরি সম্প্রচার" and "নিরীক্ষা" were not found in `src`, `public` or the review sheet in this branch (they may be from another branch or a screen not in the sheet). The rule below covers them anyway.

## 1. Spelling and style guide

### 1.1 One spelling per loanword (use these; the first column is the only allowed form)

| Use | Do not use | Note |
|---|---|---|
| লাইভ | সরাসরি সম্প্রচার, সরাসরি | |
| টেস্ট | নিরীক্ষা, পরীক্ষা (for a software/try-out test) | "পরীক্ষা" stays only for school exam. A "small first try" is "ছোট ট্রাই" or "ছোট করে চেষ্টা" |
| ডেটা | তথ্য (when it means data), ডাটা | "তথ্য" stays only for "information/details" |
| ডেমো | Demo (Latin) , ডেমো/ডিমো mix | Today the pack writes `Demo` in Latin inside Bangla lines and `ডেমো` elsewhere. Pick ডেমো everywhere in Bangla. Mix shows Demo |
| ব্যাকআপ | ব্যাক-আপ, backup | |
| ফাইল | নথি | |
| পাসওয়ার্ড | গুপ্তশব্দ | PIN stays PIN (Latin, as people see it on the phone) |
| ইমেইল | ই-মেইল, ইমেল | |
| ফোন নম্বর | মোবাইল নম্বর (mix) | pick ফোন নম্বর |
| অ্যাপ | এ্যাপ, এপ | |
| ইন্টারনেট | আন্তর্জাল | |
| অনলাইন / অফলাইন | | already fixed |
| এক্সপোর্ট / ইমপোর্ট | ইম্পোর্ট, রপ্তানি, আমদানি | one spelling: ইমপোর্ট (pack uses it) |
| ডাউনলোড / আপলোড | | |
| শেয়ার | ভাগ করা (for sharing out of the phone) | |
| সেভ | সংরক্ষণ | |
| ডিলিট | মোছা, মুছুন | |
| ক্যানসেল | বাতিল, ক্যান্সেল | |
| ওকে | ঠিক আছে (button only) | "ঠিক আছে" is fine in a sentence; the button can be "ঠিক আছে" too. Keep one: ঠিক আছে |
| রিমাইন্ডার | স্মারক | |
| নোটিফিকেশন | বিজ্ঞপ্তি | |
| স্ক্রিন | পর্দা | |
| ট্যাপ | চাপ দিন (for finger tap) | "ট্যাপ করুন" |
| ক্লিক | | not used on phone, say ট্যাপ |
| লগ | | |
| এনক্রিপ্টেড | তালাবদ্ধ (when only the English meaning is meant) | See 3. Keep "তালা" only as "লক" for the app lock |
| লক / আনলক | তালাবদ্ধ, তালা খোলা | app lock = "অ্যাপ লক" |
| পিন (PIN) | | write PIN in Latin everywhere (already so) |
| পাসফ্রেজ | | keep, but explain once as "পাসওয়ার্ডের মতো একটি লম্বা বাক্য" |
| ফর্ম | ফরম | already fixed |
| মেনু | | |
| ডিফল্ট | স্বতঃপ্রাপ্ত | |
| সার্চ | অনুসন্ধান | the pack already writes "সার্চ" in places and "অনুসন্ধান" in others. Use সার্চ |
| ফিল্টার | ছাঁকনি | |
| স্ট্যাটাস | অবস্থা (for a record state) | "অবস্থা" is fine for "condition"; for done/open say স্ট্যাটাস |
| আপডেট | হালনাগাদ | |
| ডিভাইস | যন্ত্র | but "ফোন" is better still: say "এই ফোনে" not "এই ডিভাইসে" (see below) |
| ব্রাউজার | | |
| লিংক | সংযোগ (for URL) | "কানেকশন" only for the Connections screen |
| ট্রাই করুন | চেষ্টা করুন | both are fine; "আবার চেষ্টা করুন" is the better everyday phrase, keep it |
| ফিডব্যাক | প্রতিক্রিয়া | |
| রিভিউ | পর্যালোচনা | already fixed |
| হ্যাবিট | অভ্যাস | **Decision needed, see 1.3** |
| ফান্ড, ইনভেস্ট, ক্যাপিটাল | | keep as already in glossary |

### 1.2 Wrong or misleading swaps from the 1 Nov script (fix first)

- **Horizon is not "deadline".** The script turned the Journey word "horizon" into "ডেডলাইন" (`arc.title` = "ডেডলাইনের আর্ক", `arc.marker` = "লক্ষ্য আছে এমন সবচেয়ে কাছের ডেডলাইন"). A horizon is "how far ahead" (today, 1 year, 5 years). Better word: "সময়ের পরিধি" is stiff; the everyday way is "কত দিনের প্ল্যান". Proposed label: **"কত দূরের লক্ষ্য"**. Keep "ডেডলাইন" for a real due date only (`smart.t`, `grid.range.label` "সময়সীমা" → "কত দিনের" is better, see table).
- **Test is not "inspection/audit".** Where the English is "test" or "try", use টেস্ট/ট্রাই. `fit.test` "প্রথম ছোট পরীক্ষা" → "প্রথম ছোট টেস্ট".
- **"Audit" word.** "লিক অডিট" is half-English half-Bangla that no one says. See table row `leak.title`.
- **"Steps" ambiguity.** "ধাপ" is used for goal steps, Stage and wizard steps. The Stage swap helped. Keep "ধাপ" for small steps only, but never put "স্টেজ" and "ধাপ" in one sentence unless it is the Stage/step explanation.

### 1.3 Habit word
"হ্যাবিট" (the pack's tab/label in places) and "অভ্যাস" (library count line) are both used. "অভ্যাস" is the everyday word and people do not say "হ্যাবিট" in speech. Use **অভ্যাস** everywhere. (Mix may keep "Habit".)

### 1.4 Verb forms and politeness
- Always **আপনি** forms. Never তুমি/তুই. Check: imperative is "-ুন / -ন" (লিখুন, দেখুন, যোগ করুন), not "-ো" (লেখো).
- Do not mix "করুন" with the older "করিবেন"/"করবেন" in one flow. Question to user: "করবেন?" (e.g. "ডিলিট করবেন?"). Instruction: "করুন".
- Prefer the **spoken-standard verb** over the literary one: "হয়েছে" not "হইয়াছে"; "দেখুন" not "অবলোকন করুন"; "বলুন" not "জানান" (when asking for input); "জানান" only for "let us know".
- Use **verb + করুন** with the loanword (সেভ করুন, ডিলিট করুন, শেয়ার করুন). Do not make Bangla compound verbs out of English words (no "সেভিয়ে"). Passive for feedback is fine: "সেভ হয়েছে".
- Prefer active, short: "আপনার ডেটা এই ফোনেই থাকবে।" rather than "আপনার ডেটা এই ফোনে সংরক্ষিত থাকবে।".
- Say "এই ফোনে" not "এই ডিভাইসে" (`home.saved`). The owner is on a phone; "ডিভাইস" reads like a manual.
- Avoid "-কৃত", "-পূর্বক", "প্রদান", "সম্পাদন", "উল্লিখিত", "অনুগ্রহ করে" (use "দয়া করে" only if needed; most buttons need neither). One "অনুগ্রহ" and one "প্রয়োজনীয়" were still found: use "দরকারি".

### 1.5 Word order and sentence shape
- Bangla is verb-last, but a phone line should put **what to do** first or last in 3 to 6 words. Remove "মানে", "ক্ষেত্রে", "হিসেবে" chains.
- Do not translate English noun stacks word by word. "Goal steps are tasks linked to a goal" became "লক্ষ্যের ধাপ মানে লক্ষ্যের সঙ্গে যুক্ত কাজ"; the second half is correct but "যুক্ত" reads official. Use "লিংক করা" or "জোড়া": "লক্ষ্যের ধাপ = লক্ষ্যের সঙ্গে জোড়া কাজ".
- Questions: end with "?" and use "কি" rarely. "কি না" is fine. Prefer "আছে কি?" → "আছে?" in short UI lines.
- Numbers: counts as "{n}টি" is OK and already decided; digits are Latin (decided, do not change). Do not add "টি/টা" to a date or minute.
- Punctuation: use "।" at the end of Bangla sentences, "?" for questions, "·" as the small separator already used. No "!" in errors. No ":-" and no "..." except Loading. Straight " and curly quotes: pick curly “ ” everywhere (the pack mixes).
- Do not leave English fragments such as "More-এ", "Demo ও আসল ডেটা-তে". In Bangla mode, menu names must use the Bangla menu word: "আরও", "ডেমো ও আসল ডেটা". Hyphen suffix on a Bangla word is not needed ("ডেটা-তে" → "ডেটাতে").
- Use "আসল ডেটা" for the Real namespace (decided) but say "আসল" alone as a toggle label. Never "আসল তথ্য" (the sheet has both `mode.banner.start` "আসল তথ্য" and "আসল ডেটা" next to each other). One word: **আসল ডেটা**.
- Button length: aim for **3 words or fewer**, max about 18 Bangla characters. Long ones to shorten are in table 2.

### 1.6 Bangla vs Mix
- **Bangla mode**: sentence frame is Bangla; loanwords are in Bangla script. No Latin words except PIN, CSV, AI where shown, units, and keys (YYYY-MM-DD).
- **Mix mode**: same sentence, but each loanword in the MIX_TERMS list shows Latin. It is auto-derived, so **every Bangla fix must also keep working with the regex** (the regex needs a space, punctuation or the listed suffix after the word). Therefore:
  - add each new loanword (লাইভ, টেস্ট, ফাইল, পাসওয়ার্ড, ইমেইল, ফোন নম্বর? no, ট্যাপ, শেয়ার, ডাউনলোড, আপলোড, ইমপোর্ট, সার্চ, ফিল্টার, স্ট্যাটাস, আপডেট, ডিফল্ট, ব্রাউজার, লিংক, লগ, ট্রাই, মেনু, ডেমো) to `MIX_TERMS` with its English form (some already exist);
  - avoid fusing a suffix not in `MIX_SUFFIX` (use ের, ে, র, তে, টি, টা, গুলো, কে, ও, ই);
  - the hyphen form "Plan-এর" is ugly in Mix too; consider letting suffix-hyphen go (Plan এর looks odd as well). Leave for later, not a Bangla issue.
- Mix is for people who read English words faster. It should not change sentence structure, only the word.

## 2. Screen by screen: worst offenders

Format: key | current | proposed | reason. The proposed text keeps meaning and the safety logic. Where the key is in `fields.ts` or content packs (not in `packs.ts`), the id shown is the field id.

### 2.1 First start and consent (seen first, by everyone)

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `mode.banner.start` / `mode.start.btn` | এখনই আসল তথ্য শুরু করুন | আসল ডেটা শুরু করুন | "আসল তথ্য" vs "আসল ডেটা" spelled both ways; "এখনই ... শুরু করুন" is long for a button |
| `mode.first.real` | আসল তথ্য দিয়ে শুরু করুন | আসল ডেটা দিয়ে শুরু করুন | same word everywhere |
| `mode.first.demo` | Demo ডেটা দিয়ে ঘুরে দেখুন | ডেমো ডেটা দেখে নিন | Latin "Demo" inside Bangla; "ঘুরে দেখুন" is OK but longer |
| `mode.first.intro` | কীভাবে শুরু করবেন বেছে নিন। পরে আরও > Demo ও আসল ডেটা থেকে বদলাতে পারবেন। | কীভাবে শুরু করবেন? পরে আরও > ডেমো ও আসল ডেটা থেকে বদলাতে পারবেন। | question form is natural; menu name in Bangla |
| `mode.del.btn` | Demo ডেটা ডিলিট করে নতুন করে শুরু করুন | ডেমো ডেটা ডিলিট করে নতুন শুরু | button is 8 words; "নতুন করে শুরু করুন" repeats. Alt: "ডেমো ডিলিট করে শুরু করুন" |
| `mode.ask.p` | আপনি কয়েক দিন ঘুরে দেখেছেন। সব Demo ডেটা ডিলিট করে আসল ডেটা দিয়ে নতুন করে শুরু করতে চান? | কয়েক দিন তো দেখলেন। এবার ডেমো ডেটা ডিলিট করে আসল ডেটা দিয়ে শুরু করবেন? | shorter, more spoken; same meaning |
| `mode.real.back` | পিছনে | ফিরে যান | "পিছনে" as a button is odd; `intake.back` already uses "ফিরে যান" |
| `mode.real.confirm.title` | আসল তথ্য শুরুর আগে | শুরুর আগে একটু পড়ুন | "শুরুর আগে" by itself with a genitive noun chain is stiff |
| `mode.real.confirm.btn` | হ্যাঁ, আসল তথ্য দিয়ে শুরু করুন | হ্যাঁ, আসল ডেটা শুরু করুন | length |
| `mode.real.confirm.p` | ...আরও > Demo ও আসল ডেটা-তে এক ট্যাপে ডিলিট করতে পারবেন। | ...আরও > ডেমো ও আসল ডেটা থেকে এক ট্যাপে ডিলিট করতে পারবেন। | "ডেটা-তে" hyphen suffix and Latin Demo |
| `mode.real.needTick` | আগে ঘরে টিক দিন। | আগে টিক দিন। | shorter ("ঘরে" is unclear) |
| `mode.switch.needConsent` | আগে নিচের বক্সে 'আমি বুঝেছি' টিক দিন, তারপর আসল তথ্যে যান। | আগে নিচে “আমি বুঝেছি” টিক দিন, তারপর আসল ডেটায় যান। | "বক্সে" is fine but "নিচে" is enough; quotes |
| `mode.switch.note` | একবারে শুধু এক ধরনের তথ্য দেখানো ও গোনা হয়। Demo আর আসল তথ্য কখনো যোগ হয় না। | একসঙ্গে শুধু এক ধরনের ডেটা দেখানো হয়। ডেমো আর আসল ডেটা কখনো মেশে না। | "যোগ হয় না" is arithmetic; "মেশে না" is what users mean; "গোনা" dropped |
| `entry.consent.saveBlocked` | কিছু সেভ হয়নি। আগে 'আরও > Demo ও আসল ডেটা'-তে 'আমি বুঝেছি' ঘরে টিক দিন। | কিছু সেভ হয়নি। আগে আরও > ডেমো ও আসল ডেটা-তে গিয়ে “আমি বুঝেছি” টিক দিন। | fix the nested quotes and hyphen; keep the cause and the fix |

### 2.2 Today (Home)

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `home.saved` | এই ডিভাইসে সেভ করা | এই ফোনে সেভ করা | ডিভাইস is a manual word |
| `home.cnt.unknown` | অজানা। এখনো কিছু লেখা হয়নি। | এখনো কিছু লেখা হয়নি। | "অজানা" alone sounds like an error; Unknown rule kept by the second sentence. If the first word must stay for "Unknown ≠ 0": "জানা নেই।" |
| `home.cnt.note` | শুধু আপনার নিজের লেখা তথ্য থেকে গোনা। লক্ষ্যের ধাপ মানে লক্ষ্যের সঙ্গে যুক্ত কাজ। | শুধু আপনার লেখা ডেটা থেকে গোনা। লক্ষ্যের ধাপ মানে লক্ষ্যের সঙ্গে জোড়া কাজ। | "যুক্ত" is official |
| `home.sum.open` | টাকা পাতা খুলুন | টাকার হিসাব খুলুন | "টাকা পাতা" is a literal "Money page"; people say "হিসাব" |
| `home.today.open` | প্ল্যান খুলুন | আজকের প্ল্যান দেখুন | ok, clearer |
| `next.title` | পরের সেরা কাজ | এখন কোন কাজটা করবেন | "সেরা" feels ranked; the guardrail says no rank words. This is a suggestion, not the "best" |
| `next.add_money.reason` | নেট ওয়ার্থ, ইনকাম ও খরচ যোগ না করা পর্যন্ত অজানা দেখায়। | নেট ওয়ার্থ, ইনকাম আর খরচ না লিখলে এগুলো “জানা নেই” দেখাবে। | "না করা পর্যন্ত" is clumsy |
| `advice.title` | আপনার তথ্য থেকে পরামর্শ | আপনার লেখা দেখে কিছু পরামর্শ | |
| `advice.draft` | অ্যাপের ভেতরের সাধারণ লেখা, এখনো যাচাই হয়নি। | অ্যাপের সাধারণ লেখা। এখনো যাচাই হয়নি। | keep "যাচাই হয়নি" |
| `advice.goal_no_task.reason` | এই লক্ষ্যে কোনো কাজ যুক্ত নেই, তাই প্রোগ্রেস অজানা। | এই লক্ষ্যে এখনো কোনো কাজ নেই, তাই প্রোগ্রেস জানা নেই। | |
| `advice.many_open_tasks.reason` | আপনার {n}টি খোলা কাজ আছে। কয়েকটি বাছলে দিনটি পরিষ্কার থাকে। | {n}টি কাজ বাকি। কয়েকটা বেছে নিলে দিনটা সহজ হবে। | "খোলা কাজ" = literal "open tasks"; say "বাকি কাজ" |
| `advice.money_unknown.title` | টাকার অঙ্কগুলো পূরণ করুন | টাকার অঙ্ক লিখে দিন | "পূরণ করুন" = form-filling |
| `advice.money_unknown.reason` | আপনার {n}টি টাকার তথ্যে এখনো অঙ্ক নেই, তাই মোট অজানা দেখাচ্ছে। | {n}টি এন্ট্রিতে এখনো টাকার অঙ্ক নেই, তাই মোট দেখানো যাচ্ছে না। | |
| `advice.risk_no_stop_rule.title` | প্রতিটি রিস্কের জন্য থামার নিয়ম লিখুন | প্রতিটি রিস্কে কখন থামবেন তা লিখুন | "থামার নিয়ম" is literal; the action is a stop point |
| `advice.note` | আপনার নিজের তথ্য দেখে সহজ নিয়ম এগুলো বেছেছে। এটি আর্থিক পরামর্শ নয়... | (keep the legal meaning; only soften the first sentence: “আপনার লেখা দেখে সহজ নিয়মে এগুলো বাছা হয়েছে।”) | see 3: disclaimer stays |
| `grid.title` | লম্বা দৃশ্য | দীর্ঘ সময়ের ছবি / অথবা সহজ: “আগের দিনগুলো” | "লম্বা দৃশ্য" is a word-for-word "Long view"; users will not understand it |
| `grid.empty` | লম্বা দৃশ্য দেখতে একটি হ্যাবিট যোগ করুন। | আগের দিনগুলো দেখতে একটি অভ্যাস যোগ করুন। | habit word, see 1.3 |
| `grid.cell.full` / `.some` / `.open` | ঠিক করা সব দিন চিহ্নিত / কিছু চিহ্নিত / চিহ্নিত নয় | সব দিন টিক করা / কিছু দিন টিক করা / টিক করা নেই | "চিহ্নিত" is formal; users "tick" |
| `grid.line` | {name}, {from} থেকে {to}: ঠিক করা {p} দিনের {d} দিন চিহ্নিত | {name}, {from} থেকে {to}: {p} দিনের মধ্যে {d} দিন টিক করা | the word order "ঠিক করা {p} দিনের {d} দিন" is hard to say aloud (screen readers too) |
| `grid.range.label` | সময়সীমা | কত দিনের | "সময়সীমা" is now claimed by ডেডলাইন in places; this is a range |
| `fresh.stale` | পুরোনো: 30 দিনের বেশি আগে সেভ করা। অনলাইনে এলে সোর্স আবার দেখুন। | পুরোনো: 30 দিনের বেশি আগে সেভ করা। অনলাইনে গেলে সোর্স আবার দেখে নিন। | "অনলাইনে এলে" is fine; "গেলে" matches phone speech |
| `reward.m0` | একটা ছোট কাজ, একটা নতুন তারা। | (keep) | warm and natural, a model for the rest |
| `tri.title` | দায়িত্ব যাচাই | এটা কি আমার কাজ? | "যাচাই" is also the "unreviewed" tag; do not reuse it for a question tool |
| `tri.out.delegate` | অন্যকে দিন | অন্য কাউকে দিয়ে করান | |
| `stage.conditions` | এই স্টেজ পার হতে | এই স্টেজ শেষ করতে যা লাগবে | incomplete phrase |
| `stage.leftNote` | চিন্তার কিছু নেই। এগুলো শুধু পরের কাজ। | (keep) | good tone |
| `legs.state.steady` | স্থির | ঠিকঠাক | "স্থির" sounds like frozen/fixed |
| `legs.leg.finance` | ফাইন্যান্স | টাকাপয়সা | the app's own tab says টাকা; ফাইন্যান্স is a jargon bump here |

### 2.3 Journey (goals, stages, horizon, decision tools)

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `arc.title` | ডেডলাইনের আর্ক | কত দূরের লক্ষ্য | wrong meaning (see 1.2), "আর্ক" meaningless |
| `arc.marker` | লক্ষ্য আছে এমন সবচেয়ে কাছের ডেডলাইন: {h} | যেখানে লক্ষ্য আছে তার মধ্যে সবচেয়ে কাছেরটা: {h} | |
| `arc.none` | এখনো কোনো লক্ষ্য ডেডলাইনে বসেনি। | এখনো কোনো লক্ষ্যের সময় ঠিক করা হয়নি। | |
| `horizon.view.compact` | ছোট করে | সংক্ষেপে দেখুন | |
| `dec.title` | সিদ্ধান্ত সহায়ক | সিদ্ধান্ত নিতে সাহায্য | "সহায়ক" is a form word |
| `dec.out.lean_go` | করার দিকে ঝুঁকুন। | করে ফেলাই ভালো মনে হচ্ছে। | "ঝুঁকুন" also means "risk"; confusing next to রিস্ক |
| `dec.out.sleep_on_it` | একটু সময় নিয়ে ভাবুন, তারপর আবার উত্তর দিন। | একটু ভেবে নিন, তারপর আবার উত্তর দিন। | |
| `dec.q.learn` | সিদ্ধান্তের আগে কম খরচে আরও জানা যাবে কি? | সিদ্ধান্তের আগে কম খরচে আরও কিছু জানা যায় কি? | |
| `fit.test` | প্রথম ছোট পরীক্ষা: {text} | প্রথম ছোট টেস্ট: {text} | owner's complaint |
| `fit.unmapped` | এখনো মেলাতে পারিনি: {list} | এখনো মেলেনি: {list} | |
| `funnel.title` | লক্ষ্যের ফানেল | লক্ষ্য থেকে প্ল্যান | ফানেল means little to this user. If the funnel diagram is kept as is, call it "ফানেল (ধাপে ধাপে)" once |
| `goal.ms.75` | যুক্ত কাজের তিন-চতুর্থাংশ শেষ। | লিংক করা কাজের 75% শেষ। | "তিন-চতুর্থাংশ" fractions are not said on phones; digits are fine |
| `goals.progressUnknownManual` | {title}: প্রোগ্রেস অজানা, এখনো পার্সেন্ট দেননি | {title}: প্রোগ্রেস জানা নেই, এখনো পার্সেন্ট লেখেননি | |
| `goal.status.note` | বিরতি বা বন্ধ করা লক্ষ্য কোনো রিমাইন্ডার দেয় না। | পজ বা বন্ধ করা লক্ষ্যে কোনো রিমাইন্ডার আসে না। | "বিরতি" was swapped to ব্রেক for work rests; for a goal status the English is Pause, so use "পজ" (also what the player icon says) |
| `hist.not_true` | আর সত্য নয় | এটা আর ঠিক নয় | |
| `leak.title`, `leak.link` | লিক অডিট | খরচ ও সময় কোথায় যাচ্ছে | no one says "অডিট" for personal use; the screen is about leaks. Alt “লিক খোঁজা” |
| `leak.att.silence` | চুপ করান | বন্ধ করুন | "চুপ করান" feels rude/slang and is not polite |
| `leak.att.bound` | সীমা দিন | সীমা ঠিক করুন | |
| `leak.att.clarify.tip` | অস্পষ্ট কাজকে একটি পরিষ্কার পরের পদক্ষেপে লিখুন। | অস্পষ্ট কাজকে একটা পরিষ্কার পরের ধাপে লিখুন। | "পদক্ষেপ" official |
| `legs.why.habits.quiet` | 7 দিনে চেক-ইন নেই। সবচেয়ে ছোট রূপে আবার শুরু করুন। | 7 দিন চেক-ইন হয়নি। সবচেয়ে ছোট করে আবার শুরু করুন। | "রূপে" |
| `legs.why.weekly.little` | গত 7 দিনে রেকর্ড কম। | গত 7 দিনে কম লেখা হয়েছে। | |
| `log.entry` | স্টেজ {code} পার · ডায়েরি {before}% → {after}% | (keep) | compact, fine |
| `overall.how.size` / `overall.weight` | বড় কাজের ওজন বেশি / কাজের ওজন কীভাবে ধরবেন | বড় কাজ বেশি ধরা হবে / কাজ কীভাবে গোনা হবে | "ওজন" (weight) is literal |
| `reality.note` | রেকর্ডে থাকল। আর প্ল্যানে আসবে না। | (keep) | short and clear |
| `review.notEnough` | এখনো ডেটা কম | (keep) | good |
| `smart.a` | অ্যাচিভেবল: কেন এটা সাধ্যের মধ্যে? | সাধ্যের মধ্যে: কেন এটা সম্ভব? | The 5 SMART headers in English-in-Bangla-script (স্পেসিফিক, মেজারেবল, অ্যাচিভেবল, রিলেভেন্ট, টাইম-বাউন্ড) are the least spoken words in the app. People do not say "অ্যাচিভেবল". Use plain ones: নির্দিষ্ট? → “কী চাই”, “কত”, “সম্ভব?”, “কেন জরুরি”, “কবের মধ্যে”. Keep the SMART letters (S M A R T) as small tags in Latin. Priority: medium |
| `smart.t` | ডেডলাইন: কবের মধ্যে? | ডেডলাইন: কবের মধ্যে? (keep) | good |
| `swot.empty` | এখনো পূরণ হয়নি | এখনো লেখা হয়নি | |

### 2.4 Money, risk, team

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `money.empty` | এখনো কোনো আইটেম নেই। | এখনো কিছু যোগ করা হয়নি। | আইটেম OK in speech, but the second is warmer |
| `money.amount` | পরিমাণ (টাকা) | কত টাকা | "পরিমাণ" is the word on a government form |
| `money.period` | কত দিন পর পর | কতদিন পর পর | good; fix the spacing "কত দিন" → keep as is or "কতদিন" but pick ONE |
| `money.runway` | রানওয়ে | রানওয়ে (কত মাস চলবে) | add one line of meaning; the word alone is aviation |
| `money.none` | এখনো কিছু লেখা হয়নি | (keep) | |
| `risk.title`, `risk.link` | রিস্ক ও থামার শর্ত | রিস্ক ও কখন থামবেন | "শর্ত" is contract wording; users stop at a point |
| `risk.noStop` | থামার শর্ত এখনো লেখা হয়নি | কখন থামবেন তা এখনো লেখা হয়নি | |
| `risk.dateLabel` | রিভিউয়ের তারিখ (অপশনাল) | কবে আবার দেখবেন (অপশনাল) | |
| `risk.err.text_required` | রিস্কটি এক লাইনে লিখুন। | একটা লাইনে রিস্কটা লিখুন। | |
| `team.intro` | নাম নয়, রোল লিখুন। | (keep) | privacy rule, short; fine |
| `team.err.contact` | নাম, ইমেইল বা ফোন নম্বর লিখবেন না। শুধু রোল লিখুন। | (keep) | privacy guard, keep as is |
| `ven.add` | উদ্যোগ বা সম্পদ যোগ করুন | ব্যবসা বা সম্পদ যোগ করুন | "উদ্যোগ" is a government/NGO word for venture; the user says "ব্যবসা"; the page says business already |
| `ven.err.ownership` | মালিকানা 0 থেকে 100-এর মধ্যে সংখ্যা হতে হবে, বা ফাঁকা। | মালিকানা 0 থেকে 100-এর মধ্যে লিখুন, অথবা ফাঁকা রাখুন। | "হতে হবে" is a rule voice |
| `ven.ownership` | আপনার মালিকানা (%), না জানলে ফাঁকা | আপনার অংশ (%), না জানলে ফাঁকা | "অংশ" is how an owner says it |

### 2.5 Diary and intake (forms; the most government-form-like)

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `diary.completeness` | তথ্যের পূর্ণতা | কতটা লেখা হয়েছে | "পূর্ণতা" is textbook |
| `diary.modules` | ডায়েরির অংশ | (keep) | |
| `diary.next.required_missing` | আগে লিখুন: {field}। কারণ: {why} | আগে লিখুন: {field}। কেন দরকার: {why} | "কারণ" can feel like blame; "কেন দরকার" explains |
| `assess.title` | আপনার যা আছে | (keep) | warm and clear |
| `assess.noRating` | এখনো উত্তর দেওয়া হয়নি | এখনো উত্তর দেননি | passive "হয়নি" without agent reads cold |
| `dict.title` | ডেটা অভিধান | ডেটার তালিকা (ফিল্ড) / “কোন ঘরে কী আছে” | "ডেটা অভিধান" is a developer word. Settings-level screen, low priority |
| `dict.col.field_id` | ফিল্ড আইডি | ঘরের আইডি | the app already says "ঘর" for field (e.g. `fields.count`); do not switch between ফিল্ড and ঘর. Pick ঘর |
| `dict.col.label` | ফ্যাক্ট, আন্দাজ ইত্যাদি | ধরন: ফ্যাক্ট, আন্দাজ ইত্যাদি | |
| `dict.col.state` | ভ্যালু বা অজানা অবস্থা | মান বা “জানা নেই” | "ভ্যালু" appears as value; pick "মান" |
| `dict.type.multichoice` | একাধিক পছন্দ | একাধিক বাছাই | |
| `empty.stageNote` | পার হওয়ার নিয়ম পরে যোগ হবে। | এই স্টেজ শেষ করার শর্ত পরে যোগ হবে। | |
| `intake.next` | সেভ করে এগোন | সেভ করে পরেরটা | "এগোন" is dialect-literary; "এগিয়ে যান" if a verb is needed |
| `intake.done` | আপাতত ডায়েরি শেষ | আপাতত এইটুকুই | |
| `intake.skipHint` | যা খালি রাখবেন তা খালিই থাকবে। শূন্য ধরা হবে না। | যা খালি রাখবেন, সেটা “জানা নেই” থাকবে। 0 ধরা হবে না। | keep Unknown ≠ 0; "শূন্য" may be confused with 0 in Bangla digits. Use 0 |
| `requirement.optional` | ইচ্ছা হলে | (keep) | |
| `unknown.not_applicable` | লাগে না | এটা আমার জন্য নয় | what the user means; "লাগে না" could be "not needed" |
| `ns.baseline` | শুরুর সংখ্যা (না জানলে ফাঁকা) | (keep) | |
| `ns.metric`, `ns.unit`, `ns.steps` | মাপকাঠি, একক, ধাপগুলো | কী মাপবেন, এককের নাম, ধাপগুলো | "মাপকাঠি" and "একক" textbook |
| `ns.note` | মাপকাঠি আপনার নিজের বাছাই। অ্যাপ নিজে একটি বেছে দেয় না। | কী মাপবেন সেটা আপনিই ঠিক করেন। অ্যাপ বেছে দেয় না। | |
| `label.FACT` | তথ্য | ফ্যাক্ট | consistent with `dict.col.label` which says ফ্যাক্ট |
| `privacy.third_party` | অন্য মানুষের তথ্য | অন্য কারও ডেটা | |
| `help.importance` | গুরুত্ব | কতটা দরকারি | "গুরুত্ব" ok but with `importance.core` “জরুরি” the scale is unclear. Keep one scale: জরুরি / দরকারি / চাইলে |
| `help.access` | কে দেখতে পারবে | (keep) | good |
| `fields.catalog` fields in `src/catalog/fields.ts` | "আপনাকে কী নামে ডাকব" (label) / "অ্যাপে যে নামে আপনাকে সম্বোধন করা হবে।" (what) | label keep. what: “অ্যাপ এই নামে আপনাকে ডাকবে।” | `সম্বোধন` formal; `১–৩০ অক্ষর` uses Bangla digits, but digits are decided Latin: **fix to "1–30 অক্ষর"** (the catalog has Bangla digits in `format`; this breaks the digit rule) |
| `fields profile.language` | বাংলা / ইংরেজি | (keep) | |

### 2.6 Deen

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `deen.set.azan` | ওয়াক্তের সময় আজানের অ্যালার্ট | ওয়াক্ত হলে আজানের অ্যালার্ট | |
| `deen.set.dhaka` | ঢাকায় ফিরুন | ঢাকা দিন / ঢাকায় রিসেট | "ফিরুন" is a navigation verb |
| `deen.set.lock` | ...বিবরণ দেখাতে চাইলে More-... | ...বিবরণ দেখাতে চাইলে আরও-... | stray English "More" in Bangla |
| `deen.set.permNo` | এই ফোনে নোটিফিকেশন পাওয়া যায় না, তাই অ্যাপের ভেতরে কার্ড দেখাব | (keep) | |
| `deen.set.soundNote` | অ্যাপ খোলা থাকলেই বাজবে। ডিফল্টে বন্ধ। | অ্যাপ খোলা থাকলে তবেই বাজবে। এটা ডিফল্টে বন্ধ। | |
| `deen.set.place` | জায়গা (ল্যাটিচিউড, লংগিচিউড) | জায়গা (ল্যাটিচিউড, লংগিচিউড) | keep: people copy these from Google Maps; the spellings are consistent |
| `deen.method.egypt` | মিসরীয় জেনারেল অথরিটি | মিসরীয় জেনারেল অথরিটি | unavoidable proper name; keep |
| `deen.prayer.marked` | ✓ পড়া হয়েছে | (keep) | |
| `deen.prayer.none` | এই জায়গায় এই ওয়াক্তের সময় পাওয়া যায়নি | এই জায়গার জন্য এই ওয়াক্তের সময় পাওয়া যায়নি | |
| `halal.title` | হালাল-চেক প্রশ্ন | হালাল-চেক প্রশ্ন | keep |
| `halal.group.scholar` | আপনার নিজের আলেম | আপনার পরিচিত আলেম | |
| `halal.banner` | এটি ফতোয়া নয়। যোগ্য ব্যক্তিকে জিজ্ঞেস করুন। | (keep) | safety; see 3 |
| `deen.title` | দ্বীন ও আখিরাত | (keep) | |
| `purpose.deen_tracking` | আমার দ্বীনের নোট | (keep) | |

### 2.7 More: data, backup, lock, connections, settings

| Key | Current | Proposed | Reason |
|---|---|---|---|
| `lazy.failed` | পাতাটি লোড হয়নি। ফোনের স্টোরেজ দেখে অ্যাপ আবার খুলুন। | এই পেজ খোলেনি। ফোনের স্টোরেজ দেখে অ্যাপ আবার খুলুন। | "পাতা"/"পাতাটি" is textbook for page; people say "পেজ". Change all "পাতা" (screen) to "পেজ" |
| `data.demo.count` | এই ফোনে {n}টি রেকর্ড সেভ আছে | (keep) | |
| `data.real.locked` | বন্ধ — নিচের ঘরে টিক দিয়ে আসল ডেটা চালু করুন। | বন্ধ আছে। নিচে টিক দিলে আসল ডেটা চালু হবে। | em dash and imperative chain |
| `data.clearReal` | সব আসল ডেটা ডিলিট করুন | (keep) | clear |
| `data.clearReal.note` | ডিলিটের পর আসল ডেটা আবার বন্ধ হবে। চালু করতে আবার টিক দিতে হবে... | (keep first sentence) | safety, destructive; see 3 |
| `backup.note` | ফেরালে আপনার Demo লেখা বদলে যাবে। আসল ডেটা বন্ধ আছে। | ব্যাকআপ ফেরালে আপনার ডেমো ডেটা বদলে যাবে। আসল ডেটা এখন বন্ধ আছে। | "ফেরালে" is ambiguous (returning vs restoring); "রিস্টোর" is what people say: “রিস্টোর করলে” |
| `enc.restore` | এনক্রিপ্টেড ব্যাকআপ থেকে ফেরান | এনক্রিপ্টেড ব্যাকআপ থেকে রিস্টোর করুন | "ফেরান" is the key confusion in the Data screen: ফেরানো (undo) vs ফেরা (back) vs ফেরত। Use **রিস্টোর** for backups, "আগের অবস্থায় যান" for undo |
| `enc.confirm` | বদলে ফেরান | রিস্টোর করুন | same |
| `snap.done` | ফিরিয়ে আনা হয়েছে: {d}টি Demo ও {r}টি আসল তথ্য। | রিস্টোর হয়েছে: {d}টি ডেমো ও {r}টি আসল ডেটা। | |
| `snap.none` | এখনো কোনো স্ন্যাপশট নেই। | এখনো কোনো ব্যাকআপ কপি নেই। | "স্ন্যাপশট" is jargon; the app calls it a quick copy. Pick "অটো ব্যাকআপ কপি" if that is what it is |
| `snap.unavailable` | স্ন্যাপশটের জন্য ব্রাউজারের সেভ দরকার, যা এখানে নেই। | এই ব্রাউজারে অটো কপি সেভ করা যায় না। | clearer |
| `snap.remind` | প্রতি সপ্তাহে ব্যাকআপ ফাইল সেভের কথা মনে করান (আসল ডেটা থাকলে) | প্রতি সপ্তাহে ব্যাকআপ ফাইল সেভ করার রিমাইন্ডার দিন (আসল ডেটা থাকলে) | |
| `store.ask` | ব্রাউজারকে আমার ডেটা রাখতে বলুন | ব্রাউজারকে আমার ডেটা ডিলিট না করতে বলুন | **check the English meaning**: the ask is "keep my data safe from auto-clean"; "রাখতে বলুন" is vague |
| `store.persist.unknown` | অজানা: এই ব্রাউজার বলতে পারছে না ডেটা রাখবে কি না। নিরাপদ থাক... | জানা নেই: এই ব্রাউজার নিশ্চিত করে বলছে না যে ডেটা থাকবে। নিরাপদ থাকতে ব্যাকআপ রাখুন। | |
| `store.usage.of` | ব্যবহৃত জায়গা: প্রায় {u}, অ্যাপের জন্য মোট পাওয়া যায় {q}। | ব্যবহার হয়েছে প্রায় {u}, অ্যাপ মোট পেতে পারে {q}। | |
| `imp.done` | {n}টি রেকর্ড ইমপোর্ট হয়েছে। | (keep) | |
| `imp.err.entity` | অজানা রেকর্ডের ধরন। | চেনা যায়নি এমন রেকর্ডের ধরন। | |
| `imp.err.mixed_ns` | ফাইলে ডেমো আর আসল সারি মেশানো। | ফাইলে ডেমো আর আসল দুই ধরনের লাইন আছে। | |
| `imp.err.state` | ভ্যালুর অবস্থা ঠিক নয়। | একটা ঘরের মান ঠিক নেই। | |
| `imp.errors` | ফাইলটি ইমপোর্ট হয়নি। {n}টি সমস্যা পাওয়া গেছে। কিছু বদলায়নি। | (keep) | clear, good |
| `imp.locked` | নিজের ডেটায় ইমপোর্ট করতে আগে আসল ডেটার টিক চালু করুন। | আসল ডেটায় ইমপোর্ট করতে আগে আসল ডেটার টিক দিন। | |
| `imp.ready` | {ns}-এর জন্য {n}টি নতুন রেকর্ড তৈরি। {s}টি আগে থেকেই আছে, তাই বাদ। | {ns}-এর জন্য {n}টি নতুন রেকর্ড তৈরি। {s}টি আগেই আছে, তাই বাদ। | |
| `lock.err.mismatch` | দুটি PIN এক নয়। | দুটি PIN মিলছে না। | |
| `lock.forgot.back` | PIN-এ ফিরুন | PIN দিতে ফিরে যান | |
| `lock.note` | অ্যাপ ছেড়ে গেলে PIN স্ক্রিন অ্যাপ ঢেকে দেয়। এটি প্রাইভেসি স্... | (keep structure) | |
| `lock.auto.1` | 1 মিনিট দূরে থাকলে | 1 মিনিট অ্যাপ ছাড়া থাকলে | |
| `conn.confirm.btn` | অনুমোদন নিশ্চিত করুন | অনুমতি দিন | two formal words for a button; but see 3 (consent) |
| `conn.status.needs_approval` | অনুমোদন লাগবে | আপনার অনুমতি লাগবে | |
| `conn.key.empty` | আগে একটি কী পেস্ট করুন। | আগে একটি কী (key) পেস্ট করুন। | "কী" alone looks like the question word; add (key) |
| `conn.licensedContent.name` | লাইসেন্সপ্রাপ্ত কনটেন্ট | লাইসেন্স করা কনটেন্ট | |
| `conn.aiAssistant.name` | এআই অ্যাসিস্ট্যান্ট | AI অ্যাসিস্ট্যান্ট | people see "AI" in Latin on phones |
| `conn.cloudSync.does` | একটি তালাবদ্ধ (এনক্রিপ্টেড) ব্যাকআপ কপি অনলাইনে রাখে... | একটি এনক্রিপ্টেড ব্যাকআপ কপি অনলাইনে রাখে... | one word, not two |
| `cap.partial` | আংশিক | কিছুটা কাজ করে | |
| `cap.internet-needed` | ইন্টারনেট লাগে | (keep) | |
| `csv.title` | স্প্রেডশিট কপি (CSV) | (keep) | |
| `design.bs.desc` | সম্পাদকীয় ধাঁচ: সেরিফ লেখা, সরু রেখা, বাক্স ছাড়া। | ম্যাগাজিনের মতো: সেরিফ ফন্ট, সরু রেখা, বাক্স ছাড়া। | "সম্পাদকীয় ধাঁচ" is textbook |
| `design.ip.desc` | শান্ত, সমতল ও স্পষ্ট: কাগজ ও কালি। | শান্ত, সাদামাটা ও পরিষ্কার: কাগজ আর কালি। | |
| `more.theme.dark` | অন্ধকার | ডার্ক | people say "ডার্ক মোড"; "অন্ধকার" is scary for a theme |
| `more.library.desc` | রুটিন, টাকার হিসাব, পড়া আর আরও। এক ট্যাপে লক্ষ্য, কাজ ও অভ্যা... | (keep) | natural, good |
| `more.status.desc` | কোনটা কাজ করে, কোনটা Demo, কোনটা এখনো তৈরি হয়নি | কোনটা কাজ করে, কোনটা ডেমো, কোনটা এখনো তৈরি হয়নি | Latin Demo |
| `more.rules.desc` | ফোনেই ছোট পরামর্শ। শান্ত নিয়মগুলো চালু; যেকোনোটি বন্ধ করা... | (keep) | |
| `safety.demo` | এই ভার্সনে শুধু নকল Demo ডেটা। কোনো AI, ইন্টারনেট কানেকশন বা টাকা... | এই ভার্সনে শুধু নকল ডেমো ডেটা। ... | "নকল" can sound like fraud; "নমুনা/স্যাম্পল" was chosen before: use স্যাম্পল ডেমো ডেটা. Keep the AI/internet/money safety statements |
| `disclaimer.noFatwa` | এই টুল ধর্মীয় সিদ্ধান্ত দেয় না। যোগ্য আলেমকে জিজ্ঞাসা করু... | এই অ্যাপ ধর্মীয় সিদ্ধান্ত দেয় না। যোগ্য আলেমকে জিজ্ঞেস করুন। | "টুল" → "অ্যাপ"; "জিজ্ঞাসা/জিজ্ঞেস" pick জিজ্ঞেস (two forms exist today: `halal.banner` জিজ্ঞেস, here জিজ্ঞাসা) |
| `nav.aria` | প্রধান মেনু | (keep) | |
| `fresh.*` | | | keep |

### 2.8 Topics, library, content packs (public/content/*.json, src/library)

Sample reading of `pack-001.json`: titles like "খরচ তিন ভাগে ভাগ করুন" and "প্রয়োজন (থাকা, খাওয়া, যাতায়াত), চাওয়া (পছন্দের জিনিস), আর বাকি খরচ" are good: short, spoken, real examples. Use these as the model voice for the rest of the app. Check the other packs for:
- "পরিপ্রেক্ষিত", "বিবেচনা করুন", "নিশ্চিত করুন", "সম্পাদন" and any ক্রিয়া that ends in "-পূর্বক" (replace with plain verbs).
- Library/system templates: system names and step lines come from JSON; follow the same table in 1.1 and replace "হ্যাবিট" with "অভ্যাস".
- Glossary: keep the English term first, one plain sentence after ("ক্যাশ ফ্লো: হাতে কত টাকা আসছে আর যাচ্ছে").

### 2.9 Words that repeat across many screens (bulk-fixable)

| Pattern | Fix | Where |
|---|---|---|
| "আসল তথ্য" | আসল ডেটা | onboarding, mode.*, consent |
| Latin "Demo" inside Bangla | ডেমো | ~40 keys (MIX_TERMS already lists ডেমো→Demo, so Mix still shows Demo) |
| "ডিভাইস" | ফোন (or "এই ফোনে") | home.saved, others |
| "পাতা" | পেজ | lazy.failed, home.sum.open (TK page), snap.reminder.open "ডেটা পাতা খুলুন" |
| "অজানা" at the start of a line | "জানা নেই" (keep the word in labels that are Unknown chips) | many `*.unknown` |
| "যুক্ত" | লিংক করা / জোড়া / যোগ করা | goal/task link lines |
| "পূরণ করুন / পূরণ হয়েছে" | লিখুন / লেখা হয়েছে (but keep "পূরণ" for SMART blocks if short) | advice, swot, smart |
| "ফেরান / ফিরিয়ে আনা" for backups | রিস্টোর | Data/backup |
| "সম্পাদন / প্রদান / অবগত / প্রযোজ্য / সংশ্লিষ্ট / আবশ্যক" | plain verb | scan with banned-term test |
| "আর্থিক" | টাকার / ফাইন্যান্সিয়াল only in "আর্থিক পরামর্শ নয়" (disclaimer keep) | advice.note, next.note |
| "বিরতি" for pause | পজ | goal status |
| "হ্যাবিট" | অভ্যাস | grid, library |
| "ফিল্ড" vs "ঘর" | ঘর | dict, fields |
| "ভ্যালু" vs "মান" | মান | dict, imp.err |

## 3. Must NOT be simplified (keep exact meaning; edit only spelling)

1. **D-B consent texts** (`mode.real.confirm.*`, `data.consent.*`, `data.clearReal.note`, `entry.consent.saveBlocked`, `imp.locked`). Keep: (a) "শুধু এই ফোনে থাকবে", (b) "কোথাও পাঠানো হবে না", (c) "এক ট্যাপে ডিলিট করা যায়" and (d) the tick-first rule. Only spelling and menu-name fixes are allowed in 2.1. Reason: the owner approved D-B on this wording; changing it changes what he consented to. Add the changed key to the reviewer sheet so he can see it.
2. **Delete/irreversible warnings** (`mode.del.p`, `mode.del.title`, `data.clearReal`): "ফেরানো যায় না" (cannot be undone) must stay, and the object ("সব ডেমো ডেটা") must stay explicit. Do not shorten "সব" away.
3. **Not a fatwa / Deen disclaimers** (`halal.banner`, `disclaimer.noFatwa`, `fit.draft`-style "খসড়া" lines, `halal.*`): keep "ফতোয়া নয়" and "যোগ্য আলেম/ব্যক্তি". Change only "টুল" to "অ্যাপ" and unify "জিজ্ঞেস".
4. **Deen terms and words**: নামাজ, ফজর, যোহর, আসর, মাগরিব, এশা, রোজা, আজান, ওয়াক্ত, যাকাত, সদকা, ফিতরা, কুরবানি, হজ, উমরাহ, হালাল, সুদ (রিবা), আখিরাত, ইবাদত, দ্বীন, আলেম, ফতোয়া. Do not replace with English (no "প্রেয়ার", "ফাস্টিং"). Also keep "মিসরীয় জেনারেল অথরিটি", "মুসলিম ওয়ার্ল্ড লীগ" calculation method names.
5. **"যাচাই হয়নি"** (unreviewed tag, `glossary.tag`, `advice.draft`, content-pack `reviewStatus`). Keep exact word everywhere for the draft Bangla, and do not reuse "যাচাই" for other functions (`tri.title` fixes this).
6. **No-guarantee / no-advice lines**: "এটি আর্থিক পরামর্শ নয়", "কোনো গ্যারান্টি নেই", "ইনকাম বা লাভের কোনো নিশ্চয়তা নেই" (`advice.note`, `next.note`, `fit.draft`). The legal meaning is the same, but the wording is already short; do not soften into "এটা ঠিক পরামর্শ না" or drop "গ্যারান্টি". Keep গ্যারান্টি.
7. **Unknown ≠ 0 lines** (`intake.skipHint`, `home.cnt.unknown`, `*.unknown`, `unknown.unknown` “জানি না”): the user must see "জানা নেই"/"অজানা" and not an empty or 0. Simplify the style only; never replace by "০"/"কিছু নেই". Use Latin "0" if needed.
8. **No-punishment copy** (`stage.leftNote` “চিন্তার কিছু নেই”, `reality.note`, `reward.*`, `goal.status.note`): already warm; do not add red/blame words like "ব্যর্থ", "পিছিয়ে", "ঘাটতি", "দোষ". Do not add rank/score words (so avoid "সেরা", see `next.title`).
9. **Privacy-guard lines**: `team.err.contact` (no names/emails/phones), password/PIN/OTP warnings, `lock.*` (PIN stays on this phone, not in backup), `privacy.*`. Keep the exact negative commands.
10. **Digits and units**: Latin digits stay (decided). Do not "fix" 0/1 into ০/১. Also correct the Bangla digits found in `src/catalog/fields.ts` `format` strings (e.g. "১–৩০ অক্ষর") to Latin; this is a digit-rule fix, not a style change.
11. **Permission/approval words on connection and spend screens** (`conn.*`, D-C): keep "অনুমোদন"/"অনুমতি" **in the text that describes a permission that the owner grants** and keep the statement "কোনো টাকা খরচ হয় না"/"খরচ হবে" if present. The button can be shortened to "অনুমতি দিন" but the explanatory line must still say what is shared.
12. **Terms where the English word is the thing the user sees on the phone**: PIN, CSV, AI, OTP, URL, YYYY-MM-DD. Keep Latin.
13. **Everyday Bangla words people really say**: দিন, টাকা, খরচ, হিসাব, কাজ, সপ্তাহ, মাস, সময়, ফোন, ব্যবসা, লাভ, বেতন, কিস্তি, পরিবার, স্বাস্থ্য, ঘুম, বিশ্রাম, লক্ষ্য. Do not swap to English (the earlier rule already says so).
14. **Proper names**: ট্রিলিয়নেয়ার মি (app name), উইকিপিডিয়া, ঢাকা, method names.

## 4. How to apply safely

1. **Key-level patch file.** Create `docs/design/bangla-plain-patch.json` (or `src/i18n/bn-patch.ts`) as `{ "key": "new text" }` for `bn` only. A script applies it to `packs.ts` (Bangla pack) and refuses any key that is not in `en` (parity). Never regex-replace the whole file again; the 1 Nov script made the horizon error because it swapped by word, not by meaning. Do it by key and by meaning.
2. **Non-pack sources.** Fields (`src/catalog/fields.ts`), glossary, library, `public/content/*.json`, demo seed get their own patch maps keyed by field id / tip id, same script, same checks.
3. **Mix.** Before applying, add every new loanword to `MIX_TERMS` (see 1.6) and add a test that Mix of the changed keys contains no Bangla copy of an English loanword already in the list (e.g. no "লাইভ", "টেস্ট" left in Mix). Check suffix cases (ের, ে, তে, কে).
4. **Tests.**
   - *Banned-term test*: a list of forbidden Bangla words (সম্প্রচার, নিরীক্ষা, সংরক্ষণ, সংরক্ষিত, প্রদান, সম্পাদন, অনুগ্রহ, প্রযোজ্য, সংশ্লিষ্ট, আবশ্যক, হালনাগাদ, ব্যবহারকারী, ডিভাইস, পাতা, "আসল তথ্য", Latin "Demo" inside a Bangla string, Bangla digits ০-৯) scanned over `bn` pack, fields, glossary, content packs. Allowlist: Deen words and the disclaimers above.
   - *Spelling-consistency test*: for each row in 1.1, fail if a "do not use" form appears.
   - *Parity test*: every key in `en` exists in `bn` and `mix`; every `{placeholder}` in `en` appears identically in `bn`; no key lost.
   - *Protected-string test*: keep a small snapshot of the section-3 strings so a patch cannot change their meaning without the test showing it (compare normalized text with a stored hash or the old text, and list the diff).
   - *Snapshot of changed keys*: a JSON snapshot `{key: {before, after}}` committed with the patch; the test fails if any other key changed.
   - *Length test*: buttons/labels (a key list marked as buttons) must be at most about 20 characters, warn above 28.
   - *Mix regex test*: run `swapMixTerms` on all changed strings and assert no Bangla loanword from `MIX_TERMS` remains.
5. **Owner-visible "what changed" list.** Generate `docs/owner/BANGLA_WHAT_CHANGED.md` with columns: key, screen, old, new, short reason (3 words). Group by screen, same order as the review sheet. Owner reads it in 2 minutes. Mark the "protected" keys separately ("এই লেখা অর্থ বদলায়নি, শুধু বানান ঠিক করা হয়েছে").
6. **Review sheet.** Regenerate `docs/owner/BANGLA_REVIEW_SHEET.md` (`node tools/bangla_review_sheet.mjs`) after the patch. Add a "changed since last version" column so the reviewer can start from the changed lines. Also extend the sheet to fields, glossary, library, content packs (the sheet says they are not in it yet; the worst government-form text is likely there).
7. **Register / log.** Add an entry in `DECISIONS_LOG.md` (what, why, alternatives, undo = revert the patch file). Do not change TM-TST-161 status; the draft is still unreviewed.
8. **Rollout in 3 small commits**: (a) spelling and menu-name fixes (low risk, mechanical); (b) wrong-meaning fixes (horizon, test, leak audit, habit); (c) sentence rewrites by screen. Run lint/tests/build and take screenshots of Today, Money, Deen, More at 360 px in Bangla, to check that shorter text fits and that no line grows (Bangla conjuncts are wide).
9. **A/B for the owner.** Because he complained about stiffness, send him 10 before/after pairs from the top of section 5 as a phone-readable list and apply the rest only if he says yes.

## 5. Priority order (what the user meets first)

1. **First start and consent** (2.1): `mode.*`, `entry.consent.*`. Everyone sees it once; fix "আসল তথ্য", Latin Demo, "পিছনে", long buttons. Keep consent meaning.
2. **Today / Home** (2.2): `home.*`, `advice.*`, `next.*`, `grid.*`, `tri.*`, `reward.*`. Seen every day.
3. **Navigation and labels**: `nav.*`, `lazy.*`, "পাতা"→"পেজ", "ডিভাইস"→"ফোন". Tiny, high-frequency.
4. **Plan, tasks, habits, focus** (the sheet's 200 strings): scan for "যুক্ত/পূরণ/খোলা কাজ", "হ্যাবিট"→"অভ্যাস", "বিরতি" for pause. Not sampled deeply here; run the banned-term test first.
5. **Money, risk, team, ventures** (2.4): `money.*`, `risk.*`, `ven.*`.
6. **Journey** (2.3): fix horizon (`arc.*`), `fit.test` (owner's complaint), `dec.*`, `leak.*`, `funnel.*`, SMART headers.
7. **Diary and intake** (2.5): form language, the most "government form" part. Do after Today, because users go there after onboarding.
8. **Deen** (2.6): mostly good; fix stray English "More", "টুল", জিজ্ঞাসা/জিজ্ঞেস. Do not simplify Deen terms.
9. **More: data, backup, lock, connections** (2.7): fix "ফেরান" → রিস্টোর, snapshot, store lines, dictionary words. Less often seen but the confusing "ফেরান" is dangerous in Data (restore vs undo vs go back).
10. **Fields, glossary, topics, content packs** (2.5, 2.8): by pack, with the same banned-term test; fix the Bangla digits in field `format` strings.
11. **Mix mode** sync last: add new loanwords to `MIX_TERMS` and regenerate Mix; this is automatic once Bangla is final.

Summary of the few decisions to take (owner or lead, one line each): (1) অভ্যাস not হ্যাবিট; (2) "ডেমো" in Bangla script everywhere; (3) "আসল ডেটা" not "আসল তথ্য"; (4) horizon → "কত দূরের লক্ষ্য", not ডেডলাইন; (5) "ফেরান" → রিস্টোর for backups; (6) SMART headers in plain Bangla with S M A R T tags.

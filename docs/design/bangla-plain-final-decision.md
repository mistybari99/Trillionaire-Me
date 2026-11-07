# Bangla plain language: final decision (binding)

Judge: lead builder, 3 Nov 2026. Inputs: `bangla-plain-A.md`, `bangla-plain-B.md`, `bangla-loanword-swaps.md`, CLAUDE.md section 2b, and the owner's own wording rules given with this task. This file is the single binding guide for every Bangla string in the app. Where A, B, the 1 Nov swaps file or an older note disagree with this file, this file wins. All Bangla stays marked "যাচাই হয়নি" (unreviewed) until TM-TST-161.

**Update 3 Nov 2026 (pass 2):** rulings #6, #11, #12, #13, #14, #15, #16, #17 (partly) and #18 (outside the Deen definitions) in section 2 were reversed by the owner and applied through `docs/design/bangla-plain-pass2.md`: ব্যক্তিগত is now প্রাইভেট / পারসোনাল / নিজের by meaning, বিরতি is পজ, মাপকাঠি is মেট্রিক, গোনা is হিসাব / ধরা, ন্যূনতম is মিনিমাম / কমপক্ষে, সর্বোচ্চ is "বেশি হলে", সর্বশেষ is শেষ, আনুমানিক is আন্দাজ / প্রায়, সম্পন্ন is শেষ. Where this file and the pass 2 file differ, the pass 2 file wins. Bare Bangla digits in the field catalog are now Latin too (section 1, "digits").

Owner intent in one line: Bangla must read like normal spoken and written Bangladeshi Bangla on a phone. Common English words are written in Bangla script with ONE common spelling. Everything else is simple everyday Bangla. Short, polite, professional, no slang.

## 1. Decisions already made by the owner (not reopened)

| Topic | Decision |
|---|---|
| goal | **গোল** (not লক্ষ্য, not উদ্দেশ্য). Reverses the 1 Nov "keep লক্ষ্য" line. |
| data | **ডাটা** (not ডেটা). The owner writes ডাটা. |
| test / try | **টেস্ট** (not পরীক্ষা, not নিরীক্ষা). |
| live | **লাইভ** (not সরাসরি সম্প্রচার). Nothing in the app says it today; the banned list keeps it that way. |
| app | **অ্যাপ** (never এপ, এ্যাপ, এপ্স). |
| address form | **আপনি** everywhere. Verbs end in -ুন (করুন, দেখুন). No তুমি, no slang, no emoji. |
| digits | Latin digits 0-9 only. Values with no Bangla letter at all (for example a bare range) are left as they are: the screen converts them and the field check needs Bangla script. |
| real data | One name: **আসল** (আসল ডাটা). Not রিয়েল, not আসল তথ্য. |
| demo data | **ডেমো** in Bangla text. The DEMO badge and its label stay Latin ("DEMO"); Mix shows "Demo". |

## 2. Where A and B disagreed, and the ruling

| # | A said | B said | Ruling and reason |
|---|---|---|---|
| 1 | ডাটা | ডেটা | **ডাটা** (owner). |
| 2 | গোল | keep লক্ষ্য | **গোল** (owner). B's "কত দূরের লক্ষ্য" becomes "কত দূরের গোল". |
| 3 | Demo stays Latin | ডেমো in Bangla script | **ডেমো**. Bangla text uses Bangla script for loanwords; Mix already maps ডেমো to Demo. |
| 4 | রিয়েল to আসল | আসল তথ্য to আসল ডেটা | **আসল ডাটা** and bare **আসল**. One name. |
| 5 | (silent) | হ্যাবিট to অভ্যাস | **অভ্যাস**. It is the word people say; already used 72 times. |
| 6 | ব্যক্তিগত to প্রাইভেট | (silent) | **Keep ব্যক্তিগত.** An everyday word; forcing English here fails the owner's "plain" test. |
| 7 | (silent) | পাতা to পেজ | **পেজ.** People say "পেজ" for a screen. Suffixes are fixed by the tool (পেজের, পেজে). |
| 8 | ডিভাইস to ফোন | ডিভাইস to ফোন | **ফোন.** Both agree. |
| 9 | স্ন্যাপশট to "সেভ-কপি" | স্ন্যাপশট to "ব্যাকআপ কপি" | **কপি** ("ফোনের কপি"). A's hyphen word breaks Mix (it would show "Save-কপি"). B's "ব্যাকআপ কপি" would be confused with the exported backup file. |
| 10 | keep SMART English headers | plain Bangla headers | **Plain Bangla with a Latin letter tag** (S · ঠিক কী, M · কত, A · সাধ্যের মধ্যে, R · কেন জরুরি, T · কবের মধ্যে). "অ্যাচিভেবল" is not a spoken word. |
| 11 | (silent) | বিরতি to পজ for goal status | **Keep বিরতি everywhere.** Both words are understood; changing 20+ lines gives forms like "পজতে" that nobody says. |
| 12 | মাপকাঠি to মাপ / rewrite | rewrite to "কী মাপবেন" | **Keep মাপকাঠি.** No shorter plain word exists; "মাপ" alone reads wrong. |
| 13 | গোনা to হিসাব (rewrite) | drop গোনা in a few lines | **Keep গোনা** ("গোনা হয়" is how people say "is counted"). |
| 14 | ন্যূনতম, সর্বোচ্চ to loan words | (silent) | **Keep** both. Everyday words. |
| 15 | সর্বশেষ, সম্প্রতি to simpler | (silent) | **Keep.** Newspaper words, understood by everyone. |
| 16 | আনুমানিক to প্রায় | (silent) | **Keep আনুমানিক** ("আনুমানিক মূল্য" is normal speech); only the question "আনুমানিক কতক্ষণ?" becomes "প্রায় কতক্ষণ?". |
| 17 | সম্পন্ন to শেষ | (silent) | **Keep.** The swap changed meaning once ("সম্পন্ন হস্তান্তর" became "last handover"). |
| 18 | নির্ধারিত to ঠিক করা | (silent) | **Keep.** It sits inside a Deen definition (fasting time) and must not change. |
| 19 | হস্তান্তর to হ্যান্ডওভার | (silent) | **হ্যান্ডওভার.** Business word people say; Mix shows Handover. |
| 20 | উদ্যোগ to ভেঞ্চার / ব্যবসার আইডিয়া | উদ্যোগ to ব্যবসা | **ব্যবসা.** Plain, and the screen is about the owner's businesses and assets. |
| 21 | (silent) | ফেরান to রিস্টোর for backups | **রিস্টোর** for backups only. "ফেরানো যায় না" (cannot be undone) stays as it is. |
| 22 | next.title: not flagged | "পরের সেরা কাজ" is a rank word | **"এখন কোন কাজ করবেন?"** No rank words (product rule). |
| 23 | leak.title: not flagged | "অডিট" is not spoken | **"লিক খোঁজা".** |
| 24 | store.ask: (silent) | wants a different meaning | **No change.** The current Bangla matches the English ("ask the browser to keep my data"). B misread it. |
| 25 | disclaimer "সরঞ্জাম" to টুল, "কর" to ট্যাক্স | "টুল" to "অ্যাপ" in the no-fatwa line | **No change** (protected, see section 5). Spelling only. |
| 26 | conn.confirm.btn to কনফার্ম করুন | to "অনুমতি দিন" | **No change.** D-C permission text is protected. |

## 3. Spelling guide (one spelling per word, everywhere)

| Use | Do not use |
|---|---|
| ডাটা | ডেটা, ডাটাবেজ |
| গোল | লক্ষ্য, উদ্দেশ্য (as the word for goal). টার্গেট stays for "target". |
| টেস্ট | পরীক্ষা, নিরীক্ষা, পরীক্ষণ |
| লাইভ | সরাসরি সম্প্রচার, জীবন্ত |
| অ্যাপ | এপ, এ্যাপ, এপ্স |
| ব্যাকআপ | ব্যাক-আপ, ব্যাকাপ |
| সেটিংস | সেটিং (alone), সেটিঙ্গ |
| স্ক্রিন | স্ক্রীন, পর্দা |
| নোটিফিকেশন | নোটিফিকেশান, বিজ্ঞপ্তি |
| রিমাইন্ডার | স্মারক |
| ডিলিট, ক্যানসেল | ডিলেট (accepted only as TYPED input in `typedConfirm.ts`), মুছুন, বাতিল |
| ইমপোর্ট, এক্সপোর্ট | ইম্পোর্ট, আমদানি, রপ্তানি |
| বাটন | বোতাম |
| ডেমো (Bangla text) | Demo (Latin) inside Bangla text |
| আসল ডাটা | আসল তথ্য, রিয়েল ডেটা |
| অভ্যাস | হ্যাবিট |
| পেজ | পাতা (for a screen) |
| ফোন | ডিভাইস |
| রিস্টোর (backup) | ফেরান, ফিরিয়ে আনা (for backups) |
| কপি | স্ন্যাপশট, স্থানীয় স্ন্যাপশট |
| ব্যবসা (venture) | উদ্যোগ |
| জিজ্ঞেস | জিজ্ঞাসা |
| এখনো | এখনও |
| হিসেবে | হিসাবে (the "as" word; হিসাব the noun stays) |
| ফর্ম | ফরম |
| ফোন নম্বর, ইমেইল, পাসওয়ার্ড | মোবাইল নম্বর (mix), ই-মেইল, গুপ্তশব্দ |
| ড্রাফট | খসড়া (outside protected lines) |
| লিংক করা | যুক্ত (goal and task links) |
| মার্ক করুন | চিহ্নিত করুন |
| ডিটেইল | বিবরণ |
| টুল | সরঞ্জাম (outside protected lines) |
| দরকারি | প্রয়োজনীয় |
| ভরসার | বিশ্বস্ত |
| আপডেট | হালনাগাদ |
| হ্যান্ডওভার | হস্তান্তর |
| ফ্রি | বিনামূল্যের |
| লাইসেন্স করা | লাইসেন্সপ্রাপ্ত |

Loanword rules: write the word as it sounds, with ONE spelling. Short "a" or "e" at the start is অ্যা (অ্যাপ, অ্যালার্ট, অ্যাকাউন্ট). "-tion" is -শন. "-er/-or" is -ার. A Bangla suffix goes straight onto the word (গোলের, ডাটায়, অ্যাপে). In Mix the app turns it into a hyphen form (Goal-এর, Data-এ).

## 4. Style rules

1. **Tone.** Polite আপনি form. Say what to do first, then why. Buttons are a verb phrase of 1 to 3 words and at most 24 characters (সেভ করুন, ডিলিট করুন).
2. **Sentences.** 12 words or fewer, one idea each. End with "।" or "?". No "!" in errors. Active voice: "সেভ হয়েছে", not "সংরক্ষণ করা হয়েছে".
3. **Court and form words are replaced** by plain verbs: প্রদান, অবগত, উল্লেখিত, উপরোক্ত, নিম্নোক্ত, সংশ্লিষ্ট, প্রযোজ্য, আবশ্যক, অনুগ্রহপূর্বক. "অনুগ্রহ করে" is dropped (the polite verb form already carries it).
4. **Use English-in-Bangla-script when** the English word is what people say on a phone or in a shop AND the Bangla word is longer or bookish AND it is not a Deen term. Test: "Would my cousin say this on a voice call?" Do not chase a quota: a plain Bangla word people really say (দিন, টাকা, খরচ, হিসাব, কাজ, বদল, ফাঁকা, ধাপ, সাথে/সঙ্গে) beats a forced English one.
5. **Numbers.** Latin digits. Money "100 টাকা" or "BDT 100". Dates "12 নভেম্বর 2026". Percent "50%".
6. **No red words.** Missed goals never get ব্যর্থ, দুর্বল, পিছিয়ে, ঘাটতি. No score, rank, grade or streak words (so no "সেরা" as a rank).
7. **"যাচাই"** is reserved for the unreviewed tag "যাচাই হয়নি". Do not use it for a function (the Ownership check is "এটা কি আমার কাজ?").
8. **Stage and step.** "স্টেজ" is the journey Stage A to H. "ধাপ" is a small step. Do not put both in one sentence unless explaining the difference.
9. **Mix mode** is the Bangla sentence with the same loanwords in English letters. Every loanword in this guide has exactly one entry in `MIX_TERMS` (section 7).

## 5. Protected strings (spelling and the owner's naming only)

These keep their exact meaning. Only the rules in section 3 that are spelling or naming (S01 to S13) may touch them. They are listed in `tools/bangla_plain_rules.json` under `protected`; the tool refuses any other change.

- D-B consent, tick-first and real-data delete wording: `mode.real.*`, `mode.del.*`, `mode.switch.needConsent`, `entry.consent.*`, `data.consent*`, `data.clearReal*`, `imp.locked`, `del.demo.*`, `del.real.*`, `priv.consent*`, `priv.withdraw*`.
- Not-a-fatwa and Deen disclaimers: `halal.banner`, `halal.draft`, `halal.intro`, `disclaimer.*`, anything containing ফতোয়া. Deen terms (নামাজ, রোজা, যাকাত, দিন, টাকা and the rest of the list in the tool) never change; the tool checks their count per string.
- "যাচাই হয়নি" on any string (count is checked).
- No-guarantee and no-advice lines: anything containing গ্যারান্টি, নিশ্চয়তা, প্রতিশ্রুতি, ভবিষ্যদ্বাণী or "আর্থিক পরামর্শ". These keep words such as সরঞ্জাম and ভবিষ্যদ্বাণী on purpose.
- Unknown is not 0: `intake.skipHint`, `home.cnt.unknown`, `unknown.*`. The tool refuses a change that removes অজানা, জানা নেই, জানি না, ফাঁকা or শূন্য from a string that had one (two import error lines are the only reviewed exceptions).
- No-punishment copy: `stage.leftNote`, `reality.note`, `reward.*`, `goal.status.note`.
- Privacy and lock: `team.err.contact`, `lock.*` (one reviewed exception: the wait message loses "অনুগ্রহ করে"), `privacy.*`, `enc.wroteNeed`.
- D-C permission text: `conn.*`.
- Halal and contract formal wording: `src/library/halalFlags.ts`, `public/content/pack-003.json`, `public/content/pack-009.json`; the word শর্ত stays everywhere.
- Out of scope entirely: `src/library/hadithPack.json` (D-D), `src/core/capture.ts`, `src/core/safety.ts`, `src/core/typedConfirm.ts` (they match words the user types), `src/core/hijri.ts`, language names.

## 6. The exact list of changes

Each rule changes the Bangla value only (never the English text, ids, keys or code). Placeholders such as {n} are checked before and after. Counts are the strings actually changed on the 3 Nov branch (from the change log). They are applied in three steps (see section 9).

### 6.1 Word rules

| ID | Step | Change | Strings | Scope | Why |
|---|---|---|---|---|---|
| S01 | spelling | ০-৯ → 0-9 (only in strings that also have Bangla letters) | 146 | all in-scope files | Latin digits 0-9 everywhere (owner rule); the screen already converts, the source now matches. |
| S02 | spelling | ডেটা → ডাটা | 118 | all in-scope files | Owner spelling (A and B disagreed). |
| S04 | spelling | কেন্দ্রীয় লক্ষ্য → মূল গোল | 4 | all in-scope files |  |
| S04b | spelling | মূল লক্ষ্য → মূল গোল | 3 | all in-scope files |  |
| S04c | spelling | উপ-লক্ষ্য → সাব-গোল | 8 | all in-scope files |  |
| S05 | spelling | লক্ষ্য → গোল | 240 | all in-scope files | Owner word for goal. Reverses the 1 Nov decision. |
| S06 | spelling | বোতাম → বাটন | 3 | all in-scope files |  |
| S07 | spelling | জিজ্ঞাসা → জিজ্ঞেস | 22 | all in-scope files |  |
| S08 | spelling | এখনও → এখনো | 17 | all in-scope files |  |
| S09 | spelling | হিসাবে → হিসেবে | 9 | all in-scope files |  |
| S10 | spelling | এপ → অ্যাপ | 0 | all in-scope files |  |
| S11 | spelling | Demo → ডেমো | 47 | all in-scope files | Bangla text writes Demo in Bangla script. The DEMO badge stays Latin; Mix shows Demo. |
| S12 | spelling | আসল তথ্য → আসল ডাটা | 8 | all in-scope files | One name for real data. |
| S13 | spelling | রিয়েল → আসল | 33 | all in-scope files | One name for real data (owner). |
| M01 | meaning | ব্যক্তিত্ব-পরীক্ষা → ব্যক্তিত্বের টেস্ট | 1 | all in-scope files |  |
| M02 | meaning | পরীক্ষা → টেস্ট | 30 | all in-scope files | A test or a small trial is টেস্ট. There is no real exam in the app. |
| M03 | meaning | হ্যাবিট → অভ্যাস | 10 | all in-scope files | One word for habit. |
| M04 | meaning | সরাসরি বা অনলাইনে → সামনাসামনি বা অনলাইনে | 1 | src/library/paths.ts | In person, not live. |
| M06 | meaning | SMART: স্পেসিফিক → SMART: S | 1 | all in-scope files |  |
| M06b | meaning | SMART: অ্যাচিভেবল → SMART: A | 1 | all in-scope files |  |
| M06c | meaning | SMART: মেজারেবল → SMART: M | 0 | all in-scope files |  |
| M06d | meaning | SMART: রিলেভেন্ট → SMART: R | 0 | all in-scope files |  |
| M06e | meaning | SMART: টাইম-বাউন্ড → SMART: T | 0 | all in-scope files |  |
| W01 | stiff | ডিভাইস → ফোন | 8 | all in-scope files |  |
| W02 | stiff | বিবরণ → ডিটেইল | 7 | all in-scope files |  |
| W03 | stiff | সরঞ্জাম → টুল | 4 | all in-scope files |  |
| W05 | stiff | লাইসেন্সপ্রাপ্ত → লাইসেন্স করা | 0 | all in-scope files |  |
| W08 | stiff | বিনামূল্যের → ফ্রি | 2 | all in-scope files |  |
| W09 | stiff | হস্তান্তর → হ্যান্ডওভার | 29 | all in-scope files |  |
| W10 | stiff | উদ্যোগ → ব্যবসা | 49 | all in-scope files | Venture is ব্যবসা. |
| W11 | stiff | পাতা → পেজ | 83 | all in-scope files | A screen is a পেজ. |
| W12 | stiff | স্থানীয় স্ন্যাপশট → ফোনের কপি | 1 | all in-scope files |  |
| W12b | stiff | স্ন্যাপশট → কপি | 13 | all in-scope files |  |
| W13 | stiff | খসড়া → ড্রাফট | 8 | all in-scope files |  |
| W14 | stiff | প্রয়োজনীয় → দরকারি | 0 | all in-scope files |  |
| W15 | stiff | বিশ্বস্ত → ভরসার | 4 | all in-scope files |  |
| W16 | stiff | যুক্ত কাজ → লিংক করা কাজ | 6 | all in-scope files |  |
| W16b | stiff | কাজ যুক্ত নেই → কাজ লিংক করা নেই | 6 | all in-scope files |  |
| W16c | stiff | যুক্ত করুন → লিংক করুন | 4 | all in-scope files |  |
| W17 | stiff | চিহ্নিত করুন → মার্ক করুন | 1 | all in-scope files |  |
| W17b | stiff | চিহ্নিত করা → মার্ক করা | 1 | all in-scope files |  |
| W18 | stiff | সরান → রিমুভ করুন | 10 | src/i18n/packs.ts | A bare 'সরান' button was unclear (move or delete?). |
| W19 | stiff | হালনাগাদ → আপডেট | 2 | all in-scope files |  |

### 6.2 Per-key rewrites (new text)

Applied after the word rules of the same step. Each rewrite also checks that the key still holds the text the judges reviewed.

#### First start and consent

| ID | Step | Key | New text | Why |
|---|---|---|---|---|
| P1-01 | stiff | `mode.banner.start` | আসল ডাটা শুরু করুন |  |
| P1-02 | stiff | `mode.start.btn` | আসল ডাটা শুরু করুন |  |
| P1-03 | stiff | `mode.real.back` | ফিরে যান |  |
| P1-04 | stiff | `mode.switch.note` | একসঙ্গে শুধু এক ধরনের ডাটা দেখানো হয়। ডেমো আর আসল ডাটা কখনো মেশে না। |  |
| P1-05 | stiff | `safety.demo` | এই ভার্সনে শুধু স্যাম্পল ডেমো ডাটা। কোনো AI, ইন্টারনেট কানেকশন বা টাকার সার্ভিস নেই। |  |
| P1-06 | stiff | `onb.min.label` | প্রায় কতক্ষণ? |  |

#### Today

| ID | Step | Key | New text | Why |
|---|---|---|---|---|
| P2-01 | stiff | `home.cnt.note` | শুধু আপনার লেখা ডাটা থেকে গোনা। গোলের ধাপ মানে গোলের সঙ্গে লিংক করা কাজ। |  |
| P2-02 | stiff | `home.sum.open` | টাকার হিসাব খুলুন |  |
| P2-03 | stiff | `next.title` | এখন কোন কাজ করবেন? | 'সেরা' reads as a rank word. |
| P2-04 | stiff | `next.add_money.reason` | নেট ওয়ার্থ, ইনকাম আর খরচ না লিখলে এগুলো অজানা দেখাবে। |  |
| P2-05 | stiff | `advice.title` | আপনার লেখা দেখে কিছু পরামর্শ |  |
| P2-06 | stiff | `advice.goal_no_task.reason` | এই গোলে এখনো কোনো কাজ লিংক করা নেই, তাই প্রোগ্রেস অজানা। |  |
| P2-07 | stiff | `advice.many_open_tasks.reason` | {n}টি কাজ বাকি। কয়েকটা বেছে নিলে দিনটা সহজ হবে। |  |
| P2-08 | stiff | `advice.money_unknown.title` | টাকার অঙ্ক লিখে দিন |  |
| P2-09 | stiff | `advice.money_unknown.reason` | {n}টি এন্ট্রিতে এখনো টাকার অঙ্ক নেই, তাই মোট অজানা দেখাচ্ছে। |  |
| P2-10 | stiff | `advice.risk_no_stop_rule.title` | প্রতিটি রিস্কে কখন থামবেন তা লিখুন |  |
| P2-11 | meaning | `grid.title` | আগের দিনগুলো | 'Long view' was word-for-word. |
| P2-12 | meaning | `grid.empty` | আগের দিনগুলো দেখতে একটি অভ্যাস যোগ করুন। |  |
| P2-13 | stiff | `grid.cell.full` | সব দিন টিক করা |  |
| P2-14 | stiff | `grid.cell.some` | কিছু দিন টিক করা |  |
| P2-15 | stiff | `grid.cell.open` | টিক করা নেই |  |
| P2-16 | stiff | `grid.line` | {name}, {from} থেকে {to}: {p} দিনের মধ্যে {d} দিন টিক করা |  |
| P2-17 | stiff | `grid.range.label` | কত দিনের |  |
| P2-18 | meaning | `tri.title` | এটা কি আমার কাজ? | 'যাচাই' is reserved for the unreviewed tag. |
| P2-19 | stiff | `tri.out.delegate` | অন্য কাউকে দিয়ে করান |  |
| P2-20 | stiff | `stage.conditions` | এই স্টেজ শেষ করতে যা লাগবে |  |
| P2-21 | meaning | `legs.state.steady` | ঠিকঠাক | 'স্থির' sounds frozen. |
| P2-22 | stiff | `legs.leg.finance` | টাকাপয়সা |  |

#### Money

| ID | Step | Key | New text | Why |
|---|---|---|---|---|
| P5-01 | stiff | `money.baselineNeeded` | আগে শুরুর হিসাব লাগবে। এখন হাতে যা আছে (ক্যাশ ও সেভিংস) তা সম্পদ লাইন হিসেবে যোগ করুন। তার আগে কত মাস চলবে, তা অজানা থাকবে। |  |
| P5-02 | stiff | `money.empty` | এখনো কিছু যোগ করা হয়নি। |  |
| P5-03 | stiff | `money.amount` | কত টাকা |  |
| P5-04 | stiff | `money.runway` | রানওয়ে (কত মাস চলবে) |  |
| P5-05 | stiff | `risk.title` | রিস্ক ও কখন থামবেন |  |
| P5-06 | stiff | `risk.link` | রিস্ক ও কখন থামবেন |  |
| P5-07 | stiff | `risk.noStop` | কখন থামবেন তা এখনো লেখা হয়নি |  |
| P5-08 | stiff | `risk.dateLabel` | কবে আবার দেখবেন (অপশনাল) |  |
| P5-09 | stiff | `ven.err.ownership` | মালিকানা 0 থেকে 100-এর মধ্যে লিখুন, অথবা ফাঁকা রাখুন। |  |
| P5-10 | stiff | `ven.ownership` | আপনার অংশ (%), না জানলে ফাঁকা |  |

#### Journey

| ID | Step | Key | New text | Why |
|---|---|---|---|---|
| P6-01 | meaning | `arc.title` | কত দূরের গোল | Horizon is 'how far ahead', not a deadline. |
| P6-02 | meaning | `arc.marker` | যেখানে গোল আছে তার মধ্যে সবচেয়ে কাছেরটা: {h} |  |
| P6-03 | meaning | `arc.none` | এখনো কোনো গোলের সময়ের দূরত্ব ঠিক করা হয়নি। |  |
| P6-04 | stiff | `dec.title` | সিদ্ধান্ত নিতে সাহায্য |  |
| P6-05 | meaning | `dec.out.lean_go` | করে ফেলাই ভালো মনে হচ্ছে। | 'ঝুঁকুন' sounds like risk. |
| P6-06 | stiff | `dec.q.learn` | সিদ্ধান্তের আগে কম খরচে আরও কিছু জানা যায় কি? |  |
| P6-07 | stiff | `fit.unmapped` | এখনো মেলেনি: {list} |  |
| P6-08 | meaning | `leak.title` | লিক খোঁজা | Nobody says 'অডিট' for personal use. |
| P6-09 | meaning | `leak.link` | লিক খোঁজা |  |
| P6-10 | meaning | `leak.att.silence` | মিউট করুন | 'চুপ করান' is rude. |
| P6-11 | stiff | `leak.att.clarify.tip` | অস্পষ্ট কাজকে একটা পরিষ্কার পরের ধাপে লিখুন। |  |
| P6-12 | stiff | `leak.att.silence.tip` | ফোকাসের সময় দরকার নেই এমন নোটিফিকেশন মিউট করুন। |  |
| P6-13 | meaning | `smart.s` | S · কী চাই: ঠিক কী করবেন বা কী পাবেন? |  |
| P6-14 | meaning | `smart.m` | M · কত: কীভাবে বুঝবেন যে হয়ে গেছে? |  |
| P6-15 | meaning | `smart.a` | A · সাধ্যের মধ্যে: কেন এটা সম্ভব? |  |
| P6-16 | meaning | `smart.r` | R · কেন জরুরি: এটা আপনার কাছে কেন দরকার? |  |
| P6-17 | meaning | `smart.t` | T · ডেডলাইন: কবের মধ্যে? |  |
| P6-18 | meaning | `smart.f.s` | S · ঠিক কী |  |
| P6-19 | meaning | `smart.f.m` | M · কত |  |
| P6-20 | meaning | `smart.f.a` | A · সাধ্যের মধ্যে |  |
| P6-21 | meaning | `smart.f.r` | R · কেন জরুরি |  |
| P6-22 | meaning | `smart.f.t` | T · কবের মধ্যে |  |
| P6-23 | stiff | `gate.note` | আপনার লেখা বের হওয়ার প্রতিটি শর্ত মিললে এবং নিজের প্রমাণ লিখলে তবেই স্টেজ পাস করা যায়। এটা বদলাতে যেকোনো সময় শর্ত সরিয়ে দিন। |  |
| P6-24 | stiff | `gate.exit.met` | মিলেছে। |  |
| P6-25 | stiff | `ap.intro` | তিনটি অপশনাল প্রশ্ন। যেটা ইচ্ছা বাদ দিন। আপনার উত্তর পথের কার্ডে দেখানো হবে। এটা কোনো টেস্ট নয়। |  |
| P6-26 | stiff | `rl.check` | কী কী বদলে যেতে পারে দেখুন |  |
| P6-27 | stiff | `rl.impact.none` | আপনার প্ল্যানের কিছুই বদলাচ্ছে না। চাইলে শুধু লিখে রাখতে পারেন, প্ল্যান যেমন আছে তেমনই থাকবে। |  |

#### Diary

| ID | Step | Key | New text | Why |
|---|---|---|---|---|
| P7-01 | stiff | `diary.completeness` | কতটা লেখা হয়েছে |  |
| P7-02 | stiff | `diary.next.required_missing` | আগে লিখুন: {field}। কেন দরকার: {why} |  |
| P7-03 | stiff | `assess.noRating` | এখনো উত্তর দেননি |  |
| P7-04 | stiff | `dict.title` | ডাটার তালিকা |  |
| P7-05 | stiff | `intake.next` | সেভ করে পরেরটা |  |
| P7-06 | stiff | `intake.done` | আপাতত এইটুকুই |  |
| P7-07 | stiff | `imp.err.entity` | এই রেকর্ডের ধরন চেনা যায়নি। |  |
| P7-08 | stiff | `imp.err.field` | এই রেকর্ডে এমন ফিল্ড নেই। |  |
| P7-09 | stiff | `team.ho.save` | হ্যান্ডওভার প্ল্যান সেভ করুন | Keeps the button at 28 characters after হস্তান্তর became হ্যান্ডওভার. |

#### Deen

| ID | Step | Key | New text | Why |
|---|---|---|---|---|
| P8-01 | meaning | `deen.set.dhaka` | ঢাকায় রিসেট করুন |  |

#### Settings and data

| ID | Step | Key | New text | Why |
|---|---|---|---|---|
| P9-01 | meaning | `enc.restore` | এনক্রিপ্টেড ব্যাকআপ থেকে রিস্টোর করুন |  |
| P9-02 | meaning | `backup.restore` | ব্যাকআপ ফাইল থেকে রিস্টোর করুন |  |
| P9-03 | meaning | `backup.bad` | এই ফাইল রিস্টোর করা যাচ্ছে না: {why}। কিছু বদলায়নি। |  |
| P9-04 | meaning | `backup.note` | রিস্টোর করলে আপনার ডেমো ডাটা বদলে যাবে। আসল ডাটা এখন বন্ধ আছে। |  |
| P9-05 | meaning | `snap.restore` | রিস্টোর করুন |  |
| P9-06 | meaning | `snap.why.before_restore` | রিস্টোরের আগে |  |
| P9-07 | meaning | `restore.title` | রিস্টোরের আগে দেখে নিন |  |
| P9-08 | meaning | `restore.done` | হয়ে গেছে। {n}টি এন্ট্রি রিস্টোর হয়েছে। |  |
| P9-09 | meaning | `set.row.restore` | ব্যাকআপ থেকে রিস্টোর করুন |  |
| P9-10 | meaning | `bak.restore.title` | ব্যাকআপ থেকে রিস্টোর করুন |  |
| P9-11 | meaning | `bak.restore.note` | রিস্টোরের আগে প্রিভিউ দেখায় এবং আপনার বর্তমান ডাটার কপি সেভ করে। 7 দিন পর্যন্ত আগের অবস্থায় ফিরতে পারবেন। |  |
| P9-12 | meaning | `bak.settingsNote` | লুক ও ভাষার সেটিংস ব্যাকআপ ফাইলে থাকে না। রিস্টোরের পর আবার ঠিক করতে হতে পারে। |  |
| P9-13 | meaning | `more.theme.dark` | ডার্ক |  |
| P9-14 | stiff | `data.real.locked` | বন্ধ আছে। নিচে টিক দিলে আসল ডাটা চালু হবে। |  |
| P9-15 | stiff | `store.persist.yes` | সেফ আছে: ব্রাউজার আপনার ডাটা রাখবে বলেছে। |  |
| P9-16 | stiff | `store.persist.no` | এখনো সেফ নয়: ফোনে জায়গা কম পড়লে ব্রাউজার ডাটা ডিলিট করে দিতে পারে। তাই একটি ব্যাকআপ ফাইল সেভ করুন। |  |
| P9-17 | stiff | `store.usage` | ফোনের জায়গা নিয়েছে: প্রায় {u}। |  |
| P9-18 | stiff | `store.usage.of` | ফোনের জায়গা নিয়েছে: প্রায় {u}, অ্যাপ মোট পেতে পারে {q}। |  |
| P9-19 | stiff | `save.fail.text` | ফোনে সেভ হয়নি। এখনই একটি ব্যাকআপ এক্সপোর্ট করুন। আপনার শেষ বদল স্ক্রিনে আছে, তাই এখনো সব ঠিক আছে। |  |
| P9-20 | stiff | `save.fail.retryStill` | এখনো সেভ হয়নি। ব্যাকআপ এক্সপোর্ট করে নিন। |  |
| P9-21 | stiff | `lock.err.wait` | {s} সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন। |  |
| P9-22 | stiff | `snap.fileNote` | ফাইলটি লক করা নয়। এটা কাউকে দেবেন না। লক করা ফাইল চাইলে ওপরের এনক্রিপ্টেড ব্যাকআপ নিন। |  |
| P9-23 | stiff | `snap.auto` | অ্যাপ খুললে দিনে একবার নিজে থেকে কপি রাখুন |  |
| P9-24 | stiff | `snap.unavailable` | এই ব্রাউজারে অটো কপি সেভ করা যায় না। |  |

### 6.3 Reviewed and deliberately not changed

ব্যক্তিগত, গোনা, মাপকাঠি, ক্রম, পদ্ধতি, বদল, বিরতি, ন্যূনতম, সর্বোচ্চ, সর্বশেষ, সম্প্রতি, সম্পন্ন, নির্ধারিত, আনুমানিক (except the one question), সাথে and সঙ্গে (both stay), এন্ট্রি, অপশনাল, উদাহরণ, শর্ত, অজানা as a column label, funnel and readiness words in glossary lines, "সুদ", every Deen term.

## 7. Mix mode

Mix is made from the Bangla pack by `MIX_TERMS`. In the same commit as each step, `MIX_TERMS` is updated so Mix keeps English for every swapped word:

- Step 1: লক্ষ্য to গোল (moves out of the whole-word-only legacy block so suffixes work), ডেটা to ডাটা. Suffix list gains গুলোর, গুলোতে and য়.
- Step 2: টেস্ট (Test), রিস্টোর (Restore), ডার্ক (Dark), মিউট (Mute), রিসেট (Reset).
- Step 3: পেজ (Page), ড্রাফট (Draft), কপি (Copy), টুল (Tool), ডিটেইল (Detail), হ্যান্ডওভার (Handover), মার্ক (Mark), রিমুভ (Remove), ফ্রি (Free), আপডেট (Update).

The tool refuses `--apply` when a needed pair is missing from `MIX_TERMS`.

## 8. Tests that guard this guide

`tests/bangla_plain.test.ts` with fixtures in `tests/fixtures/`: banned-word list (সম্প্রচার, নিরীক্ষা, ডেটা, লক্ষ্য, বোতাম, এপ, একাউন্ট, স্ক্রীন, জিজ্ঞাসা, এখনও, রিয়েল, আসল তথ্য, হ্যাবিট, ডিভাইস, উদ্যোগ, পাতা, স্ন্যাপশট, পরীক্ষা, Bangla digits, and so on, each with allowed keys); en, bn and mix key parity; a string-count snapshot per pack; placeholder preservation; a protected-strings snapshot (before and after, differing only by spelling rules); Mix regex checks (Bangla loanword never left in Mix, no half-converted words, suffix forms); Unknown-not-0 keys; button length.

## 9. Order of work

1. This ruling.
2. Step 1 `spelling`: S01 to S13, plus `MIX_TERMS`.
3. Step 2 `meaning`: wrong meanings (test, horizon, restore, habit, leak audit, rank word, SMART headers, and similar), plus `MIX_TERMS`.
4. Step 3 `stiff`: stiff words and sentence rewrites, in screen priority (first start and consent, Today, navigation, Plan, Money, Journey, Diary, Deen, Settings, content packs), plus `MIX_TERMS`.
5. Regenerate `docs/owner/BANGLA_REVIEW_SHEET.md`, write `docs/owner/BANGLA_WHAT_CHANGED.md`, log in `DECISIONS_LOG.md`.

Undo for any step: `git revert <commit>`. The rules file and the change log (`docs/design/bangla-plain-change-log.json`) show exactly what each step did.

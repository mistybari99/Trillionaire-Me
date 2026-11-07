// Keys for build-queue batch 1 (Q-01..Q-09). Merged into the packs by spread lines in packs.ts; Mix is derived from the Bangla text there.
// Plain Bangla per CLAUDE.md 2b / pass 2, Latin digits. Calm wording only; nothing is rated or counted.
export const QB1_EN = {
  // Q-01 recovery line
  "qb1.recovery": "A pause is part of the path. Come back when ready.",
  // Q-02 make-it-concrete bank
  "qb1.bank.h": "Make it concrete",
  "qb1.bank.hint": "Tap a pair to fill the step name below.",
  "qb1.bank.1.big": "Write the report", "qb1.bank.1.tiny": "Open the file and write only its title",
  "qb1.bank.2.big": "Clean the room", "qb1.bank.2.tiny": "Pick up 5 things from the floor",
  "qb1.bank.3.big": "Start exercising", "qb1.bank.3.tiny": "Put on your shoes and stand at the door",
  "qb1.bank.4.big": "Study for the exam", "qb1.bank.4.tiny": "Open the book and read one page",
  "qb1.bank.5.big": "Plan the month", "qb1.bank.5.tiny": "Write one thing that matters this month",
  "qb1.bank.6.big": "Call the supplier", "qb1.bank.6.tiny": "Find the number and write one question",
  "qb1.bank.7.big": "Sort the paperwork", "qb1.bank.7.tiny": "Put the top 5 papers in one folder",
  "qb1.bank.8.big": "Learn a new skill", "qb1.bank.8.tiny": "Read or watch for 5 minutes",
  // Q-03 Stuck card pictures (decorative; the lists stay as the text)
  "qb1.fork.easy": "Easy first", "qb1.fork.hard": "Hard first",
  "qb1.band.time": "Time", "qb1.band.dist": "Distractions", "qb1.band.goals": "Goals",
  // Q-04 Show my why
  "qb1.why.h": "Show my why",
  "qb1.why.empty": "You have not written your why yet. Add it in the goal form below.",
  "qb1.why.add": "Add my why",
  // Q-07 lever links
  "qb1.lever.tip": "Read the tip", "qb1.lever.keep": "Keep this", "qb1.lever.kept": "Kept",
  // Q-06 weekly additions
  "qb1.way.h": "What got in the way this week?", "qb1.way.note": "Optional. It stays on this phone.",
  "qb1.way.time": "Not enough time", "qb1.way.energy": "Low energy", "qb1.way.unclear": "The next step was unclear", "qb1.way.interrupt": "Many interruptions", "qb1.way.other": "Something else", "qb1.way.skip": "Skip",
  "qb1.way.saved": "Noted. You can change it any time this week.", "qb1.way.skipped": "Skipped. Nothing was saved.",
  "qb1.wm.h": "Habits, last 7 days", "qb1.wm.unknown": "No habits yet, so there is nothing to show. This is Unknown, not zero.",
  "qb1.wm.legend": "✓ done · ○ planned, not done yet · blank = not planned",
  "qb1.wm.done": "{d}: done", "qb1.wm.open": "{d}: planned, not done yet", "qb1.wm.none": "{d}: not planned",
  // Q-05 Inspiration page + chooser coverage (names in the Look page list)
  "qb1.insp.h": "Inspiration", "qb1.insp.intro": "Short lines in four themes. Read one, then go back to your day.", "qb1.insp.more": "More inspiration",
  "look.screen.deen": "Deen", "look.screen.stuck": "Feeling stuck", "look.screen.topics": "Topics", "look.screen.northstar": "North Star", "look.screen.capture": "Write it",
} as const;
export const QB1_BN: Record<keyof typeof QB1_EN, string> = {
  "qb1.recovery": "পজ নেওয়াও পথের অংশ। তৈরি হলে ফিরে আসুন।",
  "qb1.bank.h": "ছোট করে ধরুন",
  "qb1.bank.hint": "নিচের ঘরে ধাপের নাম বসাতে একটা জোড়ায় ট্যাপ করুন।",
  "qb1.bank.1.big": "রিপোর্ট লেখা", "qb1.bank.1.tiny": "ফাইল খুলে শুধু নামটা লিখুন",
  "qb1.bank.2.big": "ঘর গোছানো", "qb1.bank.2.tiny": "মেঝে থেকে 5টা জিনিস তুলে রাখুন",
  "qb1.bank.3.big": "ব্যায়াম শুরু করা", "qb1.bank.3.tiny": "জুতা পরে দরজার সামনে দাঁড়ান",
  "qb1.bank.4.big": "টেস্টের জন্য পড়া", "qb1.bank.4.tiny": "বই খুলে একটা পেজ পড়ুন",
  "qb1.bank.5.big": "মাসের প্ল্যান", "qb1.bank.5.tiny": "এই মাসে জরুরি একটা কাজ লিখুন",
  "qb1.bank.6.big": "সাপ্লায়ারকে ফোন", "qb1.bank.6.tiny": "নম্বরটা খুঁজে একটা প্রশ্ন লিখুন",
  "qb1.bank.7.big": "কাগজপত্র গোছানো", "qb1.bank.7.tiny": "উপরের 5টা কাগজ একটা ফোল্ডারে রাখুন",
  "qb1.bank.8.big": "নতুন স্কিল শেখা", "qb1.bank.8.tiny": "5 মিনিট পড়ুন বা দেখুন",
  "qb1.fork.easy": "আগে সহজ", "qb1.fork.hard": "আগে কঠিন",
  "qb1.band.time": "সময়", "qb1.band.dist": "বিঘ্ন", "qb1.band.goals": "গোল",
  "qb1.why.h": "আমার কারণ দেখুন",
  "qb1.why.empty": "আপনার কারণ এখনো লেখা হয়নি। নিচের গোল ফর্মে লিখুন।",
  "qb1.why.add": "আমার কারণ লিখুন",
  "qb1.lever.tip": "টিপস পড়ুন", "qb1.lever.keep": "এটা রাখুন", "qb1.lever.kept": "রাখা আছে",
  "qb1.way.h": "এই সপ্তাহে কী বাধা হয়েছে?", "qb1.way.note": "ইচ্ছা হলে বলুন। এটা শুধু এই ফোনে থাকে।",
  "qb1.way.time": "সময় কম ছিল", "qb1.way.energy": "শক্তি কম ছিল", "qb1.way.unclear": "পরের ধাপ অস্পষ্ট ছিল", "qb1.way.interrupt": "বার বার বিঘ্ন হয়েছে", "qb1.way.other": "অন্য কিছু", "qb1.way.skip": "স্কিপ",
  "qb1.way.saved": "লেখা হয়েছে। এই সপ্তাহে চাইলে বদলাতে পারেন।", "qb1.way.skipped": "স্কিপ করা হয়েছে। কিছু সেভ হয়নি।",
  "qb1.wm.h": "অভ্যাস, শেষ 7 দিন", "qb1.wm.unknown": "এখনো কোনো অভ্যাস নেই, তাই দেখানোর কিছু নেই। এটা অজানা, শূন্য না।",
  "qb1.wm.legend": "✓ হয়েছে · ○ প্ল্যান ছিল, এখনো হয়নি · ফাঁকা = প্ল্যান ছিল না",
  "qb1.wm.done": "{d}: হয়েছে", "qb1.wm.open": "{d}: প্ল্যান ছিল, এখনো হয়নি", "qb1.wm.none": "{d}: প্ল্যান ছিল না",
  "qb1.insp.h": "অনুপ্রেরণা", "qb1.insp.intro": "চারটা থিমের ছোট কিছু লাইন। একটা পড়ুন, তারপর নিজের কাজে ফিরুন।", "qb1.insp.more": "আরও অনুপ্রেরণা",
  "look.screen.deen": "দ্বীন", "look.screen.stuck": "আটকে গেছেন", "look.screen.topics": "বিষয়", "look.screen.northstar": "নর্থ স্টার", "look.screen.capture": "লিখুন",
};

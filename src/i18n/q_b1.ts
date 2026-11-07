// Keys for build-queue batch 1 (Q-01..Q-09). Merged into the packs by spread lines in packs.ts; Mix is derived from the Bangla text there.
// Plain Bangla per CLAUDE.md 2b / pass 2, Latin digits. No scores, ranks, streaks or judging words.
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
};

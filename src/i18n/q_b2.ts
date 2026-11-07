// Keys for build-queue batch 2 (Q-10, Q-11, Q-30). Merged into the packs by one spread line each for en and bn in packs.ts; Mix is derived from the Bangla text there.
// Plain Bangla per CLAUDE.md 2b / pass 2, Latin digits. Calm wording only; nothing is rated or counted.
export const QB2_EN = {
  // shared
  "q2.save": "Save", "q2.saved": "Saved.", "q2.blank": "A blank line stays Unknown.",
  // Q-10 start card
  "q2.start.h": "Start here", "q2.start.intro": "This goal is new. Pick one way to begin. Any one is fine.",
  "q2.start.clarify": "Clarify: say the problem", "q2.start.break": "Break down: work back from the date", "q2.start.begin": "Begin: set a first action",
  // Q-10 problem frame
  "q2.pf.h": "Say the problem", "q2.pf.intro": "Four short lines. Leave any blank if you do not know yet.",
  // Q-10 want / feel / do
  "q2.wfd.h": "Want, Feel, Do", "q2.wfd.intro": "Three short lines: what you want, how you want to feel, and one tiny action.",
  "q2.tiny.h": "Tiny action examples", "q2.tiny.hint": "Tap one to fill the Do line. You can change it.",
  "q2.tiny.1": "Write the first line of the plan", "q2.tiny.2": "Set a 5 minute timer and start", "q2.tiny.3": "Open the file or book you need",
  "q2.tiny.4": "Tell one person what you will do", "q2.tiny.5": "Put the first tool on the table",
} as const;
export const QB2_BN: Record<keyof typeof QB2_EN, string> = {
  "q2.save": "সেভ করুন", "q2.saved": "সেভ হয়েছে।", "q2.blank": "ফাঁকা লাইন অজানা থাকে।",
  "q2.start.h": "এখান থেকে শুরু", "q2.start.intro": "এই গোল নতুন। শুরুর একটা উপায় বেছে নিন। যেকোনো একটাই ঠিক আছে।",
  "q2.start.clarify": "স্পষ্ট করুন: সমস্যাটা লিখুন", "q2.start.break": "ভাগ করুন: তারিখ থেকে পেছনে হিসাব করুন", "q2.start.begin": "শুরু করুন: প্রথম কাজ ঠিক করুন",
  "q2.pf.h": "সমস্যাটা লিখুন", "q2.pf.intro": "চারটা ছোট লাইন। না জানলে ফাঁকা রাখুন।",
  "q2.wfd.h": "চাই, লাগবে, করব", "q2.wfd.intro": "তিনটা ছোট লাইন: কী চান, কেমন লাগতে চান, আর একটা ছোট কাজ।",
  "q2.tiny.h": "ছোট কাজের উদাহরণ", "q2.tiny.hint": "একটায় ট্যাপ করলে করব লাইনে বসবে। চাইলে বদলাতে পারেন।",
  "q2.tiny.1": "প্ল্যানের প্রথম লাইনটা লিখুন", "q2.tiny.2": "5 মিনিটের টাইমার দিয়ে শুরু করুন", "q2.tiny.3": "যে ফাইল বা বই লাগবে সেটা খুলুন",
  "q2.tiny.4": "একজনকে বলুন কী করবেন", "q2.tiny.5": "প্রথম জিনিসটা টেবিলে রাখুন",
};

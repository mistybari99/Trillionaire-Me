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
  // Q-11 worksheet + plan table
  "q2.ws.h": "Obstacle and first action", "q2.ws.intro": "All optional. Say what could get in the way, what you will do then, and your first action.",
  "q2.tbl.h": "Plan table", "q2.tbl.link": "Open the table view", "q2.tbl.back": "Back to the goal", "q2.tbl.notset": "Not set",
  "q2.tbl.objective": "Objective", "q2.tbl.steps": "Steps", "q2.tbl.success": "Success looks like", "q2.tbl.time": "Time frame", "q2.tbl.resources": "Resources",
  "q2.tbl.stepsn": "{n} open steps", "q2.tbl.edit": "Fill the empty rows on the goal page.", "q2.tbl.missing": "This goal was not found.",
  // Q-30 SMART wizard + checklist
  "q2.sm.h": "SMART guide, step by step", "q2.sm.intro": "Two ways to answer. Both save to the SMART form below. Skip anything you are not sure about.",
  "q2.sm.mode.wiz": "Step by step", "q2.sm.mode.chk": "Checklist",
  "q2.wz.of": "Question {n} of {m}",
  "q2.wz.q.specific": "What exactly will you do or get, in plain words?", "q2.wz.q.measurable": "How will you know it is done? Write a number or a sign.",
  "q2.wz.q.achievable": "Why is it within reach with your time and resources?", "q2.wz.q.relevant": "Why does this matter to you?", "q2.wz.q.timebound": "By which date do you want it done?",
  "q2.wz.skip": "Not sure, skip", "q2.wz.back": "Back", "q2.wz.next": "Save and next", "q2.wz.finish": "Save and finish", "q2.wz.done": "Done. Your answers are in the SMART form below.",
  "q2.ck.q.specific": "Can you say it in one clear sentence?", "q2.ck.q.measure": "Is there a number or a sign that shows it is done?", "q2.ck.q.reach": "Is it within reach with your time and resources?",
  "q2.ck.q.matters": "Does it matter to you?", "q2.ck.q.date": "Does it have a date?", "q2.ck.q.first": "Do you know the first step?", "q2.ck.q.written": "Is it written down?",
  "q2.ck.yes": "Yes", "q2.ck.no": "No", "q2.ck.unknown": "Not sure", "q2.ck.sum": "{y} yes, {n} no, {u} not sure. This is only a guide.",
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
  "q2.ws.h": "বাধা আর প্রথম কাজ", "q2.ws.intro": "সবই ইচ্ছামতো। কী বাধা হতে পারে, তখন কী করবেন আর প্রথম কাজ কী, লিখুন।",
  "q2.tbl.h": "প্ল্যান টেবিল", "q2.tbl.link": "টেবিল ভিউ খুলুন", "q2.tbl.back": "গোলে ফিরুন", "q2.tbl.notset": "ঠিক করা হয়নি",
  "q2.tbl.objective": "উদ্দেশ্য", "q2.tbl.steps": "ধাপ", "q2.tbl.success": "কী হলে সফল", "q2.tbl.time": "সময়সীমা", "q2.tbl.resources": "যা লাগবে",
  "q2.tbl.stepsn": "{n}টা চলমান ধাপ", "q2.tbl.edit": "ফাঁকা সারিগুলো গোলের পেজে ভরুন।", "q2.tbl.missing": "এই গোল পাওয়া যায়নি।",
  "q2.sm.h": "SMART গাইড, ধাপে ধাপে", "q2.sm.intro": "উত্তর দেওয়ার দুইটা উপায়। দুটোই নিচের SMART ফর্মে সেভ হয়। যেটা নিশ্চিত না, স্কিপ করুন।",
  "q2.sm.mode.wiz": "ধাপে ধাপে", "q2.sm.mode.chk": "চেকলিস্ট",
  "q2.wz.of": "{m}টার মধ্যে {n} নম্বর প্রশ্ন",
  "q2.wz.q.specific": "ঠিক কী করবেন বা কী পাবেন, সহজ কথায় লিখুন।", "q2.wz.q.measurable": "কীভাবে বুঝবেন হয়ে গেছে? একটা সংখ্যা বা চিহ্ন লিখুন।",
  "q2.wz.q.achievable": "আপনার সময় আর সম্পদ দিয়ে এটা কেন সম্ভব?", "q2.wz.q.relevant": "এটা কেন আপনার কাছে জরুরি?", "q2.wz.q.timebound": "কোন তারিখের মধ্যে শেষ করতে চান?",
  "q2.wz.skip": "নিশ্চিত না, স্কিপ", "q2.wz.back": "পেছনে", "q2.wz.next": "সেভ করে পরেরটা", "q2.wz.finish": "সেভ করে শেষ করুন", "q2.wz.done": "হয়ে গেছে। আপনার উত্তর নিচের SMART ফর্মে আছে।",
  "q2.ck.q.specific": "এক বাক্যে স্পষ্ট করে বলতে পারেন?", "q2.ck.q.measure": "হয়ে গেছে বোঝার মতো সংখ্যা বা চিহ্ন আছে?", "q2.ck.q.reach": "আপনার সময় আর সম্পদ দিয়ে কি এটা সম্ভব?",
  "q2.ck.q.matters": "এটা কি আপনার কাছে জরুরি?", "q2.ck.q.date": "এর কি একটা তারিখ আছে?", "q2.ck.q.first": "প্রথম ধাপ কী, জানেন?", "q2.ck.q.written": "এটা কি লিখে রাখা আছে?",
  "q2.ck.yes": "হ্যাঁ", "q2.ck.no": "না", "q2.ck.unknown": "নিশ্চিত না", "q2.ck.sum": "{y}টা হ্যাঁ, {n}টা না, {u}টা নিশ্চিত না। এটা শুধু গাইড।",
};

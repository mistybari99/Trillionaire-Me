// Daily inspiration board. Works fully offline: picks one card per day from a bundled list.
// Each card has Bangla and English text (both always shown). Copy is neutral: no streaks, no shame.
export interface Inspiration { readonly bn: string; readonly en: string; readonly theme: "motivation" | "discipline" | "patience" | "care" }

export const INSPIRATIONS: readonly Inspiration[] = [
  { theme: "motivation", bn: "ছোট একটা পদক্ষেপও আজকের জন্য যথেষ্ট।", en: "One small step is enough for today." },
  { theme: "discipline", bn: "নিয়মিত অল্প কাজই বড় পরিবর্তন আনে।", en: "Small, regular work builds big change." },
  { theme: "patience", bn: "ধৈর্য মানে থেমে যাওয়া নয়, ধীরে এগিয়ে যাওয়া।", en: "Patience is not stopping; it is moving slowly forward." },
  { theme: "care", bn: "নিজের প্রতি একটু দয়া রাখো, তুমি এখানেই আছ।", en: "Be a little kind to yourself. You are still here." },
  { theme: "motivation", bn: "আজ যা করতে পারো, সেটাই করো।", en: "Do what you can today." },
  { theme: "discipline", bn: "সময় বাঁধো, কাজ নিজে থেকেই শুরু হবে।", en: "Set a time, and the work will start on its own." },
  { theme: "motivation", bn: "লক্ষ্য বড় হোক, কিন্তু প্রথম ধাপ ছোট হোক।", en: "Keep the goal big and the first step small." },
  { theme: "patience", bn: "ফল পেতে সময় লাগে, তবু প্রতিদিনের কাজ গোনা হয়।", en: "Results take time, but each day's work still counts." },
  { theme: "discipline", bn: "মন না চাইলেও পাঁচ মিনিট শুরু করো।", en: "Even when you do not feel like it, start for five minutes." },
  { theme: "care", bn: "ক্লান্ত লাগলে বিশ্রাম নেওয়াও একটি কাজ।", en: "When tired, resting is also work." },
  { theme: "motivation", bn: "তুমি যা শিখছ, তা কোনোদিন বৃথা যায় না।", en: "What you learn is never wasted." },
  { theme: "discipline", bn: "আজকের তিনটি কাজই যথেষ্ট, বেশি লাগবে না।", en: "Three tasks for today are enough. You do not need more." },
  { theme: "patience", bn: "একটু একটু করে এগোলেই দূরত্ব কমে।", en: "Move a little at a time and the distance shrinks." },
  { theme: "motivation", bn: "নিজের গতিতে চলো, অন্যের সাথে তুলনা না করে।", en: "Move at your own pace, without comparing yourself to others." },
  { theme: "care", bn: "আজ কম হলেও ঠিক আছে, আবার কাল শুরু করা যাবে।", en: "Less today is fine. You can begin again tomorrow." },
];

/** Day number since epoch in local time, so the card changes at local midnight. */
export function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function todaysInspiration(date: Date, list: readonly Inspiration[] = INSPIRATIONS): Inspiration {
  const n = list.length;
  const i = ((dayIndex(date) % n) + n) % n;
  return list[i]!;
}

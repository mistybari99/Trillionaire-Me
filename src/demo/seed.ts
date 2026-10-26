// Synthetic demo content for the One-Focus Home. Constants only — never written to the real namespace.
import type { Bi } from "../i18n/registry";

export interface StageDef { code: string; name: Bi; exit: Bi }
// Default journey template (Spec §3.4): editable, not a prediction.
export const STAGES: StageDef[] = [
  { code: "A", name: { bn: "স্পষ্টতা — নিজেকে চেনা", en: "Clarity — know yourself" }, exit: { bn: "মূল্যায়নের নির্ধারিত অংশ সম্পূর্ণ; লক্ষ্য ঠিক", en: "Assessment section complete; goal chosen" } },
  { code: "B", name: { bn: "ভিত্তি — দক্ষতা ও প্রাথমিক আয়", en: "Foundation — skills & first income" }, exit: { bn: "নির্বাচিত দক্ষতার প্রমাণ; প্রথম ফল", en: "Evidence for chosen skill; first result" } },
  { code: "C", name: { bn: "যাচাইকৃত প্রস্তাব", en: "Validated offer" }, exit: { bn: "প্রকৃত চাহিদার প্রমাণ", en: "Proof of real demand" } },
  { code: "D", name: { bn: "পুনরাবৃত্তিযোগ্য (স্থানীয়)", en: "Repeatable (local)" }, exit: { bn: "নির্ধারিত মাস ধরে স্থির ফল", en: "Steady results over set months" } },
  { code: "E", name: { bn: "সিস্টেমে আনা", en: "Systemised" }, exit: { bn: "কাজ হস্তান্তরযোগ্য", en: "Work can be handed over" } },
  { code: "F", name: { bn: "আঞ্চলিক / জাতীয়", en: "Regional / national" }, exit: { bn: "স্কেল-ধাপ পূরণ", en: "Scale stage met" } },
  { code: "G", name: { bn: "আন্তর্জাতিক পাইলট", en: "International pilot" }, exit: { bn: "পাইলটের ফল", en: "Pilot results" } },
  { code: "H", name: { bn: "আন্তর্জাতিক স্কেল", en: "International scale" }, exit: { bn: "মালিক-অনুমোদিত সীমা", en: "Owner-approved threshold" } },
];

export const DEMO_CURRENT_STAGE = 0; // index into STAGES
export const DEMO_DATE: Bi = { bn: "২২ অক্টোবর", en: "22 October" };

export interface DemoTask { title: Bi; minutes: number; hint: Bi }
export const DEMO_TASKS: DemoTask[] = [
  { title: { bn: "দক্ষতা ও আগ্রহের তালিকা পূরণ", en: "Fill in skills and interests" }, minutes: 10, hint: { bn: "অজানা থাকলে “পরে” বেছে নিন", en: "If unsure, pick “Later”" } },
  { title: { bn: "সপ্তাহের সময়ের সীমা ঠিক করা", en: "Set your weekly time limits" }, minutes: 5, hint: { bn: "নামাজ, পরিবার, বিশ্রাম আগে বসবে", en: "Worship, family and rest go in first" } },
];

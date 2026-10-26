// O6: editable stage templates. A template changes stage NAMES and the exit text only.
// Codes A–H, their order, the conditions and every past stage pass stay exactly the same.
// "default" is the journey template from the Spec (§3.4). Bangla text in the other templates is a draft (যাচাই হয়নি).
import { STAGES, type StageDef } from "../demo/seed";
import type { Bi } from "../i18n/registry";

export const TEMPLATE_IDS = ["default", "learning", "business"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export const isTemplateId = (v: unknown): v is TemplateId => (TEMPLATE_IDS as readonly unknown[]).includes(v);

const s = (code: string, name: Bi, exit: Bi): StageDef => ({ code, name, exit });

const LEARNING: StageDef[] = [
  s("A", { bn: "শুরু — লক্ষ্য ও সময় ঠিক", en: "Start — goal and time set" }, { bn: "লক্ষ্য লেখা ও সময়ের সীমা ঠিক", en: "Goal written and time limits set" }),
  s("B", { bn: "বোঝা — প্রথম বই বা কোর্স", en: "Understand — first book or course" }, { bn: "প্রথম বিষয়ের নিজের নোট ও ছোট পরীক্ষা", en: "Own notes and a small test on the first topic" }),
  s("C", { bn: "অনুশীলন — নিয়মিত কাজ", en: "Practice — regular exercises" }, { bn: "নিজের হাতে তৈরি একটি কাজ শেষ", en: "One piece of your own work finished" }),
  s("D", { bn: "ধারাবাহিকতা — নির্ধারিত মাস", en: "Consistency — set months" }, { bn: "নির্ধারিত মাস ধরে নিয়মিত চর্চার লগ", en: "Practice log kept over the set months" }),
  s("E", { bn: "ভাগ করা — অন্যকে শেখানো", en: "Share — teach others" }, { bn: "অন্তত একজনকে শেখানো বা লেখা", en: "Taught or wrote for at least one other person" }),
  s("F", { bn: "স্বীকৃতি — প্রমাণপত্র", en: "Recognition — proof" }, { bn: "বাইরের যাচাইয়ের প্রমাণ", en: "Proof from an outside check" }),
  s("G", { bn: "প্রয়োগ — বাস্তব কাজে ব্যবহার", en: "Apply — use it in real work" }, { bn: "বাস্তব কাজের ফল লেখা", en: "Real-work results written down" }),
  s("H", { bn: "দক্ষতা পূর্ণ — নিজস্ব পথ", en: "Mastery — your own path" }, { bn: "মালিক-অনুমোদিত সীমা", en: "Owner-approved threshold" }),
];

const BUSINESS: StageDef[] = [
  s("A", { bn: "স্পষ্টতা — ক্রেতা ও সমস্যা চেনা", en: "Clarity — know your buyer and problem" }, { bn: "কে কিনবে ও কেন, তা লেখা", en: "Who buys and why, written down" }),
  s("B", { bn: "প্রথম বিক্রি — ছোট পরীক্ষা", en: "First sale — small test" }, { bn: "প্রথম বিক্রি বা অর্ডারের প্রমাণ", en: "Proof of a first sale or order" }),
  s("C", { bn: "যাচাইকৃত প্রস্তাব", en: "Validated offer" }, { bn: "বারবার কেনার আগ্রহের প্রমাণ", en: "Proof that people buy again" }),
  s("D", { bn: "স্থির আয় — স্থানীয়", en: "Steady income — local" }, { bn: "নির্ধারিত মাস ধরে স্থির আয়ের হিসাব", en: "Income record steady over set months" }),
  s("E", { bn: "নিয়মে আনা — সহজ ধাপ", en: "Systemised — simple steps" }, { bn: "কাজের ধাপ লেখা, অন্যকেও দেওয়া যায়", en: "Steps written so someone else can do them" }),
  s("F", { bn: "বড় পরিসর — আঞ্চলিক", en: "Wider reach — regional" }, { bn: "পরিসর বাড়ানোর পরিকল্পনা ও হিসাব", en: "Scale plan and numbers ready" }),
  s("G", { bn: "নতুন বাজার — পাইলট", en: "New market — pilot" }, { bn: "পাইলটের ফল", en: "Pilot results" }),
  s("H", { bn: "আন্তর্জাতিক পরিসর", en: "International reach" }, { bn: "মালিক-অনুমোদিত সীমা", en: "Owner-approved threshold" }),
];

export const TEMPLATES: Record<TemplateId, { name: Bi; stages: StageDef[] }> = {
  default: { name: { bn: "ডিফল্ট যাত্রা", en: "Default journey" }, stages: STAGES },
  learning: { name: { bn: "শেখার যাত্রা", en: "Learning journey" }, stages: LEARNING },
  business: { name: { bn: "ব্যবসার যাত্রা", en: "Business journey" }, stages: BUSINESS },
};

/** The stage list to show for a template. Unknown ids fall back to the default. */
export const stagesFor = (id: unknown): StageDef[] => (isTemplateId(id) ? TEMPLATES[id] : TEMPLATES.default).stages;

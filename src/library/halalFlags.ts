// DRAFT halal-check FLAGS (audit M5). Questions to ask, never a ruling. NOT a fatwa: ask a qualified person.
// No scripture text, no verdict, no product names, no rates. Every flag is reviewer pending until a qualified reviewer signs off.
import type { Bi } from "../i18n/registry";

export type FlagGroup = "interest" | "uncertainty" | "sector" | "terms" | "sharing" | "scholar";
export const FLAG_GROUPS: readonly FlagGroup[] = ["interest", "uncertainty", "sector", "terms", "sharing", "scholar"];
export interface HalalFlag { id: string; group: FlagGroup; q: Bi }

const f = (id: string, group: FlagGroup, bn: string, en: string): HalalFlag => ({ id, group, q: { bn, en } });

export const HALAL_FLAGS: readonly HalalFlag[] = [
  f("hf-int-1", "interest", "এই প্রোডাক্টে সময়ের কারণে কি একটি নির্দিষ্ট বাড়তি অঙ্ক দেওয়া বা নেওয়া হয়?", "Does this product pay or charge a fixed extra amount because of time?"),
  f("hf-int-2", "interest", "দেরিতে শোধ করলে যে বাড়তি চার্জ লাগে, তা কে পায় এবং কীভাবে হিসাব হয়?", "If a payment is late, who receives the extra charge and how is it worked out?"),
  f("hf-unc-1", "uncertainty", "আপনি কী পাবেন, কবে পাবেন এবং কত দামে, সবই কি লিখিতভাবে পরিষ্কার?", "Is it clear in writing what you get, when you get it and at what price?"),
  f("hf-unc-2", "uncertainty", "ফলটি কি মূলত ভাগ্যের ওপর নির্ভর করে, যেমন লটারি বা বাজির মতো?", "Does the result depend mainly on chance, like a lottery or a bet?"),
  f("hf-sec-1", "sector", "ব্যবসাটির প্রধান কাজ কী? তার কোনো অংশ কি এমন ক্ষেত্রে পড়ে যা আপনার আলেম এড়াতে বলেছেন?", "What is the main activity of the business? Does any part fall in an area your scholar has told you to avoid?"),
  f("hf-sec-2", "sector", "আয়ের একটি বড় অংশ কি এমন উৎস থেকে আসে যা নিয়ে আপনার প্রশ্ন আছে?", "Does a large part of its income come from a source you have questions about?"),
  f("hf-trm-1", "terms", "সব শর্ত, ফি এবং বন্ধ করার নিয়ম কি দুই পক্ষই লিখিতভাবে জানে?", "Do both sides know every term, fee and way to close, in writing?"),
  f("hf-trm-2", "terms", "কোনো লুকানো ফি বা পরে বদলে যাওয়া শর্ত আছে কি?", "Is there any hidden fee or a term that can change later?"),
  f("hf-shr-1", "sharing", "কাজটি ভালো না গেলে ক্ষতি কে বহন করে? কাউকে কি নির্দিষ্ট ফলের কথা দেওয়া হয়েছে?", "If it goes badly, who carries the loss? Has anyone been promised a fixed result?"),
  f("hf-shr-2", "sharing", "অংশীদারির ভাগ আগে থেকে লিখিত আছে কি?", "Is each side's share written down beforehand?"),
  f("hf-sch-1", "scholar", "আপনি কোন যোগ্য ব্যক্তি বা বোর্ডের মত অনুসরণ করেন?", "Which qualified person or board do you follow?"),
  f("hf-sch-2", "scholar", "লিখিত শর্ত হাতে নিয়ে কি তাঁকে জিজ্ঞেস করেছেন?", "Have you asked them with the written terms in your hand?"),
];

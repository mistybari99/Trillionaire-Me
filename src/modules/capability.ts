// Capability Status registry (TM-REQ-144). Status claims must match evidence (see evidence.ts and tests/m_list_status.test.ts).
// Owner-facing meaning: "implemented" = আছে (a screen or function is reachable in the app, with a test);
// "partial" = আংশিক (only part is reachable, or only rules/data exist, no main screen);
// "not-built" = নেই (nothing user-reachable yet).
import type { Bi } from "../i18n/registry";

export type CapStatus = "implemented" | "partial" | "demo" | "offline-ok" | "internet-needed" | "not-built";
export const CAP_STATUSES: readonly CapStatus[] = ["implemented", "partial", "demo", "offline-ok", "internet-needed", "not-built"];

export interface ModuleDef { id: string; name: Bi; tab: "journey" | "diary" | "deen" | "more"; statuses: CapStatus[]; note: Bi; gate: string }

const m = (id: string, bn: string, en: string, tab: ModuleDef["tab"], statuses: CapStatus[], gate: string, nbn: string, nen: string): ModuleDef =>
  ({ id, name: { bn, en }, tab, statuses, gate, note: { bn: nbn, en: nen } });

const NONE_BN = "এখনো কিছু বানানো হয়নি।";
const NONE_EN = "Not built yet.";

export const MODULES: ModuleDef[] = [
  m("M01", "Profile ও সম্মতি", "Profile & consent", "diary", ["implemented", "demo", "offline-ok"], "G1", "ধাপে ধাপে তথ্য লেখার পর্দা আছে। তথ্য শুধু Demo-তে যায়; আসল তথ্য বন্ধ।", "Step-by-step entry screen works. Data goes to Demo only; real data is locked."),
  m("M02", "নিজেকে চেনা (মূল্যায়ন)", "Discover (assessment)", "journey", ["implemented", "demo", "offline-ok"], "G3", "আগ্রহ, দক্ষতা ও শক্তি লিখলে পরিকল্পনা পাতায় মিলিয়ে কার্ড দেখায়।", "Enter interests, skills and strengths; the Plan screen shows matching cards."),
  m("M03", "মূল লক্ষ্য ও ধাপ-সিঁড়ি", "North Star & ladder", "journey", ["partial", "demo", "offline-ok"], "G3", "লক্ষ্য মেয়াদ অনুযায়ী সাজিয়ে দেখায় (৫ বছর থেকে আজ)। North Star ও ধাপের যুক্তি এখনো নেই।", "Shows goals by time horizon (5 years to today). North Star and its step logic are not built yet."),
  m("M04", "পথ ও সুযোগ-লাইব্রেরি", "Paths & opportunity library", "journey", ["implemented", "demo", "offline-ok"], "G3", "পরিকল্পনা পাতায় দক্ষতা ও আগ্রহ মিলিয়ে পথের কার্ড আসে। পথের তালিকা এখনো ছোট।", "Path cards on the Plan screen match your skills and interests. The path list is still short."),
  m("M05", "ধাপ ও যাত্রা-লগ", "Stages & journey log", "journey", ["implemented", "demo", "offline-ok"], "G3", "ধাপের সিঁড়ি, ধাপ পাস ও যাত্রা-লগ চলে (Demo data)।", "Stage ladder, stage pass and journey log work (Demo data)."),
  m("M06", "লক্ষ্য, কাজ ও অভ্যাস", "Goals, tasks & habits", "journey", ["implemented", "demo", "offline-ok"], "G3", "আজকের কাজ, ফোকাস টাইমার, অভ্যাস ও লক্ষ্য লেখা চলে (Demo data)।", "Today's tasks, focus timer, habits and goal entry work (Demo data)."),
  m("M07", "সম্পদ ও অর্থ", "Resources & finance", "diary", ["implemented", "demo"], "G3", "আয়, ব্যয় ও সম্পদ লিখে নিট হিসাব দেখা যায় (BDT, Demo data)। না জানা হলে 'জানা নেই' লেখা থাকে।", "Enter income, spending and assets to see a net figure (BDT, Demo data). Unknown values stay marked as unknown."),
  m("M08", "সময় ও সক্ষমতা", "Time & capacity", "diary", ["implemented", "demo", "offline-ok"], "G3", "ফ্রি সময় লিখলে আজকের কাজের সূচি তৈরি হয় (Demo data)।", "Enter free time and today's schedule is built (Demo data)."),
  m("M09", "উদ্যোগের পোর্টফোলিও", "Venture portfolio", "journey", ["partial"], "G3", "উদ্যোগের ঘরের বিবরণ আছে। লেখার পর্দা ও তালিকা এখনো নেই।", "Field definitions for ventures exist. No entry screen or list yet."),
  m("M10", "টিম ও দায়িত্ব বণ্টন", "Team & delegation", "diary", ["not-built"], "G3", NONE_BN, NONE_EN),
  m("M11", "গবেষণা ও বিকল্প", "Research & options", "more", ["implemented", "internet-needed"], "G4", "ইনপুট ঘরের 'সাহায্য' বাটনে ইন্টারনেট থাকলে Wikipedia থেকে ২-৩টি বিকল্প দেখায়। আগে খোঁজা শব্দ অফলাইনেও চলে।", "In an input's help button, shows 2-3 Wikipedia options when online. Saved searches also work offline."),
  m("M12", "বাস্তবতা বদল ও পরিকল্পনার ইতিহাস", "Reality-changed & plan history", "journey", ["partial", "demo", "offline-ok"], "G3", "কাজকে 'এখন আর সত্য নয়' বলে চিহ্নিত করা ও লগে লেখা চলে। পূর্ণ পরিকল্পনার ইতিহাস পাতা এখনো নেই।", "You can mark a task 'no longer true' and it is logged. A full plan-history screen is not built yet."),
  m("M13", "দ্বীন, ইবাদত ও আখিরাত", "Deen, ibadah & akhirah", "deen", ["partial", "demo", "offline-ok"], "G3", "আজকের পাঁচ ওয়াক্তের সময় ফোনেই হিসাব হয়; একবার চাপলে নামাজ লেখা হয়, আবার চাপলে সরে যায়। সময়ের জায়গা ও সতর্কবার্তা সেটিংসে। কুরআন, রোজা ইত্যাদির ঘর এখনো নেই। কোনো ধর্মীয় পাঠ্য নেই, ডিফল্ট ব্যক্তিগত।", "Five prayer times are calculated on the phone. One tap marks a prayer, another tap undoes it. Place and alerts are in settings. Quran, fasting and other fields have no entry screen yet. No scripture text; private by default."),
  m("M14", "স্বাস্থ্য ও পরিবার", "Health & family", "diary", ["partial"], "G3", "স্বাস্থ্য-নোটের ঘরের বিবরণ আছে। লেখার জায়গা এখনো নেই।", "A health-note field is defined. There is no place to write it yet."),
  m("M15", "ঝুঁকি ও থামার শর্ত", "Risk & stop criteria", "journey", ["not-built"], "G3", NONE_BN, NONE_EN),
  m("M16", "রিভিউ ও KPI", "Reviews & KPIs", "journey", ["implemented", "demo", "offline-ok"], "G3", "৯০ দিনের রিভিউ ও রিপোর্ট পাতা আছে (গণনা, Demo data)। KPI লক্ষ্যমাত্রা এখনো নেই।", "90-day review and report screens exist (counts, Demo data). KPI targets are not built yet."),
  m("M17", "জ্ঞান ও সূত্র", "Knowledge & sources", "more", ["implemented", "demo", "offline-ok"], "G4", "ফ্ল্যাশকার্ড ও বিষয়-গাইড চলে। সূত্র (source) আলাদা করে রাখা হয় না।", "Flashcards and topic guides work. Sources are not tracked separately yet."),
  m("M18", "ভিজ্যুয়াল স্তর", "Visual layer", "more", ["partial", "demo", "offline-ok"], "G3", "ধাপের সিঁড়ি, যাত্রার ছবি ও টিপসের ছোট ডায়াগ্রাম আছে। বাকি চার্ট পরে; প্রতিটির লেখা বিকল্প থাকবে।", "Stage ladder, journey art and small tip diagrams exist. Other charts come later, each with a text version."),
  m("M19", "অটোমেশন নিয়ম", "Automation rules", "more", ["not-built"], "G6", NONE_BN, NONE_EN),
  m("M20", "Sync, Backup ও export", "Sync, backup & export", "more", ["partial", "demo"], "G2", "Demo data-র ব্যাকআপ সেভ ও ফেরত আনা চলে ('আরও > Demo ও আসল তথ্য')। সিঙ্ক এখনো নেই; শুধু নিয়ম লেখা আছে।", "Demo backup save and restore work ('More > Demo & real data'). Sync is not built; only its rules exist."),
  m("M21", "নিরাপত্তা ও গোপনীয়তা", "Security & privacy", "more", ["implemented", "demo", "offline-ok"], "G7", "গোপন তথ্য (পাসওয়ার্ড, OTP ইত্যাদি) লিখতে দেয় না। লক-স্ক্রিন গোপন থাকে। পূর্ণ আইনি পর্যালোচনা G7-এ।", "Blocks secrets (passwords, OTP and similar). Lock screen stays private. Full legal review is at G7."),
  m("M22", "সক্ষমতার অবস্থা ও Demo", "Capability status & demo", "more", ["implemented", "offline-ok"], "G1", "এই পর্দা।", "This screen."),
  m("M23", "AI স্তর", "AI layer", "more", ["not-built", "internet-needed"], "G6", "এখনো নেই। AI ছাড়াই সব চলে; G6-এ মালিকের অনুমতি নিয়ে যোগ হবে।", "Not built. Everything works without AI; it comes in G6 with owner approval."),
  m("M24", "template লাইব্রেরি", "Template library", "more", ["partial", "offline-ok"], "G3", "৩টি ধাপ-টেমপ্লেট (সাধারণ, শেখা, ব্যবসা) বেছে নেওয়া যায়। বড় লাইব্রেরি এখনো নেই।", "Three stage templates (general, learning, business) can be chosen. A larger library is not built."),
  m("M25", "আটকে গেলে", "When stuck", "journey", ["implemented", "demo", "offline-ok"], "G3", "৬টি ট্যাপে সম্ভাব্য কারণ ও ছোট সাহায্য; AI ছাড়া।", "Six taps → likely causes and small helpers; no AI."),
];

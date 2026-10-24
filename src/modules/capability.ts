// Capability Status registry (TM-REQ-144). Status claims must match evidence/; "implemented" needs a linked passing test.
import type { Bi } from "../i18n/registry";

export type CapStatus = "implemented" | "demo" | "offline-ok" | "internet-needed" | "not-built";
export const CAP_STATUSES: readonly CapStatus[] = ["implemented", "demo", "offline-ok", "internet-needed", "not-built"];

export interface ModuleDef { id: string; name: Bi; tab: "journey" | "diary" | "deen" | "more"; statuses: CapStatus[]; note: Bi; gate: string }

const m = (id: string, bn: string, en: string, tab: ModuleDef["tab"], statuses: CapStatus[], gate: string, nbn: string, nen: string): ModuleDef =>
  ({ id, name: { bn, en }, tab, statuses, gate, note: { bn: nbn, en: nen } });

const SLOT_BN = "কাঠামো আছে (ফাঁকা), গণনা পরে";
const SLOT_EN = "Structure only (empty); calculation comes later";

export const MODULES: ModuleDef[] = [
  m("M01", "Profile ও সম্মতি", "Profile & consent", "diary", ["demo", "offline-ok"], "G1", "ধাপে ধাপে তথ্য নেওয়া চলে (Demo dataয়); আসল data বন্ধ।", "Guided intake works on demo data; real data is locked."),
  m("M02", "নিজেকে চেনা (মূল্যায়ন)", "Discover (assessment)", "journey", ["demo", "offline-ok"], "G3", "প্রশ্নসেটের কাঠামো আছে; মেলানোর নিয়ম G3-এ।", "Question schema exists; matching rules arrive in G3."),
  m("M03", "মূল লক্ষ্য ও ধাপ-সিঁড়ি", "North Star & ladder", "journey", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M04", "পথ ও সুযোগ-লাইব্রেরি", "Paths & opportunity library", "journey", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M05", "ধাপ ও যাত্রা-লগ", "Stages & journey log", "journey", ["demo", "offline-ok"], "G3", "ধাপ-সিঁড়ি Demo dataয় দেখা যায়; ধাপ পাসের নিয়ম G3-এ।", "Stage ladder shows on demo data; pass rules arrive in G3."),
  m("M06", "লক্ষ্য, কাজ ও অভ্যাস", "Goals, tasks & habits", "journey", ["demo", "offline-ok"], "G3", "আজকের কাজ Demo dataয়; ভাঙার নিয়ম G3-এ।", "Today's actions on demo data; decomposition rules in G3."),
  m("M07", "সম্পদ ও অর্থ", "Resources & finance", "diary", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M08", "সময় ও সক্ষমতা", "Time & capacity", "diary", ["demo", "offline-ok"], "G3", "সময়ের সীমা নেওয়া যায়; সূচি নির্মাণ G3-এ।", "Time limits can be entered; scheduling comes in G3."),
  m("M09", "উদ্যোগের পোর্টফোলিও", "Venture portfolio", "journey", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M10", "টিম ও দায়িত্ব বণ্টন", "Team & delegation", "diary", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M11", "গবেষণা ও বিকল্প", "Research & options", "more", ["not-built", "internet-needed"], "G4", "internet লাগবে; G1-এ কোনো network কল নেই।", "Needs internet; G1 makes no network calls."),
  m("M12", "বাস্তবতা বদল ও পরিকল্পনার ইতিহাস", "Reality-changed & plan history", "journey", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M13", "দ্বীন, ইবাদত ও আখিরাত", "Deen, ibadah & akhirah", "deen", ["demo", "offline-ok"], "G3", "স্কিমা ও গোপনীয়তা প্রস্তুত; কোনো ধর্মীয় পাঠ্য নেই, ডিফল্ট ব্যক্তিগত।", "Schema and privacy ready; no scripture text; private by default."),
  m("M14", "স্বাস্থ্য ও পরিবার", "Health & family", "diary", ["demo", "offline-ok"], "G3", "ঐচ্ছিক ও ব্যক্তিগত নোট; খালি রাখলেও সব চলে।", "Optional private note; everything works when empty."),
  m("M15", "ঝুঁকি ও থামার শর্ত", "Risk & stop criteria", "journey", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M16", "রিভিউ ও KPI", "Reviews & KPIs", "journey", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M17", "জ্ঞান ও সূত্র", "Knowledge & sources", "more", ["not-built"], "G4", SLOT_BN, SLOT_EN),
  m("M18", "ভিজ্যুয়াল স্তর", "Visual layer", "more", ["not-built"], "G3", "ধাপ-সিঁড়ি ছাড়া বাকি চার্ট পরে; প্রতিটির টেক্সট বিকল্প থাকবে।", "Only the stage ladder exists; others later, each with a text equivalent."),
  m("M19", "অটোমেশন নিয়ম", "Automation rules", "more", ["not-built"], "G6", SLOT_BN, SLOT_EN),
  m("M20", "Sync, Backup ও export", "Sync, backup & export", "more", ["not-built"], "G2", "G1-এ শুধু Demo exportের সুরক্ষা-নিয়ম আছে।", "G1 has only the export safety rules."),
  m("M21", "নিরাপত্তা ও গোপনীয়তা", "Security & privacy", "more", ["demo", "offline-ok"], "G7", "গোপন তথ্য প্রত্যাখ্যান চালু; সম্পূর্ণ আইনি পর্যালোচনা G7-এ।", "Secret rejection is on; full legal review is at G7."),
  m("M22", "সক্ষমতার অবস্থা ও Demo", "Capability status & demo", "more", ["implemented", "offline-ok"], "G1", "এই পর্দা।", "This screen."),
  m("M23", "AI স্তর", "AI layer", "more", ["not-built", "internet-needed"], "G6", "AI ছাড়াই সব চলবে; G6-এ যোগ হবে।", "Everything works without AI; added in G6."),
  m("M24", "template লাইব্রেরি", "Template library", "more", ["not-built"], "G3", SLOT_BN, SLOT_EN),
  m("M25", "আটকে গেলে", "When stuck", "journey", ["demo", "offline-ok"], "G3", "৬টি ট্যাপে সম্ভাব্য কারণ ও ছোট সাহায্য; AI ছাড়া।", "Six taps → likely causes and small helpers; no AI."),
];

// The 20-category Life Success library from the owner's design (23 Oct 2026) + Deen as the 21st (Spec DP-12: first-class).
// Categories are the KNOWLEDGE library; navigation stays task-based (5 tabs). Tags attach to entries, not to pages.
import type { Bi } from "../i18n/registry";

export type Layer = "goal_architecture" | "human_capability" | "obstacle_solution" | "execution_growth";
export type Tab = "today" | "journey" | "diary" | "deen" | "more";

export interface Category { id: string; name: Bi; layer: Layer; modules: string[]; tab: Tab; sensitive?: "health" | "mental_health" | "money" | "worship" }

const c = (id: string, bn: string, en: string, layer: Layer, modules: string[], tab: Tab, sensitive?: Category["sensitive"]): Category => ({ id, name: { bn, en }, layer, modules, tab, sensitive });

export const CATEGORIES: Category[] = [
  c("self-awareness", "আত্মপরিচয় ও আত্ম-সচেতনতা", "Self-awareness & identity", "human_capability", ["M02"], "diary"),
  c("goal-strategy", "লক্ষ্য নির্ধারণ ও কৌশল", "Goal setting & strategy", "goal_architecture", ["M03", "M05", "M06", "M15"], "journey"),
  c("knowledge-learning", "জ্ঞান, শেখা ও গবেষণা", "Knowledge & learning", "human_capability", ["M11", "M17"], "diary"),
  c("skills", "দক্ষতা ও সক্ষমতা তৈরি", "Skills & competency", "human_capability", ["M02", "M06"], "diary"),
  c("decisions", "সিদ্ধান্ত ও সমস্যা সমাধান", "Decisions & problem solving", "human_capability", ["M11", "M12", "M15"], "journey"),
  c("focus", "ফোকাস ও গভীর কাজ", "Focus & deep work", "human_capability", ["M25"], "today"),
  c("procrastination", "অলসতা ও কাজ শুরু করা", "Procrastination & starting", "obstacle_solution", ["M25"], "today"),
  c("habits", "অভ্যাস, শৃঙ্খলা ও ধারাবাহিকতা", "Habits, discipline & consistency", "execution_growth", ["M06"], "today"),
  c("emotions", "আবেগ ও মানসিক স্থিতিশীলতা", "Emotional regulation & resilience", "human_capability", ["M14", "M25"], "diary", "mental_health"),
  c("health-energy", "শারীরিক স্বাস্থ্য, শক্তি ও ঘুম", "Physical health, energy & sleep", "human_capability", ["M14"], "diary", "health"),
  c("time", "সময় ব্যবস্থাপনা ও অগ্রাধিকার", "Time & prioritisation", "execution_growth", ["M08"], "diary"),
  c("execution", "পরিকল্পনা থেকে বাস্তবায়ন", "Execution & projects", "execution_growth", ["M06"], "journey"),
  c("money", "অর্থ, সম্পদ ও আর্থিক সক্ষমতা", "Money, resources & finance", "human_capability", ["M07"], "diary", "money"),
  c("relationships", "যোগাযোগ, সম্পর্ক ও নেটওয়ার্ক", "Communication & relationships", "human_capability", ["M10"], "diary"),
  c("environment", "পরিবেশ ও সিস্টেম ডিজাইন", "Environment & systems", "obstacle_solution", ["M25"], "more"),
  c("obstacles", "ব্যর্থতা, বাধা ও অনিশ্চয়তা", "Failure, obstacles & adaptation", "obstacle_solution", ["M12", "M15", "M25"], "today"),
  c("creativity", "সৃজনশীলতা ও উদ্ভাবন", "Creativity & innovation", "human_capability", ["M11"], "more"),
  c("measurement", "মেট্রিকস, রিফ্লেকশন ও উন্নতি", "Measurement, reflection & improvement", "execution_growth", ["M16"], "journey"),
  c("growth-courage", "আত্মবিশ্বাস, সাহস ও বিকাশ", "Confidence, courage & growth", "human_capability", ["M02"], "diary"),
  c("balance-meaning", "জীবনের ভারসাম্য ও অর্থ", "Life balance, meaning & sustainability", "goal_architecture", ["M13", "M14"], "deen"),
  c("deen", "দ্বীন, ইবাদত ও আখিরাত", "Deen, ibadah & akhirah", "goal_architecture", ["M13"], "deen", "worship"),
];

export const EVIDENCE_LEVELS = ["practice_based", "reviewed_literature", "expert_reviewed", "unverified"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export const CONTENT_TYPES = ["problem", "solution", "guide", "exercise", "template", "visual"] as const;

/** One library entry (the owner's tag-system table). Content is only shipped when reviewed; `unverified` never ships as advice. */
export interface LibraryEntry {
  id: string; category: string; tags: string[]; contentType: (typeof CONTENT_TYPES)[number];
  title: Bi; goalTypes: string[]; difficulty: "beginner" | "intermediate" | "advanced";
  rootCauses: string[]; recommendedActions: Bi[]; relatedSkills: string[]; relatedResources: string[];
  measurementMethod: Bi; evidenceLevel: EvidenceLevel; sources: { name: string; url?: string; date: string }[];
  safetyNotes: Bi; reviewed: boolean;
}

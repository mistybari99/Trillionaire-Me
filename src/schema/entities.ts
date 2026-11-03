// Schema skeletons. Generic, catalog-driven records so new fields/domains need no rebuild (TM-REQ-154).
// No entity or field names any industry (TM-REQ-142).
import type { Bi } from "../i18n/registry";
import { FIELDS } from "../catalog/fields";
import type { PrivacyClass } from "../catalog/types";

/** 2 = steps and habits can serve several goals (`task.goals`, `habit.goals`); version 1 records get `task.goals` from `links.goal`.
 *  3 = reminders (entity `reminder`, family FAM-REM): additive, no data rewrite (MIGRATIONS[2] only raises the number). */
export const SCHEMA_VERSION = 3;

export interface EntityDef {
  id: string; family: string; name: Bi; module: string;
  defaultPrivacy: PrivacyClass;
  /** entity ids this one may link to as parent (Goal → Subgoal → Project → Task is one entity with kind + parent) */
  parent?: string;
}

const e = (id: string, family: string, bn: string, en: string, module: string, defaultPrivacy: PrivacyClass, parent?: string): EntityDef =>
  ({ id, family, name: { bn, en }, module, defaultPrivacy, parent });

export const ENTITIES: EntityDef[] = [
  e("profile", "FAM-01", "প্রোফাইল", "Profile", "M01", "personal"),
  e("interest", "FAM-35", "আগ্রহ", "Interest", "M02", "personal"),
  e("strength", "FAM-35", "শক্তি", "Strength", "M02", "personal"),
  e("value", "FAM-35", "মূল্যবোধ", "Value", "M02", "personal"),
  e("skill", "FAM-35", "স্কিল", "Skill", "M02", "personal"),
  e("approach", "FAM-35", "কাজের ধরন (অভিজ্ঞতা, ঝুঁকির ঝোঁক, শেখার ধরন)", "Way of working (experience, risk preference, learning style)", "M02", "personal"),
  e("health_entry", "FAM-02", "স্বাস্থ্য ও পরিবারের এন্ট্রি", "Health & family entry", "M14", "health"),
  e("path_weights", "FAM-35", "পথ মেলানোর ওজন", "Path-fit weights", "M04", "personal"),
  e("resource", "FAM-35", "সম্পদ/সুবিধা", "Resource", "M02", "personal"),
  e("constraint", "FAM-35", "সীমাবদ্ধতা", "Constraint", "M08", "personal"),
  e("goal", "FAM-03", "গোল/কাজ", "Goal / task", "M06", "personal", "goal"),
  e("life_area", "FAM-35", "জীবনের দিক", "Life area", "M02", "personal"),
  e("task", "FAM-03", "কাজ", "Task", "M06", "personal", "goal"),
  e("venture", "FAM-36", "ব্যবসা/সম্পদ", "Venture / asset", "M09", "financial"),
  e("habit", "FAM-06", "অভ্যাস", "Habit", "M06", "personal"),
  e("finance_item", "FAM-07", "আর্থিক আইটেম", "Finance item", "M07", "financial"),
  e("prayer_log", "FAM-13", "নামাজ লগ", "Prayer log", "M13", "worship"),
  e("quran_activity", "FAM-13", "কুরআন চর্চা", "Quran activity", "M13", "worship"),
  e("fast", "FAM-13", "রোজা", "Fast", "M13", "worship"),
  e("zakat_snapshot", "FAM-13", "যাকাত নোট", "Zakat note", "M13", "worship"),
  e("giving", "FAM-13", "দান/সদকা", "Giving", "M13", "worship"),
  e("hajj_plan", "FAM-13", "হজ/উমরাহ প্ল্যান", "Hajj/Umrah plan", "M13", "worship"),
  e("learning_item", "FAM-13", "দ্বীনি শিক্ষা", "Deen learning", "M13", "worship"),
  e("right_duty", "FAM-13", "হক ও দায়িত্ব", "Rights & duties", "M13", "worship"),
  e("deen_plan", "FAM-13", "দ্বীনি প্ল্যান ও রিমাইন্ডার", "Deen plan and reminder", "M13", "worship"),
  e("deen_mark", "FAM-13", "প্ল্যানের চিহ্ন", "Plan mark", "M13", "worship"),
  e("capture", "FAM-17", "নোট/সিদ্ধান্ত", "Note / decision", "M16", "personal"),
  e("capture_item", "FAM-17", "নোট থেকে নেওয়া তথ্য", "Item from a note", "M16", "personal", "capture"),
  e("stuck_log", "FAM-40", "আটকে-যাওয়ার লগ", "Stuck log", "M25", "personal"),
  e("focus_session", "FAM-08", "ফোকাস সেশন", "Focus session", "M08", "personal", "task"),
  e("habit_log", "FAM-06", "অভ্যাসের দিন", "Habit day", "M06", "personal", "habit"),
  e("source", "FAM-04", "সোর্স", "Source", "M17", "personal"),
  e("note", "FAM-04", "নোট", "Note", "M17", "personal"),
  e("sop", "FAM-04", "SOP (ধাপে ধাপে নিয়ম)", "SOP (standard steps)", "M17", "personal"),
  e("card", "FAM-04", "কার্ড", "Flashcard", "M17", "personal"),
  e("journey_log", "FAM-39", "যাত্রা-লগ", "Journey log", "M05", "personal"),
  e("stage_pass", "FAM-39", "স্টেজ পাস", "Stage pass", "M05", "personal"),
  e("stage_gate", "FAM-39", "স্টেজের নিয়ম", "Stage rules", "M05", "personal"),
  e("stage_exit", "FAM-39", "স্টেজের শর্ত", "Stage exit condition", "M05", "personal"),
  e("risk", "FAM-03", "রিস্ক", "Risk", "M15", "personal"),
  e("team_role", "FAM-03", "কাজের রোল", "Team role", "M10", "third_party"),
  e("handover", "FAM-03", "রোল হ্যান্ডওভার", "Role hand-over", "M10", "third_party"),
  e("north_star", "FAM-03", "মেট্রিক (North Star)", "North Star measure", "M03", "personal"),
  e("kpi", "FAM-17", "KPI টার্গেট", "KPI target", "M16", "personal"),
  e("reality_event", "FAM-03", "বাস্তবতা বদলের ঘটনা", "Reality event", "M12", "personal"),
  e("plan_version", "FAM-03", "প্ল্যানের ভার্সন", "Plan version", "M12", "personal"),
  e("reminder", "FAM-REM", "রিমাইন্ডার", "Reminder", "M08", "personal"),
];

export const entityById = (id: string): EntityDef | undefined => ENTITIES.find((x) => x.id === id);
export const WORSHIP_ENTITIES: string[] = ENTITIES.filter((x) => x.defaultPrivacy === "worship").map((x) => x.id);

/** every field must belong to a declared entity (checked in tests) */
export const orphanFields = () => FIELDS.filter((f) => !entityById(f.entity));

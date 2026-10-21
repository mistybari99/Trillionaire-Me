// Schema skeletons. Generic, catalog-driven records so new fields/domains need no rebuild (TM-REQ-154).
// No entity or field names any industry (TM-REQ-142).
import type { Bi } from "../i18n/registry";
import { FIELDS } from "../catalog/fields";
import type { PrivacyClass } from "../catalog/types";

export const SCHEMA_VERSION = 1;

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
  e("skill", "FAM-35", "দক্ষতা", "Skill", "M02", "personal"),
  e("resource", "FAM-35", "সম্পদ/সুবিধা", "Resource", "M02", "personal"),
  e("constraint", "FAM-35", "সীমাবদ্ধতা", "Constraint", "M08", "personal"),
  e("goal", "FAM-03", "লক্ষ্য/কাজ", "Goal / task", "M06", "personal", "goal"),
  e("task", "FAM-03", "কাজ", "Task", "M06", "personal", "goal"),
  e("venture", "FAM-36", "উদ্যোগ/সম্পদ", "Venture / asset", "M09", "financial"),
  e("habit", "FAM-06", "অভ্যাস", "Habit", "M06", "personal"),
  e("finance_item", "FAM-07", "আর্থিক আইটেম", "Finance item", "M07", "financial"),
  e("prayer_log", "FAM-13", "নামাজ লগ", "Prayer log", "M13", "worship"),
  e("quran_activity", "FAM-13", "কুরআন চর্চা", "Quran activity", "M13", "worship"),
  e("fast", "FAM-13", "রোজা", "Fast", "M13", "worship"),
  e("zakat_snapshot", "FAM-13", "যাকাত নোট", "Zakat note", "M13", "worship"),
  e("giving", "FAM-13", "দান/সদকা", "Giving", "M13", "worship"),
  e("hajj_plan", "FAM-13", "হজ/উমরাহ পরিকল্পনা", "Hajj/Umrah plan", "M13", "worship"),
  e("learning_item", "FAM-13", "দ্বীনি শিক্ষা", "Deen learning", "M13", "worship"),
  e("right_duty", "FAM-13", "হক ও দায়িত্ব", "Rights & duties", "M13", "worship"),
  e("journey_log", "FAM-39", "যাত্রা-লগ", "Journey log", "M05", "personal"),
  e("stage_pass", "FAM-39", "ধাপ পাস", "Stage pass", "M05", "personal"),
];

export const entityById = (id: string): EntityDef | undefined => ENTITIES.find((x) => x.id === id);
export const WORSHIP_ENTITIES: string[] = ENTITIES.filter((x) => x.defaultPrivacy === "worship").map((x) => x.id);

/** every field must belong to a declared entity (checked in tests) */
export const orphanFields = () => FIELDS.filter((f) => !entityById(f.entity));

import type { Bi } from "../i18n/registry";
import type { UnknownState } from "../core/types";

export type FieldType = "text" | "number" | "money" | "choice" | "multichoice" | "date" | "scale" | "bool" | "list";

/** Privacy classes. `worship` and `health` are private by default and never leave the device without per-item authorisation. */
export type PrivacyClass = "general" | "personal" | "financial" | "health" | "worship" | "third_party";
export type AccessRule = "device_only" | "device_only_per_item_authorisation";
export type Importance = "core" | "useful" | "optional";
export type Requirement = "required" | "optional" | "conditional";

export const PURPOSES = ["assessment", "planning", "finance_basics", "time_capacity", "deen_tracking", "journey_log", "venture_registry", "habit", "safety"] as const;
export type Purpose = (typeof PURPOSES)[number];

export interface ChoiceOption { code: string; label: Bi }

export interface FieldDef {
  id: string;
  entity: string;
  family: string;
  type: FieldType;
  unit?: string;
  options?: ChoiceOption[];
  label: Bi;
  help: { what: Bi; why: Bi; example: Bi; format?: Bi };
  importance: Importance;
  requirement: Requirement;
  privacy: PrivacyClass;
  purpose: Purpose;
  access: AccessRule;
  unknownStates: readonly UnknownState[];
  /** progressive-intake step; 0 = not part of first-run intake */
  step: number;
  affects?: string;
  retention: "until_user_deletes";
  offline: "local_only";
}

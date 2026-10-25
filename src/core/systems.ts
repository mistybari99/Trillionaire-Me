// M24 template library: ready "systems" (a few goals, tasks and habits) that one tap adds.
// Pure: validation and record planning. Adding is idempotent (fixed ids; existing ids are skipped).
// Undo removes exactly what a system added (links.system), plus habit logs that point at a removed habit.
// Bangla text in every template is a draft until a reviewer signs off (reviewStatus = pending_reviewer).
import type { Bi } from "../i18n/registry";
import { latinDigits } from "../i18n/digits";
import { checkFreeText } from "./safety";
import { HORIZONS } from "./horizon";
import type { FieldValue, Label, Namespace, TMRecord } from "./types";

export const SYSTEM_SCHEMA = "tm-system-template";
export const SYSTEM_SCHEMA_VERSION = 1;
export const SYSTEM_REVIEW = "pending_reviewer";
export const PRIORITIES = ["high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface SystemGoal { key: string; title: Bi; horizon: string }
export interface SystemTask { key: string; goal: string; title: Bi; minutes: number; priority: Priority }
export interface SystemHabit { key: string; title: Bi; days: number[]; target: number | null; unit: Bi | null }
export interface SystemTemplate {
  schema: typeof SYSTEM_SCHEMA; schemaVersion: typeof SYSTEM_SCHEMA_VERSION; id: string; reviewStatus: typeof SYSTEM_REVIEW;
  name: Bi; summary: Bi; goals: SystemGoal[]; tasks: SystemTask[]; habits: SystemHabit[];
}

export type SystemResult = { ok: true; system: SystemTemplate } | { ok: false; errors: string[] };

const TOP_KEYS = new Set(["schema", "schemaVersion", "id", "reviewStatus", "name", "summary", "goals", "tasks", "habits"]);
const GOAL_KEYS = new Set(["key", "title", "horizon"]);
const TASK_KEYS = new Set(["key", "goal", "title", "minutes", "priority"]);
const HABIT_KEYS = new Set(["key", "title", "days", "target", "unit"]);
const BN_SCRIPT = /[ঀ-৿]/;
const BN_DIGIT = /[০-৯]/;
const URL_LIKE = /https?:|\bwww\.|\/\/|ftp:/i;
const ID = /^[a-z0-9-]{3,40}$/;
const KEY = /^[a-z0-9]{1,12}$/;
const MAX_TEXT = 120;
const MAX_GOALS = 3, MAX_TASKS = 8, MAX_HABITS = 3;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Checks one template object. Returns every problem (not just the first) so a broken file is easy to fix. */
export function validateSystem(raw: unknown): SystemResult {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["template is not an object"] };
  for (const k of Object.keys(raw)) if (!TOP_KEYS.has(k)) errors.push(`unknown key: ${k}`);
  if (raw.schema !== SYSTEM_SCHEMA) errors.push(`schema must be ${SYSTEM_SCHEMA}`);
  if (raw.schemaVersion !== SYSTEM_SCHEMA_VERSION) errors.push(`schemaVersion must be ${SYSTEM_SCHEMA_VERSION}`);
  if (typeof raw.id !== "string" || !ID.test(raw.id)) errors.push("id must be 3-40 chars: a-z, 0-9, -");
  if (raw.reviewStatus !== SYSTEM_REVIEW) errors.push(`reviewStatus must be ${SYSTEM_REVIEW} until a reviewer signs off`);
  const name = checkBi(raw.name, "name", errors);
  const summary = checkBi(raw.summary, "summary", errors);

  const goalKeys = new Set<string>();
  const goals: SystemGoal[] = [];
  if (!Array.isArray(raw.goals) || raw.goals.length < 1 || raw.goals.length > MAX_GOALS) errors.push(`goals must be 1-${MAX_GOALS} items`);
  else raw.goals.forEach((g, i) => {
    const at = `goals[${i}]`;
    if (!isObj(g)) { errors.push(`${at} is not an object`); return; }
    for (const k of Object.keys(g)) if (!GOAL_KEYS.has(k)) errors.push(`${at}: unknown key ${k}`);
    if (!checkKey(g.key, at, errors, goalKeys)) return;
    const title = checkBi(g.title, `${at}.title`, errors);
    if (typeof g.horizon !== "string" || !(HORIZONS as readonly string[]).includes(g.horizon)) errors.push(`${at}: horizon must be one of ${HORIZONS.join(", ")}`);
    if (title && typeof g.horizon === "string") goals.push({ key: g.key as string, title, horizon: g.horizon });
  });

  const taskKeys = new Set<string>();
  const tasks: SystemTask[] = [];
  if (!Array.isArray(raw.tasks) || raw.tasks.length < 1 || raw.tasks.length > MAX_TASKS) errors.push(`tasks must be 1-${MAX_TASKS} items`);
  else raw.tasks.forEach((tk, i) => {
    const at = `tasks[${i}]`;
    if (!isObj(tk)) { errors.push(`${at} is not an object`); return; }
    for (const k of Object.keys(tk)) if (!TASK_KEYS.has(k)) errors.push(`${at}: unknown key ${k}`);
    if (!checkKey(tk.key, at, errors, taskKeys)) return;
    const title = checkBi(tk.title, `${at}.title`, errors);
    if (typeof tk.goal !== "string" || !goalKeys.has(tk.goal)) errors.push(`${at}: goal must name a goal key in this template`);
    const minutes = tk.minutes;
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 1 || minutes > 120) errors.push(`${at}: minutes must be a whole number 1-120`);
    if (typeof tk.priority !== "string" || !(PRIORITIES as readonly string[]).includes(tk.priority)) errors.push(`${at}: priority must be high, normal or low`);
    if (title && typeof tk.goal === "string" && typeof minutes === "number" && typeof tk.priority === "string") tasks.push({ key: tk.key as string, goal: tk.goal, title, minutes, priority: tk.priority as Priority });
  });

  const habitKeys = new Set<string>();
  const habits: SystemHabit[] = [];
  if (!Array.isArray(raw.habits) || raw.habits.length > MAX_HABITS) errors.push(`habits must be 0-${MAX_HABITS} items`);
  else raw.habits.forEach((hb, i) => {
    const at = `habits[${i}]`;
    if (!isObj(hb)) { errors.push(`${at} is not an object`); return; }
    for (const k of Object.keys(hb)) if (!HABIT_KEYS.has(k)) errors.push(`${at}: unknown key ${k}`);
    if (!checkKey(hb.key, at, errors, habitKeys)) return;
    const title = checkBi(hb.title, `${at}.title`, errors);
    const days = hb.days;
    const dayOk = Array.isArray(days) && days.length > 0 && new Set(days).size === days.length && days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (!dayOk) errors.push(`${at}: days must be unique weekdays 0-6 (0 = Sunday)`);
    const target = hb.target ?? null;
    if (target !== null && (typeof target !== "number" || !Number.isInteger(target) || target < 1 || target > 100)) errors.push(`${at}: target must be null or a whole number 1-100`);
    const unit = hb.unit === undefined || hb.unit === null ? null : checkBi(hb.unit, `${at}.unit`, errors);
    if (title && dayOk && (target === null || typeof target === "number")) habits.push({ key: hb.key as string, title, days: days as number[], target: target as number | null, unit });
  });

  if (errors.length || !name || !summary) return { ok: false, errors };
  return { ok: true, system: { schema: SYSTEM_SCHEMA, schemaVersion: SYSTEM_SCHEMA_VERSION, id: raw.id as string, reviewStatus: SYSTEM_REVIEW, name, summary, goals, tasks, habits } };
}

function checkKey(k: unknown, at: string, errors: string[], seen: Set<string>): k is string {
  if (typeof k !== "string" || !KEY.test(k)) { errors.push(`${at}: key must be 1-12 chars a-z or 0-9`); return false; }
  if (seen.has(k)) { errors.push(`${at}: duplicate key ${k}`); return false; }
  seen.add(k);
  return true;
}

/** Both languages required. Bangla must contain Bangla script and Latin digits only. No links, no secret-looking text. */
function checkBi(v: unknown, at: string, errors: string[]): Bi | null {
  if (!isObj(v) || Object.keys(v).some((k) => k !== "bn" && k !== "en")) { errors.push(`${at}: needs exactly bn and en`); return null; }
  const { bn, en } = v as Record<string, unknown>;
  let ok = true;
  for (const [lang, s] of [["en", en], ["bn", bn]] as const) {
    if (typeof s !== "string" || s.trim().length === 0) { errors.push(`${at}.${lang} is empty`); ok = false; continue; }
    if (s.length > MAX_TEXT) { errors.push(`${at}.${lang} is longer than ${MAX_TEXT} characters`); ok = false; }
    if (URL_LIKE.test(s)) { errors.push(`${at}.${lang} contains a link`); ok = false; }
    if (!checkFreeText(s).ok) { errors.push(`${at}.${lang} looks like a secret`); ok = false; }
  }
  if (typeof bn === "string" && bn.trim() && !BN_SCRIPT.test(bn)) { errors.push(`${at}.bn must be Bangla`); ok = false; }
  if (typeof bn === "string" && BN_DIGIT.test(bn)) { errors.push(`${at}.bn must use Latin digits (0-9)`); ok = false; }
  return ok ? { bn: bn as string, en: en as string } : null;
}

/** Text shown for one language. Mix uses the Bangla text (Mix swaps only single UI words). Numbers are always Latin. */
export const systemText = (b: Bi, lang: "bn" | "en" | "mix"): string => latinDigits(lang === "en" ? b.en : b.bn);

export interface PlanOptions { ns: Namespace; lang: "bn" | "en" | "mix"; nowIso: string }

/** Stable record ids, so the same template always maps to the same records. */
export const systemRecordId = (systemId: string, kind: "g" | "t" | "h", key: string) => `sys-${systemId}-${kind}-${key}`;

/** The records one system adds, in order (goals, tasks, habits). Pure: nothing is written here. */
export function planSystem(sys: SystemTemplate, opts: PlanOptions): TMRecord[] {
  const demo = opts.ns === "demo";
  const lab = (text: Label): Label => (demo ? "DEMO" : text);
  const v = (value: unknown, label: Label): FieldValue => ({ state: "value", value, label: lab(label) });
  const base = (id: string, entity: string, values: Record<string, FieldValue>, links: Record<string, string>): TMRecord =>
    ({ id, entity, ns: opts.ns, ownerId: opts.ns === "demo" ? "demo-user" : "local", schemaVersion: 1, createdAt: opts.nowIso, values, links: { system: sys.id, ...links } });
  const out: TMRecord[] = [];
  const goalIds = new Map<string, string>();
  for (const g of sys.goals) {
    const id = systemRecordId(sys.id, "g", g.key);
    goalIds.set(g.key, id);
    out.push(base(id, "goal", { "goal.title": v(systemText(g.title, opts.lang), "EXTERNAL"), "goal.horizon": v(g.horizon, "EXTERNAL") }, {}));
  }
  for (const tk of sys.tasks) {
    out.push(base(systemRecordId(sys.id, "t", tk.key), "task", {
      "task.title": v(systemText(tk.title, opts.lang), "EXTERNAL"), "task.minutes": v(tk.minutes, "ESTIMATE"), "task.priority": v(tk.priority, "EXTERNAL"),
    }, { parent: goalIds.get(tk.goal)! }));
  }
  for (const hb of sys.habits) {
    const values: Record<string, FieldValue> = {
      "habit.title": v(systemText(hb.title, opts.lang), "EXTERNAL"), "habit.days": v(hb.days.join(","), "EXTERNAL"),
    };
    if (hb.target !== null) values["habit.target"] = v(hb.target, "ESTIMATE");
    if (hb.unit) values["habit.unit"] = v(systemText(hb.unit, opts.lang), "EXTERNAL");
    out.push(base(systemRecordId(sys.id, "h", hb.key), "habit", values, {}));
  }
  return out;
}

/** The part of the store the library writes to. NsStore (src/core/store.ts) satisfies it. */
export interface RecordSink {
  list(): TMRecord[];
  get(id: string): TMRecord | null;
  put(rec: TMRecord): void;
  delete(id: string): void;
}

/** Adds the system's records that are not there yet. Running it twice adds nothing the second time. */
export function addSystem(sink: RecordSink, sys: SystemTemplate, opts: PlanOptions): { added: number; skipped: number } {
  let added = 0, skipped = 0;
  for (const rec of planSystem(sys, opts)) {
    if (sink.get(rec.id)) { skipped++; continue; }
    sink.put(rec); added++;
  }
  return { added, skipped };
}

/** True when this namespace holds at least one record the system added. */
export const isSystemAdded = (recs: readonly TMRecord[], systemId: string): boolean => recs.some((r) => r.links?.system === systemId);

/** Removes what the system added, and habit logs that point at a removed habit. Other records are kept. Returns how many were removed. */
export function removeSystem(sink: RecordSink, systemId: string): number {
  const all = sink.list();
  const mine = all.filter((r) => r.links?.system === systemId);
  const habitIds = new Set(mine.filter((r) => r.entity === "habit").map((r) => r.id));
  const logs = all.filter((r) => r.entity === "habit_log" && habitIds.has(r.links?.habit ?? ""));
  const doomed = new Map([...mine, ...logs].map((r) => [r.id, r] as const));
  for (const id of doomed.keys()) sink.delete(id);
  return doomed.size;
}

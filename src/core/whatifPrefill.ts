// Live Calculator / What-if (LIVECALC-01): fills the calculator from the screen the person is on. Pure: records in, suggestions out.
// Reads only the catalog fields listed in PREFILL_FIELDS, only records of the active mode, and never turns Unknown into 0.
import type { Namespace, TMRecord } from "./types";
import { numberOrNull } from "./types";
import { financeFrom } from "./financeInputs";
import { monthlyExpenses, monthlyIncome } from "./finance";
import { zakatRow } from "./deenPlans";
import { healthRows } from "./health";

export interface Suggestion { variant: string; values: Record<string, number>; /** catalog fields the values came from */ fields: string[] }
export interface PrefillCtx { ns: Namespace; today: string; healthConsent: boolean }

/** Every catalog field the adapter reads. A test checks each one exists in the catalog. */
export const PREFILL_FIELDS: readonly string[] = [
  "habit.minutes", "habit.days_per_week", "task.minutes", "task.done_on", "work_block.date", "work_block.from", "work_block.to",
  "north_star.target", "north_star.current", "finance.kind", "finance.scope", "finance.amount", "finance.period",
  "venture.sector_inputs", "health_entry.kind", "health_entry.value", "health_entry.date",
  "zakat_snapshot.wealth", "zakat_snapshot.nisab", "zakat_snapshot.rate",
];
/** Variants that can receive a prefill, with the routes that offer it (used by the link test). */
export const PREFILL_ROUTES: Record<string, RegExp> = {
  "h-time": /^\/habits$/, "t-finish": /^\/(today|diary\/plan|focus\/[\w-]+)$/, "w-blocks": /^\/diary\/plan$/,
  "g-gap": /^\/journey\/(goals|goal\/[\w-]+|northstar|kpi)$/, "m-budget": /^\/diary\/money$/, "m-breakeven": /^\/diary\/(ventures|team)$/,
  "hl-steps": /^\/diary\/health$/, "hl-water": /^\/diary\/health$/, "d-zakat": /^\/deen(\/plans)?$/,
};

const byId = (a: TMRecord, b: TMRecord) => a.id.localeCompare(b.id);
const num = (r: TMRecord, k: string) => numberOrNull(r.values[k]);
const clock = (s: unknown): number | null => { const m = /^(\d{2}):(\d{2})$/.exec(String(s)); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

export function prefillFor(path: string, all: readonly TMRecord[], ctx: PrefillCtx): Suggestion[] {
  const recs = all.filter((r) => r.ns === ctx.ns && !r.cantOpen);
  const out: Suggestion[] = [];
  const add = (variant: string, values: Record<string, number | null>, fields: string[]) => {
    const kept = Object.fromEntries(Object.entries(values).filter((e): e is [string, number] => e[1] !== null));
    if (Object.keys(kept).length) out.push({ variant, values: kept, fields });
  };
  const on = (v: string) => (PREFILL_ROUTES[v] as RegExp).test(path);

  if (on("h-time")) {
    for (const h of recs.filter((r) => r.entity === "habit").sort(byId)) {
      const minutes = num(h, "habit.minutes"), dpw = num(h, "habit.days_per_week");
      if (minutes !== null || dpw !== null) { add("h-time", { unitCost: minutes, units: dpw }, ["habit.minutes", "habit.days_per_week"]); break; }
    }
  }
  if (on("t-finish")) {
    let sum = 0, any = false;
    for (const t of recs.filter((r) => r.entity === "task")) { const m = num(t, "task.minutes"); if (m !== null && t.values["task.done_on"]?.state !== "value") { sum += m; any = true; } }
    if (any) add("t-finish", { remaining: sum }, ["task.minutes", "task.done_on"]);
  }
  if (on("w-blocks")) {
    for (const b of recs.filter((r) => r.entity === "work_block").sort(byId)) {
      if ((b.values["work_block.date"] as { value?: unknown } | undefined)?.value !== ctx.today) continue;
      const f = clock((b.values["work_block.from"] as { value?: unknown } | undefined)?.value), t = clock((b.values["work_block.to"] as { value?: unknown } | undefined)?.value);
      if (f !== null && t !== null && t > f) { add("w-blocks", { unitCost: t - f }, ["work_block.date", "work_block.from", "work_block.to"]); break; }
    }
  }
  if (on("g-gap")) {
    for (const n of recs.filter((r) => r.entity === "north_star").sort(byId)) {
      const target = num(n, "north_star.target"), cur = num(n, "north_star.current");
      if (target !== null) { add("g-gap", { target, done: cur }, ["north_star.target", "north_star.current"]); break; }
    }
  }
  if (on("m-budget")) {
    const fv = financeFrom(recs); const inc = monthlyIncome(fv.items, "personal"), exp = monthlyExpenses(fv.items, "personal");
    add("m-budget", { income: inc.ok && fv.items.some((i) => i.kind === "income" && i.scope === "personal") ? inc.value : null, spend: exp.ok && fv.items.some((i) => i.kind === "expense" && i.scope === "personal") ? exp.value : null }, ["finance.kind", "finance.scope", "finance.amount", "finance.period"]);
  }
  if (on("m-breakeven")) {
    for (const v of recs.filter((r) => r.entity === "venture").sort(byId)) {
      const raw = v.values["venture.sector_inputs"]; if (!raw || raw.state !== "value" || typeof raw.value !== "string") continue;
      let o: unknown; try { o = JSON.parse(raw.value); } catch { continue; }
      if (!o || typeof o !== "object") continue;
      const g = (k: string) => { const x = (o as Record<string, unknown>)[k]; return typeof x === "number" && Number.isFinite(x) ? x : null; };
      const values = { fixed: g("fixed"), price: g("price"), varCost: g("varCost") };
      if (Object.values(values).some((x) => x !== null)) { add("m-breakeven", values, ["venture.sector_inputs"]); break; }
    }
  }
  if ((on("hl-steps") || on("hl-water")) && ctx.healthConsent) {
    const rows = healthRows(recs).filter((r) => r.value !== null).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const walk = rows.find((r) => r.kind === "walking"), water = rows.find((r) => r.kind === "water");
    if (walk) add("hl-steps", { perPeriod: walk.value }, ["health_entry.kind", "health_entry.value", "health_entry.date"]);
    if (water) add("hl-water", { perPeriod: water.value }, ["health_entry.kind", "health_entry.value", "health_entry.date"]);
  }
  if (on("d-zakat")) {
    const z = zakatRow(recs);
    if (z) add("d-zakat", { wealth: z.wealth, nisab: z.nisab, ratePct: z.rate }, ["zakat_snapshot.wealth", "zakat_snapshot.nisab", "zakat_snapshot.rate"]);
  }
  return out;
}

/** The variant to open first from a screen, when that screen has a natural one even with no records. */
export const ROUTE_DEFAULT: ReadonlyArray<[RegExp, string]> = [
  [/^\/habits$/, "h-gap"], [/^\/journey\/(goals|goal\/[\w-]+|northstar|kpi)$/, "g-required"], [/^\/diary\/money$/, "m-budget"], [/^\/diary\/(ventures|team)$/, "m-breakeven"],
  [/^\/diary\/health$/, "hl-steps"], [/^\/deen(\/plans)?$/, "d-zakat"], [/^\/diary\/plan$/, "w-blocks"], [/^\/(today|focus\/[\w-]+)$/, "t-task"],
];
export const defaultVariantFor = (path: string): string => ROUTE_DEFAULT.find(([re]) => re.test(path))?.[1] ?? "r-pages";

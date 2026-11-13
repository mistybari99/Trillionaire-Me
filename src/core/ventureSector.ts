// Business type on a venture (M09, BUILD-02 phase C). Pure: reads and writes the optional `venture.sector_*` values; no UI, no network.
// Unknown is never 0: a blank or skipped answer is simply absent (Unknown); a typed 0 stays 0. A formula gives a number only when every input it needs is a number.
// A family that is not in the registry any more keeps its saved answers and shows as Unknown.
import { CUSTOM_ID, evaluateFamily, getFamily, getLibFormula, resolvedFormulas } from "./sectors";
import { CUSTOM_FAMILY, buildCustomFamily, validateCustomDef, type CustomDef } from "./sectors/custom";
import { evaluateText } from "./sectors/engine";
import type { Bi, ResultKind, SectorFamily, SectorInput, UnitKind } from "./sectors";
import type { FieldValue, Label, TMRecord } from "./types";

export const SECTOR_FIELDS = { id: "venture.sector_id", inputs: "venture.sector_inputs", custom: "venture.sector_custom", checks: "venture.sector_checks" } as const;
export const MONTH_IDS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

/** Questions and risks the person ticked as thought through. Positions in the family lists. Kept per list; never counted or compared. */
export interface SectorChecks { q: number[]; r: number[] }
export interface SectorData { sectorId: string | null; inputs: Record<string, number>; custom: CustomDef | null; checks: SectorChecks }

const obj = (x: unknown): Record<string, unknown> | null => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null);
function readJson(v: FieldValue | undefined): unknown {
  if (!v || v.state !== "value" || typeof v.value !== "string") return undefined;
  try { return JSON.parse(v.value); } catch { return undefined; }
}
const idList = (x: unknown): number[] => (Array.isArray(x) ? [...new Set(x.filter((n): n is number => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b) : []);

function readCustom(x: unknown): CustomDef | null {
  const o = obj(x); if (!o || !Array.isArray(o.inputs) || !Array.isArray(o.formulas)) return null;
  const inputs: CustomDef["inputs"] = []; const formulas: CustomDef["formulas"] = [];
  for (const raw of o.inputs) {
    const i = obj(raw); if (!i || typeof i.id !== "string" || typeof i.label !== "string" || typeof i.unit !== "string") return null;
    inputs.push({ id: i.id, label: i.label, unit: i.unit as UnitKind, perPeriod: i.perPeriod === true });
  }
  for (const raw of o.formulas) {
    const f = obj(raw); if (!f || typeof f.id !== "string" || typeof f.name !== "string" || typeof f.expr !== "string") return null;
    const map = obj(f.map); const m: Record<string, string> = {};
    if (map) for (const [k, v] of Object.entries(map)) if (typeof v === "string") m[k] = v;
    formulas.push({ id: f.id, name: f.name, expr: f.expr, ...(map ? { map: m } : {}) });
  }
  return { inputs, formulas };
}

/** What is saved on a venture record. Anything that cannot be read is treated as not entered (Unknown). Never throws. */
export function readSectorData(rec: Pick<TMRecord, "values">): SectorData {
  const idv = rec.values[SECTOR_FIELDS.id];
  const sectorId = idv?.state === "value" && typeof idv.value === "string" && idv.value.trim() ? idv.value.trim() : null;
  const inputs: Record<string, number> = {};
  const raw = obj(readJson(rec.values[SECTOR_FIELDS.inputs]));
  if (raw) for (const [k, v] of Object.entries(raw)) if (typeof v === "number" && Number.isFinite(v)) inputs[k] = v;
  const checks = obj(readJson(rec.values[SECTOR_FIELDS.checks]));
  return { sectorId, inputs, custom: readCustom(readJson(rec.values[SECTOR_FIELDS.custom])), checks: { q: idList(checks?.q), r: idList(checks?.r) } };
}

/** The family a venture uses: a registry family, the person's own custom family, or null (no type chosen, or a type that is not in the registry). */
export function familyOf(data: SectorData): SectorFamily | null {
  if (!data.sectorId) return null;
  if (data.sectorId === CUSTOM_ID) return (data.custom && buildCustomFamily(data.custom)) || CUSTOM_FAMILY;
  return getFamily(data.sectorId) ?? null;
}

export interface InputState { input: SectorInput; value: number | null }
export interface ResultRow { id: string; name: Bi; kind: ResultKind; lib?: string; value: number | null; needs: string[]; missing: string[] }
export interface CheckRow { index: number; text: Bi; checked: boolean }
export interface SectorView {
  /** the saved type id (kept even when the family is gone) */
  sectorId: string | null;
  family: SectorFamily | null;
  /** true when a type is saved but the registry does not know it: answers are kept, nothing is calculated */
  removed: boolean;
  inputs: InputState[];
  /** answers saved under ids this family does not use (kept, never deleted) */
  spare: Record<string, number>;
  months: Array<{ id: string; value: number | null }>;
  results: ResultRow[];
  questions: CheckRow[];
  risks: CheckRow[];
  data: SectorData;
}

export function ventureSectorView(rec: Pick<TMRecord, "values">): SectorView {
  const data = readSectorData(rec); const family = familyOf(data);
  const removed = data.sectorId !== null && family === null;
  const ownIds = new Set((family?.inputs ?? []).map((i) => i.id));
  const spare: Record<string, number> = {};
  for (const [k, v] of Object.entries(data.inputs)) if (!ownIds.has(k) && !(family?.seasonal && (MONTH_IDS as readonly string[]).includes(k))) spare[k] = v;
  const inputs = (family?.inputs ?? []).map((input): InputState => ({ input, value: Object.prototype.hasOwnProperty.call(data.inputs, input.id) ? (data.inputs[input.id] as number) : null }));
  const months = family?.seasonal ? MONTH_IDS.map((id) => ({ id, value: Object.prototype.hasOwnProperty.call(data.inputs, id) ? (data.inputs[id] as number) : null })) : [];
  const results: ResultRow[] = [];
  if (family) {
    const out = evaluateFamily(family, data.inputs);
    for (const f of resolvedFormulas(family)) {
      const value = out[f.id] ?? null;
      results.push({ id: f.id, name: f.name, kind: f.result, ...(f.lib ? { lib: f.lib } : {}), value, needs: f.needs, missing: f.needs.filter((n) => !Object.prototype.hasOwnProperty.call(data.inputs, n)) });
    }
    if (family.seasonal) for (const id of ["seasonalitySpread", "seasonalitySpreadPct"]) {
      const lib = getLibFormula(id); if (!lib) continue;
      let value: number | null = null; try { value = evaluateText(lib.expr, data.inputs); } catch { value = null; }
      results.push({ id: `season-${id}`, name: lib.name, kind: lib.result, lib: id, value, needs: [...MONTH_IDS], missing: MONTH_IDS.filter((m) => !Object.prototype.hasOwnProperty.call(data.inputs, m)) });
    }
  }
  const rows = (list: Bi[], ticked: number[]): CheckRow[] => list.map((text, index) => ({ index, text, checked: ticked.includes(index) }));
  return { sectorId: data.sectorId, family, removed, inputs, spare, months, results, questions: rows(family?.questions ?? [], data.checks.q), risks: rows(family?.risks ?? [], data.checks.r), data };
}

// ---- writing: pure builders that return the new value map for a venture record ----

const lab = (v: unknown, label: Label): FieldValue => ({ state: "value", value: v, label });
const UNKNOWN: FieldValue = { state: "unknown" };

/** The four saved values for this data. Empty parts become Unknown, not "[]" or 0. */
export function sectorValues(data: SectorData, label: Label): Record<string, FieldValue> {
  const hasInputs = Object.keys(data.inputs).length > 0;
  const hasChecks = data.checks.q.length + data.checks.r.length > 0;
  return {
    [SECTOR_FIELDS.id]: data.sectorId ? lab(data.sectorId, label) : UNKNOWN,
    [SECTOR_FIELDS.inputs]: hasInputs ? lab(JSON.stringify(data.inputs), label) : UNKNOWN,
    [SECTOR_FIELDS.custom]: data.custom ? lab(JSON.stringify(data.custom), label) : UNKNOWN,
    [SECTOR_FIELDS.checks]: hasChecks ? lab(JSON.stringify(data.checks), label) : UNKNOWN,
  };
}

/** Sets one answer. `null` (blank or skipped) removes it: the answer is Unknown again. A typed 0 is kept as 0. */
export function withAnswer(data: SectorData, id: string, value: number | null): SectorData {
  const inputs = { ...data.inputs };
  if (value === null || !Number.isFinite(value)) delete inputs[id]; else inputs[id] = value;
  return { ...data, inputs };
}
/** Chooses the business type. The old answers stay saved, so changing the type deletes nothing. */
export const withSector = (data: SectorData, sectorId: string | null): SectorData => ({ ...data, sectorId });
export function withCustom(data: SectorData, custom: CustomDef | null): SectorData { return { ...data, custom }; }
export function withCheck(data: SectorData, list: "q" | "r", index: number, on: boolean): SectorData {
  const cur = data.checks[list].filter((i) => i !== index); if (on) cur.push(index);
  return { ...data, checks: { ...data.checks, [list]: cur.sort((a, b) => a - b) } };
}
/** Removes every saved answer (the type, the custom definition and the ticks stay). Only called after the person confirms. */
export const clearAnswers = (data: SectorData): SectorData => ({ ...data, inputs: {} });

/** Problems in a custom definition, as plain strings (empty = fine). */
export const customProblems = (def: CustomDef): string[] => validateCustomDef(def);

/** Break-even sales and the venture's monthly income, side by side. Both numbers or Unknown; no verdict is given. */
export type BreakEvenLink =
  | { state: "none" }
  | { state: "value"; breakEven: number; income: number }
  | { state: "unknown"; needs: Array<"breakEven" | "income"> };
export function breakEvenLink(view: SectorView, income: number | null): BreakEvenLink {
  const row = view.results.find((r) => r.lib === "breakEvenRevenue");
  if (!row) return { state: "none" };
  const needs: Array<"breakEven" | "income"> = [];
  if (row.value === null) needs.push("breakEven");
  if (income === null) needs.push("income");
  return needs.length ? { state: "unknown", needs } : { state: "value", breakEven: row.value as number, income: income as number };
}

/** One short line for a portfolio row: the type name, and the first calculation that has a number. */
export interface SectorSummary { family: Bi; first: { name: Bi; kind: ResultKind; value: number } | null }
export function sectorSummary(rec: Pick<TMRecord, "values">): SectorSummary | null {
  const v = ventureSectorView(rec);
  if (!v.family) return null;
  const hit = v.results.find((r) => r.value !== null);
  return { family: v.family.name, first: hit ? { name: hit.name, kind: hit.kind, value: hit.value as number } : null };
}

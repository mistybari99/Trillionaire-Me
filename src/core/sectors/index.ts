// Sector registry (BUILD-02): lookup by id, search by alias (EN/BN), family list, evaluation, and the validator used by tests.
// Families are plain data files in ./families. Add a new family by creating the file and adding one import + one line to ALL below.
import { CUSTOM_FAMILY } from "./custom";
import { evaluate, ExprError, identifiers, inferKind, kindFits, parse, UnitError } from "./engine";
import { expandLib, getLibFormula } from "./formulas";
import type { FormulaDef, LibFormulaDef, SectorFamily, SectorFormula, UnitKind, Values } from "./types";
import { RESULT_KINDS, UNIT_KINDS } from "./types";
import { foodService } from "./families/food-service";
import { retail } from "./families/retail";

export { CUSTOM_ID, buildCustomFamily, validateCustomDef } from "./custom";
export type { CustomDef } from "./custom";
export { evaluate, evaluateText, parse } from "./engine";
export { LIB_FORMULAS, getLibFormula } from "./formulas";
export * from "./types";

/** Every family, custom last. */
export const ALL_FAMILIES: SectorFamily[] = [retail, foodService, CUSTOM_FAMILY];

export const listFamilies = (): SectorFamily[] => ALL_FAMILIES;
export const getFamily = (id: string): SectorFamily | undefined => ALL_FAMILIES.find((f) => f.id === id);

const norm = (s: string) => s.trim().toLowerCase();
/** Search by name or alias in English or Bangla (substring, case-insensitive). Empty query = all families. */
export function searchFamilies(query: string, families: SectorFamily[] = ALL_FAMILIES): SectorFamily[] {
  const q = norm(query);
  if (!q) return families;
  return families.filter((f) => [f.id, f.name.en, f.name.bn, ...f.aliases.en, ...f.aliases.bn].some((w) => norm(w).includes(q)));
}

const isLib = (f: FormulaDef): f is LibFormulaDef => "use" in f;

/** Expand library formulas into plain formulas. Returns null for a library id or map that does not fit. */
export function resolveFormula(def: FormulaDef): SectorFormula | null {
  if (!isLib(def)) return { ...def };
  const lib = getLibFormula(def.use); if (!lib) return null;
  const ex = expandLib(lib, def.map); if (!ex) return null;
  return { id: def.id, name: def.name ?? lib.name, expr: ex.expr, needs: ex.needs, result: lib.result, lib: lib.id };
}
export const resolvedFormulas = (f: SectorFamily): SectorFormula[] => f.formulas.map(resolveFormula).filter((x): x is SectorFormula => x !== null);

/** One answer per formula: a number, or null = Unknown. Missing inputs, division by zero and bad expressions all give null. */
export function evaluateFamily(family: SectorFamily, values: Values): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const def of family.formulas) {
    const f = resolveFormula(def);
    if (!f) { out[def.id] = null; continue; }
    try { out[f.id] = evaluate(parse(f.expr), values); } catch { out[f.id] = null; }
  }
  return out;
}

const MIN_INPUTS = 5; const MIN_FORMULAS = 3;
const ID_RE = /^[a-z][A-Za-z0-9]*$/;
type MaybeBi = { en?: string; bn?: string } | undefined;
const biStrict = (b: MaybeBi) => !!b && typeof b.en === "string" && b.en.trim() !== "" && typeof b.bn === "string" && /[ঀ-৿]/.test(b.bn);
// A custom family holds text the user typed, in one language, so it only needs to be non-empty.
const biLoose = (b: MaybeBi) => !!b && typeof b.en === "string" && b.en.trim() !== "" && typeof b.bn === "string" && b.bn.trim() !== "";

/** Problems found in one family (empty = valid). Used by the registry test and by writers before they hand in a file. */
export function validateFamily(f: SectorFamily): string[] {
  const out: string[] = []; const p = (m: string) => out.push(`${f.id}: ${m}`);
  const bi = f.custom ? biLoose : biStrict;
  if (!ID_RE.test(f.id.replace(/-/g, "a"))) p("id must be lower-case letters, digits and hyphens");
  if (!bi(f.name)) p("name needs EN and BN");
  if (!bi(f.summary)) p("summary needs EN and BN");
  if (!f.aliases.en.length || !f.aliases.bn.length) p("aliases need EN and BN search words");
  if (f.aliases.en.some((w) => w !== w.toLowerCase())) p("English aliases are lower-case");
  if (!f.custom) {
    if (f.inputs.length < MIN_INPUTS) p(`needs at least ${MIN_INPUTS} inputs`);
    if (f.formulas.length < MIN_FORMULAS) p(`needs at least ${MIN_FORMULAS} formulas`);
    if (f.questions.length < 1) p("needs questions");
    if (f.risks.length < 1) p("needs risks");
  }
  for (const q of [...f.questions, ...f.risks]) if (!bi(q)) p("every question and risk needs EN and BN");
  const kinds: Record<string, UnitKind> = {}; const ids = new Set<string>();
  for (const i of f.inputs) {
    if (!ID_RE.test(i.id) || ["min", "max", "abs"].includes(i.id)) p(`input id "${i.id}" not allowed`);
    if (ids.has(i.id)) p(`input id "${i.id}" twice`); ids.add(i.id);
    if (!(UNIT_KINDS as readonly string[]).includes(i.unit)) p(`input "${i.id}" unit kind`);
    if (!bi(i.label)) p(`input "${i.id}" label needs EN and BN`);
    if (i.hint && !bi(i.hint)) p(`input "${i.id}" hint needs EN and BN`);
    kinds[i.id] = i.unit;
  }
  const fids = new Set<string>();
  for (const def of f.formulas) {
    if (fids.has(def.id)) p(`formula id "${def.id}" twice`); fids.add(def.id);
    const r = resolveFormula(def);
    if (!r) { p(`formula "${def.id}": unknown library formula or incomplete map`); continue; }
    if (!bi(r.name)) p(`formula "${def.id}" name needs EN and BN`);
    if (!(RESULT_KINDS as readonly string[]).includes(r.result)) p(`formula "${def.id}" result kind`);
    try {
      const node = parse(r.expr); const used = identifiers(node);
      if (used.slice().sort().join() !== [...r.needs].sort().join()) p(`formula "${def.id}": needs[] must list exactly ${used.join(", ")}`);
      const missing = used.filter((u) => !ids.has(u));
      if (missing.length) { p(`formula "${def.id}" uses unknown input ${missing.join(", ")}`); continue; }
      if (!kindFits(inferKind(node, kinds), r.result)) p(`formula "${def.id}": result kind ${r.result} does not match the expression`);
    } catch (e) {
      if (e instanceof ExprError || e instanceof UnitError) p(`formula "${def.id}": ${e.message}`); else throw e;
    }
  }
  return out;
}

/** Problems across the whole registry, including duplicate family ids. */
export function validateRegistry(families: SectorFamily[] = ALL_FAMILIES): string[] {
  const out: string[] = []; const seen = new Set<string>();
  for (const f of families) { if (seen.has(f.id)) out.push(`${f.id}: family id twice`); seen.add(f.id); out.push(...validateFamily(f)); }
  return out;
}

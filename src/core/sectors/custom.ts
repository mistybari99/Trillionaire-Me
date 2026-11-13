// The "custom" family: the user defines their own inputs and formulas (a library formula or a typed expression), so no business is left out.
// Everything is checked with the same safe parser and unit rules as the built-in families. Nothing here stores a number.
import { ExprError, UnitError, identifiers, inferKind, parse } from "./engine";
import { LIB_FORMULAS } from "./formulas";
import type { Bi, ResultKind, SectorFamily, SectorInput, UnitKind, Values } from "./types";
import { UNIT_KINDS } from "./types";

export const CUSTOM_ID = "custom";

export const CUSTOM_FAMILY: SectorFamily = {
  id: CUSTOM_ID,
  name: { en: "My own sector (custom)", bn: "আমার নিজের ধরন (কাস্টম)" },
  summary: {
    en: "None of the families fits? Define your own inputs and formulas. You supply every number; blanks stay Unknown.",
    bn: "কোনোটাই মিলছে না? নিজের ইনপুট আর ফর্মুলা লিখুন। সব সংখ্যা আপনি দেবেন; ফাঁকা থাকলে অজানা থাকবে।",
  },
  aliases: { en: ["custom", "other", "my own", "not listed"], bn: ["কাস্টম", "অন্য", "নিজের", "তালিকায় নেই"] },
  inputs: [], formulas: [], seasonal: false, custom: true,
  questions: [
    { en: "What does one sale or one customer look like in your business?", bn: "আপনার ব্যবসায় একটা বিক্রি বা একজন কাস্টমার দেখতে কেমন?" },
    { en: "Which costs rise with each sale, and which stay the same each month?", bn: "কোন খরচ প্রতি বিক্রিতে বাড়ে, আর কোনটা প্রতি মাসে একই থাকে?" },
    { en: "What limits how much you can sell (time, stock, seats, machines)?", bn: "কী আপনার বিক্রি আটকে রাখে (সময়, স্টক, সিট, মেশিন)?" },
  ],
  risks: [
    { en: "A formula only works with numbers you really know. Leave a blank if unsure.", bn: "ফর্মুলা কাজ করে শুধু যে সংখ্যা আপনি সত্যি জানেন তা দিয়ে। নিশ্চিত না হলে ফাঁকা রাখুন।" },
    { en: "Check that money and quantities are in the same period and the same unit.", bn: "টাকা আর পরিমাণ একই পিরিয়ডের আর একই ইউনিটের কি না দেখে নিন।" },
  ],
};

/** What the user writes for their own sector. Labels are single text (shown in every language). */
export interface CustomDef {
  inputs: Array<{ id: string; label: string; unit: UnitKind; perPeriod?: boolean }>;
  formulas: Array<{ id: string; name: string; /** a typed expression, or "lib:<libraryId>" with `map` */ expr: string; map?: Record<string, string> }>;
}

const ID_RE = /^[a-z][A-Za-z0-9]{0,23}$/;
const RESERVED = ["min", "max", "abs"];
const same = (t: string): Bi => ({ en: t, bn: t });

/** Problems with a user definition (empty list = fine). Never throws. */
export function validateCustomDef(def: CustomDef): string[] {
  const out: string[] = [];
  const ids = new Set<string>(); const kinds: Record<string, UnitKind> = {};
  for (const i of def.inputs) {
    if (!ID_RE.test(i.id) || RESERVED.includes(i.id)) out.push(`input id "${i.id}" is not allowed`);
    else if (ids.has(i.id)) out.push(`input id "${i.id}" is used twice`);
    else { ids.add(i.id); kinds[i.id] = i.unit; }
    if (!(UNIT_KINDS as readonly string[]).includes(i.unit)) out.push(`input "${i.id}" has an unknown unit kind`);
    if (!i.label.trim()) out.push(`input "${i.id}" needs a label`);
  }
  const fids = new Set<string>();
  for (const f of def.formulas) {
    if (!ID_RE.test(f.id)) out.push(`formula id "${f.id}" is not allowed`);
    else if (fids.has(f.id)) out.push(`formula id "${f.id}" is used twice`);
    fids.add(f.id);
    if (!f.name.trim()) out.push(`formula "${f.id}" needs a name`);
    const text = resolveCustomExpr(f);
    if (text === null) { out.push(`formula "${f.id}" uses an unknown or incomplete library formula`); continue; }
    try {
      const node = parse(text);
      for (const id of identifiers(node)) if (!ids.has(id)) out.push(`formula "${f.id}" uses "${id}", which is not one of your inputs`);
      if (identifiers(node).every((id) => ids.has(id))) inferKind(node, kinds);
    } catch (e) {
      if (e instanceof ExprError || e instanceof UnitError) out.push(`formula "${f.id}": ${e.message}`); else throw e;
    }
  }
  return out;
}

function resolveCustomExpr(f: CustomDef["formulas"][number]): string | null {
  if (!f.expr.startsWith("lib:")) return f.expr;
  const lib = LIB_FORMULAS.find((l) => l.id === f.expr.slice(4));
  if (!lib || !f.map) return null;
  for (const p of lib.params) if (typeof f.map[p.id] !== "string") return null;
  return lib.expr.replace(/[A-Za-z][A-Za-z0-9]*/g, (w) => (lib.params.some((x) => x.id === w) ? (f.map as Record<string, string>)[w] as string : w));
}

/** Build a normal family from a valid user definition. Returns null when the definition has problems. */
export function buildCustomFamily(def: CustomDef): SectorFamily | null {
  if (validateCustomDef(def).length) return null;
  const kinds: Record<string, UnitKind> = {}; for (const i of def.inputs) kinds[i.id] = i.unit;
  const inputs: SectorInput[] = def.inputs.map((i) => ({ id: i.id, label: same(i.label), unit: i.unit, perPeriod: i.perPeriod ?? false }));
  const formulas = def.formulas.map((f) => {
    const expr = resolveCustomExpr(f) as string; const node = parse(expr);
    const k = inferKind(node, kinds);
    const result: ResultKind = k === "scalar" ? "ratio" : k;
    return { id: f.id, name: same(f.name), expr, needs: identifiers(node), result };
  });
  return { ...CUSTOM_FAMILY, inputs, formulas };
}

export type { Values };

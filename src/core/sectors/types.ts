// Sector toolkit types (BUILD-02, W4). Pure data shapes: no UI, no network, no stored numbers.
// A sector family says WHICH inputs, formulas, questions and risks apply. The user supplies every number. Unknown is never 0.

/** Unit kind of an input. */
export type UnitKind = "money" | "qty" | "percent" | "days" | "count" | "rate";
/** Unit kind of a formula result. "ratio" is a plain number without a unit (for example a multiple). */
export type ResultKind = UnitKind | "ratio";
export const UNIT_KINDS: readonly UnitKind[] = ["money", "qty", "percent", "days", "count", "rate"];
export const RESULT_KINDS: readonly ResultKind[] = [...UNIT_KINDS, "ratio"];

/** Bilingual text. Bangla must follow CLAUDE.md 2b (plain, Latin digits). Mix is derived at display time. */
export interface Bi { en: string; bn: string }

export interface SectorInput {
  /** Letters and digits only, starting with a letter, for example "rent" (used in formula expressions). */
  id: string;
  label: Bi;
  unit: UnitKind;
  /** true when the figure is for one period (for example one month); false for a point figure or a per-unit figure. */
  perPeriod: boolean;
  required?: boolean;
  hint?: Bi;
}

/** A formula written out: typed expression over input ids. needs[] must list exactly the ids used. */
export interface OwnFormulaDef { id: string; name: Bi; expr: string; needs: string[]; result: ResultKind }
/** A formula taken from the shared library; map = library parameter id -> this family's input id. */
export interface LibFormulaDef { id: string; use: string; map: Record<string, string>; name?: Bi }
export type FormulaDef = OwnFormulaDef | LibFormulaDef;
/** After the registry has expanded library formulas. */
export interface SectorFormula extends OwnFormulaDef { lib?: string }

export interface SectorFamily {
  id: string;
  name: Bi;
  summary: Bi;
  /** Search words. Lower-case for English; Bangla as written. */
  aliases: { en: string[]; bn: string[] };
  inputs: SectorInput[];
  formulas: FormulaDef[];
  questions: Bi[];
  risks: Bi[];
  /** true when income or cost swings by season in this sector (user then enters monthly figures). */
  seasonal: boolean;
  related?: { paths?: string[]; halalCheck?: boolean };
  /** Only for the custom family: the user defines inputs and formulas, so the minimum counts do not apply. */
  custom?: boolean;
}

export interface LibParam { id: string; label: Bi; unit: UnitKind }
export interface LibFormula { id: string; name: Bi; params: LibParam[]; expr: string; result: ResultKind }

/** Result of one formula: null = Unknown (never 0). */
export type Num = number | null;
export type Values = Record<string, number | null | undefined>;

// M10 team roles (demo namespace). Roles only: no people's names are stored or needed.
// Unknown holder is shown as unknown, never counted as "covered" or as "open".
import type { FieldValue, TMRecord } from "./types";

export type Holder = "me" | "someone" | "open";
const HOLDERS: readonly string[] = ["me", "someone", "open"];
export interface RoleRow { id: string; role: string; holder: Holder | null }
export interface RoleSummary { total: number; open: number; unknown: number }

const str = (v: FieldValue | undefined): string | null => (v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value.trim() : null);

export function roleRows(recs: TMRecord[]): RoleRow[] {
  return recs.filter((r) => r.entity === "team_role").map((r): RoleRow => {
    const h = str(r.values["team_role.holder"]);
    return { id: r.id, role: str(r.values["team_role.role"]) ?? "", holder: h && HOLDERS.includes(h) ? (h as Holder) : null };
  }).sort((a, b) => (a.role < b.role ? -1 : a.role > b.role ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Counts for the summary line. "open" = nobody covers the role yet; "unknown" = not answered. */
export function roleSummary(rows: RoleRow[]): RoleSummary {
  return { total: rows.length, open: rows.filter((r) => r.holder === "open").length, unknown: rows.filter((r) => r.holder === null).length };
}

/** Names are refused by shape: a role line with an @ or a phone-like number is not saved. */
export function looksLikePersonContact(text: string): boolean {
  return /@|\+?\d[\d\s-]{7,}/.test(text);
}

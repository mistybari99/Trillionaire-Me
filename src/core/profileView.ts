// M01 profile read-back: name, birth year and time zone the person typed are shown and used. Pure.
// Age is a plain subtraction (this year minus birth year), labelled as an estimate; no birth year or an impossible one is Unknown, never 0.
import type { FieldValue, RecordValues } from "./types";

const val = (v: FieldValue | undefined): unknown => (v && v.state === "value" ? v.value : undefined);
export interface ProfileView { name: string | null; birthYear: number | null; age: number | null; timeZone: string | null }
export function profileView(a: RecordValues, thisYear: number): ProfileView {
  const n = val(a["profile.display_name"]), b = val(a["profile.birth_year"]), z = val(a["profile.timezone"]);
  const by = typeof b === "number" && Number.isInteger(b) && b >= 1900 && b <= thisYear ? b : null;
  return { name: typeof n === "string" && n.trim() ? n.trim() : null, birthYear: by, age: by === null ? null : thisYear - by, timeZone: typeof z === "string" && z.trim() ? z.trim() : null };
}

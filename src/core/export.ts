// Export + external-payload builder. Worship/health records leave only with per-item authorisation (TM-REQ-114);
// demo records can never be exported as real (TM-REQ-143).
import { FIELDS } from "../catalog/fields";
import type { Store } from "./store";
import type { Namespace, TMRecord } from "./types";
import { redact } from "./safety";

const privacyOf = (fieldId: string) => FIELDS.find((f) => f.id === fieldId)?.privacy ?? "personal";
const restricted = (p: string) => p === "worship" || p === "health";

export interface ExportOptions { authorisedRecordIds?: ReadonlySet<string> }

export function exportNamespace(store: Store, ns: Namespace, opts: ExportOptions = {}) {
  const records = store[ns].list();
  const authorised = opts.authorisedRecordIds ?? new Set<string>();
  const out = records.map((r): TMRecord => {
    const values: TMRecord["values"] = {};
    for (const [fid, v] of Object.entries(r.values)) {
      if (restricted(privacyOf(fid)) && !authorised.has(r.id)) continue;
      values[fid] = v.state === "value" && typeof v.value === "string" ? { ...v, value: redact(v.value) } : v;
    }
    return { ...r, values };
  });
  return { exportedNamespace: ns, kind: ns === "demo" ? "DEMO_NOT_REAL" : "real", records: out };
}

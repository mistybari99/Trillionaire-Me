// Saved finance records → calculator inputs. Only monthly income/expense feed the monthly cash flow; others are counted, not guessed.
import type { FinItem } from "./finance";
import type { FieldValue, TMRecord } from "./types";

const val = (v: FieldValue | undefined) => (v && v.state === "value" ? v.value : null);

export interface FinView { items: FinItem[]; notMonthly: number; labels: Map<string, string> }

export function financeFrom(records: TMRecord[]): FinView {
  const items: FinItem[] = []; const labels = new Map<string, string>(); let notMonthly = 0;
  for (const r of records.filter((x) => x.entity === "finance_item").sort((a, b) => a.id.localeCompare(b.id))) {
    const kind = val(r.values["finance.kind"]), scope = val(r.values["finance.scope"]), period = val(r.values["finance.period"]);
    if (!["asset", "liability", "income", "expense"].includes(String(kind)) || !["personal", "business"].includes(String(scope))) continue;
    labels.set(r.id, String(val(r.values["finance.label"]) ?? ""));
    const flow = kind === "income" || kind === "expense";
    if (flow && period !== "monthly") { notMonthly++; continue; }
    items.push({ kind: kind as FinItem["kind"], scope: scope as FinItem["scope"], amount: r.values["finance.amount"] ?? { state: "unknown" } });
  }
  return { items, notMonthly, labels };
}

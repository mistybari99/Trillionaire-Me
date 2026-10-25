import { beforeEach, describe, expect, it } from "vitest";
import { financeFrom } from "../src/core/financeInputs";
import { netWorth, monthlyCashFlow } from "../src/core/finance";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const fin = (id: string, kind: string, scope: string, amount: FieldValue, period = "monthly", label = id): TMRecord => ({ id, entity: "finance_item", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-10-24T00:00:00Z",
  values: { "finance.kind": v(kind), "finance.scope": v(scope), "finance.label": v(label), "finance.amount": amount, "finance.period": v(period) } });

describe("TM-TST-021/022/023 money inputs", () => {
  it("one-off and yearly income/expense are counted aside, never silently converted", () => {
    const fv = financeFrom([fin("a", "income", "personal", v(100)), fin("b", "expense", "personal", v(500), "yearly"), fin("c", "income", "personal", v(40), "once")]);
    expect(fv.notMonthly).toBe(2); expect(monthlyCashFlow(fv.items, "personal")).toEqual({ ok: true, value: 100, label: "ESTIMATE" });
  });
  it("assets/liabilities ignore period; scopes stay apart; unknown amount → unknown result", () => {
    const fv = financeFrom([fin("a", "asset", "personal", v(100), "once"), fin("b", "liability", "personal", { state: "unknown" }), fin("c", "asset", "business", v(9000))]);
    expect(netWorth(fv.items, "personal")).toEqual({ ok: false, reason: "unknown_inputs", missing: 1 });
    expect(netWorth(fv.items, "business")).toEqual({ ok: true, value: 9000, label: "ESTIMATE" });
  });
});

describe("money screen", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); });
  const go = (h: string) => { location.hash = h; render(); };
  it("empty start shows nothing invented", () => {
    go("#/diary/money");
    expect(document.querySelectorAll("[data-fin]").length).toBe(0);
    expect(document.querySelectorAll("[data-scope] [data-value]").length).toBe(0); // no computed numbers from nothing
    expect(document.querySelectorAll("[data-scope] [data-none]").length).toBe(6); // net worth, cash flow and 90-day cash flow, for two scopes
  });
  it("unknown amount shows 'not known yet', calculated values are labelled ESTIMATE", () => {
    store.demo.put(fin("a", "asset", "personal", { state: "unknown" }, "once", "Savings"));
    store.demo.put(fin("b", "asset", "business", v(500), "once", "Stock"));
    go("#/diary/money");
    expect(document.querySelector("[data-scope=personal] [data-unknown]")!.textContent).toMatch(/1 amount/);
    const biz = document.querySelector("[data-scope=business] [data-value]")!; expect(biz.getAttribute("data-label")).toBe("ESTIMATE");
    for (const el of document.querySelectorAll("[data-value]")) expect(["DEMO", "FACT", "ESTIMATE"]).toContain(el.getAttribute("data-label"));
  });
  it("account-number style names are rejected and not saved", () => {
    go("#/diary/money");
    (document.getElementById("mf-name") as HTMLInputElement).value = "account number 1234567890123";
    (document.getElementById("mf-amount") as HTMLInputElement).value = "10";
    document.querySelector("form[data-form=money]")!.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(store.demo.list().filter((r) => r.entity === "finance_item")).toEqual([]);
  });
  it("blank amount is saved as unknown, never 0", () => {
    go("#/diary/money");
    (document.getElementById("mf-name") as HTMLInputElement).value = "Rent";
    document.querySelector("form[data-form=money]")!.dispatchEvent(new Event("submit", { cancelable: true }));
    const r = store.demo.list().find((x) => x.entity === "finance_item")!; expect(r.values["finance.amount"]).toEqual({ state: "unknown" });
  });
});

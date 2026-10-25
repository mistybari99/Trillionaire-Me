import { beforeEach, describe, expect, it } from "vitest";
import { netWorth, monthlyCashFlow, cashFlow90Days, runwayMonths, type FinItem } from "../src/core/finance";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue } from "../src/core/types";

const v = (x: number): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const items: FinItem[] = [
  { kind: "asset", scope: "personal", amount: v(1000) },
  { kind: "liability", scope: "personal", amount: v(200) },
  { kind: "income", scope: "personal", amount: v(500) },
  { kind: "expense", scope: "personal", amount: v(300) },
];

describe("TM-TST-006 finance outputs carry a label", () => {
  it("every calculated figure is ESTIMATE and keeps its value", () => {
    expect(netWorth(items, "personal")).toEqual({ ok: true, value: 800, label: "ESTIMATE" });
    expect(monthlyCashFlow(items, "personal")).toEqual({ ok: true, value: 200, label: "ESTIMATE" });
    expect(cashFlow90Days(items, "personal")).toEqual({ ok: true, value: 600, label: "ESTIMATE" });
    expect(runwayMonths(v(900), { ok: true, value: -100, label: "ESTIMATE" })).toEqual({ ok: true, value: 9, label: "ESTIMATE" });
    expect(runwayMonths(v(900), { ok: true, value: 50, label: "ESTIMATE" })).toEqual({ ok: true, value: null, label: "ESTIMATE" });
  });
  it("unknown stays unknown: no value and no label are invented", () => {
    const withUnknown: FinItem[] = [...items, { kind: "income", scope: "personal", amount: { state: "unknown" } }];
    const r = netWorth(withUnknown.filter((i) => i.kind !== "income"), "personal");
    expect(r.ok).toBe(true);
    const m = monthlyCashFlow(withUnknown, "personal");
    expect(m).toEqual({ ok: false, reason: "unknown_inputs", missing: 1 });
    expect("value" in m || "label" in m).toBe(false);
    expect(runwayMonths({ state: "unknown" }, { ok: true, value: -10, label: "ESTIMATE" }).ok).toBe(false);
  });
});

describe("finance screen labels (bn and en)", () => {
  beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; grantConsent(consentKv, "2026-10-25T00:00:00.000Z"); });
  const go = (h: string) => { location.hash = h; render(); };
  const addAmount = (name: string, amount: string) => {
    go("#/diary/money");
    (document.getElementById("mf-name") as HTMLInputElement).value = name;
    (document.getElementById("mf-amount") as HTMLInputElement).value = amount;
    document.querySelector("form[data-form=money]")!.dispatchEvent(new Event("submit", { cancelable: true }));
  };
  it("typed amounts are real and FACT after consent (D-B); totals are ESTIMATE, each with a visible chip", () => {
    localStorage.setItem("tm:ui:lang", "en");
    addAmount("Savings", "5000");
    go("#/diary/money");
    const row = document.querySelector("[data-fin] [data-value]")!;
    expect(row.getAttribute("data-label")).toBe("FACT");
    expect(row.querySelector(".chip")!.textContent).toBe("Fact");
    const total = document.querySelector("[data-scope=personal] [data-value]")!;
    expect(total.getAttribute("data-label")).toBe("ESTIMATE");
    expect(total.querySelector(".chip")!.textContent).toBe("Estimate");
  });
  it("Bangla shows the Bangla label for ESTIMATE", () => {
    localStorage.setItem("tm:ui:lang", "bn");
    addAmount("জমা", "5000");
    go("#/diary/money");
    const total = document.querySelector("[data-scope=personal] [data-value]")!;
    expect(total.querySelector(".chip")!.textContent).toBe("আন্দাজ");
  });
});

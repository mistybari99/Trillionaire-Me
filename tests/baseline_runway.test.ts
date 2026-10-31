// TM-REQ-005: runway never reads a figure the user has not entered; no baseline means "baseline needed".
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { runwayFor, type FinItem } from "../src/core/finance";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (n: number): FieldValue => ({ state: "value", value: n, label: "FACT" });
const item = (kind: FinItem["kind"], amount: FieldValue, scope: FinItem["scope"] = "personal"): FinItem => ({ kind, scope, amount });

describe("TM-TST-005 baseline needed (runway only; emergency-fund and investment calculators do not exist yet)", () => {
  it("without an asset line, runway is baseline_needed and income/expense do not matter", () => {
    expect(runwayFor([item("income", v(1000)), item("expense", v(2000))], "personal")).toEqual({ state: "baseline_needed" });
    expect(runwayFor([], "personal")).toEqual({ state: "baseline_needed" });
  });
  it("an asset line with an unknown amount is still baseline_needed", () => {
    expect(runwayFor([item("asset", { state: "unknown" }), item("expense", v(2000))], "personal").state).toBe("baseline_needed");
  });
  it("business assets never serve as the personal baseline", () => {
    expect(runwayFor([item("asset", v(9000), "business"), item("expense", v(2000))], "personal").state).toBe("baseline_needed");
  });
  it("with a baseline: months when spending is higher, steady when income covers it, unknown flow stays unknown", () => {
    expect(runwayFor([item("asset", v(6000)), item("income", v(1000)), item("expense", v(2000))], "personal")).toMatchObject({ state: "months", value: 6, label: "ESTIMATE" });
    expect(runwayFor([item("asset", v(6000)), item("income", v(3000)), item("expense", v(2000))], "personal").state).toBe("steady");
    expect(runwayFor([item("asset", v(6000)), item("expense", { state: "unknown" })], "personal").state).toBe("unknown_flow");
  });
});

describe("baseline prompt on the Money screen", () => {
  const mk = (ns: "demo" | "real", id: string, kind: string, amount: number | null): TMRecord => { const L = ns === "demo" ? "DEMO" : "FACT"; return { id, entity: "finance_item", ns, ownerId: "o", schemaVersion: 1, createdAt: "2026-10-25T00:00:00.000Z",
    values: { "finance.kind": { state: "value", value: kind, label: L }, "finance.scope": { state: "value", value: "personal", label: L }, "finance.label": { state: "value", value: id, label: L }, "finance.period": { state: "value", value: "monthly", label: L },
      "finance.amount": amount === null ? { state: "unknown" } : { state: "value", value: amount, label: L } } }; };
  beforeEach(() => {
    localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, "2026-10-25T00:00:00.000Z");
  });
  const go = () => { location.hash = "#/diary/money"; render(); };
  it("shows the prompt (not 0) when only flow lines exist, then the figure once an asset line is added", () => {
    store.real.put(mk("real", "pay", "income", 1000)); store.real.put(mk("real", "rent", "expense", 2000));
    go();
    expect(document.querySelector("[data-baseline-needed=personal]")).not.toBeNull();
    expect(document.querySelector("[data-runway-scope=personal]")!.textContent).not.toMatch(/\b0 months|BDT 0/);
    store.real.put(mk("real", "cash", "asset", 6000)); go();
    expect(document.querySelector("[data-baseline-needed]")).toBeNull();
    expect(document.querySelector("[data-runway=months]")!.textContent).toContain("6");
  });
  it("demo lines never feed the real baseline", () => {
    store.real.put(mk("real", "rent", "expense", 2000)); store.demo.put(mk("demo", "cash", "asset", 6000)); go();
    expect(document.querySelector("[data-baseline-needed=personal]")).not.toBeNull();
  });
  it("no runway row at all when there are no income or expense lines", () => { go(); expect(document.querySelector("[data-runway]")).toBeNull(); });
});

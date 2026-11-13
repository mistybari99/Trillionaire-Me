// BUILD-02 phase C (links): the business type is reachable from the venture, goal measures, Money, Today and the report; all of it read-only except the one
// "use as the now number" action. Fixtures are invented test fixtures, not data.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { revokeConsent } from "../src/core/consent";
import { SECTOR_FIELDS } from "../src/core/ventureSector";
import { resetVentureSectorUi } from "../src/ui/ventureSectorUi";
import { PACKS } from "../src/i18n/packs";
import type { FieldValue, TMRecord } from "../src/core/types";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const qa = (s: string) => [...app().querySelectorAll(s)];
const go = (hash: string) => { location.hash = hash; render(); };
const dv = (value: unknown): FieldValue => ({ state: "value", value, label: "DEMO" });
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: "2026-11-01T00:00:00Z", values, ...(links ? { links } : {}) });
const venture = (id: string, name: string, extra: Record<string, unknown> = {}) => rec(id, "venture", { "venture.name": dv(name), ...Object.fromEntries(Object.entries(extra).map(([k, x]) => [k, dv(x)])) });
const income = (id: string, vid: string, amount: number) => rec(id, "finance_item", { "finance.kind": dv("income"), "finance.scope": dv("business"), "finance.label": dv(id), "finance.amount": dv(amount), "finance.period": dv("monthly") }, { venture: vid });
const star = (id: string, source: string) => rec(id, "north_star", { "north_star.metric": dv("Test fixture measure"), "north_star.source": dv(source), "north_star.baseline": dv(0), "north_star.target": dv(100) });
const SECTOR = { [SECTOR_FIELDS.id]: "retail", [SECTOR_FIELDS.inputs]: JSON.stringify({ price: 50, varCost: 30, fixed: 4000 }) };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv); resetVentureSectorUi();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); prefs.lang = "en"; prefs.dataMode = "demo";
  window.addEventListener("hashchange", render);
});
afterEach(() => { window.removeEventListener("hashchange", render); });

describe("goal measure link", () => {
  it("copies one result into a measure's own 'now' number, dated today; the measure stays editable and nothing else changes", () => {
    store.demo.put(venture("v1", "Test fixture venture", SECTOR)); store.demo.put(star("s1", "own"));
    go("#/diary/ventures");
    const pick = q<HTMLSelectElement>("[data-sector-goal-result]"); pick.value = "breakEvenSales";
    click("[data-sector-goal-use]");
    const s = store.demo.get("s1")!;
    expect(s.values["north_star.current"]).toMatchObject({ state: "value", value: 10000, label: "DEMO" });
    expect(s.values["north_star.current_on"]).toMatchObject({ state: "value" }); expect(s.values["north_star.target"]).toEqual(dv(100)); expect(s.values["north_star.source"]).toEqual(dv("own"));
    expect(q("[data-sector-goal]").textContent).toContain(PACKS.en["vs.goal.done"]);
  });
  it("only measures where the person types the number are offered; with none it says so and offers the measures page", () => {
    store.demo.put(venture("v1", "Test fixture venture", SECTOR)); store.demo.put(star("s1", "net_worth"));
    go("#/diary/ventures"); expect(app().querySelector("[data-sector-goal-use]")).toBeNull();
    expect(q("[data-sector-goal]").textContent).toContain(PACKS.en["vs.goal.none"]);
    expect(q("[data-sector-goal] a").getAttribute("href")).toBe("#/journey/northstar");
  });
  it("with no numbers calculated yet nothing can be copied: Unknown is not written as 0", () => {
    store.demo.put(venture("v1", "Test fixture venture", { [SECTOR_FIELDS.id]: "retail" })); store.demo.put(star("s1", "own"));
    go("#/diary/ventures"); expect(app().querySelector("[data-sector-goal-use]")).toBeNull(); expect(store.demo.get("s1")!.values["north_star.current"]).toBeUndefined();
  });
  function click(sel: string) { q<HTMLElement>(sel).click(); }
});

describe("Money: break-even next to income, read only", () => {
  it("both numbers: shows break-even sales and the venture's monthly income; no verdict word", () => {
    store.demo.put(venture("v1", "Test fixture venture", SECTOR)); store.demo.put(income("i1", "v1", 12000));
    go("#/diary/money"); const row = q("[data-venture-breakeven=v1]"); expect(row.getAttribute("data-state")).toBe("value");
    expect(row.textContent).toContain("10,000"); expect(row.textContent).toContain("12,000"); expect(row.textContent).toContain("2,000");
    expect(row.textContent).not.toMatch(/above|below|good|bad|profit|loss|safe/i);
  });
  it("income line missing: Unknown and what is needed; break-even missing: Unknown", () => {
    store.demo.put(venture("v1", "Test fixture venture", SECTOR)); go("#/diary/money");
    expect(q("[data-venture-breakeven=v1]").getAttribute("data-state")).toBe("unknown"); expect(q("[data-venture-breakeven=v1]").textContent).toContain("Unknown, needs an income line");
    store.demo.put(venture("v1", "Test fixture venture", { [SECTOR_FIELDS.id]: "retail", [SECTOR_FIELDS.inputs]: JSON.stringify({ price: 50 }) })); store.demo.put(income("i1", "v1", 0));
    go("#/diary/money"); expect(q("[data-venture-breakeven=v1]").textContent).toContain("break-even sales"); expect(q("[data-venture-breakeven=v1]").textContent).not.toContain("income line");
  });
  it("nothing is shown for a venture with no business type, or one whose type has no break-even", () => {
    store.demo.put(venture("v1", "Test fixture venture")); store.demo.put(income("i1", "v1", 5)); go("#/diary/money");
    expect(app().querySelector("[data-venture-breakeven-card]")).toBeNull();
  });
});

describe("portfolio row (venture page, Today, report)", () => {
  it("shows the type and the first calculation with a number on every place the portfolio card is drawn", () => {
    store.demo.put(venture("v1", "Test fixture venture", SECTOR));
    for (const route of ["#/diary/ventures", "#/today", "#/journey/report"]) {
      go(route); const row = q(`[data-portfolio] [data-pf-sector=v1]`); expect(row.textContent, route).toContain("Retail shop"); expect(row.textContent, route).toContain("20");
    }
  });
  it("hidden when no venture has a type; a venture with a type but no number says so", () => {
    store.demo.put(venture("v1", "Test fixture venture")); go("#/diary/ventures"); expect(qa("[data-pf-sector]")).toHaveLength(0);
    store.demo.put(venture("v1", "Test fixture venture", { [SECTOR_FIELDS.id]: "retail" })); go("#/diary/ventures");
    expect(q("[data-pf-sector=v1]").textContent).toContain(PACKS.en["vs.pf.none"]);
  });
});

// BUILD-02 phase C (UI): the "Business type" panel on a venture card. Fixtures are invented test fixtures, not data.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { readSectorData, SECTOR_FIELDS } from "../src/core/ventureSector";
import { resetVentureSectorUi } from "../src/ui/ventureSectorUi";
import { PACKS } from "../src/i18n/packs";
import type { TMRecord } from "../src/core/types";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const qa = (s: string) => [...app().querySelectorAll(s)];
const go = (hash: string) => { location.hash = hash; render(); };
const dv = (value: unknown) => ({ state: "value" as const, value, label: "DEMO" as const });
const venture = (extra: Record<string, unknown> = {}): TMRecord => ({ id: "v1", entity: "venture", ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: "2026-11-01T00:00:00Z",
  values: { "venture.name": dv("Test fixture venture, not data"), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, dv(v)])) } as TMRecord["values"] });
const realVenture = (extra: Record<string, unknown>): TMRecord => { const r = venture(extra); return { ...r, ns: "real", ownerId: "owner", values: Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v.state === "value" ? { ...v, label: "FACT" as const } : v])) }; };
const saved = () => readSectorData(store.demo.get("v1")!);
const block = () => q<HTMLDetailsElement>("[data-sector-block]");
const type = (sel: string, v: string) => { const el = q<HTMLInputElement>(sel); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
const submit = (sel: string) => q<HTMLFormElement>(sel).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const click = (sel: string) => q<HTMLElement>(sel).click();

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); prefs.lang = "en";
  window.addEventListener("hashchange", render); resetVentureSectorUi(); prefs.dataMode = "demo";
  store.demo.put(venture());
});
afterEach(() => { window.removeEventListener("hashchange", render); });

describe("the panel", () => {
  it("is on every venture card, collapsed by default, with no type chosen = Unknown and nothing saved", () => {
    go("#/diary/ventures");
    expect(block().open).toBe(false); expect(block().querySelector("summary")!.textContent).toBe(PACKS.en["vs.title"]);
    expect(block().querySelector("[data-sector-none]")!.textContent).toBe(PACKS.en["vs.none"]);
    expect(Object.keys(store.demo.get("v1")!.values).some((k) => k.startsWith("venture.sector_"))).toBe(false);
  });
  it("search finds a family by an English word and by a Bangla word; custom is always last and reachable", () => {
    go("#/diary/ventures");
    type("[data-sector-search]", "grocery"); let ids = qa("[data-sector-pick]").map((e) => e.getAttribute("data-sector-pick"));
    expect(ids).toContain("retail"); expect(ids[ids.length - 1]).toBe("custom");
    type("[data-sector-search]", "মুদি"); ids = qa("[data-sector-pick]").map((e) => e.getAttribute("data-sector-pick")); expect(ids).toContain("retail");
    type("[data-sector-search]", "qqqzzz"); ids = qa("[data-sector-pick]").map((e) => e.getAttribute("data-sector-pick"));
    expect(ids).toEqual(["custom"]); expect(q("[data-sector-nomatch]").textContent).toBe(PACKS.en["vs.search.none"]);
    expect(qa("[data-sector-select] option").map((o) => (o as HTMLOptionElement).value).pop()).toBe("custom");
  });
  it("picking a type saves only the id (DEMO) and starts the first question", () => {
    go("#/diary/ventures"); type("[data-sector-search]", "retail"); click('[data-sector-pick="retail"]');
    expect(saved().sectorId).toBe("retail"); expect(saved().inputs).toEqual({});
    expect(store.demo.get("v1")!.values[SECTOR_FIELDS.id]).toMatchObject({ label: "DEMO" });
    expect(q("[data-sector-ask]").getAttribute("data-step")).toBe("0"); expect(q("[data-sector-ask]").textContent).toContain("Question 1 of");
  });
  it("one question at a time: Skip leaves it Unknown, a typed 0 stays 0, Back goes back, a bad entry is refused", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "retail" })); go("#/diary/ventures"); click("[data-sector-start]");
    expect(q("[data-sector-input]").getAttribute("data-sector-input")).toBe("price");
    click("[data-sector-skip]"); expect(q("[data-sector-ask]").getAttribute("data-step")).toBe("1"); expect(saved().inputs).toEqual({});
    click("[data-sector-back]"); expect(q("[data-sector-ask]").getAttribute("data-step")).toBe("0");
    q<HTMLInputElement>("[data-sector-input]").value = "abc"; submit("[data-sector-ask]");
    expect(q("[data-sector-ask] .err").textContent).toBe(PACKS.en["vs.err.number"]); expect(saved().inputs).toEqual({});
    q<HTMLInputElement>("[data-sector-input]").value = "-4"; submit("[data-sector-ask]"); expect(saved().inputs).toEqual({});
    q<HTMLInputElement>("[data-sector-input]").value = "0"; submit("[data-sector-ask]");
    expect(saved().inputs).toEqual({ price: 0 }); expect(q("[data-sector-ask]").getAttribute("data-step")).toBe("1");
    q<HTMLInputElement>("[data-sector-input]").value = ""; submit("[data-sector-ask]"); expect(saved().inputs).toEqual({ price: 0 }); // blank = skipped = still Unknown
  });
  it("results show a number only when every needed answer is there; otherwise 'Unknown, needs ...'", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "retail", [SECTOR_FIELDS.inputs]: JSON.stringify({ price: 50, varCost: 30 }) })); go("#/diary/ventures");
    const margin = q("[data-sector-result=unitMargin]"); expect(margin.getAttribute("data-state")).toBe("value"); expect(margin.textContent).toContain("20");
    expect(margin.querySelector("[data-label]")!.getAttribute("data-label")).toBe("DEMO");
    const be = q("[data-sector-result=breakEvenSales]"); expect(be.getAttribute("data-state")).toBe("unknown");
    expect(be.textContent).toContain("Unknown, needs"); expect(be.textContent).toContain("Fixed costs"); expect(be.textContent).not.toMatch(/\b0\b/);
  });
  it("real mode labels results ESTIMATE; answers are written as FACT", () => {
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real"); prefs.dataMode = "real";
    store.real.put(realVenture({ [SECTOR_FIELDS.id]: "retail", [SECTOR_FIELDS.inputs]: JSON.stringify({ price: 50, varCost: 30 }) }));
    go("#/diary/ventures"); expect(q("[data-sector-result=unitMargin] [data-label]").getAttribute("data-label")).toBe("ESTIMATE");
    q<HTMLInputElement>("[data-sector-input]") ; click("[data-sector-edit=price]"); q<HTMLInputElement>("[data-sector-input]").value = "60"; submit("[data-sector-ask]");
    expect(store.real.get("v1")!.values[SECTOR_FIELDS.inputs]).toMatchObject({ label: "FACT" }); prefs.dataMode = "demo";
  });
  it("real mode without the consent tick saves nothing and says so", () => {
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); store.real.put(realVenture({ [SECTOR_FIELDS.id]: "retail" })); revokeConsent(consentKv);
    localStorage.setItem("tm:ui:dataMode", "real"); prefs.dataMode = "real";
    go("#/diary/ventures"); click("[data-sector-start]"); q<HTMLInputElement>("[data-sector-input]").value = "5"; submit("[data-sector-ask]");
    expect(q("[data-sector-ask] .err").textContent).toBeTruthy(); expect(readSectorData(store.real.get("v1")!).inputs).toEqual({}); prefs.dataMode = "demo";
  });
  it("seasonal families offer twelve month fields; saving needs numbers only and blank months stay Unknown", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "retail" })); go("#/diary/ventures");
    expect(qa("[data-sector-month]")).toHaveLength(12);
    q<HTMLInputElement>("[data-sector-month=jan]").value = "100"; q<HTMLInputElement>("[data-sector-month=feb]").value = "x"; submit("[data-sector-months]");
    expect(saved().inputs).toEqual({}); q<HTMLInputElement>("[data-sector-month=feb]").value = ""; submit("[data-sector-months]");
    expect(saved().inputs).toEqual({ jan: 100 }); expect(q("[data-sector-result=season-seasonalitySpread]").getAttribute("data-state")).toBe("unknown");
  });
  it("questions and risks are the person's own checkboxes: no counts, no percent", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "retail" })); go("#/diary/ventures");
    const box = q<HTMLInputElement>("[data-sector-check=q1]"); box.checked = true; box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(saved().checks).toEqual({ q: [1], r: [] }); expect(q<HTMLInputElement>("[data-sector-check=q1]").checked).toBe(true);
    const lists = qa("[data-sector-list]").map((e) => e.textContent ?? "").join(" ");
    expect(lists).not.toMatch(/%|\d+\s*(of|\/)\s*\d+|done|complete/i);
    q<HTMLInputElement>("[data-sector-check=q1]").checked = false; q<HTMLInputElement>("[data-sector-check=q1]").dispatchEvent(new Event("change", { bubbles: true }));
    expect(saved().checks).toEqual({ q: [], r: [] });
  });
  it("changing the type keeps the old answers; deleting them needs a second, explicit confirmation", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "retail", [SECTOR_FIELDS.inputs]: JSON.stringify({ price: 50, zzOld: 3 }) })); go("#/diary/ventures");
    click("[data-sector-change]"); expect(q("[data-sector-block]").textContent).toContain(PACKS.en["vs.change.note"]);
    type("[data-sector-search]", "restaurant"); click('[data-sector-pick="food-service"]'); expect(saved().sectorId).toBe("food-service"); expect(saved().inputs).toEqual({ price: 50, zzOld: 3 });
    click("[data-sector-reset]"); expect(q("[data-sector-confirm]")).not.toBeNull(); expect(saved().inputs).toEqual({ price: 50, zzOld: 3 });
    click("[data-sector-reset-no]"); expect(app().querySelector("[data-sector-confirm]")).toBeNull(); expect(saved().inputs).toEqual({ price: 50, zzOld: 3 });
    click("[data-sector-reset]"); click("[data-sector-reset-yes]"); expect(saved().inputs).toEqual({}); expect(saved().sectorId).toBe("food-service");
  });
  it("an unknown or removed type keeps its data and shows a plain Unknown message with no results", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "gone-family", [SECTOR_FIELDS.inputs]: JSON.stringify({ price: 9 }) })); go("#/diary/ventures");
    expect(q("[data-sector-removed]").textContent).toBe(PACKS.en["vs.removed"]); expect(app().querySelector("[data-sector-results]")).toBeNull();
    expect(saved().inputs).toEqual({ price: 9 });
  });
  it("the halal check is only a link to the existing route; a family without it shows no link", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "retail" })); go("#/diary/ventures"); expect(q("[data-sector-halal]").getAttribute("href")).toBe("#/more/halal-flags");
  });
  it("shows the advice disclaimer", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "retail" })); go("#/diary/ventures"); expect(app().querySelector("[data-disclaimer=advice]")).not.toBeNull();
  });
});

describe("custom type", () => {
  const pickCustom = () => { go("#/diary/ventures"); click('[data-sector-pick="custom"]'); };
  it("the person adds inputs and a typed formula; the formula is checked with the same safe parser; answers give numbers or Unknown", () => {
    pickCustom(); expect(q("[data-sector-custom]")).not.toBeNull();
    type("[data-custom-in-label]", "Sales"); submit("[data-custom-add-input]");
    type("[data-custom-in-label]", "Costs"); submit("[data-custom-add-input]");
    expect(saved().custom!.inputs.map((i) => i.id)).toEqual(["a1", "a2"]);
    type("[data-custom-f-name]", "Left over"); type("[data-custom-f-expr]", "a1 - a2"); submit("[data-custom-add-formula]");
    expect(saved().custom!.formulas).toEqual([{ id: "f1", name: "Left over", expr: "a1 - a2" }]);
    expect(q("[data-sector-result=f1]").getAttribute("data-state")).toBe("unknown");
    click("[data-sector-start]"); q<HTMLInputElement>("[data-sector-input]").value = "100"; submit("[data-sector-ask]");
    q<HTMLInputElement>("[data-sector-input]").value = "0"; submit("[data-sector-ask]");
    expect(q("[data-sector-result=f1]").getAttribute("data-state")).toBe("value"); expect(q("[data-sector-result=f1]").textContent).toContain("100");
  });
  it("a formula that does not fit, a secret-like text and an empty name are refused and nothing is saved", () => {
    pickCustom(); type("[data-custom-in-label]", "Sales"); submit("[data-custom-add-input]");
    type("[data-custom-f-name]", "Bad"); type("[data-custom-f-expr]", "a1 + zz"); submit("[data-custom-add-formula]");
    expect(q("[data-sector-block] .err").textContent).toContain("This does not fit"); expect(saved().custom!.formulas).toEqual([]);
    type("[data-custom-f-name]", ""); type("[data-custom-f-expr]", "a1"); submit("[data-custom-add-formula]"); expect(saved().custom!.formulas).toEqual([]);
    type("[data-custom-in-label]", "card 4111 1111 1111 1111"); submit("[data-custom-add-input]"); expect(saved().custom!.inputs).toHaveLength(1);
  });
  it("a formula can come from the shared list by choosing one of the person's inputs for each part", () => {
    pickCustom(); for (const n of ["Sales", "Costs"]) { type("[data-custom-in-label]", n); submit("[data-custom-add-input]"); }
    type("[data-custom-f-name]", "Share"); const from = q<HTMLSelectElement>("[data-custom-f-from]"); from.value = "lib"; from.dispatchEvent(new Event("change"));
    const lib = q<HTMLSelectElement>("[data-custom-f-lib]"); lib.value = "shareOfMoney"; lib.dispatchEvent(new Event("change"));
    q<HTMLSelectElement>("[data-custom-f-param=part]").value = "a2"; q<HTMLSelectElement>("[data-custom-f-param=whole]").value = "a1"; submit("[data-custom-add-formula]");
    expect(saved().custom!.formulas[0]).toMatchObject({ expr: "lib:shareOfMoney", map: { part: "a2", whole: "a1" } });
  });
  it("removing an input also removes the formulas that used it and keeps the saved answer", () => {
    store.demo.put(venture({ [SECTOR_FIELDS.id]: "custom", [SECTOR_FIELDS.custom]: JSON.stringify({ inputs: [{ id: "a1", label: "Sales", unit: "money" }, { id: "a2", label: "Costs", unit: "money" }], formulas: [{ id: "f1", name: "Left", expr: "a1 - a2" }] }), [SECTOR_FIELDS.inputs]: JSON.stringify({ a1: 5 }) }));
    go("#/diary/ventures"); click("[data-custom-remove-input=a2]");
    expect(saved().custom!.inputs.map((i) => i.id)).toEqual(["a1"]); expect(saved().custom!.formulas).toEqual([]); expect(saved().inputs).toEqual({ a1: 5 });
  });
});

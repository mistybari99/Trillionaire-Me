// M24 library and M19 rules screens (demo data; real data only with consent). Each test starts from empty storage.
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { grantConsent, revokeConsent } from "../src/core/consent";
import { MODULES } from "../src/modules/capability";
import { EVIDENCE } from "../src/modules/evidence";
import type { FieldValue, TMRecord } from "../src/core/types";

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const $$ = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
const go = (hash: string) => { location.hash = hash; render(); };
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;

describe("M24 ready-system library screen", () => {
  beforeEach(() => {
    localStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en");
  });

  it("lists the six ready systems, each with one add button, and no reviewer flag in English", () => {
    go("#/more/library");
    expect($$("div[data-system]")).toHaveLength(6);
    expect($$("[data-act=system-add]")).toHaveLength(6);
    expect($("[data-draft]")).toBeNull();
    expect($("[data-library-where=demo]")).not.toBeNull();
  });

  it("one tap adds the system's records to demo once; the card then offers removal", () => {
    go("#/more/library");
    $<HTMLButtonElement>("[data-system=morning-routine] [data-act=system-add]")!.click();
    const added = store.demo.list().filter((r) => r.links?.system === "morning-routine");
    expect(added.map((r) => r.entity).sort()).toEqual(["goal", "habit", "habit", "task", "task"]);
    render();
    expect($("[data-system=morning-routine] [data-act=system-undo]")).not.toBeNull();
    expect($("[data-system=morning-routine] [data-act=system-add]")).toBeNull();
    expect($("[data-library-msg]")!.textContent).toMatch(/Added 5 items/);
  });

  it("remove takes out only that system's records and the card goes back to add", () => {
    store.demo.put({ id: "mine", entity: "goal", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: "2026-10-25T00:00:00Z", values: { "goal.title": v("Mine") } });
    go("#/more/library");
    $<HTMLButtonElement>("[data-system=morning-routine] [data-act=system-add]")!.click();
    render();
    $<HTMLButtonElement>("[data-system=morning-routine] [data-act=system-undo]")!.click();
    expect(store.demo.list().map((r) => r.id)).toEqual(["mine"]);
    render();
    expect($("[data-system=morning-routine] [data-act=system-add]")).not.toBeNull();
    expect($("[data-library-msg]")!.textContent).toMatch(/Removed 5 items/);
  });

  it("Bangla mode flags the Bangla text as not reviewed yet, on every card", () => {
    localStorage.setItem("tm:ui:lang", "bn");
    go("#/more/library");
    expect($$("[data-draft=bn]")).toHaveLength(6);
    expect($("[data-system=morning-routine]")!.textContent).toMatch(/যাচাই হয়নি/);
  });

  it("without consent nothing reaches the real namespace; the screen says so", () => {
    go("#/more/library");
    $<HTMLButtonElement>("[data-system=study-block] [data-act=system-add]")!.click();
    expect(store.real.list()).toHaveLength(0);
    expect(store.demo.list().length).toBeGreaterThan(0);
  });

  it("with consent the add goes to real data, labelled without DEMO, and nothing new appears in demo", () => {
    grantConsent(consentKv, "2026-10-25T04:00:00.000Z"); localStorage.setItem("tm:ui:dataMode", "real");
    go("#/more/library");
    expect($("[data-library-where=real]")).not.toBeNull();
    $<HTMLButtonElement>("[data-system=study-block] [data-act=system-add]")!.click();
    const real: TMRecord[] = store.real.list();
    expect(real).toHaveLength(5);
    expect(store.demo.list()).toHaveLength(0);
    for (const r of real) for (const x of Object.values(r.values)) if (x.state === "value") expect(x.label).not.toBe("DEMO");
    revokeConsent(consentKv);
  });
});

describe("M19 automation rules screen and Today suggestions", () => {
  beforeEach(() => {
    localStorage.clear(); store.demo.clear(); store.real.clear();
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.setItem("tm:ui:lang", "en");
  });

  it("More lists the two new sections; the rules screen shows four rules with the right defaults", () => {
    go("#/more");
    expect($('a[href="#/more/library"]')).not.toBeNull();
    expect($('a[href="#/more/rules"]')).not.toBeNull();
    go("#/more/rules");
    expect($$("[data-rule]")).toHaveLength(4);
    expect($("[data-rule=focus_again] [data-rule-set='focus_again:off']")!.getAttribute("aria-pressed")).toBe("true");
    expect($("[data-rule=smaller_step] [data-rule-set='smaller_step:on']")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("switching a rule off saves the choice on this phone and the screen reflects it", () => {
    go("#/more/rules");
    $<HTMLButtonElement>("[data-rule=next_stage] [data-rule-set='next_stage:off']")!.click();
    expect(prefs.ruleSwitches.next_stage).toBe(false);
    render();
    expect($("[data-rule=next_stage] [data-rule-set='next_stage:off']")!.getAttribute("aria-pressed")).toBe("true");
    $<HTMLButtonElement>("[data-rule=focus_again] [data-rule-set='focus_again:on']")!.click();
    expect(prefs.ruleSwitches.focus_again).toBe(true);
  });

  it("a short break is suggested on Today after a focus block, and hidden once a rest has ended", () => {
    prefs.lastFocusEnd = { at: Date.now() - 60_000, minutes: 25 };
    go("#/today");
    expect($("[data-rules]")!.textContent).toMatch(/5-minute break/);
    expect($("[data-suggestion=break_after_focus]")).not.toBeNull();
    prefs.lastRestAt = Date.now();
    go("#/today");
    expect($("[data-rules]")).toBeNull();
  });

  it("a switched-off rule shows nothing on Today", () => {
    prefs.lastFocusEnd = { at: Date.now() - 60_000, minutes: 25 };
    prefs.ruleSwitches = { break_after_focus: false };
    go("#/today");
    expect($("[data-rules]")).toBeNull();
  });

  it("two missed planned days on a habit show the smaller-step suggestion on Today", () => {
    store.demo.put({ id: "habit-walk", entity: "habit", ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: "2026-10-01T00:00:00Z",
      values: { "habit.title": v("Evening walk"), "habit.days": v("0,1,2,3,4,5,6") } });
    go("#/today");
    const row = $("[data-suggestion=smaller_step]");
    expect(row).not.toBeNull();
    expect(row!.textContent).toMatch(/Evening walk/);
    expect(row!.textContent).not.toMatch(/missed|behind|fail/i);
  });
});

describe("capability status matches evidence for M19 and M24", () => {
  it("both are built, with a route, a function and a test", () => {
    for (const id of ["M19", "M24"]) {
      const m = MODULES.find((x) => x.id === id)!;
      expect(m.statuses, id).toContain("implemented");
      expect(m.statuses, id).not.toContain("not-built");
      expect(m.statuses, id).not.toContain("partial");
      expect(EVIDENCE[id]!.routes.length && EVIDENCE[id]!.fns.length && EVIDENCE[id]!.tests.length, id).toBeGreaterThan(0);
    }
  });
  it("the AI and sync rows stay honest (not built / partly)", () => {
    expect(MODULES.find((x) => x.id === "M23")!.statuses).toEqual(["not-built"]);
    expect(MODULES.find((x) => x.id === "M20")!.statuses).toContain("partial");
  });
});

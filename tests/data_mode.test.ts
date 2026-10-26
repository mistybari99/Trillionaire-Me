// Owner rule 25 Oct 2026: DEMO data is not permanent. First-run choice, delete-demo with explicit confirm,
// Only demo / Only real switch, no calculation ever adds demo and real, ask at most once per day.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_DAYS_BEFORE_ASK, recordDay, shouldAskDeleteDemo, visibleRecords } from "../src/core/dataMode";
import { grantConsent, readConsent, revokeConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";
import { render, renderApp } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";

const NOW = "2026-10-25T00:00:00.000Z";
const dv = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const fv = (x: unknown): FieldValue => ({ state: "value", value: x, label: "FACT" });
const rec = (ns: "demo" | "real", id: string, entity: string, values: Record<string, FieldValue>): TMRecord =>
  ({ id, entity, ns, ownerId: ns === "real" ? "owner" : "demo-user", schemaVersion: 1, createdAt: NOW, values });
const go = (hash: string) => { location.hash = hash; renderApp(); };
const click = (sel: string) => { document.querySelector<HTMLElement>(sel)!.click(); renderApp(); };
const tick = () => { (document.getElementById("mode-tick") as HTMLInputElement).checked = true; };

/** One demo set and one real set, same shapes, different words and numbers. */
function seedBoth(keepConsent = false) {
  grantConsent(consentKv, NOW); // real writes need it; removed again below so the tick screens can be tested
  store.demo.put(rec("demo", "task-d", "task", { "task.title": dv("DEMOTASK"), "task.minutes": dv(15) }));
  store.demo.put(rec("demo", "habit-d", "habit", { "habit.title": dv("DEMOHABIT"), "habit.days": dv("0,1,2,3,4,5,6") }));
  store.demo.put(rec("demo", "fin-d", "finance_item", { "finance.kind": dv("asset"), "finance.scope": dv("personal"), "finance.label": dv("DEMOCASH"), "finance.amount": dv(100), "finance.period": dv("once") }));
  store.demo.put(rec("demo", "intake-goal", "goal", { "goal.title": dv("DEMOGOAL"), "goal.horizon": dv("one_year") }));
  store.real.put(rec("real", "task-r", "task", { "task.title": fv("REALTASK"), "task.minutes": fv(15) }));
  store.real.put(rec("real", "habit-r", "habit", { "habit.title": fv("REALHABIT"), "habit.days": fv("0,1,2,3,4,5,6") }));
  store.real.put(rec("real", "fin-r", "finance_item", { "finance.kind": fv("asset"), "finance.scope": fv("personal"), "finance.label": fv("REALCASH"), "finance.amount": fv(250), "finance.period": fv("once") }));
  store.real.put(rec("real", "intake-goal", "goal", { "goal.title": fv("REALGOAL"), "goal.horizon": fv("one_year") }));
  if (!keepConsent) revokeConsent(consentKv);
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en");
  location.hash = "";
});
afterEach(() => { vi.useRealTimers(); });

describe("pure rules", () => {
  it("recordDay keeps distinct valid dates, sorted", () => {
    expect(recordDay(["2026-10-02", "2026-10-01"], "2026-10-02")).toEqual(["2026-10-01", "2026-10-02"]);
    expect(recordDay([], "not-a-date")).toEqual([]);
  });
  it("asks only in demo mode, after enough separate days, and not twice on one day", () => {
    const base = { mode: "demo" as const, days: ["2026-10-01", "2026-10-02", "2026-10-03"], askedOn: "", today: "2026-10-03" };
    expect(DEMO_DAYS_BEFORE_ASK).toBe(3);
    expect(shouldAskDeleteDemo(base)).toBe(true);
    expect(shouldAskDeleteDemo({ ...base, days: ["2026-10-01", "2026-10-02"] })).toBe(false);
    expect(shouldAskDeleteDemo({ ...base, mode: "real" })).toBe(false);
    expect(shouldAskDeleteDemo({ ...base, mode: null })).toBe(false);
    expect(shouldAskDeleteDemo({ ...base, askedOn: "2026-10-03" })).toBe(false);
    expect(shouldAskDeleteDemo({ ...base, askedOn: "2026-10-02" })).toBe(true);
  });
  it("visibleRecords returns one namespace only", () => {
    const d = rec("demo", "a", "task", {}), r = rec("real", "b", "task", {});
    expect(visibleRecords("demo", [d], [r])).toEqual([d]);
    expect(visibleRecords("real", [d], [r])).toEqual([r]);
  });
});

describe("first-run choice", () => {
  it("shows the choice before anything else, with no tabs", () => {
    renderApp();
    expect(document.querySelector("[data-first=demo]")).not.toBeNull();
    expect(document.querySelector("[data-first=real]")).not.toBeNull();
    expect(document.querySelector("nav")).toBeNull();
    expect(prefs.dataModeChoice).toBeNull();
  });
  it("explore with demo data: mode is demo, banner says Demo mode, choice is not shown again", () => {
    renderApp(); click("[data-act=first-demo]");
    expect(prefs.dataModeChoice).toBe("demo");
    expect(document.querySelector("[data-demo-banner]")!.textContent).toMatch(/Demo mode/);
    renderApp();
    expect(document.querySelector("[data-first]")).toBeNull();
    expect(readConsent(consentKv)).toBe(false);
  });
  it("start for real asks one confirmation with the consent tick; nothing changes without the tick", () => {
    renderApp(); click("[data-act=first-real]");
    expect(document.querySelector("[data-first=real-confirm]")!.textContent).toMatch(/this phone only/);
    click("[data-act=first-real-yes]");
    expect(prefs.dataModeChoice).toBeNull();
    expect(readConsent(consentKv)).toBe(false);
    tick(); click("[data-act=first-real-yes]");
    expect(prefs.dataModeChoice).toBe("real");
    expect(readConsent(consentKv)).toBe(true);
    expect(document.querySelector("[data-demo-banner]")).toBeNull();
  });
});

describe("delete demo data: explicit confirm only", () => {
  beforeEach(() => { localStorage.setItem("tm:ui:dataMode", "demo"); seedBoth(); });

  it("the Start real now button is on More > Data in demo mode and only opens the confirm", () => {
    go("#/more/data");
    expect(document.querySelector("[data-act=start-real-now]")).not.toBeNull();
    click("[data-act=start-real-now]");
    expect(document.querySelector("[data-mode-confirm]")).not.toBeNull();
    expect(store.demo.list().length).toBe(4);
    expect(prefs.dataMode).toBe("demo");
  });
  it("confirm removes demo records only, keeps real, settings and language, and switches to real", () => {
    prefs.scale = 125;
    go("#/more/data"); click("[data-act=start-real-now]");
    click("[data-act=demo-delete-confirm]"); // consent tick missing: nothing deleted
    expect(store.demo.list().length).toBe(4);
    tick(); click("[data-act=demo-delete-confirm]");
    expect(store.demo.list()).toEqual([]);
    expect(store.real.list().map((r) => r.id).sort()).toEqual(["fin-r", "habit-r", "intake-goal", "task-r"]);
    expect(prefs.dataMode).toBe("real");
    expect(prefs.lang).toBe("en");
    expect(prefs.scale).toBe(125);
    expect(readConsent(consentKv)).toBe(true);
    expect(document.querySelector("[data-demo-banner]")).toBeNull();
  });
  it("Keep demo data cancels: nothing deleted", () => {
    go("#/more/data"); click("[data-act=start-real-now]"); click("[data-act=demo-delete-cancel]");
    expect(store.demo.list().length).toBe(4);
    expect(document.querySelector("[data-mode-confirm]")).toBeNull();
    expect(prefs.dataMode).toBe("demo");
  });
  it("Delete my demo entries is two taps and leaves real data alone", () => {
    go("#/more/data"); click("[data-act=clear-demo]");
    expect(store.demo.list().length).toBe(4);
    click("[data-act=clear-demo-yes]");
    expect(store.demo.list()).toEqual([]);
    expect(store.real.list().length).toBe(4);
  });
});

describe("asking: after 3 separate days, at most once per day", () => {
  it("shows the ask on the third separate day, and 'Not now' keeps it away for the rest of that day", () => {
    localStorage.setItem("tm:ui:dataMode", "demo");
    vi.useFakeTimers({ toFake: ["Date"] });
    for (const day of ["2026-10-20T10:00:00", "2026-10-21T10:00:00"]) { vi.setSystemTime(new Date(day)); go("#/today"); expect(document.querySelector("[data-mode-ask]")).toBeNull(); }
    vi.setSystemTime(new Date("2026-10-21T20:00:00")); go("#/habits"); // same day again: still 2 days
    expect(document.querySelector("[data-mode-ask]")).toBeNull();
    vi.setSystemTime(new Date("2026-10-22T10:00:00")); go("#/today");
    expect(document.querySelector("[data-mode-ask]")).not.toBeNull();
    store.demo.put(rec("demo", "task-d", "task", { "task.title": dv("DEMOTASK") }));
    click("[data-act=demo-ask-no]");
    expect(store.demo.list().length).toBe(1); // declining deletes nothing
    go("#/habits"); go("#/today");
    expect(document.querySelector("[data-mode-ask]")).toBeNull();
    expect(prefs.dataMode).toBe("demo");
    vi.setSystemTime(new Date("2026-10-23T09:00:00")); go("#/today"); // asked again later
    expect(document.querySelector("[data-mode-ask]")).not.toBeNull();
  });
  it("saying yes to the ask only opens the confirm; it never deletes by itself", () => {
    localStorage.setItem("tm:ui:dataMode", "demo");
    localStorage.setItem("tm:ui:demoDays", JSON.stringify(["2026-10-01", "2026-10-02", "2026-10-03"]));
    store.demo.put(rec("demo", "task-d", "task", { "task.title": dv("DEMOTASK") }));
    go("#/today"); click("[data-act=demo-ask-yes]");
    expect(document.querySelector("[data-mode-confirm]")).not.toBeNull();
    expect(store.demo.list().length).toBe(1);
  });
  it("never asks in real mode", () => {
    localStorage.setItem("tm:ui:dataMode", "real");
    localStorage.setItem("tm:ui:demoDays", JSON.stringify(["2026-10-01", "2026-10-02", "2026-10-03"]));
    go("#/today");
    expect(document.querySelector("[data-mode-ask]")).toBeNull();
  });
});

describe("Only demo / Only real: the other namespace is hidden everywhere and never counted", () => {
  const SCREENS = ["#/today", "#/habits", "#/diary/plan", "#/diary/money", "#/journey/horizon", "#/journey/review", "#/journey/report"];
  const text = () => document.body.textContent ?? "";

  it("real mode shows no demo word or demo number on any screen", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); seedBoth(true);
    for (const hash of SCREENS) { go(hash); expect(text(), hash).not.toMatch(/DEMOTASK|DEMOHABIT|DEMOCASH|DEMOGOAL/); }
    go("#/diary/plan"); expect(text()).toMatch(/REALTASK/);
    go("#/habits"); expect(text()).toMatch(/REALHABIT/);
    go("#/diary/money"); expect(text()).toMatch(/REALCASH/);
    go("#/journey/horizon"); expect(text()).toMatch(/REALGOAL/);
  });
  it("demo mode shows no real word on any screen", () => {
    localStorage.setItem("tm:ui:dataMode", "demo"); seedBoth();
    for (const hash of SCREENS) { go(hash); expect(text(), hash).not.toMatch(/REALTASK|REALHABIT|REALCASH|REALGOAL/); }
    go("#/diary/plan"); expect(text()).toMatch(/DEMOTASK/);
    go("#/habits"); expect(text()).toMatch(/DEMOHABIT/);
    go("#/diary/money"); expect(text()).toMatch(/DEMOCASH/);
    go("#/journey/horizon"); expect(text()).toMatch(/DEMOGOAL/);
  });
  it("totals never add demo and real (100 + 250 = 350 appears nowhere)", () => {
    seedBoth(true);
    for (const mode of ["demo", "real"] as const) {
      localStorage.setItem("tm:ui:dataMode", mode);
      for (const hash of SCREENS) { go(hash); expect(text(), `${mode} ${hash}`).not.toMatch(/350/); }
      go("#/diary/money");
      expect(text()).toMatch(mode === "real" ? /250/ : /100/);
      expect(text()).not.toMatch(mode === "real" ? /\b100\b/ : /\b250\b/);
    }
  });
  it("the switch on More > Data changes the mode; real needs the consent tick first", () => {
    localStorage.setItem("tm:ui:dataMode", "demo"); seedBoth();
    go("#/more/data"); click("[data-mode-set=real]");
    expect(prefs.dataMode).toBe("demo");
    expect(document.querySelector("[data-mode-switch] .err")).not.toBeNull();
    store.real.clear(); // nothing real was written by the refused switch
    (document.getElementById("consent-tick") as HTMLInputElement).checked = true; click("[data-act=consent]");
    click("[data-mode-set=real]");
    expect(prefs.dataMode).toBe("real");
    expect(document.querySelector("[data-demo-banner]")).toBeNull();
    click("[data-mode-set=demo]");
    expect(prefs.dataMode).toBe("demo");
    expect(document.querySelector("[data-demo-banner]")).not.toBeNull();
  });
  it("forms write into the active mode only: demo mode saves DEMO records, none go real", () => {
    localStorage.setItem("tm:ui:dataMode", "demo");
    go("#/habits");
    (document.getElementById("hb-name") as HTMLInputElement).value = "Walk";
    document.querySelector("form[data-form=habit]")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(store.real.list()).toEqual([]);
    const hb = store.demo.list().find((r) => r.entity === "habit")!;
    expect(hb.values["habit.title"]).toMatchObject({ label: "DEMO" });
    render();
  });
});

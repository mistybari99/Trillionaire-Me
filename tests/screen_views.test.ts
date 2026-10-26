// Template chooser on every dashboard screen: same records, a different view, stored per screen, mode hiding intact.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { screenView, setScreenView, store, VIEW_SCREENS, type ViewScreen } from "../src/ui/state";
import type { FieldValue, Namespace, TMRecord } from "../src/core/types";
import { grantConsent } from "../src/core/consent";
import { consentKv } from "../src/ui/state";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (ns: Namespace, id: string, entity: string, values: Record<string, unknown>, links?: Record<string, string>): TMRecord => {
  const label = ns === "demo" ? "DEMO" : "FACT";
  const vals: Record<string, FieldValue> = {};
  for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label } as FieldValue;
  return { id, entity, ns, ownerId: ns === "demo" ? "demo-user" : "owner", schemaVersion: 1, createdAt: NOW, values: vals, ...(links ? { links } : {}) };
};
const seed = () => {
  for (const ns of ["demo", "real"] as const) {
    const s = store[ns];
    s.put(mk(ns, `${ns}-task`, "task", { "task.title": `Task ${ns}`, "task.minutes": 20, "task.priority": "normal" }));
    s.put(mk(ns, `${ns}-habit`, "habit", { "habit.title": `Habit ${ns}`, "habit.days": "0,1,2,3,4,5,6" }));
    s.put(mk(ns, `${ns}-fin`, "finance_item", { "finance.kind": "income", "finance.scope": "personal", "finance.label": `Pay ${ns}`, "finance.amount": 1000, "finance.period": "monthly" }));
    s.put(mk(ns, `${ns}-cap`, "capture_item", { "capture_item.kind": "decision", "capture_item.text": `Decide ${ns}` }));
    s.put(mk(ns, `${ns}-cap2`, "capture_item", { "capture_item.kind": "amount", "capture_item.number": 500 }));
  }
  store.demo.put(mk("demo", "intake-constraint", "constraint", { "constraint.weekly_free_hours": 40, "constraint.free_from": "00:00", "constraint.free_to": "23:59" }));
  store.real.put(mk("real", "intake-constraint", "constraint", { "constraint.weekly_free_hours": 40, "constraint.free_from": "00:00", "constraint.free_to": "23:59" }));
};
const ROUTES: Array<[ViewScreen, string, string]> = [
  ["journey", "#/journey", "[data-stage]"], ["money", "#/diary/money", "[data-fin]"], ["habits", "#/habits", "[data-habit-card]"],
  ["plan", "#/diary/plan", "[data-task]"], ["report", "#/journey/report", "[data-item]"], ["review", "#/journey/review", "[data-review]"], ["today", "#/today", "[data-placement]"],
];
const ids = (sel: string, attr: string) => [...document.querySelectorAll<HTMLElement>(sel)].map((e) => e.getAttribute(attr) ?? "").sort();
const go = (hash: string) => { location.hash = hash; render(); };
const KEY: Record<string, string> = { "[data-stage]": "data-stage", "[data-fin]": "data-fin", "[data-habit-card]": "data-habit-card", "[data-task]": "data-task", "[data-placement]": "data-placement", "[data-item]": "data-item", "[data-review]": "data-review" };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
  grantConsent(consentKv, NOW); seed();
});

describe("screen view prefs", () => {
  it("default is full and unknown stored values fall back to it", () => {
    for (const s of VIEW_SCREENS) {
      expect(screenView(s)).toBe("full");
      localStorage.setItem(`tm:ui:view:${s}`, "rank");
      expect(screenView(s)).toBe("full");
    }
  });
  it("the choice is kept per screen", () => {
    setScreenView("money", "compact");
    expect(screenView("money")).toBe("compact");
    expect(screenView("plan")).toBe("full");
    expect(localStorage.getItem("tm:ui:view:money")).toBe("compact");
  });
});

describe("each dashboard has two real views over the same records", () => {
  for (const [screen, hash, sel] of ROUTES) {
    for (const mode of ["demo", "real"] as const) {
      it(`${screen} (${mode}): full and compact show the same ids; button persists the choice`, () => {
        localStorage.setItem("tm:ui:dataMode", mode);
        go(hash);
        const bar = document.querySelector(`[data-view-bar=${screen}]`);
        expect(bar).not.toBeNull();
        expect(bar!.querySelector("[data-view-opt=full]")!.getAttribute("aria-pressed")).toBe("true");
        const attr = KEY[sel];
        const fullIds = attr ? ids(sel, attr) : [];
        const fullHtml = document.getElementById("app")!.innerHTML;
        document.querySelector<HTMLButtonElement>(`[data-view-bar=${screen}] [data-view-opt=compact]`)!.click();
        expect(screenView(screen)).toBe("compact");
        go(hash);
        expect(document.querySelector(`[data-view-bar=${screen}] [data-view-opt=compact]`)!.getAttribute("aria-pressed")).toBe("true");
        expect(document.querySelector("[data-view=compact]")).not.toBeNull();
        expect(document.getElementById("app")!.innerHTML).not.toBe(fullHtml);
        if (attr) {
          expect(ids(sel, attr)).toEqual(fullIds);
          if (screen !== "journey" && screen !== "review") expect(fullIds.length).toBeGreaterThan(0);
        }
        // mode hiding: the other namespace never appears
        const other = mode === "demo" ? "real" : "demo";
        expect(document.getElementById("app")!.innerHTML).not.toMatch(new RegExp(`data-(fin|task|item|habit-card)="${other}-`));
        expect(document.getElementById("app")!.textContent).not.toMatch(new RegExp(`(Task|Habit|Pay|Decide) ${other}`));
        // unknown stored value -> back to full
        localStorage.setItem(`tm:ui:view:${screen}`, "grid");
        go(hash);
        expect(document.querySelector("[data-view=compact]")).toBeNull();
      });
    }
  }
  it("money totals use only the active mode in compact view", () => {
    setScreenView("money", "compact"); go("#/diary/money");
    expect(document.querySelector("[data-mix]")).toBeNull();
    expect(ids("[data-fin]", "data-fin")).toEqual(["demo-fin"]);
  });
  it("report entries show only the active mode", () => {
    setScreenView("report", "compact"); localStorage.setItem("tm:ui:dataMode", "real"); go("#/journey/report");
    expect(ids("[data-item]", "data-item")).toEqual(["real-cap", "real-cap2"]);
  });
  it("Bangla labels exist and no Bangla digits or ranking words", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/habits");
    const txt = document.querySelector("[data-view-bar=habits]")!.textContent!;
    expect(txt).toContain("বিস্তারিত"); expect(txt).toContain("ছোট করে");
    expect(txt).not.toMatch(/[০-৯]/);
  });
});

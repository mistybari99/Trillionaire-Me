// Welcome back (audit M2) and monthly then-vs-now: own records only, unknown is not 0, calm wording, no streaks or scores.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { AWAY_DAYS, daysBetween, dismissWelcome, parseVisit, showWelcome, stepVisit, thenVsNow, welcomeFacts } from "../src/core/welcomeBack";
import type { FieldValue, TMRecord } from "../src/core/types";

const dv = (v: unknown): FieldValue => ({ state: "value", value: v, label: "DEMO" } as FieldValue);
const rec = (id: string, entity: string, vals: Record<string, unknown>, createdAt = "2026-10-01T08:00:00.000Z"): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt, values: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, dv(v)])) } as TMRecord);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (h: string) => { location.hash = h; render(); };

beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("visit rules (pure)", () => {
  it("a first visit, a same-day visit and a short break show nothing; 3 days or more welcomes back", () => {
    expect(stepVisit(parseVisit(null), "2026-11-03")).toEqual({ lastOpen: "2026-11-03", welcome: null });
    const v = { lastOpen: "2026-11-03", welcome: null }; expect(stepVisit(v, "2026-11-03")).toBe(v);
    expect(stepVisit({ lastOpen: "2026-11-01", welcome: null }, "2026-11-03").welcome).toBeNull();
    const w = stepVisit({ lastOpen: "2026-10-30", welcome: null }, "2026-11-03"); expect(w.welcome).toEqual({ day: "2026-11-03", away: 4, last: "2026-10-30", dismissed: false }); expect(AWAY_DAYS).toBe(3);
    expect(stepVisit({ lastOpen: "2026-11-09", welcome: null }, "2026-11-03").welcome).toBeNull(); // clock moved back: no guess
  });
  it("shows only on the day it was decided and not after Not now; broken stored data reads as no visit", () => {
    const w = stepVisit({ lastOpen: "2026-10-20", welcome: null }, "2026-11-03");
    expect(showWelcome(w, "2026-11-03")).not.toBeNull(); expect(showWelcome(w, "2026-11-04")).toBeNull(); expect(showWelcome(dismissWelcome(w), "2026-11-03")).toBeNull();
    expect(parseVisit("x")).toEqual({ lastOpen: null, welcome: null }); expect(parseVisit({ lastOpen: "yesterday", welcome: { day: "x" } })).toEqual({ lastOpen: null, welcome: null });
    expect(daysBetween("2026-10-30", "2026-11-03")).toBe(4);
  });
  it("facts come from own steps: none recorded is unknown, not 0", () => {
    expect(welcomeFacts([])).toEqual({ openSteps: null, nextStep: null });
    const r = [rec("t1", "task", { "task.title": "Call supplier" }, "2026-10-02T00:00:00Z"), rec("t2", "task", { "task.title": "Old", "task.done_on": "2026-10-03" }), rec("t3", "task", { "task.title": "Later" }, "2026-10-05T00:00:00Z")];
    expect(welcomeFacts(r)).toEqual({ openSteps: 2, nextStep: "Call supplier" });
  });
});

describe("then vs now (pure)", () => {
  const T = "2026-11-03";
  const task = (id: string, done: string) => rec(id, "task", { "task.title": id, "task.done_on": done });
  it("compares the last 30 days with the 30 before; a side with no record is null and gets no comparison", () => {
    const r = [task("a", "2026-10-20"), task("b", "2026-10-21"), task("c", "2026-10-22"), task("d", "2026-09-25")];
    const x = thenVsNow(r, T); const row = x.rows.find((y) => y.id === "tasks")!;
    expect(row).toEqual({ id: "tasks", then: 1, now: 3, relation: "more" }); expect(x.rows.find((y) => y.id === "focus")).toEqual({ id: "focus", then: null, now: null, relation: null });
    expect(thenVsNow([task("a", "2026-10-20")], T).anyThen).toBe(false);
    expect(thenVsNow([task("a", "2026-10-20"), task("b", "2026-09-25")], T).rows[0]!.relation).toBe("same");
    expect(thenVsNow([task("a", "2026-10-20"), task("b", "2026-09-25"), task("c", "2026-09-26"), task("d", "2026-09-27")], T).rows[0]!.relation).toBe("less");
  });
});

describe("on screen", () => {
  it("Today: no card on a first open; after 5 days away the card shows own facts, links to steps, and Not now hides it", () => {
    store.demo.put(rec("t1", "task", { "task.title": "Call supplier" })); go("#/today"); expect(app().querySelector("[data-welcome-back]")).toBeNull();
    prefs.visit = { lastOpen: ago(5), welcome: null }; go("#/today");
    const card = q("[data-welcome-back]"); expect(card.textContent).toContain("It has been 5 days"); expect(card.textContent).toContain("1 steps are waiting"); expect(card.textContent).toContain("Call supplier");
    expect(q<HTMLAnchorElement>("[data-act=wb-open]").getAttribute("href")).toBe("#/diary/plan"); expect(card.querySelector(".err, [role=alert]")).toBeNull();
    go("#/today"); expect(app().querySelector("[data-welcome-back]")).not.toBeNull(); // a redraw does not lose it
    q<HTMLButtonElement>("[data-act=wb-dismiss]").click(); render(); expect(app().querySelector("[data-welcome-back]")).toBeNull();
  });
  it("Today with no steps recorded says nothing about steps (no '0 steps')", () => {
    prefs.visit = { lastOpen: ago(9), welcome: null }; go("#/today"); expect(q("[data-welcome-back]").textContent).not.toMatch(/steps are waiting/);
  });
  it("Monthly review: empty gives a plain note; with both months it shows then and now side by side, unknown as 'not recorded'", () => {
    go("#/journey/month"); expect(q("[data-then-now]").getAttribute("data-then-now")).toBe("none"); expect(q("[data-tn-empty]").textContent).toMatch(/Nothing was recorded/);
    store.demo.put(rec("a", "task", { "task.title": "a", "task.done_on": ago(5) })); store.demo.put(rec("b", "task", { "task.title": "b", "task.done_on": ago(40) })); store.demo.put(rec("c", "task", { "task.title": "c", "task.done_on": ago(41) }));
    go("#/journey/month"); const li = q("[data-tn=tasks]"); expect(li.textContent).toContain("then: 2"); expect(li.textContent).toContain("now: 1"); expect(li.getAttribute("data-rel")).toBe("less");
    expect(li.textContent).toMatch(/lighter month than then, and that is fine/); expect(q("[data-tn=focus]").textContent).toContain("then: not recorded");
    expect(q("[data-then-now]").querySelector(".err, [role=alert]")).toBeNull();
  });
  it("en, bn and mix all carry the new text, without score, rank or streak words", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("wb.") || k.startsWith("month.tn."));
    expect(keys.length).toBe(17);
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) {
      const v = (PACKS[l] as Record<string, string>)[k]; expect(v, `${l}:${k}`).toBeTruthy(); expect(v, `${l}:${k}`).not.toMatch(/streak|score|rank|late|missed|failed|overdue|স্ট্রিক|স্কোর|ব্যর্থ|দেরি/i);
    }
    localStorage.setItem("tm:ui:lang", "bn"); prefs.visit = { lastOpen: ago(6), welcome: null }; go("#/today"); expect(q("[data-welcome-back]").textContent).toContain("আবার স্বাগতম");
    localStorage.setItem("tm:ui:lang", "mix"); go("#/journey/month"); expect(q("[data-then-now]")).not.toBeNull();
  });
});

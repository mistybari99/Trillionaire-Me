// D-B: register forms (risk, venture, team, North Star, flashcards, prayer place) are real-data ready.
// Device only, consent tick first, demo and real never mixed, Unknown is never 0, clear-all covers them.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { grantConsent, revokeConsent } from "../src/core/consent";
import type { FieldValue, TMRecord } from "../src/core/types";
import { render } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";

const NOW = "2026-10-26T00:00:00.000Z";
const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" });
const demoRec = (id: string, entity: string, values: Record<string, FieldValue>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 1, createdAt: NOW, values });
const go = (hash: string) => { location.hash = hash; render(); };
const submit = (sel: string) => { document.querySelector(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); render(); };
const send = (sel: string) => document.querySelector(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
const tap = (sel: string) => document.querySelector<HTMLButtonElement>(sel)!.click();
const setv = (id: string, value: string) => { (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = value; };
const labels = (recs: TMRecord[]) => recs.flatMap((r) => Object.values(r.values).filter((x) => x.state === "value").map((x) => (x as { label: string }).label));
const clearAll = () => { go("#/more/data"); tap("[data-act=clear-real]"); render(); tap("[data-act=clear-real-yes]"); render(); };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en");
  revokeConsent(consentKv);
  localStorage.setItem("tm:ui:dataMode", "real");
});

describe("risk register (real data)", () => {
  it("no consent: prompt shown, nothing saved", () => {
    go("#/journey/risks");
    expect(document.querySelector("form[data-form=risk] [data-consent-prompt]")).not.toBeNull();
    setv("rk-text", "Supplier delay"); send("form[data-form=risk]");
    expect(document.querySelector("form[data-form=risk] .err")!.textContent).toMatch(/Nothing saved/);
    expect(store.real.list()).toEqual([]); expect(store.demo.list()).toEqual([]);
  });

  describe("with consent", () => {
    beforeEach(() => grantConsent(consentKv, NOW));

    it("saves a real (FACT) risk with a Real tag; unknown likelihood stays unknown", () => {
      go("#/journey/risks");
      expect(document.querySelector("[data-consent-prompt]")).toBeNull();
      setv("rk-text", "Supplier delay"); submit("form[data-form=risk]");
      const r = store.real.list().find((x) => x.entity === "risk")!;
      expect(r.ownerId).toBe("owner");
      expect(r.values["risk.text"]).toMatchObject({ label: "FACT" });
      expect(r.values["risk.likelihood"]).toEqual({ state: "unknown" });
      expect(store.demo.list()).toEqual([]);
      const card = document.querySelector(`[data-risk='${r.id}']`)!;
      expect(card.querySelector("[data-ns=real]")).not.toBeNull();
      expect(document.querySelector(".badge.ns-demo")).toBeNull();
      expect(card.textContent).toMatch(/Don't know/);
    });

    it("demo risks are hidden in real mode and not counted; labels never mix", () => {
      store.demo.put(demoRec("risk-d1", "risk", { "risk.text": v("Demo risk") }));
      go("#/journey/risks");
      setv("rk-text", "Real risk"); submit("form[data-form=risk]");
      expect(document.body.textContent).not.toMatch(/Demo risk/);
      expect(document.querySelector("[data-risk-missing]")!.textContent).toMatch(/: 1/);
      expect(labels(store.demo.list()).every((l) => l === "DEMO")).toBe(true);
      expect(labels(store.real.list()).every((l) => l === "FACT")).toBe(true);
    });

    it("Bangla and Mix keep Latin digits and show the form", () => {
      localStorage.setItem("tm:ui:lang", "bn");
      go("#/journey/risks");
      expect(document.querySelector("form[data-form=risk]")).not.toBeNull();
      expect(document.body.textContent).not.toMatch(/[০-৯]/);
    });

    it("clear-all removes the real risk and keeps demo", () => {
      store.demo.put(demoRec("risk-d2", "risk", { "risk.text": v("Keep demo") }));
      go("#/journey/risks"); setv("rk-text", "Remove me"); submit("form[data-form=risk]");
      clearAll();
      expect(store.real.list()).toEqual([]);
      expect(store.demo.list().map((r) => r.id)).toEqual(["risk-d2"]);
    });
  });
});

describe("venture list (real data)", () => {
  it("no consent: prompt shown, nothing saved", () => {
    go("#/diary/ventures");
    expect(document.querySelector("form[data-form=venture] [data-consent-prompt]")).not.toBeNull();
    setv("vn-name", "Shop"); send("form[data-form=venture]");
    expect(document.querySelector("form[data-form=venture] .err")!.textContent).toMatch(/Nothing saved/);
    expect(store.real.list()).toEqual([]); expect(store.demo.list()).toEqual([]);
  });

  describe("with consent", () => {
    beforeEach(() => grantConsent(consentKv, NOW));

    it("saves a real venture; blank ownership stays Unknown, never 0", () => {
      go("#/diary/ventures");
      setv("vn-name", "Shop"); submit("form[data-form=venture]");
      const r = store.real.list().find((x) => x.entity === "venture")!;
      expect(r.values["venture.name"]).toMatchObject({ label: "FACT" });
      expect(r.values["venture.ownership_pct"]).toEqual({ state: "unknown" });
      expect(r.values["venture.stage"]).toEqual({ state: "unknown" });
      expect(store.demo.list()).toEqual([]);
      const card = document.querySelector(`[data-venture='${r.id}']`)!;
      expect(card.querySelector("[data-ns=real]")).not.toBeNull();
      expect(card.textContent).not.toMatch(/\b0%/);
    });

    it("a typed ownership is saved as a real number; demo ventures are hidden and not mixed", () => {
      store.demo.put(demoRec("ven-d1", "venture", { "venture.name": v("Demo venture"), "venture.ownership_pct": v(40) }));
      go("#/diary/ventures");
      setv("vn-name", "Shop"); setv("vn-own", "60"); submit("form[data-form=venture]");
      const r = store.real.list().find((x) => x.entity === "venture")!;
      expect(r.values["venture.ownership_pct"]).toMatchObject({ value: 60, label: "FACT" });
      expect(document.body.textContent).not.toMatch(/Demo venture/);
      expect(labels(store.demo.list()).every((l) => l === "DEMO")).toBe(true);
      expect(labels(store.real.list()).every((l) => l === "FACT")).toBe(true);
    });

    it("clear-all removes the real venture and keeps demo", () => {
      store.demo.put(demoRec("ven-d2", "venture", { "venture.name": v("Keep demo") }));
      go("#/diary/ventures"); setv("vn-name", "Remove me"); submit("form[data-form=venture]");
      clearAll();
      expect(store.real.list()).toEqual([]);
      expect(store.demo.list().map((r) => r.id)).toEqual(["ven-d2"]);
    });
  });
});

describe("team roles (real data)", () => {
  it("no consent: prompt shown, nothing saved", () => {
    go("#/diary/team");
    expect(document.querySelector("form[data-form=team] [data-consent-prompt]")).not.toBeNull();
    setv("tm-role", "Sales lead"); send("form[data-form=team]");
    expect(document.querySelector("form[data-form=team] .err")!.textContent).toMatch(/Nothing saved/);
    expect(store.real.list()).toEqual([]); expect(store.demo.list()).toEqual([]);
  });

  describe("with consent", () => {
    beforeEach(() => grantConsent(consentKv, NOW));

    it("saves a real role; unanswered holder stays Unknown and is counted as unknown, not open", () => {
      go("#/diary/team");
      setv("tm-role", "Sales lead"); submit("form[data-form=team]");
      const r = store.real.list().find((x) => x.entity === "team_role")!;
      expect(r.values["team_role.role"]).toMatchObject({ label: "FACT" });
      expect(r.values["team_role.holder"]).toEqual({ state: "unknown" });
      const card = document.querySelector(`[data-role='${r.id}']`)!;
      expect(card.querySelector("[data-ns=real]")).not.toBeNull();
      expect(document.querySelector("[data-team-summary]")!.textContent).toMatch(/1.*0.*1/);
    });

    it("still refuses a phone number or email, and never counts demo roles", () => {
      store.demo.put(demoRec("role-d1", "team_role", { "team_role.role": v("Demo role"), "team_role.holder": v("open") }));
      go("#/diary/team");
      setv("tm-role", "Call 01712345678"); send("form[data-form=team]");
      expect(document.querySelector("form[data-form=team] .err")!.textContent).toBeTruthy();
      expect(store.real.list()).toEqual([]);
      setv("tm-role", "Operations"); submit("form[data-form=team]");
      expect(document.body.textContent).not.toMatch(/Demo role/);
      expect(labels(store.demo.list()).every((l) => l === "DEMO")).toBe(true);
      expect(labels(store.real.list()).every((l) => l === "FACT")).toBe(true);
    });

    it("clear-all removes the real role and keeps demo", () => {
      store.demo.put(demoRec("role-d2", "team_role", { "team_role.role": v("Keep demo") }));
      go("#/diary/team"); setv("tm-role", "Remove me"); submit("form[data-form=team]");
      clearAll();
      expect(store.real.list()).toEqual([]);
      expect(store.demo.list().map((r) => r.id)).toEqual(["role-d2"]);
    });
  });
});

describe("North Star (real data)", () => {
  it("no consent: prompt shown, nothing saved", () => {
    go("#/journey/northstar");
    expect(document.querySelector("form[data-form=north-star] [data-consent-prompt]")).not.toBeNull();
    setv("ns-metric", "Customers"); send("form[data-form=north-star]");
    expect(document.querySelector("form[data-form=north-star] .err")!.textContent).toMatch(/Nothing saved/);
    expect(store.real.list()).toEqual([]); expect(store.demo.list()).toEqual([]);
  });

  describe("with consent", () => {
    beforeEach(() => grantConsent(consentKv, NOW));

    it("blank start and target are saved as Unknown and give no ladder (never 0)", () => {
      go("#/journey/northstar");
      setv("ns-metric", "Customers"); submit("form[data-form=north-star]");
      const r = store.real.list().find((x) => x.entity === "north_star")!;
      expect(r.values["north_star.metric"]).toMatchObject({ label: "FACT" });
      expect(r.values["north_star.baseline"]).toEqual({ state: "unknown" });
      expect(r.values["north_star.target"]).toEqual({ state: "unknown" });
      const card = document.querySelector(`[data-north-star='${r.id}']`)!;
      expect(card.querySelector("[data-ns=real]")).not.toBeNull();
      expect(card.querySelector("[data-ladder=unknown]")).not.toBeNull();
      expect(card.querySelector("[data-ladder=ok]")).toBeNull();
    });

    it("typed numbers are real (FACT) and give a ladder; demo measures are hidden and never mixed", () => {
      store.demo.put(demoRec("ns-d1", "north_star", { "north_star.metric": v("Demo measure"), "north_star.baseline": v(1), "north_star.target": v(9) }));
      go("#/journey/northstar");
      setv("ns-metric", "Customers"); setv("ns-base", "10"); setv("ns-target", "50"); submit("form[data-form=north-star]");
      const r = store.real.list().find((x) => x.entity === "north_star")!;
      expect(r.values["north_star.baseline"]).toMatchObject({ value: 10, label: "FACT" });
      expect(document.querySelector(`[data-north-star='${r.id}'] [data-ladder=ok]`)).not.toBeNull();
      expect(document.body.textContent).not.toMatch(/Demo measure/);
      expect(labels(store.demo.list()).every((l) => l === "DEMO")).toBe(true);
      expect(labels(store.real.list()).every((l) => l === "FACT")).toBe(true);
    });

    it("clear-all removes the real measure and keeps demo", () => {
      store.demo.put(demoRec("ns-d2", "north_star", { "north_star.metric": v("Keep demo") }));
      go("#/journey/northstar"); setv("ns-metric", "Remove me"); submit("form[data-form=north-star]");
      clearAll();
      expect(store.real.list()).toEqual([]);
      expect(store.demo.list().map((r) => r.id)).toEqual(["ns-d2"]);
    });
  });
});

describe("flashcards (real data)", () => {
  it("no consent: prompt shown, nothing saved", () => {
    go("#/cards");
    expect(document.querySelector("form[data-form=card] [data-consent-prompt]")).not.toBeNull();
    setv("cd-front", "Q"); setv("cd-back", "A"); send("form[data-form=card]");
    expect(document.querySelector("form[data-form=card] .err")!.textContent).toMatch(/Nothing saved/);
    expect(store.real.list()).toEqual([]); expect(store.demo.list()).toEqual([]);
  });

  describe("with consent", () => {
    beforeEach(() => grantConsent(consentKv, NOW));

    it("saves a real card (FACT, Real tag); a review updates the same real card and writes nothing to demo", () => {
      go("#/cards");
      setv("cd-front", "Question"); setv("cd-back", "Answer"); submit("form[data-form=card]");
      const c = store.real.list().find((x) => x.entity === "card")!;
      expect(c.ownerId).toBe("owner");
      expect(c.values["card.front"]).toMatchObject({ value: "Question", label: "FACT" });
      expect(document.querySelector(`[data-card='${c.id}'] [data-ns=real]`)).not.toBeNull();
      tap("[data-act=cards-study]"); tap("[data-act=card-show]"); tap("[data-act=card-knew]");
      const after = store.real.get(c.id)!;
      expect(after.values["card.box"]).toMatchObject({ value: 2, label: "FACT" });
      expect(store.real.list().filter((x) => x.entity === "card")).toHaveLength(1);
      expect(store.demo.list()).toEqual([]);
    });

    it("demo cards are hidden in real mode and never counted with real ones", () => {
      store.demo.put(demoRec("card-d1", "card", { "card.front": v("Demo Q"), "card.back": v("Demo A"), "card.box": v(1), "card.due": v("2020-01-01") }));
      go("#/cards");
      expect(document.body.textContent).not.toMatch(/Demo Q/);
      expect(document.querySelector("[data-cards-due]")).toBeNull();
      setv("cd-front", "Real Q"); setv("cd-back", "Real A"); submit("form[data-form=card]");
      expect(document.querySelector("[data-cards-due]")!.getAttribute("data-cards-due")).toBe("1");
      expect(labels(store.demo.list()).every((l) => l === "DEMO")).toBe(true);
      expect(labels(store.real.list()).every((l) => l === "FACT")).toBe(true);
    });

    it("a review after the consent was withdrawn saves nothing and says so", () => {
      go("#/cards");
      setv("cd-front", "Question"); setv("cd-back", "Answer"); submit("form[data-form=card]");
      const c = store.real.list().find((x) => x.entity === "card")!;
      tap("[data-act=cards-study]"); tap("[data-act=card-show]");
      revokeConsent(consentKv);
      tap("[data-act=card-knew]");
      expect(document.body.textContent).toMatch(/Nothing saved/);
      expect(store.real.get(c.id)!.values["card.box"]).toMatchObject({ value: 1 });
    });

    it("clear-all removes the real cards and keeps demo", () => {
      store.demo.put(demoRec("card-d2", "card", { "card.front": v("Keep"), "card.back": v("demo") }));
      go("#/cards"); setv("cd-front", "Remove"); setv("cd-back", "me"); submit("form[data-form=card]");
      clearAll();
      expect(store.real.list()).toEqual([]);
      expect(store.demo.list().map((r) => r.id)).toEqual(["card-d2"]);
    });
  });
});

void prefs;

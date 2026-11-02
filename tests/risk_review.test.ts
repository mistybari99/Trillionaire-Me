// M15 review-date trigger, end to end: risk with a review date -> due/soon/none -> calm card on Today and the report, question on the risk page ->
// "Not yet" sets the next date and logs it; "It has happened" starts a reality event. The stop rule is only shown back. EN / BN / mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS, type Key } from "../src/i18n/packs";
import { dueRisks, reviewedRisk, riskDue, riskRows } from "../src/core/risk";
import { eventRows } from "../src/core/realityLoop";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const risk = (id: string, text: string, o: { date?: string; stop?: string } = {}): TMRecord => ({ id, entity: "risk", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z",
  values: { "risk.text": v(text), ...(o.date ? { "risk.review_on": v(o.date) } : {}), ...(o.stop ? { "risk.stop_rule": v(o.stop) } : {}) } });
const iso = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const TODAY = "2026-11-02";

describe("risk review trigger (pure)", () => {
  it("due on or after the date, soon within 7 days, later beyond, none without a (valid) date", () => {
    const r = (reviewOn: string | null) => ({ reviewOn });
    expect(riskDue(r("2026-11-01"), TODAY)).toBe("due"); expect(riskDue(r("2026-11-02"), TODAY)).toBe("due"); expect(riskDue(r("2026-11-09"), TODAY)).toBe("soon");
    expect(riskDue(r("2026-11-10"), TODAY)).toBe("later"); expect(riskDue(r(null), TODAY)).toBe("none"); expect(riskDue(r("2026-13-40"), TODAY)).toBe("none");
  });
  it("dueRisks keeps only due ones; a risk with no date is never due (Unknown, not 'later')", () => {
    const rows = riskRows([risk("a", "A", { date: "2026-10-01" }), risk("b", "B"), risk("c", "C", { date: "2027-01-01" })]);
    expect(dueRisks(rows, TODAY).map((x) => x.id)).toEqual(["a"]);
  });
  it("reviewedRisk moves the date by the chosen days and changes nothing else", () => {
    const r = risk("a", "A", { date: "2026-10-01", stop: "if cash < 1" });
    const n = reviewedRisk(r, TODAY, 14); expect(n.values["risk.review_on"]).toMatchObject({ value: "2026-11-16" }); expect(n.values["risk.stop_rule"]).toEqual(r.values["risk.stop_rule"]);
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const click = (sel: string) => { $<HTMLButtonElement>(sel)!.click(); render(); };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("risk review screens", () => {
  it("a due risk shows on Today and the report; Today stays quiet when none is due or the risk has no date", () => {
    go("#/today"); expect($("[data-risk-due-card]")).toBeNull();
    store.demo.put(risk("b", "No date")); store.demo.put(risk("c", "Later", { date: iso(40) })); go("#/today"); expect($("[data-risk-due-card]")).toBeNull();
    store.demo.put(risk("a", "Late launch", { date: iso(-3) }));
    go("#/today"); const c = $('[data-risk-due-card="today"]')!; expect(c.textContent).toMatch(/Late launch/); expect(c.textContent).toMatch(/1 risk\(s\) have reached/); expect(c.querySelector('a[href="#/journey/risks"]')).not.toBeNull();
    expect(c.textContent).not.toMatch(/fail|behind|overdue|missed/i);
    go("#/journey/report"); expect($('[data-risk-due-card="report"]')).not.toBeNull();
  });
  it("the risk page flags due and soon risks, opens the question for a due one, and shows the stop rule back", () => {
    store.demo.put(risk("a", "Due one", { date: iso(-1), stop: "If sales stay under 5 for two months" })); store.demo.put(risk("s", "Soon one", { date: iso(3) })); store.demo.put(risk("l", "Later one", { date: iso(60) }));
    go("#/journey/risks");
    expect($('[data-risk="a"] [data-risk-due="due"]')).not.toBeNull(); expect($('[data-risk="s"] [data-risk-due="soon"]')).not.toBeNull(); expect($('[data-risk="l"] [data-risk-due]')).toBeNull();
    expect($('[data-risk-review="a"]')!.hasAttribute("open")).toBe(true); expect($('[data-risk-review="s"]')!.hasAttribute("open")).toBe(false);
    expect($('[data-risk-review="a"] [data-risk-stoprule]')!.textContent).toBe("Your stop rule: If sales stay under 5 for two months");
    expect($('[data-risk-review="a"]')!.textContent).toMatch(/Has this happened, or has your stop rule been met/);
    expect($('[data-risk-review="s"]')!.textContent).toMatch(/No stop rule written yet/);
    expect(document.querySelector('label[for="rv-days-a"]')).not.toBeNull();
  });
  it("'Not yet' sets the next review date, writes a log line, and the risk is no longer due", () => {
    store.demo.put(risk("a", "Due one", { date: iso(-1) }));
    go("#/journey/risks"); ($("#rv-days-a") as HTMLSelectElement).value = "14"; click('[data-act="risk-notyet"]');
    expect(store.demo.get("a")!.values["risk.review_on"]).toMatchObject({ value: iso(14) });
    expect(store.demo.list().some((r) => r.entity === "journey_log" && String((r.values["journey_log.entry"] as { value: string }).value).includes("‘Due one’ was looked at again"))).toBe(true);
    expect($('[data-risk-due="due"]')).toBeNull(); go("#/today"); expect($("[data-risk-due-card]")).toBeNull();
  });
  it("'It has happened' starts a waiting event (setback) on the reality page and moves the next review so the prompt does not repeat", () => {
    store.demo.put(risk("a", "Due one", { date: iso(-1), stop: "stop" }));
    go("#/journey/risks"); click('[data-act="risk-happened"]');
    const ev = eventRows(store.demo.list()); expect(ev).toHaveLength(1); expect(ev[0]).toMatchObject({ kind: "setback", status: "open" }); expect(ev[0]!.note).toBe("Risk: Due one");
    expect(store.demo.get("a")!.values["risk.review_on"]).toMatchObject({ value: iso(30) });
    expect(location.hash).toBe("#/journey/reality"); go("#/journey/reality"); expect($('[data-event-state="open"]')!.textContent).toMatch(/Risk: Due one/);
    go("#/today"); expect($("[data-risk-due-card]")).toBeNull(); expect($("[data-reality-today]")).not.toBeNull();
  });
  it("real mode without the tick saves nothing; demo risks never show in real mode", () => {
    localStorage.setItem("tm:ui:dataMode", "real");
    store.demo.put(risk("d", "Demo risk", { date: iso(-1) })); go("#/today"); expect($("[data-risk-due-card]")).toBeNull();
    store.real.put({ ...risk("r", "Real risk", { date: iso(-1) }), ns: "real", ownerId: "owner", values: { "risk.text": { state: "value", value: "Real risk", label: "FACT" }, "risk.review_on": { state: "value", value: iso(-1), label: "FACT" } } });
    for (const k of Object.keys(localStorage)) if (k.includes("consent")) localStorage.removeItem(k);
    go("#/journey/risks"); click('[data-act="risk-notyet"]'); expect(store.real.get("r")!.values["risk.review_on"]).toMatchObject({ value: iso(-1) });
    grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); go("#/journey/risks"); click('[data-act="risk-notyet"]'); expect(store.real.get("r")!.values["risk.review_on"]).toMatchObject({ value: iso(7) });
  });
  const KEYS = Object.keys(PACKS.en).filter((k) => k.startsWith("risk.due.") || k.startsWith("risk.review.")) as Key[];
  it("every risk review text exists in English, Bangla and Mix with the same placeholders", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    expect(KEYS.length).toBeGreaterThan(15);
    for (const k of KEYS) { expect(PACKS.bn[k]?.trim(), k).toBeTruthy(); expect(PACKS.mix[k]?.trim(), k).toBeTruthy(); expect(ph(PACKS.bn[k]), k).toBe(ph(PACKS.en[k])); }
    const bn = KEYS.map((k) => PACKS.bn[k]).join(" ");
    for (const bad of ["কর্মী", "পরিকল্পনা", "দক্ষতা", "ঝুঁকি", "অগ্রগতি", "বিকল্প", "সংরক্ষণ", "বিজ্ঞপ্তি", "মুছুন", "সংস্করণ", "তালিকা"]) expect(bn, bad).not.toContain(bad);
  });
  for (const lang of ["bn", "mix"] as const) it(`renders in ${lang} with Latin digits and no raw keys`, () => {
    localStorage.setItem("tm:ui:lang", lang); store.demo.put(risk("a", "Due one", { date: iso(-1), stop: "stop" })); store.demo.put(risk("s", "Soon", { date: iso(2) }));
    for (const p of ["#/journey/risks", "#/today", "#/journey/report"]) { go(p); expect(document.body.textContent, p).not.toMatch(/[০-৯]|\brisk\.(due|review)/); }
  });
});

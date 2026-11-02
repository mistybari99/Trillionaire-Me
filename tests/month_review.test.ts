// M16 monthly review + money and risk in every review, end to end: own records -> 30-day counts (Unknown, not 0) -> monthly page, weekly page,
// 90-day page -> assumptions check ("Still true" logs a line, "It has changed" starts a reality event). EN / BN / mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { assumptionItems, assumptionLog, monthWindow, monthlySummary, moneyReview, riskReview } from "../src/core/monthlyReview";
import { eventRows } from "../src/core/realityLoop";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, createdAt = "2026-11-02T08:00:00.000Z", links?: Record<string, string>): TMRecord =>
  ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt, values, ...(links ? { links } : {}) });
const done = (id: string, day: string) => rec(id, "task", { "task.title": v(id), "task.done_on": v(day) });
const fin = (id: string, kind: string, scope: string, amount: number | null, period = "monthly") => rec(id, "finance_item", { "finance.kind": v(kind), "finance.scope": v(scope), "finance.period": v(period), "finance.label": v(id), "finance.amount": amount === null ? { state: "unknown" } : v(amount) });
const risk = (id: string, text: string, o: { date?: string; stop?: string } = {}) => rec(id, "risk", { "risk.text": v(text), ...(o.date ? { "risk.review_on": v(o.date) } : {}), ...(o.stop ? { "risk.stop_rule": v(o.stop) } : {}) });
const TODAY = "2026-11-02";

describe("monthly review (pure)", () => {
  it("the window is the last 30 days, today included", () => { expect(monthWindow(TODAY)).toEqual({ from: "2026-10-04", to: "2026-11-02" }); });
  it("counts only inside the window; nothing in it is Unknown (null), never 0", () => {
    expect(monthlySummary([], TODAY)).toMatchObject({ tasksDone: null, focusMinutes: null, habitCheckins: null, stagePasses: null });
    const s = monthlySummary([done("a", "2026-10-04"), done("b", "2026-11-02"), done("old", "2026-10-03"),
      rec("f1", "focus_session", { "focus_session.date": v("2026-10-20"), "focus_session.minutes": v(25) }), rec("f2", "focus_session", { "focus_session.date": v("2026-10-21") }),
      rec("h1", "habit_log", { "habit_log.date": v("2026-10-25"), "habit_log.count": v(1) }), rec("h0", "habit_log", { "habit_log.date": v("2026-10-26"), "habit_log.count": v(0) })], TODAY);
    expect(s).toMatchObject({ tasksDone: 2, focusMinutes: 25, focusUnknown: 1, habitCheckins: 1 });
  });
  it("money: personal and business apart; unknown amount makes the total unknown; a scope without a monthly line is left out", () => {
    expect(moneyReview([])).toEqual([]);
    const r = moneyReview([fin("i", "income", "personal", 40000), fin("e", "expense", "personal", 25000), fin("b", "income", "business", null), fin("y", "expense", "business", 5, "yearly")]);
    expect(r.map((x) => x.scope)).toEqual(["personal", "business"]);
    expect(r[0]).toMatchObject({ income: { state: "value", value: 40000 }, expense: { value: 25000 }, cashFlow: { value: 15000 } });
    expect(r[1]).toMatchObject({ income: { state: "unknown", why: "incomplete" }, expense: { state: "unknown", why: "no_lines" }, cashFlow: { state: "unknown" } });
  });
  it("risks: due and soon listed, stop rules counted, none without a risk", () => {
    expect(riskReview([], TODAY).total).toBe(0);
    const r = riskReview([risk("a", "A", { date: "2026-10-30", stop: "s" }), risk("b", "B", { date: "2026-11-05" }), risk("c", "C", { date: "2027-01-01" }), risk("d", "D")], TODAY);
    expect(r).toMatchObject({ total: 4, noStopRule: 3 }); expect(r.due.map((x) => x.id)).toEqual(["a"]); expect(r.soon.map((x) => x.id)).toEqual(["b"]);
  });
  it("assumptions: free time, income and spending read back; unknown stays unknown; last check comes from the log", () => {
    const none = assumptionItems([], null); expect(none.map((x) => x.value.state)).toEqual(["unknown", "unknown", "unknown"]);
    const items = assumptionItems([fin("i", "income", "personal", 40000), fin("e", "expense", "personal", null), assumptionLog({ id: "l1", key: "income", text: "ok", createdAt: "2026-10-20T08:00:00.000Z" })], 600);
    expect(items[0]).toMatchObject({ key: "free_time", value: { state: "value", value: 10, unit: "hours_week" }, lastChecked: null });
    expect(items[1]).toMatchObject({ value: { value: 40000 }, lastChecked: "2026-10-20" }); expect(items[2]!.value).toEqual({ state: "unknown", why: "incomplete" });
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const iso = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("monthly review screens", () => {
  it("empty start: counts say 'not enough data', no money or risk block, assumptions still ask", () => {
    go("#/journey/month");
    for (const id of ["tasks", "focus", "habits", "passes"]) expect($(`[data-month-empty="${id}"]`), id).not.toBeNull();
    expect($("[data-review-money]")).toBeNull(); expect($("[data-review-risk]")).toBeNull(); expect($("[data-assumptions]")).not.toBeNull();
    expect($('[data-asm-row="income"]')!.textContent).toMatch(/No line in Money yet/);
  });
  it("with records: counts, money, risks; all three reviews show the money and risk blocks", () => {
    store.demo.put(done("a", iso(-3))); store.demo.put(fin("i", "income", "personal", 40000)); store.demo.put(fin("e", "expense", "personal", 25000)); store.demo.put(risk("r1", "Late supplier", { date: iso(-1) }));
    go("#/journey/month");
    expect($('[data-month="tasks"]')!.textContent).toMatch(/1 finished/);
    expect($('[data-money-scope="personal"]')!.textContent).toMatch(/40,000/); expect($('[data-money-scope="personal"]')!.textContent).toMatch(/15,000/);
    expect($('[data-review-risk-row="r1"]')!.textContent).toMatch(/Late supplier/);
    for (const p of ["#/journey/week", "#/journey/review"]) { go(p); expect($("[data-review-money]"), p).not.toBeNull(); expect($("[data-review-risk]"), p).not.toBeNull(); }
    go("#/journey/month"); for (const sel of ["[data-review-money]", "[data-review-risk]", "[data-assumptions]"]) expect($(sel)!.textContent, sel).not.toMatch(/fail|overdue|missed|behind/i);
  });
  it("'Still true' writes a journey-log line and the date shows next time; no event is created", () => {
    store.demo.put(fin("i", "income", "personal", 40000));
    go("#/journey/month"); $<HTMLButtonElement>('[data-act="asm-still"][data-asm="income"]')!.click(); render();
    expect($('[data-asm-row="income"] [data-asm-last]')!.getAttribute("data-asm-last")).toBe(iso(0));
    expect(store.demo.list().filter((r) => r.entity === "journey_log" && r.links?.assume === "income").length).toBe(1); expect(eventRows(store.demo.list()).length).toBe(0);
  });
  it("'It has changed' starts a reality event of the matching kind and opens that page", () => {
    go("#/journey/month"); $<HTMLButtonElement>('[data-act="asm-change"][data-asm="free_time"]')!.click();
    const ev = eventRows(store.demo.list()); expect(ev.length).toBe(1); expect(ev[0]).toMatchObject({ kind: "time_less", status: "open" }); expect(location.hash).toBe("#/journey/reality");
  });
  it("real mode without the tick saves nothing from the assumptions check", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent:real:v1");
    go("#/journey/month"); $<HTMLButtonElement>('[data-act="asm-still"][data-asm="income"]')!.click();
    expect(store.real.list().length).toBe(0);
  });
  it("linked from Journey, the weekly and the 90-day review", () => {
    go("#/journey"); expect($('a[href="#/journey/month"]')).not.toBeNull(); go("#/journey/week"); expect($('a[href="#/journey/month"]')).not.toBeNull(); go("#/journey/review"); expect($('a[href="#/journey/month"]')).not.toBeNull();
  });
});

describe("words", () => {
  it("keys exist in en, bn, mix; Bangla keeps the loanword rule; neutral copy", () => {
    const keys = Object.keys(PACKS.en).filter((k) => /^(month|mo)\./.test(k));
    expect(keys.length).toBeGreaterThan(40);
    for (const k of keys) { for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k]!.length, `${l}:${k}`).toBeGreaterThan(1); expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|প্রতিবেদন|আয়\b|পর্যালোচনা/); expect((PACKS.en as Record<string, string>)[k], k).not.toMatch(/fail|late|overdue|missed|behind|lazy|shame|penalt/i); }
  });
  it("Bangla and mix pages draw with Latin digits", () => {
    store.demo.put(fin("i", "income", "personal", 40000)); store.demo.put(risk("r1", "Supplier", { date: iso(-1) }));
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/journey/month"); expect(document.body.textContent!.length).toBeGreaterThan(80); expect(document.body.textContent).not.toMatch(/[০-৯]/); }
  });
  it("labelled buttons and one h1", () => { go("#/journey/month"); expect(document.querySelectorAll("h1").length).toBe(1); for (const b of document.querySelectorAll<HTMLButtonElement>("[data-asm-row] button")) expect(b.textContent!.length).toBeGreaterThan(2); });
});

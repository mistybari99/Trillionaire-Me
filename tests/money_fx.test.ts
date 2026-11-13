// M07 (TM-REQ-150): yearly and one-off money lines, other currencies with a rate the user types. End to end:
// form -> storage -> monthly figures / 90-day cash flow -> Money screen, reviews. Unknown is never 0; nothing is fetched. EN / BN / mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { bdtAmount, cashFlow90, financeFrom, foreignOf, parseCurrency, parseRate } from "../src/core/financeInputs";
import { monthlyCashFlow, monthlyIncome, netWorth } from "../src/core/finance";
import { moneyReview } from "../src/core/monthlyReview";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const fin = (id: string, kind: string, scope: string, amount: number | null, o: { period?: string; cur?: string; rate?: number; on?: string } = {}): TMRecord => ({ id, entity: "finance_item", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z",
  values: { "finance.kind": v(kind), "finance.scope": v(scope), "finance.label": v(id), "finance.amount": amount === null ? { state: "unknown" } : v(amount), "finance.period": v(o.period ?? "monthly"),
    ...(o.cur ? { "finance.currency": v(o.cur) } : {}), ...(o.rate ? { "finance.fx_rate": v(o.rate), "finance.fx_on": v("2026-11-01") } : {}), ...(o.on ? { "finance.on": v(o.on) } : {}) } });
const TODAY = "2026-11-02";

describe("parsers", () => {
  it("currency: blank or BDT is the base; three letters are kept in capitals; anything else is refused", () => {
    expect(parseCurrency("")).toEqual({ state: "base" }); expect(parseCurrency(" bdt ")).toEqual({ state: "base" }); expect(parseCurrency("usd")).toEqual({ state: "code", code: "USD" });
    for (const bad of ["US", "USDT", "12$", "€€€"]) expect(parseCurrency(bad), bad).toBeNull();
  });
  it("rate: blank is not typed yet; above 0 only; Bangla digits and commas accepted", () => {
    expect(parseRate("")).toEqual({ state: "unknown" }); expect(parseRate("120")).toEqual({ state: "value", value: 120 }); expect(parseRate("১২০.৫")).toEqual({ state: "value", value: 120.5 });
    expect(parseRate("1,200")).toEqual({ state: "value", value: 1200 }); for (const bad of ["0", "-3", "abc"]) expect(parseRate(bad), bad).toBeNull();
  });
});

describe("conversion and period rules (pure)", () => {
  it("another currency: amount x the user's rate; no rate means Unknown, never 0 and never a guess", () => {
    expect(bdtAmount(fin("a", "asset", "personal", 100, { cur: "USD", rate: 120 }))).toMatchObject({ state: "value", value: 12000, label: "ESTIMATE" });
    expect(bdtAmount(fin("b", "asset", "personal", 100, { cur: "USD" })).state).toBe("unknown");
    expect(bdtAmount(fin("c", "asset", "personal", null, { cur: "USD", rate: 120 })).state).toBe("unknown");
    expect(bdtAmount(fin("d", "asset", "personal", 500))).toMatchObject({ state: "value", value: 500 }); // BDT unchanged
    expect(foreignOf(fin("e", "asset", "personal", 1, { cur: "BDT" }))).toBeNull();
  });
  it("net worth in two currencies; one missing rate makes the total unknown", () => {
    const ok = financeFrom([fin("a", "asset", "personal", 100, { cur: "USD", rate: 120 }), fin("b", "liability", "personal", 2000)]);
    expect(netWorth(ok.items, "personal")).toMatchObject({ ok: true, value: 10000 }); expect(ok.foreign).toBe(1); expect(ok.foreignNoRate).toBe(0);
    const bad = financeFrom([fin("a", "asset", "personal", 100, { cur: "USD" }), fin("b", "liability", "personal", 2000)]);
    expect(netWorth(bad.items, "personal")).toMatchObject({ ok: false }); expect(bad.foreignNoRate).toBe(1);
  });
  it("yearly counts as one twelfth a month (ESTIMATE); one-off is outside the monthly figures", () => {
    const fv = financeFrom([fin("i", "income", "personal", 1000), fin("y", "expense", "personal", 1200, { period: "yearly" }), fin("o", "income", "personal", 5000, { period: "once", on: "2026-12-01" })]);
    expect(fv.yearly).toBe(1); expect(fv.notMonthly).toBe(1);
    expect(monthlyCashFlow(fv.items, "personal")).toEqual({ ok: true, value: 900, label: "ESTIMATE" }); expect(monthlyIncome(fv.items, "personal")).toMatchObject({ value: 1000 });
  });
  it("a yearly line in another currency converts first, then divides; a yearly line with an unknown amount stays unknown", () => {
    const fv = financeFrom([fin("y", "expense", "personal", 120, { period: "yearly", cur: "USD", rate: 100 })]);
    expect(fv.items[0]!.amount).toMatchObject({ value: 1000 });
    expect(financeFrom([fin("y", "expense", "personal", null, { period: "yearly" })]).items[0]!.amount.state).toBe("unknown");
    expect(financeFrom([fin("y", "expense", "personal", 50, { period: "yearly", cur: "USD" })]).items[0]!.amount.state).toBe("unknown");
  });
  it("90-day cash flow: three months, plus one-off lines dated today..day 89; undated counted, not added; unknown stays unknown", () => {
    const base = [fin("i", "income", "personal", 1000), fin("e", "expense", "personal", 400)];
    const c = (extra: TMRecord[]) => cashFlow90(financeFrom([...base, ...extra]), "personal", TODAY);
    expect(c([])).toEqual({ state: "value", value: 1800, oneOffIn: 0, undated: 0 });
    expect(c([fin("o1", "income", "personal", 700, { period: "once", on: "2026-12-15" })])).toMatchObject({ value: 2500, oneOffIn: 1 });
    expect(c([fin("o2", "expense", "personal", 300, { period: "once", on: "2026-11-02" })])).toMatchObject({ value: 1500 });          // today is inside
    expect(c([fin("o3", "income", "personal", 9000, { period: "once", on: "2027-02-01" })])).toMatchObject({ value: 1800, oneOffIn: 0 }); // day 91: outside
    expect(c([fin("o4", "income", "personal", 9000, { period: "once", on: "2026-11-01" })])).toMatchObject({ value: 1800 });           // in the past: outside
    expect(c([fin("o5", "income", "personal", 9000, { period: "once" })])).toMatchObject({ value: 1800, undated: 1 });
    expect(c([fin("o6", "income", "personal", null, { period: "once", on: "2026-12-01" })])).toMatchObject({ state: "unknown", missing: 1 });
    expect(cashFlow90(financeFrom([]), "personal", TODAY)).toMatchObject({ state: "unknown" });
  });
  it("reviews use the same figures: a foreign income line with no rate makes the review income unknown", () => {
    const r = moneyReview([fin("i", "income", "personal", 100, { cur: "USD" }), fin("e", "expense", "personal", 10)]);
    expect(r[0]!.income).toEqual({ state: "unknown", why: "incomplete" }); expect(r[0]!.expense).toMatchObject({ value: 10 });
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const set = (id: string, val: string) => { (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = val; };
const submit = (sel: string) => { $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});
const addLine = (o: { kind?: string; scope?: string; name: string; amount: string; period?: string; cur?: string; rate?: string; on?: string }) => {
  go("#/diary/money"); set("mf-kind", o.kind ?? "income"); set("mf-scope", o.scope ?? "personal"); set("mf-name", o.name); set("mf-amount", o.amount); set("mf-period", o.period ?? "monthly");
  set("mf-currency", o.cur ?? ""); set("mf-rate", o.rate ?? ""); set("mf-on", o.on ?? ""); submit('form[data-form="money"]');
};

describe("Money screen", () => {
  it("a foreign line with a rate shows the conversion and the date of the rate; the monthly figure uses it", () => {
    addLine({ name: "Freelance", amount: "100", cur: "usd", rate: "120" }); render();
    const rec = store.demo.list().find((r) => r.entity === "finance_item")!;
    expect(rec.values["finance.currency"]).toMatchObject({ value: "USD" }); expect(rec.values["finance.fx_rate"]).toMatchObject({ value: 120 }); expect(rec.values["finance.fx_on"]!.state).toBe("value");
    expect($(`[data-fx="${rec.id}"]`)!.textContent).toMatch(/USD 100 × rate 120 = BDT 12,000/); expect($(`[data-fx="${rec.id}"]`)!.textContent).toMatch(/rate typed on/);
    expect($("[data-fx-note]")!.textContent).toMatch(/1 line\(s\) are in another currency/); expect($('[data-scope="personal"]')!.textContent).toMatch(/12,000/);
  });
  it("no rate typed: amount stays Unknown, the total says so, and setting the rate later fixes it", () => {
    addLine({ name: "Freelance", amount: "100", cur: "USD", rate: "" }); render();
    const rec = store.demo.list().find((r) => r.entity === "finance_item")!;
    expect($(`[data-fx-norate="${rec.id}"]`)).not.toBeNull(); expect($('[data-scope="personal"] [data-unknown]')).not.toBeNull();
    set(`fxr-${rec.id}`, "110"); submit(`form[data-fx-edit="${rec.id}"]`); render();
    expect($(`[data-fx="${rec.id}"]`)!.textContent).toMatch(/BDT 11,000/); expect($("[data-fx-norate]")).toBeNull();
    set(`fxr-${rec.id}`, "0"); submit(`form[data-fx-edit="${rec.id}"]`); expect($(`form[data-fx-edit="${rec.id}"] .err`)!.textContent).toMatch(/above 0/);
  });
  it("bad currency, bad rate and a long-code are refused and nothing is saved", () => {
    addLine({ name: "x", amount: "1", cur: "US" }); expect($('form[data-form="money"] .err')!.textContent).toMatch(/three letters/);
    addLine({ name: "x", amount: "1", cur: "USD", rate: "-5" }); expect($('form[data-form="money"] .err')!.textContent).toMatch(/above 0/);
    expect(store.demo.list().filter((r) => r.entity === "finance_item").length).toBe(0);
  });
  it("a yearly line is one twelfth a month with a note; a dated one-off enters the 90-day figure; an undated one is counted aside", () => {
    addLine({ name: "Salary", amount: "1000" }); addLine({ kind: "expense", name: "Insurance", amount: "1200", period: "yearly" });
    const d = new Date(); d.setDate(d.getDate() + 10); const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    addLine({ name: "Bonus", amount: "700", period: "once", on: day }); addLine({ name: "Gift", amount: "50", period: "once" }); render();
    const p = $('[data-scope="personal"]')!;
    expect(p.textContent).toMatch(/900/);                           // 1000 - 1200/12
    expect($("[data-yearly-note]")!.textContent).toMatch(/1 yearly line/);
    expect($('[data-cash90="personal"]')!.textContent).toMatch(/3,400/);  // 3 x 900 + 700
    expect($('[data-cash90="personal"]')!.textContent).toMatch(/Includes 1 dated one-off/);
    expect($('[data-cash90-undated="1"]')).not.toBeNull();
    expect($('[data-fin-period="once"]')).not.toBeNull(); expect($('[data-fin-period="yearly"]')).not.toBeNull();
  });
  it("real mode needs the consent tick before saving a foreign line", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent:real:v1");
    addLine({ name: "x", amount: "5", cur: "USD", rate: "100" }); expect(store.real.list().length).toBe(0);
  });
  it("no network call is made for a rate", () => { const f = vi.fn(); vi.stubGlobal("fetch", f); addLine({ name: "x", amount: "5", cur: "EUR", rate: "130" }); render(); expect(f).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });
  it("the monthly review shows the converted income", () => {
    store.demo.put(fin("i", "income", "personal", 100, { cur: "USD", rate: 120 })); go("#/journey/month"); expect($('[data-money-scope="personal"]')!.textContent).toMatch(/12,000/);
  });
});

describe("words and a11y", () => {
  it("keys exist in en, bn, mix with no Bangla digits; Bangla keeps the loanword rule", () => {
    const keys = Object.keys(PACKS.en).filter((k) => /^money\.(currency|rate|on|err\.(currency|rate|on)|fx|yearly|oneoff|cash90\.)/.test(k));
    expect(keys.length).toBeGreaterThan(15);
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length, `${l}:${k}`).toBeGreaterThan(1); if (l !== "en") expect(s, `${l}:${k}`).not.toMatch(/[০-৯]/); }
    for (const k of keys) expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|প্রতিবেদন|আয়\b/);
  });
  it("the new inputs have labels; Bangla and mix pages draw", () => {
    store.demo.put(fin("i", "income", "personal", 100, { cur: "USD", rate: 120 }));
    for (const l of ["en", "bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/diary/money"); for (const id of ["mf-currency", "mf-rate", "mf-on"]) expect(document.querySelector(`label[for="${id}"]`), `${l}:${id}`).not.toBeNull(); expect(document.querySelector("[data-fx]")).not.toBeNull(); }
  });
});

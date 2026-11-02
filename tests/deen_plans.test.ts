// M13 Deen plans and reminders, end to end: input -> storage -> view -> Today/report links -> EN/BN/mix. Own numbers only for zakat;
// no score, rank, streak or ruling; private by default; real mode needs the real-data tick; included in backup and Delete, left out of CSV.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { StoreRepo } from "../src/adapters/storeRepo";
import { createBackup } from "../src/core/backup";
import { markedOn } from "../src/core/prayerLog";
import { isFastMarked } from "../src/core/fastLog";
import { dhakaNow, isoDate } from "../src/core/prayer";
import { NOTE_AREAS, dueToday, isDueOn, isMarked, markKind, noteRows, planRows, validateNote, validatePlan, validateZakat, zakatFigure, type PlanRow } from "../src/core/deenPlans";
import { PACKS } from "../src/i18n/packs";
import { FIELDS } from "../src/catalog/fields";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const plan = (id: string, o: Record<string, unknown>): TMRecord => ({ id, entity: "deen_plan", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T00:00:00Z",
  values: Object.fromEntries(Object.entries({ kind: "learning", title: "Study", repeat: "daily", ...o }).map(([k, x]) => [`deen_plan.${k}`, v(x)])) });
const row = (o: Partial<PlanRow>): PlanRow => ({ id: "p", ns: "demo", kind: "learning", title: "T", repeat: "daily", due: null, active: true, note: null, prayer: null, ...o });

describe("due rules", () => {
  it("daily is due every day from its optional start; paused plans are never due", () => {
    expect(isDueOn(row({}), "2026-11-02")).toBe(true); expect(isDueOn(row({ due: "2026-11-05" }), "2026-11-02")).toBe(false); expect(isDueOn(row({ due: "2026-11-05" }), "2026-11-05")).toBe(true);
    expect(isDueOn(row({ active: false }), "2026-11-02")).toBe(false);
  });
  it("weekly uses the weekday of its date; monthly clamps to a short month; yearly uses month and day; once only that day", () => {
    expect(isDueOn(row({ repeat: "weekly", due: "2026-11-02" }), "2026-11-09")).toBe(true); expect(isDueOn(row({ repeat: "weekly", due: "2026-11-02" }), "2026-11-10")).toBe(false);
    expect(isDueOn(row({ repeat: "monthly", due: "2026-01-31" }), "2026-02-28")).toBe(true); expect(isDueOn(row({ repeat: "monthly", due: "2026-01-31" }), "2026-02-27")).toBe(false);
    expect(isDueOn(row({ repeat: "yearly", due: "2025-03-01" }), "2026-03-01")).toBe(true); expect(isDueOn(row({ repeat: "yearly", due: "2025-03-01" }), "2026-03-02")).toBe(false);
    expect(isDueOn(row({ repeat: "once", due: "2026-11-02" }), "2026-11-02")).toBe(true); expect(isDueOn(row({ repeat: "once", due: "2026-11-02" }), "2026-11-03")).toBe(false);
  });
  it("a repeat that needs a date but has none is not scheduled (Unknown, not every day); a date before the start is not due", () => {
    expect(isDueOn(row({ repeat: "weekly", due: null }), "2026-11-02")).toBe(false); expect(isDueOn(row({ repeat: "once", due: "2026-12-01" }), "2026-11-02")).toBe(false);
  });
  it("bad records are dropped; paused state is read", () => {
    const rows = planRows([plan("a", {}), plan("b", { kind: "nope" }), plan("c", { title: "" }), plan("d", { status: "paused" }), plan("e", { due: "2026-02-30", repeat: "once" })]);
    expect(rows.map((r) => r.id).sort()).toEqual(["a", "d", "e"]); expect(rows.find((r) => r.id === "d")!.active).toBe(false); expect(rows.find((r) => r.id === "e")!.due).toBeNull();
  });
});

describe("zakat figure uses only typed numbers", () => {
  it("any missing number is Unknown and names what to enter; nothing is defaulted to 0", () => {
    expect(zakatFigure(null, null, null)).toEqual({ state: "unknown", missing: ["wealth", "nisab", "rate"] });
    expect(zakatFigure(1000, null, 2.5)).toEqual({ state: "unknown", missing: ["nisab"] });
    expect(zakatFigure(1000, 500, null)).toEqual({ state: "unknown", missing: ["rate"] });
  });
  it("below the typed nisab: no figure; otherwise wealth x typed rate", () => {
    expect(zakatFigure(400, 500, 2.5)).toEqual({ state: "below" }); expect(zakatFigure(1000, 500, 2.5)).toEqual({ state: "figure", amount: 25 });
    expect(zakatFigure(0, 0, 2.5)).toEqual({ state: "figure", amount: 0 });
  });
  it("validation", () => {
    const ok = { wealth: "1000", nisab: "500", rate: "2.5", hawl: "2027-03-01", note: "" };
    expect(validateZakat(ok)).toBeNull(); expect(validateZakat({ ...ok, wealth: "-1" })).toBe("number_invalid"); expect(validateZakat({ ...ok, rate: "101" })).toBe("rate_invalid");
    expect(validateZakat({ ...ok, hawl: "2027-13-01" })).toBe("date_invalid"); expect(validateZakat({ wealth: "", nisab: "", rate: "", hawl: "", note: "" })).toBe("empty");
  });
  it("the app contains no nisab amount, rate or silver/gold weight in any plan text or field", () => {
    const txt = [...Object.entries(PACKS.en).filter(([k]) => k.startsWith("dp.")).map(([, s]) => s), ...FIELDS.filter((f) => ["deen_plan", "deen_mark", "zakat_snapshot"].includes(f.entity)).flatMap((f) => [f.label.en, f.help.what.en, f.help.why.en])].join(" ");
    expect(txt).not.toMatch(/\b(87\.48|612\.36|52\.5|85 ?g|595 ?g|2\.5 ?%)\b/);
  });
});

describe("validation", () => {
  const ok = { kind: "learning", title: "Study", repeat: "daily", due: "", note: "" };
  it("plan", () => {
    expect(validatePlan(ok)).toBeNull(); expect(validatePlan({ ...ok, kind: "x" })).toBe("kind_required"); expect(validatePlan({ ...ok, title: " " })).toBe("title_required");
    expect(validatePlan({ ...ok, repeat: "weekly" })).toBe("due_required"); expect(validatePlan({ ...ok, repeat: "weekly", due: "bad" })).toBe("due_invalid"); expect(validatePlan({ ...ok, repeat: "weekly", due: "2026-11-02" })).toBeNull();
  });
  it("note areas: text or a positive amount; every older Deen field has exactly one area", () => {
    expect(validateNote({ area: "quran", text: "15 minutes", amount: "" })).toBeNull(); expect(validateNote({ area: "quran", text: "", amount: "" })).toBe("text_required");
    expect(validateNote({ area: "giving", text: "", amount: "0" })).toBe("amount_invalid"); expect(validateNote({ area: "giving", text: "", amount: "500" })).toBeNull(); expect(validateNote({ area: "x", text: "a", amount: "" })).toBe("area_required");
    expect(NOTE_AREAS.map((a) => a.field).sort()).toEqual(["giving.amount", "hajj_plan.note", "learning_item.title", "prayer_log.note", "quran_activity.note", "right_duty.note"]);
  });
});

const $ = (s: string) => document.querySelector(s);
const $$ = (s: string) => Array.from(document.querySelectorAll(s));
const go = (h: string) => { location.hash = h; render(); };
const set = (id: string, val: string) => { (document.getElementById(id) as HTMLInputElement).value = val; };
const submit = (sel: string) => { ($(sel) as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
const day = () => isoDate(dhakaNow(Date.now()).date);
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00Z"); });
const addPlan = (o: { kind?: string; title: string; repeat?: string; due?: string; prayer?: string; note?: string }) => {
  go("#/deen/plans"); set("dp-kind", o.kind ?? "learning"); set("dp-title", o.title); set("dp-repeat", o.repeat ?? "daily"); set("dp-due", o.due ?? ""); set("dp-prayer", o.prayer ?? ""); set("dp-note", o.note ?? ""); submit('form[data-form="deen-plan"]'); render();
};

describe("screens (demo)", () => {
  it("add a plan: saved, listed, shows on Today with a one-tap mark that undoes; report shows a link only", () => {
    go("#/deen/plans"); expect($("[data-deen-banner]")!.textContent).toMatch(/Nothing is judged/); expect($("[data-deen-empty]")).not.toBeNull();
    addPlan({ title: "Read ten minutes", note: "start small" });
    expect(planRows(store.demo.list())[0]).toMatchObject({ kind: "learning", title: "Read ten minutes", repeat: "daily", active: true, note: "start small" });
    expect($("[data-deen-plan]")!.textContent).toMatch(/Read ten minutes/); expect($("[data-plan-note]")!.textContent).toBe("start small");
    go("#/today"); expect($('[data-deen-card="today"]')!.textContent).toMatch(/Read ten minutes/);
    const id = planRows(store.demo.list())[0]!.id;
    ($('[data-deen-card="today"] [data-act="plan-mark"]') as HTMLButtonElement).click(); render();
    expect(isMarked(store.demo.list(), planRows(store.demo.list())[0]!, day())).toBe(true); expect($('[data-act="plan-mark"]')!.getAttribute("aria-pressed")).toBe("true");
    ($('[data-act="plan-mark"]') as HTMLButtonElement).click(); render(); expect(isMarked(store.demo.list(), planRows(store.demo.list())[0]!, day())).toBe(false);
    expect(store.demo.list().some((r) => r.entity === "deen_mark")).toBe(false); expect(id).toBeTruthy();
    go("#/journey/report"); const rc = $('[data-deen-card="report"]')!; expect(rc.classList.contains("no-print")).toBe(true); expect(rc.textContent).not.toMatch(/Read ten minutes/);
    go("#/deen"); expect($('a[href="#/deen/plans"]')).not.toBeNull();
  });
  it("a salah plan tied to a prayer shares the prayer mark of the Deen page; a fasting plan shares the fast mark", () => {
    addPlan({ kind: "salah", title: "Fajr on time", prayer: "fajr" }); addPlan({ kind: "fasting", title: "Monday fast" });
    const [salah, fast] = planRows(store.demo.list()); expect(markKind(salah!)).toEqual({ via: "prayer", prayer: "fajr" }); expect(markKind(fast!)).toEqual({ via: "fast" });
    go("#/today"); for (const b of $$('[data-act="plan-mark"]')) (b as HTMLButtonElement).click();
    expect(markedOn(store.demo.list(), day()).has("fajr")).toBe(true); expect(isFastMarked(store.demo.list(), day())).toBe(true); expect(store.demo.list().some((r) => r.entity === "deen_mark")).toBe(false);
    go("#/deen"); expect($('[data-act="prayer-mark"][data-prayer="fajr"]')!.getAttribute("aria-pressed")).toBe("true");
    go("#/today"); for (const b of $$('[data-act="plan-mark"]')) (b as HTMLButtonElement).click();
    expect(markedOn(store.demo.list(), day()).size).toBe(0); expect(isFastMarked(store.demo.list(), day())).toBe(false);
  });
  it("pause hides the reminder, resume brings it back, remove deletes; a plan with a future date is not on Today", () => {
    addPlan({ title: "Weekly class", repeat: "weekly", due: "2026-01-05" }); const p = planRows(store.demo.list())[0]!;
    expect(dueToday(store.demo.list(), day()).length).toBe(isDueOn(p, day()) ? 1 : 0);
    addPlan({ title: "Daily one" }); go("#/deen/plans"); ($('[data-act="plan-pause"]') as HTMLButtonElement).click(); render();
    expect(dueToday(store.demo.list(), day()).map((x) => x.plan.title)).not.toContain("Daily one"); expect($("[data-plan-paused]")).not.toBeNull();
    ($('[data-act="plan-resume"]') as HTMLButtonElement).click(); render(); expect(dueToday(store.demo.list(), day()).map((x) => x.plan.title)).toContain("Daily one");
    ($("[data-remove]") as HTMLButtonElement).click(); expect(planRows(store.demo.list()).length).toBe(1);
  });
  it("errors are shown and nothing is saved; a password-like note is refused", () => {
    go("#/deen/plans"); set("dp-title", ""); submit('form[data-form="deen-plan"]'); expect($('form[data-form="deen-plan"] .err')!.textContent).toMatch(/name for the plan/); expect(store.demo.list().length).toBe(0);
    set("dp-title", "Plan"); set("dp-repeat", "weekly"); submit('form[data-form="deen-plan"]'); expect($('form[data-form="deen-plan"] .err')!.textContent).toMatch(/needs a date/);
  });
  it("zakat: with no nisab typed it says to enter the current nisab yourself; with all three numbers it shows the figure and the days left", () => {
    go("#/deen/plans"); expect($('[data-zakat-figure="unknown"]')!.textContent).toMatch(/Unknown.*wealth.*nisab.*rate/);
    set("z-wealth", "100000"); set("z-rate", "2.5"); submit('form[data-form="zakat"]'); render();
    expect($('[data-zakat-figure="unknown"]')!.textContent).toMatch(/enter the current nisab yourself/); expect($('[data-zakat-figure="unknown"]')!.textContent).not.toMatch(/enter your wealth/);
    set("z-nisab", "50000"); set("z-hawl", "2099-01-01"); set("z-note", "year ends in winter"); submit('form[data-form="zakat"]'); render();
    expect($('[data-zakat-figure="figure"]')!.textContent).toMatch(/2,?500/); expect($("[data-zakat-days]")).not.toBeNull();
    set("z-nisab", "500000"); submit('form[data-form="zakat"]'); render(); expect($('[data-zakat-figure="below"]')).not.toBeNull();
    expect(store.demo.list().filter((r) => r.entity === "zakat_snapshot").length).toBe(1);
  });
  it("private notes and giving: each older Deen field has a place to type it and is shown back", () => {
    go("#/deen/plans");
    for (const [area, text] of [["prayer", "late for Fajr"], ["quran", "ten minutes"], ["hajj", "save slowly"], ["duty", "repay a loan"], ["learning", "rules of prayer"]] as const) { set("dn-area", area); set("dn-text", text); submit('form[data-form="deen-note"]'); render(); }
    set("dn-area", "giving"); set("dn-amount", "500"); submit('form[data-form="deen-note"]'); render();
    const rows = noteRows(store.demo.list()); expect(rows.length).toBe(6); expect(rows.find((r) => r.area === "giving")!.amount).toBe(500);
    const shown = $("[data-deen-notes]")!.textContent!; for (const s of ["late for Fajr", "ten minutes", "save slowly", "repay a loan", "rules of prayer", "500"]) expect(shown).toContain(s);
    // the prayer note record never counts as a prayer mark
    expect(markedOn(store.demo.list(), day()).size).toBe(0);
  });
});

describe("real mode, privacy, backup, Delete, CSV", () => {
  it("real mode without the tick: hidden, nothing saved; with the tick: saved as real (FACT) and labelled", () => {
    localStorage.clear(); localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "real");
    go("#/deen/plans"); expect($("[data-deen-locked]")).not.toBeNull(); expect($('form[data-form="deen-plan"]')).toBeNull(); go("#/today"); expect($('[data-deen-card="today"]')).toBeNull();
    grantConsent(consentKv, "2026-11-02T00:00:00Z"); addPlan({ title: "Real plan" });
    const r = store.real.list().filter((x) => x.entity === "deen_plan"); expect(r.length).toBe(1); expect(r[0]!.values["deen_plan.title"]).toMatchObject({ label: "FACT" }); expect(store.demo.list().length).toBe(0);
  });
  it("kept in the backup, removed by Delete, left out of CSV unless authorised per record", async () => {
    localStorage.setItem("tm:ui:dataMode", "real"); addPlan({ title: "Private plan" }); go("#/deen/plans"); set("z-wealth", "1000"); submit('form[data-form="zakat"]'); render();
    set("dn-area", "giving"); set("dn-amount", "250"); submit('form[data-form="deen-note"]');
    const b = await createBackup(new StoreRepo(store as never), "real"); const ents = new Set(b.records.map((x) => x.entity)); for (const e of ["deen_plan", "zakat_snapshot", "giving"]) expect(ents.has(e), e).toBe(true);
    const { exportCsv } = await import("../src/core/csv"); const csv = exportCsv(store as never, "real"); for (const e of ["deen_plan", "zakat_snapshot", "giving"]) expect(csv, e).not.toMatch(new RegExp(e));
    const id = store.real.list().find((x) => x.entity === "deen_plan")!.id; expect(exportCsv(store as never, "real", { authorisedRecordIds: new Set([id]) })).toMatch(/deen_plan/);
    store.real.clear(); expect(store.real.list().length).toBe(0);
  });
  it("every plan field is private worship data with the Deen note; no score/rank/streak/fatwa wording in any language", () => {
    const fs = FIELDS.filter((f) => f.entity === "deen_plan" || f.entity === "deen_mark"); expect(fs.length).toBeGreaterThanOrEqual(8);
    for (const f of fs) { expect(f.privacy).toBe("worship"); expect(f.access).toBe("device_only_per_item_authorisation"); expect(f.help.why.en).toContain("Plans and reminders only"); }
    const bad = /\b(score|rank|streak|leaderboard|points?|fatwa:|missed|overdue)\b/i;
    for (const l of ["en", "bn", "mix"] as const) for (const k of Object.keys(PACKS.en).filter((k) => k.startsWith("dp."))) expect((PACKS[l] as Record<string, string>)[k], `${l} ${k}`).not.toMatch(bad);
  });
  it("keys in en/bn/mix with Latin digits and the loanword rule; every input has a label; reachable from Deen and Today", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("dp."));
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length, k).toBeGreaterThan(1); if (l !== "en") expect(s, k).not.toMatch(/[০-৯]/); }
    for (const k of keys) expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|অনুমতি|তালিকা|সংরক্ষ/);
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/deen/plans"); expect(document.querySelectorAll("h1").length).toBe(1);
      for (const id of ["dp-kind", "dp-title", "dp-repeat", "dp-due", "dp-prayer", "dp-note", "z-wealth", "z-nisab", "z-rate", "z-hawl", "z-note", "dn-area", "dn-text", "dn-amount"]) expect(document.querySelector(`label[for="${id}"]`), `${l} ${id}`).not.toBeNull(); }
  });
});

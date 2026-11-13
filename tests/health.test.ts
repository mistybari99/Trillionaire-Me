// M14 health and family, end to end. Own entries only; no range, no alert, no advice, no score; separate consent tick in real mode.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { grantHealthConsent, healthRows, readHealthConsent, summarise, validateHealth } from "../src/core/health";
import { PACKS } from "../src/i18n/packs";
import { FIELDS } from "../src/catalog/fields";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const ent = (id: string, kind: string, date: string, value?: number, unit?: string): TMRecord => ({ id, entity: "health_entry", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T00:00:00Z",
  values: { "health_entry.date": v(date), "health_entry.kind": v(kind), ...(value !== undefined ? { "health_entry.value": v(value) } : {}), ...(unit ? { "health_entry.unit": v(unit) } : {}) } });

describe("health core", () => {
  it("rows: newest first, bad kind or date dropped, blank number is null (not 0)", () => {
    const rows = healthRows([ent("a", "sleep", "2026-11-01", 7), ent("b", "walking", "2026-11-02"), ent("x", "nope", "2026-11-02"), ent("y", "sleep", "bad")]);
    expect(rows.map((r) => r.id)).toEqual(["b", "a"]); expect(rows[0]!.value).toBeNull();
  });
  it("summary counts days with an entry in 7 days; nothing for a kind never written; no range or total", () => {
    const rows = healthRows([ent("a", "sleep", "2026-11-01", 7), ent("a2", "sleep", "2026-11-01", 6), ent("b", "sleep", "2026-10-20", 5)]);
    const s = summarise(rows, "2026-11-02"); expect(s.length).toBe(1); expect(s[0]).toMatchObject({ kind: "sleep", daysWithEntry: 1 });
    expect(summarise([], "2026-11-02")).toEqual([]);
  });
  it("validation; a measured number needs its own unit and the app suggests none", () => {
    const ok = { kind: "walking", date: "2026-11-02", value: "30", unit: "", note: "" };
    expect(validateHealth(ok)).toBeNull(); expect(validateHealth({ ...ok, value: "-1" })).toBe("value_invalid"); expect(validateHealth({ ...ok, kind: "reading_a" })).toBe("unit_required");
    expect(validateHealth({ ...ok, kind: "reading_a", value: "", unit: "" })).toBe("empty"); expect(validateHealth({ ...ok, kind: "reading_a", unit: "mmHg" })).toBeNull();
  });
  it("no normal range or threshold anywhere in the health strings and fields", () => {
    const txt = [...Object.entries(PACKS.en).filter(([k]) => k.startsWith("hl.")).map(([, s]) => s), ...FIELDS.filter((f) => f.entity === "health_entry").flatMap((f) => [f.label.en, f.help.what.en, f.help.why.en])].join(" ");
    expect(txt).not.toMatch(/\b(healthy|danger|too much|too little|recommended|dose)\b/i);
    expect(FIELDS.filter((f) => f.entity === "health_entry").every((f) => f.privacy === "health")).toBe(true);
  });
});

const $ = (s: string) => document.querySelector(s);
const go = (h: string) => { location.hash = h; render(); };
const set = (id: string, val: string) => { (document.getElementById(id) as HTMLInputElement).value = val; };
const submit = (sel: string) => { ($(sel) as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z"); });

describe("screens", () => {
  it("demo: add, see counts, Today and report show counts only (no values), remove", () => {
    go("#/diary/health"); expect($("[data-health-banner]")!.textContent).toMatch(/No normal range/); expect($("[data-health-empty]")).not.toBeNull();
    set("hl-kind", "walking"); set("hl-value", "30"); submit('form[data-form="health"]'); render();
    expect(healthRows(store.demo.list())[0]).toMatchObject({ kind: "walking", value: 30 }); expect($("[data-health-summary]")!.textContent).toMatch(/1 day\(s\) with an entry/);
    go("#/today"); expect($('[data-health-card="today"]')!.textContent).toMatch(/Walking/); expect($('[data-health-card="today"]')!.textContent).not.toMatch(/30/);
    go("#/journey/report"); expect($('[data-health-card="report"]')).not.toBeNull();
    go("#/diary/health"); ($("[data-remove]") as HTMLButtonElement).click(); expect(healthRows(store.demo.list()).length).toBe(0);
  });
  it("real mode: hidden and unsaved until the separate health tick; withdraw stops new saves but keeps entries", () => {
    localStorage.setItem("tm:ui:dataMode", "real");
    go("#/diary/health"); expect($("[data-health-locked]")).not.toBeNull(); expect($('form[data-form="health"]')).toBeNull(); expect($('[data-health-consent="off"]')).not.toBeNull();
    (document.getElementById("health-tick") as HTMLInputElement).checked = true; ($('[data-act="health-consent"]') as HTMLButtonElement).click(); render();
    expect(readHealthConsent(consentKv)).toBe(true); set("hl-kind", "sleep"); set("hl-value", "7"); submit('form[data-form="health"]'); expect(store.real.list().filter((r) => r.entity === "health_entry").length).toBe(1);
    render(); ($('[data-act="health-withdraw"]') as HTMLButtonElement).click(); render();
    expect(readHealthConsent(consentKv)).toBe(false); expect($("[data-health-locked]")).not.toBeNull(); go("#/today"); expect($("[data-health-card]")).toBeNull();
    expect(store.real.list().filter((r) => r.entity === "health_entry").length).toBe(1);
  });
  it("real data consent alone is not enough; both ticks allow saving", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); go("#/diary/health"); expect($('form[data-form="health"]')).toBeNull();
    grantHealthConsent(consentKv, "2026-11-02T00:00:00Z"); go("#/diary/health"); expect($('form[data-form="health"]')).not.toBeNull();
  });
  it("health entries stay out of the CSV export", async () => {
    store.demo.put(ent("a", "sleep", "2026-11-01", 7)); store.demo.put({ id: "g", entity: "goal", ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T00:00:00Z", values: { "goal.title": v("G") } });
    const { exportCsv } = await import("../src/core/csv"); const csv = exportCsv(store as never, "demo");
    expect(csv).toMatch(/goal\.title/); expect(csv).not.toMatch(/health_entry/);
  });
  it("keys in en/bn/mix, Latin digits, loanword rule; labelled inputs; linked from the diary", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("hl."));
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length).toBeGreaterThan(1); if (l !== "en") expect(s, k).not.toMatch(/[০-৯]/); }
    for (const k of keys) expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|প্রতিবেদন/);
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/diary/health"); for (const id of ["hl-date", "hl-kind", "hl-value", "hl-unit", "hl-note"]) expect(document.querySelector(`label[for="${id}"]`), id).not.toBeNull(); }
    go("#/diary"); expect($('a[href="#/diary/health"]')).not.toBeNull();
  });
});

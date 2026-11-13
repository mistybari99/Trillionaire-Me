// M17 notes, sources and SOPs, end to end: forms -> storage -> lists with freshness -> role card, hand-over print, Settings guides. EN/BN/mix.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { consentKv, store } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { noteRows, sopRows, sopsForRole, sourceRows, splitSteps, validateNote, validateSop, validateSource } from "../src/core/knowledge";
import type { FieldValue, TMRecord } from "../src/core/types";

const v = (x: unknown): FieldValue => ({ state: "value", value: x, label: "DEMO" }) as FieldValue;
const rec = (id: string, entity: string, values: Record<string, FieldValue>, links?: Record<string, string>): TMRecord => ({ id, entity, ns: "demo", ownerId: "u", schemaVersion: 1, createdAt: "2026-11-02T08:00:00.000Z", values, ...(links ? { links } : {}) });
const NOW = new Date("2026-11-02T12:00:00Z");

describe("knowledge (pure)", () => {
  it("source freshness: recent, stale after 180 days, no date is unknown", () => {
    const rows = sourceRows([rec("a", "source", { "source.title": v("A"), "source.checked_on": v("2026-10-01") }), rec("b", "source", { "source.title": v("B"), "source.checked_on": v("2026-01-01") }), rec("c", "source", { "source.title": v("C") }), rec("x", "source", {})], NOW);
    expect(rows.map((r) => [r.id, r.fresh])).toEqual([["a", "recent"], ["b", "stale"], ["c", "unknown"]]);
  });
  it("notes keep a link only to a source/goal that exists", () => {
    const n = noteRows([rec("s", "source", { "source.title": v("S") }), rec("n", "note", { "note.title": v("N") }, { source: "s", goal: "gone" })]);
    expect(n[0]).toMatchObject({ sourceId: "s", goalId: null });
  });
  it("SOP steps: one per line, numbers and dashes removed; per role", () => {
    expect(splitSteps("1. Take box\n- Label\n\n  3) Ship")).toEqual(["Take box", "Label", "Ship"]);
    const rows = sopRows([rec("r", "team_role", { "team_role.role": v("Pack") }), rec("p", "sop", { "sop.title": v("Pack"), "sop.steps": v("a\nb"), "sop.reviewed_on": v("2026-11-01") }, { role: "r" })], NOW);
    expect(sopsForRole(rows, "r").map((x) => x.steps)).toEqual([["a", "b"]]);
  });
  it("validation", () => {
    expect(validateSource({ title: "", reference: "", note: "", checkedOn: "" })).toBe("title_required"); expect(validateSource({ title: "a", reference: "", note: "", checkedOn: "x" })).toBe("date_invalid");
    expect(validateNote({ title: "a", text: "x".repeat(2001) })).toBe("text_long");
    expect(validateSop({ title: "a", steps: "" })).toBe("steps_required"); expect(validateSop({ title: "a", steps: Array(31).fill("s").join("\n") })).toBe("steps_many");
  });
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const go = (h: string) => { location.hash = h; render(); };
const set = (id: string, val: string) => { (document.getElementById(id) as HTMLInputElement).value = val; };
const submit = (sel: string) => { $<HTMLFormElement>(sel)!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-11-02T00:00:00.000Z");
});

describe("Notes page", () => {
  it("add a source, then a note that points to it, then a SOP for a role; role card and hand-over print show the SOP", () => {
    store.demo.put(rec("r1", "team_role", { "team_role.role": v("Packing"), "team_role.holder": v("open") }));
    go("#/notes"); set("kn-s-title", "Accounts book"); set("kn-s-ref", "chapter 3"); submit('form[data-form="source"]'); render();
    const src = sourceRows(store.demo.list(), new Date())[0]!; expect(src.title).toBe("Accounts book"); expect($(`[data-source="${src.id}"]`)!.textContent).toMatch(/chapter 3/); expect($(`[data-source="${src.id}"] [data-fresh="unknown"]`)).not.toBeNull();
    $<HTMLButtonElement>(`[data-act="source-checked"]`)!.click(); render(); expect($(`[data-source="${src.id}"] [data-fresh="recent"]`)).not.toBeNull();
    set("kn-n-title", "Pricing idea"); (document.getElementById("kn-n-src") as HTMLSelectElement).value = src.id; submit('form[data-form="note"]'); render();
    expect($("[data-note-source]")!.textContent).toMatch(/Accounts book/);
    set("kn-p-title", "Pack an order"); (document.getElementById("kn-p-steps") as HTMLTextAreaElement).value = "1. Take box\n2. Label"; (document.getElementById("kn-p-role") as HTMLSelectElement).value = "r1"; submit('form[data-form="sop"]'); render();
    expect($("[data-sop] ol")!.querySelectorAll("li").length).toBe(2); expect($("[data-sop-role]")!.textContent).toMatch(/Packing/);
    go("#/diary/team"); expect($('[data-role-sops="1"]')!.textContent).toMatch(/Pack an order/);
    go("#/journey/print/handover"); expect($("[data-print-sop]")!.textContent).toMatch(/Take box/);
  });
  it("bad input is refused; nothing saved", () => {
    go("#/notes"); submit('form[data-form="sop"]'); expect($('form[data-form="sop"] .err')!.textContent).toMatch(/name/); set("kn-p-title", "x"); submit('form[data-form="sop"]'); expect($('form[data-form="sop"] .err')!.textContent).toMatch(/one step/);
    expect(store.demo.list().length).toBe(0);
  });
  it("real mode without the tick saves nothing", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); localStorage.removeItem("tm:consent:real:v1"); go("#/notes"); set("kn-s-title", "x"); submit('form[data-form="source"]'); expect(store.real.list().length).toBe(0);
  });
  it("linked from Settings guides", () => { go("#/settings/about"); expect($('a[href="#/notes"]')).not.toBeNull(); });
  it("keys in en/bn/mix, Latin digits, loanword rule; pages draw", () => {
    const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("kn."));
    expect(keys.length).toBeGreaterThan(40);
    for (const k of keys) { for (const l of ["en", "bn", "mix"] as const) { const s = (PACKS[l] as Record<string, string>)[k]!; expect(s.length).toBeGreaterThan(1); if (l !== "en") expect(s, k).not.toMatch(/[০-৯]/); } expect((PACKS.bn as Record<string, string>)[k], k).not.toMatch(/পরিকল্পনা|ঝুঁকি|উৎস|প্রতিবেদন/); }
    for (const l of ["bn", "mix"]) { localStorage.setItem("tm:ui:lang", l); go("#/notes"); expect(document.querySelectorAll("h1").length).toBe(1); for (const id of ["kn-s-title", "kn-n-title", "kn-p-title", "kn-p-steps"]) expect(document.querySelector(`label[for="${id}"]`), id).not.toBeNull(); }
  });
});

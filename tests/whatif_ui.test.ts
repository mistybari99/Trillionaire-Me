// LIVECALC-01: the What-if screens, the sheet, saving a note, the copy and the offline guarantee.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { PACKS } from "../src/i18n/packs";
import { VARIANTS, CATEGORIES } from "../src/core/whatifCatalog";
import { getTemplate } from "../src/core/whatif";
import type { FieldValue, TMRecord } from "../src/core/types";

const go = (hash: string) => { location.hash = hash; render(); };
const q = <T extends Element>(sel: string): T => document.querySelector(sel) as T;
const type = (id: string, value: string) => { const el = document.getElementById(id) as HTMLInputElement; el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); };
const valueOf = (out: string): string => q<HTMLElement>(`[data-out="${out}"] [data-wi-value]`)?.textContent ?? "";
const dv = (v: unknown): FieldValue => ({ state: "value", value: v as never, label: "DEMO" });
const rec = (id: string, entity: string, values: Record<string, unknown>): TMRecord => ({ id, entity, ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: "2026-11-01T00:00:00.000Z", values: Object.fromEntries(Object.entries(values).map(([k, x]) => [k, dv(x)])) });

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-10-26T00:00:00.000Z");
});

describe("links: every calculator is reachable and opens", () => {
  it("the What-if button is in the top bar of every main screen", () => {
    for (const r of ["/today", "/journey", "/diary", "/deen", "/settings", "/habits", "/diary/money", "/journey/goals", "/diary/health", "/deen/plans", "/diary/plan", "/more/status", "/whatif"]) {
      go(`#${r}`); expect(q(`.top [data-act="whatif-open"]`), r).not.toBeNull();
    }
  });
  it("the index links every calculator, and each link opens a working calculator in English, Bangla and Mix", () => {
    for (const lang of ["en", "bn", "mix"]) {
      localStorage.setItem("tm:ui:lang", lang); go("#/whatif");
      for (const c of CATEGORIES) expect(q(`[data-wi-cat="${c}"]`), c).not.toBeNull();
      const links = [...document.querySelectorAll("[data-wi-link]")].map((a) => a.getAttribute("href"));
      expect(links.length).toBe(VARIANTS.length);
      for (const v of VARIANTS) {
        expect(links).toContain(`#/whatif/${v.id}`);
        go(`#/whatif/${v.id}`);
        const panel = q<HTMLElement>(`[data-whatif-panel][data-variant="${v.id}"]`); expect(panel, `${lang} ${v.id}`).not.toBeNull();
        expect(panel.textContent, `${lang} ${v.id}`).not.toMatch(/\{\w+\}/);
        const tpl = getTemplate(v.tpl)!;
        expect(document.querySelectorAll("[data-wi-in]").length + document.querySelectorAll("[data-field]").length).toBeGreaterThan(0);
        expect(q("[data-wi-find]") !== null, v.id).toBe(tpl.solvable.length > 0);
      }
    }
  });
});

describe("typing numbers", () => {
  it("10 pages a day at 3 minutes a page is 30 minutes; Bangla digits work", () => {
    go("#/whatif/r-pages"); type("wi-what-units", "10"); type("wi-what-unitCost", "3");
    expect(valueOf("total")).toBe("30"); expect(q('[data-out="total"] [data-label="ESTIMATE"]')).not.toBeNull();
    type("wi-what-units", "১০"); type("wi-what-unitCost", "৩"); expect(valueOf("total")).toBe("30");
  });
  it("blank is Unknown, never 0", () => {
    go("#/whatif/r-pages"); type("wi-what-units", "10");
    expect(q('[data-out="total"] [data-wi-unknown]')).not.toBeNull(); expect(valueOf("total")).toBe("?");
    expect(q('[data-wi-note="unknown"]')).not.toBeNull();
  });
  it("find mode: 2 minutes a page and 30 minutes gives 15 pages", () => {
    go("#/whatif/r-pages"); const sel = q<HTMLSelectElement>("[data-wi-find]"); sel.value = "units"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    type("wi-what-total", "30"); type("wi-what-unitCost", "2"); expect(valueOf("units")).toBe("15");
  });
  it("300 pages in 20 days at 15 a day", () => { go("#/whatif/r-total"); type("wi-what-perPeriod", "15"); type("wi-what-periods", "20"); expect(valueOf("total")).toBe("300"); });
  it("steppers, chips and the slider move the number and stay in sync", () => {
    go("#/whatif/r-total"); type("wi-what-perPeriod", "10"); type("wi-what-periods", "20");
    const row = q<HTMLElement>('.wi-row[data-field="perPeriod"]');
    (row.querySelector('[data-wi-step="up"]') as HTMLButtonElement).click(); expect((document.getElementById("wi-what-perPeriod") as HTMLInputElement).value).toBe("11"); expect(valueOf("total")).toBe("220");
    (row.querySelector('[data-wi-chip="×2"]') as HTMLButtonElement).click(); expect((document.getElementById("wi-what-perPeriod") as HTMLInputElement).value).toBe("22");
    const slider = row.querySelector("[data-wi-slider]") as HTMLInputElement; expect(slider.disabled).toBe(false); expect(slider.value).toBe("22");
    slider.value = "15"; slider.dispatchEvent(new Event("input", { bubbles: true })); expect((document.getElementById("wi-what-perPeriod") as HTMLInputElement).value).toBe("15"); expect(valueOf("total")).toBe("300");
  });
  it("a blank box keeps its slider switched off and a step down does nothing", () => {
    go("#/whatif/r-total"); const row = q<HTMLElement>('.wi-row[data-field="perPeriod"]');
    expect((row.querySelector("[data-wi-slider]") as HTMLInputElement).disabled).toBe(true);
    (row.querySelector('[data-wi-step="down"]') as HTMLButtonElement).click(); expect((document.getElementById("wi-what-perPeriod") as HTMLInputElement).value).toBe("");
  });
  it("compare mode shows now, what-if, the change and bars with a text alternative", () => {
    go("#/whatif/r-pages"); const cmp = q<HTMLInputElement>("[data-wi-compare]"); type("wi-what-units", "10"); type("wi-what-unitCost", "3");
    cmp.checked = true; cmp.dispatchEvent(new Event("change", { bubbles: true }));
    type("wi-what-unitCost", "2");
    expect(q('[data-out="total"] [data-wi-now] strong').textContent).toBe("30"); expect(q('[data-out="total"] [data-wi-what] strong').textContent).toBe("20");
    expect(q('[data-out="total"] [data-wi-delta]').textContent).toContain("-10");
    const svg = q<SVGElement>("[data-wi-bars]"); expect(svg.getAttribute("role")).toBe("img"); expect(svg.getAttribute("aria-label")).toMatch(/30/); expect(q("[data-wi-bars-text]").textContent).toMatch(/20/);
    expect(q("[data-wi-results]").getAttribute("aria-live")).toBe("polite");
  });
  it("FDR: no tax chosen means no net figure; choosing 10% gives the hand figures; the note says excise is not included", () => {
    go("#/whatif/m-fdr"); type("wi-what-deposit", "1000000"); type("wi-what-ratePct", "8");
    expect(q('[data-out="grossYear"] [data-wi-value]').textContent).toBe("80,000"); expect(q('[data-out="netMonth"] [data-wi-unknown]')).not.toBeNull();
    expect(q("[data-wi-fdr-note]").textContent).toMatch(/Simple interest/); expect(q("[data-wi-fdr-note]").textContent).toMatch(/not included/);
    const r10 = q<HTMLInputElement>("#wi-what-tax-r-10"); r10.checked = true; r10.dispatchEvent(new Event("change", { bubbles: true }));
    expect(valueOf("netMonth")).toBe("6,000"); expect(valueOf("netYear")).toBe("72,000");
    const r15 = q<HTMLInputElement>("#wi-what-tax-r-15"); r15.checked = true; r15.dispatchEvent(new Event("change", { bubbles: true }));
    expect(valueOf("netYear")).toBe("68,000");
  });
  it("a number that is not valid is pointed out, not turned into 0", () => {
    go("#/whatif/r-total"); type("wi-what-perPeriod", "-5"); type("wi-what-periods", "2");
    expect(q("[data-wi-invalid]")).not.toBeNull(); expect(document.getElementById("wi-what-perPeriod")!.getAttribute("aria-invalid")).toBe("true"); expect(valueOf("total")).toBe("?");
  });
  it("every figure keeps the Estimate label and the honest notes show", () => {
    go("#/whatif/r-total"); type("wi-what-perPeriod", "10"); type("wi-what-periods", "20");
    const notes = [...document.querySelectorAll("[data-wi-note]")].map((n) => n.textContent);
    expect(notes.length).toBe(3); expect(notes).toContain("This is an estimate, not a promise.");
  });
});

describe("the sheet (opens from any screen, registered with the overlay coordinator)", () => {
  it("opens from the top bar, fills from the screen's own data, closes with Esc and the Close button, and returns focus", () => {
    store.demo.put(rec("h1", "habit", { "habit.title": "Walk", "habit.minutes": 20, "habit.days_per_week": 5 }));
    go("#/habits");
    const btn = q<HTMLButtonElement>('[data-act="whatif-open"]'); btn.focus(); btn.click();
    const sheet = q<HTMLElement>("[data-wi-sheet]"); expect(sheet).not.toBeNull(); expect(sheet.getAttribute("role")).toBe("dialog"); expect(sheet.getAttribute("aria-modal")).toBe("true");
    expect(q<HTMLElement>("[data-whatif-panel]").dataset.variant).toBe("h-time");
    expect((document.getElementById("wi-what-unitCost") as HTMLInputElement).value).toBe("20"); expect((document.getElementById("wi-what-units") as HTMLInputElement).value).toBe("5");
    expect(valueOf("total")).toBe("");
    expect(q('[data-out="total"] [data-wi-what] strong').textContent).toBe("100");
    expect(q('[data-wi-full]').getAttribute("href")).toBe("#/whatif/h-time");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(q("[data-wi-sheet]")).toBeNull();
    btn.click(); expect(q("[data-wi-sheet]")).not.toBeNull(); q<HTMLButtonElement>("[data-wi-close]").click(); expect(q("[data-wi-sheet]")).toBeNull();
  });
  it("with no data on the screen it still opens a sensible calculator, and says there is nothing to fill in", () => {
    go("#/diary/money"); q<HTMLButtonElement>('[data-act="whatif-open"]').click();
    expect(q<HTMLElement>("[data-whatif-panel]").dataset.variant).toBe("m-budget"); expect(q("[data-wi-use-none]")).not.toBeNull();
    const pick = q<HTMLSelectElement>("[data-wi-pick]"); pick.value = "m-fdr"; pick.dispatchEvent(new Event("change", { bubbles: true }));
    expect(q<HTMLElement>("[data-whatif-panel]").dataset.variant).toBe("m-fdr"); expect(q('[data-wi-full]').getAttribute("href")).toBe("#/whatif/m-fdr");
  });
  it("the sheet closes when the screen changes", () => {
    go("#/today"); q<HTMLButtonElement>('[data-act="whatif-open"]').click(); expect(q("[data-wi-sheet]")).not.toBeNull();
    window.dispatchEvent(new HashChangeEvent("hashchange")); expect(q("[data-wi-sheet]")).toBeNull();
  });
  it("real data is not read without consent", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); consentKv.remove("tm:consent:real:v1");
    go("#/whatif"); q<HTMLButtonElement>('[data-act="whatif-open"]').click(); expect(q("[data-wi-use-none]")).not.toBeNull();
  });
});

describe("save as note (the only save in v1)", () => {
  it("writes an ordinary note with the typed numbers and the estimate, and nothing else", () => {
    go("#/whatif/r-total"); type("wi-what-perPeriod", "10"); type("wi-what-periods", "20");
    const before = store.demo.list().length; q<HTMLButtonElement>('[data-act="wi-save"]').click();
    const notes = store.demo.list().filter((r) => r.entity === "note"); expect(notes.length).toBe(1); expect(store.demo.list().length).toBe(before + 1);
    expect(String((notes[0]!.values["note.title"] as { value: string }).value)).toContain("What-if");
    const text = String((notes[0]!.values["note.text"] as { value: string }).value); expect(text).toContain("200"); expect(text).toContain("Estimate");
    expect(q('[data-wi-status]').textContent).toBe("Saved as a note."); expect(store.demo.list().filter((r) => r.entity === "goal" || r.entity === "task")).toEqual([]);
  });
  it("real mode without consent saves nothing", () => {
    localStorage.setItem("tm:ui:dataMode", "real"); consentKv.remove("tm:consent:real:v1");
    go("#/whatif/r-total"); type("wi-what-perPeriod", "10"); type("wi-what-periods", "20"); q<HTMLButtonElement>('[data-act="wi-save"]').click();
    expect(store.real.list().length).toBe(0); expect(q('[data-wi-status]').textContent).not.toBe("Saved as a note.");
  });
  it("clear all empties the boxes", () => {
    go("#/whatif/r-total"); type("wi-what-perPeriod", "10"); q<HTMLButtonElement>('[data-act="wi-reset"]').click(); expect((document.getElementById("wi-what-perPeriod") as HTMLInputElement).value).toBe("");
  });
});

describe("copy: calm, honest, no promise, no shame, plain Bangla", () => {
  const keys = Object.keys(PACKS.en).filter((k) => k.startsWith("wi."));
  const BANNED_EN = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|rating\w*|penalt\w*|punish\w*|lazy|overdue|behind|lost|mistake\w*|bad|red|wrong|should|missed|late|error|warning)\b/i;
  const GUARANTEE = /\b(guarantee\w*|definitely|surely|risk-free|assured|ensure\w*|sure)\b|গ্যারান্টি|নিশ্চিতভাবে|অবশ্যই/i;
  const DEEN_GUARD = /\b(score of|rank|streak|leaderboard|points?|fatwa:|verse \d|surah \d)\b|পয়েন্ট|স্ট্রিক|র্যাঙ্ক/i;
  it("there are many keys and every one exists in English, Bangla and Mix", () => {
    expect(keys.length).toBeGreaterThan(190);
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) expect((PACKS[l] as Record<string, string>)[k], `${l} ${k}`).toBeTruthy();
  });
  it("no banned word, no guarantee word, no Deen-guard word, English lines are short, digits are Latin", () => {
    for (const k of keys) for (const l of ["en", "bn", "mix"] as const) {
      const s = (PACKS[l] as Record<string, string>)[k]!;
      expect(BANNED_EN.exec(s)?.[0], `${l} ${k}`).toBeUndefined(); expect(GUARANTEE.exec(s)?.[0], `${l} ${k}`).toBeUndefined(); expect(DEEN_GUARD.exec(s)?.[0], `${l} ${k}`).toBeUndefined();
      expect(/[০-৯]/.test(s), `${l} ${k}`).toBe(false);
    }
    for (const k of keys) expect(PACKS.en[k as keyof typeof PACKS.en].length, k).toBeLessThanOrEqual(120);
  });
  it("there are at least eight honest notes, including the owner's own lines in English and Bangla", () => {
    const notes = keys.filter((k) => k.startsWith("wi.note.") && k !== "wi.note.unknown"); expect(notes.length).toBeGreaterThanOrEqual(8);
    expect(PACKS.en["wi.note.push" as keyof typeof PACKS.en]).toBe("Not certain, but this small push makes you a little stronger.");
    expect(PACKS.bn["wi.note.push" as keyof typeof PACKS.bn]).toBe("নিশ্চিত নয়, তবে এই ছোট চেষ্টা আপনাকে একটু শক্ত করবে।");
    expect(PACKS.en["wi.note.estimate" as keyof typeof PACKS.en]).toBe("This is an estimate, not a promise.");
    expect(PACKS.en["wi.note.later" as keyof typeof PACKS.en]).toBe("Starting later changes the numbers, not your worth.");
  });
  it("Bangla uses the plain words (ক্যালকুলেটর, দাম style, আপনি) and not the older forms", () => {
    const bn = keys.map((k) => PACKS.bn[k as keyof typeof PACKS.bn]).join("\n"); expect(bn).toContain("ক্যালকুলেটর"); expect(bn).not.toMatch(/ব্যক্তিগত|গণনা|বিরতি|মাপকাঠি/);
  });
  it("the FDR note says simple interest and excludes excise duty", () => {
    expect(PACKS.en["wi.fdr.simple" as keyof typeof PACKS.en]).toBe("Simple interest. Excise duty is not included.");
  });
});

describe("offline: no network and no AI", () => {
  it("a full session of typing, comparing, opening the sheet and saving makes no request", () => {
    const f = vi.fn(); const x = vi.fn(); const b = vi.fn();
    vi.stubGlobal("fetch", f); vi.stubGlobal("XMLHttpRequest", x); Object.defineProperty(navigator, "sendBeacon", { value: b, configurable: true });
    go("#/whatif/m-fdr"); type("wi-what-deposit", "1000000"); type("wi-what-ratePct", "8"); q<HTMLButtonElement>('[data-act="wi-save"]').click();
    go("#/today"); q<HTMLButtonElement>('[data-act="whatif-open"]').click(); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(f).not.toHaveBeenCalled(); expect(x).not.toHaveBeenCalled(); expect(b).not.toHaveBeenCalled(); vi.unstubAllGlobals();
  });
  it("the what-if files name no network or AI API", () => {
    for (const f of ["src/core/whatif.ts", "src/core/whatifCatalog.ts", "src/core/whatifPrefill.ts", "src/ui/whatifUi.ts", "src/ui/routes_whatif.ts"]) {
      expect(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|assistant|aiGuard|adapters\/ai|https?:\/\//.test(readFileSync(f, "utf8").replace("http://www.w3.org/2000/svg", "")), f).toBe(false);
    }
  });
  it("the app shell has exactly one registration line and one button line for the feature", () => {
    const src = readFileSync("src/app.ts", "utf8");
    expect((src.match(/ROUTES_WHATIF/g) ?? []).length).toBe(2); expect((src.match(/whatifButton/g) ?? []).length).toBe(2);
  });
});

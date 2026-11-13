// Settings redesign PR 5: search over the static registry. Every entry findable in en, bn and mix; offline; keyboard-ready.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES, render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { allEntries, norm, recentIds, searchSettings } from "../src/ui/settingsSearch";
import { ROWS } from "../src/ui/settingsRegistry";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
const routeOk = (hash: string) => ROUTES.some(([re]) => re.test(hash.replace(/^#/, "")));
const top = (query: string) => searchSettings(query).map((e) => e.id);
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("search registry", () => {
  it("the named examples find the right row", () => {
    expect(top("dark")).toContain("theme"); expect(top("অন্ধকার")).toContain("theme"); expect(top("font")).toContain("textsize"); expect(top("pin")).toContain("applock"); expect(top("backup")).toEqual(expect.arrayContaining(["savebackup", "reminder", "restore"]));
    expect(top("DARK ")).toContain("theme"); expect(top("পিন")).toContain("applock"); expect(top("ব্যাকআপ")).toContain("savebackup");
  });
  it("every entry is findable by its label in English, Bangla and Mix", () => {
    for (const e of allEntries()) for (const lang of ["en", "bn", "mix"] as const) { const label = PACKS[lang][e.label]; expect(searchSettings(label).map((x) => x.id), `${e.id} / ${lang} / ${label}`).toContain(e.id); }
  });
  it("every result points at a real route", () => { for (const e of allEntries()) expect(routeOk(e.href), `${e.id} -> ${e.href}`).toBe(true); for (const r of ROWS) expect(allEntries().some((e) => e.id === r.id)).toBe(true); });
  it("normalisation: case, spacing and joiners do not matter; empty query finds nothing", () => { expect(norm("  Text   SIZE ")).toBe("text size"); expect(norm("ডিলিট‍")).toBe("ডিলিট"); expect(searchSettings("   ")).toEqual([]); expect(top("zzzqqq")).toEqual([]); });
  it("no network is used", () => { const f = vi.fn(); vi.stubGlobal("fetch", f); searchSettings("backup"); go("#/settings"); expect(f).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });
});

describe("search UI", () => {
  it("a magnifier sits next to the heading on every Settings page, opens a field, and shows results with their category", () => {
    for (const p of ["#/settings", "#/settings/look", "#/settings/backup", "#/settings/delete", "#/settings/about", "#/settings/data/start-real"]) { go(p); expect(q("[data-act=search-open]"), p).not.toBeNull(); expect(q("[data-act=search-open]").getAttribute("aria-label")).toBe("Search settings"); }
    go("#/settings"); const panel = q<HTMLElement>("[data-search=panel]"); expect(panel.hidden).toBe(true);
    q<HTMLButtonElement>("[data-act=search-open]").click(); expect(panel.hidden).toBe(false); expect(q("[data-act=search-open]").getAttribute("aria-expanded")).toBe("true");
    const input = q<HTMLInputElement>("[data-search=input]"); input.value = "dark"; input.dispatchEvent(new Event("input"));
    expect(q("[data-search=status]").textContent).toMatch(/found/); expect(q("[data-search-hit=theme]").getAttribute("href")).toBe("#/settings/home/theme"); expect(q("[data-search-hit=theme]").textContent).toMatch(/Quick settings/);
    input.value = "zzzqq"; input.dispatchEvent(new Event("input")); expect(q("[data-search=status]").textContent).toBe("Nothing found. Try another word.");
  });
  it("opening a hit remembers it (last three), and the empty field shows them", () => {
    go("#/settings"); q<HTMLButtonElement>("[data-act=search-open]").click(); const input = q<HTMLInputElement>("[data-search=input]");
    for (const w of ["dark", "pin", "font", "csv"]) { input.value = w; input.dispatchEvent(new Event("input")); const hit = q<HTMLAnchorElement>("a[data-search-hit]"); hit.addEventListener("click", (e) => e.preventDefault()); hit.click(); }
    expect(recentIds().length).toBe(3); input.value = ""; input.dispatchEvent(new Event("input")); expect(app().querySelectorAll("a[data-search-hit]").length).toBe(3); expect(q("[data-search=status]").textContent).toBe("Recently opened");
  });
  it("works in Bangla, and the link lands on the highlighted row", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/settings"); q<HTMLButtonElement>("[data-act=search-open]").click(); const input = q<HTMLInputElement>("[data-search=input]"); input.value = "অন্ধকার"; input.dispatchEvent(new Event("input"));
    expect(q("[data-search-hit=theme]")).not.toBeNull(); go("#/settings/home/theme"); expect(q("[data-setting=theme]").classList.contains("set-hl")).toBe(true);
  });
  it("the search field survives storage being unavailable", () => {
    const g = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(recentIds()).toEqual([]); g.mockRestore();
  });
});

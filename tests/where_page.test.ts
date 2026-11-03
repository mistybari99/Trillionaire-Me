// Bangla "Where we are" as an in-app page (plan tracker G3-06 / N3-06): same content as docs/owner/WHERE_WE_ARE_BN.md, linked from Settings > Guides & info,
// English / Bangla / Mix, reachable offline (text is bundled), no data read, no scores or promises.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { ROUTES, render } from "../src/app";
import { GUIDES } from "../src/ui/settingsRegistry";
import { englishPage, pageFor, parsePage } from "../src/ui/whereUi";
import { MODULES, buildLabel } from "../src/modules/capability";
import { PACKS } from "../src/i18n/packs";
import { store } from "../src/ui/state";

const file = readFileSync("docs/owner/WHERE_WE_ARE_BN.md", "utf8");
const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:dataMode", "demo"); });

describe("where-we-are page", () => {
  it("the Bangla page shows every line of docs/owner/WHERE_WE_ARE_BN.md (same content, backticks aside)", () => {
    localStorage.setItem("tm:ui:lang", "bn"); go("#/more/where"); const shown = app().textContent!;
    const lines = file.split("\n").map((l) => l.replace(/`/g, "").replace(/^#+\s+|^- |^\d+\.\s+/, "").trim()).filter(Boolean);
    expect(lines.length).toBeGreaterThan(20); for (const l of lines) expect(shown, l).toContain(l);
  });
  it("English and Bangla have the same sections and the same number of lines in each block", () => {
    const shape = (p: ReturnType<typeof parsePage>) => p.sections.map((s) => [s.heading === null, s.blocks.map((b) => `${b.kind}${b.items.length}`).join(",")]);
    expect(shape(englishPage())).toEqual(shape(parsePage(file)));
    expect(shape(pageFor("mix"))).toEqual(shape(parsePage(file)));
  });
  it("module counts in English match the capability list (same numbers as the Bangla file)", () => {
    const c = (l: string) => MODULES.filter((m) => buildLabel(m) === l).length; const text = JSON.stringify(englishPage());
    expect(text).toContain(`${c("complete")} of ${MODULES.length} modules are fully built, ${c("partial")} are partly built and ${c("blocked")} wait for your approval`);
  });
  for (const lang of ["en", "bn", "mix"] as const) it(`opens in ${lang}: heading, sections, back link to Guides, Settings tab highlighted, Latin digits`, () => {
    localStorage.setItem("tm:ui:lang", lang); go("#/more/where");
    expect(app().querySelector("h1")!.textContent!.length).toBeGreaterThan(8); expect(app().querySelectorAll("[data-where-section]").length).toBe(6);
    expect(app().querySelector("a.crumb")!.getAttribute("href")).toBe("#/settings/about"); expect(app().querySelector("nav a[aria-current=page]")!.getAttribute("href")).toBe("#/settings");
    expect(app().textContent).not.toMatch(/[০-৯]/); if (lang !== "en") expect(app().textContent).toMatch(/[ঀ-৿]/);
  });
  it("Mix keeps the Bangla sentences and swaps common words for English", () => { expect(JSON.stringify(pageFor("mix"))).not.toBe(JSON.stringify(pageFor("bn"))); });
  it("is a registered route, listed in Guides & info, with labels in en, bn and mix", () => {
    expect(ROUTES.some(([re]) => re.test("/more/where"))).toBe(true); const g = GUIDES.find((x) => x.id === "where")!; expect(g.route).toBe("#/more/where");
    for (const l of ["en", "bn", "mix"] as const) { expect(PACKS[l][g.label]).toBeTruthy(); expect(PACKS[l][g.desc]).toBeTruthy(); }
    localStorage.setItem("tm:ui:lang", "en"); go("#/settings/about"); expect(app().querySelector('a[href="#/more/where"]')).not.toBeNull();
  });
  it("no score, rank, streak, guarantee or red copy on the page; no network word; the doc is linked from the README", () => {
    for (const l of ["en", "bn", "mix"] as const) { const s = JSON.stringify(pageFor(l)); expect(s).not.toMatch(/guarantee|streak|rank|score|গ্যারান্টি|স্ট্রিক|স্কোর|র‍্যাঙ্ক/i); }
    localStorage.setItem("tm:ui:lang", "en"); go("#/more/where"); expect(app().querySelector(".err")).toBeNull();
    expect(readFileSync("README.md", "utf8")).toContain("WHERE_WE_ARE_BN.md");
  });
});

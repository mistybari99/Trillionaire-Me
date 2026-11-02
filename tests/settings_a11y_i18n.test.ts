// Settings redesign PR 6: focus and title on route change, translated aria-label, en/bn/mix parity for Settings strings, wording rules.
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { ROWS, GUIDES, CAT_LABEL } from "../src/ui/settingsRegistry";
import { firstRunScreen } from "../src/ui/modeUi";

const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("focus and title on route change", () => {
  it("moves focus to the new h1 and sets the page title when the screen changes, not when the same screen is redrawn", () => {
    go("#/today"); go("#/settings/look");
    expect(document.activeElement?.tagName).toBe("H1"); expect(document.activeElement?.textContent).toBe("Look & screens"); expect(document.title).toBe("Look & screens · Trillionaire Me");
    (document.activeElement as HTMLElement).blur(); render(); expect(document.activeElement?.tagName).not.toBe("H1"); // same screen redraw keeps the reader's place
    go("#/journey"); expect(document.activeElement?.tagName).toBe("H1"); // a non-Settings route too
  });
  it("the Bangla title uses the Bangla heading", () => { localStorage.setItem("tm:ui:lang", "bn"); go("#/today"); go("#/settings/backup"); expect(document.title).toBe(`${PACKS.bn["set.cat.backup"]} · ${PACKS.bn["app.title"]}`); });
  it("the first-run language buttons have a translated aria-label", () => {
    localStorage.setItem("tm:ui:lang", "bn"); const el = firstRunScreen(); expect(el.querySelector("[data-lang]")!.parentElement!.getAttribute("aria-label")).toBe(PACKS.bn["more.language"]);
  });
});

describe("Settings strings: parity and wording rules", () => {
  const src = readFileSync("src/ui/settingsUi.ts", "utf8") + readFileSync("src/ui/settingsRegistry.ts", "utf8");
  const keys = [...new Set([...ROWS.map((r) => r.label), ...GUIDES.flatMap((g) => [g.label, g.desc]), ...Object.values(CAT_LABEL), ...[...src.matchAll(/"((?:set|look|priv|bak|del|plan\.set|restore)\.[\w.]+)"/g)].map((m) => m[1]!)])] as Array<keyof typeof PACKS.en>;
  const own = Object.keys(PACKS.en).filter((k) => /^(set|look|priv|bak|del|restore|plan\.set)\./.test(k)) as Array<keyof typeof PACKS.en>;
  it("every Settings key exists in en, bn and mix, non-empty, with the same placeholders", () => {
    expect(own.length).toBeGreaterThan(150);
    for (const k of new Set([...keys, ...own])) {
      for (const l of ["en", "bn", "mix"] as const) expect(PACKS[l][k], `${l}:${k}`).toBeTruthy();
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(","); expect(ph(PACKS.bn[k]), k).toBe(ph(PACKS.en[k])); expect(ph(PACKS.mix[k]), k).toBe(ph(PACKS.en[k]));
    }
  });
  it("Bangla Settings text has Bangla script and Latin digits, and avoids the old formal words and banned words", () => {
    const avoid = ["কর্মী", "পরিকল্পনা", "দক্ষতা", "ঝুঁকি", "অগ্রগতি", "বিকল্প", "সংরক্ষণ", "অনুমতি", "বিজ্ঞপ্তি", "মুছুন", "বাতিল", "সংযোগ", "সংস্করণ", "তালিকা"];
    const banned = /বিপদ|Danger|danger|score|rank|streak|স্কোর|র‍্যাংক|স্ট্রিক/i;
    for (const k of own) { const b = PACKS.bn[k]; expect(b, k).toMatch(/[ঀ-৿]/); expect(b, k).not.toMatch(/[০-৯]/); for (const w of avoid) expect(b.includes(w), `${k} has "${w}"`).toBe(false); for (const l of ["en", "bn", "mix"] as const) expect(banned.test(PACKS[l][k]), `${l}:${k}`).toBe(false); }
  });
  it("Settings and Deen strings carry no score, rank or streak wording", () => {
    const text = [...own, ...(Object.keys(PACKS.en).filter((k) => k.startsWith("deen.")) as Array<keyof typeof PACKS.en>)].map((k) => PACKS.en[k]).join(" ");
    expect(text).not.toMatch(/\b(score|scores|rank|ranks|ranking|streak|streaks|points)\b/i);
  });
  it("every Settings page renders with every target at least 44px by rule and no horizontal-scroll style", () => {
    const css = readFileSync("src/ui/styles.css", "utf8"); expect(css).toMatch(/\.scr-settings \.seg button\{[^}]*min-width:0/); expect(css).toMatch(/\.seg button\{min-height:44px/);
    go("#/settings"); for (const b of app().querySelectorAll<HTMLElement>("button")) { const mh = b.style.minHeight; if (mh) expect(parseInt(mh), b.outerHTML.slice(0, 80)).toBeGreaterThanOrEqual(44); }
  });
});

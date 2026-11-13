// BUILD-02 phase C (strings): the business type panel is calm and plain in English, Bangla and Mix. No score, rank, streak, grade, good or bad words,
// no benchmark or typical figure, no "99" claim. Bangla follows CLAUDE.md 2b. The panel text is checked for every family, not only for our own keys.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { render } from "../src/app";
import { prefs, store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";
import { QSECTOR_BN, QSECTOR_EN } from "../src/i18n/q_sector";
import { ALL_FAMILIES } from "../src/core/sectors";
import { SECTOR_FIELDS } from "../src/core/ventureSector";
import { resetVentureSectorUi } from "../src/ui/ventureSectorUi";
import type { TMRecord } from "../src/core/types";

const BANNED_EN = /\b(fail\w*|wrong|lazy|shame\w*|should|score\w*|rank\w*|streak\w*|grade\w*|behind|missed|overdue|late|bad|error|mistake\w*|warning|penalt\w*|lost|red|points?|good|best|typical|average|benchmark\w*|healthy|standard|99)\b/i;
const keys = Object.keys(QSECTOR_EN) as Array<keyof typeof QSECTOR_EN>;
const BN_BANNED = JSON.parse(readFileSync("tests/fixtures/bangla_banned.json", "utf8")) as unknown;

describe("our keys", () => {
  it("EN and BN have the same keys, and every BN line is Bangla with Latin digits", () => {
    expect(Object.keys(QSECTOR_BN).sort()).toEqual([...keys].sort());
    for (const k of keys) { const b = QSECTOR_BN[k]; if (!["vs.fmt.pct", "vs.pf.row", "vs.pf.first"].includes(k)) expect(/[ঀ-৿]/.test(b), k).toBe(true); expect(/[০-৯]/.test(b), k).toBe(false); }
  });
  it("no banned or judging word in English, Bangla or Mix", () => {
    for (const k of keys) {
      for (const lang of ["en", "bn", "mix"] as const) { const s = PACKS[lang][k]; expect(BANNED_EN.exec(s)?.[0], `${lang} ${k}`).toBeUndefined(); }
      expect(/ভালো|খারাপ|সেরা|গড়|পয়েন্ট|স্কোর|র‌্যাংক|র্যাঙ্ক|ব্যর্থ|ভুল|দেরি/.test(QSECTOR_BN[k]), k).toBe(false);
    }
    expect(BN_BANNED).toBeTruthy();
  });
  it("pass-2 spellings are used: no গোনা, লক্ষ্য, ব্যক্তিগত, বিরতি, মাপকাঠি, ডেটা", () => {
    for (const k of keys) expect(/গোনা|লক্ষ্য|ব্যক্তিগত|বিরতি|মাপকাঠি|ডেটা|কর্মী/.test(QSECTOR_BN[k]), k).toBe(false);
  });
  it("English lines are 120 characters or fewer", () => { for (const k of keys) expect(QSECTOR_EN[k].length, k).toBeLessThanOrEqual(120); });
  it("no number claims in our own text: no digit except the sample codes and the template tokens", () => {
    for (const k of keys.filter((x) => x !== "vs.err.number")) { const s = QSECTOR_EN[k].replace(/\{[a-z]+\}/g, "").replace(/a1 - a2/g, ""); expect(/\d/.test(s), k).toBe(false); }
  });
});

describe("the whole panel, for every family", () => {
  const dv = (value: unknown) => ({ state: "value" as const, value, label: "DEMO" as const });
  const venture = (id: string, fam: string): TMRecord => ({ id, entity: "venture", ns: "demo", ownerId: "demo-user", schemaVersion: 5, createdAt: "2026-11-01T00:00:00Z",
    values: { "venture.name": dv("Test fixture venture, not data"), [SECTOR_FIELDS.id]: dv(fam), [SECTOR_FIELDS.inputs]: dv(JSON.stringify({ price: 5, varCost: 2 })) } });
  beforeEach(() => { localStorage.clear(); store.demo.clear(); store.real.clear(); resetVentureSectorUi(); document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:dataMode", "demo"); prefs.dataMode = "demo"; });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`${lang}: panel text has no banned word, no benchmark claim and no Bangla digits`, () => {
      localStorage.setItem("tm:ui:lang", lang); prefs.lang = lang;
      window.addEventListener("hashchange", render);
      try {
        for (const f of ALL_FAMILIES) {
          store.demo.put(venture("v1", f.id)); location.hash = "#/diary/ventures"; render();
          const text = document.querySelector("[data-sector-block]")!.textContent ?? "";
          // Family data is written by others and may use plain domain words (a late payment, a good finished item); only judging words are refused there.
          expect(/\b(score\w*|rank\w*|streak\w*|grade\w*|benchmark\w*|typical|healthy)\b/i.test(text), `${lang} ${f.id}`).toBe(false);
          expect(/[০-৯]/.test(text), `${lang} ${f.id}`).toBe(false);
          expect(/typical|benchmark|industry|99\s*%|ranking/i.test(text), `${lang} ${f.id}`).toBe(false);
        }
      } finally { window.removeEventListener("hashchange", render); }
    });
  }
});

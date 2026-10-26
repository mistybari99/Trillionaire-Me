// Deen wording check: every Deen item says plans and reminders only, no scripture text, nothing counted or compared.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { FIELDS } from "../src/catalog/fields";
import { PACKS, type Key } from "../src/i18n/packs";

const app = () => document.getElementById("app")!;
const go = (hash: string) => { location.hash = hash; render(); };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo"); grantConsent(consentKv, "2026-10-26T00:00:00.000Z");
});

describe("Deen items: plans and reminders only", () => {
  const deen = FIELDS.filter((f) => f.purpose === "deen_tracking");
  it("there are Deen items and every one says plans/reminders only, no scripture text, nothing counted or compared (EN and BN)", () => {
    expect(deen.length).toBeGreaterThanOrEqual(9);
    for (const f of deen) {
      expect(f.help.why.en, f.id).toContain("Plans and reminders only"); expect(f.help.why.en, f.id).toContain("No scripture text; nothing is counted or compared");
      expect(f.help.why.bn, f.id).toContain("পরিকল্পনা ও স্মারক"); expect(f.help.why.bn, f.id).toContain("ধর্মগ্রন্থের লেখা নেই");
    }
  });
  it("no Deen item or Deen screen text offers a score, rank, streak or ruling, or quotes scripture", () => {
    const bad = /\b(score of|rank|streak|leaderboard|points?|fatwa:|verse \d|surah \d)\b/i;
    for (const f of deen) for (const x of [f.label, f.help.what, f.help.example]) expect(x.en, f.id).not.toMatch(bad);
    for (const l of ["en", "bn", "mix"] as const) for (const k of Object.keys(PACKS[l]).filter((k) => k.startsWith("deen.")) as Key[]) expect(PACKS[l][k], `${l} ${k}`).not.toMatch(bad);
    expect(PACKS.en["deen.intro"]).toContain("Plans and reminders only"); expect(PACKS.bn["deen.intro"]).toContain("পরিকল্পনা ও স্মারক");
  });
  it("Deen screen shows the intro in the page", () => { go("#/deen"); expect(app().textContent).toContain("Plans and reminders only"); });
});

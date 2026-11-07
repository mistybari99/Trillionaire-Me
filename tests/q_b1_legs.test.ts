// Q-07: one calm "Worth a look" line on Today from fourLegs(); leak lever rows link to the topic card and "kept" is saved in prefs.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { prefs, store, consentKv } from "../src/ui/state";
import { grantConsent } from "../src/core/consent";
import { ATTENTION_LEVERS } from "../src/core/legs";
import { LEVER_TOPIC } from "../src/ui/qb1Ui";
import { topicById } from "../src/library/topics";
import { PACKS } from "../src/i18n/packs";
import { preloadLazy } from "../src/ui/lazy";
import type { FieldValue, TMRecord } from "../src/core/types";

const NOW = "2026-10-25T00:00:00.000Z";
const mk = (id: string, entity: string, values: Record<string, unknown>): TMRecord => {
  const vals: Record<string, FieldValue> = {}; for (const [k, x] of Object.entries(values)) vals[k] = { state: "value", value: x, label: "FACT" } as FieldValue;
  return { id, entity, ns: "real", ownerId: "o", schemaVersion: 1, createdAt: NOW, values: vals } as TMRecord;
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const app = () => document.getElementById("app")!;
const go = (lang: string, p: string) => { localStorage.setItem("tm:ui:lang", lang); location.hash = p; render(); };
const JUDGING = /\b(shame\w*|guilt\w*|fail\w*|grade\w*|rank\w*|streak\w*|score\w*|lazy|overdue|behind|punish\w*|weak)\b/i;

beforeEach(async () => {
  await preloadLazy(); localStorage.clear(); store.demo.clear(); store.real.clear(); document.body.innerHTML = '<div id="app"></div>';
  localStorage.setItem("tm:ui:dataMode", "real"); grantConsent(consentKv, NOW);
});

describe("Q-07 Worth a look line on Today", () => {
  it("nothing when everything is unknown", () => { go("en", "#/today"); expect(app().querySelector("[data-leg-line]")).toBeNull(); });
  it("nothing when the legs are steady (a task finished in the last 7 days)", () => {
    store.real.put(mk("t", "task", { "task.title": "x", "task.done_on": iso(new Date()) })); go("en", "#/today"); expect(app().querySelector("[data-leg-line]")).toBeNull();
  });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`an open task and nothing finished: one line that links to the legs page (${lang})`, () => {
      store.real.put(mk("t", "task", { "task.title": "x" })); go(lang, "#/today");
      const lines = app().querySelectorAll("[data-leg-line]"); expect(lines.length).toBe(1);
      expect(lines[0]!.querySelector("a")!.getAttribute("href")).toBe("#/journey/legs");
      expect(lines[0]!.textContent).toContain(PACKS[lang]["legs.leg.tasks"]); expect(lines[0]!.textContent).not.toMatch(JUDGING);
      expect(lines[0]!.textContent).not.toMatch(/\d/); // no counts, no score
    });
  }
});

describe("Q-07 lever rows", () => {
  it("every lever maps to an existing topic", () => { for (const k of ATTENTION_LEVERS) expect(topicById(LEVER_TOPIC[k]), k).toBeDefined(); });
  for (const lang of ["en", "bn", "mix"] as const) {
    it(`each row links to the topic card; Keep is saved in prefs and survives a re-render (${lang})`, () => {
      go(lang, "#/journey/leak");
      for (const k of ATTENTION_LEVERS) expect(app().querySelector(`[data-lever=${k}] a[data-lever-topic=${k}]`)!.getAttribute("href")).toBe(`#/topic/${LEVER_TOPIC[k]}`);
      expect(prefs.qbMemo.kept).toEqual([]);
      (app().querySelector("[data-lever=close] [data-act=lever-keep]") as HTMLButtonElement).click();
      expect(prefs.qbMemo.kept).toEqual(["close"]);
      go(lang, "#/journey/leak"); expect(app().querySelector("[data-lever=close] [data-act=lever-keep]")!.getAttribute("aria-pressed")).toBe("true");
      expect(app().querySelector("[data-lever=close] [data-act=lever-keep]")!.textContent).toBe(PACKS[lang]["qb1.lever.kept"]);
      (app().querySelector("[data-lever=close] [data-act=lever-keep]") as HTMLButtonElement).click(); expect(prefs.qbMemo.kept).toEqual([]);
    });
  }
});

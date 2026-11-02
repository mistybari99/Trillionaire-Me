// Settings redesign PR 3f: Plan & progress. One control per key; chips and links elsewhere; /stuck still writes the mode.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "../src/app";
import { prefs, store } from "../src/ui/state";

const app = () => document.getElementById("app")!;
const q = <T extends Element>(s: string) => app().querySelector(s) as T;
const go = (hash: string) => { location.hash = hash; render(); };
beforeEach(() => {
  localStorage.clear(); store.demo.clear(); store.real.clear();
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); localStorage.setItem("tm:ui:dataMode", "demo");
});

describe("Plan & progress page", () => {
  it("holds plan mode, progress weighting, stage names and the four rules", () => {
    go("#/settings/plan"); expect(app().querySelectorAll("[data-mode]").length).toBe(3); expect(app().querySelectorAll("[data-ov-mode]").length).toBe(2); expect(app().querySelectorAll("[data-tpl]").length).toBe(3); expect(app().querySelectorAll("[data-rule]").length).toBe(4);
    q<HTMLButtonElement>("[data-mode=minimum_week]").click(); expect(prefs.mode).toBe("minimum_week");
    q<HTMLButtonElement>("[data-rule-set='focus_again:on']").click(); expect(prefs.ruleSwitches.focus_again).toBe(true);
  });
  it("each key has one control: the other screens show a chip and a link, not buttons", () => {
    prefs.mode = "minimum_week";
    go("#/diary/plan"); expect(app().querySelector("[data-mode]")).toBeNull(); expect(q("[data-plan-chip=planmode]").textContent).toMatch(/This week: Minimum week/); expect(q("[data-plan-chip=planmode] a").getAttribute("href")).toBe("#/settings/plan/planmode");
    go("#/today"); expect(app().querySelector("[data-ov-mode]")).toBeNull(); expect(q("[data-plan-chip=weighting] a").getAttribute("href")).toBe("#/settings/plan/weighting");
    go("#/journey"); expect(app().querySelector("[data-tpl], [data-ov-mode]")).toBeNull();
    go("#/more/rules"); expect(app().querySelectorAll("[data-rule]").length).toBe(4); // same implementation, old route until the redirect
  });
  it("row ids open and highlight the right control (automation is the rules section)", () => {
    go("#/settings/plan/automation"); expect(q("[data-setting-row=rules]").classList.contains("set-hl")).toBe(true);
    go("#/settings/plan/weighting"); expect(q("[data-setting-row=weighting]").classList.contains("set-hl")).toBe(true);
  });
  it("Pause shows an 'end the pause' chip on Today; ending it restores Normal", () => {
    prefs.mode = "pause"; go("#/today"); q<HTMLButtonElement>("[data-act=end-pause]").click(); expect(prefs.mode).toBe("normal"); render(); expect(app().querySelector("[data-pause-chip]")).toBeNull();
  });
  it("/stuck still writes the mode and says it can be changed back in Settings", () => {
    go("#/stuck"); expect(app().querySelector("[data-helper]")).toBeNull(); // helpers appear after answering; the write path is covered by stuck.test.ts
    prefs.mode = "pause"; go("#/settings/plan"); expect(q("[data-mode=pause]").getAttribute("aria-pressed")).toBe("true");
  });
});

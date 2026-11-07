// Audit M1: three-screen first-run onboarding with a first win. Skippable, no score or streak, demo and real never mixed.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_FIRST_MINUTES, checkPlainText, onboardingOpen, parseMinutes, parseOnboard, parseTimes, secondsBetween } from "../src/core/onboarding";
import { revokeConsent, readConsent } from "../src/core/consent";
import { renderApp } from "../src/app";
import { consentKv, prefs, store } from "../src/ui/state";
import { PACKS } from "../src/i18n/packs";

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const click = (sel: string) => { $(sel).click(); renderApp(); };
const type = (sel: string, v: string) => { $<HTMLInputElement>(sel).value = v; };
const submit = (sel: string) => { $<HTMLFormElement>(sel).dispatchEvent(new Event("submit", { cancelable: true })); renderApp(); };

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); store.demo.clear(); store.real.clear(); revokeConsent(consentKv);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.setItem("tm:ui:lang", "en"); location.hash = "";
});

describe("onboarding pure rules", () => {
  it("only a freshly pending device is offered it", () => {
    expect(parseOnboard("pending")).toBe("pending"); expect(parseOnboard("junk")).toBe(""); expect(parseOnboard(null)).toBe("");
    expect(onboardingOpen("pending")).toBe(true); expect(onboardingOpen("")).toBe(false); expect(onboardingOpen("done")).toBe(false); expect(onboardingOpen("skipped")).toBe(false);
  });
  it("plain text: trims, refuses empty, long and secret-looking text", () => {
    expect(checkPlainText("  save   a little ")).toEqual({ ok: true, text: "save a little" });
    expect(checkPlainText("   ")).toEqual({ ok: false, reason: "empty" });
    expect(checkPlainText("x".repeat(161))).toEqual({ ok: false, reason: "long" });
    expect(checkPlainText("my password is hunter2").ok).toBe(false);
  });
  it("minutes: known choices only, anything else stays unknown (null, never 0)", () => {
    expect(parseMinutes("10")).toBe(10); expect(parseMinutes("")).toBeNull(); expect(parseMinutes("0")).toBeNull(); expect(parseMinutes("999")).toBeNull();
    expect(DEFAULT_FIRST_MINUTES).toBe(10);
  });
  it("time to first step: seconds, or null when a time is missing or out of order", () => {
    expect(secondsBetween("2026-11-01T10:00:00Z", "2026-11-01T10:02:30Z")).toBe(150);
    expect(secondsBetween(undefined, "2026-11-01T10:02:30Z")).toBeNull();
    expect(secondsBetween("2026-11-01T10:05:00Z", "2026-11-01T10:02:30Z")).toBeNull();
    expect(parseTimes({ start: 5, firstStep: "x" })).toEqual({ firstStep: "x" });
  });
});

describe("onboarding flow", () => {
  it("screen 1 is the existing choice, labelled step 1 of 3", () => {
    renderApp();
    expect($("[data-onb-step]").textContent).toBe("Step 1 of 3");
    expect(document.querySelector("[data-first=demo]")).not.toBeNull();
  });
  it("demo: goal, one small step, then done gives the first star; everything stays in the demo namespace", () => {
    renderApp(); click("[data-act=first-demo]");
    expect(prefs.onboard).toBe("pending"); expect(location.hash).toBe("#/start");
    expect($("[data-onb-step]").textContent).toBe("Step 2 of 3");
    type("#onb-goal", "Save a little every month"); submit("form");
    expect($("[data-onboard]").getAttribute("data-onboard")).toBe("step");
    type("#onb-step", "List my monthly expenses"); submit("form");
    expect($("[data-onboard]").getAttribute("data-onboard")).toBe("win");
    expect($("[data-onb-step-title]").textContent).toBe("List my monthly expenses");
    expect(store.real.list()).toHaveLength(0);
    const goal = store.demo.list().find((r) => r.entity === "goal")!; const task = store.demo.list().find((r) => r.entity === "task")!;
    expect(task.links?.goal).toBe(goal.id);
    expect(task.values["task.minutes"]).toMatchObject({ state: "value", value: 10 });
    click("[data-act=onb-win-done]");
    expect(prefs.onboard).toBe("done"); expect(location.hash).toBe("#/reward");
    expect(store.demo.get(task.id)!.values["task.done_on"]?.state).toBe("value");
    expect(prefs.onboardTimes.firstStep).toBeTruthy();
  });
  it("real: consent was ticked at the choice, records are real (FACT) and demo stays empty", () => {
    renderApp(); click("[data-act=first-real]");
    ($("#mode-tick") as HTMLInputElement).checked = true; click("[data-act=first-real-yes]");
    expect(readConsent(consentKv)).toBe(true); expect(prefs.onboard).toBe("pending");
    type("#onb-goal", "Learn English"); submit("form");
    type("#onb-step", "Find one lesson"); submit("form");
    expect(store.demo.list()).toHaveLength(0);
    expect(store.real.list().map((r) => r.entity).sort()).toEqual(["goal", "task"]);
    expect(store.real.list().every((r) => r.ownerId === "owner")).toBe(true);
  });
  it("unknown time stays unknown, not 0", () => {
    renderApp(); click("[data-act=first-demo]");
    type("#onb-goal", "Learn English"); submit("form");
    type("#onb-step", "Find one lesson"); $<HTMLSelectElement>("#onb-min").value = ""; submit("form");
    expect(store.demo.list().find((r) => r.entity === "task")!.values["task.minutes"]).toEqual({ state: "unknown" });
  });
  it("empty and secret-looking text is refused with calm copy and nothing is saved", () => {
    renderApp(); click("[data-act=first-demo]");
    type("#onb-goal", "   "); submit("form");
    expect($("[data-onb-err]").textContent).toBe(PACKS.en["onb.empty"]);
    type("#onb-goal", "my password is hunter2"); submit("form");
    expect($("[data-onb-err]").textContent).toBe(PACKS.en["intake.secretRejected"]);
    expect(store.demo.list()).toHaveLength(0);
  });
  it("skip on any screen closes it, loses nothing, and it is not offered again", () => {
    renderApp(); click("[data-act=first-demo]");
    type("#onb-goal", "Learn English"); submit("form");
    click("[data-act=onb-skip]");
    expect(prefs.onboard).toBe("skipped"); expect(location.hash).toBe("#/today");
    expect(store.demo.list().filter((r) => r.entity === "goal")).toHaveLength(1);
    renderApp(); expect(document.querySelector("[data-onboard]")).toBeNull();
  });
  it("no score, rank, streak or red copy words in the onboarding texts (en, bn)", () => {
    const bad = /\b(score|rank|streak|grade|level up|fail|behind|lost)\b|স্কোর|র‍্যাংক|স্ট্রিক/i;
    for (const l of ["en", "bn"] as const) for (const [k, v] of Object.entries(PACKS[l])) if (k.startsWith("onb.")) expect(bad.test(v), `${l}:${k}`).toBe(false);
  });
});

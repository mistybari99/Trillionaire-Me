// First-run onboarding, screens 2 and 3 of 3 (screen 1 is the demo / real choice in modeUi.ts). Audit M1.
// One goal in plain words, one small step, and a first win. Skippable on every screen.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { DEFAULT_FIRST_MINUTES, FIRST_MINUTES, checkPlainText, onboardingOpen, parseMinutes } from "../core/onboarding";
import { activeNs, nsTag, saveBlockedText, saveTyped, typed, findRec, storeOf, labelFor } from "./entry";
import { prefs } from "./state";
import type { FieldValue } from "../core/types";

type Sub = "goal" | "step" | "win";
// Per page view only. A reload restarts at the goal screen, and an existing goal is simply offered again.
let sub: Sub = "goal";
let goalId: string | null = null;
let stepId: string | null = null;
let errKey: Key | null = null;

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const newId = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Starts the flow from the goal screen again. Called when the first-run choice is made. */
export function resetOnboard(): void { sub = "goal"; goalId = null; stepId = null; errKey = null; }

function finish(state: "done" | "skipped", to: string) {
  prefs.onboard = state; sub = "goal"; goalId = null; stepId = null; errKey = null;
  if (location.hash === to) rerender(); else location.hash = to;
}

const skipBtn = (lang: Locale) => h("button", { class: "btn ghost", type: "button", "data-act": "onb-skip", onclick: () => finish("skipped", "#/today") }, t("onb.skip", lang));

function frame(lang: Locale, n: 2 | 3, ...kids: Array<HTMLElement | null>): HTMLElement {
  return h("main", { class: "scr scr-onboard", "data-onboard": sub },
    h("p", { class: "muted", "data-onb-step": String(n) }, t("onb.step", lang, { n })),
    ...kids, h("p", { class: "muted" }, t("onb.skipNote", lang)), skipBtn(lang));
}

function goalScreen(lang: Locale): HTMLElement {
  const input = h("input", { type: "text", id: "onb-goal", name: "goal", maxlength: "160", autocomplete: "off", placeholder: t("onb.goal.ph", lang), style: "min-height:44px" });
  const err = h("p", { class: "err", role: "alert", "data-onb-err": "1" }, errKey ? t(errKey, lang) : "");
  const form = h("form", { class: "card", novalidate: true }, h("h1", { class: "card-h" }, t("onb.goal.h", lang)), h("p", {}, t("onb.goal.p", lang)),
    h("label", { for: "onb-goal" }, t("onb.goal.label", lang)), input, err,
    h("button", { class: "btn", type: "submit", "data-act": "onb-goal-next" }, t("onb.next", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const c = checkPlainText(input.value);
    if (!c.ok) { errKey = c.reason === "empty" ? "onb.empty" : c.reason === "long" ? "onb.long" : "intake.secretRejected"; rerender(); return; }
    const id = newId("goal");
    if (!saveTyped({ id, entity: "goal", createdAt: new Date().toISOString(), values: { "goal.title": typed(c.text) } })) { errKey = null; err.textContent = saveBlockedText(lang); return; }
    goalId = id; errKey = null; sub = "step"; rerender();
  });
  return frame(lang, 2, form);
}

function stepScreen(lang: Locale): HTMLElement {
  const input = h("input", { type: "text", id: "onb-step", name: "step", maxlength: "160", autocomplete: "off", placeholder: t("onb.step.ph", lang), style: "min-height:44px" });
  const mins = h("select", { id: "onb-min", name: "minutes", style: "min-height:44px" },
    ...FIRST_MINUTES.map((m) => h("option", { value: String(m), ...(m === DEFAULT_FIRST_MINUTES ? { selected: true } : {}) }, t(`onb.min.${m}` as Key, lang))),
    h("option", { value: "" }, t("onb.min.unknown", lang)));
  const err = h("p", { class: "err", role: "alert", "data-onb-err": "1" }, errKey ? t(errKey, lang) : "");
  const form = h("form", { class: "card", novalidate: true }, h("h1", { class: "card-h" }, t("onb.step.h", lang)), h("p", {}, t("onb.step.p", lang)),
    h("label", { for: "onb-step" }, t("onb.step.label", lang)), input,
    h("label", { for: "onb-min" }, t("onb.min.label", lang)), mins, err,
    h("button", { class: "btn", type: "submit", "data-act": "onb-step-save" }, t("onb.step.save", lang)));
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const c = checkPlainText(input.value);
    if (!c.ok) { errKey = c.reason === "empty" ? "onb.empty" : c.reason === "long" ? "onb.long" : "intake.secretRejected"; rerender(); return; }
    const m = parseMinutes(mins.value);
    const minutes: FieldValue = m === null ? { state: "unknown" } : typed(m);
    const id = newId("task");
    const goalOk = goalId !== null && findRec(goalId) !== null;
    if (!saveTyped({ id, entity: "task", createdAt: new Date().toISOString(),
      values: { "task.title": typed(c.text), "task.minutes": minutes, "task.priority": typed("medium") },
      ...(goalOk ? { links: { goal: goalId! } } : {}) })) { errKey = null; err.textContent = saveBlockedText(lang); return; }
    stepId = id; errKey = null; sub = "win";
    const times = prefs.onboardTimes; prefs.onboardTimes = { ...times, ...(times.start ? {} : { start: new Date().toISOString() }) };
    rerender();
  });
  return frame(lang, 3, form);
}

function winScreen(lang: Locale): HTMLElement {
  const ns = activeNs();
  const doneBtn = h("button", { class: "btn", type: "button", "data-act": "onb-win-done", onclick: () => {
    const r = stepId ? findRec(stepId) : null;
    if (r && r.values["task.done_on"]?.state !== "value") {
      storeOf(r).put({ ...r, values: { ...r.values, "task.done_on": { state: "value", value: today(), label: labelFor(r.ns) } } });
      try { sessionStorage.setItem("tm:newStar", "1"); } catch { /* ignore */ }
    }
    prefs.onboardTimes = { ...prefs.onboardTimes, firstStep: new Date().toISOString() };
    finish("done", "#/reward");
  } }, t("onb.win.done", lang));
  const later = h("button", { class: "btn ghost", type: "button", "data-act": "onb-win-later", onclick: () => finish("done", "#/today") }, t("onb.win.later", lang));
  const title = stepId ? String((findRec(stepId)?.values["task.title"] as { value?: unknown } | undefined)?.value ?? "") : "";
  return h("main", { class: "scr scr-onboard", "data-onboard": "win" },
    h("p", { class: "muted", "data-onb-step": "3" }, t("onb.step", lang, { n: 3 })),
    h("section", { class: "card", role: "status" }, nsTag(ns, lang), h("h1", { class: "card-h" }, t("onb.win.h", lang)), h("p", { "data-onb-step-title": "1" }, title),
      h("p", { class: "muted" }, t(ns === "real" ? "onb.where.real" : "onb.where.demo", lang)), h("p", {}, t("onb.win.p", lang)), doneBtn, later));
}

/** Route #/start. Anyone who opens it with the onboarding already closed is sent on to Today. */
export function onboardScreen(): HTMLElement {
  const lang = prefs.lang;
  if (!onboardingOpen(prefs.onboard)) { queueMicrotask(() => { if (location.hash === "#/start") location.hash = "#/today"; }); return h("main", { class: "scr" }, h("a", { href: "#/today", class: "btn" }, t("nav.today", lang))); }
  if (sub === "step") return stepScreen(lang);
  if (sub === "win") return winScreen(lang);
  return goalScreen(lang);
}

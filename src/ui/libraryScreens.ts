// M24 ready-system library and M19 automation rules. Demo data by default; real data only after consent (D-B).
// Kept apart from screens.ts. Pure rules live in src/core/systems.ts and src/core/rules.ts.
import { h } from "./dom";
import { t, tb } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, prefs, store } from "./state";
import { readConsent } from "../core/consent";
import { disclaimers, num } from "./components";
import { SYSTEMS } from "../library/systemList";
import { addSystem, isSystemAdded, removeSystem, systemText, type SystemTemplate } from "../core/systems";
import { RULES, RULE_IDS, evaluateRules, ruleOn, type RuleInput, type Suggestion } from "../core/rules";
import type { Habit, Log } from "../core/habits";
import { todayIso } from "../core/habits";
import type { Namespace, TMRecord } from "../core/types";

const L = () => prefs.lang;
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);

/** Real data only when the user has given consent on More > Demo & real data. Otherwise everything goes to Demo. */
export const targetNs = (): Namespace => (readConsent(consentKv) ? "real" : "demo");

/** One-line result shown on the next render of the library (cleared when shown). */
let flash: { key: Key; n: number } | null = null;

function addOne(sys: SystemTemplate, ns: Namespace) {
  try {
    const { added } = addSystem(store[ns], sys, { ns, lang: prefs.lang, nowIso: new Date().toISOString() });
    flash = added > 0 ? { key: "library.flash.added", n: added } : { key: "library.flash.none", n: 0 };
  } catch {
    flash = { key: "library.flash.locked", n: 0 };
  }
  rerender();
}

function undoOne(sys: SystemTemplate, ns: Namespace) {
  const n = removeSystem(store[ns], sys.id);
  flash = { key: "library.flash.removed", n };
  rerender();
}

function systemCard(sys: SystemTemplate, ns: Namespace, recs: TMRecord[], lang: Locale) {
  const added = isSystemAdded(recs, sys.id);
  const count = t("library.count", lang, { g: num(sys.goals.length, lang), t: num(sys.tasks.length, lang), h: num(sys.habits.length, lang) });
  // Bangla text carries the reviewer-pending flag (TM-TST-161). English needs no flag.
  const draft = lang !== "en" ? h("span", { class: "tag warn", "data-draft": "bn" }, t("library.draft", lang)) : null;
  const button = added
    ? h("button", { class: "btn ghost", type: "button", "data-act": "system-undo", "data-system": sys.id, onclick: () => undoOne(sys, ns) }, t("library.undo", lang))
    : h("button", { class: "btn", type: "button", "data-act": "system-add", "data-system": sys.id, onclick: () => addOne(sys, ns) }, t("library.add", lang));
  return h("div", { class: "card", "data-system": sys.id },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, systemText(sys.name, lang)), added ? h("span", { class: "tag ok", "data-added": "1" }, t("library.added", lang)) : null),
    draft,
    h("p", {}, systemText(sys.summary, lang)),
    h("p", { class: "muted" }, count),
    button);
}

export function systemsLibraryScreen(): HTMLElement {
  const lang = L();
  const ns = targetNs();
  const recs = store[ns].list();
  const msg = flash; flash = null;
  return h("main", { class: "scr scr-library" },
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("library.title", lang)),
    h("p", { class: "sub" }, t("library.intro", lang)),
    h("p", { class: "note", "data-library-where": ns }, t(ns === "real" ? "library.where.real" : "library.where.demo", lang)),
    msg ? h("p", { class: "ok-msg", role: "status", "data-library-msg": msg.key }, t(msg.key, lang, { n: num(msg.n, lang) })) : null,
    ...(SYSTEMS.length ? SYSTEMS.map((s) => systemCard(s, ns, recs, lang)) : [h("p", { class: "muted" }, t("library.empty", lang))]),
    h("p", { class: "muted" }, t("library.note", lang)),
    disclaimers(lang, ["noGuarantee"]));
}

/** Rule inputs read from the Demo records the rest of the app reads. Nothing here is written. */
export function ruleInput(now = Date.now()): RuleInput {
  const recs = store.demo.list();
  const g = (r: TMRecord, k: string) => (r.values[k] as { value?: unknown } | undefined)?.value;
  const habits: Habit[] = recs.filter((r) => r.entity === "habit" && r.values["habit.title"]?.state === "value").sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({
    id: r.id, title: String(g(r, "habit.title")), days: String(g(r, "habit.days") ?? "0,1,2,3,4,5,6").split(",").filter((x) => x !== "").map(Number),
    target: typeof g(r, "habit.target") === "number" && (g(r, "habit.target") as number) > 0 ? (g(r, "habit.target") as number) : null, unit: String(g(r, "habit.unit") ?? ""),
  }));
  const logs: Log[] = recs.filter((r) => r.entity === "habit_log").map((r) => ({ habitId: r.links?.habit ?? "", date: String(g(r, "habit_log.date")), count: Number(g(r, "habit_log.count") ?? 0) }));
  const passedStages = recs.filter((r) => r.entity === "stage_pass").map((r) => String(g(r, "stage_pass.stage_code") ?? ""));
  return { today: todayIso(new Date(now)), now, habits, logs, passedStages, lastFocus: prefs.lastFocusEnd, lastRestAt: prefs.lastRestAt, switches: prefs.ruleSwitches };
}

function suggestionRow(s: Suggestion, lang: Locale) {
  const row = (text: string, href?: string) => h("li", { "data-suggestion": s.rule }, text, href ? h("span", {}, " ", link(href, "crumb", t("rules.open", lang))) : null);
  switch (s.rule) {
    case "smaller_step": return row(t("rules.s.smaller_step", lang, { title: s.title }), "#/habits");
    case "next_stage": return row(t("rules.s.next_stage", lang, { code: s.code }), "#/journey");
    case "break_after_focus": return row(t("rules.s.break_after_focus", lang, { n: s.minutes }));
    case "focus_again": return row(t("rules.s.focus_again", lang, { n: s.minutes }));
  }
}

/** Shown on Today only when a switched-on rule has something to say. Never a red or punishing line. */
export function rulesTodayCard(lang: Locale): HTMLElement | null {
  const items = evaluateRules(ruleInput()).slice(0, 3);
  if (!items.length) return null;
  return h("aside", { class: "card", "data-rules": "1", "aria-label": t("rules.today.h", lang) },
    h("h2", { class: "card-h" }, t("rules.today.h", lang)),
    h("ul", {}, ...items.map((s) => suggestionRow(s, lang))));
}

export function rulesScreen(): HTMLElement {
  const lang = L();
  const sw = prefs.ruleSwitches;
  const rows = RULE_IDS.map((id) => {
    const def = RULES[id];
    const on = ruleOn(id, sw);
    const pick = (label: string, active: boolean, value: boolean) => h("button", { type: "button", "aria-pressed": String(active), "data-rule-set": `${id}:${value ? "on" : "off"}`,
      onclick: () => { prefs.ruleSwitches = { ...prefs.ruleSwitches, [id]: value }; rerender(); } }, label);
    return h("div", { class: "card", "data-rule": id, "data-calm": String(def.calm) },
      h("h2", { class: "card-h" }, tb(def.name, lang)),
      h("span", { class: `tag ${def.calm ? "ok" : "off"}` }, t(def.calm ? "rules.calm" : "rules.off", lang)),
      h("p", { class: "muted" }, tb(def.desc, lang)),
      h("div", { class: "seg", role: "group", "aria-label": tb(def.name, lang) }, pick(t("rules.on", lang), on, true), pick(t("rules.disable", lang), !on, false)));
  });
  return h("main", { class: "scr scr-rules" },
    link("#/more", "crumb", `← ${t("more.title", lang)}`),
    h("h1", {}, t("rules.title", lang)),
    h("p", { class: "sub" }, t("rules.intro", lang)),
    ...rows,
    h("p", { class: "muted" }, t("rules.note", lang)),
    disclaimers(lang, ["noGuarantee"]));
}

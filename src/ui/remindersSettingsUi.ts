// Settings > Prayer & alerts > Reminders (docs/design/reminders-final-decision.md section 7 and 8).
// Master switch is OFF by default. Switching it on never calls the browser; only the "Allow phone alerts" tap asks for permission.
// The lock-screen detail ticks are not repeated here: a link goes to the existing Lock screen row.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { canNotify, notifyState, showPhone } from "./prayerAlerts";
import { notifyText } from "../core/notify";
import { HHMM, parseReminderPrefs, type ReminderPrefs } from "../core/reminders";
import { calendarButton } from "./remindUi";
import { settingsHash } from "./settingsRegistry";
const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

/** "Not now" / "calendar only" is remembered for this session only; the card does not return until the app is reopened. */
let sessionChoice: "allow" | "calendar" | null = null;
export const resetReminderSessionChoice = () => { sessionChoice = null; };

export function remindersCard(lang: Locale): HTMLElement {
  const cur = prefs.reminders;
  const save = (next: ReminderPrefs) => { prefs.reminders = parseReminderPrefs(next); rerender(); };
  const seg = (attr: string, on: boolean, offLabel: Key, onLabel: Key, set: (v: boolean) => void) => h("div", { class: "seg", [attr]: String(on) },
    h("button", { type: "button", "aria-pressed": String(!on), onclick: () => set(false) }, t(offLabel, lang)),
    h("button", { type: "button", "aria-pressed": String(on), onclick: () => set(true) }, t(onLabel, lang)));
  const ns = notifyState();
  const note = h("p", { class: "muted", role: "status", "data-rem-test-note": "1" });
  const card = h("div", { class: "card", "data-setting-row": "reminders", "data-reminders-settings": "1" },
    h("h2", { class: "card-h" }, t("rem.title", lang)),
    h("h3", {}, t("rem.master", lang)),
    seg("data-rem-master", cur.master, "deen.set.off", "deen.set.on", (v) => save({ ...cur, master: v })),
    h("p", { class: "muted" }, t("rem.master.help", lang)));
  card.append(calendarButton(lang)); // works with the master switch off: it needs no permission
  if (!cur.master) return card;

  card.append(h("p", { class: "note", "data-rem-limits": "1" }, `${t("rem.limits", lang)} ${t("rem.limits2", lang)}`));
  // Permission ladder: nothing is asked until this tap.
  if (ns !== "granted" && sessionChoice === null) {
    card.append(h("div", { class: "btn-row", "data-rem-perm-card": "1" },
      h("button", { class: "btn", type: "button", "data-act": "rem-allow", onclick: () => {
        sessionChoice = "allow";
        if (ns === "ask") { try { void Notification.requestPermission().finally(rerender); return; } catch { /* fall through */ } }
        rerender();
      } }, t("rem.allow", lang)),
      h("button", { class: "btn ghost", type: "button", "data-act": "rem-cal-only", onclick: () => { sessionChoice = "calendar"; rerender(); } }, t("rem.calOnly", lang))));
  }
  if (sessionChoice === "calendar" && ns !== "granted") card.append(h("p", { class: "muted", "data-rem-cal-only": "1" }, t("rem.calOnly.ok", lang)));
  if (ns === "unsupported" && sessionChoice === "allow") card.append(h("p", { class: "muted", "data-rem-iphone": "1" }, t("rem.iphone", lang)));
  card.append(h("p", { class: "muted", "data-perm": ns }, t(ns === "unsupported" ? "deen.set.permUnsupported" : ns === "granted" ? "deen.set.permOk" : ns === "denied" ? "deen.set.permDenied" : "deen.set.permAsk", lang)));

  card.append(
    h("h3", {}, t("rem.planStart", lang)),
    seg("data-rem-planstart", cur.planStart, "deen.set.off", "deen.set.on", (v) => save({ ...cur, planStart: v })));
  if (cur.planStart) card.append(h("div", { class: "seg", "data-rem-lead": String(cur.planLead) },
    h("button", { type: "button", "aria-pressed": String(cur.planLead === 0), onclick: () => save({ ...cur, planLead: 0 }) }, t("rem.lead0", lang)),
    h("button", { type: "button", "aria-pressed": String(cur.planLead === 10), onclick: () => save({ ...cur, planLead: 10 }) }, t("rem.lead10", lang))));

  const time = (id: string, label: Key, value: string, set: (v: string) => ReminderPrefs) => {
    const inp = h("input", { id, type: "time", value, "data-rem-time": id }) as HTMLInputElement;
    inp.addEventListener("change", () => { if (HHMM.test(inp.value)) save(set(inp.value)); });
    return [h("label", { for: id }, t(label, lang)), inp];
  };
  card.append(h("h3", {}, t("rem.quiet", lang)),
    ...time("rem-q-from", "rem.quiet.from", cur.quiet.from, (v) => ({ ...cur, quiet: { ...cur.quiet, from: v } })),
    ...time("rem-q-to", "rem.quiet.to", cur.quiet.to, (v) => ({ ...cur, quiet: { ...cur.quiet, to: v } })),
    h("p", { class: "muted" }, t("rem.quiet.note", lang)));

  card.append(
    h("button", { class: "btn ghost", type: "button", "data-act": "rem-test", onclick: () => {
      const title = notifyText({ en: t("rem.test.title", "en"), bn: t("rem.test.title", "bn") }, lang), body = notifyText({ en: t("rem.test.body", "en"), bn: t("rem.test.body", "bn") }, lang);
      if (!canNotify()) { note.textContent = t("rem.test.card", lang); return; }
      void showPhone(title, body, "rem-test", false).then((ok) => { note.textContent = t(ok ? "rem.test.sent" : "rem.test.card", lang); });
    } }, t("rem.test", lang)),
    note,
    h("a", { href: settingsHash("privacy", "lockscreen"), class: "crumb", "data-rem-lock-link": "1" }, t("rem.lock.link", lang)));
  return card;
}

// Batch 3 UI builders (Q-12, Q-13, Q-34). Kept out of the big screen files so those only get import and call-site lines.
import "./styles_qb3.css";
import { h } from "./dom";
import { t, fmtNumber } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import type { TMRecord } from "../core/types";
import { bufferBar } from "../core/bufferBar";
import { buildTree } from "../core/goalTree";
import { goalStatusOf } from "../core/goalStatus";
import { goalGrid } from "../core/chartData";
import { goalGridTracker } from "./charts";
import { prefs } from "./state";
import { todayIsoKpi } from "./kpiUi";

const minutesOf = (r: TMRecord): number | null => { const v = r.values["task.minutes"]; return v && v.state === "value" && typeof v.value === "number" ? v.value : null; };

/** Q-12: own estimated minutes plus a lighter +25% segment, labelled ESTIMATE. If any step has no minutes: Unknown, no bar. The bar is decorative; the sentence is the content. */
export function bufferStrip(steps: readonly TMRecord[], lang: Locale): HTMLElement | null {
  const b = bufferBar(steps.map(minutesOf)); if (b.kind === "none") return null;
  const head = h("h3", {}, t("q3.bb.h", lang), " ", h("span", { class: "tag", "data-label": "ESTIMATE" }, t("q3.bb.est", lang)));
  if (b.kind === "unknown") return h("div", { class: "qb3-bar", "data-buffer-bar": "unknown" }, head, h("p", { class: "muted" }, t("q3.bb.unknown", lang, { n: fmtNumber(b.missing, lang) })));
  const pct = (n: number) => `${(n / b.total) * 100}%`;
  return h("div", { class: "qb3-bar", "data-buffer-bar": "ok" }, head,
    h("div", { class: "bar", "aria-hidden": "true" }, h("span", { "data-seg": "own", style: `width:${pct(b.own)}` }), h("span", { "data-seg": "extra", style: `width:${pct(b.extra)}` })),
    h("p", {}, t("q3.bb.text", lang, { own: fmtNumber(b.own, lang), total: fmtNumber(b.total, lang), extra: fmtNumber(b.extra, lang) })));
}

/** Q-34: the long view for the active top-level goals on the Goals screen. Uses the same range choice as the Habits long view. */
export function goalGridCard(recs: readonly TMRecord[], lang: Locale): HTMLElement | null {
  const byId = new Map(recs.filter((r) => r.entity === "goal").map((g) => [g.id, g] as const));
  const active = buildTree(recs).filter((n) => !n.orphan && byId.get(n.id) !== undefined && goalStatusOf(byId.get(n.id)!) === "active");
  if (!active.length) return null;
  const rows = goalGrid(active.map((n) => ({ id: n.id, title: n.title, stepIds: n.stepIds })), recs, todayIsoKpi(), prefs.habitGrid);
  return goalGridTracker(rows, prefs.habitGrid, (r) => { prefs.habitGrid = r; window.dispatchEvent(new HashChangeEvent("hashchange")); }, lang);
}

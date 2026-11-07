// Read-only, lazy projections. Never cached, exported, fetched, or mixed with fictional guide examples.
import type { Bi, Locale } from "../i18n/registry";
import { tb } from "../i18n/t";
import type { FieldValue, TMRecord } from "../core/types";
import { fieldById } from "../catalog/fields";
import { goalProgress } from "../core/goalPlan";
import { goalIdsOf } from "../core/taskGoals";
import { isCountedTask, isDoneTask } from "../core/overallProgress";
import { taskTrace } from "../core/taskTrace";
import { tasksFrom } from "../core/planInputs";
import { isDone, type Habit, type Log } from "../core/habits";
import { financeFrom } from "../core/financeInputs";
import { moneySummary, type Metric } from "../core/homeSummary";
import { sourceRows, noteRows, sopRows } from "../core/knowledge";
import { riskRows } from "../core/risk";
import { roleRows } from "../core/team";
import { ventureRows } from "../core/ventures";
import { planRows, isMarked } from "../core/deenPlans";
import { dhakaNow, isoDate } from "../core/prayer";
import { markedOn } from "../core/prayerLog";
import type { PrayerKey } from "../core/prayer";
import { h } from "./dom";
import { valueEl, num } from "./components";
import { activeNs, allRecs, realConsent, nsTag } from "./entry";
import { isLocked } from "./lockUi";
import type { HelpContext, HelpTopicId } from "./helpTopics";

const bi = (bn: string, en: string): Bi => ({ bn, en });
const text = (bn: string, en: string, lang: Locale) => tb(bi(bn, en), lang);
const unknown = (lang: Locale) => text("অজানা", "Unknown", lang);
const str = (v: FieldValue | undefined): string | null => v?.state === "value" && typeof v.value === "string" && v.value.trim() ? v.value : null;
const entities: Partial<Record<HelpTopicId, readonly string[]>> = {
  today: ["task", "goal"], goals: ["goal", "task"],
  profile: ["profile", "skill", "resource", "constraint"], money: ["finance_item"],
  habits: ["habit", "habit_log", "goal"], business: ["venture", "team_role", "task", "goal"],
  decisions: ["risk"], knowledge: ["source", "note", "sop", "goal"],
  deen: ["deen_plan", "prayer_log", "fast", "deen_mark"],
};
const destinations: Partial<Record<HelpTopicId, string>> = { today: "#/diary/plan", goals: "#/journey/goals", profile: "#/diary/intake", money: "#/diary/money", habits: "#/habits", business: "#/diary/ventures", decisions: "#/journey/risks", knowledge: "#/notes", deen: "#/deen/plans" };

/** Scoped categories only. Local viewing does not grant per-item export authorization. */
export function helpMapRecords(topic: HelpTopicId, records: readonly TMRecord[]): TMRecord[] {
  const allowed = entities[topic] ?? [];
  return records.filter((r) => allowed.includes(r.entity)).map((r) => ({ ...r, values: Object.fromEntries(Object.entries(r.values).filter(([key]) => {
    const privacy = fieldById(key)?.privacy;
    if (privacy === "health") return false;
    if (privacy === "worship") return topic === "deen";
    if (privacy === "financial") return topic === "money" || topic === "business";
    if (privacy === "third_party") return topic === "business";
    return true;
  })) }));
}
const list = (...nodes: HTMLElement[]) => h("ul", { class: "help-map-list" }, ...nodes);
const node = (id: string, ...children: Array<HTMLElement | string | null>) => h("li", { class: "help-map-node", "data-help-record": id }, ...children);
function stored(r: TMRecord, key: string, lang: Locale): HTMLElement {
  const value = r.values[key];
  if (!value || value.state !== "value") return h("span", { "data-unknown": "1" }, unknown(lang));
  const def = fieldById(key);
  let shown: string;
  if (def?.options && (typeof value.value === "string" || Array.isArray(value.value))) {
    const codes = Array.isArray(value.value) ? value.value.filter((x): x is string => typeof x === "string") : def.type === "multichoice" ? value.value.split(",").map((s) => s.trim()).filter(Boolean) : [value.value];
    shown = codes.map((code) => { const label = def.options!.find((o) => o.code === code)?.label; return label ? tb(label, lang) : unknown(lang); }).join(", ") || unknown(lang);
  }
  else if (typeof value.value === "number" && Number.isFinite(value.value)) shown = num(value.value, lang);
  else if (typeof value.value === "string") shown = value.value;
  else if (Array.isArray(value.value) && value.value.every((x) => typeof x === "string")) shown = value.value.join(" · ");
  else return h("span", { "data-unknown": "1" }, unknown(lang));
  return valueEl(shown, value.label, lang);
}
function field(r: TMRecord, key: string, lang: Locale): HTMLElement {
  const def = fieldById(key);
  return h("p", {}, def ? `${tb(def.label, lang)}: ` : "", stored(r, key, lang));
}
const link = (href: string, lang: Locale) => h("a", { href }, text("মূল স্ক্রিন খুলুন", "Open the workspace", lang));
function goalsMap(recs: TMRecord[], lang: Locale, context: HelpContext): HTMLElement | null {
  const selected = context.recordId ? recs.find((r) => r.id === context.recordId) : null;
  if (selected?.entity === "task") {
    // The trace model expects titled goals. Keep incomplete/missing links visible separately.
    const trace = taskTrace(recs.filter((r) => r.entity !== "goal" || str(r.values["goal.title"]) !== null), selected.id);
    if (!trace) return null;
    const unresolved = goalIdsOf(selected).filter((id) => !trace.goals.some((g) => g.id === id));
    return list(node(selected.id, h("h4", {}, stored(selected, "task.title", lang)),
      h("p", {}, text("এই কাজ যে গোলে সাহায্য করে", "Goals this step helps", lang)),
      trace.goals.length ? list(...trace.goals.map((g) => node(g.id, h("p", {}, g.path.join(" → ")), g.total ? h("p", {}, valueEl(`${num(g.done, lang)} / ${num(g.total, lang)}`, "INFERENCE", lang)) : h("p", {}, unknown(lang)), link(`#/journey/goal/${encodeURIComponent(g.id)}`, lang)))) : !unresolved.length ? h("p", {}, text("কোনো গোলের সাথে লিংক দেওয়া হয়নি।", "No goal link has been entered.", lang)) : null,
      unresolved.length ? list(...unresolved.map((id) => { const g = recs.find((r) => r.id === id && r.entity === "goal"); return node(id, g ? stored(g, "goal.title", lang) : h("p", {}, text("লিংক আছে, গোলটি পাওয়া যায়নি।", "Linked goal is unavailable.", lang)), h("p", {}, unknown(lang))); })) : null,
      h("p", {}, text("একই কাজ মোট প্রোগ্রেসে একবার ধরা হয়।", "This step counts once in overall task progress.", lang)), field(selected, "task.minutes", lang)));
  }
  const goals = goalProgress(recs).filter((g) => !context.recordId || g.id === context.recordId);
  const incomplete = recs.filter((r) => r.entity === "goal" && (!context.recordId || r.id === context.recordId) && !goals.some((g) => g.id === r.id));
  if (!goals.length && !incomplete.length) return null;
  return list(...goals.map((g) => {
    const r = recs.find((x) => x.id === g.id)!;
    const tasks = recs.filter((x) => g.ids.includes(x.id));
    const parent = r.links?.parent ? recs.find((x) => x.id === r.links!.parent && x.entity === "goal") : null;
    return node(g.id, h("h4", {}, stored(r, "goal.title", lang)), parent ? h("p", {}, text("উপরের গোল: ", "Parent goal: ", lang), stored(parent, "goal.title", lang)) : null,
      h("p", {}, g.percent === null ? h("span", { "data-unknown": "1" }, unknown(lang)) : valueEl(`${num(g.percent, lang)}%`, g.mode === "manual" ? (r.values["goal.manual_percent"]?.state === "value" ? r.values["goal.manual_percent"].label : "FACT") : "INFERENCE", lang), " · ", text(g.mode === "manual" ? "হাতে দেওয়া" : "কাজ থেকে হিসাব", g.mode === "manual" ? "Manual" : "Calculated from steps", lang)),
      tasks.length ? list(...tasks.map((task) => node(task.id, stored(task, "task.title", lang), h("p", {}, text(isDoneTask(task) ? "শেষ করা হয়েছে" : "শেষ করার রেকর্ড নেই", isDoneTask(task) ? "Recorded done" : "No completion recorded", lang))))) : h("p", {}, text("এখনো কোনো কাজ লিংক করা হয়নি।", "No steps have been linked yet.", lang)), link(`#/journey/goal/${encodeURIComponent(g.id)}`, lang));
  }), ...incomplete.map((r) => node(r.id, h("h4", {}, stored(r, "goal.title", lang)), h("p", {}, text("গোলের নাম দেওয়া নেই। প্রোগ্রেসের ফল অজানা।", "The goal title is missing. Progress is unknown.", lang)), link(`#/journey/goal/${encodeURIComponent(r.id)}`, lang))));
}
function todayMap(recs: TMRecord[], lang: Locale, context: HelpContext): HTMLElement | null {
  const tasks = recs.filter(isCountedTask).filter((r) => !context.recordId || r.id === context.recordId);
  if (!tasks.length) return null;
  const inputs = new Map(tasksFrom(recs).map((task) => [task.id, task]));
  return h("div", {}, h("p", {}, text("আপনার দেওয়া কাজ ও লিংক দেখানো হচ্ছে। আজ কোন কাজ কখন করবেন, তা প্ল্যান স্ক্রিনে দেখুন।", "These are your entered tasks and links. See the Plan screen for today's scheduled work.", lang)), list(...tasks.map((r) => node(r.id, h("h4", {}, stored(r, "task.title", lang)), field(r, "task.minutes", lang),
    h("p", {}, text(isDoneTask(r) ? "শেষ করার রেকর্ড আছে" : "শেষ করার রেকর্ড নেই", isDoneTask(r) ? "Completion recorded" : "No completion recorded", lang)),
    ...(inputs.get(r.id)?.after ? [h("p", {}, text("আগে দরকার: ", "Prerequisite: ", lang), (() => { const prior = recs.find((x) => x.id === inputs.get(r.id)!.after); return prior ? stored(prior, "task.title", lang) : h("span", {}, unknown(lang)); })())] : []),
    ...goalIdsOf(r).map((id) => { const g = recs.find((x) => x.id === id && x.entity === "goal"); return h("p", {}, text("গোল: ", "Goal: ", lang), g ? stored(g, "goal.title", lang) : text("লিংক আছে, গোলটি পাওয়া যায়নি", "Linked goal is unavailable", lang)); })))));
}
function moneyMap(recs: TMRecord[], lang: Locale, context: HelpContext): HTMLElement | null {
  const picked = recs.filter((r) => !context.recordId || r.id === context.recordId);
  if (!picked.length) return null;
  const view = financeFrom(picked);
  if (!view.items.length && !view.oneOff.length) return null;
  const metric = (m: Metric) => m.state === "value" ? valueEl(`BDT ${num(m.value, lang)}`, m.label, lang) : h("span", { "data-unknown": "1" }, m.state === "unknown" ? `${unknown(lang)} · ${num(m.missing, lang)} ${text("পরিমাণ দেওয়া হয়নি", "amounts missing", lang)}` : unknown(lang));
  return h("div", {}, context.recordId ? h("p", {}, text("শুধু এই এন্ট্রির হিসাব; সব এন্ট্রির মোট নয়।", "This entry only; not a total of all entries.", lang)) : null,
    list(...moneySummary(view.items).scopes.map((s) => node(s.scope, h("h4", {}, text(s.scope === "personal" ? "পারসোনাল" : "ব্যবসা", s.scope === "personal" ? "Personal" : "Business", lang)), h("p", {}, text("মোট সম্পদ: ", "Net worth: ", lang), metric(s.netWorth)), h("p", {}, text("মাসিক আয়: ", "Monthly income: ", lang), metric(s.income)), h("p", {}, text("মাসিক খরচ: ", "Monthly spending: ", lang), metric(s.expenses))))),
    h("p", {}, text("একবারের লেনদেন মাসিক মোটে নেই। বার্ষিক পরিমাণ মাসিক হিসাবে ভাগ করা হয়। বিনিময় হার শুধু আপনার দেওয়া হার।", "One-off entries are excluded from monthly totals. Annual amounts are divided for monthly figures. Exchange rates are only those you entered.", lang)),
    list(...picked.map((r) => node(r.id, field(r, "finance.label", lang), field(r, "finance.amount", lang), field(r, "finance.period", lang)))));
}
function knowledgeMap(recs: TMRecord[], lang: Locale, context: HelpContext): HTMLElement | null {
  const now = new Date(); const sources = sourceRows(recs, now), notes = noteRows(recs), sops = sopRows(recs, now);
  const relevant = (id: string) => !context.recordId || id === context.recordId;
  const nodes: HTMLElement[] = [];
  for (const s of sources.filter((s) => relevant(s.id))) { const r = recs.find((x) => x.id === s.id)!; nodes.push(node(s.id, stored(r, "source.title", lang), field(r, "source.checked_on", lang), h("p", {}, text(s.fresh === "recent" ? "যাচাইয়ের তারিখ দেওয়া আছে" : s.fresh === "stale" ? "আবার যাচাই করুন" : "যাচাইয়ের তারিখ অজানা", s.fresh === "recent" ? "Review date recorded" : s.fresh === "stale" ? "Check again" : "Review date unknown", lang)))); }
  for (const n of notes.filter((n) => relevant(n.id))) { const r = recs.find((x) => x.id === n.id)!; const s = sources.find((x) => x.id === n.sourceId); nodes.push(node(n.id, stored(r, "note.title", lang), h("p", {}, text("সোর্স: ", "Source: ", lang), s ? stored(recs.find((x) => x.id === s.id)!, "source.title", lang) : unknown(lang)))); }
  for (const s of sops.filter((s) => relevant(s.id))) { const r = recs.find((x) => x.id === s.id)!; nodes.push(node(s.id, stored(r, "sop.title", lang), field(r, "sop.reviewed_on", lang), h("ol", {}, ...s.steps.map((step) => h("li", {}, step))))); }
  return nodes.length ? list(...nodes) : null;
}
function deenMap(recs: TMRecord[], lang: Locale, context: HelpContext): HTMLElement | null {
  const day = isoDate(dhakaNow(Date.now()).date);
  const plans = planRows(recs).filter((p) => !context.recordId || p.id === context.recordId);
  const prayerRows = recs.filter((r) => r.entity === "prayer_log" && (!context.recordId || r.id === context.recordId));
  const nodes = plans.map((p) => node(p.id, stored(recs.find((r) => r.id === p.id)!, "deen_plan.title", lang), h("p", {}, day, " · ", text(isMarked(recs, p, day) ? "মার্ক দেওয়া আছে" : "মার্ক দেওয়া নেই", isMarked(recs, p, day) ? "Marked" : "No mark recorded", lang))));
  for (const r of prayerRows) {
    const date = str(r.values["prayer_log.date"]);
    const marked = date ? markedOn(recs, date).has(r.links?.prayer as PrayerKey) : null;
    nodes.push(node(r.id, field(r, "prayer_log.date", lang), h("p", {}, text("নামাজ: ", "Prayer: ", lang), prayerName(r.links?.prayer, lang)), h("p", {}, marked === null ? unknown(lang) : text(marked ? "মার্ক দেওয়া আছে" : "মার্ক দেওয়া নেই", marked ? "Marked" : "No valid mark recorded", lang))));
  }
  for (const r of recs.filter((r) => ["fast", "deen_mark"].includes(r.entity) && (!context.recordId || r.id === context.recordId))) {
    const plan = r.links?.plan ? recs.find((p) => p.id === r.links!.plan && p.entity === "deen_plan") : null;
    nodes.push(node(r.id, h("h4", {}, text(r.entity === "fast" ? "রোজার মার্ক" : "প্ল্যানের মার্ক", r.entity === "fast" ? "Fasting mark" : "Plan mark", lang)), field(r, r.entity === "fast" ? "fast.date" : "deen_mark.date", lang), plan ? stored(plan, "deen_plan.title", lang) : null));
  }
  return nodes.length ? h("div", {}, h("p", {}, text("শুধু দেওয়া মার্ক ও প্ল্যান; অন্যের সাথে তুলনা নয়। নামাজের সময় মূল স্ক্রিনে দেখুন।", "Entered marks and plans only; no comparison between people. View prayer times on the main screen.", lang)), list(...nodes)) : null;
}
function prayerName(key: string | undefined, lang: Locale): string {
  const names: Record<string, Bi> = { fajr: bi("ফজর", "Fajr"), dhuhr: bi("যোহর", "Dhuhr"), asr: bi("আসর", "Asr"), maghrib: bi("মাগরিব", "Maghrib"), isha: bi("এশা", "Isha") };
  return names[key ?? ""] ? tb(names[key!]!, lang) : unknown(lang);
}
function simpleMap(topic: HelpTopicId, recs: TMRecord[], lang: Locale, context: HelpContext): HTMLElement | null {
  const selected = recs.filter((r) => !context.recordId || r.id === context.recordId);
  const nodes: HTMLElement[] = [];
  if (topic === "profile") for (const r of selected) {
    const keys = Object.keys(r.values).filter((k) => !!fieldById(k));
    if (keys.length) nodes.push(node(r.id, ...keys.map((key) => field(r, key, lang))));
  }
  if (topic === "habits") for (const r of selected.filter((r) => r.entity === "habit")) {
    const goals = goalIdsOf(r).map((id) => recs.find((g) => g.id === id && g.entity === "goal")).filter((g): g is TMRecord => !!g);
    const target = r.values["habit.target"]; const logs = recs.filter((x) => x.entity === "habit_log" && x.links?.habit === r.id);
    const habit: Habit = { id: r.id, title: str(r.values["habit.title"]) ?? "", days: [], target: target?.state === "value" && typeof target.value === "number" && target.value > 0 ? target.value : null, unit: str(r.values["habit.unit"]) ?? "" };
    const logNodes = logs.map((log) => {
      const date = str(log.values["habit_log.date"]), count = log.values["habit_log.count"];
      const known = date !== null && count?.state === "value" && typeof count.value === "number" && Number.isFinite(count.value);
      const input: Log[] = known ? [{ habitId: r.id, date, count: count.value as number }] : [];
      return node(log.id, field(log, "habit_log.date", lang), field(log, "habit_log.count", lang), h("p", {}, known ? text(isDone(habit, input, date!) ? "এই চেক-ইনে কাজ শেষের রেকর্ড আছে" : "এই চেক-ইন দেওয়া টার্গেটে পৌঁছায়নি", isDone(habit, input, date!) ? "This check-in records completion" : "This check-in is below the entered target", lang) : unknown(lang)));
    });
    nodes.push(node(r.id, stored(r, "habit.title", lang), field(r, "habit.days", lang), field(r, "habit.target", lang), field(r, "habit.unit", lang), ...goals.map((g) => h("p", {}, text("গোল: ", "Goal: ", lang), stored(g, "goal.title", lang))), logNodes.length ? list(...logNodes) : h("p", {}, text("কোনো চেক-ইন দেওয়া হয়নি।", "No check-ins have been entered.", lang))));
  }
  if (topic === "decisions") for (const risk of riskRows(selected)) { const r = selected.find((x) => x.id === risk.id)!; nodes.push(node(r.id, field(r, "risk.text", lang), field(r, "risk.likelihood", lang), field(r, "risk.stop_rule", lang), field(r, "risk.review_on", lang))); }
  if (topic === "business") {
    for (const v of ventureRows(selected)) { const r = selected.find((x) => x.id === v.id)!; nodes.push(node(r.id, field(r, "venture.name", lang), field(r, "venture.ownership_pct", lang))); }
    for (const role of roleRows(selected)) { const r = selected.find((x) => x.id === role.id)!; nodes.push(node(r.id, field(r, "team_role.role", lang), field(r, "team_role.holder", lang))); }
  }
  return nodes.length ? list(...nodes) : null;
}
export function renderOwnMap(topic: HelpTopicId, lang: Locale, context: HelpContext = {}): HTMLElement {
  const host = h("section", { class: "help-own-map", "data-help-own-map": topic }, h("h3", {}, text("এই মোডের লোকাল ডাটার ম্যাপ", "Local map for this data mode", lang)));
  const state = (code: string, bn: string, en: string) => { host.dataset.helpMapState = code; host.append(h("p", { role: "status" }, text(bn, en, lang))); return host; };
  try {
    if (isLocked()) return state("locked", "অ্যাপ আনলক করলে নিজের ম্যাপ দেখা যাবে।", "Unlock the app to view a local map.");
    if (!entities[topic]) return state("unsupported", "এখানে গাইডই প্রযোজ্য; এই ক্যাটাগরির নিজের ডাটার ম্যাপ নেই।", "The guide applies here; this category has no local-data map.");
    const ns = activeNs();
    if (ns === "real" && !realConsent()) return state("consent", "আসল ডাটার অনুমতি নেই। সাধারণ গাইড দেখতে পারেন।", "Real-data consent is off. The general guide is still available.");
    const privacy = context.fieldId ? fieldById(context.fieldId)?.privacy : undefined;
    if (privacy === "health" || (privacy === "worship" && topic !== "deen") || (privacy === "third_party" && topic !== "business") || (privacy === "financial" && topic !== "money" && topic !== "business")) return state("restricted", "এই তথ্য সাধারণ হেল্প ম্যাপে দেখানো হয় না। মূল প্রাইভেট স্ক্রিন ব্যবহার করুন।", "This information is not shown in a general help map. Use its private workspace.");
    // allRecs is called only on demand and only after authorization; defensive ns filtering prevents cross-mode leaks.
    const recs = helpMapRecords(topic, allRecs().filter((r) => r.ns === ns));
    host.append(nsTag(ns, lang));
    if (context.recordId && !recs.some((r) => r.id === context.recordId)) return state("unavailable", "এই আইটেম এই মোডে পাওয়া যায়নি। সাধারণ গাইড দেখতে পারেন।", "This item is unavailable in this data mode. The general guide is still available.");
    let map: HTMLElement | null;
    if (topic === "goals") map = goalsMap(recs, lang, context);
    else if (topic === "today") map = todayMap(recs, lang, context);
    else if (topic === "money") map = moneyMap(recs, lang, context);
    else if (topic === "knowledge") map = knowledgeMap(recs, lang, context);
    else if (topic === "deen") map = deenMap(recs, lang, context);
    else map = simpleMap(topic, recs, lang, context);
    if (!map) { state("empty", "এখনো প্রাসঙ্গিক এন্ট্রি নেই। অজানা মানকে 0 ধরা হয়নি।", "No relevant entries yet. Unknown values have not been treated as zero."); const href = destinations[topic]; if (href) host.append(link(href, lang)); return host; }
    host.dataset.helpMapState = "ready"; host.append(map, h("p", { class: "muted" }, text("শুধু এই ডিভাইসের বর্তমান মোডের ডাটা; এখানে কোনো এন্ট্রি বদলায় না।", "Only this device's current data mode is shown. This view changes no entries.", lang))); return host;
  } catch { host.replaceChildren(h("h3", {}, text("লোকাল ম্যাপ", "Local map", lang))); return state("error", "ম্যাপ পড়া যায়নি। গাইড দেখতে পারেন; পরে আবার খুলে চেষ্টা করুন।", "The map could not be read. Use the guide and reopen to try again."); }
}

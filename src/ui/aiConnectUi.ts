// Settings > Connections > Connect AI (W1). Everything is off by default. This screen never calls the network itself:
// a request goes only through the guard (src/core/aiGuard.ts) and the transport below, which this build always blocks.
import "./styles_ai.css";
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { consentKv, store, vault, prefs } from "./state";
import { MASK, isApproved, isEnabled, setEnabled } from "../core/connections";
import { hasAiKey, maskedAiKey, removeAiKey, saveAiKey, sealAiKeyIfNeeded } from "../core/aiKey";
import { RequestConsent, checkGuard, confComplete, isKilled, readConf, saveConf, sendThroughGuard, setKill, type AiStyle, type GuardDeps } from "../core/aiGuard";
import { capState, clearPrice, estimateInputCost, readCap, readPrice, resetUsage, saveCap, savePrice, usageView, type CapMode } from "../core/aiUsage";
import { contextFromRecords, parseExtraHeaders, type AssistantRequest, type Transport } from "../core/assistant";
import { readAiKey } from "../core/aiKey";
import { chatCompletions } from "../adapters/ai/chatCompletions";
import { messagesStyle } from "../adapters/ai/messagesStyle";
import { blockedTransport } from "../adapters/ai/transport";
import { isProxyBase, readSearchBase, saveSearchBase } from "../adapters/googleSearch";
import { openPreviewSheet, type PreviewInfo } from "./aiPreviewSheet";

/** The one place the transport is chosen. This build ships the blocked one; a test may replace it, nothing else does. */
export const aiWiring: { transport: Transport } = { transport: blockedTransport };
const consent = new RequestConsent();
const providers = { chat: chatCompletions, messages: messagesStyle };

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
// View state only (never stored): which message to show, the typed question, the last answer.
let msg: { section: string; key: Key; bad: boolean } | null = null;
let question = "";
let useCtx = false;
let answer: string | null = null;
let refusal: string | null = null;
const say = (section: string, key: Key, bad = false) => { msg = { section, key, bad }; rerender(); };
const note = (section: string, lang: Locale) => (msg?.section === section ? h("p", { class: msg.bad ? "need" : "ok-msg", role: "status", "data-ai-msg": section }, t(msg.key, lang)) : null);
const field = (label: Key, lang: Locale, input: HTMLElement, id: string) => [h("label", { for: id }, t(label, lang)), input];
const tf = (id: string, value = "", extra: Record<string, string> = {}) => h("input", { type: "text", id, value, autocomplete: "off", spellcheck: "false", autocapitalize: "off", ...extra }) as HTMLInputElement;

function guardDeps(): GuardDeps { return { kv: consentKv, vault, transport: aiWiring.transport, providers, consent }; }

/** The request, built the same way for the preview and for sending. Demo items carry DEMO; real items only when ticked. */
export function buildAiRequest(q: string, withTitles: boolean, realTicked: boolean): { req: AssistantRequest; realAvailable: boolean; hasDemo: boolean } {
  const records = [...store.demo.list(), ...store.real.list()];
  const all = withTitles ? contextFromRecords(records, true) : { lines: [], real: false };
  const used = withTitles ? contextFromRecords(records, realTicked) : all;
  const messages: AssistantRequest["messages"] = [
    { role: "system", content: "Answer briefly and in plain words." },
    { role: "user", content: q.trim() },
    ...(used.lines.length ? [{ role: "user" as const, content: `My items:\n${used.lines.join("\n")}`, ...(used.real ? { fromRealData: true } : {}) }] : []),
  ];
  return { req: { purpose: "explain", messages, includeRealData: used.real }, realAvailable: all.real, hasDemo: used.lines.some((l) => l.startsWith("[DEMO]")) };
}

/** What the sheet shows. The key is masked; everything else is the exact request that would be sent. */
export function previewInfo(req: AssistantRequest, hasDemo: boolean): PreviewInfo {
  const c = readConf(consentKv);
  const spec = providers[c.style].buildRequest(req, { apiKey: MASK, host: c.host, model: c.model, ...(c.path ? { path: c.path } : {}), extraHeaders: c.headers });
  const cost = estimateInputCost(consentKv, spec.body);
  return { host: spec.host, path: spec.path, body: spec.body, hasDemo, costText: cost ? `${cost.value.toFixed(4)} ${cost.currency}` : null };
}

function masterSection(lang: Locale): HTMLElement {
  const approved = isApproved(consentKv, "aiAssistant"), on = isEnabled(consentKv, "aiAssistant"), killed = isKilled(consentKv);
  const state = killed ? "ai.state.kill" : on ? "ai.state.on" : "ai.state.off";
  return h("section", { class: "card", "data-ai-sec": "master" },
    h("div", { class: "row" }, h("h2", { class: "card-h" }, t("ai.master.h", lang)), h("span", { class: `tag ${on && !killed ? "ok" : "off"}`, "data-ai-state": on && !killed ? "on" : "off" }, t(state, lang))),
    h("button", { class: "btn ghost", type: "button", "data-ai-master": "1", disabled: !approved, "aria-disabled": String(!approved), onclick: () => { setEnabled(consentKv, "aiAssistant", !on); rerender(); } }, t(on ? "ai.master.off" : "ai.master.on", lang)),
    approved ? null : h("p", { class: "muted", "data-ai-need": "1" }, t("ai.master.need", lang)),
    approved ? null : h("a", { href: "#/settings/connections", class: "btn ghost", "data-ai-to-conn": "1" }, t("ai.master.link", lang)));
}

function keySection(lang: Locale): HTMLElement {
  const input = h("input", { type: "password", id: "ai-key", "data-ai-key": "1", autocomplete: "off", spellcheck: "false", autocapitalize: "off" }) as HTMLInputElement;
  const state = h("p", { class: "muted", "data-ai-key-state": "1" }, t(hasAiKey(consentKv) ? "ai.key.saved" : "ai.key.none", lang, { mask: MASK }));
  if (hasAiKey(consentKv)) void maskedAiKey(consentKv, vault).then((m) => { if (m) state.textContent = t("ai.key.saved", lang, { mask: m }); });
  return h("section", { class: "card", "data-ai-sec": "key" }, h("h2", { class: "card-h" }, t("ai.key.h", lang)),
    ...field("ai.key.label", lang, input, "ai-key"), h("p", { class: "muted" }, t("ai.key.hint", lang)),
    h("button", { class: "btn ghost", type: "button", "data-ai-key-save": "1", onclick: async () => {
      const r = await saveAiKey(consentKv, vault, input.value); input.value = "";
      say("key", r.ok ? "conn.key.ok" : r.problem === "locked" ? "ai.key.locked" : (`conn.key.${r.problem}` as Key), !r.ok);
    } }, t("ai.key.save", lang)),
    hasAiKey(consentKv) ? h("button", { class: "btn ghost", type: "button", "data-ai-key-remove": "1", onclick: () => { removeAiKey(consentKv); msg = null; rerender(); } }, t("ai.key.remove", lang)) : null,
    state, note("key", lang));
}

function providerSection(lang: Locale): HTMLElement {
  const c = readConf(consentKv);
  const style = h("select", { id: "ai-style", "data-ai-style": "1" }, h("option", { value: "chat", selected: c.style === "chat" }, t("ai.prov.style.chat", lang)), h("option", { value: "messages", selected: c.style === "messages" }, t("ai.prov.style.messages", lang))) as HTMLSelectElement;
  const host = tf("ai-host", c.host, { "data-ai-host-in": "1" }), path = tf("ai-path", c.path, { "data-ai-path-in": "1" }), model = tf("ai-model", c.model, { "data-ai-model-in": "1" });
  const headers = h("textarea", { id: "ai-headers", "data-ai-headers-in": "1", spellcheck: "false", autocapitalize: "off" }) as HTMLTextAreaElement;
  headers.value = Object.entries(c.headers).map(([k, v]) => `${k}: ${v}`).join("\n");
  return h("section", { class: "card", "data-ai-sec": "provider" }, h("h2", { class: "card-h" }, t("ai.prov.h", lang)),
    ...field("ai.prov.style", lang, style, "ai-style"), ...field("ai.prov.host", lang, host, "ai-host"), ...field("ai.prov.path", lang, path, "ai-path"),
    ...field("ai.prov.model", lang, model, "ai-model"), ...field("ai.prov.headers", lang, headers, "ai-headers"),
    h("button", { class: "btn ghost", type: "button", "data-ai-prov-save": "1", onclick: () => {
      const hd = parseExtraHeaders(headers.value); if (!hd) { say("provider", "ai.prov.bad.headers", true); return; }
      const r = saveConf(consentKv, { style: style.value as AiStyle, host: host.value, path: path.value, model: model.value, headers: hd });
      say("provider", r === "ok" ? "ai.prov.saved" : (`ai.prov.bad.${r}` as Key), r !== "ok");
    } }, t("ai.prov.save", lang)), note("provider", lang));
}

function capSection(lang: Locale): HTMLElement {
  const cap = readCap(consentKv), price = readPrice(consentKv);
  const mode = h("select", { id: "ai-cap-mode", "data-ai-cap-mode": "1" }, h("option", { value: "calls", selected: cap?.mode !== "amount" }, t("ai.cap.calls", lang)), h("option", { value: "amount", selected: cap?.mode === "amount" }, t("ai.cap.amount", lang))) as HTMLSelectElement;
  const limit = h("input", { type: "number", id: "ai-cap-limit", "data-ai-cap-limit": "1", min: "1", step: "any", value: cap ? String(cap.limit) : "" }) as HTMLInputElement;
  const pin = h("input", { type: "number", id: "ai-price-in", "data-ai-price-in": "1", min: "0", step: "any", value: price ? String(price.perThousandIn) : "" }) as HTMLInputElement;
  const pout = h("input", { type: "number", id: "ai-price-out", "data-ai-price-out": "1", min: "0", step: "any", value: price ? String(price.perThousandOut) : "" }) as HTMLInputElement;
  const cur = tf("ai-price-cur", price?.currency ?? "", { "data-ai-price-cur": "1" });
  const unit = cap ? (cap.mode === "calls" ? t("ai.cap.unit.calls", lang) : price?.currency ?? "") : "";
  return h("section", { class: "card", "data-ai-sec": "cap" }, h("h2", { class: "card-h" }, t("ai.cap.h", lang)),
    h("p", { class: "muted", "data-ai-cap-state": "1" }, cap ? t("ai.cap.state", lang, { n: cap.limit, unit }) : t("ai.cap.none", lang)),
    ...field("ai.cap.mode", lang, mode, "ai-cap-mode"), ...field("ai.cap.limit", lang, limit, "ai-cap-limit"),
    h("button", { class: "btn ghost", type: "button", "data-ai-cap-save": "1", onclick: () => {
      const r = saveCap(consentKv, mode.value as CapMode, Number(limit.value));
      say("cap", r === "ok" ? "ai.cap.saved" : r === "bad" ? "ai.cap.bad" : "ai.cap.needPrice", r !== "ok");
    } }, t("ai.cap.save", lang)), note("cap", lang),
    h("h3", {}, t("ai.price.h", lang)), h("p", { class: "muted" }, t("ai.price.hint", lang)),
    ...field("ai.price.in", lang, pin, "ai-price-in"), ...field("ai.price.out", lang, pout, "ai-price-out"), ...field("ai.price.cur", lang, cur, "ai-price-cur"),
    h("button", { class: "btn ghost", type: "button", "data-ai-price-save": "1", onclick: () => {
      const r = savePrice(consentKv, Number(pin.value), Number(pout.value), cur.value);
      say("price", r === "ok" ? "ai.price.saved" : "ai.price.bad", r !== "ok");
    } }, t("ai.price.save", lang)),
    price ? h("button", { class: "btn ghost", type: "button", "data-ai-price-clear": "1", onclick: () => { clearPrice(consentKv); msg = null; rerender(); } }, t("ai.price.clear", lang)) : null, note("price", lang));
}

function usageSection(lang: Locale): HTMLElement {
  const u = usageView(consentKv); const unknown = t("ai.usage.unknown", lang);
  const spend = u.spend === null ? unknown : `${u.spend.toFixed(4)} ${u.currency ?? ""}`.trim();
  return h("section", { class: "card", "data-ai-sec": "usage" }, h("h2", { class: "card-h" }, t("ai.usage.h", lang)),
    h("p", { "data-ai-usage-calls": "1" }, t("ai.usage.calls", lang, { n: u.calls })),
    h("p", { "data-ai-usage-tokens": "1" }, t("ai.usage.tokens", lang, { i: u.inputTokens ?? unknown, o: u.outputTokens ?? unknown })),
    h("p", { "data-ai-usage-spend": "1" }, t("ai.usage.spend", lang, { v: spend })),
    h("p", { class: "muted" }, t("ai.usage.unknownNote", lang)),
    h("button", { class: "btn ghost", type: "button", "data-ai-usage-reset": "1", onclick: () => { resetUsage(consentKv); rerender(); } }, t("ai.usage.reset", lang)));
}

function killSection(lang: Locale): HTMLElement {
  const killed = isKilled(consentKv);
  return h("section", { class: "card", "data-ai-sec": "kill" }, h("h2", { class: "card-h" }, t("ai.kill.h", lang)),
    killed ? h("p", { role: "status", "data-ai-kill-on": "1" }, t("ai.kill.on", lang)) : null,
    killed ? h("button", { class: "btn ghost", type: "button", "data-ai-kill-resume": "1", onclick: () => { setKill(consentKv, false); rerender(); } }, t("ai.kill.resume", lang))
      : h("button", { class: "btn", type: "button", "data-ai-kill": "1", onclick: () => { setKill(consentKv, true); setEnabled(consentKv, "aiAssistant", false); setEnabled(consentKv, "webSearch", false); rerender(); } }, t("ai.kill.btn", lang)));
}

function listSection(lang: Locale): HTMLElement {
  return h("section", { class: "card", "data-ai-sec": "lists" },
    h("h2", { class: "card-h" }, t("ai.sent.h", lang)), h("ul", { "data-ai-sent": "1" }, ...(["ai.sent.1", "ai.sent.2", "ai.sent.3"] as Key[]).map((k) => h("li", {}, t(k, lang)))),
    h("h2", { class: "card-h" }, t("ai.never.h", lang)), h("ul", { "data-ai-never": "1" }, ...(["ai.never.1", "ai.never.2", "ai.never.3"] as Key[]).map((k) => h("li", {}, t(k, lang)))));
}

function askSection(lang: Locale): HTMLElement {
  const q = h("textarea", { id: "ai-q", "data-ai-q": "1" }) as HTMLTextAreaElement; q.value = question;
  const ctx = h("input", { type: "checkbox", id: "ai-ctx", "data-ai-ctx": "1" }) as HTMLInputElement; ctx.checked = useCtx;
  const out = h("div", { role: "status", "data-ai-out": "1" },
    refusal ? h("p", { class: "need", "data-ai-refusal": "1" }, refusal) : null,
    answer !== null ? h("div", { class: "card ai-answer", "data-ai-answer": "1" }, h("h3", {}, t("ai.answer.h", lang)), h("p", { "data-ai-answer-text": "1" }, answer), h("p", { class: "muted" }, t("ai.answer.note", lang))) : null);
  const why = (code: string) => t("ai.why.prefix", lang, { why: t(`ai.why.${code}` as Key, lang) });
  return h("section", { class: "card", "data-ai-sec": "ask" }, h("h2", { class: "card-h" }, t("ai.ask.h", lang)),
    ...field("ai.ask.label", lang, q, "ai-q"), h("label", { class: "k-check", for: "ai-ctx" }, ctx, t("ai.ask.ctx", lang)),
    h("button", { class: "btn", type: "button", "data-ai-preview": "1", onclick: async () => {
      question = q.value; useCtx = ctx.checked; answer = null; refusal = null;
      if (!question.trim()) { refusal = t("ai.ask.empty", lang); rerender(); return; }
      const first = buildAiRequest(question, useCtx, true);
      const key = await readAiKey(consentKv, vault);
      const pre = checkGuard(consentKv, first.req, { confirmed: true, realData: true }, key);
      if (pre) { refusal = why(pre); rerender(); return; }
      const choice = await openPreviewSheet(lang, (real) => { const b = buildAiRequest(question, useCtx, real); return previewInfo(b.req, b.hasDemo); }, first.realAvailable);
      if (!choice.send) { rerender(); return; }
      const built = buildAiRequest(question, useCtx, choice.realData);
      consent.tick(true, choice.realData);
      const res = await sendThroughGuard(guardDeps(), built.req);
      if (res.ok) answer = res.value.text; else refusal = why(res.code);
      rerender();
    } }, t("ai.ask.preview", lang)), out);
}

function searchSection(lang: Locale): HTMLElement {
  const base = readSearchBase(consentKv); const on = isEnabled(consentKv, "webSearch") && !!base && !isKilled(consentKv);
  const input = tf("ai-search-base", base, { "data-ai-search-base": "1", placeholder: "/api/search" });
  return h("section", { class: "card", id: "search", "data-ai-sec": "search" }, h("h2", { class: "card-h" }, t("ai.search.h", lang)),
    h("p", { class: "muted" }, t("ai.search.hint", lang)),
    ...field("ai.search.base", lang, input, "ai-search-base"),
    h("button", { class: "btn ghost", type: "button", "data-ai-search-save": "1", onclick: () => {
      const v = input.value.trim();
      if (v && !isProxyBase(v)) { say("search", "ai.search.bad", true); return; }
      saveSearchBase(consentKv, v); say("search", v ? "ai.search.saved" : "ai.search.cleared");
    } }, t("ai.search.save", lang)),
    h("p", { class: "muted", "data-ai-search-state": on ? "on" : "off" }, t(on ? "ai.search.state.on" : "ai.search.state.off", lang)), note("search", lang));
}

export function aiConnectScreen(lang: Locale = prefs.lang): HTMLElement {
  void sealAiKeyIfNeeded(consentKv, vault);
  const ok = capState(consentKv).ok && hasAiKey(consentKv) && confComplete(readConf(consentKv));
  return h("main", { class: "scr scr-ai", "data-ai-ready": ok ? "1" : "0" },
    h("a", { href: "#/settings/connections", class: "crumb" }, `← ${t("conn.title", lang)}`),
    h("h1", {}, t("ai.title", lang)), h("p", { class: "sub" }, t("ai.intro", lang)),
    masterSection(lang), keySection(lang), providerSection(lang), capSection(lang), usageSection(lang), killSection(lang), listSection(lang), askSection(lang), searchSection(lang));
}

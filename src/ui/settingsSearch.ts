// Settings search (settings redesign PR 5): a static registry search, no network. Matches labels in all three languages, English
// keywords and Bangla keywords. Results link to the row's page. The last three opened results are remembered on this device.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import { PACKS } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { CAT_LABEL, CATEGORIES, GUIDES, ROWS, SEARCH_BN, settingsHash, type Cat } from "./settingsRegistry";

/** Simple normalisation for Latin and Bangla: NFC, no joiners, lower case, single spaces. */
export const norm = (s: string): string => s.normalize("NFC").replace(/[‌‍]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export interface SearchEntry { id: string; label: Key; cat: Cat; href: string; hay: string }
const labels = (k: Key) => [PACKS.en[k], PACKS.bn[k], PACKS.mix[k]];
const entries: SearchEntry[] = [
  ...ROWS.map((r) => ({ id: r.id, label: r.label, cat: r.cat, href: r.id === "welcome" ? settingsHash("about", "welcome") : r.route, hay: norm([...labels(r.label), ...r.words, ...(SEARCH_BN[r.id] ?? []), ...labels(CAT_LABEL[r.cat])].join(" | ")) })),
  ...GUIDES.map((g) => ({ id: `guide-${g.id}`, label: g.label, cat: "about" as Cat, href: g.route, hay: norm([...labels(g.label), ...labels(g.desc), g.id].join(" | ")) })),
  ...CATEGORIES.map((c) => ({ id: `cat-${c}`, label: CAT_LABEL[c], cat: c as Cat, href: settingsHash(c), hay: norm(labels(CAT_LABEL[c]).join(" | ")) })),
];
export const allEntries = (): SearchEntry[] => entries;

/** Every query word must appear (as a part of a word or phrase). Empty query finds nothing. */
export function searchSettings(q: string): SearchEntry[] {
  const words = norm(q).split(" ").filter(Boolean); if (!words.length) return [];
  return entries.filter((e) => words.every((w) => e.hay.includes(w)));
}

const RECENT_KEY = "tm:ui:settingsRecent";
export function recentIds(): string[] { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 3) : []; } catch { return []; } }
function remember(id: string) { try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...recentIds().filter((x) => x !== id)].slice(0, 3))); } catch { /* convenience only */ } }

/** Puts a magnifier next to the page's h1 and a search panel under it. Works the same on every Settings page. */
export function withSearch(main: HTMLElement, lang: Locale): HTMLElement {
  const h1 = main.querySelector("h1"); if (!h1) return main;
  const input = h("input", { type: "search", id: "set-search", autocomplete: "off", "aria-label": t("set.search", lang), placeholder: t("set.search.ph", lang), "data-search": "input", style: "min-height:44px;width:100%" }) as HTMLInputElement;
  const status = h("p", { class: "muted", role: "status", "data-search": "status" });
  const list = h("ul", { style: "list-style:none;padding:0;margin:0", "data-search": "results" });
  const panel = h("section", { class: "card", hidden: true, "data-search": "panel" }, input, status, list);
  const btn = h("button", { type: "button", class: "btn ghost k-iconbtn", "data-act": "search-open", "aria-expanded": "false", "aria-controls": "search-panel", "aria-label": t("set.search", lang) }, "\u{1F50D}") as HTMLButtonElement;
  panel.id = "search-panel";
  const item = (e: SearchEntry) => h("li", { class: "k-linkrow" }, h("a", { href: e.href, class: "card link", "data-search-hit": e.id, onclick: () => remember(e.id) }, h("strong", {}, t(e.label, lang)), " ", h("span", { class: "tag" }, t(CAT_LABEL[e.cat], lang))));
  const paint = () => {
    const q = input.value; const hits = searchSettings(q);
    if (!norm(q)) { const rec = recentIds().map((id) => entries.find((e) => e.id === id)).filter((e): e is SearchEntry => !!e); status.textContent = rec.length ? t("set.search.recent", lang) : ""; list.replaceChildren(...rec.map(item)); return; }
    status.textContent = hits.length ? t("set.search.count", lang, { n: hits.length }) : t("set.search.none", lang); list.replaceChildren(...hits.map(item));
  };
  input.addEventListener("input", paint);
  btn.addEventListener("click", () => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute("aria-expanded", String(open)); btn.setAttribute("aria-label", t(open ? "set.search.close" : "set.search", lang)); if (open) { paint(); input.focus(); } });
  const row = h("div", { class: "row", style: "display:flex;align-items:center;justify-content:space-between;gap:8px" });
  h1.replaceWith(row); row.append(h1, btn); row.after(panel);
  return main;
}

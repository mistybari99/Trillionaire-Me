// "Where we are": a one-page summary for the owner. The Bangla text IS docs/owner/WHERE_WE_ARE_BN.md (imported as raw text, so the app and the file can never differ).
// English is the same page, written once below; Mix is the Bangla text with the usual common English words kept (swapMixTerms).
// Route #/more/where, listed on Settings > Guides & info. No data is read: the page only describes the build.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";
import { prefs } from "./state";
import { swapMixTerms } from "../i18n/packs";
import { MODULES, buildLabel } from "../modules/capability";
import md from "../../docs/owner/WHERE_WE_ARE_BN.md?raw";

const link = (href: string, cls: string, ...kids: Array<Node | string>) => h("a", { href, class: cls }, ...kids);

export type Block = { kind: "p" | "ul" | "ol"; items: string[] };
export interface Section { heading: string | null; blocks: Block[] }
export interface Page { title: string; sections: Section[] }

/** Parses the small Markdown subset the page uses: one # title, ## headings, "- " bullets, "1. " numbered lines, plain paragraphs. Backticks are dropped. */
export function parsePage(text: string): Page {
  const lines = text.split("\n").map((l) => l.replace(/`/g, "").trimEnd());
  let title = ""; const sections: Section[] = []; let cur: Section = { heading: null, blocks: [] };
  const push = (kind: Block["kind"], item: string) => { const last = cur.blocks[cur.blocks.length - 1]; if (last && last.kind === kind && kind !== "p") last.items.push(item); else cur.blocks.push({ kind, items: [item] }); };
  for (const l of lines) {
    if (!l.trim()) continue;
    if (l.startsWith("# ")) { title = l.slice(2).trim(); continue; }
    if (l.startsWith("## ")) { sections.push(cur); cur = { heading: l.slice(3).trim(), blocks: [] }; continue; }
    if (/^- /.test(l)) push("ul", l.slice(2).trim()); else if (/^\d+\.\s/.test(l)) push("ol", l.replace(/^\d+\.\s+/, "").trim()); else push("p", l.trim());
  }
  sections.push(cur);
  return { title, sections: sections.filter((s) => s.heading !== null || s.blocks.length) };
}

const count = (label: string) => MODULES.filter((m) => buildLabel(m) === label).length;

/** The English page. Same sections, same number of lines as the Bangla file (a test compares the shape). Module counts come from the capability list. */
export function englishPage(): Page {
  const total = MODULES.length, done = count("complete"), part = count("partial"), blocked = count("blocked");
  return { title: "Where we are (3 Nov 2026)", sections: [
    { heading: null, blocks: [{ kind: "p", items: ["A one-page summary, made for reading on a phone. Every number comes from the code and the tests; nothing is guessed."] }] },
    { heading: "What is built", blocks: [{ kind: "ul", items: [
      "The app installs on the phone and works without internet after the first visit. Bangla, English and Mix are all there.",
      `${done} of ${total} modules are fully built, ${part} are partly built and ${blocked} wait for your approval. Partly built: venture unit economics and data encryption. Waiting: AI. New: the boards page now has the goal tree, resource map, readiness map and a drawing of plan changes, all from your own data.`,
      "Goals, steps, habits, money records, risks, team, reviews (weekly, monthly, 90 days), reports and Save as PDF.",
      "Deen: prayer times, fasting marks, plans and reminders, zakat from the numbers you typed, Hijri date and the Ramadan view (approximate).",
      "New: when you are online, prayer times can update by themselves. This stays off unless you tick it. When on, only the city, country and month are sent.",
      "New: a calm \"welcome back\" card after a few days away, and \"then and now\" side by side in the monthly review. No numbers, no day counts, no red text.",
      "Settings were reorganised: everything in one place, search, safe restore, and typing a word to confirm a delete.",
    ] }] },
    { heading: "Safety and data", blocks: [{ kind: "ul", items: [
      "Your real data stays on this phone. Nothing real is saved without your tick. \"Withdraw permission\" stops new real entries; the old ones are not deleted.",
      "Nothing leaves the phone except the prayer-time update. AI, cloud and paid services are off.",
      "Automatic checks (types, 1,600+ tests, build, browser checks) run on GitHub every time.",
    ] }] },
    { heading: "Your tasks (only you can do these)", blocks: [{ kind: "ol", items: [
      "Offline test on the phone: open once online and visit every page, then use airplane mode and open again.",
      "Check the lock-screen privacy.",
      "Compare prayer times with the official list (Islamic Foundation Bangladesh): the phone's own calculation and the new automatic update. The automatic update has not been tried against the real server yet, so this matters.",
      "Bangla review: send back the corrected text from docs/owner/BANGLA_REVIEW_SHEET.md and tools/bangla_apply_back.mjs will put it in safely.",
      "Tell me which of the 4 designs you want to keep.",
      "The hosting account step (Cloudflare) is yours alone.",
    ] }] },
    { heading: "Waiting for your approval (nothing starts without it)", blocks: [{ kind: "ul", items: [
      "AI, online suggestions and their cost (D-C).",
      "Religious text and the hadith review (D-D). The hadith pack is off, with an \"unreviewed\" mark.",
      "An encrypted copy in the cloud, data encryption, any paid service.",
    ] }] },
    { heading: "See also", blocks: [{ kind: "p", items: ["README.md, docs/TODO.md, DECISIONS_LOG.md, docs/plan/PLAN_TRACKER.md."] }] },
  ] };
}

export const pageFor = (lang: Locale): Page => {
  if (lang === "en") return englishPage();
  const bn = parsePage(md);
  if (lang === "bn") return bn;
  return { title: swapMixTerms(bn.title), sections: bn.sections.map((s) => ({ heading: s.heading === null ? null : swapMixTerms(s.heading), blocks: s.blocks.map((b) => ({ kind: b.kind, items: b.items.map(swapMixTerms) })) })) };
};

export function whereScreen(lang: Locale = prefs.lang): HTMLElement {
  const p = pageFor(lang);
  return h("main", { "data-where": "page" },
    link("#/settings/about", "crumb", `← ${t("set.cat.about", lang)}`),
    h("h1", {}, p.title),
    ...p.sections.map((s) => h("section", { class: "card", "data-where-section": s.heading ?? "intro" },
      s.heading ? h("h2", { class: "card-h" }, s.heading) : null,
      ...s.blocks.map((b) => b.kind === "p" ? h("p", {}, ...b.items) : h(b.kind, {}, ...b.items.map((i) => h("li", {}, i)))))));
}

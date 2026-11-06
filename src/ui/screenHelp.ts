import type { Locale } from "../i18n/registry";
import { helpTrigger } from "./helpUi";
import type { HelpTopicId } from "./helpTopics";
import "./helpUi.css";
import "./helpVisuals.css";

/** Deliberate family mapping. Reference pages retain their learning content. */
export function screenHelpTopic(path: string): HelpTopicId {
  if (/^\/deen|^\/hadith|halal|prayer/.test(path)) return "deen";
  if (/backup|dictionary/.test(path)) return "backup";
  if (/^\/profile|\/intake|\/health|\/wheel|\/reality/.test(path)) return "profile";
  if (/\/money/.test(path)) return "money";
  if (/\/ventures|\/team|\/legs|\/leak/.test(path)) return "business";
  if (/\/decide|\/risks|\/mine|\/gates/.test(path)) return "decisions";
  if (/\/goal|\/horizon|\/northstar|\/backward|\/boards|\/universe/.test(path)) return "goals";
  if (/^\/habits|\/review|\/week|\/month/.test(path)) return "habits";
  if (/^\/capture|^\/cards|^\/notes|^\/topic|library|glossary|fields/.test(path)) return "knowledge";
  if (/^\/settings|^\/more/.test(path)) return "settings";
  if (/^\/today|\/plan|^\/focus|^\/stuck/.test(path)) return "today";
  return "app";
}
export function enhanceScreenHelp(main: HTMLElement, path: string, lang: Locale): void {
  const heading = main.querySelector("h1");
  if (!heading || main.querySelector("[data-screen-help]")) return;
  const notes: HTMLElement[] = [];
  // Only these reviewed optional introductions move. Units, warnings, consent and sources stay inline.
  const optional = path === "/cards" || path === "/journey/boards" ? main.querySelector<HTMLElement>(":scope > p.sub") : null;
  if (optional) { notes.push(optional); optional.remove(); }
  const recordId = path.match(/\/(?:goal|backward|focus)\/([\w-]+)$/)?.[1];
  const control = helpTrigger(screenHelpTopic(path), lang, recordId ? { recordId } : undefined, notes);
  control.dataset.screenHelp = "true";
  const row = document.createElement("div"); row.className = "screen-help-heading";
  heading.before(row); row.append(heading, control);
}

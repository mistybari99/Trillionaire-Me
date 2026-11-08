import type { Locale } from "../i18n/registry";
import { tb } from "../i18n/t";
import { h } from "./dom";
import type { HelpTopic, HelpTopicId } from "./helpTopics";

/** DOM text wraps and scales; the connectors are decorative, the list carries meaning. */
export function helpDiagram(topic: HelpTopic, lang: Locale): HTMLElement {
  return h("ol", { class: `help-diagram help-diagram-${topic.diagram}`, "data-help-diagram": topic.id }, ...topic.steps.map((step) => h("li", {}, h("span", {}, tb(step, lang)))));
}
const SHAPES: Record<HelpTopicId, string[]> = {
  app: ["M22 20h52v78H22z", "M38 88h20", "M88 36h30v46H88z", "M78 60h8m-4-4 4 4-4 4"],
  today: ["M24 24h92v72H24z", "M24 44h92M44 18v14m50-14v14", "m38 66 6 6 12-14M68 64h30M68 78h24"],
  goals: ["M52 16h36v24H52z", "M20 76h36v24H20zM84 76h36v24H84z", "M70 40v18M38 58h64M38 58v18m64-18v18"],
  profile: ["M70 26a14 14 0 1 0 0 28a14 14 0 1 0 0-28", "M42 94v-8a28 28 0 0 1 56 0v8", "M20 34h14m72 0h14M20 74h12m76 0h12"],
  money: ["M24 32h92v60H24z", "M24 48h92", "M88 60h28v20H88zM98 70h4", "M34 22h58"],
  habits: ["M42 24a42 42 0 1 1-8 66", "m30 20 12 4-4 12", "m50 60 14 14 26-30"],
  business: ["M22 40h96v54H22z", "M50 40V24h40v16", "M22 60h96M62 54h16v14H62z"],
  decisions: ["M70 20v24M38 44h64M38 44v18m64-18v18", "M20 62h36v30H20zM84 62h36v30H84z", "M30 76h16m48 0h16"],
  knowledge: ["M20 28q24-10 50 4q26-14 50-4v64q-24-10-50 4q-26-14-50-4z", "M70 32v64M32 46h24m-24 14h24m28-14h24m-24 14h24"],
  deen: ["M30 90q10-30 40-56q30 26 40 56", "M30 90h80M48 90V74q22-24 44 0v16", "M70 20v8"],
  backup: ["M22 30h44v58H22zM86 30h32v58H86z", "M66 60h20m-6-6 6 6-6 6", "M32 42h24M32 52h16M94 76h16"],
  settings: ["M26 34h88M26 60h88M26 86h88", "M48 26v16m42 10v16M60 78v16"],
  head: ["M96 30a16 16 0 1 0 0 32a16 16 0 1 0 0-32", "M24 98h92", "M24 84h56M24 70h36", "m92 40-6 10h8l-4 10"],
};
/** Local, static decoration only. No embedded text or data; the adjacent guide is authoritative. */
export function helpIllustration(id: HelpTopicId): HTMLElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 140 120"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
  for (const d of SHAPES[id]) { const path = document.createElementNS(ns, "path"); path.setAttribute("d", d); svg.append(path); }
  return h("div", { class: "help-illustration", "data-help-illustration": id }, svg);
}

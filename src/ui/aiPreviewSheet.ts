// The check-before-sending sheet (W1). Shows the exact text that will be sent, the host, and a cost only if the owner typed a price.
// Esc or Cancel closes it and nothing is sent. Real data is a separate tick, unticked each time.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Locale } from "../i18n/registry";

export interface PreviewInfo { host: string; path: string; body: string; costText: string | null; hasDemo: boolean }
export interface PreviewChoice { send: boolean; realData: boolean }

/** `build` makes the preview for the current real-data tick; the same function builds what is sent, so the two cannot differ. */
export function openPreviewSheet(lang: Locale, build: (realData: boolean) => PreviewInfo, realAvailable: boolean): Promise<PreviewChoice> {
  return new Promise((resolve) => {
    const opener = document.activeElement as HTMLElement | null;
    const tick = h("input", { type: "checkbox", id: "ai-sheet-real", "data-ai-real": "1" }) as HTMLInputElement;
    const body = h("div", { "data-ai-sheet-info": "1" });
    const draw = () => {
      const i = build(tick.checked);
      body.replaceChildren(...([
        h("p", { "data-ai-host": "1" }, t("ai.sheet.host", lang, { host: i.host })),
        h("p", { class: "muted", "data-ai-path": "1" }, t("ai.sheet.path", lang, { path: i.path })),
        h("p", {}, t("ai.sheet.body", lang)),
        h("pre", { "data-ai-payload": "1" }, i.body),
        i.costText ? h("p", { "data-ai-cost": "1" }, t("ai.sheet.cost", lang, { v: i.costText })) : null,
        i.hasDemo ? h("p", { class: "muted" }, t("ai.sheet.demo", lang)) : null,
        h("p", { class: "muted" }, t("ai.sheet.key", lang))] as Array<HTMLElement | null>).filter((n): n is HTMLElement => n !== null));
    };
    const heading = h("h2", { id: "ai-sheet-h", tabindex: "-1" }, t("ai.sheet.h", lang));
    const done = (send: boolean) => { document.removeEventListener("keydown", onKey, true); wrap.remove(); resolve({ send, realData: send && tick.checked }); opener?.focus?.(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); done(false); } };
    const sheet = h("div", { class: "ai-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "ai-sheet-h", "data-ai-sheet": "1" },
      heading, body,
      realAvailable ? h("label", { class: "k-check", for: "ai-sheet-real" }, tick, t("ai.sheet.real", lang)) : null,
      h("button", { class: "btn", type: "button", "data-ai-send": "1", onclick: () => done(true) }, t("ai.sheet.send", lang)),
      h("button", { class: "btn ghost", type: "button", "data-ai-cancel": "1", onclick: () => done(false) }, t("ai.sheet.cancel", lang)));
    const wrap = h("div", { class: "ai-sheet-wrap", "data-ai-sheet-wrap": "1" }, sheet);
    tick.addEventListener("change", draw);
    draw();
    document.addEventListener("keydown", onKey, true);
    document.body.append(wrap);
    heading.focus();
  });
}

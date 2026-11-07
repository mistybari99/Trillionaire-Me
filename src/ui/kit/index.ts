// Component kit builders (ui-polish-spec section 2). Pure DOM through h(); class lists only, no logic. CSS lives in ../kit.css.
// Old class names stay on the markup as aliases, so selectors in tests and e2e keep working until the K6 cleanup.
import { h } from "../dom";

type Kid = Node | string | null | undefined | false;
export type BtnVariant = "primary" | "secondary" | "ghost" | "calm-danger";
export interface BtnOpts { variant?: BtnVariant; size?: "sm" | "md" | "lg"; type?: "button" | "submit"; attrs?: Record<string, string | boolean | ((e: Event) => void) | undefined> }

/** Class list for a kit button. "btn" and "ghost" are kept so old selectors still match. */
export function btnClass(variant: BtnVariant = "primary", size: "sm" | "md" | "lg" = "md"): string {
  return ["btn", "k-btn", `k-btn--${variant}`, variant === "secondary" ? "ghost" : "", size === "sm" ? "btn-sm k-btn--sm" : size === "lg" ? "cta k-btn--lg" : ""].filter(Boolean).join(" ");
}
export function kBtn(label: string, o: BtnOpts = {}): HTMLButtonElement {
  return h("button", { class: btnClass(o.variant, o.size), type: o.type ?? "button", ...(o.attrs ?? {}) }, label);
}
/** A group of buttons with a 12px gap; exactly one primary (first). Use instead of margins on buttons. */
export function kActions(kids: Kid[], o: { row?: boolean; end?: boolean; label?: string } = {}): HTMLElement {
  return h("div", { class: `k-actions${o.row ? " k-actions--row" : ""}${o.end ? " k-actions--end" : ""}`, role: "group", ...(o.label ? { "aria-label": o.label } : {}) }, ...kids);
}
export type ChipKind = "source" | "external" | "demo" | "ok" | "calm" | "warn" | "unk";
export const kChip = (text: string, kind: ChipKind = "source"): HTMLElement => h("span", { class: `k-chip k-chip--${kind}` }, text);
/** Row of chips, placed after a text block (never inside a sentence). */
export const kChips = (...chips: Kid[]): HTMLElement => h("div", { class: "k-chips" }, ...chips);

export type NoticeKind = "info" | "calm" | "ok" | "warn" | "legal";
/** One calm notice. role=note for static text, status for a live message. */
export function kNotice(kind: NoticeKind, body: Kid[], o: { role?: "note" | "status"; legal?: boolean } = {}): HTMLElement {
  return h("aside", { class: `note k-notice k-notice--${kind}`, role: o.role ?? "note", ...(o.legal ? { "data-legal": "1" } : {}) }, ...body);
}
/** A list row: lead mark, title + subtitle, trailing actions. Wraps under the text at narrow widths and large text. */
export function kRow(o: { lead?: string; title: string; sub?: Kid; trail?: Kid[]; state?: "done"; attrs?: Record<string, string> }): HTMLElement {
  return h("li", { class: "k-row", ...(o.state ? { "data-state": o.state } : {}), ...(o.attrs ?? {}) },
    o.lead ? h("span", { class: "k-row__lead", "aria-hidden": "true" }, o.lead) : null,
    h("div", { class: "k-row__main" }, h("span", { class: "k-row__title" }, o.title), o.sub ? h("span", { class: "k-row__sub" }, o.sub) : null),
    o.trail?.length ? h("div", { class: "k-row__trail" }, ...o.trail) : null);
}
export const kList = (...rows: Kid[]): HTMLElement => h("ul", { class: "k-list", role: "list" }, ...rows);
export function kEmpty(title: string, text: string, actions?: Kid[]): HTMLElement {
  return h("div", { class: "k-empty" }, h("h3", {}, title), h("p", {}, text), actions?.length ? kActions(actions) : null);
}

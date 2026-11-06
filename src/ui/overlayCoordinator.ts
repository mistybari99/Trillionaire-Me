/** One transient UI surface, shared by contextual help and the tab menu. */
export type OverlayCloseReason = "replace" | "dismiss" | "back" | "context" | "navigate";
export interface TransientOverlay {
  id: string;
  close: (reason: OverlayCloseReason) => void;
  returnFocus?: HTMLElement;
  history?: boolean;
}
const MARKER = "tm:overlay";
let active: TransientOverlay | undefined;
let context: string | undefined;
let sequence = 0;
let owned: string | undefined;
let entryUrl: string | undefined;
let returning = false;
let afterReturn: (() => void) | undefined;
const marked = () => owned !== undefined && history.state?.[MARKER] === owned;
function removeMarker() {
  if (!marked()) return;
  const state = { ...history.state }; delete state[MARKER];
  history.replaceState(state, "", location.href);
}
function finish(reason: OverlayCloseReason) {
  const previous = active; active = undefined;
  if (!previous) return;
  previous.close(reason);
  if ((reason === "dismiss" || reason === "back") && previous.returnFocus?.isConnected) previous.returnFocus.focus({ preventScroll: true });
}
function consumeEntry(next?: () => void) {
  if (returning) { afterReturn = next; return; }
  if (!marked()) { owned = undefined; next?.(); return; }
  returning = true; afterReturn = next;
  history.back();
}
function ensureEntry() {
  if (marked() || returning || !active?.history) return;
  owned = `tm-overlay-${++sequence}`; entryUrl = location.href;
  history.pushState({ ...history.state, [MARKER]: owned }, "", location.href);
}
export function openTransientOverlay(overlay: TransientOverlay): () => void {
  finish("replace");
  active = overlay;
  if (overlay.history) ensureEntry();
  else if (marked()) consumeEntry();
  return () => { if (active === overlay) closeTransientOverlay("dismiss"); };
}
export function closeTransientOverlay(reason: OverlayCloseReason = "replace"): void {
  finish(reason);
  if (reason === "dismiss" || (reason === "context" && marked() && location.href === entryUrl)) consumeEntry();
  else if (reason !== "replace" && reason !== "back") { removeMarker(); owned = undefined; }
}
/** Consume the menu's transient Back stop before adding the actual route. */
export function navigateFromOverlay(navigate: () => void): void {
  finish("navigate"); consumeEntry(navigate);
}
/** Route, namespace, consent and lock state are supplied by the application. */
export function setOverlayContext(key: string): void {
  if (context !== undefined && context !== key) closeTransientOverlay("context");
  context = key;
}
if (typeof window !== "undefined") {
window.addEventListener("popstate", () => {
  if (returning) {
    returning = false; owned = undefined;
    const next = afterReturn; afterReturn = undefined;
    next?.(); ensureEntry(); return;
  }
  if (active && !marked()) { finish("back"); owned = undefined; }
});
window.addEventListener("hashchange", () => { if (active) closeTransientOverlay("context"); });
window.addEventListener("tm:presentation-changed", () => closeTransientOverlay("context"));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !event.defaultPrevented && active) {
    event.preventDefault(); closeTransientOverlay("dismiss");
  }
});

}

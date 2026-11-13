// Floating quick-action head (W5b). A small draggable bubble, inside the app only, OFF by default (presentation setting "floatingHead").
// The actions are the shared list HEAD_ACTIONS in tabActions.ts. The prayer entry embeds the same one-tap, undoable marks as the Deen panel (no counts).
// Safety rule: the head never hides a control. It leaves the bottom tab bar, primary buttons and fields free, hides while the keyboard is open or
// while the page scrolls, and hides itself when no free place exists.
import { h } from "./dom";
import { t } from "../i18n/t";
import type { Key } from "../i18n/packs";
import type { Locale } from "../i18n/registry";
import { getPresentationPreferences } from "./presentationPreferences";
import { closeTransientOverlay, openTransientOverlay } from "./overlayCoordinator";
import { prayerControls } from "./prayerMarksUi";
import { HEAD_ACTIONS, type TabAction } from "./tabActions";
import { helpTrigger } from "./helpUi";
import "./floatingHead.css";

export interface Rect { left: number; top: number; right: number; bottom: number }
export interface Pos { x: number; y: number }
export const HEAD_SIZE = 48;
export const HEAD_GAP = 6;
const POS_KEY = "tm:ui:headPos";
const STEP = 16;

export const overlaps = (a: Rect, b: Rect, gap = HEAD_GAP): boolean => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
const box = (p: Pos, size = HEAD_SIZE): Rect => ({ left: p.x, top: p.y, right: p.x + size, bottom: p.y + size });
/** Keep the whole head inside the area between the top margin and the bottom bar. */
export function clampPos(p: Pos, area: Rect, size = HEAD_SIZE): Pos {
  return { x: Math.min(Math.max(p.x, area.left), Math.max(area.left, area.right - size)), y: Math.min(Math.max(p.y, area.top), Math.max(area.top, area.bottom - size)) };
}
/** Nearest free spot to `want` that touches no obstacle: tries the wanted spot, then both edges moving up and down. Null when none is free. */
export function freeSpot(want: Pos, area: Rect, obstacles: readonly Rect[], size = HEAD_SIZE): Pos | null {
  const free = (p: Pos) => !obstacles.some((o) => overlaps(box(p, size), o));
  const first = clampPos(want, area, size);
  if (free(first)) return first;
  const xs = [first.x, area.right - size, area.left].filter((x, i, a) => a.indexOf(x) === i);
  let best: Pos | null = null, bestD = Infinity;
  for (const x of xs) for (let y = area.top; y <= area.bottom - size; y += 8) {
    const p = { x, y };
    if (!free(p)) continue;
    const d = Math.hypot(p.x - first.x, p.y - first.y);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best;
}
export const toFractions = (p: Pos, area: Rect, size = HEAD_SIZE): { fx: number; fy: number } => ({
  fx: area.right - size - area.left > 0 ? (p.x - area.left) / (area.right - size - area.left) : 1,
  fy: area.bottom - size - area.top > 0 ? (p.y - area.top) / (area.bottom - size - area.top) : 0.6,
});
export const fromFractions = (f: { fx: number; fy: number }, area: Rect, size = HEAD_SIZE): Pos =>
  clampPos({ x: area.left + f.fx * (area.right - size - area.left), y: area.top + f.fy * (area.bottom - size - area.top) }, area, size);
const DEFAULT_FRACTION = { fx: 1, fy: 0.6 };
export function loadFraction(): { fx: number; fy: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(POS_KEY) ?? "null") as { fx?: unknown; fy?: unknown } | null;
    if (raw && typeof raw.fx === "number" && typeof raw.fy === "number" && raw.fx >= 0 && raw.fx <= 1 && raw.fy >= 0 && raw.fy <= 1) return { fx: raw.fx, fy: raw.fy };
  } catch { /* default */ }
  return { ...DEFAULT_FRACTION };
}
function saveFraction(f: { fx: number; fy: number }): void { try { localStorage.setItem(POS_KEY, JSON.stringify(f)); } catch { /* position is a convenience */ } }
export function clearHeadPosition(): void { try { localStorage.removeItem(POS_KEY); } catch { /* nothing to clear */ } }

/** Label of a shared action: the prayer entry reads "Prayer mark" here, the others keep their usual label. */
export const headLabel = (item: TabAction): Key => item.quickPrayer ? "head.prayer" : item.label;

const FIELD = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]),textarea,select,[contenteditable=true]";
const PRIMARY = ".cta,.btn:not(.ghost),button[type=submit],input[type=submit],input,textarea,select";
let teardown: (() => void) | null = null;

export function unmountFloatingHead(): void { teardown?.(); teardown = null; }

/** Called after every screen draw. Builds the head only when the setting is on; always clears the previous one first. */
export function mountFloatingHead(lang: Locale): void {
  unmountFloatingHead();
  if (getPresentationPreferences().floatingHead !== "on") return;
  const cleanups: Array<() => void> = [];
  let fraction = loadFraction(), menuOpen = false, scrolling = false, keyboard = false, noSpace = false;
  const bubble = h("button", { type: "button", class: "floating-head-btn", "data-act": "head-toggle", "aria-haspopup": "menu", "aria-expanded": "false", "aria-controls": "tm-head-menu", "aria-label": `${t("head.label", lang)}. ${t("head.hint", lang)}` });
  bubble.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>';
  const root = h("div", { class: "floating-head", "data-floating-head": "1" }, bubble);
  document.body.append(root);

  const navTop = () => { const nav = document.querySelector(".bottom-tabs"); const r = nav?.getBoundingClientRect(); return r && r.height > 0 ? r.top : window.innerHeight; };
  const area = (): Rect => ({ left: 4, top: 8, right: window.innerWidth - 4, bottom: Math.min(navTop(), window.visualViewport?.height ?? window.innerHeight) - 8 });
  const obstacles = (): Rect[] => {
    const out: Rect[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(PRIMARY)) {
      if (root.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
    return out;
  };
  const apply = (p: Pos | null) => {
    noSpace = p === null;
    if (p) root.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    refreshVisible();
  };
  const refreshVisible = () => { root.hidden = keyboard || noSpace || (scrolling && !menuOpen); root.dataset.state = root.hidden ? (keyboard ? "keyboard" : noSpace ? "nospace" : "scrolling") : "shown"; };
  const wanted = (): Pos => fromFractions(fraction, area());
  const settle = () => {
    if (menuOpen) return;
    const a = area();
    apply(freeSpot(wanted(), a, obstacles()));
  };

  // Menu -----------------------------------------------------------------------------------------------------------------------------
  let menu: HTMLElement | null = null;
  const closeMenu = (reason: "dismiss" | "navigate" = "dismiss") => closeTransientOverlay(reason);
  const items = (): HTMLElement[] => menu ? [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')] : [];
  const openMenu = () => {
    if (menuOpen) { closeMenu(); return; }
    const prayerBox = h("div", { id: "tm-head-prayer", role: "group", "aria-label": t("head.prayer", lang), hidden: true });
    const entries = HEAD_ACTIONS.map((item) => {
      if (item.quickPrayer) {
        const b = h("button", { type: "button", role: "menuitem", class: "shortcut-link", "data-head-action": item.id, "aria-expanded": "false", "aria-controls": "tm-head-prayer" }, t(headLabel(item), lang));
        b.addEventListener("click", () => {
          const open = prayerBox.hidden; prayerBox.hidden = !open; b.setAttribute("aria-expanded", String(open));
          if (open && prayerBox.childElementCount === 0) prayerBox.append(prayerControls(lang, "compact"));
        });
        return b;
      }
      const a = h("a", { href: item.href, role: "menuitem", class: "shortcut-link", "data-head-action": item.id }, item.id === "home" ? t("nav.today", lang) : t(headLabel(item), lang));
      a.addEventListener("click", () => closeMenu("navigate"));
      return a;
    });
    const close = h("button", { type: "button", class: "btn ghost", "data-act": "head-close", onclick: () => closeMenu() }, t("head.close", lang));
    menu = h("section", { id: "tm-head-panel", class: "head-menu", "aria-label": t("head.label", lang), "data-head-menu": "1", "data-side": (wanted().x + HEAD_SIZE / 2 > window.innerWidth / 2) ? "right" : "left" },
      h("div", { class: "head-menu-top" }, h("h2", {}, t("head.label", lang)), helpTrigger("head", lang)),
      h("div", { id: "tm-head-menu", class: "quick-access-grid", role: "menu", "aria-label": t("head.label", lang) }, ...entries), prayerBox, close);
    menu.addEventListener("keydown", (event) => {
      const list = items().filter((el) => !el.closest("[hidden]")), i = list.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); list[(i + 1) % list.length]?.focus(); }
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
      else if (event.key === "Home") { event.preventDefault(); list[0]?.focus(); }
      else if (event.key === "End") { event.preventDefault(); list[list.length - 1]?.focus(); }
    });
    menuOpen = true; bubble.setAttribute("aria-expanded", "true");
    openTransientOverlay({ id: "tm-head-panel", returnFocus: bubble, close: () => { menu?.remove(); menu = null; menuOpen = false; bubble.setAttribute("aria-expanded", "false"); refreshVisible(); } });
    document.body.append(menu);
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  };

  // Drag and keyboard move -------------------------------------------------------------------------------------------------------------
  let drag: { id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null = null;
  const place = (p: Pos) => { const a = area(), c = clampPos(p, a); root.style.transform = `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px)`; fraction = toFractions(c, a); return c; };
  bubble.addEventListener("pointerdown", (event) => {
    const m = /translate\((-?\d+)px, (-?\d+)px\)/.exec(root.style.transform); const cur = m ? { x: Number(m[1]), y: Number(m[2]) } : wanted();
    drag = { id: event.pointerId, sx: event.clientX, sy: event.clientY, ox: cur.x, oy: cur.y, moved: false };
    try { bubble.setPointerCapture?.(event.pointerId); } catch { /* optional */ }
  });
  bubble.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.sx, dy = event.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true; place({ x: drag.ox + dx, y: drag.oy + dy });
  });
  const endDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null;
    if (moved) { saveFraction(fraction); bubble.dataset.justDragged = "1"; setTimeout(() => delete bubble.dataset.justDragged, 0); settle(); }
  };
  bubble.addEventListener("pointerup", endDrag); bubble.addEventListener("pointercancel", endDrag);
  bubble.addEventListener("click", (event) => { if (bubble.dataset.justDragged) { event.preventDefault(); return; } openMenu(); });
  bubble.addEventListener("keydown", (event) => {
    const d: Record<string, Pos> = { ArrowLeft: { x: -STEP, y: 0 }, ArrowRight: { x: STEP, y: 0 }, ArrowUp: { x: 0, y: -STEP }, ArrowDown: { x: 0, y: STEP } };
    const move = d[event.key]; if (!move || menuOpen) return;
    event.preventDefault();
    const m = /translate\((-?\d+)px, (-?\d+)px\)/.exec(root.style.transform); const cur = m ? { x: Number(m[1]), y: Number(m[2]) } : wanted();
    place({ x: cur.x + move.x, y: cur.y + move.y }); saveFraction(fraction);
  });

  // Keyboard, scroll, resize, content changes --------------------------------------------------------------------------------------------
  const isField = (el: Element | null) => !!el && el.matches(FIELD);
  const onFocusIn = (event: FocusEvent) => { if (isField(event.target as Element | null)) { keyboard = true; refreshVisible(); } };
  const onFocusOut = () => setTimeout(() => { keyboard = isField(document.activeElement) || vpShrunk(); refreshVisible(); if (!keyboard) settle(); }, 0);
  const vpShrunk = () => !!window.visualViewport && window.visualViewport.height < window.innerHeight - 120;
  const onViewport = () => { keyboard = vpShrunk() || isField(document.activeElement); refreshVisible(); if (!keyboard) settle(); };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => { clearTimeout(timer); timer = setTimeout(() => { scrolling = false; settle(); refreshVisible(); }, 150); };
  const onScroll = () => { if (menuOpen) return; scrolling = true; refreshVisible(); later(); };
  const onResize = () => { settle(); };
  document.addEventListener("focusin", onFocusIn); document.addEventListener("focusout", onFocusOut);
  window.addEventListener("scroll", onScroll, true); window.addEventListener("resize", onResize); window.visualViewport?.addEventListener("resize", onViewport);
  const watched = document.getElementById("app");
  const observer = watched && typeof MutationObserver !== "undefined" ? new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(settle, 150); }) : null;
  if (watched) observer?.observe(watched, { childList: true, subtree: true });
  const sizer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(settle, 150); }) : null;
  sizer?.observe(document.documentElement);
  const onPrefs = (event: Event) => { if ((event as CustomEvent).detail?.reset) clearHeadPosition(); mountFloatingHead(lang); };
  window.addEventListener("tm:presentation-changed", onPrefs);
  cleanups.push(() => {
    clearTimeout(timer); observer?.disconnect(); sizer?.disconnect();
    document.removeEventListener("focusin", onFocusIn); document.removeEventListener("focusout", onFocusOut);
    window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onResize); window.visualViewport?.removeEventListener("resize", onViewport);
    window.removeEventListener("tm:presentation-changed", onPrefs);
    if (menuOpen) closeTransientOverlay("context");
    root.remove();
  });
  teardown = () => cleanups.forEach((fn) => fn());
  keyboard = isField(document.activeElement);
  settle();
}

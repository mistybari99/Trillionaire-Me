// Lazy screens: heavy, rarely opened screens live in their own chunk and load on first visit (dynamic import).
// Every chunk is still saved by the service worker at install (tools/precache.ts lists dist/), so a screen opened for the first time offline works.
// Tests (and anything else that needs a synchronous render) call `preloadLazy()` once; after that the screen is built in the same tick.
import { h } from "./dom";
import { t } from "../i18n/t";
import { prefs } from "./state";

export interface Lazy<M> { readonly name: string; get(): M | null; load(): Promise<M> }

export function lazyModule<M>(name: string, loader: () => Promise<M>): Lazy<M> {
  let mod: M | null = null; let p: Promise<M> | null = null;
  return { name, get: () => mod, load: () => (p ??= loader().then((m) => (mod = m)).catch((e) => { p = null; throw e; })) };
}

const registry: Lazy<unknown>[] = [];
export const lazy = <M>(name: string, loader: () => Promise<M>): Lazy<M> => { const l = lazyModule(name, loader); registry.push(l as Lazy<unknown>); return l; };
export const preloadLazy = (): Promise<unknown[]> => Promise.all(registry.map((l) => l.load()));

const rerender = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

/** The screen when its chunk is loaded; otherwise a calm "Loading" page, and the screen is drawn as soon as the chunk arrives. */
export function viaLazy<M>(l: Lazy<M>, build: (m: M) => HTMLElement): HTMLElement {
  const m = l.get();
  if (m) return build(m);
  const lang = prefs.lang;
  const box = h("main", { class: "scr", "data-lazy-loading": l.name, "aria-busy": "true" }, h("p", { class: "muted", role: "status" }, t("lazy.loading", lang)));
  l.load().then(() => rerender()).catch(() => { box.replaceChildren(h("p", { class: "muted", role: "status" }, t("lazy.failed", lang))); });
  return box;
}

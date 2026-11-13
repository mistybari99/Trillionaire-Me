/** Reserve the rendered navigation box, including wrapped labels and safe-area padding. */
export function observeNavLayout(nav: HTMLElement): () => void {
  const doc = nav.ownerDocument;
  const view = doc.defaultView;
  const root = doc.documentElement;
  let active = true;
  let banner: HTMLElement | null = null;
  const measure = () => {
    if (!active || !nav.isConnected) return;
    const height = Math.ceil(nav.getBoundingClientRect().height);
    if (height > 0) root.style.setProperty("--nav-height", `${height}px`);
    const bannerHeight = banner?.isConnected ? Math.ceil(banner.getBoundingClientRect().height) : 0;
    root.style.setProperty("--update-clearance", `${bannerHeight > 0 ? bannerHeight + 12 : 0}px`);
  };
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
  observer?.observe(nav);
  const syncBanner = () => {
    if (!active || !nav.isConnected) return;
    const next = doc.getElementById("update-banner");
    if (next !== banner) {
      if (banner) observer?.unobserve(banner);
      banner = next;
      if (banner) observer?.observe(banner);
    }
    measure();
  };
  // The updater appends outside #app and can replace its banner independently of a route render.
  const mutations = new MutationObserver(syncBanner);
  mutations.observe(doc.body, { childList: true });
  view?.addEventListener("resize", measure);
  syncBanner();
  // Font loading can change the number of navigation rows even without a window resize.
  void doc.fonts?.ready.then(measure);
  return () => {
    active = false;
    observer?.disconnect();
    mutations.disconnect();
    view?.removeEventListener("resize", measure);
    root.style.setProperty("--update-clearance", "0px");
  };
}

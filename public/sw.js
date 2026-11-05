// App-shell cache. Same-origin GET only, no third-party calls.
// Install saves the whole app (the list is stamped in at build time by tools/precache.ts), so every screen, font, content pack and
// image works offline after the first visit. While online, saved app files are fetched fresh and the latest copy is kept as well.
// Anything that is NOT in the saved list (a file added later, a copy with a query string) uses stale-while-revalidate: the saved copy
// answers at once and a fresh copy is fetched in the background for next time. Without a saved copy the network answers.
const VERSION = /*PRECACHE_VERSION*/"dev";
const PRECACHE = /*PRECACHE_LIST*/[];
const SHELL = `tm-shell-${VERSION}`;
const RUNTIME = "tm-runtime-v1";
const SAVED = new Set(PRECACHE.map((u) => new URL(u, self.registration.scope).href));
const MATCH = { ignoreVary: true };
const isSaved = (url) => { const u = new URL(url); u.search = ""; u.hash = ""; return SAVED.has(u.href); };
// A new version waits until the person taps "Update now" in the app (message SKIP_WAITING), so nothing changes under a page that is being used.
// The very first install has nothing to interrupt, so it takes over at once.
self.addEventListener("message", (e) => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
// A tap on a reminder notification opens or focuses the app at the item's screen (the route comes in the notification data). Nothing else runs here.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.url) || "#/today";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => "focus" in w);
    if (c) { c.postMessage({ type: "OPEN_ROUTE", hash }); return c.focus(); }
    return self.clients.openWindow(new URL("./" + hash, self.registration.scope).href);
  }));
});
self.addEventListener("install", (e) => {
  if (!self.registration.active) self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(async (c) => {
    const results = await Promise.allSettled(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" }))));
    // A rejected install never activates, so the complete previous shell stays usable.
    if (results.some((r) => r.status === "rejected")) throw new Error("Required offline files could not be saved");
  }));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Audio is played with Range requests. Online: let the browser talk to the network. Offline: answer the range from the saved copy.
  if (req.headers.has("range")) { e.respondWith(rangeFromCache(req).then((r) => r || fetch(req))); return; }
  if (!isSaved(req.url)) { e.respondWith(staleWhileRevalidate(e, req)); return; }
  // Hashed files under /assets/ never change under the same name: the saved copy answers first (works the same on every browser version,
  // does not wait for the network to fail), the network is only the fallback. Other saved files (the page, icons) stay fresh-first.
  if (new URL(req.url).pathname.includes("/assets/")) { e.respondWith(caches.match(req, MATCH).then((m) => m || fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(RUNTIME).then((x) => x.put(req, c)); } return res; }))); return; }
  e.respondWith(
    fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(RUNTIME).then((x) => x.put(req, c)); } return res; })
      .catch(() => caches.match(req, MATCH).then((m) => m || caches.match(req, { ignoreSearch: true, ignoreVary: true })).then((m) => m || caches.match("./", MATCH)))
  );
});

// Offline range answer for saved audio. Returns null when there is no saved copy (the network is then tried).
async function rangeFromCache(req) {
  if (self.navigator && self.navigator.onLine !== false) return null;
  const m = await caches.match(req.url, { ignoreSearch: true });
  if (!m) return null;
  const buf = await m.arrayBuffer();
  const mt = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  const start = mt && mt[1] ? Number(mt[1]) : 0;
  const end = mt && mt[2] ? Math.min(Number(mt[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { "Content-Type": m.headers.get("Content-Type") || "audio/mpeg", "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`, "Content-Length": String(end - start + 1) } });
}

// Not-saved content: answer from the runtime copy at once, refresh it in the background, never block on the network when a copy exists.
function staleWhileRevalidate(e, req) {
  const refresh = fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(RUNTIME).then((x) => x.put(req, c)); } return res; });
  e.waitUntil(refresh.catch(() => undefined));
  return caches.match(req, MATCH).then((hit) => hit || refresh.catch(() => caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((m) => m || caches.match("./", MATCH))));
}

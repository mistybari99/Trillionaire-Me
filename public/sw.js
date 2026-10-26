// App-shell cache. Same-origin GET only, no third-party calls.
// Install saves the whole app (the list is stamped in at build time by tools/precache.ts), so every screen, font, content pack and
// image works offline after the first visit. While online, pages are fetched fresh and the latest copy is kept as well.
const VERSION = /*PRECACHE_VERSION*/"dev";
const PRECACHE = /*PRECACHE_LIST*/[];
const SHELL = `tm-shell-${VERSION}`;
const RUNTIME = "tm-runtime-v1";
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" }))))));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(RUNTIME).then((x) => x.put(req, c)); } return res; })
      .catch(() => caches.match(req).then((m) => m || caches.match(req, { ignoreSearch: true })).then((m) => m || caches.match("./")))
  );
});

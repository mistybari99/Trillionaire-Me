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
  // Audio is played with Range requests. Online: let the browser talk to the network. Offline: answer the range from the saved copy.
  if (req.headers.has("range")) { e.respondWith(rangeFromCache(req).then((r) => r || fetch(req))); return; }
  e.respondWith(
    fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(RUNTIME).then((x) => x.put(req, c)); } return res; })
      .catch(() => caches.match(req).then((m) => m || caches.match(req, { ignoreSearch: true })).then((m) => m || caches.match("./")))
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

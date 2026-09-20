/* Learn2Lead PWA service worker — offline shell.

   Strategy: network-first for documents and modules, cache-first only for
   immutable hashed build assets (/assets/*).

   This matters: the previous cache-first implementation always answered from
   the cache, so a browser that had visited once kept running the OLD bundle
   forever. Any newly added route therefore looked blank (React Router had no
   match to render) until the user manually cleared site data.
   The cache is now strictly an offline fallback. */

const CACHE = "l2l-shell-v2";
const OFFLINE_FALLBACK = "/";

self.addEventListener("install", () => {
  // Take over as soon as possible so the fix reaches existing clients.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Hashed build output never changes under a given URL, so it is cache-safe. */
function isImmutableAsset(url) {
  return url.pathname.startsWith("/assets/");
}

/** Vite dev-server modules must never be cached — they change constantly. */
function isDevModule(url) {
  return url.pathname.startsWith("/src/") || url.pathname.startsWith("/@");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache backend calls, and never let the worker cache itself.
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/sw.js") return;

  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Documents, source modules and everything else: always try the network
  // first so deploys and code changes are picked up on the next load.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === "basic" && !isDevModule(url)) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
        if (cached) return cached;
        if (req.mode === "navigate") {
          const shell = await cache.match(OFFLINE_FALLBACK, { ignoreSearch: true });
          if (shell) return shell;
        }
        return Response.error();
      }
    }),
  );
});

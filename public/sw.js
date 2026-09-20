/* Service worker minimal : installation PWA + page hors ligne de secours.
   Les données viennent toujours du réseau (pas de cache des pages dynamiques). */
const CACHE = "depenses-enfants-v1";
const PRECACHE = ["/hors-ligne.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations : réseau d'abord, page hors ligne en secours.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/hors-ligne.html")));
    return;
  }

  // Ressources statiques Next.js : cache d'abord (elles sont immuables).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copie = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copie));
            return res;
          }),
      ),
    );
  }
});

// ═══════════════════════════════════════════════════════════════
//  Bolivia Tax Monitor — Service Worker (PWA / offline)
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = "bo-tax-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap",
];

// Install : mise en cache des assets statiques
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate : suppression des anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour les assets, network-first pour l'API
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les appels au Worker Cloudflare
  if (url.hostname.endsWith("workers.dev")) {
    return; // Passe directement au réseau
  }

  // Cache-first pour tous les autres assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Ne mettre en cache que les réponses valides
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => cached || new Response("Hors ligne", { status: 503 }));
    })
  );
});

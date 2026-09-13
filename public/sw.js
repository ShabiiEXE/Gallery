const CACHE_VERSION = "gallery-v62-2026-09-13";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/version.json",
  "/css/styles.css",
  "/js/app.js",
  "/js/auth.js",
  "/js/constants.js",
  "/js/custom-select.js",
  "/js/detail.js",
  "/js/form.js",
  "/js/gallery.js",
  "/js/i18n.js",
  "/js/icons.js",
  "/js/photo-assets.js",
  "/js/scryfall.js",
  "/js/set-icons.js",
  "/js/state.js",
  "/assets/icon-v58.png",
  "/assets/app-icon-v58.png",
  "/assets/backdrop.png",
  "/assets/backdrop_light.png",
  "/assets/glow.svg",
  "/assets/fonts/CascadiaCode.woff2",
  "/assets/flags/de.svg",
  "/assets/flags/es.svg",
  "/assets/flags/fr.svg",
  "/assets/flags/it.svg",
  "/assets/flags/jp.svg",
  "/assets/flags/us.svg",
  "/assets/mot.png",
  "/assets/moxfield.png",
  "/assets/pimp-my-deck.png",
  "/assets/scryfall-favicon.ico",
  "/assets/shabii_logo.png",
];

const RUNTIME_HOSTS = new Set([
  "api.scryfall.com",
  "assets.moxfield.net",
  "cards.scryfall.io",
  "svgs.scryfall.io",
  "www.google.com",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith("gallery-") && !name.startsWith(CACHE_VERSION))
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS") return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(cacheUrls(urls));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, CORE_CACHE, "/index.html"));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, isCoreUrl(url.pathname) ? CORE_CACHE : RUNTIME_CACHE));
    return;
  }

  if (RUNTIME_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  const unique = [...new Set(urls.map((url) => String(url || "").trim()).filter(Boolean))];
  await Promise.allSettled(unique.map(async (url) => {
    const absoluteUrl = new URL(url, self.location.origin).href;
    const request = new Request(absoluteUrl, { mode: isSameOrigin(absoluteUrl) ? "same-origin" : "no-cors" });
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") await cache.put(request, response);
  }));
}

async function networkFirst(request, cacheName, fallbackUrl = "") {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : undefined) || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || update;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
  return response;
}

function isCoreUrl(pathname) {
  return CORE_URLS.includes(pathname);
}

function isSameOrigin(value) {
  try {
    return new URL(value, self.location.origin).origin === self.location.origin;
  } catch {
    return false;
  }
}

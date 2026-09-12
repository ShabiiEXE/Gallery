import * as auth from "./functions/api/auth.js";
import * as cards from "./functions/api/cards.js";
import * as moxfieldDeck from "./functions/api/moxfield-deck.js";
import * as settings from "./functions/api/settings.js";

const routes = {
  "/api/auth": auth,
  "/api/cards": cards,
  "/api/moxfield-deck": moxfieldDeck,
  "/api/settings": settings,
};

const CACHEABLE_ASSET = /^\/assets\/.+\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2)$/i;
const CARD_ASSET = /^\/assets\/cards\/.+\.(?:avif|gif|jpe?g|png|webp)$/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const module = routes[url.pathname];
    if (module) {
      const method = request.method.toLowerCase();
      const handler = module[`onRequest${method[0].toUpperCase()}${method.slice(1)}`];
      if (!handler) return json({ error: "Method not allowed" }, 405);
      return handler({ request, env, ctx });
    }
    if ((request.method === "GET" || request.method === "HEAD") && CACHEABLE_ASSET.test(url.pathname)) {
      return cachedAsset(request, env, ctx, url.pathname);
    }
    return env.ASSETS.fetch(request);
  },
};

async function cachedAsset(request, env, ctx, pathname) {
  if (request.method === "HEAD") {
    return withCacheHeaders(await env.ASSETS.fetch(request), pathname);
  }

  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheHeaders(cached, pathname);

  const response = await env.ASSETS.fetch(request);
  const cacheable = response.ok;
  const next = withCacheHeaders(response, pathname);
  if (cacheable) ctx.waitUntil(cache.put(cacheKey, next.clone()));
  return next;
}

function withCacheHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  const isCardAsset = CARD_ASSET.test(pathname);
  headers.set("Cache-Control", isCardAsset
    ? "public, max-age=604800, stale-while-revalidate=86400"
    : "public, max-age=86400, stale-while-revalidate=604800");
  headers.set("CDN-Cache-Control", "public, max-age=31536000");
  headers.set("Vary", "Accept-Encoding");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

import * as auth from "./functions/api/auth.js";
import * as cards from "./functions/api/cards.js";
import * as moxfieldDeck from "./functions/api/moxfield-deck.js";

const routes = {
  "/api/auth": auth,
  "/api/cards": cards,
  "/api/moxfield-deck": moxfieldDeck,
};

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
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

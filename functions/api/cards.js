import { isEditorRequest } from "./editor-auth.js";

const KEY = "cards";

export async function onRequestGet({ env }) {
  const cards = await readCards(env);
  return json({ cards });
}

export async function onRequestPut({ request, env }) {
  const ok = await isEditorRequest(request, env);
  if (!ok) return json({ ok: false, error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const cards = Array.isArray(body.cards) ? body.cards : [];
  await writeCards(env, cards);
  return json({ ok: true, cards });
}

async function readCards(env) {
  if (!env.MAGIC_GALLERY) return [];
  const stored = await env.MAGIC_GALLERY.get(KEY, "json");
  return Array.isArray(stored) ? stored : [];
}

async function writeCards(env, cards) {
  if (!env.MAGIC_GALLERY) throw new Error("MAGIC_GALLERY KV namespace is not bound");
  await env.MAGIC_GALLERY.put(KEY, JSON.stringify(cards));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

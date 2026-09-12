import { isEditorRequest } from "./editor-auth.js";

const KEY = "settings";

export async function onRequestGet({ env }) {
  const settings = await readSettings(env);
  return json({ settings });
}

export async function onRequestPut({ request, env }) {
  const ok = await isEditorRequest(request, env);
  if (!ok) return json({ ok: false, error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
  try {
    await writeSettings(env, settings);
    return json({ ok: true, settings });
  } catch (error) {
    return json({ ok: false, error: cloudflareSaveError(error) }, 503);
  }
}

async function readSettings(env) {
  if (!env.MAGIC_GALLERY) return {};
  const stored = await env.MAGIC_GALLERY.get(KEY, "json");
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

async function writeSettings(env, settings) {
  if (!env.MAGIC_GALLERY) throw new Error("MAGIC_GALLERY KV namespace is not bound");
  await env.MAGIC_GALLERY.put(KEY, JSON.stringify(settings));
}

function cloudflareSaveError(error) {
  const message = String(error?.message || error || "");
  if (message.includes("KV namespace is not bound")) {
    return "MAGIC_GALLERY KV namespace is not bound in Cloudflare.";
  }
  return message || "Cloudflare save unavailable";
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

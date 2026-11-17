// AI provider settings. The API key is encrypted (AES-GCM) and never sent back to the browser.
import { json, err, readJson } from "../_lib/http.js";
import { encrypt, decrypt } from "../_lib/crypto.js";

export const PROVIDERS = ["openai", "anthropic", "gemini", "groq", "openrouter"];

export async function loadSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

export async function aiConfig(env) {
  const s = await loadSettings(env);
  let key = "";
  if (s.ai_key_enc) {
    try { key = await decrypt(env, s.ai_key_enc); } catch { key = ""; }
  }
  return { provider: s.ai_provider || "openai", model: s.ai_model || "", key };
}

const put = (env, k, v) => env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, v);

export async function onRequestGet({ env }) {
  const s = await loadSettings(env);
  let masked = "";
  if (s.ai_key_enc) {
    try { masked = "…" + (await decrypt(env, s.ai_key_enc)).slice(-4); } catch { masked = "(cannot decrypt — re-enter key)"; }
  }
  return json({ ai_provider: s.ai_provider || "openai", ai_model: s.ai_model || "", ai_key_masked: masked, last_backup_at: s.last_backup_at || null, mock: env.AI_MOCK === "1" });
}

export async function onRequestPut({ request, env }) {
  const b = await readJson(request);
  const ops = [];
  if (b.ai_provider !== undefined) {
    if (!PROVIDERS.includes(b.ai_provider)) return err(400, "Unknown AI provider");
    ops.push(put(env, "ai_provider", b.ai_provider));
  }
  if (b.ai_model !== undefined) ops.push(put(env, "ai_model", String(b.ai_model).trim().slice(0, 100)));
  if (b.ai_key !== undefined) {
    const k = String(b.ai_key).trim();
    ops.push(k ? put(env, "ai_key_enc", await encrypt(env, k)) : env.DB.prepare("DELETE FROM settings WHERE key = 'ai_key_enc'"));
  }
  if (ops.length) await env.DB.batch(ops);
  return json({ ok: true });
}

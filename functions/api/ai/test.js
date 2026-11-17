// POST {} → checks the saved provider/key with a tiny prompt.
import { json, err } from "../../_lib/http.js";
import { callAI, AIError, DEFAULT_MODELS } from "../../_lib/ai.js";
import { aiConfig } from "../settings.js";

export async function onRequestPost({ env }) {
  const cfg = await aiConfig(env);
  try {
    const r = await callAI(env, { ...cfg, system: "Reply with the single word OK.", user: "Say OK", task: "free", input: {} });
    return json({ ok: true, provider: cfg.provider, model: cfg.model || DEFAULT_MODELS[cfg.provider], reply: r.text.slice(0, 60), mock: !!r.mock });
  } catch (e) {
    if (e instanceof AIError) return err(e.status, e.message);
    throw e;
  }
}

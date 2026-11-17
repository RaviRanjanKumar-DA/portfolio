import { json, err, readJson, now } from "../../_lib/http.js";

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare("SELECT json, updated_at FROM cv_master WHERE id = 1").first();
  return json(row ? { json: JSON.parse(row.json), updated_at: row.updated_at } : { json: null });
}

export async function onRequestPut({ request, env }) {
  const { json: cv } = await readJson(request);
  if (!cv || typeof cv !== "object" || !Array.isArray(cv.experience)) return err(400, "Invalid CV");
  const s = JSON.stringify(cv);
  if (s.length > 200000) return err(400, "CV too large");
  await env.DB.prepare("INSERT INTO cv_master (id, json, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at").bind(s, now()).run();
  return json({ ok: true });
}

import { json, err, readJson } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  const row = await env.DB.prepare("SELECT json FROM profile WHERE id = 1").first();
  return json(row ? JSON.parse(row.json) : {});
}

export async function onRequestPut({ request, env }) {
  const b = await readJson(request);
  if (typeof b !== "object" || Array.isArray(b)) return err(400, "Invalid profile");
  const s = JSON.stringify(b);
  if (s.length > 100000) return err(400, "Profile too large");
  await env.DB.prepare("INSERT INTO profile (id, json) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json").bind(s).run();
  return json({ ok: true });
}

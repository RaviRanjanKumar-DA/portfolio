// AI outputs / drafts saved against an application (cover letters, messages, emails).
import { json, err, readJson, now, clean, addEvent } from "../../../_lib/http.js";

export async function onRequestGet({ env, params }) {
  const { results } = await env.DB.prepare("SELECT * FROM documents WHERE application_id = ? ORDER BY created_at DESC").bind(params.id).all();
  return json(results);
}

export async function onRequestPost({ request, env, params }) {
  const app = await env.DB.prepare("SELECT id FROM applications WHERE id = ?").bind(params.id).first();
  if (!app) return err(404, "Not found");
  const { kind, content } = await readJson(request);
  if (!clean(kind, 50) || !clean(content)) return err(400, "kind and content are required");
  await env.DB.prepare("INSERT INTO documents (application_id, kind, content, created_at) VALUES (?,?,?,?)").bind(params.id, clean(kind, 50), clean(content, 50000), now()).run();
  await addEvent(env, Number(params.id), "ai_generated", { detail: `Saved ${kind.replace(/_/g, " ")}` });
  return json({ ok: true }, 201);
}

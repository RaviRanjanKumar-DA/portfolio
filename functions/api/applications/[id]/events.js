import { json, err, readJson, addEvent, EVENT_TYPES, clean } from "../../../_lib/http.js";

export async function onRequestGet({ env, params }) {
  const { results } = await env.DB.prepare("SELECT * FROM events WHERE application_id = ? ORDER BY created_at, id").bind(params.id).all();
  return json(results);
}

export async function onRequestPost({ request, env, params }) {
  const app = await env.DB.prepare("SELECT id FROM applications WHERE id = ?").bind(params.id).first();
  if (!app) return err(404, "Not found");
  const { type, detail } = await readJson(request);
  if (!EVENT_TYPES.includes(type)) return err(400, "Invalid event type");
  if (type === "note" && !clean(detail)) return err(400, "Note is empty");
  await addEvent(env, Number(params.id), type, { detail });
  return json({ ok: true }, 201);
}

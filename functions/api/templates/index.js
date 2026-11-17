import { json, err, readJson, now, clean, TEMPLATE_KINDS } from "../../_lib/http.js";

export function validateTemplate(b, partial = false) {
  if (!partial || "name" in b) if (!clean(b.name, 200)) return "Name is required";
  if (!partial || "body" in b) if (!clean(b.body)) return "Body is required";
  if ((!partial || "kind" in b) && !TEMPLATE_KINDS.includes(b.kind)) return "Invalid template kind";
  return null;
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM templates ORDER BY kind, name").all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  const bad = validateTemplate(b);
  if (bad) return err(400, bad);
  const r = await env.DB.prepare("INSERT INTO templates (name, kind, subject, body, updated_at) VALUES (?,?,?,?,?)")
    .bind(clean(b.name, 200), b.kind, clean(b.subject, 500), clean(b.body), now()).run();
  return json({ id: r.meta.last_row_id }, 201);
}

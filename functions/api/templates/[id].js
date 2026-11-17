import { json, err, readJson, now, clean } from "../../_lib/http.js";
import { validateTemplate } from "./index.js";

export async function onRequestPut({ request, env, params }) {
  const cur = await env.DB.prepare("SELECT * FROM templates WHERE id = ?").bind(params.id).first();
  if (!cur) return err(404, "Not found");
  const b = await readJson(request);
  const bad = validateTemplate(b, true);
  if (bad) return err(400, bad);
  const m = { ...cur, ...b };
  await env.DB.prepare("UPDATE templates SET name = ?, kind = ?, subject = ?, body = ?, updated_at = ? WHERE id = ?")
    .bind(clean(m.name, 200), m.kind, clean(m.subject, 500), clean(m.body), now(), params.id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM templates WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}

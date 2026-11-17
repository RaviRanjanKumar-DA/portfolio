import { json, err } from "../../../_lib/http.js";

export async function onRequestGet({ env, params }) {
  const v = await env.DB.prepare("SELECT * FROM cv_versions WHERE id = ?").bind(params.id).first();
  return v ? json({ ...v, json: JSON.parse(v.json) }) : err(404, "Not found");
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM cv_versions WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}

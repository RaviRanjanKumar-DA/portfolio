import { json, err, readJson, now, clean, addEvent } from "../../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  const appId = new URL(request.url).searchParams.get("application_id");
  const sql = `SELECT v.id, v.application_id, v.label, v.template, v.created_at, a.company, a.role
               FROM cv_versions v LEFT JOIN applications a ON a.id = v.application_id ${appId ? "WHERE v.application_id = ?" : ""} ORDER BY v.created_at DESC`;
  const st = env.DB.prepare(sql);
  const { results } = await (appId ? st.bind(appId) : st).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!clean(b.label, 200) || !b.json || typeof b.json !== "object") return err(400, "label and json are required");
  const appId = b.application_id ? Number(b.application_id) : null;
  const r = await env.DB.prepare("INSERT INTO cv_versions (application_id, label, template, json, created_at) VALUES (?,?,?,?,?)")
    .bind(appId, clean(b.label, 200), ["classic", "modern"].includes(b.template) ? b.template : "classic", JSON.stringify(b.json), now()).run();
  if (appId) await addEvent(env, appId, "cv_tailored", { detail: `CV version "${clean(b.label, 200)}" saved` });
  return json({ id: r.meta.last_row_id }, 201);
}

import { json, err, readJson, now, addEvent } from "../../_lib/http.js";
import { FIELDS, validate, fieldValue } from "./index.js";

const get = (env, id) => env.DB.prepare("SELECT * FROM applications WHERE id = ?").bind(id).first();

export async function onRequestGet({ env, params }) {
  const a = await get(env, params.id);
  return a ? json(a) : err(404, "Not found");
}

export async function onRequestPut({ request, env, params }) {
  const cur = await get(env, params.id);
  if (!cur) return err(404, "Not found");
  const b = await readJson(request);
  const bad = validate(b, true);
  if (bad) return err(400, bad);

  const statusChanged = b.status !== undefined && b.status !== cur.status;
  if (statusChanged && b.status !== "saved" && !cur.applied_at && b.applied_at === undefined) b.applied_at = now();
  const cols = FIELDS.filter((k) => b[k] !== undefined);
  if (cols.length) {
    await env.DB.prepare(`UPDATE applications SET ${cols.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...cols.map((k) => fieldValue(k, b[k])), now(), params.id).run();
  }
  if (statusChanged) {
    await addEvent(env, Number(params.id), "status_change", { from: cur.status, to: b.status, detail: b.status_note || null });
  }
  if (b.follow_up_at !== undefined && b.follow_up_at !== cur.follow_up_at && b.follow_up_at) {
    await addEvent(env, Number(params.id), "follow_up", { detail: `Follow-up set for ${b.follow_up_at.slice(0, 10)}` });
  }
  return json(await get(env, params.id));
}

export async function onRequestDelete({ env, params }) {
  if (!(await get(env, params.id))) return err(404, "Not found");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM events WHERE application_id = ?").bind(params.id),
    env.DB.prepare("DELETE FROM documents WHERE application_id = ?").bind(params.id),
    env.DB.prepare("UPDATE cv_versions SET application_id = NULL WHERE application_id = ?").bind(params.id),
    env.DB.prepare("DELETE FROM applications WHERE id = ?").bind(params.id)
  ]);
  return json({ ok: true });
}

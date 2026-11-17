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
    const t = now();
    // optimistic lock: the update only applies if nobody changed the status since we read it,
    // and the history row is written in the same transaction only when the update applied
    const upd = env.DB.prepare(`UPDATE applications SET ${cols.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ? AND status = ?`)
      .bind(...cols.map((k) => fieldValue(k, b[k])), t, params.id, cur.status);
    const ops = [upd];
    if (statusChanged) {
      ops.push(env.DB.prepare("INSERT INTO events (application_id, type, from_status, to_status, detail, created_at) SELECT ?, 'status_change', ?, ?, ?, ? WHERE changes() > 0")
        .bind(Number(params.id), cur.status, b.status, b.status_note || null, t));
    }
    const res = await env.DB.batch(ops);
    if (!res[0].meta.changes) {
      const still = await get(env, params.id);
      return still ? err(409, "This application was changed in the meantime — reload and try again") : err(404, "Not found");
    }
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

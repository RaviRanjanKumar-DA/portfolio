import { json, err, readJson, now, clean, addEvent, STATUSES, PLATFORMS } from "../../_lib/http.js";

export const FIELDS = ["company", "role", "platform", "job_url", "jd_text", "location", "work_mode", "salary", "contact_name", "contact_email", "status", "applied_at", "follow_up_at", "match_score", "notes", "tags"];

export function validate(b, partial = false) {
  if (!partial || "company" in b) if (!clean(b.company, 200)) return "Company is required";
  if (!partial || "role" in b) if (!clean(b.role, 200)) return "Role is required";
  if (b.status !== undefined && !STATUSES.includes(b.status)) return "Invalid status";
  if (b.platform !== undefined && b.platform !== null && !PLATFORMS.includes(b.platform)) return "Invalid platform";
  if (b.match_score !== undefined && b.match_score !== null && b.match_score !== "" && !(Number(b.match_score) >= 0 && Number(b.match_score) <= 100)) return "Match score must be 0–100";
  return null;
}

export const fieldValue = (k, v) => (k === "match_score" ? (v === "" || v === null || v === undefined ? null : Math.round(Number(v))) : clean(v, k === "jd_text" || k === "notes" ? 50000 : 2000));

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url).searchParams;
  const where = [], args = [];
  if (u.get("status")) { where.push("status = ?"); args.push(u.get("status")); }
  if (u.get("platform")) { where.push("platform = ?"); args.push(u.get("platform")); }
  if (u.get("from")) { where.push("COALESCE(applied_at, created_at) >= ?"); args.push(u.get("from")); }
  if (u.get("to")) { where.push("COALESCE(applied_at, created_at) < ?"); args.push(u.get("to")); }
  if (u.get("q")) {
    where.push("(company LIKE ? OR role LIKE ? OR notes LIKE ? OR tags LIKE ? OR location LIKE ?)");
    const q = `%${u.get("q")}%`;
    args.push(q, q, q, q, q);
  }
  const sql = `SELECT id, company, role, platform, job_url, location, work_mode, salary, contact_name, contact_email, status, applied_at, follow_up_at, match_score, tags, created_at, updated_at
               FROM applications ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY COALESCE(applied_at, created_at) DESC, id DESC`;
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  b.status = b.status || "saved";
  b.platform = b.platform || "Other";
  const bad = validate(b);
  if (bad) return err(400, bad);
  const t = now();
  if (b.status !== "saved" && !b.applied_at) b.applied_at = t;
  const cols = FIELDS.filter((k) => b[k] !== undefined);
  const r = await env.DB.prepare(`INSERT INTO applications (${cols.join(",")}, created_at, updated_at) VALUES (${cols.map(() => "?").join(",")}, ?, ?)`)
    .bind(...cols.map((k) => fieldValue(k, b[k])), t, t).run();
  const id = r.meta.last_row_id;
  await addEvent(env, id, "created", { to: b.status, detail: `${b.platform} · ${b.status}` });
  if (b.status !== "saved") await addEvent(env, id, "applied", { to: b.status, detail: `Applied via ${b.platform}` });
  return json({ id }, 201);
}

// Full JSON backup / restore. Sessions, login attempts and secret settings are never exported or overwritten.
import { json, err, readJson, now } from "../_lib/http.js";

const TABLES = ["applications", "events", "templates", "documents", "profile", "cv_master", "cv_versions", "messages", "settings"];
const SECRET_KEYS = ["admin_pass_hash", "ai_key_enc"];

export async function onRequestGet({ env }) {
  const res = await env.DB.batch(TABLES.map((t) => env.DB.prepare(`SELECT * FROM ${t}`)));
  const tables = Object.fromEntries(TABLES.map((t, i) => [t, res[i].results]));
  tables.settings = tables.settings.filter((r) => !SECRET_KEYS.includes(r.key));
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('last_backup_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(now()).run();
  return json({ app: "rrk-portfolio-admin", version: 1, exported_at: now(), tables });
}

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (b?.app !== "rrk-portfolio-admin" || !b.tables) return err(400, "This is not a portfolio-admin backup file");
  // only columns that exist in the schema are imported
  const cols = {};
  for (const t of TABLES) {
    const { results } = await env.DB.prepare(`PRAGMA table_info(${t})`).all();
    cols[t] = results.map((r) => r.name);
  }
  const ops = [];
  // delete children first, insert parents first
  for (const t of ["events", "documents", "cv_versions", "applications", "templates", "profile", "cv_master", "messages"]) ops.push(env.DB.prepare(`DELETE FROM ${t}`));
  ops.push(env.DB.prepare(`DELETE FROM settings WHERE key NOT IN (${SECRET_KEYS.map(() => "?").join(",")})`).bind(...SECRET_KEYS));
  for (const t of ["applications", "templates", "profile", "cv_master", "messages", "events", "documents", "cv_versions", "settings"]) {
    for (const row of b.tables[t] || []) {
      if (t === "settings" && SECRET_KEYS.includes(row.key)) continue;
      const keys = Object.keys(row).filter((k) => cols[t].includes(k));
      if (!keys.length) continue;
      ops.push(env.DB.prepare(`INSERT INTO ${t} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).bind(...keys.map((k) => row[k])));
    }
  }
  await env.DB.batch(ops); // D1 batch runs as a single transaction
  return json({ ok: true, statements: ops.length });
}

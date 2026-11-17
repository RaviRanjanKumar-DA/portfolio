// Change the admin password. The new hash is stored in D1 and overrides the ADMIN_PASS_HASH secret.
import { verifyPassword, hashPassword, currentHash } from "../../_lib/auth.js";
import { json, err, readJson } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  const { current = "", next = "" } = await readJson(request);
  if (!(await verifyPassword(String(current), await currentHash(env)))) return err(400, "Current password is wrong");
  if (String(next).length < 8) return err(400, "New password must be at least 8 characters");
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('admin_pass_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(await hashPassword(String(next))).run();
  return json({ ok: true });
}

import { verifyPassword, createSession, sessionCookie, registerAttempt, clearFailures, currentHash } from "../../_lib/auth.js";
import { json, err, readJson } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const t = await registerAttempt(env, ip);
  if (t.locked) return json({ error: `Too many attempts. Try again in ${Math.ceil(t.retryAfter / 60)} min.` }, 429, { "Retry-After": String(t.retryAfter) });

  const { username = "", password = "" } = await readJson(request);
  const hash = await currentHash(env);
  if (!env.ADMIN_USER || !hash) return err(500, "Admin login is not configured (ADMIN_USER / ADMIN_PASS_HASH)");

  const ok = username.trim().toLowerCase() === env.ADMIN_USER.toLowerCase() && (await verifyPassword(String(password), hash));
  if (!ok) return err(401, "Wrong email or password"); // the attempt row stays as a failure
  await clearFailures(env, ip);
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(new Date().toISOString()).run();
  const token = await createSession(env, env.ADMIN_USER);
  return json({ ok: true, user: env.ADMIN_USER }, 200, { "Set-Cookie": sessionCookie(token, request) });
}

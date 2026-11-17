// Guards every /api/* route: a valid session is required except for login and the public contact form.
import { getSession } from "../_lib/auth.js";
import { err } from "../_lib/http.js";

const PUBLIC = new Set(["/api/auth/login", "/api/contact"]);

export async function onRequest(ctx) {
  const { request, env, next, data } = ctx;
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  try {
    if (!env.DB) return err(500, "Database binding DB is missing");
    if (!PUBLIC.has(path)) {
      const s = await getSession(env, request);
      if (!s) return err(401, "unauthorized");
      data.user = s.user;
      // simple CSRF defence for cookie auth: writes must come from this origin
      if (request.method !== "GET") {
        const origin = request.headers.get("Origin");
        if (origin && origin !== new URL(request.url).origin) return err(403, "bad origin");
      }
    }
    return await next();
  } catch (e) {
    console.error("API error", path, e);
    return err(500, "Server error: " + (e?.message || "unknown"));
  }
}

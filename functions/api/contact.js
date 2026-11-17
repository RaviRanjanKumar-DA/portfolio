// Public: the portfolio contact form also stores a copy here so it shows up in the admin Inbox.
import { json, err, readJson, now, clean } from "../_lib/http.js";

export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (b.botcheck) return err(400, "Rejected");
  const name = clean(b.name, 120), email = clean(b.email, 200), message = clean(b.message, 5000);
  if (!name || !message || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(400, "Name, a valid email and a message are required");
  // light flood control: max 20 messages per hour overall
  const since = new Date(Date.now() - 3600e3).toISOString();
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE created_at > ?").bind(since).first();
  if (n.n >= 20) return err(429, "Too many messages, try later");
  await env.DB.prepare("INSERT INTO messages (name, email, phone, organization, message, created_at) VALUES (?,?,?,?,?,?)")
    .bind(name, email, clean(b.phone, 40), clean(b.organization, 200), message, now()).run();
  return json({ ok: true }, 201);
}

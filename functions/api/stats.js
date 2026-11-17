// Raw data for the dashboard; aggregation runs in the browser (admin/lib/stats.js) so it is shared and tested.
import { json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  const [apps, events] = await env.DB.batch([
    env.DB.prepare("SELECT id, company, role, platform, status, applied_at, follow_up_at, created_at, match_score FROM applications"),
    env.DB.prepare("SELECT e.id, e.application_id, e.type, e.from_status, e.to_status, e.detail, e.created_at, a.company, a.role FROM events e LEFT JOIN applications a ON a.id = e.application_id ORDER BY e.created_at DESC")
  ]);
  return json({ apps: apps.results, events: events.results });
}

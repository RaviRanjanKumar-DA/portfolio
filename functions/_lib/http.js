export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });

export const err = (status, error) => json({ error }, status);

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export const now = () => new Date().toISOString();

export const STATUSES = ["saved", "applied", "shortlisted", "interview", "offer", "joined", "rejected", "withdrawn", "no_response"];
export const PLATFORMS = ["Email", "Naukri", "LinkedIn", "Indeed", "Instahyre", "Foundit", "Company site", "Referral", "Other"];
export const TEMPLATE_KINDS = ["email", "linkedin_note", "linkedin_inmail", "naukri_message", "follow_up", "thank_you", "cover_letter", "other"];
export const EVENT_TYPES = ["note", "email_opened", "message_copied", "follow_up", "applied", "ai_generated", "interview_scheduled"];

// trim strings and cap length so one field can never blow up the DB
export const clean = (v, max = 20000) => (v === undefined || v === null ? null : String(v).trim().slice(0, max) || null);

export async function addEvent(env, appId, type, { from = null, to = null, detail = null } = {}) {
  await env.DB.prepare("INSERT INTO events (application_id, type, from_status, to_status, detail, created_at) VALUES (?,?,?,?,?,?)")
    .bind(appId, type, from, to, clean(detail, 2000), now()).run();
}

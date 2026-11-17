// {{variable}} templates. Unknown variables are left in place so they are easy to spot.
const RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function fillTemplate(body, vars = {}) {
  return String(body ?? "").replace(RE, (m, k) => (vars[k] !== undefined && vars[k] !== null && vars[k] !== "" ? String(vars[k]) : m));
}

export function templateVars(body) {
  return [...new Set([...String(body ?? "").matchAll(RE)].map((m) => m[1]))];
}

// Standard variables built from the profile + an application.
export function standardVars(profile = {}, app = {}) {
  return {
    my_name: profile.name, phone: profile.phone, email: profile.email, linkedin: profile.linkedin,
    portfolio: profile.portfolio, resume_link: profile.resume_link, signature: profile.signature,
    company: app.company, role: app.role, hiring_manager: app.contact_name || "Hiring Manager",
    interviewer: app.contact_name || "Interviewer", job_url: app.job_url, location: app.location
  };
}

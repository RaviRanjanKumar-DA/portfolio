// Prompt builders for every AI task. Shared by the API (server-side calls) and tests.
export const TASKS = [
  "extract_job", "match_score", "cover_letter", "email_apply", "linkedin_note", "recruiter_message",
  "follow_up", "template_create", "template_improve", "tailor_cv", "free"
];

const BASE = "You help Ravi Ranjan Kumar, a Data Analyst in New Delhi, apply for jobs. Write in clear, professional Indian-English. " +
  "Never invent experience, employers, numbers, dates, tools or degrees: use only facts given in PROFILE / CV. Do not use placeholders like [Company].";

const cvText = (cv) => JSON.stringify(cv || {}, null, 0).slice(0, 14000);
const jobBlock = (app = {}) =>
  `JOB:\nCompany: ${app.company || "-"}\nRole: ${app.role || "-"}\nLocation: ${app.location || "-"}\nContact: ${app.contact_name || "-"}\nDescription:\n${String(app.jd_text || "-").slice(0, 8000)}`;
const profBlock = (p = {}) => `PROFILE:\n${JSON.stringify(p).slice(0, 4000)}`;

export function buildPrompt(task, input = {}) {
  const { app = {}, profile = {}, cv = {}, template = {}, prompt = "", mode = "improve" } = input;
  switch (task) {
    case "extract_job":
      return { json: true, system: "Extract structured data from a job post. Reply with JSON only.",
        user: `Return JSON {"company":"","role":"","location":"","work_mode":"onsite|hybrid|remote|","salary":"","contact_name":"","contact_email":"","skills":[]} from this job post. Use "" when unknown.\n\n${String(app.jd_text || prompt).slice(0, 10000)}` };
    case "match_score":
      return { json: true, system: BASE + " Reply with JSON only.",
        user: `Score 0-100 how well the CV fits the job, honestly. Return JSON {"score":0,"strengths":[""],"gaps":[""],"advice":""}.\n\n${jobBlock(app)}\n\nCV:\n${cvText(cv)}` };
    case "cover_letter":
      return { json: false, system: BASE,
        user: `Write a concise cover letter (180-250 words) for this job. End with the signature from PROFILE.\n\n${jobBlock(app)}\n\n${profBlock(profile)}\n\nCV:\n${cvText(cv)}` };
    case "email_apply":
      return { json: true, system: BASE + " Reply with JSON only.",
        user: `Write a job application email. Return JSON {"subject":"","body":""}. Body 120-180 words, mention the resume link from PROFILE, end with the PROFILE signature.\n\n${jobBlock(app)}\n\n${profBlock(profile)}\n\nCV:\n${cvText(cv)}` };
    case "linkedin_note":
      return { json: false, system: BASE,
        user: `Write a LinkedIn connection request note to the recruiter/hiring manager. HARD LIMIT 280 characters. No hashtags.\n\n${jobBlock(app)}\n\n${profBlock(profile)}` };
    case "recruiter_message":
      return { json: false, system: BASE,
        user: `Write a short message (70-110 words) to send a recruiter on ${app.platform || "Naukri/LinkedIn"} after applying.\n\n${jobBlock(app)}\n\n${profBlock(profile)}` };
    case "follow_up":
      return { json: false, system: BASE,
        user: `Write a polite follow-up email (60-100 words) about this application, applied on ${app.applied_at ? String(app.applied_at).slice(0, 10) : "recently"}. Include a subject line as the first line "Subject: ...".\n\n${jobBlock(app)}\n\n${profBlock(profile)}` };
    case "template_create":
      return { json: true, system: BASE + " Reply with JSON only.",
        user: `Create a reusable ${template.kind || "email"} template from this description. Use {{company}}, {{role}}, {{hiring_manager}}, {{resume_link}}, {{signature}} variables where useful. Return JSON {"name":"","subject":"","body":""}.\n\nDescription: ${prompt}\n\n${profBlock(profile)}` };
    case "template_improve":
      return { json: true, system: BASE + " Reply with JSON only.",
        user: `Rewrite this template to be ${mode === "shorten" ? "shorter (about half the length)" : mode === "formal" ? "more formal" : mode === "friendly" ? "warmer and friendlier" : "clearer and more persuasive"}. Keep every {{variable}} exactly as written. Return JSON {"subject":"","body":""}.\n\nSUBJECT: ${template.subject || ""}\nBODY:\n${template.body || ""}` };
    case "tailor_cv":
      return { json: true,
        system: "You tailor CVs. Use ONLY facts in MASTER_CV. Never add or change numbers, percentages, employers, clients, job titles, dates, tools, skills, degrees, projects or certifications. " +
          "You MAY: reorder bullets and skills, drop less relevant bullets, rephrase bullets and the summary to mirror the job's wording, and choose which projects to show. Reply with JSON only, same schema as MASTER_CV.",
        user: `MASTER_CV:\n${cvText(cv)}\n\n${jobBlock(app)}\n\nReturn the tailored CV JSON (same keys: header, summary, experience[{title,company,location,client,start,end,bullets}], skills[{group,items}], projects, education, certifications, achievements).` };
    case "free":
    default:
      return { json: false, system: BASE, user: `${prompt}\n\n${profBlock(profile)}${app.company ? "\n\n" + jobBlock(app) : ""}` };
  }
}

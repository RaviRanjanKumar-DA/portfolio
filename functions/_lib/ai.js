// Server-side calls to the user's own AI provider (bring your own key). Keys never reach the browser.
export class AIError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-5-5",
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free"
};

const TIMEOUT_MS = 45000;

export function parseJsonLoose(text) {
  const s = String(text || "");
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cand = fenced ? fenced[1] : s;
  const a = cand.indexOf("{"), b = cand.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(cand.slice(a, b + 1)); } catch { return null; }
}

function request(provider, model, key, system, user, json) {
  const chat = (url, extra = {}) => ({
    url,
    opts: { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...extra },
      body: JSON.stringify({ model, temperature: 0.4, messages: [{ role: "system", content: system }, { role: "user", content: user }], ...(json && provider === "openai" ? { response_format: { type: "json_object" } } : {}) }) },
    read: (d) => d?.choices?.[0]?.message?.content
  });
  switch (provider) {
    case "openai": return chat("https://api.openai.com/v1/chat/completions");
    case "groq": return chat("https://api.groq.com/openai/v1/chat/completions");
    case "openrouter": return chat("https://openrouter.ai/api/v1/chat/completions", { "X-Title": "Portfolio Admin" });
    case "anthropic":
      return {
        url: "https://api.anthropic.com/v1/messages",
        opts: { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 2500, system, messages: [{ role: "user", content: user }] }) },
        read: (d) => (d?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("")
      };
    case "gemini":
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        opts: { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.4, ...(json ? { responseMimeType: "application/json" } : {}) } }) },
        read: (d) => d?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("")
      };
    default:
      throw new AIError(`Unknown AI provider "${provider}"`, 400);
  }
}

export async function callAI(env, { provider, model, key, system, user, json = false, task, input }, fetchImpl = fetch) {
  if (env.AI_MOCK === "1") return { text: mockReply(task, input || {}), mock: true };
  if (!key) throw new AIError("Add an AI API key in Settings first", 400);
  const req = request(provider, model || DEFAULT_MODELS[provider], key, system, user, json);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res, data;
  try {
    res = await fetchImpl(req.url, { ...req.opts, signal: ctl.signal });
    data = await res.json().catch(() => null);
  } catch (e) {
    throw new AIError(e?.name === "AbortError" ? "AI provider timed out (45 s). Try again." : `Could not reach the AI provider: ${e?.message || e}`, 502);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.error?.status || data?.message || `HTTP ${res.status}`;
    throw new AIError(`${provider} error: ${msg}`, 502);
  }
  const text = req.read(data);
  if (!text) throw new AIError(`${provider} returned an empty reply`, 502);
  return { text };
}

// Deterministic offline replies for local testing (AI_MOCK=1). Never used in production.
function mockReply(task, input) {
  const a = input.app || {}, p = input.profile || {};
  const company = a.company || "Acme Analytics", role = a.role || "Data Analyst";
  switch (task) {
    case "extract_job": {
      const jd = String(a.jd_text || input.prompt || "");
      const at = jd.match(/at\s+([A-Z][\w&.\- ]{1,40}?)(?:[,.\n]|\s+is\b)/);
      const r = jd.match(/(Senior\s+)?(Data|Business|BI|MIS|Reporting)\s+(Analyst|Executive|Developer)/i);
      return JSON.stringify({ company: at ? at[1].trim() : "Acme Analytics", role: r ? r[0] : "Data Analyst", location: /remote/i.test(jd) ? "Remote" : "New Delhi", work_mode: /remote/i.test(jd) ? "remote" : "onsite", salary: "", contact_name: "", contact_email: (jd.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [""])[0], skills: ["Power BI", "SQL"] });
    }
    case "match_score": return JSON.stringify({ score: 78, strengths: ["Power BI dashboards", "SQL", "CRM automation"], gaps: ["Cloud data warehouse"], advice: "Highlight dashboard impact (MOCK)." });
    case "email_apply": return JSON.stringify({ subject: `Application for ${role} — ${p.name || "Ravi Ranjan Kumar"}`, body: `Dear Hiring Manager,\n\nI would like to apply for the ${role} role at ${company}. (MOCK reply — add a real AI key in Settings.)\n\n${p.signature || "Regards,\nRavi"}` });
    case "template_create": return JSON.stringify({ name: "AI template (mock)", subject: "{{role}} at {{company}}", body: "Hi {{hiring_manager}},\n\n(MOCK) I'm interested in {{role}} at {{company}}.\n\n{{signature}}" });
    case "template_improve": return JSON.stringify({ subject: (input.template?.subject || "") + " (improved)", body: (input.template?.body || "") + "\n\n(MOCK improved)" });
    case "tailor_cv": {
      const cv = JSON.parse(JSON.stringify(input.cv || {}));
      for (const r of cv.experience || []) r.bullets = (r.bullets || []).slice().reverse();
      // mock keeps the summary as-is (the UI shows a "mock" toast)
      // simulate an AI hallucination when the JD mentions Snowflake, so the accuracy guard can be seen working
      if (/snowflake/i.test(a.jd_text || "") && cv.skills?.[0]) cv.skills[0].items.push("Snowflake");
      return JSON.stringify(cv);
    }
    case "linkedin_note": return `Hi, I saw the ${role} opening at ${company}. Data Analyst, 5+ yrs, 100+ dashboards. Would love to connect! (MOCK)`;
    default: return `(MOCK ${task}) Draft for ${role} at ${company}.`;
  }
}

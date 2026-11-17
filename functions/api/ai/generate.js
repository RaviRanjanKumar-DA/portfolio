// POST {task, input:{application_id?, app?, template?, prompt?, mode?, cv?}} → {text, json?}
// Profile, master CV and the saved application are loaded server-side so the AI always gets the real facts.
import { json, err, readJson } from "../../_lib/http.js";
import { callAI, AIError, parseJsonLoose } from "../../_lib/ai.js";
import { buildPrompt, TASKS } from "../../../admin/lib/prompts.js";
import { aiConfig } from "../settings.js";

export async function onRequestPost({ request, env }) {
  const { task, input = {} } = await readJson(request);
  if (!TASKS.includes(task)) return err(400, "Unknown AI task");

  const [prof, cvRow] = await env.DB.batch([
    env.DB.prepare("SELECT json FROM profile WHERE id = 1"),
    env.DB.prepare("SELECT json FROM cv_master WHERE id = 1")
  ]);
  const profile = prof.results[0] ? JSON.parse(prof.results[0].json) : {};
  const masterCv = cvRow.results[0] ? JSON.parse(cvRow.results[0].json) : {};
  let app = input.app || {};
  if (input.application_id) {
    const saved = await env.DB.prepare("SELECT * FROM applications WHERE id = ?").bind(input.application_id).first();
    if (saved) app = { ...saved, ...app };
  }
  // tailor_cv must always start from the stored master CV, never a client-supplied one
  const full = { ...input, app, profile, cv: masterCv };
  const prompt = buildPrompt(task, full);

  try {
    const cfg = await aiConfig(env);
    const out = await callAI(env, { ...cfg, ...prompt, task, input: full });
    const parsed = prompt.json ? parseJsonLoose(out.text) : null;
    if (prompt.json && !parsed) return err(502, "The AI reply was not valid JSON. Try again or switch model.");
    return json({ text: out.text, json: parsed, mock: !!out.mock });
  } catch (e) {
    if (e instanceof AIError) return err(e.status, e.message);
    throw e;
  }
}

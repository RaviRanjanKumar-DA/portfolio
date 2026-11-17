import { test } from "node:test";
import assert from "node:assert/strict";
import { callAI, AIError, parseJsonLoose } from "../functions/_lib/ai.js";
import { buildPrompt, TASKS } from "../admin/lib/prompts.js";

const fakeFetch = (status, body, capture = {}) => async (url, opts) => {
  capture.url = url; capture.opts = opts;
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
};

test("openai: sends bearer key and returns message text", async () => {
  const cap = {};
  const r = await callAI({}, { provider: "openai", model: "gpt-4o-mini", key: "sk-1", system: "s", user: "u" },
    fakeFetch(200, { choices: [{ message: { content: "hello" } }] }, cap));
  assert.equal(r.text, "hello");
  assert.equal(cap.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(cap.opts.headers.Authorization, "Bearer sk-1");
});

test("anthropic: uses x-api-key + version header and reads content[0].text", async () => {
  const cap = {};
  const r = await callAI({}, { provider: "anthropic", model: "claude-haiku-5-5", key: "k", system: "s", user: "u" },
    fakeFetch(200, { content: [{ type: "text", text: "hi" }] }, cap));
  assert.equal(r.text, "hi");
  assert.equal(cap.opts.headers["x-api-key"], "k");
  assert.equal(cap.opts.headers["anthropic-version"], "2023-06-01");
});

test("gemini: model in URL, reads candidates text", async () => {
  const cap = {};
  const r = await callAI({}, { provider: "gemini", model: "gemini-2.5-flash", key: "g", system: "s", user: "u" },
    fakeFetch(200, { candidates: [{ content: { parts: [{ text: "yo" }] } }] }, cap));
  assert.equal(r.text, "yo");
  assert.match(cap.url, /models\/gemini-2\.5-flash:generateContent/);
});

test("provider error becomes AIError with the provider's message and status 502", async () => {
  await assert.rejects(
    callAI({}, { provider: "openai", model: "m", key: "bad", system: "s", user: "u" }, fakeFetch(401, { error: { message: "Incorrect API key provided" } })),
    (e) => e instanceof AIError && e.status === 502 && /Incorrect API key/.test(e.message)
  );
});

test("missing key → AIError 400 asking to add a key in Settings", async () => {
  await assert.rejects(callAI({}, { provider: "openai", model: "m", key: "", system: "s", user: "u" }, fakeFetch(200, {})),
    (e) => e.status === 400 && /Settings/.test(e.message));
});

test("network failure → AIError 502 (no crash)", async () => {
  const boom = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(callAI({}, { provider: "groq", model: "m", key: "k", system: "s", user: "u" }, boom), (e) => e.status === 502);
});

test("mock provider (AI_MOCK=1) returns deterministic JSON for email_apply", async () => {
  const p = buildPrompt("email_apply", { app: { company: "Acme", role: "Data Analyst" }, profile: { name: "Ravi" } });
  const r = await callAI({ AI_MOCK: "1" }, { provider: "openai", model: "", key: "", ...p, task: "email_apply", input: { app: { company: "Acme", role: "Data Analyst" } } });
  const j = parseJsonLoose(r.text);
  assert.match(j.subject, /Data Analyst/);
  assert.match(j.body, /Acme/);
});

test("parseJsonLoose extracts JSON from fenced or chatty output", () => {
  assert.deepEqual(parseJsonLoose('Sure!\n```json\n{"a":1}\n```'), { a: 1 });
  assert.equal(parseJsonLoose("no json here"), null);
});

test("tailor_cv prompt forbids new facts and includes the master CV", () => {
  const p = buildPrompt("tailor_cv", { cv: { summary: "MASTER-SUMMARY" }, app: { jd_text: "JD" } });
  assert.match(p.system, /ONLY facts/);
  assert.match(p.user, /MASTER-SUMMARY/);
  assert.equal(p.json, true);
});

test("every task builds a prompt", () => {
  for (const t of TASKS) {
    const p = buildPrompt(t, { app: {}, profile: {}, cv: {}, template: {}, prompt: "x" });
    assert.ok(p.system && p.user, t);
  }
});

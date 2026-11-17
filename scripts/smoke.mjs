// End-to-end API smoke test against the local dev server (npm run dev).
// Usage: node scripts/smoke.mjs [baseUrl]   — reads the local password from .dev.vars
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.argv[2] || "http://localhost:8790";
const vars = readFileSync(".dev.vars", "utf8");
const PASS = vars.match(/admin: (\S+)/)[1];
const USER = vars.match(/^ADMIN_USER=(.+)$/m)[1].trim();
const RUN = Date.now().toString(36);
let cookie = "";
let passed = 0;

async function call(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const sc = res.headers.get("set-cookie");
  if (sc && sc.startsWith("rrk_session=")) cookie = sc.split(";")[0];
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, headers: res.headers };
}
async function step(name, fn) {
  try { await fn(); passed++; console.log("  ✓", name); }
  catch (e) { console.log("  ✗", name, "\n    ", e.message); process.exitCode = 1; }
}

console.log("Smoke:", BASE);

await step("unauthenticated API call → 401", async () => {
  const r = await call("GET", "/api/applications");
  assert.equal(r.status, 401);
});

await step("6 wrong passwords from one IP → 6th is 429 (locked)", async () => {
  const ip = { "CF-Connecting-IP": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` };
  for (let i = 0; i < 5; i++) assert.equal((await call("POST", "/api/auth/login", { username: USER, password: "nope" }, ip)).status, 401);
  const r = await call("POST", "/api/auth/login", { username: USER, password: PASS }, ip);
  assert.equal(r.status, 429);
});

await step("login with correct password sets HttpOnly session cookie", async () => {
  const r = await call("POST", "/api/auth/login", { username: USER, password: PASS }, { "CF-Connecting-IP": "10.1.1." + RUN.length });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.match(r.headers.get("set-cookie"), /HttpOnly/);
  assert.ok(cookie);
  const me = await call("GET", "/api/auth/me");
  assert.equal(me.data.user, USER);
});

let appId;
await step("create application → 'created' event", async () => {
  const r = await call("POST", "/api/applications", { company: `Smoke Co ${RUN}`, role: "Data Analyst", platform: "Naukri", status: "saved", jd_text: "<img src=x onerror=alert(1)>" });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  appId = r.data.id;
  const ev = await call("GET", `/api/applications/${appId}/events`);
  assert.deepEqual(ev.data.map((e) => e.type), ["created"]);
});

await step("missing company/role → 400", async () => {
  const r = await call("POST", "/api/applications", { company: "", role: "" });
  assert.equal(r.status, 400);
});

await step("status saved→applied→interview logs 2 status_change events and sets applied_at once", async () => {
  await call("PUT", `/api/applications/${appId}`, { status: "applied" });
  const a1 = (await call("GET", `/api/applications/${appId}`)).data;
  assert.ok(a1.applied_at);
  await call("PUT", `/api/applications/${appId}`, { status: "interview", notes: "HR call" });
  const a2 = (await call("GET", `/api/applications/${appId}`)).data;
  assert.equal(a2.applied_at, a1.applied_at);
  assert.equal(a2.status, "interview");
  const ev = (await call("GET", `/api/applications/${appId}/events`)).data;
  const sc = ev.filter((e) => e.type === "status_change");
  assert.equal(sc.length, 2);
  assert.equal(sc[1].from_status, "applied");
  assert.equal(sc[1].to_status, "interview");
});

await step("invalid status → 400", async () => {
  const r = await call("PUT", `/api/applications/${appId}`, { status: "hired!!" });
  assert.equal(r.status, 400);
});

await step("add a note event", async () => {
  const r = await call("POST", `/api/applications/${appId}/events`, { type: "note", detail: "Called recruiter" });
  assert.equal(r.status, 201);
});

await step("list with filters (status + search)", async () => {
  const r = await call("GET", `/api/applications?status=interview&q=${encodeURIComponent("Smoke Co " + RUN)}`);
  assert.equal(r.data.length, 1);
});

await step("documents and CV version linked to application create history", async () => {
  const d = await call("POST", `/api/applications/${appId}/documents`, { kind: "cover_letter", content: "Dear team" });
  assert.equal(d.status, 201);
  const v = await call("POST", "/api/cv/versions", { application_id: appId, label: "Smoke v1", template: "classic", json: { header: { name: "X" } } });
  assert.equal(v.status, 201);
  const ev = (await call("GET", `/api/applications/${appId}/events`)).data;
  assert.ok(ev.some((e) => e.type === "cv_tailored"));
});

await step("delete application cascades its events", async () => {
  assert.equal((await call("DELETE", `/api/applications/${appId}`)).status, 200);
  assert.equal((await call("GET", `/api/applications/${appId}`)).status, 404);
  const ev = await call("GET", `/api/applications/${appId}/events`);
  assert.equal(ev.data.length, 0);
});

await step("templates CRUD", async () => {
  const c = await call("POST", "/api/templates", { name: "Smoke T", kind: "email", subject: "S", body: "Hi {{company}}" });
  assert.equal(c.status, 201);
  const u = await call("PUT", `/api/templates/${c.data.id}`, { body: "Hello {{company}}" });
  assert.equal(u.status, 200);
  const list = (await call("GET", "/api/templates")).data;
  assert.ok(list.some((t) => t.id === c.data.id && t.body === "Hello {{company}}"));
  assert.equal((await call("DELETE", `/api/templates/${c.data.id}`)).status, 200);
});

await step("bad template kind → 400", async () => {
  assert.equal((await call("POST", "/api/templates", { name: "x", kind: "spam", body: "b" })).status, 400);
});

await step("settings: AI key stored encrypted and only returned masked", async () => {
  await call("PUT", "/api/settings", { ai_provider: "openai", ai_model: "gpt-4o-mini", ai_key: "sk-smoke-abcd" });
  const s = (await call("GET", "/api/settings")).data;
  assert.equal(s.ai_key_masked, "…abcd");
  assert.ok(!JSON.stringify(s).includes("sk-smoke"));
});

await step("profile + CV master round-trip", async () => {
  const p = (await call("GET", "/api/profile")).data;
  assert.equal(p.name, "Ravi Ranjan Kumar");
  const m = (await call("GET", "/api/cv/master")).data;
  assert.equal(m.json.experience.length, 4);
  assert.equal((await call("PUT", "/api/cv/master", { json: m.json })).status, 200);
});

await step("public contact form saves to inbox (honeypot rejected)", async () => {
  const saved = cookie; cookie = "";
  assert.equal((await call("POST", "/api/contact", { name: "Smoke", email: "s@x.com", message: "hello " + RUN })).status, 201);
  assert.equal((await call("POST", "/api/contact", { name: "Bot", email: "b@x.com", message: "spam", botcheck: "1" })).status, 400);
  cookie = saved;
  const inbox = (await call("GET", "/api/messages")).data;
  assert.ok(inbox.some((m) => m.message === "hello " + RUN));
});

await step("stats endpoint returns apps + events", async () => {
  const r = (await call("GET", "/api/stats?range=all")).data;
  assert.ok(Array.isArray(r.apps) && Array.isArray(r.events));
});

await step("backup export → import keeps counts and never contains secrets", async () => {
  const b = (await call("GET", "/api/backup")).data;
  assert.ok(!JSON.stringify(b).includes("admin_pass_hash"));
  assert.ok(!JSON.stringify(b).includes("ai_key_enc"));
  const before = b.tables.templates.length;
  assert.equal((await call("POST", "/api/backup", b)).status, 200);
  const after = (await call("GET", "/api/backup")).data;
  assert.equal(after.tables.templates.length, before);
});

await step("logout clears session", async () => {
  await call("POST", "/api/auth/logout");
  cookie = "";
  assert.equal((await call("GET", "/api/auth/me")).status, 401);
});

console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);

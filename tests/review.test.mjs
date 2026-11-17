import { test } from "node:test";
import assert from "node:assert/strict";
import { factGuard, normalizeCv } from "../admin/lib/factguard.js";
import { renderCV } from "../admin/lib/cvrender.js";
import { safeUrl } from "../admin/lib/esc.js";
import { buildPrompt } from "../admin/lib/prompts.js";
import { cv as master } from "../scripts/gen-seed.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));
const flagged = (t) => factGuard(master, t).issues.map((i) => i.fact.toLowerCase());

test("guard: master vs itself passes", () => {
  assert.equal(factGuard(master, clone(master)).ok, true);
});
test("guard flags invented employers in free text (summary/bullets)", () => {
  const t = clone(master);
  t.summary = "Ex-Google and Microsoft analyst with 5+ Years of Professional Experience.";
  t.experience[0].bullets[0] = "Head of Analytics at Deloitte for lead management operations.";
  const f = flagged(t);
  for (const w of ["google", "microsoft", "deloitte"]) assert.ok(f.some((x) => x.includes(w)), w);
});
test("guard flags invented degree acronyms and institutes", () => {
  const t = clone(master);
  t.summary = master.summary + " MBA from IIM Ahmedabad.";
  const f = flagged(t);
  assert.ok(f.some((x) => x.includes("mba")));
  assert.ok(f.some((x) => x.includes("iim") || x.includes("ahmedabad")));
});
test("guard flags spelled-out numbers not in master", () => {
  const t = clone(master);
  t.summary = "Data Analyst with ten years of experience.";
  assert.ok(flagged(t).includes("ten"));
});
test("guard compares every header field (title, location, links)", () => {
  const t = clone(master);
  t.header.title = "Senior Data Scientist";
  t.header.portfolio = "https://evil.example";
  const kinds = factGuard(master, t).issues.filter((i) => i.kind === "header").map((i) => i.path);
  assert.ok(kinds.includes("header.title"));
  assert.ok(kinds.includes("header.portfolio"));
});
test("guard matches skills as whole words (Java ≠ JavaScript, C, Ex)", () => {
  const t = clone(master);
  t.skills[1].items.push("Java", "C", "Ex");
  const f = flagged(t);
  for (const w of ["java", "c", "ex"]) assert.ok(f.includes(w), w);
});
test("guard flags a changed project link", () => {
  const t = clone(master);
  t.projects[0].link = "javascript:alert(1)";
  assert.ok(factGuard(master, t).issues.some((i) => i.kind === "link"));
});
test("safeUrl allows only http(s) and mailto", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl(" JaVaScRiPt:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,x"), "");
  assert.equal(safeUrl("https://x.com/a"), "https://x.com/a");
  assert.equal(safeUrl("mailto:a@b.co"), "mailto:a@b.co");
});
test("renderCV never outputs a javascript: href", () => {
  const html = renderCV({ header: { name: "X", portfolio: "javascript:alert(1)" }, projects: [{ name: "P", link: "javascript:alert(2)" }] });
  assert.ok(!/javascript:/i.test(html));
});
test("normalizeCv fixes string bullets/items and rejects junk", () => {
  const n = normalizeCv({ header: { name: "A" }, summary: "s", experience: [{ title: "T", company: "C", start: "Jan 2020", end: "Present", bullets: "a\nb" }], skills: [{ group: "G", items: "SQL, Python" }], achievements: "x" });
  assert.deepEqual(n.experience[0].bullets, ["a", "b"]);
  assert.deepEqual(n.skills[0].items, ["SQL", "Python"]);
  assert.deepEqual(n.achievements, ["x"]);
  assert.deepEqual(n.projects, []);
  assert.equal(normalizeCv({ summary: "no experience" }), null);
  assert.equal(normalizeCv("text"), null);
});
test("prompts never include CTC unless the free prompt mentions it", () => {
  const profile = { name: "R", current_ctc: "12 LPA", expected_ctc: "18 LPA" };
  for (const task of ["cover_letter", "email_apply", "linkedin_note", "recruiter_message", "follow_up", "free"]) {
    const p = buildPrompt(task, { profile, app: { company: "A" }, prompt: "write something" });
    assert.ok(!p.user.includes("LPA"), task);
  }
  const p = buildPrompt("free", { profile, prompt: "Answer the recruiter about my CTC and notice period" });
  assert.ok(p.user.includes("12 LPA"));
});

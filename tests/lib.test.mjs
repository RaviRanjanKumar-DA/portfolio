import { test } from "node:test";
import assert from "node:assert/strict";
import { esc } from "../admin/lib/esc.js";
import { fillTemplate, templateVars } from "../admin/lib/template.js";
import { factGuard, extractFacts, cvToText } from "../admin/lib/factguard.js";
import { atsCheck } from "../admin/lib/ats.js";
import { computeStats } from "../admin/lib/stats.js";
import { fmtIST, istDate } from "../admin/lib/time.js";
import { cv as master } from "../scripts/gen-seed.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));

test("esc escapes HTML special characters", () => {
  assert.equal(esc('<script>"x"</script>'), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  assert.equal(esc("it's & <b>"), "it&#39;s &amp; &lt;b&gt;");
  assert.equal(esc(null), "");
});

test("fillTemplate replaces known vars and keeps unknown ones", () => {
  assert.equal(fillTemplate("Hi {{name}} {{x}}", { name: "A" }), "Hi A {{x}}");
  assert.equal(fillTemplate("{{ company }} / {{company}}", { company: "Acme" }), "Acme / Acme");
});

test("templateVars lists unique variable names", () => {
  assert.deepEqual(templateVars("{{a}} {{b}} {{a}}"), ["a", "b"]);
});

test("extractFacts finds percentages, ranges, years and month-years", () => {
  const f = extractFacts("Raised productivity by 40% and cut effort 20–30% since May 2025; 100+ dashboards in 2018.");
  assert.ok(f.numbers.includes("40%"));
  assert.ok(f.numbers.includes("20-30%"));
  assert.ok(f.numbers.includes("100+"));
  assert.ok(f.years.includes("2018"));
  assert.ok(f.years.includes("may 2025"));
});

test("factGuard passes a reordered/rephrased CV that uses only master facts", () => {
  const t = clone(master);
  t.experience[0].bullets.reverse();
  t.summary = "Data Analyst with 5+ Years of Professional Experience and 100+ interactive dashboards in Power BI and SQL.";
  const r = factGuard(master, t);
  assert.equal(r.ok, true, JSON.stringify(r.issues));
});

test("factGuard flags a changed number (45% instead of 40%)", () => {
  const t = clone(master);
  t.experience[0].bullets[3] = t.experience[0].bullets[3].replace("40%", "45%");
  const r = factGuard(master, t);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.fact === "45%" && i.kind === "number"));
});

test("factGuard flags an invented employer", () => {
  const t = clone(master);
  t.experience.push({ title: "Data Analyst", company: "Google", location: "Gurugram", client: "", start: "Jan 2021", end: "Dec 2022", bullets: [] });
  const r = factGuard(master, t);
  assert.ok(r.issues.some((i) => i.kind === "company" && i.fact === "Google"));
  assert.ok(r.issues.some((i) => i.kind === "date"));
});

test("factGuard flags a changed job title or date on an existing role", () => {
  const t = clone(master);
  t.experience[1].title = "Senior Data Analyst";
  t.experience[1].start = "Jan 2024";
  const r = factGuard(master, t);
  assert.ok(r.issues.some((i) => i.kind === "title"));
  assert.ok(r.issues.some((i) => i.kind === "date"));
});

test("factGuard flags an invented tool/skill and degree", () => {
  const t = clone(master);
  t.skills[0].items.push("Snowflake");
  t.education[0].degree = "MBA (Finance)";
  const r = factGuard(master, t);
  assert.ok(r.issues.some((i) => i.kind === "skill" && i.fact === "Snowflake"));
  assert.ok(r.issues.some((i) => i.kind === "education"));
});

test("atsCheck reports found and missing JD keywords", () => {
  const r = atsCheck("Looking for Power BI, SQL, Python and Snowflake experience. DAX a plus.", cvToText(master));
  assert.ok(r.found.includes("power bi"));
  assert.ok(r.found.includes("sql"));
  assert.ok(r.missing.includes("snowflake"));
  assert.ok(r.score > 0 && r.score < 100);
});

test("computeStats: response rate counts apps that moved beyond applied", () => {
  const apps = [
    { id: 1, status: "applied", platform: "Naukri", applied_at: "2026-11-10T05:00:00Z", created_at: "2026-11-10T05:00:00Z" },
    { id: 2, status: "applied", platform: "LinkedIn", applied_at: "2026-11-11T05:00:00Z", created_at: "2026-11-11T05:00:00Z" },
    { id: 3, status: "interview", platform: "Naukri", applied_at: "2026-11-12T05:00:00Z", created_at: "2026-11-12T05:00:00Z" },
    { id: 4, status: "rejected", platform: "Email", applied_at: "2026-11-13T05:00:00Z", created_at: "2026-11-13T05:00:00Z" },
    { id: 5, status: "saved", platform: "Email", applied_at: null, created_at: "2026-11-14T05:00:00Z" }
  ];
  const events = [
    { application_id: 3, type: "status_change", to_status: "interview", created_at: "2026-11-15T05:00:00Z" },
    { application_id: 4, type: "status_change", to_status: "rejected", created_at: "2026-11-14T05:00:00Z" }
  ];
  const s = computeStats(apps, events, { now: "2026-11-17T06:00:00Z" });
  assert.equal(s.kpis.applied, 4);
  assert.equal(s.kpis.responseRate, 50);
  assert.equal(s.kpis.interviews, 1);
  assert.equal(s.funnel.find((f) => f.key === "interview").count, 1);
  assert.equal(s.byPlatform.Naukri, 2);
  assert.equal(s.responseByPlatform.Naukri, 50);
  assert.equal(s.avgDaysToResponse, 2); // app3: 3 days, app4: 1 day
  assert.equal(s.weekly.length, 12);
});

test("fmtIST and istDate format in Asia/Kolkata", () => {
  assert.equal(fmtIST("2026-11-17T14:15:00Z"), "17 Nov 2026, 07:45 PM");
  assert.equal(istDate("2026-11-17T20:00:00Z"), "2026-11-18");
  assert.equal(fmtIST(null), "—");
});

import { monthsBetween, durationLabel } from "../admin/lib/duration.js";
test("durationLabel counts months inclusively like LinkedIn", () => {
  assert.equal(monthsBetween("Aug 2018", "Nov 2020"), 28);
  assert.equal(durationLabel("Aug 2018", "Nov 2020"), "2 yrs 4 mos");
  assert.equal(durationLabel("Apr 2023", "Mar 2024"), "1 yr");
  assert.equal(durationLabel("Mar 2024", "Mar 2025"), "1 yr 1 mo");
  assert.equal(durationLabel("May 2025", "Present", new Date("2026-11-17T10:00:00Z")), "1 yr 7 mos");
  assert.equal(durationLabel("Oct 2026", "Present", new Date("2026-11-17T10:00:00Z")), "2 mos");
  assert.equal(durationLabel("bad", "x"), "");
});

import { wordDiff } from "../admin/lib/diff.js";
import { renderCV } from "../admin/lib/cvrender.js";
test("wordDiff marks removed and added words and escapes HTML", () => {
  const d = wordDiff("raised sales by 40%", "raised <b>revenue</b> by 40%");
  assert.match(d, /<del>sales<\/del>/);
  assert.match(d, /<ins>&lt;b&gt;revenue&lt;\/b&gt;<\/ins>/);
});
test("renderCV escapes content and shows role durations", () => {
  const html = renderCV({ header: { name: "<x>" }, experience: [{ title: "DA", company: "Co", start: "Apr 2023", end: "Mar 2024", bullets: ["a<b"] }] });
  assert.ok(html.includes("&lt;x&gt;"));
  assert.ok(html.includes("a&lt;b"));
  assert.ok(html.includes("(1 yr)"));
});

test("factGuard reports an invented skill only once (case-insensitive dedupe)", () => {
  const t = clone(master);
  t.skills[0].items.push("Snowflake");
  const r = factGuard(master, t);
  assert.equal(r.issues.filter((i) => i.fact.toLowerCase() === "snowflake").length, 1);
});

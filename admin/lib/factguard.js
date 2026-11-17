// Accuracy guard: a tailored CV may only use facts that exist in the master CV.
// Deterministic (no AI). Checks numbers, dates, employers, titles, skills/tools, education, projects and header.
import { TOOLS, findTerms } from "./keywords.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const norm = (s) => String(s ?? "").toLowerCase().replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();

export function extractFacts(text) {
  const s = norm(text);
  const years = new Set();
  const monthYear = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+((?:19|20)\d{2})\b/g;
  for (const m of s.matchAll(monthYear)) years.add(`${m[1]} ${m[2]}`);
  for (const m of s.matchAll(/\b(?:19|20)\d{2}\b/g)) years.add(m[0]);

  const numbers = new Set();
  const numRe = /(?<![a-z0-9.])(\d+(?:[.,]\d+)*)(?:\s*-\s*(\d+(?:[.,]\d+)*))?\s*(%|\+)?/g;
  for (const m of s.matchAll(numRe)) {
    const [, a, b, suf = ""] = m;
    if (!b && !suf && /^(19|20)\d{2}$/.test(a)) continue; // a year, handled above
    numbers.add(`${a.replace(/,/g, "")}${b ? "-" + b.replace(/,/g, "") : ""}${suf}`);
  }
  return { numbers: [...numbers], years: [...years], terms: findTerms(s, TOOLS) };
}

export function cvToText(cv = {}) {
  const h = cv.header || {};
  const parts = [h.name, h.title, h.email, h.phone, h.location, cv.summary];
  for (const r of cv.experience || []) parts.push(r.title, r.company, r.location, r.client, r.start, r.end, ...(r.bullets || []));
  for (const g of cv.skills || []) parts.push(g.group, ...(g.items || []));
  for (const p of cv.projects || []) parts.push(p.name, p.tools, p.description, p.date);
  for (const e of cv.education || []) parts.push(e.degree, e.institution, e.location, e.year);
  parts.push(...(cv.certifications || []), ...(cv.achievements || []));
  return parts.filter(Boolean).join("\n");
}

export function factGuard(master, tailored) {
  const issues = [];
  const add = (path, fact, kind) => {
    if (!issues.some((i) => i.fact === fact && i.kind === kind)) issues.push({ path, fact, kind });
  };
  const mText = cvToText(master);
  const mFacts = extractFacts(mText);
  const mNorm = norm(mText);

  // 1. numbers / dates / tools anywhere in the tailored text
  const walk = (obj, path) => {
    if (typeof obj === "string") {
      const f = extractFacts(obj);
      f.numbers.filter((n) => !mFacts.numbers.includes(n)).forEach((n) => add(path, n, "number"));
      f.years.filter((y) => !mFacts.years.includes(y)).forEach((y) => add(path, y, "date"));
      f.terms.filter((t) => !mFacts.terms.includes(t)).forEach((t) => add(path, t, "skill"));
    } else if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (obj && typeof obj === "object") for (const k of Object.keys(obj)) walk(obj[k], path ? `${path}.${k}` : k);
  };
  walk(tailored, "");

  // 2. roles: employer must exist; title and dates must match that master role exactly
  const roles = master.experience || [];
  (tailored.experience || []).forEach((r, i) => {
    const m = roles.find((x) => norm(x.company) === norm(r.company));
    const p = `experience[${i}]`;
    if (!m) {
      add(`${p}.company`, r.company, "company");
      if (r.start) add(`${p}.start`, r.start, "date");
      return;
    }
    if (norm(m.title) !== norm(r.title)) add(`${p}.title`, r.title, "title");
    if (norm(m.start) !== norm(r.start)) add(`${p}.start`, r.start, "date");
    if (norm(m.end) !== norm(r.end)) add(`${p}.end`, r.end, "date");
    if (r.client && norm(m.client) !== norm(r.client)) add(`${p}.client`, r.client, "company");
  });

  // 3. skills: every listed skill must appear in the master CV
  (tailored.skills || []).forEach((g, gi) =>
    (g.items || []).forEach((it, ii) => {
      if (!mNorm.includes(norm(it))) add(`skills[${gi}].items[${ii}]`, it, "skill");
    })
  );

  // 4. education, projects, certifications must match master entries
  (tailored.education || []).forEach((e, i) => {
    const ok = (master.education || []).some((m) => norm(m.degree) === norm(e.degree) && norm(m.institution) === norm(e.institution) && norm(m.year) === norm(e.year));
    if (!ok) add(`education[${i}]`, `${e.degree} — ${e.institution} (${e.year})`, "education");
  });
  (tailored.projects || []).forEach((p, i) => {
    if (!(master.projects || []).some((m) => norm(m.name) === norm(p.name))) add(`projects[${i}].name`, p.name, "project");
  });
  (tailored.certifications || []).forEach((c, i) => {
    if (!(master.certifications || []).some((m) => norm(m) === norm(c))) add(`certifications[${i}]`, c, "certification");
  });

  // 5. header identity fields
  for (const k of ["name", "email", "phone"]) {
    const t = tailored.header?.[k];
    if (t && norm(t) !== norm(master.header?.[k])) add(`header.${k}`, t, "header");
  }
  return { ok: issues.length === 0, issues };
}

export { MONTHS };

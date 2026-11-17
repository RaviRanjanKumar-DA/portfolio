// Accuracy guard: a tailored CV may only use facts that exist in the master CV.
// Deterministic (no AI). Checks numbers, dates, employers, titles, skills/tools, education, projects and header.
import { TOOLS, findTerms, termRegex } from "./keywords.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const NUM_WORDS = new Set(["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "fifteen", "twenty", "thirty", "forty", "fifty", "hundred", "hundreds", "thousand", "thousands", "dozen", "dozens", "million", "millions", "lakh", "lakhs", "crore", "crores", "double", "triple", "half"]);
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
    const f = norm(fact);
    const dup = issues.findIndex((i) => norm(i.fact) === f && (i.kind === kind || (kind === "skill" && i.kind === "skill")));
    if (dup === -1) issues.push({ path, fact, kind });
    else {
      if (String(fact) !== f) issues[dup].fact = fact; // keep the original spelling (e.g. "Snowflake")
      if (/\]$/.test(path) && !/\]$/.test(issues[dup].path)) issues[dup].path = path; // keep the most precise path
    }
  };
  const mText = cvToText(master);
  const mFacts = extractFacts(mText);
  const mWords = new Set((mText.match(/[A-Za-z][A-Za-z0-9&]*/g) || []).map((w) => w.toLowerCase()));

  // proper nouns / acronyms / spelled-out numbers in free text must exist in the master CV
  // words that may follow "at / ex- / former" — only real employers and clients
  const companyWords = new Set((master.experience || []).flatMap((r) => `${r.company} ${r.client || ""}`.match(/[A-Za-z][A-Za-z0-9&]*/g) || []).map((w) => w.toLowerCase()));
  const termCheck = (text, path) => {
    const claim = /\b(?:[Ee]x|[Ff]ormer|[Ff]ormerly|[Pp]reviously|[Ww]orked\s+at|[Aa]t)[\s-]+(?:at\s+)?([A-Z][A-Za-z0-9&]*)/g;
    for (const m of String(text).matchAll(claim)) if (!companyWords.has(m[1].toLowerCase())) add(path, m[1], "company");
    for (const sentence of String(text).split(/(?<=[.!?;:|])\s+|\n+/)) {
      const toks = sentence.match(/[A-Za-z][A-Za-z0-9&]*/g) || [];
      toks.forEach((tok, i) => {
        const low = tok.toLowerCase();
        if (mWords.has(low)) return;
        if (NUM_WORDS.has(low)) return add(path, tok, "number");
        const acronym = /^[A-Z][A-Z0-9&]+$/.test(tok);
        if (acronym || (i > 0 && /^[A-Z]/.test(tok))) add(path, tok, "term");
      });
    }
  };

  // 1. numbers / dates / tools anywhere in the tailored text
  const walk = (obj, path) => {
    if (typeof obj === "string") {
      const f = extractFacts(obj);
      f.numbers.filter((n) => !mFacts.numbers.includes(n)).forEach((n) => add(path, n, "number"));
      f.years.filter((y) => !mFacts.years.includes(y)).forEach((y) => add(path, y, "date"));
      f.terms.filter((t) => !mFacts.terms.includes(t)).forEach((t) => add(path, t, "skill"));
      if (!/^(https?:|mailto:)/i.test(obj.trim())) termCheck(obj, path);
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
      if (!termRegex(norm(it)).test(mText)) add(`skills[${gi}].items[${ii}]`, it, "skill");
    })
  );

  // 4. education, projects, certifications must match master entries
  (tailored.education || []).forEach((e, i) => {
    const ok = (master.education || []).some((m) => norm(m.degree) === norm(e.degree) && norm(m.institution) === norm(e.institution) && norm(m.year) === norm(e.year));
    if (!ok) add(`education[${i}]`, `${e.degree} — ${e.institution} (${e.year})`, "education");
  });
  (tailored.projects || []).forEach((p, i) => {
    const m = (master.projects || []).find((x) => norm(x.name) === norm(p.name));
    if (!m) add(`projects[${i}].name`, p.name, "project");
    else if (norm(p.link) !== norm(m.link)) add(`projects[${i}].link`, p.link || "(removed link)", "link");
  });
  (tailored.certifications || []).forEach((c, i) => {
    if (!(master.certifications || []).some((m) => norm(m) === norm(c))) add(`certifications[${i}]`, c, "certification");
  });

  // 5. header identity fields
  for (const k of Object.keys(tailored.header || {})) {
    const t = tailored.header[k];
    if (t && norm(t) !== norm(master.header?.[k])) add(`header.${k}`, t, "header");
  }
  return { ok: issues.length === 0, issues };
}

export { MONTHS };

// Coerce an AI-returned CV into the expected shape (arrays of strings etc.). Returns null when it is not a CV.
export function normalizeCv(o) {
  if (!o || typeof o !== "object" || Array.isArray(o) || !Array.isArray(o.experience)) return null;
  const str = (v) => (v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : typeof v === "object" ? "" : String(v));
  const arr = (v, sep = /\n/) => (Array.isArray(v) ? v.map(str) : typeof v === "string" ? v.split(sep).map((x) => x.trim()) : []).filter(Boolean);
  const objs = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) : []);
  const h = o.header && typeof o.header === "object" ? o.header : {};
  return {
    header: Object.fromEntries(["name", "title", "email", "phone", "location", "linkedin", "github", "portfolio"].map((k) => [k, str(h[k])])),
    summary: str(o.summary),
    experience: objs(o.experience).map((r) => ({ title: str(r.title), company: str(r.company), location: str(r.location), client: str(r.client), start: str(r.start), end: str(r.end), bullets: arr(r.bullets) })),
    skills: objs(o.skills).map((g) => ({ group: str(g.group), items: arr(g.items, /,|\n/) })),
    projects: objs(o.projects).map((p) => ({ name: str(p.name), tools: str(p.tools), description: str(p.description), link: str(p.link), date: str(p.date) })),
    education: objs(o.education).map((e) => ({ degree: str(e.degree), institution: str(e.institution), location: str(e.location), year: str(e.year) })),
    certifications: arr(o.certifications),
    achievements: arr(o.achievements)
  };
}

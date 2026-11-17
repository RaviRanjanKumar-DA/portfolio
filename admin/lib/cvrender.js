// Renders a structured CV as ATS-friendly HTML (single column, real text, standard headings).
import { esc, safeUrl } from "./esc.js";
import { durationLabel } from "./duration.js";

const link = (u, label) => { const s = safeUrl(u); return s ? `<a href="${esc(s)}">${esc(label || s.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a>` : ""; };

export function renderCV(cv = {}, template = "classic") {
  const h = cv.header || {};
  const contacts = [esc(h.phone), h.email ? `<a href="${esc(safeUrl("mailto:" + h.email))}">${esc(h.email)}</a>` : "", esc(h.location), link(h.linkedin, "LinkedIn"), link(h.github, "GitHub"), link(h.portfolio, "Portfolio")].filter(Boolean).join(" · ");
  const sec = (title, body) => (body ? `<section><h2>${title}</h2>${body}</section>` : "");
  const exp = (cv.experience || []).map((r) => `
    <div class="cv-role">
      <div class="cv-rh"><div><b>${esc(r.title)}</b> — ${esc(r.company)}${r.location ? `, ${esc(r.location)}` : ""}</div>
      <div class="cv-dates">${esc(r.start)} – ${esc(r.end)}${durationLabel(r.start, r.end) ? ` <span class="cv-dur">(${durationLabel(r.start, r.end)})</span>` : ""}</div></div>
      ${r.client ? `<div class="cv-client">Client: ${esc(r.client)}</div>` : ""}
      <ul>${(r.bullets || []).filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    </div>`).join("");
  const skills = (cv.skills || []).filter((g) => g.items?.length).map((g) => `<div class="cv-skill"><b>${esc(g.group)}:</b> ${g.items.map(esc).join(", ")}</div>`).join("");
  const projects = (cv.projects || []).map((p) => `<div class="cv-proj"><b>${esc(p.name)}</b>${p.tools ? ` <span class="cv-muted">(${esc(p.tools)})</span>` : ""}${p.date ? ` <span class="cv-muted">· ${esc(p.date)}</span>` : ""} — ${esc(p.description)} ${link(p.link, "link")}</div>`).join("");
  const edu = (cv.education || []).map((e) => `<div class="cv-rh"><div><b>${esc(e.degree)}</b> — ${esc(e.institution)}${e.location ? `, ${esc(e.location)}` : ""}</div><div class="cv-dates">${esc(e.year)}</div></div>`).join("");
  const list = (arr) => (arr?.length ? `<ul>${arr.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  return `<article class="cv cv-${template === "modern" ? "modern" : "classic"}">
    <header><h1>${esc(h.name)}</h1>${h.title ? `<div class="cv-title">${esc(h.title)}</div>` : ""}<div class="cv-contact">${contacts}</div></header>
    ${sec("Professional Summary", cv.summary ? `<p>${esc(cv.summary)}</p>` : "")}
    ${sec("Key Achievements", list(cv.achievements))}
    ${sec("Work Experience", exp)}
    ${sec("Skills", skills)}
    ${sec("Projects", projects)}
    ${sec("Education", edu)}
    ${sec("Certifications", list(cv.certifications))}
  </article>`;
}

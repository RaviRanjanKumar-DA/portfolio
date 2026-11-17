// CV Builder: master CV editor · tailor for a job (AI or manual) · accuracy guard · ATS · diff · print to PDF · versions
import { get, put, post, del, ai } from "../api.js";
import { h, raw, $, $$, toast, busy, confirmBox, setActions } from "../ui.js";
import { factGuard, cvToText } from "../../lib/factguard.js";
import { atsCheck } from "../../lib/ats.js";
import { renderCV } from "../../lib/cvrender.js";
import { wordDiff } from "../../lib/diff.js";
import { durationLabel } from "../../lib/duration.js";
import { fmtIST } from "../../lib/time.js";

const clone = (o) => JSON.parse(JSON.stringify(o));
const KIND_LABEL = { number: "Number not in master CV", date: "Date not in master CV", company: "Employer/client not in master CV", title: "Job title differs from master", skill: "Skill/tool not in master CV", education: "Education differs from master", project: "Project not in master CV", certification: "Certification not in master CV", header: "Contact detail differs" };

let S = null; // view state

export async function render(el) {
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const [m, apps, versions] = await Promise.all([get("/api/cv/master"), get("/api/applications"), get("/api/cv/versions")]);
  S = { master: m.json, masterUpdated: m.updated_at, apps, versions, tab: "master", tailored: null, appId: q.get("app") ? Number(q.get("app")) : null, jd: "", template: "classic", versionLabel: "", issues: [] };
  if (q.get("app")) S.tab = "tailor";
  if (q.get("version")) {
    const v = await get(`/api/cv/versions/${q.get("version")}`);
    Object.assign(S, { tab: "tailor", tailored: v.json, appId: v.application_id, template: v.template, versionLabel: v.label });
  }
  if (S.appId) S.jd = (await get(`/api/applications/${S.appId}`).catch(() => ({}))).jd_text || "";
  setActions("");
  paint(el);
}

function paint(el) {
  el.innerHTML = String(h`
    <div class="tabs" id="cvTabs">
      <button data-t="master" class="${S.tab === "master" ? "on" : ""}"><i class="fas fa-database"></i> Master CV</button>
      <button data-t="tailor" class="${S.tab === "tailor" ? "on" : ""}"><i class="fas fa-scissors"></i> Tailor for a job</button>
      <button data-t="versions" class="${S.tab === "versions" ? "on" : ""}"><i class="fas fa-clock-rotate-left"></i> Versions (${S.versions.length})</button>
    </div>
    <div id="tabBody"></div>`);
  $$("#cvTabs button").forEach((b) => (b.onclick = () => { S.tab = b.dataset.t; paint(el); }));
  const body = $("#tabBody");
  if (S.tab === "master") masterTab(body, el);
  else if (S.tab === "tailor") tailorTab(body, el);
  else versionsTab(body, el);
}

/* ── structured editor (used for master and tailored CV) ─────────────── */
function editor(cv, id) {
  const hd = cv.header || {};
  return h`<div class="form" id="${id}">
    <div class="form cols">
      ${["name", "title", "email", "phone", "location", "linkedin", "github", "portfolio"].map((k) => h`<label class="f">${k}<input class="in" data-p="header.${k}" value="${hd[k] || ""}"></label>`)}
    </div>
    <label class="f">Professional summary<textarea class="in" data-p="summary" rows="4">${cv.summary || ""}</textarea></label>
    <div class="row between"><b>Work experience</b><button class="btn sm" data-act="addRole" type="button"><i class="fas fa-plus"></i> Role</button></div>
    ${(cv.experience || []).map((r, i) => h`<div class="role-ed">
      <div class="row between mb"><b class="small">${r.title || "Role"} — ${r.company || ""} <span class="tiny">${durationLabel(r.start, r.end)}</span></b>
        <div class="row" style="gap:4px"><button class="icon-btn" data-act="up" data-i="${i}" type="button" title="Move up"><i class="fas fa-arrow-up"></i></button>
        <button class="icon-btn" data-act="delRole" data-i="${i}" type="button" title="Remove role"><i class="fas fa-trash"></i></button></div></div>
      <div class="form cols">
        <label class="f">Title<input class="in" data-p="experience.${i}.title" value="${r.title || ""}"></label>
        <label class="f">Company<input class="in" data-p="experience.${i}.company" value="${r.company || ""}"></label>
        <label class="f">Location<input class="in" data-p="experience.${i}.location" value="${r.location || ""}"></label>
        <label class="f">Client (optional)<input class="in" data-p="experience.${i}.client" value="${r.client || ""}"></label>
        <label class="f">Start (e.g. May 2025)<input class="in" data-p="experience.${i}.start" value="${r.start || ""}"></label>
        <label class="f">End (e.g. Mar 2025 or Present)<input class="in" data-p="experience.${i}.end" value="${r.end || ""}"></label>
        <label class="f full">Bullets — one per line<textarea class="in" data-p="experience.${i}.bullets" data-type="lines" rows="${Math.min(14, (r.bullets || []).length + 2)}">${(r.bullets || []).join("\n")}</textarea></label>
      </div></div>`)}
    <div class="row between"><b>Skills</b><button class="btn sm" data-act="addSkill" type="button"><i class="fas fa-plus"></i> Group</button></div>
    ${(cv.skills || []).map((g, i) => h`<div class="form cols"><label class="f">Group<input class="in" data-p="skills.${i}.group" value="${g.group}"></label>
      <label class="f">Items (comma separated)<input class="in" data-p="skills.${i}.items" data-type="csv" value="${(g.items || []).join(", ")}"></label></div>`)}
    <div class="row between"><b>Projects</b><button class="btn sm" data-act="addProject" type="button"><i class="fas fa-plus"></i> Project</button></div>
    ${(cv.projects || []).map((p, i) => h`<div class="role-ed"><div class="form cols">
      <label class="f">Name<input class="in" data-p="projects.${i}.name" value="${p.name}"></label>
      <label class="f">Tools<input class="in" data-p="projects.${i}.tools" value="${p.tools || ""}"></label>
      <label class="f full">Description<input class="in" data-p="projects.${i}.description" value="${p.description || ""}"></label>
      <label class="f">Link<input class="in" data-p="projects.${i}.link" value="${p.link || ""}"></label>
      <label class="f">Date<div class="row"><input class="in" style="flex:1" data-p="projects.${i}.date" value="${p.date || ""}"><button class="icon-btn" data-act="delProject" data-i="${i}" type="button"><i class="fas fa-trash"></i></button></div></label>
    </div></div>`)}
    <b>Education</b>
    ${(cv.education || []).map((e, i) => h`<div class="form cols">
      <label class="f">Degree<input class="in" data-p="education.${i}.degree" value="${e.degree}"></label>
      <label class="f">Institution<input class="in" data-p="education.${i}.institution" value="${e.institution}"></label>
      <label class="f">Location<input class="in" data-p="education.${i}.location" value="${e.location || ""}"></label>
      <label class="f">Year<input class="in" data-p="education.${i}.year" value="${e.year}"></label></div>`)}
    <label class="f">Key achievements — one per line<textarea class="in" data-p="achievements" data-type="lines" rows="4">${(cv.achievements || []).join("\n")}</textarea></label>
    <label class="f">Certifications — one per line<textarea class="in" data-p="certifications" data-type="lines" rows="2">${(cv.certifications || []).join("\n")}</textarea></label>
  </div>`;
}

function setPath(obj, path, val) {
  const ks = path.split(".");
  let o = obj;
  ks.slice(0, -1).forEach((k) => { o = o[/^\d+$/.test(k) ? Number(k) : k] ??= {}; });
  o[ks.at(-1)] = val;
}
function bindEditor(root, cv, onChange, rerender) {
  root.addEventListener("input", (e) => {
    const t = e.target.closest("[data-p]"); if (!t) return;
    const v = t.dataset.type === "lines" ? t.value.split("\n").map((x) => x.trim()).filter(Boolean) : t.dataset.type === "csv" ? t.value.split(",").map((x) => x.trim()).filter(Boolean) : t.value;
    setPath(cv, t.dataset.p, v);
    onChange?.();
  });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const i = Number(b.dataset.i);
    const act = b.dataset.act;
    if (act === "addRole") (cv.experience ||= []).unshift({ title: "", company: "", location: "", client: "", start: "", end: "Present", bullets: [] });
    if (act === "delRole") cv.experience.splice(i, 1);
    if (act === "up" && i > 0) [cv.experience[i - 1], cv.experience[i]] = [cv.experience[i], cv.experience[i - 1]];
    if (act === "addSkill") (cv.skills ||= []).push({ group: "New group", items: [] });
    if (act === "addProject") (cv.projects ||= []).push({ name: "", tools: "", description: "", link: "", date: "" });
    if (act === "delProject") cv.projects.splice(i, 1);
    onChange?.(); rerender();
  });
}

/* ── Master tab ──────────────────────────────────────────────────────── */
function masterTab(body, el) {
  const draft = clone(S.master);
  body.innerHTML = String(h`
    <div class="grid g-side">
      <div class="card"><div class="row between mb"><h3 style="margin:0"><i class="fas fa-database"></i> Master CV — the single source of truth</h3><span class="tiny">updated ${fmtIST(S.masterUpdated)}</span></div>
        <p class="small muted mb">Tailored CVs may only use facts from here. Keep it complete and 100% true.</p>
        <div id="medWrap">${editor(draft, "med")}</div>
        <div class="row mt"><button class="btn primary" id="saveMaster"><i class="fas fa-floppy-disk"></i> Save master CV</button></div>
      </div>
      <div class="card" style="align-self:start;position:sticky;top:80px"><h3><i class="fas fa-eye"></i> Preview</h3><div class="cv-mini" id="mPrev"></div>
        <div class="row mt"><button class="btn" id="mPrint"><i class="fas fa-print"></i> Print / Save as PDF</button></div></div>
    </div>`);
  const prev = () => ($("#mPrev").innerHTML = renderCV(draft, "classic"));
  const rerender = () => { $("#medWrap").innerHTML = String(editor(draft, "med")); };
  bindEditor($("#medWrap"), draft, prev, rerender);
  prev();
  $("#saveMaster").onclick = (e) => busy(e.currentTarget, async () => { await put("/api/cv/master", { json: draft }); S.master = clone(draft); S.masterUpdated = new Date().toISOString(); toast("Master CV saved", "ok"); });
  $("#mPrint").onclick = () => printCV(draft, "classic");
}

/* ── Tailor tab ──────────────────────────────────────────────────────── */
function tailorTab(body, el) {
  body.innerHTML = String(h`
    <div class="card mb"><div class="form cols">
      <label class="f">Application<select class="in" id="tApp"><option value="">— None / paste a job description —</option>${S.apps.map((a) => h`<option value="${a.id}" ${a.id === S.appId ? "selected" : ""}>${a.company} — ${a.role}</option>`)}</select></label>
      <label class="f">Layout<select class="in" id="tTpl"><option value="classic" ${S.template === "classic" ? "selected" : ""}>Classic</option><option value="modern" ${S.template === "modern" ? "selected" : ""}>Modern</option></select></label>
      <label class="f full">Job description<textarea class="in" id="tJd" rows="5" placeholder="Paste the JD (filled automatically when you pick an application)">${S.jd}</textarea></label>
      <div class="row full"><button class="btn ai" id="tAi"><i class="fas fa-wand-magic-sparkles"></i> Tailor with AI</button>
        <button class="btn" id="tManual"><i class="fas fa-hand"></i> Start from master (manual)</button>
        <span class="tiny">AI may only reorder/rephrase. Every fact is checked against the master CV.</span></div>
    </div></div>
    <div id="tWork"></div>`);
  $("#tApp").onchange = async (e) => {
    S.appId = e.target.value ? Number(e.target.value) : null;
    if (S.appId) { S.jd = (await get(`/api/applications/${S.appId}`)).jd_text || ""; $("#tJd").value = S.jd; }
    work();
  };
  $("#tJd").oninput = (e) => { S.jd = e.target.value; ats(); };
  $("#tTpl").onchange = (e) => { S.template = e.target.value; preview(); };
  $("#tManual").onclick = () => { S.tailored = clone(S.master); S.versionLabel = ""; work(); };
  $("#tAi").onclick = (e) => busy(e.currentTarget, async () => {
    if (!S.jd.trim()) throw new Error("Pick an application or paste a job description");
    const r = await ai("tailor_cv", { application_id: S.appId, app: { jd_text: S.jd } });
    if (!r.json?.experience) throw new Error("AI did not return a CV. Try again.");
    S.tailored = r.json; S.versionLabel = "";
    work();
    toast(S.issues.length ? `${S.issues.length} accuracy issue(s) found — fix them before saving` : "Tailored CV passed the accuracy check ✓", S.issues.length ? "warn" : "ok", 6000);
  });
  work();

  function work() {
    const w = $("#tWork");
    if (!S.tailored) { w.innerHTML = String(h`<div class="card empty"><i class="fas fa-scissors"></i>Tailor with AI, or start from the master CV and edit by hand.</div>`); return; }
    const app = S.apps.find((a) => a.id === S.appId);
    if (!S.versionLabel) S.versionLabel = app ? `${app.company} — ${app.role}` : `Tailored ${new Date().toISOString().slice(0, 10)}`;
    w.innerHTML = String(h`
      <div class="grid g-side">
        <div class="grid" style="align-content:start">
          <div class="card"><h3><i class="fas fa-shield-halved"></i> Accuracy guard</h3><div id="guard"></div></div>
          <div class="card"><h3><i class="fas fa-code-compare"></i> Changes vs master</h3><div id="diff" class="diff"></div></div>
          <div class="card"><h3><i class="fas fa-pen"></i> Edit tailored CV</h3><div id="tedWrap">${editor(S.tailored, "ted")}</div></div>
        </div>
        <div class="grid" style="align-content:start;position:sticky;top:80px">
          <div class="card"><h3><i class="fas fa-bullseye"></i> ATS keyword match</h3><div id="ats"></div></div>
          <div class="card"><h3><i class="fas fa-eye"></i> Preview</h3><div class="cv-mini" id="tPrev"></div>
            <div class="form mt"><label class="f">Version name<input class="in" id="vLabel" value="${S.versionLabel}"></label></div>
            <div class="row mt"><button class="btn primary" id="saveV"><i class="fas fa-floppy-disk"></i> Save version</button><button class="btn" id="tPrint"><i class="fas fa-print"></i> Print / PDF</button></div>
            <p class="tiny mt-s" id="saveHint"></p></div>
        </div>
      </div>`);
    const rerender = () => { $("#tedWrap").innerHTML = String(editor(S.tailored, "ted")); };
    bindEditor($("#tedWrap"), S.tailored, refresh, rerender);
    $("#vLabel").oninput = (e) => (S.versionLabel = e.target.value);
    $("#tPrint").onclick = () => { if (S.issues.length && !confirm("This CV has unresolved accuracy issues. Print anyway?")) return; printCV(S.tailored, S.template); };
    $("#saveV").onclick = (e) => busy(e.currentTarget, async () => {
      if (S.issues.length) throw new Error("Fix the accuracy issues first");
      const r = await post("/api/cv/versions", { application_id: S.appId, label: S.versionLabel || "Tailored CV", template: S.template, json: S.tailored });
      S.versions = await get("/api/cv/versions");
      toast(`Version saved (#${r.id})${S.appId ? " and added to the application history" : ""}`, "ok");
    });
    refresh();
  }
  function refresh() { guard(); diff(); ats(); preview(); }
  function guard() {
    const g = factGuard(S.master, S.tailored);
    S.issues = g.issues;
    const box = $("#guard"); if (!box) return;
    box.innerHTML = String(g.ok ? h`<div class="guard-ok"><i class="fas fa-circle-check"></i> Every number, date, employer, title, skill and degree matches your master CV.</div>`
      : h`<div class="issues">${g.issues.map((it, i) => h`<div class="issue"><i class="fas fa-triangle-exclamation"></i><div class="grow"><b>${it.fact}</b><div class="tiny">${KIND_LABEL[it.kind] || it.kind} · ${it.path}</div></div>
          <button class="btn sm" data-fix="${i}">${fixLabel(it)}</button></div>`)}</div>
        <p class="tiny mt-s">If a flagged fact is true, add it to the <b>Master CV</b> first — then it will pass.</p>`);
    $$("[data-fix]", box).forEach((b) => (b.onclick = () => { fix(S.issues[b.dataset.fix]); rerenderEditor(); refresh(); }));
    const btn = $("#saveV"); if (btn) btn.disabled = !g.ok;
    const hint = $("#saveHint"); if (hint) hint.textContent = g.ok ? "" : "Saving is blocked until all accuracy issues are resolved.";
  }
  function rerenderEditor() { const w = $("#tedWrap"); if (w) w.innerHTML = String(editor(S.tailored, "ted")); }
  function diff() {
    const box = $("#diff"); if (!box) return;
    const parts = [];
    parts.push(h`<div class="small"><b>Summary</b></div><p>${raw(wordDiff(S.master.summary, S.tailored.summary))}</p>`);
    for (const r of S.tailored.experience || []) {
      const m = (S.master.experience || []).find((x) => x.company.toLowerCase() === String(r.company).toLowerCase());
      const kept = (r.bullets || []).length, total = m ? m.bullets.length : 0;
      parts.push(h`<div class="small mt"><b>${r.title} — ${r.company}</b> <span class="tiny">${kept}/${total} bullets kept</span></div>
        <ul style="margin-left:18px">${(r.bullets || []).map((b) => { const best = m ? closest(b, m.bullets) : ""; return h`<li>${raw(wordDiff(best, b))}</li>`; })}</ul>`);
    }
    box.innerHTML = String(h`${parts}`);
  }
  function ats() {
    const box = $("#ats"); if (!box || !S.tailored) return;
    if (!S.jd.trim()) { box.innerHTML = '<p class="muted small">Add a job description to see keyword coverage.</p>'; return; }
    const r = atsCheck(S.jd, cvToText(S.tailored)), rm = atsCheck(S.jd, cvToText(S.master));
    box.innerHTML = String(h`<div class="row" style="gap:14px"><div class="score-ring" style="--p:${r.score}">${r.score}%</div>
      <div class="small muted">Tailored CV vs job.<br>Master CV scores ${rm.score}%.</div></div>
      <div class="kw mt">${r.found.map((k) => h`<span class="ok">${k}</span>`)}${r.missing.map((k) => h`<span class="no">${k}</span>`)}</div>
      ${r.missing.length ? h`<p class="tiny mt-s">Red keywords are missing. Only add them to the master CV if you genuinely have that skill.</p>` : ""}`);
  }
  function preview() { const p = $("#tPrev"); if (p && S.tailored) p.innerHTML = renderCV(S.tailored, S.template); }
}

function closest(b, list) {
  const words = new Set(String(b).toLowerCase().split(/\W+/));
  let best = "", score = -1;
  for (const x of list) { const s = String(x).toLowerCase().split(/\W+/).filter((w) => words.has(w)).length; if (s > score) { score = s; best = x; } }
  return best;
}

const fixLabel = (it) => (/^(summary|header\.)/.test(it.path) || /\.(title|start|end|client)$/.test(it.path) ? "Revert to master" : "Remove");
function fix(it) {
  const t = S.tailored;
  const tok = it.path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  if (tok[0] === "summary") { t.summary = S.master.summary; return; }
  if (tok[0] === "header") { t.header[tok[1]] = S.master.header[tok[1]]; return; }
  if (tok[0] === "experience") {
    const i = Number(tok[1]), r = t.experience[i];
    const m = S.master.experience.find((x) => x.company.toLowerCase() === String(r.company).toLowerCase());
    if (tok[2] === "bullets") { r.bullets.splice(Number(tok[3]), 1); return; }
    if (["title", "start", "end", "client"].includes(tok[2]) && m) { r[tok[2]] = m[tok[2]]; return; }
    t.experience.splice(i, 1); return;
  }
  if (tok[0] === "skills") { if (tok[2] === "items") t.skills[Number(tok[1])].items.splice(Number(tok[3]), 1); else t.skills.splice(Number(tok[1]), 1); return; }
  if (["projects", "education", "certifications", "achievements"].includes(tok[0])) { t[tok[0]].splice(Number(tok[1]), 1); return; }
}

/* ── Versions tab ────────────────────────────────────────────────────── */
function versionsTab(body, el) {
  body.innerHTML = String(S.versions.length ? h`<div class="table-wrap"><table class="t"><thead><tr><th>Version</th><th>Application</th><th>Layout</th><th>Saved (IST)</th><th></th></tr></thead><tbody>
    ${S.versions.map((v) => h`<tr><td><b>${v.label}</b></td><td>${v.company ? h`<a href="#/applications/${v.application_id}">${v.company} — ${v.role}</a>` : "—"}</td><td>${v.template}</td><td>${fmtIST(v.created_at)}</td>
      <td style="text-align:right;white-space:nowrap"><a class="btn sm" href="#/cv?version=${v.id}">Open</a> <button class="btn sm" data-print="${v.id}"><i class="fas fa-print"></i></button> <button class="btn sm danger" data-del="${v.id}"><i class="fas fa-trash"></i></button></td></tr>`)}
    </tbody></table></div>` : h`<div class="card empty"><i class="fas fa-clock-rotate-left"></i>No saved versions yet.</div>`);
  $$("[data-print]", body).forEach((b) => (b.onclick = async () => { const v = await get(`/api/cv/versions/${b.dataset.print}`); printCV(v.json, v.template); }));
  $$("[data-del]", body).forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox("Delete version?", "This saved CV version will be deleted.", "Delete", true))) return;
    await del(`/api/cv/versions/${b.dataset.del}`); S.versions = await get("/api/cv/versions"); paint(el);
  }));
  // re-render when opened from a link
  if (location.hash.includes("version=")) return;
}

function printCV(cv, template) {
  const area = document.getElementById("print-area");
  area.innerHTML = renderCV(cv, template);
  document.body.classList.add("print-cv");
  const name = (cv.header?.name || "CV").replace(/\s+/g, "_");
  const old = document.title; document.title = `${name}_CV`;
  const done = () => { document.body.classList.remove("print-cv"); document.title = old; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 50);
}

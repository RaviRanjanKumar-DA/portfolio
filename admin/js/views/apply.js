// Apply wizard: job → fit check → channel (Email via Gmail, or portal message) → save + history.
import { get, post, put, ai } from "../api.js";
import { h, $, $$, toast, copy, busy, gmailUrl, mailtoUrl, addDays, dayToIso, confirmBox } from "../ui.js";
import { PLATFORMS } from "../../lib/stats.js";
import { atsCheck } from "../../lib/ats.js";
import { cvToText } from "../../lib/factguard.js";
import { fillTemplate, standardVars } from "../../lib/template.js";
import { profile, templates, logEvent } from "./compose.js";

const PORTAL_KINDS = [
  { key: "recruiter_message", label: "Recruiter message", tpl: ["naukri_message", "linkedin_inmail"] },
  { key: "linkedin_note", label: "LinkedIn note (≤300)", tpl: ["linkedin_note"], limit: 300 },
  { key: "cover_letter", label: "Cover letter", tpl: ["cover_letter"] }
];

export async function render(el) {
  const [prof, tpls, master] = await Promise.all([profile(), templates(true), get("/api/cv/master")]);
  const state = { id: null, channel: "Email", portalKind: "recruiter_message", savedDocs: new Set() };

  el.innerHTML = String(h`
  <div class="grid g-side">
    <div class="grid" style="align-content:start">
      <div class="card">
        <div class="step-h"><span class="n">1</span><h3 style="margin:0">Job details</h3></div>
        <div class="form cols">
          <label class="f full">Job link (Naukri / LinkedIn / company page)<input class="in" id="job_url" placeholder="https://…"></label>
          <label class="f full">Job description — paste the full text<textarea class="in" id="jd_text" rows="8" placeholder="Paste the job post here…"></textarea></label>
          <div class="full row"><button class="btn ai" id="extractBtn"><i class="fas fa-wand-magic-sparkles"></i> Fill details with AI</button><span class="tiny">or fill the fields yourself</span></div>
          <label class="f">Company *<input class="in" id="company"></label>
          <label class="f">Role *<input class="in" id="role"></label>
          <label class="f">Platform<select class="in" id="platform">${PLATFORMS.map((p) => h`<option>${p}</option>`)}</select></label>
          <label class="f">Location<input class="in" id="location"></label>
          <label class="f">Work mode<select class="in" id="work_mode"><option value="">—</option><option>onsite</option><option>hybrid</option><option>remote</option></select></label>
          <label class="f">Salary / CTC<input class="in" id="salary"></label>
          <label class="f">Recruiter / hiring manager<input class="in" id="contact_name"></label>
          <label class="f">Recruiter email<input class="in" id="contact_email" type="email"></label>
        </div>
      </div>

      <div class="card">
        <div class="step-h"><span class="n">2</span><h3 style="margin:0">Apply</h3></div>
        <div class="tabs" id="chTabs"><button data-ch="Email" class="on"><i class="fas fa-envelope"></i> Email (Gmail)</button><button data-ch="Portal"><i class="fas fa-globe"></i> Naukri / LinkedIn / other portal</button></div>

        <div id="chEmail" class="form">
          <div class="row"><select class="in" id="eTpl" style="flex:1"><option value="">— Template —</option>${tpls.filter((t) => t.kind === "email").map((t) => h`<option value="${t.id}">${t.name}</option>`)}</select>
            <button class="btn ai" id="eAi"><i class="fas fa-wand-magic-sparkles"></i> Write with AI</button></div>
          <label class="f">To<input class="in" id="eTo" placeholder="recruiter@company.com"></label>
          <label class="f">Subject<input class="in" id="eSub"></label>
          <label class="f">Body<textarea class="in" id="eBody" rows="11"></textarea></label>
          <p class="tiny"><i class="fas fa-paperclip"></i> Your resume link is in the template. For a tailored PDF, use CV Builder → Print / Save as PDF, then attach it in Gmail.</p>
          <div class="row"><button class="btn primary" id="gmailBtn"><i class="fab fa-google"></i> Open in Gmail</button>
            <button class="btn" id="mailtoBtn"><i class="fas fa-envelope-open-text"></i> Default mail app</button>
            <button class="btn" id="eCopy"><i class="fas fa-copy"></i> Copy</button>
            <button class="btn ghost" id="eSaveDoc"><i class="fas fa-bookmark"></i> Save draft</button></div>
        </div>

        <div id="chPortal" class="form hide">
          <div class="tabs" id="pkTabs">${PORTAL_KINDS.map((k, i) => h`<button data-k="${k.key}" class="${i === 0 ? "on" : ""}">${k.label}</button>`)}</div>
          <div class="row"><select class="in" id="pTpl" style="flex:1"></select><button class="btn ai" id="pAi"><i class="fas fa-wand-magic-sparkles"></i> Write with AI</button></div>
          <textarea class="in" id="pText" rows="11" placeholder="Message / cover letter…"></textarea>
          <div class="counter" id="pCount"></div>
          <div class="row"><button class="btn primary" id="pCopy"><i class="fas fa-copy"></i> Copy text</button>
            <button class="btn" id="pOpen"><i class="fas fa-up-right-from-square"></i> Open job link</button>
            <button class="btn ghost" id="pSaveDoc"><i class="fas fa-bookmark"></i> Save draft</button></div>
          <p class="tiny">Paste the text in the portal's apply form or message box, submit there, then click <b>Mark as applied</b>.</p>
        </div>
      </div>

      <div class="card">
        <div class="step-h"><span class="n">3</span><h3 style="margin:0">Save to tracker</h3></div>
        <div class="form cols">
          <label class="f">Follow-up reminder<input class="in" type="date" id="follow" value="${addDays(7)}"></label>
          <label class="f">Notes<input class="in" id="notes" placeholder="optional"></label>
        </div>
        <div class="row mt"><button class="btn" id="saveBtn"><i class="fas fa-bookmark"></i> Save (not applied yet)</button>
          <button class="btn primary" id="appliedBtn"><i class="fas fa-circle-check"></i> Mark as applied</button>
          <span id="savedInfo" class="tiny"></span></div>
      </div>
    </div>

    <div class="grid" style="align-content:start">
      <div class="card"><h3><i class="fas fa-bullseye"></i> Fit check</h3>
        <div class="row" style="gap:16px;align-items:center">
          <div class="score-ring" id="ring" style="--p:0"><span id="ats">—</span></div>
          <div class="small muted">ATS keyword match of your <b>master CV</b> against this job (calculated locally, no AI).</div>
        </div>
        <div class="mt-s small"><b>Found</b></div><div class="kw mt-s" id="kwFound"><span class="tiny">Paste a job description…</span></div>
        <div class="mt-s small"><b>Missing</b> <span class="tiny">(add to the CV only if you really have them)</span></div><div class="kw mt-s" id="kwMissing"></div>
        <button class="btn ai sm mt" id="matchBtn"><i class="fas fa-wand-magic-sparkles"></i> AI match analysis</button>
        <div id="matchOut" class="small mt-s"></div>
      </div>
      <div class="card"><h3><i class="fas fa-lightbulb"></i> Flow</h3>
        <ol class="small muted" style="padding-left:18px;display:grid;gap:6px">
          <li>Paste the job description → AI fills company, role, recruiter email.</li>
          <li>Email: AI or a template writes the mail → <b>Open in Gmail</b> → Send.</li>
          <li>Portal: copy the message → open the job link → apply there.</li>
          <li><b>Mark as applied</b> → it is saved with date &amp; time and a follow-up reminder.</li>
        </ol>
      </div>
    </div>
  </div>`);

  const F = ["job_url", "jd_text", "company", "role", "platform", "location", "work_mode", "salary", "contact_name", "contact_email"];
  const appData = () => Object.fromEntries(F.map((k) => [k, $("#" + k).value.trim()]));
  const vars = () => standardVars(prof, appData());

  // live ATS
  const runAts = () => {
    const jd = $("#jd_text").value;
    if (jd.trim().length < 30) return;
    const r = atsCheck(jd, cvToText(master.json));
    $("#ats").textContent = r.found.length + r.missing.length ? r.score + "%" : "—";
    $("#ring").style.setProperty("--p", r.score);
    $("#kwFound").innerHTML = String(h`${r.found.map((k) => h`<span class="ok">${k}</span>`)}` ) || '<span class="tiny">none</span>';
    $("#kwMissing").innerHTML = String(h`${r.missing.map((k) => h`<span class="no">${k}</span>`)}`) || '<span class="tiny">none 🎉</span>';
  };
  let t; $("#jd_text").oninput = () => { clearTimeout(t); t = setTimeout(runAts, 300); };
  $("#job_url").onchange = () => {
    const u = $("#job_url").value;
    const p = /naukri\.com/i.test(u) ? "Naukri" : /linkedin\.com/i.test(u) ? "LinkedIn" : /indeed\./i.test(u) ? "Indeed" : /instahyre/i.test(u) ? "Instahyre" : /foundit|monsterindia/i.test(u) ? "Foundit" : null;
    if (p) { $("#platform").value = p; setChannel("Portal"); }
  };
  $("#contact_email").onchange = () => { if (!$("#eTo").value) $("#eTo").value = $("#contact_email").value; };

  $("#extractBtn").onclick = (e) => busy(e.currentTarget, async () => {
    if ($("#jd_text").value.trim().length < 30) throw new Error("Paste the job description first");
    const r = await ai("extract_job", { app: { jd_text: $("#jd_text").value } });
    const j = r.json || {};
    for (const k of ["company", "role", "location", "salary", "contact_name", "contact_email"]) if (j[k] && !$("#" + k).value) $("#" + k).value = j[k];
    if (["onsite", "hybrid", "remote"].includes(j.work_mode)) $("#work_mode").value = j.work_mode;
    if (j.contact_email && !$("#eTo").value) $("#eTo").value = j.contact_email;
    toast(r.mock ? "Filled (mock AI)" : "Details filled — please check them", r.mock ? "warn" : "ok");
    runAts();
  });
  $("#matchBtn").onclick = (e) => busy(e.currentTarget, async () => {
    const r = await ai("match_score", { app: appData() });
    const j = r.json || {};
    $("#matchOut").innerHTML = String(h`<div><b>AI score: ${j.score ?? "?"}/100</b></div>
      ${j.strengths?.length ? h`<div class="mt-s">✅ ${j.strengths.join(" · ")}</div>` : ""}${j.gaps?.length ? h`<div class="mt-s">⚠️ ${j.gaps.join(" · ")}</div>` : ""}${j.advice ? h`<div class="mt-s muted">${j.advice}</div>` : ""}`);
    state.matchScore = Number(j.score) || null;
  });

  // channel tabs
  const setChannel = (ch) => {
    state.channel = ch;
    $$("#chTabs button").forEach((b) => b.classList.toggle("on", b.dataset.ch === ch));
    $("#chEmail").classList.toggle("hide", ch !== "Email");
    $("#chPortal").classList.toggle("hide", ch !== "Portal");
    if (ch === "Email" && $("#platform").value !== "Email" && !/naukri|linkedin/i.test($("#job_url").value)) $("#platform").value = "Email";
  };
  $$("#chTabs button").forEach((b) => (b.onclick = () => setChannel(b.dataset.ch)));

  // email
  $("#eTpl").onchange = (e) => { const tp = tpls.find((x) => String(x.id) === e.target.value); if (tp) { $("#eSub").value = fillTemplate(tp.subject || "", vars()); $("#eBody").value = fillTemplate(tp.body, vars()); } };
  $("#eAi").onclick = (e) => busy(e.currentTarget, async () => {
    if (!$("#company").value.trim() || !$("#role").value.trim()) throw new Error("Fill company and role first");
    const r = await ai("email_apply", { app: appData() });
    $("#eSub").value = r.json?.subject || ""; $("#eBody").value = r.json?.body || "";
    state.aiUsed = "email";
  });
  const emailVals = () => ({ to: $("#eTo").value.trim(), subject: $("#eSub").value, body: $("#eBody").value });
  $("#gmailBtn").onclick = async (e) => {
    const v = emailVals();
    if (!v.body.trim()) return toast("Write the email first (template or AI)", "warn");
    window.open(gmailUrl(v), "_blank", "noopener");
    await afterOpen(`Email opened in Gmail${v.to ? " to " + v.to : ""}: "${v.subject}"`, "email_opened");
  };
  $("#mailtoBtn").onclick = async () => { const v = emailVals(); location.href = mailtoUrl(v); await afterOpen(`Email opened in mail app: "${v.subject}"`, "email_opened"); };
  $("#eCopy").onclick = async () => { const v = emailVals(); await copy(`Subject: ${v.subject}\n\n${v.body}`); if (state.id) await logEvent(state.id, "message_copied", "Email text copied"); };
  $("#eSaveDoc").onclick = (e) => saveDoc(e.currentTarget, "email", `Subject: ${$("#eSub").value}\n\n${$("#eBody").value}`);

  // portal
  const fillPortalTpl = () => {
    const kind = PORTAL_KINDS.find((k) => k.key === state.portalKind);
    const list = tpls.filter((x) => kind.tpl.includes(x.kind));
    $("#pTpl").innerHTML = String(h`<option value="">— Template —</option>${list.map((x) => h`<option value="${x.id}">${x.name}</option>`)}`);
    count();
  };
  const count = () => {
    const kind = PORTAL_KINDS.find((k) => k.key === state.portalKind);
    const n = $("#pText").value.length;
    $("#pCount").textContent = kind.limit ? `${n} / ${kind.limit} characters` : `${n} characters`;
    $("#pCount").classList.toggle("bad", !!kind.limit && n > kind.limit);
  };
  $$("#pkTabs button").forEach((b) => (b.onclick = () => { state.portalKind = b.dataset.k; $$("#pkTabs button").forEach((x) => x.classList.toggle("on", x === b)); fillPortalTpl(); }));
  $("#pTpl").onchange = (e) => { const tp = tpls.find((x) => String(x.id) === e.target.value); if (tp) { $("#pText").value = fillTemplate(tp.body, vars()); count(); } };
  $("#pText").oninput = count;
  $("#pAi").onclick = (e) => busy(e.currentTarget, async () => {
    if (!$("#company").value.trim() || !$("#role").value.trim()) throw new Error("Fill company and role first");
    const r = await ai(state.portalKind, { app: appData() });
    $("#pText").value = r.text.trim(); count();
  });
  $("#pCopy").onclick = async () => { if (!$("#pText").value.trim()) return toast("Nothing to copy yet", "warn"); await copy($("#pText").value); await ensureSaved(); await logEvent(state.id, "message_copied", `${PORTAL_KINDS.find((k) => k.key === state.portalKind).label} copied`); };
  $("#pOpen").onclick = () => { const u = $("#job_url").value.trim(); if (!/^https?:\/\//i.test(u)) return toast("Add the job link first", "warn"); window.open(u, "_blank", "noopener"); };
  $("#pSaveDoc").onclick = (e) => saveDoc(e.currentTarget, state.portalKind, $("#pText").value);
  fillPortalTpl();

  // save / applied
  async function ensureSaved(status) {
    const d = appData();
    if (!d.company || !d.role) throw new Error("Company and role are required");
    const body = { ...d, notes: $("#notes").value.trim() || null, follow_up_at: dayToIso($("#follow").value), match_score: state.matchScore ?? null };
    if (!state.id && state.creating) await state.creating; // a create is already in flight: reuse it
    if (!state.id) {
      state.creating = post("/api/applications", { ...body, status: status || "saved" });
      try { state.id = (await state.creating).id; } finally { state.creating = null; }
    } else {
      await put(`/api/applications/${state.id}`, status ? { ...body, status } : body);
    }
    $("#savedInfo").innerHTML = String(h`Saved · <a href="#/applications/${state.id}">open record</a>`);
    return state.id;
  }
  async function afterOpen(detail, type) {
    try {
      await ensureSaved();
      await logEvent(state.id, type, detail);
      if (await confirmBox("Did you send it?", "Mark this application as applied now? (You can also do it later.)", "Yes, mark applied")) await markApplied();
    } catch (e) { toast(e.message, "err"); }
  }
  async function markApplied() {
    await ensureSaved("applied");
    toast("Marked as applied ✓", "ok");
    location.hash = `#/applications/${state.id}`;
  }
  async function saveDoc(btn, kind, content) {
    if (!content.trim()) return toast("Nothing to save", "warn");
    await busy(btn, async () => { await ensureSaved(); await post(`/api/applications/${state.id}/documents`, { kind, content }); toast("Draft saved to the application", "ok"); });
  }
  $("#saveBtn").onclick = (e) => busy(e.currentTarget, async () => { await ensureSaved(); toast("Saved", "ok"); });
  $("#appliedBtn").onclick = (e) => busy(e.currentTarget, markApplied);

  // pick a default email template
  const firstEmail = tpls.find((x) => x.kind === "email");
  if (firstEmail) $("#eTpl").value = firstEmail.id;
  $("#company").onchange = $("#role").onchange = () => { if ($("#eTpl").value && !state.aiUsed) $("#eTpl").dispatchEvent(new Event("change")); };
}

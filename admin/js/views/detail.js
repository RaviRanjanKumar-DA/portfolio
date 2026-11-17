import { get, put, post, del } from "../api.js";
import { h, $, $$, setActions, safeHref, statusChip, toast, confirmBox, copy, busy, dayToIso } from "../ui.js";
import { STATUSES, PLATFORMS } from "../../lib/stats.js";
import { fmtIST, istDate } from "../../lib/time.js";
import { EVENT_ICON, eventText } from "./dashboard.js";
import { composeEmail } from "./compose.js";

export async function render(el, { id }) {
  const [a, events, docs, versions] = await Promise.all([
    get(`/api/applications/${id}`), get(`/api/applications/${id}/events`), get(`/api/applications/${id}/documents`), get(`/api/cv/versions?application_id=${id}`)
  ]);
  setActions(h`
    ${safeHref(a.job_url) ? h`<a class="btn" href="${safeHref(a.job_url)}" target="_blank" rel="noopener"><i class="fas fa-up-right-from-square"></i> Job link</a>` : ""}
    <button class="btn" id="mailBtn"><i class="fas fa-envelope"></i> Email</button>
    <a class="btn" href="#/cv?app=${a.id}"><i class="fas fa-file-lines"></i> Tailor CV</a>`);

  el.innerHTML = String(h`
  <div class="row between mb">
    <div><h2 style="font-size:22px">${a.company}</h2><div class="muted">${a.role} · ${a.platform}${a.location ? " · " + a.location : ""}</div></div>
    <div>${statusChip(a.status)}</div>
  </div>
  <div class="card mb"><h3><i class="fas fa-signs-post"></i> Status</h3>
    <div class="stepper" id="stepper">${STATUSES.map((s) => h`<button data-s="${s}" class="${s === a.status ? "on" : ""}">${s.replace("_", " ")}</button>`)}</div>
    <p class="tiny mt-s">Every change is saved to the history with date & time (IST).</p>
  </div>
  <div class="grid g-side">
    <div class="card"><h3><i class="fas fa-pen"></i> Details</h3>
      <form class="form cols" id="f">
        <label class="f">Company<input class="in" name="company" value="${a.company}" required></label>
        <label class="f">Role<input class="in" name="role" value="${a.role}" required></label>
        <label class="f">Platform<select class="in" name="platform">${PLATFORMS.map((p) => h`<option ${p === a.platform ? "selected" : ""}>${p}</option>`)}</select></label>
        <label class="f">Location<input class="in" name="location" value="${a.location || ""}"></label>
        <label class="f">Work mode<select class="in" name="work_mode">${["", "onsite", "hybrid", "remote"].map((m) => h`<option value="${m}" ${m === (a.work_mode || "") ? "selected" : ""}>${m || "—"}</option>`)}</select></label>
        <label class="f">Salary / CTC<input class="in" name="salary" value="${a.salary || ""}"></label>
        <label class="f">Contact name<input class="in" name="contact_name" value="${a.contact_name || ""}"></label>
        <label class="f">Contact email<input class="in" type="email" name="contact_email" value="${a.contact_email || ""}"></label>
        <label class="f">Applied on<input class="in" type="date" name="applied_day" value="${istDate(a.applied_at)}"></label>
        <label class="f">Follow-up on<input class="in" type="date" name="follow_day" value="${istDate(a.follow_up_at)}"></label>
        <label class="f">Match score (0–100)<input class="in" type="number" min="0" max="100" name="match_score" value="${a.match_score ?? ""}"></label>
        <label class="f">Tags<input class="in" name="tags" value="${a.tags || ""}" placeholder="referral, dream company"></label>
        <label class="f full">Job link<input class="in" name="job_url" value="${a.job_url || ""}"></label>
        <label class="f full">Job description<textarea class="in" name="jd_text" rows="6">${a.jd_text || ""}</textarea></label>
        <label class="f full">Notes<textarea class="in" name="notes" rows="3">${a.notes || ""}</textarea></label>
        <div class="row full"><button class="btn primary"><i class="fas fa-floppy-disk"></i> Save</button><span class="sp" style="flex:1"></span><button type="button" class="btn danger" id="delBtn"><i class="fas fa-trash"></i> Delete</button></div>
      </form>
    </div>
    <div class="grid" style="align-content:start">
      <div class="card"><h3><i class="fas fa-clock-rotate-left"></i> History</h3>
        <div class="row mb"><input class="in" id="note" placeholder="Add a note (e.g. HR call done)"><button class="btn sm" id="noteBtn">Add</button></div>
        <div class="tl">${events.slice().reverse().map((e) => h`<div class="tl-i"><span class="dot"><i class="fas ${EVENT_ICON[e.type] || "fa-circle"}"></i></span><div class="what">${eventText(e)}</div><div class="when">${fmtIST(e.created_at)}</div></div>`)}</div>
      </div>
      <div class="card"><h3><i class="fas fa-file-pen"></i> Saved drafts</h3>
        ${docs.length ? docs.map((d) => h`<details class="mt-s"><summary class="small"><b>${d.kind.replace(/_/g, " ")}</b> · <span class="tiny">${fmtIST(d.created_at)}</span></summary>
          <div class="preview mt-s">${d.content}</div><button class="btn sm mt-s" data-copy="${d.id}"><i class="fas fa-copy"></i> Copy</button></details>`) : h`<p class="muted small">AI drafts you save from the Apply page show up here.</p>`}
      </div>
      <div class="card"><h3><i class="fas fa-file-lines"></i> CV versions</h3>
        ${versions.length ? versions.map((v) => h`<div class="row between small mt-s"><span>${v.label}</span><a href="#/cv?version=${v.id}">Open</a></div>`) : h`<p class="muted small">No tailored CV yet. <a href="#/cv?app=${a.id}">Tailor one</a>.</p>`}
      </div>
    </div>
  </div>`);

  $$("#stepper button").forEach((b) => (b.onclick = async () => {
    if (b.dataset.s === a.status) return;
    $$("#stepper button").forEach((x) => (x.disabled = true));
    try { await put(`/api/applications/${id}`, { status: b.dataset.s }); toast(`Status → ${b.dataset.s.replace("_", " ")}`, "ok"); render(el, { id }); }
    catch (e) { toast(e.message, "err"); $$("#stepper button").forEach((x) => (x.disabled = false)); }
  }));
  $("#f").onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const body = { ...f, applied_at: f.applied_day ? (istDate(a.applied_at) === f.applied_day ? a.applied_at : dayToIso(f.applied_day)) : null, follow_up_at: dayToIso(f.follow_day) };
    delete body.applied_day; delete body.follow_day;
    busy(e.submitter, async () => { await put(`/api/applications/${id}`, body); toast("Saved", "ok"); render(el, { id }); });
  };
  $("#delBtn").onclick = async () => {
    if (!(await confirmBox("Delete application?", `${a.company} — ${a.role} and its whole history will be deleted. This cannot be undone.`, "Delete", true))) return;
    await del(`/api/applications/${id}`); toast("Deleted", "ok"); location.hash = "#/applications";
  };
  $("#noteBtn").onclick = (e) => busy(e.currentTarget, async () => {
    const v = $("#note").value.trim(); if (!v) return;
    await post(`/api/applications/${id}/events`, { type: "note", detail: v }); render(el, { id });
  });
  $$("[data-copy]").forEach((b) => (b.onclick = () => copy(docs.find((d) => String(d.id) === b.dataset.copy).content)));
  $("#mailBtn").onclick = async () => { const r = await composeEmail(a, { task: a.status === "saved" ? "email_apply" : "follow_up" }); if (r === "gmail") render(el, { id }); };
}

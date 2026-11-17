import { post, put, del, ai } from "../api.js";
import { h, $, $$, setActions, toast, copy, busy, confirmBox, modal } from "../ui.js";
import { fillTemplate, templateVars, standardVars } from "../../lib/template.js";
import { profile, templates } from "./compose.js";

const KINDS = { email: "Email", linkedin_note: "LinkedIn note", linkedin_inmail: "LinkedIn InMail", naukri_message: "Naukri message", follow_up: "Follow-up", thank_you: "Thank-you", cover_letter: "Cover letter", other: "Other" };
const SAMPLE_APP = { company: "Acme Analytics", role: "Senior Data Analyst", contact_name: "Priya Sharma", location: "Gurugram" };

export async function render(el) {
  const prof = await profile();
  let list = await templates(true);
  let cur = list[0] || null;
  setActions(h`<button class="btn ai" id="aiNew"><i class="fas fa-wand-magic-sparkles"></i> Create with AI</button><button class="btn primary" id="newBtn"><i class="fas fa-plus"></i> New</button>`);

  const paint = () => {
    el.innerHTML = String(h`
    <div class="grid" style="grid-template-columns:260px minmax(0,1fr)">
      <div class="card" style="padding:10px"><div class="list">
        ${Object.keys(KINDS).map((k) => { const items = list.filter((t) => t.kind === k); return items.length ? h`<div class="grp">${KINDS[k]}</div>${items.map((t) => h`<button data-id="${t.id}" class="${cur && cur.id === t.id ? "on" : ""}">${t.name}</button>`)}` : ""; })}
      </div></div>
      ${cur ? h`
      <div class="grid g2" style="align-content:start">
        <div class="card"><h3><i class="fas fa-pen"></i> Edit template</h3>
          <div class="form">
            <label class="f">Name<input class="in" id="tName" value="${cur.name}"></label>
            <label class="f">Type<select class="in" id="tKind">${Object.entries(KINDS).map(([k, v]) => h`<option value="${k}" ${k === cur.kind ? "selected" : ""}>${v}</option>`)}</select></label>
            <label class="f">Subject <span class="tiny">(emails)</span><input class="in" id="tSub" value="${cur.subject || ""}"></label>
            <label class="f">Body<textarea class="in" id="tBody" rows="14">${cur.body}</textarea></label>
            <div><span class="tiny">Insert variable: </span>${["company", "role", "hiring_manager", "interviewer", "my_name", "phone", "email", "linkedin", "portfolio", "resume_link", "signature"].map((v) => h`<button class="var-pill" data-var="${v}">{{${v}}}</button> `)}</div>
            <div class="row"><button class="btn primary" id="saveT"><i class="fas fa-floppy-disk"></i> Save</button>
              <span style="flex:1"></span><button class="btn danger" id="delT"><i class="fas fa-trash"></i></button></div>
            <div class="row"><span class="tiny">AI:</span>${[["improve", "Improve"], ["shorten", "Shorten"], ["formal", "More formal"], ["friendly", "Friendlier"]].map(([m, l]) => h`<button class="btn ai sm" data-mode="${m}">${l}</button>`)}</div>
          </div>
        </div>
        <div class="card"><h3><i class="fas fa-eye"></i> Preview <span class="tiny">(sample job: ${SAMPLE_APP.role} at ${SAMPLE_APP.company})</span></h3>
          <div id="pv"></div>
          <div class="row mt"><button class="btn" id="copyT"><i class="fas fa-copy"></i> Copy filled text</button></div>
          <p class="tiny mt-s">Variables found: <span id="varsFound"></span></p>
        </div>
      </div>` : h`<div class="card empty"><i class="fas fa-layer-group"></i>No templates yet.</div>`}
    </div>`);
    $$(".list button[data-id]").forEach((b) => (b.onclick = () => { cur = list.find((t) => String(t.id) === b.dataset.id); paint(); }));
    if (!cur) return;
    const preview = () => {
      const v = standardVars(prof, SAMPLE_APP);
      const sub = fillTemplate($("#tSub").value, v), body = fillTemplate($("#tBody").value, v);
      $("#pv").innerHTML = String(h`${sub ? h`<div class="small mb"><b>Subject:</b> ${sub}</div>` : ""}<div class="preview">${body}</div>`);
      $("#varsFound").textContent = templateVars($("#tSub").value + " " + $("#tBody").value).map((x) => `{{${x}}}`).join(" ") || "none";
      return { sub, body };
    };
    $("#tSub").oninput = $("#tBody").oninput = preview;
    preview();
    $$(".var-pill").forEach((b) => (b.onclick = () => {
      const ta = $("#tBody"), s = ta.selectionStart, ins = `{{${b.dataset.var}}}`;
      ta.value = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length; preview();
    }));
    $("#saveT").onclick = (e) => busy(e.currentTarget, async () => {
      await put(`/api/templates/${cur.id}`, { name: $("#tName").value, kind: $("#tKind").value, subject: $("#tSub").value, body: $("#tBody").value });
      list = await templates(true); cur = list.find((t) => t.id === cur.id); toast("Template saved", "ok"); paint();
    });
    $("#delT").onclick = async () => {
      if (!(await confirmBox("Delete template?", `"${cur.name}" will be deleted.`, "Delete", true))) return;
      await del(`/api/templates/${cur.id}`); list = await templates(true); cur = list[0] || null; paint();
    };
    $("#copyT").onclick = () => { const p = preview(); copy((p.sub ? `Subject: ${p.sub}\n\n` : "") + p.body); };
    $$("[data-mode]").forEach((b) => (b.onclick = (e) => busy(e.currentTarget, async () => {
      const r = await ai("template_improve", { mode: b.dataset.mode, template: { subject: $("#tSub").value, body: $("#tBody").value } });
      if (r.json?.body) { $("#tBody").value = r.json.body; if (r.json.subject !== undefined && $("#tSub").value) $("#tSub").value = r.json.subject; preview(); toast("Updated — review and Save", "ok"); }
    })));
  };
  paint();

  $("#newBtn").onclick = async () => {
    const r = await post("/api/templates", { name: "New template", kind: "email", subject: "{{role}} — {{my_name}}", body: "Dear {{hiring_manager}},\n\n\n\n{{signature}}" });
    list = await templates(true); cur = list.find((t) => t.id === r.id); paint();
  };
  $("#aiNew").onclick = async () => {
    const v = await modal({ title: "Create a template with AI", body: h`<div class="form">
        <label class="f">Type<select class="in" id="aiKind">${Object.entries(KINDS).map(([k, l]) => h`<option value="${k}">${l}</option>`)}</select></label>
        <label class="f">Describe it<textarea class="in" id="aiDesc" rows="4" placeholder="e.g. Cold email to a hiring manager at a fintech, focus on Power BI + reconciliation work at Paytm"></textarea></label></div>`,
      actions: [{ label: "Cancel", value: null }, { label: "Create", cls: "ai", value: (root) => ({ kind: root.querySelector("#aiKind").value, desc: root.querySelector("#aiDesc").value.trim() }) }] });
    if (!v || !v.desc) return;
    toast("Creating with AI…");
    try {
      const r = await ai("template_create", { template: { kind: v.kind }, prompt: v.desc });
      const j = r.json || {};
      const c = await post("/api/templates", { name: j.name || "AI template", kind: v.kind, subject: j.subject || "", body: j.body || r.text });
      list = await templates(true); cur = list.find((t) => t.id === c.id); paint(); toast("Template created — review it", "ok");
    } catch (err) { toast(err.message, "err"); }
  };
}

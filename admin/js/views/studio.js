import { get, post, ai } from "../api.js";
import { h, $, $$, toast, copy, busy, modal } from "../ui.js";

const PRESETS = [
  ["Why should we hire you?", "Answer the screening question \"Why should we hire you?\" in 80-120 words for a Data Analyst role, using only my real experience."],
  ["Notice period / CTC answer", "Write a polite, short answer to a recruiter asking for my current CTC, expected CTC and notice period. Leave the amounts as blanks for me to fill."],
  ["LinkedIn headline", "Suggest 5 LinkedIn headlines (max 220 characters each) for me as a Data Analyst."],
  ["LinkedIn About", "Write a LinkedIn About section (around 180 words) in first person."],
  ["Naukri profile summary", "Write a Naukri.com profile summary (max 1000 characters) optimised for Data Analyst / BI Analyst searches."],
  ["Rewrite a resume bullet", "Rewrite this resume bullet to be sharper, keeping every fact and number exactly the same:\n\n<paste bullet>"],
  ["Cold email to HR", "Write a short cold email to an HR manager asking about Data Analyst openings at their company."],
  ["Interview prep", "List 10 likely interview questions for a Data Analyst role (Power BI, SQL, CRM analytics) with short model answers based on my experience."]
];

export async function render(el) {
  const apps = await get("/api/applications");
  el.innerHTML = String(h`
  <div class="grid g-side">
    <div class="card"><h3><i class="fas fa-wand-magic-sparkles"></i> Ask the AI</h3>
      <div class="row mb" style="gap:6px">${PRESETS.map(([l], i) => h`<button class="btn sm" data-p="${i}">${l}</button>`)}</div>
      <div class="form">
        <label class="f">Job context (optional)<select class="in" id="sApp"><option value="">— none —</option>${apps.map((a) => h`<option value="${a.id}">${a.company} — ${a.role}</option>`)}</select></label>
        <label class="f">Prompt<textarea class="in" id="sPrompt" rows="6" placeholder="What should the AI write?"></textarea></label>
        <div><button class="btn ai" id="sGo"><i class="fas fa-bolt"></i> Generate</button></div>
        <label class="f">Result<textarea class="in" id="sOut" rows="14" placeholder="AI output appears here — edit freely"></textarea></label>
        <div class="row"><button class="btn" id="sCopy"><i class="fas fa-copy"></i> Copy</button><button class="btn" id="sTpl"><i class="fas fa-layer-group"></i> Save as template</button></div>
      </div>
    </div>
    <div class="card" style="align-self:start"><h3><i class="fas fa-shield-halved"></i> How it works</h3>
      <ul class="small muted" style="padding-left:18px;display:grid;gap:6px">
        <li>Your profile and master CV are sent as context so answers use your real facts.</li>
        <li>The AI is told never to invent numbers, employers, dates or tools — still, review before you send.</li>
        <li>Your API key stays on the server (encrypted). Set it in <a href="#/settings">Settings</a>.</li>
      </ul>
    </div>
  </div>`);
  $$("[data-p]").forEach((b) => (b.onclick = () => { $("#sPrompt").value = PRESETS[b.dataset.p][1]; $("#sPrompt").focus(); }));
  $("#sGo").onclick = (e) => busy(e.currentTarget, async () => {
    const p = $("#sPrompt").value.trim(); if (!p) throw new Error("Write a prompt first");
    const r = await ai("free", { prompt: p, application_id: $("#sApp").value ? Number($("#sApp").value) : undefined });
    $("#sOut").value = r.text.trim();
    if (r.mock) toast("Mock AI reply (local test mode)", "warn");
  });
  $("#sCopy").onclick = () => $("#sOut").value && copy($("#sOut").value);
  $("#sTpl").onclick = async () => {
    if (!$("#sOut").value.trim()) return toast("Nothing to save", "warn");
    const name = await modal({ title: "Save as template", body: h`<label class="f">Name<input class="in" id="tplName" value="AI Studio draft"></label>`,
      actions: [{ label: "Cancel", value: null }, { label: "Save", cls: "primary", value: (root) => root.querySelector("#tplName").value.trim() }] });
    if (!name) return;
    await post("/api/templates", { name, kind: "other", subject: "", body: $("#sOut").value });
    toast("Saved to Templates", "ok");
  };
}

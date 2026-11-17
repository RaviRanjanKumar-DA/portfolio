// Shared "compose" helpers: build email/message drafts from templates or AI, open Gmail, log events.
import { get, post, ai } from "../api.js";
import { h, $, modal, copy, gmailUrl, mailtoUrl, toast, busy } from "../ui.js";
import { fillTemplate, standardVars } from "../../lib/template.js";

let profileCache = null, templatesCache = null;
export async function profile() { return (profileCache ??= await get("/api/profile")); }
export async function templates(force = false) { if (force || !templatesCache) templatesCache = await get("/api/templates"); return templatesCache; }
export const resetCaches = () => { profileCache = null; templatesCache = null; };

export async function logEvent(appId, type, detail) {
  if (!appId) return;
  try { await post(`/api/applications/${appId}/events`, { type, detail }); } catch (e) { toast("Could not log event: " + e.message, "warn"); }
}

// Modal to write an email for a saved application (used on the detail page)
export async function composeEmail(app, { task = "email_apply", kinds = ["email", "follow_up", "thank_you"] } = {}) {
  const prof = await profile();
  const tpls = (await templates()).filter((t) => kinds.includes(t.kind));
  const vars = standardVars(prof, app);
  const body = h`<div class="form">
    <label class="f">To<input class="in" id="cTo" value="${app.contact_email || ""}" placeholder="recruiter@company.com"></label>
    <div class="row"><select class="in" id="cTpl" style="flex:1"><option value="">— Use a template —</option>${tpls.map((t) => h`<option value="${t.id}">${t.name}</option>`)}</select>
      <button class="btn ai sm" id="cAi" type="button"><i class="fas fa-wand-magic-sparkles"></i> Write with AI</button></div>
    <label class="f">Subject<input class="in" id="cSub"></label>
    <label class="f">Body<textarea class="in" id="cBody" rows="10"></textarea></label>
    <p class="tiny">Gmail opens with everything filled in. Attach your tailored CV PDF there if needed, then press Send.</p>
  </div>`;
  const p = modal({ title: `Email · ${app.company}`, body, actions: [{ label: "Cancel", value: null }, { label: "Copy", value: "copy" }, { label: "Open in Gmail", value: "gmail", cls: "primary" }] });
  $("#cTpl").onchange = (e) => {
    const t = tpls.find((x) => String(x.id) === e.target.value);
    if (t) { $("#cSub").value = fillTemplate(t.subject || "", vars); $("#cBody").value = fillTemplate(t.body, vars); }
  };
  $("#cAi").onclick = (e) => busy(e.currentTarget, async () => {
    const r = await ai(task, { application_id: app.id });
    if (r.json) { $("#cSub").value = r.json.subject || ""; $("#cBody").value = r.json.body || ""; }
    else {
      const m = r.text.match(/^Subject:\s*(.+)$/im);
      $("#cSub").value = m ? m[1].trim() : `${app.role} — ${prof.name}`;
      $("#cBody").value = r.text.replace(/^Subject:.*$/im, "").trim();
    }
    if (r.mock) toast("Mock AI reply (local test mode)", "warn");
  });
  if (tpls[0]) { $("#cTpl").value = tpls[0].id; $("#cTpl").dispatchEvent(new Event("change")); }
  // read values before the modal closes
  const vals = {};
  document.querySelector(".modal").addEventListener("click", () => { vals.to = $("#cTo")?.value; vals.subject = $("#cSub")?.value; vals.body = $("#cBody")?.value; }, true);
  const choice = await p;
  if (choice === "gmail") {
    window.open(gmailUrl(vals), "_blank", "noopener");
    await logEvent(app.id, "email_opened", `Email opened in Gmail: "${vals.subject}"`);
    return "gmail";
  }
  if (choice === "copy") { await copy(`Subject: ${vals.subject}\n\n${vals.body}`); await logEvent(app.id, "message_copied", "Email text copied"); }
  return choice;
}

export { gmailUrl, mailtoUrl };

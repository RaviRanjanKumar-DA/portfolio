import { get, put } from "../api.js";
import { h, $, toast, busy } from "../ui.js";
import { resetCaches } from "./compose.js";

const FIELDS = [
  ["name", "Full name"], ["headline", "Headline"], ["email", "Email"], ["phone", "Phone"], ["location", "Location"],
  ["linkedin", "LinkedIn URL"], ["github", "GitHub URL"], ["portfolio", "Portfolio URL"], ["resume_link", "Resume link (Google Drive)"],
  ["target_roles", "Target roles"], ["notice_period", "Notice period"], ["current_ctc", "Current CTC (private)"], ["expected_ctc", "Expected CTC (private)"]
];

export async function render(el) {
  const p = await get("/api/profile");
  el.innerHTML = String(h`<div class="card" style="max-width:900px"><h3><i class="fas fa-id-card"></i> Profile used in templates and AI prompts</h3>
    <form class="form cols" id="pf">
      ${FIELDS.map(([k, l]) => h`<label class="f">${l}<input class="in" name="${k}" value="${p[k] || ""}"></label>`)}
      <label class="f full">Email signature<textarea class="in" name="signature" rows="5">${p.signature || ""}</textarea></label>
      <div class="full"><button class="btn primary"><i class="fas fa-floppy-disk"></i> Save profile</button></div>
    </form>
    <p class="tiny mt">Template variables: {{my_name}} {{phone}} {{email}} {{linkedin}} {{portfolio}} {{resume_link}} {{signature}} come from here. CTC fields are only used when you ask the AI about them.</p></div>`);
  $("#pf").onsubmit = (e) => {
    e.preventDefault();
    busy(e.submitter, async () => { await put("/api/profile", { ...p, ...Object.fromEntries(new FormData(e.target)) }); resetCaches(); toast("Profile saved", "ok"); });
  };
}

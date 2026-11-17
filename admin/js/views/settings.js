import { get, put, post } from "../api.js";
import { h, $, toast, busy, download, confirmBox } from "../ui.js";
import { fmtIST } from "../../lib/time.js";

const PROVIDERS = {
  openai: { label: "OpenAI (ChatGPT)", model: "gpt-4o-mini", url: "https://platform.openai.com/api-keys" },
  anthropic: { label: "Anthropic (Claude)", model: "claude-haiku-5-5", url: "https://console.anthropic.com/settings/keys" },
  gemini: { label: "Google Gemini (has a free tier)", model: "gemini-2.5-flash", url: "https://aistudio.google.com/apikey" },
  groq: { label: "Groq (has a free tier)", model: "llama-3.3-70b-versatile", url: "https://console.groq.com/keys" },
  openrouter: { label: "OpenRouter (free models available)", model: "meta-llama/llama-3.3-70b-instruct:free", url: "https://openrouter.ai/keys" }
};

export async function render(el) {
  const s = await get("/api/settings");
  const daysSince = s.last_backup_at ? Math.floor((Date.now() - new Date(s.last_backup_at)) / 864e5) : null;
  el.innerHTML = String(h`
  ${s.mock ? h`<div class="banner mb"><i class="fas fa-flask"></i> Local test mode: AI replies are mocked (AI_MOCK=1). On the live site real AI calls are used.</div>` : ""}
  <div class="grid g2">
    <div class="card"><h3><i class="fas fa-robot"></i> AI provider</h3>
      <div class="form">
        <label class="f">Provider<select class="in" id="prov">${Object.entries(PROVIDERS).map(([k, v]) => h`<option value="${k}" ${k === s.ai_provider ? "selected" : ""}>${v.label}</option>`)}</select></label>
        <label class="f">Model<input class="in" id="model" value="${s.ai_model || ""}"></label>
        <label class="f">API key ${s.ai_key_masked ? h`<span class="tiny">current: ${s.ai_key_masked}</span>` : h`<span class="tiny" style="color:var(--gold)">not set</span>`}
          <input class="in" type="password" id="key" placeholder="${s.ai_key_masked ? "Leave blank to keep the current key" : "Paste your API key"}" autocomplete="off"></label>
        <p class="tiny" id="keyHelp"></p>
        <div class="row"><button class="btn primary" id="saveAi"><i class="fas fa-floppy-disk"></i> Save</button><button class="btn" id="testAi"><i class="fas fa-plug"></i> Test</button>
          ${s.ai_key_masked ? h`<button class="btn ghost danger" id="clearKey">Remove key</button>` : ""}</div>
        <p class="tiny">The key is encrypted (AES-GCM) in your Cloudflare database and is never sent back to the browser. AI calls go from the server straight to the provider.</p>
      </div>
    </div>
    <div class="grid" style="align-content:start">
      <div class="card"><h3><i class="fas fa-key"></i> Change password</h3>
        <form class="form" id="pw">
          <label class="f">Current password<input class="in" type="password" name="current" autocomplete="current-password" required></label>
          <label class="f">New password (min 10 characters)<input class="in" type="password" name="next" minlength="10" autocomplete="new-password" required></label>
          <label class="f">Repeat new password<input class="in" type="password" name="next2" minlength="10" autocomplete="new-password" required></label>
          <div><button class="btn primary"><i class="fas fa-lock"></i> Update password</button></div>
        </form>
      </div>
      <div class="card"><h3><i class="fas fa-box-archive"></i> Backup</h3>
        <p class="small ${daysSince === null || daysSince > 14 ? "" : "muted"}" style="${daysSince === null || daysSince > 14 ? "color:var(--gold)" : ""}">
          ${s.last_backup_at ? `Last backup: ${fmtIST(s.last_backup_at)} (${daysSince} day(s) ago)` : "No backup downloaded yet."}</p>
        <div class="row mt"><button class="btn" id="bk"><i class="fas fa-download"></i> Download backup (JSON)</button>
          <label class="btn"><i class="fas fa-upload"></i> Restore from file<input type="file" id="rs" accept="application/json" hidden></label></div>
        <p class="tiny mt-s">Backups include applications, history, templates, CV and messages — never your password or AI key.</p>
      </div>
    </div>
  </div>`);

  const help = () => { const p = PROVIDERS[$("#prov").value]; $("#keyHelp").innerHTML = String(h`Get a key: <a href="${p.url}" target="_blank" rel="noopener">${p.url.replace("https://", "")}</a> · default model <span class="mono">${p.model}</span>`); $("#model").placeholder = p.model; };
  $("#prov").onchange = () => { $("#model").value = ""; help(); };
  help();
  $("#saveAi").onclick = (e) => busy(e.currentTarget, async () => {
    const body = { ai_provider: $("#prov").value, ai_model: $("#model").value.trim() };
    if ($("#key").value.trim()) body.ai_key = $("#key").value.trim();
    await put("/api/settings", body); toast("AI settings saved", "ok"); render(el);
  });
  $("#testAi").onclick = (e) => busy(e.currentTarget, async () => { const r = await post("/api/ai/test"); toast(`${r.mock ? "Mock" : "Connected"}: ${r.provider} / ${r.model} replied "${r.reply}"`, "ok", 6000); });
  $("#clearKey") && ($("#clearKey").onclick = async () => { if (await confirmBox("Remove API key?", "AI features will stop until you add a key again.", "Remove", true)) { await put("/api/settings", { ai_key: "" }); render(el); } });
  $("#pw").onsubmit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (f.next !== f.next2) return toast("New passwords do not match", "err");
    busy(e.submitter, async () => { await post("/api/auth/password", { current: f.current, next: f.next }); e.target.reset(); toast("Password updated", "ok"); });
  };
  $("#bk").onclick = (e) => busy(e.currentTarget, async () => {
    const b = await get("/api/backup");
    download(`job-desk-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2));
    toast("Backup downloaded", "ok"); render(el);
  });
  $("#rs").onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    let data; try { data = JSON.parse(await file.text()); } catch { return toast("Not a valid JSON file", "err"); }
    const n = data?.tables?.applications?.length ?? "?";
    if (!(await confirmBox("Restore backup?", `This REPLACES all current data with the backup from ${data.exported_at ? fmtIST(data.exported_at) : "the file"} (${n} applications). Download a fresh backup first if unsure.`, "Replace all data", true))) return;
    try { await post("/api/backup", data); toast("Backup restored", "ok"); } catch (err) { toast(err.message, "err"); }
  };
}

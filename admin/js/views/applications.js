import { get, put } from "../api.js";
import { h, $, $$, setActions, statusChip, toast, download } from "../ui.js";
import { STATUSES, PLATFORMS } from "../../lib/stats.js";
import { fmtISTDate, fmtIST } from "../../lib/time.js";

let view = "table";

export async function render(el) {
  try { view = localStorage.getItem("rrk_apps_view") || "table"; } catch {}
  setActions(h`<a class="btn primary" href="#/apply"><i class="fas fa-plus"></i> New</a>`);
  el.innerHTML = String(h`
    <div class="row mb">
      <input class="in" id="q" placeholder="Search company, role, notes…" style="max-width:280px">
      <select class="in" id="fStatus" style="width:auto"><option value="">All statuses</option>${STATUSES.map((s) => h`<option value="${s}">${s.replace("_", " ")}</option>`)}</select>
      <select class="in" id="fPlatform" style="width:auto"><option value="">All platforms</option>${PLATFORMS.map((p) => h`<option>${p}</option>`)}</select>
      <div class="sp" style="flex:1"></div>
      <div class="row" style="gap:4px">
        <button class="icon-btn" id="vTable" title="Table"><i class="fas fa-table-list"></i></button>
        <button class="icon-btn" id="vBoard" title="Kanban board"><i class="fas fa-table-columns"></i></button>
      </div>
      <button class="btn" id="csv"><i class="fas fa-file-csv"></i> Export CSV</button>
    </div>
    <div id="list"></div>`);

  let apps = [];
  const load = async () => {
    const qs = new URLSearchParams();
    if ($("#q").value.trim()) qs.set("q", $("#q").value.trim());
    if ($("#fStatus").value) qs.set("status", $("#fStatus").value);
    if ($("#fPlatform").value) qs.set("platform", $("#fPlatform").value);
    apps = await get("/api/applications?" + qs);
    paint();
  };
  const paint = () => {
    $("#vTable").style.borderColor = view === "table" ? "var(--accent)" : "";
    $("#vBoard").style.borderColor = view === "board" ? "var(--accent)" : "";
    const list = $("#list");
    if (!apps.length) {
      list.innerHTML = String(h`<div class="card empty"><i class="fas fa-briefcase"></i>No applications found.<div class="mt"><a class="btn primary" href="#/apply"><i class="fas fa-plus"></i> Add one</a></div></div>`);
      return;
    }
    if (view === "table") {
      list.innerHTML = String(h`<div class="table-wrap"><table class="t"><thead><tr><th>Company / Role</th><th>Platform</th><th>Status</th><th>Applied</th><th>Follow-up</th><th>Match</th></tr></thead><tbody>
        ${apps.map((a) => h`<tr class="click" data-id="${a.id}"><td><b>${a.company}</b><div class="tiny">${a.role}${a.location ? " · " + a.location : ""}</div></td>
          <td>${a.platform}</td><td>${statusChip(a.status)}</td><td>${fmtISTDate(a.applied_at)}</td><td>${fmtISTDate(a.follow_up_at)}</td><td>${a.match_score ?? "—"}</td></tr>`)}
      </tbody></table></div><p class="tiny mt-s">${apps.length} application(s)</p>`);
      $$("tr[data-id]", list).forEach((tr) => (tr.onclick = () => (location.hash = `#/applications/${tr.dataset.id}`)));
    } else {
      list.innerHTML = String(h`<div class="kanban">${STATUSES.map((s) => {
        const col = apps.filter((a) => a.status === s);
        return h`<div class="col" data-status="${s}"><h4><span>${s.replace("_", " ")}</span><span class="muted">${col.length}</span></h4>
          <div class="drop">${col.map((a) => h`<div class="kcard" draggable="true" data-id="${a.id}"><b>${a.company}</b><span>${a.role}</span><div class="tiny mt-s">${a.platform} · ${fmtISTDate(a.applied_at || a.created_at)}</div></div>`)}</div></div>`;
      })}</div><p class="tiny">Drag a card to another column to change its status. Click a card to open it.</p>`);
      $$(".kcard", list).forEach((c) => {
        c.ondragstart = (e) => { e.dataTransfer.setData("text/plain", c.dataset.id); e.dataTransfer.effectAllowed = "move"; };
        c.onclick = () => (location.hash = `#/applications/${c.dataset.id}`);
      });
      $$(".col", list).forEach((col) => {
        col.ondragover = (e) => { e.preventDefault(); col.classList.add("over"); };
        col.ondragleave = () => col.classList.remove("over");
        col.ondrop = async (e) => {
          e.preventDefault(); col.classList.remove("over");
          const id = Number(e.dataTransfer.getData("text/plain"));
          const a = apps.find((x) => x.id === id);
          if (!a || a.status === col.dataset.status || a.pending) return;
          a.pending = true;
          try {
            await put(`/api/applications/${id}`, { status: col.dataset.status });
            a.status = col.dataset.status;
            toast(`${a.company} → ${col.dataset.status.replace("_", " ")}`, "ok");
            paint();
          } catch (err) { toast(err.message, "err"); } finally { a.pending = false; }
        };
      });
    }
  };
  let t;
  $("#q").oninput = () => { clearTimeout(t); t = setTimeout(load, 250); };
  $("#fStatus").onchange = load; $("#fPlatform").onchange = load;
  $("#vTable").onclick = () => { view = "table"; try { localStorage.setItem("rrk_apps_view", view); } catch {} paint(); };
  $("#vBoard").onclick = () => { view = "board"; try { localStorage.setItem("rrk_apps_view", view); } catch {} paint(); };
  $("#csv").onclick = () => {
    const cols = ["company", "role", "platform", "status", "location", "work_mode", "salary", "contact_name", "contact_email", "job_url", "match_score", "tags"];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [[...cols, "applied_at_ist", "follow_up_ist", "created_at_ist"].join(",")]
      .concat(apps.map((a) => [...cols.map((c) => q(a[c])), q(fmtIST(a.applied_at)), q(fmtISTDate(a.follow_up_at)), q(fmtIST(a.created_at))].join(",")));
    download(`applications-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + rows.join("\n"), "text/csv");
  };
  await load();
}

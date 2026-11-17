import { get } from "../api.js";
import { h, $, $$, setActions, statusChip } from "../ui.js";
import { computeStats, FUNNEL } from "../../lib/stats.js";
import { fmtIST, fmtISTDate, istDayStart, istDate } from "../../lib/time.js";

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#64748b", "#ec4899", "#22c55e"];
const EVENT_ICON = { created: "fa-plus", applied: "fa-paper-plane", status_change: "fa-arrow-right-arrow-left", note: "fa-note-sticky", email_opened: "fa-envelope-open", message_copied: "fa-copy", follow_up: "fa-bell", ai_generated: "fa-wand-magic-sparkles", cv_tailored: "fa-file-lines", interview_scheduled: "fa-calendar" };
let charts = [];

export function eventText(e) {
  if (e.type === "status_change") return `Status ${String(e.from_status).replace("_", " ")} → ${String(e.to_status).replace("_", " ")}${e.detail ? " · " + e.detail : ""}`;
  if (e.type === "created") return `Added (${e.detail || e.to_status})`;
  return e.detail || e.type.replace(/_/g, " ");
}
export { EVENT_ICON };

export async function render(el) {
  setActions(h`
    <select class="in" id="range" style="width:auto">
      <option value="30">Last 30 days</option><option value="7">Last 7 days</option><option value="90">Last 90 days</option><option value="all">All time</option>
    </select>
    <a class="btn primary" href="#/apply"><i class="fas fa-plus"></i> New application</a>`);
  let range = "30";
  try { range = localStorage.getItem("rrk_dash_range") || "30"; } catch {}
  $("#range").value = range;
  const data = await get("/api/stats");

  const draw = () => {
    const from = range === "all" ? null : istDayStart(istDate(new Date(Date.now() - Number(range) * 864e5).toISOString()));
    const s = computeStats(data.apps, data.events, { from });
    paint(el, s, data, from);
  };
  $("#range").onchange = (e) => { range = e.target.value; try { localStorage.setItem("rrk_dash_range", range); } catch {} draw(); };
  window.addEventListener("themechange", draw, { once: true });
  draw();
}

function paint(el, s, data, from) {
  charts.forEach((c) => c.destroy()); charts = [];
  const k = s.kpis;
  if (!data.apps.length) {
    el.innerHTML = String(h`<div class="card empty"><i class="fas fa-rocket"></i><h3 style="justify-content:center">Start your job hunt tracker</h3>
      <p class="muted mt-s">Add your first application — paste a job description and let AI prepare the email or message.</p>
      <a class="btn primary mt" href="#/apply"><i class="fas fa-plus"></i> New application</a></div>`);
    return;
  }
  const recent = data.events.filter((e) => !from || e.created_at >= from).slice(0, 12);
  el.innerHTML = String(h`
  <div class="grid g4">
    ${kpi("Applied", k.applied, `${k.thisWeek} this week`, "fa-paper-plane", "#3b82f6")}
    ${kpi("Response rate", k.responseRate + "%", s.avgDaysToResponse !== null ? `avg ${s.avgDaysToResponse} days to first reply` : "no replies yet", "fa-reply", "#06b6d4")}
    ${kpi("Interviews", k.interviews, `${k.interviewRate}% of applications`, "fa-user-tie", "#8b5cf6")}
    ${kpi("Offers", k.offers, `${k.total} tracked in range`, "fa-trophy", "#f59e0b")}
  </div>

  ${s.followUps.length ? h`<div class="card mt"><h3><i class="fas fa-bell"></i> Follow-ups due <span class="chip" style="color:var(--red)">${s.followUps.length}</span></h3>
    <div class="table-wrap"><table class="t"><tbody>${s.followUps.map((a) => h`
      <tr class="click" data-href="#/applications/${a.id}"><td><b>${a.company}</b><div class="tiny">${a.role}</div></td><td>${statusChip(a.status)}</td>
      <td style="color:${a.overdue ? "var(--red)" : "var(--gold)"}">${a.overdue ? "Overdue · " : "Today · "}${fmtISTDate(a.follow_up_at)}</td><td style="text-align:right"><i class="fas fa-chevron-right muted"></i></td></tr>`)}
    </tbody></table></div></div>` : ""}

  <div class="grid g2 mt">
    <div class="card"><h3><i class="fas fa-filter"></i> Pipeline funnel</h3><div class="chart-box"><canvas id="cFunnel"></canvas></div></div>
    <div class="card"><h3><i class="fas fa-chart-line"></i> Applications per week (last 12 weeks)</h3><div class="chart-box"><canvas id="cWeekly"></canvas></div></div>
  </div>
  <div class="grid g3 mt">
    <div class="card"><h3><i class="fas fa-globe"></i> By platform</h3><div class="chart-box"><canvas id="cPlatform"></canvas></div></div>
    <div class="card"><h3><i class="fas fa-reply"></i> Response rate by platform</h3><div class="chart-box"><canvas id="cResp"></canvas></div></div>
    <div class="card"><h3><i class="fas fa-chart-pie"></i> Status mix</h3><div class="chart-box"><canvas id="cStatus"></canvas></div></div>
  </div>
  <div class="grid g2 mt">
    <div class="card"><h3><i class="fas fa-ranking-star"></i> Top roles applied</h3>
      ${s.topRoles.length ? h`<table class="t"><tbody>${s.topRoles.map((r) => h`<tr><td>${r.role}</td><td style="text-align:right"><b>${r.count}</b></td></tr>`)}</tbody></table>` : h`<p class="muted">No applications in range.</p>`}
    </div>
    <div class="card"><h3><i class="fas fa-clock-rotate-left"></i> Recent activity</h3>
      ${recent.length ? h`<div class="tl">${recent.map((e) => h`<div class="tl-i"><span class="dot"><i class="fas ${EVENT_ICON[e.type] || "fa-circle"}"></i></span>
        <div class="what"><a href="#/applications/${e.application_id}"><b>${e.company || "—"}</b></a> · ${eventText(e)}</div><div class="when">${fmtIST(e.created_at)}</div></div>`)}</div>` : h`<p class="muted">No activity in range.</p>`}
    </div>
  </div>`);
  $$("tr[data-href]", el).forEach((tr) => (tr.onclick = () => (location.hash = tr.dataset.href)));
  if (!window.Chart) return;
  const css = getComputedStyle(document.documentElement);
  Chart.defaults.color = css.getPropertyValue("--text2").trim();
  Chart.defaults.borderColor = css.getPropertyValue("--line").trim();
  Chart.defaults.font.family = "Inter";
  const opts = (extra = {}) => ({ responsive: true, maintainAspectRatio: false, animation: { duration: 900, easing: "easeOutQuart" }, plugins: { legend: { display: false } }, ...extra });

  charts.push(new Chart($("#cFunnel"), { type: "bar",
    data: { labels: FUNNEL.map((f) => f[0].toUpperCase() + f.slice(1)), datasets: [{ data: s.funnel.map((f) => f.count), backgroundColor: ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981"], borderRadius: 6 }] },
    options: opts({ indexAxis: "y", scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }) }));
  charts.push(new Chart($("#cWeekly"), { type: "line",
    data: { labels: s.weekly.map((w) => fmtISTDate(w.week + "T06:00:00Z").slice(0, 6)), datasets: [{ data: s.weekly.map((w) => w.count), borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,.15)", fill: true, tension: 0.35, pointRadius: 3 }] },
    options: opts({ scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }) }));
  const plats = Object.keys(s.byPlatform);
  charts.push(new Chart($("#cPlatform"), { type: "bar",
    data: { labels: plats, datasets: [{ data: plats.map((p) => s.byPlatform[p]), backgroundColor: plats.map((_, i) => COLORS[i % COLORS.length]), borderRadius: 6 }] },
    options: opts({ scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }) }));
  charts.push(new Chart($("#cResp"), { type: "bar",
    data: { labels: plats, datasets: [{ data: plats.map((p) => s.responseByPlatform[p]), backgroundColor: "#10b981", borderRadius: 6 }] },
    options: opts({ scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" } } } }) }));
  const st = Object.keys(s.statusMix);
  charts.push(new Chart($("#cStatus"), { type: "doughnut",
    data: { labels: st.map((x) => x.replace("_", " ")), datasets: [{ data: st.map((x) => s.statusMix[x]), backgroundColor: st.map((_, i) => COLORS[i % COLORS.length]), borderWidth: 0 }] },
    options: opts({ cutout: "62%", plugins: { legend: { display: true, position: "right", labels: { boxWidth: 10 } } } }) }));
}

const kpi = (lbl, val, sub, icon, color) => h`<div class="card kpi"><i class="fas ${icon} bg" style="color:${color}"></i><div class="lbl">${lbl}</div><div class="val">${val}</div><div class="sub">${sub}</div></div>`;

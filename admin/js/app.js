// Router + layout. Each view module exports render(el, params).
import { get, post } from "./api.js";
import { h, $, $$, toast } from "./ui.js";

const ROUTES = [
  { path: "dashboard", title: "Dashboard", icon: "fa-gauge-high", load: () => import("./views/dashboard.js") },
  { path: "applications", title: "Applications", icon: "fa-briefcase", load: () => import("./views/applications.js") },
  { path: "applications/:id", title: "Application", hidden: true, load: () => import("./views/detail.js") },
  { path: "apply", title: "Apply", icon: "fa-paper-plane", load: () => import("./views/apply.js") },
  { path: "cv", title: "CV Builder", icon: "fa-file-lines", load: () => import("./views/cv.js") },
  { path: "templates", title: "Templates", icon: "fa-layer-group", load: () => import("./views/templates.js") },
  { path: "studio", title: "AI Studio", icon: "fa-wand-magic-sparkles", load: () => import("./views/studio.js") },
  { path: "inbox", title: "Inbox", icon: "fa-inbox", load: () => import("./views/inbox.js") },
  { path: "profile", title: "Profile", icon: "fa-id-card", load: () => import("./views/profile.js") },
  { path: "settings", title: "Settings", icon: "fa-gear", load: () => import("./views/settings.js") }
];

const app = document.getElementById("app");
let user = null;
let unread = 0;

function match(hash) {
  const parts = hash.replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean);
  if (!parts.length) return { route: ROUTES[0], params: {} };
  for (const r of ROUTES) {
    const rp = r.path.split("/");
    if (rp.length !== parts.length) continue;
    const params = {};
    if (rp.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(parts[i])), true) : seg === parts[i]))) return { route: r, params };
  }
  return null;
}

function layout(route) {
  app.innerHTML = String(h`
  <div class="shell">
    <aside class="side" id="side">
      <div class="brand"><i class="fas fa-chart-simple" style="color:var(--accent)"></i><div>Job<b>Desk</b><small>Ravi's career admin</small></div></div>
      <nav class="nav">
        ${ROUTES.filter((r) => !r.hidden).map((r) => h`<a href="#/${r.path}" data-path="${r.path}"><i class="fas ${r.icon}"></i>${r.title}${r.path === "inbox" && unread ? h`<span class="badge">${unread}</span>` : ""}</a>`)}
      </nav>
      <div class="side-foot">
        <a class="btn ghost sm" href="../" target="_blank" rel="noopener"><i class="fas fa-globe"></i> Site</a>
        <button class="btn ghost sm" id="themeBtn" title="Toggle light/dark"><i class="fas fa-circle-half-stroke"></i></button>
        <button class="btn ghost sm" id="logoutBtn"><i class="fas fa-right-from-bracket"></i> Logout</button>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu"><i class="fas fa-bars"></i></button>
        <h1 id="pageTitle">${route.title}</h1>
        <div class="sp"></div>
        <div id="topActions" class="row"></div>
      </header>
      <section class="page" id="page"></section>
    </div>
  </div>`);
  $("#menuBtn").onclick = () => $("#side").classList.toggle("open");
  $("#logoutBtn").onclick = async () => { await post("/api/auth/logout").catch(() => {}); user = null; location.hash = "#/login"; };
  $("#themeBtn").onclick = () => {
    const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("rrk_admin_theme", t); } catch {}
    window.dispatchEvent(new Event("themechange"));
  };
}

async function render() {
  const hash = location.hash || "#/dashboard";
  if (hash.startsWith("#/login")) return (await import("./views/login.js")).render(app, { onLogin });
  if (!user) {
    try { user = (await get("/api/auth/me")).user; }
    catch (e) {
      if (e.status === 401) return; // api.js already moved us to #/login
      app.innerHTML = String(h`<div class="login-wrap"><div class="card login"><h3><i class="fas fa-triangle-exclamation"></i> Admin unavailable</h3><p class="muted">${e.message}</p><p class="small mt-s"><a href="../">← Back to portfolio</a></p></div></div>`);
      return;
    }
    get("/api/messages").then((m) => { unread = m.filter((x) => !x.read).length; const a = $('.nav a[data-path="inbox"]'); if (a && unread && !a.querySelector(".badge")) a.insertAdjacentHTML("beforeend", `<span class="badge">${unread}</span>`); }).catch(() => {});
  }
  const m = match(hash);
  if (!m) { location.hash = "#/dashboard"; return; }
  if (!$(".shell")) layout(m.route);
  $("#pageTitle").textContent = m.route.title;
  $("#topActions").innerHTML = "";
  $$(".nav a").forEach((a) => a.classList.toggle("on", hash.startsWith(`#/${a.dataset.path}`) && (a.dataset.path !== "applications" || !hash.startsWith("#/apply"))));
  $("#side").classList.remove("open");
  const page = $("#page");
  page.innerHTML = '<div class="empty"><i class="fas fa-circle-notch spin"></i></div>';
  try {
    const mod = await m.route.load();
    await mod.render(page, m.params);
  } catch (e) {
    if (e.status !== 401) { page.innerHTML = String(h`<div class="empty"><i class="fas fa-bug"></i>${e.message}</div>`); toast(e.message, "err"); }
  }
  window.scrollTo(0, 0);
}

function onLogin(u) {
  user = u;
  const back = sessionStorage.getItem("rrk_return");
  sessionStorage.removeItem("rrk_return");
  app.innerHTML = "";
  location.hash = back && !back.startsWith("#/login") ? back : "#/dashboard";
  render();
}

window.addEventListener("hashchange", render);
render();

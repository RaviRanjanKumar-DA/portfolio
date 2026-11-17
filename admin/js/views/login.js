import { post } from "../api.js";
import { h, $ } from "../ui.js";

export function render(el, { onLogin }) {
  el.innerHTML = String(h`
  <div class="login-wrap">
    <form class="card login" id="loginForm" autocomplete="on">
      <div class="logo">Job<b>Desk</b></div>
      <p class="muted small" style="text-align:center;margin-bottom:18px">Private admin · Ravi Ranjan Kumar</p>
      <div class="form">
        <label class="f">Username<input class="in" name="username" autocomplete="username" required autofocus></label>
        <label class="f">Password<input class="in" type="password" name="password" autocomplete="current-password" required></label>
        <button class="btn primary" style="justify-content:center" id="loginBtn"><i class="fas fa-lock"></i> Log in</button>
        <p class="small" id="loginErr" style="color:var(--red);min-height:18px"></p>
      </div>
      <p class="tiny" style="text-align:center"><a href="../">← Back to portfolio</a></p>
    </form>
  </div>`);
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), btn = $("#loginBtn");
    btn.disabled = true; $("#loginErr").textContent = "";
    try {
      const r = await post("/api/auth/login", { username: f.get("username"), password: f.get("password") });
      onLogin(r.user);
    } catch (err) {
      $("#loginErr").textContent = err.message;
      btn.disabled = false;
    }
  };
}

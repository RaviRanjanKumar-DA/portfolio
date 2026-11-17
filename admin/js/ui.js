// UI helpers: auto-escaping HTML templates, toasts, modals, clipboard, Gmail compose, downloads.
import { esc, safeUrl } from "../lib/esc.js";
export const safeHref = safeUrl;

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ""));
const fmt = (v) => (v === null || v === undefined || v === false ? "" : Array.isArray(v) ? v.map(fmt).join("") : v instanceof Raw ? v.s : esc(v));
// h`<p>${userText}</p>` → every interpolation is escaped unless wrapped in raw() or produced by h itself
export function h(strings, ...vals) {
  return new Raw(strings.reduce((o, s, i) => o + s + (i < vals.length ? fmt(vals[i]) : ""), ""));
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(msg, type = "info", ms = 3800) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// actions: [{label, cls, value}] — value may be a function(root) evaluated before the modal closes (to read its inputs)
export function modal({ title, body, actions = [{ label: "Close" }], onOpen }) {
  return new Promise((resolve) => {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = String(h`<div class="modal card" role="dialog" aria-modal="true"><h3>${title}</h3><div class="mbody">${body instanceof Raw ? body : raw(esc(body))}</div>
      <div class="acts">${actions.map((a, i) => h`<button class="btn ${a.cls || ""}" data-i="${i}">${a.label}</button>`)}</div></div>`);
    const close = (v) => { bg.remove(); document.removeEventListener("keydown", onKey); resolve(v); };
    const onKey = (e) => { if (e.key === "Escape") close(null); };
    bg.addEventListener("click", (e) => {
      if (e.target === bg) return close(null);
      const b = e.target.closest("[data-i]");
      if (b) { const a = actions[b.dataset.i]; close(typeof a.value === "function" ? a.value(bg) : a.value !== undefined ? a.value : a.label); }
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(bg);
    bg.querySelector(".acts .btn:last-child")?.focus();
    if (onOpen) onOpen(bg);
  });
}

export const confirmBox = (title, text, okLabel = "Yes", danger = false) =>
  modal({ title, body: text, actions: [{ label: "Cancel", value: false }, { label: okLabel, value: true, cls: danger ? "danger" : "primary" }] });

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied to clipboard", "ok", 2000); return true; }
  catch {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); toast(ok ? "Copied" : "Copy failed — select and copy manually", ok ? "ok" : "err"); return ok;
  }
}

export function gmailUrl({ to = "", subject = "", body = "" }) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function mailtoUrl({ to = "", subject = "", body = "" }) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function download(filename, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// run an async action with a spinner on the button; errors become toasts
export async function busy(btn, fn) {
  const old = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> Working…'; }
  try { return await fn(); }
  catch (e) { toast(e.message || String(e), "err", 6000); return undefined; }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
}

export const statusChip = (s) => h`<span class="chip st-${s}">${String(s).replace("_", " ")}</span>`;
export const STATUS_LABEL = (s) => String(s).replace("_", " ").replace(/^./, (c) => c.toUpperCase());
export const addDays = (n) => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };
export const dayToIso = (day) => (day ? new Date(`${day}T09:00:00+05:30`).toISOString() : null);
export const setActions = (html) => { const el = document.getElementById("topActions"); if (el) el.innerHTML = String(html); return el; };

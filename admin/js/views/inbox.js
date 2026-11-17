import { get, put, del } from "../api.js";
import { h, $$, toast, confirmBox, gmailUrl } from "../ui.js";
import { fmtIST } from "../../lib/time.js";

export async function render(el) {
  const msgs = await get("/api/messages");
  el.innerHTML = String(msgs.length ? h`<p class="muted small mb">Messages sent from the contact form on your portfolio (copies also arrive by email via Web3Forms).</p>
    <div class="grid">${msgs.map((m) => h`<div class="msg ${m.read ? "" : "unread"}">
      <div class="row between"><div><b>${m.name}</b> <span class="tiny">${m.email}${m.phone ? " · " + m.phone : ""}${m.organization ? " · " + m.organization : ""}</span></div><span class="tiny">${fmtIST(m.created_at)}</span></div>
      <p class="mt-s" style="white-space:pre-wrap">${m.message}</p>
      <div class="row mt-s"><a class="btn sm primary" target="_blank" rel="noopener" href="${gmailUrl({ to: m.email, subject: "Re: your message on my portfolio", body: `Hi ${m.name},\n\nThank you for reaching out.\n\n` })}" data-read="${m.id}"><i class="fas fa-reply"></i> Reply in Gmail</a>
        <button class="btn sm" data-toggle="${m.id}" data-v="${m.read ? 0 : 1}">${m.read ? "Mark unread" : "Mark read"}</button>
        <button class="btn sm danger" data-del="${m.id}"><i class="fas fa-trash"></i></button></div></div>`)}</div>`
    : h`<div class="card empty"><i class="fas fa-inbox"></i>No messages yet. Contact-form messages from your portfolio (Cloudflare site) appear here.</div>`);
  $$("[data-read]", el).forEach((a) => a.addEventListener("click", () => put(`/api/messages/${a.dataset.read}`, { read: true }).catch(() => {})));
  $$("[data-toggle]", el).forEach((b) => (b.onclick = async () => { await put(`/api/messages/${b.dataset.toggle}`, { read: b.dataset.v === "1" }); render(el); }));
  $$("[data-del]", el).forEach((b) => (b.onclick = async () => {
    if (!(await confirmBox("Delete message?", "This message will be deleted from the inbox.", "Delete", true))) return;
    await del(`/api/messages/${b.dataset.del}`); toast("Deleted", "ok"); render(el);
  }));
}

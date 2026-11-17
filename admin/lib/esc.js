// HTML-escape any value before it is placed into markup.
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => MAP[c]);
}

// Only http(s) and mailto links may be placed into href attributes (blocks javascript:, data:, etc.)
export function safeUrl(u) {
  const s = String(u ?? "").trim();
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : "";
}

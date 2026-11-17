// Thin fetch wrapper. 401 → back to login (remembering where you were).
export class ApiError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

export async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection.", 0);
  }
  if (res.status === 401 && !path.startsWith("/api/auth/login")) {
    if (!location.hash.startsWith("#/login")) sessionStorage.setItem("rrk_return", location.hash || "#/dashboard");
    location.hash = "#/login";
    throw new ApiError("Session expired — please log in again.", 401);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new ApiError(res.status === 404 || res.status === 405
      ? "The admin works only on the Cloudflare site (no API on this host)."
      : `Unexpected server reply (HTTP ${res.status})`, res.status);
  }
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  return data;
}

export const get = (p) => api("GET", p);
export const post = (p, b = {}) => api("POST", p, b);
export const put = (p, b = {}) => api("PUT", p, b);
export const del = (p) => api("DELETE", p);

// AI helper: returns {text, json, mock}
export const ai = (task, input = {}) => post("/api/ai/generate", { task, input });

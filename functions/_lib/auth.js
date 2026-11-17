// Password hashing (PBKDF2-SHA256), sessions and login throttling.
import { toB64, fromB64 } from "./b64.js";

const ITER = 100000;
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const WINDOW_MIN = 15;
export const COOKIE = "rrk_session";

async function derive(password, salt, iter) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${toB64(salt)}$${toB64(await derive(password, salt, ITER))}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algo, iter, salt, hash] = String(stored).split("$");
    if (algo !== "pbkdf2" || !hash) return false;
    const got = await derive(password, fromB64(salt), Number(iter));
    const want = fromB64(hash);
    if (got.length !== want.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
    return diff === 0;
  } catch {
    return false;
  }
}

async function sha256(s) {
  return toB64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

const now = () => new Date().toISOString();

export async function createSession(env, username) {
  const token = toB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]);
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash, username, expires_at, created_at) VALUES (?,?,?,?)")
    .bind(await sha256(token), username, exp, now()).run();
  return token;
}

export function readCookie(req, name = COOKIE) {
  const m = (req.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}

export async function getSession(env, req) {
  const token = readCookie(req);
  if (!token) return null;
  const row = await env.DB.prepare("SELECT username, expires_at FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first();
  if (!row || row.expires_at < now()) return null;
  return { user: row.username };
}

export async function destroySession(env, req) {
  const token = readCookie(req);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function sessionCookie(token, req) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return token
    ? `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`
    : `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

export async function throttle(env, ip) {
  const since = new Date(Date.now() - WINDOW_MIN * 60e3).toISOString();
  const r = await env.DB.prepare("SELECT COUNT(*) AS n, MIN(created_at) AS first FROM login_attempts WHERE ip = ? AND created_at > ?").bind(ip, since).first();
  if (r.n >= MAX_FAILS) {
    const retryAfter = Math.max(1, Math.ceil((new Date(r.first).getTime() + WINDOW_MIN * 60e3 - Date.now()) / 1000));
    return { locked: true, retryAfter };
  }
  return { locked: false, retryAfter: 0 };
}

export async function recordFailure(env, ip) {
  await env.DB.prepare("INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)").bind(ip, now()).run();
}

export async function clearFailures(env, ip) {
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
}

// Current password hash: one changed in the admin (stored in D1) overrides the ADMIN_PASS_HASH secret.
export async function currentHash(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_pass_hash'").first();
  return row?.value || env.ADMIN_PASS_HASH || "";
}

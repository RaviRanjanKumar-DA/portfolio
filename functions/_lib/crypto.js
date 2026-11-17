// AES-GCM encryption for secrets stored in D1 (AI keys). ENC_KEY = base64 of 32 random bytes.
import { toB64, fromB64 } from "./b64.js";

async function key(env) {
  if (!env.ENC_KEY) throw new Error("ENC_KEY secret is not set");
  return crypto.subtle.importKey("raw", fromB64(env.ENC_KEY), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encrypt(env, plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(env), new TextEncoder().encode(plain));
  return `${toB64(iv)}.${toB64(ct)}`;
}

export async function decrypt(env, s) {
  const [iv, ct] = String(s).split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await key(env), fromB64(ct));
  return new TextDecoder().decode(pt);
}

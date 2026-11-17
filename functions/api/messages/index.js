import { json } from "../../_lib/http.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM messages ORDER BY created_at DESC LIMIT 500").all();
  return json(results);
}

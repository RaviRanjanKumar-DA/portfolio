import { json, readJson } from "../../_lib/http.js";

export async function onRequestPut({ request, env, params }) {
  const { read } = await readJson(request);
  await env.DB.prepare("UPDATE messages SET read = ? WHERE id = ?").bind(read ? 1 : 0, params.id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}

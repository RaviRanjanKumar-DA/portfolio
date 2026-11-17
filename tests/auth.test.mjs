import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../functions/_lib/auth.js";
import { encrypt, decrypt } from "../functions/_lib/crypto.js";

test("hashPassword uses pbkdf2$100000$salt$hash format", async () => {
  const h = await hashPassword("correct horse");
  const parts = h.split("$");
  assert.equal(parts[0], "pbkdf2");
  assert.equal(parts[1], "100000");
  assert.equal(parts.length, 4);
});

test("verifyPassword accepts the right password and rejects a wrong one", async () => {
  const h = await hashPassword("correct horse");
  assert.equal(await verifyPassword("correct horse", h), true);
  assert.equal(await verifyPassword("wrong horse", h), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
});

test("encrypt/decrypt round-trips and ciphertext differs from plaintext", async () => {
  const env = { ENC_KEY: Buffer.alloc(32, 7).toString("base64") };
  const c = await encrypt(env, "sk-test-1234");
  assert.notEqual(c, "sk-test-1234");
  assert.equal(await decrypt(env, c), "sk-test-1234");
});

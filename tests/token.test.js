/* ============================================
   Tests — Token
   ============================================ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { newToken, sha256Hex } from "../src/utils/token.js";

test("newToken: prefijo pulso_ y base64url sin relleno", () => {
  assert.equal(newToken(new Uint8Array(32)), "pulso_" + "A".repeat(43));
  // 0xFB 0xFF → "+/8=" en base64 → "-_8" en base64url
  assert.equal(newToken(new Uint8Array([251, 255])), "pulso_-_8");
});

test("newToken: dos claves al azar no se repiten", () => {
  assert.notEqual(newToken(), newToken());
  assert.equal(newToken().length, "pulso_".length + 43);
});

test("sha256Hex: vector conocido", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

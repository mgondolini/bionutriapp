import { describe, expect, it } from "vitest";

import {
  generateInviteToken,
  hashInviteToken,
  isWellFormedToken,
  verifyInviteToken,
} from "./token";

describe("token degli inviti", () => {
  it("32 byte casuali in base64url (43 caratteri), ogni volta diversi", () => {
    const tokens = new Set(Array.from({ length: 50 }, generateInviteToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    }
  });

  it("hash SHA-256 esadecimale, deterministico e diverso dal token", () => {
    const token = generateInviteToken();
    const hash = hashInviteToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(token)).toBe(hash);
    expect(hash).not.toContain(token);
    // stesso valore di encode(digest(token, 'sha256'), 'hex') in Postgres
    expect(hashInviteToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("verifica il token con l'hash salvato", () => {
    const token = generateInviteToken();
    const hash = hashInviteToken(token);
    expect(verifyInviteToken(token, hash)).toBe(true);
    expect(verifyInviteToken(generateInviteToken(), hash)).toBe(false);
    expect(verifyInviteToken(token, "non-un-hash")).toBe(false);
  });

  it("riconosce i token malformati senza interrogare il database", () => {
    expect(isWellFormedToken(generateInviteToken())).toBe(true);
    expect(isWellFormedToken("")).toBe(false);
    expect(isWellFormedToken("corto")).toBe(false);
    expect(isWellFormedToken(`${"a".repeat(42)}=`)).toBe(false);
    expect(isWellFormedToken(`${"a".repeat(42)}/`)).toBe(false);
    expect(isWellFormedToken("a".repeat(44))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { parseLoginIdentifier } from "./login-identifier";

describe("parseLoginIdentifier", () => {
  it("email in minuscolo", () => {
    expect(parseLoginIdentifier(" Anna.Rossi@Example.test ")).toEqual({
      email: "anna.rossi@example.test",
    });
  });

  it("cellulare normalizzato in E.164 (con o senza prefisso)", () => {
    for (const value of [
      "333 123 4567",
      "+39 333 1234567",
      "0039 333-123-4567",
    ]) {
      expect(parseLoginIdentifier(value)).toEqual({ phone: "+393331234567" });
    }
    expect(parseLoginIdentifier("+41 79 123 45 67")).toEqual({
      phone: "+41791234567",
    });
  });

  it("valori non validi", () => {
    expect(parseLoginIdentifier("")).toBeNull();
    expect(parseLoginIdentifier("anna@")).toBeNull();
    expect(parseLoginIdentifier("123")).toBeNull();
    expect(parseLoginIdentifier("mario")).toBeNull();
  });
});

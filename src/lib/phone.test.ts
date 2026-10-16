import { describe, expect, it } from "vitest";

import {
  formatPhone,
  normalizePhone,
  phoneMatchesQuery,
  phoneSearchDigits,
} from "./phone";

describe("normalizePhone", () => {
  it("porta i formati più comuni in E.164 con prefisso italiano predefinito", () => {
    for (const input of [
      "3331234567",
      "333 123 4567",
      "333-123-4567",
      "(333) 123.4567",
      "+39 333 123 4567",
      "+393331234567",
      "0039 333 1234567",
      "  333 1234567  ",
    ]) {
      expect(normalizePhone(input)).toBe("+393331234567");
    }
  });

  it("accetta numeri esteri con prefisso internazionale", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("rifiuta numeri vuoti o non validi", () => {
    for (const input of [
      "",
      "   ",
      null,
      undefined,
      "abc",
      "123",
      "333 12",
      "+39 12",
    ]) {
      expect(normalizePhone(input)).toBeNull();
    }
  });

  it("formatta per la lettura", () => {
    expect(formatPhone("+393331234567")).toBe("+39 333 123 4567");
  });
});

describe("ricerca per telefono", () => {
  it("trova il numero con spazi, con prefisso o senza", () => {
    for (const query of [
      "333 123",
      "333123",
      "+39333123",
      "0039 333 123",
      "123 4567",
    ]) {
      expect(phoneMatchesQuery("+393331234567", query)).toBe(true);
    }
    expect(phoneMatchesQuery("+393331234567", "333 999")).toBe(false);
  });

  it("ignora le ricerche con meno di 3 cifre", () => {
    expect(phoneSearchDigits("Anna")).toEqual([]);
    expect(phoneSearchDigits("33")).toEqual([]);
    expect(phoneSearchDigits("+39 333")).toEqual(["39333", "333"]);
  });
});

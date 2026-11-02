import { describe, expect, it } from "vitest";

import { activationSchema } from "./invites.schema";

const valid = {
  token: "a".repeat(43),
  firstName: "Giulia",
  lastName: "Bianchi",
  email: " Giulia.B@Email.it ",
  birthDate: "",
  heightCm: "172",
  password: "password123",
  privacyNotice: true,
  healthData: true,
};

describe("activationSchema", () => {
  it("richiede l'email e la normalizza", () => {
    expect(activationSchema.parse(valid).email).toBe("giulia.b@email.it");
  });

  it("rifiuta l'email vuota o non valida", () => {
    for (const email of ["", "   ", "giulia"]) {
      const result = activationSchema.safeParse({ ...valid, email });
      expect(result.success).toBe(false);
    }
  });

  it("richiede l'altezza in centimetri interi", () => {
    expect(activationSchema.parse(valid).heightCm).toBe(172);
    for (const heightCm of ["", "1,72", "90", "250"]) {
      const result = activationSchema.safeParse({ ...valid, heightCm });
      expect(result.success).toBe(false);
    }
  });
});

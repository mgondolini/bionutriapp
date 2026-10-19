import { describe, expect, it } from "vitest";

import { copy } from "@/lib/copy/it";

import { activationUrl, buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("numero italiano: cifre senza '+'", () => {
    expect(buildWhatsAppUrl("+393331234567", "Ciao")).toBe(
      "https://wa.me/393331234567?text=Ciao",
    );
  });

  it("numeri esteri", () => {
    expect(buildWhatsAppUrl("+41791234567", "x")).toBe(
      "https://wa.me/41791234567?text=x",
    );
    expect(buildWhatsAppUrl("+14155552671", "x")).toBe(
      "https://wa.me/14155552671?text=x",
    );
  });

  it("codifica spazi, caratteri speciali, accenti, a capo ed emoji", () => {
    const text =
      "Studio Verde & Co. ti invita: https://app.test/attiva/a_b-c?x=1#y\nÈ facile 🌿";
    const url = new URL(buildWhatsAppUrl("+393331234567", text));
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/393331234567");
    expect([...url.searchParams.keys()]).toEqual(["text"]);
    expect(url.searchParams.get("text")).toBe(text);
    expect(url.search).toContain("%26");
    expect(url.search).toContain("%23");
    expect(url.search).toContain("%0A");
  });

  it("rifiuta un numero non in formato E.164", () => {
    expect(() => buildWhatsAppUrl("333", "x")).toThrow();
    expect(() => buildWhatsAppUrl("+0123456789", "x")).toThrow();
  });
});

describe("messaggio di invito", () => {
  it("contiene solo nome dello studio e link (N-05)", () => {
    const link = activationUrl("https://app.test", "TOKEN");
    expect(link).toBe("https://app.test/attiva/TOKEN");
    expect(copy.invites.whatsappMessage("Studio Verde", link)).toBe(
      "Ciao! Studio Verde ti invita ad attivare il tuo account: https://app.test/attiva/TOKEN",
    );
  });
});

import { describe, expect, it } from "vitest";

import { decideRoute, safeNextPath, type RouteRole } from "./route-decision";

function decide(pathname: string, role: RouteRole, search = "") {
  return decideRoute({ pathname, search, role });
}

describe("decideRoute", () => {
  it("lascia passare le rotte sempre pubbliche per ogni ruolo", () => {
    for (const role of [
      "anonymous",
      "staff",
      "client",
      "client_disabled",
    ] as const) {
      for (const path of [
        "/manifest.webmanifest",
        "/icon/192",
        "/apple-icon",
        "/attiva/abc",
        "/nuova-password",
      ]) {
        expect(decide(path, role)).toEqual({ type: "next" });
      }
    }
  });

  it("porta la radice alla home del ruolo", () => {
    expect(decide("/", "anonymous")).toEqual({
      type: "redirect",
      to: "/login",
    });
    expect(decide("/", "staff")).toEqual({ type: "redirect", to: "/admin" });
    expect(decide("/", "client")).toEqual({ type: "redirect", to: "/app" });
    expect(decide("/", "client_disabled")).toEqual({
      type: "redirect",
      to: "/accesso-sospeso",
    });
  });

  it("manda l'anonimo al login con il percorso di ritorno", () => {
    expect(decide("/admin/clienti", "anonymous", "?filtro=attivi")).toEqual({
      type: "redirect",
      to: "/login?next=%2Fadmin%2Fclienti%3Ffiltro%3Dattivi",
    });
    expect(decide("/app/diete", "anonymous")).toEqual({
      type: "redirect",
      to: "/login?next=%2Fapp%2Fdiete",
    });
  });

  it("consente a ogni ruolo solo la propria area", () => {
    expect(decide("/admin", "staff")).toEqual({ type: "next" });
    expect(decide("/admin/impostazioni", "staff")).toEqual({ type: "next" });
    expect(decide("/app/tracking", "client")).toEqual({ type: "next" });
    expect(decide("/accesso-sospeso", "client_disabled")).toEqual({
      type: "next",
    });
  });

  it("riporta chi apre l'area dell'altro ruolo nella propria", () => {
    expect(decide("/admin/clienti", "client")).toEqual({
      type: "redirect",
      to: "/app",
    });
    expect(decide("/app", "staff")).toEqual({ type: "redirect", to: "/admin" });
    expect(decide("/accesso-sospeso", "client")).toEqual({
      type: "redirect",
      to: "/app",
    });
  });

  it("manda il cliente disattivato ad Accesso sospeso", () => {
    expect(decide("/app", "client_disabled")).toEqual({
      type: "redirect",
      to: "/accesso-sospeso",
    });
    expect(decide("/admin", "client_disabled")).toEqual({
      type: "redirect",
      to: "/accesso-sospeso",
    });
    expect(decide("/login", "client_disabled")).toEqual({
      type: "redirect",
      to: "/accesso-sospeso",
    });
  });

  it("non confonde prefissi simili con un'area", () => {
    expect(decide("/application", "anonymous")).toEqual({ type: "next" });
    expect(decide("/administrator", "client")).toEqual({ type: "next" });
  });

  it("toglie dal login chi è già autenticato, rispettando un next valido", () => {
    expect(decide("/login", "anonymous")).toEqual({ type: "next" });
    expect(decide("/recupera-password", "anonymous")).toEqual({ type: "next" });
    expect(decide("/login", "staff", "?next=%2Fadmin%2Fimpostazioni")).toEqual({
      type: "redirect",
      to: "/admin/impostazioni",
    });
    expect(decide("/login", "client", "?next=%2Fadmin")).toEqual({
      type: "redirect",
      to: "/app",
    });
  });
});

describe("safeNextPath", () => {
  it("accetta solo percorsi interni dell'area del ruolo", () => {
    expect(safeNextPath("/app/diete?x=1", "client")).toBe("/app/diete?x=1");
    expect(safeNextPath("/admin", "client")).toBeNull();
    expect(safeNextPath("/app", "anonymous")).toBeNull();
  });

  it("rifiuta redirect verso altri siti", () => {
    for (const next of [
      "https://evil.example/app",
      "//evil.example/app",
      "/\\evil.example",
      "app",
      "",
      null,
    ]) {
      expect(safeNextPath(next, "client")).toBeNull();
    }
  });
});

import { describe, expect, it } from "vitest";

import { evaluateInvite, type InviteRecord } from "./activation-state";

const NOW = new Date("2026-10-16T10:00:00Z");

function invite(
  overrides: Partial<InviteRecord> = {},
  client: Partial<InviteRecord["client"]> = {},
): InviteRecord {
  return {
    expiresAt: "2026-10-20T10:00:00Z",
    usedAt: null,
    revokedAt: null,
    ...overrides,
    client: {
      origin: "imported",
      accountStatus: "invited",
      userId: null,
      ...client,
    },
  };
}

describe("evaluateInvite", () => {
  it("percorso per origine: importato (C1) o nuovo (C2)", () => {
    expect(evaluateInvite(invite(), NOW)).toEqual({ kind: "imported" });
    expect(evaluateInvite(invite({}, { origin: "new" }), NOW)).toEqual({
      kind: "new",
    });
  });

  it("cliente già attivo con un nuovo link: solo nuova password", () => {
    expect(
      evaluateInvite(
        invite({}, { accountStatus: "active", userId: "u1" }),
        NOW,
      ),
    ).toEqual({ kind: "reset" });
  });

  it("stesso esito generico per inesistente, scaduto, usato, revocato, disattivato", () => {
    expect(evaluateInvite(null, NOW)).toEqual({ kind: "invalid" });
    expect(
      evaluateInvite(invite({ expiresAt: "2026-10-16T10:00:00Z" }), NOW),
    ).toEqual({ kind: "invalid" });
    expect(
      evaluateInvite(invite({ usedAt: "2026-10-15T10:00:00Z" }), NOW),
    ).toEqual({ kind: "invalid" });
    expect(
      evaluateInvite(invite({ revokedAt: "2026-10-15T10:00:00Z" }), NOW),
    ).toEqual({ kind: "invalid" });
    expect(
      evaluateInvite(invite({}, { accountStatus: "disabled" }), NOW),
    ).toEqual({ kind: "invalid" });
  });
});

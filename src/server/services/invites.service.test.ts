import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateInviteToken, hashInviteToken } from "@/lib/invites/token";

/*
 * Servizio di attivazione con Supabase simulato: un piccolo archivio in
 * memoria imita la RPC activate_client (aggiornamento condizionato su
 * used_at, quindi atomico) e la creazione degli utenti di Auth.
 */

type FakeInvite = {
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  clientId: string;
};
type FakeClient = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  email: string | null;
  birth_date: string | null;
  origin: "imported" | "new";
  account_status: string;
  user_id: string | null;
};

const db = {
  invites: [] as FakeInvite[],
  clients: new Map<string, FakeClient>(),
  users: new Map<string, { phone: string }>(),
  uniquePhones: true,
  failActivation: null as null | "duplicate_email" | "throw",
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

vi.mock("@/server/repositories/invites.repository", () => ({
  insertInvite: vi.fn(),
  findInviteByHash: vi.fn(async (hash: string) => {
    await tick();
    const invite = db.invites.find((i) => i.tokenHash === hash);
    if (!invite) return null;
    const client = db.clients.get(invite.clientId)!;
    return {
      id: "invite",
      expires_at: invite.expiresAt,
      used_at: invite.usedAt,
      revoked_at: invite.revokedAt,
      client: {
        ...client,
        studio: { name: "Studio Verde", slug: "studio-verde" },
      },
    };
  }),
  activateClient: vi.fn(async (hash: string, userId: string) => {
    await tick();
    if (db.failActivation === "throw") throw new Error("connessione persa");
    if (db.failActivation === "duplicate_email")
      return { ok: false, reason: "duplicate_email" };
    // update … where used_at is null and revoked_at is null and expires_at > now()
    const invite = db.invites.find(
      (i) =>
        i.tokenHash === hash &&
        !i.usedAt &&
        !i.revokedAt &&
        new Date(i.expiresAt) > new Date(),
    );
    if (!invite) return { ok: false, reason: "invalid" };
    invite.usedAt = new Date().toISOString();
    const client = db.clients.get(invite.clientId)!;
    client.user_id = userId;
    client.account_status = "active";
    return { ok: true, clientId: client.id };
  }),
}));

vi.mock("@/server/repositories/auth-admin.repository", () => ({
  createUser: vi.fn(async ({ phone }: { phone: string }) => {
    await tick();
    if (
      db.uniquePhones &&
      [...db.users.values()].some((u) => u.phone === phone)
    ) {
      return { ok: false, reason: "phone_exists" };
    }
    const userId = `user-${db.users.size + 1}`;
    db.users.set(userId, { phone });
    return { ok: true, userId };
  }),
  deleteUser: vi.fn(async (userId: string) => db.users.delete(userId)),
  updatePassword: vi.fn(async () => true),
}));

vi.mock("@/server/repositories/auth.repository", () => ({
  signInWithPassword: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/server/repositories/clients.repository", () => ({
  getClientProfile: vi.fn(),
}));

const authAdmin = await import("@/server/repositories/auth-admin.repository");
const authRepository = await import("@/server/repositories/auth.repository");
const clientsRepository =
  await import("@/server/repositories/clients.repository");
const invitesRepository =
  await import("@/server/repositories/invites.repository");
const invitesService = await import("./invites.service");

const IN_14_DAYS = () => new Date(Date.now() + 14 * 86_400_000).toISOString();

function seedInvite(
  overrides: Partial<FakeInvite> = {},
  client: Partial<FakeClient> = {},
): string {
  const token = generateInviteToken();
  const clientId = client.id ?? `client-${db.clients.size + 1}`;
  db.clients.set(clientId, {
    id: clientId,
    first_name: "Anna",
    last_name: "Rossi",
    phone: "+393331234567",
    email: null,
    birth_date: null,
    origin: "imported",
    account_status: "invited",
    user_id: null,
    ...client,
  });
  db.invites.push({
    tokenHash: hashInviteToken(token),
    expiresAt: IN_14_DAYS(),
    usedAt: null,
    revokedAt: null,
    clientId,
    ...overrides,
  });
  return token;
}

function input(token: string) {
  return {
    token,
    firstName: "Anna",
    lastName: "Rossi",
    email: null,
    birthDate: null,
    password: "password123",
    consent: true as const,
  };
}

beforeEach(() => {
  db.invites = [];
  db.clients = new Map();
  db.users = new Map();
  db.uniquePhones = true;
  db.failActivation = null;
  vi.clearAllMocks();
});

describe("getActivationView", () => {
  it("mostra il percorso giusto senza esporre l'hash", async () => {
    const imported = seedInvite();
    const fresh = seedInvite({}, { origin: "new", phone: "+393330000002" });
    expect(await invitesService.getActivationView(imported)).toMatchObject({
      kind: "imported",
      client: { firstName: "Anna", phone: "+393331234567" },
      studio: { name: "Studio Verde" },
    });
    expect(await invitesService.getActivationView(fresh)).toMatchObject({
      kind: "new",
    });
  });

  it("token malformato o sconosciuto: esito generico", async () => {
    expect(await invitesService.getActivationView("abc")).toEqual({
      kind: "invalid",
    });
    expect(
      await invitesService.getActivationView(generateInviteToken()),
    ).toEqual({
      kind: "invalid",
    });
  });
});

describe("activate", () => {
  it("crea l'utente con il cellulare, collega il cliente ed entra", async () => {
    const token = seedInvite();
    const result = await invitesService.activate(input(token));
    expect(result).toEqual({ ok: true, signedIn: true });
    expect(authAdmin.createUser).toHaveBeenCalledWith({
      phone: "+393331234567",
      email: null,
      password: "password123",
    });
    expect(authRepository.signInWithPassword).toHaveBeenCalledWith(
      { phone: "+393331234567" },
      "password123",
    );
    expect(db.invites[0]!.usedAt).not.toBeNull();
  });

  it("token scaduto: nessun utente creato", async () => {
    const token = seedInvite({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await invitesService.activate(input(token))).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });

  it("token già usato: nessun utente creato", async () => {
    const token = seedInvite({ usedAt: new Date().toISOString() });
    expect(await invitesService.activate(input(token))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });

  it("token revocato (sostituito da un nuovo invito): nessun utente creato", async () => {
    const token = seedInvite({ revokedAt: new Date().toISOString() });
    expect(await invitesService.activate(input(token))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });

  it("doppio uso simultaneo: un solo account, la seconda richiesta fallisce", async () => {
    const token = seedInvite();
    const results = await Promise.all([
      invitesService.activate(input(token)),
      invitesService.activate(input(token)),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([
      { ok: false, reason: "invalid" },
    ]);
    expect(db.users.size).toBe(1);
  });

  it("doppio uso simultaneo che supera la creazione dell'utente: la RPC ne accetta uno e l'altro utente viene eliminato", async () => {
    db.uniquePhones = false;
    const token = seedInvite();
    const results = await Promise.all([
      invitesService.activate(input(token)),
      invitesService.activate(input(token)),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(authAdmin.deleteUser).toHaveBeenCalledTimes(1);
    expect(db.users.size).toBe(1);
    const linked = [...db.clients.values()][0]!.user_id;
    expect(db.users.has(linked!)).toBe(true);
  });

  it("compensazione: se l'attivazione fallisce l'utente creato viene eliminato", async () => {
    db.failActivation = "duplicate_email";
    const token = seedInvite();
    expect(await invitesService.activate(input(token))).toEqual({
      ok: false,
      reason: "duplicate_email",
    });
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(db.users.size).toBe(0);
    expect(authRepository.signInWithPassword).not.toHaveBeenCalled();
  });

  it("compensazione anche quando la RPC lancia un errore", async () => {
    db.failActivation = "throw";
    const token = seedInvite();
    await expect(invitesService.activate(input(token))).rejects.toThrow();
    expect(authAdmin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(db.users.size).toBe(0);
  });

  it("il link di un cliente già attivo non crea un secondo account", async () => {
    const token = seedInvite(
      {},
      { account_status: "active", user_id: "user-x" },
    );
    expect(await invitesService.activate(input(token))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(authAdmin.createUser).not.toHaveBeenCalled();
  });
});

describe("resetPasswordViaInvite", () => {
  it("cliente attivo: consuma il link, imposta la password ed entra", async () => {
    const token = seedInvite(
      {},
      { account_status: "active", user_id: "user-x" },
    );
    expect(
      await invitesService.resetPasswordViaInvite({
        token,
        password: "nuovapass1",
      }),
    ).toEqual({ ok: true, signedIn: true });
    expect(authAdmin.updatePassword).toHaveBeenCalledWith(
      "user-x",
      "nuovapass1",
    );
    expect(db.invites[0]!.usedAt).not.toBeNull();
  });

  it("il link si usa una volta sola", async () => {
    const token = seedInvite(
      {},
      { account_status: "active", user_id: "user-x" },
    );
    await invitesService.resetPasswordViaInvite({
      token,
      password: "nuovapass1",
    });
    expect(
      await invitesService.resetPasswordViaInvite({
        token,
        password: "altrapass1",
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(authAdmin.updatePassword).toHaveBeenCalledTimes(1);
  });
});

describe("createInvite", () => {
  it("salva solo l'hash e restituisce il link wa.me con studio e link", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
    vi.mocked(clientsRepository.getClientProfile).mockResolvedValue({
      studio_id: "studio-1",
      phone: "+393331234567",
      account_status: "to_invite",
    } as never);
    vi.mocked(invitesRepository.insertInvite).mockResolvedValue({
      ok: true,
      sentAt: "2026-10-16T10:00:00Z",
      expiresAt: "2026-10-30T10:00:00Z",
    });

    const result = await invitesService.createInvite({
      clientId: "client-1",
      studioId: "studio-1",
      studioName: "Studio Verde",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const text = new URL(result.whatsappUrl).searchParams.get("text")!;
    const token = text.match(/\/attiva\/([A-Za-z0-9_-]{43})$/)![1]!;
    expect(
      result.whatsappUrl.startsWith("https://wa.me/393331234567?text="),
    ).toBe(true);
    expect(text).toBe(
      `Ciao! Studio Verde ti invita ad attivare il tuo account: https://app.test/attiva/${token}`,
    );
    const [, , savedHash] = vi.mocked(invitesRepository.insertInvite).mock
      .calls[0]!;
    expect(savedHash).toBe(hashInviteToken(token));
    expect(savedHash).not.toContain(token);
  });

  it("cliente di un altro studio o disattivato: nessun invito", async () => {
    vi.mocked(clientsRepository.getClientProfile).mockResolvedValueOnce({
      studio_id: "studio-2",
      phone: "+393331234567",
      account_status: "to_invite",
    } as never);
    expect(
      await invitesService.createInvite({
        clientId: "c",
        studioId: "studio-1",
        studioName: "S",
      }),
    ).toEqual({ ok: false, reason: "not_found" });

    vi.mocked(clientsRepository.getClientProfile).mockResolvedValueOnce({
      studio_id: "studio-1",
      phone: "+393331234567",
      account_status: "disabled",
    } as never);
    expect(
      await invitesService.createInvite({
        clientId: "c",
        studioId: "studio-1",
        studioName: "S",
      }),
    ).toEqual({ ok: false, reason: "disabled" });
    expect(invitesRepository.insertInvite).not.toHaveBeenCalled();
  });
});

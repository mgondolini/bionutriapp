import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Servizio del profilo con i repository simulati: cambio password con
 * verifica dell'attuale e chiusura delle altre sessioni, cambio email con
 * controllo dell'indice unico dello studio, campi del profilo del cliente.
 */

type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  newEmail: string | null;
};

const state: { user: AuthUser | null } = { user: null };

vi.mock("@/server/repositories/auth.repository", () => ({
  getAuthUser: vi.fn(async () => state.user),
  verifyPassword: vi.fn(async () => true),
  updatePassword: vi.fn(async () => ({ ok: true, error: null })),
  signOutOthers: vi.fn(async () => ({ ok: true, error: null })),
  requestEmailChange: vi.fn(async () => ({ ok: true, error: null })),
  verifyEmailChange: vi.fn(async () => ({ ok: true, completed: true })),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  getOwnClient: vi.fn(),
  updateOwnClient: vi.fn(async () => true),
  getOwnMember: vi.fn(),
  updateOwnMember: vi.fn(async () => true),
  isEmailAvailable: vi.fn(async () => true),
}));

const auth = await import("@/server/repositories/auth.repository");
const profile = await import("@/server/repositories/profile.repository");
const service = await import("./profile.service");

beforeEach(() => {
  vi.clearAllMocks();
  state.user = {
    id: "u1",
    email: "giulia@esempio.it",
    phone: "+393330000001",
    newEmail: null,
  };
});

describe("cambio password", () => {
  it("verifica l'attuale, aggiorna e chiude le altre sessioni", async () => {
    expect(await service.changePassword("vecchia-pw", "nuova-pw-123")).toBe(
      true,
    );
    expect(auth.verifyPassword).toHaveBeenCalledWith(
      { email: "giulia@esempio.it" },
      "vecchia-pw",
    );
    expect(auth.updatePassword).toHaveBeenCalledWith("nuova-pw-123");
    expect(auth.signOutOthers).toHaveBeenCalledOnce();
  });

  it("senza email verifica con il cellulare", async () => {
    state.user = { ...state.user!, email: null };
    await service.changePassword("vecchia-pw", "nuova-pw-123");
    expect(auth.verifyPassword).toHaveBeenCalledWith(
      { phone: "+393330000001" },
      "vecchia-pw",
    );
  });

  it("con la password attuale sbagliata non cambia nulla", async () => {
    vi.mocked(auth.verifyPassword).mockResolvedValueOnce(false);
    expect(await service.changePassword("sbagliata", "nuova-pw-123")).toBe(
      false,
    );
    expect(auth.updatePassword).not.toHaveBeenCalled();
    expect(auth.signOutOthers).not.toHaveBeenCalled();
  });

  it("senza sessione non fa nulla", async () => {
    state.user = null;
    expect(await service.changePassword("a", "b")).toBe(false);
    expect(auth.verifyPassword).not.toHaveBeenCalled();
  });
});

describe("cambio email", () => {
  it("cliente: controlla l'indice dello studio e chiede la conferma a entrambi gli indirizzi", async () => {
    const result = await service.requestEmailChange("nuova@esempio.it", {
      isClient: true,
    });
    expect(profile.isEmailAvailable).toHaveBeenCalledWith("nuova@esempio.it");
    expect(auth.requestEmailChange).toHaveBeenCalledWith(
      "nuova@esempio.it",
      expect.stringMatching(/\/conferma-email$/),
    );
    expect(result).toEqual({
      ok: true,
      email: "nuova@esempio.it",
      confirmBoth: true,
    });
  });

  it("chi non aveva un'email conferma solo dal nuovo indirizzo", async () => {
    state.user = { ...state.user!, email: null };
    const result = await service.requestEmailChange("nuova@esempio.it", {
      isClient: true,
    });
    expect(result).toEqual({
      ok: true,
      email: "nuova@esempio.it",
      confirmBoth: false,
    });
  });

  it("indirizzo di un altro cliente dello studio: nessuna richiesta", async () => {
    vi.mocked(profile.isEmailAvailable).mockResolvedValueOnce(false);
    expect(
      await service.requestEmailChange("altra@esempio.it", { isClient: true }),
    ).toEqual({ ok: false, reason: "unavailable" });
    expect(auth.requestEmailChange).not.toHaveBeenCalled();
  });

  it("stessa email: nessuna richiesta; lo staff non usa l'indice dei clienti", async () => {
    expect(
      await service.requestEmailChange("giulia@esempio.it", {
        isClient: false,
      }),
    ).toEqual({ ok: false, reason: "same" });
    await service.requestEmailChange("nuova@esempio.it", { isClient: false });
    expect(profile.isEmailAvailable).not.toHaveBeenCalled();
  });

  it("email già usata da un altro account Auth: errore generico", async () => {
    vi.mocked(auth.requestEmailChange).mockResolvedValueOnce({
      ok: false,
      error: { code: "email_exists" },
    } as never);
    expect(
      await service.requestEmailChange("nuova@esempio.it", { isClient: true }),
    ).toEqual({ ok: false, reason: "unavailable" });
  });

  it("conferma: completa, parziale (manca l'altro indirizzo) o link non valido", async () => {
    expect(await service.confirmEmailChange("hash")).toBe("done");
    vi.mocked(auth.verifyEmailChange).mockResolvedValueOnce({
      ok: true,
      completed: false,
    });
    expect(await service.confirmEmailChange("hash")).toBe("partial");
    vi.mocked(auth.verifyEmailChange).mockResolvedValueOnce({ ok: false });
    expect(await service.confirmEmailChange("hash")).toBe("invalid");
  });
});

describe("profilo del cliente", () => {
  it("salva solo nome, cognome e data di nascita", async () => {
    await service.updateClientProfile({
      firstName: "Giulia",
      lastName: "Bianchi",
      birthDate: "1991-03-12",
    });
    expect(profile.updateOwnClient).toHaveBeenCalledWith({
      first_name: "Giulia",
      last_name: "Bianchi",
      birth_date: "1991-03-12",
    });
  });

  it("l'email mostrata è quella di Auth, con quella in attesa di conferma", async () => {
    vi.mocked(profile.getOwnClient).mockResolvedValueOnce({
      id: "c1",
      first_name: "Giulia",
      last_name: "Bianchi",
      phone: "+393330000001",
      email: "giulia@esempio.it",
      birth_date: null,
      activated_at: "2026-04-14T10:00:00Z",
      push_enabled: false,
    });
    state.user = { ...state.user!, newEmail: "nuova@esempio.it" };
    const page = await service.getClientProfile("c1");
    expect(page?.email).toEqual({
      current: "giulia@esempio.it",
      pending: "nuova@esempio.it",
    });
  });
});

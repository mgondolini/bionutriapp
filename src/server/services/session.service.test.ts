import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContextRow } from "@/lib/auth/user-context";

vi.mock("@/server/repositories/session.repository", () => ({
  getAuthUserId: vi.fn(),
  fetchUserContextRows: vi.fn(),
  getStaffMember: vi.fn(),
  getOwnClient: vi.fn(),
}));
vi.mock("@/server/repositories/studio.repository", () => ({
  getStudioBrandingBySlug: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));

const sessionRepository =
  await import("@/server/repositories/session.repository");
const studioRepository =
  await import("@/server/repositories/studio.repository");
const { loadSession } = await import("./session.service");

const STUDIO_ROW = {
  id: "studio-1",
  slug: "studio-verde",
  name: "Studio Verde",
  logo_path: null,
  primary_color: "#2e6a4e",
};

function contextRow(role: string, clientId: string | null = null): ContextRow {
  return {
    role,
    studio_id: "studio-1",
    studio_slug: "studio-verde",
    client_id: clientId,
  };
}

describe("getSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(studioRepository.getStudioBrandingBySlug).mockResolvedValue(
      STUDIO_ROW,
    );
  });

  it("senza utente autenticato restituisce anonymous e non interroga il database", async () => {
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue(null);
    await expect(loadSession()).resolves.toEqual({ kind: "anonymous" });
    expect(sessionRepository.fetchUserContextRows).not.toHaveBeenCalled();
  });

  it("un utente senza ruolo nel database è anonymous", async () => {
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue("user-1");
    vi.mocked(sessionRepository.fetchUserContextRows).mockResolvedValue([]);
    await expect(loadSession()).resolves.toEqual({ kind: "anonymous" });
  });

  it("riconosce il titolare con nome e studio", async () => {
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue("user-1");
    vi.mocked(sessionRepository.fetchUserContextRows).mockResolvedValue([
      contextRow("owner"),
    ]);
    vi.mocked(sessionRepository.getStaffMember).mockResolvedValue({
      display_name: "Dott.ssa Verdi",
      first_name: "Verdi",
      role: "owner",
    });

    const session = await loadSession();
    expect(session).toMatchObject({
      kind: "staff",
      userId: "user-1",
      role: "owner",
      displayName: "Dott.ssa Verdi",
      studio: {
        id: "studio-1",
        name: "Studio Verde",
        primaryColor: "#2E6A4E",
        logoUrl: null,
      },
    });
    expect(sessionRepository.getStaffMember).toHaveBeenCalledWith(
      "studio-1",
      "user-1",
    );
  });

  it("riconosce il cliente attivo e segnala le sezioni sbloccate", async () => {
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue("user-2");
    vi.mocked(sessionRepository.fetchUserContextRows).mockResolvedValue([
      contextRow("client", "client-1"),
    ]);
    vi.mocked(sessionRepository.getOwnClient).mockResolvedValue({
      id: "client-1",
      first_name: "Anna",
      last_name: "Rossi",
      journey_stage: "in_progress",
    });

    await expect(loadSession()).resolves.toMatchObject({
      kind: "client",
      userId: "user-2",
      client: {
        id: "client-1",
        firstName: "Anna",
        journeyStage: "in_progress",
        unlocked: true,
      },
      studio: { slug: "studio-verde" },
    });
  });

  it("un cliente in Onboarding ha le sezioni bloccate (C-09)", async () => {
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue("user-3");
    vi.mocked(sessionRepository.fetchUserContextRows).mockResolvedValue([
      contextRow("client", "client-2"),
    ]);
    vi.mocked(sessionRepository.getOwnClient).mockResolvedValue({
      id: "client-2",
      first_name: "Marco",
      last_name: null,
      journey_stage: "onboarding",
    });

    await expect(loadSession()).resolves.toMatchObject({
      kind: "client",
      client: { journeyStage: "onboarding", unlocked: false },
    });
  });

  it("riconosce il cliente disattivato con lo studio, senza leggerne il profilo", async () => {
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue("user-4");
    vi.mocked(sessionRepository.fetchUserContextRows).mockResolvedValue([
      contextRow("client_disabled", "client-3"),
    ]);

    await expect(loadSession()).resolves.toMatchObject({
      kind: "client_disabled",
      userId: "user-4",
      studio: { name: "Studio Verde" },
    });
    expect(sessionRepository.getOwnClient).not.toHaveBeenCalled();
  });

  it("un professionista prevale su un eventuale profilo cliente", async () => {
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue("user-5");
    vi.mocked(sessionRepository.fetchUserContextRows).mockResolvedValue([
      contextRow("client", "client-4"),
      contextRow("owner"),
    ]);
    vi.mocked(sessionRepository.getStaffMember).mockResolvedValue({
      display_name: "Titolare",
      first_name: "Titolare",
      role: "owner",
    });

    await expect(loadSession()).resolves.toMatchObject({ kind: "staff" });
  });

  it("usa il colore predefinito se lo studio non è trovato", async () => {
    vi.mocked(studioRepository.getStudioBrandingBySlug).mockResolvedValue(null);
    vi.mocked(sessionRepository.getAuthUserId).mockResolvedValue("user-6");
    vi.mocked(sessionRepository.fetchUserContextRows).mockResolvedValue([
      contextRow("client_disabled", "client-5"),
    ]);

    await expect(loadSession()).resolves.toMatchObject({
      studio: { id: null, primaryColor: "#2E6A4E" },
    });
  });
});

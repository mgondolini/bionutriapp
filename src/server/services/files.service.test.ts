import { beforeEach, describe, expect, it, vi } from "vitest";

import { FILE_MAX_BYTES } from "@/lib/constants/domain";

/*
 * Servizio dei file con Supabase simulato. Il finto repository imita la RLS
 * (lo staff vede solo il proprio studio, il cliente solo i propri file) e la
 * RPC mark_file_read (aggiorna solo se first_read_at è vuoto).
 */

const STUDIO = "aaaaaaaa-1111-4000-8000-000000000000";
const OTHER_STUDIO = "bbbbbbbb-1111-4000-8000-000000000000";
const CLIENT = "aaaaaaaa-2222-4000-8000-000000000001";
const OTHER_CLIENT = "aaaaaaaa-2222-4000-8000-000000000002";
const FILE_ID = "3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0002";
const PATH = `${STUDIO}/${CLIENT}/${FILE_ID}.pdf`;

type FakeFile = {
  id: string;
  studio_id: string;
  client_id: string;
  category: string;
  title: string;
  storage_path: string;
  first_read_at: string | null;
};

const db = {
  files: new Map<string, FakeFile>(),
  clients: new Map<string, { studio_id: string }>(),
  objects: new Map<string, { size: number; head: string }>(),
  removeFails: false,
};

vi.mock("@/server/repositories/clients.repository", () => ({
  getClientProfile: vi.fn(async (id: string) => {
    const client = db.clients.get(id);
    return client
      ? { id, ...client, first_name: "Anna", last_name: "Rossi" }
      : null;
  }),
}));

vi.mock("@/server/repositories/files.repository", () => ({
  listClientFiles: vi.fn(async () => []),
  getFile: vi.fn(async (id: string) => db.files.get(id) ?? null),
  insertFile: vi.fn(async (row: { id: string; storagePath: string }) => {
    if (db.files.has(row.id)) return "duplicate";
    return "ok";
  }),
  deleteFileRow: vi.fn(async (id: string) => {
    const file = db.files.get(id);
    db.files.delete(id);
    return file?.storage_path ?? null;
  }),
  createSignedUploadUrl: vi.fn(
    async (path: string) => `http://storage/upload/${path}?token=t`,
  ),
  getObjectInfo: vi.fn(async (path: string) => {
    const object = db.objects.get(path);
    return object
      ? { size: object.size, contentType: "application/pdf" }
      : null;
  }),
  readObjectHead: vi.fn(async (path: string, length: number) => {
    const object = db.objects.get(path);
    return object
      ? new TextEncoder().encode(object.head).subarray(0, length)
      : null;
  }),
  removeObject: vi.fn(async (path: string) => {
    if (db.removeFails) return new Error("storage non raggiungibile");
    db.objects.delete(path);
    return null;
  }),
  createSignedUrl: vi.fn(async (path: string, downloadName?: string) =>
    db.objects.has(path)
      ? `http://storage/sign/${path}?token=t${downloadName ? `&download=${downloadName}` : ""}`
      : null,
  ),
  markFileRead: vi.fn(async (id: string) => {
    const file = db.files.get(id)!;
    file.first_read_at ??= new Date().toISOString();
  }),
}));

vi.mock("@/server/services/notifications.service", () => ({
  notifyClient: vi.fn(async () => {}),
}));

const filesRepository = await import("@/server/repositories/files.repository");
const { notifyClient } =
  await import("@/server/services/notifications.service");
const service = await import("./files.service");

const staff = { kind: "staff" as const, studioId: STUDIO };
const anna = { kind: "client" as const, clientId: CLIENT, unlocked: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.files.clear();
  db.clients.clear();
  db.objects.clear();
  db.removeFails = false;
  db.clients.set(CLIENT, { studio_id: STUDIO });
  db.clients.set(OTHER_CLIENT, { studio_id: STUDIO });
  db.files.set(FILE_ID, {
    id: FILE_ID,
    studio_id: STUDIO,
    client_id: CLIENT,
    category: "diet",
    title: "Piano alimentare ottobre",
    storage_path: PATH,
    first_read_at: null,
  });
  db.objects.set(PATH, { size: 2048, head: "%PDF-1.7" });
});

describe("openFile: permessi", () => {
  it("lo staff di un altro studio non ottiene l'URL", async () => {
    const result = await service.openFile(
      { kind: "staff", studioId: OTHER_STUDIO },
      FILE_ID,
      "view",
    );
    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(filesRepository.createSignedUrl).not.toHaveBeenCalled();
  });

  it("un altro cliente non ottiene l'URL né registra la lettura", async () => {
    const result = await service.openFile(
      { kind: "client", clientId: OTHER_CLIENT, unlocked: true },
      FILE_ID,
      "view",
    );
    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(filesRepository.createSignedUrl).not.toHaveBeenCalled();
    expect(filesRepository.markFileRead).not.toHaveBeenCalled();
  });

  it("un cliente in Onboarding non ottiene nulla, nemmeno con l'id del proprio file", async () => {
    const result = await service.openFile(
      { kind: "client", clientId: CLIENT, unlocked: false },
      FILE_ID,
      "view",
    );
    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(filesRepository.getFile).not.toHaveBeenCalled();
    expect(filesRepository.createSignedUrl).not.toHaveBeenCalled();
    expect(filesRepository.markFileRead).not.toHaveBeenCalled();
  });

  it("lo staff dello studio apre il file senza registrare la lettura", async () => {
    const result = await service.openFile(staff, FILE_ID, "view");
    expect(result.ok).toBe(true);
    expect(filesRepository.markFileRead).not.toHaveBeenCalled();
    expect(db.files.get(FILE_ID)!.first_read_at).toBeNull();
  });
});

describe("openFile: prima lettura (C-05)", () => {
  it("la prima apertura del cliente registra la data, le successive no", async () => {
    const first = await service.openFile(anna, FILE_ID, "view");
    expect(first).toMatchObject({
      ok: true,
      category: "diet",
      clientId: CLIENT,
    });
    const readAt = db.files.get(FILE_ID)!.first_read_at;
    expect(readAt).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.openFile(anna, FILE_ID, "download");
    expect(db.files.get(FILE_ID)!.first_read_at).toBe(readAt);
    expect(filesRepository.markFileRead).toHaveBeenCalledTimes(1);
  });

  it("lo scaricamento usa un nome ricavato dal titolo", async () => {
    await service.openFile(anna, FILE_ID, "download");
    expect(filesRepository.createSignedUrl).toHaveBeenCalledWith(
      PATH,
      "Piano alimentare ottobre.pdf",
    );
    await service.openFile(anna, FILE_ID, "view");
    expect(filesRepository.createSignedUrl).toHaveBeenLastCalledWith(
      PATH,
      undefined,
    );
  });

  it("se l'oggetto manca in Storage il file non risulta letto", async () => {
    db.objects.clear();
    const result = await service.openFile(anna, FILE_ID, "view");
    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(filesRepository.markFileRead).not.toHaveBeenCalled();
  });
});

describe("caricamento", () => {
  const NEW_ID = "11111111-2222-4333-8444-555555555555";
  const NEW_PATH = `${STUDIO}/${CLIENT}/${NEW_ID}.pdf`;
  const input = {
    clientId: CLIENT,
    fileId: NEW_ID,
    category: "diet" as const,
    title: "Piano novembre",
    validFrom: "2026-11-01",
    note: null,
    notify: true,
  };

  it("prepareUpload costruisce il percorso dallo studio della sessione", async () => {
    const result = await service.prepareUpload(STUDIO, { clientId: CLIENT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(filesRepository.createSignedUploadUrl).toHaveBeenCalledWith(
      `${STUDIO}/${CLIENT}/${result.fileId}.pdf`,
    );
  });

  it("prepareUpload rifiuta un cliente di un altro studio", async () => {
    const result = await service.prepareUpload(OTHER_STUDIO, {
      clientId: CLIENT,
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(filesRepository.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("conferma: crea la riga con la dimensione reale e avvisa il cliente", async () => {
    db.objects.set(NEW_PATH, { size: 9 * 1024 * 1024, head: "%PDF-1.4" });
    expect(await service.confirmUpload(STUDIO, input)).toEqual({ ok: true });
    expect(filesRepository.insertFile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: NEW_ID,
        storagePath: NEW_PATH,
        sizeBytes: 9 * 1024 * 1024,
        studioId: STUDIO,
      }),
    );
    expect(notifyClient).toHaveBeenCalledWith(CLIENT, {
      type: "file_published",
    });
  });

  it("senza 'Avvisa il cliente' nessuna notifica", async () => {
    db.objects.set(NEW_PATH, { size: 1000, head: "%PDF-1.4" });
    await service.confirmUpload(STUDIO, { ...input, notify: false });
    expect(notifyClient).not.toHaveBeenCalled();
  });

  it.each([
    [
      "oltre 10 MB",
      { size: FILE_MAX_BYTES + 1, head: "%PDF-1.4" },
      "too_large",
    ],
    [
      "un .docx rinominato",
      { size: 1000, head: "PK\u0003\u0004" },
      "invalid_pdf",
    ],
    ["vuoto", { size: 0, head: "" }, "empty"],
  ])(
    "conferma: un file %s viene eliminato e la riga non si crea",
    async (_, object, reason) => {
      db.objects.set(NEW_PATH, object);
      expect(await service.confirmUpload(STUDIO, input)).toEqual({
        ok: false,
        reason,
      });
      expect(db.objects.has(NEW_PATH)).toBe(false);
      expect(filesRepository.insertFile).not.toHaveBeenCalled();
      expect(notifyClient).not.toHaveBeenCalled();
    },
  );

  it("conferma: oggetto mai caricato", async () => {
    expect(await service.confirmUpload(STUDIO, input)).toEqual({
      ok: false,
      reason: "upload_failed",
    });
    expect(filesRepository.insertFile).not.toHaveBeenCalled();
  });

  it("conferma: il percorso non dipende dal browser (altro studio = cliente non trovato)", async () => {
    db.objects.set(NEW_PATH, { size: 1000, head: "%PDF-1.4" });
    expect(await service.confirmUpload(OTHER_STUDIO, input)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(filesRepository.getObjectInfo).not.toHaveBeenCalled();
  });

  it("conferma: se l'inserimento fallisce l'oggetto viene eliminato", async () => {
    db.objects.set(NEW_PATH, { size: 1000, head: "%PDF-1.4" });
    vi.mocked(filesRepository.insertFile).mockRejectedValueOnce(
      new Error("db"),
    );
    await expect(service.confirmUpload(STUDIO, input)).rejects.toThrow("db");
    expect(db.objects.has(NEW_PATH)).toBe(false);
  });

  it("conferma ripetuta: nessun errore e nessuna seconda notifica", async () => {
    db.objects.set(PATH, { size: 1000, head: "%PDF-1.4" });
    const result = await service.confirmUpload(STUDIO, {
      ...input,
      fileId: FILE_ID,
    });
    expect(result).toEqual({ ok: true });
    expect(db.objects.has(PATH)).toBe(true);
    expect(notifyClient).not.toHaveBeenCalled();
  });
});

describe("deleteFile", () => {
  it("lo staff di un altro studio non elimina", async () => {
    expect(await service.deleteFile(OTHER_STUDIO, FILE_ID)).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(db.files.has(FILE_ID)).toBe(true);
  });

  it("elimina riga e oggetto", async () => {
    expect(await service.deleteFile(STUDIO, FILE_ID)).toEqual({
      ok: true,
      clientId: CLIENT,
    });
    expect(db.files.has(FILE_ID)).toBe(false);
    expect(db.objects.has(PATH)).toBe(false);
  });

  it("se lo Storage fallisce registra l'errore senza bloccare", async () => {
    db.removeFails = true;
    expect((await service.deleteFile(STUDIO, FILE_ID)).ok).toBe(true);
    expect(db.files.has(FILE_ID)).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("non eliminato"),
      expect.objectContaining({ fileId: FILE_ID }),
    );
  });
});

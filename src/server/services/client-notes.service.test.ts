import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Note cliniche con Supabase simulato: il finto repository imita la RLS
 * (solo lo studio della nota), l'indice unico dell'anamnesi e la UPDATE
 * condizionata su updated_at (controllo di concorrenza).
 */

const STUDIO = "aaaaaaaa-1111-4000-8000-000000000000";
const OTHER_STUDIO = "bbbbbbbb-1111-4000-8000-000000000000";
const CLIENT = "aaaaaaaa-2222-4000-8000-000000000001";
const NOTE = "3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0002";

type FakeNote = {
  id: string;
  studio_id: string;
  client_id: string;
  kind: "anamnesis" | "visit";
  title: string;
  visit_date: string | null;
  content: unknown;
  content_text: string;
  created_at: string;
  updated_at: string;
};

const db = {
  notes: new Map<string, FakeNote>(),
  clients: new Map<string, { studio_id: string }>([
    [CLIENT, { studio_id: STUDIO }],
  ]),
  clock: 0,
};

function tick() {
  db.clock += 1;
  return new Date(Date.UTC(2026, 10, 12, 10, 0, db.clock)).toISOString();
}

vi.mock("@/server/repositories/clients.repository", () => ({
  getClientProfile: vi.fn(async (id: string) => {
    const client = db.clients.get(id);
    return client ? { id, ...client } : null;
  }),
}));

vi.mock("@/server/repositories/client-notes.repository", () => ({
  listNotes: vi.fn(async (clientId: string) =>
    [...db.notes.values()].filter((n) => n.client_id === clientId),
  ),
  getNote: vi.fn(async (id: string) => db.notes.get(id) ?? null),
  insertNote: vi.fn(
    async (row: {
      studioId: string;
      clientId: string;
      kind: "anamnesis" | "visit";
      title: string;
      visitDate: string | null;
      content: unknown;
      contentText: string;
    }) => {
      if (
        row.kind === "anamnesis" &&
        [...db.notes.values()].some(
          (n) => n.client_id === row.clientId && n.kind === "anamnesis",
        )
      ) {
        return null;
      }
      const id = `note-${db.notes.size + 1}`;
      const at = tick();
      db.notes.set(id, {
        id,
        studio_id: db.clients.get(row.clientId)!.studio_id,
        client_id: row.clientId,
        kind: row.kind,
        title: row.title,
        visit_date: row.visitDate,
        content: row.content,
        content_text: row.contentText,
        created_at: at,
        updated_at: at,
      });
      return { id };
    },
  ),
  updateNote: vi.fn(
    async (
      id: string,
      values: {
        title: string;
        visitDate: string | null;
        content: unknown;
        contentText: string;
      },
      expected: string | null,
    ) => {
      const note = db.notes.get(id);
      if (!note || (expected && note.updated_at !== expected)) return null;
      Object.assign(note, {
        title: values.title,
        visit_date: values.visitDate,
        content: values.content,
        content_text: values.contentText,
        updated_at: tick(),
      });
      return {
        id,
        title: note.title,
        visit_date: note.visit_date,
        updated_at: note.updated_at,
      };
    },
  ),
  deleteNote: vi.fn(async (id: string) => {
    db.notes.delete(id);
  }),
}));

const service = await import("./client-notes.service");

const doc = (text: string) => ({
  type: "doc" as const,
  content: [
    { type: "paragraph" as const, content: [{ type: "text" as const, text }] },
  ],
});

function seedVisit() {
  const at = tick();
  db.notes.set(NOTE, {
    id: NOTE,
    studio_id: STUDIO,
    client_id: CLIENT,
    kind: "visit",
    title: "Visita di controllo",
    visit_date: "2026-11-10",
    content: doc("prima"),
    content_text: "prima",
    created_at: at,
    updated_at: at,
  });
  return at;
}

beforeEach(() => {
  db.notes.clear();
  db.clock = 0;
});

describe("getStaffNotes", () => {
  it("crea l'anamnesi al primo accesso, una sola volta", async () => {
    const first = await service.getStaffNotes(STUDIO, CLIENT);
    const second = await service.getStaffNotes(STUDIO, CLIENT);
    expect(first?.notes.map((n) => n.kind)).toEqual(["anamnesis"]);
    expect(second?.notes).toHaveLength(1);
    expect(first?.notes[0]?.title).toBe("Anamnesi");
    expect(first?.selected?.kind).toBe("anamnesis");
  });

  it("altro studio: null e nessuna anamnesi creata", async () => {
    expect(await service.getStaffNotes(OTHER_STUDIO, CLIENT)).toBeNull();
    expect(db.notes.size).toBe(0);
  });

  it("apre la nota richiesta solo se è di quel cliente", async () => {
    seedVisit();
    const ok = await service.getStaffNotes(STUDIO, CLIENT, NOTE);
    expect(ok?.selected?.content).toEqual(doc("prima"));
    db.clients.set("altro", { studio_id: STUDIO });
    const other = await service.getStaffNotes(STUDIO, "altro", NOTE);
    expect(other?.selected).toBeNull();
  });
});

describe("saveNote e conflitti", () => {
  const input = (expectedUpdatedAt: string, force = false) => ({
    noteId: NOTE,
    title: "Visita",
    visitDate: "2026-11-11",
    content: doc("nuovo testo"),
    expectedUpdatedAt,
    force,
  });

  it("salva con la versione caricata e calcola il testo semplice", async () => {
    const loaded = seedVisit();
    const result = await service.saveNote(STUDIO, input(loaded));
    expect(result.ok).toBe(true);
    expect(db.notes.get(NOTE)?.content_text).toBe("nuovo testo");
    expect(db.notes.get(NOTE)?.visit_date).toBe("2026-11-11");
    if (result.ok) expect(result.data.updatedAt).not.toBe(loaded);
  });

  it("versione cambiata altrove: conflict, nulla sovrascritto", async () => {
    const loaded = seedVisit();
    await service.saveNote(STUDIO, { ...input(loaded), content: doc("altro") });
    const result = await service.saveNote(STUDIO, input(loaded));
    expect(result).toEqual({ ok: false, reason: "conflict" });
    expect(db.notes.get(NOTE)?.content_text).toBe("altro");
  });

  it("dopo un salvataggio la nuova versione vale per il successivo", async () => {
    const loaded = seedVisit();
    const first = await service.saveNote(STUDIO, input(loaded));
    if (!first.ok) throw new Error("atteso ok");
    const second = await service.saveNote(
      STUDIO,
      input(first.data.updatedAt),
    );
    expect(second.ok).toBe(true);
  });

  it("Sovrascrivi comunque: force ignora la versione", async () => {
    seedVisit();
    const result = await service.saveNote(STUDIO, input("vecchia", true));
    expect(result.ok).toBe(true);
    expect(db.notes.get(NOTE)?.content_text).toBe("nuovo testo");
  });

  it("nota eliminata nel frattempo: not_found", async () => {
    const loaded = seedVisit();
    const { updateNote } = await import(
      "@/server/repositories/client-notes.repository"
    );
    vi.mocked(updateNote).mockImplementationOnce(async () => {
      db.notes.delete(NOTE);
      return null;
    });
    expect(await service.saveNote(STUDIO, input(loaded))).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("altro studio: not_found", async () => {
    const loaded = seedVisit();
    expect(await service.saveNote(OTHER_STUDIO, input(loaded))).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("l'anamnesi non prende la data", async () => {
    await service.getStaffNotes(STUDIO, CLIENT);
    const anamnesis = [...db.notes.values()][0]!;
    const result = await service.saveNote(STUDIO, {
      ...input(anamnesis.updated_at),
      noteId: anamnesis.id,
    });
    expect(result.ok && result.data.visitDate).toBeNull();
  });
});

describe("createVisitNote e deleteNote", () => {
  it("nuova nota con titolo standard e data di oggi", async () => {
    const result = await service.createVisitNote(STUDIO, CLIENT);
    if (!result.ok) throw new Error("atteso ok");
    const note = db.notes.get(result.data.id);
    expect(note?.title).toBe("Visita di controllo");
    expect(note?.visit_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("l'anamnesi non si elimina, una visita sì", async () => {
    await service.getStaffNotes(STUDIO, CLIENT);
    const anamnesis = [...db.notes.values()][0]!;
    expect(await service.deleteNote(STUDIO, anamnesis.id)).toEqual({
      ok: false,
      reason: "anamnesis",
    });
    seedVisit();
    expect((await service.deleteNote(STUDIO, NOTE)).ok).toBe(true);
    expect(db.notes.has(NOTE)).toBe(false);
  });

  it("altro studio non crea né elimina", async () => {
    expect((await service.createVisitNote(OTHER_STUDIO, CLIENT)).ok).toBe(false);
    seedVisit();
    expect((await service.deleteNote(OTHER_STUDIO, NOTE)).ok).toBe(false);
  });
});

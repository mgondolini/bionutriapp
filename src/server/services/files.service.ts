import "server-only";

import { randomUUID } from "node:crypto";

import {
  FILE_MAX_BYTES,
  PDF_MAGIC,
  clientFilePath,
  type FileCategory,
  type FileOpenMode,
  type FileUploadError,
} from "@/lib/constants/domain";
import {
  currentFileIds,
  latestPublished,
  splitCurrentAndArchive,
} from "@/lib/files/current-file";
import { downloadFileName, hasPdfHeader } from "@/lib/files/file-checks";
import { dayInRome } from "@/lib/format";
import * as clientsRepository from "@/server/repositories/clients.repository";
import * as filesRepository from "@/server/repositories/files.repository";
import { notifyClient } from "@/server/services/notifications.service";
import type {
  ConfirmUploadData,
  PrepareUploadInput,
} from "@/server/validation/files.schema";

/** File come lo vede l'interfaccia (admin e cliente). */
export type FileItem = {
  id: string;
  category: FileCategory;
  title: string;
  validFrom: string | null;
  note: string | null;
  sizeBytes: number;
  uploadedAt: string;
  firstReadAt: string | null;
};

/** File nella scheda dello staff, con il badge "In corso" per categoria. */
export type StaffFileItem = FileItem & { current: boolean };

type FileRow = Awaited<
  ReturnType<typeof filesRepository.listClientFiles>
>[number];

function toFileItem(row: FileRow): FileItem {
  return {
    id: row.id,
    category: row.category as FileCategory,
    title: row.title,
    validFrom: row.valid_from,
    note: row.note,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at,
    firstReadAt: row.first_read_at,
  };
}

/** Il cliente esiste ed è dello studio della sessione (RLS + controllo esplicito). */
async function loadOwnedClient(studioId: string, clientId: string) {
  const client = await clientsRepository.getClientProfile(clientId);
  return client?.studio_id === studioId ? client : null;
}

async function isOwnedClient(studioId: string, clientId: string) {
  return (await loadOwnedClient(studioId, clientId)) !== null;
}

// ---------------------------------------------------------------------
// Letture
// ---------------------------------------------------------------------

export type StaffFiles = {
  clientId: string;
  clientName: string;
  files: StaffFileItem[];
};

/** Scheda File (A-10): tutti i file del cliente, dal più recente; null se non è dello studio. */
export async function getStaffFiles(
  studioId: string,
  clientId: string,
): Promise<StaffFiles | null> {
  const client = await loadOwnedClient(studioId, clientId);
  if (!client) return null;
  const files = (await filesRepository.listClientFiles(clientId)).map(
    toFileItem,
  );
  const current = currentFileIds(files, dayInRome());
  return {
    clientId,
    clientName: [client.first_name, client.last_name].filter(Boolean).join(" "),
    files: files.map((file) => ({ ...file, current: current.has(file.id) })),
  };
}

/** File del cliente della sessione (la RLS li nasconde in Onboarding, C-09). */
async function getOwnFiles(clientId: string): Promise<FileItem[]> {
  return (await filesRepository.listClientFiles(clientId)).map(toFileItem);
}

/** Pagine Diete, Allenamenti e Report (C-04): file in corso e archivio. */
export async function getClientCategoryFiles(
  clientId: string,
  category: FileCategory,
) {
  const files = (await getOwnFiles(clientId)).filter(
    (file) => file.category === category,
  );
  return splitCurrentAndArchive(files, dayInRome());
}

/** Home del cliente (C-02): ultimo file pubblicato, di qualsiasi categoria. */
export async function getClientLatestFile(
  clientId: string,
): Promise<FileItem | null> {
  return latestPublished(await getOwnFiles(clientId));
}

// ---------------------------------------------------------------------
// Caricamento in tre passaggi (A-08): prepara → il browser carica → conferma
// ---------------------------------------------------------------------

export type PrepareUploadResult =
  | { ok: true; fileId: string; uploadUrl: string }
  | { ok: false; reason: "not_found" };

/**
 * Primo passaggio: percorso costruito SOLO qui, dallo studio della sessione
 * e dal cliente verificato; il browser riceve l'id e l'URL di caricamento.
 */
export async function prepareUpload(
  studioId: string,
  input: Pick<PrepareUploadInput, "clientId">,
): Promise<PrepareUploadResult> {
  if (!(await isOwnedClient(studioId, input.clientId))) {
    return { ok: false, reason: "not_found" };
  }
  const fileId = randomUUID();
  const uploadUrl = await filesRepository.createSignedUploadUrl(
    clientFilePath(studioId, input.clientId, fileId),
  );
  return { ok: true, fileId, uploadUrl };
}

export type ConfirmUploadResult =
  { ok: true } | { ok: false; reason: "not_found" | FileUploadError };

/** Elimina l'oggetto che non ha passato la verifica; un errore qui finisce solo nei log. */
async function discardObject(path: string, fileId: string) {
  const error = await filesRepository.removeObject(path);
  if (error) {
    console.error("[file] oggetto scartato non eliminato", {
      fileId,
      error: error.message,
    });
  }
}

/**
 * Terzo passaggio: verifica l'oggetto REALE (esiste, al massimo 10 MB, inizia
 * con "%PDF-") e solo allora crea la riga. Se la verifica fallisce, l'oggetto
 * viene eliminato. Con "Avvisa il cliente" passa da notifyClient (N-06).
 */
export async function confirmUpload(
  studioId: string,
  input: ConfirmUploadData,
): Promise<ConfirmUploadResult> {
  if (!(await isOwnedClient(studioId, input.clientId))) {
    return { ok: false, reason: "not_found" };
  }
  const path = clientFilePath(studioId, input.clientId, input.fileId);

  const info = await filesRepository.getObjectInfo(path);
  if (!info) return { ok: false, reason: "upload_failed" };

  let rejection: FileUploadError | null = null;
  if (info.size <= 0) rejection = "empty";
  else if (info.size > FILE_MAX_BYTES) rejection = "too_large";
  else {
    const head = await filesRepository.readObjectHead(path, PDF_MAGIC.length);
    if (!head || !hasPdfHeader(head)) rejection = "invalid_pdf";
  }
  if (rejection) {
    await discardObject(path, input.fileId);
    return { ok: false, reason: rejection };
  }

  let inserted: "ok" | "duplicate";
  try {
    inserted = await filesRepository.insertFile({
      id: input.fileId,
      studioId,
      clientId: input.clientId,
      category: input.category,
      title: input.title,
      storagePath: path,
      sizeBytes: info.size,
      validFrom: input.validFrom,
      note: input.note,
    });
  } catch (error) {
    await discardObject(path, input.fileId);
    throw error;
  }
  // Doppio invio della conferma: il file c'è già, niente seconda notifica.
  if (inserted === "duplicate") return { ok: true };

  if (input.notify) {
    try {
      await notifyClient(input.clientId, { type: "file_published" });
    } catch (error) {
      // la pubblicazione è riuscita: una notifica mancata non la annulla
      console.error("[file] notifica non inviata", {
        fileId: input.fileId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------
// Apertura ed eliminazione
// ---------------------------------------------------------------------

/** Chi apre un file: lo staff con il proprio studio, o il cliente della sessione. */
export type FileActor =
  | { kind: "staff"; studioId: string }
  | { kind: "client"; clientId: string; unlocked: boolean };

export type OpenFileResult =
  | {
      ok: true;
      url: string;
      clientId: string;
      category: FileCategory;
    }
  | { ok: false; reason: "not_found" | "unavailable" };

/**
 * Unico percorso di apertura e scaricamento, per staff e cliente (DEV-05).
 * Il cliente in Onboarding non ottiene nulla, senza nemmeno leggere il file;
 * la RLS (my_unlocked_client_id) resta la seconda barriera. Alla prima
 * apertura del cliente si registra la lettura (C-05); le successive non
 * cambiano la data. URL firmato di 60 secondi (NF-02).
 */
export async function openFile(
  actor: FileActor,
  fileId: string,
  mode: FileOpenMode,
): Promise<OpenFileResult> {
  if (actor.kind === "client" && !actor.unlocked) {
    return { ok: false, reason: "not_found" };
  }

  const file = await filesRepository.getFile(fileId);
  const allowed =
    file &&
    (actor.kind === "staff"
      ? file.studio_id === actor.studioId
      : file.client_id === actor.clientId);
  if (!file || !allowed) return { ok: false, reason: "not_found" };

  const url = await filesRepository.createSignedUrl(
    file.storage_path,
    mode === "download" ? downloadFileName(file.title) : undefined,
  );
  if (!url) return { ok: false, reason: "unavailable" };

  // Dopo l'URL: un file mancante in Storage non risulta "letto".
  if (actor.kind === "client" && !file.first_read_at) {
    await filesRepository.markFileRead(file.id);
  }
  return {
    ok: true,
    url,
    clientId: file.client_id,
    category: file.category as FileCategory,
  };
}

export type DeleteFileResult =
  { ok: true; clientId: string } | { ok: false; reason: "not_found" };

/**
 * Eliminazione (A-11): prima la riga (il cliente non vede mai un file
 * rotto), poi l'oggetto. Se l'oggetto non si elimina resta solo nei log.
 */
export async function deleteFile(
  studioId: string,
  fileId: string,
): Promise<DeleteFileResult> {
  const file = await filesRepository.getFile(fileId);
  if (!file || file.studio_id !== studioId) {
    return { ok: false, reason: "not_found" };
  }
  const path = await filesRepository.deleteFileRow(fileId);
  if (!path) return { ok: false, reason: "not_found" };

  const error = await filesRepository.removeObject(path);
  if (error) {
    console.error("[file] oggetto non eliminato dallo Storage", {
      fileId,
      clientId: file.client_id,
      error: error.message,
    });
  }
  return { ok: true, clientId: file.client_id };
}

import "server-only";

import {
  CLIENT_FILES_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/constants/domain";
import { createClient } from "@/lib/supabase/server";

/*
 * File dei clienti (A-08…A-11, C-04, C-05). Si usa sempre il client
 * dell'utente: la RLS di client_files e le policy dello Storage valgono
 * anche qui (lo staff solo sui clienti del proprio studio, il cliente solo
 * sui propri file e non in Onboarding). La secret key non serve.
 */

const FILE_COLUMNS =
  "id, client_id, category, title, valid_from, note, size_bytes, uploaded_at, first_read_at";

/** File di un cliente, dal più recente. Vuoto se la RLS non li mostra. */
export async function listClientFiles(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select(FILE_COLUMNS)
    .eq("client_id", clientId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Un file con il suo percorso; null se non esiste o la RLS non lo mostra. */
export async function getFile(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select(`${FILE_COLUMNS}, studio_id, storage_path`)
    .eq("id", fileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type NewFileRow = {
  id: string;
  studioId: string;
  clientId: string;
  category: string;
  title: string;
  storagePath: string;
  sizeBytes: number;
  validFrom: string;
  note: string | null;
};

/**
 * Riga del file, creata solo dopo la verifica dell'oggetto in Storage.
 * "duplicate": il file era già stato confermato (doppio invio).
 */
export async function insertFile(row: NewFileRow): Promise<"ok" | "duplicate"> {
  const supabase = await createClient();
  const { error } = await supabase.from("client_files").insert({
    id: row.id,
    // ricalcolato comunque dal trigger a partire dal cliente
    studio_id: row.studioId,
    client_id: row.clientId,
    category: row.category,
    title: row.title,
    storage_path: row.storagePath,
    size_bytes: row.sizeBytes,
    valid_from: row.validFrom,
    note: row.note,
  });
  if (error?.code === "23505") return "duplicate";
  if (error) throw error;
  return "ok";
}

/** Elimina la riga e restituisce il percorso dell'oggetto; null se non c'era. */
export async function deleteFileRow(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .delete()
    .eq("id", fileId)
    .select("storage_path")
    .maybeSingle();
  if (error) throw error;
  return data?.storage_path ?? null;
}

/** URL firmato per caricare UN oggetto in quel percorso, senza sovrascrivere. */
export async function createSignedUploadUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data.signedUrl;
}

/** Dimensione e tipo dell'oggetto salvato; null se non esiste. */
export async function getObjectInfo(
  path: string,
): Promise<{ size: number; contentType: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .info(path);
  if (error || !data) return null;
  return { size: data.size ?? 0, contentType: data.contentType ?? null };
}

/** Primi `length` byte dell'oggetto, con una richiesta Range (non si scarica tutto il file). */
export async function readObjectHead(
  path: string,
  length: number,
): Promise<Uint8Array | null> {
  const url = await createSignedUrl(path);
  if (!url) return null;
  const response = await fetch(url, {
    headers: { Range: `bytes=0-${length - 1}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.subarray(0, length);
}

/** Elimina l'oggetto; restituisce l'errore invece di lanciarlo (chi chiama decide). */
export async function removeObject(path: string): Promise<Error | null> {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .remove([path]);
  return error ?? null;
}

/**
 * URL firmato valido 60 secondi (NF-02); con `downloadName` forza lo
 * scaricamento con quel nome. Null se l'oggetto non esiste.
 */
export async function createSignedUrl(
  path: string,
  downloadName?: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .createSignedUrl(
      path,
      SIGNED_URL_TTL_SECONDS,
      downloadName ? { download: downloadName } : undefined,
    );
  if (error || !data) return null;
  return data.signedUrl;
}

/** Prima lettura del cliente (C-05): la RPC aggiorna solo se first_read_at è vuoto. */
export async function markFileRead(fileId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_file_read", { p_file_id: fileId });
  if (error) throw error;
}

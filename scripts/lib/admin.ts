/**
 * Parti comuni degli script dell'amministratore che usano la secret key
 * (esportazione e cancellazione dei dati di un cliente). Fuori da Next.js:
 * niente moduli "server-only", supabase-js diretto.
 */
import { existsSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/types/database";

export const CLIENT_FILES_BUCKET = "client-files";
export const CLIENT_PHOTOS_BUCKET = "client-photos";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminClient = SupabaseClient<Database>;

export function fail(message: string): never {
  console.error(`Errore: ${message}`);
  process.exit(1);
}

/** Client con secret key dalle variabili del file --env (o dell'ambiente). */
export function adminFromEnv(envFile: string | undefined): {
  supabase: AdminClient;
  host: string;
} {
  if (envFile && existsSync(envFile)) process.loadEnvFile(envFile);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    fail(
      "servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (file --env o variabili d'ambiente)",
    );
  }
  return {
    supabase: createClient<Database>(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    host: new URL(url).hostname,
  };
}

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

/**
 * Cliente indicato con --client <id>, oppure con --studio <slug> e
 * --phone <cellulare in E.164> (unico per studio).
 */
export async function findClient(
  supabase: AdminClient,
  options: { client?: string; studio?: string; phone?: string },
): Promise<ClientRow> {
  let query = supabase.from("clients").select("*");
  if (options.client) {
    if (!UUID.test(options.client)) fail("--client deve essere un id (uuid)");
    query = query.eq("id", options.client);
  } else if (options.studio && options.phone) {
    const { data: studio } = await supabase
      .from("studios")
      .select("id")
      .eq("slug", options.studio)
      .maybeSingle();
    if (!studio) fail(`studio "${options.studio}" non trovato`);
    query = query.eq("studio_id", studio.id).eq("phone", options.phone);
  } else {
    fail("indica --client <id> oppure --studio <slug> e --phone <+39…>");
  }
  const { data, error } = await query.maybeSingle();
  if (error) fail(`lettura del cliente non riuscita: ${error.message}`);
  if (!data) fail("cliente non trovato");
  return data;
}

/** Tutti gli oggetti dello Storage del cliente: righe di client_files e cartella {studio}/{cliente}/. */
export async function clientStoragePaths(
  supabase: AdminClient,
  client: ClientRow,
): Promise<string[]> {
  const paths = new Set<string>();
  const { data: files, error } = await supabase
    .from("client_files")
    .select("storage_path")
    .eq("client_id", client.id);
  if (error) fail(`lettura dei file non riuscita: ${error.message}`);
  for (const file of files) paths.add(file.storage_path);

  // anche gli oggetti senza riga (caricamenti mai confermati)
  const folder = `${client.studio_id}/${client.id}`;
  for (let offset = 0; ; offset += 100) {
    const { data: objects, error: listError } = await supabase.storage
      .from(CLIENT_FILES_BUCKET)
      .list(folder, { limit: 100, offset });
    if (listError)
      fail(`elenco dello Storage non riuscito: ${listError.message}`);
    for (const object of objects) paths.add(`${folder}/${object.name}`);
    if (objects.length < 100) break;
  }
  return [...paths];
}

/**
 * Oggetti delle foto di avanzamento del cliente: quelli delle righe e quelli
 * senza riga nelle cartelle dei suoi set ({studio}/{cliente}/{set}/…).
 */
export async function clientPhotoPaths(
  supabase: AdminClient,
  client: ClientRow,
): Promise<string[]> {
  const paths = new Set<string>();
  const { data: photos, error } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("client_id", client.id);
  if (error) fail(`lettura delle foto non riuscita: ${error.message}`);
  for (const photo of photos) paths.add(photo.storage_path);

  const { data: sets, error: setsError } = await supabase
    .from("photo_sets")
    .select("id")
    .eq("client_id", client.id);
  if (setsError)
    fail(`lettura dei set di foto non riuscita: ${setsError.message}`);
  for (const set of sets) {
    const folder = `${client.studio_id}/${client.id}/${set.id}`;
    const { data: objects, error: listError } = await supabase.storage
      .from(CLIENT_PHOTOS_BUCKET)
      .list(folder, { limit: 100 });
    if (listError)
      fail(`elenco dello Storage non riuscito: ${listError.message}`);
    for (const object of objects) paths.add(`${folder}/${object.name}`);
  }
  return [...paths];
}

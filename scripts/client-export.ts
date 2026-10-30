/**
 * Diritto di accesso e portabilità (artt. 15 e 20 GDPR, NF-06): esporta in una
 * cartella locale tutti i dati di un cliente, cioè anagrafica, consensi,
 * storico delle fasi, inviti (senza hash), file (metadati e PDF),
 * registrazioni del tracking, obiettivi, dispositivi per le notifiche (senza
 * chiavi) e dati dell'account.
 *
 * Uso:
 *   pnpm client:export --client <id> --out <cartella> [--env .env.production.local]
 *   pnpm client:export --studio <slug> --phone +393331234567 --out <cartella> [--env …]
 *
 * La cartella contiene dati sanitari: va creata su un disco cifrato, inviata
 * al cliente con un canale sicuro e poi eliminata (docs/operativita.md).
 * Nei log solo id e conteggi.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  adminFromEnv,
  CLIENT_FILES_BUCKET,
  fail,
  findClient,
} from "./lib/admin";

const { values } = parseArgs({
  options: {
    client: { type: "string" },
    studio: { type: "string" },
    phone: { type: "string" },
    out: { type: "string" },
    env: { type: "string", default: ".env.local" },
  },
});

if (!values.out) fail("indica la cartella di destinazione con --out");
const outDir = resolve(values.out);
if (existsSync(outDir) && readdirSync(outDir).length > 0) {
  fail(`la cartella ${outDir} esiste e non è vuota`);
}

const { supabase } = adminFromEnv(values.env);

async function rows<T>(
  label: string,
  promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const { data, error } = await promise;
  if (error) fail(`lettura di ${label} non riuscita: ${error.message}`);
  return data ?? [];
}

async function main() {
  const client = await findClient(supabase, values);
  const id = client.id;

  const [studio, consents, stages, invites, files, entries, goals] =
    await Promise.all([
      supabase
        .from("studios")
        .select("name, slug")
        .eq("id", client.studio_id)
        .single(),
      rows(
        "consensi",
        supabase
          .from("privacy_consents")
          .select("kind, policy_version, accepted_at")
          .eq("client_id", id)
          .order("accepted_at"),
      ),
      rows(
        "storico fasi",
        supabase
          .from("client_stage_events")
          .select("from_stage, to_stage, source, changed_at")
          .eq("client_id", id)
          .order("changed_at"),
      ),
      rows(
        "inviti",
        supabase
          .from("client_invites")
          .select("created_at, expires_at, sent_at, used_at, revoked_at")
          .eq("client_id", id)
          .order("created_at"),
      ),
      rows(
        "file",
        supabase
          .from("client_files")
          .select(
            "id, category, title, valid_from, note, size_bytes, uploaded_at, first_read_at, storage_path",
          )
          .eq("client_id", id)
          .order("uploaded_at"),
      ),
      rows(
        "registrazioni",
        supabase
          .from("tracking_entries")
          .select(
            "recorded_on, value, note, created_at, updated_at, metrics(key, name, unit)",
          )
          .eq("client_id", id)
          .order("recorded_on"),
      ),
      rows(
        "obiettivi",
        supabase
          .from("client_metric_goals")
          .select("goal_value, updated_at, metrics(key, name)")
          .eq("client_id", id),
      ),
    ]);

  let account: Record<string, unknown> | null = null;
  let devices: unknown[] = [];
  if (client.user_id) {
    const { data, error } = await supabase.auth.admin.getUserById(
      client.user_id,
    );
    if (error) fail(`lettura dell'account non riuscita: ${error.message}`);
    account = {
      email: data.user.email ?? null,
      phone: data.user.phone ?? null,
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at ?? null,
    };
    devices = await rows(
      "dispositivi",
      supabase
        .from("push_subscriptions")
        .select("user_agent, created_at")
        .eq("user_id", client.user_id),
    );
  }

  mkdirSync(join(outDir, "file"), { recursive: true });
  let downloaded = 0;
  for (const file of files) {
    const { data, error } = await supabase.storage
      .from(CLIENT_FILES_BUCKET)
      .download(file.storage_path);
    if (error || !data) {
      console.error(`File ${file.id}: download non riuscito`);
      continue;
    }
    writeFileSync(
      join(outDir, "file", `${file.id}.pdf`),
      Buffer.from(await data.arrayBuffer()),
    );
    downloaded++;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- id interni esclusi dall'esportazione
  const { user_id: _userId, studio_id: _studioId, ...personal } = client;
  const exported = {
    esportato_il: new Date().toISOString(),
    titolare: studio.data,
    cliente: personal,
    account,
    consensi: consents,
    storico_fasi: stages,
    inviti: invites,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- percorso interno escluso
    file: files.map(({ storage_path: _path, ...file }) => ({
      ...file,
      pdf: `file/${file.id}.pdf`,
    })),
    registrazioni: entries,
    obiettivi_personali: goals,
    dispositivi_notifiche: devices,
  };
  writeFileSync(join(outDir, "dati.json"), JSON.stringify(exported, null, 2));

  console.log(`Cliente ${id} esportato in ${outDir}`);
  console.log(
    `File: ${downloaded}/${files.length}, registrazioni: ${entries.length}, consensi: ${consents.length}`,
  );
  console.log(
    "ATTENZIONE: la cartella contiene dati sanitari. Consegnala con un canale sicuro ed eliminala subito dopo.",
  );
}

main().catch((error: unknown) =>
  fail(error instanceof Error ? error.message : String(error)),
);

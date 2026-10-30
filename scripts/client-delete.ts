/**
 * Diritto alla cancellazione (art. 17 GDPR, NF-06): elimina DEFINITIVAMENTE
 * tutti i dati di un cliente.
 *   1. oggetti dello Storage (PDF, anche quelli mai confermati);
 *   2. sottoscrizioni push dell'account;
 *   3. riga del cliente: registrazioni, file, inviti, storico fasi, obiettivi
 *      e consensi vanno a cascata;
 *   4. utente di Supabase Auth (le sessioni vanno a cascata).
 *
 * Senza --confirm mostra solo cosa verrebbe eliminato (prova a vuoto).
 * --confirm vuole di nuovo l'id del cliente, per evitare errori di copia.
 *
 * Uso:
 *   pnpm client:delete --client <id> [--env .env.production.local]
 *   pnpm client:delete --client <id> --confirm <id> [--env …]
 *   (oppure --studio <slug> --phone +39… al posto di --client)
 *
 * Prima di cancellare valutare se serve un'esportazione (client:export) e se
 * esistono obblighi di conservazione (docs/operativita.md). I backup già
 * fatti contengono ancora i dati fino alla loro scadenza.
 * Nei log solo id e conteggi.
 */
import { parseArgs } from "node:util";

import {
  adminFromEnv,
  CLIENT_FILES_BUCKET,
  clientStoragePaths,
  fail,
  findClient,
} from "./lib/admin";

const { values } = parseArgs({
  options: {
    client: { type: "string" },
    studio: { type: "string" },
    phone: { type: "string" },
    confirm: { type: "string" },
    env: { type: "string", default: ".env.local" },
  },
});

const { supabase, host } = adminFromEnv(values.env);

async function count(
  table:
    "tracking_entries" | "client_files" | "client_invites" | "privacy_consents",
  clientId: string,
) {
  const { count: total, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);
  if (error) fail(`conteggio di ${table} non riuscito: ${error.message}`);
  return total ?? 0;
}

async function main() {
  const client = await findClient(supabase, values);
  const paths = await clientStoragePaths(supabase, client);
  let devices = 0;
  if (client.user_id) {
    const { count: total } = await supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", client.user_id);
    devices = total ?? 0;
  }

  console.log(`Progetto: ${host}`);
  console.log(`Cliente: ${client.id} (studio ${client.studio_id})`);
  console.log(`  oggetti nello Storage: ${paths.length}`);
  console.log(`  righe dei file: ${await count("client_files", client.id)}`);
  console.log(`  registrazioni: ${await count("tracking_entries", client.id)}`);
  console.log(`  inviti: ${await count("client_invites", client.id)}`);
  console.log(`  consensi: ${await count("privacy_consents", client.id)}`);
  console.log(`  dispositivi push: ${devices}`);
  console.log(`  account Auth: ${client.user_id ?? "nessuno"}`);

  if (values.confirm === undefined) {
    console.log(
      `\nProva a vuoto: nulla è stato eliminato. Per procedere aggiungi --confirm ${client.id}`,
    );
    return;
  }
  if (values.confirm !== client.id) {
    fail(
      "--confirm non corrisponde all'id del cliente: nulla è stato eliminato",
    );
  }

  // 1. Storage (a blocchi: l'API accetta al massimo 1000 percorsi)
  for (let i = 0; i < paths.length; i += 500) {
    const { error } = await supabase.storage
      .from(CLIENT_FILES_BUCKET)
      .remove(paths.slice(i, i + 500));
    if (error)
      fail(`eliminazione dallo Storage non riuscita: ${error.message}`);
  }
  console.log(`Storage: ${paths.length} oggetti eliminati`);

  // 2. Sottoscrizioni push
  if (client.user_id) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", client.user_id);
    if (error)
      fail(`eliminazione delle sottoscrizioni non riuscita: ${error.message}`);
  }
  console.log(`Notifiche: ${devices} sottoscrizioni eliminate`);

  // 3. Cliente (cascata sulle tabelle collegate). Prima dell'utente Auth:
  // un cliente attivo deve avere un account (clients_active_requires_account).
  const { error: clientError } = await supabase
    .from("clients")
    .delete()
    .eq("id", client.id);
  if (clientError)
    fail(`eliminazione del cliente non riuscita: ${clientError.message}`);
  console.log("Cliente e dati collegati eliminati");

  // 4. Utente Auth
  if (client.user_id) {
    const { error } = await supabase.auth.admin.deleteUser(client.user_id);
    if (error) {
      fail(
        `cliente eliminato, ma l'utente Auth ${client.user_id} no: ${error.message}. Eliminalo dal pannello (Authentication > Users).`,
      );
    }
    console.log("Utente Auth eliminato");
  }
  console.log(`Cancellazione completata per il cliente ${client.id}.`);
}

main().catch((error: unknown) =>
  fail(error instanceof Error ? error.message : String(error)),
);

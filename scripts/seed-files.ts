/**
 * Carica un PDF di prova nello Storage LOCALE per ogni riga di client_files
 * del seed (il seed SQL crea solo i metadati). Da lanciare dopo
 * `pnpm supabase db reset`, per aprire i file dall'interfaccia.
 *
 * Uso: pnpm seed:files [--env .env.local]
 *
 * Usa la secret key e rifiuta qualsiasi URL che non sia locale.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";
import { samplePdf } from "./sample-pdf";

const BUCKET = "client-files";

const { values } = parseArgs({
  options: { env: { type: "string", default: ".env.local" } },
});
if (values.env && existsSync(values.env)) process.loadEnvFile(values.env);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(
    "Errore: mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY",
  );
  process.exit(1);
}
const host = new URL(url).hostname;
if (host !== "127.0.0.1" && host !== "localhost") {
  console.error(
    `Errore: lo script funziona solo con Supabase locale (trovato ${host})`,
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: files, error } = await supabase
    .from("client_files")
    .select("id, title, storage_path");
  if (error) {
    console.error(`Errore: ${error.message}`);
    process.exit(1);
  }

  let uploaded = 0;
  for (const file of files) {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(file.storage_path, samplePdf(file.title), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) {
      console.error(`File ${file.id}: ${uploadError.message}`);
    } else {
      uploaded += 1;
    }
  }
  console.log(`Caricati ${uploaded} PDF di prova su ${files.length} file.`);
}

void main();

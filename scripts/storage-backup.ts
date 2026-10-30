/**
 * Copia dei file dello Storage (PDF dei clienti e loghi degli studi) per il
 * backup manuale del piano gratuito (docs/operativita.md, "Backup").
 *
 * Uso:
 *   pnpm storage:backup --out <cartella> [--env .env.production.local]
 *   pnpm storage:backup --restore <cartella> [--env …]   (ripristino)
 *
 * La cartella contiene dati sanitari: va creata su un disco cifrato e poi
 * archiviata cifrata (age). Mai su GitHub o servizi cloud generici.
 * Il ripristino carica solo gli oggetti mancanti (non sovrascrive).
 * Nei log solo conteggi.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import { adminFromEnv, fail, type AdminClient } from "./lib/admin";

const BUCKETS = ["client-files", "studio-assets"] as const;
const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    restore: { type: "string" },
    env: { type: "string", default: ".env.local" },
  },
});

const { supabase, host } = adminFromEnv(values.env);

/** Tutti i percorsi di un bucket, visitando le cartelle. */
async function listAll(client: AdminClient, bucket: string, prefix = "") {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset });
    if (error) fail(`elenco di ${bucket} non riuscito: ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // le cartelle non hanno id
      if (item.id === null)
        paths.push(...(await listAll(client, bucket, path)));
      else paths.push(path);
    }
    if (data.length < 100) break;
  }
  return paths;
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

async function backup(outDir: string) {
  if (existsSync(outDir) && readdirSync(outDir).length > 0) {
    fail(`la cartella ${outDir} esiste e non è vuota`);
  }
  for (const bucket of BUCKETS) {
    const paths = await listAll(supabase, bucket);
    let saved = 0;
    for (const path of paths) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      if (error || !data) {
        console.error(`${bucket}: un oggetto non scaricato`);
        continue;
      }
      const target = join(outDir, bucket, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(await data.arrayBuffer()));
      saved++;
    }
    console.log(`${bucket}: ${saved}/${paths.length} oggetti salvati`);
  }
}

async function restore(fromDir: string) {
  for (const bucket of BUCKETS) {
    const root = join(fromDir, bucket);
    const files = filesUnder(root);
    let uploaded = 0;
    let skipped = 0;
    for (const file of files) {
      const path = relative(root, file).split("\\").join("/");
      const extension = path.split(".").pop()?.toLowerCase() ?? "";
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, readFileSync(file), {
          contentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
          upsert: false,
        });
      if (!error) uploaded++;
      else if (/exists|Duplicate/i.test(error.message)) skipped++;
      else
        console.error(`${bucket}: un oggetto non caricato (${error.message})`);
    }
    console.log(
      `${bucket}: ${uploaded} caricati, ${skipped} già presenti, ${files.length} nel backup`,
    );
  }
}

async function main() {
  console.log(`Progetto: ${host}`);
  if (values.restore) return restore(resolve(values.restore));
  if (!values.out) fail("indica --out <cartella> oppure --restore <cartella>");
  return backup(resolve(values.out));
}

main().catch((error: unknown) =>
  fail(error instanceof Error ? error.message : String(error)),
);

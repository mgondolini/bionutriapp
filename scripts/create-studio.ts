/**
 * Script dell'amministratore piattaforma: crea uno studio e il suo titolare.
 * Nessuna interfaccia; usa la secret key (bypassa la RLS), quindi gira solo in locale
 * o sulla macchina dello sviluppatore.
 *
 * Uso:
 *   pnpm studio:create --name "Studio Verde" --slug studio-verde \
 *     --email titolare@example.com --display-name "Dott.ssa Verdi" [--color "#2E6A4E"] [--env .env.local]
 *
 * Stampa il link con cui il titolare sceglie la propria password (valido un'ora).
 * Lo script è uno strumento separato dall'app: non passa dai repository, che
 * importano "server-only" e funzionano solo dentro Next.js.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

const SLUG = /^[a-z0-9-]{3,50}$/;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function fail(message: string): never {
  console.error(`Errore: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    slug: { type: "string" },
    email: { type: "string" },
    "display-name": { type: "string" },
    color: { type: "string" },
    env: { type: "string", default: ".env.local" },
  },
});

if (values.env && existsSync(values.env)) process.loadEnvFile(values.env);

const name = values.name?.trim();
const slug = values.slug?.trim();
const email = values.email?.trim().toLowerCase();
const displayName = values["display-name"]?.trim();
const color = values.color?.trim().toUpperCase();

if (!name || !slug || !email || !displayName) {
  fail(
    "parametri obbligatori: --name, --slug, --email, --display-name (vedi l'intestazione dello script)",
  );
}
if (!SLUG.test(slug))
  fail("lo slug deve avere 3-50 caratteri tra minuscole, cifre e trattini");
if (color && !HEX_COLOR.test(color))
  fail("il colore deve essere nel formato #RRGGBB");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!url || !secretKey || !appUrl) {
  fail(
    "servono NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e NEXT_PUBLIC_APP_URL (file --env o variabili d'ambiente)",
  );
}

const supabase = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: existing } = await supabase
    .from("studios")
    .select("id")
    .eq("slug", slug!)
    .maybeSingle();
  if (existing) fail(`esiste già uno studio con slug "${slug}"`);

  // 1. Utente titolare (email confermata: la password la sceglie lui dal link)
  const { data: created, error: userError } =
    await supabase.auth.admin.createUser({
      email: email!,
      email_confirm: true,
    });
  if (userError || !created.user)
    fail(`creazione dell'utente non riuscita: ${userError?.message}`);
  const userId = created.user.id;

  // 2. Studio (le 9 misure predefinite vengono create dal trigger) e 3. titolare.
  // In caso di errore si annulla quanto già creato.
  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .insert({
      name: name!,
      slug: slug!,
      ...(color ? { primary_color: color } : {}),
    })
    .select("id")
    .single();
  if (studioError || !studio) {
    await supabase.auth.admin.deleteUser(userId);
    fail(`creazione dello studio non riuscita: ${studioError?.message}`);
  }

  const { error: memberError } = await supabase.from("studio_members").insert({
    studio_id: studio.id,
    user_id: userId,
    role: "owner",
    display_name: displayName!,
  });
  if (memberError) {
    await supabase.from("studios").delete().eq("id", studio.id);
    await supabase.auth.admin.deleteUser(userId);
    fail(`creazione del titolare non riuscita: ${memberError.message}`);
  }

  // 4. Link per scegliere la password (stesso formato dell'email di recupero)
  const { data: link, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email!,
    });
  if (linkError || !link.properties?.hashed_token) {
    fail(
      `studio creato, ma il link non è stato generato: ${linkError?.message}. Usa "Password dimenticata?" dal login.`,
    );
  }

  const params = new URLSearchParams({
    token_hash: link.properties.hashed_token,
    type: "recovery",
  });
  console.log(`Studio "${name}" creato (slug: ${slug}, id: ${studio.id}).`);
  console.log(`Titolare: ${displayName} <${email}>`);
  console.log("Link per scegliere la password (valido un'ora):");
  console.log(`${appUrl}/nuova-password?${params.toString()}`);
}

main().catch((error: unknown) =>
  fail(error instanceof Error ? error.message : String(error)),
);

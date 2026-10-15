@AGENTS.md

# CLAUDE.md

## Panoramica

Web app per biologi nutrizionisti: il nutrizionista (admin) carica file PDF (diete) per i propri clienti; i clienti fanno login e vedono i file nel proprio profilo. Circa 100 clienti: privilegiare semplicità e costi bassi. Oggi un solo studio, ma l'app è **multi-tenant** e **white label**. Interfaccia **in italiano**.

## Stack

- Next.js 16 (solo App Router), React 19, TypeScript strict
- Tailwind CSS 4, shadcn/ui (stile `base-nova`, Base UI) in `src/components/ui`, icone lucide-react
- Supabase (Postgres, Auth, Storage, RLS) via `@supabase/supabase-js` e `@supabase/ssr`
- Zod (validazione), react-hook-form + `@hookform/resolvers` (form; usare il componente shadcn `field` con `Controller`)
- web-push (notifiche push VAPID), `server-only`
- Deploy: Netlify; Supabase in region UE. Package manager: pnpm (versione fissata in `packageManager`).

## Comandi

```bash
pnpm dev            # server di sviluppo
pnpm build          # build di produzione
pnpm lint           # ESLint
pnpm typecheck      # next typegen + tsc --noEmit
pnpm format         # Prettier
pnpm supabase migration new <nome>  # nuova migrazione
pnpm supabase db push               # applica le migrazioni al progetto collegato
```

Prima di considerare concluso un lavoro: `pnpm lint`, `pnpm typecheck` e `pnpm build` devono passare.

## Architettura a livelli

Il flusso è sempre: **pagina/componente → action → service → repository → Supabase**. Nessun livello salta quello successivo.

- `src/app/` — solo pagine, layout e route. Gruppi di route `(admin)` (nutrizionista) e `(cliente)`. Nessuna logica di business né query dirette.
- `src/server/actions/` — Server Actions ("controller"): verificano autenticazione e autorizzazione, validano l'input con Zod, chiamano i service e restituiscono il risultato alla UI.
- `src/server/services/` — logica di business; orchestrano i repository; non conoscono Supabase.
- `src/server/repositories/` — **unico livello che accede a Supabase** (database, Storage, Auth admin).
- `src/server/validation/` — schemi Zod, condivisi tra Server Actions e form client (per questo non importano `server-only`).
- `src/components/` — componenti UI; `src/components/ui` è riservata a shadcn.
- `src/lib/supabase/` — `client.ts` (browser), `server.ts` (server), `middleware.ts` (refresh sessione, usato da `src/proxy.ts`).
- `src/types/` — tipi condivisi (inclusi i tipi generati dal database).

## Convenzioni di codice

- TypeScript strict; niente `any` non giustificati.
- Server Components di default; `"use client"` solo quando serve interattività (stato, eventi, hook del browser).
- Ogni modulo solo-server (services, repositories, client Supabase server, codice con chiavi segrete) importa `"server-only"` come prima riga.
- Ogni input esterno (form, parametri, searchParams, payload) è validato con Zod lato server, anche se già validato nel client.
- Solo App Router: niente `pages/`. In Next.js 16 il middleware si chiama `proxy` (`src/proxy.ts`).
- Next.js 16 ha API diverse dalle versioni precedenti: consultare `node_modules/next/dist/docs/` prima di usare API non note.
- Import con alias `@/*`. Formattazione con Prettier.

## Sicurezza

- **RLS sempre attiva** su ogni tabella, con policy esplicite; nessuna tabella senza policy.
- File (PDF) solo in **bucket privati**; accesso tramite **URL firmati** a scadenza breve, generati lato server dopo il controllo dei permessi.
- **Nessun dato sanitario nel testo delle notifiche push** (es. "Hai un nuovo documento disponibile", mai il contenuto o il nome della dieta).
- `SUPABASE_SECRET_KEY` (secret key `sb_secret_…`, equivalente della vecchia service role) e `VAPID_PRIVATE_KEY` solo lato server, mai con prefisso `NEXT_PUBLIC_`; il client con secret key si usa solo nei repository e solo quando la RLS non è applicabile.
- Mai committare file `.env*` (tranne `.env.example`) né chiavi reali.
- Autorizzazione verificata nelle Server Actions (non affidarsi al solo proxy).

## Multi-tenant e white label

- Ogni tabella di dominio ha la colonna `studio_id`; le policy RLS filtrano sempre per lo studio dell'utente.
- Branding (nome, logo, colori) letto dal database per studio: mai scrivere nome, logo o colori di uno studio nel codice.

## Decisioni sul database

- **Migrazioni**: finché nulla è applicato a un progetto remoto esiste una sola migrazione, `supabase/migrations/20261011000000_schema_iniziale.sql`, che si modifica direttamente. Dal primo deploy ogni modifica è una nuova migrazione (DEV-19). I file in `docs/database` sono solo riferimento storico.
- **Versioni future**: `supabase/future/v2_appuntamenti.sql` e `v3_collaboratori.sql` non vengono applicati da `db reset`; al rilascio si spostano in `supabase/migrations` con un nuovo timestamp (vedi `supabase/future/README.md`). La v1.0 usa già il ruolo `'owner'` in `studio_members`: la 3.0 allarga solo il check.
- **Funzioni helper** delle policy nello schema `private` (security definer, `search_path = ''`), non esposto dalle API.
- **Trigger come garanzia**: `studio_id` delle tabelle figlie ricavato sempre dal cliente; campi protetti (`guard_*`): il cliente modifica di sé solo nome, cognome e `push_enabled`; lo staff non tocca `user_id`/`activated_at` né i campi di sistema dei file e degli inviti. `auth.uid()` nullo = operazione lato server, libera.
- **Contatti**: cellulare normalizzato in E.164 da trigger (la normalizzazione completa resta nello schema Zod), email in minuscolo; entrambi unici per studio.
- **Fase iniziale** decisa dall'origine: `'imported'` → In percorso, `'new'` → Onboarding. Lo staff crea clienti sempre in `to_invite`.
- **Storico fasi** (`client_stage_events`) scritto solo da trigger, anche alla creazione. Origine `'automatic'` se l'operazione è lato server o se la transazione imposta `set_config('app.stage_source', 'automatic', true)` (v2.0, CAL-14).
- **Inviti**: solo hash SHA-256 (esadecimale) del token; scadenza forzata a creazione + 14 giorni; un nuovo invito revoca i precedenti nella stessa transazione (indice unico parziale come garanzia); disattivare un cliente revoca gli inviti aperti. Uno stato `invite_expired` non si salva: si legge da `clients_with_status` o `client_account_status()`. L'attivazione passa solo da `activate_client(token_hash, user_id)`, eseguibile con la secret key; vale anche come nuovo link per un cliente già attivo (N-02).
- **Accesso del cliente per fase**: account attivo richiesto; in Onboarding legge profilo, studio e configurazione delle misure, ma non file, tracking e obiettivi (C-09); scrive le proprie registrazioni solo In percorso (In pausa e Concluso = sola lettura). Lo staff scrive in ogni fase.
- **Tracking**: validazione nel trigger `validate_tracking_entry` (limiti, interi per i voti, nota solo per gli allenamenti, data non futura in `Europe/Rome` tramite `private.today_rome()`); "un valore al giorno" per le misure `daily` garantito da un indice unico parziale su `is_daily`. `recorded_on` non ha default: l'app la invia sempre.
- **Misure predefinite** create da trigger alla creazione dello studio; valori ancora da confermare marcati `-- DA CONFERMARE`.
- **File**: `first_read_at` solo tramite `mark_file_read()`; percorso `{studio_id}/{client_id}/{uuid}.pdf` verificato sia dal check sulla tabella sia dalle policy di Storage.
- **Push**: registrazione tramite `register_push_subscription()`, che riassegna l'endpoint all'utente corrente.
- **Ruolo anon**: nessun privilegio sulle tabelle; il branding pubblico passa da `get_studio_branding(slug)`.
- **Test** pgTAP in `supabase/tests` (`pnpm db:test`); gli helper e le fixture sono in `00000_helpers.sql`. Dopo ogni modifica allo schema: `pnpm supabase db reset`, `pnpm db:test`, `pnpm db:types`.

## Lingua

Interfaccia, messaggi di errore e testi visibili all'utente in **italiano**.

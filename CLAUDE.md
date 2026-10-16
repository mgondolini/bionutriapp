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

- **Migrazioni**: `20261011000000_schema_iniziale.sql` è lo schema di partenza; da `20261016000000_client_list.sql` in poi ogni modifica è una **nuova** migrazione in `supabase/migrations` (DEV-19), mai una modifica di quelle esistenti. I file in `docs/database` sono solo riferimento storico.
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

## Decisioni di architettura (fase 2: accesso, smistamento, branding)

- **Cartelle**: aree in `src/app/(admin)/admin` e `src/app/(cliente)/app` (DEV-01), pagine di autenticazione in `src/app/(auth)`. Componenti: `components/ui` (shadcn), `components/shared` (usati da più aree), `features/admin`, `features/cliente`, `features/auth` (pagine di accesso). Costanti di dominio in `src/lib/constants/domain.ts`, testi in `src/lib/copy/it.ts`; ESLint (`react/jsx-no-literals`) blocca i testi scritti nel JSX. Le stringhe nelle props visibili (`aria-label`, `placeholder`, `alt`) vengono comunque da `copy`.
- **Letture e scritture**: le pagine e i layout leggono tramite i service; le Server Actions servono solo alle modifiche e restituiscono `ActionResult<T>` (`src/types/action-result.ts`). Eccezione: login e nuova password terminano con `redirect()` in caso di successo.
- **Ruolo**: si ricava solo da `my_context()` (studio_members / clients.user_id). `resolveUserContext` (puro) lo interpreta per proxy e `getSession()`; `getSession` usa `cache` di React e `connection()`. `loadSession()` è la versione non memorizzata, da usare dopo login o cambio password nella stessa richiesta.
- **Controllo degli accessi su tre livelli (DEV-03)**: `src/proxy.ts` (in Next 16 il middleware si chiama `proxy`) smista con la funzione pura `decideRoute` (`src/lib/auth/route-decision.ts`); i layout di area ripetono il controllo con `requireStaff` / `requireClient` / `requireDisabledClient`; la RLS resta l'ultima barriera. Le pagine bloccate in Onboarding chiamano `requireClient({ unlocked: true })` (un layout non viene rieseguito fra pagine sorelle).
- **Cache Components** (`cacheComponents: true`): ogni lettura di sessione, cookie o `searchParams` sta dietro un `<Suspense>` (guard dei layout, tema, form con `next`). Il redirect di un guard arriva quindi nello stream (HTTP 200 + redirect), mentre quello del proxy è un 307.
- **Branding (A-14)**: `resolveStudio()` usa lo studio della sessione, altrimenti `getPublicStudio()` (oggi `NEXT_PUBLIC_DEFAULT_STUDIO_SLUG`, in futuro sottodominio). Il branding si legge con la RPC `get_studio_branding` tramite un client senza cookie (`src/lib/supabase/public.ts`), in `use cache` con tag `studio-branding:<slug>`, invalidato da `updateTag` al salvataggio. Il colore sovrascrive `--primary` (`StudioThemeStyle`); il testo sopra il primario è bianco o `#18211D`, quello con il contrasto maggiore (`src/lib/color.ts`).
- **Manifest e icone**: `src/app/manifest.ts` (`start_url: "/app"`), `src/app/icon.tsx` (192, 512, maskable) e `apple-icon.tsx`, generati con `ImageResponse` dal logo o dalle iniziali; usano lo studio del dominio perché il browser li scarica senza cookie. Loghi solo PNG/JPEG, con nome nuovo a ogni upload (`{studio_id}/logo-<uuid>.<ext>`); il vecchio viene eliminato.
- **Recupero password senza Route Handler (DEV-05)**: il template `supabase/templates/recovery.html` porta a `/nuova-password?token_hash=…&type=recovery`; il token si verifica (`verifyOtp`) solo all'invio del form, così l'anteprima dei link nei client di posta non lo consuma. Messaggi sempre generici (non si rivela se un'email esiste). In locale le email si leggono da Mailpit (http://127.0.0.1:54324).
- **Login**: il campo si chiama `identifier`; `auth.service.resolveLoginEmail()` è l'unico punto da estendere per il cellulare (fase 4). Un account senza ruolo viene disconnesso con lo stesso errore delle credenziali errate.
- **Secret key**: `src/lib/supabase/admin.ts` (`server-only`), importabile solo da `src/server/repositories` (regola ESLint `no-restricted-imports`). Lo script `scripts/create-studio.ts` (`pnpm studio:create`) è uno strumento separato e usa `supabase-js` direttamente, perché i moduli `server-only` non si importano fuori da Next.
- **Accessibilità**: pulsanti e input shadcn portati a 44 px (`h-11`) nei componenti `ui`; link "Vai al contenuto"; menu e pannelli Base UI navigabili da tastiera.
- **Test**: Vitest (`pnpm test`) su funzioni pure e service con repository simulati; `server-only` è sostituito da uno stub in `vitest.config.mts`.

## Decisioni di architettura (fase 3: clienti)

- **Elenco con una query**: la vista `client_list` (`security_invoker`, su `clients_with_status`) restituisce per ogni cliente stato calcolato, fase, ultimo file e data dell'ultima misura con due `LEFT JOIN LATERAL` (indici `client_files_last_idx`, `tracking_entries_last_idx`). `clients.repository.listClients()` fa una sola SELECT; filtri, ricerca e conteggi sono funzioni pure in `src/lib/clients/list-filters.ts` (circa 100 clienti per studio, NF-11).
- **Conteggi a faccette**: ogni select conta applicando la ricerca e l'altro filtro, non il proprio.
- **URL**: filtri e ricerca in `?stato=…&fase=…&q=…` (`CLIENT_LIST_PARAMS`), costruiti con `clientListUrl()`. Un filtro fa `router.push` (Indietro lo annulla), la ricerca `router.replace` con 300 ms di ritardo. Valori non validi ignorati da `clientListParamsSchema`.
- **Telefono**: `src/lib/phone.ts` con libphonenumber-js (paese predefinito IT) per normalizzazione in E.164, formattazione e ricerca (cifre con e senza 39/0039). Il trigger del database resta la seconda barriera.
- **Creazione (A-04)**: `createClientSchema` è un'unione discriminata su `mode` ("new" → origine `new`, "full" → `imported`); il form usa valori "piatti" (`CreateClientFormValues`) e invia alla Server Action i valori grezzi (`raw: true`), che li rivalida. Fase iniziale e stato `to_invite` li impone il trigger; i duplicati arrivano dagli indici unici e vengono tradotti in errori di campo.
- **Import CSV (A-05)**: il file viene letto nel browser e passa alle Server Actions come testo (anteprima e conferma). Parsing in `src/lib/csv/parse-clients-csv.ts` (separatore ricavato dall'intestazione, alias italiani), pulizia in `src/lib/csv/clean-clients.ts` (righe scartate con motivo, correzioni come avvisi). Alla conferma il server rianalizza il file e inserisce con un solo INSERT (atomico); un conflitto nel frattempo annulla tutto. Limiti: 1.000 righe e 1 MB, verificati anche sul server.
- **Scheda cliente**: `/admin/clienti/[id]` con schede come rotte figlie (`profilo`, `file`, `tracking`, `clientDetailPath()`); id non valido, inesistente o di un altro studio → `notFound()` (la RLS nasconde gli altri studi). Il layout sta dietro un Suspense, quindi la pagina 404 arriva nello stream (stato HTTP 200).
- **Inviti**: `invites.actions.ts` controlla sessione e input ma per ora risponde "Disponibile a breve" (fase 4).

## Lingua

Interfaccia, messaggi di errore e testi visibili all'utente in **italiano**.

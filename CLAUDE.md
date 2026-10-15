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

## Lingua

Interfaccia, messaggi di errore e testi visibili all'utente in **italiano**.

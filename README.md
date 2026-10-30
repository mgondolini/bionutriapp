# bionutriapp

Web app per biologi nutrizionisti. Il nutrizionista carica i file PDF (diete, piani alimentari) per i propri clienti e ne segue il percorso; ogni cliente accede dal telefono, consulta i file, registra misure e abitudini e riceve una notifica quando arriva un nuovo documento.

L'app è **multi-tenant** e **white label**: oggi serve un solo studio, ma nome, logo e colori di ogni studio stanno nel database e non sono mai scritti nel codice. L'interfaccia è in italiano.

Versione attuale: **1.1.0**. Le novità sono in [CHANGELOG.md](CHANGELOG.md).

## Funzionalità

**Area del nutrizionista** (`/admin`)

- Elenco clienti con filtri, ricerca, creazione e import da CSV.
- Scheda cliente: profilo, fasi del percorso, invito via WhatsApp, file e tracking.
- Caricamento di PDF con avviso al cliente, obiettivi personali delle abitudini.
- Impostazioni dello studio e profilo del professionista.

**Area del cliente** (`/app`, installabile come app)

- Attivazione dal link d'invito, con consensi privacy.
- File per categoria, con il file in corso e l'archivio.
- Tracking: circonferenze, check-in giornaliero delle abitudini, allenamenti, grafici.
- Notifiche push, profilo, uscita da uno o da tutti i dispositivi.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components) + React 19 + TypeScript (strict)
- [Tailwind CSS](https://tailwindcss.com) 4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) + [lucide-react](https://lucide.dev)
- [Supabase](https://supabase.com): Postgres, Auth, Storage, Row Level Security
- [Zod](https://zod.dev), [react-hook-form](https://react-hook-form.com), [Recharts](https://recharts.org)
- [web-push](https://github.com/web-push-libs/web-push) per le notifiche (chiavi VAPID)
- Test: [Vitest](https://vitest.dev), [Playwright](https://playwright.dev) con axe, pgTAP
- Deploy: [Netlify](https://www.netlify.com); Supabase in region UE

## Requisiti

- Node.js 22 e pnpm (versione in `packageManager` di `package.json`, attivabile con `corepack enable`)
- Docker, per Supabase in locale
- Un progetto Supabase in region UE per il deploy

## Avvio in locale

```bash
pnpm install
cp .env.example .env.local          # poi compila i valori (vedi sotto)
pnpm exec web-push generate-vapid-keys   # chiavi per le push, da copiare in .env.local
pnpm supabase start                 # Supabase locale (Docker)
pnpm supabase db reset              # migrazioni + seed di sviluppo
pnpm seed:files                     # PDF di prova per i file del seed
pnpm dev                            # http://localhost:3000
```

`pnpm supabase status` mostra URL e chiavi del Supabase locale da mettere in `.env.local`. Le email (inviti, recupero password) si leggono da Mailpit su http://127.0.0.1:54324.

**Utenti del seed** (dati inventati, password `password123`): i titolari di `studio-verde` e `studio-blu` e sei clienti in stati e fasi diversi. Gli indirizzi sono in cima a [`supabase/seed.sql`](supabase/seed.sql); Marco non ha email ed entra con il cellulare `333 000 0002`.

## Variabili d'ambiente

| Variabile                              | Visibilità      | Descrizione                                                                                                  |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | pubblica        | URL del progetto Supabase                                                                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pubblica        | Publishable key (`sb_publishable_…`); i dati sono protetti dalla RLS                                         |
| `SUPABASE_SECRET_KEY`                  | **solo server** | Secret key (`sb_secret_…`): bypassa la RLS. Serve a inviti, attivazione, push e manutenzione                 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | pubblica        | Chiave pubblica VAPID, incorporata nel codice del browser alla build                                         |
| `VAPID_PRIVATE_KEY`                    | **solo server** | Chiave privata VAPID, della stessa coppia della pubblica                                                     |
| `VAPID_SUBJECT`                        | solo server     | Contatto del mittente, **con il prefisso** `mailto:` (es. `mailto:info@esempio.it`) oppure un URL `https://` |
| `NEXT_PUBLIC_APP_URL`                  | pubblica        | URL pubblico dell'app (in locale `http://localhost:3000`)                                                    |
| `NEXT_PUBLIC_DEFAULT_STUDIO_SLUG`      | pubblica        | Studio delle pagine pubbliche (login, manifest)                                                              |
| `CRON_SECRET`                          | **solo server** | Segreto del cron di manutenzione, almeno 32 caratteri                                                        |

Le variabili con prefisso `NEXT_PUBLIC_` finiscono nel codice del browser: mai per chiavi segrete. Nessun file `.env*` (tranne `.env.example`) va committato.

## Comandi

| Comando                                        | Descrizione                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`       | Sviluppo, build e avvio della build                                       |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, controllo dei tipi, Prettier                                      |
| `pnpm test`                                    | Vitest (funzioni pure e service)                                          |
| `pnpm test:e2e`                                | Playwright (richiede Supabase locale con il seed)                         |
| `pnpm db:test`                                 | Test pgTAP del database                                                   |
| `pnpm db:types`                                | Rigenera `src/types/database.ts` dal database locale                      |
| `pnpm seed:files`                              | PDF di prova nello Storage per i file del seed                            |
| `pnpm studio:create`                           | Crea uno studio e il suo titolare                                         |
| `pnpm client:export`                           | Esporta i dati di un cliente (diritto di accesso, GDPR)                   |
| `pnpm client:delete`                           | Cancella un cliente e tutti i suoi dati (prova a vuoto senza `--confirm`) |
| `pnpm storage:backup`                          | Copia o ripristina i file dello Storage                                   |
| `pnpm supabase migration new <nome>`           | Nuova migrazione                                                          |
| `pnpm supabase db push`                        | Applica le migrazioni al progetto collegato                               |

Prima di considerare concluso un lavoro devono passare `pnpm lint`, `pnpm typecheck` e `pnpm build`.

## Struttura

```
.
├── docs/                     # Requisiti, operatività, checklist dei dispositivi, mockup
├── e2e/                      # Test Playwright
├── public/                   # Asset statici, service worker (sw.js), pagina offline
├── scripts/                  # Strumenti da terminale (studio, GDPR, backup, seed dei file)
├── supabase/
│   ├── migrations/           # Schema del database (una nuova migrazione per ogni modifica)
│   ├── tests/                # Test pgTAP
│   ├── templates/            # Email di Auth
│   ├── future/               # Schema delle versioni 2.0 e 3.0, non applicato
│   └── seed.sql              # Dati inventati per lo sviluppo
└── src/
    ├── app/                  # Solo pagine, layout e route: (admin), (cliente), (auth), …
    ├── components/           # ui/ (shadcn) e shared/ (usati da più aree)
    ├── features/             # Componenti per area: admin, cliente, auth
    ├── lib/                  # Funzioni pure, costanti di dominio, testi (copy/it.ts), client Supabase
    ├── server/
    │   ├── actions/          # Server Actions: sessione, autorizzazione, validazione
    │   ├── services/         # Logica di business
    │   ├── repositories/     # Unico livello che accede a Supabase
    │   └── validation/       # Schemi Zod condivisi con i form
    ├── types/                # Tipi condivisi e tipi generati del database
    └── proxy.ts              # Proxy di Next.js (ex middleware): sessione e smistamento
```

Il flusso è sempre pagina → action → service → repository → Supabase. Le decisioni di architettura, fase per fase, sono in [CLAUDE.md](CLAUDE.md).

## Deploy e operatività

La guida completa è in [`docs/operativita.md`](docs/operativita.md): progetti Supabase di prova e di produzione, impostazioni di Auth, variabili per contesto su Netlify, migrazioni, rotazione delle chiavi, email, backup e ripristino, richieste GDPR, test sul deploy di anteprima.

In breve:

1. Applica le migrazioni al progetto Supabase: `pnpm supabase link --project-ref <ref>` e `pnpm supabase db push`. Il seed va **solo** sul progetto di prova (`--include-seed`), mai in produzione.
2. Crea lo studio con `pnpm studio:create … --env <file>`.
3. Imposta le variabili su Netlify per ogni contesto (produzione, anteprime, branch) e rifai il deploy.
4. Imposta il secret `CRON_SECRET` della GitHub Action di manutenzione.

Prima di usare l'app con dati reali, vedi le questioni aperte in [CHANGELOG.md](CHANGELOG.md#note-per-la-messa-in-produzione).

# bionutriapp

Web app per biologi nutrizionisti. Il nutrizionista carica i file PDF (diete, piani alimentari) per i propri clienti; ogni cliente accede con le proprie credenziali e consulta i file nel proprio profilo.

L'app è pensata per essere **multi-tenant** e **white label**: oggi serve un solo studio, ma nome, logo e colori di ogni studio sono salvati nel database e non sono mai scritti nel codice. L'interfaccia è in italiano.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript (strict)
- [Tailwind CSS](https://tailwindcss.com) 4 + [shadcn/ui](https://ui.shadcn.com) (Base UI) + [lucide-react](https://lucide.dev)
- [Supabase](https://supabase.com): Postgres, Auth, Storage, Row Level Security (`@supabase/supabase-js`, `@supabase/ssr`)
- [Zod](https://zod.dev) per la validazione, [react-hook-form](https://react-hook-form.com) + `@hookform/resolvers` per i form
- [web-push](https://github.com/web-push-libs/web-push) per le notifiche push (chiavi VAPID)
- `server-only` per proteggere i moduli lato server
- ESLint, Prettier (+ `prettier-plugin-tailwindcss`), Supabase CLI

## Requisiti

- Node.js 20.9 o superiore (consigliato Node 22 LTS) e pnpm (versione indicata in `packageManager` di `package.json`, attivabile con `corepack enable`)
- Un progetto Supabase (region UE)
- Facoltativo, per Supabase in locale: Docker

## Setup locale

1. Clona il repository ed entra nella cartella:
   ```bash
   git clone <url-del-repository>
   cd bionutriapp
   ```
2. Installa le dipendenze:
   ```bash
   pnpm install
   ```
3. Crea il file delle variabili d'ambiente e compilalo (vedi sotto):
   ```bash
   cp .env.example .env.local
   ```
4. Genera le chiavi VAPID per le notifiche push e copiale in `.env.local`:
   ```bash
   pnpm exec web-push generate-vapid-keys
   ```
5. (Facoltativo) Collega la Supabase CLI al progetto remoto per gestire le migrazioni:
   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <project-ref>
   ```
6. Avvia il server di sviluppo e apri [http://localhost:3000](http://localhost:3000):
   ```bash
   pnpm dev
   ```

## Variabili d'ambiente

| Variabile                              | Visibilità      | Descrizione                                                                           |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | pubblica        | URL del progetto Supabase                                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pubblica        | Publishable key di Supabase (`sb_publishable_…`), i dati sono protetti dalla RLS      |
| `SUPABASE_SECRET_KEY`                  | **solo server** | Secret key di Supabase (`sb_secret_…`): bypassa la RLS, non va mai esposta al browser |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | pubblica        | Chiave pubblica VAPID per la sottoscrizione alle notifiche                            |
| `VAPID_PRIVATE_KEY`                    | **solo server** | Chiave privata VAPID per firmare le notifiche                                         |
| `VAPID_SUBJECT`                        | solo server     | Contatto del mittente (es. `mailto:info@esempio.it`)                                  |
| `NEXT_PUBLIC_APP_URL`                  | pubblica        | URL pubblico dell'app (in locale `http://localhost:3000`)                             |

Le variabili con prefisso `NEXT_PUBLIC_` vengono incluse nel bundle del browser: non usare mai questo prefisso per chiavi segrete. Nessun file `.env*` (tranne `.env.example`) va committato.

## Script disponibili

| Comando          | Descrizione                                             |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Avvia il server di sviluppo                             |
| `pnpm build`     | Build di produzione                                     |
| `pnpm start`     | Avvia la build di produzione                            |
| `pnpm lint`      | Analisi statica con ESLint                              |
| `pnpm typecheck` | Genera i tipi delle route e controlla i tipi TypeScript |
| `pnpm format`    | Formatta il codice con Prettier                         |

Gli script di installazione delle dipendenze sono bloccati di default: quelli consentiti sono elencati in `allowBuilds` dentro `pnpm-workspace.yaml` (per aggiungerne uno: `pnpm approve-builds`).

## Struttura delle cartelle

```
.
├── public/                   # Asset statici
├── supabase/                 # Configurazione Supabase CLI e (in futuro) migrazioni
└── src/
    ├── app/                  # Solo pagine, layout e route
    │   ├── (admin)/          # Area del nutrizionista
    │   └── (cliente)/        # Area del cliente
    ├── components/           # Componenti UI
    │   └── ui/               # Componenti shadcn/ui
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts     # Client Supabase per il browser
    │   │   ├── server.ts     # Client Supabase per il server
    │   │   └── middleware.ts # Refresh della sessione
    │   └── utils.ts
    ├── server/
    │   ├── actions/          # Server Actions: autorizzazione, validazione, chiamata ai service
    │   ├── services/         # Logica di business
    │   ├── repositories/     # Unico livello che accede a Supabase
    │   └── validation/       # Schemi Zod
    ├── types/                # Tipi condivisi
    └── proxy.ts              # Proxy di Next.js (ex middleware): refresh sessione Supabase
```

## Deploy

- **Hosting**: [Netlify](https://www.netlify.com), che supporta Next.js nativamente (runtime OpenNext). Imposta le variabili d'ambiente nel pannello del sito (Site configuration > Environment variables), con `SUPABASE_SECRET_KEY` e `VAPID_PRIVATE_KEY` limitate allo scope delle funzioni/build e mai esposte come `NEXT_PUBLIC_`. Aggiorna `NEXT_PUBLIC_APP_URL` con il dominio di produzione. Netlify riconosce pnpm da `pnpm-lock.yaml` e usa la versione indicata in `packageManager`.
- **Backend**: progetto Supabase creato in una **region UE** (es. Frankfurt `eu-central-1`) per la conformità GDPR, trattandosi di dati sanitari. Aggiungi l'URL di produzione tra i Redirect URLs in Authentication > URL Configuration.
- **Migrazioni**: applica le migrazioni della cartella `supabase/migrations` con `pnpm supabase db push`.

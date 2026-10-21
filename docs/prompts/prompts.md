# Nutrify – Prompt di sviluppo v1.0 (fasi 0–9)

Oct 15, 2026 · @Monica

## Come usare questi prompt

I prompt sono scritti per un agente che legge e modifica il repository da solo (Claude Code o simili). Se userai una chat senza accesso ai file, dovrai incollare insieme al prompt le parti del documento dei requisiti e del mockup che cita.

Prima della fase 0 aggiungi tutti i documenti del progetto nella cartella docs del repository, divisi in docs/mockups e docs/database. Ogni prompt li richiama con questi percorsi:

| Percorso nel repository | Contenuto |
| --- | --- |
| `CLAUDE.md` | Regole permanenti create nella fase 0: stack, architettura a livelli, design system, sicurezza, lingua italiana |
| `docs/requisiti.md` | Il documento dei requisiti aggiornato, già in Markdown, rinominato requisiti.md; contiene anche le linee guida di sviluppo DEV-01…DEV-20 |
| `docs/mockups/mockup.html` | Il mockup Nutrify v1.0, con le schermate A1–A12 (admin) e C1–C13 (cliente) |
| `docs/database/20261011000000_schema_iniziale.sql` | Schema iniziale della 1.0 |
| `docs/database/20261012000000_collaboratori_appuntamenti.sql` | La seconda migrazione, da dividere nella fase 1 |

I file in docs sono solo di riferimento: nella fase 1 l'agente copia le migrazioni in supabase/migrations, dove le legge la CLI di Supabase, e lascia intatti gli originali.

Ogni fase si svolge in tre passaggi, nella stessa sessione:

1. Incolli il prompt della fase. L'agente legge i file e risponde **solo con un piano**, senza scrivere codice.
2. Controlli il piano, chiedi correzioni e poi scrivi "Procedi".
3. A lavoro finito incolli il prompt di verifica in fondo al documento, sostituendo il numero della fase.

Apri una sessione nuova per ogni fase: il contesto resta pulito e le regole di `CLAUDE.md` vengono rilette da capo. Fai un commit a fine fase, così puoi tornare indietro se la fase successiva rompe qualcosa.

## Fase 0 – Setup e regole di progetto

Obiettivo: un progetto Next.js vuoto ma già ordinato, con controlli di qualità automatici, deploy su Netlify e il file `CLAUDE.md` che tutte le fasi successive rileggono. Nessuna funzionalità in questa fase.

Prima di lanciarla ti servono: Node.js LTS, Docker (per Supabase in locale), la Supabase CLI, un repository GitHub vuoto e un account Netlify. Il collegamento tra Netlify e GitHub lo fai tu dal pannello di Netlify: l'agente ti indica i passaggi.

```text
Sei uno sviluppatore senior esperto di Next.js, TypeScript e strumenti di qualità del codice. Avvii il progetto Nutrify da zero, in un repository che contiene solo la cartella docs.

## Contesto da leggere prima di tutto
- docs/requisiti.md, tutto il documento, con particolare attenzione a: "Architettura, stack e hosting", "Linee guida di sviluppo" (DEV-01…DEV-20), "Requisiti non funzionali" (NF-01…NF-12)
- docs/mockups/mockup.html, per i colori, il font e l'aspetto generale delle due aree

## Obiettivo della fase
Scaffolding del progetto, struttura delle cartelle, design system, controlli di qualità, CI, Supabase in locale, configurazione di Netlify e CLAUDE.md. Nessuna funzionalità, nessuno schema di database, nessuna autenticazione.

## Attività
1. Crea l'app Next.js con App Router, TypeScript strict, cartella src, ESLint. Aggiungi Tailwind CSS, shadcn/ui, lucide-react e il font Plus Jakarta Sans con next/font.
2. Crea la struttura delle cartelle descritta in "Architettura, stack e hosting" e in DEV-02:
   src/app/(admin)/admin, src/app/(cliente)/app, src/server/actions, src/server/services, src/server/repositories, src/server/validation, src/components/ui, src/components/shared, src/features/admin, src/features/cliente, src/lib, src/types.
   Una pagina segnaposto per /admin (layout con sidebar vuota, desktop-first) e una per /app (layout con intestazione, mobile-first), senza logica di accesso.
3. Design system NF-07 come variabili CSS in globals.css, collegate al tema di shadcn: sfondo #F5F6F2, superfici #FFFFFF, testo #18211D e #55605A, bordi #DDE2DB, primario #2E6A4E (sovrascrivibile per studio nella fase 2), info #E2ECF7/#1F4E80, attenzione #FBEBD9/#8A4513. Nessun colore scritto direttamente nei componenti.
4. Qualità del codice (DEV-15, DEV-16):
   - Prettier, ESLint con regole per TypeScript e accessibilità (jsx-a11y);
   - regola no-restricted-imports che vieta di importare @supabase/* fuori da src/server/repositories e src/lib/supabase, così DEV-05 viene controllato in automatico;
   - Husky e lint-staged: a ogni commit lint e formattazione dei file modificati;
   - script npm: dev, build, start, lint, format, typecheck, test (Vitest), test:e2e (per ora con un messaggio "configurato nella fase 4").
5. Vitest configurato, con un test d'esempio su una funzione pura in src/lib.
6. GitHub Action (DEV-17) su ogni push e pull request: installazione, lint, typecheck, test e build.
7. Supabase in locale: `supabase init`, nessuna migrazione ancora (arrivano nella fase 1). File .env.example con NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_DEFAULT_STUDIO_SLUG, ciascuna con un commento che dice se è pubblica o segreta. .env* reali esclusi da git.
8. Netlify (NF-12): netlify.toml per Next.js con versione di Node fissata. Scrivi in docs/operativita.md i passaggi che devo fare io per collegare il repository e impostare le variabili d'ambiente, così il deploy parte a ogni push sul branch principale.
9. CLAUDE.md alla radice, il file che ogni sessione rilegge. Deve essere conciso (indicativamente sotto le 200 righe) e scritto come regole operative, non come copia dei requisiti:
   - cos'è Nutrify in tre righe e dove sono i documenti (docs/requisiti.md, docs/mockups, docs/database);
   - stack e comandi principali;
   - architettura a livelli e regole DEV-01…DEV-20, riassunte come imperativi brevi con il codice tra parentesi;
   - sicurezza e privacy NF-01…NF-06: dati sanitari, RLS ovunque, service role solo lato server, nessun dato sanitario in WhatsApp e notifiche;
   - design e accessibilità NF-07…NF-10, interfaccia solo in italiano;
   - modo di lavorare: piano prima del codice, attesa del "Procedi", verifica a fine fase;
   - due sezioni da aggiornare nel tempo: "Decisioni di architettura" (data, decisione, motivo) e "Valori da confermare".
10. README.md breve: prerequisiti, avvio in locale, comandi.

## Vincoli
- Non installare librerie che serviranno solo nelle fasi successive (Supabase client, web-push, papaparse…): le aggiunge la fase che le usa (DEV-20).
- Nessun segreto nel repository.

## Criteri di accettazione
- `npm run dev` mostra /admin e /app con font e colori del design system.
- `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passano; un commit con un errore di lint viene bloccato.
- Un import di @supabase/supabase-js dentro un componente fa fallire il lint.
- La GitHub Action è verde sul primo push.
- CLAUDE.md contiene tutte le sezioni richieste.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Fase 1 – Database

Obiettivo: uno schema 1.0 completo, protetto da RLS e testato, senza ancora toccare l'interfaccia. Qui si separano anche le parti della 2.0 e della 3.0 oggi mescolate nella seconda migrazione.

```text
Sei uno sviluppatore senior esperto di PostgreSQL e Supabase. Lavori al progetto Nutrify descritto in CLAUDE.md.

## Contesto da leggere prima di tutto
- CLAUDE.md (regole del progetto)
- docs/requisiti.md, sezioni: "Utenti e ruoli", "Roadmap", "Tracking delle misure", "Autenticazione, inviti e notifiche", "Stati dell'account e fasi del percorso", "Requisiti non funzionali" (NF-01…NF-06), "Linee guida di sviluppo" (DEV-09, DEV-19, DEV-20), "Modello dati", "Costi, rischi e questioni aperte"
- docs/database/20261011000000_schema_iniziale.sql
- docs/database/20261012000000_collaboratori_appuntamenti.sql

## Obiettivo della fase
Portare il database allo stato richiesto dalla v1.0, con RLS su ogni tabella e test automatici, già predisposto per 2.0 e 3.0 senza doverlo ristrutturare. Nessun codice di interfaccia in questa fase.

## Attività
1. Copia le due migrazioni da docs/database in supabase/migrations, se non ci sono già; i file in docs restano come riferimento e non vanno modificati. Poi verifica con `supabase migration list` se sono già state applicate a un progetto remoto. Se non lo sono, aggiorna direttamente lo schema iniziale; se lo sono, crea una nuova migrazione 20261013000000_v1_inviti_fasi.sql (DEV-19: mai modifiche manuali in produzione). Indicami nel piano quale strada scegli.
2. Separa la migrazione 20261012000000, come chiede il "Modello dati":
   - la parte "appuntamenti" va in supabase/future/v2_appuntamenti.sql;
   - ruoli owner/collaborator, assigned_to e relative policy vanno in supabase/future/v3_collaboratori.sql;
   - la cartella supabase/future NON deve essere letta da `supabase db reset`; diventerà una migrazione vera al rilascio della rispettiva versione.
   Usa già nella v1.0 il ruolo 'owner' in studio_members, così la 3.0 non dovrà rinominare valori. Le policy della v1.0 devono funzionare da sole, senza i file futuri.
3. Tabella clients:
   - cellulare obbligatorio, salvato normalizzato in formato E.164 (+39…), unico per studio;
   - email facoltativa (alcuni clienti non ce l'hanno, N-02), salvata in minuscolo, unica per studio quando presente;
   - origin: 'imported' | 'new' (A-04: "Con dati completi" e import CSV → 'imported'; solo nome e cellulare → 'new');
   - account_status salvato: 'to_invite' | 'invited' | 'active' | 'disabled' ("invito scaduto" NON si salva: si calcola);
   - journey_stage: 'onboarding' | 'in_progress' | 'paused' | 'completed';
   - user_id nullable e unico (il cliente si collega a un utente solo all'attivazione), activated_at, push_enabled.
4. client_stage_events: fase precedente, nuova fase, data, autore (user_id) oppure origine 'automatic' (servirà alla 2.0, ST-03). Popolata da un trigger su ogni cambio di journey_stage, così nessun percorso applicativo può dimenticarla (ST-04).
5. client_invites (N-01, N-02):
   - token_hash (mai il token in chiaro), sent_at, expires_at = creazione + 14 giorni, used_at, revoked_at;
   - al massimo un invito valido per cliente: generarne uno nuovo revoca i precedenti, nella stessa transazione;
   - una funzione o vista che restituisca lo stato account calcolato, incluso 'invite_expired'.
6. client_files: categoria ('diet' | 'workout' | 'report'), titolo, storage_path, valid_from, nota, size, uploaded_at, first_read_at.
   Bucket privato client-files (solo application/pdf, max 10 MB, percorso studio_id/client_id/<uuid>.pdf) e bucket pubblico studio-assets per i loghi, con policy su storage.objects.
7. Misure (sezione "Tracking delle misure"):
   - metrics configurabile per studio: chiave, nome, unità, tipo (decimal | score_1_5 | score_1_10), frequenza (monthly_30d | daily | per_session), min, max, icona, istruzione, ordine, obiettivo predefinito;
   - un trigger crea automaticamente le 9 misure predefinite alla creazione di uno studio, con limiti e istruzioni esattamente come nella tabella dei requisiti;
   - client_metric_goals per gli obiettivi personali (T-07);
   - tracking_entries: cliente, misura, valore, data, nota (solo per gli allenamenti), created_at, updated_at.
   - Validazione nel database (T-04): valore dentro i limiti della misura, interi per i voti, data non futura calcolata in Europe/Rome (non UTC), un solo valore al giorno per passi, sonno e acqua.
8. push_subscriptions: user_id, endpoint unico, chiavi p256dh e auth, user_agent, created_at.
9. RLS (NF-01) attiva su TUTTE le tabelle, con funzioni helper nello schema private (security definer, search_path = ''):
   - lo staff di uno studio legge e modifica solo i dati del proprio studio;
   - il cliente legge solo i propri dati e i propri file, e solo se l'account è attivo; in fase Onboarding non legge file né tracking (C-09);
   - il cliente crea, modifica ed elimina le proprie tracking_entries solo in fase In percorso (Concluso e In pausa = sola lettura);
   - il cliente NON può modificare account_status, journey_stage, studio_id né i campi dei file; first_read_at si imposta solo tramite una funzione RPC dedicata, solo la prima volta (C-05);
   - client_invites non è mai leggibile dal ruolo client né da anon.
10. Seed di sviluppo (supabase/seed.sql): due studi, un titolare per studio, 6 clienti in stati e fasi diversi (almeno uno senza email), qualche file e registrazione di tracking. Valori fittizi, nessun dato reale.
11. Test con pgTAP in supabase/tests: isolamento fra due studi, cliente che prova a leggere i dati di un altro cliente, cliente che prova a cambiare la propria fase, cliente in Onboarding che prova a leggere file, inserimento di tracking da cliente Concluso, valori fuori limite, data futura, revoca dell'invito precedente, trigger dello storico fasi.
12. Genera i tipi in src/types/database.ts con `supabase gen types typescript --local` (DEV-09) e aggiungi uno script npm `db:types`.
13. Annota in CLAUDE.md le decisioni prese sullo schema (DEV-20).

## Vincoli
- Nomi di tabelle e colonne in inglese, commenti SQL in italiano.
- Non applicare nulla a progetti remoti: lavora solo con il database locale (`supabase start`, `supabase db reset`).
- I valori ancora aperti nelle "Questioni aperte" (limiti delle circonferenze, obiettivi predefiniti 2 L / 8.000 passi / 7 ore) usali così e segnali con un commento `-- DA CONFERMARE`.

## Criteri di accettazione
- `supabase db reset` termina senza errori e `supabase test db` passa al 100%.
- Ogni tabella dello schema public ha RLS attiva (verificata da un test).
- I file in supabase/future non vengono applicati.
- src/types/database.ts è aggiornato e CLAUDE.md riporta le decisioni.

## Come procedere
Prima di scrivere codice rispondi SOLO con:
1. un piano numerato dei file che creerai o modificherai;
2. le scelte che hai fatto dove i requisiti sono ambigui;
3. le domande per me, se ce ne sono.
Aspetta il mio "Procedi".
```

## Fase 2 – Autenticazione, ruoli e white label

Obiettivo: chiunque entri finisce nell'area giusta, con nome, logo e colore dello studio. Le pagine interne restano segnaposto: si riempiono dalla fase 3.

```text
Sei uno sviluppatore senior esperto di Next.js (App Router), TypeScript e Supabase Auth. Lavori al progetto Nutrify descritto in CLAUDE.md. La fase 1 (database) è completata.

## Contesto da leggere prima di tutto
- CLAUDE.md
- docs/requisiti.md, sezioni: "Utenti e ruoli", "Requisiti v1.0 – area cliente" (C-01, C-07, C-09), "Impostazioni studio" (A-14), "Requisiti non funzionali", "Architettura, stack e hosting", "Linee guida di sviluppo" (in particolare DEV-01…DEV-05)
- docs/mockups/mockup.html, schermate A1 (per la sidebar admin), A12 (impostazioni), C5 e C6 (intestazione e menu cliente)
- src/types/database.ts e le policy RLS dello schema

## Obiettivo della fase
Login, smistamento per ruolo, layout delle due aree e branding dello studio letto dal database.

## Regole di sviluppo da rispettare ("Linee guida di sviluppo")
- Le pagine leggono i dati tramite i service; le modifiche passano solo da Server Actions; i repository sono l'unico accesso a Supabase; Route Handler solo per webhook e cron (DEV-05).
- Un file per dominio in ogni livello, suffissi .actions.ts, .service.ts, .repository.ts, .schema.ts; file in kebab-case, componenti in PascalCase (DEV-06, DEV-15).
- Ogni Server Action verifica sessione e ruolo, valida con Zod, ricava lo studio dalla sessione e restituisce { ok: true, data } oppure { ok: false, error } (DEV-07, NF-05). Crea in questa fase il tipo condiviso ActionResult<T>.
- Costanti di dominio in src/lib/constants/domain.ts (tipi ricavati da lì) e testi dell'interfaccia in src/lib/copy/it.ts: niente valori o testi "magici" nei componenti (DEV-08, DEV-14). Crea entrambi i file in questa fase.
- Componenti in components/ui (shadcn), components/shared, features/admin, features/cliente; presentazionali via props, varianti con cva, stati vuoti, loading.tsx ed error.tsx per ogni sezione (DEV-02, DEV-11…DEV-13).
- Annota in CLAUDE.md ogni decisione di architettura presa in questa fase (DEV-20).

## Attività
1. Client Supabase con @supabase/ssr in src/lib/supabase: browser, server (cookie) e middleware. Un client con service role in un modulo marcato `import 'server-only'`, usato solo dai repository che ne hanno bisogno (NF-03).
2. src/server/services/session.service.ts con `getSession()` che restituisce un tipo discriminato:
   { kind: 'anonymous' } | { kind: 'staff', userId, studio, role } | { kind: 'client', userId, studio, client } | { kind: 'client_disabled', … }.
   Il ruolo si ricava dal database (studio_members o clients.user_id), mai da dati inviati dal browser.
3. Controllo degli accessi su tre livelli (DEV-03):
   a. middleware (src/middleware.ts): rinnova la sessione e smista. Rotte pubbliche: /login, /recupera-password, /nuova-password, /attiva/[token], il manifest e gli asset statici. Staff → /admin, cliente → /app, anonimo → /login con redirect di ritorno; un utente nell'area dell'altro ruolo torna alla propria; cliente disattivato → /accesso-sospeso con il nome dello studio;
   b. il layout di ogni area verifica di nuovo il ruolo con getSession() e reindirizza se non corrisponde;
   c. la RLS resta l'ultima barriera: nessuna logica di autorizzazione si affida solo ai primi due livelli.
4. Pagine di autenticazione, unica pagina di login per entrambi i ruoli, con logo e nome dello studio: login con email e password, recupero password e scelta della nuova password (Supabase Auth). In locale le email si leggono da Mailpit; lo SMTP dedicato (N-07) arriva nella fase 8. Messaggi di errore generici (non rivelare se un'email esiste). Nella fase 4 il login accetterà anche il cellulare: tieni il campo identificativo isolato per facilitarlo.
5. Area admin, gruppo src/app/(admin)/admin (DEV-01): sidebar desktop-first come A1 con le voci Clienti e Impostazioni, nome e logo dello studio, utente e Esci. Sotto i 1024 px la sidebar diventa un pannello apribile (NF-08).
6. Area cliente, gruppo src/app/(cliente)/app (DEV-01), mobile-first come C5/C6: intestazione con nome dello studio, "Ciao [Nome]", avatar con iniziali, menu a tendina con Diete, Allenamenti, Report, Tracking e in fondo Profilo ed Esci (C-01). Rotte /app, /app/diete, /app/allenamenti, /app/report, /app/tracking, /app/profilo con pagine segnaposto.
   Se il cliente è in Onboarding (C-09), le voci Diete, Allenamenti, Report e Tracking non compaiono e le relative rotte reindirizzano a /app. Il controllo va fatto sul server.
   Nessuna pagina deve mostrare contenuti diversi in base al ruolo: ogni area ha le proprie pagine (DEV-01).
7. White label (A-14):
   - una sola funzione `resolveStudio()`: per gli utenti autenticati usa lo studio della sessione; per le pagine pubbliche usa la variabile d'ambiente NEXT_PUBLIC_DEFAULT_STUDIO_SLUG. Commenta che in futuro userà il sottodominio o un dominio personalizzato;
   - il colore principale sovrascrive la variabile CSS --primary del tema shadcn; calcola automaticamente il colore del testo sopra il primario per rispettare il contrasto WCAG AA (NF-09). Fallback: #2E6A4E;
   - src/app/manifest.ts genera il manifest con nome, short_name, theme_color e icone dello studio (icone predefinite se manca il logo) e start_url "/app", così l'app installata apre l'area cliente (DEV-04). Il service worker NON fa parte di questa fase.
8. Pagina /admin/impostazioni come A12, visibile solo al titolare: nome, colore (con anteprima) e caricamento del logo nel bucket studio-assets. Server Action in studio.actions.ts con validazione Zod e controllo del ruolo.
9. Script per l'amministratore piattaforma, scripts/create-studio.ts (eseguito con `npx tsx`): crea lo studio e l'utente titolare usando la service role, e stampa il link per impostare la password. Nessuna interfaccia.
10. Componenti condivisi minimi in components/shared: StatusBadge (props `status` dalle costanti di dominio, varianti con cva) ed EmptyState.
11. Test con Vitest: getSession() e la decisione di smistamento del middleware, estratta in una funzione pura; contrasto del colore del testo sopra il primario.

## Vincoli
- Componenti shadcn/ui, icone lucide-react, font Plus Jakarta Sans, colori del design system NF-07 come variabili CSS.
- Touch target di almeno 44 px, navigazione completa da tastiera, testi interamente in italiano (NF-09, NF-10).

## Criteri di accettazione
- Con gli utenti del seed: il titolare entra in /admin, un cliente attivo in /app, un cliente disattivato vede "Accesso sospeso", un cliente in Onboarding non vede le voci bloccate.
- Aprire /admin da cliente o /app da titolare riporta all'area corretta, anche disattivando il middleware (verifica del layout).
- Cambiando colore e logo nelle impostazioni, entrambe le aree e il manifest si aggiornano; il manifest ha start_url "/app".
- Nessun import della service role in componenti client e nessun testo dell'interfaccia scritto direttamente nei componenti (verifica con una ricerca nel codice).
- `npm run build`, `npm run lint`, `npm run typecheck` e `npm test` passano.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Fase 3 – Gestione clienti (admin)

Obiettivo: la nutrizionista vede, cerca, crea e importa i propri clienti. Il pulsante WhatsApp compare già in tabella ma diventa operativo nella fase 4.

```text
Sei uno sviluppatore senior full-stack (Next.js App Router, TypeScript, Supabase, shadcn/ui). Lavori al progetto Nutrify descritto in CLAUDE.md. Le fasi 1 (database) e 2 (autenticazione e layout) sono completate.

## Contesto da leggere prima di tutto
- CLAUDE.md
- docs/requisiti.md, sezioni: "Requisiti v1.0 – area admin" (A-01…A-05), "Stati dell'account e fasi del percorso", N-01, "Linee guida di sviluppo"
- docs/mockups/mockup.html, schermate A1 (elenco clienti), A2 (nuovo cliente), A3 (importa da CSV) e l'intestazione di A4 per la scheda cliente
- src/types/database.ts, le tabelle clients, client_files, tracking_entries e la funzione dello stato account calcolato
- src/lib/constants/domain.ts, src/lib/copy/it.ts e il tipo ActionResult creati nella fase 2

## Obiettivo della fase
Elenco clienti completo, creazione nelle due modalità, import da CSV e struttura della scheda cliente.

## Regole di sviluppo da rispettare (dettagli in CLAUDE.md)
- Pagine → service per leggere; modifiche solo da Server Actions; repository unico accesso a Supabase; nessun Route Handler (DEV-05).
- File del dominio: clients.actions.ts, clients.service.ts, clients.repository.ts, clients.schema.ts (DEV-06, DEV-15).
- Server Actions con controllo di sessione e ruolo, Zod, studio dalla sessione e risposta ActionResult (DEV-07).
- Etichette di stati e fasi solo da src/lib/constants/domain.ts, testi solo da src/lib/copy/it.ts (DEV-08, DEV-14).
- Componenti specifici in features/admin/clients; in components/shared solo ciò che serve davvero anche all'area cliente (DEV-02); presentazionali via props (DEV-11); loading.tsx, error.tsx e stati vuoti (DEV-13).
- Logica di pulizia e normalizzazione come funzioni pure (DEV-10). Decisioni annotate in CLAUDE.md (DEV-20).

## Attività
1. clients.repository.ts e clients.service.ts. L'elenco deve arrivare con UNA sola query, tramite vista o funzione SQL, che includa: stato account calcolato (anche "Invito scaduto"), fase, titolo e data dell'ultimo file, data dell'ultima misura registrata. Niente query una per riga. Se serve una vista, aggiungila con una nuova migrazione in supabase/migrations (DEV-19) e rigenera i tipi con `npm run db:types`.
2. Pagina /admin/clienti come A1 (A-01):
   - colonne: avatar con iniziali e nome, cellulare, stato account con la fase sotto (StatusBadge), ultimo file pubblicato, data ultima misura, azioni;
   - azione principale "Invia invito su WhatsApp" per i clienti non attivi (per ora un pulsante collegato a una Server Action invites.actions.ts che restituisce { ok: false, error } "Disponibile a breve", completata nella fase 4) e "Dettaglio" per tutti;
   - sotto i 768 px la tabella diventa un elenco di card.
3. Filtri (A-02) per stato account e per fase, con il conteggio accanto a ogni opzione; i clienti in Onboarding sono evidenziati come nel mockup. Ricerca (A-03) per nome, email o telefono: il telefono va trovato anche se digitato senza prefisso o con spazi. Filtri e ricerca stanno nei searchParams dell'URL, così la pagina è condivisibile e il tasto Indietro funziona.
4. Creazione cliente (A-04) come A2, in un dialog con due modalità:
   - "Nuovo cliente": solo nome e cellulare → origin 'new', fase Onboarding;
   - "Con dati completi": nome, cognome, cellulare, email facoltativa e gli altri campi anagrafici dello schema → origin 'imported', fase In percorso.
   In entrambi i casi stato account 'to_invite'. La fase si imposta già alla creazione, uguale a quella che il cliente avrà dopo l'attivazione (A-04), così filtri ed evidenziazione funzionano subito; mostrala nel dialog. Form con react-hook-form e lo stesso schema Zod usato dalla Server Action (DEV-09). Errore chiaro se il cellulare esiste già nello studio.
5. Import da CSV (A-05) come A3, in tre passaggi: caricamento del file, anteprima, conferma.
   - Parsing con papaparse; accetta separatore virgola o punto e virgola e intestazioni in italiano (nome, cognome, cellulare, email…);
   - pulizia in una funzione pura src/lib/csv/clean-clients.ts: email in minuscolo, spazi rimossi, telefono normalizzato in E.164 con libphonenumber-js (paese predefinito IT), duplicati rimossi sia dentro il file sia rispetto ai clienti già presenti;
   - righe senza cellulare o con cellulare non valido vengono scartate ed ELENCATE nell'anteprima con il motivo, prima della conferma;
   - alla conferma l'inserimento avviene in un'unica operazione atomica (tutto o niente), con origin 'imported', fase In percorso, stato 'to_invite';
   - limite di 1.000 righe e 1 MB, validato anche sul server. Il file arriva alla Server Action come testo, non tramite un Route Handler.
6. Scheda cliente /admin/clienti/[id]: intestazione come A4 (nome, stato, fase) e tre schede Profilo, File, Tracking come rotte figlie (/profilo, /file, /tracking). Il contenuto delle schede arriva nelle fasi 4, 5 e 6: per ora segnaposto. Un id inesistente o di un altro studio restituisce la pagina 404.
7. Test con Vitest: pulizia del CSV (duplicati, telefoni in formati diversi, email maiuscole, righe da scartare), normalizzazione del telefono, schemi Zod della creazione.

## Criteri di accettazione
- Con il seed, i conteggi dei filtri corrispondono ai dati e la ricerca trova un cliente digitando "333 123" o "+39333123…".
- Un CSV di prova con 10 righe, di cui 2 duplicate e 1 senza cellulare, mostra 7 righe valide e 3 scartate con motivo.
- Un cliente creato con soli nome e cellulare è registrato come 'new' e appare evidenziato come Onboarding.
- Nessuna query N+1 nell'elenco (mostrami la query).
- `npm run build`, `npm run lint`, `npm run typecheck` e `npm test` passano.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Fase 4 – Inviti WhatsApp, attivazione e stati

Obiettivo: il cliente riceve il link su WhatsApp, attiva l'account e la nutrizionista gestisce stato e fase dalla scheda Profilo. È la fase più delicata per la sicurezza.

Un punto da decidere prima di lanciarla: il requisito N-02 dice che alcuni clienti non hanno email, ma un account Supabase ha bisogno di un identificativo. Il prompt propone di usare il cellulare come identificativo (con password, senza SMS) e quindi di accettare "email o cellulare" nella pagina di login. Se preferisci rendere l'email obbligatoria all'attivazione, cambia il punto 4 e togli il punto 6.

```text
Sei uno sviluppatore senior full-stack con forte attenzione alla sicurezza (Next.js App Router, TypeScript, Supabase Auth). Lavori al progetto Nutrify descritto in CLAUDE.md. Le fasi 1–3 sono completate.

## Contesto da leggere prima di tutto
- CLAUDE.md
- docs/requisiti.md, sezioni: "Autenticazione, inviti e notifiche" (N-01…N-05), "Due percorsi di attivazione", "Stati dell'account e fasi del percorso" (ST-01…ST-04), A-06, A-07, C-08, C-09, "Linee guida di sviluppo" (in particolare DEV-18)
- docs/mockups/mockup.html, schermate A4, A5, A6 (scheda Profilo nei tre casi), C1, C2 (attivazione) e C4 (home in Onboarding)
- lo schema di clients, client_invites, client_stage_events e lo stub di invites.actions.ts creato nella fase 3

## Obiettivo della fase
Generazione e invio degli inviti, attivazione dell'account nei due percorsi, scheda Profilo completa e gestione delle fasi.

## Regole di sviluppo da rispettare (dettagli in CLAUDE.md)
- Pagine → service per leggere; modifiche solo da Server Actions; repository unico accesso a Supabase; nessun Route Handler, nemmeno per l'attivazione (DEV-05).
- File dei domini: invites.*, clients.*, session.* con suffissi .actions.ts, .service.ts, .repository.ts, .schema.ts (DEV-06, DEV-15).
- Server Actions con controllo di sessione e ruolo, Zod, studio dalla sessione e risposta ActionResult (DEV-07). Fa eccezione solo l'attivazione, pubblica, che si autorizza con il token.
- Testi (compreso il messaggio WhatsApp) in src/lib/copy/it.ts, stati e fasi da src/lib/constants/domain.ts (DEV-08, DEV-14).
- Componenti in features/admin e features/cliente; loading.tsx, error.tsx e stati vuoti (DEV-02, DEV-13).
- Logica di token, link e transizioni come funzioni pure (DEV-10). Decisioni annotate in CLAUDE.md (DEV-20).

## Attività
1. invites.service.ts:
   - token di 32 byte casuali (crypto.randomBytes) in base64url; nel database va SOLO l'hash SHA-256;
   - creare un invito revoca i precedenti dello stesso cliente nella stessa transazione (N-02), imposta sent_at, scadenza a 14 giorni e porta lo stato account a 'invited';
   - funzione pura buildWhatsAppUrl(telefonoE164, testo) che produce https://wa.me/<numero senza +>?text=<testo codificato>;
   - messaggio precompilato con SOLO nome dello studio e link di attivazione, mai dati sanitari (N-05).
2. Pulsante "Invia invito su WhatsApp" (tabella clienti e scheda Profilo): completa lo stub della fase 3. Attenzione ai blocchi dei popup: apri la nuova finestra in modo sincrono al clic e impostane l'indirizzo quando la Server Action risponde con { ok: true, data: { whatsappUrl } }. Dopo l'invio la riga si aggiorna senza ricaricare la pagina, così gli inviti si mandano in sequenza (N-01). Il token in chiaro non va mai registrato nei log.
3. Pagina pubblica /attiva/[token] (Server Component + Server Action):
   - sul server calcola l'hash e cerca l'invito; se non esiste, è scaduto, usato o revocato, oppure il cliente è disattivato, mostra un unico messaggio generico "Link non valido o scaduto: chiedi un nuovo invito allo studio";
   - header Referrer-Policy: no-referrer e pagina non indicizzabile;
   - cliente già nel database (origin 'imported') → schermata C1: dati precompilati da verificare e correggere, poi scelta della password;
   - nuovo cliente (origin 'new') → schermata C2: modulo con dati anagrafici, email e password; il cellulare resta visibile come riga di conferma;
   - requisiti della password mostrati in chiaro; schema Zod condiviso tra form e Server Action (DEV-09).
4. Attivazione, in invites.service.ts con il client service role (solo lato server):
   - crea l'utente Supabase con auth.admin.createUser usando il cellulare come identificativo (phone_confirm: true) e l'email se presente, con la password scelta;
   - collega clients.user_id, imposta stato 'active', activated_at, segna l'invito come usato; fase: In percorso per i clienti importati, Onboarding per i nuovi (il trigger registra lo storico come 'automatic' se la fase cambia);
   - se un passaggio fallisce dopo la creazione dell'utente, elimina l'utente creato (compensazione) e restituisci { ok: false, error };
   - un token può essere usato una sola volta anche con due richieste simultanee: proteggi l'aggiornamento con una condizione `used_at is null` e controlla le righe modificate;
   - a fine attivazione il cliente viene autenticato e portato in /app.
5. Home cliente /app in Onboarding come C4 (C-09): benvenuto, prossimi passi e informazioni sulla chiamata di onboarding, con testi in src/lib/copy/it.ts. File e tracking restano bloccati (gestito nella fase 2: verificalo).
6. Aggiorna la pagina di login perché accetti "Email o cellulare": se il valore è un numero, normalizzalo in E.164 e usa signInWithPassword con phone. Il recupero password via email resta solo per chi ha un'email; agli altri mostra "Chiedi allo studio un nuovo link" (N-02).
7. Scheda /admin/clienti/[id]/profilo come A4, A5, A6:
   - A-06: visualizzazione e modifica dei dati anagrafici, stato account, fase, data di attivazione, stato delle notifiche. Se il cliente ha un account, cambiare email o cellulare li aggiorna anche in Supabase Auth;
   - A-07: "Invia invito su WhatsApp" o "Reinvia invito" con data dell'ultimo invio e scadenza, e anteprima del messaggio come A6;
   - "Onboarding completato" per i clienti in Onboarding (ST-02);
   - cambio manuale della fase: In pausa, Concluso, Riprendi percorso;
   - "Disattiva account" e "Riattiva account", con conferma. Disattivare deve anche bloccare l'utente in Supabase Auth (ban) così le sessioni aperte non funzionano più;
   - storico delle fasi (ST-04) con data, fase precedente, nuova fase e autore ("automatico" quando non c'è).
8. Transizioni di fase consentite in una funzione pura src/lib/domain/journey.ts, riusata da interfaccia e Server Action: Onboarding → In percorso; In percorso → In pausa | Concluso; In pausa → In percorso | Concluso; Concluso → In percorso. Stato account e fase restano indipendenti (ST-01). Scrivila in modo che la 2.0 possa chiamarla con autore 'automatic' (ST-03).
9. Test con Vitest: hash e verifica del token, buildWhatsAppUrl (numeri italiani ed esteri, caratteri speciali), transizioni consentite e vietate, servizio di attivazione con Supabase simulato (token scaduto, usato, revocato, doppio uso simultaneo, compensazione).
10. Primo test end-to-end con Playwright (DEV-18), flusso "attivazione dal link": configura Playwright se non c'è, usa il database locale con il seed, genera un invito per un cliente importato e uno per un cliente nuovo, completa l'attivazione e verifica l'accesso a /app con la fase corretta. Aggiungi lo script npm `test:e2e`.

## Vincoli
- Nessuna email di invito (N-03): l'unico canale è WhatsApp click-to-chat, senza API a pagamento.
- La service role si usa solo nel servizio di attivazione e nelle operazioni di Auth, mai nel browser (NF-03).
- Ogni Server Action dell'area admin verifica che il cliente appartenga allo studio della sessione.

## Criteri di accettazione
- Flusso completo in locale con un cliente importato e uno nuovo: invito, apertura del link, attivazione, accesso, fase corretta.
- Generare un secondo invito rende inutilizzabile il primo; un link usato o oltre i 14 giorni mostra il messaggio generico.
- Un cliente senza email entra con cellulare e password.
- Un cliente disattivato viene espulso anche se aveva una sessione aperta.
- Ogni cambio di fase compare nello storico con autore e data.
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passano.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Fase 5 – File

Obiettivo: la nutrizionista pubblica diete, schede di allenamento e report; il cliente li apre e lei vede quando li ha letti. La notifica push si collega nella fase 7, qui resta predisposta.

Nel prompt ho inserito un vincolo tecnico importante: su Netlify le funzioni accettano richieste di circa 6 MB, quindi un PDF da 10 MB non può passare dal server. Il file va caricato direttamente su Supabase con un URL di caricamento firmato.

```text
Sei uno sviluppatore senior full-stack (Next.js App Router, TypeScript, Supabase Storage). Lavori al progetto Nutrify descritto in CLAUDE.md. Le fasi 1–4 sono completate.

## Contesto da leggere prima di tutto
- CLAUDE.md
- docs/requisiti.md, sezioni: "Scheda cliente – File" (A-08…A-11), C-02, C-04, C-05, N-06, N-08, NF-02, "Linee guida di sviluppo" (in particolare DEV-05 e DEV-18)
- docs/mockups/mockup.html, schermate A7 (scheda File), A8 (conferma eliminazione), C5 (home cliente) e C7 (pagina Diete)
- lo schema di client_files, il bucket client-files e le sue policy, la funzione RPC per la prima lettura

## Obiettivo della fase
Caricamento, elenco, apertura ed eliminazione dei file lato admin; consultazione e registrazione della lettura lato cliente.

## Regole di sviluppo da rispettare (dettagli in CLAUDE.md)
- Pagine → service per leggere; modifiche solo da Server Actions; repository unico accesso a Supabase e Storage. Nessun Route Handler: anche apertura e download dei file passano da Server Actions (DEV-05).
- File del dominio: files.actions.ts, files.service.ts, files.repository.ts, files.schema.ts; notifiche in notifications.service.ts (DEV-06, DEV-15).
- Server Actions con controllo di sessione e ruolo, Zod, studio dalla sessione e risposta ActionResult (DEV-07).
- Categorie dei file da src/lib/constants/domain.ts, testi da src/lib/copy/it.ts (DEV-08, DEV-14).
- FileCard in components/shared perché serve sia all'admin sia al cliente; il resto in features/admin e features/cliente (DEV-02). Componenti presentazionali via props (DEV-11); loading.tsx, error.tsx e stati vuoti (DEV-13).
- La scelta del file "in corso" è una funzione pura (DEV-10). Decisioni annotate in CLAUDE.md (DEV-20).

## Attività
1. Caricamento (A-08) come A7, in tre passaggi perché Netlify limita il corpo delle richieste a circa 6 MB:
   a. Server Action prepareUpload: valida con Zod categoria (Dieta, Allenamento, Report), titolo, data di validità, nota facoltativa (max 500 caratteri), nome, tipo e dimensione dichiarati (solo PDF, max 10 MB); genera il percorso studio_id/client_id/<uuid>.pdf e un URL firmato con createSignedUploadUrl;
   b. il browser carica il file direttamente su Supabase Storage con quell'URL, con barra di avanzamento;
   c. Server Action confirmUpload: verifica che l'oggetto esista, che la dimensione sia entro 10 MB e che i primi byte siano "%PDF"; solo allora crea la riga in client_files. Se la verifica fallisce, elimina l'oggetto.
   Area di drag and drop accessibile anche da tastiera e con il pulsante "Scegli file". Errori chiari per tipo o dimensione sbagliati, controllati già nel browser prima del caricamento.
2. "Avvisa il cliente" (A-09): crea src/server/services/notifications.service.ts con un'unica funzione notifyClient(clientId, evento), che sarà il solo punto di invio delle notifiche (N-06). In questa fase registra solo l'evento nei log del server; il Web Push arriva nella fase 7. Nessuna email (N-08).
3. Elenco dei file in /admin/clienti/[id]/file (A-10): filtro per categoria, titolo, categoria, data di validità, data di caricamento, stato di lettura "Letto il gg/mm/aaaa" oppure "Non ancora letto". Ordinamento dal più recente.
4. Apertura e download, unico percorso per admin e cliente: Server Action openFile(fileId, mode: 'view' | 'download') che
   - verifica sessione e permessi (staff dello stesso studio, oppure il cliente proprietario con account attivo e fase diversa da Onboarding);
   - se chi apre è il cliente, registra la prima lettura tramite la RPC (C-05; le aperture successive non cambiano la data);
   - restituisce { ok: true, data: { url } } con un URL firmato valido 60 secondi (NF-02); con mode 'download' l'URL forza lo scaricamento con un nome ricavato dal titolo.
   Nel browser apri la finestra in modo sincrono al clic e impostane l'indirizzo quando arriva la risposta, come per l'invito WhatsApp; verifica il comportamento nella PWA installata su iPhone, dove si apre il visualizzatore di Safari.
5. Eliminazione (A-11) con il dialog di conferma A8: elimina la riga e l'oggetto in Storage; se l'eliminazione dell'oggetto fallisce, registralo nei log senza bloccare l'utente.
6. Area cliente:
   - pagine /app/diete, /app/allenamenti, /app/report come C7 (C-04): in evidenza il file in corso (il più recente con data di validità non futura), sotto l'archivio dei precedenti; stato vuoto se non ci sono file;
   - home /app come C5 (C-02): ultimo file pubblicato in evidenza con badge "Nuovo" se non ancora letto, titolo, data, nota del nutrizionista, pulsanti "Apri PDF" e "Scarica". Lascia uno spazio segnaposto per il riepilogo delle misure in scadenza, completato nella fase 6;
   - dopo l'apertura il badge "Nuovo" scompare (revalidatePath della pagina nella Server Action).
7. Aggiorna la colonna "Ultimo file pubblicato" dell'elenco clienti se non è già alimentata dalla vista della fase 3.
8. Test con Vitest: schemi Zod del caricamento, scelta del file "in corso", controllo dei permessi di openFile (staff di un altro studio, cliente diverso, cliente in Onboarding), registrazione della sola prima lettura.
9. Test end-to-end con Playwright (DEV-18), flusso "caricamento di un file": il titolare carica un PDF per un cliente In percorso, il cliente lo vede in home con il badge "Nuovo" e lo apre, il titolare vede "Letto il…".

## Vincoli
- Il bucket resta privato: nessun URL pubblico e nessun URL firmato salvato nel database.
- Il percorso in Storage si costruisce sempre sul server dallo studio della sessione e dal cliente verificato, mai da dati del browser.
- La nota del file è testo semplice, mostrato senza interpretare HTML.

## Criteri di accettazione
- Un PDF da 9 MB si carica e appare in elenco; un file da 11 MB o un .docx rinominato in .pdf vengono rifiutati.
- Il cliente apre il file, il nutrizionista vede "Letto il…" con la data della prima apertura anche dopo altre aperture.
- Un URL firmato copiato non funziona più dopo 60 secondi.
- Un cliente in Onboarding non ottiene alcun URL nemmeno chiamando openFile con l'id di un file.
- Nessun file in src/app/api creato in questa fase.
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passano.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Fase 6 – Tracking

Obiettivo: il cliente registra misure e check-in giornaliero; la nutrizionista vede andamenti, ritardi e medie settimanali e imposta gli obiettivi personali.

È la fase più ampia. Se l'agente fatica o il piano supera i 25–30 file, lanciala in due sessioni: prima la parte cliente (attività 1–7), poi la parte admin con il test end-to-end (attività 8–11), dicendo all'inizio della seconda che la prima è completata.

```text
Sei uno sviluppatore senior full-stack (Next.js App Router, TypeScript, Supabase, shadcn/ui con grafici Recharts). Lavori al progetto Nutrify descritto in CLAUDE.md. Le fasi 1–5 sono completate.

## Contesto da leggere prima di tutto
- CLAUDE.md
- docs/requisiti.md, sezioni: "Tracking delle misure" (tabella delle 9 misure, scala delle abitudini, T-01…T-09), "Scheda cliente – Tracking" (A-12, A-13), C-02, "Linee guida di sviluppo" (in particolare DEV-10 e DEV-18), "Questioni aperte"
- docs/mockups/mockup.html, schermate C8 (tracking), C9 (check-in), C10 (circonferenza), C11 (allenamento), C12 (dettaglio abitudine), A9 (scheda Tracking), A10 e A11 (dettagli), e il riepilogo misure di C5
- lo schema di metrics, client_metric_goals e tracking_entries con i relativi trigger di validazione

## Obiettivo della fase
Tracking completo lato cliente e consultazione lato admin, con le statistiche settimanali e gli obiettivi personali.

## Regole di sviluppo da rispettare (dettagli in CLAUDE.md)
- Pagine → service per leggere; modifiche solo da Server Actions; repository unico accesso a Supabase; nessun Route Handler (DEV-05).
- File del dominio: tracking.actions.ts, tracking.service.ts, tracking.repository.ts, tracking.schema.ts (DEV-06, DEV-15).
- Server Actions con controllo di sessione e ruolo, Zod, studio dalla sessione e risposta ActionResult (DEV-07).
- Chiavi delle misure, frequenze e soglie da src/lib/constants/domain.ts, testi e descrizioni dei voti da src/lib/copy/it.ts (DEV-08, DEV-14).
- MetricChart e MetricCard in components/shared, perché servono a entrambe le aree; il resto in features/admin e features/cliente (DEV-02). Componenti presentazionali via props (DEV-11), varianti con cva invece di componenti duplicati per i tipi di misura (DEV-12); loading.tsx, error.tsx e stati vuoti (DEV-13).
- Tutti i calcoli come funzioni pure in src/lib/domain/tracking, senza dipendenze da React o Supabase (DEV-10). Decisioni annotate in CLAUDE.md (DEV-20).

## Regole di calcolo (funzioni pure, tutte testate)
- Fuso orario: "oggi", le settimane e i confronti si calcolano in Europe/Rome. Verifica che anche il controllo "data non futura" nel database usi Europe/Rome; se non lo fa, correggilo con una nuova migrazione (DEV-19).
- Settimana: da lunedì a domenica.
- "Registrata nel periodo corrente" (spunta di T-01): circonferenze se c'è un valore negli ultimi 30 giorni; abitudini se c'è il valore di oggi; allenamenti se c'è almeno una sessione oggi.
- Circonferenza "in ritardo" (T-05): più di 30 giorni dall'ultima registrazione. Proponi nel piano come trattare una misura mai registrata.
- Abitudini: giorni compilati nella settimana corrente (T-05), media della settimana e differenza con la settimana precedente (T-08). La media considera solo i giorni compilati, così i giorni saltati non penalizzano (T-06). Formato italiano con la virgola: "+0,6 rispetto alla scorsa settimana"; nessun confronto se manca la settimana precedente.
- Descrizioni dei voti ancorate all'obiettivo (T-07), secondo la tabella "Scala delle abitudini giornaliere": 5 obiettivo raggiunto, 4 quasi raggiunto (≈ 75%), 3 a metà (≈ 50%), 2 poco (≈ 25%), 1 quasi niente, con valori arrotondati in modo leggibile per ogni misura (acqua a 0,5 L, passi a 500, sonno a 30 minuti). Con 2 L il risultato deve coincidere con l'esempio dei requisiti: "2 L o più", "circa 1,5 L", "circa 1 L", "circa 0,5 L", "meno di 0,5 L".
- Obiettivo effettivo: quello personale del cliente se presente, altrimenti quello predefinito della misura nello studio.
- Variazione delle circonferenze: differenza con la registrazione precedente, con segno e unità ("−1,5 cm").

## Attività – area cliente
1. Pagina /app/tracking come C8 (T-01): elenco delle 9 misure con icona, istruzione (testo esatto della tabella dei requisiti), numero di registrazioni e spunta del periodo corrente; in cima l'accesso al check-in giornaliero.
2. Check-in giornaliero come C9 (T-06): passi, sonno e acqua in una sola schermata, un tocco ciascuno sulla scala 1–5 con la descrizione del voto basata sull'obiettivo. Si può scegliere oggi o ieri; se il giorno è già compilato, i valori si precaricano e si modificano. Un solo salvataggio per i tre valori, in un'unica operazione.
3. Registrazione circonferenza come C10 (T-02, T-04): valore decimale con la virgola o il punto, data precompilata a oggi e non futura, limiti della misura mostrati e validati sia nel form sia nella Server Action; il database resta l'ultimo controllo.
4. Registrazione allenamento come C11 (T-02, T-09): voto con pulsanti da 1 a 10 e nota facoltativa.
5. Dettaglio di ogni misura come C12 (T-03, T-08): grafico dell'andamento, storico, per le abitudini media settimanale con confronto e scala dei voti con l'obiettivo. Ogni registrazione si può correggere o eliminare, con conferma per l'eliminazione.
6. Home /app come C5 (C-02): completa il riepilogo delle misure da registrare lasciato come segnaposto nella fase 5 (check-in di oggi non fatto, circonferenze in ritardo o in scadenza entro 3 giorni).
7. Fasi del percorso: cliente In pausa o Concluso vede dati e grafici in sola lettura, senza pulsanti di inserimento; in Onboarding il tracking resta bloccato. Verifica che la RLS impedisca l'inserimento fuori dalla fase In percorso (prevista nella fase 1).

## Attività – area admin (sola consultazione dei valori)
8. Scheda /admin/clienti/[id]/tracking come A9 (A-12, T-05, T-08): una card per misura. Circonferenze: ultimo valore, data, variazione e indicatore "In ritardo". Abitudini: giorni compilati nella settimana, media e confronto. Allenamenti: ultima sessione e voto medio.
9. Obiettivi personali (T-07) nella stessa scheda: modifica di acqua, passi e sonno del cliente con indicazione del valore predefinito dello studio; "Ripristina predefinito" elimina l'obiettivo personale.
10. Dettaglio misura: circonferenze come A10 con grafico e storico; allenamenti come A11 con voto medio ed elenco di data, voto e nota (A-13).
11. Test end-to-end con Playwright (DEV-18), flusso "check-in giornaliero": il cliente compila il check-in di oggi, lo corregge, compila quello di ieri; il titolare vede i giorni compilati e la media aggiornati.

## Vincoli
- Una sola query per caricare le registrazioni di un cliente in una schermata, poi i calcoli nelle funzioni pure: niente query in ciclo.
- Grafici accessibili: titolo, valori leggibili anche senza colore e una tabella o elenco equivalente per gli screen reader.
- Pulsanti dei voti di almeno 44 px, utilizzabili con una mano su telefono (NF-09).

## Criteri di accettazione
- Test Vitest per ogni regola di calcolo, inclusi cambio di settimana, mezzanotte in Europe/Rome, settimana precedente vuota, obiettivo personale assente.
- Un valore fuori limite viene rifiutato dal form e, se forzato, anche dal database.
- Cambiare l'obiettivo dell'acqua modifica subito le descrizioni dei voti nel check-in del cliente.
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passano.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, le scelte sui punti ambigui e le eventuali domande. Se il piano supera circa 30 file, proponi di dividere la fase in parte cliente e parte admin. Aspetta il mio "Procedi".
```

## Fase 7 – Profilo utente e logout

Obiettivo: cliente e nutrizionista gestiscono i propri dati, l'email e la password, ed escono dall'app in modo sicuro, anche da tutti i dispositivi. La voce "Esci" creata nella fase 2 era solo di base: qui si completa con la gestione della sessione.

Profilo e logout stanno in un'unica fase perché condividono servizi, pagina e test, ma il prompt è diviso in due parti. Se preferisci, lancia la Parte A e la Parte B in due sessioni separate. Con questa fase le notifiche push diventano la fase 8 e la rifinitura la fase 9; l'interruttore delle notifiche nel profilo viene collegato al Web Push nella fase 8.

```text
Sei uno sviluppatore senior full-stack con attenzione alla sicurezza (Next.js App Router, TypeScript, Supabase Auth). Lavori al progetto Nutrify descritto in CLAUDE.md. Le fasi 1–6 sono completate.

## Contesto da leggere prima di tutto
- CLAUDE.md
- docs/requisiti.md, sezioni: C-01, C-07, A-06, N-02, N-03, N-07, "Requisiti non funzionali", "Linee guida di sviluppo" (in particolare DEV-03, DEV-05, DEV-07, DEV-18)
- docs/mockups/mockup.html, schermate C13 (profilo cliente), C6 (menu con Profilo ed Esci) e A1 (sidebar admin con utente ed Esci)
- lo schema di clients, studio_members e push_subscriptions, session.service.ts e il middleware della fase 2

## Obiettivo della fase
Parte A: profilo del cliente e del professionista, con dati personali, email e password. Parte B: logout, uscita da tutti i dispositivi e gestione della sessione scaduta.

## Regole di sviluppo da rispettare (dettagli in CLAUDE.md)
- Pagine → service per leggere; modifiche solo da Server Actions; repository unico accesso a Supabase; nessun Route Handler (DEV-05).
- File dei domini: profile.actions.ts, profile.service.ts, profile.repository.ts, profile.schema.ts e auth.actions.ts per il logout (DEV-06, DEV-15).
- Server Actions con controllo di sessione, Zod e risposta ActionResult (DEV-07). Un utente modifica solo il proprio profilo: l'id si ricava sempre dalla sessione, mai dal form.
- Testi in src/lib/copy/it.ts (DEV-14); componenti in features/admin e features/cliente, solo ciò che serve a entrambe in components/shared (DEV-02); stati vuoti, loading.tsx ed error.tsx (DEV-13).
- Schema Zod della password condiviso con l'attivazione della fase 4, senza duplicarlo (DEV-09, DEV-20). Decisioni annotate in CLAUDE.md.

## Parte A – Profilo
1. Profilo cliente /app/profilo come C13 (C-07):
   - intestazione con avatar, nome e "Cliente di [Nome studio] dal [data di attivazione]";
   - "Dati personali" con il pulsante Modifica: il cliente può cambiare nome, cognome e data di nascita (proponi nel piano l'elenco esatto dei campi modificabili tra quelli dello schema);
   - il cellulare è in sola lettura con la nota "Per cambiarlo contatta lo studio": è l'identificativo di accesso e il numero degli inviti WhatsApp, lo modifica solo lo studio (A-06);
   - email: il cliente può cambiarla, o aggiungerla se non l'aveva, con conferma inviata al nuovo indirizzo (cambio email sicuro di Supabase; in locale si legge da Mailpit). Spiega che con un'email potrà recuperare la password da solo (N-02). clients.email si aggiorna solo dopo la conferma: proponi nel piano come sincronizzarla (per esempio un trigger su auth.users);
   - il cliente modifica solo i campi consentiti: usa una funzione RPC con elenco esplicito dei campi oppure permessi a livello di colonna, e verifica che stato account, fase, studio e cellulare restino non modificabili;
   - il profilo è disponibile anche in fase Onboarding.
2. Cambio password (cliente e professionista): password attuale, nuova password e conferma. Verifica la password attuale con una nuova autenticazione prima di chiamare updateUser; dopo il cambio chiudi le altre sessioni (signOut con scope 'others') e mantieni quella corrente. Messaggi di errore generici.
3. Sezione "Notifiche" di C13: stato "Attive su questo dispositivo" / "Non attive" e interruttore. Il Web Push arriva nella fase 8: ora crea il componente presentazionale con lo stato ricevuto via props e una Server Action che salva solo la preferenza push_enabled, con un commento TODO che indica il collegamento della fase 8. Lo stato deve comparire anche nella scheda Profilo admin (A-06).
4. Profilo professionista /admin/profilo, raggiungibile dal menu utente in fondo alla sidebar: nome e cognome, email con conferma al nuovo indirizzo, cambio password. È separato da Impostazioni studio. Se studio_members non ha i campi del nome, aggiungili con una nuova migrazione (DEV-19) e rigenera i tipi.

## Parte B – Logout e sessione
5. auth.actions.ts con signOut(scope: 'local' | 'global'):
   - "Esci" nel menu cliente (C6), in fondo al profilo (C13) e nel menu utente della sidebar admin, senza dialog di conferma;
   - per il cliente, prima di uscire elimina la sottoscrizione push del dispositivo corrente, cercandola per endpoint inviato dal browser; nella fase 8 basterà fornire l'endpoint;
   - dopo l'uscita redirect a /login con il messaggio "Sei uscito dall'app".
6. "Esci da tutti i dispositivi" nel profilo di entrambe le aree, con dialog di conferma: signOut con scope 'global' ed eliminazione di tutte le sottoscrizioni push dell'utente.
7. Dopo il logout nessun contenuto protetto deve essere visibile con il tasto Indietro o riaprendo la PWA: pagine autenticate con Cache-Control private, no-store, stato lato browser azzerato e navigazione con replace. Annota in CLAUDE.md la regola per la fase 8: il service worker non deve mai mettere in cache pagine o dati delle aree autenticate.
8. Sessione scaduta o refresh token non valido: il middleware reindirizza a /login con il messaggio "La sessione è scaduta, accedi di nuovo" e il redirect di ritorno; le Server Actions restituiscono { ok: false, error: 'unauthenticated' } e l'interfaccia porta al login. Verifica che un account disattivato durante la sessione (fase 4) mostri "Accesso sospeso".
9. Test con Vitest: schemi Zod del profilo, elenco dei campi modificabili dal cliente, decisione di redirect per sessione scaduta.
10. Test end-to-end con Playwright: il cliente cambia password, esce, non vede /app né con l'indirizzo né con Indietro, rientra con la nuova password; "Esci da tutti i dispositivi" chiude anche la sessione aperta in un secondo contesto del browser.

## Criteri di accettazione
- Un cliente non riesce a cambiare cellulare, stato o fase nemmeno chiamando direttamente l'RPC o l'API di Supabase con dati modificati.
- Un cliente senza email ne aggiunge una, la conferma da Mailpit e poi recupera la password da solo.
- Con la password attuale sbagliata il cambio viene rifiutato; dopo un cambio riuscito le altre sessioni non funzionano più.
- Dopo il logout, Indietro e riapertura della PWA non mostrano dati del cliente.
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passano.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, diviso in Parte A e Parte B, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Fase 8 – Notifiche push e PWA

Obiettivo: l'app si installa sul telefono con nome e icona dello studio e il cliente riceve una notifica quando arriva un nuovo file. Su iPhone le push funzionano solo con la PWA installata, quindi guida all'installazione e attivazione delle notifiche vanno progettate insieme.

Una parte della verifica non si può automatizzare: alla fine prova a mano su un iPhone e su un telefono Android reali, seguendo la checklist che l'agente scrive.

```text
Sei uno sviluppatore senior esperto di PWA, Service Worker e Web Push con Next.js. Lavori al progetto Nutrify descritto in CLAUDE.md. Le fasi 0–7 sono completate.

## Contesto da leggere prima di tutto
- CLAUDE.md, in particolare la regola sul service worker annotata nella fase 7
- docs/requisiti.md, sezioni: N-04, N-05, N-06, A-09, C-03, C-06, C-07, "Architettura, stack e hosting" (white label e manifest), "Linee guida di sviluppo" (in particolare DEV-04, DEV-05, DEV-18), "Rischi"
- docs/mockups/mockup.html, schermate C3 (guida all'installazione), C5 (banner delle notifiche) e C13 (sezione Notifiche)
- notifications.service.ts (fase 5), l'interruttore delle notifiche e il logout (fase 7), src/app/manifest.ts (fase 2), la tabella push_subscriptions

## Obiettivo della fase
Service worker, installazione della PWA, sottoscrizione alle notifiche e invio reale delle push alla pubblicazione di un file.

## Regole di sviluppo da rispettare (dettagli in CLAUDE.md)
- Modifiche solo da Server Actions; repository unico accesso a Supabase; nessun Route Handler (DEV-05).
- File del dominio: push.actions.ts, push.service.ts, push.repository.ts, push.schema.ts; l'invio passa solo da notifications.service.ts (N-06).
- Server Actions con controllo di sessione, Zod e risposta ActionResult (DEV-07). Testi in src/lib/copy/it.ts (DEV-14).
- La costruzione del contenuto delle notifiche e il riconoscimento del dispositivo (iPhone, Android, PWA installata) sono funzioni pure testate (DEV-10). Decisioni annotate in CLAUDE.md (DEV-20).

## Attività
1. Chiavi VAPID (N-04): genera la coppia con la libreria web-push; NEXT_PUBLIC_VAPID_PUBLIC_KEY pubblica, VAPID_PRIVATE_KEY e VAPID_SUBJECT segrete. Aggiorna .env.example e docs/operativita.md.
2. Service worker public/sw.js, registrato solo nel layout dell'area cliente:
   - evento push: mostra la notifica con titolo, testo, icona dello studio e un url di destinazione;
   - evento notificationclick: porta in primo piano una finestra già aperta dell'app o ne apre una su quell'url;
   - NESSUNA cache di pagine o dati delle aree autenticate (regola della fase 7); al massimo asset statici con versione e una pagina offline statica senza dati.
3. Manifest e icone: completa src/app/manifest.ts con icone 192 e 512 px, icona maskable, display standalone, start_url "/app" (DEV-04). Genera le icone dal logo dello studio con le convenzioni di metadati di Next.js (icon e apple-icon con ImageResponse), con icona predefinita se manca il logo. Aggiungi i meta tag per iOS (apple-touch-icon, titolo, colore della barra).
4. Guida all'installazione come C3 (C-06), al primo accesso del cliente:
   - iPhone con Safari non installata: passaggi illustrati "Condividi → Aggiungi alla schermata Home", spiegando che serve per ricevere gli avvisi;
   - Android e Chrome: pulsante "Installa" che usa l'evento beforeinstallprompt;
   - già installata: la guida non compare. Si chiude e si riapre dal profilo.
5. Banner delle notifiche (C-03) nella home, mostrato finché le push non sono attive su questo dispositivo:
   - la richiesta di permesso parte solo dal tocco del cliente su "Attiva" (obbligatorio su iPhone);
   - su iPhone non installata il banner rimanda alla guida invece di chiedere il permesso;
   - con permesso negato, spiega come riattivarlo dalle impostazioni del telefono.
6. Sottoscrizione: dopo il permesso il browser crea la sottoscrizione con la chiave VAPID pubblica e la invia a una Server Action che la salva per l'utente corrente (upsert per endpoint). Collega l'interruttore del profilo (fase 7): acceso = sottoscrizione creata e salvata, spento = sottoscrizione annullata ed eliminata; push_enabled e lo stato in A-06 riflettono se il cliente ha almeno un dispositivo attivo. Collega anche il logout: il browser invia l'endpoint corrente da eliminare.
7. Invio (A-09, N-05, N-06): completa notifyClient in notifications.service.ts con la libreria web-push:
   - contenuto con SOLO il nome dello studio, un testo generico ("Hai un nuovo documento nella tua area riservata") e il link a /app: niente titolo del file, categoria o altri dati sanitari;
   - invio a tutti i dispositivi del cliente; le sottoscrizioni che rispondono 404 o 410 vengono eliminate;
   - un errore di invio non deve far fallire la pubblicazione del file: l'invio parte dopo la risposta all'utente (funzione after di Next.js) e gli errori vanno nei log.
8. Test con Vitest: costruzione del contenuto (verifica che non contenga mai titolo o categoria del file), pulizia delle sottoscrizioni scadute, riconoscimento di iPhone, Android e PWA installata.
9. Test end-to-end con Playwright in Chromium con il permesso delle notifiche concesso: il banner compare, "Attiva" salva la sottoscrizione, il banner scompare, il logout la elimina.
10. Scrivi in docs/checklist-dispositivi.md la prova manuale su iPhone e Android: installazione, attivazione, ricezione della notifica dopo il caricamento di un file, apertura dal tocco, disattivazione, logout.

## Criteri di accettazione
- Su Chrome desktop e Android: il caricamento di un file con "Avvisa il cliente" fa arrivare la notifica, il tocco apre /app.
- Nessuna pagina autenticata è servita dalla cache del service worker (verifica offline: compare solo la pagina offline).
- Il contenuto della notifica non contiene dati sanitari.
- La pubblicazione del file riesce anche se l'invio della push fallisce.
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:e2e` passano.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato dei file, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Fase 9 – Rifinitura e messa in produzione

Obiettivo: l'app è sicura, accessibile e online con il progetto Supabase di produzione, pronta per lo studio. Questa fase tocca servizi reali, quindi l'agente prepara configurazioni e istruzioni, ma alcune operazioni le fai tu dai pannelli di Supabase, Netlify e del provider SMTP.

Due punti richiedono persone esterne: il testo dell'informativa privacy va scritto o rivisto da un consulente privacy (l'agente prepara solo la struttura), e i valori segnati "DA CONFERMARE" vanno chiusi con la nutrizionista prima del rilascio.

```text
Sei uno sviluppatore senior con esperienza di sicurezza applicativa, accessibilità e messa in produzione (Next.js, Supabase, Netlify). Lavori al progetto Nutrify descritto in CLAUDE.md. Le fasi 0–8 sono completate.

## Contesto da leggere prima di tutto
- CLAUDE.md, comprese le sezioni "Decisioni di architettura" e "Valori da confermare"
- docs/requisiti.md, sezioni: "Requisiti non funzionali" (NF-01…NF-12), N-07, "Linee guida di sviluppo" (DEV-05, DEV-18, DEV-19), "Costi, rischi e questioni aperte"
- docs/operativita.md e docs/checklist-dispositivi.md

## Obiettivo della fase
Revisione di sicurezza e accessibilità, email di autenticazione con SMTP dedicato, adempimenti GDPR, attività programmate, ambiente di produzione e procedure operative.

## Regole di sviluppo da rispettare (dettagli in CLAUDE.md)
- Le attività programmate sono l'unico caso in cui si crea un Route Handler (DEV-05), protetto da un segreto.
- Ogni modifica al database è una migrazione in supabase/migrations; in produzione si applica solo con la CLI, mai a mano (DEV-19).
- Decisioni annotate in CLAUDE.md (DEV-20).

## Attività
1. Revisione di sicurezza:
   - ripassa ogni Server Action e ogni repository: sessione, ruolo, Zod, studio dalla sessione, nessuna service role fuori dal server; correggi ciò che trovi;
   - estendi i test pgTAP con i casi emersi nelle fasi 2–8;
   - header di sicurezza in next.config o netlify.toml: Content-Security-Policy compatibile con Supabase e il service worker, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options o frame-ancestors, Referrer-Policy, Permissions-Policy;
   - controlla con `npm audit` le dipendenze e aggiorna quelle con vulnerabilità note.
2. Accessibilità (NF-09): test automatici con @axe-core/playwright sulle schermate principali delle due aree, navigazione completa da tastiera, focus visibile, contrasto anche con un colore dello studio scuro e uno chiaro. Correggi ciò che emerge.
3. Email di autenticazione (N-07): configura Supabase Auth per usare lo SMTP di Brevo o Resend, con modelli in italiano e con il nome dello studio per recupero password e cambio email. Aggiorna supabase/config.toml per il locale e scrivi in docs/operativita.md i passaggi per il pannello di produzione (record SPF e DKIM del dominio inclusi).
4. GDPR (NF-06):
   - pagina /privacy con la struttura dell'informativa e testi segnaposto chiaramente marcati "DA FAR VERIFICARE AL CONSULENTE PRIVACY";
   - nella pagina di attivazione, presa visione dell'informativa e consenso al trattamento dei dati sanitari, salvati con data e versione dell'informativa in una nuova tabella (migrazione dedicata, RLS inclusa);
   - procedura di esportazione dei dati di un cliente (diritto di accesso) e di cancellazione completa (cliente, registrazioni, file in Storage, utente Auth, sottoscrizioni push), come script lato server in scripts/, documentati in docs/operativita.md.
5. Attività programmate:
   - Route Handler /api/cron/manutenzione protetto da un segreto nell'header, chiamato da una GitHub Action pianificata ogni giorno;
   - esegue una query leggera per evitare la pausa del progetto Supabase gratuito (rischio indicato nei requisiti), elimina gli oggetti caricati ma mai confermati (fase 5) più vecchi di 24 ore e gli inviti scaduti da oltre 90 giorni;
   - registra l'esito nei log senza dati personali.
6. Ambiente di produzione (NF-04, NF-11, NF-12):
   - progetto Supabase nella region di Francoforte; scrivi i passaggi per collegarlo (`supabase link`) e applicare le migrazioni (`supabase db push`), senza seed di sviluppo;
   - impostazioni di Auth: iscrizione pubblica DISATTIVATA (i clienti non si registrano da soli, gli utenti li crea il server), Site URL e Redirect URL del dominio, accesso con telefono e password abilitato senza invio di SMS. Verifica nella documentazione di Supabase che quest'ultima combinazione sia possibile e, se non lo è, fermati e spiegami le alternative prima di procedere;
   - variabili d'ambiente di Netlify, dominio personalizzato, HTTPS;
   - creazione dello studio reale e del titolare con scripts/create-studio.ts.
7. Backup: il piano gratuito di Supabase non fa backup giornalieri. Scrivi in docs/operativita.md la procedura consigliata e i suoi limiti, senza salvare copie del database in posti non adatti a dati sanitari (per esempio artifact di GitHub); indica quando conviene passare al piano Pro.
8. Test end-to-end completi su un deploy di anteprima di Netlify collegato a un progetto Supabase di prova, non a quello di produzione.
9. Completa docs/operativita.md come manuale: deploy, migrazioni, variabili e segreti, rotazione delle chiavi (service role, VAPID, segreto del cron), ripristino, gestione delle richieste GDPR, contatti dei fornitori per i DPA.
10. Elenca in un unico riepilogo tutti i valori ancora "DA CONFERMARE" e le questioni aperte dei requisiti che bloccano il rilascio.

## Criteri di accettazione
- Tutti i test (unitari, pgTAP, end-to-end, accessibilità) passano anche sul deploy di anteprima.
- Le email di recupero password arrivano dal dominio dello studio, in italiano.
- Il tentativo di registrarsi da soli tramite l'API di Supabase viene rifiutato in produzione.
- La chiamata al cron senza segreto riceve 401; con il segreto completa la manutenzione.
- La checklist di docs/checklist-dispositivi.md è stata eseguita su un iPhone e un Android reali con l'ambiente di produzione.
- docs/operativita.md permette a un'altra persona di fare deploy, ripristino e cancellazione di un cliente senza chiedere aiuto.

## Come procedere
Prima di scrivere codice rispondi SOLO con un piano numerato, separando ciò che farai tu da ciò che dovrò fare io dai pannelli dei servizi, le scelte sui punti ambigui e le eventuali domande. Aspetta il mio "Procedi".
```

## Prompt di verifica (da usare a fine di ogni fase)

Sostituisci `[N]` con il numero della fase e incollalo nella stessa sessione, dopo che l'agente ha dichiarato finito il lavoro.

```text
La fase [N] è terminata. Prima del commit fai una verifica critica, come farebbe un revisore esterno severo.

1. Esegui `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` (se la fase ne ha) e, se la fase tocca il database, `supabase db reset` e `supabase test db`. Riporta l'esito di ciascuno.
2. Per ogni requisito citato nel prompt della fase (A-xx, C-xx, T-xx, N-xx, ST-xx, NF-xx) indica in una tabella: requisito, stato (fatto / parziale / mancante), file principale, come l'hai verificato.
3. Ripassa ogni criterio di accettazione e dimmi se è soddisfatto, con la prova.
4. Sicurezza: per ogni nuova Server Action o query conferma che controlla sessione e ruolo, valida con Zod, ricava lo studio dalla sessione e non espone la service role. Segnala ogni punto in cui un cliente o un altro studio potrebbe leggere o modificare dati non suoi.
5. Linee guida di sviluppo: verifica in particolare che
   - nessun componente o pagina importi direttamente Supabase (DEV-05) e che non esistano nuovi Route Handler in src/app/api, salvo webhook o cron;
   - ogni Server Action restituisca { ok: true, data } oppure { ok: false, error } (DEV-07);
   - nomi e suffissi dei file rispettino DEV-06 e DEV-15;
   - non ci siano testi dell'interfaccia o valori di dominio scritti direttamente nei componenti (DEV-08, DEV-14);
   - ogni sezione nuova abbia stato vuoto, loading.tsx ed error.tsx (DEV-13);
   - i calcoli di dominio siano funzioni pure testate (DEV-10);
   - ogni modifica al database sia una migrazione in supabase/migrations (DEV-19).
6. Confronta le schermate realizzate con quelle di docs/mockups/mockup.html citate nel prompt ed elenca le differenze visibili.
7. Elenca i compromessi fatti, i TODO lasciati nel codice e i valori segnati DA CONFERMARE, e verifica che le decisioni di architettura della fase siano annotate in CLAUDE.md (DEV-20).

Correggi subito i problemi che trovi ai punti 1–5, poi mostrami il riepilogo finale. Non passare ad altre fasi.
```

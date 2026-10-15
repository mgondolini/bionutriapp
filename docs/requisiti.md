# App per nutrizionisti – Documento dei requisiti

Oct 12, 2026 · @Monica

## Panoramica e obiettivi

La versione 1.0 è una web app (PWA) con cui un nutrizionista pubblica file personali ai propri clienti e ne consulta le misure di tracking. Nasce per un singolo studio, ma è progettata multi-tenant e white label per essere rivenduta ad altri nutrizionisti.

Obiettivi della 1.0:

- Sostituire l'invio manuale di diete e documenti con un'area riservata per ogni cliente.
- Raccogliere in un unico posto le misure dei clienti (circonferenze, passi, sonno, allenamenti) e mostrarne l'andamento.
- Mantenere costi di esercizio prossimi allo zero, con circa 80–100 clienti attivi.
- Usare uno stack moderno (Next.js, TypeScript) utile anche come progetto di portfolio.

Nome del prodotto: da definire. Per la 1.0 l'app usa il nome e il logo dello studio del cliente.

## Utenti e ruoli

Nella 1.0 esistono due ruoli: il nutrizionista (admin) e il cliente. Il ruolo di collaboratore arriva con la 3.0.

| Ruolo | Descrizione | Disponibile da |
| --- | --- | --- |
| Titolare (admin) | Nutrizionista che gestisce lo studio: clienti, file, tracking, impostazioni | v1.0 |
| Cliente | Paziente dello studio: consulta i propri file e registra le proprie misure | v1.0 |
| Collaboratore | Nutrizionista dello stesso studio che opera solo sui clienti assegnati e vede tutti gli altri in lettura | v3.0 |
| Amministratore piattaforma | Lo sviluppatore: crea gli studi e il primo titolare, lato server | v1.0 (senza interfaccia) |

## Roadmap

Il rilascio è diviso in tre versioni: la 1.0 copre file e tracking, la 2.0 aggiunge il calendario, la 3.0 i collaboratori. Il database è progettato fin da subito per tutte e tre, così le versioni successive non richiedono di ristrutturarlo.

| Versione | Contenuto | Prerequisiti |
| --- | --- | --- |
| 1.0 | Gestione clienti, inviti via WhatsApp, fasi del percorso con onboarding, pubblicazione file (diete, allenamenti, report), tracking misure, notifiche push, PWA, branding dello studio | — |
| 2.0 | Calendario appuntamenti del nutrizionista, con slot di disponibilità importati da Google Calendar tramite link iCal | 1.0 in produzione |
| 3.0 | Più professionisti per studio, assegnazione dei clienti, permessi differenziati, calendario per professionista | 2.0 |
| Backlog | Notifiche email, vendita ad altri studi, abbonamenti, misure personalizzabili da interfaccia | Da pianificare |

## Requisiti v1.0 – area admin

L'area admin è desktop-first, con sidebar, e si compone di elenco clienti e scheda cliente con tre schede: Profilo, File, Tracking.

**Elenco clienti**

- **A-01** Tabella clienti con nome e iniziali, cellulare, stato account, fase del percorso, ultimo file pubblicato, data dell'ultima misura e azioni: "Invia invito su WhatsApp" per i clienti non attivi e "Dettaglio" per tutti.
- **A-02** Filtri per stato account e per fase del percorso, con conteggi; i clienti in Onboarding sono evidenziati.
- **A-03** Ricerca per nome, email o telefono.
- **A-04** Creazione di un cliente in due modalità: "Con dati completi" (entra In percorso all'attivazione) oppure "Nuovo cliente" con soli nome e cellulare (entra in Onboarding).
- **A-05** Import iniziale da CSV, con cellulare obbligatorio, pulizia dei dati (email in minuscolo, duplicati rimossi, telefoni normalizzati) e scarto delle righe non valide; i clienti importati partono dalla fase In percorso.

**Scheda cliente – Profilo**

- **A-06** Visualizzazione e modifica dei dati anagrafici, stato account, fase del percorso, data di attivazione e stato delle notifiche.
- **A-07** Pulsante "Invia invito su WhatsApp" o "Reinvia invito", con data dell'ultimo invio e scadenza; pulsante "Onboarding completato" per i clienti in Onboarding; cambio manuale della fase (In pausa, Concluso, ripresa del percorso).

**Scheda cliente – File**

- **A-08** Caricamento di un PDF (massimo 10 MB) con drag and drop, categoria (Dieta, Allenamento, Report), titolo, data di validità e nota facoltativa per il cliente.
- **A-09** Opzione "Avvisa il cliente" che invia una notifica push alla pubblicazione.
- **A-10** Elenco dei file filtrabile per categoria, con data di caricamento e stato di lettura ("Letto il…" / "Non ancora letto").
- **A-11** Apertura ed eliminazione di un file, con conferma prima dell'eliminazione.

**Scheda cliente – Tracking**

- **A-12** Card per ogni misura con ultimo valore, data, variazione rispetto alla rilevazione precedente e indicatore di misura in ritardo.
- **A-13** Dettaglio di una misura con grafico dell'andamento e storico; per gli allenamenti, voto medio ed elenco con data, voto e nota.

**Impostazioni studio**

- **A-14** Nome, logo e colore principale dello studio (white label). Nella 1.0 possono essere impostati anche solo lato database.

## Requisiti v1.0 – area cliente

L'area cliente è mobile-first e installabile come PWA; la navigazione avviene da un menu a tendina nell'intestazione.

- **C-01** Intestazione con nome dello studio, saluto "Ciao \[Nome\]", avatar e menu a tendina con: Diete, Allenamenti, Report, Tracking, e in fondo Profilo ed Esci.
- **C-02** Home con l'ultimo file pubblicato in evidenza (badge "Nuovo" se non letto, titolo, data, nota del nutrizionista, pulsanti "Apri PDF" e "Scarica") e riepilogo delle misure in scadenza.
- **C-03** Banner per attivare le notifiche push, mostrato finché non sono attive.
- **C-04** Pagine Diete, Allenamenti e Report: file in corso in evidenza e archivio dei precedenti.
- **C-05** All'apertura di un file viene registrata la data di prima lettura, visibile al nutrizionista.
- **C-06** Guida all'installazione della PWA al primo accesso, necessaria per ricevere le push su iPhone.
- **C-07** Profilo con dati personali, cambio password e attivazione/disattivazione delle notifiche.
- **C-08** Pagina di attivazione aperta dal link WhatsApp: dati precompilati da verificare per i clienti già presenti, modulo da compilare per i nuovi; in entrambi i casi scelta della password.
- **C-09** Proposta da confermare: il cliente in Onboarding vede una home di benvenuto con i prossimi passi e le informazioni sulla chiamata, mentre file e tracking si sbloccano quando passa In percorso.

Nota: "Allenamenti" nel menu indica le schede di allenamento caricate dal nutrizionista; il diario degli allenamenti svolti si trova nel Tracking.

## Tracking delle misure

Nella 1.0 il tracking comprende 9 misure predefinite: cinque circonferenze mensili, tre abitudini giornaliere a punteggio (passi, sonno, acqua) e il diario degli allenamenti. Le misure sono create automaticamente per ogni studio e salvate come configurazione nel database, così da poterle personalizzare in futuro.

| Misura | Unità | Frequenza | Valori ammessi | Istruzione per il cliente |
| --- | --- | --- | --- | --- |
| Circ. Vita | cm | Ogni 30 giorni | 10–250, decimale | Ogni 30 giorni inseriscila qui |
| Circ. Ombelicale | cm | Ogni 30 giorni | 10–250, decimale | Ogni 30 giorni inseriscila qui |
| Circ. Gluteo | cm | Ogni 30 giorni | 10–250, decimale | Ogni 30 giorni inseriscila qui |
| Circ. Gamba dx | cm | Ogni 30 giorni | 10–150, decimale | Ogni 30 giorni inseriscila qui |
| Circ. Braccio dx | cm | Ogni 30 giorni | 10–100, decimale | Ogni 30 giorni inseriscila qui |
| Passi | voto | Giornaliera | 1–5, intero | Quanto ti sei avvicinato oggi al tuo obiettivo di passi? |
| Sonno | voto | Giornaliera | 1–5, intero | Come hai dormito stanotte rispetto al tuo obiettivo? |
| Acqua | voto | Giornaliera | 1–5, intero | Quanta acqua hai bevuto oggi rispetto al tuo obiettivo? |
| Allenamenti | voto | Per ogni allenamento | 1–10, intero, nota facoltativa | Voto alla qualità/performance dell'allenamento |

**Scala delle abitudini giornaliere**

Il voto di passi, sonno e acqua è ancorato all'obiettivo personale del cliente, così da essere confrontabile nel tempo e non lasciato alla sola sensazione.

| Voto | Significato | Esempio acqua (obiettivo 2 L) |
| --- | --- | --- |
| 5 | Obiettivo raggiunto | 2 L o più |
| 4 | Quasi raggiunto | Circa 1,5 L |
| 3 | A metà | Circa 1 L |
| 2 | Poco | Circa 0,5 L |
| 1 | Quasi niente | Meno di 0,5 L |

- **T-01** Il cliente vede la lista delle misure con icona, istruzione, numero di registrazioni e una spunta se la misura è già registrata nel periodo corrente.
- **T-02** Il cliente inserisce un valore con data precompilata a oggi (non futura); per gli allenamenti sceglie il voto con pulsanti 1–10 e può aggiungere una nota.
- **T-03** Il cliente vede grafico e storico di ogni misura e può correggere o eliminare le proprie registrazioni.
- **T-04** Ogni valore viene validato sia nell'interfaccia sia nel database rispetto ai limiti della misura.
- **T-05** Una circonferenza è "in ritardo" quando dall'ultima registrazione sono passati più di 30 giorni; per le abitudini giornaliere il nutrizionista vede invece quanti giorni sono stati compilati nella settimana.
- **T-06** Check-in giornaliero in una sola schermata: passi, sonno e acqua, un tocco ciascuno sulla scala 1–5 con la descrizione del voto. Si può compilare anche il giorno precedente, e i giorni saltati non vengono penalizzati.
- **T-07** Il nutrizionista imposta gli obiettivi personali di ogni cliente (per esempio 2 L di acqua, 8.000 passi, 7 ore di sonno); in mancanza valgono quelli predefiniti dello studio. Le descrizioni dei voti mostrano l'obiettivo del cliente.
- **T-08** Per ogni abitudine vengono mostrati al cliente e al nutrizionista la media della settimana e il confronto con la settimana precedente (per esempio "+0,6 rispetto alla scorsa settimana").
- **T-09** Gli allenamenti restano su scala 1–10, perché valutano la qualità di una singola sessione.

## Autenticazione, inviti e notifiche

I clienti non si registrano da soli: lo studio crea il cliente e il professionista gli invia un link di invito personale tramite WhatsApp. Le email partono solo dopo l'attivazione dell'account, e lo studio non genera né invia mai password.

**Invio dell'invito tramite WhatsApp**

1. Il professionista crea il cliente o lo importa da CSV; il numero di cellulare è obbligatorio.
2. Preme "Invia invito su WhatsApp": l'app genera un link personale (monouso, valido 14 giorni, salvato solo come hash) e apre WhatsApp con un messaggio precompilato verso il numero del cliente, tramite il link click-to-chat `wa.me`. Non servono l'API di WhatsApp Business né costi.
3. Il professionista invia il messaggio dal proprio WhatsApp e l'app registra la data dell'invio.
4. Il cliente apre il link e completa l'attivazione secondo uno dei due percorsi.

**Due percorsi di attivazione**

| Aspetto | Cliente già nel database | Nuovo cliente |
| --- | --- | --- |
| Origine | Import da CSV o inserimento con dati completi | Inserimento con soli nome e cellulare |
| Aprendo il link vede | Dati anagrafici precompilati da verificare | Modulo con i dati da compilare |
| Inserisce | Password ed eventuali correzioni | Dati anagrafici, email e password |
| Fase dopo l'attivazione | In percorso | Onboarding |

- **N-01** Il pulsante "Invia invito su WhatsApp" è l'azione principale della riga in tabella per i clienti non ancora attivi, così dopo l'import gli inviti si mandano in sequenza senza aprire ogni scheda. Nella scheda Profilo lo stesso pulsante gestisce reinvio e inviti scaduti, con data dell'ultimo invio e scadenza.
- **N-02** Generare un nuovo invito invalida il precedente. Chi non ha email e dimentica la password riceve dal professionista un nuovo link con lo stesso pulsante.
- **N-03** Nessuna email di invito: le email partono solo ad account attivo (recupero password e, in futuro, notifiche).
- **N-04** Notifiche push tramite Web Push (chiavi VAPID), senza servizi a pagamento; su iPhone funzionano solo con la PWA installata.
- **N-05** Messaggi WhatsApp e notifiche contengono solo nome dello studio e link, mai dati sanitari.
- **N-06** Tutte le notifiche passano da un unico servizio applicativo, per poter aggiungere l'email in futuro senza modificare il resto.
- **N-07** Le email di autenticazione usano un SMTP dedicato gratuito (Brevo o Resend) invece del servizio integrato di Supabase.
- **N-08** Le notifiche email per i nuovi file sono escluse dalla 1.0: il nutrizionista usa lo stato di lettura per sollecitare i clienti.

**Stati dell'account e fasi del percorso**

Ogni cliente ha due informazioni indipendenti: lo stato dell'account, che dice se il cliente può accedere, e la fase del percorso, che dice a che punto è il suo rapporto con lo studio.

| Stato account | Significato |
| --- | --- |
| Da invitare | Cliente creato, invito mai inviato |
| Invito inviato | Link inviato e non ancora usato |
| Invito scaduto | Link non usato entro 14 giorni (calcolato, non salvato) |
| Attivo | Account attivato dal cliente |
| Disattivato | Accesso sospeso dallo studio |

| Fase del percorso | Significato | Come si entra |
| --- | --- | --- |
| Onboarding | Nuovo cliente in attesa della chiamata di onboarding | Automatico, all'attivazione di un nuovo cliente |
| In percorso | Cliente seguito attivamente | Pulsante "Onboarding completato"; i clienti importati partono già qui. Dalla 2.0 anche automatico quando l'appuntamento di onboarding è segnato come completato |
| In pausa | Percorso sospeso temporaneamente | Manuale |
| Concluso | Percorso terminato, dati consultabili in sola lettura | Manuale |

- **ST-01** Stato dell'account e fase del percorso cambiano in modo indipendente: per esempio un cliente In percorso può avere l'account Disattivato.
- **ST-02** v1.0: il passaggio da Onboarding a In percorso è manuale, con il pulsante "Onboarding completato" nella scheda del cliente.
- **ST-03** v2.0: quando un appuntamento di tipo Onboarding viene segnato come completato, il cliente passa automaticamente In percorso; il pulsante manuale resta disponibile per le chiamate fatte fuori calendario.
- **ST-04** Ogni cambio di fase viene registrato con data e autore (manuale o automatico), così il nutrizionista vede lo storico del percorso nella scheda del cliente.

## Requisiti non funzionali

Le diete e le misure sono dati relativi alla salute (art. 9 GDPR): sicurezza e riservatezza hanno priorità su ogni altra scelta.

**Sicurezza e privacy**

- **NF-01** Row Level Security attiva su tutte le tabelle: ogni studio vede solo i propri dati, ogni cliente solo i propri.
- **NF-02** File in bucket privato, accessibili solo con URL firmati a scadenza.
- **NF-03** Chiave service role usata solo lato server, mai esposta al browser.
- **NF-04** Dati e server in UE (Supabase region Francoforte).
- **NF-05** Validazione di ogni input con Zod lato server.
- **NF-06** Lo studio è titolare del trattamento; lo sviluppatore, se gestisce la piattaforma, è responsabile del trattamento. Servono informativa, consenso, DPA con i fornitori e procedure di backup e cancellazione dei dati.

**Design e accessibilità**

- **NF-07** Design system: font Plus Jakarta Sans; sfondo #F5F6F2, superfici #FFFFFF, testo #18211D e #55605A, bordi #DDE2DB, primario #2E6A4E (sovrascrivibile per studio), stati info #E2ECF7/#1F4E80 e attenzione #FBEBD9/#8A4513.
- **NF-08** Area admin desktop-first e responsive; area cliente mobile-first.
- **NF-09** Contrasto testo almeno WCAG AA, touch target di almeno 44 px, componenti navigabili da tastiera.
- **NF-10** Interfaccia interamente in italiano.

**Prestazioni e operatività**

- **NF-11** Dimensionamento per circa 100 clienti attivi per studio, con costi nei piani gratuiti.
- **NF-12** Deploy automatico da GitHub a ogni push sul branch principale.

## Architettura, stack e hosting

L'app è un unico progetto Next.js ospitato su Netlify, che usa Supabase come backend per database, login e file.

| Ambito | Scelta | Motivazione |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Frontend e backend nello stesso progetto; stack molto richiesto |
| UI | shadcn/ui + Tailwind CSS, icone lucide-react | Fedeltà al design, tema con variabili CSS adatto al white label |
| Form e validazione | react-hook-form + Zod | Stesse regole su client e server |
| Backend | Supabase (Postgres, Auth, Storage, RLS, Edge Functions) | Backend gestito, piano gratuito, region UE |
| Notifiche | Web Push con libreria web-push | Nessun costo né servizio esterno |
| Hosting app | Netlify (piano gratuito, uso commerciale ammesso) | Alternative: DigitalOcean App Platform (\~5 $/mese) o Hetzner + Coolify (\~4–5 €/mese) |
| Gestione codice | GitHub, deploy automatico | — |

Organizzazione del codice a livelli: `src/app` (solo pagine e route, gruppi `(admin)` e `(cliente)`), `src/server/actions` (Server Actions: autorizzazione e validazione), `src/server/services` (logica di business), `src/server/repositories` (unico accesso a Supabase), `src/server/validation` (schemi Zod), `src/components`, `src/lib`, `src/types`. Un middleware indirizza ogni utente all'area del proprio ruolo.

White label: nome, logo e colore dello studio sono letti dal database; il manifest della PWA è generato dinamicamente con nome e icona dello studio. In futuro ogni studio sarà riconosciuto dal sottodominio o da un dominio personalizzato.

## Linee guida di sviluppo

Queste regole tengono il codice ordinato e facile da modificare man mano che l'app cresce, e vanno riportate anche in `CLAUDE.md` perché le seguano gli agenti di sviluppo.

**Organizzazione del frontend**

- **DEV-01** Un'unica app Next.js con due interfacce separate: gruppo di route `(admin)` sotto `/admin` (desktop-first, sidebar) e `(cliente)` sotto `/app` (mobile-first, menu a tendina), ciascuno con il proprio layout. Nessuna pagina mostra contenuti diversi in base al ruolo.
- **DEV-02** Componenti in tre livelli: `components/ui` (shadcn), `components/shared` (usati da entrambe le aree, es. FileCard, MetricChart, StatusBadge) e `features/admin` o `features/cliente` (specifici di un'area). Un componente passa in `shared` solo quando serve davvero a entrambe.
- **DEV-03** Controllo degli accessi su tre livelli: middleware, verifica del ruolo nel layout di ogni area e Row Level Security nel database.
- **DEV-04** Il manifest della PWA ha `/app` come pagina iniziale, così l'app installata apre l'area cliente.

**Dati e logica**

- **DEV-05** I componenti non accedono mai direttamente a Supabase: le pagine leggono i dati tramite i service, le modifiche passano dalle Server Actions. I Route Handler (`app/api`) si usano solo per chiamate esterne come webhook e cron.
- **DEV-06** Un file per dominio in ogni livello (files, tracking, clients, invites, appointments), mai un unico file con tutte le chiamate.
- **DEV-07** Le Server Actions restituiscono sempre lo stesso formato: `{ ok: true, data }` oppure `{ ok: false, error }`.
- **DEV-08** Costanti di dominio (categorie file, stati account, fasi del percorso, etichette) in un unico file, con i tipi ricavati da lì; nessun valore "magico" nei componenti.
- **DEV-09** Tipi TypeScript del database generati con `supabase gen types`; schemi Zod condivisi tra form e Server Actions.
- **DEV-10** Calcoli di dominio (media settimanale, misure in ritardo, slot liberi) scritti come funzioni pure, senza dipendenze da React o Supabase.

**Componenti**

- **DEV-11** I componenti di presentazione ricevono i dati come props e non li recuperano da soli.
- **DEV-12** Props piccole e intenzionali (es. `status="invited"` invece di colori e testi passati dall'esterno); varianti con `cva` invece di componenti duplicati; composizione di pezzi piccoli invece di molte props booleane.
- **DEV-13** Ogni sezione prevede stati vuoti, di caricamento e di errore (`EmptyState`, `loading.tsx`, `error.tsx`).
- **DEV-14** Testi dell'interfaccia raccolti in un unico punto, per correggerli facilmente e tradurli in futuro.

**Convenzioni e qualità**

- **DEV-15** File in kebab-case, componenti in PascalCase, suffissi `.service.ts`, `.actions.ts`, `.repository.ts`, `.schema.ts`.
- **DEV-16** TypeScript strict, ESLint e Prettier, con controllo a ogni commit tramite Husky e lint-staged.
- **DEV-17** GitHub Action che a ogni push esegue lint, typecheck e build.
- **DEV-18** Test unitari con Vitest sulle funzioni pure e test end-to-end con Playwright sui flussi critici (attivazione dal link, caricamento di un file, check-in giornaliero).
- **DEV-19** Ogni modifica al database passa da una migrazione versionata in `supabase/migrations`, mai da modifiche manuali in produzione.
- **DEV-20** Le astrazioni si introducono quando un elemento serve la seconda o terza volta, non in anticipo; ogni decisione di architettura viene annotata in `CLAUDE.md`.

## Modello dati

Il cliente è un'entità dello studio separata dall'account di login: esiste dall'import, e si collega a un utente solo quando attiva l'account.

| Tabella | Contenuto | Versione |
| --- | --- | --- |
| `studios` | Studio (tenant): nome, slug, logo, colore principale | v1.0 |
| `studio_members` | Professionisti dello studio con ruolo (titolare; collaboratore dalla 3.0) | v1.0 |
| `clients` | Clienti: anagrafica, cellulare (obbligatorio), email, origine (importato o nuovo), stato account, fase del percorso, collegamento all'utente | v1.0 |
| `client_stage_events` | Storico dei cambi di fase: cliente, fase precedente e nuova, data, autore o origine automatica | v1.0 |
| `client_invites` | Link di invito monouso (solo hash), data di invio via WhatsApp, scadenza, data di utilizzo | v1.0 |
| `client_files` | File dei clienti: categoria, titolo, percorso, validità, nota, data di lettura | v1.0 |
| `metrics` | Misure configurabili per studio: unità, tipo, frequenza, limiti, icona, obiettivo predefinito | v1.0 |
| `client_metric_goals` | Obiettivi personali del cliente per le abitudini giornaliere (es. 2 L di acqua, 8.000 passi) | v1.0 |
| `tracking_entries` | Registrazioni: cliente, misura, valore, data, nota | v1.0 |
| `push_subscriptions` | Sottoscrizioni Web Push per utente | v1.0 |
| `appointments` | Appuntamenti: professionista, cliente, orari, tipo (incluso onboarding), stato, note | v2.0 |
| `availability_rules` | Orario di lavoro settimanale per professionista: giorno, inizio, fine, durata degli slot | v2.0 |
| `availability_overrides` | Eccezioni manuali: slot chiusi o aperti con data e ora | v2.0 |
| `calendar_connections` | Link iCal cifrato, stato e data dell'ultima sincronizzazione | v2.0 |
| `calendar_busy_blocks` | Intervalli occupati importati (solo inizio e fine) | v2.0 |
| `clients.assigned_to` | Professionista assegnato al cliente | v3.0 |

Storage: bucket privato `client-files` (percorso `studio_id/client_id/file.pdf`, solo PDF fino a 10 MB) e bucket pubblico `studio-assets` per i loghi. Le migrazioni SQL sono già pronte: `20261011000000_schema_iniziale.sql` per la 1.0 e `20261012000000_collaboratori_appuntamenti.sql` per le versioni 2.0 e 3.0, da dividere in due migrazioni distinte al momento del rilascio. Le tabelle per la disponibilità e il collegamento iCal sono ancora da scrivere, e lo schema 1.0 va aggiornato per inviti via WhatsApp e fasi del percorso.

## Requisiti v2.0 – calendario appuntamenti

La 2.0 aggiunge un calendario degli appuntamenti per il nutrizionista. Con un solo professionista, il calendario è unico per lo studio.

- **CAL-01** Vista settimanale e giornaliera del calendario, con passaggio rapido alla giornata di oggi.
- **CAL-02** Creazione, modifica e annullamento di un appuntamento: cliente (facoltativo per impegni personali), titolo, tipo (onboarding, prima visita, controllo, online, altro), inizio, fine e note.
- **CAL-03** Stati dell'appuntamento: programmato, completato, annullato, non presentato.
- **CAL-04** Il sistema impedisce appuntamenti sovrapposti; quelli annullati non contano.
- **CAL-05** Dalla scheda cliente si vedono i suoi appuntamenti passati e futuri e se ne può fissare uno nuovo.
- **CAL-06** Dalla dashboard si vedono gli appuntamenti del giorno.

* **CAL-14** Segnare come completato un appuntamento di tipo Onboarding sposta automaticamente il cliente dalla fase Onboarding a In percorso (vedi ST-03).

**Disponibilità da Google Calendar (iCal)**

Gli slot liberi vengono proposti automaticamente leggendo il calendario Google del nutrizionista tramite il suo indirizzo iCal segreto; il nutrizionista poi li ritocca a mano. Il collegamento è in sola lettura e non richiede autenticazione OAuth con Google.

- **CAL-07** Il nutrizionista imposta l'orario di lavoro settimanale (fasce per giorno) e la durata standard delle visite.
- **CAL-08** Il nutrizionista incolla nelle impostazioni l'indirizzo iCal segreto del proprio Google Calendar; il link è salvato cifrato e usato solo lato server.
- **CAL-09** Un'attività programmata (Edge Function di Supabase con cron, circa ogni 15 minuti) legge il calendario e importa solo inizio e fine degli impegni, mai titoli, descrizioni o partecipanti.
- **CAL-10** Gli slot liberi sono calcolati come orario di lavoro meno impegni importati meno appuntamenti già presenti nell'app, suddivisi per la durata delle visite.
- **CAL-11** Il nutrizionista può chiudere uno slot proposto o aprirne uno extra; queste eccezioni prevalgono sempre sul calcolo automatico e restano valide alle sincronizzazioni successive.
- **CAL-12** Le impostazioni mostrano la data dell'ultima sincronizzazione riuscita e segnalano errori di lettura (per esempio link non più valido).
- **CAL-13** Gli appuntamenti creati nell'app non vengono scritti su Google Calendar: per la sincronizzazione nei due sensi servirà l'integrazione con le API di Google (backlog).

Da decidere: se gli slot liberi servono solo al nutrizionista per organizzarsi o anche ai clienti per prenotare in autonomia (prenotazione, conferma, cancellazione e preavviso sarebbero una funzionalità a sé), e se il cliente debba vedere i propri appuntamenti e ricevere promemoria push.

## Requisiti v3.0 – collaboratori e assegnazioni

La 3.0 permette a più professionisti di lavorare nello stesso studio: ogni cliente ha un professionista di riferimento, e ciascuno opera solo sui propri clienti.

| Azione | Titolare | Collaboratore |
| --- | --- | --- |
| Vedere tutti i clienti, i loro file e il tracking | Sì | Sì, in sola lettura |
| Modificare dati, caricare o eliminare file, generare codici | Tutti i clienti | Solo clienti assegnati |
| Creare un nuovo cliente | Sì, assegnandolo a chiunque | Sì, assegnato automaticamente a sé |
| Cambiare l'assegnazione di un cliente | Sì | No |
| Eliminare un cliente | Sì | No |
| Configurare misure e impostazioni dello studio | Sì | No |
| Vedere il calendario | Tutti i calendari | Solo il proprio |
| Fissare appuntamenti | In qualsiasi calendario | Solo nel proprio, con i propri clienti |

- **COL-01** Il titolare invita un collaboratore e può rimuoverlo; i clienti di un collaboratore rimosso diventano "non assegnati".
- **COL-02** Elenco clienti con colonna "Professionista" e filtro "I miei clienti", attivo di default per i collaboratori.
- **COL-03** Nella scheda di un cliente non assegnato a sé, il collaboratore vede i dati con le azioni di modifica disattivate.
- **COL-04** Solo il titolare vede il selettore per cambiare l'assegnazione.
- **COL-05** Ogni cliente ha al massimo un professionista assegnato.

## Backlog e fuori scope

Questi elementi sono stati discussi ma non sono pianificati in nessuna delle tre versioni.

- Notifiche email per nuovi file e promemoria delle misure (Brevo o Resend, template con branding dello studio, preferenze del cliente, registro degli invii).
- Login con OTP via SMS (richiede un provider a pagamento come Twilio).
- Vendita ad altri studi: onboarding self-service, sottodomini o domini personalizzati, abbonamenti con Stripe.
- Interfaccia per personalizzare le misure di tracking per studio (il database lo supporta già).
- Note private del nutrizionista sul cliente, in una tabella non visibile al cliente.
- App nativa per iOS e Android.

## Costi, rischi e questioni aperte

Il costo ricorrente della 1.0 è di circa 10–15 € l'anno, cioè il solo dominio; tutti i servizi restano nei piani gratuiti. I prezzi indicati sono approssimativi e vanno verificati al momento dell'attivazione.

| Voce | Costo stimato | Quando cambia |
| --- | --- | --- |
| Hosting Netlify | 0 € | Traffico molto superiore o esigenze di team |
| Supabase | 0 € | Pro (\~25 $/mese) per backup giornalieri e nessuna pausa, consigliato con più studi |
| SMTP (Brevo o Resend) | 0 € | Oltre i limiti giornalieri del piano gratuito |
| Dominio | \~10–15 €/anno | — |

**Rischi**

- Il piano gratuito di Supabase sospende i progetti inattivi per circa una settimana: mitigazione con un cron di attività o passaggio a Pro.
- Le push non arrivano su iPhone senza PWA installata: mitigazione con guida all'installazione e stato di lettura dei file.
- Curva di apprendimento di Next.js e React: mitigazione con un prototipo iniziale e tempi di consegna concordati con margine.
- Obblighi GDPR sui dati sanitari: consulenza privacy prima di vendere ad altri studi.

**Questioni aperte**

- [ ] Nome definitivo del prodotto e verifica dei marchi su UIBM ed EUIPO.
- [ ] Obiettivi predefiniti dello studio per passi, sonno e acqua, da concordare con il nutrizionista.
- [ ] Conferma dei limiti minimi e massimi delle circonferenze con il nutrizionista.
- [ ] Elenco completo delle misure (lo screenshot dell'app attuale è tagliato).
- [ ] Uso degli slot liberi nella 2.0: solo organizzazione interna o prenotazione da parte dei clienti; visibilità degli appuntamenti al cliente.
- [ ] Visione dei calendari altrui da parte del titolare nella 3.0.

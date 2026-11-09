# Changelog

Tutte le modifiche rilevanti del progetto sono elencate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/). I codici tra parentesi (A-04, C-09, N-06…) rimandano ai requisiti in `docs/requisiti.md`.

## [Non rilasciato]

### Aggiunto

- Notifiche push per tipo: nuovo piano alimentare, scheda di allenamento o report, con il link diretto alla sezione e un badge per tipo su Android; promemoria serale alle 20 (fuso dello studio) se mancano le abitudini del giorno, con un richiamo all'allenamento se non ce n'è uno. Solo clienti attivi e In percorso. Nel profilo del cliente gli interruttori "Nuovi file" e "Promemoria serale". Registro delle notifiche con deduplicazione (nessun doppio invio) e conservazione di 90 giorni; sottoscrizioni eliminate dopo 5 fallimenti consecutivi.
- Ritaglio del logo nelle Impostazioni studio: dopo la scelta dell'immagine (PNG, JPEG o WebP, almeno 512 px sul lato lungo) si apre un pannello con zoom, "Riempi" o "Adatta con margine" e anteprime di menu, icona Android e iPhone; viene salvato un PNG quadrato da 1024 px su fondo bianco, ricontrollato dal server.
- Nella home del cliente "Da registrare" mostra sempre gli allenamenti in fondo (con la spunta se c'è una sessione oggi), senza contarli tra le misure da registrare.
- Paginazione: elenco clienti del nutrizionista 20 per pagina e scheda File 10 per pagina (pagina nell'URL); storico delle misure, archivio dei file del cliente e storico delle fasi 10 per pagina, anteprima dell'import CSV 20 righe per pagina, con le frecce e senza ricaricare. Lo storico delle misure ora mostra tutte le registrazioni, non più solo le ultime 60.

### Modificato

- Home del cliente, "Da registrare": icone di misure e check-in su fondo pesca (richiede attenzione); gli allenamenti restano azzurri.
- Obiettivi predefiniti delle abitudini: 10.000 passi, 8 ore di sonno e 2 L di acqua (prima 8.000 passi e 7 ore). Gli studi esistenti con i vecchi valori vengono aggiornati; gli obiettivi personali dei clienti non cambiano.
- Abitudini giornaliere: icone su fondo lilla (righe del tracking, home, check-in e obiettivi nella scheda dello staff), così si distinguono dalle circonferenze; le spunte "fatto oggi" restano nel colore dello studio.
- "Nuovo cliente": un solo form con i dati completi e la scelta della fase (In percorso o Onboarding); dopo la creazione il pannello propone subito "Invia invito su WhatsApp" per il link della password. Import CSV: la fase si sceglie per tutto il file (prima entravano sempre In percorso).
- "Esci" non disattiva più le notifiche push del dispositivo: al nuovo accesso restano attive (prima andavano riattivate ogni volta). "Esci da tutti i dispositivi" continua a eliminarle tutte.
- Impostazioni studio: solo nome e logo; il colore principale e l'anteprima non si modificano più dall'app.
- Nuovo sistema colore (`docs/mockups/mockup-v2.html`): neutri salvia, menu laterale scuro nell'area del nutrizionista, menta derivata dal colore dello studio per file in evidenza, check-in e badge "In percorso"/"Nuovo", pesca solo per ciò che richiede attenzione, colori propri per le categorie Allenamento e Report, pulsanti secondari con il bordo nel colore dello studio. Colore predefinito `#1F7A5C`.

## [1.2.0] - 2026-11-03

Nuova interfaccia per tutte le schermate, peso, spalle e altezza del cliente, attivazione più robusta e app installata con il marchio dello studio.

### Aggiunto

- Peso tra le misure periodiche (in kg, ogni 30 giorni, come le circonferenze) e nuova circonferenza delle spalle.
- Altezza del cliente: dato anagrafico obbligatorio all'attivazione, modificabile dal cliente nel profilo e dallo staff nella scheda; il nutrizionista la vede accanto a peso e circonferenze e nel dettaglio di ogni misura (se manca, il collegamento porta al profilo).
- Home del cliente con le card degli altri file in corso (uno per categoria, con "Nuovo" finché non è aperto) oltre al file in evidenza (C5).
- Informativa privacy leggibile in un pannello durante l'attivazione, con il pulsante "Ho letto l'informativa"; la pagina `/privacy` ha i pulsanti per chiuderla.
- Favicon generata dal logo dello studio; schermata di avvio con logo e nome dello studio su iPhone e, subito dopo quella di sistema, su Android.

### Modificato

- Interfaccia di area cliente, area del nutrizionista e pagine di accesso portata al nuovo mockup (`docs/mockups/mockup.html`): colori derivati da quello dello studio, intestazioni e menu del cliente, card del tracking con mini-grafici, elenchi raggruppati, dialog e pulsanti ridisegnati.
- Nella scheda Tracking dello staff i grafici e i pulsanti delle card sono allineati anche quando una card non ha variazione, nota o voto.
- "Circ. Gluteo" si chiama ora "Circ. Fianchi"; la sezione diventa "Peso e circonferenze" e l'avviso parla di "misure in ritardo".
- Email obbligatoria all'attivazione, così ogni cliente può accedere e recuperare la password da solo.
- Messaggio dell'invito WhatsApp: "{studio} e il suo team ti invitano ad attivare l'account".
- Il titolo della scheda del browser è il nome dello studio (prima "Area riservata").

### Corretto

- Dopo l'attivazione l'app poteva restare nell'account usato in precedenza sullo stesso telefono: ora la sessione precedente viene chiusa e si entra con il nuovo account, oppure si torna al login.
- I link degli inviti generati su Netlify non possono più puntare a un indirizzo locale (la build si ferma).

### Sviluppo

- Migrazioni `20261102000000_misure_peso_spalle.sql` (peso, spalle, nome "Fianchi"; la chiave resta `circ_glutes`) e `20261102100000_altezza.sql` (`clients.height_cm`, viste, `guard_client`, `update_my_client_profile`, `activate_client`); test pgTAP `19_altezza.sql`.
- Schemi condivisi dell'altezza in `height.schema.ts`; immagini di avvio per iOS da `src/app/splash/[size]/route.tsx`; `LaunchSplash` per Android.
- Nuovi valori `DA CONFERMARE`: limiti del peso (20–300 kg), delle spalle (10–250 cm) e dell'altezza (100–230 cm).

## [1.1.0] - 2026-10-30

Il nutrizionista può inserire e correggere le registrazioni del tracking dei clienti.

### Aggiunto

- Inserimento di circonferenze, allenamenti e voti delle abitudini dalla scheda Tracking del cliente ("Aggiungi registrazione"), in ogni fase e anche prima dell'attivazione dell'account (A-15).
- Correzione ed eliminazione di qualsiasi registrazione da parte dello staff (T-03).
- Autore di ogni registrazione salvato dal database (cliente o nutrizionista) ed etichette "Inserita dal nutrizionista" / "Modificata dal nutrizionista" visibili in entrambe le aree (A-16).
- Pannelli dal basso su smartphone per inserimento e correzioni; grafici con tooltip al tocco e assi leggibili su schermi stretti (A-17, NF-08).

### Modificato

- Il cliente modifica ed elimina solo le registrazioni inserite da lui; nel check-in i voti inseriti dal nutrizionista compaiono bloccati.
- Lo storico delle registrazioni usa lo stesso elenco nelle due aree (la tabella dello storico admin è stata rimossa).

### Sviluppo

- Migrazione `20261030000000_tracking_autore.sql` (colonne dell'autore, policy aggiornate, `save_daily_checkin` rispetta le registrazioni dello staff) e test pgTAP `18_tracking_autore.sql`.
- Regola unica dei permessi in `src/lib/domain/tracking/permissions.ts`; test e2e `e2e/tracking-staff.spec.ts` su viewport da smartphone.

## [1.0.0] - 2026-10-30

Prima versione completa: area del nutrizionista, area del cliente installabile come app, notifiche push, strumenti GDPR e preparazione alla produzione.

### Aggiunto

#### Accesso e branding

- Login con email o cellulare, recupero e nuova password via email (link verificato solo all'invio del modulo, così l'anteprima dei client di posta non lo consuma).
- Smistamento per ruolo su tre livelli: proxy, controllo nei layout di area, Row Level Security.
- Branding per studio letto dal database (nome, logo, colore principale), con colore del testo scelto per il contrasto; icone dell'app e manifest generati dallo studio (A-14).
- Impostazioni dello studio con anteprima per il cliente.

#### Clienti (area del nutrizionista)

- Elenco clienti con stato, fase, ultimo file e ultima misura in una sola query; filtri, ricerca e conteggi a faccette nell'URL (NF-11).
- Creazione di un cliente nuovo o già seguito (A-04) e import da CSV con anteprima, correzioni e scarti motivati, inserimento atomico (A-05).
- Scheda cliente con profilo, file e tracking; modifica di contatti e dati, disattivazione e riattivazione dell'account (A-06, A-07).
- Fasi del percorso (Onboarding, In percorso, In pausa, Concluso) con storico delle transizioni (ST-01…ST-04).

#### Inviti e attivazione

- Invito via WhatsApp con link monouso valido 14 giorni; un nuovo invito revoca i precedenti (N-01, N-02).
- Pagina di attivazione con correzione dei dati, scelta della password e consensi separati per informativa e dati sanitari (C-08, NF-06); un nuovo link a un cliente già attivo serve a reimpostare la password.

#### File

- Caricamento di PDF fino a 10 MB direttamente su Storage con avanzamento, verificato sul server prima della pubblicazione.
- Categorie, data di validità, nota, file "in corso" e archivio; badge "Nuovo" fino alla prima apertura.
- Apertura e download tramite URL firmati di 60 secondi, solo dopo il controllo dei permessi (C-05, NF-02); in Onboarding il cliente non vede i file (C-09).
- Eliminazione dei file (A-11).

#### Tracking

- Circonferenze con scadenza a 30 giorni, abitudini giornaliere (acqua, passi, sonno) con un voto rispetto all'obiettivo e allenamenti (T-01…T-08).
- Check-in giornaliero di oggi o di ieri, salvato in modo atomico (T-06).
- Grafici con tabella equivalente per gli screen reader, storico e correzione delle registrazioni.
- Obiettivi personali delle abitudini, impostati dal nutrizionista (T-07); consultazione del tracking dalla scheda cliente (A-12, A-13).
- Scrittura consentita solo In percorso; In pausa e Concluso in sola lettura.

#### Profilo e sessione

- Profilo del cliente (nome, cognome, data di nascita) e del professionista (titolo, nome, cognome) (C-07).
- Cambio email con doppia conferma, cambio password con chiusura delle altre sessioni.
- "Esci" ed "Esci da tutti i dispositivi"; una sessione chiusa non legge più dati, anche con un token ancora valido.
- Nessun dato visibile dopo il logout (no-store, back/forward cache, navigazione con replace); sessione scaduta riconosciuta anche nelle Server Actions.

#### App installabile e notifiche push

- Service worker con scope `/app` che mette in cache solo la pagina offline, mai pagine o dati.
- Guida all'installazione per iPhone, Android e desktop (C3) e banner per attivare le notifiche (C5).
- Notifica push alla pubblicazione di un file, con testo generico e senza dati sanitari (N-04, N-05, N-06); al tocco l'app si apre sulla home ricaricata.

#### Sicurezza, accessibilità e GDPR

- Header di sicurezza: CSP, HSTS, `X-Frame-Options`, `Permissions-Policy` restrittiva.
- Accessibilità WCAG 2.1 AA verificata con axe su entrambe le aree e con colori dello studio chiari e scuri (NF-09).
- Registro dei consensi non modificabile; pagina `/privacy`.
- Script per l'esportazione dei dati di un cliente (`client:export`), la cancellazione completa (`client:delete`) e il backup dello Storage (`storage:backup`).
- Manutenzione giornaliera (GitHub Action): keep-alive di Supabase, pulizia dei caricamenti non confermati e degli inviti scaduti.
- Email di Auth in italiano con il nome dello studio, inviate tramite SMTP dedicato (N-07).

#### Sviluppo

- Migrazioni Supabase da `20261011000000_schema_iniziale.sql` a `20261029200000_manutenzione.sql`, con RLS su ogni tabella.
- Test pgTAP del database, Vitest per funzioni pure e service, Playwright per i flussi principali, la sicurezza e l'accessibilità.
- Seed di sviluppo con due studi e clienti inventati; script `studio:create` e `seed:files`.

### Note per la messa in produzione

Il codice della 1.0 è completo, ma prima di usarlo con clienti e dati sanitari reali restano aperte queste questioni (elenco aggiornato in `CLAUDE.md`, sezione "Valori da confermare e questioni aperte"):

- regione UE delle funzioni Netlify, oppure valutazione del trasferimento dei dati (NF-04);
- testi dell'informativa privacy, tempi di conservazione e DPA con Supabase, Netlify e Brevo, da verificare con il consulente;
- progetto Supabase di produzione allineato alle migrazioni, dominio e DNS per l'email, provider Phone e registrazioni pubbliche disattivate;
- checklist su iPhone e Android reali (`docs/checklist-dispositivi.md`);
- valori `DA CONFERMARE` (limiti delle circonferenze, obiettivi predefiniti e limiti degli obiettivi personali).

[Non rilasciato]: https://github.com/mgondolini/bionutriapp/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/mgondolini/bionutriapp/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/mgondolini/bionutriapp/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/mgondolini/bionutriapp/releases/tag/v1.0.0

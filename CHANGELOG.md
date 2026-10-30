# Changelog

Tutte le modifiche rilevanti del progetto sono elencate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/). I codici tra parentesi (A-04, C-09, N-06…) rimandano ai requisiti in `docs/requisiti.md`.

## [Non rilasciato]

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

[Non rilasciato]: https://github.com/mgondolini/bionutriapp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mgondolini/bionutriapp/releases/tag/v1.0.0

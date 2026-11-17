# App per nutrizionisti – Documento dei requisiti

Oct 12, 2026 · @Monica · aggiornato il 17 novembre 2026

## Panoramica e obiettivi

La versione 1.0 è una web app (PWA) con cui un nutrizionista segue i propri clienti: pubblica file personali, organizza il percorso con le sessioni di check, raccoglie misure e foto di avanzamento, tiene le note cliniche e condivide una libreria di video. Nasce per un singolo studio, ma è progettata multi-tenant e white label per essere rivenduta ad altri nutrizionisti.

Obiettivi della 1.0:

- Sostituire l'invio manuale di diete e documenti con un'area riservata per ogni cliente.
- Organizzare il percorso del cliente (onboarding e check periodici) con date, videochiamata e promemoria.
- Raccogliere in un unico posto le misure dei clienti (peso, circonferenze, passi, sonno, acqua, allenamenti) e le foto di avanzamento, e mostrarne l'andamento.
- Mantenere costi di esercizio prossimi allo zero, con circa 80–100 clienti attivi.
- Usare uno stack moderno (Next.js, TypeScript) utile anche come progetto di portfolio.

Nome del prodotto: da definire (nei mockup "Nutrify"). Per la 1.0 l'app usa il nome e il logo dello studio del cliente.

## Utenti e ruoli

Nella 1.0 esistono due ruoli: il nutrizionista (admin) e il cliente. Il ruolo di collaboratore arriva con la 3.0.

| Ruolo | Descrizione | Disponibile da |
| --- | --- | --- |
| Titolare (admin) | Nutrizionista che gestisce lo studio: clienti, percorsi, file, tracking, foto, note cliniche, video, impostazioni | v1.0 |
| Cliente | Paziente dello studio: consulta i propri file, il percorso e i video, registra le proprie misure e carica le foto | v1.0 |
| Collaboratore | Nutrizionista dello stesso studio che opera solo sui clienti assegnati e vede tutti gli altri in lettura | v3.0 |
| Super admin (sviluppatrice) | Area dedicata per vedere, creare e modificare tutti gli studi con nome, logo e colore; non accede ai dati sanitari dei clienti | v1.2 (nella 1.0 opera direttamente sul database) |

## Roadmap

Il rilascio è diviso in tre versioni: la 1.0 copre clienti, percorso, file, tracking, foto, note e video; la 2.0 aggiunge il calendario; la 3.0 i collaboratori. Il database è progettato fin da subito per tutte e tre, così le versioni successive non richiedono di ristrutturarlo.

| Versione | Contenuto | Prerequisiti |
| --- | --- | --- |
| 1.0 | Gestione clienti, inviti via WhatsApp, fasi del percorso con onboarding e preparazione della chiamata, percorso con sessioni di check e link Meet, pubblicazione file (diete, allenamenti, report), tracking misure con check delle misure, foto di avanzamento, note cliniche, libreria video, notifiche push, PWA, branding dello studio impostato nel database | — |
| 1.2 | Area piattaforma per la sviluppatrice: elenco, creazione e modifica degli studi con nome, logo e colore | 1.0 in produzione |
| 2.0 | Calendario appuntamenti del nutrizionista, con slot di disponibilità importati da Google Calendar tramite link iCal; creazione automatica degli eventi con il link Meet | 1.0 in produzione |
| 3.0 | Più professionisti per studio, assegnazione dei clienti, permessi differenziati, calendario per professionista | 2.0 |
| Backlog | Notifiche email, vendita ad altri studi, abbonamenti, misure personalizzabili da interfaccia | Da pianificare |

## Requisiti v1.0 – area admin

L'area admin è desktop-first, con un menu laterale (Clienti, Video, Impostazioni studio) e una scheda cliente con sei schede: Profilo, Percorso, Note cliniche, File, Tracking, Foto. Tutte le pagine sono utilizzabili anche da smartphone.

**Elenco clienti**

- **A-01** Tabella clienti con nome e iniziali, cellulare, stato account, fase del percorso (con lo stato della preparazione per i clienti in Onboarding), ultimo file pubblicato, data dell'ultima misura e azioni: "Invia invito su WhatsApp" per i clienti non attivi e "Dettaglio" per tutti.
- **A-02** Filtri rapidi con il numero accanto (Tutti, In percorso, Onboarding, Invito scaduto), più i filtri per stato account e fase del percorso; elenco paginato a 20 clienti.
- **A-03** Ricerca per nome, email o telefono.
- **A-04** Creazione di un cliente con un unico modulo (nome e cognome obbligatori, cellulare, email e data di nascita facoltative) e la scelta della fase di partenza: In percorso (predefinita) oppure Onboarding. Dopo la creazione si può inviare subito l'invito su WhatsApp.
- **A-05** Import iniziale da CSV, con pulizia dei dati (email in minuscolo, duplicati rimossi, telefoni normalizzati), scarto delle righe non valide con il motivo e scelta della fase di partenza (In percorso o Onboarding) per tutte le righe; massimo 1.000 righe e 1 MB.

**Scheda cliente – Profilo**

- **A-06** Visualizzazione e modifica dei dati anagrafici (compresa l'altezza), stato account, fase del percorso, data di attivazione e stato delle notifiche.
- **A-07** Pulsante "Invia invito su WhatsApp" o "Reinvia invito", con data dell'ultimo invio e scadenza; pulsante "Onboarding completato" per i clienti in Onboarding (segna anche come completata la sessione di onboarding del percorso); cambio manuale della fase (In pausa, Concluso, ripresa del percorso) con lo storico dei cambi.

**Scheda cliente – Percorso**: vedi la sezione "Percorso del cliente".

**Scheda cliente – Note cliniche**: vedi la sezione "Note cliniche".

**Scheda cliente – File**

- **A-08** Caricamento di un PDF con drag and drop, categoria (Dieta, Allenamento, Report), titolo, data di validità e nota facoltativa per il cliente. Non c'è un limite di dimensione dell'app: vale quello del progetto Supabase (50 MB sul piano gratuito).
- **A-09** Opzione "Avvisa il cliente" che invia una notifica push alla pubblicazione.
- **A-10** Elenco dei file filtrabile per categoria, con data di caricamento, badge "In corso" e stato di lettura ("Letto il…" / "Non ancora letto").
- **A-11** Apertura ed eliminazione di un file, con conferma prima dell'eliminazione.

**Scheda cliente – Tracking**

- **A-12** Card per ogni misura con ultimo valore, data, variazione rispetto alla rilevazione precedente, mini-grafico e indicatore di misura in ritardo; accanto a "Peso e circonferenze" l'altezza del cliente e la pillola "Prossimo check" (vedi T-10).
- **A-13** Dettaglio di una misura con grafico dell'andamento e storico; per gli allenamenti, voto medio ed elenco con data, voto e nota.
- **A-15** Il nutrizionista può inserire nuove registrazioni per il cliente (per esempio le circonferenze misurate durante la visita) e modificare o eliminare qualsiasi registrazione, in ogni fase del percorso, con la stessa validazione usata nell'area cliente.
- **A-16** Ogni registrazione indica chi l'ha inserita o modificata per ultimo (cliente o nutrizionista); nello storico, cliente e nutrizionista vedono un'etichetta "Inserita dal nutrizionista" o "Modificata dal nutrizionista".
- **A-17** La scheda Tracking, con card, grafici, storico e form di inserimento, è pienamente utilizzabile anche da smartphone: grafici leggibili su schermi stretti, con valori consultabili toccando i punti.

**Scheda cliente – Foto**: vedi la sezione "Foto di avanzamento".

**Video**: vedi la sezione "Libreria video".

**Impostazioni studio**

- **A-14** Il titolare non modifica il colore dello studio: le impostazioni stilistiche sono gestite solo dalla sviluppatrice (nella 1.0 direttamente nel database o con `pnpm studio:create`, dalla 1.2 dall'area piattaforma).

## Requisiti v1.0 – area cliente

L'area cliente è mobile-first e installabile come PWA. Non c'è un'intestazione globale: la home ha il saluto "Ciao \[Nome\]" con il menu, le altre pagine hanno il pulsante indietro, il titolo e il menu.

- **C-01** Menu con: Diete, Allenamenti, Report, Video, Tracking, Foto, e in fondo Profilo ed Esci. "Video" mostra quanti video sono nuovi, "Foto" quanti set sono da completare.
- **C-02** Home (In percorso), dall'alto: banner delle notifiche (C-03), riga "Il tuo percorso" con il mese e la data del prossimo check, card delle foto quando un set è aperto, ultimo file pubblicato in evidenza (badge "Nuovo" se non letto, titolo, data, nota del nutrizionista, pulsanti "Apri PDF" e "Scarica"), file in corso delle altre categorie, ultimo video con "Tutti i video" e riepilogo "Da registrare" (check-in di oggi, misure in scadenza o in ritardo, allenamenti) con "Vai al tracking".
- **C-03** Banner per attivare le notifiche push, con bordo menta e pulsante "Attiva", mostrato finché non sono attive; su iPhone senza app installata porta alla guida, con le notifiche bloccate spiega come riattivarle.
- **C-04** Pagine Diete, Allenamenti e Report: file in corso in evidenza e archivio dei precedenti.
- **C-05** All'apertura di un file viene registrata la data di prima lettura, visibile al nutrizionista.
- **C-06** Guida all'installazione della PWA, aperta da sola una volta sul telefono e poi dal banner e dal profilo; necessaria per ricevere le push su iPhone. Su iPhone spiega passo passo, anche per chi è meno pratico: in Safari si toccano i tre puntini, poi "Condividi", poi "Visualizza altro" e "Aggiungi alla schermata Home". L'app installata usa il nome completo dello studio.
- **C-07** Profilo con dati personali (nome, cognome, data di nascita, altezza), email, cambio password, notifiche del dispositivo e preferenze (vedi N-09), uscita da questo o da tutti i dispositivi.
- **C-08** Pagina di attivazione aperta dal link WhatsApp: dati precompilati da verificare per i clienti già presenti, modulo da compilare per i nuovi; in entrambi i casi altezza, email, password e due consensi separati (informativa e dati sanitari).
- **C-09** In Onboarding il cliente vede una home di benvenuto con la chiamata di onboarding (data, ora, link Meet, "Aggiungi al calendario"), la preparazione della chiamata (misure e foto di partenza) e i video "anche in Onboarding"; file, tracking e foto di avanzamento si sbloccano quando passa In percorso.

Nota: "Allenamenti" nel menu indica le schede di allenamento caricate dal nutrizionista; il diario degli allenamenti svolti si trova nel Tracking.

## Percorso del cliente

Ogni cliente ha un percorso di 6 mesi o 1 anno, con l'onboarding e i check periodici in videochiamata. Il nutrizionista lo imposta dalla scheda Percorso; le date si calcolano da sole e si possono spostare.

- **PER-01** Il nutrizionista imposta durata (6 mesi o 1 anno) e data di inizio; la data di fine è calcolata. Con 6 mesi: onboarding + 5 check; con 1 anno: onboarding + 11 check, a distanza regolare (circa uno al mese) con l'ultimo sulla data di fine.
- **PER-02** Composizione: onboarding sì o no e check omaggio (nessuno, aggiunto ai check del percorso, oppure incluso al posto del primo check). Il cliente vede l'omaggio come un normale check.
- **PER-03** Un solo percorso attivo per cliente. Alla conclusione si può avviare un'estensione (entro 60 giorni dalla fine, senza onboarding e con l'omaggio aggiunto) o una ripresa (oltre). I percorsi conclusi restano consultabili in sola lettura.
- **PER-04** Ogni sessione ha data calcolata e, se serve, data e ora scelte a mano, stato (Da fare, Completata, Saltata; "Prossima" e "In ritardo" sono calcolati) e una nota visibile solo al nutrizionista. Cambiando durata o data di inizio, le sessioni non toccate si ricalcolano e quelle spostate a mano restano dove sono. Il percorso non si accorcia se tra le sessioni da togliere ce ne sono già completate o saltate, o check con foto di avanzamento.
- **PER-05** Segnare come completata la sessione di onboarding porta il cliente da Onboarding a In percorso (vedi ST-02).
- **PER-06** Ogni check ha il proprio link Google Meet, quello che Google Calendar crea con l'evento, incollato dal nutrizionista nella sessione (solo `https://meet.google.com/xxx-xxxx-xxx`). Dalla 2.0 lo scriverà l'app creando l'evento.
- **PER-07** "Aggiungi al calendario" per ogni sessione, per nutrizionista e cliente: Google Calendar, Outlook sul web o file .ics (Apple e altri calendari). L'onboarding dura un'ora, i check 30 minuti; senza ora l'evento occupa la giornata.
- **PER-08** Il cliente vede il percorso nella pagina "Il tuo percorso" (mese corrente, sessioni, data e ora, link Meet), senza note né composizione.
- **PER-09** Notifiche push del percorso: quando il nutrizionista fissa o cambia data e ora di una sessione, e come promemoria alle 18 della sera prima e alle 8 della mattina stessa (quello del mattino salta se la sessione è prima delle 8).

## Libreria video

Lo studio ha una libreria di video YouTube, uguale per tutti i clienti, organizzata in cartelle.

- **VID-01** Cartelle con un solo livello di sottocartelle, ciascuna con nome e descrizione facoltativa; cartelle, sottocartelle e video si riordinano trascinandoli (anche da tastiera).
- **VID-02** Aggiunta di un video incollando il link di YouTube (watch, youtu.be, shorts; pubblici o "Non in elenco"): il titolo arriva da YouTube e si può modificare. Il cron di manutenzione segnala i video che YouTube non riproduce più.
- **VID-03** Nota per i clienti formattata, con lo stesso editor delle note cliniche (stili del paragrafo, grassetto, corsivo, evidenziatore, elenchi) più i link (solo https, http, mailto; si aprono in una nuova scheda), al massimo 1.000 caratteri visibili.
- **VID-04** Visibilità per fase: In percorso tutta la libreria; in Onboarding solo le cartelle segnate "anche in Onboarding"; In pausa e Concluso solo i video caricati fino all'uscita dal percorso.
- **VID-05** Il cliente vede le cartelle, i video con anteprima della nota su due righe, il filtro "Da guardare", la spunta sui video già aperti e il badge "Nuovo"; il video si riproduce solo al tocco, con la nota sotto ("Nota della Dott.ssa …").
- **VID-06** Il nutrizionista vede chi ha aperto ogni video e può inviare la notifica "Nuovo video disponibile" ai clienti che lo vedono, scegliendolo per i video importanti.

## Note cliniche

Note private del nutrizionista sul cliente: il cliente non le vede mai, nemmeno con l'API diretta.

- **NC-01** Ogni cliente ha un'anamnesi (una sola, creata alla prima apertura con una traccia da completare) e note di visita con titolo e data della visita.
- **NC-02** Editor con stili del paragrafo (testo, titoli), grassetto, corsivo, evidenziatore, elenchi puntati e numerati, annulla e ripeti; barra rapida sulla selezione. L'incolla da Word e da altre app tiene solo la formattazione ammessa.
- **NC-03** Salvataggio manuale con "Salva" o Ctrl/Cmd+S, stato del salvataggio sempre visibile e avviso prima di uscire con modifiche non salvate.
- **NC-04** Se la nota è stata cambiata da un altro dispositivo, al salvataggio compare un avviso con "Ricarica" o "Sovrascrivi comunque".
- **NC-05** Su smartphone l'editor è a tutto schermo con la barra sopra la tastiera. L'anamnesi non si elimina; le note di visita sì, con conferma.

## Foto di avanzamento

Il cliente carica tre foto (fronte, lato destro, dietro) all'onboarding e in alcuni check del percorso; il nutrizionista le confronta nel tempo.

- **FOTO-01** Set di foto all'onboarding (foto di partenza) e nei check multipli di 3 più l'ultimo check del percorso, dove si rifanno le misure (per esempio 3, 6, 9, 11 con un anno; 3 e 5 con sei mesi).
- **FOTO-02** Il set si apre 3 giorni prima del check (quello di partenza subito) e resta aperto finché non viene salvato; un check saltato senza foto non compare.
- **FOTO-03** Per salvare servono tutte e tre le foto. Dopo il salvataggio il set non si modifica né si elimina più, da nessuno.
- **FOTO-04** Foto dalla fotocamera o dalla libreria, in JPG, PNG o HEIC fino a 10 MB. Sul telefono vengono raddrizzate, ridotte a 2000 px sul lato lungo, convertite in JPEG (qualità 0,85) e private dei metadati (GPS, modello del telefono, data) prima di essere caricate; il server rifiuta le foto che contengono ancora metadati.
- **FOTO-05** Una bozza resta salvata se il cliente esce e rientra; una foto si può sostituire finché il set non è salvato.
- **FOTO-06** Il cliente vede le proprie foto in "Le tue foto", con visualizzatore a schermo intero; card in home e badge nel menu finché un set è aperto.
- **FOTO-07** Promemoria push alle 8, uno al giorno, dall'apertura del set fino al salvataggio; il giorno del check sostituisce il promemoria del mattino del percorso.
- **FOTO-08** Il nutrizionista vede, carica, completa e salva i set dalla scheda Foto, in ogni fase, con il numero di set da completare sulla scheda; il segno "Foto" compare anche sulle sessioni del percorso.
- **FOTO-09** Foto in un bucket privato, lette con URL firmati di 5 minuti; esportate con `client:export` ed eliminate con `client:delete`.

## Preparazione della chiamata di onboarding

Prima della chiamata di onboarding il cliente manda le misure e le foto di partenza, così il nutrizionista le ha già durante la chiamata. Nulla è obbligatorio: la chiamata si fa comunque.

- **PREP-01** Pagina "Prepara la chiamata" (solo in Onboarding) con due attività e il loro stato: misure di partenza e foto di partenza, da completare entro il giorno prima della chiamata.
- **PREP-02** Misure di partenza: tutte le misure mensili dello studio (peso e circonferenze), con il suggerimento di dove misurare, salvate insieme come prima rilevazione del Tracking; si possono correggere senza creare doppioni.
- **PREP-03** Foto di partenza: il set della sessione di onboarding (vedi FOTO-01), aperto da subito.
- **PREP-04** La chiamata è la sessione di onboarding del percorso: data, ora e link Meet si gestiscono lì, e il nutrizionista li cambia anche dalla card della preparazione nel Profilo. Senza percorso il cliente legge che il nutrizionista gli dirà quando lo chiama.
- **PREP-05** Promemoria push alle 18, 2 giorni e 1 giorno prima della chiamata, solo se manca qualcosa, con quello che manca; un primo avviso parte quando il cliente attiva le notifiche.
- **PREP-06** Il nutrizionista vede lo stato della preparazione nell'elenco clienti e nel Profilo, e se le notifiche del cliente sono spente.
- **PREP-07** Al passaggio In percorso nulla si sposta: le misure sono già nel Tracking e le foto nella scheda Foto.

## Requisiti v1.2 – area piattaforma (sviluppatrice)

L'area piattaforma è riservata alla sviluppatrice e serve a gestire gli studi e il loro aspetto. È separata dall'area admin degli studi e non mostra dati sanitari dei clienti. Nella 1.0 studi, titolari e branding vengono creati dalla sviluppatrice con lo script `pnpm studio:create` o direttamente nel database.

- **PL-01** Accesso dedicato sotto `/platform`, riservato agli utenti presenti nella tabella `platform_admins`; stessa pagina di login, con autenticazione a due fattori (TOTP di Supabase) obbligatoria.
- **PL-02** Elenco di tutti gli studi con logo, nome, slug, colore principale, numero di professionisti e di clienti, data di creazione e pulsante "Dettaglio".
- **PL-03** Creazione di uno studio: nome, slug (usato in futuro per il sottodominio), email di contatto, logo, colore principale e fuso orario.
- **PL-04** Creazione del titolare dello studio con un link di invito, da inviare via WhatsApp o email.
- **PL-05** Dettaglio e modifica dello studio: sostituzione del logo, scelta del colore con selettore e controllo automatico del contrasto (WCAG AA), modifica di nome e contatti.
- **PL-06** Anteprima dal vivo del branding sulle schermate principali (login, home cliente, area admin) prima di salvare.
- **PL-07** Ogni modifica a uno studio viene registrata con data e autore.
- **PL-08** La sviluppatrice vede solo dati aggregati (conteggi) degli studi, mai anagrafiche, file o misure dei clienti; ogni accesso eccezionale ai dati, per esempio per assistenza, va autorizzato dallo studio.

## Tracking delle misure

Nella 1.0 il tracking comprende 11 misure predefinite: il peso e sei circonferenze mensili, tre abitudini giornaliere a punteggio (passi, sonno, acqua) e il diario degli allenamenti. Le misure sono create automaticamente per ogni studio e salvate come configurazione nel database, così da poterle personalizzare in futuro. L'altezza è un dato anagrafico del profilo, non una misura.

| Misura | Unità | Frequenza | Valori ammessi | Istruzione per il cliente |
| --- | --- | --- | --- | --- |
| Peso | kg | A ogni check | 20–300, decimale | Inseriscilo al check delle misure |
| Circ. Spalle | cm | A ogni check | 10–250, decimale | Inseriscila al check delle misure |
| Circ. Vita | cm | A ogni check | 10–250, decimale | Inseriscila al check delle misure |
| Circ. Ombelicale | cm | A ogni check | 10–250, decimale | Inseriscila al check delle misure |
| Circ. Fianchi | cm | A ogni check | 10–250, decimale | Inseriscila al check delle misure |
| Circ. Gamba dx | cm | A ogni check | 10–150, decimale | Inseriscila al check delle misure |
| Circ. Braccio dx | cm | A ogni check | 10–100, decimale | Inseriscila al check delle misure |
| Passi | voto | Giornaliera | 1–5, intero | Quanto ti sei avvicinato oggi al tuo obiettivo di passi? |
| Sonno | voto | Giornaliera | 1–5, intero | Come hai dormito stanotte rispetto al tuo obiettivo? |
| Acqua | voto | Giornaliera | 1–5, intero | Quanta acqua hai bevuto oggi rispetto al tuo obiettivo? |
| Allenamenti | voto | Per ogni allenamento | 1–10, intero, nota facoltativa | Voto alla qualità/performance dell'allenamento |

**Scala delle abitudini giornaliere**

Il voto di passi, sonno e acqua è ancorato all'obiettivo personale del cliente, così da essere confrontabile nel tempo e non lasciato alla sola sensazione.

| Voto | Significato | Esempio acqua (obiettivo 3 L) |
| --- | --- | --- |
| 5 | Obiettivo raggiunto | 3 L o più |
| 4 | Quasi raggiunto | Circa 2,5 L |
| 3 | A metà | Circa 1,5 L |
| 2 | Poco | Circa 1 L |
| 1 | Quasi niente | Meno di 1 L |

- **T-01** Il cliente vede le misure raggruppate: card "Oggi" (check-in e allenamento), allenamenti della settimana, abitudini con media e confronto, peso e circonferenze con la data del prossimo check; una spunta indica le misure già registrate nel periodo.
- **T-02** Il cliente inserisce un valore con data precompilata a oggi (non futura); per gli allenamenti sceglie il voto con pulsanti 1–10 e può aggiungere una nota.
- **T-03** Il cliente vede grafico e storico di ogni misura e può correggere o eliminare le registrazioni inserite da lui, ma non quelle inserite dal nutrizionista. In pausa e Concluso il tracking è in sola lettura.
- **T-04** Ogni valore viene validato sia nell'interfaccia sia nel database rispetto ai limiti della misura.
- **T-05** Peso e circonferenze sono "In scadenza" da 3 giorni prima del check delle misure (T-10) e "In ritardo" dopo; una misura mai registrata è "Da registrare". Per le abitudini giornaliere il nutrizionista vede quanti giorni sono stati compilati nella settimana.
- **T-06** Check-in giornaliero in una sola schermata: passi, sonno e acqua, un tocco ciascuno sulla scala 1–5 con la descrizione del voto. Si può compilare anche il giorno precedente, e i giorni saltati non vengono penalizzati.
- **T-07** Il nutrizionista imposta gli obiettivi personali di ogni cliente; in mancanza valgono quelli predefiniti dello studio: 10.000 passi, 8 ore di sonno, 3 L di acqua. Le descrizioni dei voti mostrano l'obiettivo del cliente.
- **T-08** Per ogni abitudine vengono mostrati al cliente e al nutrizionista la media della settimana e il confronto con la settimana precedente (per esempio "+0,6 rispetto alla scorsa settimana").
- **T-09** Gli allenamenti restano su scala 1–10, perché valutano la qualità di una singola sessione.
- **T-10** Check delle misure: una sola data per cliente per peso e circonferenze. Con un percorso attivo è il prossimo check del percorso ancora da fare (la data si sposta dalla scheda Percorso); una misura presa da 3 giorni prima vale per quel check. Senza percorso, o dopo l'ultimo check, è l'ultima registrazione + 30 giorni, oppure la data scelta dal nutrizionista con la pillola "Prossimo check". Promemoria push alle 6, 3, 2 e 1 giorno prima e il giorno stesso.

## Autenticazione, inviti e notifiche

I clienti non si registrano da soli: lo studio crea il cliente e il professionista gli invia un link di invito personale tramite WhatsApp. Le email partono solo dopo l'attivazione dell'account, e lo studio non genera né invia mai password. Il cliente accede con il cellulare o con l'email.

**Invio dell'invito tramite WhatsApp**

1. Il professionista crea il cliente o lo importa da CSV.
2. Preme "Invia invito su WhatsApp": l'app genera un link personale (monouso, valido 14 giorni, salvato solo come hash) e apre WhatsApp con un messaggio precompilato verso il numero del cliente, tramite il link click-to-chat `wa.me`. Non servono l'API di WhatsApp Business né costi.
3. Il professionista invia il messaggio dal proprio WhatsApp e l'app registra la data dell'invio.
4. Il cliente apre il link e completa l'attivazione secondo uno dei due percorsi.

**Due percorsi di attivazione**

| Aspetto | Cliente creato In percorso | Cliente creato in Onboarding |
| --- | --- | --- |
| Origine | Import da CSV o creazione con fase In percorso | Creazione o import con fase Onboarding |
| Aprendo il link vede | Dati anagrafici precompilati da verificare | Dati da completare (precompilati se già presenti) |
| Inserisce | Altezza, email, password, consensi ed eventuali correzioni | Dati anagrafici, altezza, email, password e consensi |
| Fase dopo l'attivazione | In percorso | Onboarding |

- **N-01** Il pulsante "Invia invito su WhatsApp" è l'azione principale della riga in tabella per i clienti non ancora attivi, così dopo l'import gli inviti si mandano in sequenza senza aprire ogni scheda. Nella scheda Profilo lo stesso pulsante gestisce reinvio e inviti scaduti, con data dell'ultimo invio e scadenza.
- **N-02** Generare un nuovo invito invalida il precedente. Chi dimentica la password e non può recuperarla via email riceve dal professionista un nuovo link con lo stesso pulsante.
- **N-03** Nessuna email di invito: le email partono solo ad account attivo (recupero password, cambio email).
- **N-04** Notifiche push tramite Web Push (chiavi VAPID), senza servizi a pagamento; su iPhone funzionano solo con la PWA installata.
- **N-05** Messaggi WhatsApp e notifiche non contengono mai dati sanitari. Il titolo della notifica dice di cosa si tratta (per esempio "Nuovo piano alimentare") e non ripete il nome dello studio, che il telefono mostra già.
- **N-06** Tutte le notifiche passano da un unico servizio applicativo, con un registro degli invii (anche di quelli saltati e del motivo) che impedisce i doppi invii, per poter aggiungere l'email in futuro senza modificare il resto.
- **N-07** Le email di autenticazione usano un SMTP dedicato gratuito (Brevo) invece del servizio integrato di Supabase, con il nome dello studio nei testi.
- **N-08** Le notifiche email per i nuovi file sono escluse dalla 1.0: il nutrizionista usa lo stato di lettura per sollecitare i clienti.
- **N-09** Notifiche push della 1.0, solo ai clienti con account attivo, nella fase indicata e con la preferenza accesa; le preferenze valgono per tutti i dispositivi del cliente.

| Notifica | Quando | Fase | Preferenza del cliente |
| --- | --- | --- | --- |
| Nuovo file | Alla pubblicazione con "Avvisa il cliente" | In percorso | Nuovi file |
| Promemoria serale | Alle 20, se mancano le abitudini di oggi | In percorso | Promemoria serale |
| Check delle misure | Alle 6, da 3 giorni prima al giorno del check | In percorso | Check delle misure |
| Nuovo video | Quando lo studio lo segnala | In percorso; Onboarding se la cartella è visibile | Nuovi video |
| Sessione fissata o spostata | Al salvataggio del nutrizionista | Con un percorso attivo | Sempre |
| Promemoria della sessione | Alle 18 della sera prima e alle 8 del giorno stesso | Con un percorso attivo | Sempre |
| Foto di avanzamento | Alle 8, ogni giorno dall'apertura al salvataggio del set | In percorso | Sempre |
| Preparazione della chiamata | Alle 18, 2 e 1 giorno prima, se manca qualcosa | Onboarding | Sempre |

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
| Onboarding | Nuovo cliente in attesa della chiamata di onboarding | Scelta alla creazione o all'import; confermata all'attivazione |
| In percorso | Cliente seguito attivamente | Scelta alla creazione o all'import; oppure pulsante "Onboarding completato" o sessione di onboarding segnata come completata nel Percorso |
| In pausa | Percorso sospeso temporaneamente | Manuale |
| Concluso | Percorso terminato, dati consultabili in sola lettura; conclude anche il percorso attivo | Manuale |

- **ST-01** Stato dell'account e fase del percorso cambiano in modo indipendente: per esempio un cliente In percorso può avere l'account Disattivato.
- **ST-02** v1.0: il passaggio da Onboarding a In percorso avviene con il pulsante "Onboarding completato" nel Profilo oppure segnando come completata la sessione di onboarding nella scheda Percorso; le due strade sono allineate (una aggiorna anche l'altra).
- **ST-03** v2.0: quando un appuntamento di tipo Onboarding viene segnato come completato nel calendario, il cliente passa automaticamente In percorso; il pulsante manuale resta disponibile per le chiamate fatte fuori calendario.
- **ST-04** Ogni cambio di fase viene registrato con data e autore (manuale o automatico), così il nutrizionista vede lo storico del percorso nella scheda del cliente.

## Requisiti non funzionali

Le diete, le misure, le foto e le note cliniche sono dati relativi alla salute (art. 9 GDPR): sicurezza e riservatezza hanno priorità su ogni altra scelta.

**Sicurezza e privacy**

- **NF-01** Row Level Security attiva su tutte le tabelle: ogni studio vede solo i propri dati, ogni cliente solo i propri; le note cliniche non sono mai visibili al cliente.
- **NF-02** File e foto in bucket privati, accessibili solo con URL firmati a scadenza breve.
- **NF-03** Chiave segreta di Supabase (ex service role) usata solo lato server, mai esposta al browser.
- **NF-04** Dati in UE (Supabase region Francoforte). Da risolvere prima del rilascio: le funzioni di Netlify girano per default negli Stati Uniti (vedi questioni aperte).
- **NF-05** Validazione di ogni input con Zod lato server; i testi formattati (note cliniche, note dei video) vengono ricostruiti dal server con i soli elementi ammessi e mostrati senza HTML grezzo.
- **NF-06** Lo studio è titolare del trattamento; lo sviluppatore, se gestisce la piattaforma, è responsabile del trattamento. Servono informativa, consenso (registrato all'attivazione con la versione dell'informativa), DPA con i fornitori e procedure di backup, esportazione e cancellazione dei dati (`client:export`, `client:delete`, `storage:backup`).

**Design e accessibilità**

- **NF-07** Design system v2: font Plus Jakarta Sans; sfondo "Perla" #F8F7F4 (area cliente e area admin, tranne il menu laterale bianco), superfici #FFFFFF, testo "Profondo" #1F3A34, bordi card #E6E3DD; primario dello studio (predefinito #1F7A5C) con le sue varianti menta e tinta; pesca solo per "richiede attenzione", azzurro e giallo per allenamenti e report, verde acqua per le abitudini, lilla per foto e video. Card con angoli di 20 px; nessun rosso nella palette.
- **NF-08** Area admin desktop-first ma completamente utilizzabile da smartphone, inclusi tracking, grafici, note cliniche e foto; area cliente mobile-first.
- **NF-09** Contrasto testo almeno WCAG AA (verificato anche con colori dello studio molto chiari o scuri), touch target di almeno 44 px, componenti navigabili da tastiera.
- **NF-10** Interfaccia interamente in italiano.

**Prestazioni e operatività**

- **NF-11** Dimensionamento per circa 100 clienti attivi per studio, con costi nei piani gratuiti.
- **NF-12** Deploy automatico da GitHub a ogni push sul branch principale.

## Architettura, stack e hosting

L'app è un unico progetto Next.js ospitato su Netlify, che usa Supabase come backend per database, login e file.

| Ambito | Scelta | Motivazione |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript | Frontend e backend nello stesso progetto; stack molto richiesto |
| UI | shadcn/ui + Tailwind CSS, icone lucide-react | Fedeltà al design, tema con variabili CSS adatto al white label |
| Editor di testo | Tiptap | Note cliniche e note dei video, salvate come documento strutturato (non HTML) |
| Form e validazione | react-hook-form + Zod | Stesse regole su client e server |
| Backend | Supabase (Postgres, Auth, Storage, RLS, pg_cron) | Backend gestito, piano gratuito, region UE |
| Notifiche | Web Push con libreria web-push | Nessun costo né servizio esterno |
| Hosting app | Netlify (piano gratuito, uso commerciale ammesso; badge "Powered by Netlify" da disattivare nelle impostazioni del progetto) | Alternative: DigitalOcean App Platform (\~5 $/mese) o Hetzner + Coolify (\~4–5 €/mese) |
| Gestione codice | GitHub, deploy automatico, GitHub Action di manutenzione giornaliera | — |

Organizzazione del codice a livelli: `src/app` (solo pagine e route, gruppi `(admin)` e `(cliente)`), `src/server/actions` (Server Actions: autorizzazione e validazione), `src/server/services` (logica di business), `src/server/repositories` (unico accesso a Supabase), `src/server/validation` (schemi Zod), `src/components`, `src/features`, `src/lib`, `src/types`. Il proxy di Next.js (ex middleware) indirizza ogni utente all'area del proprio ruolo.

White label: nome, logo e colore dello studio sono letti dal database; manifest, icone e schermata di avvio della PWA sono generati con nome completo e logo dello studio. In futuro ogni studio sarà riconosciuto dal sottodominio o da un dominio personalizzato.

## Linee guida di sviluppo

Queste regole tengono il codice ordinato e facile da modificare man mano che l'app cresce, e sono riportate anche in `CLAUDE.md` perché le seguano gli agenti di sviluppo.

**Organizzazione del frontend**

- **DEV-01** Un'unica app Next.js con due interfacce separate: gruppo di route `(admin)` sotto `/admin` (desktop-first, sidebar) e `(cliente)` sotto `/app` (mobile-first, menu a tendina), ciascuno con il proprio layout; il gruppo `(platform)` sotto `/platform` ospiterà dalla v1.2 l'area della sviluppatrice. Nessuna pagina mostra contenuti diversi in base al ruolo.
- **DEV-02** Componenti in tre livelli: `components/ui` (shadcn), `components/shared` (usati da entrambe le aree, es. FileCard, MetricChart, StatusBadge, editor di testo, foto) e `features/admin` o `features/cliente` (specifici di un'area). Un componente passa in `shared` solo quando serve davvero a entrambe.
- **DEV-03** Controllo degli accessi su tre livelli: proxy, verifica del ruolo nel layout di ogni area e Row Level Security nel database.
- **DEV-04** Il manifest della PWA ha `/app` come pagina iniziale, così l'app installata apre l'area cliente.

**Dati e logica**

- **DEV-05** I componenti non accedono mai direttamente a Supabase: le pagine leggono i dati tramite i service, le modifiche passano dalle Server Actions. I Route Handler (`app/api`) si usano solo per chiamate esterne come webhook e cron.
- **DEV-06** Un file per dominio in ogni livello (files, tracking, clients, invites, journeys, videos, photos, client-notes…), mai un unico file con tutte le chiamate.
- **DEV-07** Le Server Actions restituiscono sempre lo stesso formato: `{ ok: true, data }` oppure `{ ok: false, error }`.
- **DEV-08** Costanti di dominio (categorie file, stati account, fasi del percorso, etichette) in un unico file, con i tipi ricavati da lì; nessun valore "magico" nei componenti.
- **DEV-09** Tipi TypeScript del database generati con `supabase gen types`; schemi Zod condivisi tra form e Server Actions.
- **DEV-10** Calcoli di dominio (media settimanale, misure in scadenza, date del percorso, promemoria, slot liberi) scritti come funzioni pure, senza dipendenze da React o Supabase.

**Componenti**

- **DEV-11** I componenti di presentazione ricevono i dati come props e non li recuperano da soli.
- **DEV-12** Props piccole e intenzionali (es. `status="invited"` invece di colori e testi passati dall'esterno); varianti con `cva` invece di componenti duplicati; composizione di pezzi piccoli invece di molte props booleane.
- **DEV-13** Ogni sezione prevede stati vuoti, di caricamento e di errore (`EmptyState`, `loading.tsx`, `error.tsx`).
- **DEV-14** Testi dell'interfaccia raccolti in un unico punto (`src/lib/copy/it.ts`), per correggerli facilmente e tradurli in futuro.

**Convenzioni e qualità**

- **DEV-15** File in kebab-case, componenti in PascalCase, suffissi `.service.ts`, `.actions.ts`, `.repository.ts`, `.schema.ts`.
- **DEV-16** TypeScript strict, ESLint e Prettier, con controllo a ogni commit tramite Husky e lint-staged.
- **DEV-17** GitHub Action che a ogni push esegue lint, typecheck e build.
- **DEV-18** Test unitari con Vitest sulle funzioni pure e sui service, test del database con pgTAP e test end-to-end con Playwright sui flussi critici (attivazione dal link, caricamento di un file, check-in, percorso, foto, note cliniche, video, preparazione della chiamata, accessibilità).
- **DEV-19** Ogni modifica al database passa da una migrazione versionata in `supabase/migrations`, mai da modifiche manuali in produzione.
- **DEV-20** Le astrazioni si introducono quando un elemento serve la seconda o terza volta, non in anticipo; ogni decisione di architettura viene annotata in `CLAUDE.md`.

## Modello dati

Il cliente è un'entità dello studio separata dall'account di login: esiste dall'import, e si collega a un utente solo quando attiva l'account.

| Tabella | Contenuto | Versione |
| --- | --- | --- |
| `studios` | Studio (tenant): nome, slug, logo, colore principale, fuso orario; nella 1.0 impostato da database, dalla 1.2 modificabile solo dall'area piattaforma | v1.0 |
| `studio_members` | Professionisti dello studio con ruolo (titolare; collaboratore dalla 3.0), titolo, nome e cognome | v1.0 |
| `clients` | Clienti: anagrafica, altezza, cellulare, email, origine, stato account, fase del percorso, data scelta per il check delle misure, collegamento all'utente | v1.0 |
| `client_stage_events` | Storico dei cambi di fase: cliente, fase precedente e nuova, data, autore o origine automatica | v1.0 |
| `client_invites` | Link di invito monouso (solo hash), data di invio via WhatsApp, scadenza, data di utilizzo | v1.0 |
| `privacy_consents` | Consensi dati all'attivazione: tipo, versione dell'informativa, data | v1.0 |
| `client_files` | File dei clienti: categoria, titolo, percorso, validità, nota, data di lettura | v1.0 |
| `metrics` | Misure configurabili per studio: unità, tipo, frequenza, limiti, icona, obiettivo predefinito | v1.0 |
| `client_metric_goals` | Obiettivi personali del cliente per le abitudini giornaliere | v1.0 |
| `tracking_entries` | Registrazioni: cliente, misura, valore, data, nota, autore dell'inserimento e dell'ultima modifica | v1.0 |
| `client_journeys` | Percorsi: durata, inizio e fine, tipo (primo, estensione, ripresa), onboarding, omaggio, stato | v1.0 |
| `journey_sessions` | Sessioni del percorso: tipo, data calcolata e data scelta, ora, stato, nota, link Meet | v1.0 |
| `journey_notifications` | Registro delle push del percorso, delle foto e della preparazione | v1.0 |
| `client_notes` | Note cliniche: anamnesi e visite, titolo, data, documento formattato e testo semplice | v1.0 |
| `photo_sets`, `photos` | Set di foto di avanzamento legati alla sessione del percorso, una foto per vista, autore, data di salvataggio | v1.0 |
| `video_folders`, `videos`, `video_views` | Libreria video: cartelle e sottocartelle con ordine e visibilità in Onboarding, video YouTube con nota formattata, prime aperture dei clienti | v1.0 |
| `push_subscriptions` | Sottoscrizioni Web Push per utente, con fallimenti consecutivi | v1.0 |
| `notification_log`, `notification_preferences` | Registro delle notifiche (file, promemoria, check delle misure, video) e preferenze del cliente | v1.0 |
| `platform_admins` | Utenti con accesso all'area piattaforma (sviluppatrice) | v1.2 |
| `studio_audit_log` | Registro delle modifiche agli studi: campo, valore precedente e nuovo, autore, data | v1.2 |
| `appointments` | Appuntamenti: professionista, cliente, orari, tipo (incluso onboarding), stato, note | v2.0 |
| `availability_rules` | Orario di lavoro settimanale per professionista: giorno, inizio, fine, durata degli slot | v2.0 |
| `availability_overrides` | Eccezioni manuali: slot chiusi o aperti con data e ora | v2.0 |
| `calendar_connections` | Link iCal cifrato, stato e data dell'ultima sincronizzazione | v2.0 |
| `calendar_busy_blocks` | Intervalli occupati importati (solo inizio e fine) | v2.0 |
| `clients.assigned_to` | Professionista assegnato al cliente | v3.0 |

Storage: bucket privato `client-files` (percorso `studio_id/client_id/uuid.pdf`, solo PDF, limite del progetto Supabase), bucket privato `client-photos` (solo JPEG fino a 10 MB) e bucket pubblico `studio-assets` per i loghi. Lo schema della 1.0 è in `supabase/migrations` (una migrazione per ogni modifica, dalla `20261011000000_schema_iniziale.sql`); le tabelle della 2.0 e della 3.0 sono in `supabase/future` e si spostano tra le migrazioni al rilascio. Le tabelle per la disponibilità e il collegamento iCal sono ancora da scrivere.

## Requisiti v2.0 – calendario appuntamenti

La 2.0 aggiunge un calendario degli appuntamenti per il nutrizionista. Con un solo professionista, il calendario è unico per lo studio.

- **CAL-01** Vista settimanale e giornaliera del calendario, con passaggio rapido alla giornata di oggi.
- **CAL-02** Creazione, modifica e annullamento di un appuntamento: cliente (facoltativo per impegni personali), titolo, tipo (onboarding, prima visita, controllo, online, altro), inizio, fine e note.
- **CAL-03** Stati dell'appuntamento: programmato, completato, annullato, non presentato.
- **CAL-04** Il sistema impedisce appuntamenti sovrapposti; quelli annullati non contano.
- **CAL-05** Dalla scheda cliente si vedono i suoi appuntamenti passati e futuri e se ne può fissare uno nuovo.
- **CAL-06** Dalla dashboard si vedono gli appuntamenti del giorno.
- **CAL-14** Segnare come completato un appuntamento di tipo Onboarding sposta automaticamente il cliente dalla fase Onboarding a In percorso (vedi ST-03).
- **CAL-15** Le sessioni del percorso diventano appuntamenti: l'app crea l'evento su Google Calendar con il link Meet e lo scrive nella sessione (oggi il link si incolla a mano, PER-06).

**Disponibilità da Google Calendar (iCal)**

Gli slot liberi vengono proposti automaticamente leggendo il calendario Google del nutrizionista tramite il suo indirizzo iCal segreto; il nutrizionista poi li ritocca a mano. Il collegamento è in sola lettura e non richiede autenticazione OAuth con Google.

- **CAL-07** Il nutrizionista imposta l'orario di lavoro settimanale (fasce per giorno) e la durata standard delle visite.
- **CAL-08** Il nutrizionista incolla nelle impostazioni l'indirizzo iCal segreto del proprio Google Calendar; il link è salvato cifrato e usato solo lato server.
- **CAL-09** Un'attività programmata (cron, circa ogni 15 minuti) legge il calendario e importa solo inizio e fine degli impegni, mai titoli, descrizioni o partecipanti.
- **CAL-10** Gli slot liberi sono calcolati come orario di lavoro meno impegni importati meno appuntamenti già presenti nell'app, suddivisi per la durata delle visite.
- **CAL-11** Il nutrizionista può chiudere uno slot proposto o aprirne uno extra; queste eccezioni prevalgono sempre sul calcolo automatico e restano valide alle sincronizzazioni successive.
- **CAL-12** Le impostazioni mostrano la data dell'ultima sincronizzazione riuscita e segnalano errori di lettura (per esempio link non più valido).
- **CAL-13** La scrittura degli appuntamenti su Google Calendar (CAL-15) richiede l'integrazione con le API di Google e l'autorizzazione OAuth del nutrizionista.

Da decidere: se gli slot liberi servono solo al nutrizionista per organizzarsi o anche ai clienti per prenotare in autonomia (prenotazione, conferma, cancellazione e preavviso sarebbero una funzionalità a sé).

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
- **COL-06** Percorsi, note cliniche e foto seguono le stesse regole: il collaboratore li modifica solo per i clienti assegnati.

## Backlog e fuori scope

Questi elementi sono stati discussi ma non sono pianificati in nessuna delle tre versioni.

- Notifiche email per nuovi file e promemoria delle misure (Brevo o Resend, template con branding dello studio, preferenze del cliente, registro degli invii).
- Login con OTP via SMS (richiede un provider a pagamento come Twilio).
- Vendita ad altri studi: onboarding self-service, sottodomini o domini personalizzati, abbonamenti con Stripe.
- Interfaccia per personalizzare le misure di tracking per studio (il database lo supporta già).
- Pulsante "Ricorda al cliente" nella preparazione della chiamata (oggi bastano i promemoria automatici).
- App nativa per iOS e Android.

## Costi, rischi e questioni aperte

Il costo ricorrente della 1.0 è di circa 10–15 € l'anno, cioè il solo dominio; tutti i servizi restano nei piani gratuiti, salvo la scelta sulla regione delle funzioni Netlify. I prezzi indicati sono approssimativi e vanno verificati al momento dell'attivazione.

| Voce | Costo stimato | Quando cambia |
| --- | --- | --- |
| Hosting Netlify | 0 € | Piano Pro se serve la regione UE per le funzioni; traffico molto superiore o esigenze di team |
| Supabase | 0 € | Pro (\~25 $/mese) per backup giornalieri e nessuna pausa, consigliato con più studi |
| SMTP (Brevo) | 0 € | Oltre i limiti giornalieri del piano gratuito |
| Dominio | \~10–15 €/anno | — |

**Rischi**

- Il piano gratuito di Supabase sospende i progetti inattivi per circa una settimana: mitigazione con il cron di manutenzione giornaliero o passaggio a Pro.
- Le push non arrivano su iPhone senza PWA installata: mitigazione con guida all'installazione e stato di lettura dei file.
- Telefono come identificativo di accesso (numeri riassegnati dagli operatori), senza autenticazione a due fattori per i clienti nella 1.0: rischio accettato.
- Curva di apprendimento di Next.js e React: mitigazione con un prototipo iniziale e tempi di consegna concordati con margine.
- Obblighi GDPR sui dati sanitari: consulenza privacy prima del rilascio e prima di vendere ad altri studi.

**Questioni aperte**

Bloccano il rilascio:

- [ ] Regione delle funzioni Netlify: per default negli Stati Uniti; scegliere tra piano Pro con regione UE, trasferimento con DPA e SCC valutato dal consulente, oppure hosting UE.
- [ ] Informativa privacy (`/privacy`), tempi di conservazione dei dati dopo la fine del percorso e DPA con Supabase, Netlify e Brevo, da far scrivere o verificare al consulente.
- [ ] Account di produzione: progetto Supabase a Francoforte, sito Netlify, dominio con DNS per Brevo, provider Phone di Supabase.
- [ ] Checklist dei dispositivi su iPhone e Android reali.
- [ ] Nome definitivo del prodotto e verifica dei marchi su UIBM ed EUIPO.

Da confermare con il nutrizionista:

- [ ] Limiti minimi e massimi di peso, circonferenze e altezza (oggi peso 20–300 kg, circonferenze 10–250 cm, gamba 10–150, braccio 10–100, altezza 100–230).
- [ ] Limiti degli obiettivi personali (acqua 0,5–6 L, passi 1.000–30.000, sonno 4–12 ore).
- [ ] Elenco completo delle misure.
- [ ] Foto di avanzamento: formati, peso massimo e dimensione dopo la compressione; cosa fare dei check con le foto quando il percorso viene esteso.
- [ ] Orari e giorni dei promemoria (foto, preparazione della chiamata, sessioni) e soglia di 60 giorni per l'estensione del percorso.
- [ ] Notifica dei nuovi file ai clienti In pausa o Concluso (oggi non partono).
- [ ] Foto di partenza per i clienti importati da CSV direttamente In percorso.

Versioni successive:

- [ ] Uso degli slot liberi nella 2.0: solo organizzazione interna o prenotazione da parte dei clienti.
- [ ] Visione dei calendari altrui da parte del titolare nella 3.0.
- [ ] Nuova richiesta del consenso a ogni versione dell'informativa.

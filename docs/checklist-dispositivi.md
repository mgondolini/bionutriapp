# Checklist dei dispositivi: PWA e notifiche push

Prova manuale della fase 8, da ripetere prima di ogni rilascio che tocca service worker, manifest o notifiche. I test automatici simulano il servizio push: solo questa prova verifica la consegna reale.

## Prima di iniziare

- [ ] L'app è raggiungibile in **HTTPS** con un dominio vero (anteprima Netlify o produzione). Service worker e push non funzionano su `http://` da un telefono; `localhost` vale solo sul computer.
- [ ] Le variabili VAPID sono impostate nell'ambiente (vedi `docs/operativita.md`).
- [ ] C'è un account cliente di prova **In percorso**, con le credenziali a portata di mano.
- [ ] Il professionista è collegato da un computer e ha aperto la scheda **File** del cliente di prova.
- [ ] Sui telefoni l'app non è installata e il sito non ha permessi salvati. Se serve, disinstalla l'icona e cancella i dati del sito.

Per ogni passaggio annota l'esito (✅ / ❌), il modello del telefono e la versione del sistema.

## iPhone (iOS 16.4 o successivo, Safari)

### Installazione

- [ ] **1.** Apri il sito in **Safari** e accedi come cliente. La guida "Installa l'app sul telefono" si apre da sola, sulla scheda **iPhone**.
- [ ] **2.** Tocca **Più tardi** e torna alla home. Il banner dice "Installa l'app per ricevere gli avvisi", **non** "Attiva", e non compare nessuna richiesta di permesso.
- [ ] **3.** Ricarica la home: la guida non si riapre da sola. Si riapre con **Come fare** nel banner e dal **Profilo** (sezione "App sul telefono").
- [ ] **4.** Tocca Condividi e scegli **Aggiungi alla schermata Home**. Il nome proposto e l'icona sono quelli dello **studio** (logo o iniziali sul colore dello studio), non "Nutrify".
- [ ] **5.** Apri l'app dall'icona: si apre a tutto schermo, senza la barra di Safari, sulla pagina di **login**. Su iPhone l'app installata non condivide la sessione con Safari.
- [ ] **6.** Accedi: si apre la home (`/app`) e la guida **non** compare.

### Attivazione

- [ ] **7.** Il banner dice "Attiva le notifiche". Il permesso **non** viene chiesto finché non tocchi **Attiva**.
- [ ] **8.** Tocca **Attiva**, poi **Consenti** nella finestra di iOS. Compare "Notifiche attivate." e il banner scompare.
- [ ] **9.** Dal computer, nel Profilo del cliente, le notifiche risultano **attive**.
- [ ] **10.** Nel Profilo dell'app l'interruttore "Avvisi sul telefono" è acceso e il testo dice "Attive su questo dispositivo."

### Ricezione e apertura dal tocco

- [ ] **11.** Chiudi l'app (scorri via dal selettore delle app) e blocca il telefono.
- [ ] **12.** Dal computer carica un PDF con **Avvisa il cliente** spuntato. La pubblicazione termina subito, senza attese.
- [ ] **13.** Entro circa un minuto arriva la notifica sulla schermata di blocco, con:
  - titolo uguale al **nome dello studio**;
  - testo "Hai un nuovo documento nella tua area riservata";
  - **nessun** titolo, categoria o nota del file.
- [ ] **14.** Tocca la notifica: si apre l'app sulla home, con il nuovo file in evidenza e il badge "Nuovo".
- [ ] **15.** Ripeti con l'app aperta in primo piano: la notifica compare comunque e il tocco resta nell'app.
- [ ] **16.** Carica un file **senza** "Avvisa il cliente": non arriva nessuna notifica.

### Disattivazione e uscita

- [ ] **17.** Profilo › spegni l'interruttore. Compare "Notifiche disattivate.". Dal computer le notifiche risultano **non attive** e un nuovo file con avviso non fa arrivare nulla.
- [ ] **18.** Riaccendi l'interruttore: torna attivo **senza** una nuova richiesta di permesso.
- [ ] **19.** Profilo › **Esci**. Riaccedi e verifica che il banner "Attiva le notifiche" sia tornato: l'uscita elimina la sottoscrizione. Un nuovo file con avviso non arriva finché non tocchi di nuovo Attiva.

### Permesso negato

- [ ] **20.** Impostazioni di iOS › Notifiche › app dello studio: disattiva **Consenti notifiche**.
- [ ] **21.** Torna all'app: il banner dice "Notifiche bloccate" e spiega come riattivarle. L'interruttore del profilo è disattivato con lo stesso aiuto.
- [ ] **22.** Riattiva il permesso, torna all'app e tocca **Attiva**: le notifiche ripartono.

### Senza rete

- [ ] **23.** Attiva la modalità aereo e apri l'app dall'icona: compare solo "Sei offline", **senza** nome, file o misure del cliente.
- [ ] **24.** Disattiva la modalità aereo e tocca **Riprova**: la home torna normale.

## Android (Chrome)

### Installazione

- [ ] **1.** Apri il sito in **Chrome** e accedi: la guida si apre da sola. Se Chrome lo consente, mostra il pulsante **Installa**; altrimenti, sulla scheda **Android**, i passaggi dal menu ⋮.
- [ ] **2.** Tocca **Installa** (o menu ⋮ › **Installa app**). Nome e icona sono quelli dello studio; anche l'icona adattiva (maskable) non viene tagliata.
- [ ] **3.** Apri l'app dall'icona: si apre a tutto schermo sulla home (`/app`) e la guida **non** compare. Su Android la sessione di solito resta quella di Chrome.

### Attivazione

- [ ] **4.** Su Android il banner propone **Attiva** anche senza installazione. Prova prima da Chrome, **non** installata.
- [ ] **5.** Tocca **Attiva** e poi **Consenti**: compare "Notifiche attivate." e il banner scompare.
- [ ] **6.** Dal computer le notifiche del cliente risultano attive.

### Ricezione e apertura dal tocco

- [ ] **7.** Chiudi Chrome e l'app, blocca il telefono, poi pubblica un file con avviso dal computer.
- [ ] **8.** La notifica arriva con il nome dello studio, il testo generico e l'icona dello studio. Non contiene dati del file.
- [ ] **9.** Tocca la notifica: si apre `/app`. Se c'era una finestra dell'app già aperta, torna in primo piano senza aprirne un'altra.
- [ ] **10.** Carica un file senza avviso: non arriva nulla.

### Disattivazione, uscita e permesso negato

- [ ] **11.** Profilo › spegni l'interruttore: nessuna notifica ai file successivi. Riaccendilo: funziona di nuovo.
- [ ] **12.** **Esci**, riaccedi: il banner "Attiva le notifiche" è tornato e un nuovo file con avviso non arriva finché non tocchi Attiva.
- [ ] **13.** Blocca le notifiche dalle impostazioni del sito (lucchetto › Autorizzazioni) o dell'app (Info app › Notifiche). Il banner dice "Notifiche bloccate" con le istruzioni.
- [ ] **14.** **Esci da tutti i dispositivi** da un altro dispositivo. Su questo telefono:
  - un nuovo file con avviso **non** arriva;
  - riaprendo l'app viene chiesto di accedere;
  - dopo l'accesso il banner propone di nuovo **Attiva**.

### Senza rete

- [ ] **15.** Modalità aereo, apri l'app: solo "Sei offline", nessun dato. Riprova senza modalità aereo: tutto torna normale.

## Chrome su computer (criterio di accettazione)

- [ ] **1.** Accedi come cliente in Chrome: la guida **non** si apre da sola e il banner propone **Attiva**.
- [ ] **2.** Tocca **Attiva** › Consenti, poi pubblica un file con avviso da un'altra finestra in navigazione in incognito, come professionista.
- [ ] **3.** La notifica di sistema arriva; il clic apre o porta in primo piano `/app`.
- [ ] **4.** DevTools › Application › Service workers: lo scope è `/app`. In Cache storage c'è solo `offline-v1` con `/offline.html`.
- [ ] **5.** DevTools › Network › Offline, poi ricarica `/app`: compare solo la pagina offline.

## Esito

| Dispositivo | Sistema / browser | Data | Esito | Note |
| --- | --- | --- | --- | --- |
| iPhone | | | | |
| Android | | | | |
| Computer | | | | |

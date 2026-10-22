# Operatività

Note operative per configurare e mantenere l'app. Le decisioni di architettura stanno in `CLAUDE.md`.

## Notifiche push (Web Push, VAPID)

Le notifiche push usano lo standard Web Push con chiavi VAPID (N-04), senza servizi a pagamento. Il server firma ogni invio con la chiave privata; il browser accetta solo notifiche firmate con la chiave pubblica usata al momento della sottoscrizione.

### Variabili

| Variabile | Visibilità | Contenuto |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Pubblica (finisce nel browser) | Chiave pubblica, base64url, 87 caratteri |
| `VAPID_PRIVATE_KEY` | **Segreta**, solo server | Chiave privata, base64url, 43 caratteri |
| `VAPID_SUBJECT` | Segreta, solo server | Contatto del mittente: `mailto:indirizzo@dominio` oppure un URL `https://` |

`VAPID_PRIVATE_KEY` non deve mai avere il prefisso `NEXT_PUBLIC_` né finire in un file committato. Se una delle tre manca, l'app funziona ma non invia push: nei log compare `[notifiche] chiavi VAPID mancanti`.

### Generare la coppia di chiavi

```bash
pnpm exec web-push generate-vapid-keys
```

Il comando stampa la chiave pubblica e quella privata. Ogni ambiente ha la propria coppia:

- **Locale**: copiale in `.env.local` (non committato).
- **Produzione**: generane una nuova e inseriscila su Netlify in *Site configuration › Environment variables*, con `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` marcate come segrete. Poi rifai il deploy: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` viene incorporata nel codice del browser durante la build.

### Cambiare le chiavi

Le sottoscrizioni esistenti restano legate alla vecchia chiave pubblica: dopo un cambio i servizi push rifiutano gli invii firmati con la nuova chiave privata. Va fatto solo se la chiave privata è compromessa.

1. Genera la nuova coppia e aggiorna le variabili su Netlify, poi rifai il deploy.
2. Elimina le vecchie sottoscrizioni dal database (SQL editor di Supabase): `delete from public.push_subscriptions;`. Il trigger riporta `push_enabled` a falso per tutti i clienti.
3. Alla prossima apertura dell'app il browser riconosce la chiave diversa, annulla la vecchia sottoscrizione e il banner "Attiva le notifiche" ricompare. I clienti devono toccare di nuovo "Attiva".

### Invio e controlli

- L'invio parte dopo la risposta al professionista (`after()` di Next.js): su Netlify il runtime di Next.js mantiene attiva la funzione fino alla fine dell'invio. Una push fallita non annulla mai la pubblicazione del file.
- Nei log delle funzioni Netlify compaiono solo id del cliente, numero di dispositivi raggiunti e codici di errore (`[notifiche]`, `[push]`), mai titoli o categorie dei file.
- Le sottoscrizioni che il servizio push dichiara scadute (risposta 404 o 410) vengono eliminate automaticamente.
- Il server invia solo ai servizi push noti (`PUSH_SERVICE_HOSTS` in `src/lib/constants/domain.ts`: Google, Apple, Mozilla, Microsoft). Se un browser nuovo usa un altro servizio, la sottoscrizione viene rifiutata finché non si aggiunge l'host all'elenco.

### Prova sui dispositivi

La ricezione reale si verifica a mano: vedi `docs/checklist-dispositivi.md`.

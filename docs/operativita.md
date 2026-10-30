# Operatività

Manuale per mettere in produzione e gestire l'app: deploy, migrazioni, segreti, backup e ripristino, richieste GDPR. È scritto perché una persona che non ha sviluppato l'app possa seguirlo da sola. Le decisioni di architettura stanno in `CLAUDE.md`.

> **Regola generale.** Le chiavi e i file di configurazione con valori reali (`.env.production.local`, `.env.test.local`) restano solo sul computer di chi gestisce l'app, su un disco cifrato. Non si committano, non si inviano per email o chat, non si incollano in ticket.

## Indice

1. [Ambienti](#1-ambienti)
2. [Strumenti necessari](#2-strumenti-necessari)
3. [Prima messa in produzione](#3-prima-messa-in-produzione)
4. [Deploy e migrazioni](#4-deploy-e-migrazioni)
5. [Variabili e segreti](#5-variabili-e-segreti)
6. [Rotazione delle chiavi](#6-rotazione-delle-chiavi)
7. [Email di autenticazione (SMTP)](#7-email-di-autenticazione-smtp)
8. [Attività programmate (cron)](#8-attività-programmate-cron)
9. [Backup e ripristino](#9-backup-e-ripristino)
10. [Richieste GDPR](#10-richieste-gdpr)
11. [Test sul deploy di anteprima](#11-test-sul-deploy-di-anteprima)
12. [Notifiche push (VAPID)](#12-notifiche-push-vapid)
13. [Fornitori e DPA](#13-fornitori-e-dpa)
14. [Problemi frequenti](#14-problemi-frequenti)

---

## 1. Ambienti

| Ambiente | Supabase | App | File delle variabili sul computer |
| --- | --- | --- | --- |
| Locale | `pnpm supabase start` (Docker) | `pnpm dev` su http://localhost:3000 | `.env.local` |
| Prova | progetto `nutrify-test`, Francoforte | deploy di anteprima Netlify (pull request) | `.env.test.local` |
| Produzione | progetto `nutrify-prod`, Francoforte | sito Netlify, dominio dello studio | `.env.production.local` |

- Il **seed di sviluppo** (`supabase/seed.sql`, utenti con password `password123`) va **solo** in locale e sul progetto di prova. Mai in produzione.
- Il piano gratuito di Supabase consente **2 progetti attivi**: prova e produzione.
- I dati sanitari reali stanno **solo** in produzione. Il progetto di prova contiene solo dati inventati.

## 2. Strumenti necessari

- Node.js 22 e pnpm (la versione è in `package.json`, campo `packageManager`): `corepack enable`.
- Docker, solo per il Supabase locale.
- Accesso con autenticazione a due fattori a GitHub, Supabase, Netlify e Brevo.
- `psql` (client PostgreSQL 15 o successivo) e [`age`](https://github.com/FiloSottile/age), per backup e ripristino.
- Dipendenze del progetto: `pnpm install`.

Login della CLI di Supabase (una volta per computer):

```bash
pnpm supabase login
```

## 3. Prima messa in produzione

Da fare una volta sola, nell'ordine. Ogni passaggio indica dove si fa.

### 3.1 Progetto Supabase (pannello di Supabase)

1. **New project** → nome `nutrify-prod`, regione **Central EU (Frankfurt)** (NF-04), password del database lunga e casuale. Salvala nel gestore di password.
2. *Project Settings › API Keys*: copia l'URL del progetto, la **publishable key** (`sb_publishable_…`) e crea una **secret key** (`sb_secret_…`) chiamata `netlify-prod`.
3. Ripeti con `nutrify-test` per il progetto di prova.

### 3.2 Impostazioni di Auth (pannello di Supabase, per entrambi i progetti)

| Dove | Impostazione | Valore |
| --- | --- | --- |
| *Authentication › Sign In / Providers › User Signups* | Allow new users to sign up | **Disattivato**: gli utenti li crea solo il server |
| *Authentication › Sign In / Providers › Email* | Enable Email provider | Attivo |
| | Confirm email | Disattivato (gli utenti nascono con l'email già confermata) |
| | Secure email change | **Attivo**: conferma da entrambi gli indirizzi |
| *Authentication › Sign In / Providers › Phone* | Enable Phone provider | **Attivo** |
| | Enable phone confirmations | **Disattivato**: nessun SMS viene mai inviato |
| *Authentication › URL Configuration* | Site URL | `https://<dominio>` (prova: l'URL del sito Netlify) |
| | Redirect URLs | `https://<dominio>/**` (prova: `https://*--<nome-sito>.netlify.app/**`) |
| *Authentication › Emails › Templates* | Reset password, Change email address | Vedi [7.3](#73-modelli-delle-email) |
| *Authentication › Emails › SMTP Settings* | SMTP personalizzato | Vedi [7.2](#72-collegare-brevo-a-supabase) |
| *Authentication › Rate Limits* | Email inviate all'ora | 30 è sufficiente (circa 100 clienti) |
| *Authentication › Sign In / Providers* | Minimum password length | 8 |

**Telefono senza SMS.** Secondo la documentazione di Supabase ([Phone Login](https://supabase.com/docs/guides/auth/phone-login)) il provider SMS serve solo per confermare il numero o inviare codici. L'app crea gli utenti dal server con il numero già confermato (`phone_confirm`) e l'accesso usa telefono e password. Se il pannello non salva il provider Phone senza un fornitore SMS:

- scegli Twilio con valori fittizi: Account SID `AC00000000000000000000000000000000`, Message Service SID `MG00000000000000000000000000000000`, token qualsiasi;
- lascia **disattivate** le conferme del telefono.

È la stessa soluzione usata in locale (`supabase/config.toml`): non parte nessun SMS.

**Verifica: le registrazioni autonome sono rifiutate** (criterio di accettazione). Da un terminale, con i valori del progetto:

```bash
curl -s -X POST "https://<ref>.supabase.co/auth/v1/signup" \
  -H "apikey: <publishable key>" -H "Content-Type: application/json" \
  -d '{"email":"prova-intruso@example.com","password":"password123"}'
# atteso: {"code":422,"error_code":"signup_disabled",...}
```

Ripeti il controllo con un telefono al posto dell'email (`"phone":"+393330000000"`): la risposta attesa è la stessa.

### 3.3 Database: migrazioni senza seed (terminale)

```bash
pnpm supabase link --project-ref <ref-di-nutrify-prod>   # chiede la password del database
pnpm supabase db push --dry-run                          # elenco delle migrazioni da applicare
pnpm supabase db push                                    # applica; il seed NON viene applicato
```

Poi, in *Database › Advisors* del pannello, controlla che non ci siano avvisi di sicurezza (RLS disattivata, funzioni esposte).

### 3.4 Netlify (pannello di Netlify)

1. *Add new site › Import an existing project* → GitHub → repository → branch di produzione `main`. La build usa `netlify.toml` (`pnpm build`, Node 22).
2. *Site configuration › Build & deploy › Deploy contexts*: Production branch `main`, Deploy previews **attive** per le pull request.
3. *Site configuration › Environment variables*: inserisci le variabili della [sezione 5](#5-variabili-e-segreti). Usa valori diversi per **Production** e **Deploy Previews**: le anteprime usano il progetto di **prova**.
4. *Domain management › Add a domain*: aggiungi il dominio (es. `app.studio.it`). Dal registrar del dominio crea il record indicato da Netlify (CNAME verso `<nome-sito>.netlify.app`).
5. *Domain management › HTTPS*: attendi il certificato Let's Encrypt, che Netlify crea da solo. Attiva **Force HTTPS**. L'app imposta HSTS (2 anni): dopo il primo accesso in HTTPS i browser non usano più http.
6. **Regione delle funzioni** (*Site configuration › Build & deploy › Functions › Functions region*): vedi la questione aperta in `CLAUDE.md` ("Valori da confermare e questioni aperte"). Il default è negli Stati Uniti.
7. Fai un deploy (*Deploys › Trigger deploy*) e apri `https://<dominio>/login`.

### 3.5 Studio reale e titolare (terminale)

Crea `.env.production.local` con `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `NEXT_PUBLIC_APP_URL` di produzione, poi:

```bash
pnpm studio:create --env .env.production.local \
  --name "Nome dello studio" --slug nome-studio \
  --email titolare@studio.it --first-name Nome --last-name Cognome --title "Dott.ssa" \
  --color "#2E6A4E"
```

Lo script stampa un link valido un'ora con cui il titolare sceglie la password. Invialo al titolare con un canale sicuro. Poi su Netlify imposta `NEXT_PUBLIC_DEFAULT_STUDIO_SLUG` uguale allo slug e rifai il deploy.

Il logo si carica dall'app: *Impostazioni studio*, come titolare.

### 3.6 GitHub (pannello di GitHub)

1. *Settings › Secrets and variables › Actions › New repository secret*: `APP_URL` (es. `https://app.studio.it`, senza `/` finale) e `CRON_SECRET` (stesso valore di Netlify).
2. *Actions › Manutenzione › Run workflow*: il job deve finire in verde. Vedi la [sezione 8](#8-attività-programmate-cron).
3. *Settings › Branches*: proteggi `main` (pull request obbligatoria), così ogni modifica passa da un'anteprima.

### 3.7 Controlli finali prima del rilascio

- [ ] Registrazione autonoma rifiutata (curl della [3.2](#32-impostazioni-di-auth-pannello-di-supabase-per-entrambi-i-progetti)).
- [ ] Email di recupero password ricevuta dal dominio dello studio, in italiano, con il nome dello studio. Verifica anche che non finisca nello spam.
- [ ] `curl -i -X POST https://<dominio>/api/cron/manutenzione` risponde **401**; il workflow con il segreto finisce in verde.
- [ ] Gli header di sicurezza sono presenti: `curl -sI https://<dominio>/login` mostra `content-security-policy`, `strict-transport-security`, `x-frame-options` e gli altri.
- [ ] La checklist `docs/checklist-dispositivi.md` è eseguita su un **iPhone** e un **Android** reali, in produzione.
- [ ] Informativa privacy rivista dal consulente e `PRIVACY_POLICY_VERSION` aggiornata (sezione 10).
- [ ] DPA accettati con i fornitori (sezione 13).
- [ ] Primo backup fatto e prova di ripristino riuscita (sezione 9).

## 4. Deploy e migrazioni

### Deploy dell'app

- Ogni push su `main` fa partire il deploy di produzione su Netlify (NF-12). Ogni pull request crea un **deploy di anteprima** collegato al progetto di prova.
- Prima del merge devono passare `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:test`, `pnpm test:e2e` e `pnpm build`.
- **Tornare indietro:** *Deploys* → scegli il deploy precedente → **Publish deploy**. Il rollback riguarda solo il codice, non il database.

### Migrazioni del database (DEV-19)

Ogni modifica al database è un nuovo file in `supabase/migrations`, mai una modifica di un file esistente né un comando nel SQL editor del pannello.

```bash
pnpm supabase migration new nome_modifica   # crea il file
pnpm supabase db reset && pnpm db:test      # prova in locale
pnpm db:types                               # aggiorna i tipi TypeScript
```

Ordine al rilascio (prima il database, poi il codice):

1. Applica le migrazioni al progetto di **prova**: `pnpm supabase link --project-ref <ref-test>` e `pnpm supabase db push`. Controlla l'anteprima.
2. Fai il merge su `main`, poi applica le migrazioni in **produzione**: `pnpm supabase link --project-ref <ref-prod>`, `pnpm supabase db push --dry-run`, `pnpm supabase db push`.
3. Fai un **backup prima** di ogni migrazione che elimina o trasforma dati (sezione 9).

Le migrazioni devono restare compatibili con la versione precedente del codice per la durata del deploy (circa 2 minuti). Esempi: si aggiunge una colonna con un valore predefinito; non si rinomina una colonna usata dal codice in produzione.

## 5. Variabili e segreti

Si impostano in *Netlify › Site configuration › Environment variables*. Per quelle segrete spunta **Contains secret values**. Dopo ogni modifica serve un nuovo deploy: le variabili `NEXT_PUBLIC_` finiscono nel codice al momento della build.

| Variabile | Segreta | Production | Deploy Previews |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | no | URL di `nutrify-prod` | URL di `nutrify-test` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | publishable key di prod | publishable key di test |
| `SUPABASE_SECRET_KEY` | **sì** | secret key di prod | secret key di test |
| `NEXT_PUBLIC_APP_URL` | no | `https://<dominio>` | *non impostarla*: si usa l'URL dell'anteprima (`DEPLOY_PRIME_URL`) |
| `NEXT_PUBLIC_DEFAULT_STUDIO_SLUG` | no | slug dello studio reale | `studio-verde` (seed) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | no | coppia VAPID di prod | coppia VAPID di test |
| `VAPID_PRIVATE_KEY` | **sì** | coppia VAPID di prod | coppia VAPID di test |
| `VAPID_SUBJECT` | **sì** | `mailto:info@<dominio>` | idem |
| `CRON_SECRET` | **sì** | `openssl rand -hex 32` | un valore diverso |

Regole:

- `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY` e `CRON_SECRET` non hanno **mai** il prefisso `NEXT_PUBLIC_`.
- `.env.example` elenca le variabili senza valori. I file `.env*` reali non si committano: lo impedisce `.gitignore`.
- Segreti fuori da Netlify:
  - GitHub Actions: `APP_URL`, `CRON_SECRET`;
  - Brevo: chiave SMTP, salvata solo nel pannello di Supabase;
  - password del database: solo nel gestore di password.

## 6. Rotazione delle chiavi

Va fatta subito se una chiave è finita in un posto sbagliato (commit, chat, log, computer perso) e comunque **una volta l'anno**. Annota la data in questo file, sezione "Registro".

### Secret key di Supabase (ex service role)

1. *Project Settings › API Keys › Secret keys* → **Create new secret key** (es. `netlify-prod-2027`).
2. Su Netlify aggiorna `SUPABASE_SECRET_KEY` e fai un deploy. Verifica che l'app funzioni: login, apertura di un file, invito.
3. Aggiorna `.env.production.local` sul computer.
4. Nel pannello di Supabase **elimina** la vecchia secret key. Da questo momento la vecchia chiave non funziona più.

Le chiavi legacy (`service_role` JWT) non si usano. Se risultano attive, disattivale da *API Keys › Legacy API keys*.

### Chiavi VAPID (notifiche push)

Vedi [12](#cambiare-le-chiavi). Cambiarle obbliga i clienti a riattivare le notifiche: si fa solo se la chiave privata è compromessa.

### Segreto del cron

1. `openssl rand -hex 32`.
2. Aggiorna `CRON_SECRET` su Netlify e fai il deploy.
3. Subito dopo aggiorna il secret `CRON_SECRET` su GitHub.
4. *Actions › Manutenzione › Run workflow* → deve finire in verde.

Tra il passo 2 e il 3 il workflow risponde 401: non è un problema, perché parte una volta al giorno.

### Chiave SMTP di Brevo

1. In Brevo, *SMTP & API › SMTP*: genera una nuova chiave SMTP.
2. In Supabase, *Authentication › Emails › SMTP Settings*: aggiorna la password e salva.
3. Invia un'email di recupero di prova. Poi elimina la vecchia chiave in Brevo.

### Password del database

*Project Settings › Database › Reset database password*. Aggiorna il gestore di password. L'app non usa la password del database, quindi non serve un deploy.

### Registro

| Data | Chiave | Motivo | Chi |
| --- | --- | --- | --- |
| | | | |

## 7. Email di autenticazione (SMTP)

Le email di Supabase Auth (recupero password, cambio email) partono dall'SMTP di **Brevo** con il dominio dello studio (N-07). Il servizio integrato di Supabase è solo per prove: ha un limite di poche email all'ora e un mittente generico.

### 7.1 Brevo e DNS del dominio

1. Crea l'account Brevo, con autenticazione a due fattori. Il piano gratuito consente 300 email al giorno.
2. *Senders, Domains & Dedicated IPs › Domains › Add a domain*: inserisci il dominio dello studio (es. `studio.it`).
3. Brevo mostra i record DNS da creare dal pannello del registrar (Aruba, Register.it…). Copia i **valori esatti mostrati da Brevo**. Di solito sono:

   | Tipo | Nome | Valore (esempio) | A cosa serve |
   | --- | --- | --- | --- |
   | TXT | `@` | `brevo-code:xxxxxxxx` | dimostra che il dominio è tuo |
   | CNAME | `brevo1._domainkey` | `b1.studio-it.dkim.brevo.com` | **DKIM**: firma delle email |
   | CNAME | `brevo2._domainkey` | `b2.studio-it.dkim.brevo.com` | **DKIM** (seconda chiave) |
   | TXT | `@` | `v=spf1 include:spf.brevo.com mx ~all` | **SPF**: server autorizzati a inviare |
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@studio.it` | **DMARC**: cosa fare con le email non autenticate |

   - **Un solo record SPF per dominio.** Se ne esiste già uno (es. per la posta dello studio), aggiungi `include:spf.brevo.com` dentro quello esistente, prima di `~all`. Non crearne un secondo.
   - Dopo un mese senza problemi passa DMARC da `p=none` a `p=quarantine`.
4. Torna in Brevo e premi **Authenticate this email domain**. La propagazione DNS può richiedere fino a 48 ore.
5. *Senders › Add a sender*: `no-reply@studio.it`, nome = nome dello studio.
6. *SMTP & API › SMTP*: annota server (`smtp-relay.brevo.com`), porta (`587`), login (`xxxx@smtp-brevo.com`) e genera una **chiave SMTP** dedicata a Supabase.

### 7.2 Collegare Brevo a Supabase

*Authentication › Emails › SMTP Settings* → **Enable custom SMTP**:

| Campo | Valore |
| --- | --- |
| Sender email | `no-reply@studio.it` |
| Sender name | nome dello studio |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | login SMTP di Brevo |
| Password | chiave SMTP |
| Minimum interval between emails | 60 secondi |

In locale l'SMTP resta Mailpit (http://127.0.0.1:54324). Per provare Brevo da locale vedi il blocco commentato `[auth.email.smtp]` in `supabase/config.toml`.

### 7.3 Modelli delle email

In *Authentication › Emails › Templates* copia il contenuto dei file del repository:

| Modello | Oggetto | Corpo |
| --- | --- | --- |
| Reset password | `Reimposta la password` | `supabase/templates/recovery.html` |
| Change email address | `Conferma il nuovo indirizzo email` | `supabase/templates/email_change.html` |

- I modelli usano `{{ .Data.studio_name }}`, il nome dello studio salvato nei metadati di ogni utente. Lo tengono aggiornato i trigger della migrazione `20261029100000_nome_studio_email.sql`, anche quando lo studio cambia nome.
- I link puntano a `/nuova-password` e `/conferma-email` con `token_hash`. Il token si verifica solo quando l'utente invia il form, così l'anteprima dei link nei client di posta non lo consuma.
- **Prova:** dal login, *Password dimenticata?* con l'email del titolare. L'email deve arrivare da `no-reply@studio.it`, in italiano, con il nome dello studio. In Gmail apri *Mostra originale*: SPF, DKIM e DMARC devono risultare **PASS**.

## 8. Attività programmate (cron)

Unico Route Handler dell'app (DEV-05): `POST /api/cron/manutenzione`, protetto da `Authorization: Bearer <CRON_SECRET>`. Senza segreto, o con un segreto errato, risponde **401** e non fa nulla. Lo chiama ogni giorno alle 03:17 UTC la GitHub Action `.github/workflows/manutenzione.yml`.

Cosa fa:

1. **Keep-alive:** una query leggera, così il progetto Supabase gratuito non viene messo in pausa dopo 7 giorni di inattività.
2. **Caricamenti mai confermati:** elimina gli oggetti di `client-files` senza riga in `client_files` più vecchi di 24 ore (`list_orphan_client_files`, poi l'API di Storage).
3. **Inviti:** elimina quelli scaduti da oltre 90 giorni, anche se usati o revocati (`purge_expired_invites`).

La risposta e i log contengono solo conteggi e durata (`[manutenzione] completata: oggetti orfani eliminati N, inviti scaduti eliminati N, durata N ms`), mai id, percorsi o dati personali. Un passaggio fallito non ferma gli altri: la risposta è 500 e il workflow fallisce.

**Controlli:**

- GitHub invia un'email se il workflow fallisce. Lo storico è in *Actions › Manutenzione*.
- I log del job si leggono in *Netlify › Logs › Functions*.
- **GitHub sospende i workflow pianificati dopo 60 giorni senza commit** nel repository. Se la manutenzione si ferma, vai in *Actions › Manutenzione › Enable workflow*. Il progetto Supabase verrebbe poi messo in pausa e si riattiva dal pannello (*Restore project*).
- Esecuzione manuale: *Actions › Manutenzione › Run workflow*, oppure:

  ```bash
  curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/manutenzione
  ```

## 9. Backup e ripristino

### Cosa offre il piano gratuito

Il piano gratuito di Supabase **non ha backup scaricabili né ripristino a un momento preciso (PITR)**. Se il database viene cancellato per errore, i dati si recuperano solo dalle copie che facciamo noi. Questa procedura è il minimo indispensabile finché si resta sul piano gratuito.

### Dove NON salvare le copie

Le copie contengono **dati sanitari** (art. 9 GDPR). Non vanno mai:

- negli artifact o nei repository di GitHub, né nei log di CI;
- in Google Drive, Dropbox, iCloud o simili, nemmeno cifrate;
- su chiavette non cifrate, né inviate per email o chat.

Vanno su un **disco cifrato** (FileVault, BitLocker, LUKS) del computer di chi gestisce l'app, più una seconda copia su un disco esterno **cifrato** custodito in un luogo diverso. Ogni archivio è cifrato anche singolarmente con `age`.

### Chiave di cifratura (una volta sola)

```bash
age-keygen -o ~/nutrify-backup.key        # chiave privata: nel gestore di password + copia offline
age-keygen -y ~/nutrify-backup.key        # stampa la chiave pubblica (age1…), usata per cifrare
```

Senza la chiave privata i backup sono illeggibili, anche per noi: conservala in due posti.

### Backup settimanale (ogni lunedì) e prima di ogni migrazione rischiosa

In una cartella su disco cifrato, con il progetto di produzione collegato (`pnpm supabase link --project-ref <ref-prod>`):

```bash
DATA=$(date +%Y-%m-%d); mkdir -p "backup-$DATA" && cd "backup-$DATA"

# 1. Dati del database (schemi public e auth: clienti, file, misure, utenti e password cifrate)
pnpm --dir <percorso-repo> supabase db dump --linked --data-only --use-copy -s public,auth -f "$PWD/data.sql"
# 2. Schema completo, solo come riferimento (il ripristino usa le migrazioni del repository)
pnpm --dir <percorso-repo> supabase db dump --linked -f "$PWD/schema.sql"
# 3. File dello Storage (PDF e loghi)
pnpm --dir <percorso-repo> storage:backup --env <percorso-repo>/.env.production.local --out "$PWD/storage"
# 4. Versione del codice e delle migrazioni
git -C <percorso-repo> rev-parse HEAD > commit.txt

cd .. && tar -czf - "backup-$DATA" | age -r age1<chiave-pubblica> > "nutrify-$DATA.tar.gz.age"
rm -rf "backup-$DATA"     # restano solo gli archivi cifrati
```

**Conservazione:** le ultime 8 copie settimanali più una al mese per 12 mesi. Le copie più vecchie si eliminano. Un dato cancellato su richiesta del cliente (sezione 10) resta nelle copie fino alla loro scadenza: va scritto nell'informativa.

### Ripristino (disastro: progetto cancellato o dati corrotti)

1. Decifra l'archivio: `age -d -i ~/nutrify-backup.key nutrify-AAAA-MM-GG.tar.gz.age | tar -xzf -`.
2. **Nuovo progetto** Supabase a Francoforte. Se il piano gratuito non ha posti liberi, metti in pausa il progetto di prova. Configura Auth come nella [3.2](#32-impostazioni-di-auth-pannello-di-supabase-per-entrambi-i-progetti).
3. Porta il codice al commit del backup (`git checkout $(cat commit.txt)`) e applica lo schema: `pnpm supabase link --project-ref <nuovo-ref>` e `pnpm supabase db push`.
4. Carica i dati con i trigger disattivati (connection string da *Project Settings › Database › Connection string*, modalità **Session**):

   ```bash
   psql "<connection-string>" --single-transaction -v ON_ERROR_STOP=1 \
     -c "SET session_replication_role = replica" -f data.sql
   ```

5. Torna all'ultimo commit (`git checkout main`) e applica le migrazioni successive al backup: `pnpm supabase db push`.
6. File: `pnpm storage:backup --env <env del nuovo progetto> --restore ./storage`.
7. Aggiorna su Netlify URL, publishable key e secret key del nuovo progetto e rifai il deploy. Aggiorna anche il secret `APP_URL` su GitHub, se è cambiato il dominio.
8. Controlla: login del titolare e di un cliente, apertura di un PDF, numero di clienti uguale a quello atteso.

Si perdono i dati inseriti tra l'ultimo backup e il guasto. Con il backup settimanale sono **fino a 7 giorni**. Le sessioni restano valide; le sottoscrizioni push funzionano se le chiavi VAPID non sono cambiate.

### Prova di ripristino (ogni 3 mesi)

Ripeti i passi 1–6 su un progetto temporaneo, oppure in locale:

1. `pnpm supabase db reset --no-seed`.
2. `docker exec -i supabase_db_bionutriapp psql -U postgres -d postgres --single-transaction -v ON_ERROR_STOP=1 -c "SET session_replication_role = replica" -f - < data.sql`.
3. `pnpm storage:backup --restore ./storage`.

Verifica il login e il numero di clienti, poi cancella tutto: `pnpm supabase db reset` e cancellazione della cartella decifrata. Annota la data nel Registro qui sotto.

| Data della prova | Backup usato | Esito | Chi |
| --- | --- | --- | --- |
| 29/10/2026 | dump locale del seed | ✅ dati e accessi ripristinati (prova di sviluppo) | sviluppo |

### Quando passare al piano Pro (~25 $/mese)

- **Subito** se lo studio non accetta di perdere fino a una settimana di dati, oppure se la procedura manuale non viene seguita con regolarità.
- Quando si aggiunge un **secondo studio** (più dati, più responsabilità).
- Se il progetto supera i limiti gratuiti: 500 MB di database o 1 GB di Storage, circa 100 PDF da 10 MB.

Il piano Pro ha backup giornalieri automatici conservati 7 giorni, nessuna pausa per inattività e PITR come opzione a pagamento. Anche con Pro conviene mantenere il backup mensile cifrato, perché i backup di Supabase stanno nello stesso fornitore.

## 10. Richieste GDPR

Lo **studio** è titolare del trattamento: riceve le richieste e risponde entro **30 giorni** (prorogabili di 60 nei casi complessi, spiegando il motivo). Chi gestisce la piattaforma è **responsabile del trattamento** ed esegue le operazioni tecniche su richiesta scritta dello studio. Annota ogni richiesta nel Registro qui sotto, senza dati sanitari.

Prima di tutto verifica l'identità: la richiesta deve arrivare allo studio dal cellulare o dall'email registrati per il cliente.

### Identificare il cliente

Nell'area admin, scheda del cliente: l'id è nell'indirizzo, `/admin/clienti/<id>`. In alternativa usa `--studio <slug> --phone +39…`.

### Accesso e portabilità (artt. 15 e 20)

```bash
pnpm client:export --env .env.production.local --client <id> --out /percorso/cifrato/export-<id>
```

- Produce `dati.json` (anagrafica, account, consensi, storico delle fasi, inviti, file, registrazioni, obiettivi, dispositivi) e la cartella `file/` con i PDF.
- Consegnalo allo studio cifrato (es. archivio `age` o zip AES-256 con la password comunicata per telefono), poi **cancella la cartella**.

### Rettifica (art. 16)

Il cliente modifica da sé nome, cognome e data di nascita (*Profilo*). Lo studio modifica cellulare ed email dalla scheda del cliente. Non servono script.

### Cancellazione (art. 17) e revoca del consenso

1. Verifica con lo studio se esistono obblighi di conservazione (es. documentazione sanitaria o fiscale) che impongono di tenere una parte dei dati. Se il consulente lo indica, esporta prima i dati da conservare.
2. Prova a vuoto, che mostra cosa verrà eliminato:

   ```bash
   pnpm client:delete --env .env.production.local --client <id>
   ```

3. Cancellazione definitiva:

   ```bash
   pnpm client:delete --env .env.production.local --client <id> --confirm <id>
   ```

   Ordine: oggetti dello Storage, sottoscrizioni push, cliente con tutto ciò che è collegato (registrazioni, file, inviti, storico delle fasi, obiettivi, consensi), utente Auth.
4. Conferma allo studio, per iscritto, la data della cancellazione. I dati restano nei backup cifrati fino alla loro scadenza (al massimo 12 mesi, sezione 9) e non vengono ripristinati, salvo un disastro. In quel caso, dopo il ripristino, ripeti le cancellazioni annotate nel Registro.

**Revoca del consenso ai dati sanitari:** senza consenso lo studio non può più seguire il cliente nell'app.

- Come misura immediata, lo studio disattiva l'account dalla scheda (*Disattiva account*).
- Poi segue la cancellazione, salvo diversa indicazione del consulente.

### Limitazione e opposizione (artt. 18 e 21)

Disattiva l'account dalla scheda: il cliente non accede più e i dati restano, senza essere modificati.

### Violazione dei dati (data breach)

Se dei dati personali escono dal controllo dello studio (chiave esposta, accesso non autorizzato, backup perso):

1. Ruota subito le chiavi coinvolte (sezione 6).
2. Avvisa lo studio **entro 24 ore**, con cosa è successo, quali dati, quanti clienti e cosa è stato fatto.
3. Lo studio valuta la notifica al Garante, **entro 72 ore** dalla scoperta, e ai clienti.

Conserva una traccia scritta anche se la notifica non è necessaria.

### Nuova versione dell'informativa

1. Il consulente approva il testo. Aggiorna `copy.privacy` in `src/lib/copy/it.ts` e togli il riquadro "DA FAR VERIFICARE AL CONSULENTE PRIVACY".
2. Cambia `PRIVACY_POLICY_VERSION` in `src/lib/constants/domain.ts`: le nuove attivazioni salvano la nuova versione in `privacy_consents`.
3. Chiedere di nuovo il consenso a chi ha già un account non è previsto nella 1.0: se il consulente lo richiede, va sviluppato.

### Registro delle richieste

| Data | Tipo | Cliente (id) | Chiesta da | Eseguita il | Note |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## 11. Test sul deploy di anteprima

Ogni pull request ha un deploy di anteprima collegato al progetto Supabase di **prova**. Tutta la suite e2e gira anche lì, con lo stesso codice.

**Preparazione del progetto di prova** (una volta, e dopo ogni `db reset` remoto):

```bash
pnpm supabase link --project-ref <ref-test>
pnpm supabase db push --include-seed          # migrazioni + seed di sviluppo (SOLO sul progetto di prova)
```

Crea `.env.test.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `CRON_SECRET` del progetto di prova, più `E2E_SUPABASE_TEST_PROJECT=<ref-test>`.

**Esecuzione** (sostituisci l'URL con quello dell'anteprima mostrato da Netlify nella pull request):

```bash
pnpm seed:files --env .env.test.local
E2E_ENV_FILE=.env.test.local PLAYWRIGHT_BASE_URL=https://deploy-preview-12--<nome-sito>.netlify.app pnpm test:e2e
```

- I test e lo script dei PDF di prova accettano un progetto remoto solo se il suo ref coincide con `E2E_SUPABASE_TEST_PROJECT`. Con le chiavi di produzione si rifiutano di partire.
- Il test "cliente senza email… Mailpit" viene **saltato** fuori dal locale, perché Mailpit esiste solo lì. Sull'anteprima le email partono davvero: prova a mano il recupero password e il cambio email con un indirizzo tuo.
- I test creano clienti con cellulari casuali e li eliminano alla fine. Se un test si interrompe, i residui si eliminano con `client:delete` sul progetto di prova.
- Gli unit test e i test pgTAP (`pnpm test`, `pnpm db:test`) girano in locale e non dipendono dal deploy.

## 12. Notifiche push (VAPID)

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
2. Elimina le vecchie sottoscrizioni con una migrazione dedicata (`delete from public.push_subscriptions;`), applicata con `pnpm supabase db push` (DEV-19). Il trigger riporta `push_enabled` a falso per tutti i clienti.
3. Alla prossima apertura dell'app il browser riconosce la chiave diversa, annulla la vecchia sottoscrizione e il banner "Attiva le notifiche" ricompare. I clienti devono toccare di nuovo "Attiva".

### Invio e controlli

- L'invio parte dopo la risposta al professionista (`after()` di Next.js): su Netlify il runtime di Next.js mantiene attiva la funzione fino alla fine dell'invio. Una push fallita non annulla mai la pubblicazione del file.
- Nei log delle funzioni Netlify compaiono solo id del cliente, numero di dispositivi raggiunti e codici di errore (`[notifiche]`, `[push]`), mai titoli o categorie dei file.
- Le sottoscrizioni che il servizio push dichiara scadute (risposta 404 o 410) vengono eliminate automaticamente.
- Il server invia solo ai servizi push noti (`PUSH_SERVICE_HOSTS` in `src/lib/constants/domain.ts`: Google, Apple, Mozilla, Microsoft). Se un browser nuovo usa un altro servizio, la sottoscrizione viene rifiutata finché non si aggiunge l'host all'elenco.

### Prova sui dispositivi

La ricezione reale si verifica a mano: vedi `docs/checklist-dispositivi.md`.

## 13. Fornitori e DPA

Lo studio, titolare del trattamento, deve avere un accordo di trattamento dei dati (DPA, art. 28 GDPR) con ogni fornitore che tratta dati personali per suo conto, direttamente o tramite chi gestisce la piattaforma.

| Fornitore | Dati trattati | Dove | Come ottenere il DPA | Note |
| --- | --- | --- | --- | --- |
| Supabase | tutti: database, file, utenti | UE (Francoforte) | pannello: *Organization settings › Legal documents* → DPA; [supabase.com/legal/dpa](https://supabase.com/legal/dpa) | sub-responsabili elencati nel DPA |
| Netlify | richieste, IP e log transitano dalle funzioni | **USA** per default | [netlify.com/legal](https://www.netlify.com/legal/) → Data Processing Addendum | trasferimento extra UE: SCC nel DPA; vedi la questione aperta sulla regione |
| Brevo | email, nome dello studio, contenuto delle email di accesso | UE (Francia) | [brevo.com/legal](https://www.brevo.com/legal/) → DPA, incluso nei termini | |
| GitHub | nessun dato dei clienti: codice e risposta del cron con soli conteggi | USA | non necessario per i dati dei clienti | non salvare mai backup o export su GitHub |
| Google, Apple, Mozilla, Microsoft (servizi push) | endpoint del dispositivo e testo generico della notifica | vari | condizioni dei browser | mai dati sanitari nel testo (N-05) |
| Meta (WhatsApp) | numero e link di invito, inviati dal telefono dello studio | vari | a carico dello studio | il messaggio contiene solo nome dello studio e link |
| Registrar del dominio | nessun dato dei clienti | | | |

Conserva una copia firmata o accettata di ogni DPA, con la data, nella cartella dei documenti dello studio.

## 14. Problemi frequenti

| Sintomo | Causa probabile | Cosa fare |
| --- | --- | --- |
| L'app risponde "Project paused" o non carica | progetto Supabase in pausa (cron fermo) | Supabase: *Restore project*; GitHub: riattiva il workflow (sezione 8) |
| Le email di recupero non arrivano | SMTP non configurato, DNS non verificati o spam | *Authentication › Logs* in Supabase; *Transactional › Logs* in Brevo; controlla SPF e DKIM |
| "Link non valido" su ogni recupero | Redirect URL mancanti in Supabase | *Authentication › URL Configuration*: `https://<dominio>/**` |
| Il cron risponde 401 | `CRON_SECRET` diverso tra Netlify e GitHub, o deploy non rifatto | allinea i due valori e rifai il deploy |
| Le push non arrivano | chiavi VAPID mancanti o cambiate | log `[notifiche]`; sezione 12 |
| Errori CSP nella console del browser | nuova risorsa esterna non prevista | aggiorna `src/lib/security/headers.ts` (e il test), non disattivare la CSP |
| Il cliente non riesce ad attivare l'account | link scaduto (14 giorni) o già usato | lo studio invia un nuovo invito dalla scheda |

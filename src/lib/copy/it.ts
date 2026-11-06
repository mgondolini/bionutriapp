/**
 * Testi dell'interfaccia in italiano (DEV-14): nessun testo nei componenti.
 * Le etichette dei valori di dominio sono tipizzate sulle costanti, così un
 * nuovo stato o una nuova fase senza etichetta è un errore di compilazione.
 */
import type {
  AccountStatus,
  CheckinDay,
  AdminNavKey,
  ClientNavKey,
  ClientOrigin,
  ClientTab,
  CsvDiscardReason,
  CsvFileError,
  CsvRowWarning,
  FileCategory,
  FileUploadError,
  HabitKey,
  HabitScore,
  JourneyStage,
  MetricKind,
  StaffRole,
} from "@/lib/constants/domain";
import {
  CIRCUMFERENCE_INTERVAL_DAYS,
  WORKOUT_RECENT_DAYS,
} from "@/lib/constants/domain";
import type { LoginReason } from "@/lib/auth/route-decision";
import type { JourneyAction } from "@/lib/domain/journey";
import type { CircumferenceStatus } from "@/lib/domain/tracking/circumferences";
import type { EntryAuthorBadge } from "@/lib/domain/tracking/labels";

const accountStatus: Record<AccountStatus, string> = {
  to_invite: "Da invitare",
  invited: "Invito inviato",
  invite_expired: "Invito scaduto",
  active: "Attivo",
  disabled: "Disattivato",
};

const journeyStage: Record<JourneyStage, string> = {
  onboarding: "Onboarding",
  in_progress: "In percorso",
  paused: "In pausa",
  completed: "Concluso",
};

const fileCategory: Record<FileCategory, string> = {
  diet: "Dieta",
  workout: "Allenamento",
  report: "Report",
};

const staffRole: Record<StaffRole, string> = {
  owner: "Titolare",
};

const adminNav: Record<AdminNavKey, string> = {
  clients: "Clienti",
  settings: "Impostazioni studio",
};

const clientNav: Record<ClientNavKey, { label: string; description: string }> =
  {
    diets: { label: "Diete", description: "I tuoi piani alimentari" },
    workouts: { label: "Allenamenti", description: "Schede di allenamento" },
    reports: { label: "Report", description: "Report e controlli" },
    tracking: {
      label: "Tracking",
      description: "Misure, check-in, allenamenti",
    },
  };

export const copy = {
  app: {
    fallbackName: "Area riservata",
    description: "Area riservata dello studio di nutrizione",
  },
  domain: { accountStatus, journeyStage, fileCategory, staffRole },
  common: {
    logout: "Esci",
    logoutDescription: "Chiudi la sessione su questo dispositivo",
    loading: "Caricamento…",
    skipToContent: "Vai al contenuto",
    close: "Chiudi",
    retry: "Riprova",
    errorTitle: "Qualcosa è andato storto",
    errorDescription:
      "Non è stato possibile caricare la pagina. Riprova tra qualche istante.",
    genericError: "Si è verificato un errore. Riprova tra qualche istante.",
    invalidInput: "Controlla i dati inseriti.",
    unauthorized: "Non hai i permessi per questa operazione.",
    comingSoon: "Disponibile a breve.",
    logoAlt: (studioName: string) => `Logo di ${studioName}`,
    height: {
      label: "Altezza",
      unit: "cm",
      value: (cm: number) => `${cm} cm`,
      placeholder: "Per esempio 170",
      required: "Inserisci l'altezza.",
      invalid: (min: number, max: number) =>
        `Inserisci l'altezza in centimetri, da ${min} a ${max}.`,
    },
  },
  auth: {
    login: {
      title: "Accedi",
      description: "Entra nella tua area riservata.",
      identifierLabel: "Email o cellulare",
      identifierPlaceholder: "nome@esempio.it o 333 123 4567",
      passwordLabel: "Password",
      submit: "Accedi",
      submitting: "Accesso in corso…",
      forgotPassword: "Password dimenticata?",
      invalidCredentials: "Credenziali non corrette.",
      accountNotEnabled: "Credenziali non corrette.",
      reasons: {
        loggedOut: "Sei uscito dall'app.",
        expired: "La sessione è scaduta, accedi di nuovo.",
        activated: "Account attivato: accedi con le tue credenziali.",
      } satisfies Record<LoginReason, string>,
    },
    recover: {
      title: "Recupera la password",
      description:
        "Inserisci l'email del tuo account: ti invieremo un link per scegliere una nuova password.",
      emailLabel: "Email",
      submit: "Invia il link",
      submitting: "Invio in corso…",
      sent: "Se l'indirizzo è registrato, riceverai un'email con il link per reimpostare la password.",
      backToLogin: "Torna all'accesso",
      noEmailTitle: "Non hai un'email nell'account?",
      noEmail:
        "Chiedi allo studio un nuovo link: te lo invia su WhatsApp e potrai scegliere una nuova password.",
      phoneEntered:
        "Il recupero via email vale solo per chi ha un'email. Chiedi allo studio un nuovo link su WhatsApp.",
    },
    newPassword: {
      title: "Scegli una nuova password",
      description: "La password deve avere almeno 8 caratteri.",
      passwordLabel: "Nuova password",
      confirmLabel: "Ripeti la password",
      submit: "Salva la password",
      submitting: "Salvataggio…",
      invalidLink: "Il link non è valido o è scaduto. Richiedine uno nuovo.",
      missingLink:
        "Apri il link ricevuto via email per scegliere una nuova password.",
      requestNewLink: "Richiedi un nuovo link",
    },
    suspended: {
      title: "Accesso sospeso",
      description: (studioName: string) =>
        `Il tuo accesso è stato sospeso. Per informazioni contatta ${studioName}.`,
    },
    validation: {
      identifierRequired: "Inserisci la tua email o il cellulare.",
      identifierInvalid: "Inserisci un'email valida o un numero di cellulare.",
      emailRequired: "Inserisci la tua email.",
      emailInvalid: "Inserisci un indirizzo email valido.",
      passwordRequired: "Inserisci la password.",
      passwordTooShort: "La password deve avere almeno 8 caratteri.",
      passwordTooLong: "La password può avere al massimo 72 caratteri.",
      passwordMismatch: "Le due password non coincidono.",
    },
  },
  /** Profilo del cliente (C13, C-07) e del professionista, sessione (fase 7). */
  profile: {
    client: {
      title: "Profilo",
      clientOf: (studioName: string, since: string) =>
        `Cliente di ${studioName} dal ${since}`,
      clientOfNoDate: (studioName: string) => `Cliente di ${studioName}`,
    },
    staff: {
      title: "Il tuo profilo",
      description:
        "I tuoi dati e l'accesso. Nome, logo e colore dello studio sono in Impostazioni studio.",
      menuLabel: "Menu utente",
      profileLink: "Profilo",
    },
    personal: {
      title: "Dati personali",
      edit: "Modifica",
      editAria: "Modifica i dati personali",
      cancel: "Annulla",
      save: "Salva",
      saving: "Salvataggio…",
      saved: "Dati salvati.",
      name: "Nome",
      titleLabel: "Titolo",
      titleHint: "Facoltativo, per esempio Dott.ssa. Compare prima del nome.",
      firstName: "Nome",
      lastName: "Cognome",
      birthDate: "Data di nascita",
      height: "Altezza",
      noValue: "—",
      phone: "Cellulare",
      phoneHint: "Per cambiarlo contatta lo studio.",
      displayNamePreview: (name: string) => `Comparirai come: ${name}`,
    },
    email: {
      title: "Email",
      current: "Email attuale",
      none: "Nessuna email",
      clientHint:
        "Con un'email potrai recuperare la password da solo, senza chiedere un nuovo link allo studio.",
      staffHint: "È l'email con cui accedi e recuperi la password.",
      newLabel: "Nuova email",
      addLabel: "La tua email",
      change: "Cambia email",
      add: "Aggiungi email",
      submit: "Invia il link di conferma",
      submitting: "Invio in corso…",
      cancel: "Annulla",
      sentToNew: (email: string) =>
        `Ti abbiamo inviato un link a ${email}: l'indirizzo cambierà quando lo apri.`,
      sentToBoth: (email: string) =>
        `Ti abbiamo inviato un link a ${email} e uno all'indirizzo attuale: l'email cambierà quando li avrai aperti entrambi.`,
      pending: (email: string) => `In attesa di conferma: ${email}`,
      sameAsCurrent: "È già la tua email.",
      unavailable: "Non è possibile usare questo indirizzo email.",
      failed:
        "Non è stato possibile inviare il link. Riprova tra qualche minuto.",
    },
    confirmEmail: {
      title: "Conferma il nuovo indirizzo email",
      description:
        "Premi il pulsante per confermare: solo allora l'email dell'account cambierà.",
      submit: "Conferma",
      submitting: "Conferma in corso…",
      done: "Email confermata: da ora usa il nuovo indirizzo.",
      partial:
        "Conferma ricevuta. Apri anche il link che ti abbiamo inviato all'altro indirizzo per completare il cambio.",
      invalidLink:
        "Il link non è valido o è scaduto. Richiedi di nuovo il cambio dal profilo.",
      missingLink:
        "Apri il link ricevuto via email per confermare il nuovo indirizzo.",
      goToApp: "Vai all'app",
      goToLogin: "Vai all'accesso",
    },
    password: {
      title: "Password",
      description: "Scegli una password che non usi altrove.",
      open: "Cambia password",
      dialogTitle: "Cambia password",
      dialogDescription:
        "Dopo il cambio resterai connesso qui; gli altri dispositivi dovranno accedere di nuovo.",
      currentLabel: "Password attuale",
      newLabel: "Nuova password",
      confirmLabel: "Ripeti la nuova password",
      requirements: "Almeno 8 caratteri.",
      submit: "Salva la password",
      submitting: "Salvataggio…",
      cancel: "Annulla",
      saved:
        "Password aggiornata. Gli altri dispositivi sono stati disconnessi.",
      failed:
        "Non è stato possibile cambiare la password. Controlla la password attuale e riprova.",
    },
    notifications: {
      title: "Notifiche",
      label: "Avvisi sul telefono",
      description: "Ricevi una notifica quando arriva un nuovo file.",
      status: {
        loading: "Controllo in corso…",
        active: "Attive su questo dispositivo.",
        ask: "Non attive su questo dispositivo.",
        "needs-install":
          "Su iPhone funzionano solo con l'app installata nella schermata Home.",
        denied:
          "Bloccate nelle impostazioni del telefono: riattivale da lì (vedi sotto).",
        unsupported: "Questo browser non supporta le notifiche.",
      },
      installLink: "Come installare l'app",
      saved: (enabled: boolean) =>
        enabled ? "Notifiche attivate." : "Notifiche disattivate.",
    },
    install: {
      title: "App sul telefono",
      description:
        "Installala nella schermata Home: si apre come un'app e ricevi gli avvisi.",
      open: "Installa l'app",
      installed: "L'app è installata su questo dispositivo.",
    },
    session: {
      title: "Accesso",
      logout: "Esci",
      logoutHint: "Chiudi la sessione su questo dispositivo.",
      logoutAll: "Esci da tutti i dispositivi",
      logoutAllHint:
        "Chiudi la sessione su ogni telefono e computer, compreso questo.",
      logoutAllTitle: "Uscire da tutti i dispositivi?",
      logoutAllDescription:
        "Dovrai accedere di nuovo su ogni dispositivo, compreso questo.",
      logoutAllConfirm: "Esci da tutti",
      cancel: "Annulla",
    },
    validation: {
      firstNameRequired: "Inserisci il nome.",
      lastNameRequired: "Inserisci il cognome.",
      nameTooLong: "Massimo 80 caratteri.",
      titleTooLong: "Massimo 20 caratteri.",
      birthDateInvalid: "Data di nascita non valida.",
      emailRequired: "Inserisci l'email.",
      emailInvalid: "Inserisci un indirizzo email valido.",
      currentPasswordRequired: "Inserisci la password attuale.",
      confirmRequired: "Ripeti la nuova password.",
      samePassword: "La nuova password deve essere diversa da quella attuale.",
    },
  },
  admin: {
    nav: adminNav,
    navLabel: "Menu principale",
    openMenu: "Apri il menu",
    clients: {
      title: "Clienti",
      description:
        "Gestisci i tuoi clienti, gli inviti, i file condivisi e le misure di tracking.",
      emptyTitle: "Nessun cliente",
      emptyDescription:
        "Crea il primo cliente oppure importa l'elenco da un file CSV.",
      noResultsTitle: "Nessun cliente trovato",
      noResultsDescription: "Prova a cambiare i filtri o la ricerca.",
      resetFilters: "Azzera filtri",
      toolbar: {
        statusLabel: "Stato account",
        stageLabel: "Fase del percorso",
        allStatuses: "Tutti",
        allStages: "Tutte",
        option: (label: string, count: number) => `${label} (${count})`,
        searchLabel: "Cerca",
        searchPlaceholder: "Cerca per nome, email o telefono",
      },
      table: {
        caption: "Elenco dei clienti dello studio",
        client: "Cliente",
        phone: "Cellulare",
        status: "Stato account",
        stage: "Stato percorso",
        lastFile: "Ultimo file",
        lastEntry: "Ultima misura",
        actions: "Azioni",
        noFile: "Nessun file",
        noEntry: "Nessuna misura",
        lastEntryOn: (date: string) => `Registrata il ${date}`,
        footer: (count: number) =>
          `${count} ${count === 1 ? "cliente" : "clienti"}. Le righe evidenziate sono clienti in Onboarding.`,
      },
      actions: {
        newClient: "Nuovo cliente",
        importCsv: "Importa CSV",
        invite: "Invia invito su WhatsApp",
        reinvite: "Reinvia invito",
        detail: "Dettaglio",
        detailFor: (name: string) => `Dettaglio ${name}`,
        inviteFor: (label: string, name: string) => `${label} a ${name}`,
      },
      invite: {
        sending: "Preparazione del link…",
        sent: (name: string) =>
          `Link creato per ${name}: invia il messaggio da WhatsApp.`,
        popupBlocked:
          "Il browser ha bloccato la finestra di WhatsApp: consenti i popup per questo sito e riprova.",
        upscaled: (px: number) =>
          `Il ritaglio è di soli ${px} px: l'icona dell'app potrebbe risultare sfocata. Riduci lo zoom o usa "Adatta con margine".`,
        failed: "Non è stato possibile creare l'invito. Riprova.",
        disabled:
          "Il cliente è disattivato: riattivalo prima di inviare un invito.",
      },
      create: {
        title: "Nuovo cliente",
        description: "Scegli come inserire il cliente.",
        modeLabel: "Modalità",
        modes: {
          new: {
            label: "Nuovo cliente",
            description:
              "Solo nome e cellulare: completerà i dati all'attivazione.",
          },
          full: {
            label: "Con dati completi",
            description:
              "Cliente già seguito: verificherà i dati all'attivazione.",
          },
        },
        firstName: "Nome",
        lastName: "Cognome",
        phone: "Cellulare",
        phonePlaceholder: "333 123 4567",
        email: "Email (facoltativa)",
        birthDate: "Data di nascita (facoltativa)",
        initialState: "Alla creazione",
        initialStateHint:
          'Lo stato diventa "Attivo" quando il cliente usa il link di invito; la fase resta questa.',
        submit: "Crea cliente",
        submitting: "Creazione…",
        cancel: "Annulla",
        created: (name: string) => `Cliente ${name} creato.`,
        duplicatePhone:
          "Esiste già un cliente con questo cellulare nello studio.",
        duplicateEmail: "Esiste già un cliente con questa email nello studio.",
      },
      import: {
        title: "Importa clienti da CSV",
        description:
          "Il file deve avere una riga di intestazione con almeno la colonna del cellulare (es. nome; cognome; cellulare; email).",
        steps: { upload: "File", preview: "Anteprima", confirm: "Conferma" },
        fileLabel: "File CSV",
        chooseFile: "Scegli il file",
        noFile: "Nessun file selezionato",
        limits:
          "Separatore virgola o punto e virgola, massimo 1.000 righe e 1 MB.",
        analyze: "Analizza il file",
        analyzing: "Analisi in corso…",
        back: "Indietro",
        confirm: (count: number) =>
          count === 1 ? "Importa 1 cliente" : `Importa ${count} clienti`,
        importing: "Importazione…",
        summaryValid: (count: number) =>
          count === 1 ? "1 riga valida" : `${count} righe valide`,
        summaryValidLabel: "clienti pronti da importare",
        summaryDiscardedLabel: "righe scartate",
        validTitle: "Clienti da importare",
        validHint: "Entreranno con fase In percorso e stato Da invitare.",
        discardedTitle: "Righe scartate",
        warningsTitle: "Dati corretti",
        columns: {
          line: "Riga",
          client: "Cliente",
          phone: "Cellulare",
          email: "Email",
          reason: "Motivo",
        },
        noValidRows: "Nessuna riga valida da importare.",
        imported: (count: number) =>
          count === 1 ? "1 cliente importato." : `${count} clienti importati.`,
        conflict:
          "Nel frattempo un cliente con lo stesso cellulare o la stessa email è stato aggiunto: analizza di nuovo il file.",
        discardReasons: {
          missing_phone: "Cellulare mancante",
          invalid_phone: "Cellulare non valido",
          missing_name: "Nome mancante",
          duplicate_in_file: "Duplicato nel file",
          already_in_studio: "Cliente già presente nello studio",
        } satisfies Record<CsvDiscardReason, string>,
        duplicateOf: (line: number) => `uguale alla riga ${line}`,
        warnings: {
          invalid_email_dropped: "email non valida, importato senza email",
          invalid_birth_date_dropped:
            "data di nascita non valida, importato senza data",
        } satisfies Record<CsvRowWarning, string>,
        fileErrors: {
          empty: "Il file è vuoto.",
          missing_phone_column:
            'Manca la colonna del cellulare: aggiungi un\'intestazione "cellulare" o "telefono".',
          too_many_rows: "Il file supera il limite di 1.000 righe.",
          too_large: "Il file supera il limite di 1 MB.",
        } satisfies Record<CsvFileError, string>,
        readError: "Non è stato possibile leggere il file.",
      },
      validation: {
        firstNameRequired: "Inserisci il nome.",
        lastNameRequired: "Inserisci il cognome.",
        nameTooLong: "Massimo 80 caratteri.",
        phoneRequired: "Inserisci il cellulare.",
        phoneInvalid: "Il numero di cellulare non è valido.",
        emailInvalid: "Inserisci un indirizzo email valido.",
        birthDateInvalid: "Data di nascita non valida.",
      },
      detail: {
        breadcrumb: "Clienti",
        activeSince: (date: string) => `Attivo dal ${date}`,
        notActiveYet: "Account non ancora attivo",
        stageOnActivation: (stage: string) => `${stage} all'attivazione`,
        tabsLabel: "Sezioni della scheda cliente",
        tabs: {
          profilo: "Profilo",
          file: "File",
          tracking: "Tracking",
        } satisfies Record<ClientTab, string>,
        notFoundTitle: "Cliente non trovato",
        notFoundDescription:
          "Il cliente non esiste o non appartiene al tuo studio.",
        backToList: "Torna all'elenco clienti",
      },
      tracking: {
        overdue: (count: number, names: string) =>
          `${count === 1 ? "1 misura in ritardo" : `${count} misure in ritardo`}: ${names}.`,
        overdueHint: `Sono passati più di ${CIRCUMFERENCE_INTERVAL_DAYS} giorni dall'ultima registrazione.`,
        height: {
          value: (height: string) => `Altezza ${height}`,
          missing: "Altezza non indicata: aggiungila nel profilo",
        },
        sections: {
          circumference: `Una rilevazione ogni ${CIRCUMFERENCE_INTERVAL_DAYS} giorni`,
          habit: (range: string) =>
            `Voto da 1 a 5 rispetto all'obiettivo · settimana ${range}`,
          workout: "Voto da 1 a 10 alla qualità di ogni sessione",
        } satisfies Record<MetricKind, string | ((range: string) => string)>,
        goals: {
          title: "Obiettivi personali",
          description:
            "Servono a dare un significato ai voti da 1 a 5. Se non li imposti, valgono quelli predefiniti dello studio.",
          edit: "Modifica obiettivi",
          personal: "Personale",
          studioDefault: "Predefinito dello studio",
          captions: {
            steps: "al giorno",
            sleep: "di sonno per notte",
            water: "di acqua al giorno",
          } satisfies Record<HabitKey, string>,
          dialogTitle: "Obiettivi personali",
          dialogDescription: (clientName: string) =>
            `Obiettivi di ${clientName}: le descrizioni dei voti del check-in si basano su questi valori.`,
          labels: {
            steps: "Passi al giorno",
            sleep: "Ore di sonno per notte",
            water: "Litri di acqua al giorno",
          } satisfies Record<HabitKey, string>,
          hint: (studioDefault: string, min: string, max: string) =>
            `Predefinito dello studio: ${studioDefault}. Valori ammessi da ${min} a ${max}.`,
          reset: "Ripristina predefinito",
          resetAria: (name: string) =>
            `Ripristina l'obiettivo predefinito: ${name}`,
          resetDone: "Obiettivo predefinito ripristinato.",
          save: "Salva obiettivi",
          saved: "Obiettivi salvati.",
          cancel: "Annulla",
        },
        circumference: {
          since: (date: string) => `rispetto al ${date}`,
          lastOn: (date: string) => `Ultima: ${date}`,
          nextOn: (date: string) => `Prossima: ${date}`,
          expired: (date: string, days: number) =>
            `Scaduta il ${date} · ${days} gg fa`,
          noEntries: "Nessuna registrazione",
        },
        habit: {
          todayScore: (score: string) => `Voto di oggi: ${score}`,
          todayMissing: "Oggi non ancora compilata",
          goal: (amount: string) => `Obiettivo ${amount}`,
        },
        workout: {
          thisWeek: (sessions: string) => `${sessions} questa settimana`,
          averageAll: (average: string, sessions: string) =>
            `Voto medio ${average} · ${sessions} in tutto`,
          lastOn: (date: string) => `Ultimo: ${date}`,
          recentAverage: (average: string) =>
            `Voto medio ${average} (ultimi ${WORKOUT_RECENT_DAYS} gg)`,
          noSessions: "Nessuna sessione registrata",
        },
        detail: {
          backAria: "Torna alla scheda Tracking",
          subtitle: {
            circumference: `Una rilevazione ogni ${CIRCUMFERENCE_INTERVAL_DAYS} giorni`,
            habit: "Voto da 1 a 5 rispetto all'obiettivo",
            workout: "Voto da 1 a 10 alla qualità di ogni sessione",
          } satisfies Record<MetricKind, string>,
          lastValue: "Ultimo valore",
          fromPrevious: "Variazione dalla precedente",
          fromPreviousHint: (value: string, date: string) =>
            `da ${value} il ${date}`,
          fromStart: "Dall'inizio del percorso",
          next: "Prossima rilevazione",
          expired: "Scaduta",
          expectedOn: (date: string, days: number) =>
            `prevista il ${date}, ${days === 1 ? "1 giorno" : `${days} giorni`} fa`,
          dueOn: (date: string) => `entro il ${date}`,
          neverRecorded: "Nessuna registrazione",
          workoutAverage: "Voto medio",
          workoutAverageOf: (sessions: string) => `su ${sessions}`,
          lastWorkout: "Ultimo allenamento",
          week: "Questa settimana",
          recent: `Ultimi ${WORKOUT_RECENT_DAYS} giorni`,
          sessionsUnit: (count: number) =>
            count === 1 ? "sessione" : "sessioni",
          averageLine: (average: string) => `voto medio ${average}`,
        },
      },
      files: {
        upload: {
          title: "Pubblica un nuovo file",
          category: "Categoria",
          dropzone: "Trascina qui il PDF o scegli un file",
          dropzoneHint: "Solo PDF, massimo 10 MB",
          chooseFile: "Scegli file",
          changeFile: "Cambia file",
          removeFile: "Rimuovi il file selezionato",
          ready: (size: string) => `${size} · pronto per la pubblicazione`,
          titleLabel: "Titolo visibile al cliente",
          titlePlaceholder: "Es. Piano alimentare novembre",
          validFrom: "Data di validità",
          note: "Nota per il cliente (facoltativa)",
          notePlaceholder: "Un consiglio o un promemoria per il cliente",
          noteCount: (length: number, max: number) => `${length}/${max}`,
          notify: "Avvisa il cliente",
          notifyHint:
            "Invia una notifica push alla pubblicazione. Nel messaggio ci sono solo il nome dello studio e il link, mai dati sulla salute.",
          submit: "Pubblica file",
          uploading: (percent: number) => `Caricamento ${percent}%`,
          verifying: "Verifica del file…",
          progressLabel: "Avanzamento del caricamento",
          published: (title: string) => `"${title}" pubblicato.`,
        },
        list: {
          title: "File pubblicati",
          filterLabel: "Filtra per categoria",
          all: "Tutti",
          caption: "File pubblicati per il cliente",
          file: "File",
          category: "Categoria",
          uploadedAt: "Caricato il",
          validFrom: "Valido dal",
          readStatus: "Stato di lettura",
          actions: "Azioni",
          emptyTitle: "Nessun file pubblicato",
          emptyDescription:
            "Carica il primo PDF: il cliente lo troverà nella sua area.",
          emptyCategoryTitle: "Nessun file in questa categoria",
          delete: "Elimina",
          deleteAria: (title: string) => `Elimina ${title}`,
        },
        delete: {
          title: "Eliminare questo file?",
          meta: (category: string, uploadedAt: string, read: string) =>
            `${category} · caricato il ${uploadedAt} · ${read}`,
          description: (name: string) =>
            `Il file sparisce anche dall'area di ${name} e non si può recuperare. Se vuoi sostituirlo, pubblica una nuova versione.`,
          cancel: "Annulla",
          confirm: "Elimina file",
          deleted: "File eliminato.",
        },
      },
      profile: {
        data: {
          title: "Dati del cliente",
          edit: "Modifica",
          cancel: "Annulla",
          save: "Salva",
          saving: "Salvataggio…",
          saved: "Dati salvati.",
          firstName: "Nome",
          lastName: "Cognome",
          phone: "Cellulare",
          email: "Email",
          birthDate: "Data di nascita",
          height: "Altezza (cm)",
          heightValue: "Altezza",
          origin: "Origine",
          empty: "—",
          age: (date: string, years: number) =>
            `${date} (${years} ${years === 1 ? "anno" : "anni"})`,
          origins: {
            imported: "Già seguito dallo studio (dati completi)",
            new: "Inserito dallo studio (nuovo cliente)",
          } satisfies Record<ClientOrigin, string>,
          completedOnActivation: (name: string) =>
            `I dati mancanti li inserisce ${name} quando attiva l'account.`,
          authSyncHint:
            "Il cliente ha un account: cambiando cellulare o email cambia anche il modo in cui accede.",
          authConflict:
            "Questo cellulare o questa email è già usato da un altro account.",
          emailRequired:
            "Il cliente accede anche con l'email: puoi cambiarla ma non toglierla.",
        },
        account: {
          title: "Account",
          status: "Stato account",
          activation: "Data di attivazione",
          notActivated: "Non ancora attivato",
          notifications: "Notifiche",
          pushOn: "Push attive",
          pushOff: "Push non attive",
          noNotifications: "—",
          disable: "Disattiva account",
          disableHint:
            "L'accesso viene sospeso. Fase e dati restano invariati.",
          enable: "Riattiva account",
          enableHint:
            "Il cliente torna ad accedere con le credenziali di prima. Se non aveva ancora un account, va invitato di nuovo.",
          confirmDisableTitle: (name: string) =>
            `Disattivare l'account di ${name}?`,
          confirmDisable:
            "Il cliente viene disconnesso subito e non potrà più accedere finché non riattivi l'account. Gli inviti aperti vengono annullati. Fase del percorso, file e misure restano invariati.",
          confirmEnableTitle: (name: string) =>
            `Riattivare l'account di ${name}?`,
          confirmEnable: "Il cliente potrà di nuovo accedere all'app.",
          confirm: "Conferma",
          cancel: "Annulla",
          disabled: "Account disattivato.",
          enabled: "Account riattivato.",
        },
        invite: {
          title: "Invito su WhatsApp",
          lastSent: "Ultimo invio",
          expiresAt: "Scadenza",
          usedAt: "Link usato il",
          never: "Mai inviato",
          link: "Link",
          linkInfo: "Personale, monouso, valido 14 giorni",
          expiredNotice: (date: string) =>
            `Invito scaduto il ${date}. Il link non è stato usato entro 14 giorni.`,
          previewTitle: (phone: string) =>
            `Messaggio che si apre in WhatsApp, verso ${phone}`,
          previewLinkPlaceholder: "[link personale]",
          previewNote: "Solo nome dello studio e link",
          send: "Invia invito su WhatsApp",
          resend: "Reinvia invito su WhatsApp",
          newLink: "Invia nuovo link su WhatsApp",
          sendHint:
            "Si apre WhatsApp con il messaggio pronto. L'app registra la data dell'invio.",
          resendHint:
            "Il nuovo link annulla quello precedente. L'app registra la data dell'invio.",
          newLinkHint:
            "Per chi ha dimenticato la password e non ha un'email. Il nuovo link annulla il precedente.",
          disabledHint: "Riattiva l'account per inviare un invito.",
        },
        stage: {
          title: "Fase del percorso",
          notAssigned: "Non ancora assegnata",
          notAssignedHint: (stage: string) =>
            `La fase parte quando il cliente attiva l'account: entrerà in ${stage}.`,
          since: (stage: string, date: string) => `${stage} dal ${date}.`,
          actions: {
            complete_onboarding: "Onboarding completato",
            pause: "Metti in pausa",
            complete: "Concludi percorso",
            resume: "Riprendi percorso",
          } satisfies Record<JourneyAction, string>,
          onboardingHint:
            "Il cliente passa In percorso e sblocca file e tracking. Finché è in Onboarding vede solo la home di benvenuto.",
          hint: "Ogni cambio è registrato nello storico.",
          changed: (stage: string) => `Fase aggiornata: ${stage}.`,
          notAllowed: "Questo cambio di fase non è consentito.",
          conflict:
            "La fase è stata cambiata nel frattempo: ricarica la pagina.",
        },
        history: {
          title: "Storico del percorso",
          empty: "Lo storico del percorso compare dopo l'attivazione.",
          created: "Creazione",
          transition: (from: string, to: string) => `${from} → ${to}`,
          manual: (author: string) => `Manuale, ${author}`,
          manualUnknown: "Manuale",
          automatic: "Automatico",
          meta: (date: string, author: string) => `${date} · ${author}`,
        },
      },
    },
    settings: {
      title: "Impostazioni studio",
      description: "Nome e logo: li vedono i tuoi clienti nell'app.",
      identityTitle: "Identità dello studio",
      nameLabel: "Nome dello studio",
      nameHint:
        "Compare in alto nell'app del cliente e nel messaggio di invito.",
      logoLabel: "Logo",
      logoChange: "Cambia logo",
      logoNone: "Nessun file selezionato",
      logoReady: "Nuovo logo ritagliato: salva per applicarlo.",
      logoHint:
        "Immagine PNG, JPEG o WebP di almeno 512 px di lato (meglio 1024): dopo averla scelta la ritagli in un quadrato. È anche l'icona dell'app installata sul telefono.",
      crop: {
        title: "Ritaglia il logo",
        description:
          "Sposta l'immagine e regola lo zoom: conta solo quello che resta nel quadrato.",
        areaLabel:
          "Area del ritaglio: trascina o usa le frecce per spostare l'immagine",
        modeLabel: "Modalità",
        fill: "Riempi",
        fillHint: "Il quadrato è tutto immagine: per simboli e foto.",
        fit: "Adatta con margine",
        fitHint: "Il logo intero su fondo bianco: per le scritte lunghe.",
        zoom: "Zoom",
        previewTitle: "Come apparirà",
        previewMenu: "Menu",
        previewAndroid: "Android",
        previewIphone: "iPhone",
        confirm: "Usa questo ritaglio",
        rendering: "Preparazione…",
        cancel: "Annulla",
        upscaled: (px: number) =>
          `Il ritaglio è di soli ${px} px: l'icona dell'app potrebbe risultare sfocata. Riduci lo zoom o usa "Adatta con margine".`,
        failed:
          "Non è stato possibile preparare l'immagine: prova con un altro file.",
      },
      colorLabel: "Colore principale",
      submit: "Salva impostazioni",
      submitting: "Salvataggio…",
      saved: "Impostazioni salvate.",
      previewTitle: "Anteprima per il cliente",
      previewDescription: "Così si presenta l'app con le tue scelte.",
      previewGreeting: "Ciao Giulia",
      previewBadge: "Nuovo",
      previewFileTitle: "Piano alimentare",
      previewButton: "Apri PDF",
      readOnly: "Valori in sola lettura.",
      managedTitle: "Queste impostazioni le gestisce l'assistenza",
      managedBody: "Per cambiare nome, logo o colore scrivi all'assistenza",
      managedNoEmail: "Per cambiare nome, logo o colore contatta l'assistenza.",
      validation: {
        nameRequired: "Inserisci il nome dello studio.",
        nameTooLong: "Il nome può avere al massimo 120 caratteri.",
        logoType: "Il logo deve essere un'immagine PNG.",
        logoSize: "Il logo può pesare al massimo 2 MB.",
        logoSourceType: "Scegli un'immagine PNG, JPEG o WebP.",
        logoSourceSize: "L'immagine può pesare al massimo 15 MB.",
        logoSourceSmall: (width: number, height: number) =>
          `L'immagine è di ${width} × ${height} px: serve almeno 512 px sul lato lungo, altrimenti l'icona dell'app risulterebbe sgranata.`,
        logoPng: {
          not_png: "Il logo deve essere un'immagine PNG.",
          not_square: "Il logo deve essere quadrato: ritaglialo di nuovo.",
          wrong_size: "Il logo deve misurare fra 512 e 1024 px di lato.",
        },
      },
    },
  },
  client: {
    nav: clientNav,
    menuLabel: "Menu",
    openMenu: "Apri il menu",
    closeMenu: "Chiudi",
    backHome: "Torna alla home",
    profile: { label: "Profilo", description: "Dati, password, notifiche" },
    greeting: (firstName: string) => `Ciao ${firstName}`,
    home: {
      title: "Home",
      description:
        "Qui troverai l'ultimo file pubblicato e le misure da registrare.",
      latestFile: "Ultimo file",
      otherFiles: "Altri file in corso",
      noFilesTitle: "Ancora nessun file",
      noFilesDescription:
        "Quando lo studio pubblicherà un file per te, lo troverai qui.",
      toRecordTitle: "Da registrare",
      onboarding: {
        welcome: "Ti diamo il benvenuto",
        title: (studioName: string) =>
          `Il tuo percorso con ${studioName} inizia con una chiamata`,
        description: (studioName: string) =>
          `${studioName} ti chiamerà per conoscerti e preparare il tuo piano. Prima della chiamata non serve fare nulla.`,
        stepsTitle: "I prossimi passi",
        steps: [
          {
            title: "Account attivato",
            description: "Hai completato i tuoi dati.",
          },
          {
            title: "Chiamata di onboarding",
            description: "Data e ora le concordi con lo studio.",
          },
          {
            title: "Ricevi il tuo primo piano",
            description: "Appare qui, con la tua area personale.",
          },
        ],
        stepDone: " (completato)",
        areaTitle: "Area personale",
        locked: "Si sblocca dopo l'onboarding",
      },
    },
    tracking: {
      backAria: "Torna al tracking",
      register: "Registra",
      registerAria: (name: string) => `Registra: ${name}`,
      checkinCard: {
        title: "Check-in di oggi",
        description: "Passi, sonno e acqua in una sola schermata.",
        missing: (missing: number, total: number) =>
          missing === 0
            ? "Completato, a domani!"
            : `Ne ${missing === 1 ? "manca" : "mancano"} ${missing} su ${total}.`,
        cta: "Compila il check-in",
        ctaEdit: "Modifica il check-in",
        date: (weekday: string, date: string) => `${weekday} ${date}`,
      },
      checkin: {
        title: "Check-in",
        dayLabel: "Giorno del check-in",
        days: {
          today: (date: string) => `Oggi · ${date}`,
          yesterday: (date: string) => `Ieri · ${date}`,
        } satisfies Record<CheckinDay, (date: string) => string>,
        goal: (amount: string) => `Il tuo obiettivo: ${amount}`,
        noGoal: "Voto da 1 a 5",
        save: "Salva check-in",
        saving: "Salvataggio…",
        saved: "Check-in salvato.",
        skipHint:
          "Puoi saltare un giorno: i giorni senza voto non vengono penalizzati.",
        alreadyFilled:
          "Hai già compilato questo giorno: puoi correggere i voti.",
        lockedByStaff: "Voto inserito dal nutrizionista: non puoi modificarlo.",
        notChosen: "Nessun voto scelto",
      },
      circumference: {
        newTitle: "Nuova misura",
        save: "Salva misura",
        saved: "Misura salvata.",
        overdue: (days: number, date: string) =>
          `In ritardo di ${days === 1 ? "1 giorno" : `${days} giorni`}: andava registrata entro il ${date}.`,
        dueSoon: (date: string) => `Da registrare entro il ${date}.`,
        never: "Non l'hai ancora registrata: inserisci la prima misura.",
        nextOn: (date: string) => `Prossima rilevazione entro il ${date}.`,
        fromStart: (delta: string, date: string) => `${delta} dal ${date}`,
      },
      workout: {
        newTitle: "Registra un allenamento",
        save: "Salva allenamento",
        saved: "Allenamento salvato.",
        diaryTitle: "Il tuo diario",
        averageAll: "voto medio in tutto",
        weekSessions: "sessioni questa settimana",
      },
      habit: {
        todayMissing: "Oggi non hai ancora dato questo voto.",
        todayCta: "Compila oggi",
      },
      chartTitle: "Andamento",
      readOnly:
        "Il tuo percorso è in pausa o concluso: puoi consultare i dati, ma non registrarne di nuovi.",
      toRecord: {
        count: (count: number) =>
          count === 1 ? "1 misura" : `${count} misure`,
        checkin: "Check-in di oggi",
        checkinMissing: (names: string[]) =>
          `Da compilare: ${names.map((name) => name.toLowerCase()).join(", ")}`,
        today: "Oggi",
        lastValue: (value: string, date: string) => `Ultima ${value} · ${date}`,
        never: "Mai registrata",
        workoutToday: (score: string) => `Registrato oggi · ${score}`,
        workoutLast: (date: string, score: string) =>
          `Ultimo ${date} · ${score}`,
        workoutNone: "Registra la tua prima sessione",
        allDone: "Tutto registrato: ottimo lavoro!",
        cta: "Vai al tracking",
      },
    },
    files: {
      currentTitle: "In corso",
      currentSince: (date: string) => `Dal ${date}`,
      archiveTitle: "Archivio",
      archiveCount: (count: number) =>
        count === 1 ? "1 file" : `${count} file`,
      archiveEmpty: "Nessun file precedente.",
      futureValidity: (date: string) => `Valido dal ${date}`,
    },
    sections: {
      diets: {
        title: "Diete",
        subtitle: (studioName: string) =>
          `I piani alimentari che ti ha inviato ${studioName}.`,
        emptyTitle: "Nessuna dieta",
        emptyDescription:
          "Quando lo studio pubblicherà il tuo piano alimentare, lo troverai qui.",
      },
      workouts: {
        title: "Allenamenti",
        subtitle: (studioName: string) =>
          `Le schede di allenamento che ti ha inviato ${studioName}.`,
        emptyTitle: "Nessuna scheda",
        emptyDescription:
          "Quando lo studio pubblicherà una scheda di allenamento, la troverai qui.",
      },
      reports: {
        title: "Report",
        subtitle: (studioName: string) =>
          `I report e i controlli che ti ha inviato ${studioName}.`,
        emptyTitle: "Nessun report",
        emptyDescription:
          "Quando lo studio pubblicherà un report, lo troverai qui.",
      },
      tracking: {
        title: "Tracking",
        subtitle:
          "Le tue misure, il check-in di ogni giorno e i tuoi allenamenti.",
        emptyTitle: "Nessuna misura",
        emptyDescription: "Lo studio non ha ancora configurato le misure.",
      },
    },
  },
  tracking: {
    kinds: {
      circumference: {
        title: "Peso e circonferenze",
        hint: `ogni ${CIRCUMFERENCE_INTERVAL_DAYS} giorni`,
      },
      habit: { title: "Abitudini giornaliere", hint: "voto da 1 a 5" },
      workout: { title: "Allenamenti", hint: "voto da 1 a 10" },
    } satisfies Record<MetricKind, { title: string; hint: string }>,
    status: {
      ok: "In regola",
      due_soon: "In scadenza",
      overdue: "In ritardo",
      never: "Da registrare",
    } satisfies Record<CircumferenceStatus, string>,
    recordedAria: "Registrata nel periodo corrente",
    pendingAria: "Da compilare oggi",
    entries: (count: number) =>
      count === 1 ? "1 registrazione" : `${count} registrazioni`,
    sessions: (count: number) =>
      count === 1 ? "1 sessione" : `${count} sessioni`,
    filledDays: (count: number) =>
      count === 1 ? "1 giorno" : `${count} giorni`,
    filledDaysOfWeek: (count: number) =>
      count === 1 ? "1 giorno su 7" : `${count} giorni su 7`,
    lastOn: (date: string) => `ultima ${date}`,
    lastWorkout: (date: string, score: string) => `ultimo ${date}, ${score}`,
    todayScore: (score: string) => `oggi ${score}`,
    todayMissing: "oggi da compilare",
    score: (value: number | string, max: number) => `${value}/${max}`,
    outOf: (max: number) => `/ ${max}`,
    weekAverage: (name: string) => `${name}, media della settimana`,
    delta: (delta: string) => `${delta} rispetto alla scorsa settimana`,
    deltaShort: (delta: string) => `${delta} rispetto alla scorsa`,
    deltaShortSuffix: "rispetto alla scorsa",
    deltaZero: "uguale alla scorsa settimana",
    noWeekValues: "Nessun voto questa settimana",
    chartTitle: "Andamento",
    habit: {
      thisWeek: "Questa settimana",
      averageOf: (range: string, days: string) => `media di ${range} · ${days}`,
      previousAverage: (days: string) =>
        `media della scorsa settimana · ${days}`,
      noPrevious: "Nessun voto la scorsa settimana",
      scaleGoal: (amount: string) => `obiettivo: ${amount}`,
    },
    noEntries: "Nessuna registrazione.",
    /** Form di registrazione e correzione, uguali nelle due aree (A-15). */
    form: {
      value: "Valore",
      valuePlaceholder: "76,4",
      date: "Data",
      limits: (min: string, max: string, unit: string) =>
        `Valori ammessi: da ${min} a ${max} ${unit}. La data non può essere futura.`,
      note: "Nota",
      noteOptional: "(facoltativa)",
      notePlaceholder: "Com'è andata?",
      score: "Voto",
    },
    history: {
      title: "Storico",
      editHint: "correggi o elimina una registrazione",
      diaryTitle: "Ultime sessioni",
      editHintShort: "correggi o elimina",
      daysTitle: "Ultimi giorni",
    },
    edit: {
      title: "Correggi la registrazione",
      editAria: (date: string) => `Correggi la registrazione del ${date}`,
      deleteAria: (date: string) => `Elimina la registrazione del ${date}`,
      save: "Salva correzione",
      saved: "Registrazione corretta.",
      deleteTitle: "Eliminare questa registrazione?",
      deleteDescription:
        "La registrazione verrà eliminata definitivamente, anche dai grafici.",
      deleteConfirm: "Elimina",
      deleted: "Registrazione eliminata.",
      cancel: "Annulla",
    },
    /** Registrazioni inserite dal nutrizionista (A-15). */
    add: {
      cta: "Aggiungi registrazione",
      ctaShort: "Aggiungi",
      ctaAria: (name: string) => `Aggiungi registrazione: ${name}`,
      title: (name: string) => `Nuova registrazione · ${name}`,
      description: (client: string) => `Per ${client}`,
      save: "Salva registrazione",
      saved: "Registrazione salvata.",
      existingDay: (date: string, score: string) =>
        `Il ${date} c'è già un voto (${score}): salvando lo sostituisci, perché si registra un solo valore al giorno.`,
      replace: "Sostituisci il voto",
      replaced: "Voto aggiornato.",
    },
    /** Autore nello storico (A-16). */
    author: {
      staff_created: "Inserita dal nutrizionista",
      staff_edited: "Modificata dal nutrizionista",
    } satisfies Record<EntryAuthorBadge, string>,
    firstValue: "Prima rilevazione",
    noNote: "Nessuna nota",
    valueWithUnit: (value: string, unit: string | null) =>
      unit ? `${value} ${unit}` : value,
    scale: {
      title: "Come si danno i voti",
      meanings: {
        5: "Obiettivo raggiunto",
        4: "Quasi raggiunto",
        3: "A metà",
        2: "Poco",
        1: "Quasi niente",
      } satisfies Record<HabitScore, string>,
      atLeast: (amount: string) => `${amount} o più`,
      about: (amount: string) => `circa ${amount}`,
      lessThan: (amount: string) => `meno di ${amount}`,
      amount: (value: string, unit: string) => `${value} ${unit}`,
      hours: (hours: number) => (hours === 1 ? "1 ora" : `${hours} ore`),
      hoursAndHalf: (hours: number) =>
        hours === 1 ? "1 ora e mezza" : `${hours} ore e mezza`,
      halfHour: "mezz'ora",
      scoreLabel: (score: number, meaning: string) => `${score} · ${meaning}`,
    },
    chart: {
      ranges: { months6: "6 mesi", months12: "12 mesi", all: "Tutto" },
      rangeLabel: "Periodo del grafico",
      date: "Data",
      value: "Valore",
      day: "Giorno",
      currentWeek: "Questa settimana",
      previousWeek: "Scorsa settimana",
      empty: "Nessun dato da mostrare.",
      summary: (title: string, count: number) =>
        `${title}: ${count === 1 ? "1 valore" : `${count} valori`}. I dati sono nella tabella che segue.`,
      notRecorded: "—",
    },
    validation: {
      valueRequired: "Inserisci un valore.",
      valueNumber: "Inserisci un numero, per esempio 76,4.",
      valueDecimals: "Usa al massimo un decimale.",
      valueRange: (min: string, max: string, unit: string) =>
        `Il valore deve essere tra ${min} e ${max} ${unit}.`,
      dateRequired: "Inserisci la data.",
      dateFuture: "La data non può essere futura.",
      scoreRequired: "Scegli un voto.",
      noteTooLong: "Massimo 500 caratteri.",
      checkinEmpty: "Scegli almeno un voto.",
      goalRange: (min: string, max: string) =>
        `L'obiettivo deve essere tra ${min} e ${max}.`,
      goalStep: (step: string) => `Usa multipli di ${step}.`,
    },
    errors: {
      readOnly:
        "Il percorso è in pausa o concluso: non si possono registrare nuovi valori.",
      metricNotFound: "Misura non trovata.",
      entryNotFound: "Registrazione non trovata.",
      notEditable:
        "Questa registrazione è stata inserita dal nutrizionista: non puoi modificarla.",
      outOfRange: "Il valore è fuori dai limiti ammessi.",
      duplicateDay:
        "Per questo giorno c'è già un voto: correggi quello esistente.",
    },
  },
  pagination: {
    label: "Paginazione",
    summary: (from: number, to: number, total: number) =>
      `${from}–${to} di ${total}`,
    previous: "Pagina precedente",
    next: "Pagina successiva",
  },
  files: {
    open: "Apri PDF",
    openShort: "Apri",
    download: "Scarica",
    opening: "Apertura…",
    // Il nome accessibile comincia con il testo visibile (WCAG 2.5.3)
    actionAria: (label: string, title: string) => `${label} ${title}`,
    popupBlocked:
      "Il browser ha bloccato la nuova finestra: tocca di nuovo per aprire il file.",
    popupRetry: "Apri il file",
    notFound: "File non trovato.",
    notAvailable:
      "Il file non è disponibile in questo momento. Riprova tra qualche istante.",
    newBadge: "Nuovo",
    currentBadge: "In corso",
    toRead: "Da leggere",
    readOn: (date: string) => `Letto il ${date}`,
    notRead: "Non ancora letto",
    meta: (date: string, size: string) => `${date} · ${size}`,
    noteLabel: "Nota dello studio",
    quotedNote: (note: string) => `“${note}”`,
    downloadFallback: "documento",
    uploadErrors: {
      not_pdf: "Puoi caricare solo file PDF.",
      too_large: "Il file supera i 10 MB.",
      empty: "Il file è vuoto.",
      invalid_pdf: "Il file non è un PDF valido.",
      upload_failed:
        "Caricamento non riuscito. Controlla la connessione e riprova.",
    } satisfies Record<FileUploadError, string>,
    validation: {
      categoryRequired: "Scegli una categoria.",
      titleRequired: "Inserisci il titolo.",
      titleTooLong: "Massimo 150 caratteri.",
      validFromInvalid: "Inserisci una data di validità.",
      noteTooLong: "Massimo 500 caratteri.",
      fileRequired: "Scegli un file PDF.",
    },
  },
  invites: {
    /** Messaggio WhatsApp precompilato: SOLO nome dello studio e link (N-05). */
    whatsappMessage: (studioName: string, link: string) =>
      `${studioName} e il suo team ti invitano ad attivare l'account: ${link}`,
  },
  activation: {
    metaTitle: "Attiva il tuo account",
    title: "Attiva il tuo account",
    introImported: (firstName: string) =>
      `Ciao ${firstName}, lo studio ha già inserito i tuoi dati. Controllali e scegli una password.`,
    introNew: (studioName: string) =>
      `Ti diamo il benvenuto in ${studioName}. Completa i tuoi dati e scegli una password.`,
    verifiedPhone: (phone: string) => `Numero verificato: ${phone}`,
    dataTitle: "I tuoi dati",
    firstName: "Nome",
    lastName: "Cognome",
    lastNamePlaceholder: "Inserisci il cognome",
    email: "Email",
    emailPlaceholder: "nome@email.it",
    emailHint: "Ti serve per accedere e per recuperare la password da solo.",
    birthDate: "Data di nascita (facoltativa)",
    height: "Altezza (cm)",
    heightHint: "Serve al nutrizionista insieme al peso.",
    passwordTitle: "Scegli la password",
    password: "Password",
    passwordPlaceholder: "Scegli una password",
    passwordRequirements: "Almeno 8 caratteri.",
    showPassword: "Mostra la password",
    hidePassword: "Nascondi la password",
    consentTitle: "Privacy",
    privacyNotice: "Ho letto l'informativa privacy",
    privacyNoticeLink: "Leggi l'informativa",
    privacyDialogTitle: "Informativa privacy",
    privacyAccept: "Ho letto l'informativa",
    healthData:
      "Acconsento al trattamento dei miei dati sulla salute (misure, abitudini, piani alimentari) per il percorso con lo studio.",
    submit: "Attiva il mio account",
    submitting: "Attivazione…",
    validUntil: (date: string) => `Link personale, valido fino al ${date}.`,
    afterNew: "Dopo l'attivazione ti aspetta la chiamata di onboarding.",
    resetTitle: "Scegli una nuova password",
    resetIntro: (firstName: string) =>
      `Ciao ${firstName}, lo studio ti ha inviato un nuovo link: scegli una nuova password per entrare.`,
    resetSubmit: "Salva e accedi",
    invalidTitle: "Link non valido",
    invalid: "Link non valido o scaduto: chiedi un nuovo invito allo studio.",
    goToLogin: "Vai all'accesso",
    failed:
      "Non è stato possibile attivare l'account. Riprova o chiedi un nuovo invito allo studio.",
    duplicateEmail:
      "Questa email è già usata da un altro cliente dello studio: usane un'altra.",
    validation: {
      firstNameRequired: "Inserisci il nome.",
      lastNameRequired: "Inserisci il cognome.",
      nameTooLong: "Massimo 80 caratteri.",
      emailRequired: "Inserisci la tua email.",
      emailInvalid: "Inserisci un indirizzo email valido.",
      birthDateInvalid: "Data di nascita non valida.",
      privacyNoticeRequired:
        "Per attivare l'account conferma di aver letto l'informativa.",
      healthDataRequired:
        "Per attivare l'account serve il consenso al trattamento dei dati sulla salute.",
    },
  },
  // Informativa privacy (NF-06): struttura e testi segnaposto, da far
  // verificare al consulente prima del rilascio.
  privacy: {
    metaTitle: "Informativa privacy",
    title: "Informativa sul trattamento dei dati personali",
    // true finché il testo è una bozza: mostra l'avviso in cima all'informativa
    draft: true,
    reviewBanner: "DA FAR VERIFICARE AL CONSULENTE PRIVACY",
    close: "Chiudi",
    closeAria: "Chiudi l'informativa",
    reviewNote:
      "Bozza con testi segnaposto: non è ancora l'informativa definitiva dello studio.",
    version: (version: string) => `Versione ${version}`,
    placeholder: "Segnaposto",
    sections: (studioName: string) => [
      {
        title: "1. Titolare del trattamento",
        body: [
          `Il titolare del trattamento è ${studioName}, [indirizzo della sede, partita IVA, email e PEC da completare].`,
          "[Eventuale responsabile della protezione dei dati (DPO): indicare se nominato e i suoi contatti.]",
        ],
      },
      {
        title: "2. Dati trattati",
        body: [
          "Dati identificativi e di contatto: nome, cognome, numero di cellulare, email, data di nascita (facoltativa), altezza.",
          "Dati relativi alla salute (art. 9 GDPR): piani alimentari e altri documenti caricati dallo studio, peso e circonferenze, abitudini (acqua, passi, sonno), allenamenti e note inserite da te.",
          "Dati tecnici: credenziali di accesso (la password è conservata solo in forma cifrata), sessioni e, se le attivi, l'indirizzo tecnico per le notifiche del tuo dispositivo.",
        ],
      },
      {
        title: "3. Finalità e basi giuridiche",
        body: [
          "Gestione del percorso nutrizionale e del rapporto con lo studio: esecuzione del contratto (art. 6, par. 1, lett. b GDPR).",
          "Trattamento dei dati sulla salute: consenso esplicito (art. 9, par. 2, lett. a GDPR) [oppure altra base da indicare: verificare con il consulente].",
          "Invio di notifiche sul dispositivo: solo se le attivi; il testo non contiene mai dati sulla salute.",
          "[Eventuali obblighi di legge, ad esempio fiscali e contabili.]",
        ],
      },
      {
        title: "4. Destinatari e fornitori",
        body: [
          "I dati sono accessibili solo allo studio. Alcuni fornitori trattano i dati per conto dello studio come responsabili del trattamento (art. 28 GDPR):",
          "Supabase (database, archivio dei documenti, autenticazione), server nell'Unione Europea (Francoforte).",
          "Netlify (hosting dell'applicazione) [regione dei server e garanzie per l'eventuale trasferimento negli Stati Uniti da verificare].",
          "[Brevo] (invio delle email di recupero password e di conferma dell'indirizzo).",
          "Servizi di notifica dei produttori di browser e sistemi operativi (Apple, Google, Mozilla, Microsoft): ricevono solo un messaggio generico, senza dati sulla salute.",
          "Il link di attivazione ti arriva tramite WhatsApp dal telefono dello studio.",
        ],
      },
      {
        title: "5. Trasferimenti fuori dall'Unione Europea",
        body: [
          "[Indicare se alcuni fornitori trasferiscono dati fuori dall'UE e con quali garanzie, ad esempio le clausole contrattuali standard.]",
        ],
      },
      {
        title: "6. Conservazione",
        body: [
          "[Per tutta la durata del percorso e per X anni dalla sua conclusione: periodo da definire.]",
          "Gli inviti scaduti vengono eliminati automaticamente dopo 90 giorni.",
        ],
      },
      {
        title: "7. I tuoi diritti",
        body: [
          "Puoi chiedere allo studio l'accesso ai tuoi dati e una loro copia, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e opporti al trattamento (artt. 15–22 GDPR).",
          "Puoi revocare in qualsiasi momento il consenso al trattamento dei dati sulla salute, senza pregiudicare la liceità del trattamento svolto prima della revoca; senza consenso lo studio non potrà più seguirti tramite l'app.",
          "Puoi proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
        ],
      },
      {
        title: "8. Contatti",
        body: [
          `Per esercitare i tuoi diritti scrivi a ${studioName}: [email dello studio da completare].`,
        ],
      },
    ],
  },
  manifest: {
    description: (studioName: string) => `L'area riservata di ${studioName}`,
  },
  // Testo delle notifiche push (N-05): generico, mai dati del file
  notifications: {
    filePublished: "Hai un nuovo documento nella tua area riservata",
  },
  push: {
    errors: {
      invalidSubscription:
        "Questo browser ha inviato dati non validi per le notifiche. Riprova.",
      failed: "Non è stato possibile attivare le notifiche. Riprova.",
      disableFailed: "Non è stato possibile disattivare le notifiche. Riprova.",
    },
    banner: {
      ask: {
        title: "Attiva le notifiche",
        description: "Ti avvisiamo quando arriva un nuovo file.",
        action: "Attiva",
        pending: "Attivazione…",
      },
      install: {
        title: "Installa l'app per ricevere gli avvisi",
        description:
          "Su iPhone le notifiche funzionano solo con l'app nella schermata Home.",
        action: "Come fare",
      },
      denied: {
        title: "Notifiche bloccate",
        description: "Per ricevere gli avvisi riattivale dalle impostazioni:",
      },
    },
    // Come riattivare il permesso negato, per piattaforma
    deniedHelp: {
      ios: [
        "Apri Impostazioni › Notifiche.",
        "Scegli l'app dello studio.",
        'Attiva "Consenti notifiche".',
      ],
      android: [
        "Tieni premuta l'icona dell'app e scegli \"Info app\" (o apri il lucchetto accanto all'indirizzo in Chrome).",
        'Apri "Notifiche" (o "Autorizzazioni").',
        "Consenti le notifiche e torna qui.",
      ],
      desktop: [
        "Fai clic sul lucchetto accanto all'indirizzo.",
        'Imposta "Notifiche" su "Consenti".',
        "Ricarica la pagina.",
      ],
    },
  },
  install: {
    title: "Installa l'app sul telefono",
    description:
      "Così ricevi un avviso quando arriva un nuovo file. Su iPhone le notifiche funzionano solo con l'app installata.",
    tabs: { ios: "iPhone", android: "Android" },
    ios: [
      {
        title: "Tocca Condividi in Safari",
        description:
          "Il quadrato con la freccia, in basso (o in alto su iPad).",
      },
      {
        title: "Scegli Aggiungi alla schermata Home",
        description:
          "Se non la vedi, scorri l'elenco verso il basso. Poi tocca Aggiungi.",
      },
      {
        title: "Apri l'app dall'icona e attiva le notifiche",
        description:
          "Entra con le tue credenziali e tocca Attiva quando te lo chiede.",
      },
    ],
    iosOtherBrowser:
      "Su iPhone l'app si installa da Safari: apri questa pagina in Safari e segui i passaggi.",
    android: [
      {
        title: "Tocca il menu ⋮ di Chrome",
        description: "In alto a destra.",
      },
      {
        title: "Scegli Installa app (o Aggiungi a schermata Home)",
        description: "Poi conferma con Installa.",
      },
      {
        title: "Apri l'app dall'icona e attiva le notifiche",
        description: "Tocca Attiva quando te lo chiede.",
      },
    ],
    promptTitle: "Installa con un tocco",
    promptDescription: "Il telefono ti chiede di confermare l'installazione.",
    promptAction: "Installa",
    desktopManual:
      "Su computer puoi installarla dall'icona di installazione nella barra degli indirizzi, se il browser la mostra.",
    alreadyInstalled: "L'app è già installata su questo dispositivo.",
    done: "Ho installato l'app",
    later: "Più tardi",
    back: "Torna alla home",
  },
} as const;

/**
 * Testi dell'interfaccia in italiano (DEV-14): nessun testo nei componenti.
 * Le etichette dei valori di dominio sono tipizzate sulle costanti, così un
 * nuovo stato o una nuova fase senza etichetta è un errore di compilazione.
 */
import type {
  AccountStatus,
  AdminNavKey,
  ClientNavKey,
  ClientOrigin,
  ClientTab,
  CsvDiscardReason,
  CsvFileError,
  CsvRowWarning,
  FileCategory,
  JourneyStage,
  StaffRole,
} from "@/lib/constants/domain";
import type { JourneyAction } from "@/lib/domain/journey";

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
      passwordMismatch: "Le due password non coincidono.",
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
        status: "Stato account e fase",
        lastFile: "Ultimo file",
        lastEntry: "Ultima misura",
        actions: "Azioni",
        noFile: "Nessun file",
        noEntry: "Nessuna misura",
        lastEntryOn: (date: string) => `Registrata il ${date}`,
      },
      actions: {
        newClient: "Nuovo cliente",
        importCsv: "Importa CSV",
        invite: "Invia invito su WhatsApp",
        reinvite: "Reinvia invito",
        detail: "Dettaglio",
        detailFor: (name: string) => `Dettaglio di ${name}`,
        inviteFor: (name: string) => `Invia invito su WhatsApp a ${name}`,
      },
      invite: {
        sending: "Preparazione del link…",
        sent: (name: string) =>
          `Link creato per ${name}: invia il messaggio da WhatsApp.`,
        popupBlocked:
          "Il browser ha bloccato la finestra di WhatsApp: consenti i popup per questo sito e riprova.",
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
        summaryDiscarded: (count: number) =>
          count === 1 ? "1 riga scartata" : `${count} righe scartate`,
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
        placeholders: {
          file: {
            title: "File",
            description:
              "Il caricamento e l'elenco dei file arriveranno in una fase successiva.",
          },
          tracking: {
            title: "Tracking",
            description:
              "Le misure del cliente arriveranno in una fase successiva.",
          },
        } satisfies Record<
          Exclude<ClientTab, "profilo">,
          { title: string; description: string }
        >,
        notFoundTitle: "Cliente non trovato",
        notFoundDescription:
          "Il cliente non esiste o non appartiene al tuo studio.",
        backToList: "Torna all'elenco clienti",
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
      description:
        "Nome, logo e colore principale: li vedono i tuoi clienti nell'app.",
      identityTitle: "Identità dello studio",
      nameLabel: "Nome dello studio",
      nameHint:
        "Compare in alto nell'app del cliente e nel messaggio di invito.",
      logoLabel: "Logo",
      logoChange: "Cambia logo",
      logoNone: "Nessun file selezionato",
      logoHint:
        "Immagine quadrata PNG o JPEG, massimo 2 MB. È anche l'icona dell'app installata sul telefono.",
      colorLabel: "Colore principale",
      colorHint: "Formato esadecimale, per esempio #2E6A4E.",
      contrast: (ratio: string, textLabel: string) =>
        `Contrasto con il testo ${textLabel}: ${ratio}:1. Il minimo per la leggibilità è 4,5:1 (WCAG AA).`,
      contrastLow:
        "Il contrasto è sotto il minimo consigliato: scegli un colore più scuro o più chiaro.",
      textWhite: "bianco",
      textDark: "scuro",
      submit: "Salva impostazioni",
      submitting: "Salvataggio…",
      saved: "Impostazioni salvate.",
      previewTitle: "Anteprima per il cliente",
      previewDescription: "Così si presenta l'app con le tue scelte.",
      previewGreeting: "Ciao Giulia",
      previewBadge: "Nuovo",
      previewFileTitle: "Piano alimentare",
      previewButton: "Apri PDF",
      validation: {
        nameRequired: "Inserisci il nome dello studio.",
        nameTooLong: "Il nome può avere al massimo 120 caratteri.",
        colorInvalid: "Inserisci un colore nel formato #RRGGBB.",
        logoType: "Il logo deve essere un'immagine PNG o JPEG.",
        logoSize: "Il logo può pesare al massimo 2 MB.",
      },
    },
  },
  client: {
    nav: clientNav,
    menuLabel: "Menu",
    openMenu: "Apri il menu",
    profile: { label: "Profilo", description: "Dati, password, notifiche" },
    greeting: (firstName: string) => `Ciao ${firstName}`,
    home: {
      title: "Home",
      description:
        "Qui troverai l'ultimo file pubblicato e le misure da registrare.",
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
    sections: {
      diets: {
        title: "Diete",
        emptyTitle: "Nessuna dieta",
        emptyDescription: "Le diete arriveranno nelle prossime fasi.",
      },
      workouts: {
        title: "Allenamenti",
        emptyTitle: "Nessuna scheda",
        emptyDescription:
          "Le schede di allenamento arriveranno nelle prossime fasi.",
      },
      reports: {
        title: "Report",
        emptyTitle: "Nessun report",
        emptyDescription: "I report arriveranno nelle prossime fasi.",
      },
      tracking: {
        title: "Tracking",
        emptyTitle: "Nessuna misura",
        emptyDescription: "Il tracking arriverà nelle prossime fasi.",
      },
      profile: {
        title: "Profilo",
        emptyTitle: "Profilo",
        emptyDescription:
          "Dati personali, password e notifiche arriveranno nelle prossime fasi.",
      },
    },
  },
  invites: {
    /** Messaggio WhatsApp precompilato: SOLO nome dello studio e link (N-05). */
    whatsappMessage: (studioName: string, link: string) =>
      `Ciao! ${studioName} ti invita ad attivare il tuo account: ${link}`,
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
    email: "Email (facoltativa)",
    emailPlaceholder: "nome@email.it",
    emailHint: "Consigliata: ti serve per recuperare la password da solo.",
    birthDate: "Data di nascita (facoltativa)",
    passwordTitle: "Scegli la password",
    password: "Password",
    passwordPlaceholder: "Scegli una password",
    passwordRequirements: "Almeno 8 caratteri.",
    showPassword: "Mostra la password",
    hidePassword: "Nascondi la password",
    consent:
      "Ho letto l'informativa privacy e acconsento al trattamento dei miei dati sulla salute.",
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
      "Questa email è già usata da un altro cliente dello studio: usane un'altra o lasciala vuota.",
    validation: {
      firstNameRequired: "Inserisci il nome.",
      lastNameRequired: "Inserisci il cognome.",
      nameTooLong: "Massimo 80 caratteri.",
      emailInvalid: "Inserisci un indirizzo email valido.",
      birthDateInvalid: "Data di nascita non valida.",
      passwordTooShort: "La password deve avere almeno 8 caratteri.",
      passwordTooLong: "La password può avere al massimo 72 caratteri.",
      consentRequired: "Per attivare l'account serve il consenso.",
    },
  },
  manifest: {
    description: (studioName: string) => `L'area riservata di ${studioName}`,
  },
} as const;

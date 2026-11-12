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
  VIDEO_FOLDER_DESCRIPTION_MAX,
  VIDEO_FOLDER_NAME_MAX,
  VIDEO_NOTE_MAX,
  VIDEO_TITLE_MAX,
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
  videos: "Video",
  settings: "Impostazioni studio",
};

const clientNav: Record<ClientNavKey, { label: string; description: string }> =
  {
    diets: { label: "Diete", description: "I tuoi piani alimentari" },
    workouts: { label: "Allenamenti", description: "Schede di allenamento" },
    reports: { label: "Report", description: "Report e controlli" },
    videos: { label: "Video", description: "Ricette, esercizi e consigli" },
    tracking: {
      label: "Tracking",
      description: "Misure, check-in, allenamenti",
    },
  };

const VIDEO_COUNT = (count: number) =>
  count === 1 ? "1 video" : `${count} video`;

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
      description: "Nuovi file e promemoria serale del check-in.",
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
      preferences: {
        title: "Cosa ricevere",
        hint: "Valgono per tutti i tuoi dispositivi.",
        filesEnabled: {
          label: "Nuovi file",
          description:
            "Diete, schede di allenamento e report appena pubblicati.",
        },
        dailyReminderEnabled: {
          label: "Promemoria serale",
          description: "Alle 20, se mancano le abitudini di oggi.",
        },
        videosEnabled: {
          label: "Nuovi video",
          description: "Quando lo studio segnala un video importante.",
        },
        measureCheckEnabled: {
          label: "Check delle misure",
          description: "Alle 6 del giorno prima e del giorno del check.",
        },
        saved: "Preferenza salvata.",
        failed: "Non è stato possibile salvare la preferenza. Riprova.",
      },
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
    /** Libreria video dello studio (mockup v4, A13–A16). */
    videos: {
      title: "Video",
      description:
        "Video YouTube scelti dallo studio, ordinati in cartelle. Li vedono i clienti In percorso; chi è In pausa o Concluso vede solo quelli caricati fino alla pausa o alla conclusione.",
      newFolder: "Nuova cartella",
      addVideo: "Aggiungi video",
      foldersTitle: "Cartelle",
      foldersSummary: (folders: number, videos: number) =>
        `${folders === 1 ? "1 cartella" : `${folders} cartelle`} · ${
          videos === 1 ? "1 video" : `${videos} video`
        }`,
      videoCount: VIDEO_COUNT,
      onboardingBadge: "Anche in Onboarding",
      reorderFoldersHint:
        "Trascina per cambiare l'ordine in cui i clienti vedono le cartelle.",
      foldersListLabel: "Cartelle, nell'ordine in cui le vedono i clienti",
      subfoldersListLabel: (name: string) => `Sottocartelle di ${name}`,
      videosListLabel: (name: string) => `Video di ${name}`,
      subfolders: "Sottocartelle",
      newSubfolder: "Nuova sottocartella",
      editFolder: "Modifica cartella",
      deleteFolder: "Elimina cartella",
      parentLabel: (name: string) => `In ${name}`,
      visibleTo: {
        active: "Visibile a: clienti con account attivo",
        onboarding: "Visibile a: anche i clienti in Onboarding",
      },
      noFolders: {
        title: "Ancora nessuna cartella",
        description:
          "Crea la prima cartella per raggruppare i video per tematica.",
      },
      emptyFolder: {
        title: "Nessun video in questa cartella",
        description:
          "Aggiungi un video con il link di YouTube. Una cartella vuota non compare ai clienti.",
      },
      table: {
        caption: "Video della cartella, nell'ordine in cui li vedono i clienti",
        video: "Video",
        addedOn: "Aggiunto il",
        openedBy: "Aperto da",
        actions: "Azioni",
        openedCount: (count: number) =>
          count === 1 ? "1 cliente" : `${count} clienti`,
        newBadge: "Nuovo",
        unavailable: "Non disponibile",
        footer: (count: number) =>
          `${count === 1 ? "1 video" : `${count} video`} · trascina le righe per cambiare l'ordine. “Aperto da” conta i clienti che hanno avviato il video almeno una volta.`,
      },
      reorder: {
        handle: (name: string) => `Trascina per spostare ${name}`,
        saved: "Ordine salvato.",
        failed:
          "Non è stato possibile salvare l'ordine. Ricarica la pagina e riprova.",
        stale: "L'elenco è cambiato nel frattempo: ricarica la pagina.",
        picked: (name: string) => `${name} preso. Usa le frecce per spostarlo.`,
        moved: (name: string, position: number, total: number) =>
          `${name}: posizione ${position} di ${total}.`,
        dropped: (name: string, position: number, total: number) =>
          `${name} lasciato in posizione ${position} di ${total}.`,
        cancelled: (name: string) => `Spostamento di ${name} annullato.`,
      },
      actions: {
        edit: "Modifica",
        editFor: (title: string) => `Modifica ${title}`,
        delete: "Elimina",
        deleteFor: (title: string) => `Elimina ${title}`,
        openOnYoutube: "Apri su YouTube",
      },
      folderForm: {
        createTitle: "Nuova cartella",
        createSubTitle: (parent: string) => `Nuova sottocartella in ${parent}`,
        editTitle: "Modifica cartella",
        description: "Raggruppa i video per tematica.",
        name: "Nome della cartella",
        nameHint: (count: number, max: number) =>
          `${count}/${max} · è il titolo che vedono i clienti`,
        descriptionLabel: "Descrizione (facoltativa)",
        visibility: "Chi la vede",
        visibilityActive: {
          label: "Clienti In percorso",
          description:
            "Chi è In pausa o Concluso vede solo i video caricati fino alla pausa o alla conclusione. È la scelta per quasi tutte le cartelle.",
        },
        visibilityOnboarding: {
          label: "Anche i clienti in Onboarding",
          description:
            "Per i video di benvenuto: compaiono nella home di chi aspetta la chiamata, mentre il resto della libreria resta bloccato.",
        },
        subfolderVisibility: (parent: string) =>
          `La vedono gli stessi clienti della cartella ${parent}.`,
        emptyNote:
          "Una cartella vuota non compare ai clienti finché non ci aggiungi almeno un video.",
        cancel: "Annulla",
        create: "Crea cartella",
        save: "Salva",
        saving: "Salvataggio…",
        created: (name: string) => `Cartella ${name} creata.`,
        saved: "Cartella aggiornata.",
        failed: "Non è stato possibile salvare la cartella. Riprova.",
      },
      deleteFolderDialog: {
        title: (name: string) => `Eliminare la cartella ${name}?`,
        description:
          "La cartella è vuota: nessun video e nessuna sottocartella.",
        notEmpty:
          "La cartella contiene video o sottocartelle: spostali o eliminali prima.",
        cancel: "Annulla",
        confirm: "Elimina cartella",
        deleted: "Cartella eliminata.",
      },
      videoForm: {
        addTitle: "Aggiungi un video",
        addDescription:
          "Incolla il link di YouTube: titolo e anteprima vengono letti in automatico.",
        editTitle: "Modifica video",
        link: "Link del video YouTube",
        linkPlaceholder: "https://youtu.be/…",
        verify: "Verifica",
        checking: "Verifica del link…",
        found: "Video trovato e riproducibile nell'app",
        previewAlt: "Anteprima da YouTube",
        author: (author: string) => `${author} · YouTube`,
        title: "Titolo visibile ai clienti",
        titleHint: "Preso da YouTube, puoi modificarlo.",
        titleWaiting: "Compare dopo un link valido",
        folder: "Cartella",
        note: "Nota per i clienti (facoltativa)",
        count: (count: number, max: number) => `${count}/${max}`,
        notify: "Avvisa i clienti",
        notifyHint: (count: number) =>
          `Invia una notifica push ${
            count === 1 ? "al cliente" : `ai ${count} clienti`
          } che vedono questa cartella. Il messaggio contiene solo il nome dello studio e “Nuovo video disponibile in” seguito dal nome della cartella. Usala per i video importanti.`,
        accepted:
          "Link accettati: youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…. Funzionano i video pubblici e “Non in elenco”, non quelli privati.",
        cancel: "Annulla",
        add: "Aggiungi video",
        adding: "Aggiunta…",
        save: "Salva",
        saving: "Salvataggio…",
        added: (title: string) => `Video “${title}” aggiunto.`,
        saved: "Video aggiornato.",
        failed: "Non è stato possibile salvare il video. Riprova.",
        duplicate: "Questo video è già nella cartella.",
        errors: {
          invalid_link: {
            lead: "Questo non è un link di YouTube.",
            title: "Link non riconosciuto",
            text: "Copia il link dal pulsante “Condividi” di YouTube e incollalo qui.",
          },
          not_embeddable: {
            lead: "Il proprietario di questo video non ne permette la riproduzione in altre app.",
            title: "Il video non si può aggiungere",
            text: "I clienti vedrebbero solo un messaggio di errore. Scegli un altro video, oppure, se il video è tuo, attiva “Consenti incorporamento” nelle impostazioni del video su YouTube Studio e riprova.",
          },
          unavailable: {
            lead: "Il video è privato, è stato rimosso oppure il link non esiste.",
            title: "Il video non si può aggiungere",
            text: "Funzionano solo i video pubblici e “Non in elenco”. Controlla il link su YouTube e riprova.",
          },
          check_failed: {
            lead: "Non è stato possibile verificare il link con YouTube.",
            title: "Verifica non riuscita",
            text: "Controlla la connessione e riprova tra poco.",
          },
        },
      },
      validation: {
        nameRequired: "Scrivi il nome della cartella.",
        nameTooLong: `Al massimo ${VIDEO_FOLDER_NAME_MAX} caratteri.`,
        descriptionTooLong: `Al massimo ${VIDEO_FOLDER_DESCRIPTION_MAX} caratteri.`,
        titleRequired: "Scrivi il titolo che vedono i clienti.",
        titleTooLong: `Al massimo ${VIDEO_TITLE_MAX} caratteri.`,
        noteTooLong: `Al massimo ${VIDEO_NOTE_MAX} caratteri.`,
        linkInvalid: "Incolla un link di YouTube.",
        folderRequired: "Scegli una cartella.",
      },
      deleteVideoDialog: {
        title: (title: string) => `Eliminare il video “${title}”?`,
        description:
          "Sparisce dalla libreria dei clienti, insieme al conteggio di chi l'ha aperto. Il video resta su YouTube.",
        cancel: "Annulla",
        confirm: "Elimina video",
        deleted: "Video eliminato.",
      },
    },
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
        filterLabel: "Filtra i clienti",
        all: "Tutti",
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
          `${count} ${count === 1 ? "cliente" : "clienti"}.`,
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
        description:
          "Inserisci i dati e scegli la fase. Poi gli mandi il link su WhatsApp per scegliere la password.",
        stageLabel: "Fase",
        stages: {
          in_progress: {
            label: "In percorso",
            description:
              "Cliente già seguito: all'attivazione verificherà i dati.",
          },
          onboarding: {
            label: "Onboarding",
            description: "Cliente nuovo: all'attivazione completerà i dati.",
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
        createdTitle: (name: string) => `${name} è nell'elenco`,
        createdHint:
          "Mandagli il link su WhatsApp: con il link sceglie la password e attiva l'account. Puoi farlo anche più tardi dalla riga del cliente.",
        addAnother: "Aggiungi un altro cliente",
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
        validHint: (stage: string) =>
          `Entreranno con fase ${stage} e stato Da invitare. Gli inviti WhatsApp si mandano dalla riga di ogni cliente.`,
        stageLabel: "Fase dei clienti importati",
        stageHint: "Vale per tutte le righe del file.",
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
        stageRequired: "Scegli la fase del cliente.",
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
          percorso: "Percorso",
          file: "File",
          tracking: "Tracking",
          note: "Note cliniche",
        } satisfies Record<ClientTab, string>,
        notFoundTitle: "Cliente non trovato",
        notFoundDescription:
          "Il cliente non esiste o non appartiene al tuo studio.",
        backToList: "Torna all'elenco clienti",
      },
      tracking: {
        overdue: (count: number, names: string) =>
          `${count === 1 ? "1 misura in ritardo" : `${count} misure in ritardo`}: ${names}.`,
        overdueHint: "La data del check è passata.",
        check: {
          pill: (date: string) => `Prossimo check ${date}`,
          pillStaff: (date: string) => `Prossimo check ${date} · scelto da te`,
          none: "Prossimo check: dopo la prima misura",
          edit: "Cambia data",
          /** Dopo il testo visibile della pillola (WCAG 2.5.3). */
          editAria: (clientName: string) =>
            ` · cambia la data del prossimo check di ${clientName}`,
          dialogTitle: "Prossimo check delle misure",
          dialogDescription: (clientName: string) =>
            `Peso e circonferenze di ${clientName}. Il cliente riceve un promemoria alle 6 del giorno prima e del giorno stesso.`,
          label: "Data del check",
          hint: (defaultDate: string | null) =>
            defaultDate
              ? `Senza una data scelta: ${defaultDate} (${CIRCUMFERENCE_INTERVAL_DAYS} giorni dall'ultima registrazione). Dopo la prossima registrazione si riparte da ${CIRCUMFERENCE_INTERVAL_DAYS} giorni.`
              : `Dopo la prossima registrazione si riparte da ${CIRCUMFERENCE_INTERVAL_DAYS} giorni.`,
          reset: "Usa la data standard",
          save: "Salva",
          cancel: "Annulla",
          saved: "Data del check salvata",
          resetDone: "Torna la data standard",
          dateRequired: "Scegli una data.",
          datePast: "La data non può essere passata.",
          dateTooFar: "Scegli una data entro un anno.",
        },
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
          dropzoneHint: "Solo PDF",
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
          previewNote: "Solo il tuo nome e il link",
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
    /** Video dello studio (mockup v4, C4–C6, C14–C18). */
    videos: {
      title: "Video",
      subtitle: (studioName: string) =>
        `Video scelti per te da ${studioName}: ricette, esercizi e consigli.`,
      latest: "Ultimo aggiunto",
      addedOn: (date: string) => `Aggiunto il ${date}`,
      folders: "Cartelle",
      foldersSummary: (folders: number, videos: number) =>
        `${folders === 1 ? "1 cartella" : `${folders} cartelle`} · ${
          videos === 1 ? "1 video" : `${videos} video`
        }`,
      videoCount: VIDEO_COUNT,
      newCount: (count: number) => (count === 1 ? "1 nuovo" : `${count} nuovi`),
      newBadge: "Nuovo",
      viewedAria: "Già aperto",
      subfolders: "Sottocartelle",
      filter: {
        label: "Filtra i video",
        all: (count: number) => `Tutti · ${count}`,
        toWatch: (count: number) => `Da guardare · ${count}`,
      },
      listFooter: "La spunta indica i video che hai già aperto.",
      emptyFilter: "Hai già aperto tutti i video di questa cartella.",
      play: (title: string) => `Riproduci ${title}`,
      playerTitle: (title: string) => `Video: ${title}`,
      playerSource: "Riproduzione da YouTube",
      backToVideos: "Torna ai video",
      backToFolder: (name: string) => `Torna a ${name}`,
      noteFrom: (studioName: string) => `Nota di ${studioName}`,
      quotedNote: (note: string) => `“${note}”`,
      openOnYoutube: "Apri su YouTube",
      sameFolder: "Nella stessa cartella",
      unavailable: {
        title: "Video non disponibile",
        text: "YouTube non riesce a riprodurlo in questo momento. Riprova più tardi.",
        retry: "Riprova",
        hint: "Se il problema resta, lo studio vede il video segnalato come non disponibile e lo sostituisce.",
        youtube: "Prova ad aprirlo su YouTube",
      },
      empty: {
        title: "Ancora nessun video",
        description:
          "Qui troverai i video che lo studio prepara per te: ricette, esercizi e consigli. Ti avvisiamo quando arriva il primo.",
        back: "Torna alla home",
      },
      home: { title: "Video", all: "Tutti i video" },
      onboarding: { title: "Intanto guarda" },
    },
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
      /** Card "Oggi" in cima al Tracking: check-in e allenamento. */
      today: {
        title: "Oggi",
        checkinTitle: "Check-in",
        checkinDoneAria: "Check-in completato",
        workoutTitle: "Allenamento",
        workoutNone: "Non ancora registrato oggi.",
        workoutDone: (score: string) => `Registrato oggi, voto ${score}.`,
        workoutCta: "Registra allenamento",
        workoutAnother: "Aggiungi un altro",
      },
      workouts: {
        week: (count: number) =>
          count === 0
            ? "Nessuno questa settimana"
            : `${count} questa settimana`,
        last: (when: string, score: string) => `ultimo ${when} · ${score}`,
        none: "Nessun allenamento registrato",
        register: "Registra",
        registerAria: "Registra un allenamento",
        doneAria: "Allenamento registrato oggi",
        pendingAria: "Nessun allenamento oggi",
      },
      habits: {
        average: (value: string) => `Media settimana ${value}`,
      },
      circumferences: {
        hint: "Una volta al mese",
        nextCheck: (date: string) => `Prossimo check ${date}`,
        progress: (recorded: number, total: number) =>
          `${recorded} su ${total} registrate questo mese`,
        missing: (names: string) => `mancano ${names}`,
        missingMany: (count: number) => `ne mancano ${count}`,
        showAll: "Mostra tutte",
        hideAll: "Nascondi",
      },
      overdue: {
        text: (count: number) =>
          count === 1 ? "1 misura in ritardo" : `${count} misure in ritardo`,
        cta: "Registra",
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
    relativeDay: {
      today: "oggi",
      yesterday: "ieri",
      daysAgo: (days: number) => `${days} giorni fa`,
    },
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
      too_large: "Il file è troppo grande per essere caricato.",
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
    /**
     * Messaggio WhatsApp precompilato: SOLO nome del professionista che invia
     * (titolo, nome e cognome dal suo profilo) e link, mai dati del cliente (N-05).
     */
    whatsappMessage: (senderName: string, link: string) =>
      `${senderName} e il suo team ti invitano ad attivare l'account: ${link}`,
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
  /** Catalogo dei testi delle notifiche (N-05): mai dati del file o misure. */
  notifications: {
    filePublished: "Hai un nuovo documento nella tua area riservata",
    body: {
      file_diet: "È disponibile il tuo nuovo piano alimentare.",
      file_workout: "È disponibile la tua nuova scheda di allenamento.",
      file_report: "È disponibile il tuo nuovo report.",
      daily_checkin: "Com'è andata oggi? Un minuto per passi, sonno e acqua.",
      daily_checkin_workout:
        "Com'è andata oggi? Un minuto per passi, sonno e acqua, e se ti sei allenato il voto dell'allenamento.",
      /** Il nome della cartella è della libreria dello studio, non un dato del cliente. */
      video: (folderName: string) => `Nuovo video disponibile in ${folderName}`,
      measure_check_eve:
        "Domani è il giorno del check: prepara metro e bilancia.",
      measure_check_day:
        "Oggi è il giorno del check: registra peso e circonferenze.",
    },
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
        description:
          "Ti avvisiamo dei nuovi file e la sera ti ricordiamo il check-in.",
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
  /** Percorso del cliente (mockup v5: A17–A19, C5, C19–C21). */
  journeys: {
    sessionName: {
      onboarding: "Onboarding",
      gift: "Check omaggio",
      check: (n: number) => `Check ${n}`,
    },
    state: {
      done: "Completata",
      skipped: "Saltata",
      next: "Prossima",
      overdue: "In ritardo",
      todo: "Da fare",
    },
    status: {
      todo: "Da fare",
      done: "Completata",
      skipped: "Saltata",
    },
    duration: { 6: "6 mesi", 12: "1 anno" },
    kind: {
      first: "Primo percorso",
      extension: "Estensione",
      resume: "Ripresa",
    },
    journeyNumber: (n: number) => `Percorso ${n}`,
    journeyHeading: (n: number, detail: string) => `Percorso ${n} · ${detail}`,
    completedOf: (done: number, total: number) =>
      `${done} di ${total} completate`,
    month: (current: number, total: number) => `Mese ${current} di ${total}`,
    timeAt: (time: string) => `ore ${time}`,
    // word joiner: l'orario non va a capo sul trattino
    timeRange: (start: string, end: string) => `${start}\u2060–\u2060${end}`,
    meet: "Google Meet",
    /** Voci di "Aggiungi al calendario" (A17, C22). */
    calendarOptions: {
      google: { label: "Google Calendar", hint: "Si apre Google Calendar" },
      apple: { label: "Apple Calendar", hint: "Scarica il file .ics" },
      outlook: { label: "Outlook", hint: "Si apre Outlook sul web" },
      other: { label: "Altro calendario", hint: "Scarica il file .ics" },
    },
    admin: {
      empty: {
        title: "Nessun percorso impostato",
        description:
          "Imposta durata e data di inizio: le date delle sessioni si calcolano da sole.",
        action: "Imposta percorso",
      },
      setupTitle: "Imposta il percorso",
      setupDescription:
        "Scegli durata, data di inizio e composizione. Potrai cambiare le date di ogni sessione.",
      durationTitle: "Durata del percorso",
      durationDescription:
        "Scegli la durata e la data di inizio: le date delle sessioni si calcolano da sole.",
      durationLabel: "Durata",
      startLabel: "Data di inizio",
      endLabel: "Data di fine",
      endCalculated: "(calcolata)",
      durationHint:
        "Con 6 mesi: onboarding + 5 check. Con 1 anno: onboarding + 11 check. I check sono a distanza regolare (circa uno al mese) e l’ultimo cade sulla data di fine.",
      recalcSummary: (recalculated: number, fixed: number) =>
        `${recalculated === 1 ? "1 sessione si ricalcola" : `${recalculated} sessioni si ricalcolano`}${fixed > 0 ? `, ${fixed === 1 ? "1 resta ferma" : `${fixed} restano ferme`} perché ${fixed === 1 ? "l’hai modificata" : "le hai modificate"} a mano` : ""}.`,
      recalcAdded: (n: number) =>
        n === 1 ? "Si aggiunge 1 sessione." : `Si aggiungono ${n} sessioni.`,
      recalcRemoved: (n: number) =>
        n === 1 ? "Si toglie 1 sessione." : `Si tolgono ${n} sessioni.`,
      recalcBlocked:
        "Non puoi accorciare il percorso: tra le sessioni da togliere ce ne sono già completate o saltate.",
      applyDuration: "Aggiorna le date",
      durationSaved: "Percorso aggiornato",
      recalcNote:
        "Se cambi durata o data di inizio, le sessioni che non hai toccato si ricalcolano. Quelle con data modificata a mano restano dove le hai messe.",
      sessionsTitle: "Sessioni",
      sessionsDescription:
        "Tocca un quadrato per vedere la sessione, cambiarne la data o segnarla come completata.",
      sessionsGroup: "Sessioni del percorso",
      modified: "Modificata",
      gift: "Omaggio",
      nextIn: (days: number) =>
        days === 0
          ? "Oggi · Prossima"
          : days === 1
            ? "Prossima · domani"
            : `Prossima · tra ${days} giorni`,
      sessionDate: "Data della sessione",
      sessionTime: "Ora",
      timeOptional: "(facoltativa)",
      calculatedOn: (date: string) => `Calcolata dall’app: ${date}`,
      restore: "Ripristina la data calcolata",
      restored: "Data calcolata ripristinata",
      statusLabel: "Stato",
      noteLabel: "Nota per te",
      noteOptional: "(facoltativa)",
      notePlaceholder: "Per esempio: portare le misure aggiornate",
      save: "Salva modifiche",
      saved: "Sessione salvata",
      sessionDuration: "Durata",
      durationValue: (minutes: number) =>
        minutes === 60 ? "1 ora" : `${minutes} minuti`,
      calendar: "Aggiungi al calendario",
      calendarSummary: (when: string, duration: string, name: string | null) =>
        `${when} · ${duration}${name ? ` · invito a ${name}` : ""}`,
      meeting: {
        title: "Videochiamata",
        none: "Nessun link Meet per questa sessione.",
        sessionOnly: "Link solo per questo check",
        copy: "Copia link",
        copied: "Link copiato",
        copyFailed:
          "Non è stato possibile copiare il link. Selezionalo e copialo a mano.",
        fieldLabel: (name: string) => `Link Google Meet di ${name}`,
        placeholder: "https://meet.google.com/abc-defg-hij",
        hint: "Un link per ogni cliente, usato in tutti i suoi check.",
        missing: (name: string) =>
          `Aggiungi il link Meet di ${name} per inserirlo negli eventi del calendario.`,
        reuseWarning:
          "Riusare lo stesso link per più check è meno sicuro: Google consiglia una stanza nuova per ogni evento. Con il calendario v2.0 il link si creerà da solo per ogni check.",
        saveClient: "Salva link",
        useForSession: "Usa un link solo per questo check",
        useClientLink: (name: string) => `Torna al link di ${name}`,
        savedClient: "Link salvato",
        removedClient: "Link rimosso",
        savedSession: "Link salvato per questo check",
        removedSession: "Il check usa di nuovo il link del cliente",
      },
      notifyNote:
        "Salvando, il cliente riceve una notifica push con la nuova data e ora. Promemoria automatici il giorno prima e la mattina stessa.",
      pushActive: "Notifiche push attive",
      pushInactive: "Notifiche push non attive",
      readOnly: "Percorso concluso, in sola lettura.",
      concludedHeader: (start: string, end: string, days: number) =>
        `Dal ${start} al ${end}. Concluso ${days === 0 ? "oggi" : days === 1 ? "da 1 giorno" : `da ${days} giorni`}, in sola lettura.`,
      extend: "Estendi o riprendi",
      historyTitle: "Percorsi del cliente",
      historyDescription:
        "File, diete e tracking restano del cliente: valgono per tutti i percorsi.",
      historyRange: (duration: string, range: string) =>
        `${duration} · ${range}`,
      active: "Attivo",
      concluded: "Concluso",
      autoStageNotice: (
        previous: number,
        concludedOn: string,
        createdOn: string,
        current: number,
        name: string,
      ) =>
        `Percorso ${previous} concluso il ${concludedOn}. Il ${createdOn} hai creato il Percorso ${current}: ${name} è di nuovo In percorso, in automatico.`,
      compositionSummary: (onboarding: boolean, gift: string, checks: number) =>
        `${onboarding ? "Con onboarding" : "Senza onboarding"}${gift === "added" ? `, con 1 check omaggio aggiunto ai ${checks} check del percorso` : gift === "included" ? `, con 1 check omaggio incluso nei ${checks} check del percorso` : ""}.${gift === "none" ? "" : " Il cliente vede solo “Check”, senza l’etichetta omaggio."}`,
      dialog: {
        title: "Estendi o riprendi il percorso",
        description:
          "Il percorso concluso resta nello storico. Ne parte uno nuovo, collegato a quello.",
        stageNotice: (name: string) =>
          `Creando il nuovo percorso, ${name} torna In percorso in automatico. Il cambio di fase resta nello storico, con data e autore.`,
        compositionLabel: "Come è composto il nuovo percorso",
        onboarding: "Aggiungi l’onboarding",
        onboardingHint:
          "Il primo quadrato è la chiamata di onboarding. Di solito serve a chi riprende dopo molto tempo.",
        giftLabel: "Check omaggio",
        giftModes: {
          none: {
            label: "Nessun check omaggio",
            hint: "Solo i check del percorso.",
          },
          added: {
            label: "Check omaggio aggiunto ai check",
            hint: "Il primo check è gratuito e si somma a quelli del percorso (5 con 6 mesi, 11 con 1 anno).",
          },
          included: {
            label: "Check omaggio incluso nei check",
            hint: "Il check gratuito è uno di quelli del percorso: il cliente ne ha uno a pagamento in meno.",
          },
        },
        endPreview: "Fine:",
        previewTitle: "Anteprima delle date",
        sessionsCount: (n: number) => `${n} sessioni:`,
        summary: (onboarding: boolean, gift: string, checks: number) =>
          `${gift === "added" ? `1 check omaggio + ${checks} check` : gift === "included" ? `${checks} check, di cui 1 omaggio` : `${checks} check`}, ${onboarding ? "con onboarding" : "senza onboarding"}.`,
        suggested: (days: number, threshold: number, within: boolean) =>
          `Suggerito perché il percorso è concluso da ${days} ${days === 1 ? "giorno" : "giorni"} (${within ? "entro" : "oltre"} i ${threshold}). Puoi cambiare tutto.`,
        cancel: "Annulla",
        create: "Crea nuovo percorso",
        createFirst: "Crea percorso",
        confirm: "Confermi la creazione del nuovo percorso?",
        created: "Percorso creato",
      },
      errors: {
        notFound: "Il percorso non esiste o non appartiene al tuo studio.",
        alreadyActive: "Il cliente ha già un percorso attivo.",
        concluded: "Il percorso è concluso: è in sola lettura.",
        previousNotConcluded:
          "Puoi estendere o riprendere solo un percorso concluso.",
        dateRequired: "Inserisci una data valida.",
        dateRange: "Scegli una data entro due anni da oggi.",
        timeInvalid: "Inserisci un’ora valida, per esempio 10:30.",
        noteTooLong: `Massimo ${500} caratteri.`,
        meetingUrlInvalid:
          "Inserisci un link Google Meet come https://meet.google.com/abc-defg-hij, senza altro dopo.",
        meetingUrlRequired: "Inserisci il link Google Meet di questo check.",
      },
    },
    client: {
      title: "Il tuo percorso",
      homeAria: (month: string, next: string | null) =>
        `Il tuo percorso: ${month}${next ? `, prossimo check ${next}` : ""}`,
      nextCheck: "Prossimo check:",
      completedSummary: (done: number, total: number) =>
        `${done} ${done === 1 ? "sessione" : "sessioni"} su ${total} completate`,
      journeyMonth: (n: number, month: string) => `Percorso ${n} · ${month}`,
      start: "Inizio",
      end: "Fine",
      sessionsTitle: "Le tue sessioni",
      sessionsCount: (done: number, total: number) =>
        `${done} su ${total} completate`,
      groupedName: (first: string, last: string) =>
        first === last ? first : `${first} e ${last}`,
      checkRange: (from: number, to: number) =>
        from === to ? `Check ${from}` : `Check ${from}–${to}`,
      lastCheck: "ultimo check",
      addToCalendar: "Aggiungi al calendario",
      joinMeet: "Partecipa su Google Meet",
      calendarSheet: {
        description: (
          name: string,
          studio: string,
          when: string,
          meet: boolean,
        ) =>
          `${name} · ${studio} · ${when}${meet ? ", con il link alla videochiamata su Google Meet" : ""}.`,
        appleHint: "Scarica il file per Apple Calendar",
        dateChangeNote:
          "Se la data cambia ti avvisiamo con una notifica: aggiorna l’evento dallo stesso pulsante.",
        inviteNote:
          "Se hai già ricevuto l’invito da Google Calendar, non serve aggiungerlo.",
        cancel: "Annulla",
      },
      managedNote:
        "Le date le gestisce il tuo nutrizionista: se cambiano, le trovi aggiornate qui.",
      previousTitle: "Percorsi precedenti",
      previousRange: (range: string, duration: string) =>
        `${range} · ${duration}`,
      viewingPrevious: "Percorso concluso, in sola lettura.",
      backToCurrent: "Torna al percorso attuale",
      empty: {
        title: "Nessun percorso impostato",
        description:
          "Quando il tuo nutrizionista imposta il percorso, qui trovi le date dei check.",
      },
      sessionDone: "Completata",
      sessionSkipped: "Saltata",
    },
    /** Push (C21): mai dati sanitari, solo sessione, data e ora. */
    push: {
      dateChangedTitle: "Data del check cambiata",
      dateChangedOnboardingTitle: "Data dell’onboarding cambiata",
      dateChanged: (name: string, date: string, time: string | null) =>
        `${name === "Onboarding" ? "L’onboarding" : `Il ${name}`} si sposta al ${date}${time ? `, alle ${time}` : ""}.`,
      dayBeforeTitle: (name: string) =>
        name === "Onboarding"
          ? "Domani hai l’onboarding"
          : `Domani hai il ${name}`,
      /** "con il Dott. …", "con la Dott.ssa …", "con Elena Verdi". */
      withStaff: (staff: string) =>
        /^(dott|prof|dr)\.?ssa\b/i.test(staff)
          ? `con la ${staff}`
          : /^(dott|prof|dr)\b/i.test(staff)
            ? `con il ${staff}`
            : `con ${staff}`,
      dayBefore: (time: string | null, withStaff: string | null) =>
        time
          ? `Alle ${time}${withStaff ? ` ${withStaff}` : ""}.`
          : withStaff
            ? `${withStaff.charAt(0).toUpperCase()}${withStaff.slice(1)}.`
            : "Lo trovi nella pagina del percorso.",
      sameDayTitle: (name: string) =>
        name === "Onboarding" ? "Oggi hai l’onboarding" : `Oggi hai il ${name}`,
      sameDay: (time: string | null) =>
        `${time ? `Alle ${time}. ` : ""}Puoi aggiungerlo al calendario dalla pagina del percorso.`,
    },
    ics: {
      title: (name: string, studio: string) => `${name} · ${studio}`,
      description:
        "Sessione del tuo percorso. La data la gestisce il tuo nutrizionista.",
      /** "Check 8 · G. Bianchi" (evento dello staff). */
      staffTitle: (name: string, client: string) => `${name} · ${client}`,
      staffDescription: (client: string) =>
        `Sessione del percorso di ${client}.`,
      meetLine: "Videochiamata su Google Meet:",
      /** "30 ottobre 2026, 10:30–11:00" o solo la data. */
      when: (date: string, range: string | null) =>
        range ? `${date}, ${range}` : date,
      fileName: (name: string) =>
        `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`,
    },
  },
  clientNotes: {
    listTitle: "Documenti",
    listLabel: "Documenti del cliente",
    newNote: "Nuova nota",
    visitsHeading: "Note di visita",
    emptyVisits: "Nessuna nota di visita. Aggiungi la prima dopo l'incontro.",
    updated: (day: "today" | "yesterday" | "other", time: string, date: string) =>
      day === "today"
        ? `Aggiornata oggi, ${time}`
        : day === "yesterday"
          ? `Aggiornata ieri, ${time}`
          : `Aggiornata il ${date}`,
    privateBadge: "Solo tu, il cliente non la vede",
    privateList: "Solo tu vedi questi documenti, il cliente no.",
    editorLabel: "Editor di testo",
    titleLabel: "Titolo del documento",
    dateLabel: "Data della visita",
    contentLabel: (title: string) => `Testo di ${title}`,
    insertTemplate: "Inserisci traccia",
    templateInserted: "Traccia aggiunta in fondo al testo",
    save: "Salva",
    status: {
      clean: (day: "today" | "yesterday" | "other", time: string, date: string) =>
        day === "today"
          ? `Salvato, oggi alle ${time}`
          : day === "yesterday"
            ? `Salvato, ieri alle ${time}`
            : `Salvato il ${date}`,
      dirty: "Modifiche non salvate",
      saving: "Salvataggio…",
      failed: "Non salvato, riprova",
    },
    shortcuts:
      "Scorciatoie: Ctrl+B grassetto, Ctrl+I corsivo, Ctrl+Z annulla, Ctrl+S salva",
    leaveWarning: "Hai modifiche non salvate. Vuoi uscire senza salvarle?",
    back: "Torna all'elenco dei documenti",
    moreActions: "Altre azioni",
    delete: "Elimina nota",
    deleteTitle: "Eliminare questa nota?",
    deleteDescription: (title: string, date: string) =>
      `La nota "${title}" del ${date} verrà eliminata definitivamente e non potrai recuperarla.`,
    deleteConfirm: "Elimina",
    cancel: "Annulla",
    deleted: "Nota eliminata",
    conflict: {
      title: "Questa nota è stata modificata da un altro dispositivo",
      description:
        "Ricarica per vedere l'ultima versione, perdendo le modifiche fatte qui, oppure sovrascrivila con la tua.",
      reload: "Ricarica",
      overwrite: "Sovrascrivi comunque",
    },
    toolbar: {
      label: "Formattazione del testo",
      quickLabel: "Formattazione rapida",
      paragraphStyle: (current: string) => `Stile del paragrafo: ${current}`,
      styles: { h2: "Titolo", h3: "Sottotitolo", paragraph: "Testo" },
      bold: "Grassetto",
      italic: "Corsivo",
      highlight: "Evidenzia",
      bulletList: "Elenco puntato",
      orderedList: "Elenco numerato",
      undo: "Annulla",
      redo: "Ripeti",
    },
    errors: {
      titleRequired: "Scrivi un titolo.",
      titleTooLong: "Il titolo può avere al massimo 120 caratteri.",
      dateRequired: "Scegli la data della visita.",
      dateFuture: "La data della visita non può essere nel futuro.",
      contentInvalid:
        "Il testo contiene elementi non supportati. Ricarica la pagina e riprova.",
      contentTooLarge:
        "Il testo è troppo lungo per essere salvato. Dividilo in più note.",
      notFound: "Questa nota non esiste più.",
      anamnesis: "L'anamnesi non si può eliminare.",
    },
  },
} as const;

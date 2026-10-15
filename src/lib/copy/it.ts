/**
 * Testi dell'interfaccia in italiano (DEV-14): nessun testo nei componenti.
 * Le etichette dei valori di dominio sono tipizzate sulle costanti, così un
 * nuovo stato o una nuova fase senza etichetta è un errore di compilazione.
 */
import type {
  AccountStatus,
  AdminNavKey,
  ClientNavKey,
  FileCategory,
  JourneyStage,
  StaffRole,
} from "@/lib/constants/domain";

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
    logoAlt: (studioName: string) => `Logo di ${studioName}`,
  },
  auth: {
    login: {
      title: "Accedi",
      description: "Entra nella tua area riservata.",
      identifierLabel: "Email",
      identifierPlaceholder: "nome@esempio.it",
      passwordLabel: "Password",
      submit: "Accedi",
      submitting: "Accesso in corso…",
      forgotPassword: "Password dimenticata?",
      invalidCredentials: "Email o password non corretti.",
      accountNotEnabled: "Email o password non corretti.",
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
      identifierRequired: "Inserisci la tua email.",
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
      emptyDescription: "L'elenco dei clienti arriverà nella prossima fase.",
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
      onboardingTitle: "Benvenuto!",
      onboardingDescription:
        "Il tuo nutrizionista ti contatterà per la chiamata di onboarding. Dopo la chiamata qui troverai diete, allenamenti, report e tracking.",
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
  manifest: {
    description: (studioName: string) => `L'area riservata di ${studioName}`,
  },
} as const;

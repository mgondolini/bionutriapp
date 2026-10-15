-- =====================================================================
-- Schema iniziale v1.0 – App nutrizionisti (multi-tenant, white label)
--
-- Contenuto: studi, membri (titolare), clienti con stato account e fase
-- del percorso, storico delle fasi, inviti via WhatsApp, file, misure,
-- obiettivi personali, registrazioni di tracking, sottoscrizioni push,
-- RLS su ogni tabella e policy di Storage.
--
-- Le versioni 2.0 (appuntamenti) e 3.0 (collaboratori) sono in
-- supabase/future e NON vengono applicate da `supabase db reset`.
-- =====================================================================

-- Schema privato per funzioni di supporto (NON esposto dalle API)
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- Aggiorna updated_at a ogni modifica
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Vero se fra old e new è cambiata almeno una colonna NON compresa in p_allowed
create or replace function private.changed_outside(p_old jsonb, p_new jsonb, p_allowed text[])
returns boolean language sql immutable set search_path = '' as $$
  select (p_old - p_allowed) is distinct from (p_new - p_allowed);
$$;

-- Normalizzazione leggera del cellulare in formato E.164.
-- La normalizzazione completa avviene nello schema Zod; qui si gestiscono
-- separatori, prefisso 00 e cellulari italiani scritti senza prefisso.
create or replace function private.normalize_phone(p_phone text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '[\s().\-/]', '', 'g');
begin
  if v like '00%' then
    v := '+' || substr(v, 3);
  elsif v ~ '^3[0-9]{8,9}$' then
    v := '+39' || v;                 -- cellulare italiano senza prefisso
  elsif v ~ '^393[0-9]{8,9}$' then
    v := '+' || v;                   -- prefisso 39 senza "+"
  end if;
  return nullif(v, '');
end;
$$;

-- =====================================================================
-- STUDI (tenant)
-- =====================================================================
create table public.studios (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 120),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{3,50}$'),
  logo_path      text,
  primary_color  text not null default '#2E6A4E' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  contact_email  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger studios_updated_at before update on public.studios
  for each row execute function private.set_updated_at();

-- =====================================================================
-- MEMBRI DELLO STUDIO
-- Nella v1.0 esiste solo il titolare ('owner'); la v3.0 aggiungerà
-- 'collaborator' allargando il check, senza rinominare valori.
-- Inserimenti solo lato server (secret key): nessuna policy di scrittura.
-- =====================================================================
create table public.studio_members (
  studio_id     uuid not null references public.studios(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'owner' constraint studio_members_role_check check (role in ('owner')),
  display_name  text not null check (char_length(display_name) between 1 and 120),
  created_at    timestamptz not null default now(),
  primary key (studio_id, user_id)
);
create index studio_members_user_idx on public.studio_members (user_id);

-- =====================================================================
-- CLIENTI (entità dello studio, esiste anche prima dell'account)
-- =====================================================================
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  -- collegamento all'account: valorizzato solo all'attivazione dell'invito
  user_id         uuid unique references auth.users(id) on delete set null,
  first_name      text not null check (char_length(first_name) between 1 and 80),
  last_name       text check (last_name is null or char_length(last_name) <= 80),
  phone           text not null,   -- E.164, normalizzato dal trigger
  email           text,            -- facoltativa, salvata in minuscolo
  -- 'imported' = cliente già nel database (CSV o "Con dati completi"); 'new' = solo nome e cellulare
  origin          text not null check (origin in ('imported', 'new')),
  -- 'invite_expired' NON si salva: si calcola (vedi clients_with_status)
  account_status  text not null default 'to_invite'
                  check (account_status in ('to_invite', 'invited', 'active', 'disabled')),
  -- impostata dal trigger in base all'origine alla creazione
  journey_stage   text not null default 'onboarding'
                  check (journey_stage in ('onboarding', 'in_progress', 'paused', 'completed')),
  activated_at    timestamptz,
  push_enabled    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint clients_phone_e164 check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  constraint clients_email_format check (
    email is null or (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  constraint clients_active_requires_account check (
    account_status <> 'active' or (user_id is not null and activated_at is not null)
  )
);
create index clients_studio_idx on public.clients (studio_id, journey_stage, account_status);
create unique index clients_studio_phone_uq on public.clients (studio_id, phone);
create unique index clients_studio_email_uq on public.clients (studio_id, email) where email is not null;

-- =====================================================================
-- STORICO DELLE FASI DEL PERCORSO (ST-04) – popolato solo dal trigger
-- =====================================================================
create table public.client_stage_events (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  from_stage  text check (from_stage in ('onboarding', 'in_progress', 'paused', 'completed')),  -- null = creazione
  to_stage    text not null check (to_stage in ('onboarding', 'in_progress', 'paused', 'completed')),
  changed_at  timestamptz not null default now(),
  changed_by  uuid references auth.users(id) on delete set null,  -- autore (null se automatico)
  source      text not null check (source in ('manual', 'automatic'))
);
create index client_stage_events_client_idx on public.client_stage_events (client_id, changed_at desc);

-- =====================================================================
-- INVITI VIA WHATSAPP (N-01, N-02)
-- =====================================================================
create table public.client_invites (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  token_hash  text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),  -- SHA-256, mai il token in chiaro
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',     -- forzata dal trigger
  sent_at     timestamptz,                                                 -- invio su WhatsApp
  used_at     timestamptz,
  revoked_at  timestamptz,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  constraint client_invites_used_or_revoked check (used_at is null or revoked_at is null)
);
create index client_invites_client_idx on public.client_invites (client_id, created_at desc);
-- Al massimo un invito aperto (né usato né revocato) per cliente
create unique index client_invites_one_open_uq on public.client_invites (client_id)
  where used_at is null and revoked_at is null;

-- =====================================================================
-- FILE DEI CLIENTI (diete, allenamenti, report)
-- =====================================================================
create table public.client_files (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references public.studios(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  category       text not null check (category in ('diet', 'workout', 'report')),
  title          text not null check (char_length(title) between 1 and 150),
  storage_path   text not null unique,  -- {studio_id}/{client_id}/{uuid}.pdf nel bucket client-files
  size_bytes     bigint not null check (size_bytes between 1 and 10485760),
  valid_from     date,
  note           text check (note is null or char_length(note) <= 1000),
  uploaded_by    uuid references auth.users(id) on delete set null default auth.uid(),
  uploaded_at    timestamptz not null default now(),
  first_read_at  timestamptz,           -- solo tramite public.mark_file_read
  constraint client_files_storage_path check (
    storage_path ~ ('^' || studio_id::text || '/' || client_id::text || '/[0-9a-f-]{36}\.pdf$')
  )
);
create index client_files_client_idx on public.client_files (client_id, category, uploaded_at desc);

-- =====================================================================
-- MISURE CONFIGURABILI PER STUDIO
-- =====================================================================
create table public.metrics (
  id            uuid primary key default gen_random_uuid(),
  studio_id     uuid not null references public.studios(id) on delete cascade,
  key           text not null check (key ~ '^[a-z0-9_]{2,40}$'),
  name          text not null check (char_length(name) between 1 and 60),
  unit          text,
  value_type    text not null check (value_type in ('decimal', 'score_1_5', 'score_1_10')),
  frequency     text not null check (frequency in ('monthly_30d', 'daily', 'per_session')),
  min_value     numeric not null,
  max_value     numeric not null,
  icon          text not null default 'activity',  -- nome icona lucide
  instructions  text,
  sort_order    int not null default 0,
  default_goal  numeric check (default_goal is null or default_goal > 0),  -- obiettivo predefinito dello studio
  goal_unit     text,                                                     -- unità dell'obiettivo (L, passi, ore)
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (studio_id, key),
  constraint metrics_range check (min_value < max_value),
  constraint metrics_score_1_5 check (value_type <> 'score_1_5' or (min_value >= 1 and max_value <= 5)),
  constraint metrics_score_1_10 check (value_type <> 'score_1_10' or (min_value >= 1 and max_value <= 10)),
  -- gli obiettivi riguardano solo le abitudini giornaliere
  constraint metrics_goal_daily check (default_goal is null or frequency = 'daily'),
  constraint metrics_goal_unit check ((default_goal is null) = (goal_unit is null))
);

create trigger metrics_updated_at before update on public.metrics
  for each row execute function private.set_updated_at();

-- =====================================================================
-- OBIETTIVI PERSONALI DEL CLIENTE (T-07)
-- =====================================================================
create table public.client_metric_goals (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  metric_id   uuid not null references public.metrics(id) on delete cascade,
  goal_value  numeric not null check (goal_value > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, metric_id)
);

create trigger client_metric_goals_updated_at before update on public.client_metric_goals
  for each row execute function private.set_updated_at();

-- =====================================================================
-- REGISTRAZIONI DI TRACKING
-- =====================================================================
create table public.tracking_entries (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studios(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  metric_id    uuid not null references public.metrics(id) on delete restrict,
  value        numeric(10, 2) not null,
  recorded_on  date not null,
  note         text check (note is null or char_length(note) <= 500),  -- solo per gli allenamenti
  -- copiato dalla misura dal trigger: serve all'indice "un valore al giorno"
  is_daily     boolean not null default false,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tracking_entries_lookup_idx
  on public.tracking_entries (client_id, metric_id, recorded_on desc);
-- Un solo valore al giorno per le abitudini giornaliere (passi, sonno, acqua)
create unique index tracking_entries_daily_uq
  on public.tracking_entries (client_id, metric_id, recorded_on) where is_daily;

-- =====================================================================
-- SOTTOSCRIZIONI WEB PUSH
-- =====================================================================
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- =====================================================================
-- FUNZIONI DI SUPPORTO PER LE POLICY (security definer, schema privato)
-- =====================================================================
create or replace function private.is_studio_member(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.studio_members
     where studio_id = p_studio and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_studio_owner(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.studio_members
     where studio_id = p_studio and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

create or replace function private.my_studio_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select studio_id from public.studio_members where user_id = (select auth.uid());
$$;

-- Cliente dell'utente corrente, solo se l'account è attivo
create or replace function private.my_client_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.clients
   where user_id = (select auth.uid()) and account_status = 'active';
$$;

create or replace function private.my_client_studio_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select studio_id from public.clients
   where user_id = (select auth.uid()) and account_status = 'active';
$$;

-- Cliente dell'utente corrente con file e tracking sbloccati (C-09):
-- account attivo e fase diversa da Onboarding
create or replace function private.my_unlocked_client_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.clients
   where user_id = (select auth.uid())
     and account_status = 'active'
     and journey_stage <> 'onboarding';
$$;

-- Il cliente può registrare misure solo In percorso
-- (In pausa e Concluso = sola lettura; Onboarding = nessun accesso)
create or replace function private.my_client_can_track()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clients
     where user_id = (select auth.uid())
       and account_status = 'active'
       and journey_stage = 'in_progress'
  );
$$;

-- Data di oggi in Italia (non UTC): tutti gli studi della v1.0 sono italiani.
-- Se servirà un fuso per studio, si aggiungerà una colonna con una migrazione.
create or replace function private.today_rome()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Rome')::date;
$$;

-- =====================================================================
-- TRIGGER: STUDI
-- =====================================================================

-- Dall'app il titolare modifica solo i dati di branding
create or replace function private.guard_studio()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (select auth.uid()) is not null
     and private.changed_outside(to_jsonb(old), to_jsonb(new),
           array['name', 'logo_path', 'primary_color', 'contact_email', 'updated_at']) then
    raise exception 'Si possono modificare solo nome, logo, colore ed email dello studio';
  end if;
  return new;
end;
$$;

create trigger studios_guard before update on public.studios
  for each row execute function private.guard_studio();

-- Misure predefinite create automaticamente per ogni nuovo studio
create or replace function private.seed_default_metrics()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.metrics
    (studio_id, key, name, unit, value_type, frequency, min_value, max_value, icon, instructions, sort_order, default_goal, goal_unit)
  values
    -- DA CONFERMARE: limiti minimi e massimi delle circonferenze
    (new.id, 'circ_waist',     'Circ. Vita',       'cm', 'decimal', 'monthly_30d', 10, 250, 'ruler', 'Ogni 30 giorni inseriscila qui', 10, null, null),
    (new.id, 'circ_navel',     'Circ. Ombelicale', 'cm', 'decimal', 'monthly_30d', 10, 250, 'ruler', 'Ogni 30 giorni inseriscila qui', 20, null, null),
    (new.id, 'circ_glutes',    'Circ. Gluteo',     'cm', 'decimal', 'monthly_30d', 10, 250, 'ruler', 'Ogni 30 giorni inseriscila qui', 30, null, null),
    (new.id, 'circ_right_leg', 'Circ. Gamba dx',   'cm', 'decimal', 'monthly_30d', 10, 150, 'ruler', 'Ogni 30 giorni inseriscila qui', 40, null, null),
    (new.id, 'circ_right_arm', 'Circ. Braccio dx', 'cm', 'decimal', 'monthly_30d', 10, 100, 'ruler', 'Ogni 30 giorni inseriscila qui', 50, null, null),
    -- DA CONFERMARE: obiettivi predefiniti 8.000 passi / 7 ore / 2 L
    (new.id, 'steps', 'Passi', 'voto', 'score_1_5', 'daily', 1, 5, 'footprints',
       'Quanto ti sei avvicinato oggi al tuo obiettivo di passi?', 60, 8000, 'passi'),
    (new.id, 'sleep', 'Sonno', 'voto', 'score_1_5', 'daily', 1, 5, 'moon',
       'Come hai dormito stanotte rispetto al tuo obiettivo?', 70, 7, 'ore'),
    (new.id, 'water', 'Acqua', 'voto', 'score_1_5', 'daily', 1, 5, 'glass-water',
       'Quanta acqua hai bevuto oggi rispetto al tuo obiettivo?', 80, 2, 'L'),
    (new.id, 'workouts', 'Allenamenti', 'voto', 'score_1_10', 'per_session', 1, 10, 'dumbbell',
       'Voto alla qualità/performance dell''allenamento', 90, null, null)
  on conflict (studio_id, key) do nothing;
  return new;
end;
$$;

create trigger studios_seed_metrics after insert on public.studios
  for each row execute function private.seed_default_metrics();

-- =====================================================================
-- TRIGGER: CLIENTI
-- I trigger BEFORE scattano in ordine alfabetico: prima la
-- normalizzazione, poi i controlli, infine updated_at.
-- =====================================================================

-- Cellulare in E.164, email in minuscolo, spazi rimossi
create or replace function private.normalize_client()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.first_name := trim(new.first_name);
  new.last_name  := nullif(trim(new.last_name), '');
  new.email      := nullif(lower(trim(new.email)), '');
  new.phone      := private.normalize_phone(new.phone);
  return new;
end;
$$;

-- Regole su chi può modificare cosa.
-- auth.uid() nullo = operazione lato server (secret key, seed, RPC di attivazione): libera.
create or replace function private.guard_client()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- fase iniziale: i clienti già nel database partono In percorso, i nuovi da Onboarding
    new.journey_stage := case new.origin when 'imported' then 'in_progress' else 'onboarding' end;

    if (select auth.uid()) is not null then
      if new.user_id is not null or new.activated_at is not null then
        raise exception 'L''account si collega al cliente solo con l''attivazione dell''invito';
      end if;
      new.account_status := 'to_invite';
    end if;
    return new;
  end if;

  if new.studio_id <> old.studio_id then
    raise exception 'Non è possibile spostare un cliente in un altro studio';
  end if;

  if (select auth.uid()) is null then
    return new;
  end if;

  -- Staff: tutto tranne il collegamento all'account
  if private.is_studio_member(old.studio_id) then
    if new.user_id is distinct from old.user_id or new.activated_at is distinct from old.activated_at then
      raise exception 'Il collegamento all''account non si modifica manualmente';
    end if;
    return new;
  end if;

  -- Cliente su sé stesso: solo nome, cognome e preferenza notifiche
  if private.changed_outside(to_jsonb(old), to_jsonb(new),
       array['first_name', 'last_name', 'push_enabled', 'updated_at']) then
    raise exception 'Puoi modificare solo nome, cognome e preferenze di notifica';
  end if;
  return new;
end;
$$;

create trigger clients_10_normalize before insert or update on public.clients
  for each row execute function private.normalize_client();

create trigger clients_20_guard before insert or update on public.clients
  for each row execute function private.guard_client();

create trigger clients_30_updated_at before update on public.clients
  for each row execute function private.set_updated_at();

-- Storico delle fasi (ST-04): ogni inserimento e ogni cambio di journey_stage.
-- Origine 'automatic' se l'operazione è lato server (auth.uid() nullo) oppure
-- se la transazione imposta app.stage_source = 'automatic' (es. v2.0, CAL-14).
create or replace function private.log_stage_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_automatic boolean :=
    (select auth.uid()) is null
    or coalesce(current_setting('app.stage_source', true), '') = 'automatic';
begin
  if tg_op = 'INSERT' or new.journey_stage is distinct from old.journey_stage then
    insert into public.client_stage_events (studio_id, client_id, from_stage, to_stage, changed_at, changed_by, source)
    values (
      new.studio_id,
      new.id,
      case when tg_op = 'UPDATE' then old.journey_stage end,
      new.journey_stage,
      clock_timestamp(),  -- più cambi nella stessa transazione restano ordinati
      case when v_automatic then null else (select auth.uid()) end,
      case when v_automatic then 'automatic' else 'manual' end
    );
  end if;
  return null;
end;
$$;

create trigger clients_log_stage after insert or update of journey_stage on public.clients
  for each row execute function private.log_stage_change();

-- Disattivando un cliente si revocano gli inviti ancora aperti
create or replace function private.revoke_invites_on_disable()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.client_invites
     set revoked_at = now()
   where client_id = new.id and used_at is null and revoked_at is null;
  return null;
end;
$$;

create trigger clients_revoke_invites_on_disable after update of account_status on public.clients
  for each row when (new.account_status = 'disabled' and old.account_status <> 'disabled')
  execute function private.revoke_invites_on_disable();

-- =====================================================================
-- TRIGGER: TABELLE FIGLIE DEL CLIENTE
-- =====================================================================

-- Lo studio_id viene sempre ricavato dal cliente: impossibile falsificarlo
create or replace function private.set_studio_from_client()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_studio uuid;
begin
  select studio_id into v_studio from public.clients where id = new.client_id;
  if v_studio is null then
    raise exception 'Cliente non trovato';
  end if;
  new.studio_id := v_studio;
  return new;
end;
$$;

-- --- client_invites -------------------------------------------------

-- Nuovo invito: scadenza a 14 giorni, revoca degli inviti precedenti
-- nella stessa transazione, cliente segnato come "Invito inviato".
create or replace function private.prepare_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
begin
  -- blocca la riga del cliente: due inviti contemporanei vengono serializzati
  select account_status into v_status from public.clients where id = new.client_id for update;
  if v_status = 'disabled' then
    raise exception 'Il cliente è disattivato: riattivalo prima di inviare un invito';
  end if;

  new.created_at := now();
  new.expires_at := new.created_at + interval '14 days';
  new.used_at    := null;
  new.revoked_at := null;
  new.created_by := (select auth.uid());

  update public.client_invites
     set revoked_at = now()
   where client_id = new.client_id and used_at is null and revoked_at is null;

  -- un cliente attivo resta attivo: il nuovo link serve a reimpostare la password (N-02)
  if v_status = 'to_invite' then
    update public.clients set account_status = 'invited' where id = new.client_id;
  end if;
  return new;
end;
$$;

-- Dall'app si registrano solo l'invio e la revoca; l'utilizzo passa da activate_client
create or replace function private.guard_invite_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'Un invito revocato non può essere riattivato';
  end if;
  if (select auth.uid()) is not null
     and private.changed_outside(to_jsonb(old), to_jsonb(new), array['sent_at', 'revoked_at']) then
    raise exception 'Dell''invito si possono modificare solo data di invio e revoca';
  end if;
  return new;
end;
$$;

create trigger client_invites_10_set_studio before insert or update on public.client_invites
  for each row execute function private.set_studio_from_client();

create trigger client_invites_20_prepare before insert on public.client_invites
  for each row execute function private.prepare_invite();

create trigger client_invites_20_guard before update on public.client_invites
  for each row execute function private.guard_invite_update();

-- --- client_files ---------------------------------------------------

-- Lo staff modifica solo i metadati; first_read_at solo tramite mark_file_read
create or replace function private.guard_file_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.first_read_at is distinct from old.first_read_at
     and coalesce(current_setting('app.mark_file_read', true), '') <> 'on' then
    raise exception 'La data di lettura si imposta solo all''apertura del file da parte del cliente';
  end if;
  if private.changed_outside(to_jsonb(old), to_jsonb(new),
       array['category', 'title', 'valid_from', 'note', 'first_read_at']) then
    raise exception 'Del file si possono modificare solo categoria, titolo, validità e nota';
  end if;
  return new;
end;
$$;

create trigger client_files_10_set_studio before insert or update on public.client_files
  for each row execute function private.set_studio_from_client();

create trigger client_files_20_guard before update on public.client_files
  for each row execute function private.guard_file_update();

-- --- metrics --------------------------------------------------------

-- Tipo e frequenza non cambiano se esistono già registrazioni
create or replace function private.guard_metric_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.studio_id <> old.studio_id then
    raise exception 'Non è possibile spostare una misura in un altro studio';
  end if;
  if (new.value_type, new.frequency, new.key) is distinct from (old.value_type, old.frequency, old.key)
     and exists (select 1 from public.tracking_entries where metric_id = old.id) then
    raise exception 'Chiave, tipo e frequenza non si modificano se la misura ha già registrazioni';
  end if;
  return new;
end;
$$;

create trigger metrics_guard before update on public.metrics
  for each row execute function private.guard_metric_update();

-- --- client_metric_goals --------------------------------------------

create or replace function private.validate_metric_goal()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_studio uuid;
begin
  select studio_id into v_studio from public.clients where id = new.client_id;
  if v_studio is null then
    raise exception 'Cliente non trovato';
  end if;
  if not exists (
    select 1 from public.metrics
     where id = new.metric_id and studio_id = v_studio and frequency = 'daily'
  ) then
    raise exception 'Gli obiettivi si impostano solo sulle abitudini giornaliere dello studio';
  end if;
  new.studio_id := v_studio;
  return new;
end;
$$;

create trigger client_metric_goals_validate before insert or update on public.client_metric_goals
  for each row execute function private.validate_metric_goal();

-- --- tracking_entries (T-04) ----------------------------------------

create or replace function private.validate_tracking_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_studio uuid;
  m public.metrics%rowtype;
begin
  select studio_id into v_studio from public.clients where id = new.client_id;
  if v_studio is null then
    raise exception 'Cliente non trovato';
  end if;

  select * into m from public.metrics where id = new.metric_id;
  if m.id is null or m.studio_id <> v_studio or not m.is_active then
    raise exception 'Misura non valida per questo cliente';
  end if;

  if new.value < m.min_value or new.value > m.max_value then
    raise exception 'Il valore deve essere compreso tra % e %', m.min_value, m.max_value
      using errcode = 'check_violation';
  end if;
  if m.value_type in ('score_1_5', 'score_1_10') and new.value <> trunc(new.value) then
    raise exception 'Il voto deve essere un numero intero' using errcode = 'check_violation';
  end if;
  if new.recorded_on > private.today_rome() then
    raise exception 'La data non può essere nel futuro' using errcode = 'check_violation';
  end if;
  new.note := nullif(trim(new.note), '');
  if new.note is not null and m.frequency <> 'per_session' then
    raise exception 'La nota è prevista solo per gli allenamenti' using errcode = 'check_violation';
  end if;

  new.is_daily  := m.frequency = 'daily';
  new.studio_id := v_studio;
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger tracking_entries_10_validate before insert or update on public.tracking_entries
  for each row execute function private.validate_tracking_entry();

create trigger tracking_entries_20_updated_at before update on public.tracking_entries
  for each row execute function private.set_updated_at();

-- =====================================================================
-- VISTA: STATO ACCOUNT CALCOLATO
-- security_invoker: rispetta la RLS di chi interroga
-- =====================================================================
create view public.clients_with_status with (security_invoker = true) as
select
  c.*,
  case
    when c.account_status = 'invited'
     and (li.id is null or li.used_at is not null or li.revoked_at is not null or li.expires_at <= now())
    then 'invite_expired'
    else c.account_status
  end                as effective_account_status,
  li.created_at      as last_invite_created_at,
  li.sent_at         as last_invite_sent_at,
  li.expires_at      as last_invite_expires_at
from public.clients c
left join lateral (
  select i.id, i.created_at, i.sent_at, i.expires_at, i.used_at, i.revoked_at
    from public.client_invites i
   where i.client_id = c.id
   order by i.created_at desc
   limit 1
) li on true;

-- =====================================================================
-- FUNZIONI PUBBLICHE (RPC)
-- =====================================================================

-- Stato account calcolato di un cliente (include 'invite_expired')
create or replace function public.client_account_status(p_client_id uuid)
returns text language sql stable security invoker set search_path = '' as $$
  select effective_account_status from public.clients_with_status where id = p_client_id;
$$;
revoke execute on function public.client_account_status(uuid) from public, anon;
grant execute on function public.client_account_status(uuid) to authenticated, service_role;

-- Chi sono? Usata dal proxy e da getSession() per instradare admin / cliente.
-- Ruoli: quello in studio_members ('owner'), 'client' (account attivo) oppure
-- 'client_disabled' (account sospeso: serve a mostrare "Accesso sospeso" con
-- il nome dello studio, che la RLS altrimenti nasconderebbe).
create or replace function public.my_context()
returns table (role text, studio_id uuid, studio_slug text, client_id uuid)
language sql stable security definer set search_path = '' as $$
  select sm.role, sm.studio_id, s.slug, null::uuid
    from public.studio_members sm
    join public.studios s on s.id = sm.studio_id
   where sm.user_id = (select auth.uid())
  union all
  select case c.account_status when 'active' then 'client' else 'client_disabled' end,
         c.studio_id, s.slug, c.id
    from public.clients c
    join public.studios s on s.id = c.studio_id
   where c.user_id = (select auth.uid()) and c.account_status in ('active', 'disabled');
$$;
revoke execute on function public.my_context() from public, anon;
grant execute on function public.my_context() to authenticated;

-- Branding pubblico per la pagina di login (prima dell'autenticazione)
create or replace function public.get_studio_branding(p_slug text)
returns table (id uuid, slug text, name text, logo_path text, primary_color text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.slug, s.name, s.logo_path, s.primary_color
    from public.studios s
   where s.slug = p_slug;
$$;
grant execute on function public.get_studio_branding(text) to anon, authenticated;

-- Il cliente segna un file come letto (C-05): solo first_read_at, solo la prima volta
create or replace function public.mark_file_read(p_file_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_read_at timestamptz;
begin
  perform set_config('app.mark_file_read', 'on', true);
  update public.client_files
     set first_read_at = now()
   where id = p_file_id
     and client_id = private.my_unlocked_client_id()
     and first_read_at is null
  returning first_read_at into v_read_at;
  perform set_config('app.mark_file_read', '', true);
  return v_read_at;
end;
$$;
revoke execute on function public.mark_file_read(uuid) from public, anon;
grant execute on function public.mark_file_read(uuid) to authenticated;

-- Attivazione dall'invito (solo lato server, secret key): segna l'invito come usato,
-- collega l'utente e attiva l'account in un'unica transazione. Usata anche per il
-- nuovo link a un cliente già attivo (N-02). Restituisce l'id del cliente.
create or replace function public.activate_client(p_token_hash text, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.client_invites%rowtype;
  v_client public.clients%rowtype;
begin
  select * into v_invite from public.client_invites where token_hash = p_token_hash for update;
  if v_invite.id is null or v_invite.used_at is not null or v_invite.revoked_at is not null
     or v_invite.expires_at <= now() then
    raise exception 'Invito non valido o scaduto';
  end if;

  select * into v_client from public.clients where id = v_invite.client_id for update;
  if v_client.account_status = 'disabled' then
    raise exception 'Account disattivato';
  end if;
  if v_client.user_id is not null and v_client.user_id <> p_user_id then
    raise exception 'Il cliente è già collegato a un altro account';
  end if;

  update public.client_invites set used_at = now() where id = v_invite.id;
  update public.clients
     set user_id = p_user_id,
         account_status = 'active',
         activated_at = coalesce(activated_at, now())
   where id = v_client.id;
  return v_client.id;
end;
$$;
revoke execute on function public.activate_client(text, uuid) from public, anon, authenticated;
grant execute on function public.activate_client(text, uuid) to service_role;

-- Registra la sottoscrizione push del browser corrente. Se l'endpoint era
-- di un altro utente (stesso browser, account diverso) passa all'utente corrente.
create or replace function public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Utente non autenticato';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY (NF-01)
-- =====================================================================
alter table public.studios              enable row level security;
alter table public.studio_members       enable row level security;
alter table public.clients              enable row level security;
alter table public.client_stage_events  enable row level security;
alter table public.client_invites       enable row level security;
alter table public.client_files         enable row level security;
alter table public.metrics              enable row level security;
alter table public.client_metric_goals  enable row level security;
alter table public.tracking_entries     enable row level security;
alter table public.push_subscriptions   enable row level security;

-- Il ruolo anon non accede ad alcuna tabella (il branding passa da get_studio_branding)
revoke all on public.studios, public.studio_members, public.clients, public.client_stage_events,
  public.client_invites, public.client_files, public.metrics, public.client_metric_goals,
  public.tracking_entries, public.push_subscriptions, public.clients_with_status
  from anon;

-- STUDIOS (creazione solo lato server)
create policy "studios: lettura staff e clienti" on public.studios
  for select to authenticated
  using (private.is_studio_member(id) or id = private.my_client_studio_id());

create policy "studios: modifica titolare" on public.studios
  for update to authenticated
  using (private.is_studio_owner(id))
  with check (private.is_studio_owner(id));

-- STUDIO_MEMBERS (scritture solo lato server)
create policy "members: lettura colleghi" on public.studio_members
  for select to authenticated
  using (private.is_studio_member(studio_id));

-- CLIENTS
create policy "clients: staff gestisce" on public.clients
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "clients: cliente legge sé stesso" on public.clients
  for select to authenticated
  using (id = private.my_client_id());

-- campi modificabili limitati dal trigger guard_client
create policy "clients: cliente modifica il proprio profilo" on public.clients
  for update to authenticated
  using (id = private.my_client_id())
  with check (id = private.my_client_id());

-- CLIENT_STAGE_EVENTS (scritture solo dal trigger)
create policy "stage events: staff legge" on public.client_stage_events
  for select to authenticated
  using (private.is_studio_member(studio_id));

-- CLIENT_INVITES (mai leggibili dal cliente né da anon)
create policy "invites: staff legge" on public.client_invites
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "invites: staff crea" on public.client_invites
  for insert to authenticated
  with check (private.is_studio_member(studio_id));

create policy "invites: staff modifica" on public.client_invites
  for update to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

-- CLIENT_FILES (il cliente legge soltanto, non in Onboarding; first_read_at tramite mark_file_read)
create policy "files: staff gestisce" on public.client_files
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "files: cliente legge i propri" on public.client_files
  for select to authenticated
  using (client_id = private.my_unlocked_client_id());

-- METRICS
create policy "metrics: staff gestisce" on public.metrics
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "metrics: cliente legge quelle attive" on public.metrics
  for select to authenticated
  using (studio_id = private.my_client_studio_id() and is_active);

-- CLIENT_METRIC_GOALS
create policy "goals: staff gestisce" on public.client_metric_goals
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "goals: cliente legge i propri" on public.client_metric_goals
  for select to authenticated
  using (client_id = private.my_unlocked_client_id());

-- TRACKING_ENTRIES
create policy "tracking: staff gestisce" on public.tracking_entries
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "tracking: cliente legge le proprie" on public.tracking_entries
  for select to authenticated
  using (client_id = private.my_unlocked_client_id());

create policy "tracking: cliente crea le proprie" on public.tracking_entries
  for insert to authenticated
  with check (client_id = private.my_client_id() and private.my_client_can_track());

create policy "tracking: cliente modifica le proprie" on public.tracking_entries
  for update to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_track())
  with check (client_id = private.my_client_id() and private.my_client_can_track());

create policy "tracking: cliente elimina le proprie" on public.tracking_entries
  for delete to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_track());

-- PUSH_SUBSCRIPTIONS
create policy "push: utente gestisce le proprie" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- =====================================================================
-- STORAGE
-- =====================================================================

-- File dei clienti: bucket privato, solo PDF, max 10 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Asset degli studi (loghi): bucket pubblico in lettura.
-- Solo PNG e JPEG: sono i formati che le icone della PWA sanno disegnare,
-- e un SVG pubblico potrebbe contenere script.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-assets', 'studio-assets', true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Percorso valido {studio_id}/{client_id}/{uuid}.pdf di un cliente dello studio dell'utente
create or replace function private.is_staff_client_file_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'
     and exists (
       select 1 from public.clients c
        where c.studio_id::text = split_part(p_name, '/', 1)
          and c.id::text        = split_part(p_name, '/', 2)
          and private.is_studio_member(c.studio_id)
     );
$$;

create policy "storage client-files: staff legge" on storage.objects
  for select to authenticated
  using (bucket_id = 'client-files' and private.is_staff_client_file_path(name));

create policy "storage client-files: staff carica" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-files' and private.is_staff_client_file_path(name));

create policy "storage client-files: staff modifica" on storage.objects
  for update to authenticated
  using (bucket_id = 'client-files' and private.is_staff_client_file_path(name))
  with check (bucket_id = 'client-files' and private.is_staff_client_file_path(name));

create policy "storage client-files: staff elimina" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-files' and private.is_staff_client_file_path(name));

create policy "storage client-files: cliente legge i propri" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-files'
    and split_part(name, '/', 1) = private.my_client_studio_id()::text
    and split_part(name, '/', 2) = private.my_unlocked_client_id()::text
  );

-- Percorso loghi: {studio_id}/<file> – solo il titolare scrive (lettura pubblica dal bucket)
create or replace function private.is_studio_owner_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.studio_members
     where studio_id::text = split_part(p_name, '/', 1)
       and user_id = (select auth.uid())
       and role = 'owner'
  );
$$;

create policy "storage studio-assets: titolare carica" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'studio-assets'
    and private.is_studio_owner_path(name)
  );

create policy "storage studio-assets: titolare modifica" on storage.objects
  for update to authenticated
  using (bucket_id = 'studio-assets' and private.is_studio_owner_path(name))
  with check (bucket_id = 'studio-assets' and private.is_studio_owner_path(name));

create policy "storage studio-assets: titolare elimina" on storage.objects
  for delete to authenticated
  using (bucket_id = 'studio-assets' and private.is_studio_owner_path(name));

create policy "storage studio-assets: titolare legge" on storage.objects
  for select to authenticated
  using (bucket_id = 'studio-assets' and private.is_studio_owner_path(name));

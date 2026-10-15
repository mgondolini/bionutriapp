-- =====================================================================
-- Schema iniziale – App nutrizionisti (multi-tenant, white label)
-- Da salvare in: supabase/migrations/20261011000000_schema_iniziale.sql
-- =====================================================================

-- Schema privato per funzioni di supporto (NON esposto dalle API)
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- STUDI (tenant)
-- =====================================================================
create table public.studios (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
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
-- MEMBRI DELLO STUDIO (nutrizionisti / admin)
-- =====================================================================
create table public.studio_members (
  studio_id     uuid not null references public.studios(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'nutritionist' check (role in ('owner', 'nutritionist')),
  display_name  text not null,
  created_at    timestamptz not null default now(),
  primary key (studio_id, user_id)
);
create index studio_members_user_idx on public.studio_members (user_id);

-- =====================================================================
-- CLIENTI (entità di business, esiste anche prima dell'account)
-- =====================================================================
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  user_id         uuid unique references auth.users(id) on delete set null,
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  account_status  text not null default 'pending'
                  check (account_status in ('pending', 'invited', 'active', 'disabled')),
  activated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint clients_contact_required check (email is not null or phone is not null)
);
create index clients_studio_idx on public.clients (studio_id);
create unique index clients_studio_email_uq on public.clients (studio_id, lower(email)) where email is not null;
create unique index clients_studio_phone_uq on public.clients (studio_id, phone) where phone is not null;

create trigger clients_updated_at before update on public.clients
  for each row execute function private.set_updated_at();

-- =====================================================================
-- INVITI / CODICI DI ACCESSO
-- =====================================================================
create table public.client_invites (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  channel     text not null check (channel in ('email', 'code')),
  code_hash   text,                       -- solo hash, mai il codice in chiaro
  expires_at  timestamptz not null default now() + interval '14 days',
  used_at     timestamptz,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint invites_code_hash_required check (channel <> 'code' or code_hash is not null)
);
create index client_invites_client_idx on public.client_invites (client_id);

-- =====================================================================
-- FILE DEI CLIENTI (diete, allenamenti, report)
-- =====================================================================
create table public.client_files (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references public.studios(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  category       text not null check (category in ('diet', 'workout', 'report')),
  title          text not null check (char_length(title) between 1 and 150),
  storage_path   text not null unique,    -- {studio_id}/{client_id}/{uuid}.pdf
  mime_type      text not null default 'application/pdf',
  size_bytes     bigint not null check (size_bytes > 0),
  valid_from     date,
  client_note    text check (client_note is null or char_length(client_note) <= 1000),
  uploaded_by    uuid references auth.users(id) on delete set null default auth.uid(),
  first_read_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index client_files_client_idx on public.client_files (client_id, category, created_at desc);

-- =====================================================================
-- MISURE CONFIGURABILI PER STUDIO
-- =====================================================================
create table public.metrics (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  key             text not null check (key ~ '^[a-z0-9_]{2,40}$'),
  name            text not null,
  instructions    text,
  unit            text,
  value_type      text not null check (value_type in ('decimal', 'integer', 'score')),
  frequency_days  int check (frequency_days > 0),   -- null = una registrazione per evento
  min_value       numeric,
  max_value       numeric,
  icon            text not null default 'activity',  -- nome icona lucide
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (studio_id, key),
  check (min_value is null or max_value is null or min_value <= max_value)
);

create trigger metrics_updated_at before update on public.metrics
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
  recorded_on  date not null default current_date,
  note         text check (note is null or char_length(note) <= 500),
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tracking_entries_lookup_idx
  on public.tracking_entries (client_id, metric_id, recorded_on desc);

create trigger tracking_entries_updated_at before update on public.tracking_entries
  for each row execute function private.set_updated_at();

-- =====================================================================
-- SOTTOSCRIZIONI PUSH
-- =====================================================================
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
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
    where studio_id = p_studio and user_id = auth.uid()
  );
$$;

create or replace function private.is_studio_owner(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.studio_members
    where studio_id = p_studio and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function private.my_studio_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select studio_id from public.studio_members where user_id = auth.uid();
$$;

create or replace function private.my_client_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.clients
  where user_id = auth.uid() and account_status = 'active';
$$;

create or replace function private.my_client_studio_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select studio_id from public.clients
  where user_id = auth.uid() and account_status = 'active';
$$;

-- =====================================================================
-- TRIGGER DI COERENZA
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

create trigger client_invites_set_studio before insert or update on public.client_invites
  for each row execute function private.set_studio_from_client();

create trigger client_files_set_studio before insert or update on public.client_files
  for each row execute function private.set_studio_from_client();

-- Validazione delle registrazioni rispetto alla definizione della misura
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

  if m.min_value is not null and new.value < m.min_value then
    raise exception 'Valore inferiore al minimo consentito (%)', m.min_value;
  end if;
  if m.max_value is not null and new.value > m.max_value then
    raise exception 'Valore superiore al massimo consentito (%)', m.max_value;
  end if;
  if m.value_type in ('integer', 'score') and new.value <> trunc(new.value) then
    raise exception 'Questa misura richiede un numero intero';
  end if;
  if new.recorded_on > current_date then
    raise exception 'La data non può essere nel futuro';
  end if;

  new.studio_id := v_studio;
  return new;
end;
$$;

create trigger tracking_entries_validate before insert or update on public.tracking_entries
  for each row execute function private.validate_tracking_entry();

-- Misure predefinite create automaticamente per ogni nuovo studio
create or replace function private.seed_default_metrics()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.metrics
    (studio_id, key, name, instructions, unit, value_type, frequency_days, min_value, max_value, icon, sort_order)
  values
    (new.id, 'circ_vita',        'Circ. Vita',        'Ogni 30 giorni inseriscila qui', 'cm', 'decimal', 30,   10, 250, 'ruler',      10),
    (new.id, 'circ_ombelicale',  'Circ. Ombelicale',  'Ogni 30 giorni inseriscila qui', 'cm', 'decimal', 30,   10, 250, 'ruler',      20),
    (new.id, 'circ_gluteo',      'Circ. Gluteo',      'Ogni 30 giorni inseriscila qui', 'cm', 'decimal', 30,   10, 250, 'ruler',      30),
    (new.id, 'circ_gamba_dx',    'Circ. Gamba dx',    'Ogni 30 giorni inseriscila qui', 'cm', 'decimal', 30,   10, 150, 'ruler',      40),
    (new.id, 'circ_braccio_dx',  'Circ. Braccio dx',  'Ogni 30 giorni inseriscila qui', 'cm', 'decimal', 30,   10, 100, 'ruler',      50),
    (new.id, 'passi',            'Passi',
       'Una volta a settimana: inserisci la media dei passi giornalieri (1 = 1000 passi, es. 10 = 10.000 passi)',
       'migliaia/giorno', 'decimal', 7, 0, 60, 'footprints', 60),
    (new.id, 'sonno',            'Sonno',             'Quante ore hai dormito?',       'ore', 'decimal', null, 0, 24, 'moon',     70),
    (new.id, 'allenamenti',      'Allenamenti',
       'Tieni traccia di ogni allenamento, dandoti un voto da 1 a 10 alla qualità/performance',
       'voto', 'score', null, 1, 10, 'dumbbell', 80)
  on conflict (studio_id, key) do nothing;
  return new;
end;
$$;

create trigger studios_seed_metrics after insert on public.studios
  for each row execute function private.seed_default_metrics();

-- =====================================================================
-- FUNZIONI PUBBLICHE (RPC)
-- =====================================================================

-- Chi sono? Usata dal middleware per instradare admin / cliente
create or replace function public.my_context()
returns table (role text, studio_id uuid, client_id uuid)
language sql stable security definer set search_path = '' as $$
  select sm.role, sm.studio_id, null::uuid
    from public.studio_members sm
   where sm.user_id = auth.uid()
  union all
  select 'client', c.studio_id, c.id
    from public.clients c
   where c.user_id = auth.uid() and c.account_status = 'active';
$$;
revoke execute on function public.my_context() from public, anon;
grant execute on function public.my_context() to authenticated;

-- Branding pubblico per la pagina di login (prima dell'autenticazione)
create or replace function public.get_studio_branding(p_slug text)
returns table (name text, logo_path text, primary_color text)
language sql stable security definer set search_path = '' as $$
  select s.name, s.logo_path, s.primary_color
    from public.studios s
   where s.slug = p_slug;
$$;
grant execute on function public.get_studio_branding(text) to anon, authenticated;

-- Il cliente segna un file come letto (aggiorna solo first_read_at)
create or replace function public.mark_file_read(p_file_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.client_files
     set first_read_at = now()
   where id = p_file_id
     and client_id = private.my_client_id()
     and first_read_at is null;
end;
$$;
revoke execute on function public.mark_file_read(uuid) from public, anon;
grant execute on function public.mark_file_read(uuid) to authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.studios            enable row level security;
alter table public.studio_members     enable row level security;
alter table public.clients            enable row level security;
alter table public.client_invites     enable row level security;
alter table public.client_files       enable row level security;
alter table public.metrics            enable row level security;
alter table public.tracking_entries   enable row level security;
alter table public.push_subscriptions enable row level security;

-- STUDIOS
create policy "studios: lettura membri e clienti" on public.studios
  for select to authenticated
  using (private.is_studio_member(id) or id = private.my_client_studio_id());

create policy "studios: modifica owner" on public.studios
  for update to authenticated
  using (private.is_studio_owner(id))
  with check (private.is_studio_owner(id));

-- STUDIO_MEMBERS (inserimenti solo lato server con service role)
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
  using (user_id = auth.uid());

-- CLIENT_INVITES (solo staff; l'attivazione avviene lato server)
create policy "invites: staff gestisce" on public.client_invites
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

-- CLIENT_FILES
create policy "files: staff gestisce" on public.client_files
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "files: cliente legge i propri" on public.client_files
  for select to authenticated
  using (client_id = private.my_client_id());

-- METRICS
create policy "metrics: staff gestisce" on public.metrics
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "metrics: cliente legge quelle attive" on public.metrics
  for select to authenticated
  using (studio_id = private.my_client_studio_id() and is_active);

-- TRACKING_ENTRIES
create policy "tracking: staff gestisce" on public.tracking_entries
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "tracking: cliente gestisce i propri" on public.tracking_entries
  for all to authenticated
  using (client_id = private.my_client_id())
  with check (client_id = private.my_client_id());

-- PUSH_SUBSCRIPTIONS
create policy "push: utente gestisce le proprie" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =====================================================================
-- STORAGE
-- =====================================================================

-- File dei clienti: bucket privato, solo PDF, max 10 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Asset degli studi (loghi): bucket pubblico in lettura
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-assets', 'studio-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Percorso file clienti: {studio_id}/{client_id}/{uuid}.pdf
create policy "storage client-files: staff gestisce" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] in (select id::text from private.my_studio_ids() as id)
  )
  with check (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] in (select id::text from private.my_studio_ids() as id)
  );

create policy "storage client-files: cliente legge i propri" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[2] = private.my_client_id()::text
  );

-- Percorso loghi: {studio_id}/logo.png – solo l'owner può caricare
create policy "storage studio-assets: owner gestisce" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'studio-assets'
    and (storage.foldername(name))[1] in (
      select sm.studio_id::text from public.studio_members sm
      where sm.user_id = auth.uid() and sm.role = 'owner'
    )
  )
  with check (
    bucket_id = 'studio-assets'
    and (storage.foldername(name))[1] in (
      select sm.studio_id::text from public.studio_members sm
      where sm.user_id = auth.uid() and sm.role = 'owner'
    )
  );
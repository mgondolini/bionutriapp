-- =====================================================================
-- Foto di avanzamento (mockup v1.0.10: A20–A23, C22–C27; FOTO-01…FOTO-10)
--
--   * photo_sets: un set per sessione del percorso (session_id unico).
--     Numero e data del check si ricavano dalla sessione, non si copiano.
--     Solo i check con le foto: numerazione del cliente (l'omaggio conta
--     come un check), multipli di 3 minori della durata in mesi (3 con 6
--     mesi; 3, 6, 9 con 1 anno). La stessa regola è getPhotoCheckNumbers()
--     in src/lib/photos/checks.ts: vanno cambiate insieme.
--   * Il set si apre il giorno del check: prima di quella data non si crea
--     (salvo lato server). La riga nasce al primo caricamento.
--   * photos: tre viste per set (front, side, back), una riga per vista;
--     sostituire = aggiornare la riga con il nuovo oggetto.
--   * Immutabilità nel database: con il set salvato UPDATE e DELETE
--     falliscono per chiunque, anche con la secret key. Unica eccezione la
--     cancellazione a cascata del cliente (procedura GDPR dello studio,
--     `pnpm client:delete`): in cascata il cliente non esiste più.
--   * Salvataggio solo con tutte e tre le viste (trigger).
--   * RLS: lo staff dello studio (is_studio_member; can_manage_client
--     arriverà con la v3); il cliente legge i propri set da In percorso in
--     poi e scrive solo In percorso, come il tracking.
--   * Storage: bucket privato client-photos, solo JPEG (la conversione
--     avviene nel browser), {studio}/{cliente}/{set}/{vista}-{uuid}.jpg:
--     un nome nuovo a ogni caricamento (niente cache del CDN con la foto
--     vecchia, e la vecchia resta finché la nuova non è confermata).
--   * Promemoria: nuovi tipi nel registro del percorso e candidati per il
--     cron orario già esistente (promemoria-percorsi).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Regola dei check con le foto
-- ---------------------------------------------------------------------
create or replace function private.is_photo_check(p_check int, p_duration int)
returns boolean language sql immutable set search_path = '' as $$
  select p_check is not null and p_check > 0 and p_check % 3 = 0 and p_check < p_duration;
$$;

-- Numero del check come lo vede il cliente (onboarding escluso, omaggio
-- compreso); null per l'onboarding.
create or replace function private.session_check_number(p_session uuid)
returns int language sql stable security definer set search_path = '' as $$
  select case when s.type = 'onboarding' then null
         else (select count(*)::int from public.journey_sessions x
                where x.journey_id = s.journey_id
                  and x.type <> 'onboarding'
                  and x.position <= s.position)
         end
    from public.journey_sessions s
   where s.id = p_session;
$$;

-- ---------------------------------------------------------------------
-- Set di foto
-- ---------------------------------------------------------------------
create table public.photo_sets (
  id            uuid primary key default gen_random_uuid(),
  studio_id     uuid not null references public.studios(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  session_id    uuid not null unique references public.journey_sessions(id) on delete cascade,
  status        text not null default 'draft' check (status in ('draft', 'saved')),
  saved_at      timestamptz,
  saved_by      uuid references auth.users(id) on delete set null,
  saved_by_role text check (saved_by_role in ('client', 'studio')),
  created_at    timestamptz not null default now(),
  constraint photo_sets_saved check (
    (status = 'saved') = (saved_at is not null and saved_by_role is not null)
  )
);
create index photo_sets_client_idx on public.photo_sets (client_id);

create or replace function private.prepare_photo_set()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.journey_sessions%rowtype;
  v_duration int;
  v_count int;
begin
  if tg_op = 'INSERT' then
    select * into v_session from public.journey_sessions where id = new.session_id;
    if v_session.id is null then
      raise exception 'Sessione non trovata';
    end if;
    select duration_months into v_duration
      from public.client_journeys where id = v_session.journey_id;
    if not private.is_photo_check(private.session_check_number(v_session.id), v_duration) then
      raise exception 'Questo check non prevede foto' using errcode = 'check_violation';
    end if;
    if v_uid is not null
       and coalesce(v_session.custom_date, v_session.calculated_date) > private.today_rome() then
      raise exception 'Il set si apre il giorno del check' using errcode = 'check_violation';
    end if;
    new.studio_id := v_session.studio_id;
    new.client_id := v_session.client_id;
    new.status := 'draft';
    new.saved_at := null;
    new.saved_by := null;
    new.saved_by_role := null;
    new.created_at := now();
    return new;
  end if;

  -- UPDATE: un set salvato è definitivo per chiunque
  if old.status = 'saved' then
    raise exception 'Le foto salvate non si modificano' using errcode = 'check_violation';
  end if;
  if new.session_id <> old.session_id or new.client_id <> old.client_id
     or new.studio_id <> old.studio_id then
    raise exception 'Sessione e cliente di un set non si modificano'
      using errcode = 'check_violation';
  end if;
  new.created_at := old.created_at;
  if new.status = 'saved' then
    select count(*) into v_count from public.photos where set_id = new.id;
    if v_count < 3 then
      raise exception 'Per salvare servono tutte e tre le foto'
        using errcode = 'check_violation';
    end if;
    new.saved_at := now();
    if v_uid is not null then
      new.saved_by := v_uid;
      new.saved_by_role := case when private.is_studio_member(new.studio_id)
                                then 'studio' else 'client' end;
    end if;
  else
    new.saved_at := null;
    new.saved_by := null;
    new.saved_by_role := null;
  end if;
  return new;
end;
$$;

create trigger photo_sets_prepare before insert or update on public.photo_sets
  for each row execute function private.prepare_photo_set();

-- Un set salvato non si elimina, salvo in cascata con il cliente.
create or replace function private.guard_photo_set_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'saved'
     and exists (select 1 from public.clients where id = old.client_id) then
    raise exception 'Le foto salvate non si eliminano' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger photo_sets_guard_delete before delete on public.photo_sets
  for each row execute function private.guard_photo_set_delete();

-- ---------------------------------------------------------------------
-- Foto
-- ---------------------------------------------------------------------
create table public.photos (
  id               uuid primary key default gen_random_uuid(),
  set_id           uuid not null references public.photo_sets(id) on delete cascade,
  studio_id        uuid not null references public.studios(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  view             text not null check (view in ('front', 'side', 'back')),
  storage_path     text not null unique,
  size_bytes       integer not null check (size_bytes > 0),
  uploaded_by      uuid references auth.users(id) on delete set null,
  uploaded_by_role text not null check (uploaded_by_role in ('client', 'studio')),
  uploaded_at      timestamptz not null default now(),
  unique (set_id, view)
);
create index photos_client_idx on public.photos (client_id);

-- Studio e cliente dal set; set bloccato in scrittura (FOR UPDATE) così un
-- salvataggio e un caricamento simultanei non si incrociano; percorso
-- dell'oggetto coerente con set e vista; autore dalla sessione.
create or replace function private.prepare_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_set public.photo_sets%rowtype;
begin
  select * into v_set from public.photo_sets
   where id = coalesce(new.set_id, old.set_id)
   for update;

  if tg_op = 'DELETE' then
    if v_set.id is not null and v_set.status = 'saved'
       and exists (select 1 from public.clients where id = old.client_id) then
      raise exception 'Le foto salvate non si eliminano' using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if v_set.id is null then
    raise exception 'Set di foto non trovato';
  end if;
  if v_set.status = 'saved' then
    raise exception 'Le foto salvate non si modificano' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and (new.set_id <> old.set_id or new.view <> old.view) then
    raise exception 'Set e vista di una foto non si modificano'
      using errcode = 'check_violation';
  end if;
  if new.storage_path !~ (
    '^' || v_set.studio_id || '/' || v_set.client_id || '/' || v_set.id || '/'
    || new.view || '-[0-9a-f-]{36}\.jpg$'
  ) then
    raise exception 'Percorso della foto non valido' using errcode = 'check_violation';
  end if;
  new.studio_id := v_set.studio_id;
  new.client_id := v_set.client_id;
  new.uploaded_at := now();
  if v_uid is not null then
    new.uploaded_by := v_uid;
    new.uploaded_by_role := case when private.is_studio_member(v_set.studio_id)
                                 then 'studio' else 'client' end;
  end if;
  return new;
end;
$$;

create trigger photos_prepare before insert or update or delete on public.photos
  for each row execute function private.prepare_photo();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.photo_sets enable row level security;
alter table public.photos enable row level security;
revoke all on public.photo_sets, public.photos from anon;
revoke delete, truncate on public.photo_sets from authenticated;
revoke truncate on public.photos from authenticated;

create policy "set di foto: lo staff legge" on public.photo_sets
  for select to authenticated using (private.is_studio_member(studio_id));
create policy "set di foto: lo staff crea" on public.photo_sets
  for insert to authenticated with check (private.is_studio_member(studio_id));
create policy "set di foto: lo staff salva" on public.photo_sets
  for update to authenticated
  using (private.is_studio_member(studio_id)) with check (private.is_studio_member(studio_id));
create policy "set di foto: il cliente legge i propri" on public.photo_sets
  for select to authenticated using (client_id = private.my_unlocked_client_id());
create policy "set di foto: il cliente crea i propri" on public.photo_sets
  for insert to authenticated
  with check (client_id = private.my_client_id() and private.my_client_can_track());
create policy "set di foto: il cliente salva i propri" on public.photo_sets
  for update to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_track())
  with check (client_id = private.my_client_id() and private.my_client_can_track());

create policy "foto: lo staff legge" on public.photos
  for select to authenticated using (private.is_studio_member(studio_id));
create policy "foto: lo staff carica" on public.photos
  for insert to authenticated with check (private.is_studio_member(studio_id));
create policy "foto: lo staff sostituisce" on public.photos
  for update to authenticated
  using (private.is_studio_member(studio_id)) with check (private.is_studio_member(studio_id));
create policy "foto: lo staff elimina" on public.photos
  for delete to authenticated using (private.is_studio_member(studio_id));
create policy "foto: il cliente legge le proprie" on public.photos
  for select to authenticated using (client_id = private.my_unlocked_client_id());
create policy "foto: il cliente carica le proprie" on public.photos
  for insert to authenticated
  with check (client_id = private.my_client_id() and private.my_client_can_track());
create policy "foto: il cliente sostituisce le proprie" on public.photos
  for update to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_track())
  with check (client_id = private.my_client_id() and private.my_client_can_track());
create policy "foto: il cliente elimina le proprie" on public.photos
  for delete to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_track());

-- ---------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-photos', 'client-photos', false, 10485760, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- {studio}/{cliente}/{set}/{vista}-{uuid}.jpg di un set esistente
create or replace function private.photo_path_set(p_name text)
returns public.photo_sets language sql stable security definer set search_path = '' as $$
  select s.*
    from public.photo_sets s
   where p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/(front|side|back)-[0-9a-f-]{36}\.jpg$'
     and s.id::text        = split_part(p_name, '/', 3)
     and s.client_id::text = split_part(p_name, '/', 2)
     and s.studio_id::text = split_part(p_name, '/', 1);
$$;

-- Lettura: staff dello studio o cliente sbloccato
create or replace function private.can_read_photo_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.photo_path_set(p_name) s
     where s.id is not null
       and (private.is_studio_member(s.studio_id)
            or s.client_id = private.my_unlocked_client_id())
  );
$$;

-- Scrittura (caricamento ed eliminazione): solo set in bozza; staff dello
-- studio o cliente In percorso.
create or replace function private.can_write_photo_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.photo_path_set(p_name) s
     where s.id is not null
       and s.status = 'draft'
       and (private.is_studio_member(s.studio_id)
            or (s.client_id = private.my_client_id() and private.my_client_can_track()))
  );
$$;

create policy "storage client-photos: legge" on storage.objects
  for select to authenticated
  using (bucket_id = 'client-photos' and private.can_read_photo_path(name));
create policy "storage client-photos: carica in bozza" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-photos' and private.can_write_photo_path(name));
create policy "storage client-photos: elimina in bozza" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-photos' and private.can_write_photo_path(name));
-- nessuna policy di update: un oggetto non si sovrascrive mai

-- Oggetti senza riga (caricamenti mai confermati, foto sostituite il cui
-- oggetto non si è potuto eliminare): li elimina il cron di manutenzione.
create or replace function public.list_orphan_client_photos(p_older_than_hours int default 24, p_limit int default 500)
returns setof text language sql stable security definer set search_path = '' as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'client-photos'
     and o.created_at < now() - make_interval(hours => greatest(p_older_than_hours, 1))
     and not exists (select 1 from public.photos p where p.storage_path = o.name)
   order by o.created_at
   limit least(greatest(p_limit, 1), 1000);
$$;
revoke execute on function public.list_orphan_client_photos(int, int) from public, anon, authenticated;
grant execute on function public.list_orphan_client_photos(int, int) to service_role;

-- ---------------------------------------------------------------------
-- Promemoria (C27): il giorno del check alle 8 al posto del promemoria del
-- mattino, poi 3 e 7 giorni dopo se il set non è salvato.
-- ---------------------------------------------------------------------
alter table public.journey_notifications
  drop constraint journey_notifications_kind_check,
  add constraint journey_notifications_kind_check check (kind in (
    'date_changed', 'reminder_day_before', 'reminder_same_day',
    'photos_same_day', 'photos_day_3', 'photos_day_7'
  ));

-- Check con le foto di un giorno, set non salvato, check non saltato,
-- cliente attivo In percorso (solo service_role).
create function public.photo_reminder_candidates(p_studio uuid, p_day date)
returns table (
  session_id uuid, client_id uuid, user_id uuid, check_number int,
  session_date date, session_time time, photo_count int, missing_views text[]
)
language sql stable security definer set search_path = '' as $$
  with numbered as (
    select s.id, s.client_id, s.status, s.session_time,
           coalesce(s.custom_date, s.calculated_date) as session_date,
           j.duration_months,
           case when s.type = 'onboarding' then null
                else (row_number() over (
                        partition by s.journey_id, s.type = 'onboarding' order by s.position))::int
           end as check_number
      from public.journey_sessions s
      join public.client_journeys j on j.id = s.journey_id
     where j.studio_id = p_studio and j.status = 'active'
  )
  select n.id, n.client_id, c.user_id, n.check_number, n.session_date, n.session_time,
         (select count(*)::int from public.photos p
            join public.photo_sets ps on ps.id = p.set_id
           where ps.session_id = n.id),
         array(select v from unnest(array['front', 'side', 'back']) with ordinality as u(v, o)
                where not exists (
                  select 1 from public.photos p
                    join public.photo_sets ps on ps.id = p.set_id
                   where ps.session_id = n.id and p.view = u.v)
                order by u.o)
    from numbered n
    join public.clients c on c.id = n.client_id
   where n.session_date = p_day
     and n.status <> 'skipped'
     and private.is_photo_check(n.check_number, n.duration_months)
     and not exists (
       select 1 from public.photo_sets ps where ps.session_id = n.id and ps.status = 'saved')
     and c.account_status = 'active'
     and c.user_id is not null
     and c.journey_stage = 'in_progress';
$$;
revoke execute on function public.photo_reminder_candidates(uuid, date) from public, anon, authenticated;
grant execute on function public.photo_reminder_candidates(uuid, date) to service_role;

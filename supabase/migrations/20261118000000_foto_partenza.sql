-- =====================================================================
-- Foto di avanzamento: decisioni del nutrizionista (13 novembre 2026)
--
--   * Foto di partenza: anche l'onboarding ha un set (fronte, lato, dietro),
--     oltre ai check 3, 6, 9. private.is_photo_session() sostituisce
--     is_photo_check() nel trigger e nei promemoria; la regola in
--     TypeScript è photoSessionsOfJourney() (src/lib/photos/checks.ts).
--   * Il set si apre 3 giorni prima della sessione (non più il giorno
--     stesso): PHOTO_SET_OPEN_DAYS_BEFORE in domain.ts.
--   * Il cliente usa le foto anche in Onboarding (le foto di partenza si
--     scattano lì): legge con l'account attivo in ogni fase, carica e salva
--     in Onboarding e In percorso. File e tracking restano bloccati (C-09).
--   * Promemoria: uno al giorno dall'apertura fino al salvataggio (tipo
--     'photos_daily', data di riferimento = giorno dell'invio);
--     photo_reminder_candidates restituisce i set aperti in quel giorno.
-- =====================================================================

-- Sessione con le foto: l'onboarding o un check della regola dei 3 mesi.
create or replace function private.is_photo_session(p_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select s.type = 'onboarding'
      or private.is_photo_check(private.session_check_number(s.id), j.duration_months)
    from public.journey_sessions s
    join public.client_journeys j on j.id = s.journey_id
   where s.id = p_session;
$$;

-- Il cliente carica e salva le foto in Onboarding e In percorso.
create or replace function private.my_client_can_upload_photos()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clients
     where user_id = (select auth.uid())
       and account_status = 'active'
       and journey_stage in ('onboarding', 'in_progress')
  );
$$;

create or replace function private.prepare_photo_set()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_session public.journey_sessions%rowtype;
  v_count int;
begin
  if tg_op = 'INSERT' then
    select * into v_session from public.journey_sessions where id = new.session_id;
    if v_session.id is null then
      raise exception 'Sessione non trovata';
    end if;
    if not coalesce(private.is_photo_session(v_session.id), false) then
      raise exception 'Questo check non prevede foto' using errcode = 'check_violation';
    end if;
    if v_uid is not null
       and coalesce(v_session.custom_date, v_session.calculated_date) > private.today_rome() + 3 then
      raise exception 'Il set si apre 3 giorni prima del check' using errcode = 'check_violation';
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

-- ---------------------------------------------------------------------
-- RLS del cliente: lettura in ogni fase con l'account attivo, scrittura in
-- Onboarding e In percorso
-- ---------------------------------------------------------------------
drop policy "set di foto: il cliente legge i propri" on public.photo_sets;
drop policy "set di foto: il cliente crea i propri" on public.photo_sets;
drop policy "set di foto: il cliente salva i propri" on public.photo_sets;
drop policy "foto: il cliente legge le proprie" on public.photos;
drop policy "foto: il cliente carica le proprie" on public.photos;
drop policy "foto: il cliente sostituisce le proprie" on public.photos;
drop policy "foto: il cliente elimina le proprie" on public.photos;

create policy "set di foto: il cliente legge i propri" on public.photo_sets
  for select to authenticated using (client_id = private.my_client_id());
create policy "set di foto: il cliente crea i propri" on public.photo_sets
  for insert to authenticated
  with check (client_id = private.my_client_id() and private.my_client_can_upload_photos());
create policy "set di foto: il cliente salva i propri" on public.photo_sets
  for update to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_upload_photos())
  with check (client_id = private.my_client_id() and private.my_client_can_upload_photos());

create policy "foto: il cliente legge le proprie" on public.photos
  for select to authenticated using (client_id = private.my_client_id());
create policy "foto: il cliente carica le proprie" on public.photos
  for insert to authenticated
  with check (client_id = private.my_client_id() and private.my_client_can_upload_photos());
create policy "foto: il cliente sostituisce le proprie" on public.photos
  for update to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_upload_photos())
  with check (client_id = private.my_client_id() and private.my_client_can_upload_photos());
create policy "foto: il cliente elimina le proprie" on public.photos
  for delete to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_upload_photos());

create or replace function private.can_read_photo_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.photo_path_set(p_name) s
     where s.id is not null
       and (private.is_studio_member(s.studio_id)
            or s.client_id = private.my_client_id())
  );
$$;

create or replace function private.can_write_photo_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.photo_path_set(p_name) s
     where s.id is not null
       and s.status = 'draft'
       and (private.is_studio_member(s.studio_id)
            or (s.client_id = private.my_client_id()
                and private.my_client_can_upload_photos()))
  );
$$;

-- ---------------------------------------------------------------------
-- Promemoria: uno al giorno finché il set è aperto
-- ---------------------------------------------------------------------
alter table public.journey_notifications
  drop constraint journey_notifications_kind_check,
  add constraint journey_notifications_kind_check check (kind in (
    'date_changed', 'reminder_day_before', 'reminder_same_day',
    'photos_same_day', 'photos_day_3', 'photos_day_7', 'photos_daily'
  ));

-- Set aperti nel giorno p_day (sessione entro p_day + 3), non salvati,
-- sessione non saltata, cliente attivo in Onboarding o In percorso.
create or replace function public.photo_reminder_candidates(p_studio uuid, p_day date)
returns table (
  session_id uuid, client_id uuid, user_id uuid, check_number int,
  session_date date, session_time time, photo_count int, missing_views text[]
)
language sql stable security definer set search_path = '' as $$
  with numbered as (
    select s.id, s.client_id, s.status, s.session_time, s.type,
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
   where n.session_date <= p_day + 3
     and n.status <> 'skipped'
     and (n.type = 'onboarding' or private.is_photo_check(n.check_number, n.duration_months))
     and not exists (
       select 1 from public.photo_sets ps where ps.session_id = n.id and ps.status = 'saved')
     and c.account_status = 'active'
     and c.user_id is not null
     and c.journey_stage in ('onboarding', 'in_progress');
$$;
revoke execute on function public.photo_reminder_candidates(uuid, date) from public, anon, authenticated;
grant execute on function public.photo_reminder_candidates(uuid, date) to service_role;

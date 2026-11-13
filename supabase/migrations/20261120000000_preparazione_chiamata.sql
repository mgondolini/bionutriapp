-- =====================================================================
-- Preparazione della chiamata di onboarding (mockup v1.0.11: C28–C32,
-- A1, A5, A27). In Onboarding il cliente manda, prima della chiamata, le
-- misure di partenza e le foto di partenza.
--
--   * Misure: TUTTE le misure mensili attive dello studio (peso e
--     circonferenze, frequency = 'monthly_30d'), non solo cinque (decisione
--     del 13 novembre 2026). Si salvano come tracking_entries del cliente:
--     diventano la prima rilevazione del Tracking. Nessuna tabella nuova e
--     nessun campo "source": una misura mensile registrata dal cliente in
--     Onboarding è per forza di partenza.
--   * Chiamata: è la sessione di onboarding del percorso attivo (data, ora,
--     Meet, promemoria già esistenti), non un campo nuovo sul cliente.
--   * Foto: il set di partenza esiste già (sessione di onboarding). Ora si
--     apre subito, non 3 giorni prima; in Onboarding il cliente scrive solo
--     in quel set.
--   * Promemoria: 2 giorni e 1 giorno prima della chiamata alle 18, solo se
--     manca qualcosa; una push di presentazione alla prima attivazione delle
--     notifiche. Il set di partenza esce dal promemoria quotidiano delle foto.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------

-- Misura di partenza: misura mensile attiva (peso e circonferenze).
create or replace function private.is_prep_metric(p_metric uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.metrics
     where id = p_metric and frequency = 'monthly_30d' and is_active
  );
$$;

-- Cliente dell'utente corrente, con l'account attivo e in Onboarding.
create or replace function private.my_onboarding_client_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.clients
   where user_id = (select private.session_uid())
     and account_status = 'active'
     and journey_stage = 'onboarding';
$$;

-- Fase da cui il cliente carica le foto (prima usava auth.uid(): ora la
-- sessione revocata non scrive più, come gli altri helper).
create or replace function private.my_client_can_upload_photos()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clients
     where user_id = (select private.session_uid())
       and account_status = 'active'
       and journey_stage in ('onboarding', 'in_progress')
  );
$$;

-- Il cliente scrive nel set di questa sessione: In percorso in ogni set con
-- le foto, in Onboarding solo nel set di partenza.
create or replace function private.my_client_can_upload_session(p_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clients c
      join public.journey_sessions s on s.client_id = c.id
     where c.user_id = (select private.session_uid())
       and c.account_status = 'active'
       and s.id = p_session
       and (c.journey_stage = 'in_progress'
            or (c.journey_stage = 'onboarding' and s.type = 'onboarding'))
  );
$$;

create or replace function private.my_client_can_upload_set(p_set uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select private.my_client_can_upload_session(session_id)
      from public.photo_sets where id = p_set
  ), false);
$$;

-- ---------------------------------------------------------------------
-- Misure di partenza: il cliente in Onboarding legge e scrive solo le
-- proprie misure mensili (le altre policy del tracking non cambiano)
-- ---------------------------------------------------------------------
create policy "tracking: cliente in onboarding legge le misure di partenza"
  on public.tracking_entries for select to authenticated
  using (client_id = private.my_onboarding_client_id()
         and private.is_prep_metric(metric_id));

create policy "tracking: cliente in onboarding manda le misure di partenza"
  on public.tracking_entries for insert to authenticated
  with check (client_id = private.my_onboarding_client_id()
              and private.is_prep_metric(metric_id));

create policy "tracking: cliente in onboarding corregge le misure di partenza"
  on public.tracking_entries for update to authenticated
  using (client_id = private.my_onboarding_client_id()
         and private.is_prep_metric(metric_id)
         and created_by_role = 'client')
  with check (client_id = private.my_onboarding_client_id()
              and private.is_prep_metric(metric_id)
              and created_by_role = 'client');

-- Tutte le misure di partenza insieme, con la stessa data: o tutte o
-- nessuna. Una misura già mandata dal cliente si corregge (la più recente),
-- altrimenti si inserisce: niente doppioni. p_values = {chiave: valore}.
-- Security invoker: valgono le policy qui sopra e validate_tracking_entry
-- (limiti, data non futura).
create or replace function public.save_onboarding_measures(
  p_recorded_on date, p_values jsonb
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_client uuid := private.my_onboarding_client_id();
  v_studio uuid;
  v_metric record;
  v_value numeric;
  v_entry uuid;
begin
  if v_client is null then
    raise exception 'Le misure di partenza si mandano solo in onboarding'
      using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_values) <> 'object' then
    raise exception 'Valori non validi' using errcode = 'check_violation';
  end if;
  select studio_id into v_studio from public.clients where id = v_client;

  for v_metric in
    select id, key from public.metrics
     where studio_id = v_studio and frequency = 'monthly_30d' and is_active
  loop
    if not (p_values ? v_metric.key) then
      raise exception 'Manca la misura %', v_metric.key using errcode = 'check_violation';
    end if;
    v_value := (p_values ->> v_metric.key)::numeric;
    select id into v_entry from public.tracking_entries
     where client_id = v_client and metric_id = v_metric.id
       and created_by_role = 'client'
     order by recorded_on desc, created_at desc
     limit 1;
    if v_entry is null then
      insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
      values (v_client, v_metric.id, v_value, p_recorded_on);
    else
      update public.tracking_entries
         set value = v_value, recorded_on = p_recorded_on
       where id = v_entry;
    end if;
  end loop;
end;
$$;
revoke execute on function public.save_onboarding_measures(date, jsonb) from public, anon;
grant execute on function public.save_onboarding_measures(date, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Stato della preparazione per cliente (A1, A5): misure, foto, chiamata.
-- security_invoker: lo staff vede i clienti del proprio studio; il cliente
-- legge la propria riga solo con my_onboarding_prep().
-- ---------------------------------------------------------------------
create or replace view public.onboarding_prep_status
with (security_invoker = true) as
select
  c.id as client_id,
  c.studio_id,
  c.journey_stage,
  c.account_status,
  c.push_enabled,
  m.total as measures_total,
  coalesce(e.done, 0) as measures_done,
  e.sent_at as measures_sent_at,
  e.recorded_on as measures_recorded_on,
  s.id as call_session_id,
  coalesce(s.custom_date, s.calculated_date) as call_date,
  s.session_time as call_time,
  ps.status as photos_status,
  coalesce(pc.count, 0) as photos_count,
  ps.saved_at as photos_saved_at,
  ps.saved_by_role as photos_saved_by_role
from public.clients c
cross join lateral (
  select count(*)::int as total from public.metrics
   where studio_id = c.studio_id and frequency = 'monthly_30d' and is_active
) m
left join lateral (
  select count(distinct t.metric_id)::int as done,
         max(greatest(t.created_at, t.updated_at)) as sent_at,
         max(t.recorded_on) as recorded_on
    from public.tracking_entries t
    join public.metrics mm on mm.id = t.metric_id
   where t.client_id = c.id and mm.frequency = 'monthly_30d' and mm.is_active
) e on true
left join lateral (
  select x.* from public.journey_sessions x
    join public.client_journeys j on j.id = x.journey_id
   where x.client_id = c.id and x.type = 'onboarding' and j.status = 'active'
   order by x.position
   limit 1
) s on true
left join public.photo_sets ps on ps.session_id = s.id
left join lateral (
  select count(*)::int as count from public.photos p where p.set_id = ps.id
) pc on true;

revoke all on public.onboarding_prep_status from anon;
grant select on public.onboarding_prep_status to authenticated;

create or replace function public.my_onboarding_prep()
returns setof public.onboarding_prep_status
language sql stable security definer set search_path = '' as $$
  select * from public.onboarding_prep_status
   where client_id = private.my_client_id();
$$;
revoke execute on function public.my_onboarding_prep() from public, anon;
grant execute on function public.my_onboarding_prep() to authenticated;

-- ---------------------------------------------------------------------
-- Foto: il set di partenza si apre subito; in Onboarding il cliente scrive
-- solo nel set di partenza
-- ---------------------------------------------------------------------
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
    -- il set di partenza è aperto da subito (preparazione della chiamata)
    if v_uid is not null and v_session.type <> 'onboarding'
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

drop policy "set di foto: il cliente crea i propri" on public.photo_sets;
drop policy "set di foto: il cliente salva i propri" on public.photo_sets;
drop policy "foto: il cliente carica le proprie" on public.photos;
drop policy "foto: il cliente sostituisce le proprie" on public.photos;
drop policy "foto: il cliente elimina le proprie" on public.photos;

create policy "set di foto: il cliente crea i propri" on public.photo_sets
  for insert to authenticated
  with check (client_id = private.my_client_id()
              and private.my_client_can_upload_session(session_id));
create policy "set di foto: il cliente salva i propri" on public.photo_sets
  for update to authenticated
  using (client_id = private.my_client_id()
         and private.my_client_can_upload_session(session_id))
  with check (client_id = private.my_client_id()
              and private.my_client_can_upload_session(session_id));

create policy "foto: il cliente carica le proprie" on public.photos
  for insert to authenticated
  with check (client_id = private.my_client_id() and private.my_client_can_upload_set(set_id));
create policy "foto: il cliente sostituisce le proprie" on public.photos
  for update to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_upload_set(set_id))
  with check (client_id = private.my_client_id() and private.my_client_can_upload_set(set_id));
create policy "foto: il cliente elimina le proprie" on public.photos
  for delete to authenticated
  using (client_id = private.my_client_id() and private.my_client_can_upload_set(set_id));

create or replace function private.can_write_photo_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.photo_path_set(p_name) s
     where s.id is not null
       and s.status = 'draft'
       and (private.is_studio_member(s.studio_id)
            or (s.client_id = private.my_client_id()
                and private.my_client_can_upload_set(s.id)))
  );
$$;

-- Il set di partenza non ha più il promemoria quotidiano delle foto: lo
-- sostituiscono i promemoria della preparazione della chiamata.
create or replace function public.photo_reminder_candidates(p_studio uuid, p_day date)
returns table (
  session_id uuid, client_id uuid, user_id uuid, check_number int,
  session_date date, session_time time, photo_count int, missing_views text[]
)
language sql stable security definer set search_path = '' as $$
  with numbered as (
    select s.id, s.client_id, s.status, s.session_time, s.type,
           coalesce(s.custom_date, s.calculated_date) as session_date,
           case when s.type = 'onboarding' then null
                else (row_number() over (
                        partition by s.journey_id, s.type = 'onboarding' order by s.position))::int
           end as check_number,
           (count(*) filter (where s.type <> 'onboarding')
              over (partition by s.journey_id))::int as last_check
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
     and n.type <> 'onboarding'
     and private.is_photo_check(n.check_number, n.last_check)
     and not exists (
       select 1 from public.photo_sets ps where ps.session_id = n.id and ps.status = 'saved')
     and c.account_status = 'active'
     and c.user_id is not null
     and c.journey_stage = 'in_progress';
$$;
revoke execute on function public.photo_reminder_candidates(uuid, date) from public, anon, authenticated;
grant execute on function public.photo_reminder_candidates(uuid, date) to service_role;

-- ---------------------------------------------------------------------
-- Promemoria della preparazione (C32)
-- ---------------------------------------------------------------------
alter table public.journey_notifications
  drop constraint journey_notifications_kind_check,
  add constraint journey_notifications_kind_check check (kind in (
    'date_changed', 'reminder_day_before', 'reminder_same_day',
    'photos_same_day', 'photos_day_3', 'photos_day_7', 'photos_daily',
    'prep_intro', 'prep_2d', 'prep_1d'
  ));

-- Clienti in Onboarding con la chiamata fra p_from e p_to (estremi
-- compresi), sessione da fare, account attivo e qualcosa da mandare.
create or replace function public.onboarding_prep_candidates(
  p_studio uuid, p_from date, p_to date
) returns table (
  session_id uuid, client_id uuid, user_id uuid, call_date date, call_time time,
  measures_missing boolean, photos_missing boolean
)
language sql stable security definer set search_path = '' as $$
  select p.call_session_id, p.client_id, c.user_id, p.call_date, p.call_time,
         p.measures_done < p.measures_total,
         p.photos_status is distinct from 'saved'
    from public.onboarding_prep_status p
    join public.clients c on c.id = p.client_id
    join public.journey_sessions s on s.id = p.call_session_id
   where p.studio_id = p_studio
     and p.journey_stage = 'onboarding'
     and p.account_status = 'active'
     and c.user_id is not null
     and s.status = 'todo'
     and p.call_date between p_from and p_to
     and (p.measures_done < p.measures_total or p.photos_status is distinct from 'saved');
$$;
revoke execute on function public.onboarding_prep_candidates(uuid, date, date) from public, anon, authenticated;
grant execute on function public.onboarding_prep_candidates(uuid, date, date) to service_role;

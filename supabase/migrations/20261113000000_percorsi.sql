-- =====================================================================
-- Percorso del cliente (mockup v5: A17–A19, C5, C19–C21)
--
--   * client_journeys: un percorso di 6 mesi o 1 anno; uno solo attivo per
--     cliente (indice unico parziale). I conclusi restano in sola lettura.
--     Si conclude quando il cliente passa alla fase Concluso (trigger su
--     clients), così vale anche il pulsante già presente nel Profilo.
--   * journey_sessions: onboarding, check e check omaggio con data calcolata
--     e data modificata a mano in colonne separate; stato salvato solo
--     todo / done / skipped ("prossima" e "in ritardo" si calcolano).
--   * journey_notifications: registro delle push del percorso, con vincolo
--     unico per non inviare due volte la stessa notifica.
--   * Il cliente non legge le tabelle: le funzioni my_journeys() e
--     my_journey_sessions() nascondono nota, composizione e omaggio (il check
--     omaggio compare come un normale check).
--   * Promemoria: pg_cron ogni ora chiama l'endpoint dell'app (stesso Vault
--     del promemoria serale), che decide quali studi sono all'ora giusta.
--   Permessi dello staff: is_studio_member (nella 1.0 c'è solo il titolare;
--   private.can_manage_client arriverà con la v3 dei collaboratori).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Percorsi
-- ---------------------------------------------------------------------
create table public.client_journeys (
  id                  uuid primary key default gen_random_uuid(),
  studio_id           uuid not null references public.studios(id) on delete cascade,
  client_id           uuid not null references public.clients(id) on delete cascade,
  previous_journey_id uuid references public.client_journeys(id) on delete set null,
  kind                text not null check (kind in ('first', 'extension', 'resume')),
  duration_months     smallint not null check (duration_months in (6, 12)),
  start_date          date not null,
  end_date            date not null,
  include_onboarding  boolean not null,
  gift_mode           text not null check (gift_mode in ('none', 'added', 'included')),
  status              text not null default 'active' check (status in ('active', 'concluded')),
  concluded_at        timestamptz,
  created_by          uuid references auth.users(id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- fine = inizio + 6 o 12 mesi (a fine mese Postgres si ferma all'ultimo
  -- giorno, come addMonths in src/lib/domain/journeys/dates.ts)
  constraint client_journeys_end_date check (
    end_date = (start_date + make_interval(months => duration_months))::date
  ),
  constraint client_journeys_concluded check ((status = 'concluded') = (concluded_at is not null)),
  constraint client_journeys_previous check (previous_journey_id is distinct from id)
);
create unique index client_journeys_one_active on public.client_journeys (client_id)
  where status = 'active';
create index client_journeys_client_idx on public.client_journeys (client_id, created_at desc);

create trigger client_journeys_studio before insert or update of client_id on public.client_journeys
  for each row execute function private.set_studio_from_client();
create trigger client_journeys_updated_at before update on public.client_journeys
  for each row execute function private.set_updated_at();

-- Composizione e date non si cambiano su un percorso concluso; il percorso
-- precedente deve essere dello stesso cliente.
create or replace function private.guard_client_journey()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.previous_journey_id is not null and not exists (
    select 1 from public.client_journeys
     where id = new.previous_journey_id and client_id = new.client_id
  ) then
    raise exception 'Il percorso precedente deve essere dello stesso cliente'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' then
    if new.client_id <> old.client_id or new.kind <> old.kind
       or new.previous_journey_id is distinct from old.previous_journey_id then
      raise exception 'Cliente, tipo e collegamento del percorso non si modificano'
        using errcode = 'check_violation';
    end if;
    if old.status = 'concluded' then
      raise exception 'Un percorso concluso è in sola lettura'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger client_journeys_guard before insert or update on public.client_journeys
  for each row execute function private.guard_client_journey();

-- ---------------------------------------------------------------------
-- Sessioni
-- ---------------------------------------------------------------------
create table public.journey_sessions (
  id              uuid primary key default gen_random_uuid(),
  journey_id      uuid not null references public.client_journeys(id) on delete cascade,
  studio_id       uuid not null references public.studios(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  position        smallint not null check (position between 0 and 20),
  type            text not null check (type in ('onboarding', 'check', 'gift')),
  calculated_date date not null,
  custom_date     date,
  session_time    time(0),
  status          text not null default 'todo' check (status in ('todo', 'done', 'skipped')),
  note            text check (char_length(note) <= 500),
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (journey_id, position)
);
create index journey_sessions_client_idx on public.journey_sessions (client_id);
create index journey_sessions_date_idx on public.journey_sessions ((coalesce(custom_date, calculated_date)))
  where status = 'todo';

-- Studio e cliente sempre dal percorso; autore dell'ultima modifica dalla
-- sessione; un percorso concluso non si tocca.
create or replace function private.prepare_journey_session()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_journey public.client_journeys%rowtype;
begin
  select * into v_journey from public.client_journeys
   where id = coalesce(new.journey_id, old.journey_id);
  if v_journey.id is null then
    raise exception 'Percorso non trovato';
  end if;
  if v_journey.status = 'concluded' and (select auth.uid()) is not null then
    raise exception 'Un percorso concluso è in sola lettura'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if tg_op = 'UPDATE' and new.journey_id <> old.journey_id then
    raise exception 'Una sessione non cambia percorso' using errcode = 'check_violation';
  end if;
  new.studio_id := v_journey.studio_id;
  new.client_id := v_journey.client_id;
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

create trigger journey_sessions_prepare before insert or update or delete on public.journey_sessions
  for each row execute function private.prepare_journey_session();
create trigger journey_sessions_updated_at before update on public.journey_sessions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Il cliente passa a Concluso: si conclude il percorso attivo
-- ---------------------------------------------------------------------
create or replace function private.conclude_active_journey()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.journey_stage = 'completed' and old.journey_stage <> 'completed' then
    update public.client_journeys
       set status = 'concluded', concluded_at = now()
     where client_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

create trigger clients_conclude_journey after update of journey_stage on public.clients
  for each row execute function private.conclude_active_journey();

-- ---------------------------------------------------------------------
-- Creazione di un percorso con le sue sessioni, in un'unica transazione.
-- security invoker: valgono RLS e trigger dello staff. p_sessions arriva
-- dall'app (composizione e date calcolate da funzioni pure):
-- [{ "position": 0, "type": "onboarding", "calculated_date": "2026-04-14" }, …]
-- ---------------------------------------------------------------------
create function public.create_client_journey(
  p_client_id uuid,
  p_previous_journey_id uuid,
  p_kind text,
  p_duration_months smallint,
  p_start_date date,
  p_end_date date,
  p_include_onboarding boolean,
  p_gift_mode text,
  p_sessions jsonb
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.client_journeys
    (client_id, previous_journey_id, kind, duration_months, start_date, end_date,
     include_onboarding, gift_mode)
  values
    (p_client_id, p_previous_journey_id, p_kind, p_duration_months, p_start_date, p_end_date,
     p_include_onboarding, p_gift_mode)
  returning id into v_id;

  insert into public.journey_sessions (journey_id, studio_id, client_id, position, type, calculated_date)
  select v_id, '00000000-0000-0000-0000-000000000000'::uuid, p_client_id,
         (s->>'position')::smallint, s->>'type', (s->>'calculated_date')::date
    from jsonb_array_elements(p_sessions) s;
  return v_id;
end;
$$;
revoke execute on function public.create_client_journey(uuid, uuid, text, smallint, date, date, boolean, text, jsonb) from public, anon;
grant execute on function public.create_client_journey(uuid, uuid, text, smallint, date, date, boolean, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Registro delle notifiche del percorso
-- ---------------------------------------------------------------------
create table public.journey_notifications (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.journey_sessions(id) on delete cascade,
  studio_id      uuid not null references public.studios(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  kind           text not null
                 check (kind in ('date_changed', 'reminder_day_before', 'reminder_same_day')),
  reference_date date not null,
  -- anche l'ora: un cambio della sola ora è una notifica diversa
  reference_time time(0),
  outcome        text not null default 'queued'
                 check (outcome in ('queued', 'sent', 'partial', 'failed', 'not_delivered')),
  error          text check (error is null or char_length(error) <= 200),
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  constraint journey_notifications_once
    unique nulls not distinct (session_id, kind, reference_date, reference_time)
);
create index journey_notifications_client_idx on public.journey_notifications (client_id, created_at desc);

-- ---------------------------------------------------------------------
-- RLS: lo staff dello studio legge e gestisce; il cliente passa dalle
-- funzioni qui sotto; il registro lo scrive solo il server (secret key).
-- ---------------------------------------------------------------------
alter table public.client_journeys enable row level security;
alter table public.journey_sessions enable row level security;
alter table public.journey_notifications enable row level security;
revoke all on public.client_journeys, public.journey_sessions, public.journey_notifications from anon;
revoke delete, truncate on public.client_journeys from authenticated;
revoke insert, update, delete, truncate on public.journey_notifications from authenticated;

create policy "percorsi: lo staff legge" on public.client_journeys
  for select to authenticated using (private.is_studio_member(studio_id));
create policy "percorsi: lo staff crea" on public.client_journeys
  for insert to authenticated with check (private.is_studio_member(studio_id));
create policy "percorsi: lo staff modifica" on public.client_journeys
  for update to authenticated
  using (private.is_studio_member(studio_id)) with check (private.is_studio_member(studio_id));

create policy "sessioni: lo staff legge" on public.journey_sessions
  for select to authenticated using (private.is_studio_member(studio_id));
create policy "sessioni: lo staff crea" on public.journey_sessions
  for insert to authenticated with check (private.is_studio_member(studio_id));
create policy "sessioni: lo staff modifica" on public.journey_sessions
  for update to authenticated
  using (private.is_studio_member(studio_id)) with check (private.is_studio_member(studio_id));
create policy "sessioni: lo staff elimina" on public.journey_sessions
  for delete to authenticated using (private.is_studio_member(studio_id));

create policy "notifiche del percorso: lo staff legge" on public.journey_notifications
  for select to authenticated using (private.is_studio_member(studio_id));

-- ---------------------------------------------------------------------
-- Letture del cliente: solo i propri percorsi, senza nota né omaggio
-- ---------------------------------------------------------------------
create function public.my_journeys()
returns table (
  id uuid, number int, kind text, duration_months smallint, start_date date,
  end_date date, status text, concluded_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select j.id,
         (row_number() over (order by j.created_at))::int,
         j.kind, j.duration_months, j.start_date, j.end_date, j.status, j.concluded_at
    from public.client_journeys j
   where j.client_id = (select private.my_client_id())
   order by j.created_at;
$$;
revoke execute on function public.my_journeys() from public, anon;
grant execute on function public.my_journeys() to authenticated;

create function public.my_journey_sessions()
returns table (
  id uuid, journey_id uuid, seq smallint, type text, session_date date,
  session_time time, status text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.journey_id, s.position,
         case s.type when 'gift' then 'check' else s.type end,
         coalesce(s.custom_date, s.calculated_date), s.session_time, s.status
    from public.journey_sessions s
   where s.client_id = (select private.my_client_id())
   order by s.journey_id, s.position;
$$;
revoke execute on function public.my_journey_sessions() from public, anon;
grant execute on function public.my_journey_sessions() to authenticated;

-- ---------------------------------------------------------------------
-- Promemoria: sessioni da fare in un giorno, di percorsi attivi, per
-- clienti con account attivo (solo service_role). "check_number" è la
-- numerazione che vede il cliente (l'omaggio conta come un check).
-- ---------------------------------------------------------------------
create function public.journey_reminder_candidates(p_studio uuid, p_day date)
returns table (
  session_id uuid, client_id uuid, user_id uuid, type text, check_number int,
  session_date date, session_time time, staff_name text
)
language sql stable security definer set search_path = '' as $$
  with numbered as (
    select s.*,
           case when s.type = 'onboarding' then null
                else (row_number() over (
                        partition by s.journey_id, s.type = 'onboarding' order by s.position))::int
           end as check_number
      from public.journey_sessions s
      join public.client_journeys j on j.id = s.journey_id
     where j.studio_id = p_studio and j.status = 'active'
  )
  select n.id, n.client_id, c.user_id,
         case n.type when 'gift' then 'check' else n.type end,
         n.check_number, coalesce(n.custom_date, n.calculated_date), n.session_time,
         (select m.display_name from public.studio_members m
           where m.studio_id = p_studio and m.role = 'owner'
           order by m.created_at limit 1)
    from numbered n
    join public.clients c on c.id = n.client_id
   where n.status = 'todo'
     and coalesce(n.custom_date, n.calculated_date) = p_day
     and c.account_status = 'active'
     and c.user_id is not null;
$$;
revoke execute on function public.journey_reminder_candidates(uuid, date) from public, anon, authenticated;
grant execute on function public.journey_reminder_candidates(uuid, date) to service_role;

-- ---------------------------------------------------------------------
-- pg_cron: ogni ora al minuto 0 chiama l'endpoint dell'app. URL e segreto
-- sono gli stessi del promemoria serale (Vault): senza, non fa nulla.
-- ---------------------------------------------------------------------
create or replace function private.request_journey_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'notifications_app_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'notifications_cron_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/api/internal/notifications/journeys',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;
revoke execute on function private.request_journey_reminders() from public, anon, authenticated;

select cron.schedule(
  'promemoria-percorsi',
  '0 * * * *',
  'select private.request_journey_reminders()'
);

-- =====================================================================
-- Notifiche push della 1.0: nuovi file e promemoria serale del check-in
--
--   * notification_log: un record per notifica (anche saltata), con
--     dedupe_key unica: due esecuzioni del cron o una conferma ripetuta non
--     producono due invii. Solo url e riferimenti nel payload, mai dati
--     sanitari (N-05). Il cliente legge i propri; lo staff nessun accesso
--     nella 1.0; scrive solo il server (service_role). Conservazione 90
--     giorni (purge_notification_log, cron di manutenzione).
--   * notification_preferences: per utente; senza riga valgono i default
--     (tutto attivo). Il cliente gestisce solo la propria riga.
--   * push_subscriptions: esito degli invii; oltre N fallimenti consecutivi
--     la sottoscrizione si elimina (record_push_results).
--   * studios.timezone: fuso dell'ora del promemoria (nome IANA, verificato
--     dall'applicazione).
--   * daily_reminder_candidates: clienti a cui spetta il promemoria.
--   * pg_cron ogni ora al minuto 0 chiama l'endpoint dell'app con pg_net;
--     URL e segreto stanno nel Vault (senza, il job non fa nulla).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fuso dello studio
-- ---------------------------------------------------------------------
alter table public.studios
  add column timezone text not null default 'Europe/Rome'
    check (char_length(timezone) between 1 and 64);

-- ---------------------------------------------------------------------
-- Registro delle notifiche
-- ---------------------------------------------------------------------
create table public.notification_log (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references public.studios(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  type           text not null
                 check (type in ('file_diet', 'file_workout', 'file_report', 'daily_checkin')),
  dedupe_key     text not null unique check (char_length(dedupe_key) <= 200),
  -- solo url, tag e riferimenti (id): mai titoli, note o valori
  payload        jsonb not null default '{}'::jsonb,
  status         text not null default 'queued'
                 check (status in ('queued', 'sent', 'partial', 'failed', 'skipped')),
  skipped_reason text check (skipped_reason is null or char_length(skipped_reason) <= 40),
  error          text check (error is null or char_length(error) <= 200),
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  constraint notification_log_skipped check ((status = 'skipped') = (skipped_reason is not null))
);
create index notification_log_created_idx on public.notification_log (created_at);
create index notification_log_client_idx on public.notification_log (client_id, created_at desc);

alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon;
revoke insert, update, delete, truncate on public.notification_log from authenticated;

create policy "notifiche: il cliente legge le proprie" on public.notification_log
  for select to authenticated
  using (user_id = (select private.session_uid()));

-- ---------------------------------------------------------------------
-- Preferenze
-- ---------------------------------------------------------------------
create table public.notification_preferences (
  user_id                uuid primary key references auth.users(id) on delete cascade
                         default auth.uid(),
  files_enabled          boolean not null default true,
  daily_reminder_enabled boolean not null default true,
  updated_at             timestamptz not null default now()
);

create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from anon;
revoke delete, truncate on public.notification_preferences from authenticated;

create or replace function private.is_client_user(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clients where user_id = p_user);
$$;
revoke execute on function private.is_client_user(uuid) from public, anon;
grant execute on function private.is_client_user(uuid) to authenticated, service_role;

create policy "preferenze: il cliente legge le proprie" on public.notification_preferences
  for select to authenticated
  using (user_id = (select private.session_uid()));
create policy "preferenze: il cliente crea la propria" on public.notification_preferences
  for insert to authenticated
  with check (
    user_id = (select private.session_uid())
    and private.is_client_user((select private.session_uid()))
  );
create policy "preferenze: il cliente modifica la propria" on public.notification_preferences
  for update to authenticated
  using (user_id = (select private.session_uid()))
  with check (user_id = (select private.session_uid()));

-- ---------------------------------------------------------------------
-- Esito degli invii sulle sottoscrizioni
-- ---------------------------------------------------------------------
alter table public.push_subscriptions
  add column last_success_at timestamptz,
  add column last_failure_at timestamptz,
  add column failure_count   int not null default 0 check (failure_count >= 0);

-- Una nuova registrazione dello stesso endpoint riparte da zero fallimenti
create or replace function public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select private.session_uid());
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Utente non autenticato';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        failure_count = 0,
        last_failure_at = null
  returning id into v_id;
  return v_id;
end;
$$;

/*
 * Esito di un invio: i riusciti azzerano i fallimenti, i falliti li
 * incrementano; chi arriva a p_max_failures consecutivi viene eliminato
 * (il browser se ne accorge e il banner ricompare). Restituisce quante
 * sottoscrizioni sono state eliminate.
 */
create or replace function public.record_push_results(
  p_succeeded text[], p_failed text[], p_max_failures int default 5
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  update public.push_subscriptions
     set last_success_at = now(), failure_count = 0
   where endpoint = any(coalesce(p_succeeded, '{}'));
  update public.push_subscriptions
     set last_failure_at = now(), failure_count = failure_count + 1
   where endpoint = any(coalesce(p_failed, '{}'));
  delete from public.push_subscriptions
   where endpoint = any(coalesce(p_failed, '{}'))
     and failure_count >= greatest(p_max_failures, 1);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.record_push_results(text[], text[], int) from public, anon, authenticated;
grant execute on function public.record_push_results(text[], text[], int) to service_role;

-- ---------------------------------------------------------------------
-- Candidati al promemoria serale
-- ---------------------------------------------------------------------
/*
 * Clienti dello studio con account attivo, In percorso, almeno un
 * dispositivo e il promemoria non disattivato. Per ognuno: se ha già tutte
 * le abitudini giornaliere attive del giorno (anche inserite dallo staff) e
 * se ha almeno un allenamento nel giorno. Il giorno lo calcola l'app nel
 * fuso dello studio.
 */
create or replace function public.daily_reminder_candidates(p_studio uuid, p_day date)
returns table (client_id uuid, user_id uuid, habits_done boolean, workout_done boolean)
language sql stable security definer set search_path = '' as $$
  with habits as (
    select id from public.metrics
     where studio_id = p_studio and is_active and frequency = 'daily'
  )
  select c.id, c.user_id,
         (select count(*) from habits) > 0
           and (select count(distinct e.metric_id)
                  from public.tracking_entries e
                 where e.client_id = c.id and e.recorded_on = p_day
                   and e.metric_id in (select id from habits))
               = (select count(*) from habits),
         exists (
           select 1 from public.tracking_entries e
             join public.metrics m on m.id = e.metric_id
            where e.client_id = c.id and e.recorded_on = p_day
              and m.frequency = 'per_session'
         )
    from public.clients c
   where c.studio_id = p_studio
     and c.account_status = 'active'
     and c.journey_stage = 'in_progress'
     and c.user_id is not null
     and exists (select 1 from public.push_subscriptions s where s.user_id = c.user_id)
     and coalesce((select p.daily_reminder_enabled from public.notification_preferences p
                    where p.user_id = c.user_id), true);
$$;
revoke execute on function public.daily_reminder_candidates(uuid, date) from public, anon, authenticated;
grant execute on function public.daily_reminder_candidates(uuid, date) to service_role;

-- ---------------------------------------------------------------------
-- Conservazione del registro (cron di manutenzione)
-- ---------------------------------------------------------------------
create or replace function public.purge_notification_log(p_older_than_days int default 90)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  delete from public.notification_log
   where created_at < now() - make_interval(days => greatest(p_older_than_days, 1));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.purge_notification_log(int) from public, anon, authenticated;
grant execute on function public.purge_notification_log(int) to service_role;

-- ---------------------------------------------------------------------
-- Pianificazione: pg_cron ogni ora al minuto 0 → endpoint dell'app
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

/*
 * Chiama POST {app_url}/api/internal/notifications/daily-checkin con
 * `Authorization: Bearer {cron_secret}`. I due valori stanno nel Vault
 * (`notifications_app_url`, `notifications_cron_secret`, vedi
 * docs/operativita.md): senza, non fa nulla (sviluppo locale, anteprime).
 * È l'app a decidere quali studi sono alle 20 nel proprio fuso.
 */
create or replace function private.request_daily_checkin()
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
    url := rtrim(v_url, '/') || '/api/internal/notifications/daily-checkin',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;
revoke execute on function private.request_daily_checkin() from public, anon, authenticated;

select cron.schedule(
  'promemoria-checkin',
  '0 * * * *',
  'select private.request_daily_checkin()'
);

-- =====================================================================
-- Check delle misure (peso e circonferenze) con data scelta dallo staff
--
--   * clients.measure_check_on: data del prossimo check decisa dal
--     nutrizionista (null = predefinita, ultima registrazione mensile + 30
--     giorni). measure_check_set_at la scrive solo il trigger: una
--     registrazione mensile inserita dopo questo istante fa ripartire il
--     calcolo da registrazione + 30 (src/lib/domain/tracking/measure-check.ts).
--     Il cliente non la modifica (guard_client: non è tra i suoi campi).
--   * Promemoria alle 6 del giorno prima e del giorno stesso: tipo
--     'measure_check' nel registro, preferenza measure_check_enabled,
--     candidati dalla RPC measure_check_candidates (solo service_role).
--     Lo chiama lo stesso job orario del promemoria serale.
-- =====================================================================

alter table public.clients
  add column measure_check_on date,
  add column measure_check_set_at timestamptz;

create or replace function private.stamp_measure_check()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.measure_check_on is distinct from old.measure_check_on then
    new.measure_check_set_at := case when new.measure_check_on is null then null else now() end;
  else
    new.measure_check_set_at := old.measure_check_set_at;
  end if;
  return new;
end;
$$;

create trigger clients_stamp_measure_check
  before insert or update on public.clients
  for each row execute function private.stamp_measure_check();

-- ---------------------------------------------------------------------
-- Registro e preferenze
-- ---------------------------------------------------------------------
alter table public.notification_log drop constraint notification_log_type_check;
alter table public.notification_log add constraint notification_log_type_check
  check (type in ('file_diet', 'file_workout', 'file_report', 'daily_checkin', 'video', 'measure_check'));

alter table public.notification_preferences
  add column measure_check_enabled boolean not null default true;

-- ---------------------------------------------------------------------
-- Candidati: clienti attivi In percorso, con un dispositivo e il
-- promemoria non spento, con i dati da cui l'app ricava la data del check.
-- ---------------------------------------------------------------------
create function public.measure_check_candidates(p_studio uuid)
returns table (
  client_id uuid,
  user_id uuid,
  measure_check_on date,
  measure_check_set_at timestamptz,
  last_recorded_on date,
  last_created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.user_id, c.measure_check_on, c.measure_check_set_at,
         last.recorded_on, last.created_at
    from public.clients c
    left join lateral (
      select max(e.recorded_on) as recorded_on, max(e.created_at) as created_at
        from public.tracking_entries e
        join public.metrics m on m.id = e.metric_id
       where e.client_id = c.id and m.frequency = 'monthly_30d'
    ) last on true
   where c.studio_id = p_studio
     and c.account_status = 'active'
     and c.journey_stage = 'in_progress'
     and c.user_id is not null
     and exists (select 1 from public.push_subscriptions s where s.user_id = c.user_id)
     and coalesce((select p.measure_check_enabled from public.notification_preferences p
                    where p.user_id = c.user_id), true);
$$;
revoke execute on function public.measure_check_candidates(uuid) from public, anon, authenticated;
grant execute on function public.measure_check_candidates(uuid) to service_role;

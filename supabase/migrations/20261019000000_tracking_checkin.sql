-- =====================================================================
-- Fase 6: check-in giornaliero (T-06)
--   * save_daily_checkin: passi, sonno e acqua salvati in un'unica
--     istruzione (tutti o nessuno), con inserimento o correzione del voto
--     del giorno. Serve una funzione perché l'indice "un valore al giorno"
--     è parziale (where is_daily) e PostgREST non sa indicarne il predicato
--     nell'on_conflict di un upsert.
-- Il controllo "data non futura" (validate_tracking_entry) usa già
-- private.today_rome(): nessuna correzione necessaria.
-- =====================================================================

-- p_values: oggetto { chiave della misura: voto }, per esempio {"steps": 4, "water": 3}.
-- Security invoker: valgono la RLS (solo il cliente In percorso scrive le
-- proprie registrazioni) e il trigger validate_tracking_entry (limiti, interi).
create or replace function public.save_daily_checkin(
  p_client_id uuid, p_recorded_on date, p_values jsonb
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_studio uuid;
  v_today date := private.today_rome();
  v_count int;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'object' or p_values = '{}'::jsonb then
    raise exception 'Il check-in deve contenere almeno un voto' using errcode = 'check_violation';
  end if;
  -- solo oggi o ieri, nel fuso di Roma
  if p_recorded_on is null or p_recorded_on not in (v_today, v_today - 1) then
    raise exception 'Il check-in si compila solo per oggi o per ieri' using errcode = 'check_violation';
  end if;

  select studio_id into v_studio from public.clients where id = p_client_id;
  if v_studio is null then
    raise exception 'Cliente non trovato' using errcode = 'no_data_found';
  end if;

  -- ogni chiave deve essere un'abitudine giornaliera attiva dello studio
  select count(*) into v_count
    from jsonb_object_keys(p_values) as k(key)
    left join public.metrics m
      on m.studio_id = v_studio and m.key = k.key and m.frequency = 'daily' and m.is_active
   where m.id is null;
  if v_count > 0 then
    raise exception 'Il check-in accetta solo le abitudini giornaliere' using errcode = 'check_violation';
  end if;

  insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
  select p_client_id, m.id, (v.value #>> '{}')::numeric, p_recorded_on
    from jsonb_each(p_values) as v(key, value)
    join public.metrics m on m.studio_id = v_studio and m.key = v.key
  on conflict (client_id, metric_id, recorded_on) where is_daily
  do update set value = excluded.value;
end;
$$;

revoke execute on function public.save_daily_checkin(uuid, date, jsonb) from public, anon;
grant execute on function public.save_daily_checkin(uuid, date, jsonb) to authenticated, service_role;

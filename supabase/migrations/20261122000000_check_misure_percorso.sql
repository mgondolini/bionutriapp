-- =====================================================================
-- Check delle misure allineato al percorso (16 novembre 2026)
-- ---------------------------------------------------------------------
-- Con un percorso attivo il check di peso e circonferenze è la prossima
-- sessione di check (anche omaggio) ancora da fare, non più l'ultima
-- registrazione + 30 giorni o la data scelta dalla pillola del Tracking.
-- La regola sta nell'app (measure-check.ts); qui i candidati del
-- promemoria restituiscono anche le date di quei check, in ordine.
-- =====================================================================

drop function public.measure_check_candidates(uuid);

create function public.measure_check_candidates(p_studio uuid)
returns table (
  client_id uuid,
  user_id uuid,
  measure_check_on date,
  measure_check_set_at timestamptz,
  last_recorded_on date,
  last_created_at timestamptz,
  journey_checks date[]
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.user_id, c.measure_check_on, c.measure_check_set_at,
         last.recorded_on, last.created_at,
         coalesce(checks.days, '{}'::date[])
    from public.clients c
    left join lateral (
      select max(e.recorded_on) as recorded_on, max(e.created_at) as created_at
        from public.tracking_entries e
        join public.metrics m on m.id = e.metric_id
       where e.client_id = c.id and m.frequency = 'monthly_30d'
    ) last on true
    left join lateral (
      select array_agg(coalesce(s.custom_date, s.calculated_date)
                       order by coalesce(s.custom_date, s.calculated_date)) as days
        from public.journey_sessions s
        join public.client_journeys j on j.id = s.journey_id
       where s.client_id = c.id and j.status = 'active'
         and s.status = 'todo' and s.type <> 'onboarding'
    ) checks on true
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

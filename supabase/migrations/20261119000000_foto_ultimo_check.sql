-- =====================================================================
-- Foto di avanzamento: anche all'ultimo check del percorso (13 novembre
-- 2026). All'ultimo check si rifanno le misure e si scattano le foto.
--
-- Regola: multipli di 3 prima dell'ultimo check, più l'ultimo. Il
-- secondo parametro di is_photo_check è ora il numero dell'ultimo check
-- (check del percorso senza onboarding, omaggio compreso), non la durata:
-- 1 anno → 3, 6, 9, 11; 6 mesi → 3, 5; con l'omaggio aggiunto 3, 6, 9, 12
-- e 3, 6. La regola in TypeScript è getPhotoCheckNumbers()
-- (src/lib/photos/checks.ts): vanno cambiate insieme.
-- =====================================================================

drop function private.is_photo_check(int, int);
create function private.is_photo_check(p_check int, p_last int)
returns boolean language sql immutable set search_path = '' as $$
  select p_check is not null and p_check > 0
     and ((p_check % 3 = 0 and p_check < p_last) or p_check = p_last);
$$;

-- Numero dell'ultimo check di un percorso (onboarding escluso).
create or replace function private.journey_last_check(p_journey uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.journey_sessions
   where journey_id = p_journey and type <> 'onboarding';
$$;

create or replace function private.is_photo_session(p_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select s.type = 'onboarding'
      or private.is_photo_check(private.session_check_number(s.id),
                                private.journey_last_check(s.journey_id))
    from public.journey_sessions s
   where s.id = p_session;
$$;

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
     and (n.type = 'onboarding' or private.is_photo_check(n.check_number, n.last_check))
     and not exists (
       select 1 from public.photo_sets ps where ps.session_id = n.id and ps.status = 'saved')
     and c.account_status = 'active'
     and c.user_id is not null
     and c.journey_stage in ('onboarding', 'in_progress');
$$;
revoke execute on function public.photo_reminder_candidates(uuid, date) from public, anon, authenticated;
grant execute on function public.photo_reminder_candidates(uuid, date) to service_role;

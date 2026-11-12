-- =====================================================================
-- Percorso: link Google Meet (mockup v1.0.8.2, A17, A19, C19, C20, C22)
--
--   * clients.meeting_url: link del cliente, usato in tutti i suoi check
--     (lo imposta lo staff; il cliente non lo modifica: guard_client ammette
--     per il cliente solo i campi del proprio profilo).
--   * journey_sessions.meeting_url / meeting_source: link solo per una
--     sessione ('manual' dallo staff; 'google' dalla v2.0, quando l'app
--     creerà la stanza con l'evento); google_event_id resta vuoto fino ad
--     allora. Il link usato è quello della sessione, altrimenti quello del
--     cliente (resolveMeetingUrl in src/lib/domain/journeys/meeting.ts).
--   * Solo https://meet.google.com/xxx-xxxx-xxx, senza parametri: stessa
--     regola dello schema Zod (meetingUrlSchema).
--   * my_journey_sessions() restituisce anche i due link: il cliente li
--     legge solo da qui, per le proprie sessioni.
-- =====================================================================

alter table public.clients
  add column meeting_url text
    constraint clients_meeting_url_format
    check (meeting_url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$');

alter table public.journey_sessions
  add column meeting_url text
    constraint journey_sessions_meeting_url_format
    check (meeting_url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  add column meeting_source text
    constraint journey_sessions_meeting_source
    check (meeting_source in ('manual', 'google')),
  add column google_event_id text
    constraint journey_sessions_google_event_id
    check (google_event_id is null or char_length(google_event_id) between 1 and 1024),
  add constraint journey_sessions_meeting_pair
    check ((meeting_url is null) = (meeting_source is null)),
  add constraint journey_sessions_google_event_source
    check (google_event_id is null or meeting_source = 'google');

-- Il tipo restituito cambia: la funzione va ricreata.
drop function public.my_journey_sessions();

create function public.my_journey_sessions()
returns table (
  id uuid, journey_id uuid, seq smallint, type text, session_date date,
  session_time time, status text, meeting_url text, client_meeting_url text
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.journey_id, s.position,
         case s.type when 'gift' then 'check' else s.type end,
         coalesce(s.custom_date, s.calculated_date), s.session_time, s.status,
         s.meeting_url, c.meeting_url
    from public.journey_sessions s
    join public.clients c on c.id = s.client_id
   where s.client_id = (select private.my_client_id())
   order by s.journey_id, s.position;
$$;
revoke execute on function public.my_journey_sessions() from public, anon;
grant execute on function public.my_journey_sessions() to authenticated;

-- Percorso: link Google Meet per cliente e per sessione. Formato, coppia
-- link/origine, chi li scrive e cosa legge il cliente.
begin;
select plan(13);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('owner1'));
select public.create_client_journey(tests.id('c1'), null, 'first', 6::smallint,
  '2026-11-12', '2027-05-12', false, 'none',
  '[{"position":0,"type":"check","calculated_date":"2026-11-12"},
    {"position":1,"type":"check","calculated_date":"2026-12-18"}]'::jsonb);
select public.create_client_journey(tests.id('c2'), null, 'first', 6::smallint,
  '2026-11-12', '2027-05-12', false, 'none',
  '[{"position":0,"type":"check","calculated_date":"2026-11-12"}]'::jsonb);

select lives_ok(
  $$ update public.clients set meeting_url = 'https://meet.google.com/kqz-mdvr-hdp' where id = tests.id('c1') $$,
  'lo staff salva il link del cliente'
);
select throws_ok(
  $$ update public.clients set meeting_url = 'https://meet.google.com/kqz-mdvr-hdp?authuser=1' where id = tests.id('c1') $$,
  '23514', null, 'niente parametri in coda'
);
select throws_ok(
  $$ update public.clients set meeting_url = 'https://zoom.us/j/123' where id = tests.id('c1') $$,
  '23514', null, 'solo Google Meet'
);
select throws_ok(
  $$ update public.journey_sessions set meeting_url = 'https://meet.google.com/abc-defg-hij'
      where client_id = tests.id('c1') and position = 1 $$,
  '23514', null, 'il link di una sessione richiede l''origine'
);
select lives_ok(
  $$ update public.journey_sessions set meeting_url = 'https://meet.google.com/abc-defg-hij', meeting_source = 'manual'
      where client_id = tests.id('c1') and position = 1 $$,
  'lo staff salva un link solo per una sessione'
);
select throws_ok(
  $$ update public.journey_sessions set meeting_url = 'http://meet.google.com/abc-defg-hij'
      where client_id = tests.id('c1') and position = 1 $$,
  '23514', null, 'solo https'
);
select throws_ok(
  $$ update public.journey_sessions set google_event_id = 'evento'
      where client_id = tests.id('c1') and position = 1 $$,
  '23514', null, 'l''id dell''evento Google solo con origine google'
);
select lives_ok(
  $$ update public.clients set meeting_url = 'https://meet.google.com/xyz-abcd-efg' where id = tests.id('c2') $$,
  'link dell''altro cliente'
);
update public.journey_sessions set meeting_url = 'https://meet.google.com/ooo-oooo-ooo', meeting_source = 'manual'
 where client_id = tests.id('c2');

-- Cliente: legge i propri link solo da my_journey_sessions
select tests.authenticate_as(tests.id('u1'));
select results_eq(
  $$ select seq, meeting_url, client_meeting_url from public.my_journey_sessions() order by seq $$,
  $$ values (0::smallint, null::text, 'https://meet.google.com/kqz-mdvr-hdp'::text),
            (1::smallint, 'https://meet.google.com/abc-defg-hij'::text, 'https://meet.google.com/kqz-mdvr-hdp'::text) $$,
  'il cliente legge il link della sessione e il proprio'
);
select is(
  (select count(*)::int from public.my_journey_sessions()
    where meeting_url = 'https://meet.google.com/ooo-oooo-ooo'
       or client_meeting_url = 'https://meet.google.com/xyz-abcd-efg'),
  0, 'non legge i link di un altro cliente'
);
select is(
  (select count(*)::int from public.journey_sessions), 0,
  'né le sessioni dalla tabella'
);
select throws_ok(
  $$ update public.clients set meeting_url = 'https://meet.google.com/aaa-bbbb-ccc' where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia il proprio link'
);

-- Un altro studio non scrive il link
select tests.authenticate_as(tests.id('owner2'));
select is(
  tests.affected_rows($$ update public.clients set meeting_url = 'https://meet.google.com/aaa-bbbb-ccc' where id = tests.id('c1') $$),
  0, 'lo staff di un altro studio non tocca il link'
);

select * from finish();
rollback;

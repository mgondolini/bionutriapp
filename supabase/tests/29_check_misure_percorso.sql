-- Check delle misure dal percorso: i candidati del promemoria portano le
-- date dei check (anche omaggio) ancora da fare del percorso attivo, in
-- ordine e con la data spostata dallo staff; vuoto senza percorso.
begin;
select plan(4);
select tests.create_fixtures();

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  (tests.id('u1'), 'https://fcm.googleapis.com/fcm/send/p-c1', 'k', 'a');

select tests.clear_authentication();
select is(
  (select journey_checks from public.measure_check_candidates(tests.id('studio1'))
    where client_id = tests.id('c1')),
  '{}'::date[],
  'senza percorso nessuna data'
);

select tests.authenticate_as(tests.id('owner1'));
select public.create_client_journey(tests.id('c1'), null, 'first', 6::smallint,
  '2026-11-12', '2027-05-12', false, 'added',
  '[{"position":0,"type":"gift","calculated_date":"2026-11-12"},
    {"position":1,"type":"check","calculated_date":"2026-12-18"},
    {"position":2,"type":"check","calculated_date":"2027-01-23"}]'::jsonb);
update public.journey_sessions set status = 'done'
 where client_id = tests.id('c1') and position = 0;
update public.journey_sessions set custom_date = '2026-12-20'
 where client_id = tests.id('c1') and position = 1;

select tests.clear_authentication();
select is(
  (select journey_checks from public.measure_check_candidates(tests.id('studio1'))
    where client_id = tests.id('c1')),
  array['2026-12-20', '2027-01-23']::date[],
  'solo i check da fare, con la data spostata, in ordine'
);

update public.journey_sessions set status = 'skipped'
 where client_id = tests.id('c1') and position = 2;
select is(
  (select journey_checks from public.measure_check_candidates(tests.id('studio1'))
    where client_id = tests.id('c1')),
  array['2026-12-20']::date[],
  'un check saltato non conta'
);

update public.client_journeys set status = 'concluded', concluded_at = now()
 where client_id = tests.id('c1');
update public.clients set journey_stage = 'in_progress' where id = tests.id('c1');
select is(
  (select coalesce(journey_checks, '{}') from public.measure_check_candidates(tests.id('studio1'))
    where client_id = tests.id('c1')),
  '{}'::date[],
  'un percorso concluso non conta'
);

select * from finish();
rollback;

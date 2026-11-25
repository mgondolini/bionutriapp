-- Percorsi di 3 mesi ammessi dalla tabella; altre durate rifiutate.
begin;
select plan(2);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ select public.create_client_journey(tests.id('c1'), null, 'first', 3::smallint,
       '2026-11-25', '2027-02-25', true, 'none',
       '[{"position":0,"type":"onboarding","calculated_date":"2026-11-25"},
         {"position":1,"type":"check","calculated_date":"2027-01-10"},
         {"position":2,"type":"check","calculated_date":"2027-02-25"}]'::jsonb) $$,
  'un percorso di 3 mesi si crea'
);
select throws_ok(
  $$ update public.client_journeys set duration_months = 9
      where client_id = tests.id('c1') $$,
  '23514', null, 'una durata diversa da 3, 6 o 12 mesi è rifiutata'
);

select * from finish();
rollback;

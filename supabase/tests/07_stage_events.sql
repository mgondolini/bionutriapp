-- Storico delle fasi (ST-04) popolato dal trigger.
begin;
select plan(10);
select tests.create_fixtures();

select results_eq(
  $$ select from_stage, to_stage, source from public.client_stage_events where client_id = tests.id('c4') $$,
  $$ values (null::text, 'onboarding'::text, 'automatic'::text) $$,
  'la creazione di un nuovo cliente registra la fase iniziale Onboarding'
);
select results_eq(
  $$ select to_stage from public.client_stage_events where client_id = tests.id('c1') $$,
  $$ values ('in_progress'::text) $$,
  'un cliente importato parte In percorso'
);

-- Cambio manuale dal titolare
select tests.authenticate_as(tests.id('owner1'));
update public.clients set journey_stage = 'paused' where id = tests.id('c1');

select results_eq(
  $$ select from_stage, to_stage, changed_by, source from public.client_stage_events
      where client_id = tests.id('c1') order by changed_at desc limit 1 $$,
  $$ values ('in_progress'::text, 'paused'::text, tests.id('owner1'), 'manual'::text) $$,
  'il cambio manuale registra fasi, autore e origine'
);

update public.clients set journey_stage = 'paused' where id = tests.id('c1');
update public.clients set first_name = 'Altro' where id = tests.id('c1');
select is(
  (select count(*)::int from public.client_stage_events where client_id = tests.id('c1')),
  2, 'nessun evento se la fase non cambia'
);

-- Cambio automatico (es. v2.0, appuntamento di onboarding completato)
select set_config('app.stage_source', 'automatic', true);
update public.clients set journey_stage = 'in_progress' where id = tests.id('c4');
select set_config('app.stage_source', '', true);
select results_eq(
  $$ select from_stage, to_stage, changed_by, source from public.client_stage_events
      where client_id = tests.id('c4') order by changed_at desc limit 1 $$,
  $$ values ('onboarding'::text, 'in_progress'::text, null::uuid, 'automatic'::text) $$,
  'il cambio automatico registra origine automatica senza autore'
);

select throws_ok(
  $$ insert into public.client_stage_events (client_id, studio_id, to_stage, source)
     values (tests.id('c1'), tests.id('studio1'), 'completed', 'manual') $$,
  '42501', null, 'lo storico non si scrive a mano'
);
select is(
  tests.affected_rows($$ delete from public.client_stage_events $$),
  0, 'lo storico non si cancella'
);

-- Il titolare dell'altro studio e il cliente non vedono lo storico
select tests.authenticate_as(tests.id('owner2'));
select is_empty($$ select 1 from public.client_stage_events where studio_id = tests.id('studio1') $$,
  'il titolare 2 non vede lo storico dello studio 1');

select tests.authenticate_as(tests.id('u1'));
select is_empty($$ select 1 from public.client_stage_events $$, 'il cliente non vede lo storico');

-- Operazione lato server: origine automatica
select tests.clear_authentication();
update public.clients set journey_stage = 'completed' where id = tests.id('c2');
select is(
  (select source from public.client_stage_events where client_id = tests.id('c2') order by changed_at desc limit 1),
  'automatic', 'un cambio lato server è registrato come automatico'
);

select * from finish();
rollback;

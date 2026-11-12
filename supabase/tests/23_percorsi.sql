-- Percorso: creazione con le sessioni, un solo percorso attivo, isolamento
-- fra studi, letture del cliente senza nota né omaggio, conclusione con la
-- fase Concluso, sola lettura dei conclusi, registro delle notifiche.
begin;
select plan(24);
select tests.create_fixtures();

create function pg_temp.sessions() returns jsonb language sql immutable as $$
  select '[{"position":0,"type":"gift","calculated_date":"2026-11-12"},
           {"position":1,"type":"check","calculated_date":"2026-12-18"},
           {"position":2,"type":"check","calculated_date":"2027-01-23"}]'::jsonb;
$$;

select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ select public.create_client_journey(tests.id('c1'), null, 'first', 6::smallint,
       '2026-11-12', '2027-05-12', false, 'added', pg_temp.sessions()) $$,
  'lo staff crea un percorso con le sessioni'
);
select is(
  (select count(*)::int from public.journey_sessions s
     join public.client_journeys j on j.id = s.journey_id
    where j.client_id = tests.id('c1') and s.studio_id = tests.id('studio1')),
  3, 'le sessioni prendono studio e cliente dal percorso'
);
select throws_ok(
  $$ select public.create_client_journey(tests.id('c1'), null, 'first', 6::smallint,
       '2026-11-12', '2027-05-12', false, 'none', pg_temp.sessions()) $$,
  '23505', null, 'un solo percorso attivo per cliente'
);
select throws_ok(
  $$ select public.create_client_journey(tests.id('c2'), null, 'first', 6::smallint,
       '2026-11-12', '2027-05-13', false, 'none', '[]'::jsonb) $$,
  '23514', null, 'la data di fine è inizio + durata'
);
select throws_ok(
  $$ select public.create_client_journey(tests.id('c2'),
       (select id from public.client_journeys where client_id = tests.id('c1')),
       'extension', 6::smallint, '2026-11-12', '2027-05-12', false, 'none', '[]'::jsonb) $$,
  '23514', null, 'il percorso precedente è dello stesso cliente'
);
select lives_ok(
  $$ update public.journey_sessions set custom_date = '2026-12-20', session_time = '10:30', note = 'Portare le misure'
      where position = 1 and client_id = tests.id('c1') $$,
  'lo staff cambia data, ora e nota di una sessione'
);
select is(
  (select updated_by from public.journey_sessions where position = 1 and client_id = tests.id('c1')),
  tests.id('owner1'), 'l''autore della modifica lo scrive il trigger'
);

-- Altro studio
select tests.authenticate_as(tests.id('owner2'));
select is((select count(*)::int from public.client_journeys), 0, 'lo staff di un altro studio non vede i percorsi');
select is((select count(*)::int from public.journey_sessions), 0, 'né le sessioni');
select throws_ok(
  $$ select public.create_client_journey(tests.id('c1'), null, 'first', 6::smallint,
       '2026-11-12', '2027-05-12', false, 'none', '[]'::jsonb) $$,
  '42501', null, 'né crea percorsi per i clienti di un altro studio'
);

-- Cliente
select tests.authenticate_as(tests.id('u1'));
select is((select count(*)::int from public.client_journeys), 0, 'il cliente non legge la tabella dei percorsi');
select is((select count(*)::int from public.journey_sessions), 0, 'né quella delle sessioni (nota e omaggio)');
select is((select count(*)::int from public.my_journeys()), 1, 'legge i propri percorsi dalla funzione');
select results_eq(
  $$ select seq, type, session_date, session_time from public.my_journey_sessions() order by seq $$,
  $$ values (0::smallint, 'check'::text, '2026-11-12'::date, null::time),
            (1::smallint, 'check', '2026-12-20'::date, '10:30'::time),
            (2::smallint, 'check', '2027-01-23'::date, null::time) $$,
  'l''omaggio compare come check, con la data effettiva e senza nota'
);
select throws_ok(
  $$ select public.create_client_journey(tests.id('c1'), null, 'first', 6::smallint,
       '2026-11-12', '2027-05-12', false, 'none', '[]'::jsonb) $$,
  '42501', null, 'il cliente non crea percorsi'
);

select tests.authenticate_as(tests.id('u2'));
select is((select count(*)::int from public.my_journey_sessions()), 0, 'un altro cliente non vede le sessioni di c1');

-- Conclusione con la fase Concluso
select tests.authenticate_as(tests.id('owner1'));
select public.set_journey_stage(tests.id('c1'), 'in_progress', 'completed');
select is(
  (select status from public.client_journeys where client_id = tests.id('c1')), 'concluded',
  'con la fase Concluso il percorso attivo si conclude'
);
select throws_ok(
  $$ update public.journey_sessions set status = 'done' where client_id = tests.id('c1') $$,
  '23514', null, 'le sessioni di un percorso concluso sono in sola lettura'
);
select lives_ok(
  $$ select public.create_client_journey(tests.id('c1'),
       (select id from public.client_journeys where client_id = tests.id('c1')),
       'extension', 6::smallint, '2026-11-12', '2027-05-12', false, 'added', pg_temp.sessions()) $$,
  'dal concluso nasce un nuovo percorso collegato'
);

-- Registro e candidati
select throws_ok(
  $$ select * from public.journey_reminder_candidates(tests.id('studio1'), '2026-11-12') $$,
  '42501', null, 'i candidati ai promemoria si leggono solo dal server'
);
select tests.clear_authentication();
insert into public.journey_notifications (session_id, studio_id, client_id, kind, reference_date)
select id, studio_id, client_id, 'reminder_day_before', '2026-11-12'
  from public.journey_sessions where client_id = tests.id('c1') and position = 0
   and journey_id = (select id from public.client_journeys where client_id = tests.id('c1') and status = 'active');
select throws_ok(
  $$ insert into public.journey_notifications (session_id, studio_id, client_id, kind, reference_date)
     select id, studio_id, client_id, 'reminder_day_before', '2026-11-12'
       from public.journey_sessions where client_id = tests.id('c1') and position = 0
        and journey_id = (select id from public.client_journeys where client_id = tests.id('c1') and status = 'active') $$,
  '23505', null, 'la stessa notifica non si registra due volte'
);
select results_eq(
  $$ select type, check_number from public.journey_reminder_candidates(tests.id('studio1'), '2026-11-12') $$,
  $$ values ('check'::text, 1) $$,
  'il promemoria vede l''omaggio come Check 1'
);

update public.journey_sessions set status = 'done'
 where client_id = tests.id('c1') and position = 0
   and journey_id = (select id from public.client_journeys where client_id = tests.id('c1') and status = 'active');
select is_empty(
  $$ select 1 from public.journey_reminder_candidates(tests.id('studio1'), '2026-11-12') $$,
  'nessun promemoria per una sessione completata'
);
select is_empty(
  $$ select 1 from public.journey_reminder_candidates(tests.id('studio1'), '2026-11-13') $$,
  'nessun promemoria per un giorno senza sessioni'
);

select * from finish();
rollback;

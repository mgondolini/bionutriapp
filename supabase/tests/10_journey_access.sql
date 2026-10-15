-- Accesso del cliente in base alla fase del percorso:
-- Onboarding = niente file né tracking (C-09); In pausa e Concluso = sola lettura;
-- In percorso = lettura e scrittura delle proprie registrazioni.
begin;
select plan(20);
select tests.create_fixtures();

-- PDF nello Storage (inserito lato server)
insert into storage.objects (bucket_id, name) values
  ('client-files', tests.id('studio1') || '/' || tests.id('c6') || '/' || tests.id('f6') || '.pdf');
insert into public.client_metric_goals (client_id, metric_id, goal_value)
values (tests.id('c6'), tests.metric_id(tests.id('studio1'), 'water'), 2);

-- --- Onboarding ------------------------------------------------------
select tests.authenticate_as(tests.id('u6'));

select results_eq($$ select id from public.clients $$, $$ values (tests.id('c6')) $$,
  'in Onboarding il cliente legge il proprio profilo');
select results_eq($$ select id from public.studios $$, $$ values (tests.id('studio1')) $$,
  'in Onboarding il cliente legge il proprio studio');
select is_empty($$ select 1 from public.client_files $$, 'in Onboarding il cliente non legge i propri file');
select is_empty($$ select 1 from storage.objects where bucket_id = 'client-files' $$,
  'in Onboarding il cliente non legge i PDF nello Storage');
select is_empty($$ select 1 from public.tracking_entries $$, 'in Onboarding il cliente non legge le proprie registrazioni');
select is_empty($$ select 1 from public.client_metric_goals $$, 'in Onboarding il cliente non legge i propri obiettivi');
select is(public.mark_file_read(tests.id('f6')), null, 'in Onboarding mark_file_read non ha effetto');
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c6'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date - 2) $$,
  '42501', null, 'in Onboarding il cliente non registra misure'
);

-- Completato l'onboarding, file e tracking si sbloccano
select tests.clear_authentication();
update public.clients set journey_stage = 'in_progress' where id = tests.id('c6');
select tests.authenticate_as(tests.id('u6'));
select results_eq($$ select id from public.client_files $$, $$ values (tests.id('f6')) $$,
  'In percorso il cliente legge i propri file');
select is((select count(*)::int from storage.objects where bucket_id = 'client-files'), 1,
  'In percorso il cliente legge il proprio PDF');
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c6'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date - 2) $$,
  'In percorso il cliente registra misure'
);

-- --- In pausa --------------------------------------------------------
select tests.authenticate_as(tests.id('u7'));
select results_eq($$ select id from public.tracking_entries $$, $$ values (tests.id('e7')) $$,
  'In pausa il cliente legge le proprie registrazioni');
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c7'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date - 2) $$,
  '42501', null, 'In pausa il cliente non registra misure'
);
select is(tests.affected_rows($$ update public.tracking_entries set value = 86 where id = tests.id('e7') $$),
  0, 'In pausa il cliente non corregge le registrazioni');
select is(tests.affected_rows($$ delete from public.tracking_entries where id = tests.id('e7') $$),
  0, 'In pausa il cliente non elimina le registrazioni');

-- --- Concluso --------------------------------------------------------
select tests.clear_authentication();
update public.clients set journey_stage = 'completed' where id = tests.id('c7');
select tests.authenticate_as(tests.id('u7'));
select isnt_empty($$ select 1 from public.tracking_entries $$, 'Concluso: il cliente legge ancora le proprie registrazioni');
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c7'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date - 2) $$,
  '42501', null, 'Concluso: il cliente non registra misure'
);
select is(tests.affected_rows($$ delete from public.tracking_entries where id = tests.id('e7') $$),
  0, 'Concluso: il cliente non elimina le registrazioni');

-- --- Lo staff scrive in qualsiasi fase ----------------------------------
select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c7'), tests.metric_id(tests.id('studio1'), 'circ_glutes'), 99, current_date - 2) $$,
  'il titolare registra misure anche per un cliente Concluso'
);
select results_eq(
  $$ select private.today_rome() $$,
  $$ select (now() at time zone 'Europe/Rome')::date $$,
  'la data di oggi è calcolata in Europe/Rome'
);

select * from finish();
rollback;

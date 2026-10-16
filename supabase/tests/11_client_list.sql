-- Vista client_list (A-01): una riga per cliente, isolamento fra studi,
-- ultimo file e ultima misura.
begin;
select plan(9);
select tests.create_fixtures();

-- Un secondo file e una misura più recente per c1
insert into public.client_files (client_id, category, title, storage_path, size_bytes, uploaded_at) values
  (tests.id('c1'), 'workout', 'Scheda nuova',
   tests.id('studio1') || '/' || tests.id('c1') || '/' || gen_random_uuid() || '.pdf', 500, now() + interval '1 minute');
insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'steps'), 4, current_date);

select tests.authenticate_as(tests.id('owner1'));

select is((select count(*)::int from public.client_list), 6, 'una riga per ogni cliente dello studio');
select is((select count(distinct id)::int from public.client_list), 6, 'nessun cliente duplicato dai join');
select is_empty($$ select 1 from public.client_list where studio_id = tests.id('studio2') $$,
  'il titolare non vede i clienti di altri studi');
select results_eq(
  $$ select last_file_title, last_file_category, last_entry_on from public.client_list where id = tests.id('c1') $$,
  $$ values ('Scheda nuova'::text, 'workout'::text, current_date) $$,
  'ultimo file e ultima misura del cliente'
);
select results_eq(
  $$ select last_file_title, last_entry_on from public.client_list where id = tests.id('c4') $$,
  $$ values (null::text, null::date) $$,
  'cliente senza file né misure'
);
select results_eq(
  $$ select effective_account_status, journey_stage from public.client_list where id = tests.id('c4') $$,
  $$ values ('to_invite'::text, 'onboarding'::text) $$,
  'stato calcolato e fase'
);

-- Stato calcolato "Invito scaduto"
select tests.clear_authentication();
insert into public.client_invites (client_id, token_hash) values (tests.id('c4'), tests.token_hash('scaduto'));
update public.client_invites set expires_at = now() - interval '1 day' where token_hash = tests.token_hash('scaduto');
select tests.authenticate_as(tests.id('owner1'));
select is((select effective_account_status from public.client_list where id = tests.id('c4')),
  'invite_expired', 'l''invito scaduto è calcolato nella vista');

-- Il cliente vede solo sé stesso; anon nessun accesso
select tests.authenticate_as(tests.id('u1'));
select results_eq($$ select id from public.client_list $$, $$ values (tests.id('c1')) $$,
  'il cliente vede solo la propria riga');
select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.client_list $$, '42501', null, 'anon non legge la vista');

select * from finish();
rollback;

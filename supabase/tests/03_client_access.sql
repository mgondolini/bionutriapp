-- Accesso del cliente: solo i propri dati, solo con account attivo.
begin;
select plan(26);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('u1'));

select results_eq($$ select id from public.clients $$, $$ values (tests.id('c1')) $$, 'il cliente vede solo sé stesso');
select results_eq($$ select id from public.client_files $$, $$ values (tests.id('f1')) $$, 'vede solo i propri file');
select results_eq($$ select id from public.tracking_entries $$, $$ values (tests.id('e1')) $$, 'vede solo le proprie registrazioni');
select results_eq($$ select id from public.studios $$, $$ values (tests.id('studio1')) $$, 'vede solo il proprio studio');
select is((select count(*)::int from public.metrics), 9, 'vede le 9 misure attive del proprio studio');
select is_empty($$ select 1 from public.metrics where studio_id <> tests.id('studio1') $$, 'non vede misure di altri studi');

select is_empty($$ select 1 from public.clients where id = tests.id('c2') $$, 'non legge un altro cliente dello stesso studio');
select is_empty($$ select 1 from public.client_files where id = tests.id('f2') $$, 'non legge i file di un altro cliente');
select is_empty($$ select 1 from public.tracking_entries where id = tests.id('e2') $$, 'non legge le misure di un altro cliente');
select is_empty($$ select 1 from public.client_invites $$, 'non legge alcun invito, nemmeno il proprio');
select is_empty($$ select 1 from public.client_stage_events $$, 'non legge lo storico delle fasi');
select is_empty($$ select 1 from public.studio_members $$, 'non legge i membri dello studio');

select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c2'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date) $$,
  '42501', null, 'non registra misure per un altro cliente'
);
select is(
  tests.affected_rows($$ update public.tracking_entries set value = 99 where id = tests.id('e2') $$),
  0, 'non modifica le misure di un altro cliente'
);
select is(
  tests.affected_rows($$ delete from public.tracking_entries where id = tests.id('e2') $$),
  0, 'non elimina le misure di un altro cliente'
);

select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_glutes'), 95.5, current_date) $$,
  'registra una propria misura'
);
select is(
  tests.affected_rows($$ update public.tracking_entries set value = 81 where id = tests.id('e1') $$),
  1, 'corregge una propria registrazione'
);
select is(
  tests.affected_rows($$ delete from public.tracking_entries where id = tests.id('e1') $$),
  1, 'elimina una propria registrazione'
);

select results_eq(
  $$ select role, client_id, studio_slug from public.my_context() $$,
  $$ values ('client'::text, tests.id('c1'), 'test-uno'::text) $$,
  'my_context riconosce il cliente'
);

-- Account disattivato: nessun accesso
select tests.authenticate_as(tests.id('u5'));
select is_empty($$ select 1 from public.clients $$, 'un cliente disattivato non vede il proprio profilo');
select is_empty($$ select 1 from public.client_files $$, 'un cliente disattivato non vede i propri file');
select results_eq(
  $$ select role, client_id, studio_slug from public.my_context() $$,
  $$ values ('client_disabled'::text, tests.id('c5'), 'test-uno'::text) $$,
  'my_context segnala il cliente disattivato con lo slug dello studio'
);
select tests.authenticate_as(tests.id('owner1'));
select results_eq(
  $$ select role, studio_id, studio_slug from public.my_context() $$,
  $$ values ('owner'::text, tests.id('studio1'), 'test-uno'::text) $$,
  'my_context riconosce il titolare'
);

-- Utente autenticato senza studio né cliente
select tests.authenticate_as(tests.id('stranger'));
select is_empty($$ select 1 from public.clients union all select 1 from public.client_files union all select 1 from public.tracking_entries $$,
  'un utente estraneo non vede nulla');

-- Anonimo: nessun accesso diretto alle tabelle, solo branding pubblico
select tests.authenticate_as_anon();
select throws_ok($$ select 1 from public.client_invites $$, '42501', null, 'anon non legge gli inviti');
select results_eq(
  $$ select name from public.get_studio_branding('test-uno') $$,
  $$ values ('Studio Uno'::text) $$,
  'anon legge il branding pubblico dello studio'
);

select * from finish();
rollback;

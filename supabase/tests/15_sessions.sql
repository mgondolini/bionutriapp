-- Sessioni revocate (fase 7): dopo signOut il JWT di accesso è ancora
-- firmato e non scaduto, ma la sessione non esiste più in auth.sessions.
-- Ruolo, RLS e RPC non devono più funzionare con quel token.
begin;
select plan(12);
select tests.create_fixtures();

-- Sessioni attive del cliente c1 (u1) e del titolare (owner1)
create temp table s (name text primary key, id uuid);
grant select on s to authenticated;
insert into s values
  ('client', tests.new_session(tests.id('u1'))),
  ('owner',  tests.new_session(tests.id('owner1')));

-- Con la sessione valida tutto funziona
select tests.authenticate_as(tests.id('u1'), (select id from s where name = 'client'));
select is(
  (select count(*)::int from public.my_context()), 1,
  'sessione valida: my_context restituisce il ruolo'
);
select is(
  (select count(*)::int from public.clients where id = tests.id('c1')), 1,
  'sessione valida: il cliente legge il proprio profilo'
);
select tests.authenticate_as(tests.id('owner1'), (select id from s where name = 'owner'));
select ok(
  (select count(*) from public.clients) > 0,
  'sessione valida: lo staff legge i clienti'
);

-- "Esci" / "Esci da tutti i dispositivi": Auth elimina le sessioni
select tests.clear_authentication();
delete from auth.sessions where id in (select id from s);

select tests.authenticate_as(tests.id('u1'), (select id from s where name = 'client'));
select is(
  (select count(*)::int from public.my_context()), 0,
  'sessione revocata: nessun ruolo (il proxy la tratta come scaduta)'
);
select is(
  (select count(*)::int from public.clients), 0,
  'sessione revocata: il cliente non legge più il profilo'
);
select is(
  (select count(*)::int from public.client_files), 0,
  'sessione revocata: nessun file'
);
select is(
  (select count(*)::int from public.tracking_entries), 0,
  'sessione revocata: nessuna registrazione'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date) $$,
  '42501', null, 'sessione revocata: nessuna scrittura'
);
select throws_ok(
  $$ select public.update_my_client_profile('X', 'Y', null) $$,
  'P0002', null, 'sessione revocata: il profilo non si modifica'
);

select tests.authenticate_as(tests.id('owner1'), (select id from s where name = 'owner'));
select is(
  (select count(*)::int from public.clients), 0,
  'sessione revocata: lo staff non legge più i clienti'
);
select is(
  (select count(*)::int from public.studio_members), 0,
  'sessione revocata: lo staff non legge più lo studio'
);

-- JWT senza session_id (o con una sessione inventata): come revocato
select set_config('request.jwt.claims',
  json_build_object('sub', tests.id('u1'), 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from public.my_context()), 0,
  'JWT senza sessione: nessun ruolo'
);

select * from finish();
rollback;

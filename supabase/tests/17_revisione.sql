-- Revisione di sicurezza (fase 9): consensi privacy, nome dello studio nei
-- metadati di Auth, funzioni della manutenzione, funzioni esposte ad anon,
-- isolamento fra studi delle viste.
begin;
select plan(25);
select tests.create_fixtures();

-- ---------------------------------------------------------------------
-- Funzioni eseguibili da anon: solo il branding pubblico (lo schema
-- private non è esposto e anon non vi ha accesso)
-- ---------------------------------------------------------------------
select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon non accede allo schema private'
);
select is_empty(
  $$ select p.proname::text
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and has_function_privilege('anon', p.oid, 'execute')
        and p.proname <> 'get_studio_branding' $$,
  'anon esegue solo get_studio_branding'
);

-- ---------------------------------------------------------------------
-- Consensi privacy (NF-06)
-- ---------------------------------------------------------------------
insert into public.client_invites (client_id, token_hash) values (tests.id('c4'), tests.token_hash('c4-consensi'));
select public.activate_client(tests.token_hash('c4-consensi'), tests.id('u4'),
  '{"first_name":"Quattro","last_name":"Nuovo","privacy_notice":true,"health_data":true,"policy_version":"1.0"}');

select results_eq(
  $$ select kind, policy_version from public.privacy_consents
      where client_id = tests.id('c4') order by kind $$,
  $$ values ('health_data'::text, '1.0'::text), ('privacy_notice', '1.0') $$,
  'all''attivazione si registrano i due consensi con la versione dell''informativa'
);
select isnt(
  (select privacy_consent_at from public.clients where id = tests.id('c4')), null,
  'il consenso ai dati sanitari valorizza anche privacy_consent_at'
);

-- Un nuovo link a un cliente già attivo non aggiunge consensi
insert into public.client_invites (client_id, token_hash) values (tests.id('c4'), tests.token_hash('c4-reset'));
select public.activate_client(tests.token_hash('c4-reset'), tests.id('u4'),
  '{"privacy_notice":true,"health_data":true,"policy_version":"2.0"}');
select is(
  (select count(*)::int from public.privacy_consents where client_id = tests.id('c4')), 2,
  'il link di reimpostazione non registra nuovi consensi'
);

-- Senza consensi nel profilo non si registra nulla
select is(
  (select count(*)::int from public.privacy_consents where client_id = tests.id('c1')), 0,
  'attivazione senza consensi: nessuna riga'
);

select tests.authenticate_as(tests.id('u4'));
select is(
  (select count(*)::int from public.privacy_consents), 2,
  'il cliente legge i propri consensi'
);
select throws_ok(
  $$ insert into public.privacy_consents (studio_id, client_id, kind, policy_version)
     values (tests.id('studio1'), tests.id('c4'), 'health_data', 'falsa') $$,
  '42501', null, 'il cliente non inserisce consensi'
);
select throws_ok(
  $$ delete from public.privacy_consents $$,
  '42501', null, 'il cliente non elimina i propri consensi'
);

select tests.authenticate_as(tests.id('u1'));
select is(
  (select count(*)::int from public.privacy_consents where client_id = tests.id('c4')), 0,
  'un altro cliente non legge i consensi'
);

select tests.authenticate_as(tests.id('owner1'));
select is(
  (select count(*)::int from public.privacy_consents where client_id = tests.id('c4')), 2,
  'lo staff dello studio legge i consensi dei propri clienti'
);
select throws_ok(
  $$ update public.privacy_consents set policy_version = 'x' $$,
  '42501', null, 'lo staff non modifica i consensi'
);

select tests.authenticate_as(tests.id('owner2'));
select is(
  (select count(*)::int from public.privacy_consents), 0,
  'lo staff di un altro studio non legge i consensi'
);
select tests.clear_authentication();

-- ---------------------------------------------------------------------
-- Nome dello studio per i modelli delle email (N-07)
-- ---------------------------------------------------------------------
select is(
  (select raw_user_meta_data ->> 'studio_name' from auth.users where id = tests.id('u1')),
  (select name from public.studios where id = tests.id('studio1')),
  'il cliente attivato riceve il nome dello studio nei metadati'
);
select is(
  (select raw_user_meta_data ->> 'studio_name' from auth.users where id = tests.id('owner1')),
  (select name from public.studios where id = tests.id('studio1')),
  'il titolare riceve il nome dello studio nei metadati'
);

update public.studios set name = 'Studio Rinominato' where id = tests.id('studio1');
select results_eq(
  $$ select raw_user_meta_data ->> 'studio_name' from auth.users
      where id in (tests.id('u1'), tests.id('owner1')) $$,
  $$ values ('Studio Rinominato'::text), ('Studio Rinominato') $$,
  'cambiando il nome dello studio si aggiornano clienti e staff'
);
select isnt(
  (select raw_user_meta_data ->> 'studio_name' from auth.users where id = tests.id('u3')),
  'Studio Rinominato',
  'gli utenti di un altro studio non cambiano'
);

-- ---------------------------------------------------------------------
-- Manutenzione (cron): oggetti orfani e inviti scaduti
-- ---------------------------------------------------------------------
insert into storage.objects (bucket_id, name, created_at) values
  ('client-files', tests.id('studio1') || '/' || tests.id('c1') || '/' || gen_random_uuid() || '.pdf', now() - interval '2 days'),
  ('client-files', tests.id('studio1') || '/' || tests.id('c1') || '/' || gen_random_uuid() || '.pdf', now() - interval '1 hour'),
  ('client-files', tests.id('studio1') || '/' || tests.id('c1') || '/' || tests.id('f1') || '.pdf', now() - interval '2 days');

select is(
  (select count(*)::int from public.list_orphan_client_files(24)), 1,
  'solo l''oggetto senza riga e più vecchio di 24 ore è orfano'
);

-- Inviti: uno scaduto da 100 giorni, uno da 30
insert into public.client_invites (client_id, token_hash) values (tests.id('c4'), tests.token_hash('vecchio'));
update public.client_invites set revoked_at = now() - interval '100 days',
       created_at = now() - interval '114 days', expires_at = now() - interval '100 days'
 where token_hash = tests.token_hash('vecchio');
insert into public.client_invites (client_id, token_hash) values (tests.id('c4'), tests.token_hash('recente'));
update public.client_invites set created_at = now() - interval '44 days', expires_at = now() - interval '30 days'
 where token_hash = tests.token_hash('recente');

select is(public.purge_expired_invites(90), 1, 'si eliminano solo gli inviti scaduti da oltre 90 giorni');
select is(
  (select count(*)::int from public.client_invites where token_hash = tests.token_hash('recente')), 1,
  'l''invito scaduto da 30 giorni resta'
);

select tests.authenticate_as(tests.id('owner1'));
select throws_ok(
  $$ select public.purge_expired_invites(0) $$,
  '42501', null, 'lo staff non esegue la pulizia degli inviti'
);
select throws_ok(
  $$ select public.list_orphan_client_files(0) $$,
  '42501', null, 'lo staff non elenca gli oggetti dello Storage'
);

-- ---------------------------------------------------------------------
-- Viste: isolamento fra studi
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('owner2'));
select is(
  (select count(*)::int from public.client_list where studio_id = tests.id('studio1')), 0,
  'client_list non mostra i clienti di un altro studio'
);
select is(
  (select count(*)::int from public.client_stage_history where client_id = tests.id('c1')), 0,
  'client_stage_history non mostra lo storico di un altro studio'
);

-- Il cliente non legge lo storico delle fasi
select tests.authenticate_as(tests.id('u1'));
select is(
  (select count(*)::int from public.client_stage_events), 0,
  'il cliente non legge lo storico delle fasi'
);

select * from finish();
rollback;

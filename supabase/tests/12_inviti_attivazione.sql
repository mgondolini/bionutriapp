-- Fase 4: attivazione con correzioni e fase per origine, monouso,
-- cambio di fase (set_journey_stage) e storico con autore.
begin;
select plan(28);
select tests.create_fixtures();

-- ---------------------------------------------------------------------
-- Attivazione di un cliente nuovo (c4) con i dati inseriti dal cliente
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('owner1'));
insert into public.client_invites (client_id, token_hash, sent_at)
values (tests.id('c4'), tests.token_hash('c4-attiva'), now());
-- prima dell'attivazione lo staff mette in pausa (fase diversa da quella prevista)
select ok(public.set_journey_stage(tests.id('c4'), 'onboarding', 'in_progress'), 'lo staff cambia fase prima dell''attivazione');
select tests.clear_authentication();

select is(
  public.activate_client(tests.token_hash('c4-attiva'), tests.id('u4'),
    '{"first_name":"Quattro","last_name":"Nuovo","email":"c4@test.local","birth_date":"1990-05-01","privacy_consent":true}'),
  tests.id('c4'), 'il cliente nuovo si attiva con i propri dati'
);
select results_eq(
  $$ select first_name, last_name, email, birth_date, account_status, journey_stage,
            privacy_consent_at is not null, user_id
       from public.clients where id = tests.id('c4') $$,
  $$ values ('Quattro'::text, 'Nuovo'::text, 'c4@test.local'::text, date '1990-05-01', 'active'::text,
            'onboarding'::text, true, tests.id('u4')) $$,
  'dati corretti salvati, consenso registrato, fase Onboarding per un cliente nuovo'
);
select results_eq(
  $$ select from_stage, to_stage, source, changed_by from public.client_stage_events
      where client_id = tests.id('c4') order by changed_at desc limit 1 $$,
  $$ values ('in_progress'::text, 'onboarding'::text, 'automatic'::text, null::uuid) $$,
  'il ritorno alla fase prevista è registrato come automatico'
);
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c4-attiva'), tests.id('u4')) $$,
  'P0001', 'Invito non valido o scaduto', 'il link è monouso'
);

-- ---------------------------------------------------------------------
-- Cliente importato: la fase resta In percorso, nessun evento in più
-- ---------------------------------------------------------------------
insert into public.clients (id, studio_id, first_name, last_name, phone, email, origin)
values ('40000000-0000-4000-a000-0000000000aa', tests.id('studio1'), 'Import', 'Ato', '3330000199', 'imp@test.local', 'imported');
select tests.create_user('30000000-0000-4000-a000-0000000000aa', 'imp-user@test.local');
insert into public.client_invites (client_id, token_hash) values ('40000000-0000-4000-a000-0000000000aa', tests.token_hash('imp'));
select lives_ok(
  $$ select public.activate_client(tests.token_hash('imp'), '30000000-0000-4000-a000-0000000000aa',
       '{"first_name":"Importato","last_name":null,"email":null,"birth_date":null,"privacy_consent":true}') $$,
  'il cliente importato si attiva con le correzioni'
);
select results_eq(
  $$ select first_name, last_name, email, journey_stage from public.clients
      where id = '40000000-0000-4000-a000-0000000000aa' $$,
  $$ values ('Importato'::text, null::text, null::text, 'in_progress'::text) $$,
  'campi svuotati dal cliente salvati come null, fase In percorso'
);
select is(
  (select count(*)::int from public.client_stage_events where client_id = '40000000-0000-4000-a000-0000000000aa'),
  1, 'nessun nuovo evento se la fase non cambia'
);

-- ---------------------------------------------------------------------
-- Inviti non utilizzabili e cliente già attivo (nuovo link, N-02)
-- ---------------------------------------------------------------------
insert into public.client_invites (client_id, token_hash) values (tests.id('c1'), tests.token_hash('c1-reset'));
select is(
  public.activate_client(tests.token_hash('c1-reset'), tests.id('u1'), '{"first_name":"Ignorato","privacy_consent":true}'),
  tests.id('c1'), 'un nuovo link a un cliente attivo vale per lo stesso utente'
);
select results_eq(
  $$ select first_name, journey_stage from public.clients where id = tests.id('c1') $$,
  $$ values ('Cliente'::text, 'in_progress'::text) $$,
  'un cliente già attivo non cambia dati né fase'
);
insert into public.client_invites (client_id, token_hash) values (tests.id('c2'), tests.token_hash('c2-altro'));
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c2-altro'), tests.id('u4')) $$,
  'P0001', 'Il cliente è già collegato a un altro account', 'un altro utente non prende un cliente già collegato'
);
select is(
  (select used_at from public.client_invites where token_hash = tests.token_hash('c2-altro')),
  null, 'l''errore annulla anche l''utilizzo dell''invito'
);
insert into public.client_invites (client_id, token_hash) values (tests.id('c7'), tests.token_hash('c7-revocato'));
insert into public.client_invites (client_id, token_hash) values (tests.id('c7'), tests.token_hash('c7-nuovo'));
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c7-revocato'), tests.id('u7')) $$,
  'P0001', 'Invito non valido o scaduto', 'un nuovo invito rende inutilizzabile il precedente'
);
update public.client_invites set expires_at = now() - interval '1 second' where token_hash = tests.token_hash('c7-nuovo');
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c7-nuovo'), tests.id('u7')) $$,
  'P0001', 'Invito non valido o scaduto', 'un invito oltre i 14 giorni non vale'
);
select throws_ok(
  $$ select public.activate_client(tests.token_hash('inesistente'), tests.id('u7')) $$,
  'P0001', 'Invito non valido o scaduto', 'un token sconosciuto non vale'
);

-- ---------------------------------------------------------------------
-- Cambio di fase
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('owner1'));
select ok(public.set_journey_stage(tests.id('c6'), 'onboarding', 'in_progress'), 'Onboarding completato');
select results_eq(
  $$ select from_stage, to_stage, source, changed_by from public.client_stage_events
      where client_id = tests.id('c6') order by changed_at desc limit 1 $$,
  $$ values ('onboarding'::text, 'in_progress'::text, 'manual'::text, tests.id('owner1')) $$,
  'il cambio manuale è registrato con l''autore'
);
select ok(not public.set_journey_stage(tests.id('c6'), 'onboarding', 'in_progress'),
  'se la fase è già cambiata (richiesta concorrente) non aggiorna nulla');
select throws_ok(
  $$ select public.set_journey_stage(tests.id('c6'), 'in_progress', 'onboarding') $$,
  '23514', null, 'non si torna in Onboarding'
);
select throws_ok(
  $$ select public.set_journey_stage(tests.id('c1'), 'in_progress', 'in_progress') $$,
  '23514', null, 'una fase uguale non è un cambio'
);
select ok(public.set_journey_stage(tests.id('c1'), 'in_progress', 'paused'), 'In percorso → In pausa');
select ok(public.set_journey_stage(tests.id('c1'), 'paused', 'completed'), 'In pausa → Concluso');
select ok(public.set_journey_stage(tests.id('c1'), 'completed', 'in_progress'), 'Concluso → In percorso (riprendi)');

-- Cambio automatico (v2.0): autore nullo, origine 'automatic'
select ok(public.set_journey_stage(tests.id('c2'), 'in_progress', 'paused', true), 'cambio automatico');
select results_eq(
  $$ select source, changed_by from public.client_stage_events
      where client_id = tests.id('c2') order by changed_at desc limit 1 $$,
  $$ values ('automatic'::text, null::uuid) $$,
  'il cambio automatico non ha autore'
);

-- Storico con il nome dell'autore, isolato per studio
select is(
  (select changed_by_name from public.client_stage_history
    where client_id = tests.id('c6') order by changed_at desc limit 1),
  'Titolare Uno', 'lo storico mostra il nome dell''autore'
);
select tests.authenticate_as(tests.id('owner2'));
select ok(not public.set_journey_stage(tests.id('c1'), 'in_progress', 'paused'),
  'un titolare non cambia la fase dei clienti di un altro studio');
select is_empty(
  $$ select 1 from public.client_stage_history where studio_id = tests.id('studio1') $$,
  'lo storico di un altro studio non è visibile'
);

select * from finish();
rollback;

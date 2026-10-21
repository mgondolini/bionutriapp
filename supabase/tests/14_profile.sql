-- Profilo (fase 7): il cliente modifica di sé solo nome, cognome e data di
-- nascita (anche in Onboarding), mai cellulare, email, stato, fase o studio,
-- nemmeno con l'API diretta; il professionista solo il proprio nome;
-- clients.email segue l'email confermata in Auth.
begin;
select plan(24);
select tests.create_fixtures();

-- ---------------------------------------------------------------------
-- Cliente
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('u1'));

select lives_ok(
  $$ select public.update_my_client_profile('Giulia', 'Bianchi', '1991-03-12') $$,
  'il cliente aggiorna nome, cognome e data di nascita con la RPC'
);
select tests.clear_authentication();
select results_eq(
  $$ select first_name, last_name, birth_date from public.clients where id = tests.id('c1') $$,
  $$ values ('Giulia'::text, 'Bianchi'::text, '1991-03-12'::date) $$,
  'i valori sono salvati'
);

select tests.authenticate_as(tests.id('u1'));
select lives_ok(
  $$ update public.clients set birth_date = null where id = tests.id('c1') $$,
  'la data di nascita si può anche togliere'
);
select throws_ok(
  $$ update public.clients set phone = '+393331112222' where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia il cellulare con l''API diretta'
);
select throws_ok(
  $$ update public.clients set email = 'altra@test.local' where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia l''email con l''API diretta (segue Auth)'
);
select throws_ok(
  $$ update public.clients set account_status = 'disabled', journey_stage = 'paused' where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia stato e fase'
);
select throws_ok(
  $$ update public.clients set first_name = 'X', journey_stage = 'completed' where id = tests.id('c1') $$,
  'P0001', null, 'un campo consentito non fa passare uno vietato'
);
select throws_ok(
  $$ update public.clients set privacy_consent_at = now() where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia il consenso'
);
select is(
  tests.affected_rows($$ update public.clients set first_name = 'X' where id = tests.id('c2') $$),
  0, 'il cliente non modifica un altro cliente'
);

-- Onboarding: il profilo non è bloccato (C-09 riguarda file e tracking)
select tests.authenticate_as(tests.id('u6'));
select lives_ok(
  $$ select public.update_my_client_profile('Sei', 'Nuovo', null) $$,
  'in Onboarding il cliente modifica il proprio profilo'
);

-- Account disattivato: nessun profilo modificabile
select tests.authenticate_as(tests.id('u5'));
select throws_ok(
  $$ select public.update_my_client_profile('Cinque', 'X', null) $$,
  'P0002', null, 'un cliente disattivato non modifica il profilo'
);

select tests.authenticate_as_anon();
select throws_ok(
  $$ select public.update_my_client_profile('A', 'B', null) $$,
  '42501', null, 'anon non esegue la RPC del profilo'
);

-- ---------------------------------------------------------------------
-- Professionista
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ select public.update_my_member_profile('Elena', 'Verdi', 'Dott.ssa') $$,
  'il professionista aggiorna il proprio nome'
);
select is(
  (select display_name from public.studio_members where user_id = tests.id('owner1')),
  'Dott.ssa Elena Verdi', 'display_name è generato da titolo, nome e cognome'
);
select lives_ok(
  $$ select public.update_my_member_profile('Elena', '', '') $$,
  'titolo e cognome facoltativi'
);
select is(
  (select display_name from public.studio_members where user_id = tests.id('owner1')),
  'Elena', 'senza titolo e cognome resta il nome'
);
select is(
  tests.affected_rows($$ update public.studio_members set role = 'owner', first_name = 'X' where user_id = tests.id('owner2') $$),
  0, 'nessun update diretto su studio_members (nemmeno di un altro studio)'
);
select throws_ok(
  $$ select public.update_my_member_profile('', 'Verdi', null) $$,
  '23514', null, 'il nome del professionista è obbligatorio'
);

select tests.authenticate_as(tests.id('u1'));
select throws_ok(
  $$ select public.update_my_member_profile('X', 'Y', null) $$,
  'P0002', null, 'un cliente non ha un profilo da professionista'
);

-- ---------------------------------------------------------------------
-- Email: disponibilità e sincronizzazione da Auth
-- ---------------------------------------------------------------------
select results_eq(
  $$ select public.my_email_available('c2@test.local'),
            public.my_email_available(' C2@Test.Local '),
            public.my_email_available('c1@test.local'),
            public.my_email_available('c3@test.local') $$,
  $$ values (false, false, true, true) $$,
  'occupata da un altro cliente dello studio (anche in maiuscolo); libera la propria e quella di un altro studio'
);

-- La conferma del cambio la applica Auth (utente supabase_auth_admin, senza auth.uid())
select tests.clear_authentication();
update auth.users set email = 'nuova.c1@test.local' where id = tests.id('u1');
select is(
  (select email from public.clients where id = tests.id('c1')),
  'nuova.c1@test.local', 'clients.email segue l''email confermata in Auth'
);
select throws_ok(
  $$ update auth.users set email = 'c2@test.local' where id = tests.id('u1') $$,
  '23505', null, 'un indirizzo già usato nello studio fa fallire la conferma'
);
select lives_ok(
  $$ update auth.users set email = 'titolare.nuova@test.local' where id = tests.id('owner1') $$,
  'il cambio email dello staff non tocca i clienti'
);
select is(
  (select count(*)::int from public.clients where email = 'titolare.nuova@test.local'),
  0, 'nessun cliente riceve l''email dello staff'
);

select * from finish();
rollback;

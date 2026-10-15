-- Inviti via WhatsApp (N-01, N-02): scadenza, revoca del precedente,
-- stato calcolato, attivazione.
begin;
select plan(22);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('owner1'));

-- Primo invito per c4 (da invitare)
select lives_ok(
  $$ insert into public.client_invites (client_id, token_hash, expires_at)
     values (tests.id('c4'), tests.token_hash('c4-primo'), now() + interval '1 year') $$,
  'il titolare genera un invito'
);
select is(
  (select expires_at - created_at from public.client_invites where token_hash = tests.token_hash('c4-primo')),
  interval '14 days',
  'la scadenza è sempre creazione + 14 giorni'
);
select is((select account_status from public.clients where id = tests.id('c4')), 'invited', 'il cliente passa a "invitato"');
select is(public.client_account_status(tests.id('c4')), 'invited', 'stato calcolato: invitato');

select lives_ok(
  $$ update public.client_invites set sent_at = now() where token_hash = tests.token_hash('c4-primo') $$,
  'il titolare registra l''invio su WhatsApp'
);
select throws_ok(
  $$ update public.client_invites set used_at = now() where token_hash = tests.token_hash('c4-primo') $$,
  'P0001', null, 'il titolare non segna a mano un invito come usato'
);

-- Reinvio: il precedente viene revocato nella stessa transazione
select lives_ok(
  $$ insert into public.client_invites (client_id, token_hash) values (tests.id('c4'), tests.token_hash('c4-secondo')) $$,
  'il titolare genera un nuovo invito'
);
select isnt(
  (select revoked_at from public.client_invites where token_hash = tests.token_hash('c4-primo')),
  null, 'l''invito precedente è revocato'
);
select is(
  (select count(*)::int from public.client_invites where client_id = tests.id('c4') and used_at is null and revoked_at is null),
  1, 'resta un solo invito valido'
);
select throws_ok(
  $$ update public.client_invites set revoked_at = null where token_hash = tests.token_hash('c4-primo') $$,
  'P0001', null, 'un invito revocato non si riattiva'
);
select throws_ok(
  $$ insert into public.client_invites (client_id, token_hash) values (tests.id('c4'), 'token-in-chiaro') $$,
  '23514', null, 'il token in chiaro non viene accettato'
);
select throws_ok(
  $$ insert into public.client_invites (client_id, token_hash) values (tests.id('c5'), tests.token_hash('c5-nuovo')) $$,
  'P0001', null, 'nessun invito a un cliente disattivato'
);

-- L'attivazione è riservata al server
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c4-secondo'), tests.id('u4')) $$,
  '42501', null, 'un utente autenticato non può chiamare activate_client'
);

-- Il cliente non vede gli inviti
select tests.authenticate_as(tests.id('u1'));
select is_empty($$ select 1 from public.client_invites $$, 'il cliente non legge gli inviti');

-- Lato server: attivazione
select tests.clear_authentication();
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c4-primo'), tests.id('u4')) $$,
  'P0001', 'Invito non valido o scaduto', 'l''invito revocato non attiva l''account'
);

-- Invito scaduto: stato calcolato
update public.client_invites set expires_at = now() - interval '1 minute'
 where token_hash = tests.token_hash('c4-secondo');
select is(public.client_account_status(tests.id('c4')), 'invite_expired', 'stato calcolato: invito scaduto');
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c4-secondo'), tests.id('u4')) $$,
  'P0001', 'Invito non valido o scaduto', 'l''invito scaduto non attiva l''account'
);

-- Nuovo invito valido e attivazione
update public.client_invites set expires_at = created_at + interval '14 days'
 where token_hash = tests.token_hash('c4-secondo');
select is(
  public.activate_client(tests.token_hash('c4-secondo'), tests.id('u4')),
  tests.id('c4'), 'l''invito valido attiva il cliente'
);
select results_eq(
  $$ select account_status, user_id, activated_at is not null from public.clients where id = tests.id('c4') $$,
  $$ values ('active'::text, tests.id('u4'), true) $$,
  'account attivo e collegato all''utente'
);
select throws_ok(
  $$ select public.activate_client(tests.token_hash('c4-secondo'), tests.id('u4')) $$,
  'P0001', 'Invito non valido o scaduto', 'il link è monouso'
);

-- Disattivando il cliente si revocano gli inviti aperti
insert into public.client_invites (client_id, token_hash) values (tests.id('c2'), tests.token_hash('c2-reset'));
update public.clients set account_status = 'disabled' where id = tests.id('c2');
select isnt(
  (select revoked_at from public.client_invites where token_hash = tests.token_hash('c2-reset')),
  null, 'la disattivazione revoca l''invito aperto'
);
select is(
  (select account_status from public.clients where id = tests.id('c1')),
  'active', 'un nuovo link a un cliente attivo non ne cambia lo stato'
);

select * from finish();
rollback;

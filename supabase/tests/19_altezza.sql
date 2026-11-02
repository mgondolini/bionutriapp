-- Altezza del cliente: salvata all'attivazione, modificabile dal cliente
-- (RPC e API diretta, guard_client) e dallo staff, solo nei limiti.
begin;
select plan(8);
select tests.create_fixtures();

-- Attivazione con l'altezza
select tests.authenticate_as(tests.id('owner1'));
insert into public.client_invites (client_id, token_hash, sent_at)
values (tests.id('c4'), tests.token_hash('c4-altezza'), now());
select tests.clear_authentication();
select is(
  public.activate_client(tests.token_hash('c4-altezza'), tests.id('u4'),
    '{"first_name":"Quattro","last_name":"Nuovo","email":"c4@test.local","height_cm":172,"privacy_notice":true,"health_data":true}'),
  tests.id('c4'), 'il cliente si attiva con l''altezza'
);
select is((select height_cm from public.clients where id = tests.id('c4')), 172::smallint,
  'l''altezza dell''attivazione è salvata');

-- Il cliente la modifica dal profilo
select tests.authenticate_as(tests.id('u1'));
select lives_ok(
  $$ select public.update_my_client_profile('Cliente', 'Uno', null, 165::smallint) $$,
  'il cliente aggiorna l''altezza con la RPC'
);
select lives_ok(
  $$ select public.update_my_client_profile('Cliente', 'Uno', null) $$,
  'senza altezza la RPC lascia quella salvata'
);
select is((select height_cm from public.clients where id = tests.id('c1')), 165::smallint,
  'l''altezza resta 165');
select throws_ok(
  $$ select public.update_my_client_profile('Cliente', 'Uno', null, 90::smallint) $$,
  '23514', null, 'un''altezza fuori dai limiti è rifiutata'
);
select lives_ok(
  $$ update public.clients set height_cm = 170 where id = tests.id('c1') $$,
  'guard_client consente al cliente di modificare la propria altezza'
);

-- Lo staff la modifica dalla scheda e la legge dalla vista
select tests.authenticate_as(tests.id('owner1'));
update public.clients set height_cm = 180 where id = tests.id('c1');
select is((select height_cm from public.clients_with_status where id = tests.id('c1')), 180::smallint,
  'lo staff la modifica e la legge da clients_with_status');

select * from finish();
rollback;

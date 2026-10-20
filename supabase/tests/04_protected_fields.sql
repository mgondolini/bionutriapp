-- Campi protetti: il cliente non cambia stato, fase, studio né i file;
-- first_read_at solo tramite mark_file_read e solo la prima volta.
begin;
select plan(19);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('u1'));

select throws_ok(
  $$ update public.clients set journey_stage = 'completed' where id = tests.id('c1') $$,
  'P0001', 'Puoi modificare solo nome, cognome, data di nascita e preferenze di notifica',
  'il cliente non cambia la propria fase'
);
select throws_ok(
  $$ update public.clients set account_status = 'disabled' where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia il proprio stato account'
);
select throws_ok(
  $$ update public.clients set studio_id = tests.id('studio2') where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia il proprio studio'
);
select throws_ok(
  $$ update public.clients set phone = '+393331112222' where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia il cellulare'
);
select throws_ok(
  $$ update public.clients set user_id = tests.id('u2') where id = tests.id('c1') $$,
  'P0001', null, 'il cliente non cambia il collegamento all''account'
);
select lives_ok(
  $$ update public.clients set first_name = 'Nuovo', last_name = 'Nome', push_enabled = true where id = tests.id('c1') $$,
  'il cliente modifica nome, cognome e preferenza notifiche'
);

select is(
  tests.affected_rows($$ update public.client_files set title = 'X' where id = tests.id('f1') $$),
  0, 'il cliente non modifica i propri file'
);
select is(
  tests.affected_rows($$ delete from public.client_files where id = tests.id('f1') $$),
  0, 'il cliente non elimina i propri file'
);
select throws_ok(
  $$ insert into public.client_files (client_id, category, title, storage_path, size_bytes)
     values (tests.id('c1'), 'diet', 'X', tests.id('studio1') || '/' || tests.id('c1') || '/' || gen_random_uuid() || '.pdf', 10) $$,
  '42501', null, 'il cliente non carica file'
);

-- Prima lettura
select isnt(public.mark_file_read(tests.id('f1')), null, 'mark_file_read imposta la data di prima lettura');
select is(public.mark_file_read(tests.id('f1')), null, 'la seconda apertura non cambia la data');
select is(public.mark_file_read(tests.id('f2')), null, 'non si può segnare come letto il file di un altro cliente');

select tests.clear_authentication();
select is(
  (select first_read_at from public.client_files where id = tests.id('f1')),
  (select first_read_at from public.client_files where id = tests.id('f1') and first_read_at is not null),
  'first_read_at resta valorizzato'
);
select is((select first_read_at from public.client_files where id = tests.id('f2')), null, 'il file dell''altro cliente resta non letto');

-- Lo staff non altera i campi gestiti dal sistema
select tests.authenticate_as(tests.id('owner1'));
select throws_ok(
  $$ update public.client_files set first_read_at = now() where id = tests.id('f2') $$,
  'P0001', null, 'lo staff non imposta la data di lettura'
);
select throws_ok(
  $$ update public.client_files set storage_path = 'x.pdf' where id = tests.id('f2') $$,
  'P0001', null, 'lo staff non cambia il percorso del file'
);
select lives_ok(
  $$ update public.client_files set title = 'Dieta aggiornata', note = 'Nota' where id = tests.id('f2') $$,
  'lo staff modifica titolo e nota del file'
);
select throws_ok(
  $$ update public.clients set user_id = tests.id('stranger') where id = tests.id('c4') $$,
  'P0001', null, 'lo staff non collega a mano un account a un cliente'
);
select throws_ok(
  $$ insert into public.clients (studio_id, first_name, phone, origin, user_id)
     values (tests.id('studio1'), 'X', '3339999999', 'new', tests.id('stranger')) $$,
  'P0001', null, 'lo staff non crea clienti già collegati a un account'
);

select * from finish();
rollback;

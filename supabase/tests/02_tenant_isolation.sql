-- Isolamento fra studi: il titolare vede e modifica solo i dati del proprio studio.
begin;
select plan(19);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('owner1'));

select results_eq(
  $$ select id from public.clients order by id $$,
  $$ select unnest(array[tests.id('c1'), tests.id('c2'), tests.id('c4'), tests.id('c5')]) order by 1 $$,
  'il titolare 1 vede solo i clienti del proprio studio'
);

select is_empty($$ select 1 from public.studios where id = tests.id('studio2') $$, 'non vede l''altro studio');
select is_empty($$ select 1 from public.studio_members where studio_id = tests.id('studio2') $$, 'non vede i membri dell''altro studio');
select is_empty($$ select 1 from public.client_files where studio_id = tests.id('studio2') $$, 'non vede i file dell''altro studio');
select is_empty($$ select 1 from public.tracking_entries where studio_id = tests.id('studio2') $$, 'non vede le registrazioni dell''altro studio');
select is_empty($$ select 1 from public.metrics where studio_id = tests.id('studio2') $$, 'non vede le misure dell''altro studio');
select is_empty($$ select 1 from public.client_invites where studio_id = tests.id('studio2') $$, 'non vede gli inviti dell''altro studio');
select is_empty($$ select 1 from public.client_stage_events where studio_id = tests.id('studio2') $$, 'non vede lo storico dell''altro studio');
select is_empty($$ select 1 from public.clients_with_status where studio_id = tests.id('studio2') $$, 'la vista con lo stato rispetta l''isolamento');

select is(
  tests.affected_rows($$ update public.clients set first_name = 'Hack' where id = tests.id('c3') $$),
  0, 'non modifica un cliente dell''altro studio'
);
select is(
  tests.affected_rows($$ delete from public.tracking_entries where id = tests.id('e3') $$),
  0, 'non elimina registrazioni dell''altro studio'
);
select is(
  tests.affected_rows($$ update public.studios set name = 'Hack' where id = tests.id('studio2') $$),
  0, 'non modifica l''altro studio'
);

select throws_ok(
  $$ insert into public.clients (studio_id, first_name, phone, origin) values (tests.id('studio2'), 'X', '3339999999', 'new') $$,
  '42501', null, 'non crea clienti nell''altro studio'
);
select throws_ok(
  $$ insert into public.client_files (client_id, category, title, storage_path, size_bytes)
     values (tests.id('c3'), 'diet', 'X', tests.id('studio2') || '/' || tests.id('c3') || '/' || gen_random_uuid() || '.pdf', 10) $$,
  '42501', null, 'non carica file per un cliente dell''altro studio'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c3'), tests.metric_id(tests.id('studio2'), 'circ_waist'), 80, current_date - 2) $$,
  '42501', null, 'non registra misure per un cliente dell''altro studio'
);
select throws_ok(
  $$ insert into public.client_invites (client_id, token_hash) values (tests.id('c3'), tests.token_hash('hack')) $$,
  '42501', null, 'non crea inviti per un cliente dell''altro studio'
);

-- studio_id dichiarato a mano viene sovrascritto con quello del cliente
select throws_ok(
  $$ insert into public.tracking_entries (studio_id, client_id, metric_id, value, recorded_on)
     values (tests.id('studio1'), tests.id('c3'), tests.metric_id(tests.id('studio2'), 'circ_waist'), 80, current_date - 2) $$,
  '42501', null, 'lo studio_id non si può falsificare'
);

select throws_ok(
  $$ update public.clients set studio_id = tests.id('studio2') where id = tests.id('c1') $$,
  'P0001', 'Non è possibile spostare un cliente in un altro studio',
  'un cliente non si sposta in un altro studio'
);

select tests.authenticate_as(tests.id('owner2'));
select results_eq(
  $$ select id from public.clients $$,
  $$ values (tests.id('c3')) $$,
  'il titolare 2 vede solo il proprio cliente'
);

select * from finish();
rollback;

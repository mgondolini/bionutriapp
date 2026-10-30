-- Autore delle registrazioni (A-15, A-16, T-03): ruolo ricavato dalla sessione,
-- il cliente non tocca le registrazioni dello staff, lo staff gestisce tutte
-- quelle dei clienti del proprio studio.
begin;
select plan(22);
select tests.create_fixtures();

-- Registrazioni create nei test (id fissi)
create temporary table ids on commit drop as
select 'staff1'::text as name, '60000000-0000-4000-a000-0000000000a1'::uuid as id
union all select 'client1', '60000000-0000-4000-a000-0000000000a2'
union all select 'water1', '60000000-0000-4000-a000-0000000000a3';
grant select on ids to authenticated;

-- --- Righe esistenti ----------------------------------------------------
select results_eq(
  $$ select created_by_role, updated_by_role from public.tracking_entries where id = tests.id('e2') $$,
  $$ values ('client'::text, 'client'::text) $$,
  'le registrazioni inserite lato server senza autore valgono come del cliente'
);

-- --- Lo staff inserisce: il ruolo inviato dal browser viene ignorato -----
select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ insert into public.tracking_entries
       (id, client_id, metric_id, value, recorded_on, created_by, created_by_role, updated_by_role)
     values ((select id from ids where name = 'staff1'), tests.id('c1'),
       tests.metric_id(tests.id('studio1'), 'circ_waist'), 81, current_date - 2,
       tests.id('u1'), 'client', 'client') $$,
  'lo staff inserisce una circonferenza per un cliente del proprio studio'
);
select results_eq(
  $$ select created_by, created_by_role, updated_by, updated_by_role
       from public.tracking_entries where id = (select id from ids where name = 'staff1') $$,
  $$ values (tests.id('owner1'), 'staff'::text, tests.id('owner1'), 'staff'::text) $$,
  'autore e ultimo autore sono quelli della sessione dello staff'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 400, current_date) $$,
  '23514', null, 'un valore fuori limite dello staff viene rifiutato come quello del cliente'
);
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c7'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 84, current_date) $$,
  'lo staff inserisce anche per un cliente In pausa'
);

-- --- Il cliente inserisce: non può dichiararsi staff --------------------
select tests.authenticate_as(tests.id('u1'));
select lives_ok(
  $$ insert into public.tracking_entries
       (id, client_id, metric_id, value, recorded_on, created_by, created_by_role, updated_by_role)
     values ((select id from ids where name = 'client1'), tests.id('c1'),
       tests.metric_id(tests.id('studio1'), 'circ_glutes'), 95, current_date,
       tests.id('owner1'), 'staff', 'staff') $$,
  'il cliente inserisce una propria registrazione'
);
select results_eq(
  $$ select created_by, created_by_role, updated_by_role
       from public.tracking_entries where id = (select id from ids where name = 'client1') $$,
  $$ values (tests.id('u1'), 'client'::text, 'client'::text) $$,
  'un autore "staff" inviato dal cliente viene ignorato'
);

-- --- Il cliente non tocca le registrazioni dello staff (T-03) ----------
select is(
  tests.affected_rows($$ update public.tracking_entries set value = 70
    where id = '60000000-0000-4000-a000-0000000000a1' $$),
  0, 'il cliente non modifica una registrazione dello staff'
);
select is(
  tests.affected_rows($$ delete from public.tracking_entries
    where id = '60000000-0000-4000-a000-0000000000a1' $$),
  0, 'il cliente non elimina una registrazione dello staff'
);
select is(
  (select count(*)::int from public.tracking_entries
    where id = (select id from ids where name = 'staff1')),
  1, 'il cliente vede comunque la registrazione dello staff'
);

-- Le proprie le modifica, senza poter cambiare l'autore
select is(
  tests.affected_rows($$ update public.tracking_entries
    set value = 79, created_by_role = 'staff', created_by = null
    where id = '60000000-0000-4000-a000-000000000001' $$),
  1, 'il cliente modifica una propria registrazione'
);
select results_eq(
  $$ select value, created_by_role, updated_by, updated_by_role
       from public.tracking_entries where id = tests.id('e1') $$,
  $$ values (79.00::numeric(10,2), 'client'::text, tests.id('u1'), 'client'::text) $$,
  'l''autore dell''inserimento non cambia in modifica'
);

-- --- Lo staff modifica una registrazione del cliente (A-16) -------------
select tests.authenticate_as(tests.id('owner1'));
select is(
  tests.affected_rows($$ update public.tracking_entries set value = 78
    where id = '60000000-0000-4000-a000-000000000001' $$),
  1, 'lo staff modifica una registrazione del cliente'
);
select results_eq(
  $$ select created_by_role, updated_by, updated_by_role
       from public.tracking_entries where id = tests.id('e1') $$,
  $$ values ('client'::text, tests.id('owner1'), 'staff'::text) $$,
  'resta del cliente, con lo staff come ultimo autore'
);

-- Il cliente può ancora correggerla: torna ultimo autore
select tests.authenticate_as(tests.id('u1'));
select is(
  tests.affected_rows($$ update public.tracking_entries set value = 77
    where id = '60000000-0000-4000-a000-000000000001' $$),
  1, 'il cliente corregge di nuovo una propria registrazione modificata dallo staff'
);
select is(
  (select updated_by_role from public.tracking_entries where id = tests.id('e1')),
  'client', 'l''ultimo autore torna il cliente'
);

-- --- Staff di un altro studio ------------------------------------------
select tests.authenticate_as(tests.id('owner2'));
select is(
  tests.affected_rows($$ update public.tracking_entries set value = 70
    where id = '60000000-0000-4000-a000-000000000001' $$),
  0, 'lo staff di un altro studio non modifica'
);
select is(
  tests.affected_rows($$ delete from public.tracking_entries
    where id = '60000000-0000-4000-a000-000000000001' $$),
  0, 'lo staff di un altro studio non elimina'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date) $$,
  '42501', null, 'lo staff di un altro studio non inserisce'
);

-- --- Check-in: il voto dello staff non si sovrascrive -------------------
select tests.authenticate_as(tests.id('owner1'));
insert into public.tracking_entries (id, client_id, metric_id, value, recorded_on)
values ((select id from ids where name = 'water1'), tests.id('c1'),
  tests.metric_id(tests.id('studio1'), 'water'), 2, private.today_rome());

select tests.authenticate_as(tests.id('u1'));
select lives_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome(), '{"water": 5, "steps": 4}') $$,
  'il check-in con un voto già inserito dallo staff non dà errore'
);
select results_eq(
  $$ select t.value, t.created_by_role from public.tracking_entries t
      where t.client_id = tests.id('c1') and t.recorded_on = private.today_rome()
        and t.metric_id in (tests.metric_id(tests.id('studio1'), 'water'),
                            tests.metric_id(tests.id('studio1'), 'steps'))
      order by t.created_by_role $$,
  $$ values (4.00::numeric(10,2), 'client'::text), (2.00, 'staff') $$,
  'il voto dello staff resta, gli altri vengono salvati'
);

-- --- Lo staff elimina una registrazione del cliente --------------------
select tests.authenticate_as(tests.id('owner1'));
select is(
  tests.affected_rows($$ delete from public.tracking_entries
    where id = '60000000-0000-4000-a000-000000000001' $$),
  1, 'lo staff elimina una registrazione del cliente'
);

select * from finish();
rollback;

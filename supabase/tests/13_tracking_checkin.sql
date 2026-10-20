-- Check-in giornaliero (T-06): passi, sonno e acqua in un'unica operazione,
-- solo oggi o ieri, solo dal cliente In percorso e solo per sé.
begin;
select plan(14);
select tests.create_fixtures();

create temporary table m on commit drop as
select key, id from public.metrics where studio_id = tests.id('studio1');
grant select on m to authenticated;

-- --- In percorso (c1) -------------------------------------------------
select tests.authenticate_as(tests.id('u1'));

select lives_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome(),
       '{"steps": 4, "sleep": 5, "water": 3}') $$,
  'il cliente In percorso salva i tre voti di oggi'
);
select is(
  (select count(*)::int from public.tracking_entries
    where client_id = tests.id('c1') and recorded_on = private.today_rome()),
  3, 'tre registrazioni create in una sola chiamata'
);
select lives_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome(), '{"water": 5}') $$,
  'il cliente corregge un solo voto'
);
select results_eq(
  $$ select m.key, t.value from public.tracking_entries t join m on m.id = t.metric_id
      where t.client_id = tests.id('c1') and t.recorded_on = private.today_rome()
      order by m.key $$,
  $$ values ('sleep', 5.00::numeric(10,2)), ('steps', 4.00), ('water', 5.00) $$,
  'la correzione aggiorna il voto senza duplicare la riga e lascia gli altri invariati'
);
select lives_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome() - 1, '{"sleep": 2}') $$,
  'il check-in di ieri è ammesso'
);
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome() - 2, '{"sleep": 2}') $$,
  '23514', 'Il check-in si compila solo per oggi o per ieri', 'due giorni fa non è ammesso'
);
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome() + 1, '{"sleep": 2}') $$,
  '23514', 'Il check-in si compila solo per oggi o per ieri', 'domani non è ammesso'
);

-- Tutti o nessuno: un voto fuori limite annulla anche gli altri
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome() - 1,
       '{"steps": 3, "water": 6}') $$,
  '23514', null, 'un voto fuori limite viene rifiutato'
);
select is(
  (select count(*)::int from public.tracking_entries t join m on m.id = t.metric_id
    where t.client_id = tests.id('c1') and t.recorded_on = private.today_rome() - 1
      and m.key = 'steps'),
  0, 'il voto valido della stessa chiamata non viene salvato'
);
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome(), '{"circ_waist": 80}') $$,
  '23514', 'Il check-in accetta solo le abitudini giornaliere', 'una circonferenza non entra nel check-in'
);
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c1'), private.today_rome(), '{}') $$,
  '23514', 'Il check-in deve contenere almeno un voto', 'un check-in vuoto viene rifiutato'
);

-- Un cliente non scrive per un altro
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c2'), private.today_rome(), '{"steps": 4}') $$,
  'P0002', null, 'il cliente non compila il check-in di un altro cliente (non lo vede)'
);

-- --- In pausa (c7) e Onboarding (c6): niente scritture ------------------
select tests.authenticate_as(tests.id('u7'));
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c7'), private.today_rome(), '{"steps": 4}') $$,
  '42501', null, 'In pausa il check-in viene rifiutato'
);
select tests.authenticate_as(tests.id('u6'));
select throws_ok(
  $$ select public.save_daily_checkin(tests.id('c6'), private.today_rome(), '{"steps": 4}') $$,
  '42501', null, 'in Onboarding il check-in viene rifiutato'
);

select * from finish();
rollback;

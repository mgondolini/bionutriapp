-- Validazione delle registrazioni nel database (T-04) e regole sugli obiettivi.
begin;
select plan(20);
select tests.create_fixtures();

create temporary table m on commit drop as
select key, id from public.metrics where studio_id = tests.id('studio1');
grant select on m to authenticated;

select tests.authenticate_as(tests.id('u1'));

-- Limiti della misura
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'circ_waist'), 5, current_date - 3) $$,
  '23514', null, 'circonferenza sotto il minimo rifiutata'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'circ_waist'), 251, current_date - 3) $$,
  '23514', null, 'circonferenza sopra il massimo rifiutata'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'circ_right_arm'), 120, current_date - 3) $$,
  '23514', null, 'braccio oltre 100 cm rifiutato'
);
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'circ_right_arm'), 30.5, current_date - 3) $$,
  'circonferenza decimale entro i limiti accettata'
);

-- Voti interi
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'steps'), 3.5, current_date) $$,
  '23514', 'Il voto deve essere un numero intero', 'voto non intero rifiutato'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'water'), 6, current_date) $$,
  '23514', null, 'voto 6 su scala 1–5 rifiutato'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'sleep'), 0, current_date) $$,
  '23514', null, 'voto 0 rifiutato'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'workouts'), 11, current_date) $$,
  '23514', null, 'allenamento oltre 10 rifiutato'
);

-- Data
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'steps'), 4, private.studio_today(tests.id('studio1')) + 1) $$,
  '23514', 'La data non può essere nel futuro', 'data futura rifiutata'
);
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'steps'), 4, private.studio_today(tests.id('studio1')) - 1) $$,
  'si può compilare il giorno precedente'
);

-- Un solo valore al giorno per passi, sonno e acqua
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'water'), 4, current_date - 2) $$,
  'primo valore giornaliero accettato'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'water'), 5, current_date - 2) $$,
  '23505', null, 'secondo valore nello stesso giorno rifiutato'
);

-- Allenamenti: più sessioni al giorno, nota ammessa solo qui
select lives_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on, note) values
       (tests.id('c1'), (select id from m where key = 'workouts'), 7, current_date - 2, 'Mattina'),
       (tests.id('c1'), (select id from m where key = 'workouts'), 8, current_date - 2, 'Sera') $$,
  'due allenamenti nello stesso giorno con nota'
);
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on, note)
     values (tests.id('c1'), (select id from m where key = 'sleep'), 4, current_date - 4, 'Nota') $$,
  '23514', 'La nota è prevista solo per gli allenamenti', 'nota rifiutata per le abitudini giornaliere'
);

-- Anche la modifica viene validata
select throws_ok(
  $$ update public.tracking_entries set value = 300 where id = tests.id('e1') $$,
  '23514', null, 'la correzione fuori limite viene rifiutata'
);

-- Misura di un altro studio
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), tests.metric_id(tests.id('studio2'), 'circ_waist'), 80, current_date - 3) $$,
  'P0001', 'Misura non valida per questo cliente', 'misura di un altro studio rifiutata'
);

-- Percorso concluso: sola lettura per il cliente
select tests.clear_authentication();
update public.clients set journey_stage = 'completed' where id = tests.id('c1');
select tests.authenticate_as(tests.id('u1'));
select throws_ok(
  $$ insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
     values (tests.id('c1'), (select id from m where key = 'circ_waist'), 80, current_date - 5) $$,
  '42501', null, 'a percorso concluso il cliente non registra nuove misure'
);
select isnt_empty($$ select 1 from public.tracking_entries $$, 'a percorso concluso il cliente legge ancora le proprie misure');

-- Obiettivi personali (T-07): solo sulle abitudini giornaliere
select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ insert into public.client_metric_goals (client_id, metric_id, goal_value)
     values (tests.id('c1'), (select id from m where key = 'water'), 2.5) $$,
  'il titolare imposta l''obiettivo di acqua del cliente'
);
select throws_ok(
  $$ insert into public.client_metric_goals (client_id, metric_id, goal_value)
     values (tests.id('c1'), (select id from m where key = 'circ_waist'), 70) $$,
  'P0001', null, 'nessun obiettivo sulle circonferenze'
);

select * from finish();
rollback;

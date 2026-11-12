-- Check delle misure: data scelta solo dallo staff, istante della scelta
-- scritto dal trigger, candidati al promemoria delle 6 e tipo nel registro.
begin;
select plan(11);
select tests.create_fixtures();

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  (tests.id('u1'), 'https://fcm.googleapis.com/fcm/send/m-c1', 'k', 'a'),
  (tests.id('u6'), 'https://fcm.googleapis.com/fcm/send/m-c6', 'k', 'a');

-- Il cliente non sposta il proprio check
select tests.authenticate_as(tests.id('u1'));
select throws_ok(
  $$ update public.clients set measure_check_on = current_date + 10 where id = tests.id('c1') $$,
  null, null, 'il cliente non sceglie la data del check'
);
select throws_ok(
  $$ update public.clients set measure_check_set_at = now() where id = tests.id('c1') $$,
  null, null, 'il cliente non scrive l''istante della scelta'
);

-- Lo staff la sceglie; l'istante lo scrive il trigger
select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ update public.clients set measure_check_on = current_date + 10,
            measure_check_set_at = '2000-01-01' where id = tests.id('c1') $$,
  'lo staff sceglie la data del check'
);
select is(
  (select measure_check_set_at = now() from public.clients where id = tests.id('c1')), true,
  'l''istante della scelta lo scrive il trigger, non chi aggiorna'
);
select lives_ok(
  $$ update public.clients set first_name = 'Cliente' where id = tests.id('c1') $$,
  'un altro aggiornamento non tocca la scelta'
);
select is(
  (select measure_check_set_at = now() from public.clients where id = tests.id('c1')), true,
  'l''istante resta quello della scelta'
);

select tests.authenticate_as(tests.id('owner2'));
select is(
  (select count(*)::int from public.clients where id = tests.id('c1') and measure_check_on is not null), 0,
  'lo staff di un altro studio non vede la data'
);

-- Candidati (solo server): attivi In percorso con un dispositivo
select tests.authenticate_as(tests.id('owner1'));
select throws_ok(
  $$ select * from public.measure_check_candidates(tests.id('studio1')) $$,
  '42501', null, 'i candidati si leggono solo dal server'
);

select tests.clear_authentication();
select results_eq(
  $$ select client_id, measure_check_on, last_recorded_on
       from public.measure_check_candidates(tests.id('studio1')) $$,
  $$ values (tests.id('c1'), current_date + 10, current_date - 1) $$,
  'solo chi è In percorso con un dispositivo, con l''ultima registrazione mensile'
);

update public.clients set measure_check_on = null where id = tests.id('c1');
select is(
  (select measure_check_set_at from public.clients where id = tests.id('c1')), null,
  'tornando alla data standard l''istante si azzera'
);

select lives_ok(
  $$ insert into public.notification_log (studio_id, client_id, user_id, type, dedupe_key)
     values (tests.id('studio1'), tests.id('c1'), tests.id('u1'), 'measure_check', 'measure_check:test') $$,
  'il registro accetta il tipo measure_check'
);

select * from finish();
rollback;

-- Notifiche della 1.0: registro (solo lettura delle proprie), preferenze
-- (solo il cliente, solo la propria riga), candidati al promemoria serale,
-- fallimenti dei dispositivi e pianificazione con pg_cron.
begin;
select plan(22);
select tests.create_fixtures();

-- Un dispositivo per c1, c2, c5 (disattivato), c6 (Onboarding), c7 (In pausa)
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  (tests.id('u1'), 'https://fcm.googleapis.com/fcm/send/n-c1', 'k', 'a'),
  (tests.id('u2'), 'https://fcm.googleapis.com/fcm/send/n-c2', 'k', 'a'),
  (tests.id('u5'), 'https://fcm.googleapis.com/fcm/send/n-c5', 'k', 'a'),
  (tests.id('u6'), 'https://fcm.googleapis.com/fcm/send/n-c6', 'k', 'a'),
  (tests.id('u7'), 'https://fcm.googleapis.com/fcm/send/n-c7', 'k', 'a');

insert into public.notification_log (studio_id, client_id, user_id, type, dedupe_key, status, skipped_reason) values
  (tests.id('studio1'), tests.id('c1'), tests.id('u1'), 'file_diet', 'file:test-c1', 'sent', null),
  (tests.id('studio1'), tests.id('c2'), tests.id('u2'), 'daily_checkin', 'checkin:test-c2', 'skipped', 'already_completed');

-- ---------------------------------------------------------------------
-- Registro
-- ---------------------------------------------------------------------
select throws_ok(
  $$ insert into public.notification_log (studio_id, client_id, type, dedupe_key)
     values (tests.id('studio1'), tests.id('c1'), 'file_diet', 'file:test-c1') $$,
  '23505', null, 'la dedupe_key è unica'
);

select tests.authenticate_as(tests.id('u1'));
select is((select count(*)::int from public.notification_log), 1, 'il cliente legge solo le proprie notifiche');
select throws_ok(
  $$ insert into public.notification_log (studio_id, client_id, user_id, type, dedupe_key)
     values (tests.id('studio1'), tests.id('c1'), tests.id('u1'), 'file_diet', 'file:forzata') $$,
  '42501', null, 'il cliente non scrive nel registro'
);
select throws_ok(
  $$ delete from public.notification_log $$,
  '42501', null, 'il cliente non elimina il registro'
);

select tests.authenticate_as(tests.id('owner1'));
select is((select count(*)::int from public.notification_log), 0, 'lo staff non legge il registro nella 1.0');

-- ---------------------------------------------------------------------
-- Preferenze
-- ---------------------------------------------------------------------
select throws_ok(
  $$ insert into public.notification_preferences (user_id) values (tests.id('owner1')) $$,
  '42501', null, 'lo staff non ha preferenze delle notifiche'
);

select tests.authenticate_as(tests.id('u2'));
select lives_ok(
  $$ insert into public.notification_preferences (daily_reminder_enabled) values (false) $$,
  'il cliente crea la propria riga'
);
select throws_ok(
  $$ insert into public.notification_preferences (user_id) values (tests.id('u1')) $$,
  '42501', null, 'il cliente non crea la riga di un altro utente'
);
select is(
  tests.affected_rows($$ update public.notification_preferences set files_enabled = false $$), 1,
  'il cliente modifica la propria riga'
);

select tests.authenticate_as(tests.id('u1'));
select is((select count(*)::int from public.notification_preferences), 0, 'il cliente non vede le preferenze altrui');
select is(
  tests.affected_rows($$ update public.notification_preferences set files_enabled = true $$), 0,
  'il cliente non modifica le preferenze altrui'
);

-- ---------------------------------------------------------------------
-- Funzioni del server: solo service_role
-- ---------------------------------------------------------------------
select throws_ok(
  $$ select * from public.daily_reminder_candidates(tests.id('studio1'), current_date) $$,
  '42501', null, 'i candidati al promemoria non sono leggibili dagli utenti'
);
select throws_ok(
  $$ select public.record_push_results(array['x'], array['y'], 5) $$,
  '42501', null, 'gli esiti degli invii non sono scrivibili dagli utenti'
);
select tests.clear_authentication();

-- ---------------------------------------------------------------------
-- Candidati: attivo, In percorso, con dispositivo, promemoria attivo
-- ---------------------------------------------------------------------
select results_eq(
  $$ select client_id, habits_done, workout_done
       from public.daily_reminder_candidates(tests.id('studio1'), current_date - 1) $$,
  $$ values (tests.id('c1'), false, false) $$,
  'solo c1: c2 ha spento il promemoria, c5 è disattivato, c6 in Onboarding, c7 in pausa'
);

insert into public.tracking_entries (client_id, metric_id, value, recorded_on) values
  (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'steps'), 4, current_date - 1),
  (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'sleep'), 3, current_date - 1);
select results_eq(
  $$ select habits_done from public.daily_reminder_candidates(tests.id('studio1'), current_date - 1) $$,
  $$ values (false) $$,
  'due abitudini su tre: non ancora completo'
);

insert into public.tracking_entries (client_id, metric_id, value, recorded_on) values
  (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'water'), 5, current_date - 1),
  (tests.id('c1'), tests.metric_id(tests.id('studio1'), 'workouts'), 7, current_date - 1);
select results_eq(
  $$ select habits_done, workout_done
       from public.daily_reminder_candidates(tests.id('studio1'), current_date - 1) $$,
  $$ values (true, true) $$,
  'tutte le abitudini e un allenamento nel giorno'
);
select results_eq(
  $$ select habits_done, workout_done
       from public.daily_reminder_candidates(tests.id('studio1'), current_date - 2) $$,
  $$ values (false, false) $$,
  'il giorno prima non conta'
);

-- ---------------------------------------------------------------------
-- Fallimenti dei dispositivi
-- ---------------------------------------------------------------------
select is(
  public.record_push_results(array[]::text[], array['https://fcm.googleapis.com/fcm/send/n-c1'], 2),
  0, 'primo fallimento: la sottoscrizione resta'
);
select is(
  (select failure_count from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/n-c1'),
  1, 'il fallimento viene contato'
);
select is(
  public.record_push_results(array[]::text[], array['https://fcm.googleapis.com/fcm/send/n-c1'], 2),
  1, 'al limite dei fallimenti consecutivi la sottoscrizione si elimina'
);
select is(
  (select push_enabled from public.clients where id = tests.id('c1')),
  false, 'senza dispositivi push_enabled torna falso'
);

-- ---------------------------------------------------------------------
-- Pianificazione
-- ---------------------------------------------------------------------
select is(
  (select schedule from cron.job where jobname = 'promemoria-checkin'),
  '0 * * * *', 'il promemoria è pianificato ogni ora al minuto 0'
);

select * from finish();
rollback;

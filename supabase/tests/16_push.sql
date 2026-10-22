-- Notifiche push (fase 8): push_enabled segue le sottoscrizioni del cliente
-- e non si modifica a mano; ogni utente gestisce solo le proprie
-- sottoscrizioni, e solo con una sessione valida.
begin;
select plan(14);
select tests.create_fixtures();

create function pg_temp.push_enabled(p_client uuid) returns boolean
language sql security definer set search_path = '' as $$
  select push_enabled from public.clients where id = p_client;
$$;

-- Partenza: nessun dispositivo
select is(pg_temp.push_enabled(tests.id('c1')), false, 'senza sottoscrizioni push_enabled è falso');

-- Il cliente registra il primo dispositivo
select tests.authenticate_as(tests.id('u1'));
select isnt(
  public.register_push_subscription('https://fcm.googleapis.com/fcm/send/c1-a', 'p256dh-a', 'auth-a', 'test'),
  null, 'il cliente registra una sottoscrizione'
);
select is(pg_temp.push_enabled(tests.id('c1')), true, 'con un dispositivo push_enabled diventa vero');

select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/c1-b', 'p256dh-b', 'auth-b', 'test');
select is(
  (select count(*)::int from public.push_subscriptions), 2,
  'il cliente vede le proprie due sottoscrizioni'
);

-- Il cliente non scrive push_enabled a mano, in nessuna direzione
select throws_ok(
  $$ update public.clients set push_enabled = false where id = tests.id('c1') $$,
  'P0001', 'Lo stato delle notifiche segue i dispositivi registrati',
  'il cliente non spegne push_enabled a mano'
);

-- Eliminarne uno lascia l'altro: resta vero
delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/c1-a';
select is(pg_temp.push_enabled(tests.id('c1')), true, 'con un dispositivo rimasto push_enabled resta vero');

-- Lo staff non vede le sottoscrizioni né cambia push_enabled
select tests.authenticate_as(tests.id('owner1'));
select is(
  (select count(*)::int from public.push_subscriptions), 0,
  'lo staff non legge le sottoscrizioni dei clienti'
);
select throws_ok(
  $$ update public.clients set push_enabled = false where id = tests.id('c1') $$,
  'P0001', null, 'lo staff non cambia push_enabled a mano'
);
select is(
  tests.affected_rows($$ delete from public.push_subscriptions $$),
  0, 'lo staff non elimina le sottoscrizioni dei clienti'
);

-- Lo stesso browser passa a un altro cliente (u2): l'endpoint si riassegna
select tests.authenticate_as(tests.id('u2'));
select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/c1-b', 'p256dh-b', 'auth-b', 'test');
select is(pg_temp.push_enabled(tests.id('c1')), false, 'endpoint riassegnato: il primo cliente resta senza dispositivi');
select is(
  (select push_enabled from public.clients where user_id = tests.id('u2')), true,
  'endpoint riassegnato: il nuovo cliente ha le push attive'
);

-- Sessione revocata: nessuna registrazione né lettura
select tests.clear_authentication();
create temp table s (id uuid);
grant select on s to authenticated;
insert into s values (tests.new_session(tests.id('u2')));
delete from auth.sessions where id = (select id from s);
select tests.authenticate_as(tests.id('u2'), (select id from s));
select throws_ok(
  $$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/x', 'p', 'a', null) $$,
  'P0001', null, 'sessione revocata: nessuna registrazione'
);
select is(
  (select count(*)::int from public.push_subscriptions), 0,
  'sessione revocata: nessuna sottoscrizione visibile'
);

-- Ultimo dispositivo eliminato (logout): push_enabled torna falso
select tests.authenticate_as(tests.id('u2'));
delete from public.push_subscriptions;
select is(
  (select push_enabled from public.clients where user_id = tests.id('u2')), false,
  'senza dispositivi push_enabled torna falso'
);

select * from finish();
rollback;

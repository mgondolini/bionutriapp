-- Foto di avanzamento: check con le foto, apertura il giorno del check,
-- tre viste per salvare, immutabilità dopo il salvataggio (anche lato
-- server e con service_role), RLS fra clienti e studi, Storage, promemoria,
-- cancellazione a cascata del cliente.
begin;
select plan(42);
select tests.create_fixtures();

-- Percorso di 1 anno: onboarding 120 giorni fa, poi un check ogni 30 giorni.
-- Check 3 = 30 giorni fa, check 6 = fra 60 giorni. Gli helper sono
-- security definer: il cliente non legge le sessioni.
create function pg_temp.year_sessions() returns jsonb language sql stable as $$
  select jsonb_agg(jsonb_build_object(
           'position', p,
           'type', case when p = 0 then 'onboarding' else 'check' end,
           'calculated_date', private.today_rome() - 120 + p * 30))
    from generate_series(0, 11) p;
$$;
create function pg_temp.journey(p_client uuid) returns uuid language sql as $$
  select public.create_client_journey(p_client, null, 'first', 12::smallint,
    private.today_rome() - 120, (private.today_rome() - 120 + interval '12 months')::date,
    true, 'none', pg_temp.year_sessions());
$$;
create function pg_temp.session(p_client uuid, p_position int) returns uuid language sql security definer as $$
  select id from public.journey_sessions where client_id = p_client and position = p_position;
$$;
create function pg_temp.set_of(p_client uuid) returns uuid language sql security definer as $$
  select ps.id from public.photo_sets ps
    join public.journey_sessions s on s.id = ps.session_id
   where s.client_id = p_client and s.position = 3;
$$;
create function pg_temp.path(p_client uuid, p_view text) returns text language sql security definer as $$
  select ps.studio_id || '/' || ps.client_id || '/' || ps.id || '/' || p_view || '-' || gen_random_uuid() || '.jpg'
    from public.photo_sets ps where ps.id = pg_temp.set_of(p_client);
$$;

select pg_temp.journey(tests.id('c1'));
select pg_temp.journey(tests.id('c2'));
select pg_temp.journey(tests.id('c3'));
select pg_temp.journey(tests.id('c7'));
-- c6 (fase Onboarding): onboarding fra 2 giorni, check 3 fra 92
select public.create_client_journey(tests.id('c6'), null, 'first', 6::smallint,
  private.today_rome() + 2, (private.today_rome() + 2 + interval '6 months')::date,
  true, 'none',
  (select jsonb_agg(jsonb_build_object(
            'position', p,
            'type', case when p = 0 then 'onboarding' else 'check' end,
            'calculated_date', private.today_rome() + 2 + p * 30))
     from generate_series(0, 5) p));

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'client-photos' $$,
  $$ values (false, 10485760::bigint, array['image/jpeg']::text[]) $$,
  'client-photos è privato, solo JPEG fino a 10 MB'
);
select is(
  array(select n from generate_series(1, 12) n where private.is_photo_check(n, 11)),
  array[3, 6, 9, 11], 'percorso di 1 anno (ultimo check 11): foto ai check 3, 6, 9 e 11'
);
select is(
  array(select n from generate_series(1, 6) n where private.is_photo_check(n, 5)),
  array[3, 5], 'percorso di 6 mesi (ultimo check 5): foto ai check 3 e 5'
);

select ok(
  private.is_photo_session(pg_temp.session(tests.id('c1'), 11)),
  'l''ultimo check del percorso (11) prevede le foto'
);
select ok(
  not private.is_photo_session(pg_temp.session(tests.id('c1'), 10)),
  'il check 10 non prevede foto'
);

-- ---------------------------------------------------------------------
-- Apertura del set
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(tests.id('c1'), 3)),
  'lo staff apre il set del check 3 (giorno del check passato)'
);
select is(
  (select (studio_id, client_id, status)::text from public.photo_sets where id = pg_temp.set_of(tests.id('c1'))),
  (tests.id('studio1'), tests.id('c1'), 'draft')::text,
  'studio e cliente dalla sessione, stato bozza'
);
select throws_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(tests.id('c1'), 1)),
  '23514', 'Questo check non prevede foto', 'il check 1 non ha foto'
);
select throws_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(tests.id('c1'), 6)),
  '23514', 'Il set si apre 3 giorni prima del check', 'il check 6 non è ancora aperto'
);

-- ---------------------------------------------------------------------
-- Foto in bozza
-- ---------------------------------------------------------------------
select lives_ok(
  format($$ insert into public.photos (set_id, view, storage_path, size_bytes, uploaded_by_role)
            values (%L, 'front', %L, 1000, 'client') $$,
         pg_temp.set_of(tests.id('c1')), pg_temp.path(tests.id('c1'), 'front')),
  'lo staff carica la foto Fronte'
);
select is(
  (select uploaded_by_role from public.photos where view = 'front' and client_id = tests.id('c1')),
  'studio', 'chi ha caricato lo scrive il trigger, non il browser'
);
select throws_ok(
  format($$ insert into public.photos (set_id, view, storage_path, size_bytes, uploaded_by_role)
            values (%L, 'side', %L, 1000, 'studio') $$,
         pg_temp.set_of(tests.id('c1')), pg_temp.path(tests.id('c1'), 'back')),
  '23514', 'Percorso della foto non valido', 'il percorso deve corrispondere alla vista'
);

select tests.authenticate_as(tests.id('u1'));
select lives_ok(
  format($$ insert into public.photos (set_id, view, storage_path, size_bytes, uploaded_by_role)
            values (%L, 'side', %L, 1000, 'studio') $$,
         pg_temp.set_of(tests.id('c1')), pg_temp.path(tests.id('c1'), 'side')),
  'il cliente carica la foto Lato'
);
select is(
  (select uploaded_by_role from public.photos where view = 'side' and client_id = tests.id('c1')),
  'client', 'la foto del cliente risulta sua'
);
select lives_ok(
  format($$ update public.photos set storage_path = %L, size_bytes = 2000
             where view = 'side' and client_id = %L $$,
         pg_temp.path(tests.id('c1'), 'side'), tests.id('c1')),
  'in bozza il cliente sostituisce una foto'
);
select throws_ok(
  format('update public.photo_sets set status = %L where id = %L', 'saved', pg_temp.set_of(tests.id('c1'))),
  '23514', 'Per salvare servono tutte e tre le foto', 'con due foto il set non si salva'
);

-- Altri utenti
select tests.authenticate_as(tests.id('u2'));
select is((select count(*)::int from public.photos), 0, 'un cliente non legge le foto di un altro');
select is((select count(*)::int from public.photo_sets), 0, 'né i suoi set');
select tests.authenticate_as(tests.id('owner2'));
select is((select count(*)::int from public.photos), 0, 'lo staff di un altro studio non legge le foto');
select tests.authenticate_as(tests.id('u7'));
select throws_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(tests.id('c7'), 3)),
  '42501', null, 'un cliente In pausa non carica foto'
);

-- ---------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('u1'));
select lives_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('client-photos', %L) $$,
         pg_temp.path(tests.id('c1'), 'back')),
  'il cliente carica l''oggetto in un set in bozza'
);
select tests.authenticate_as(tests.id('u2'));
select is(
  (select count(*)::int from storage.objects where bucket_id = 'client-photos'), 0,
  'un altro cliente non vede gli oggetti'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('client-photos', %L) $$,
         pg_temp.path(tests.id('c1'), 'back')),
  '42501', null, 'né carica nel set di un altro'
);

-- ---------------------------------------------------------------------
-- Salvataggio
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('u1'));
select lives_ok(
  format($$ insert into public.photos (set_id, view, storage_path, size_bytes, uploaded_by_role)
            values (%L, 'back', %L, 1000, 'client') $$,
         pg_temp.set_of(tests.id('c1')), pg_temp.path(tests.id('c1'), 'back')),
  'il cliente aggiunge la terza foto'
);
select lives_ok(
  format('update public.photo_sets set status = %L where id = %L', 'saved', pg_temp.set_of(tests.id('c1'))),
  'con tre foto il cliente salva'
);
select is(
  (select (saved_by, saved_by_role, saved_at is not null)::text from public.photo_sets
    where id = pg_temp.set_of(tests.id('c1'))),
  (tests.id('u1'), 'client', true)::text, 'chi ha salvato e quando lo scrive il trigger'
);
select throws_ok(
  format($$ update public.photos set size_bytes = 5 where client_id = %L and view = 'front' $$, tests.id('c1')),
  '23514', 'Le foto salvate non si modificano', 'dopo il salvataggio il cliente non sostituisce'
);
select throws_ok(
  format($$ insert into storage.objects (bucket_id, name) values ('client-photos', %L) $$,
         pg_temp.path(tests.id('c1'), 'front')),
  '42501', null, 'né carica nuovi oggetti nel set salvato'
);

select tests.authenticate_as(tests.id('owner1'));
select throws_ok(
  format($$ delete from public.photos where client_id = %L and view = 'front' $$, tests.id('c1')),
  '23514', 'Le foto salvate non si eliminano', 'lo staff non elimina una foto salvata'
);
select throws_ok(
  format('update public.photo_sets set status = %L where id = %L', 'draft', pg_temp.set_of(tests.id('c1'))),
  '23514', 'Le foto salvate non si modificano', 'né riporta il set in bozza'
);

-- Lato server: postgres e service_role
select tests.clear_authentication();
select throws_ok(
  format($$ delete from public.photos where client_id = %L $$, tests.id('c1')),
  '23514', 'Le foto salvate non si eliminano', 'nemmeno lato server si eliminano le foto salvate'
);
select throws_ok(
  format('delete from public.photo_sets where id = %L', pg_temp.set_of(tests.id('c1'))),
  '23514', 'Le foto salvate non si eliminano', 'né il set salvato'
);
select set_config('test.c1', tests.id('c1')::text, true);
set local role service_role;
select throws_ok(
  format($$ update public.photos set size_bytes = 5 where client_id = %L $$, current_setting('test.c1')),
  '23514', 'Le foto salvate non si modificano', 'né con la secret key (service_role)'
);
reset role;

-- ---------------------------------------------------------------------
-- Promemoria
-- ---------------------------------------------------------------------
select tests.clear_authentication();
insert into public.photo_sets (session_id) values (pg_temp.session(tests.id('c2'), 3));
insert into public.photos (set_id, view, storage_path, size_bytes, uploaded_by_role)
values (pg_temp.set_of(tests.id('c2')), 'side', pg_temp.path(tests.id('c2'), 'side'), 1000, 'client');
select results_eq(
  format($$ select client_id, check_number, photo_count, missing_views
              from public.photo_reminder_candidates(%L, private.today_rome() - 30)
             where check_number = 3 $$, tests.id('studio1')),
  format($$ values (%L::uuid, 3, 1, array['front', 'back']::text[]) $$, tests.id('c2')),
  'promemoria: solo il set non salvato, con le foto mancanti'
);
select throws_ok(
  format($$ insert into public.journey_notifications (session_id, studio_id, client_id, kind, reference_date)
            values (%L, %L, %L, 'photos_other', current_date) $$,
         pg_temp.session(tests.id('c2'), 3), tests.id('studio1'), tests.id('c2')),
  '23514', null, 'il registro accetta solo i tipi previsti'
);


-- ---------------------------------------------------------------------
-- Foto di partenza e apertura 3 giorni prima
-- ---------------------------------------------------------------------
select tests.authenticate_as(tests.id('u6'));
select lives_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(tests.id('c6'), 0)),
  'il cliente in Onboarding apre il set di partenza 2 giorni prima della sessione'
);
select is(
  (select count(*)::int from public.photo_sets where client_id = tests.id('c6')), 1,
  'e lo legge'
);
select throws_ok(
  format('insert into public.photo_sets (session_id) values (%L)', pg_temp.session(tests.id('c6'), 3)),
  '23514', 'Il set si apre 3 giorni prima del check', 'il check 3 fra 92 giorni non è aperto'
);
select tests.clear_authentication();
select is(
  (select count(*)::int from public.photo_reminder_candidates(tests.id('studio1'), private.today_rome())
    where client_id = tests.id('c6') and check_number is null),
  0, 'il set di partenza non ha il promemoria quotidiano delle foto (lo sostituisce la preparazione della chiamata)'
);
select is(
  (select count(*)::int from public.photo_reminder_candidates(tests.id('studio1'), private.today_rome() - 2)
    where client_id = tests.id('c6')),
  0, 'nessun promemoria prima dell''apertura'
);

-- Cancellazione del cliente (procedura GDPR): la cascata passa
select lives_ok(
  format('delete from public.clients where id = %L', tests.id('c1')),
  'eliminando il cliente si eliminano anche le foto salvate'
);
select is(
  (select count(*)::int from public.photos where client_id = tests.id('c1')), 0,
  'nessuna foto resta dopo la cascata'
);

select * from finish();
rollback;

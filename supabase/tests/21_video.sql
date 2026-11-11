-- Libreria video (mockup v4): cartelle a un livello, ordine, visibilità per
-- fase (Onboarding solo nelle cartelle indicate), isolamento fra studi,
-- aperture registrate solo dalla RPC, destinatari della notifica.
begin;
select plan(31);
select tests.create_fixtures();

-- Cartelle di studio1: Ricette (A) con la sottocartella Colazioni (A1),
-- Benvenuto (B) anche in Onboarding. Studio2: Altro (X).
create function pg_temp.vid(p_name text) returns uuid language sql immutable as $$
  select (case p_name
    when 'A'  then '70000000-0000-4000-a000-000000000001'
    when 'B'  then '70000000-0000-4000-a000-000000000002'
    when 'A1' then '70000000-0000-4000-a000-000000000003'
    when 'X'  then '70000000-0000-4000-a000-000000000004'
    when 'v1' then '71000000-0000-4000-a000-000000000001'
    when 'v2' then '71000000-0000-4000-a000-000000000002'
    when 'v3' then '71000000-0000-4000-a000-000000000003'
    when 'v4' then '71000000-0000-4000-a000-000000000004'
  end)::uuid;
$$;

insert into public.video_folders (id, studio_id, name)
values (pg_temp.vid('X'), tests.id('studio2'), 'Altro');

select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ insert into public.video_folders (id, studio_id, name) values (pg_temp.vid('A'), tests.id('studio1'), 'Ricette');
     insert into public.video_folders (id, studio_id, name, visible_in_onboarding)
       values (pg_temp.vid('B'), tests.id('studio1'), 'Benvenuto', true);
     insert into public.video_folders (id, studio_id, parent_id, name, visible_in_onboarding)
       values (pg_temp.vid('A1'), tests.id('studio1'), pg_temp.vid('A'), 'Colazioni', true) $$,
  'lo staff crea cartelle e sottocartelle'
);
select ok(
  (select sort_order from public.video_folders where id = pg_temp.vid('B'))
    > (select sort_order from public.video_folders where id = pg_temp.vid('A')),
  'una nuova cartella va in fondo al proprio livello'
);
select is(
  (select visible_in_onboarding from public.video_folders where id = pg_temp.vid('A1')), false,
  'una sottocartella segue la visibilità della cartella superiore'
);
select throws_ok(
  $$ insert into public.video_folders (studio_id, parent_id, name)
     values (tests.id('studio1'), pg_temp.vid('A1'), 'Terzo livello') $$,
  null, null, 'le sottocartelle non contengono altre cartelle'
);
select throws_ok(
  $$ update public.video_folders set parent_id = pg_temp.vid('B') where id = pg_temp.vid('A') $$,
  null, null, 'una cartella con sottocartelle non diventa una sottocartella'
);
select throws_ok(
  $$ insert into public.video_folders (studio_id, parent_id, name)
     values (tests.id('studio1'), pg_temp.vid('X'), 'Fra studi') $$,
  null, null, 'la cartella superiore deve essere dello stesso studio'
);

select lives_ok(
  $$ insert into public.videos (id, studio_id, folder_id, youtube_id, title)
       values (pg_temp.vid('v1'), tests.id('studio1'), pg_temp.vid('A'), 'aaaaaaaaaaa', 'Primo');
     insert into public.videos (id, studio_id, folder_id, youtube_id, title)
       values (pg_temp.vid('v2'), tests.id('studio1'), pg_temp.vid('A'), 'bbbbbbbbbbb', 'Secondo');
     insert into public.videos (id, studio_id, folder_id, youtube_id, title)
       values (pg_temp.vid('v3'), tests.id('studio1'), pg_temp.vid('A1'), 'ccccccccccc', 'Colazione');
     insert into public.videos (id, studio_id, folder_id, youtube_id, title)
       values (pg_temp.vid('v4'), tests.id('studio1'), pg_temp.vid('B'), 'ddddddddddd', 'Benvenuto') $$,
  'lo staff aggiunge video'
);
select ok(
  (select sort_order from public.videos where id = pg_temp.vid('v2'))
    < (select sort_order from public.videos where id = pg_temp.vid('v1')),
  'un nuovo video va in cima alla cartella'
);
select throws_ok(
  $$ insert into public.videos (studio_id, folder_id, youtube_id, title)
     values (tests.id('studio1'), pg_temp.vid('A'), 'aaaaaaaaaaa', 'Doppio') $$,
  '23505', null, 'lo stesso video non sta due volte nella stessa cartella'
);
select throws_ok(
  $$ insert into public.videos (studio_id, folder_id, youtube_id, title)
     values (tests.id('studio1'), pg_temp.vid('A'), 'non-valido', 'Id errato') $$,
  '23514', null, 'l''id di YouTube ha 11 caratteri'
);
select throws_ok(
  $$ delete from public.video_folders where id = pg_temp.vid('A') $$,
  '23503', null, 'una cartella con video o sottocartelle non si elimina'
);

-- Riordino
select throws_ok(
  $$ select public.reorder_videos(pg_temp.vid('A'), array[pg_temp.vid('v1')]) $$,
  'P0002', null, 'un elenco incompleto non riordina i video'
);
select lives_ok(
  $$ select public.reorder_videos(pg_temp.vid('A'), array[pg_temp.vid('v1'), pg_temp.vid('v2')]) $$,
  'lo staff riordina i video di una cartella'
);
select results_eq(
  $$ select id from public.videos where folder_id = pg_temp.vid('A') order by sort_order $$,
  $$ values (pg_temp.vid('v1')), (pg_temp.vid('v2')) $$,
  'i video seguono il nuovo ordine'
);
select lives_ok(
  $$ select public.reorder_video_folders(null, array[pg_temp.vid('B'), pg_temp.vid('A')]) $$,
  'lo staff riordina le cartelle'
);
select results_eq(
  $$ select id from public.video_folders where parent_id is null order by sort_order $$,
  $$ values (pg_temp.vid('B')), (pg_temp.vid('A')) $$,
  'le cartelle seguono il nuovo ordine'
);
select throws_ok(
  $$ select public.reorder_video_folders(null, array[pg_temp.vid('A'), pg_temp.vid('A1')]) $$,
  'P0002', null, 'non si mescolano cartelle di livelli diversi'
);

-- Isolamento fra studi
select tests.authenticate_as(tests.id('owner2'));
select is((select count(*)::int from public.videos), 0, 'lo staff di un altro studio non vede i video');
select throws_ok(
  $$ select public.reorder_videos(pg_temp.vid('A'), array[pg_temp.vid('v1'), pg_temp.vid('v2')]) $$,
  'P0002', null, 'lo staff di un altro studio non riordina'
);

-- Clienti
select tests.authenticate_as(tests.id('u1'));
select is((select count(*)::int from public.video_folders), 3, 'un cliente In percorso vede tutte le cartelle dello studio');
select is((select count(*)::int from public.videos), 4, 'e tutti i video');
select throws_ok(
  $$ insert into public.video_folders (studio_id, name) values (tests.id('studio1'), 'Mia') $$,
  '42501', null, 'il cliente non crea cartelle'
);
select throws_ok(
  $$ insert into public.video_views (video_id, client_id, studio_id)
     values (pg_temp.vid('v1'), tests.id('c1'), tests.id('studio1')) $$,
  '42501', null, 'le aperture non si scrivono direttamente'
);
select lives_ok(
  $$ select public.record_video_view(pg_temp.vid('v1'));
     select public.record_video_view(pg_temp.vid('v1')) $$,
  'il cliente registra l''apertura (anche due volte)'
);
select is((select count(*)::int from public.video_views), 1, 'un''apertura per cliente e video');

select tests.authenticate_as(tests.id('u6'));
select results_eq(
  $$ select id from public.video_folders $$,
  $$ values (pg_temp.vid('B')) $$,
  'in Onboarding solo le cartelle visibili anche in Onboarding'
);
select throws_ok(
  $$ select public.record_video_view(pg_temp.vid('v1')) $$,
  null, null, 'in Onboarding non si apre un video delle altre cartelle'
);

select tests.authenticate_as(tests.id('u5'));
select is((select count(*)::int from public.videos), 0, 'un cliente disattivato non vede i video');

select tests.authenticate_as(tests.id('owner1'));
select is((select count(*)::int from public.video_views), 1, 'lo staff legge le aperture del proprio studio');

-- Destinatari della notifica: dispositivo, visibilità, preferenza
select tests.clear_authentication();
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  (tests.id('u1'), 'https://fcm.googleapis.com/fcm/send/v-c1', 'k', 'a'),
  (tests.id('u6'), 'https://fcm.googleapis.com/fcm/send/v-c6', 'k', 'a');
insert into public.notification_preferences (user_id, videos_enabled)
values (tests.id('u6'), false);
select results_eq(
  $$ select client_id from public.video_notification_recipients(pg_temp.vid('v4')) $$,
  $$ values (tests.id('c1')) $$,
  'si avvisa chi vede la cartella, ha un dispositivo e non ha spento i video'
);

select tests.authenticate_as(tests.id('owner1'));
select throws_ok(
  $$ select * from public.video_notification_recipients(pg_temp.vid('v4')) $$,
  '42501', null, 'i destinatari si leggono solo dal server'
);

select * from finish();
rollback;

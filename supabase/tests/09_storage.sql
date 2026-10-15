-- Bucket e policy di Storage.
begin;
select plan(11);
select tests.create_fixtures();

select results_eq(
  $$ select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'client-files' $$,
  $$ values ('client-files'::text, false, 10485760::bigint, array['application/pdf']::text[]) $$,
  'client-files è privato, solo PDF, max 10 MB'
);
select results_eq(
  $$ select public, allowed_mime_types from storage.buckets where id = 'studio-assets' $$,
  $$ values (true, array['image/png', 'image/jpeg']::text[]) $$,
  'studio-assets è pubblico e accetta solo PNG e JPEG'
);

-- Oggetti di esempio (inseriti lato server)
insert into storage.objects (bucket_id, name) values
  ('client-files', tests.id('studio1') || '/' || tests.id('c1') || '/' || tests.id('f1') || '.pdf'),
  ('client-files', tests.id('studio1') || '/' || tests.id('c2') || '/' || tests.id('f2') || '.pdf'),
  ('client-files', tests.id('studio2') || '/' || tests.id('c3') || '/' || tests.id('f3') || '.pdf');

select tests.authenticate_as(tests.id('owner1'));
select is((select count(*)::int from storage.objects where bucket_id = 'client-files'), 2,
  'il titolare vede solo i file del proprio studio');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('client-files', tests.id('studio1') || '/' || tests.id('c1') || '/' || gen_random_uuid() || '.pdf') $$,
  'il titolare carica un PDF per un proprio cliente'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('client-files', tests.id('studio2') || '/' || tests.id('c3') || '/' || gen_random_uuid() || '.pdf') $$,
  '42501', null, 'il titolare non carica file nell''altro studio'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('client-files', tests.id('studio1') || '/' || tests.id('c3') || '/' || gen_random_uuid() || '.pdf') $$,
  '42501', null, 'il cliente nel percorso deve appartenere allo studio'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('client-files', tests.id('studio1') || '/' || tests.id('c1') || '/dieta.pdf') $$,
  '42501', null, 'il nome del file deve essere <uuid>.pdf'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('studio-assets', tests.id('studio1') || '/logo.png') $$,
  'il titolare carica il logo del proprio studio'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('studio-assets', tests.id('studio2') || '/logo.png') $$,
  '42501', null, 'il titolare non carica il logo di un altro studio'
);

select tests.authenticate_as(tests.id('u1'));
select is_empty(
  $$ select name from storage.objects
      where bucket_id = 'client-files' and name not like tests.id('studio1') || '/' || tests.id('c1') || '/%' $$,
  'il cliente vede solo i file nella propria cartella'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('client-files', tests.id('studio1') || '/' || tests.id('c1') || '/' || gen_random_uuid() || '.pdf') $$,
  '42501', null, 'il cliente non carica file'
);

select * from finish();
rollback;

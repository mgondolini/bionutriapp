-- Note cliniche: solo lo staff dello studio, una sola anamnesi che non si
-- elimina, tipo e cliente fissi, autore e data dell'ultima modifica.
begin;
select plan(17);
select tests.create_fixtures();

select tests.authenticate_as(tests.id('owner1'));
select lives_ok(
  $$ insert into public.client_notes (client_id, kind, title)
     values (tests.id('c1'), 'anamnesis', 'Anamnesi') $$,
  'lo staff crea l''anamnesi'
);
select throws_ok(
  $$ insert into public.client_notes (client_id, kind, title)
     values (tests.id('c1'), 'anamnesis', 'Anamnesi') $$,
  '23505', null, 'una sola anamnesi per cliente'
);
select throws_ok(
  $$ insert into public.client_notes (client_id, kind, title)
     values (tests.id('c1'), 'visit', 'Visita di controllo') $$,
  '23514', null, 'una nota di visita ha la data'
);
select throws_ok(
  $$ insert into public.client_notes (client_id, kind, title, visit_date)
     values (tests.id('c1'), 'anamnesis', 'Anamnesi', current_date) $$,
  '23514', null, 'l''anamnesi non ha data'
);
select throws_ok(
  $$ insert into public.client_notes (client_id, kind, title, visit_date)
     values (tests.id('c1'), 'visit', '   ', current_date) $$,
  '23514', null, 'titolo obbligatorio'
);
select throws_ok(
  $$ insert into public.client_notes (client_id, kind, title, visit_date, content)
     values (tests.id('c1'), 'visit', 'Visita', current_date, '[]'::jsonb) $$,
  '23514', null, 'il contenuto è un documento'
);
select lives_ok(
  $$ insert into public.client_notes (client_id, kind, title, visit_date, studio_id, content, content_text)
     values (tests.id('c1'), 'visit', 'Visita di controllo', current_date, tests.id('studio2'),
             '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Ciao"}]}]}', 'Ciao') $$,
  'lo staff crea una nota di visita'
);
select is(
  (select studio_id from public.client_notes where kind = 'visit' and client_id = tests.id('c1')),
  tests.id('studio1'),
  'lo studio viene sempre dal cliente'
);
select is(
  (select created_by from public.client_notes where kind = 'visit' and client_id = tests.id('c1')),
  tests.id('owner1'),
  'autore della nota'
);
update public.client_notes set updated_at = '2020-01-01', created_by = null
 where kind = 'visit' and client_id = tests.id('c1');
select ok(
  (select updated_at > '2020-01-01' and created_by = tests.id('owner1') and updated_by = tests.id('owner1')
     from public.client_notes where kind = 'visit' and client_id = tests.id('c1')),
  'updated_at e updated_by li scrive il database, created_by non cambia'
);
select throws_ok(
  $$ update public.client_notes set kind = 'visit', visit_date = current_date
      where kind = 'anamnesis' and client_id = tests.id('c1') $$,
  '23514', null, 'il tipo non cambia'
);
select throws_ok(
  $$ delete from public.client_notes where kind = 'anamnesis' and client_id = tests.id('c1') $$,
  '23514', null, 'l''anamnesi non si elimina'
);

-- Il cliente della nota non legge, non scrive, non elimina
select tests.authenticate_as(tests.id('u1'));
select is_empty(
  $$ select id from public.client_notes $$,
  'il cliente non legge le note del proprio profilo'
);
select throws_ok(
  $$ insert into public.client_notes (client_id, kind, title, visit_date)
     values (tests.id('c1'), 'visit', 'Mia', current_date) $$,
  '42501', null, 'il cliente non crea note'
);
delete from public.client_notes where client_id = tests.id('c1');

-- Un altro studio non vede nulla
select tests.authenticate_as(tests.id('owner2'));
select is_empty($$ select id from public.client_notes $$, 'un altro studio non legge le note');

reset role;
select is(
  (select count(*)::int from public.client_notes where client_id = tests.id('c1')),
  2, 'il delete del cliente non ha toccato nulla'
);
delete from public.clients where id = tests.id('c1');
select is(
  (select count(*)::int from public.client_notes where client_id = tests.id('c1')),
  0, 'eliminando il cliente l''anamnesi va via in cascata'
);

select * from finish();
rollback;

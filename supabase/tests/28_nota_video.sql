-- Nota dei video formattata: colonne note_doc/note_text, vincoli tecnici,
-- scrittura solo dello staff (RLS invariata), lettura del cliente, nome del
-- titolare per "Nota del Dott. …" solo per i propri clienti.
begin;
select plan(11);
select tests.create_fixtures();

create function pg_temp.doc(p_text text) returns jsonb language sql immutable as $$
  select jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
    jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(
      jsonb_build_object('type', 'text', 'text', p_text)))));
$$;

select hasnt_column('public', 'videos', 'note', 'la vecchia colonna di testo non c''è più');
select has_column('public', 'videos', 'note_doc', 'documento della nota');
select has_column('public', 'videos', 'note_text', 'testo semplice della nota');

select tests.authenticate_as(tests.id('owner1'));
insert into public.video_folders (id, studio_id, name)
values ('70000000-0000-4000-a000-000000000009', tests.id('studio1'), 'Ricette');
select lives_ok(
  format($$ insert into public.videos (id, studio_id, folder_id, youtube_id, title, note_doc, note_text)
            values ('71000000-0000-4000-a000-000000000009', %L,
                    '70000000-0000-4000-a000-000000000009', 'aaaaaaaaaaa', 'Colazione', %L, 'Ciao') $$,
         tests.id('studio1'), pg_temp.doc('Ciao')),
  'lo staff salva una nota formattata'
);
select throws_ok(
  $$ update public.videos set note_text = null
      where id = '71000000-0000-4000-a000-000000000009' $$,
  '23514', null, 'documento e testo vanno insieme'
);
select throws_ok(
  $$ update public.videos set note_doc = '{"type":"html","content":"<b>x</b>"}'
      where id = '71000000-0000-4000-a000-000000000009' $$,
  '23514', null, 'solo un documento dell''editor'
);
select throws_ok(
  format($$ update public.videos set note_doc = %L, note_text = %L
             where id = '71000000-0000-4000-a000-000000000009' $$,
         pg_temp.doc('x'), repeat('a', 3001)),
  '23514', null, 'limite tecnico sul testo'
);

-- c1 (attivo, In percorso, utente u1): legge la nota, non la cambia
select tests.authenticate_as(tests.id('u1'));
select is(
  (select note_text from public.videos where id = '71000000-0000-4000-a000-000000000009'),
  'Ciao', 'il cliente legge la nota'
);
select is(
  tests.affected_rows($$ update public.videos set note_text = 'x', note_doc = pg_temp.doc('x')
                          where id = '71000000-0000-4000-a000-000000000009' $$),
  0, 'il cliente non modifica la nota'
);
select is(
  (select first_name from public.my_studio_staff_name()),
  'Titolare',
  'il cliente legge il nome del titolare del proprio studio'
);
select tests.authenticate_as(tests.id('owner2'));
select is_empty(
  $$ select 1 from public.my_studio_staff_name() $$,
  'chi non è un cliente non ottiene nulla'
);

select * from finish();
rollback;

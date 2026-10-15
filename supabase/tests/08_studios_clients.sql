-- Misure predefinite di un nuovo studio, normalizzazione e unicità dei contatti.
begin;
select plan(16);
select tests.create_fixtures();

-- Misure predefinite
select is((select count(*)::int from public.metrics where studio_id = tests.id('studio1')), 9,
  'alla creazione dello studio vengono create 9 misure');
select results_eq(
  $$ select key, value_type, frequency, min_value, max_value from public.metrics
      where studio_id = tests.id('studio1') order by sort_order $$,
  $$ values
       ('circ_waist'::text, 'decimal'::text, 'monthly_30d'::text, 10::numeric, 250::numeric),
       ('circ_navel', 'decimal', 'monthly_30d', 10, 250),
       ('circ_glutes', 'decimal', 'monthly_30d', 10, 250),
       ('circ_right_leg', 'decimal', 'monthly_30d', 10, 150),
       ('circ_right_arm', 'decimal', 'monthly_30d', 10, 100),
       ('steps', 'score_1_5', 'daily', 1, 5),
       ('sleep', 'score_1_5', 'daily', 1, 5),
       ('water', 'score_1_5', 'daily', 1, 5),
       ('workouts', 'score_1_10', 'per_session', 1, 10) $$,
  'le misure predefinite hanno tipi, frequenze e limiti dei requisiti'
);
select results_eq(
  $$ select key, default_goal, goal_unit from public.metrics
      where studio_id = tests.id('studio1') and default_goal is not null order by sort_order $$,
  $$ values ('steps'::text, 8000::numeric, 'passi'::text), ('sleep', 7, 'ore'), ('water', 2, 'L') $$,
  'obiettivi predefiniti per passi, sonno e acqua'
);

-- Il titolare cambia solo il branding dello studio
select tests.authenticate_as(tests.id('owner1'));
select lives_ok($$ update public.studios set name = 'Nuovo nome', primary_color = '#112233' where id = tests.id('studio1') $$,
  'il titolare modifica nome e colore');
select throws_ok($$ update public.studios set slug = 'altro-slug' where id = tests.id('studio1') $$,
  'P0001', null, 'il titolare non modifica lo slug');

-- Normalizzazione dei contatti
insert into public.clients (id, studio_id, first_name, phone, email, origin) values
  ('70000000-0000-4000-a000-000000000001', tests.id('studio1'), '  Mario ', '333 123-4567', ' Mario.Test@Example.COM ', 'imported'),
  ('70000000-0000-4000-a000-000000000002', tests.id('studio1'), 'Lina', '0039 333 765 4321', '', 'new'),
  ('70000000-0000-4000-a000-000000000003', tests.id('studio1'), 'Tom', '+44 7700 900123', null, 'new');

select results_eq(
  $$ select first_name, phone, email, journey_stage, account_status from public.clients
      where id::text like '70000000-%' order by id $$,
  $$ values
       ('Mario'::text, '+393331234567'::text, 'mario.test@example.com'::text, 'in_progress'::text, 'to_invite'::text),
       ('Lina', '+393337654321', null, 'onboarding', 'to_invite'),
       ('Tom', '+447700900123', null, 'onboarding', 'to_invite') $$,
  'cellulare in E.164, email in minuscolo, fase iniziale in base all''origine'
);

select throws_ok(
  $$ insert into public.clients (studio_id, first_name, phone, origin) values (tests.id('studio1'), 'Doppio', '+39 333 1234567', 'new') $$,
  '23505', null, 'cellulare unico per studio'
);
select throws_ok(
  $$ insert into public.clients (studio_id, first_name, phone, email, origin)
     values (tests.id('studio1'), 'Doppio', '3330009999', 'MARIO.TEST@example.com', 'new') $$,
  '23505', null, 'email unica per studio, senza distinzione di maiuscole'
);
select lives_ok(
  $$ insert into public.clients (studio_id, first_name, phone, origin) values (tests.id('studio1'), 'Senza email', '3330008888', 'new') $$,
  'più clienti senza email nello stesso studio'
);
select throws_ok(
  $$ insert into public.clients (studio_id, first_name, phone, origin) values (tests.id('studio1'), 'X', 'non è un numero', 'new') $$,
  '23514', null, 'cellulare non valido rifiutato'
);
select throws_ok(
  $$ insert into public.clients (studio_id, first_name, phone, origin) values (tests.id('studio1'), 'X', null, 'new') $$,
  '23502', null, 'cellulare obbligatorio'
);
select throws_ok(
  $$ insert into public.clients (studio_id, first_name, phone, email, origin) values (tests.id('studio1'), 'X', '3330007777', 'non-una-email', 'new') $$,
  '23514', null, 'email non valida rifiutata'
);
select lives_ok(
  $$ update public.clients set account_status = 'disabled' where id = tests.id('c1') $$,
  'il titolare disattiva un cliente'
);
select throws_ok(
  $$ update public.clients set account_status = 'active' where id = tests.id('c4') $$,
  '23514', null, 'un cliente senza account non diventa attivo a mano'
);

-- Stesso cellulare in un altro studio: ammesso
select tests.authenticate_as(tests.id('owner2'));
select lives_ok(
  $$ insert into public.clients (studio_id, first_name, phone, origin) values (tests.id('studio2'), 'Mario', '3331234567', 'new') $$,
  'lo stesso cellulare è ammesso in un altro studio'
);
select is(
  (select account_status from public.clients where phone = '+393331234567' and studio_id = tests.id('studio2')),
  'to_invite', 'un cliente creato dallo staff parte sempre da "da invitare"'
);

select * from finish();
rollback;

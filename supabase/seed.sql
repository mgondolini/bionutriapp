-- =====================================================================
-- Seed di sviluppo – SOLO database locale, dati interamente fittizi.
-- Password di tutti gli utenti: password123
--
-- Studio Verde (studio-verde)        Studio Blu (studio-blu)
--   titolare: titolare.verde@…         titolare: titolare.blu@…
--   Anna    attivo / in percorso       Sara   da invitare / in pausa
--   Marco   attivo / onboarding        Paolo  disattivato / concluso
--           (senza email: login con 333 000 0002)
--   Giulia  invito inviato / in percorso
--   Luca    invito scaduto / onboarding
-- =====================================================================

-- Utenti di autenticazione (login con password). I clienti hanno anche il
-- cellulare come identificativo (login con cellulare, fase 4): in auth.users
-- il numero si salva senza "+". Marco non ha email: entra solo con il cellulare.
create function pg_temp.create_user(p_id uuid, p_email text, p_phone text default null) returns void
language sql as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('password123', extensions.gen_salt('bf')),
    case when p_email is not null then now() end,
    ltrim(p_phone, '+'), case when p_phone is not null then now() end,
    jsonb_build_object(
      'provider', case when p_email is not null then 'email' else 'phone' end,
      'providers', to_jsonb(array_remove(array[
        case when p_email is not null then 'email' end,
        case when p_phone is not null then 'phone' end], null))),
    '{}', now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), p_id, p_id::text,
         jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
         'email', now(), now(), now()
   where p_email is not null
  union all
  select gen_random_uuid(), p_id, p_id::text,
         jsonb_build_object('sub', p_id::text, 'phone', ltrim(p_phone, '+'), 'phone_verified', true),
         'phone', now(), now(), now()
   where p_phone is not null;
$$;

select pg_temp.create_user('aaaaaaaa-0000-4000-8000-000000000001', 'titolare.verde@example.test');
select pg_temp.create_user('bbbbbbbb-0000-4000-8000-000000000001', 'titolare.blu@example.test');
select pg_temp.create_user('aaaaaaaa-0000-4000-8000-0000000000c1', 'anna.rossi@example.test', '+393331234567');
select pg_temp.create_user('aaaaaaaa-0000-4000-8000-0000000000c2', null,                       '+393330000002');
select pg_temp.create_user('bbbbbbbb-0000-4000-8000-0000000000c2', 'paolo.viola@example.test', '+393330000006');

-- Studi (le 9 misure predefinite vengono create dal trigger)
insert into public.studios (id, name, slug, primary_color, contact_email) values
  ('aaaaaaaa-1111-4000-8000-000000000000', 'Studio Verde Nutrizione', 'studio-verde', '#2E6A4E', 'info@studio-verde.example.test'),
  ('bbbbbbbb-1111-4000-8000-000000000000', 'Studio Blu Benessere',    'studio-blu',   '#1F4E80', 'info@studio-blu.example.test');

insert into public.studio_members (studio_id, user_id, role, display_name) values
  ('aaaaaaaa-1111-4000-8000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'owner', 'Dott.ssa Elena Verdi'),
  ('bbbbbbbb-1111-4000-8000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000001', 'owner', 'Dott. Franco Blu');

-- Clienti (cellulari nel formato di input: il trigger li normalizza in E.164)
insert into public.clients (id, studio_id, first_name, last_name, phone, email, origin) values
  ('aaaaaaaa-2222-4000-8000-000000000001', 'aaaaaaaa-1111-4000-8000-000000000000', 'Anna',   'Rossi',   '333 123 4567', 'Anna.Rossi@Example.test', 'imported'),
  ('aaaaaaaa-2222-4000-8000-000000000002', 'aaaaaaaa-1111-4000-8000-000000000000', 'Marco',  null,      '+39 333 000 0002', null,                    'new'),
  ('aaaaaaaa-2222-4000-8000-000000000003', 'aaaaaaaa-1111-4000-8000-000000000000', 'Giulia', 'Verdi',   '0039 333 000 0003', 'giulia.verdi@example.test', 'imported'),
  ('aaaaaaaa-2222-4000-8000-000000000004', 'aaaaaaaa-1111-4000-8000-000000000000', 'Luca',   null,      '333-000-0004', null,                        'new'),
  ('bbbbbbbb-2222-4000-8000-000000000001', 'bbbbbbbb-1111-4000-8000-000000000000', 'Sara',   'Gialli',  '333 000 0005', 'sara.gialli@example.test',  'imported'),
  ('bbbbbbbb-2222-4000-8000-000000000002', 'bbbbbbbb-1111-4000-8000-000000000000', 'Paolo',  'Viola',   '333 000 0006', 'paolo.viola@example.test',  'imported');

-- Inviti (token_hash = SHA-256 di un token fittizio)
insert into public.client_invites (client_id, token_hash, sent_at) values
  ('aaaaaaaa-2222-4000-8000-000000000001', encode(extensions.digest('seed-token-anna',   'sha256'), 'hex'), now()),
  ('aaaaaaaa-2222-4000-8000-000000000002', encode(extensions.digest('seed-token-marco',  'sha256'), 'hex'), now()),
  ('aaaaaaaa-2222-4000-8000-000000000003', encode(extensions.digest('seed-token-giulia', 'sha256'), 'hex'), now()),
  ('aaaaaaaa-2222-4000-8000-000000000004', encode(extensions.digest('seed-token-luca',   'sha256'), 'hex'), now() - interval '20 days'),
  ('bbbbbbbb-2222-4000-8000-000000000002', encode(extensions.digest('seed-token-paolo',  'sha256'), 'hex'), now());

-- L'invito di Luca è scaduto
update public.client_invites
   set created_at = now() - interval '20 days', expires_at = now() - interval '6 days'
 where client_id = 'aaaaaaaa-2222-4000-8000-000000000004';

-- Attivazioni (Anna, Marco, Paolo)
select public.activate_client(encode(extensions.digest('seed-token-anna',  'sha256'), 'hex'), 'aaaaaaaa-0000-4000-8000-0000000000c1');
select public.activate_client(encode(extensions.digest('seed-token-marco', 'sha256'), 'hex'), 'aaaaaaaa-0000-4000-8000-0000000000c2');
select public.activate_client(encode(extensions.digest('seed-token-paolo', 'sha256'), 'hex'), 'bbbbbbbb-0000-4000-8000-0000000000c2');

-- Cambi di fase e di stato (registrati nello storico dal trigger)
update public.clients set journey_stage = 'paused'    where id = 'bbbbbbbb-2222-4000-8000-000000000001';
update public.clients set journey_stage = 'completed' where id = 'bbbbbbbb-2222-4000-8000-000000000002';
update public.clients set account_status = 'disabled' where id = 'bbbbbbbb-2222-4000-8000-000000000002';
-- Come fa l'app alla disattivazione: utente bloccato in Supabase Auth (ban)
update auth.users set banned_until = now() + interval '100 years' where id = 'bbbbbbbb-0000-4000-8000-0000000000c2';
update public.clients set push_enabled = true          where id = 'aaaaaaaa-2222-4000-8000-000000000001';
update public.clients set birth_date = '1991-03-12'    where id = 'aaaaaaaa-2222-4000-8000-000000000001';

-- File (solo metadati: nello Storage locale i PDF non esistono).
-- Il file di Marco resta invisibile a lui finché è in Onboarding (C-09).
insert into public.client_files (client_id, category, title, storage_path, size_bytes, valid_from, note, first_read_at) values
  ('aaaaaaaa-2222-4000-8000-000000000002', 'diet', 'Piano alimentare di partenza',
   'aaaaaaaa-1111-4000-8000-000000000000/aaaaaaaa-2222-4000-8000-000000000002/3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0005.pdf',
   204800, current_date, null, null),
  ('aaaaaaaa-2222-4000-8000-000000000001', 'diet', 'Piano alimentare settembre',
   'aaaaaaaa-1111-4000-8000-000000000000/aaaaaaaa-2222-4000-8000-000000000001/3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0001.pdf',
   245760, current_date - 45, null, now() - interval '40 days'),
  ('aaaaaaaa-2222-4000-8000-000000000001', 'diet', 'Piano alimentare ottobre',
   'aaaaaaaa-1111-4000-8000-000000000000/aaaaaaaa-2222-4000-8000-000000000001/3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0002.pdf',
   262144, current_date - 5, 'Ricordati di bere almeno 2 litri d''acqua al giorno.', null),
  ('aaaaaaaa-2222-4000-8000-000000000001', 'workout', 'Scheda forza principianti',
   'aaaaaaaa-1111-4000-8000-000000000000/aaaaaaaa-2222-4000-8000-000000000001/3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0003.pdf',
   131072, current_date - 20, null, null),
  ('bbbbbbbb-2222-4000-8000-000000000002', 'report', 'Report finale',
   'bbbbbbbb-1111-4000-8000-000000000000/bbbbbbbb-2222-4000-8000-000000000002/3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0004.pdf',
   98304, current_date - 60, null, now() - interval '55 days');

-- Obiettivo personale di Anna: 2,5 L di acqua
insert into public.client_metric_goals (client_id, metric_id, goal_value)
select 'aaaaaaaa-2222-4000-8000-000000000001', id, 2.5
  from public.metrics
 where studio_id = 'aaaaaaaa-1111-4000-8000-000000000000' and key = 'water';

-- Registrazioni di tracking di Anna
insert into public.tracking_entries (client_id, metric_id, value, recorded_on, note)
select 'aaaaaaaa-2222-4000-8000-000000000001', m.id, v.value, current_date - v.days_ago, v.note
  from (values
    ('circ_waist',  82.5, 35, null),
    ('circ_waist',  80.0,  4, null),
    ('circ_glutes', 98.0, 35, null),
    ('circ_glutes', 97.0,  4, null),
    ('steps',        4,    3, null),
    ('steps',        5,    2, null),
    ('steps',        3,    1, null),
    ('sleep',        3,    3, null),
    ('sleep',        4,    2, null),
    ('water',        5,    2, null),
    ('water',        4,    1, null),
    ('workouts',     7,    6, 'Gambe, buona energia'),
    ('workouts',     8,    3, null),
    ('workouts',     6,    1, 'Stanca dopo il lavoro')
  ) as v(key, value, days_ago, note)
  join public.metrics m
    on m.studio_id = 'aaaaaaaa-1111-4000-8000-000000000000' and m.key = v.key;

-- Una circonferenza per Paolo (percorso concluso, dati in sola lettura)
insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
select 'bbbbbbbb-2222-4000-8000-000000000002', id, 90.0, current_date - 70
  from public.metrics
 where studio_id = 'bbbbbbbb-1111-4000-8000-000000000000' and key = 'circ_waist';

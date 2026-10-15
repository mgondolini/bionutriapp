-- =====================================================================
-- Helper per i test pgTAP (solo database locale).
-- Questo file NON gira in transazione: crea lo schema "tests" in modo
-- idempotente, così è disponibile agli altri file (eseguiti dopo, in
-- ordine alfabetico, ciascuno in una transazione annullata).
-- =====================================================================

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Id fissi delle fixture, per nome leggibile
create or replace function tests.id(p_name text)
returns uuid language sql immutable as $$
  select (case p_name
    when 'studio1' then '10000000-0000-4000-a000-000000000001'
    when 'studio2' then '10000000-0000-4000-a000-000000000002'
    when 'owner1'  then '20000000-0000-4000-a000-000000000001'
    when 'owner2'  then '20000000-0000-4000-a000-000000000002'
    when 'u1'      then '30000000-0000-4000-a000-000000000001'
    when 'u2'      then '30000000-0000-4000-a000-000000000002'
    when 'u3'      then '30000000-0000-4000-a000-000000000003'
    when 'u4'      then '30000000-0000-4000-a000-000000000004'
    when 'u5'      then '30000000-0000-4000-a000-000000000005'
    when 'stranger' then '30000000-0000-4000-a000-0000000000ff'
    when 'c1'      then '40000000-0000-4000-a000-000000000001'
    when 'c2'      then '40000000-0000-4000-a000-000000000002'
    when 'c3'      then '40000000-0000-4000-a000-000000000003'
    when 'c4'      then '40000000-0000-4000-a000-000000000004'
    when 'c5'      then '40000000-0000-4000-a000-000000000005'
    when 'f1'      then '50000000-0000-4000-a000-000000000001'
    when 'f2'      then '50000000-0000-4000-a000-000000000002'
    when 'f3'      then '50000000-0000-4000-a000-000000000003'
    when 'f5'      then '50000000-0000-4000-a000-000000000005'
    when 'e1'      then '60000000-0000-4000-a000-000000000001'
    when 'e2'      then '60000000-0000-4000-a000-000000000002'
    when 'e3'      then '60000000-0000-4000-a000-000000000003'
  end)::uuid;
$$;

-- Crea un utente di autenticazione
create or replace function tests.create_user(p_id uuid, p_email text)
returns uuid language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, '',
          now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  returning id;
$$;

-- Simula una richiesta dell'API come utente autenticato
create or replace function tests.authenticate_as(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

-- Simula una richiesta anonima
create or replace function tests.authenticate_as_anon()
returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
end;
$$;

-- Torna all'utente della sessione (postgres): equivale a un'operazione lato server
create or replace function tests.clear_authentication()
returns void language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Esegue un comando DML con i permessi del ruolo corrente e restituisce le righe toccate
create or replace function tests.affected_rows(p_sql text)
returns int language plpgsql as $$
declare
  v_count int;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Hash SHA-256 esadecimale di un token di invito
create or replace function tests.token_hash(p_token text)
returns text language sql immutable as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Id della misura di uno studio a partire dalla chiave
create or replace function tests.metric_id(p_studio uuid, p_key text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.metrics where studio_id = p_studio and key = p_key;
$$;

-- ---------------------------------------------------------------------
-- Fixture comuni (da chiamare come postgres, dentro la transazione del test)
--
--   studio1  titolare owner1
--     c1  attivo, in percorso, utente u1   file f1, registrazione e1
--     c2  attivo, in percorso, utente u2   file f2, registrazione e2
--     c4  da invitare, nuovo (onboarding)
--     c5  disattivato, utente u5           file f5
--   studio2  titolare owner2
--     c3  attivo, in percorso, utente u3   file f3, registrazione e3
--   stranger: utente autenticato senza studio né cliente
-- ---------------------------------------------------------------------
create or replace function tests.create_fixtures()
returns void language plpgsql as $$
declare
  v_name text;
begin
  foreach v_name in array array['owner1', 'owner2', 'u1', 'u2', 'u3', 'u4', 'u5', 'stranger'] loop
    perform tests.create_user(tests.id(v_name), v_name || '@test.local');
  end loop;

  insert into public.studios (id, name, slug) values
    (tests.id('studio1'), 'Studio Uno', 'test-uno'),
    (tests.id('studio2'), 'Studio Due', 'test-due');

  insert into public.studio_members (studio_id, user_id, display_name) values
    (tests.id('studio1'), tests.id('owner1'), 'Titolare Uno'),
    (tests.id('studio2'), tests.id('owner2'), 'Titolare Due');

  insert into public.clients (id, studio_id, first_name, last_name, phone, email, origin) values
    (tests.id('c1'), tests.id('studio1'), 'Cliente', 'Uno',     '3330000101', 'c1@test.local', 'imported'),
    (tests.id('c2'), tests.id('studio1'), 'Cliente', 'Due',     '3330000102', 'c2@test.local', 'imported'),
    (tests.id('c3'), tests.id('studio2'), 'Cliente', 'Tre',     '3330000103', 'c3@test.local', 'imported'),
    (tests.id('c4'), tests.id('studio1'), 'Cliente', 'Quattro', '3330000104', null,            'new'),
    (tests.id('c5'), tests.id('studio1'), 'Cliente', 'Cinque',  '3330000105', null,            'imported');

  -- attivazione tramite invito, come in produzione
  insert into public.client_invites (client_id, token_hash) values
    (tests.id('c1'), tests.token_hash('fixture-c1')),
    (tests.id('c2'), tests.token_hash('fixture-c2')),
    (tests.id('c3'), tests.token_hash('fixture-c3')),
    (tests.id('c5'), tests.token_hash('fixture-c5'));
  perform public.activate_client(tests.token_hash('fixture-c1'), tests.id('u1'));
  perform public.activate_client(tests.token_hash('fixture-c2'), tests.id('u2'));
  perform public.activate_client(tests.token_hash('fixture-c3'), tests.id('u3'));
  perform public.activate_client(tests.token_hash('fixture-c5'), tests.id('u5'));
  update public.clients set account_status = 'disabled' where id = tests.id('c5');

  insert into public.client_files (id, client_id, category, title, storage_path, size_bytes) values
    (tests.id('f1'), tests.id('c1'), 'diet', 'Dieta c1',
     tests.id('studio1') || '/' || tests.id('c1') || '/' || tests.id('f1') || '.pdf', 1000),
    (tests.id('f2'), tests.id('c2'), 'diet', 'Dieta c2',
     tests.id('studio1') || '/' || tests.id('c2') || '/' || tests.id('f2') || '.pdf', 1000),
    (tests.id('f3'), tests.id('c3'), 'diet', 'Dieta c3',
     tests.id('studio2') || '/' || tests.id('c3') || '/' || tests.id('f3') || '.pdf', 1000),
    (tests.id('f5'), tests.id('c5'), 'report', 'Report c5',
     tests.id('studio1') || '/' || tests.id('c5') || '/' || tests.id('f5') || '.pdf', 1000);

  insert into public.tracking_entries (id, client_id, metric_id, value, recorded_on) values
    (tests.id('e1'), tests.id('c1'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 80, current_date - 1),
    (tests.id('e2'), tests.id('c2'), tests.metric_id(tests.id('studio1'), 'circ_waist'), 90, current_date - 1),
    (tests.id('e3'), tests.id('c3'), tests.metric_id(tests.id('studio2'), 'circ_waist'), 70, current_date - 1);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select has_function('tests', 'create_fixtures', 'helper di test installati');
select * from finish();

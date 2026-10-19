-- =====================================================================
-- Inviti e attivazione (N-01, N-02, C-08), fasi del percorso (ST-01…ST-04).
--   * consenso privacy salvato all'attivazione
--   * activate_client: correzioni dei dati, fase per origine, monouso anche
--     con richieste simultanee
--   * set_journey_stage: cambio di fase con controllo della fase attesa e
--     delle transizioni consentite (manuale ora, automatico dalla 2.0)
--   * client_stage_history: storico con il nome dell'autore
-- =====================================================================

-- Consenso al trattamento dei dati sulla salute (schermate C1 e C2).
-- Lo imposta solo activate_client (lato server): guard_client impedisce al
-- cliente di modificarlo, lo staff non ha motivo di toccarlo.
alter table public.clients add column privacy_consent_at timestamptz;

-- clients_with_status espande c.*: va ricreata per la nuova colonna, insieme
-- a client_list che dipende da essa (stessa definizione della migrazione precedente).
drop view public.client_list;
drop view public.clients_with_status;

create view public.clients_with_status with (security_invoker = true) as
select
  c.*,
  case
    when c.account_status = 'invited'
     and (li.id is null or li.used_at is not null or li.revoked_at is not null or li.expires_at <= now())
    then 'invite_expired'
    else c.account_status
  end                as effective_account_status,
  li.created_at      as last_invite_created_at,
  li.sent_at         as last_invite_sent_at,
  li.expires_at      as last_invite_expires_at,
  li.used_at         as last_invite_used_at
from public.clients c
left join lateral (
  select i.id, i.created_at, i.sent_at, i.expires_at, i.used_at, i.revoked_at
    from public.client_invites i
   where i.client_id = c.id
   order by i.created_at desc
   limit 1
) li on true;

create view public.client_list with (security_invoker = true) as
select
  c.id,
  c.studio_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  c.origin,
  c.account_status,
  c.effective_account_status,
  c.journey_stage,
  c.created_at,
  lf.title        as last_file_title,
  lf.category     as last_file_category,
  lf.uploaded_at  as last_file_uploaded_at,
  le.recorded_on  as last_entry_on
from public.clients_with_status c
left join lateral (
  select f.title, f.category, f.uploaded_at
    from public.client_files f
   where f.client_id = c.id
   order by f.uploaded_at desc
   limit 1
) lf on true
left join lateral (
  select t.recorded_on
    from public.tracking_entries t
   where t.client_id = c.id
   order by t.recorded_on desc
   limit 1
) le on true;

revoke all on public.clients_with_status from anon;
revoke all on public.client_list from anon;

-- ---------------------------------------------------------------------
-- Transizioni di fase consentite. Stessa tabella di src/lib/domain/journey.ts:
-- qui è la seconda barriera, il controllo principale è nella Server Action.
-- ---------------------------------------------------------------------
create or replace function private.journey_transition_allowed(p_from text, p_to text)
returns boolean language sql immutable set search_path = '' as $$
  select (p_from, p_to) in (
    ('onboarding',  'in_progress'),
    ('in_progress', 'paused'),
    ('in_progress', 'completed'),
    ('paused',      'in_progress'),
    ('paused',      'completed'),
    ('completed',   'in_progress')
  );
$$;

-- Cambio di fase (ST-02, ST-04). security invoker: valgono la RLS e i trigger
-- dello staff. Aggiorna solo se la fase è ancora quella attesa (due modifiche
-- contemporanee non si sovrascrivono) e restituisce false altrimenti.
-- p_automatic = true registra il cambio come 'automatic' (v2.0, CAL-14 / ST-03).
create or replace function public.set_journey_stage(
  p_client_id uuid, p_from text, p_to text, p_automatic boolean default false
)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_count int;
begin
  if not private.journey_transition_allowed(p_from, p_to) then
    raise exception 'Cambio di fase non consentito: % → %', p_from, p_to
      using errcode = 'check_violation';
  end if;
  if p_automatic then
    perform set_config('app.stage_source', 'automatic', true);
  end if;

  update public.clients
     set journey_stage = p_to
   where id = p_client_id and journey_stage = p_from;
  get diagnostics v_count = row_count;

  if p_automatic then
    perform set_config('app.stage_source', '', true);
  end if;
  return v_count = 1;
end;
$$;
revoke execute on function public.set_journey_stage(uuid, text, text, boolean) from public, anon;
grant execute on function public.set_journey_stage(uuid, text, text, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Attivazione dall'invito (solo lato server, secret key), in un'unica
-- transazione:
--   1. segna l'invito come usato SOLO se è ancora utilizzabile, e controlla
--      le righe modificate: con due richieste simultanee una sola passa;
--   2. collega l'utente, attiva l'account, salva le correzioni ai dati e il
--      consenso (p_profile, facoltativo);
--   3. alla prima attivazione riporta la fase a quella prevista dall'origine
--      ('imported' → In percorso, 'new' → Onboarding); il trigger la registra
--      come 'automatic' solo se cambia.
-- Un cliente già attivo (nuovo link per reimpostare la password, N-02) non
-- cambia né dati né fase.
-- p_profile: { first_name, last_name, email, birth_date, privacy_consent }
-- ---------------------------------------------------------------------
drop function public.activate_client(text, uuid);

create function public.activate_client(p_token_hash text, p_user_id uuid, p_profile jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_client_id uuid;
  v_client public.clients%rowtype;
begin
  update public.client_invites
     set used_at = now()
   where token_hash = p_token_hash
     and used_at is null
     and revoked_at is null
     and expires_at > now()
  returning client_id into v_client_id;

  if v_client_id is null then
    raise exception 'Invito non valido o scaduto';
  end if;

  select * into v_client from public.clients where id = v_client_id for update;
  if v_client.account_status = 'disabled' then
    raise exception 'Account disattivato';
  end if;
  if v_client.user_id is not null and v_client.user_id <> p_user_id then
    raise exception 'Il cliente è già collegato a un altro account';
  end if;

  if v_client.account_status = 'active' then
    return v_client.id;
  end if;

  update public.clients
     set user_id            = p_user_id,
         account_status     = 'active',
         activated_at       = coalesce(activated_at, now()),
         first_name         = coalesce(p_profile ->> 'first_name', first_name),
         last_name          = case when p_profile ? 'last_name' then p_profile ->> 'last_name' else last_name end,
         email              = case when p_profile ? 'email' then p_profile ->> 'email' else email end,
         birth_date         = case when p_profile ? 'birth_date' then (p_profile ->> 'birth_date')::date else birth_date end,
         privacy_consent_at = case when coalesce((p_profile ->> 'privacy_consent')::boolean, false)
                                   then now() else privacy_consent_at end,
         journey_stage      = case origin when 'imported' then 'in_progress' else 'onboarding' end
   where id = v_client.id;
  return v_client.id;
end;
$$;
revoke execute on function public.activate_client(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.activate_client(text, uuid, jsonb) to service_role;

-- guard_client: il consenso non si modifica né dal cliente né dallo staff.
create or replace function private.guard_client()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- fase iniziale: i clienti già nel database partono In percorso, i nuovi da Onboarding
    new.journey_stage := case new.origin when 'imported' then 'in_progress' else 'onboarding' end;

    if (select auth.uid()) is not null then
      if new.user_id is not null or new.activated_at is not null then
        raise exception 'L''account si collega al cliente solo con l''attivazione dell''invito';
      end if;
      new.account_status := 'to_invite';
      new.privacy_consent_at := null;
    end if;
    return new;
  end if;

  if new.studio_id <> old.studio_id then
    raise exception 'Non è possibile spostare un cliente in un altro studio';
  end if;

  if (select auth.uid()) is null then
    return new;
  end if;

  -- Staff: tutto tranne il collegamento all'account e il consenso
  if private.is_studio_member(old.studio_id) then
    if new.user_id is distinct from old.user_id or new.activated_at is distinct from old.activated_at
       or new.privacy_consent_at is distinct from old.privacy_consent_at then
      raise exception 'Il collegamento all''account non si modifica manualmente';
    end if;
    return new;
  end if;

  -- Cliente su sé stesso: solo nome, cognome e preferenza notifiche
  if private.changed_outside(to_jsonb(old), to_jsonb(new),
       array['first_name', 'last_name', 'push_enabled', 'updated_at']) then
    raise exception 'Puoi modificare solo nome, cognome e preferenze di notifica';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Storico delle fasi con il nome dell'autore (ST-04). security_invoker:
-- lo staff vede solo il proprio studio; changed_by nullo = automatico.
-- ---------------------------------------------------------------------
create view public.client_stage_history with (security_invoker = true) as
select
  e.id,
  e.studio_id,
  e.client_id,
  e.from_stage,
  e.to_stage,
  e.changed_at,
  e.source,
  m.display_name as changed_by_name
from public.client_stage_events e
left join public.studio_members m
  on m.studio_id = e.studio_id and m.user_id = e.changed_by;

revoke all on public.client_stage_history from anon;

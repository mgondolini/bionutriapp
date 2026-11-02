-- =====================================================================
-- Altezza del cliente: dato anagrafico costante (non una misura del
-- tracking), in centimetri interi. Obbligatoria all'attivazione (Zod),
-- modificabile dal cliente nel profilo e dallo staff nella scheda.
-- =====================================================================

-- DA CONFERMARE: limiti 100–230 cm (uguali a HEIGHT_LIMITS in domain.ts)
alter table public.clients
  add column height_cm smallint check (height_cm is null or height_cm between 100 and 230);

-- clients_with_status espande c.*: va ricreata per la nuova colonna, insieme
-- a client_list che dipende da essa (stessa definizione di 20261017000000).
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
-- Campi protetti: il cliente modifica di sé anche l'altezza
-- (stessa funzione di 20261022000000, cambia solo l'elenco finale)
-- ---------------------------------------------------------------------
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
      new.push_enabled := false;
    end if;
    return new;
  end if;

  if new.studio_id <> old.studio_id then
    raise exception 'Non è possibile spostare un cliente in un altro studio';
  end if;

  if (select auth.uid()) is null then
    return new;
  end if;

  -- push_enabled lo scrive solo private.sync_push_enabled (trigger annidato)
  if new.push_enabled is distinct from old.push_enabled and pg_trigger_depth() <= 1 then
    raise exception 'Lo stato delle notifiche segue i dispositivi registrati';
  end if;

  -- Staff: tutto tranne il collegamento all'account e il consenso
  if private.is_studio_member(old.studio_id) then
    if new.user_id is distinct from old.user_id or new.activated_at is distinct from old.activated_at
       or new.privacy_consent_at is distinct from old.privacy_consent_at then
      raise exception 'Il collegamento all''account non si modifica manualmente';
    end if;
    return new;
  end if;

  -- Cliente su sé stesso: solo nome, cognome, data di nascita e altezza.
  -- L'email segue Auth (sync_client_email), il cellulare lo cambia solo lo
  -- studio, push_enabled i dispositivi registrati.
  if private.changed_outside(to_jsonb(old), to_jsonb(new),
       array['first_name', 'last_name', 'birth_date', 'height_cm', 'push_enabled', 'updated_at']) then
    raise exception 'Puoi modificare solo nome, cognome, data di nascita e altezza';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profilo del cliente: anche l'altezza. Senza p_height_cm resta quella
-- salvata (il cliente non la toglie: è obbligatoria dall'attivazione).
-- ---------------------------------------------------------------------
drop function public.update_my_client_profile(text, text, date);

create function public.update_my_client_profile(
  p_first_name text, p_last_name text, p_birth_date date, p_height_cm smallint default null
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_count int;
begin
  update public.clients
     set first_name = trim(p_first_name),
         last_name  = nullif(trim(coalesce(p_last_name, '')), ''),
         birth_date = p_birth_date,
         height_cm  = coalesce(p_height_cm, height_cm)
   where id = private.my_client_id();
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Profilo non trovato' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function public.update_my_client_profile(text, text, date, smallint) from public, anon;
grant execute on function public.update_my_client_profile(text, text, date, smallint) to authenticated;

-- ---------------------------------------------------------------------
-- activate_client: stessa funzione di 20261029000000, più height_cm in
-- p_profile.
-- ---------------------------------------------------------------------
create or replace function public.activate_client(p_token_hash text, p_user_id uuid, p_profile jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_client_id uuid;
  v_client public.clients%rowtype;
  v_health boolean := coalesce((p_profile ->> 'health_data')::boolean,
                               (p_profile ->> 'privacy_consent')::boolean, false);
  v_notice boolean := coalesce((p_profile ->> 'privacy_notice')::boolean, false);
  v_version text := coalesce(nullif(p_profile ->> 'policy_version', ''), 'non indicata');
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
         height_cm          = case when p_profile ? 'height_cm' then (p_profile ->> 'height_cm')::smallint else height_cm end,
         privacy_consent_at = case when v_health then now() else privacy_consent_at end,
         journey_stage      = case origin when 'imported' then 'in_progress' else 'onboarding' end
   where id = v_client.id;

  insert into public.privacy_consents (studio_id, client_id, kind, policy_version)
  select v_client.studio_id, v_client.id, k.kind, v_version
    from (values ('privacy_notice', v_notice), ('health_data', v_health)) as k(kind, given)
   where k.given;

  return v_client.id;
end;
$$;
revoke execute on function public.activate_client(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.activate_client(text, uuid, jsonb) to service_role;

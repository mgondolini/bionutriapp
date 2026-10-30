-- =====================================================================
-- Consensi privacy (NF-06), fase 9.
--   * privacy_consents: una riga per consenso dato all'attivazione, con
--     versione dell'informativa e data. Solo aggiunte: nessuno la modifica.
--   * activate_client: registra presa visione dell'informativa e consenso
--     al trattamento dei dati sanitari nella stessa transazione.
-- =====================================================================

create table public.privacy_consents (
  id              uuid primary key default gen_random_uuid(),
  studio_id       uuid not null references public.studios(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  kind            text not null check (kind in ('privacy_notice', 'health_data')),
  policy_version  text not null check (char_length(policy_version) between 1 and 40),
  accepted_at     timestamptz not null default now()
);
create index privacy_consents_client_idx on public.privacy_consents (client_id, accepted_at desc);

alter table public.privacy_consents enable row level security;
revoke all on public.privacy_consents from anon;
-- Scritture solo da activate_client (security definer): nessun privilegio di
-- scrittura per gli utenti, nemmeno tramite policy.
revoke insert, update, delete, truncate on public.privacy_consents from authenticated;

create policy "privacy consents: staff legge" on public.privacy_consents
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "privacy consents: cliente legge i propri" on public.privacy_consents
  for select to authenticated
  using (client_id = private.my_client_id());

-- Account già attivi: il consenso dato prima di questa tabella resta
-- documentato da clients.privacy_consent_at (versione 'pre-1.0').
insert into public.privacy_consents (studio_id, client_id, kind, policy_version, accepted_at)
select c.studio_id, c.id, k.kind, 'pre-1.0', c.privacy_consent_at
  from public.clients c
 cross join (values ('privacy_notice'), ('health_data')) as k(kind)
 where c.privacy_consent_at is not null;

-- ---------------------------------------------------------------------
-- activate_client: stessa logica della migrazione 20261017000000, più i
-- consensi. p_profile: { first_name, last_name, email, birth_date,
-- privacy_notice, health_data, policy_version } (privacy_consent resta
-- accettato come sinonimo di health_data). I consensi si registrano solo alla
-- prima attivazione; il controllo che siano entrambi presenti lo fa il server
-- (Zod) prima di creare l'utente.
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

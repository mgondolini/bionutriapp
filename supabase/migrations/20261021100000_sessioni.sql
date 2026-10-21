-- =====================================================================
-- Fase 7, parte B: sessioni revocate (logout, "Esci da tutti i
-- dispositivi", cambio password)
--
-- Il JWT di accesso resta valido fino alla scadenza (jwt_expiry, un'ora)
-- anche dopo signOut: con le chiavi asimmetriche la firma si verifica senza
-- chiedere al server di Auth. Per questo gli helper delle policy, my_context
-- e le RPC dell'utente usano private.session_uid(): l'utente del JWT solo se
-- la sua sessione esiste ancora in auth.sessions. Una sessione chiusa non
-- legge né scrive più nulla, nemmeno chiamando l'API direttamente.
-- I trigger che usano auth.uid() solo per distinguere le operazioni lato
-- server (auth.uid() nullo) non cambiano: con una sessione revocata restano
-- più restrittivi, non meno.
-- =====================================================================

create or replace function private.session_uid()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.user_id
    from auth.sessions s
   where s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
     and s.user_id = (select auth.uid())
     and (s.not_after is null or s.not_after > now());
$$;

revoke execute on function private.session_uid() from public, anon;
grant execute on function private.session_uid() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Helper delle policy
-- ---------------------------------------------------------------------
create or replace function private.is_studio_member(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.studio_members
     where studio_id = p_studio and user_id = (select private.session_uid())
  );
$$;

create or replace function private.is_studio_owner(p_studio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.studio_members
     where studio_id = p_studio and user_id = (select private.session_uid()) and role = 'owner'
  );
$$;

create or replace function private.my_studio_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select studio_id from public.studio_members where user_id = (select private.session_uid());
$$;

create or replace function private.my_client_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.clients
   where user_id = (select private.session_uid()) and account_status = 'active';
$$;

create or replace function private.my_client_studio_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select studio_id from public.clients
   where user_id = (select private.session_uid()) and account_status = 'active';
$$;

create or replace function private.my_unlocked_client_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.clients
   where user_id = (select private.session_uid())
     and account_status = 'active'
     and journey_stage <> 'onboarding';
$$;

create or replace function private.my_client_can_track()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clients
     where user_id = (select private.session_uid())
       and account_status = 'active'
       and journey_stage = 'in_progress'
  );
$$;

create or replace function private.is_studio_owner_path(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.studio_members
     where studio_id::text = split_part(p_name, '/', 1)
       and user_id = (select private.session_uid())
       and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------
-- Ruolo per proxy e getSession: nessuna riga = sessione non valida
-- ---------------------------------------------------------------------
create or replace function public.my_context()
returns table (role text, studio_id uuid, studio_slug text, client_id uuid)
language sql stable security definer set search_path = '' as $$
  select sm.role, sm.studio_id, s.slug, null::uuid
    from public.studio_members sm
    join public.studios s on s.id = sm.studio_id
   where sm.user_id = (select private.session_uid())
  union all
  select case c.account_status when 'active' then 'client' else 'client_disabled' end,
         c.studio_id, s.slug, c.id
    from public.clients c
    join public.studios s on s.id = c.studio_id
   where c.user_id = (select private.session_uid()) and c.account_status in ('active', 'disabled');
$$;

-- ---------------------------------------------------------------------
-- RPC dell'utente
-- ---------------------------------------------------------------------
create or replace function public.update_my_member_profile(
  p_first_name text, p_last_name text, p_title text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  update public.studio_members
     set first_name = trim(p_first_name),
         last_name  = nullif(trim(coalesce(p_last_name, '')), ''),
         title      = nullif(trim(coalesce(p_title, '')), '')
   where user_id = (select private.session_uid());
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Profilo non trovato' using errcode = 'no_data_found';
  end if;
end;
$$;

create or replace function public.my_email_available(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1
      from public.clients me
      join public.clients other
        on other.studio_id = me.studio_id and other.id <> me.id
     where me.user_id = (select private.session_uid())
       and other.email = lower(trim(p_email))
  );
$$;

create or replace function public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select private.session_uid());
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Utente non autenticato';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user, p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent
  returning id into v_id;
  return v_id;
end;
$$;

-- Sottoscrizioni push: solo con una sessione valida
drop policy "push: utente gestisce le proprie" on public.push_subscriptions;
create policy "push: utente gestisce le proprie" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select private.session_uid()))
  with check (user_id = (select private.session_uid()));

-- =====================================================================
-- Fase 7, parte A: profilo del cliente e del professionista (C-07, A-06)
--   * studio_members: nome, cognome e titolo facoltativo; display_name
--     diventa una colonna generata (le letture esistenti non cambiano)
--   * guard_client: il cliente modifica anche la data di nascita
--   * update_my_client_profile / update_my_member_profile: elenco esplicito
--     dei campi che l'utente modifica di sé
--   * sync_client_email: clients.email segue l'email di Auth, solo dopo la
--     conferma del nuovo indirizzo
--   * my_email_available: controllo preventivo dell'indice unico per studio
-- =====================================================================

-- ---------------------------------------------------------------------
-- Nome del professionista
-- ---------------------------------------------------------------------
alter table public.studio_members
  add column title      text check (title is null or char_length(title) between 1 and 20),
  add column first_name text check (first_name is null or char_length(first_name) between 1 and 80),
  add column last_name  text check (last_name is null or char_length(last_name) between 1 and 80);

-- "Dott.ssa Elena Verdi" → titolo "Dott.ssa" (prima parola con il punto),
-- nome "Elena", cognome "Verdi" (il resto).
update public.studio_members
   set title = case when split_part(display_name, ' ', 1) like '%.%'
                    then split_part(display_name, ' ', 1) end;
update public.studio_members
   set first_name = split_part(trim(substr(display_name, coalesce(char_length(title), 0) + 1)), ' ', 1);
update public.studio_members
   set last_name = nullif(trim(substr(trim(substr(display_name, coalesce(char_length(title), 0) + 1)),
                                      char_length(first_name) + 1)), '');

alter table public.studio_members alter column first_name set not null;

-- La vista dello storico legge display_name: si ricrea uguale.
drop view public.client_stage_history;
alter table public.studio_members drop column display_name;
alter table public.studio_members
  add column display_name text generated always as (
    coalesce(title || ' ', '') || first_name || coalesce(' ' || last_name, '')
  ) stored;

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

-- Il professionista modifica di sé solo nome, cognome e titolo. Nessuna
-- policy di update su studio_members: si passa da qui.
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
   where user_id = (select auth.uid());
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Profilo non trovato' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function public.update_my_member_profile(text, text, text) from public, anon;
grant execute on function public.update_my_member_profile(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Campi che il cliente modifica di sé
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

  -- Cliente su sé stesso: solo nome, cognome, data di nascita e preferenza
  -- notifiche. L'email segue Auth (sync_client_email), il cellulare lo cambia
  -- solo lo studio.
  if private.changed_outside(to_jsonb(old), to_jsonb(new),
       array['first_name', 'last_name', 'birth_date', 'push_enabled', 'updated_at']) then
    raise exception 'Puoi modificare solo nome, cognome, data di nascita e preferenze di notifica';
  end if;
  return new;
end;
$$;

-- Security invoker: valgono la RLS (solo il proprio profilo) e guard_client.
create or replace function public.update_my_client_profile(
  p_first_name text, p_last_name text, p_birth_date date
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_count int;
begin
  update public.clients
     set first_name = trim(p_first_name),
         last_name  = nullif(trim(coalesce(p_last_name, '')), ''),
         birth_date = p_birth_date
   where id = private.my_client_id();
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Profilo non trovato' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function public.update_my_client_profile(text, text, date) from public, anon;
grant execute on function public.update_my_client_profile(text, text, date) to authenticated;

-- ---------------------------------------------------------------------
-- Email del cliente: segue quella confermata in Auth
-- ---------------------------------------------------------------------
-- Gira con l'utente di Auth (auth.uid() nullo): guard_client lo considera
-- un'operazione lato server. Se un altro cliente dello studio usa già
-- l'indirizzo l'indice unico fa fallire la conferma: l'app lo evita con
-- my_email_available prima di chiedere il cambio.
create or replace function private.sync_client_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.clients
     set email = lower(new.email)
   where user_id = new.id
     and email is distinct from lower(new.email);
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is not null and old.email is distinct from new.email)
  execute function private.sync_client_email();

-- Vero se nessun ALTRO cliente dello studio dell'utente usa l'indirizzo.
-- Per lo staff (nessuna riga in clients) vale sempre vero: l'unicità
-- dell'email di Auth la controlla Supabase.
create or replace function public.my_email_available(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1
      from public.clients me
      join public.clients other
        on other.studio_id = me.studio_id and other.id <> me.id
     where me.user_id = (select auth.uid())
       and other.email = lower(trim(p_email))
  );
$$;

revoke execute on function public.my_email_available(text) from public, anon;
grant execute on function public.my_email_available(text) to authenticated;

-- =====================================================================
-- Nome dello studio nelle email di Supabase Auth (N-07), fase 9.
-- I modelli delle email sono unici per progetto: il nome dello studio arriva
-- da user_metadata.studio_name ({{ .Data.studio_name }} nei modelli).
-- Lo tengono aggiornato i trigger:
--   * cliente collegato a un utente (activate_client);
--   * nuovo membro dello staff (scripts/create-studio.ts);
--   * nome dello studio cambiato dalle impostazioni.
-- =====================================================================

create or replace function private.set_user_studio_name(p_user_id uuid, p_name text)
returns void language sql security definer set search_path = '' as $$
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('studio_name', p_name)
   where id = p_user_id
     and raw_user_meta_data ->> 'studio_name' is distinct from p_name;
$$;
revoke execute on function private.set_user_studio_name(uuid, text) from public, anon, authenticated;

create or replace function private.sync_client_studio_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    perform private.set_user_studio_name(
      new.user_id, (select s.name from public.studios s where s.id = new.studio_id));
  end if;
  return new;
end;
$$;

create trigger clients_sync_studio_name
  after insert or update of user_id on public.clients
  for each row execute function private.sync_client_studio_name();

create or replace function private.sync_member_studio_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.set_user_studio_name(
    new.user_id, (select s.name from public.studios s where s.id = new.studio_id));
  return new;
end;
$$;

create trigger studio_members_sync_studio_name
  after insert on public.studio_members
  for each row execute function private.sync_member_studio_name();

create or replace function private.sync_studio_name_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.set_user_studio_name(u.user_id, new.name)
     from (select user_id from public.clients where studio_id = new.id and user_id is not null
           union
           select user_id from public.studio_members where studio_id = new.id) u;
  return new;
end;
$$;

create trigger studios_sync_studio_name
  after update of name on public.studios
  for each row when (old.name is distinct from new.name)
  execute function private.sync_studio_name_change();

-- Utenti già esistenti
select private.set_user_studio_name(c.user_id, s.name)
  from public.clients c join public.studios s on s.id = c.studio_id
 where c.user_id is not null;
select private.set_user_studio_name(m.user_id, s.name)
  from public.studio_members m join public.studios s on s.id = m.studio_id;

-- =====================================================================
-- Migrazione v3.0 – Collaboratori, assegnazione clienti, permessi differenziati
-- Da salvare in: supabase/migrations/20261013000000_collaboratori_assegnazioni.sql
-- Richiede le migrazioni:
--   20261011000000_schema_iniziale.sql          (v1.0)
--   20261012000000_calendario_appuntamenti.sql  (v2.0)
-- =====================================================================

-- =====================================================================
-- 1. RUOLI: titolare (owner) e collaboratore (collaborator)
-- =====================================================================
alter table public.studio_members drop constraint if exists studio_members_role_check;

update public.studio_members set role = 'collaborator' where role = 'nutritionist';

alter table public.studio_members
  alter column role set default 'collaborator',
  add constraint studio_members_role_check check (role in ('owner', 'collaborator'));

-- =====================================================================
-- 2. ASSEGNAZIONE DEI CLIENTI A UN PROFESSIONISTA (COL-05: al massimo uno)
-- =====================================================================
alter table public.clients add column assigned_to uuid;

-- Il professionista assegnato deve appartenere allo stesso studio.
-- Se viene rimosso dallo studio, il cliente torna "non assegnato" (COL-01).
alter table public.clients
  add constraint clients_assigned_member_fk
  foreign key (studio_id, assigned_to)
  references public.studio_members (studio_id, user_id)
  on delete set null (assigned_to);

create index clients_assigned_idx on public.clients (studio_id, assigned_to);

-- Può operare sul cliente: il titolare dello studio o il professionista assegnato
create or replace function private.can_manage_client(p_client uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.clients c
      join public.studio_members sm
        on sm.studio_id = c.studio_id and sm.user_id = auth.uid()
     where c.id = p_client
       and (sm.role = 'owner' or c.assigned_to = auth.uid())
  );
$$;

-- Regole di assegnazione:
-- - un collaboratore che crea un cliente se lo vede assegnato automaticamente;
-- - solo il titolare può cambiare l'assegnazione;
-- - nessuno può spostare un cliente in un altro studio.
-- Le operazioni lato server con service role (auth.uid() nullo, es. import CSV) sono libere.
create or replace function private.enforce_client_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.studio_id <> old.studio_id then
    raise exception 'Non è possibile spostare un cliente in un altro studio';
  end if;

  if auth.uid() is null or private.is_studio_owner(new.studio_id) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.assigned_to := auth.uid();
  elsif new.assigned_to is distinct from old.assigned_to then
    raise exception 'Solo il titolare dello studio può cambiare l''assegnazione del cliente';
  end if;

  return new;
end;
$$;

create trigger clients_enforce_assignment before insert or update on public.clients
  for each row execute function private.enforce_client_assignment();

-- =====================================================================
-- 3. POLICY: tutti i membri vedono tutto, si opera solo sui propri clienti
-- =====================================================================

-- CLIENTS
drop policy if exists "clients: staff gestisce" on public.clients;

create policy "clients: staff legge" on public.clients
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "clients: staff crea" on public.clients
  for insert to authenticated
  with check (private.is_studio_member(studio_id));

create policy "clients: titolare o assegnato modifica" on public.clients
  for update to authenticated
  using (private.can_manage_client(id))
  with check (private.is_studio_member(studio_id));

create policy "clients: titolare elimina" on public.clients
  for delete to authenticated
  using (private.is_studio_owner(studio_id));

-- CLIENT_INVITES
drop policy if exists "invites: staff gestisce" on public.client_invites;

create policy "invites: staff legge" on public.client_invites
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "invites: crea su clienti gestiti" on public.client_invites
  for insert to authenticated
  with check (private.can_manage_client(client_id));

create policy "invites: modifica su clienti gestiti" on public.client_invites
  for update to authenticated
  using (private.can_manage_client(client_id))
  with check (private.can_manage_client(client_id));

create policy "invites: elimina su clienti gestiti" on public.client_invites
  for delete to authenticated
  using (private.can_manage_client(client_id));

-- CLIENT_FILES
drop policy if exists "files: staff gestisce" on public.client_files;

create policy "files: staff legge" on public.client_files
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "files: carica su clienti gestiti" on public.client_files
  for insert to authenticated
  with check (private.can_manage_client(client_id));

create policy "files: modifica su clienti gestiti" on public.client_files
  for update to authenticated
  using (private.can_manage_client(client_id))
  with check (private.can_manage_client(client_id));

create policy "files: elimina su clienti gestiti" on public.client_files
  for delete to authenticated
  using (private.can_manage_client(client_id));

-- TRACKING_ENTRIES (la policy del cliente resta invariata)
drop policy if exists "tracking: staff gestisce" on public.tracking_entries;

create policy "tracking: staff legge" on public.tracking_entries
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "tracking: inserisce su clienti gestiti" on public.tracking_entries
  for insert to authenticated
  with check (private.can_manage_client(client_id));

create policy "tracking: modifica su clienti gestiti" on public.tracking_entries
  for update to authenticated
  using (private.can_manage_client(client_id))
  with check (private.can_manage_client(client_id));

create policy "tracking: elimina su clienti gestiti" on public.tracking_entries
  for delete to authenticated
  using (private.can_manage_client(client_id));

-- METRICS: configurazione delle misure riservata al titolare
drop policy if exists "metrics: staff gestisce" on public.metrics;

create policy "metrics: staff legge" on public.metrics
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "metrics: titolare crea" on public.metrics
  for insert to authenticated
  with check (private.is_studio_owner(studio_id));

create policy "metrics: titolare modifica" on public.metrics
  for update to authenticated
  using (private.is_studio_owner(studio_id))
  with check (private.is_studio_owner(studio_id));

create policy "metrics: titolare elimina" on public.metrics
  for delete to authenticated
  using (private.is_studio_owner(studio_id));

-- STORAGE client-files: tutti i membri leggono, scrive solo chi gestisce il cliente
drop policy if exists "storage client-files: staff gestisce" on storage.objects;

create policy "storage client-files: staff legge" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] in (select id::text from private.my_studio_ids() as id)
  );

create policy "storage client-files: carica su clienti gestiti" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-files'
    and exists (
      select 1 from public.clients c
       where c.id::text        = (storage.foldername(name))[2]
         and c.studio_id::text = (storage.foldername(name))[1]
         and private.can_manage_client(c.id)
    )
  );

create policy "storage client-files: modifica su clienti gestiti" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'client-files'
    and exists (
      select 1 from public.clients c
       where c.id::text        = (storage.foldername(name))[2]
         and c.studio_id::text = (storage.foldername(name))[1]
         and private.can_manage_client(c.id)
    )
  );

create policy "storage client-files: elimina su clienti gestiti" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'client-files'
    and exists (
      select 1 from public.clients c
       where c.id::text        = (storage.foldername(name))[2]
         and c.studio_id::text = (storage.foldername(name))[1]
         and private.can_manage_client(c.id)
    )
  );

-- =====================================================================
-- 4. APPUNTAMENTI: da calendario unico a calendario per professionista
--    (sostituisce le policy della v2.0; la struttura della tabella non cambia)
-- =====================================================================
drop policy if exists "appointments: staff legge"    on public.appointments;
drop policy if exists "appointments: staff crea"     on public.appointments;
drop policy if exists "appointments: staff modifica" on public.appointments;
drop policy if exists "appointments: staff elimina"  on public.appointments;

-- Il collaboratore vede solo il proprio calendario; il titolare vede tutti i calendari
create policy "appointments: proprio calendario o titolare" on public.appointments
  for select to authenticated
  using (member_id = auth.uid() or private.is_studio_owner(studio_id));

-- Il collaboratore crea appuntamenti solo nel proprio calendario e solo con i propri clienti;
-- il titolare può crearli in qualsiasi calendario dello studio
create policy "appointments: crea" on public.appointments
  for insert to authenticated
  with check (
    private.is_studio_owner(studio_id)
    or (
      member_id = auth.uid()
      and private.is_studio_member(studio_id)
      and (client_id is null or private.can_manage_client(client_id))
    )
  );

create policy "appointments: modifica" on public.appointments
  for update to authenticated
  using (member_id = auth.uid() or private.is_studio_owner(studio_id))
  with check (
    private.is_studio_owner(studio_id)
    or (
      member_id = auth.uid()
      and (client_id is null or private.can_manage_client(client_id))
    )
  );

create policy "appointments: elimina" on public.appointments
  for delete to authenticated
  using (member_id = auth.uid() or private.is_studio_owner(studio_id));

-- =====================================================================
-- Migrazione v2.0 – Calendario appuntamenti
-- Da salvare in: supabase/migrations/20261012000000_calendario_appuntamenti.sql
-- Richiede la migrazione 20261011000000_schema_iniziale.sql (v1.0)
--
-- Con un solo professionista il calendario è unico per lo studio:
-- tutti i membri dello studio possono vedere e gestire gli appuntamenti.
-- La tabella è però già predisposta per la v3.0 (member_id = professionista
-- del calendario), così la 3.0 cambierà solo le policy, non la struttura.
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- =====================================================================
-- 1. TABELLA APPUNTAMENTI
-- =====================================================================
create table public.appointments (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references public.studios(id) on delete cascade,
  member_id   uuid not null,                                   -- professionista del calendario
  client_id   uuid references public.clients(id) on delete set null,  -- null = impegno personale
  title       text not null check (char_length(title) between 1 and 150),
  kind        text not null default 'follow_up'
              check (kind in ('first_visit', 'follow_up', 'online', 'other')),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      text not null default 'scheduled'
              check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes       text check (notes is null or char_length(notes) <= 2000),
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint appointments_member_fk
    foreign key (studio_id, member_id)
    references public.studio_members (studio_id, user_id)
    on delete cascade,
  constraint appointments_time_check check (ends_at > starts_at),
  -- Nessuna sovrapposizione nel calendario dello stesso professionista (CAL-04)
  constraint appointments_no_overlap
    exclude using gist (
      member_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status <> 'cancelled')
);

create index appointments_member_time_idx on public.appointments (member_id, starts_at);
create index appointments_client_idx on public.appointments (client_id);

create trigger appointments_updated_at before update on public.appointments
  for each row execute function private.set_updated_at();

-- =====================================================================
-- 2. COERENZA: il cliente dell'appuntamento deve appartenere allo stesso studio
-- =====================================================================
create or replace function private.validate_appointment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients
     where id = new.client_id and studio_id = new.studio_id
  ) then
    raise exception 'Il cliente non appartiene a questo studio';
  end if;
  return new;
end;
$$;

create trigger appointments_validate before insert or update on public.appointments
  for each row execute function private.validate_appointment();

-- =====================================================================
-- 3. RLS: calendario unico dello studio (verrà differenziato nella v3.0)
-- =====================================================================
alter table public.appointments enable row level security;

create policy "appointments: staff legge" on public.appointments
  for select to authenticated
  using (private.is_studio_member(studio_id));

create policy "appointments: staff crea" on public.appointments
  for insert to authenticated
  with check (private.is_studio_member(studio_id));

create policy "appointments: staff modifica" on public.appointments
  for update to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));

create policy "appointments: staff elimina" on public.appointments
  for delete to authenticated
  using (private.is_studio_member(studio_id));

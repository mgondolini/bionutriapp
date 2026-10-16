-- =====================================================================
-- Elenco clienti (A-01): data di nascita e vista con una riga per cliente
-- (stato calcolato, fase, ultimo file, ultima misura) letta con UNA query.
-- =====================================================================

-- Data di nascita (scheda A4, modalità "Con dati completi" e import CSV).
-- Il controllo "non nel futuro" è nello schema Zod: un check con current_date
-- non sarebbe immutabile.
alter table public.clients
  add column birth_date date check (birth_date is null or birth_date >= date '1900-01-01');

-- clients_with_status espande c.* alla creazione: va ricreata per includere la
-- nuova colonna (un "create or replace" non può inserire colonne in mezzo).
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
  li.expires_at      as last_invite_expires_at
from public.clients c
left join lateral (
  select i.id, i.created_at, i.sent_at, i.expires_at, i.used_at, i.revoked_at
    from public.client_invites i
   where i.client_id = c.id
   order by i.created_at desc
   limit 1
) li on true;

-- Indici per le subquery "ultimo file" e "ultima misura"
create index client_files_last_idx on public.client_files (client_id, uploaded_at desc);
create index tracking_entries_last_idx on public.tracking_entries (client_id, recorded_on desc);

-- Una riga per cliente con tutto ciò che serve all'elenco. security_invoker:
-- lo staff vede solo il proprio studio, la RLS delle tabelle sottostanti si applica.
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

revoke all on public.clients_with_status, public.client_list from anon;

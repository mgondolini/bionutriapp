-- =====================================================================
-- Note cliniche (scheda cliente dell'admin)
--
--   * client_notes: per ogni cliente una sola "Anamnesi" (indice unico
--     parziale) e le note di visita, una per data. Contenuto come documento
--     ProseMirror (jsonb) più il testo semplice calcolato dall'app.
--   * Solo lo staff dello studio: nessuna policy per il cliente, che non
--     legge nemmeno le righe del proprio profilo. Nella 1.0 c'è solo il
--     titolare (is_studio_member); private.can_manage_client arriverà con la
--     v3 dei collaboratori.
--   * Studio sempre dal cliente (set_studio_from_client), autore dell'ultima
--     modifica dalla sessione, updated_at a ogni modifica: il salvataggio
--     dell'app aggiorna solo se updated_at è quello caricato (concorrenza).
--   * L'anamnesi non si elimina, salvo con il cliente (cascata).
-- =====================================================================

create table public.client_notes (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studios(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  kind         text not null check (kind in ('anamnesis', 'visit')),
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  visit_date   date,
  content      jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_text text not null default '',
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint client_notes_visit_date check ((kind = 'visit') = (visit_date is not null)),
  constraint client_notes_content_doc check (
    jsonb_typeof(content) = 'object' and content->>'type' = 'doc'
  ),
  -- seconda barriera dopo Zod (200 KB): margine per la serializzazione
  constraint client_notes_content_size check (octet_length(content::text) <= 262144)
);
create unique index client_notes_one_anamnesis on public.client_notes (client_id)
  where kind = 'anamnesis';
create index client_notes_client_idx on public.client_notes (client_id, visit_date desc);

create trigger client_notes_studio before insert or update of client_id on public.client_notes
  for each row execute function private.set_studio_from_client();

-- Tipo e cliente non cambiano; autore e data dell'ultima modifica.
create or replace function private.prepare_client_note()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.client_id <> old.client_id or new.kind <> old.kind then
      raise exception 'Cliente e tipo di una nota non si modificano'
        using errcode = 'check_violation';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

create trigger client_notes_prepare before insert or update on public.client_notes
  for each row execute function private.prepare_client_note();

-- L'anamnesi resta: si elimina solo insieme al cliente (in cascata il
-- cliente non esiste più quando il trigger gira).
create or replace function private.guard_client_note_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.kind = 'anamnesis'
     and exists (select 1 from public.clients where id = old.client_id) then
    raise exception 'L''anamnesi non si elimina' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger client_notes_guard_delete before delete on public.client_notes
  for each row execute function private.guard_client_note_delete();

alter table public.client_notes enable row level security;
revoke all on public.client_notes from anon;
revoke truncate on public.client_notes from authenticated;

create policy "note cliniche: lo staff legge" on public.client_notes
  for select to authenticated using (private.is_studio_member(studio_id));
create policy "note cliniche: lo staff crea" on public.client_notes
  for insert to authenticated with check (private.is_studio_member(studio_id));
create policy "note cliniche: lo staff modifica" on public.client_notes
  for update to authenticated
  using (private.is_studio_member(studio_id)) with check (private.is_studio_member(studio_id));
create policy "note cliniche: lo staff elimina" on public.client_notes
  for delete to authenticated using (private.is_studio_member(studio_id));

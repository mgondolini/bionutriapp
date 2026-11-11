-- =====================================================================
-- Video (mockup v4: A13–A16, C4–C6, C14–C18)
--
-- Libreria di video YouTube dello studio, uguale per tutti i clienti (i
-- video non si assegnano al singolo cliente), divisa in cartelle con UN
-- livello di sottocartelle. Cartelle, sottocartelle e video hanno un ordine
-- scelto dallo staff (sort_order), riscritto in blocco dalle RPC di riordino.
--
--   * video_folders: parent_id nullo = cartella, altrimenti sottocartella di
--     una cartella dello stesso studio. Una sottocartella non contiene altre
--     cartelle (guard_video_folder). La visibilità in Onboarding si sceglie
--     sulla cartella e vale anche per le sue sottocartelle.
--   * videos: solo l'id YouTube (11 caratteri), titolo e nota; nessuna
--     durata (oEmbed non la fornisce). unavailable_at = YouTube non lo
--     riproduce più (controllo del cron di manutenzione).
--   * video_views: primo avvio di un video da parte di un cliente ("Aperto
--     da" dello staff, spunta e "Nuovo" del cliente). Si scrive solo con la
--     RPC record_video_view.
--   * Clienti: account attivo; in Onboarding solo le cartelle "anche in
--     Onboarding" (e le loro sottocartelle). Staff: tutto il proprio studio.
--   * Notifica "Nuovo video disponibile": tipo 'video' nel registro,
--     preferenza videos_enabled, destinatari dalla RPC video_notification_recipients.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cartelle e sottocartelle
-- ---------------------------------------------------------------------
create table public.video_folders (
  id                    uuid primary key default gen_random_uuid(),
  studio_id             uuid not null references public.studios(id) on delete cascade,
  parent_id             uuid references public.video_folders(id) on delete restrict,
  name                  text not null check (char_length(btrim(name)) between 1 and 40),
  description           text check (description is null or char_length(description) <= 200),
  visible_in_onboarding boolean not null default false,
  sort_order            int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index video_folders_order_idx on public.video_folders (studio_id, parent_id, sort_order);

create trigger video_folders_updated_at before update on public.video_folders
  for each row execute function private.set_updated_at();

create or replace function private.guard_video_folder()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_parent public.video_folders;
begin
  if tg_op = 'UPDATE' and new.studio_id <> old.studio_id then
    raise exception 'Una cartella non cambia studio';
  end if;

  if new.parent_id is not null then
    select * into v_parent from public.video_folders where id = new.parent_id;
    if v_parent.id is null or v_parent.studio_id <> new.studio_id then
      raise exception 'Cartella superiore non valida';
    end if;
    if v_parent.parent_id is not null then
      raise exception 'Le sottocartelle non contengono altre cartelle';
    end if;
    if tg_op = 'UPDATE' and exists (
      select 1 from public.video_folders where parent_id = new.id
    ) then
      raise exception 'Una cartella con sottocartelle non diventa una sottocartella';
    end if;
    -- la visibilità in Onboarding si sceglie solo sulla cartella
    new.visible_in_onboarding := false;
  end if;

  -- nuova cartella (o spostata) in fondo al suo livello
  if tg_op = 'INSERT' or new.parent_id is distinct from old.parent_id then
    select coalesce(max(sort_order), 0) + 1 into new.sort_order
      from public.video_folders
     where studio_id = new.studio_id and parent_id is not distinct from new.parent_id
       and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger video_folders_guard before insert or update on public.video_folders
  for each row execute function private.guard_video_folder();

-- ---------------------------------------------------------------------
-- Video
-- ---------------------------------------------------------------------
create table public.videos (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references public.studios(id) on delete cascade,
  folder_id      uuid not null references public.video_folders(id) on delete restrict,
  youtube_id     text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title          text not null check (char_length(btrim(title)) between 1 and 120),
  note           text check (note is null or char_length(note) <= 300),
  sort_order     int not null default 0,
  unavailable_at timestamptz,
  -- ultimo controllo del cron di manutenzione (a rotazione, i meno recenti prima)
  availability_checked_at timestamptz,
  created_by     uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (folder_id, youtube_id)
);
create index videos_order_idx on public.videos (folder_id, sort_order);
create index videos_studio_recent_idx on public.videos (studio_id, created_at desc);

create trigger videos_updated_at before update on public.videos
  for each row execute function private.set_updated_at();

create or replace function private.guard_video()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- lo studio viene sempre dalla cartella
  select studio_id into new.studio_id from public.video_folders where id = new.folder_id;
  if new.studio_id is null then
    raise exception 'Cartella non valida';
  end if;
  if tg_op = 'UPDATE' and new.studio_id <> old.studio_id then
    raise exception 'Un video non cambia studio';
  end if;
  -- nuovo video (o spostato) in cima alla cartella: i clienti vedono prima il più recente
  if tg_op = 'INSERT' or new.folder_id <> old.folder_id then
    select coalesce(min(sort_order), 1) - 1 into new.sort_order
      from public.videos where folder_id = new.folder_id and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger videos_guard before insert or update on public.videos
  for each row execute function private.guard_video();

-- ---------------------------------------------------------------------
-- Visualizzazioni (primo avvio)
-- ---------------------------------------------------------------------
create table public.video_views (
  video_id        uuid not null references public.videos(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  studio_id       uuid not null references public.studios(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  primary key (video_id, client_id)
);
create index video_views_client_idx on public.video_views (client_id);

-- ---------------------------------------------------------------------
-- Visibilità per il cliente della sessione
-- ---------------------------------------------------------------------
create or replace function private.client_sees_video_folder(p_folder uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.video_folders f
      left join public.video_folders p on p.id = f.parent_id
      join public.clients c on c.studio_id = f.studio_id
     where f.id = p_folder
       and c.user_id = (select private.session_uid())
       and c.account_status = 'active'
       and (c.journey_stage <> 'onboarding'
            or coalesce(p.visible_in_onboarding, f.visible_in_onboarding))
  );
$$;
revoke execute on function private.client_sees_video_folder(uuid) from public, anon;
grant execute on function private.client_sees_video_folder(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.video_folders enable row level security;
alter table public.videos enable row level security;
alter table public.video_views enable row level security;
revoke all on public.video_folders, public.videos, public.video_views from anon;
revoke insert, update, delete, truncate on public.video_views from authenticated;

create policy "video_folders: staff gestisce" on public.video_folders
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));
create policy "video_folders: cliente legge le visibili" on public.video_folders
  for select to authenticated
  using (private.client_sees_video_folder(id));

create policy "videos: staff gestisce" on public.videos
  for all to authenticated
  using (private.is_studio_member(studio_id))
  with check (private.is_studio_member(studio_id));
create policy "videos: cliente legge quelli delle cartelle visibili" on public.videos
  for select to authenticated
  using (private.client_sees_video_folder(folder_id));

create policy "video_views: staff legge" on public.video_views
  for select to authenticated
  using (private.is_studio_member(studio_id));
create policy "video_views: cliente legge le proprie" on public.video_views
  for select to authenticated
  using (client_id = private.my_client_id());

-- ---------------------------------------------------------------------
-- Primo avvio di un video (cliente della sessione)
-- ---------------------------------------------------------------------
create or replace function public.record_video_view(p_video uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_client uuid := (select private.my_client_id());
  v_video public.videos;
begin
  if v_client is null then
    raise exception 'Utente non autenticato';
  end if;
  select * into v_video from public.videos where id = p_video;
  if v_video.id is null or not private.client_sees_video_folder(v_video.folder_id) then
    raise exception 'Video non disponibile';
  end if;
  insert into public.video_views (video_id, client_id, studio_id)
  values (v_video.id, v_client, v_video.studio_id)
  on conflict (video_id, client_id) do nothing;
end;
$$;
revoke execute on function public.record_video_view(uuid) from public, anon;
grant execute on function public.record_video_view(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Riordino (staff, security invoker: vale la RLS). Riscrive l'ordine di
-- TUTTI gli elementi di un livello; se l'elenco inviato non coincide con
-- quello del database (modifica nel frattempo) non cambia nulla.
-- ---------------------------------------------------------------------
create or replace function public.reorder_video_folders(p_parent uuid, p_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_studio uuid;
begin
  select studio_id into v_studio from public.video_folders where id = p_ids[1];
  if v_studio is null or not private.is_studio_member(v_studio) then
    raise exception 'Cartella non valida';
  end if;
  if cardinality(p_ids) <> (select count(*) from public.video_folders
                              where studio_id = v_studio and parent_id is not distinct from p_parent)
     or (select count(distinct id) from public.video_folders
          where id = any(p_ids) and studio_id = v_studio
            and parent_id is not distinct from p_parent) <> cardinality(p_ids) then
    raise exception 'L''elenco delle cartelle è cambiato' using errcode = 'P0002';
  end if;
  update public.video_folders f
     set sort_order = t.ord
    from unnest(p_ids) with ordinality as t(id, ord)
   where f.id = t.id;
end;
$$;
revoke execute on function public.reorder_video_folders(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_video_folders(uuid, uuid[]) to authenticated;

create or replace function public.reorder_videos(p_folder uuid, p_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if cardinality(p_ids) <> (select count(*) from public.videos where folder_id = p_folder)
     or (select count(distinct id) from public.videos
          where id = any(p_ids) and folder_id = p_folder) <> cardinality(p_ids) then
    raise exception 'L''elenco dei video è cambiato' using errcode = 'P0002';
  end if;
  update public.videos v
     set sort_order = t.ord
    from unnest(p_ids) with ordinality as t(id, ord)
   where v.id = t.id;
end;
$$;
revoke execute on function public.reorder_videos(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_videos(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Notifica "Nuovo video disponibile"
-- ---------------------------------------------------------------------
alter table public.notification_log drop constraint notification_log_type_check;
alter table public.notification_log add constraint notification_log_type_check
  check (type in ('file_diet', 'file_workout', 'file_report', 'daily_checkin', 'video'));

alter table public.notification_preferences
  add column videos_enabled boolean not null default true;

/*
 * Clienti che vedono la cartella del video (account attivo; in Onboarding
 * solo se la cartella è visibile anche in Onboarding), con almeno un
 * dispositivo e senza la preferenza "Nuovi video" spenta. Solo service_role.
 */
create or replace function public.video_notification_recipients(p_video uuid)
returns table (client_id uuid, user_id uuid)
language sql stable security definer set search_path = '' as $$
  select c.id, c.user_id
    from public.videos v
    join public.video_folders f on f.id = v.folder_id
    left join public.video_folders p on p.id = f.parent_id
    join public.clients c on c.studio_id = v.studio_id
   where v.id = p_video
     and c.account_status = 'active'
     and c.user_id is not null
     and (c.journey_stage <> 'onboarding'
          or coalesce(p.visible_in_onboarding, f.visible_in_onboarding))
     and exists (select 1 from public.push_subscriptions s where s.user_id = c.user_id)
     and coalesce((select np.videos_enabled from public.notification_preferences np
                    where np.user_id = c.user_id), true);
$$;
revoke execute on function public.video_notification_recipients(uuid) from public, anon, authenticated;
grant execute on function public.video_notification_recipients(uuid) to service_role;

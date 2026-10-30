-- =====================================================================
-- Fase 10: registrazioni del nutrizionista e autore (A-15, A-16, T-03)
--   * tracking_entries registra chi ha inserito la registrazione e chi
--     l'ha modificata per ultimo, con il ruolo (cliente o staff);
--   * il cliente modifica ed elimina solo le registrazioni inserite da lui;
--   * il check-in non sovrascrive i voti inseriti dal nutrizionista.
-- Lo staff scrive già in ogni fase (policy "tracking: staff gestisce").
-- =====================================================================

-- Le registrazioni presenti finora le hanno inserite tutte i clienti (lo staff
-- non aveva un modo per farlo): il default 'client' le marca senza un UPDATE,
-- che rieseguirebbe i trigger di validazione su dati storici. updated_by resta
-- nullo per le righe esistenti: l'ultimo autore noto è il ruolo.
alter table public.tracking_entries
  add column created_by_role text not null default 'client'
    check (created_by_role in ('client', 'staff')),
  add column updated_by uuid references auth.users(id) on delete set null,
  add column updated_by_role text not null default 'client'
    check (updated_by_role in ('client', 'staff'));

-- Autore dalla sessione: i valori inviati dal browser vengono sempre ignorati.
-- Con auth.uid() nullo (operazione lato server: seed, script) restano quelli
-- inviati, come per gli altri campi protetti.
create or replace function private.validate_tracking_entry()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_studio uuid;
  v_uid uuid := (select auth.uid());
  v_role text;
  m public.metrics%rowtype;
begin
  select studio_id into v_studio from public.clients where id = new.client_id;
  if v_studio is null then
    raise exception 'Cliente non trovato';
  end if;

  select * into m from public.metrics where id = new.metric_id;
  if m.id is null or m.studio_id <> v_studio or not m.is_active then
    raise exception 'Misura non valida per questo cliente';
  end if;

  if new.value < m.min_value or new.value > m.max_value then
    raise exception 'Il valore deve essere compreso tra % e %', m.min_value, m.max_value
      using errcode = 'check_violation';
  end if;
  if m.value_type in ('score_1_5', 'score_1_10') and new.value <> trunc(new.value) then
    raise exception 'Il voto deve essere un numero intero' using errcode = 'check_violation';
  end if;
  if new.recorded_on > private.today_rome() then
    raise exception 'La data non può essere nel futuro' using errcode = 'check_violation';
  end if;
  new.note := nullif(trim(new.note), '');
  if new.note is not null and m.frequency <> 'per_session' then
    raise exception 'La nota è prevista solo per gli allenamenti' using errcode = 'check_violation';
  end if;

  new.is_daily  := m.frequency = 'daily';
  new.studio_id := v_studio;

  if v_uid is not null then
    v_role := case
      when exists (
        select 1 from public.studio_members
         where studio_id = v_studio and user_id = v_uid
      ) then 'staff'
      else 'client'
    end;
    new.updated_by := v_uid;
    new.updated_by_role := v_role;
    if tg_op = 'INSERT' then
      new.created_by := v_uid;
      new.created_by_role := v_role;
    end if;
  elsif tg_op = 'INSERT' then
    new.updated_by := coalesce(new.updated_by, new.created_by);
    new.updated_by_role := coalesce(new.updated_by_role, new.created_by_role);
  end if;

  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_by_role := old.created_by_role;
  end if;
  return new;
end;
$$;

-- Il cliente (In percorso) modifica ed elimina solo ciò che ha inserito lui (T-03)
drop policy "tracking: cliente modifica le proprie" on public.tracking_entries;
create policy "tracking: cliente modifica le proprie" on public.tracking_entries
  for update to authenticated
  using (
    client_id = private.my_client_id() and private.my_client_can_track()
    and created_by_role = 'client'
  )
  with check (
    client_id = private.my_client_id() and private.my_client_can_track()
    and created_by_role = 'client'
  );

drop policy "tracking: cliente elimina le proprie" on public.tracking_entries;
create policy "tracking: cliente elimina le proprie" on public.tracking_entries
  for delete to authenticated
  using (
    client_id = private.my_client_id() and private.my_client_can_track()
    and created_by_role = 'client'
  );

-- Check-in: un voto del giorno inserito dal nutrizionista non si sovrascrive.
-- Le chiavi corrispondenti vengono saltate (l'interfaccia le mostra bloccate):
-- l'ON CONFLICT DO UPDATE fallirebbe sulla policy di update del cliente.
create or replace function public.save_daily_checkin(
  p_client_id uuid, p_recorded_on date, p_values jsonb
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_studio uuid;
  v_today date := private.today_rome();
  v_count int;
begin
  if p_values is null or jsonb_typeof(p_values) <> 'object' or p_values = '{}'::jsonb then
    raise exception 'Il check-in deve contenere almeno un voto' using errcode = 'check_violation';
  end if;
  -- solo oggi o ieri, nel fuso di Roma
  if p_recorded_on is null or p_recorded_on not in (v_today, v_today - 1) then
    raise exception 'Il check-in si compila solo per oggi o per ieri' using errcode = 'check_violation';
  end if;

  select studio_id into v_studio from public.clients where id = p_client_id;
  if v_studio is null then
    raise exception 'Cliente non trovato' using errcode = 'no_data_found';
  end if;

  -- ogni chiave deve essere un'abitudine giornaliera attiva dello studio
  select count(*) into v_count
    from jsonb_object_keys(p_values) as k(key)
    left join public.metrics m
      on m.studio_id = v_studio and m.key = k.key and m.frequency = 'daily' and m.is_active
   where m.id is null;
  if v_count > 0 then
    raise exception 'Il check-in accetta solo le abitudini giornaliere' using errcode = 'check_violation';
  end if;

  insert into public.tracking_entries (client_id, metric_id, value, recorded_on)
  select p_client_id, m.id, (v.value #>> '{}')::numeric, p_recorded_on
    from jsonb_each(p_values) as v(key, value)
    join public.metrics m on m.studio_id = v_studio and m.key = v.key
   where not exists (
     select 1 from public.tracking_entries t
      where t.client_id = p_client_id and t.metric_id = m.id
        and t.recorded_on = p_recorded_on and t.is_daily
        and t.created_by_role = 'staff'
   )
  on conflict (client_id, metric_id, recorded_on) where is_daily
  do update set value = excluded.value;
end;
$$;

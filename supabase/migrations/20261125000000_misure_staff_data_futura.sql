-- Peso e circonferenze inseriti dallo staff: data anche futura (per esempio il
-- giorno del check), fino a un anno da oggi (STAFF_MEASURE_MAX_DAYS_AHEAD).
-- Il cliente, le abitudini, gli allenamenti e le operazioni lato server
-- (auth.uid() nullo) restano a "non futura". Il ruolo si ricava prima del
-- controllo della data; il resto di validate_tracking_entry è invariato
-- (20261030000000_tracking_autore.sql).

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

  if v_uid is not null then
    v_role := case
      when exists (
        select 1 from public.studio_members
         where studio_id = v_studio and user_id = v_uid
      ) then 'staff'
      else 'client'
    end;
  end if;

  if new.value < m.min_value or new.value > m.max_value then
    raise exception 'Il valore deve essere compreso tra % e %', m.min_value, m.max_value
      using errcode = 'check_violation';
  end if;
  if m.value_type in ('score_1_5', 'score_1_10') and new.value <> trunc(new.value) then
    raise exception 'Il voto deve essere un numero intero' using errcode = 'check_violation';
  end if;
  if v_role = 'staff' and m.frequency = 'monthly_30d' then
    if new.recorded_on > private.today_rome() + 365 then
      raise exception 'La data può essere al massimo tra un anno' using errcode = 'check_violation';
    end if;
  elsif new.recorded_on > private.today_rome() then
    raise exception 'La data non può essere nel futuro' using errcode = 'check_violation';
  end if;
  new.note := nullif(trim(new.note), '');
  if new.note is not null and m.frequency <> 'per_session' then
    raise exception 'La nota è prevista solo per gli allenamenti' using errcode = 'check_violation';
  end if;

  new.is_daily  := m.frequency = 'daily';
  new.studio_id := v_studio;

  if v_uid is not null then
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

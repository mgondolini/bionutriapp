-- =====================================================================
-- Percorso: la cancellazione a cascata (cliente eliminato, anche con
-- `pnpm client:delete`) elimina il percorso prima delle sue sessioni; il
-- trigger delle sessioni non deve più cercare il percorso in quel caso.
-- =====================================================================
create or replace function private.prepare_journey_session()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_journey public.client_journeys%rowtype;
begin
  select * into v_journey from public.client_journeys
   where id = coalesce(new.journey_id, old.journey_id);

  if tg_op = 'DELETE' then
    -- percorso già eliminato: cancellazione a cascata, nulla da controllare
    if v_journey.id is not null and v_journey.status = 'concluded'
       and (select auth.uid()) is not null then
      raise exception 'Un percorso concluso è in sola lettura'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if v_journey.id is null then
    raise exception 'Percorso non trovato';
  end if;
  if v_journey.status = 'concluded' and (select auth.uid()) is not null then
    raise exception 'Un percorso concluso è in sola lettura'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and new.journey_id <> old.journey_id then
    raise exception 'Una sessione non cambia percorso' using errcode = 'check_violation';
  end if;
  new.studio_id := v_journey.studio_id;
  new.client_id := v_journey.client_id;
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

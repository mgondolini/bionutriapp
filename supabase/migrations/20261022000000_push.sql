-- =====================================================================
-- Fase 8: notifiche push
--
--   * clients.push_enabled = "il cliente ha almeno un dispositivo con le
--     push attive": lo scrive SOLO il trigger su push_subscriptions, così lo
--     stato che vede lo staff (A-06) non dipende da ciò che invia il browser.
--   * guard_client: il cliente non modifica più push_enabled; nemmeno lo
--     staff. Unica eccezione l'aggiornamento che arriva da un altro trigger
--     (pg_trigger_depth() > 1), cioè da private.sync_push_enabled.
-- =====================================================================

-- ---------------------------------------------------------------------
-- push_enabled segue le sottoscrizioni
-- ---------------------------------------------------------------------
create or replace function private.refresh_push_enabled(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.clients c
     set push_enabled = s.has_device
    from (select exists (
            select 1 from public.push_subscriptions where user_id = p_user
          ) as has_device) s
   where c.user_id = p_user
     and c.push_enabled is distinct from s.has_device;
$$;
revoke execute on function private.refresh_push_enabled(uuid) from public;

create or replace function private.sync_push_enabled()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.refresh_push_enabled(new.user_id);
  end if;
  -- un endpoint riassegnato a un altro utente (stesso browser) o eliminato
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.user_id <> new.user_id) then
    perform private.refresh_push_enabled(old.user_id);
  end if;
  return null;
end;
$$;

create trigger push_subscriptions_sync_enabled
  after insert or delete or update of user_id on public.push_subscriptions
  for each row execute function private.sync_push_enabled();

-- Allineamento dei dati esistenti
update public.clients c
   set push_enabled = exists (
         select 1 from public.push_subscriptions s where s.user_id = c.user_id
       )
 where c.push_enabled is distinct from exists (
         select 1 from public.push_subscriptions s where s.user_id = c.user_id
       );

-- ---------------------------------------------------------------------
-- Campi protetti: push_enabled fuori dalle modifiche manuali
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
      new.push_enabled := false;
    end if;
    return new;
  end if;

  if new.studio_id <> old.studio_id then
    raise exception 'Non è possibile spostare un cliente in un altro studio';
  end if;

  if (select auth.uid()) is null then
    return new;
  end if;

  -- push_enabled lo scrive solo private.sync_push_enabled (trigger annidato)
  if new.push_enabled is distinct from old.push_enabled and pg_trigger_depth() <= 1 then
    raise exception 'Lo stato delle notifiche segue i dispositivi registrati';
  end if;

  -- Staff: tutto tranne il collegamento all'account e il consenso
  if private.is_studio_member(old.studio_id) then
    if new.user_id is distinct from old.user_id or new.activated_at is distinct from old.activated_at
       or new.privacy_consent_at is distinct from old.privacy_consent_at then
      raise exception 'Il collegamento all''account non si modifica manualmente';
    end if;
    return new;
  end if;

  -- Cliente su sé stesso: solo nome, cognome e data di nascita. L'email segue
  -- Auth (sync_client_email), il cellulare lo cambia solo lo studio,
  -- push_enabled i dispositivi registrati.
  if private.changed_outside(to_jsonb(old), to_jsonb(new),
       array['first_name', 'last_name', 'birth_date', 'push_enabled', 'updated_at']) then
    raise exception 'Puoi modificare solo nome, cognome e data di nascita';
  end if;
  return new;
end;
$$;

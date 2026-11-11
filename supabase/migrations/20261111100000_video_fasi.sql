-- =====================================================================
-- Video e fasi del percorso
--
-- La libreria completa è per i clienti In percorso. In pausa e Concluso
-- restano visibili solo i video caricati fino al momento dell'uscita dal
-- percorso (l'ultimo cambio di fase da 'in_progress'): quelli caricati dopo
-- compaiono solo se il cliente torna In percorso. Onboarding invariato
-- (solo le cartelle "anche in Onboarding").
--
-- La notifica "Nuovo video disponibile" va quindi solo a chi lo vede subito:
-- In percorso, e in Onboarding se la cartella è visibile anche in Onboarding.
-- =====================================================================

/*
 * Il cliente della sessione vede un video della cartella p_folder caricato
 * in p_created_at? Le cartelle restano visibili con client_sees_video_folder:
 * l'app non mostra quelle senza video.
 */
create or replace function private.client_sees_video(p_folder uuid, p_created_at timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.video_folders f
      left join public.video_folders p on p.id = f.parent_id
      join public.clients c on c.studio_id = f.studio_id
     where f.id = p_folder
       and c.user_id = (select private.session_uid())
       and c.account_status = 'active'
       and case c.journey_stage
             when 'in_progress' then true
             when 'onboarding' then coalesce(p.visible_in_onboarding, f.visible_in_onboarding)
             -- In pausa e Concluso: fino all'uscita dal percorso (da pausa a
             -- concluso il limite resta quello della pausa). Senza storico,
             -- l'ingresso nella fase attuale.
             else p_created_at <= coalesce(
               (select max(e.changed_at) from public.client_stage_events e
                 where e.client_id = c.id and e.from_stage = 'in_progress'),
               (select max(e.changed_at) from public.client_stage_events e
                 where e.client_id = c.id and e.to_stage = c.journey_stage),
               '-infinity'::timestamptz)
           end
  );
$$;
revoke execute on function private.client_sees_video(uuid, timestamptz) from public, anon;
grant execute on function private.client_sees_video(uuid, timestamptz) to authenticated, service_role;

drop policy "videos: cliente legge quelli delle cartelle visibili" on public.videos;
create policy "videos: cliente legge quelli visibili per la sua fase" on public.videos
  for select to authenticated
  using (private.client_sees_video(folder_id, created_at));

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
  if v_video.id is null
     or not private.client_sees_video(v_video.folder_id, v_video.created_at) then
    raise exception 'Video non disponibile';
  end if;
  insert into public.video_views (video_id, client_id, studio_id)
  values (v_video.id, v_client, v_video.studio_id)
  on conflict (video_id, client_id) do nothing;
end;
$$;

/*
 * Destinatari della notifica: In percorso, o in Onboarding se la cartella è
 * visibile anche in Onboarding (In pausa e Concluso non vedono i nuovi video).
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
     and (c.journey_stage = 'in_progress'
          or (c.journey_stage = 'onboarding'
              and coalesce(p.visible_in_onboarding, f.visible_in_onboarding)))
     and exists (select 1 from public.push_subscriptions s where s.user_id = c.user_id)
     and coalesce((select np.videos_enabled from public.notification_preferences np
                    where np.user_id = c.user_id), true);
$$;
revoke execute on function public.video_notification_recipients(uuid) from public, anon, authenticated;
grant execute on function public.video_notification_recipients(uuid) to service_role;

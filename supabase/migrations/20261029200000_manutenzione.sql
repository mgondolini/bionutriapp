-- =====================================================================
-- Manutenzione giornaliera (fase 9), chiamata da /api/cron/manutenzione con
-- la secret key. Funzioni eseguibili solo dal ruolo service_role.
--   * list_orphan_client_files: oggetti di client-files senza riga in
--     client_files (caricamenti mai confermati, fase 5, o eliminazioni a
--     metà). Si eliminano con l'API di Storage, non con un DELETE sulla tabella.
--   * purge_expired_invites: inviti scaduti da più di N giorni (usati,
--     revocati o mai usati). Lo stato "Invito scaduto" resta corretto anche
--     senza la riga (clients_with_status).
-- =====================================================================

create or replace function public.list_orphan_client_files(p_older_than_hours int default 24, p_limit int default 500)
returns setof text language sql stable security definer set search_path = '' as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'client-files'
     and o.created_at < now() - make_interval(hours => greatest(p_older_than_hours, 1))
     and not exists (select 1 from public.client_files f where f.storage_path = o.name)
   order by o.created_at
   limit least(greatest(p_limit, 1), 1000);
$$;
revoke execute on function public.list_orphan_client_files(int, int) from public, anon, authenticated;
grant execute on function public.list_orphan_client_files(int, int) to service_role;

create or replace function public.purge_expired_invites(p_older_than_days int default 90)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  delete from public.client_invites
   where expires_at < now() - make_interval(days => greatest(p_older_than_days, 1));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.purge_expired_invites(int) from public, anon, authenticated;
grant execute on function public.purge_expired_invites(int) to service_role;

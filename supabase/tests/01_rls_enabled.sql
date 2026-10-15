-- RLS attiva su ogni tabella (NF-01), nessuna tabella senza policy,
-- nessun accesso diretto per anon, file futuri non applicati.
begin;
select plan(8);

select is_empty(
  $$ select c.relname::text
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'ogni tabella dello schema public ha la RLS attiva'
);

select is_empty(
  $$ select c.relname::text
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
        and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) $$,
  'ogni tabella dello schema public ha almeno una policy'
);

select tables_are('public', array[
  'studios', 'studio_members', 'clients', 'client_stage_events', 'client_invites',
  'client_files', 'metrics', 'client_metric_goals', 'tracking_entries', 'push_subscriptions'
], 'lo schema public contiene esattamente le tabelle della v1.0');

select is_empty(
  $$ select table_name::text from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public' $$,
  'il ruolo anon non ha privilegi sulle tabelle e viste di public'
);

select is(
  (select reloptions from pg_class where oid = 'public.clients_with_status'::regclass),
  array['security_invoker=true'],
  'la vista clients_with_status rispetta la RLS di chi la interroga'
);

-- I file in supabase/future non devono essere applicati
select hasnt_table('public', 'appointments', 'appuntamenti (v2.0) non applicati');
select hasnt_column('public', 'clients', 'assigned_to', 'assegnazioni (v3.0) non applicate');

select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'studio_members_role_check'),
  'CHECK ((role = ''owner''::text))',
  'nella v1.0 esiste solo il ruolo owner'
);

select * from finish();
rollback;

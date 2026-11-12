-- File dei clienti senza il limite di 10 MB: resta solo quello globale del
-- progetto Supabase (Storage → Settings → "Upload file size limit"; 50 MB sul
-- piano gratuito). Solo PDF, privato e non vuoto come prima.

update storage.buckets
   set file_size_limit = null
 where id = 'client-files';

alter table public.client_files
  drop constraint client_files_size_bytes_check;

alter table public.client_files
  add constraint client_files_size_bytes_check check (size_bytes >= 1);

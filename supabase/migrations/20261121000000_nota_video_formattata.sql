-- =====================================================================
-- Nota dei video formattata (canvas "Nota video con editor": A14, C15, C16)
--
-- La "Nota per i clienti" di un video passa da testo semplice (300
-- caratteri) a nota formattata con lo stesso editor delle note cliniche,
-- più il link. Stesso formato delle note cliniche (client_notes.content /
-- content_text): il JSON di ProseMirror, ricostruito dal server con i soli
-- nodi e segni ammessi (sanitizeNoteDoc con i link: solo https, http,
-- mailto), e il testo semplice.
--
--   * note_doc  jsonb: documento dell'editor (null = nessuna nota)
--   * note_text text:  testo semplice, per l'anteprima e i controlli
--
-- Il limite di 1000 caratteri vale sul testo visibile e lo controlla il
-- server (VIDEO_NOTE_MAX); qui restano limiti tecnici più larghi. Le note
-- già scritte diventano un paragrafo per riga: il testo resta testo (il
-- JSON non interpreta HTML e l'app lo mostra senza HTML grezzo).
-- RLS invariata: scrive lo staff dello studio, leggono i clienti attivi
-- delle cartelle visibili.
-- =====================================================================

alter table public.videos
  add column note_doc jsonb,
  add column note_text text;

update public.videos v
   set note_text = v.note,
       note_doc = jsonb_build_object(
         'type', 'doc',
         'content', (
           select jsonb_agg(
                    case when btrim(line) = ''
                         then jsonb_build_object('type', 'paragraph')
                         else jsonb_build_object(
                                'type', 'paragraph',
                                'content', jsonb_build_array(
                                  jsonb_build_object('type', 'text', 'text', line)))
                    end
                    order by n)
             from regexp_split_to_table(replace(v.note, E'\r\n', E'\n'), E'\n')
                  with ordinality as l(line, n)
         ))
 where v.note is not null and btrim(v.note) <> '';

alter table public.videos drop column note;

alter table public.videos
  add constraint videos_note_pair check ((note_doc is null) = (note_text is null)),
  add constraint videos_note_doc_shape check (
    note_doc is null
    or (note_doc ->> 'type' = 'doc' and jsonb_typeof(note_doc -> 'content') = 'array')
  ),
  add constraint videos_note_doc_size check (
    note_doc is null or octet_length(note_doc::text) <= 131072
  ),
  add constraint videos_note_text_length check (
    note_text is null or char_length(note_text) <= 3000
  );

-- Nome del professionista per "Nota del Dott. …" sotto il video (C16): il
-- cliente non legge studio_members, quindi una funzione che restituisce solo
-- titolo e nome del titolare del proprio studio.
create or replace function public.my_studio_staff_name()
returns table (title text, first_name text, last_name text)
language sql stable security definer set search_path = '' as $$
  select m.title, m.first_name, m.last_name
    from public.studio_members m
   where m.studio_id = private.my_client_studio_id()
     and m.role = 'owner'
   order by m.created_at
   limit 1;
$$;
revoke execute on function public.my_studio_staff_name() from public, anon;
grant execute on function public.my_studio_staff_name() to authenticated;

-- Mantem o bucket de apresentacoes restrito a PDFs de ate 250 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 262144000, array['application/pdf']::text[])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Leitura publica de apresentacoes" on storage.objects;
drop policy if exists "Leitura administrativa de apresentacoes" on storage.objects;
create policy "Leitura administrativa de apresentacoes"
on storage.objects for select
to authenticated
using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = 'apresentacoes' and public.is_admin());

drop policy if exists "Envio autenticado de apresentacoes" on storage.objects;
create policy "Envio autenticado de apresentacoes"
on storage.objects for insert
to authenticated
with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = 'apresentacoes' and public.is_admin());

drop policy if exists "Atualizacao autenticada de apresentacoes" on storage.objects;
create policy "Atualizacao autenticada de apresentacoes"
on storage.objects for update
to authenticated
using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = 'apresentacoes' and public.is_admin())
with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = 'apresentacoes' and public.is_admin());

drop policy if exists "Exclusao autenticada de apresentacoes" on storage.objects;
create policy "Exclusao autenticada de apresentacoes"
on storage.objects for delete
to authenticated
using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = 'apresentacoes' and public.is_admin());

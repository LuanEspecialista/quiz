-- Uma apresentação pode utilizar PDF privado, link externo ou ambos.
-- Remove apenas a restrição legada; os arquivos e endereços existentes são preservados.
alter table if exists public.apresentacoes
  alter column pdf_url drop not null;

comment on column public.apresentacoes.pdf_url is
  'URL temporária ou legada do PDF. Opcional quando a apresentação utiliza link externo.';

notify pgrst, 'reload schema';

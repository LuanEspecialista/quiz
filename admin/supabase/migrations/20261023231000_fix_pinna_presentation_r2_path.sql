-- Corrige somente a referência da apresentação do Pinna.
-- O arquivo real no R2 é "Apresentação Pinna Studios.pdf" (sem "(1)").
update public.apresentacoes
set pdf_url='https://luan-especialista.pro/api/media?key=empreendimentos%2Fpinna-studios%2FApresenta%C3%A7%C3%A3o%20Pinna%20Studios.pdf',
    storage_path='r2://empreendimentos/pinna-studios/Apresentação Pinna Studios.pdf',
    tipo_preferido='pdf', ativo=true, updated_at=now()
where id in (
  select id from public.apresentacoes
  where empreendimento_id='pinna'
  order by updated_at desc
  limit 1
);

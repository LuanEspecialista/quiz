-- Ayra Slim Residence: saldo de 65% é financiamento bancário, não pós-chaves.
-- O empreendimento usa CUB até as chaves e não possui IPCA nem parcelas pós-chaves.
begin;
update public.unidades
set fluxo_dados=(coalesce(fluxo_dados,'{}'::jsonb)-'indice_pos_chaves'-'percentual_pos_chaves' || jsonb_build_object(
  'modalidade','financiamento',
  'destino_saldo','financiamento bancário',
  'tem_pos_chaves',false,
  'percentual_ate_chaves',35,
  'percentual_financiamento',65,
  'indice_pre_chaves','CUB'
)),updated_at=now()
where empreendimento_id='82a2c7ea-b681-4b6c-a313-a5c0138ab20e'
  and observacoes like 'Fonte: TXT Ayra atualizado em 22/10/2026.%';
commit;

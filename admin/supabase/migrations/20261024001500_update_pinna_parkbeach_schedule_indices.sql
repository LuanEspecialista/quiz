-- Atualiza cronograma e premissas comerciais informadas em 23/10/2026.
-- O CUB-base é a referência nominal da tabela de outubro/2026; a cotação vigente
-- será consultada pelo portal na fonte oficial do Sinduscon e nunca substitui o contrato.
begin;

update public.empreendimentos
set entrega='Set/2031',
    entrega_date='2031-09-30',
    previsao_entrega='2031-09-30',
    data_entrega='set/31',
    data_entrega_chaves='2031-09-30',
    regras_correcao=coalesce(regras_correcao,'{}'::jsonb) || jsonb_build_object(
      'indice_pre_chaves','CUB',
      'indice_pos_chaves','IPCA',
      'juros_pos_chaves_am',0.99,
      'cub_base_valor',3171.96,
      'cub_base_competencia','2026-10',
      'correcao_dinamica',true
    ),
    caracteristicas=jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(caracteristicas,'{}'::jsonb), '{fluxo_comercial,inicio_obras}', '"2027-09-01"'::jsonb, true),
        '{fluxo_comercial,indice_pre_chaves}', '"CUB"'::jsonb, true
      ),
      '{fluxo_comercial,juros_pos_chaves}', '0.99'::jsonb, true
    ),
    observacoes='Entrega prevista para setembro de 2031. Início das obras previsto para setembro de 2027. Fluxo nominal sujeito à atualização pelo CUB até as chaves e IPCA + 0,99% a.m. após as chaves, conforme contrato.'
where id='pinna';

update public.empreendimentos
set entrega='Set/2030',
    entrega_date='2030-09-30',
    previsao_entrega='2030-09-30',
    data_entrega='2030-09',
    data_entrega_chaves='2030-09-30',
    regras_correcao=coalesce(regras_correcao,'{}'::jsonb) || jsonb_build_object(
      'indice_pre_chaves','CUB',
      'indice_pos_chaves','IPCA',
      'juros_pos_chaves_am',0.89,
      'cub_base_valor',3171.96,
      'cub_base_competencia','2026-10',
      'correcao_dinamica',true
    ),
    caracteristicas=jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(caracteristicas,'{}'::jsonb), '{fluxo_comercial,indice_pre_chaves}', '"CUB"'::jsonb, true),
        '{fluxo_comercial,juros_pos_chaves}', '0.89'::jsonb, true
      ),
      '{fluxo_comercial,entrega}', '"Set/2030"'::jsonb, true
    ),
    observacoes='Entrega prevista para setembro de 2030. Fluxo nominal sujeito à atualização pelo CUB até as chaves e IPCA + 0,89% a.m. após as chaves, conforme contrato.'
where id='e2a740fe-b088-4cd4-b969-65f08875bdae';

update public.unidades
set data_entrega='2031-09-30', data_entrega_unidade='2031-09-30',
    fluxo_dados=coalesce(fluxo_dados,'{}'::jsonb) || jsonb_build_object(
      'entrega','2031-09', 'inicio_obras','2027-09', 'indice_pre_chaves','CUB',
      'indice_pos_chaves','IPCA', 'juros_pos_chaves_am',0.99,
      'cub_base_valor',3171.96, 'cub_base_competencia','2026-10', 'correcao_dinamica',true
    ), updated_at=now()
where empreendimento_id='pinna';

update public.unidades
set data_entrega='2030-09-30', data_entrega_unidade='2030-09-30',
    fluxo_dados=coalesce(fluxo_dados,'{}'::jsonb) || jsonb_build_object(
      'entrega','2030-09', 'indice_pre_chaves','CUB', 'indice_pos_chaves','IPCA',
      'juros_pos_chaves_am',0.89, 'cub_base_valor',3171.96,
      'cub_base_competencia','2026-10', 'correcao_dinamica',true
    ), updated_at=now()
where empreendimento_id='e2a740fe-b088-4cd4-b969-65f08875bdae';

commit;

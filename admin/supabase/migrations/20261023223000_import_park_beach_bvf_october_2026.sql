-- Park Beach, BVF Incorporadora — tabela TABELA_100X_PRE-LANÇAMENTO, 2026-10.
-- Fonte: ParkBeachPre-LaunchTableData.pdf fornecido pelo usuário.
-- Escopo: 37 unidades disponíveis na tabela recebida. Não infere datas de vencimento,
-- índice de correção, juros ou financiamento; apenas registra os valores nominais informados.
begin;

-- O empreendimento já existe no catálogo; a carga abaixo é vinculada por ID estável.
update public.empreendimentos
set nome='Park Beach', cidade='Penha', bairro=coalesce(nullif(bairro,''),'Armação'),
    tipo=coalesce(nullif(tipo,''),'Studio'), status=coalesce(nullif(status,''),'Lançamento'),
    ativo=true, updated_at=now()
where id='e2a740fe-b088-4cd4-b969-65f08875bdae';

with rows(numero,area,valor,entrada,parcela_obra,reforco_obra,chaves,parcela_pos,reforco_pos) as (
  values
    ('505',32.49,410000,10250.00,2355.32,26650.00,41000.00,1392.45,18450.00),
    ('1003',30.42,435000,10875.00,2498.94,28275.00,43500.00,1477.36,19575.00),
    ('1102',30.42,445000,11125.00,2556.38,28925.00,44500.00,1511.32,20025.00),
    ('1103',30.42,445000,11125.00,2556.38,28925.00,44500.00,1511.32,20025.00),
    ('1105',32.49,470000,11750.00,2700.00,30550.00,47000.00,1596.23,21150.00),
    ('1106',30.62,430000,10750.00,2470.21,27950.00,43000.00,1460.38,19350.00),
    ('1107',31.01,440000,11000.00,2527.66,28600.00,44000.00,1494.34,19800.00),
    ('1108',27.98,435000,10875.00,2498.94,28275.00,43500.00,1477.36,19575.00),
    ('1202',30.42,455000,11375.00,2613.83,29575.00,45500.00,1545.28,20475.00),
    ('1206',30.62,440000,11000.00,2527.66,28600.00,44000.00,1494.34,19800.00),
    ('1207',31.01,450000,11250.00,2585.11,29250.00,45000.00,1528.30,20250.00),
    ('1208',27.98,445000,11125.00,2556.38,28925.00,44500.00,1511.32,20025.00),
    ('1301',31.40,470000,11750.00,2700.00,30550.00,47000.00,1596.23,21150.00),
    ('1401',31.40,480000,12000.00,2757.45,31200.00,48000.00,1630.19,21600.00),
    ('1402',30.42,475000,11875.00,2728.72,30875.00,47500.00,1613.21,21375.00),
    ('1403',30.42,475000,11875.00,2728.72,30875.00,47500.00,1613.21,21375.00),
    ('1404',30.81,475000,11875.00,2728.72,30875.00,47500.00,1613.21,21375.00),
    ('1405',32.49,500000,12500.00,2872.34,32500.00,50000.00,1698.11,22500.00),
    ('1406',30.62,460000,11500.00,2642.55,29900.00,46000.00,1562.26,20700.00),
    ('1407',31.01,470000,11750.00,2700.00,30550.00,47000.00,1596.23,21150.00),
    ('1501',31.40,490000,12250.00,2814.89,31850.00,49000.00,1664.15,22050.00),
    ('1503',30.42,485000,12125.00,2786.17,31525.00,48500.00,1647.17,21825.00),
    ('1504',30.81,485000,12125.00,2786.17,31525.00,48500.00,1647.17,21825.00),
    ('1505',32.49,510000,12750.00,2929.79,33150.00,51000.00,1732.08,22950.00),
    ('1506',30.62,470000,11750.00,2700.00,30550.00,47000.00,1596.23,21150.00),
    ('1507',31.01,480000,12000.00,2757.45,31200.00,48000.00,1630.19,21600.00),
    ('1508',27.98,475000,11875.00,2728.72,30875.00,47500.00,1613.21,21375.00),
    ('1602',30.42,495000,12375.00,2843.62,32175.00,49500.00,1681.13,22275.00),
    ('1603',30.42,495000,12375.00,2843.62,32175.00,49500.00,1681.13,22275.00),
    ('1605',32.49,520000,13000.00,2987.23,33800.00,52000.00,1766.04,23400.00),
    ('1606',30.62,480000,12000.00,2757.45,31200.00,48000.00,1630.19,21600.00),
    ('1607',31.01,490000,12250.00,2814.89,31850.00,49000.00,1664.15,22050.00),
    ('1608',27.98,485000,12125.00,2786.17,31525.00,48500.00,1647.17,21825.00),
    ('1701',31.40,510000,12750.00,2929.79,33150.00,51000.00,1732.08,22950.00),
    ('1706',30.62,490000,12250.00,2814.89,31850.00,49000.00,1664.15,22050.00),
    ('1707',31.01,500000,12500.00,2872.34,32500.00,50000.00,1698.11,22500.00),
    ('1708',27.98,495000,12375.00,2843.62,32175.00,49500.00,1681.13,22275.00)
), prepared as (
  select numero, area, valor, entrada, parcela_obra, reforco_obra, chaves, parcela_pos, reforco_pos,
    jsonb_build_object(
      'versao_padrao', 2,
      'fonte', 'ParkBeachPre-LaunchTableData.pdf',
      'data_tabela', '2026-10',
      'modalidade', 'direto_construtora',
      'percentual_entrada', 10,
      'ato', entrada,
      'percentual_parcelas_obra', 27,
      'quantidade_parcelas_obra', 47,
      'parcela_obra_valor', parcela_obra,
      'percentual_reforcos_obra', 26,
      'quantidade_reforcos_obra', 4,
      'reforco_obra_valor', reforco_obra,
      'percentual_chaves', 10,
      'chaves_valor', chaves,
      'percentual_parcelas_pos_chaves', 18,
      'quantidade_parcelas_pos_chaves', 53,
      'parcela_pos_chaves_valor', parcela_pos,
      'percentual_reforcos_pos_chaves', 9,
      'quantidade_reforcos_pos_chaves', 2,
      'reforco_pos_chaves_valor', reforco_pos,
      'percentual_ate_chaves', 73,
      'percentual_pos_chaves', 27,
      'tem_pos_chaves', true,
      'indice_pre_chaves', null,
      'indice_pos_chaves', null,
      'correcao_informada', false,
      'status_fonte', 'Disponível na tabela recebida'
    ) as fluxo
  from rows
)
insert into public.unidades(
  empreendimento_id,numero,codigo_unidade,numero_unidade,sku,torre,andar,area_privativa,area_interna,area_total,
  valor_tabela,status,tipologia,quartos,dormitorios,vagas,entrada_valor,entrada_sugerida,observacoes,fluxo_dados,
  codigo_unidade_normalizado,torre_normalizada
)
select
  'e2a740fe-b088-4cd4-b969-65f08875bdae', numero, numero, numero, 'park-beach-' || numero, 'Torre única',
  case when length(numero)=3 then left(numero,1)::integer else left(numero,length(numero)-2)::integer end,
  area, area, area, valor, 'disponivel', 'Studio', 1, 1, 0, entrada, entrada,
  'Fonte: ParkBeachPre-LaunchTableData.pdf — TABELA_100X_PRE-LANÇAMENTO; BVF Incorporadora; outubro de 2026.',
  fluxo, regexp_replace(lower(numero),'[^a-z0-9]','','g'), 'UNICA'
from prepared
on conflict (sku) do update set
  numero=excluded.numero, codigo_unidade=excluded.codigo_unidade, numero_unidade=excluded.numero_unidade,
  torre=excluded.torre, andar=excluded.andar, area_privativa=excluded.area_privativa, area_interna=excluded.area_interna,
  area_total=excluded.area_total, valor_tabela=excluded.valor_tabela, status=excluded.status, tipologia=excluded.tipologia,
  quartos=excluded.quartos, dormitorios=excluded.dormitorios, vagas=excluded.vagas, entrada_valor=excluded.entrada_valor,
  entrada_sugerida=excluded.entrada_sugerida, observacoes=excluded.observacoes, fluxo_dados=excluded.fluxo_dados,
  codigo_unidade_normalizado=excluded.codigo_unidade_normalizado, torre_normalizada=excluded.torre_normalizada, updated_at=now();

-- Snapshot da tabela recebida, sem duplicar a mesma unidade/mês/ano.
insert into public.historico_tabelas_preco(
  empreendimento_id, unidade_id, codigo_unidade, mes_referencia, ano_referencia, data_importacao,
  valor_tabela, entrada_sugerida, fluxo_dados, observacoes, status_unidade, snapshot_id, atualizado_em
)
select u.empreendimento_id, u.id, u.codigo_unidade, 10, 2026, now(), u.valor_tabela, u.entrada_sugerida,
       u.fluxo_dados, 'Snapshot Park Beach BVF — tabela pré-lançamento outubro de 2026.', u.status,
       s.snapshot_id, now()
from public.unidades u
cross join (select gen_random_uuid() as snapshot_id) s
where u.empreendimento_id='e2a740fe-b088-4cd4-b969-65f08875bdae'
  and u.codigo_unidade in ('505','1003','1102','1103','1105','1106','1107','1108','1202','1206','1207','1208','1301','1401','1402','1403','1404','1405','1406','1407','1501','1503','1504','1505','1506','1507','1508','1602','1603','1605','1606','1607','1608','1701','1706','1707','1708')
  and not exists (
    select 1 from public.historico_tabelas_preco h
    where h.empreendimento_id=u.empreendimento_id and h.unidade_id=u.id and h.mes_referencia=10 and h.ano_referencia=2026
  );

-- Plano comercial reutilizável do empreendimento. Valores por unidade ficam no fluxo_dados acima.
insert into public.planos_pagamento(nome,tipo,empreendimento_id,componentes,regras_correcao,status,padrao,ativo,observacoes)
select '100x pré-lançamento Park Beach — 73% até chaves / 27% pós-chaves','direto','e2a740fe-b088-4cd4-b969-65f08875bdae',
  '[{"nome":"Entrada","tipo":"entrada","percentual":10,"quantidade":4},{"nome":"Mensais durante obra","tipo":"mensal","percentual":27,"quantidade":47},{"nome":"Reforços durante obra","tipo":"reforco","percentual":26,"quantidade":4},{"nome":"Chaves","tipo":"chaves","percentual":10,"quantidade":1},{"nome":"Mensais pós-chaves","tipo":"mensal","percentual":18,"quantidade":53},{"nome":"Reforços pós-chaves","tipo":"reforco","percentual":9,"quantidade":2}]'::jsonb,
  '{"indice_pre_chaves":null,"indice_pos_chaves":null,"correcao_informada":false}'::jsonb,'confirmado',true,true,
  'Fonte: ParkBeachPre-LaunchTableData.pdf; valores nominais por unidade no fluxo_dados. Datas de vencimento, índice e juros não informados.'
where not exists (
  select 1 from public.planos_pagamento p where p.empreendimento_id='e2a740fe-b088-4cd4-b969-65f08875bdae' and p.padrao and p.ativo
);

commit;

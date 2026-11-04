-- Documentos por empreendimento, liberáveis individualmente na curadoria de cada cliente.
alter table public.cliente_empreendimentos
  add column if not exists exibir_documentos boolean not null default false;

alter table public.empreendimento_documentos
  add column if not exists ordem integer not null default 0;

create or replace function public.portal_cliente_institucionais()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
select coalesce(jsonb_agg(jsonb_build_object(
  'empreendimento_id', ce.empreendimento_id,
  'institucional_construtora', case
    when ce.exibir_institucional_construtora and co.institucional_ativo and co.institucional_tipo is not null
    then jsonb_build_object(
      'tipo', co.institucional_tipo,
      'titulo', coalesce(nullif(co.institucional_titulo, ''), co.nome || ' · Institucional da construtora'),
      'url', case when co.institucional_tipo = 'link' then co.institucional_link_url else null end,
      'storage_path', case when co.institucional_tipo = 'pdf' then co.institucional_pdf_path else null end,
      'storage_bucket', case when co.institucional_tipo = 'pdf' then 'cliente-apresentacoes' else null end
    )
    else null
  end,
  'institucional_imobiliaria', case
    when ce.exibir_institucional_imobiliaria and cfg.imobiliaria_institucional_ativo and cfg.imobiliaria_institucional_tipo is not null
    then jsonb_build_object(
      'tipo', cfg.imobiliaria_institucional_tipo,
      'titulo', coalesce(nullif(cfg.imobiliaria_institucional_titulo, ''), 'Institucional da imobiliária'),
      'url', case when cfg.imobiliaria_institucional_tipo = 'link' then cfg.imobiliaria_institucional_link_url else null end,
      'storage_path', case when cfg.imobiliaria_institucional_tipo = 'pdf' then cfg.imobiliaria_institucional_pdf_path else null end,
      'storage_bucket', case when cfg.imobiliaria_institucional_tipo = 'pdf' then 'cliente-apresentacoes' else null end
    )
    else null
  end,
  'documentos', case when ce.exibir_documentos then coalesce((
    select jsonb_agg(jsonb_build_object(
      'tipo', case when d.storage_path is not null then 'pdf' else 'link' end,
      'titulo', coalesce(nullif(d.nome, ''), 'Documento'),
      'descricao', d.descricao,
      'url', case when d.storage_path is null then d.url else null end,
      'storage_path', d.storage_path,
      'storage_bucket', case when d.storage_path is not null then 'cliente-apresentacoes' else null end
    ) order by d.ordem, d.created_at, d.id)
    from public.empreendimento_documentos d
    where d.empreendimento_id = ce.empreendimento_id
      and (nullif(d.storage_path, '') is not null or nullif(d.url, '') is not null)
  ), '[]'::jsonb) else '[]'::jsonb end
) order by ce.ordem), '[]'::jsonb)
from public.clientes c
join public.cliente_empreendimentos ce on ce.cliente_id = c.id
join public.empreendimentos e on e.id = ce.empreendimento_id
left join public.construtoras co on co.id = e.construtora_id
cross join public.site_configuracoes cfg
where c.user_id = auth.uid()
  and c.acesso_portal
  and (c.acesso_expira_em is null or c.acesso_expira_em > now())
  and ce.visivel
  and cfg.id = 1;
$function$;

create or replace function public.portal_cliente_pode_ler_apresentacao(p_path text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
    from public.clientes c
    join public.cliente_empreendimentos ce on ce.cliente_id = c.id
    join public.apresentacoes a on a.empreendimento_id = ce.empreendimento_id
    where c.user_id = auth.uid()
      and c.acesso_portal
      and (c.acesso_expira_em is null or c.acesso_expira_em > now())
      and ce.visivel
      and coalesce(ce.apresentacao_modo, 'preferida') <> 'nenhuma'
      and a.cliente_ativo
      and a.cliente_tipo = 'pdf'
      and a.cliente_pdf_path = p_path
  ) or exists (
    select 1
    from public.clientes c
    join public.cliente_empreendimentos ce on ce.cliente_id = c.id
    join public.empreendimentos e on e.id = ce.empreendimento_id
    join public.construtoras co on co.id = e.construtora_id
    where c.user_id = auth.uid()
      and c.acesso_portal
      and (c.acesso_expira_em is null or c.acesso_expira_em > now())
      and ce.visivel
      and ce.exibir_institucional_construtora
      and co.institucional_ativo
      and co.institucional_tipo = 'pdf'
      and co.institucional_pdf_path = p_path
  ) or exists (
    select 1
    from public.clientes c
    join public.cliente_empreendimentos ce on ce.cliente_id = c.id
    cross join public.site_configuracoes cfg
    where c.user_id = auth.uid()
      and c.acesso_portal
      and (c.acesso_expira_em is null or c.acesso_expira_em > now())
      and ce.visivel
      and ce.exibir_institucional_imobiliaria
      and cfg.id = 1
      and cfg.imobiliaria_institucional_ativo
      and cfg.imobiliaria_institucional_tipo = 'pdf'
      and cfg.imobiliaria_institucional_pdf_path = p_path
  ) or exists (
    select 1
    from public.clientes c
    join public.cliente_empreendimentos ce on ce.cliente_id = c.id
    join public.empreendimento_documentos d on d.empreendimento_id = ce.empreendimento_id
    where c.user_id = auth.uid()
      and c.acesso_portal
      and (c.acesso_expira_em is null or c.acesso_expira_em > now())
      and ce.visivel
      and ce.exibir_documentos
      and d.storage_path = p_path
  );
$function$;

-- Catálogo protegido e operação de indicações. O nome técnico "afiliado" é mantido
-- apenas por compatibilidade com contas existentes.
alter table public.afiliados
  add column if not exists etapa text not null default 'candidato',
  add column if not exists termo_aceito_em timestamptz,
  add column if not exists termo_versao text;

alter table public.afiliados drop constraint if exists afiliados_etapa_check;
alter table public.afiliados add constraint afiliados_etapa_check
  check (etapa in ('candidato','entrevista','aprovado','suspenso'));

create table if not exists public.indicador_configuracoes (
  id boolean primary key default true check (id),
  bonus_imovel_percentual numeric(7,3) not null default 0 check (bonus_imovel_percentual between 0 and 100),
  bonus_carta_percentual numeric(7,3) not null default 0 check (bonus_carta_percentual between 0 and 100),
  termo_versao text not null default '1.0',
  termo_texto text not null default 'Atuo exclusivamente na identificação e indicação de pessoas interessadas. Não anuncio, negocio, prometo condições, recebo valores nem me apresento como corretor. Materiais deste painel são confidenciais e podem ser mostrados somente em conversa privada, sem download, publicação ou encaminhamento.',
  updated_at timestamptz not null default now()
);
insert into public.indicador_configuracoes(id) values(true) on conflict(id) do nothing;

create table if not exists public.indicador_produtos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('imovel','carta_credito')),
  empreendimento_id text references public.empreendimentos(id) on delete set null,
  codigo text not null unique,
  titulo text not null,
  cidade text,
  regiao_aproximada text,
  faixa_preco_min numeric check (faixa_preco_min is null or faixa_preco_min >= 0),
  faixa_preco_max numeric check (faixa_preco_max is null or faixa_preco_max >= 0),
  resumo text,
  publico_ideal text[] not null default '{}',
  diferenciais text[] not null default '{}',
  perguntas text[] not null default '{}',
  objecoes jsonb not null default '[]'::jsonb,
  roteiro text,
  cuidados text,
  imagem_ids jsonb not null default '[]'::jsonb,
  capa_url text,
  ativo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (faixa_preco_max is null or faixa_preco_min is null or faixa_preco_max >= faixa_preco_min),
  check (jsonb_typeof(objecoes) = 'array'),
  check (jsonb_typeof(imagem_ids) = 'array')
);

create table if not exists public.indicador_acessos (
  indicador_id uuid not null references public.afiliados(id) on delete cascade,
  produto_id uuid not null references public.indicador_produtos(id) on delete cascade,
  liberado boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(indicador_id,produto_id)
);

create table if not exists public.indicador_indicacoes (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references public.afiliados(id) on delete restrict,
  produto_id uuid references public.indicador_produtos(id) on delete set null,
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  telefone text not null check (char_length(trim(telefone)) between 8 and 30),
  email text,
  cidade text,
  observacoes text check (observacoes is null or char_length(observacoes) <= 1500),
  consentimento_contato boolean not null default false check (consentimento_contato),
  status text not null default 'nova' check (status in ('nova','contato','qualificada','negociacao','convertida','perdida')),
  valor_referencia numeric,
  bonus_percentual numeric(7,3),
  bonus_previsto numeric,
  bonus_pago numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists indicador_produtos_ativo_idx on public.indicador_produtos(ativo,tipo);
create index if not exists indicador_acessos_indicador_idx on public.indicador_acessos(indicador_id,liberado);
create index if not exists indicador_indicacoes_indicador_idx on public.indicador_indicacoes(indicador_id,created_at desc);

alter table public.indicador_configuracoes enable row level security;
alter table public.indicador_produtos enable row level security;
alter table public.indicador_acessos enable row level security;
alter table public.indicador_indicacoes enable row level security;

create policy "configuracoes de indicadores por admin" on public.indicador_configuracoes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "produtos de indicadores por admin" on public.indicador_produtos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "acessos de indicadores por admin" on public.indicador_acessos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "indicacoes por admin" on public.indicador_indicacoes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "indicador le suas indicacoes" on public.indicador_indicacoes for select to authenticated
  using (exists(select 1 from public.afiliados a where a.id=indicador_id and a.user_id=(select auth.uid()) and a.ativo));
create policy "indicador cria sua indicacao" on public.indicador_indicacoes for insert to authenticated
  with check (exists(select 1 from public.afiliados a join public.indicador_acessos ia on ia.indicador_id=a.id and ia.produto_id=indicador_indicacoes.produto_id and ia.liberado where a.id=indicador_id and a.user_id=(select auth.uid()) and a.ativo and a.etapa='aprovado' and a.termo_aceito_em is not null));

grant select,insert,update,delete on public.indicador_configuracoes,public.indicador_produtos,public.indicador_acessos,public.indicador_indicacoes to authenticated;

create or replace function public.portal_indicador()
returns jsonb language sql stable security definer set search_path=public as $$
select coalesce((select jsonb_build_object(
  'perfil',jsonb_build_object('id',a.id,'nome',a.nome,'etapa',a.etapa,'ativo',a.ativo,'termo_aceito_em',case when a.termo_versao=c.termo_versao then a.termo_aceito_em end,'termo_versao',a.termo_versao),
  'termo',jsonb_build_object('versao',c.termo_versao,'texto',c.termo_texto),
  'produtos',coalesce((select jsonb_agg(jsonb_build_object(
    'id',p.id,'tipo',p.tipo,'codigo',p.codigo,'titulo',p.titulo,'cidade',p.cidade,'regiao_aproximada',p.regiao_aproximada,
    'faixa_preco_min',p.faixa_preco_min,'faixa_preco_max',p.faixa_preco_max,'resumo',p.resumo,'publico_ideal',p.publico_ideal,
    'diferenciais',p.diferenciais,'perguntas',p.perguntas,'objecoes',p.objecoes,'roteiro',p.roteiro,'cuidados',p.cuidados,
    'capa_url',p.capa_url,'imagens',coalesce((select jsonb_agg(jsonb_build_object('id',ei.id,'titulo',ei.titulo,'storage_path',ei.storage_path,'url',ei.url) order by ord.pos)
      from jsonb_array_elements_text(p.imagem_ids) with ordinality ord(id,pos) join public.empreendimento_imagens ei on ei.id::text=ord.id
      where p.empreendimento_id=ei.empreendimento_id),'[]'::jsonb),
    'bonus_percentual',case when p.tipo='imovel' then c.bonus_imovel_percentual else c.bonus_carta_percentual end
  ) order by p.updated_at desc) from public.indicador_acessos ia join public.indicador_produtos p on p.id=ia.produto_id and p.ativo where ia.indicador_id=a.id and ia.liberado and a.etapa='aprovado' and a.termo_aceito_em is not null and a.termo_versao=c.termo_versao),'[]'::jsonb),
  'indicacoes',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from public.indicador_indicacoes i where i.indicador_id=a.id),'[]'::jsonb)
) from public.afiliados a cross join public.indicador_configuracoes c where a.user_id=auth.uid() and a.ativo limit 1),'{}'::jsonb);
$$;
revoke all on function public.portal_indicador() from public,anon;
grant execute on function public.portal_indicador() to authenticated;

create or replace function public.aceitar_termo_indicador()
returns boolean language plpgsql security definer set search_path=public as $$
declare v text;
begin
  if auth.uid() is null then raise exception 'NAO_AUTENTICADO'; end if;
  select termo_versao into v from public.indicador_configuracoes where id;
  update public.afiliados set termo_aceito_em=now(),termo_versao=v,updated_at=now() where user_id=auth.uid() and ativo and etapa='aprovado';
  return found;
end $$;
revoke all on function public.aceitar_termo_indicador() from public,anon;
grant execute on function public.aceitar_termo_indicador() to authenticated;

create or replace function public.preparar_bonus_indicacao()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_percentual numeric;
begin
  select case when p.tipo='imovel' then c.bonus_imovel_percentual else c.bonus_carta_percentual end
    into v_percentual from public.indicador_produtos p cross join public.indicador_configuracoes c where p.id=new.produto_id;
  new.bonus_percentual:=v_percentual;
  new.bonus_previsto:=case when new.valor_referencia is null then null else round(new.valor_referencia*v_percentual/100,2) end;
  return new;
end $$;
drop trigger if exists indicador_indicacoes_prepara_bonus on public.indicador_indicacoes;
create trigger indicador_indicacoes_prepara_bonus before insert or update of produto_id,valor_referencia on public.indicador_indicacoes for each row execute function public.preparar_bonus_indicacao();

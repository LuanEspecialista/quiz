-- Identidade canônica de unidades e snapshots mensais.
-- Não consolida nem exclui registros legados: conflitos antigos permanecem para revisão.

alter table public.empreendimentos
  add column if not exists estrutura_torres text not null default 'nao_informada';

alter table public.empreendimentos
  drop constraint if exists empreendimentos_estrutura_torres_check;
alter table public.empreendimentos
  add constraint empreendimentos_estrutura_torres_check
  check (estrutura_torres in ('nao_informada', 'unica', 'multipla'));

alter table public.unidades
  add column if not exists codigo_unidade_normalizado text,
  add column if not exists torre_normalizada text;

alter table public.historico_tabelas_preco
  add column if not exists status_unidade text,
  add column if not exists atualizado_em timestamptz not null default now();

create unique index if not exists historico_preco_unidade_mes_unico
  on public.historico_tabelas_preco (unidade_id, ano_referencia, mes_referencia)
  where unidade_id is not null;

create index if not exists unidades_identidade_canonica_idx
  on public.unidades (empreendimento_id, torre_normalizada, codigo_unidade_normalizado);

comment on column public.empreendimentos.estrutura_torres is
  'Define como identificar unidades: unica ignora variações do nome da torre; multipla exige torre.';
comment on column public.unidades.codigo_unidade_normalizado is
  'Código sem espaços, hífens, acentos ou pontuação, usado apenas para conciliação.';
comment on column public.unidades.torre_normalizada is
  'UNICA em empreendimento de torre única; chave normalizada da torre em empreendimento multitorres.';

-- Informação confirmada pelo administrador: Skyline possui uma única torre.
update public.empreendimentos
set estrutura_torres = 'unica', quantidade_torres = 1, numero_torres = 1, updated_at = now()
where lower(trim(nome)) in ('skyline', 'skyline living');

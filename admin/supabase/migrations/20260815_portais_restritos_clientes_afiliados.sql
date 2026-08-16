-- Portais pessoais: somente o administrador gerencia dados internos.
-- Clientes e afiliados recebem conteúdo via funções controladas, nunca por acesso direto às tabelas.

alter table public.perfis_usuario drop constraint if exists perfis_usuario_perfil_check;
alter table public.perfis_usuario add constraint perfis_usuario_perfil_check
  check (perfil in ('admin', 'cliente', 'afiliado'));

alter table public.clientes add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table public.clientes add column if not exists acesso_portal boolean not null default true;
alter table public.clientes add column if not exists modo_apresentacao text not null default 'moradia'
  check (modo_apresentacao in ('moradia', 'investidor', 'renda', 'revenda'));
alter table public.clientes add column if not exists horizonte_investimento text;
alter table public.clientes add column if not exists perfil_risco text;

alter table public.cliente_empreendimentos add column if not exists visivel boolean not null default true;
alter table public.cliente_empreendimentos add column if not exists exibir_preco boolean not null default true;
alter table public.cliente_empreendimentos add column if not exists exibir_especificacoes boolean not null default true;
alter table public.cliente_empreendimentos add column if not exists exibir_investimento boolean not null default false;
alter table public.cliente_empreendimentos add column if not exists exibir_fluxo boolean not null default false;
alter table public.cliente_empreendimentos add column if not exists mensagem_personalizada text;

-- Vincula automaticamente o cliente à conta já criada com o mesmo e-mail.
create or replace function public.vincular_cliente_por_email()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare conta uuid;
begin
  if new.email is null or trim(new.email) = '' then return new; end if;
  select id into conta from auth.users where lower(email) = lower(trim(new.email)) limit 1;
  if conta is not null then
    update public.clientes set user_id = conta where id = new.id;
    insert into public.perfis_usuario (user_id, perfil, ativo)
    values (conta, 'cliente', true)
    on conflict (user_id) do update set perfil = case when public.perfis_usuario.perfil = 'admin' then 'admin' else 'cliente' end;
  end if;
  return new;
end $$;

drop trigger if exists vincular_cliente_por_email on public.clientes;
create trigger vincular_cliente_por_email
after insert or update of email on public.clientes
for each row execute function public.vincular_cliente_por_email();

alter table public.clientes enable row level security;
alter table public.cliente_empreendimentos enable row level security;
drop policy if exists "clientes autenticados" on public.clientes;
drop policy if exists "clientes somente admin" on public.clientes;
create policy "clientes somente admin" on public.clientes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "curadoria somente admin" on public.cliente_empreendimentos;
create policy "curadoria somente admin" on public.cliente_empreendimentos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- O portal recebe exclusivamente a curadoria ligada à própria conta.
create or replace function public.portal_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cliente', jsonb_build_object(
      'nome', c.nome, 'objetivo', c.objetivo, 'modo', c.modo_apresentacao,
      'horizonte', c.horizonte_investimento, 'cidade', c.cidade
    ),
    'oportunidades', coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'cidade', e.cidade, 'bairro', e.bairro,
      'status', e.status, 'imagem_url', e.imagem_url, 'descricao', e.descricao,
      'preco', case when ce.exibir_preco then e.faixa_preco else null end,
      'area_minima', case when ce.exibir_especificacoes then e.area_minima else null end,
      'area_maxima', case when ce.exibir_especificacoes then e.area_maxima else null end,
      'caracteristicas', case when ce.exibir_especificacoes then e.caracteristicas else null end,
      'mensagem', ce.mensagem_personalizada,
      'exibir_investimento', ce.exibir_investimento,
      'exibir_fluxo', ce.exibir_fluxo
    ) order by ce.ordem) filter (where e.id is not null), '[]'::jsonb)
  )
  from public.clientes c
  left join public.cliente_empreendimentos ce on ce.cliente_id = c.id and ce.visivel
  left join public.empreendimentos e on e.id = ce.empreendimento_id
  where c.user_id = auth.uid() and c.acesso_portal;
$$;
grant execute on function public.portal_cliente() to authenticated;

-- Cada campo comercial do catálogo pode ser liberado individualmente.
alter table public.afiliado_produtos add column if not exists exibir_imagens boolean not null default true;
alter table public.afiliado_produtos add column if not exists exibir_descricao boolean not null default true;
alter table public.afiliado_produtos add column if not exists exibir_preco boolean not null default false;
alter table public.afiliado_produtos add column if not exists exibir_entrada_parcelas boolean not null default true;
alter table public.afiliado_produtos add column if not exists exibir_comissao boolean not null default true;
alter table public.afiliado_produtos add column if not exists exibir_especificacoes boolean not null default false;

alter table public.afiliados enable row level security;
alter table public.afiliado_produtos enable row level security;
drop policy if exists "afiliados somente admin" on public.afiliados;
create policy "afiliados somente admin" on public.afiliados for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "produtos de afiliado somente admin" on public.afiliado_produtos;
create policy "produtos de afiliado somente admin" on public.afiliado_produtos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.catalogo_afiliado()
returns table(
  id text, nome text, cidade text, bairro text, status text, descricao text, imagem_url text,
  tipo text, faixa_preco numeric, area_minima numeric, area_maxima numeric,
  entrada_afiliado numeric, parcela_afiliado numeric, quantidade_elevadores integer,
  quantidade_areas_lazer integer, caracteristicas jsonb, percentual_comissao numeric,
  confidencial boolean, instrucoes text
) language sql stable security definer set search_path = public as $$
  select e.id, e.nome, e.cidade, e.bairro, e.status,
    case when ap.exibir_descricao then e.descricao else null end,
    case when ap.exibir_imagens then e.imagem_url else null end,
    coalesce(e.categoria_afiliado, e.tipo),
    case when ap.exibir_preco then e.faixa_preco else null end,
    case when ap.exibir_especificacoes then e.area_minima else null end,
    case when ap.exibir_especificacoes then e.area_maxima else null end,
    case when ap.exibir_entrada_parcelas then e.entrada_afiliado else null end,
    case when ap.exibir_entrada_parcelas then e.parcela_afiliado else null end,
    case when ap.exibir_especificacoes then e.quantidade_elevadores else null end,
    case when ap.exibir_especificacoes then e.quantidade_areas_lazer else null end,
    case when ap.exibir_especificacoes then e.caracteristicas else null end,
    case when ap.exibir_comissao then coalesce(rc.percentual, 0) else null end,
    ap.confidencial, ap.instrucoes
  from public.afiliados a
  join public.afiliado_produtos ap on ap.afiliado_id = a.id and ap.liberado
  join public.empreendimentos e on e.id = ap.empreendimento_id and e.ativo
  left join public.regras_comissao_afiliado rc on lower(rc.tipo_produto) = lower(coalesce(e.categoria_afiliado, e.tipo)) and rc.ativo
  where a.user_id = auth.uid() and a.ativo;
$$;
grant execute on function public.catalogo_afiliado() to authenticated;

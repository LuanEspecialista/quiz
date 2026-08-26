-- Endurece tabelas expostas sem RLS e reduz a superfície de RPCs privilegiadas.
-- O painel administrativo continua operando por sessão autenticada de administrador.

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'analises','regras_comissao_afiliado','analises_empreendimentos','indicadores_ticker_config',
    'historico_tabelas_preco','cliente_atividades','tarefas','cliente_interesses','reservas',
    'propostas','empreendimento_documentos','empreendimento_diferenciais','alertas','audit_log'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists "admin_manage" on public.%I', table_name);
      execute format('create policy "admin_manage" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', table_name);
    end if;
  end loop;
end $$;

-- Catálogo público continua somente para as entidades necessárias ao site institucional.
alter table public.construtoras enable row level security;
alter table public.empreendimentos enable row level security;
drop policy if exists "admin_manage" on public.construtoras;
create policy "admin_manage" on public.construtoras for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_manage" on public.empreendimentos;
create policy "admin_manage" on public.empreendimentos for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Estoque, preço e fluxo nunca devem ser listados anonimamente.
alter table public.unidades enable row level security;
drop policy if exists "Permitir atualização de unidades" on public.unidades;
drop policy if exists "Permitir inserção de unidades" on public.unidades;
drop policy if exists "Permitir leitura de unidades" on public.unidades;
drop policy if exists "Permitir leitura pública de unidades" on public.unidades;
drop policy if exists "admin_manage" on public.unidades;
create policy "admin_manage" on public.unidades for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Análises compartilhadas: a API pública só recebe uma análise ativa pelo código informado,
-- nunca uma tabela inteira através do REST.
create or replace function public.obter_analise_por_codigo(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(a)
  from public.analises a
  where a.ativo = true and a.codigo_acesso = nullif(trim(p_codigo),'')
  limit 1;
$$;
revoke all on function public.obter_analise_por_codigo(text) from public;
grant execute on function public.obter_analise_por_codigo(text) to anon, authenticated;

-- Cada função mantém apenas o menor público que realmente a utiliza.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.catalogo_afiliado() from public, anon;
grant execute on function public.catalogo_afiliado() to authenticated;
revoke all on function public.portal_cliente() from public, anon;
grant execute on function public.portal_cliente() to authenticated;
revoke all on function public.criar_link_temporario(text,text,timestamptz,text[],jsonb,text,uuid,text,integer) from public, anon;
grant execute on function public.criar_link_temporario(text,text,timestamptz,text[],jsonb,text,uuid,text,integer) to authenticated;
revoke all on function public.revogar_link_temporario(uuid) from public, anon;
grant execute on function public.revogar_link_temporario(uuid) to authenticated;
revoke all on function public.vincular_afiliado_email(uuid,text) from public, anon;
grant execute on function public.vincular_afiliado_email(uuid,text) to authenticated;
revoke all on function public.pode_acessar_midia(text) from public, anon;
grant execute on function public.pode_acessar_midia(text) to authenticated;

-- Resolução de links é chamada pela Edge Function com service role, não pelo navegador.
revoke all on function public.resolver_link_temporario(text,text,text,text) from public, anon, authenticated;
grant execute on function public.resolver_link_temporario(text,text,text,text) to service_role;

-- Funções sem caminho fixo podem ser alvo de resolução de objetos inesperados.
alter function public.atualizar_updated_at() set search_path = pg_catalog, public;
alter function public.get_server_time() set search_path = pg_catalog, public;
alter function public.normalizar_mes_entrega(text) set search_path = pg_catalog, public;
alter function public.sincronizar_entrega_empreendimento() set search_path = pg_catalog, public;
alter function central_conversao.fn_set_updated_at() set search_path = pg_catalog, central_conversao, public;
alter function central_conversao.fn_log_playbook_change() set search_path = pg_catalog, central_conversao, public;

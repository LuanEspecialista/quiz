create policy "indicador le seu cadastro" on public.afiliados for select to authenticated
  using ((select auth.uid()) is not null and user_id=(select auth.uid()) and ativo);
create policy "indicador le suas liberacoes" on public.indicador_acessos for select to authenticated
  using (exists(select 1 from public.afiliados a where a.id=indicador_id and a.user_id=(select auth.uid()) and a.ativo));

create or replace function public.pode_acessar_midia(p_storage_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.empreendimento_imagens ei
    where ei.storage_path=p_storage_path and (
      exists(select 1 from public.clientes c join public.cliente_empreendimentos ce on ce.cliente_id=c.id
        where c.user_id=auth.uid() and c.acesso_portal and ce.empreendimento_id=ei.empreendimento_id and ce.visivel and ce.exibir_imagens and ei.visivel_cliente)
      or exists(select 1 from public.afiliados a join public.afiliado_produtos ap on ap.afiliado_id=a.id
        where a.user_id=auth.uid() and a.ativo and ap.empreendimento_id=ei.empreendimento_id and ap.liberado and ap.exibir_imagens and ei.visivel_afiliado)
      or exists(select 1 from public.afiliados a join public.indicador_acessos ia on ia.indicador_id=a.id and ia.liberado
        join public.indicador_produtos ip on ip.id=ia.produto_id and ip.ativo
        where a.user_id=auth.uid() and a.ativo and a.etapa='aprovado' and a.termo_aceito_em is not null
          and ip.empreendimento_id=ei.empreendimento_id and ip.imagem_ids ? ei.id::text)
    )
  );
$$;
revoke all on function public.pode_acessar_midia(text) from public,anon;
grant execute on function public.pode_acessar_midia(text) to authenticated;

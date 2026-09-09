alter table public.solicitacoes_acesso add column if not exists usuario text;

create unique index if not exists perfis_usuario_usuario_ci_unique
  on public.perfis_usuario (lower(usuario)) where usuario is not null;
create unique index if not exists solicitacoes_usuario_pendente_ci_unique
  on public.solicitacoes_acesso (lower(usuario)) where status='pendente' and usuario is not null;

create or replace function public.solicitar_acesso(p_nome text,p_email text,p_tipo text,p_usuario text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_nome text:=trim(p_nome);v_email text:=lower(trim(p_email));v_usuario text:=lower(trim(p_usuario));
begin
 if char_length(v_nome) not between 2 and 120 then raise exception 'NOME_INVALIDO';end if;
 if v_email!~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'EMAIL_INVALIDO';end if;
 if p_tipo not in ('cliente','afiliado') then raise exception 'TIPO_INVALIDO';end if;
 if v_usuario!~ '^[a-z0-9][a-z0-9._-]{2,23}$' then raise exception 'USUARIO_INVALIDO';end if;
 if exists(select 1 from public.perfis_usuario where lower(usuario)=v_usuario)
    or exists(select 1 from public.solicitacoes_acesso where lower(usuario)=v_usuario and status='pendente')
 then raise exception 'USUARIO_EM_USO';end if;
 select id into v_id from public.solicitacoes_acesso where lower(email)=v_email and tipo=p_tipo and status='pendente' limit 1;
 if v_id is null then
  insert into public.solicitacoes_acesso(nome,email,usuario,tipo) values(v_nome,v_email,v_usuario,p_tipo) returning id into v_id;
 else
  update public.solicitacoes_acesso set nome=v_nome,usuario=v_usuario where id=v_id;
 end if;
 return v_id;
end $$;
revoke all on function public.solicitar_acesso(text,text,text,text) from public;
grant execute on function public.solicitar_acesso(text,text,text,text) to anon,authenticated;

create or replace function public.portal_cliente()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object(
  'cliente',jsonb_build_object('nome',c.nome,'objetivo',c.objetivo,'modo',c.modo_apresentacao,'horizonte',c.horizonte_investimento,'cidade',c.cidade),
  'oportunidades',coalesce(jsonb_agg(jsonb_build_object(
   'id',e.id,'nome',e.nome,'cidade',e.cidade,'bairro',e.bairro,'endereco',e.endereco,'status',e.status,
   'descricao',case when ce.exibir_descricao then e.descricao end,
   'preco',case when ce.exibir_preco then e.faixa_preco end,
   'area_minima',case when ce.exibir_especificacoes then e.area_minima end,'area_maxima',case when ce.exibir_especificacoes then e.area_maxima end,
   'caracteristicas',case when ce.exibir_especificacoes or ce.exibir_descricao then e.caracteristicas end,
   'diferenciais',case when ce.exibir_descricao then e.diferenciais end,'lazer',case when ce.exibir_descricao then e.lazer end,
   'entrega',case when ce.exibir_especificacoes then coalesce(e.entrega_date::text,e.entrega,e.data_entrega) end,
   'mensagem',ce.mensagem_personalizada,'exibir_investimento',ce.exibir_investimento,'exibir_fluxo',ce.exibir_fluxo,'permitir_proposta',ce.permitir_proposta,
   'imagens',case when ce.exibir_imagens then coalesce((select jsonb_agg(jsonb_build_object('id',ei.id,'titulo',ei.titulo,'categoria',ei.categoria,'storage_path',ei.storage_path,'url',case when ei.storage_path is null then ei.url end) order by ei.ordem nulls last,ei.created_at) from public.empreendimento_imagens ei where ei.empreendimento_id=e.id and ei.visivel_cliente),'[]'::jsonb) else '[]'::jsonb end,
   'plantas',case when ce.exibir_imagens or ce.exibir_especificacoes then coalesce((select jsonb_agg(jsonb_build_object('id',pu.id,'titulo',pu.titulo,'tipo',pu.tipo,'tipologia',pu.tipologia,'storage_path',pu.storage_path) order by pu.ordem,pu.created_at) from public.plantas_unidades pu where pu.empreendimento_id=e.id),'[]'::jsonb) else '[]'::jsonb end
  ) order by ce.ordem) filter(where e.id is not null),'[]'::jsonb)
 ) from public.clientes c left join public.cliente_empreendimentos ce on ce.cliente_id=c.id and ce.visivel left join public.empreendimentos e on e.id=ce.empreendimento_id
 where c.user_id=auth.uid() and c.acesso_portal group by c.id,c.nome,c.objetivo,c.modo_apresentacao,c.horizonte_investimento,c.cidade;
$$;
revoke all on function public.portal_cliente() from public,anon;
grant execute on function public.portal_cliente() to authenticated;

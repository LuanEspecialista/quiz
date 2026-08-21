-- Normaliza perfis e evita que novos vínculos exponham conteúdo sem liberação explícita.
do $$
declare constraint_name text;
begin
  if to_regclass('public.perfis_usuario') is not null then
    select conname into constraint_name
    from pg_constraint
    where conrelid = 'public.perfis_usuario'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%perfil%';
    if constraint_name is not null then
      execute format('alter table public.perfis_usuario drop constraint %I', constraint_name);
    end if;
    alter table public.perfis_usuario
      add constraint perfis_usuario_perfil_check
      check (perfil in ('admin','equipe','cliente','afiliado'));
  end if;
end $$;

alter table public.cliente_empreendimentos
  alter column exibir_imagens set default false,
  alter column exibir_descricao set default false,
  alter column exibir_preco set default false,
  alter column exibir_especificacoes set default false,
  alter column exibir_investimento set default false,
  alter column exibir_fluxo set default false;

alter table public.afiliado_produtos
  alter column exibir_imagens set default false,
  alter column exibir_descricao set default false,
  alter column exibir_preco set default false,
  alter column exibir_entrada_parcelas set default false,
  alter column exibir_comissao set default false,
  alter column exibir_especificacoes set default false;

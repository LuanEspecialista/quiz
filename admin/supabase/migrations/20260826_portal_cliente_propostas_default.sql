-- A curadoria liberada já entrega a ação de interesse; o administrador pode desligar
-- permitir_proposta para casos específicos via painel/SQL de gestão.
alter table public.cliente_empreendimentos
  alter column permitir_proposta set default true;

update public.cliente_empreendimentos
set permitir_proposta = true
where visivel and permitir_proposta = false;

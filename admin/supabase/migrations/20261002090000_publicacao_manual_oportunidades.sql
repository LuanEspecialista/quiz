-- A vitrine pública só deve mostrar empreendimentos liberados manualmente após validação da capa.
-- A publicação inicial anterior é recolhida para que cada item passe pelo novo botão do painel.
update public.oportunidades_publicas
set ativo_publico = false,
    updated_at = now();

comment on column public.oportunidades_publicas.ativo_publico is
  'Liberação manual para a vitrine de imóveis. Só fica true após o administrador validar capa e entrada.';

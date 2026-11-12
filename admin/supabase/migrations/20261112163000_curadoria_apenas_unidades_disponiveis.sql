-- Curadoria de clientes: somente unidades atualmente disponíveis podem ser liberadas.
-- Migration aditiva; revisar antes de aplicar.

CREATE OR REPLACE FUNCTION public.normalizar_unidades_disponiveis_curadoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT COALESCE(array_agg(u.id::text ORDER BY u.torre NULLS LAST, u.andar NULLS LAST, u.numero NULLS LAST), ARRAY[]::text[])
    INTO NEW.unidade_ids_selecionadas
  FROM public.unidades u
  WHERE u.empreendimento_id = NEW.empreendimento_id
    AND u.id::text = ANY(COALESCE(NEW.unidade_ids_selecionadas, ARRAY[]::text[]))
    AND lower(COALESCE(u.status, '')) = 'disponivel';

  NEW.unidade_ids := to_jsonb(COALESCE(NEW.unidade_ids_selecionadas, ARRAY[]::text[]));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalizar_unidades_disponiveis_curadoria
  ON public.cliente_empreendimentos;

CREATE TRIGGER normalizar_unidades_disponiveis_curadoria
BEFORE INSERT OR UPDATE OF empreendimento_id, unidade_ids, unidade_ids_selecionadas
ON public.cliente_empreendimentos
FOR EACH ROW
EXECUTE FUNCTION public.normalizar_unidades_disponiveis_curadoria();

-- Limpa seleções antigas que deixaram de ser elegíveis.
UPDATE public.cliente_empreendimentos ce
SET unidade_ids_selecionadas = COALESCE(valid.ids, ARRAY[]::text[]),
    unidade_ids = to_jsonb(COALESCE(valid.ids, ARRAY[]::text[]))
FROM (
  SELECT ce2.id,
         COALESCE(array_agg(u.id::text ORDER BY u.torre NULLS LAST, u.andar NULLS LAST, u.numero NULLS LAST), ARRAY[]::text[]) AS ids
  FROM public.cliente_empreendimentos ce2
  LEFT JOIN public.unidades u
    ON u.empreendimento_id = ce2.empreendimento_id
   AND u.id::text = ANY(COALESCE(ce2.unidade_ids_selecionadas, ARRAY[]::text[]))
   AND lower(COALESCE(u.status, '')) = 'disponivel'
  GROUP BY ce2.id
) AS valid
WHERE ce.id = valid.id
  AND (
    ce.unidade_ids_selecionadas IS DISTINCT FROM valid.ids
    OR ce.unidade_ids IS DISTINCT FROM to_jsonb(valid.ids)
  );

COMMENT ON FUNCTION public.normalizar_unidades_disponiveis_curadoria() IS
  'Mantém a curadoria de clientes limitada a unidades com status disponível.';

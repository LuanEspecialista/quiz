-- unidade_ids_selecionadas é o campo canônico da curadoria atual.
-- Sincroniza os registros existentes antes de instalar o gatilho de compatibilidade,
-- para que o portal legado (que ainda lê unidade_ids) mostre a seleção correta.
UPDATE public.cliente_empreendimentos AS ce
SET unidade_ids = to_jsonb(coalesce(ce.unidade_ids_selecionadas, ARRAY[]::text[]))
WHERE ce.unidade_ids IS DISTINCT FROM to_jsonb(coalesce(ce.unidade_ids_selecionadas, ARRAY[]::text[]));

CREATE OR REPLACE FUNCTION public.sync_cliente_empreendimentos_unit_ids()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Compatibilidade com escritores antigos que enviam somente o JSON legado.
    IF coalesce(cardinality(NEW.unidade_ids_selecionadas), 0) > 0
       OR coalesce(jsonb_typeof(NEW.unidade_ids), 'null') <> 'array'
       OR coalesce(jsonb_array_length(NEW.unidade_ids), 0) = 0 THEN
      NEW.unidade_ids := to_jsonb(coalesce(NEW.unidade_ids_selecionadas, ARRAY[]::text[]));
    ELSE
      SELECT coalesce(array_agg(item), ARRAY[]::text[])
      INTO NEW.unidade_ids_selecionadas
      FROM jsonb_array_elements_text(NEW.unidade_ids) AS selected(item);
    END IF;
  ELSIF NEW.unidade_ids_selecionadas IS DISTINCT FROM OLD.unidade_ids_selecionadas THEN
    -- O array é o formato canônico: reflete seleção e remoção no campo JSON legado.
    NEW.unidade_ids := to_jsonb(coalesce(NEW.unidade_ids_selecionadas, ARRAY[]::text[]));
  ELSIF NEW.unidade_ids IS DISTINCT FROM OLD.unidade_ids THEN
    -- Mantém compatibilidade com integrações antigas que ainda alteram o JSON.
    IF coalesce(jsonb_typeof(NEW.unidade_ids), 'null') = 'array' THEN
      SELECT coalesce(array_agg(item), ARRAY[]::text[])
      INTO NEW.unidade_ids_selecionadas
      FROM jsonb_array_elements_text(NEW.unidade_ids) AS selected(item);
    ELSE
      NEW.unidade_ids := '[]'::jsonb;
      NEW.unidade_ids_selecionadas := ARRAY[]::text[];
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_cliente_empreendimentos_unit_ids
ON public.cliente_empreendimentos;

CREATE TRIGGER sync_cliente_empreendimentos_unit_ids
BEFORE INSERT OR UPDATE OF unidade_ids, unidade_ids_selecionadas
ON public.cliente_empreendimentos
FOR EACH ROW
EXECUTE FUNCTION public.sync_cliente_empreendimentos_unit_ids();

DO $migration$
DECLARE
  v_definition text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(
      'public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text,text,numeric,jsonb,text,text,text,text,text,text,jsonb,jsonb,uuid,boolean,boolean)'::regprocedure
    )
    INTO v_definition;

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'A função enviar_proposta_cliente não foi encontrada.';
  END IF;

  v_old := $old$v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');$old$;
  v_new := $new$v_cpf text := nullif(regexp_replace(upper(coalesce(p_cpf, '')), '[^0-9A-Z]', '', 'g'), '');$new$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Não foi possível localizar a normalização atual do documento do proponente.';
  END IF;
  v_definition := replace(v_definition, v_old, v_new);

  v_old := $old$IF v_cpf IS NULL OR length(v_cpf) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido.' USING errcode = '22023';
  END IF;$old$;
  v_new := $new$IF v_cpf IS NULL
     OR NOT (
       (length(v_cpf) = 11 AND v_cpf ~ '^[0-9]{11}$')
       OR (length(v_cpf) = 14 AND v_cpf ~ '^[A-Z0-9]{12}[0-9]{2}$')
     ) THEN
    RAISE EXCEPTION 'CPF ou CNPJ inválido.' USING errcode = '22023';
  END IF;$new$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Não foi possível localizar a validação atual do documento do proponente.';
  END IF;
  v_definition := replace(v_definition, v_old, v_new);

  v_old := $old$'nome', left(trim(p_nome), 150), 'cpf', v_cpf,
      'telefone', left(trim(p_telefone), 40), 'email', v_email,$old$;
  v_new := $new$'nome', left(trim(p_nome), 150), 'cpf', v_cpf,
      'documento_tipo', CASE WHEN length(v_cpf) = 14 THEN 'CNPJ' ELSE 'CPF' END,
      'telefone', left(trim(p_telefone), 40), 'email', v_email,$new$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Não foi possível localizar o snapshot do proponente.';
  END IF;
  v_definition := replace(v_definition, v_old, v_new);

  EXECUTE v_definition;
END;
$migration$;

NOTIFY pgrst, 'reload schema';

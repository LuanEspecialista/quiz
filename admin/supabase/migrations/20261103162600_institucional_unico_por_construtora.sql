ALTER TABLE public.construtoras
  ADD COLUMN IF NOT EXISTS institucional_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS institucional_tipo text,
  ADD COLUMN IF NOT EXISTS institucional_pdf_path text,
  ADD COLUMN IF NOT EXISTS institucional_link_url text,
  ADD COLUMN IF NOT EXISTS institucional_titulo text;

ALTER TABLE public.construtoras DROP CONSTRAINT IF EXISTS construtoras_institucional_tipo_check;
ALTER TABLE public.construtoras
  ADD CONSTRAINT construtoras_institucional_tipo_check
  CHECK (institucional_tipo IS NULL OR institucional_tipo IN ('pdf', 'link'));

CREATE OR REPLACE FUNCTION public.portal_cliente_pode_ler_apresentacao(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes c
    JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
    JOIN public.apresentacoes a ON a.empreendimento_id = ce.empreendimento_id
    WHERE c.user_id = auth.uid() AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      AND ce.visivel AND coalesce(ce.apresentacao_modo, 'preferida') <> 'nenhuma'
      AND a.cliente_ativo AND a.cliente_tipo = 'pdf' AND a.cliente_pdf_path = p_path
  ) OR EXISTS (
    SELECT 1 FROM public.clientes c
    JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
    JOIN public.empreendimentos e ON e.id = ce.empreendimento_id
    JOIN public.construtoras co ON co.id = e.construtora_id
    WHERE c.user_id = auth.uid() AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      AND ce.visivel AND ce.exibir_institucional_construtora
      AND co.institucional_ativo AND co.institucional_tipo = 'pdf'
      AND co.institucional_pdf_path = p_path
  ) OR EXISTS (
    SELECT 1 FROM public.clientes c
    JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
    CROSS JOIN public.site_configuracoes cfg
    WHERE c.user_id = auth.uid() AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      AND ce.visivel AND ce.exibir_institucional_imobiliaria
      AND cfg.id = 1 AND cfg.imobiliaria_institucional_ativo
      AND cfg.imobiliaria_institucional_tipo = 'pdf'
      AND cfg.imobiliaria_institucional_pdf_path = p_path
  );
$function$;

CREATE OR REPLACE FUNCTION public.portal_cliente_institucionais()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$
SELECT coalesce(jsonb_agg(jsonb_build_object(
  'empreendimento_id', ce.empreendimento_id,
  'institucional_construtora', CASE WHEN ce.exibir_institucional_construtora AND co.institucional_ativo AND co.institucional_tipo IS NOT NULL THEN jsonb_build_object('tipo', co.institucional_tipo, 'titulo', coalesce(nullif(co.institucional_titulo, ''), co.nome || ' · Institucional da construtora'), 'url', CASE WHEN co.institucional_tipo = 'link' THEN co.institucional_link_url ELSE NULL END, 'storage_path', CASE WHEN co.institucional_tipo = 'pdf' THEN co.institucional_pdf_path ELSE NULL END, 'storage_bucket', CASE WHEN co.institucional_tipo = 'pdf' THEN 'cliente-apresentacoes' ELSE NULL END) ELSE NULL END,
  'institucional_imobiliaria', CASE WHEN ce.exibir_institucional_imobiliaria AND cfg.imobiliaria_institucional_ativo AND cfg.imobiliaria_institucional_tipo IS NOT NULL THEN jsonb_build_object('tipo', cfg.imobiliaria_institucional_tipo, 'titulo', coalesce(nullif(cfg.imobiliaria_institucional_titulo, ''), 'Institucional da imobiliária'), 'url', CASE WHEN cfg.imobiliaria_institucional_tipo = 'link' THEN cfg.imobiliaria_institucional_link_url ELSE NULL END, 'storage_path', CASE WHEN cfg.imobiliaria_institucional_tipo = 'pdf' THEN cfg.imobiliaria_institucional_pdf_path ELSE NULL END, 'storage_bucket', CASE WHEN cfg.imobiliaria_institucional_tipo = 'pdf' THEN 'cliente-apresentacoes' ELSE NULL END) ELSE NULL END
) ORDER BY ce.ordem), '[]'::jsonb)
FROM public.clientes c
JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
JOIN public.empreendimentos e ON e.id = ce.empreendimento_id
LEFT JOIN public.construtoras co ON co.id = e.construtora_id
CROSS JOIN public.site_configuracoes cfg
WHERE c.user_id = auth.uid() AND c.acesso_portal AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now()) AND ce.visivel AND cfg.id = 1;
$function$;

REVOKE ALL ON FUNCTION public.portal_cliente_institucionais() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_institucionais() TO authenticated;
NOTIFY pgrst, 'reload schema';

-- Institucionais separados do conteúdo comercial do empreendimento.
ALTER TABLE public.cliente_empreendimentos
  ADD COLUMN IF NOT EXISTS exibir_institucional_construtora boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exibir_institucional_imobiliaria boolean NOT NULL DEFAULT false;

ALTER TABLE public.apresentacoes
  ADD COLUMN IF NOT EXISTS construtora_institucional_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS construtora_institucional_tipo text,
  ADD COLUMN IF NOT EXISTS construtora_institucional_pdf_path text,
  ADD COLUMN IF NOT EXISTS construtora_institucional_link_url text,
  ADD COLUMN IF NOT EXISTS construtora_institucional_titulo text;

ALTER TABLE public.apresentacoes
  DROP CONSTRAINT IF EXISTS apresentacoes_construtora_institucional_tipo_check;
ALTER TABLE public.apresentacoes
  ADD CONSTRAINT apresentacoes_construtora_institucional_tipo_check
  CHECK (construtora_institucional_tipo IS NULL OR construtora_institucional_tipo IN ('pdf', 'link'));

ALTER TABLE public.site_configuracoes
  ADD COLUMN IF NOT EXISTS imobiliaria_institucional_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imobiliaria_institucional_tipo text,
  ADD COLUMN IF NOT EXISTS imobiliaria_institucional_pdf_path text,
  ADD COLUMN IF NOT EXISTS imobiliaria_institucional_link_url text,
  ADD COLUMN IF NOT EXISTS imobiliaria_institucional_titulo text;

ALTER TABLE public.site_configuracoes
  DROP CONSTRAINT IF EXISTS site_configuracoes_imobiliaria_institucional_tipo_check;
ALTER TABLE public.site_configuracoes
  ADD CONSTRAINT site_configuracoes_imobiliaria_institucional_tipo_check
  CHECK (imobiliaria_institucional_tipo IS NULL OR imobiliaria_institucional_tipo IN ('pdf', 'link'));

-- O bucket privado já usado pelos materiais destinados aos clientes também protege os institucionais.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cliente-apresentacoes', 'cliente-apresentacoes', false, 262144000, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 262144000, allowed_mime_types = ARRAY['application/pdf']::text[];

CREATE OR REPLACE FUNCTION public.portal_cliente_pode_ler_apresentacao(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clientes c
    JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
    JOIN public.apresentacoes a ON a.empreendimento_id = ce.empreendimento_id
    WHERE c.user_id = auth.uid()
      AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      AND ce.visivel
      AND coalesce(ce.apresentacao_modo, 'preferida') <> 'nenhuma'
      AND a.cliente_ativo
      AND a.cliente_tipo = 'pdf'
      AND a.cliente_pdf_path = p_path
  )
  OR EXISTS (
    SELECT 1
    FROM public.clientes c
    JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
    JOIN public.apresentacoes a ON a.empreendimento_id = ce.empreendimento_id
    WHERE c.user_id = auth.uid()
      AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      AND ce.visivel
      AND ce.exibir_institucional_construtora
      AND a.construtora_institucional_ativo
      AND a.construtora_institucional_tipo = 'pdf'
      AND a.construtora_institucional_pdf_path = p_path
  )
  OR EXISTS (
    SELECT 1
    FROM public.clientes c
    JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
    CROSS JOIN public.site_configuracoes cfg
    WHERE c.user_id = auth.uid()
      AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      AND ce.cliente_id = c.id
      AND ce.visivel
      AND ce.exibir_institucional_imobiliaria
      AND cfg.id = 1
      AND cfg.imobiliaria_institucional_ativo
      AND cfg.imobiliaria_institucional_tipo = 'pdf'
      AND cfg.imobiliaria_institucional_pdf_path = p_path
  );
$function$;

DROP POLICY IF EXISTS cliente_apresentacoes_portal_select ON storage.objects;
CREATE POLICY cliente_apresentacoes_portal_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cliente-apresentacoes'
  AND public.portal_cliente_pode_ler_apresentacao(storage.objects.name)
);


CREATE OR REPLACE FUNCTION public.portal_cliente_institucionais()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
SELECT coalesce(jsonb_agg(jsonb_build_object(
  'empreendimento_id', ce.empreendimento_id,
  'institucional_construtora', CASE WHEN ce.exibir_institucional_construtora AND a.construtora_institucional_ativo AND a.construtora_institucional_tipo IS NOT NULL THEN jsonb_build_object('tipo', a.construtora_institucional_tipo, 'titulo', coalesce(nullif(a.construtora_institucional_titulo, ''), e.nome || ' · Institucional da construtora'), 'url', CASE WHEN a.construtora_institucional_tipo = 'link' THEN a.construtora_institucional_link_url ELSE NULL END, 'storage_path', CASE WHEN a.construtora_institucional_tipo = 'pdf' THEN a.construtora_institucional_pdf_path ELSE NULL END, 'storage_bucket', CASE WHEN a.construtora_institucional_tipo = 'pdf' THEN 'cliente-apresentacoes' ELSE NULL END) ELSE NULL END,
  'institucional_imobiliaria', CASE WHEN ce.exibir_institucional_imobiliaria AND cfg.imobiliaria_institucional_ativo AND cfg.imobiliaria_institucional_tipo IS NOT NULL THEN jsonb_build_object('tipo', cfg.imobiliaria_institucional_tipo, 'titulo', coalesce(nullif(cfg.imobiliaria_institucional_titulo, ''), 'Institucional da imobiliária'), 'url', CASE WHEN cfg.imobiliaria_institucional_tipo = 'link' THEN cfg.imobiliaria_institucional_link_url ELSE NULL END, 'storage_path', CASE WHEN cfg.imobiliaria_institucional_tipo = 'pdf' THEN cfg.imobiliaria_institucional_pdf_path ELSE NULL END, 'storage_bucket', CASE WHEN cfg.imobiliaria_institucional_tipo = 'pdf' THEN 'cliente-apresentacoes' ELSE NULL END) ELSE NULL END
) ORDER BY ce.ordem), '[]'::jsonb)
FROM public.clientes c
JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
JOIN public.empreendimentos e ON e.id = ce.empreendimento_id
LEFT JOIN public.apresentacoes a ON a.empreendimento_id = e.id
CROSS JOIN public.site_configuracoes cfg
WHERE c.user_id = auth.uid() AND c.acesso_portal AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now()) AND ce.visivel AND cfg.id = 1;
$function$;

REVOKE ALL ON FUNCTION public.portal_cliente_institucionais() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_institucionais() TO authenticated;
NOTIFY pgrst, 'reload schema';

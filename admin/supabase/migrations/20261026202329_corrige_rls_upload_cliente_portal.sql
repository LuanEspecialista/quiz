CREATE OR REPLACE FUNCTION public.cliente_portal_pode_enviar_documentos_proposta()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.user_id = (SELECT auth.uid())
      AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  );
$function$;

REVOKE ALL ON FUNCTION public.cliente_portal_pode_enviar_documentos_proposta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_portal_pode_enviar_documentos_proposta() TO authenticated;

DROP POLICY IF EXISTS cliente_propostas_documentos_proprio_insert ON storage.objects;

CREATE POLICY cliente_propostas_documentos_proprio_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cliente-propostas'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (storage.foldername(name))[3] IN (
    'identificacao', 'comprovante_residencia', 'certidao_casamento', 'identificacao_conjuge'
  )
  AND name ~* E'\\.(pdf|jpe?g|png|webp)$'
  AND public.cliente_portal_pode_enviar_documentos_proposta()
);

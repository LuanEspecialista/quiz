revoke execute on function public.solicitar_acesso(text,text,text) from anon,authenticated;
revoke execute on function public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text) from anon;
grant execute on function public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text) to authenticated;

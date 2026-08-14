# Implantação de acesso, idiomas e PTAX

1. Execute `migrations/20260813_acesso_idiomas_cambio.sql` no SQL Editor.
2. Promova o primeiro usuário administrativo (substitua o e-mail):

```sql
insert into public.perfis_usuario (user_id, perfil, ativo)
select id, 'admin', true from auth.users where email = 'ADMIN@EXEMPLO.COM'
on conflict (user_id) do update set perfil = 'admin', ativo = true;
```

3. Publique a função: `supabase functions deploy atualizar-ptax`.
4. Crie o segredo `CRON_SECRET` e agende uma chamada diária à função com o cabeçalho `x-cron-secret`. Uma execução diária após o fechamento da PTAX é suficiente.

A função consulta os dez dias anteriores e grava a última cotação válida. Se o Banco Central estiver indisponível, ela não apaga nem substitui dados: a view `cotacao_usd_brl_atual` continua devolvendo a última cotação persistida. A cotação manual configurada no admin tem precedência enquanto estiver preenchida.

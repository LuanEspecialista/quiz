# Auditoria e limpeza do Playbook — playbook-v2

Data: 2026-11-02
Branch: `playbook-v2`
Projeto Supabase: `kdwvbkxucwdvuoknotkb`

## Escopo auditado

A rota administrativa `?tab=playbook` é controlada por `admin/src/pages/Dashboard.tsx`. O módulo anterior era carregado por importação lazy e renderizado somente para usuários que não são afiliados. O item de menu é definido em `admin/src/components/layout/Sidebar.tsx`.

## Arquivos envolvidos

- `admin/src/pages/modules/Playbook.tsx`: UI principal do Playbook, dados de contexto comercial, mapa de funil de sete etapas, modos de canal/tom/situação e persistência de clientes/interações.
- `admin/src/pages/modules/EspecialistaKnowledge.tsx`: componente acoplado exclusivamente ao Playbook, com as fichas “Carros e motores”, “Cafés e gastronomia”, “Joias e diamantes” e “Geografia e viagens”, além dos modos “Entender”, “Revisar” e “Testar”.
- `admin/src/pages/Dashboard.tsx`: importação lazy e roteamento da aba `playbook`; agora mantém a rota com tela provisória.
- `admin/src/components/layout/Sidebar.tsx`: item compartilhado do menu “Playbook”; foi mantido para preservar a navegação.
- `admin/src/lib/supabase.ts`: cliente Supabase compartilhado; foi mantido.
- `admin/public/especialista/carros-eletrico.jpg`, `cafes-metodos.jpg` e `joias-diamantes.jpg`: assets usados pelo componente de conhecimento; permanecem no acervo até a reconstrução definir seu destino.

## Banco e integrações encontradas

O Playbook anterior lia/escrevia diretamente:

- `public.clientes`: busca por e-mail, telefone ou WhatsApp; criação/atualização do cadastro oficial.
- `public.playbook_interacoes`: inserção do resumo da conversa e do próximo passo, ligado a `cliente_id`.
- `public.playbook_leads`: não era acessada diretamente por `Playbook.tsx`; era usada pelo Dashboard para a métrica de solicitações vindas do site e pelo módulo Clientes para listar leads públicos.

RPCs usados diretamente pelo Playbook: nenhum.

RPC compartilhado relacionado ao menu: `salvar_menu_ordem`, usado pelo Sidebar para persistir a ordem dos itens; não foi alterado.

As tabelas não foram alteradas, apagadas ou migradas.

## Dados e lógica removidos do front

Foram removidos o estado, as fichas, os textos de abordagem, os canais, tons, situações, sete etapas do funil, modos de estudo e a rotina de persistência pertencentes exclusivamente à UI antiga. O menu continua visível e `?tab=playbook` abre a tela provisória “Playbook em reconstrução”.

## Arquivos removidos

- `admin/src/pages/modules/Playbook.tsx`
- `admin/src/pages/modules/EspecialistaKnowledge.tsx`

## Backup

O backup foi feito antes da limpeza, por consulta somente leitura e paginação com limite explícito:

- `/backups/playbook_leads_20261102.json` — 0 linhas
- `/backups/playbook_interacoes_20261102.json` — 0 linhas
- `/backups/playbook_backup_manifest_20261102.json`

A consulta confirmou 0 linhas em `public.playbook_leads` e 0 linhas em `public.playbook_interacoes` no projeto autorizado. O campo `database_mutated` do manifesto é `false`.

## Validação

- `npm run build --prefix admin`: aprovado.
- `node`/TypeScript: aprovado.
- `git diff --check`: aprovado.
- Avisos não bloqueantes do build: chunk principal acima de 500 kB e importação dinâmica/estática de `MinhaConta.tsx`, ambos fora do escopo desta limpeza.

# Tarefa 2 — Playbook em Modo Ligação

## Objetivo
Reconstruir a aba Playbook como uma ferramenta mobile-first para conduzir ligações em tempo real, usando o tema escuro/dourado existente, sem IA externa e sem alterar dados durante testes.

## Implementação
- Criar `admin/src/pages/modules/ModoLigacao.tsx` como módulo isolado.
- Manter as cinco abas: Ao vivo funcional; Especialista, Objeções, Praças e Construtoras como placeholders.
- Usar estado local tipado para descoberta, persistência automática em `localStorage` com debounce e resumo estruturado no encerramento.
- Buscar clientes e `playbook_leads` para seleção opcional; permitir ligação rápida sem cadastro.
- Aplicar regras determinísticas de sugestão por etapa e campos vazios.
- Integrar o atalho “Ver unidades compatíveis” ao callback do Dashboard e aos filtros já aceitos por `UnidadesModule`.
- Criar migration aditiva para `playbook_leads.descoberta jsonb` e `encerrada_em timestamptz`; não aplicar a migration sem aprovação explícita.

## Design
**Movimento:** console editorial de atendimento premium, com leitura rápida e controles de baixa fricção.

**Princípios:** toque antes de digitação; hierarquia clara; estados visíveis; conteúdo compacto para uso durante conversa.

**Paleta:** preservar preto, superfícies elevadas, dourado de ação e cinzas do painel atual. O dourado indica avanço, não urgência artificial.

**Layout:** desktop em três colunas; mobile em sub-abas fixas Descobrir/Agir/Consultar, com ação de objeção sempre acessível.

**Interação:** chips e toggles para registrar sinais; debounce no rascunho; encerramento em modal com resumo copiável e próxima ação.

**Tipografia:** sistema já utilizado pelo admin, títulos compactos e metadados em caixa alta discreta.

## Banco
A migration é somente arquivo para revisão. A UI informa que o salvamento completo depende da aplicação da migration caso a coluna nova ainda não exista.

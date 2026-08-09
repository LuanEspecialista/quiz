# CENTRAL DE CONVERSÃO
## Luan Especialista

---

# OBJETIVO

Criar uma central de inteligência comercial para converter qualquer interessado em uma reunião presencial ou Google Meet.

A ferramenta será utilizada durante:

- Ligações
- WhatsApp
- Atendimento presencial
- Reuniões online

Toda navegação ocorrerá em UMA ÚNICA PÁGINA.

Nunca haverá troca de páginas.

---

# VISUAL

Visual Premium.

Minimalista.

Muito espaço em branco.

Preto.

Cinza escuro.

Dourado discreto.

Inspirado em:

- Apple
- Porsche
- Notion
- Linear
- Stripe

Não utilizar aparência de CRM.

Não utilizar aparência de sistema administrativo.

---

# FLUXO

Página abre

↓

Carrega construtoras.json

↓

Cria os botões das construtoras

↓

Usuário seleciona uma construtora

↓

Cria automaticamente os botões dos empreendimentos

↓

Usuário seleciona um empreendimento

↓

Carrega dados.json

↓

Carrega playbook.json

↓

Atualiza toda a tela

↓

Usuário troca entre:

Ligação

WhatsApp

Objeções

Fechamento

↓

Atualiza somente o conteúdo

Nunca recarrega a página.

---

# ESTRUTURA

call/

index.html

assets/

css/style.css

js/app.js

components/

header.html

footer.html

sidebar.html

tabs.html

script-section.html

data/

construtoras.json

construtoras/

{construtora}/

{empreendimento}/

dados.json

playbook.json

---

# LAYOUT

LOGO

CENTRAL DE CONVERSÃO

Campo de pesquisa

Botões das construtoras

Botões dos empreendimentos

Workspace

Sidebar

Conteúdo

Botão copiar

Fim.

---

# SIDEBAR

Ligação

WhatsApp

Objeções

Fechamento

Perguntas Frequentes

Próximos Passos

---

# COMPONENTES

Logo

Hero

Pesquisa

Construtoras

Empreendimentos

Sidebar

Card

Botão Copiar

---

# APP.JS

Possuir somente estes módulos

init()

carregarConstrutoras()

renderConstrutoras()

selecionarConstrutora()

renderEmpreendimentos()

selecionarEmpreendimento()

carregarDados()

carregarPlaybook()

renderSidebar()

renderConteudo()

copiarTexto()

pesquisar()

---

# STYLE.CSS

Reset

Variáveis

Background

Hero

Pesquisa

Chips

Workspace

Sidebar

Card

Botões

Responsivo

---

# REGRAS

Nunca criar outra página.

Nunca criar outro CSS.

Nunca criar outro JS.

Nunca alterar estrutura de pastas.

Toda expansão ocorrerá apenas adicionando novas construtoras e novos empreendimentos.

O sistema deve funcionar automaticamente ao adicionar novos dados.

Esta arquitetura está CONGELADA.

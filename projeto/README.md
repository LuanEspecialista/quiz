# Plataforma de Estratégia Patrimonial — Luan Especialista

Bem-vindo ao repositório oficial da **Plataforma de Estratégia Patrimonial — Luan Especialista**. 

Esta é uma aplicação premium, modular e escalável, projetada especificamente para estruturar e validar as melhores jornadas de investimentos dos clientes através de cartas de crédito, home equity, simulações financeiras e desenvolvimento imobiliário estratégico no Litoral Norte de Santa Catarina.

## 🚀 Arquitetura Geral

O projeto foi construído seguindo os padrões SOLID de engenharia de software, dividindo-se entre:
* **Módulos de Negócio (`src/modules/`)**: Domínio específico das regras (dashboard, comparadores, relatórios, cms, etc).
* **Design System (`src/components/`)**: Catálogo estruturado de componentes altamente reutilizáveis e isolados visando consistência visual de padrão internacional (Apple, Stripe).
* **Motor de Cálculos (`src/services/motorFinanceiro.js`)**: O coração matemático responsável por calcular indicadores de performance (TIR, MOIC, Cap Rate, ROI, VPL).

## 📁 Primeiros Passos

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

Para mais detalhes operacionais, consulte os documentos localizados na pasta `docs/`.

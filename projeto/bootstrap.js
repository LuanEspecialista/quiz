/**
 * Plataforma de Estratégia Patrimonial — Luan Especialista
 * script: bootstrap.js (Versão Corrigida para rodar diretamente na raiz)
 */

const fs = require('fs');
const path = require('path');

// ==========================================
// 1. CONFIGURAÇÕES & ESTRUTURAS DE DADOS
// ==========================================

// ALTERADO: Agora aponta para a pasta atual (não cria uma subpasta "projeto")
const ROOT_DIR = __dirname;

// Lista de documentos técnicos para a pasta docs/
const STRATEGIC_DOCS = [
  { file: '00-Arquitetura-Master.md', title: '00 — ARQUITETURA MASTER DO PROJETO' },
  { file: '01-Design-System.md', title: '01 — DESIGN SYSTEM OFICIAL' },
  { file: '02-UX.md', title: '02 — ARQUITETURA UX DA PLATAFORMA' },
  { file: '03-Pagina.md', title: '03 — PÁGINA PRINCIPAL (ANÁLISE PATRIMONIAL)' },
  { file: '04-Dashboard.md', title: '04 — DASHBOARD ESTRATÉGIA PATRIMONIAL' },
  { file: '05-MotorFinanceiro.md', title: '05 — MOTOR FINANCEIRO E REGRAS DE CÁLCULO' },
  { file: '06-Banco.md', title: '06 — BANCO DE DADOS E MODELO DE DADOS' },
  { file: '07-Painel.md', title: '07 — PAINEL ADMINISTRATIVO' },
  { file: '08-API.md', title: '08 — API, ARQUITETURA E COMUNICAÇÃO ENTRE MÓDULOS' },
  { file: '09-Frontend.md', title: '09 — FRONTEND, COMPONENTES E DESIGN SYSTEM' },
  { file: '10-Personalizacao.md', title: '10 — MOTOR DE PERSONALIZAÇÃO E EXPERIÊNCIA DO CLIENTE' },
  { file: '11-Indicadores.md', title: '11 — DASHBOARD FINANCEIRO E INDICADORES PATRIMONIAIS' },
  { file: '12-Comparador.md', title: '12 — MOTOR DE COMPARAÇÃO INTELIGENTE' },
  { file: '13-Cidades.md', title: '13 — MÓDULO DE CIDADES E VALORIZAÇÃO REGIONAL' },
  { file: '14-Empreendimentos.md', title: '14 — MÓDULO DE EMPREENDIMENTOS E APRESENTAÇÃO PERSUASIVA' },
  { file: '15-Simulador.md', title: '15 — MOTOR DE SIMULAÇÃO PATRIMONIAL E PLANEJAMENTO FINANCEIRO' },
  { file: '16-Calculos.md', title: '16 — MOTOR DE CÁCULOS FINANCEIROS E REGRAS DE NEGÓCIO' },
  { file: '17-Relatorios.md', title: '17 — RELATÓRIOS, PDF, EXPORTAÇÃO E COMPARTILHAMENTO' },
  { file: '18-Performance.md', title: '18 — SEGURANÇA, PERFORMANCE, SEO E ESCALABILIDADE' },
  { file: '19-Roadmap.md', title: '19 — ROADMAP, EVOLUÇÃO E VISÃO DE FUTURO' },
  { file: '20-CMS.md', title: '20 — PAINEL ADMINISTRATIVO (CMS) E ESTRUTURA DOS DADOS' },
  { file: '21-Arquitetura.md', title: '21 — ARQUITETURA TÉCNICA, ESTRUTURA DE PASTAS E ORGANIZAÇÃO DO PROJETO' },
  { file: '22-UI.md', title: '22 — DESIGN SYSTEM (UI/UX), COMPONENTES E PADRONIZAÇÃO VISUAL' },
  { file: '23-KPIs.md', title: '23 — DASHBOARD INTELIGENTE, KPIs E INDICADORES PATRIMONIAIS' },
  { file: '24-ManualIA.md', title: '24 — MANUAL DA IA DESENVOLVEDORA (REGRAS MESTRAS DO PROJETO)' },
  { file: '25-DocumentoMestre.md', title: '25 — DOCUMENTO MESTRE DE INTEGRAÇÃO' },
  { file: '26-Matematica.md', title: '26 — MOTOR FINANCEIRO (ESPECIFICAÇÃO MATEMÁTICA)' },
  { file: '27-IntegracaoSite.md', title: '27 — INTEGRAÇÃO COM O SITE OFICIAL' }
];

// Módulos de negócio da aplicação
const APPLICATION_MODULES = [
  'auth', 'cliente', 'cidade', 'empreendimento', 'dashboard', 'financeiro',
  'comparador', 'simulador', 'relatorios', 'cms', 'configuracoes', 'projeto',
  'usuario', 'pdf'
];

// Arquivos padrão para cada módulo
const MODULE_FILES = [
  'index.js', 'controller.js', 'service.js', 'styles.css',
  'routes.js', 'types.js', 'constants.js', 'hooks.js', 'utils.js'
];

// Componentes reutilizáveis do Design System
const COMPONENTS = [
  'Button', 'Card', 'Tooltip', 'Modal', 'Accordion', 'Tabs', 'Input', 'Select',
  'Checkbox', 'Radio', 'Header', 'Footer', 'Sidebar', 'Navbar', 'Hero', 'Badge',
  'Toast', 'Skeleton', 'Carousel', 'Timeline', 'Table', 'Chart', 'Gauge', 'KPI',
  'MetricCard', 'Loading', 'Breadcrumb', 'Avatar', 'Map', 'Gallery', 'ImageViewer'
];

// Arquivos padrão para cada componente
const COMPONENT_FILES = [
  'index.js', 'styles.css', '.test.js'
];

// Cidades foco de atuação
const CITIES = [
  'balneario-picarras', 'penha', 'barra-velha', 'navegantes', 'itajai',
  'balneario-camboriu', 'joinville', 'sao-bento-do-sul'
];

// Cidades com empreendimentos cadastrados inicialmente
const ENTERPRISE_CITIES = [
  'balneario-picarras', 'penha', 'barra-velha', 'itajai', 'navegantes'
];

// ==========================================
// 2. MAPA ARQUITETURAL COMPLETO DO PROJETO
// ==========================================

const projectTree = {
  // Configurações do GitHub e VS Code
  '.github': {
    'workflows': {
      '.gitkeep': ''
    }
  },
  '.vscode': {
    'settings.json': JSON.stringify({
      "editor.tabSize": 2,
      "editor.formatOnSave": true,
      "editor.defaultFormatter": "esbenp.prettier-vscode",
      "javascript.format.enable": true
    }, null, 2),
    'extensions.json': JSON.stringify({
      "recommendations": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "christian-kohler.path-intellisense"
      ]
    }, null, 2)
  },

  // Documentação técnica do projeto
  'docs': {},

  // Banco de Dados estruturado
  'database': {
    'schemas': { '.gitkeep': '' },
    'migrations': { '.gitkeep': '' },
    'seeds': { '.gitkeep': '' },
    'backup': { '.gitkeep': '' },
    'logs': { '.gitkeep': '' }
  },

  // Configurações globais do sistema
  'config': {
    'env': { '.gitkeep': '' },
    'constants': { '.gitkeep': '' },
    'themes': { '.gitkeep': '' },
    'permissions': { '.gitkeep': '' }
  },

  // Scripts operacionais, automações e migrations
  'scripts': {
    'deploy': { '.gitkeep': '' },
    'backup': { '.gitkeep': '' },
    'maintenance': { '.gitkeep': '' },
    'generator': { '.gitkeep': '' }
  },

  // Testes automatizados por nível
  'tests': {
    'unit': { '.gitkeep': '' },
    'integration': { '.gitkeep': '' },
    'e2e': { '.gitkeep': '' }
  },

  // Arquivos estáticos e mídias do site e sistema
  'public': {
    'favicon.ico': '',
    'index.html': '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8">\n  <title>Plataforma de Estratégia Patrimonial</title>\n</head>\n<body>\n  <div id="app"></div>\n</body>\n</html>'
  },

  // Código Fonte Principal
  'src': {
    'app': { '.gitkeep': '' },
    'routes': { '.gitkeep': '' },
    'utils': { '.gitkeep': '' },
    'types': { '.gitkeep': '' },
    'styles': { '.gitkeep': '' },
    'layouts': { '.gitkeep': '' },
    'pages': { '.gitkeep': '' },
    'context': { '.gitkeep': '' },
    'hooks': { '.gitkeep': '' },
    'constants': { '.gitkeep': '' },

    // Estrutura de API Interna (Node.js/Express)
    'api': {
      'controllers': { '.gitkeep': '' },
      'routes': { '.gitkeep': '' },
      'middlewares': { '.gitkeep': '' },
      'models': { '.gitkeep': '' },
      'services': { '.gitkeep': '' },
      'validators': { '.gitkeep': '' }
    },

    // Serviços integrados
    'services': {
      'api.js': '// Serviço de integração com API\n',
      'motorFinanceiro.js': '// Motor financeiro unificado\n'
    },

    // Funções e formatadores compartilhados (Shared)
    'shared': {
      'helpers': { '.gitkeep': '' },
      'functions': { '.gitkeep': '' },
      'formatters': { '.gitkeep': '' },
      'calculations': { '.gitkeep': '' },
      'validators': { '.gitkeep': '' }
    },

    // Ativos de mídia e design
    'assets': {
      'logos': { '.gitkeep': '' },
      'icones': { '.gitkeep': '' },
      'fonts': { '.gitkeep': '' },
      'videos': { '.gitkeep': '' },
      'documentos': { '.gitkeep': '' },
      'ui': { '.gitkeep': '' },
      'imagens': {
        'backgrounds': { '.gitkeep': '' },
        'dashboard': { '.gitkeep': '' },
        'cidades': {},
        'empreendimentos': {}
      }
    },

    // Componentes isolados do Design System
    'components': {},

    // Módulos de domínio
    'modules': {}
  }
};

// ==========================================
// 3. ENGENHARIA DE GERAÇÃO DINÂMICA
// ==========================================

// Preenchendo Documentos Técnicos na árvore
STRATEGIC_DOCS.forEach(doc => {
  projectTree['docs'][doc.file] = `# ${doc.title}\n\nEste documento detalha as diretrizes e regras de negócio da Plataforma de Estratégia Patrimonial — Luan Especialista.\n`;
});

// Preenchendo Módulos
APPLICATION_MODULES.forEach(moduleName => {
  const modObj = {};
  MODULE_FILES.forEach(file => {
    modObj[file] = `// Módulo: ${moduleName} - ${file}\n`;
  });
  projectTree['src']['modules'][moduleName] = modObj;
});

// Preenchendo Componentes do Design System
COMPONENTS.forEach(comp => {
  const compObj = {};
  COMPONENT_FILES.forEach(file => {
    if (file === 'styles.css') {
      compObj[file] = `/* Estilos do componente premium ${comp} */\n`;
    } else {
      compObj[file] = `// Componente: ${comp} - ${file}\n`;
    }
  });
  projectTree['src']['components'][comp] = compObj;
});

// Preenchendo Cidades (Imagens)
CITIES.forEach(city => {
  projectTree['src']['assets']['imagens']['cidades'][city] = {};
});

// Preenchendo Empreendimentos (Imagens)
ENTERPRISE_CITIES.forEach(city => {
  projectTree['src']['assets']['imagens']['empreendimentos'][city] = {};
});

// ==========================================
// 4. FUNÇÕES AUXILIARES DE ESCRITA & CRIAÇÃO
// ==========================================

function getReadmeTemplate(dirName, currentPath) {
  const normalizedPath = currentPath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('src/modules/')) {
    const docRelacionado = normalizedPath.includes('dashboard') ? '11-Indicadores.md' : 
                           normalizedPath.includes('financeiro') ? '05-MotorFinanceiro.md' : 
                           normalizedPath.includes('cidade') ? '13-Cidades.md' : 
                           normalizedPath.includes('empreendimento') ? '14-Empreendimentos.md' : 
                           normalizedPath.includes('cms') ? '20-CMS.md' : '00-Arquitetura-Master.md';

    return `# Módulo: ${dirName.toUpperCase()}

Esta pasta pertence ao módulo de negócio **${dirName}** da Plataforma de Estratégia Patrimonial.

### Documentação Técnica Relacionada:
Consulte o arquivo correspondente em: \`docs/${docRelacionado}\`.
`;
  }

  if (normalizedPath.includes('src/components/')) {
    return `# Componente: ${dirName}

Este componente faz parte do catálogo oficial do **Design System Premium** da Plataforma.

### Diretrizes de UI/UX:
Consulte a documentação em: \`docs/01-Design-System.md\` e \`docs/22-UI.md\`.
`;
  }

  if (normalizedPath.includes('imagens/cidades/')) {
    return `# Cidade: ${dirName}

Pasta de ativos de imagem e mídias exclusivas de inteligência urbana e regional do município de **${dirName}**.

### Tese Comercial:
Consulte o dossiê regional em: \`docs/13-Cidades.md\`.
`;
  }

  if (normalizedPath.includes('imagens/empreendimentos/')) {
    return `# Empreendimentos: ${dirName}

Repositório de renderizações, plantas estruturais, mockups e tabelas de vendas dos empreendimentos localizados na cidade de **${dirName}**.
 
### Tese de Investimento:
Consulte o motor de persuasão em: \`docs/14-Empreendimentos.md\`.
`;
  }

  return `# ${dirName.toUpperCase()}

Diretório estrutural pertencente ao ecossistema da **Plataforma de Estratégia Patrimonial — Luan Especialista**.
`;
}

function buildTree(basePath, obj) {
  Object.keys(obj).forEach(key => {
    const currentPath = path.join(basePath, key);
    const value = obj[key];

    if (typeof value === 'object' && value !== null) {
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
        console.log(`📁 Criado: ${path.relative(ROOT_DIR, currentPath)}`);
      }

      const readmePath = path.join(currentPath, 'README.md');
      if (!fs.existsSync(readmePath)) {
        const relative = path.relative(ROOT_DIR, currentPath);
        fs.writeFileSync(readmePath, getReadmeTemplate(key, relative));
      }

      buildTree(currentPath, value);
    } else {
      if (!fs.existsSync(currentPath)) {
        fs.writeFileSync(currentPath, value);
        console.log(`📄 Criado: ${path.relative(ROOT_DIR, currentPath)}`);
      }
    }
  });
}

// ==========================================
// 5. GERAÇÃO DE ARQUIVOS DE CONFIGURAÇÃO RAIZ
// ==========================================

const packageJsonContent = JSON.stringify({
  "name": "plataforma-estrategia-patrimonial-luan-especialista",
  "version": "2.0.0",
  "description": "Plataforma de modelagem patrimonial inteligente, simulação financeira e tese regional premium.",
  "private": true,
  "main": "src/app/index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "lint": "eslint src/**/*.js"
  },
  "keywords": [
    "embracon",
    "consorcio",
    "home equity",
    "carta de credito",
    "investimento",
    "litoral-norte-sc"
  ],
  "author": "Luan Especialista",
  "license": "MIT",
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "vite": "^5.0.0"
  }
}, null, 2);

const gitignoreContent = `# Logs
logs
*.log
npm-debug.log*

# Dependências do Node
node_modules/

# Builds e Distribuição
dist/
build/

# IDEs e Editores
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.DS_Store

# Variáveis de Ambiente
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
`;

const editorconfigContent = `root = true

[*]
indent_style = space
indent_size = 2
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
end_of_line = lf

[*.md]
trim_trailing_whitespace = false
`;

const prettierrcContent = JSON.stringify({
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}, null, 2);

const eslintrcContent = JSON.stringify({
  "env": {
    "browser": true,
    "es2021": true,
    "node": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "no-unused-vars": "warn",
    "no-console": "off"
  }
}, null, 2);

const viteConfigContent = `import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
`;

const licenseContent = `MIT License

Copyright (c) 2026 Luan Especialista

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
`;

const mainReadmeContent = `# Plataforma de Estratégia Patrimonial — Luan Especialista

Bem-vindo ao repositório oficial da **Plataforma de Estratégia Patrimonial — Luan Especialista**. 

Esta é uma aplicação premium, modular e escalável, projetada especificamente para estruturar e validar as melhores jornadas de investimentos dos clientes através de cartas de crédito, home equity, simulações financeiras e desenvolvimento imobiliário estratégico no Litoral Norte de Santa Catarina.

## 🚀 Arquitetura Geral

O projeto foi construído seguindo os padrões SOLID de engenharia de software, dividindo-se entre:
* **Módulos de Negócio (\`src/modules/\`)**: Domínio específico das regras (dashboard, comparadores, relatórios, cms, etc).
* **Design System (\`src/components/\`)**: Catálogo estruturado de componentes altamente reutilizáveis e isolados visando consistência visual de padrão internacional (Apple, Stripe).
* **Motor de Cálculos (\`src/services/motorFinanceiro.js\`)**: O coração matemático responsável por calcular indicadores de performance (TIR, MOIC, Cap Rate, ROI, VPL).

## 📁 Primeiros Passos

1. Instale as dependências:
   \`\`\`bash
   npm install
   \`\`\`
2. Inicie o servidor de desenvolvimento:
   \`\`\`bash
   npm run dev
   \`\`\`

Para mais detalhes operacionais, consulte os documentos localizados na pasta \`docs/\`.
`;

// ==========================================
// 6. EXECUÇÃO DO BOOTSTRAP (FLUXO PRINCIPAL)
// ==========================================

console.log('====== INICIANDO BOOTSTRAP DA PLATAFORMA ======');

// Criação recursiva diretamente no diretório atual
buildTree(ROOT_DIR, projectTree);

// Criação dos arquivos de configuração diretamente na raiz atual
const rootFiles = [
  { name: 'package.json', content: packageJsonContent },
  { name: '.gitignore', content: gitignoreContent },
  { name: '.editorconfig', content: editorconfigContent },
  { name: '.prettierrc', content: prettierrcContent },
  { name: '.eslintrc', content: eslintrcContent },
  { name: 'vite.config.js', content: viteConfigContent },
  { name: 'LICENSE', content: licenseContent },
  { name: 'README.md', content: mainReadmeContent }
];

rootFiles.forEach(file => {
  const filePath = path.join(ROOT_DIR, file.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
    console.log(`📄 Criado na raiz: ${file.name}`);
  }
});

console.log('====== BOOTSTRAP CONCLUÍDO COM SUCESSO! ======');
console.log('Sua plataforma de estratégia patrimonial está configurada diretamente nesta pasta!');
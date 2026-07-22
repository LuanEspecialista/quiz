const CIDADES = [
    { id: 'penha', nome: 'Penha' },
    { id: 'balneario-picarras', nome: 'Balneário Piçarras' },
    { id: 'barra-velha', nome: 'Barra Velha' },
    { id: 'navegantes', nome: 'Navegantes' }
];

const CONSTRUTORAS = [
    { id: 'inbrasul', nome: 'Inbrasul Empreendimentos' },
    { id: 'j-souza', nome: 'Grupo J Souza' },
    { id: 'santer', nome: 'Santer Empreendimentos' },
    { id: 'cp8', nome: 'CP8 Empreendimentos' },
    { id: 'lancre', nome: "L'Ancrê Empreendimentos" },
    { id: 'sbj', nome: 'SBJ Construtora' },
    { id: 'wg', nome: 'WG Construtora' },
    { id: 'roll', nome: 'Roll Empreendimentos' },
    { id: 'ejm', nome: 'EJM Empreendimentos' },
    { id: 'bertoldi', nome: 'Bertoldi Construtora' }
];

const EMPREENDIMENTOS = [
    { id: 'pinna', nome: 'Pinna Studios', construtoraId: 'wg', cidadeId: 'penha', tabelaId: 'tabela-pinna', orientacao: 'horizontal' },
    { id: 'azure', nome: 'Azure Palm Club', construtoraId: 'inbrasul', cidadeId: 'penha', tabelaId: 'tabela-azure', orientacao: 'horizontal' },
    { 
        id: 'barra-view', 
        nome: 'Barra View Residences', 
        construtoraId: 'santer', 
        cidadeId: 'barra-velha', 
        orientacao: 'horizontal',
        tabelaId: [
            { nome: 'Tabela Torre 1', arquivo: 'tabela-barra-view-torre1' },
            { nome: 'Tabela Torre 2', arquivo: 'tabela-barra-view-torre2' }
        ] 
    },
    { id: 'distintto', nome: 'Distintto', construtoraId: 'cp8', cidadeId: 'balneario-picarras', tabelaId: 'tabela-distintto', orientacao: 'horizontal' },
    { id: 'grand-trianon', nome: 'Grand Trianon Residence', construtoraId: 'lancre', cidadeId: 'balneario-picarras', tabelaId: 'tabela-grand-trianon', orientacao: 'horizontal' },
    { id: 'ilha-de-capri', nome: 'Residencial Ilha de Capri', construtoraId: 'sbj', cidadeId: 'penha', tabelaId: 'tabela-ilha-de-capri', orientacao: 'vertical' },
    { id: 'kairos', nome: 'Kairós', construtoraId: 'cp8', cidadeId: 'balneario-picarras', tabelaId: 'tabela-kairos', orientacao: 'horizontal' },
    { id: 'orla-da-barra', nome: 'Orla da Barra', construtoraId: 'santer', cidadeId: 'barra-velha', tabelaId: 'tabela-orla-da-barra', orientacao: 'horizontal' },
    { id: 'poema', nome: 'Poema', construtoraId: 'roll', cidadeId: 'balneario-picarras', tabelaId: 'tabela-poema', orientacao: 'horizontal' },
    { id: 'skyline', nome: 'Skyline Living', construtoraId: 'ejm', cidadeId: 'penha', tabelaId: 'tabela-skyline', orientacao: 'horizontal' },
    { 
        id: 'zaya', 
        nome: 'Zaya Home Resort', 
        construtoraId: 'bertoldi', 
        cidadeId: 'penha', 
        orientacao: 'horizontal',
        tabelaId: [
            { nome: 'Torre 1', arquivo: 'tabela-zaya-torre1' },
            { nome: 'Torre 2', arquivo: 'tabela-zaya-torre2' },
            { nome: 'Torre 3', arquivo: 'tabela-zaya-torre3' },
            { nome: 'Torre 4', arquivo: 'tabela-zaya-torre4' }
        ] 
    },
    { id: 'zuri', nome: 'Zuri Park Studios', construtoraId: 'j-souza', cidadeId: 'penha', tabelaId: 'tabela-zuri', orientacao: 'vertical' }
];
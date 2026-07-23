const SUPABASE_URL = 'https://kdwvbkxucwdvuoknotkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3Zia3h1Y3dkdnVva25vdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzYzMDQsImV4cCI6MjA5OTcxMjMwNH0.SQJ2gOYYPIwhrKOxt6BU_VIoOTdagQxCbC8EdKZGZm8';

let supabaseClient = null;
let CIDADES = [];
let CONSTRUTORAS = [];
let EMPREENDIMENTOS = [];

async function carregarDadosDoSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('Biblioteca do Supabase não foi carregada no HTML!');
            return;
        }

        if (!supabaseClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        const [resCidades, resConstrutoras, resEmpreendimentos] = await Promise.all([
            supabaseClient.from('cidades').select('*'),
            supabaseClient.from('construtoras').select('*'),
            supabaseClient.from('empreendimentos').select('*')
        ]);

        if (resCidades.error) console.error('Erro Cidades:', resCidades.error);
        if (resConstrutoras.error) console.error('Erro Construtoras:', resConstrutoras.error);
        if (resEmpreendimentos.error) console.error('Erro Empreendimentos:', resEmpreendimentos.error);

        CIDADES = resCidades.data || [];
        CONSTRUTORAS = resConstrutoras.data || [];
        
        EMPREENDIMENTOS = (resEmpreendimentos.data || []).map(emp => ({
            id: emp.id,
            nome: emp.nome,
            cidadeId: emp.cidade_id,
            construtoraId: emp.construtora_id,
            orientacao: emp.orientacao,
            pdfApresentacao: emp.pdf_apresentacao_url,
            tabelaId: emp.tabelas_multiplas || emp.pdf_tabela_url
        }));

        console.log('Dados do Supabase carregados com sucesso:', { CIDADES, CONSTRUTORAS, EMPREENDIMENTOS });

        // Dispara o evento e também chama a função global de renderizar se existir
        window.dispatchEvent(new Event('dadosCarregados'));
        if (typeof window.inicializarFiltros === 'function') {
            window.inicializarFiltros();
        }
    } catch (err) {
        console.error('Erro ao conectar no Supabase:', err);
    }
}

document.addEventListener('DOMContentLoaded', carregarDadosDoSupabase);

const SUPABASE_URL = 'https://kdwvbkxucwdvuoknotkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3Zia3h1Y3dkdnVva25vdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzYzMDQsImV4cCI6MjA5OTcxMjMwNH0.SQJ2gOYYPIwhrKOxt6BU_VIoOTdagQxCbC8EdKZGZm8';

let supabaseClient = null;
let CIDADES = [];
let CONSTRUTORAS = [];
let EMPREENDIMENTOS = [];

async function carregarDadosDoSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('Biblioteca do Supabase não foi carregada no HTML!');
            return;
        }

        if (!supabaseClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        const [resCidades, resConstrutoras, resEmpreendimentos] = await Promise.all([
            supabaseClient.from('cidades').select('*'),
            supabaseClient.from('construtoras').select('*'),
            supabaseClient.from('empreendimentos').select('*')
        ]);

        if (resCidades.error) console.error('Erro Cidades:', resCidades.error);
        if (resConstrutoras.error) console.error('Erro Construtoras:', resConstrutoras.error);
        if (resEmpreendimentos.error) console.error('Erro Empreendimentos:', resEmpreendimentos.error);

        CIDADES = resCidades.data || [];
        CONSTRUTORAS = resConstrutoras.data || [];
        
        EMPREENDIMENTOS = (resEmpreendimentos.data || []).map(emp => ({
            id: emp.id,
            nome: emp.nome,
            cidadeId: emp.cidade_id,
            construtoraId: emp.construtora_id,
            orientacao: emp.orientacao,
            pdfApresentacao: emp.pdf_apresentacao_url,
            tabelaId: emp.tabelas_multiplas || emp.pdf_tabela_url
        }));

        console.log('Dados do Supabase carregados com sucesso:', { CIDADES, CONSTRUTORAS, EMPREENDIMENTOS });

        window.dispatchEvent(new Event('dadosCarregados'));
        if (typeof window.inicializarFiltros === 'function') {
            window.inicializarFiltros();
        }
    } catch (err) {
        console.error('Erro ao conectar no Supabase:', err);
    }
}

/* ==========================================================================
   FUNÇÕES AUXILIARES DE FILTRO (Adicione estas funções ao final do arquivo)
   ========================================================================== */

// Retorna apenas as construtoras que POSSUEM empreendimentos na cidade selecionada
function obterConstrutorasPorCidade(cidadeId) {
    if (!cidadeId) return [];

    // 1. Encontra os IDs das construtoras presentes nos empreendimentos dessa cidade
    const idsConstrutorasAtivas = EMPREENDIMENTOS
        .filter(emp => emp.cidadeId === cidadeId)
        .map(emp => emp.construtoraId);

    // 2. Filtra o array global de CONSTRUTORAS removendo duplicadas
    return CONSTRUTORAS.filter(c => idsConstrutorasAtivas.includes(c.id));
}

// Retorna apenas os empreendimentos de uma determinada cidade e construtora
function obterEmpreendimentosFiltrados(cidadeId, construtoraId) {
    return EMPREENDIMENTOS.filter(emp => {
        const bateCidade = cidadeId ? emp.cidadeId === cidadeId : true;
        const bateConstrutora = construtoraId ? emp.construtoraId === construtoraId : true;
        return bateCidade && bateConstrutora;
    });
}

document.addEventListener('DOMContentLoaded', carregarDadosDoSupabase);

const SUPABASE_URL = 'https://kdwvbkxucwdvuoknotkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd3Zia3h1Y3dkdnVva25vdGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzYzMDQsImV4cCI6MjA5OTcxMjMwNH0.SQJ2gOYYPIwhrKOxt6BU_VIoOTdagQxCbC8EdKZGZm8';

let supabaseClient = null;
let CIDADES = [];
let CONSTRUTORAS = [];
let EMPREENDIMENTOS = [];

async function carregarDadosDoSupabase() {
    try {
        if (typeof supabase === 'undefined') {
            console.error('Biblioteca do Supabase não carregada!');
            return;
        }

        if (!supabaseClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        // Busca os dados da vitrine e as apresentacoes ativas em paralelo.
        const [resCidades, resConstrutoras, resEmpreendimentos, resApresentacoes] = await Promise.all([
            supabaseClient.from('cidades').select('*'),
            supabaseClient.from('construtoras').select('*'),
            supabaseClient.from('empreendimentos').select('*'),
            supabaseClient.from('apresentacoes').select('empreendimento_id, ativo, pdf_url, updated_at').eq('ativo', true)
        ]);

        if (resCidades.error) console.error('Erro Cidades:', resCidades.error);
        if (resConstrutoras.error) console.error('Erro Construtoras:', resConstrutoras.error);
        if (resEmpreendimentos.error) console.error('Erro Empreendimentos:', resEmpreendimentos.error);
        if (resApresentacoes.error) console.error('Erro Apresentacoes:', resApresentacoes.error);

        CIDADES = resCidades.data || [];
        CONSTRUTORAS = resConstrutoras.data || [];
        
        const apresentacoesPorEmpreendimento = new Map(
            (resApresentacoes.data || []).map(item => [item.empreendimento_id, item])
        );

        EMPREENDIMENTOS = (resEmpreendimentos.data || []).map(emp => {
            const apresentacao = apresentacoesPorEmpreendimento.get(emp.id);
            let tabelaFinal = emp.pdf_tabela_url;
            
            // Verifica se possui múltiplas tabelas (JSONB retornado do Supabase)
            if (emp.tabelas_multiplas) {
                try {
                    tabelaFinal = typeof emp.tabelas_multiplas === 'string' 
                        ? JSON.parse(emp.tabelas_multiplas) 
                        : emp.tabelas_multiplas;
                } catch (e) {
                    tabelaFinal = emp.tabelas_multiplas;
                }
            }

            return {
                id: emp.id,
                nome: emp.nome,
                cidadeId: emp.cidade_id,
                construtoraId: emp.construtora_id,
                orientacao: emp.orientacao || 'horizontal',
                pdfApresentacao: apresentacao?.pdf_url || emp.pdf_apresentacao_url,
                apresentacaoAtualizadaEm: apresentacao?.updated_at || emp.updated_at,
                tabelaId: tabelaFinal,
                tipologias: Array.isArray(emp.caracteristicas?.tipologias) ? emp.caracteristicas.tipologias : []
            };
        });

        console.log('Dados carregados com sucesso do Supabase!');

        // Dispara o evento para renderizar a interface
        window.dispatchEvent(new Event('dadosCarregados'));
        
    } catch (err) {
        console.error('Erro de conexão com o Supabase:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarDadosDoSupabase, { once: true });
} else {
    carregarDadosDoSupabase();
}

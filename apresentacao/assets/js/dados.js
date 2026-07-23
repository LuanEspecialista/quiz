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

        // Busca todas as tabelas em paralelo
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
        
        EMPREENDIMENTOS = (resEmpreendimentos.data || []).map(emp => {
            // Trata o campo de tabelas para não quebrar se vier em string JSON do Supabase
            let tabelaFinal = emp.pdf_tabela_url;
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
                pdfApresentacao: emp.pdf_apresentacao_url,
                tabelaId: tabelaFinal
            };
        });

        console.log('Dados do Supabase carregados com sucesso:', { CIDADES, CONSTRUTORAS, EMPREENDIMENTOS });

        // Avisa a aplicação que os dados chegaram
        window.dispatchEvent(new Event('dadosCarregados'));
        
    } catch (err) {
        console.error('Erro ao conectar no Supabase:', err);
    }
}

document.addEventListener('DOMContentLoaded', carregarDadosDoSupabase);

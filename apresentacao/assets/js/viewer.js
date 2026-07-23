document.addEventListener('DOMContentLoaded', () => {
    const selectCidade = document.getElementById('select-cidade');
    const selectConstrutora = document.getElementById('select-construtora');
    const selectEmpreendimento = document.getElementById('select-empreendimento');
    
    const pdfViewer = document.getElementById('pdf-viewer');
    const viewerPlaceholder = document.getElementById('viewer-placeholder');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    const btnAnterior = document.getElementById('btn-anterior');
    const btnProximo = document.getElementById('btn-proximo');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    let estadoAtual = 'nenhuma'; 
    let empreendimentoSelecionado = null;

    // 1. ESCUTA O CARREGAMENTO DOS DADOS DO SUPABASE
    window.addEventListener('dadosCarregados', inicializarFiltros);
    if (typeof EMPREENDIMENTOS !== 'undefined' && EMPREENDIMENTOS.length > 0) {
        inicializarFiltros();
    }

    function inicializarFiltros() {
        popularCidades();
        popularEmpreendimentos();
    }

    function popularCidades() {
        if (!selectCidade) return;
        selectCidade.innerHTML = '<option value="">Todas as Cidades</option>';
        CIDADES.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            selectCidade.appendChild(opt);
        });
    }

    function popularConstrutoras(cidadeId) {
        if (!selectConstrutora) return;
        selectConstrutora.innerHTML = '<option value="">Todas as Construtoras</option>';
        
        // Filtra construtoras reais daquela cidade
        const construtorasValidas = obterConstrutorasPorCidade ? obterConstrutorasPorCidade(cidadeId) : CONSTRUTORAS;
        
        construtorasValidas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            selectConstrutora.appendChild(opt);
        });
        
        selectConstrutora.disabled = false;
    }

    function popularEmpreendimentos() {
        if (!selectEmpreendimento) return;
        
        const cidadeId = selectCidade ? selectCidade.value : '';
        const construtoraId = selectConstrutora ? selectConstrutora.value : '';

        selectEmpreendimento.innerHTML = '<option value="">Selecione um Empreendimento</option>';

        const filtrados = EMPREENDIMENTOS.filter(emp => {
            const bateCidade = cidadeId ? emp.cidadeId === cidadeId : true;
            const bateConstrutora = construtoraId ? emp.construtoraId === construtoraId : true;
            return bateCidade && bateConstrutora;
        });

        filtrados.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.nome;
            selectEmpreendimento.appendChild(opt);
        });
    }

    // 2. EVENTOS DOS FILTROS EM CASCATA
    if (selectCidade) {
        selectCidade.addEventListener('change', (e) => {
            popularConstrutoras(e.target.value);
            popularEmpreendimentos();
            resetarViewer();
        });
    }

    if (selectConstrutora) {
        selectConstrutora.addEventListener('change', () => {
            popularEmpreendimentos();
            resetarViewer();
        });
    }

    selectEmpreendimento.addEventListener('change', () => {
        const id = selectEmpreendimento.value;
        if (id) {
            empreendimentoSelecionado = EMPREENDIMENTOS.find(emp => emp.id === id);
            carregarApresentacao();
        } else {
            resetarViewer();
        }
    });

    // 3. MANIPULAÇÃO DO VISUALIZADOR DE PDF
    pdfViewer.addEventListener('load', () => {
        if (pdfViewer.src && pdfViewer.src !== window.location.href) {
            loadingSpinner.classList.add('hidden');
            pdfViewer.classList.remove('hidden');
        }
    });

    function ajustarProporcaoFrame(modo) {
        pdfViewer.classList.remove('modo-horizontal', 'modo-vertical');
        if (modo === 'vertical') {
            pdfViewer.classList.add('modo-vertical');
        } else {
            pdfViewer.classList.add('modo-horizontal');
        }
    }

    function carregarApresentacao() {
        if (!empreendimentoSelecionado || !empreendimentoSelecionado.pdfApresentacao) return;
        estadoAtual = 'apresentacao';
        
        removerMenuTorres();
        ajustarProporcaoFrame(empreendimentoSelecionado.orientacao);
        
        pdfViewer.classList.add('hidden');
        viewerPlaceholder.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        // USA A URL DO SUPABASE STORAGE DIRETO DA NUVEM
        const urlComParametros = `${empreendimentoSelecionado.pdfApresentacao}#toolbar=0&navpanes=0&scrollbar=0`;
        pdfViewer.src = urlComParametros;

        btnAnterior.disabled = true; 
        btnAnterior.textContent = "Anterior";
        btnProximo.disabled = false;
        
        if (Array.isArray(empreendimentoSelecionado.tabelaId)) {
            btnProximo.textContent = "Escolher Torre / Tabela";
        } else {
            btnProximo.textContent = "Mostrar Tabela";
        }
    }

    function carregarTabela(urlPdf) {
        if (!urlPdf) return;
        estadoAtual = 'tabela';
        removerMenuTorres();
        
        // Tabelas usam orientação vertical por padrão
        ajustarProporcaoFrame('vertical');

        pdfViewer.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        // USA A URL COMPLETA DO SUPABASE DA TABELA
        pdfViewer.src = `${urlPdf}#toolbar=0&navpanes=0&scrollbar=0`;

        btnAnterior.disabled = false;
        btnAnterior.textContent = "Voltar p/ Apresentação";
        btnProximo.disabled = true; 
        btnProximo.textContent = "Próximo";
    }

    btnProximo.addEventListener('click', () => {
        if (estadoAtual === 'apresentacao') {
            const dadosTabela = empreendimentoSelecionado.tabelaId;
            if (Array.isArray(dadosTabela)) {
                criarMenuTorres(dadosTabela);
            } else {
                carregarTabela(dadosTabela);
            }
        }
    });

    btnAnterior.addEventListener('click', () => {
        if (estadoAtual === 'tabela') {
            carregarApresentacao();
        }
    });

    // 4. MENU DE MÚLTIPLAS TORRES
    function criarMenuTorres(torres) {
        removerMenuTorres(); 
        pdfViewer.classList.add('hidden'); 
        loadingSpinner.classList.add('hidden');

        const containerTorres = document.createElement('div');
        containerTorres.id = 'container-escolha-torres';
        containerTorres.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
        `;

        const titulo = document.createElement('h3');
        titulo.textContent = "Este empreendimento possui múltiplas tabelas. Selecione a desejada:";
        titulo.style.color = "var(--texto-claro)";
        titulo.style.marginBottom = "10px";
        containerTorres.appendChild(titulo);

        torres.forEach(torre => {
            const botaoTorre = document.createElement('button');
            botaoTorre.textContent = torre.nome;
            botaoTorre.className = 'btn-nav';
            botaoTorre.style.cssText = `
                background-color: var(--bg-cards);
                border: 1px solid var(--dourado);
                color: var(--texto-claro);
                width: 280px;
                padding: 15px;
                cursor: pointer;
            `;
            
            botaoTorre.addEventListener('mouseover', () => {
                botaoTorre.style.backgroundColor = 'var(--dourado)';
                botaoTorre.style.color = '#000000';
            });
            botaoTorre.addEventListener('mouseout', () => {
                botaoTorre.style.backgroundColor = 'var(--bg-cards)';
                botaoTorre.style.color = 'var(--texto-claro)';
            });

            botaoTorre.addEventListener('click', () => {
                // USA A PROPRIEDADE .url RETORNADA DO BANCO
                carregarTabela(torre.url);
            });

            containerTorres.appendChild(botaoTorre);
        });

        document.querySelector('.viewer-container').appendChild(containerTorres);
        
        btnAnterior.disabled = false;
        btnAnterior.textContent = "Voltar p/ Apresentação";
        btnAnterior.onclick = () => {
            carregarApresentacao();
            btnAnterior.onclick = null; 
        };
    }

    function removerMenuTorres() {
        const menuExistente = document.getElementById('container-escolha-torres');
        if (menuExistente) menuExistente.remove();
    }

    function resetarViewer() {
        estadoAtual = 'nenhuma';
        empreendimentoSelecionado = null;
        removerMenuTorres();
        pdfViewer.src = "";
        pdfViewer.classList.remove('modo-horizontal', 'modo-vertical');
        pdfViewer.classList.add('hidden');
        loadingSpinner.classList.add('hidden');
        viewerPlaceholder.classList.remove('hidden');
        
        btnAnterior.disabled = true;
        btnAnterior.textContent = "Anterior";
        btnProximo.disabled = true;
        btnProximo.textContent = "Próximo";
    }

    // 5. MODO TELA CHEIA
    btnFullscreen.addEventListener('click', () => {
        const elementoAlvo = document.documentElement;
        if (!document.fullscreenElement) {
            elementoAlvo.requestFullscreen().catch(err => {
                console.error(`Erro ao ativar Tela Cheia: ${err.message}`);
            });
            btnFullscreen.textContent = "Sair da Tela Cheia";
        } else {
            document.exitFullscreen();
            btnFullscreen.textContent = "Tela cheia";
        }
    });
});

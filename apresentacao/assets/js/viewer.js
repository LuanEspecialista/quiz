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

    // Função utilitária para gerar a URL segura contra tela preta no PC
    function obterUrlViewer(urlOriginal) {
        if (!urlOriginal) return '';
        
        // Verifica se é um dispositivo móvel (iOS/Android)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // No celular, usa o parâmetro nativo com scroll desativado na barra
        if (isMobile) {
            return `${urlOriginal}#toolbar=0&navpanes=0&scrollbar=0`;
        }
        
        // No PC, usa o leitor do Google Docs via iframe para GARANTIR que não dê tela preta
        return `https://docs.google.com/viewer?url=${encodeURIComponent(urlOriginal)}&embedded=true`;
    }

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
        if (typeof CIDADES !== 'undefined') {
            CIDADES.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nome;
                selectCidade.appendChild(opt);
            });
        }
    }

    function popularConstrutoras(cidadeId) {
        if (!selectConstrutora) return;
        selectConstrutora.innerHTML = '<option value="">Todas as Construtoras</option>';
        
        const construtorasValidas = (typeof obterConstrutorasPorCidade === 'function') 
            ? obterConstrutorasPorCidade(cidadeId) 
            : (typeof CONSTRUTORAS !== 'undefined' ? CONSTRUTORAS : []);
        
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

        if (typeof EMPREENDIMENTOS === 'undefined') return;

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

    if (selectEmpreendimento) {
        selectEmpreendimento.addEventListener('change', () => {
            const id = selectEmpreendimento.value;
            if (id) {
                empreendimentoSelecionado = EMPREENDIMENTOS.find(emp => emp.id === id);
                carregarApresentacao();
            } else {
                resetarViewer();
            }
        });
    }

    // 3. MANIPULAÇÃO DO VISUALIZADOR DE PDF
    if (pdfViewer) {
        pdfViewer.addEventListener('load', () => {
            if (pdfViewer.src && pdfViewer.src !== window.location.href && pdfViewer.src !== 'about:blank') {
                if (loadingSpinner) loadingSpinner.classList.add('hidden');
                pdfViewer.classList.remove('hidden');
            }
        });
    }

    function ajustarProporcaoFrame(modo) {
        if (!pdfViewer) return;
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
        
        if (pdfViewer) pdfViewer.classList.add('hidden');
        if (viewerPlaceholder) viewerPlaceholder.classList.add('hidden');
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');

        // CARREGA A URL TRATADA PARA EVITAR TELA PRETA NO PC
        pdfViewer.src = obterUrlViewer(empreendimentoSelecionado.pdfApresentacao);

        if (btnAnterior) {
            btnAnterior.disabled = true; 
            btnAnterior.textContent = "Anterior";
        }
        
        if (btnProximo) {
            btnProximo.disabled = false;
            if (Array.isArray(empreendimentoSelecionado.tabelaId)) {
                btnProximo.textContent = "Escolher Torre / Tabela";
            } else {
                btnProximo.textContent = "Mostrar Tabela";
            }
        }
    }

    function carregarTabela(urlPdf) {
        if (!urlPdf) return;
        estadoAtual = 'tabela';
        removerMenuTorres();
        
        ajustarProporcaoFrame('vertical');

        if (pdfViewer) pdfViewer.classList.add('hidden');
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');

        // CARREGA A URL TRATADA PARA EVITAR TELA PRETA NO PC
        pdfViewer.src = obterUrlViewer(urlPdf);

        if (btnAnterior) {
            btnAnterior.disabled = false;
            btnAnterior.textContent = "Voltar p/ Apresentação";
        }
        if (btnProximo) {
            btnProximo.disabled = true; 
            btnProximo.textContent = "Próximo";
        }
    }

    if (btnProximo) {
        btnProximo.addEventListener('click', () => {
            if (estadoAtual === 'apresentacao' && empreendimentoSelecionado) {
                const dadosTabela = empreendimentoSelecionado.tabelaId;
                if (Array.isArray(dadosTabela)) {
                    criarMenuTorres(dadosTabela);
                } else {
                    carregarTabela(dadosTabela);
                }
            }
        });
    }

    if (btnAnterior) {
        btnAnterior.addEventListener('click', () => {
            if (estadoAtual === 'tabela') {
                carregarApresentacao();
            }
        });
    }

    // 4. MENU DE MÚLTIPLAS TORRES (RESPONSIVO)
    function criarMenuTorres(torres) {
        removerMenuTorres(); 
        if (pdfViewer) pdfViewer.classList.add('hidden'); 
        if (loadingSpinner) loadingSpinner.classList.add('hidden');

        const containerTorres = document.createElement('div');
        containerTorres.id = 'container-escolha-torres';
        containerTorres.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
            max-width: 400px;
            margin: 20px auto;
            padding: 15px;
            box-sizing: border-box;
        `;

        const titulo = document.createElement('h3');
        titulo.textContent = "Selecione a tabela desejada:";
        titulo.style.cssText = "color: var(--texto-claro); margin-bottom: 10px; font-size: 1.1rem;";
        containerTorres.appendChild(titulo);

        torres.forEach(torre => {
            const botaoTorre = document.createElement('button');
            botaoTorre.textContent = torre.nome;
            botaoTorre.className = 'btn-nav';
            botaoTorre.style.cssText = `
                background-color: var(--bg-cards, #1e1e1e);
                border: 1px solid var(--dourado, #d4af37);
                color: var(--texto-claro, #ffffff);
                width: 100%;
                padding: 14px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.2s ease;
            `;
            
            botaoTorre.addEventListener('mouseover', () => {
                botaoTorre.style.backgroundColor = 'var(--dourado, #d4af37)';
                botaoTorre.style.color = '#000000';
            });
            botaoTorre.addEventListener('mouseout', () => {
                botaoTorre.style.backgroundColor = 'var(--bg-cards, #1e1e1e)';
                botaoTorre.style.color = 'var(--texto-claro, #ffffff)';
            });

            botaoTorre.addEventListener('click', () => {
                carregarTabela(torre.url);
            });

            containerTorres.appendChild(botaoTorre);
        });

        const viewerContainer = document.querySelector('.viewer-container') || document.querySelector('.viewer-area');
        if (viewerContainer) {
            viewerContainer.appendChild(containerTorres);
        }
        
        if (btnAnterior) {
            btnAnterior.disabled = false;
            btnAnterior.textContent = "Voltar p/ Apresentação";
            btnAnterior.onclick = () => {
                carregarApresentacao();
                btnAnterior.onclick = null; 
            };
        }
    }

    function removerMenuTorres() {
        const menuExistente = document.getElementById('container-escolha-torres');
        if (menuExistente) menuExistente.remove();
    }

    function resetarViewer() {
        estadoAtual = 'nenhuma';
        empreendimentoSelecionado = null;
        removerMenuTorres();
        if (pdfViewer) {
            pdfViewer.src = "";
            pdfViewer.classList.remove('modo-horizontal', 'modo-vertical');
            pdfViewer.classList.add('hidden');
        }
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        if (viewerPlaceholder) viewerPlaceholder.classList.remove('hidden');
        
        if (btnAnterior) {
            btnAnterior.disabled = true;
            btnAnterior.textContent = "Anterior";
        }
        if (btnProximo) {
            btnProximo.disabled = true;
            btnProximo.textContent = "Próximo";
        }
    }

    // 5. MODO TELA CHEIA
    if (btnFullscreen) {
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
    }
});

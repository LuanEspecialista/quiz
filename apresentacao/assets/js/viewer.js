document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
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

    function obterUrlViewer(urlOriginal) {
        if (!urlOriginal) return '';
        return `${urlOriginal}#toolbar=0&navpanes=0&scrollbar=0`;
    }

    // 1. INICIALIZAÇÃO E CARREGAMENTO DE CIDADES
    function popularCidades() {
        if (!selectCidade) return;
        
        // Verifica se a variável global CIDADES existe e possui dados
        if (typeof CIDADES !== 'undefined' && Array.isArray(CIDADES) && CIDADES.length > 0) {
            selectCidade.innerHTML = '<option value="">Selecione a cidade...</option>';
            CIDADES.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nome;
                selectCidade.appendChild(opt);
            });
            selectCidade.disabled = false;
        } else {
            selectCidade.innerHTML = '<option value="">Aguardando dados...</option>';
            selectCidade.disabled = true;
        }
    }

    // Ouve o evento disparado pelo Supabase/DataJS
    window.addEventListener('dadosCarregados', () => {
        popularCidades();
    });

    // Tentativa imediata de popular caso os dados já existam na memória
    popularCidades();

    // 2. FILTROS EM CASCATA (CIDADE -> CONSTRUTORA -> EMPREENDIMENTO)
    if (selectCidade) {
        selectCidade.addEventListener('change', () => {
            const cidadeId = selectCidade.value;
            resetarSelect(selectConstrutora, "Selecione a construtora...");
            resetarSelect(selectEmpreendimento, "Selecione a construtora primeiro...");
            resetarViewer();

            if (!cidadeId || typeof EMPREENDIMENTOS === 'undefined') return;

            const empsDaCidade = EMPREENDIMENTOS.filter(emp => emp.cidadeId === cidadeId);
            const idsConstrutorasValidas = [...new Set(empsDaCidade.map(emp => emp.construtoraId))];
            
            if (typeof CONSTRUTORAS !== 'undefined') {
                const construtorasFiltradas = CONSTRUTORAS.filter(c => idsConstrutorasValidas.includes(c.id));

                if (construtorasFiltradas.length > 0) {
                    selectConstrutora.disabled = false;
                    construtorasFiltradas.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = c.nome;
                        selectConstrutora.appendChild(opt);
                    });
                } else {
                    selectConstrutora.options[0].textContent = "Nenhuma construtora nesta cidade...";
                }
            }
        });
    }

    if (selectConstrutora) {
        selectConstrutora.addEventListener('change', () => {
            const cidadeId = selectCidade ? selectCidade.value : '';
            const construtoraId = selectConstrutora.value;

            resetarSelect(selectEmpreendimento, "Selecione o empreendimento...");
            resetarViewer();

            if (!cidadeId || !construtoraId || typeof EMPREENDIMENTOS === 'undefined') return;

            const empsFiltrados = EMPREENDIMENTOS.filter(emp => 
                emp.cidadeId === cidadeId && emp.construtoraId === construtoraId
            );

            if (empsFiltrados.length > 0) {
                selectEmpreendimento.disabled = false;
                empsFiltrados.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.id;
                    opt.textContent = emp.nome;
                    selectEmpreendimento.appendChild(opt);
                });
            } else {
                selectEmpreendimento.options[0].textContent = "Nenhum empreendimento encontrado...";
            }
        });
    }

    if (selectEmpreendimento) {
        selectEmpreendimento.addEventListener('change', () => {
            const id = selectEmpreendimento.value;
            if (id && typeof EMPREENDIMENTOS !== 'undefined') {
                empreendimentoSelecionado = EMPREENDIMENTOS.find(emp => emp.id === id);
                carregarApresentacao();
            } else {
                resetarViewer();
            }
        });
    }

    function resetarSelect(selectElement, textoPadrao) {
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
        selectElement.disabled = true;
    }

    // 3. EXIBIÇÃO E MÁSCARAS DO VIEWER
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
        if (!empreendimentoSelecionado || !empreendimentoSelecionado.pdfApresentacao) {
            alert("Apresentação em PDF não disponível para este empreendimento.");
            return;
        }
        estadoAtual = 'apresentacao';
        
        removerMenuTorres();
        ajustarProporcaoFrame(empreendimentoSelecionado.orientacao);
        
        if (pdfViewer) pdfViewer.classList.add('hidden');
        if (viewerPlaceholder) viewerPlaceholder.classList.add('hidden');
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');

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
        if (!urlPdf) {
            alert("Tabela de vendas indisponível para este empreendimento.");
            return;
        }
        estadoAtual = 'tabela';
        removerMenuTorres();
        
        ajustarProporcaoFrame('vertical');

        if (pdfViewer) pdfViewer.classList.add('hidden');
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');

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

    // 4. MENU DE SELEÇÃO DE MÚLTIPLAS TABELAS / TORRES
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
            margin: 40px auto;
            padding: 20px;
            box-sizing: border-box;
        `;

        const titulo = document.createElement('h3');
        titulo.textContent = "Selecione a tabela desejada:";
        titulo.style.cssText = "color: #ffffff; margin-bottom: 10px; font-size: 1.1rem;";
        containerTorres.appendChild(titulo);

        torres.forEach(torre => {
            const botaoTorre = document.createElement('button');
            botaoTorre.textContent = torre.nome;
            botaoTorre.style.cssText = `
                background-color: #1e1e1e;
                border: 1px solid #d4af37;
                color: #ffffff;
                width: 100%;
                padding: 14px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.2s ease;
            `;
            
            botaoTorre.addEventListener('mouseover', () => {
                botaoTorre.style.backgroundColor = '#d4af37';
                botaoTorre.style.color = '#000000';
            });
            botaoTorre.addEventListener('mouseout', () => {
                botaoTorre.style.backgroundColor = '#1e1e1e';
                botaoTorre.style.color = '#ffffff';
            });

            botaoTorre.addEventListener('click', () => {
                carregarTabela(torre.url);
            });

            containerTorres.appendChild(botaoTorre);
        });

        const viewerContainer = document.querySelector('.viewer-container');
        if (viewerContainer) {
            viewerContainer.appendChild(containerTorres);
        }
        
        if (btnAnterior) {
            btnAnterior.disabled = false;
            btnAnterior.textContent = "Voltar p/ Apresentação";
        }
    }

    function removerMenuTorres() {
        const menuExistente = document.getElementById('container-escolha-torres');
        if (menuExistente) menuExistente.remove();
    }

    // NAVEGAÇÃO DOS BOTÕES SUPERIORES
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

    // 5. TELA CHEIA
    if (btnFullscreen) {
        const mainViewerContainer = document.querySelector('.viewer-container') || document.querySelector('main');

        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                const targetEl = mainViewerContainer || document.documentElement;
                if (targetEl.requestFullscreen) {
                    targetEl.requestFullscreen();
                } else if (targetEl.webkitRequestFullscreen) {
                    targetEl.webkitRequestFullscreen();
                }
                btnFullscreen.textContent = "Sair da Tela Cheia";
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                btnFullscreen.textContent = "Tela cheia";
            }
        });
    }
});

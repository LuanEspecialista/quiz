function iniciarViewer() {
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
    const btnExitFullscreen = document.getElementById('btn-exit-fullscreen');
    const btnUnidades = document.getElementById('btn-unidades');
    const selectTipologiaUnidades = document.getElementById('select-tipologia-unidades');
    const empreendimentoDiretoId = new URLSearchParams(window.location.search).get('empreendimento');
    const previewPdf = new URLSearchParams(window.location.search).get('pdf');
    const previewLink = new URLSearchParams(window.location.search).get('link');
    const previewNome = new URLSearchParams(window.location.search).get('nome');
    const painelOrigin = new URLSearchParams(window.location.search).get('painel') || window.location.origin;

    let estadoAtual = 'nenhuma'; 
    let empreendimentoSelecionado = null;
    let empreendimentoDiretoCarregado = false;
    let loadingTimeout = null;

    const tipologiasPadrao = ['Studio', 'Loft', '1Q', '1S', '1Q+1S', '2Q', '2S', '2Q+1S', '1Q+2S', '3Q', '3S', '3Q+1S', '2Q+2S', '4Q', '4S', 'Garden / Giardino', 'Duplex', 'Cobertura'];

    function atualizarLinkUnidades() {
        if (!btnUnidades || !empreendimentoSelecionado) return;
        const url = new URL('/painel/', painelOrigin);
        url.searchParams.set('tab', 'unidades');
        url.searchParams.set('empreendimento', empreendimentoSelecionado.id);
        url.searchParams.set('disponibilidade', 'DISPONIVEL');
        if (selectTipologiaUnidades?.value) url.searchParams.set('tipologia', `EXACT:${selectTipologiaUnidades.value}`);
        btnUnidades.href = url.toString();
    }

    function popularTipologiasUnidades() {
        if (!selectTipologiaUnidades || !empreendimentoSelecionado) return;
        const disponiveis = Array.isArray(empreendimentoSelecionado.tipologias) && empreendimentoSelecionado.tipologias.length
            ? empreendimentoSelecionado.tipologias
            : tipologiasPadrao;
        selectTipologiaUnidades.innerHTML = '<option value="">Todas as tipologias</option>';
        [...new Set(disponiveis)].forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = tipo;
            selectTipologiaUnidades.appendChild(option);
        });
        selectTipologiaUnidades.classList.remove('hidden');
        atualizarLinkUnidades();
    }

    selectTipologiaUnidades?.addEventListener('change', atualizarLinkUnidades);

    function prepararLinkExterno(urlOriginal) {
        try {
            const url = new URL(urlOriginal);
            if (!['http:', 'https:'].includes(url.protocol)) return { url: '', abrirDireto: false };
            const host = url.hostname.toLowerCase();

            // canva.link é um redirecionador e bloqueia carregamento em iframe.
            // Em uma nova aba, a navegação direta preserva o redirecionamento seguro do Canva.
            if (host === 'canva.link' || host.endsWith('.canva.link')) {
                return { url: url.toString(), abrirDireto: true };
            }

            // Links de visualização do Canva aceitam o modo oficial de incorporação.
            if ((host === 'canva.com' || host.endsWith('.canva.com')) && url.pathname.includes('/design/')) {
                url.searchParams.set('embed', '');
            }
            return { url: url.toString(), abrirDireto: false };
        } catch {
            return { url: '', abrirDireto: false };
        }
    }

    function obterUrlViewer(urlOriginal, tipoApresentacao) {
        if (!urlOriginal) return '';
        if (tipoApresentacao === 'link') return prepararLinkExterno(urlOriginal).url;
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
        carregarEmpreendimentoDireto();
    });

    // Tentativa imediata de popular caso os dados já existam na memória
    popularCidades();

    function carregarEmpreendimentoDireto() {
        if (empreendimentoDiretoCarregado || !empreendimentoDiretoId || typeof EMPREENDIMENTOS === 'undefined') return;
        empreendimentoDiretoCarregado = true;
        const encontrado = EMPREENDIMENTOS.find(emp => String(emp.id) === empreendimentoDiretoId);
        const empreendimento = encontrado ? { ...encontrado, pdfApresentacao: previewPdf || previewLink || encontrado.pdfApresentacao, tipoApresentacao: previewLink ? 'link' : 'pdf' } : ((previewPdf || previewLink) ? {
            id: empreendimentoDiretoId,
            nome: previewNome || 'Apresentação',
            orientacao: 'horizontal',
            pdfApresentacao: previewPdf || previewLink,
            tipoApresentacao: previewLink ? 'link' : 'pdf',
            tipologias: []
        } : null);
        document.body.classList.add('modo-direto');

        if (!empreendimento) {
            if (viewerPlaceholder) {
                viewerPlaceholder.classList.remove('hidden');
                viewerPlaceholder.innerHTML = '<p>Apresentação não encontrada ou indisponível.</p>';
            }
            return;
        }

        empreendimentoSelecionado = empreendimento;
        document.title = `${empreendimento.nome} | Luan Especialista`;
        if (btnUnidades) {
            btnUnidades.classList.remove('hidden');
        }
        popularTipologiasUnidades();
        carregarApresentacao();
    }

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
                if (loadingTimeout) window.clearTimeout(loadingTimeout);
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

        if (loadingTimeout) window.clearTimeout(loadingTimeout);
        loadingTimeout = window.setTimeout(() => {
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            if (viewerPlaceholder) {
                viewerPlaceholder.classList.remove('hidden');
                viewerPlaceholder.innerHTML = '<p>A apresentação demorou para responder.</p><button type="button" id="retry-presentation" class="btn-nav">Tentar novamente</button>';
                document.getElementById('retry-presentation')?.addEventListener('click', carregarApresentacao, { once: true });
            }
        }, 15000);

        const versao = encodeURIComponent(empreendimentoSelecionado.apresentacaoAtualizadaEm || Date.now());
        const separador = empreendimentoSelecionado.pdfApresentacao.includes('?') ? '&' : '?';
        const origem = empreendimentoSelecionado.tipoApresentacao === 'link' ? empreendimentoSelecionado.pdfApresentacao : `${empreendimentoSelecionado.pdfApresentacao}${separador}v=${versao}`;
        if (empreendimentoSelecionado.tipoApresentacao === 'link') {
            const externo = prepararLinkExterno(origem);
            if (!externo.url) {
                if (loadingSpinner) loadingSpinner.classList.add('hidden');
                if (viewerPlaceholder) {
                    viewerPlaceholder.classList.remove('hidden');
                    viewerPlaceholder.innerHTML = '<p>O link desta apresentação é inválido.</p>';
                }
                return;
            }
            if (externo.abrirDireto) {
                window.location.replace(externo.url);
                return;
            }
        }
        pdfViewer.classList.toggle('modo-link', empreendimentoSelecionado.tipoApresentacao === 'link');
        pdfViewer.src = obterUrlViewer(origem, empreendimentoSelecionado.tipoApresentacao);

        if (btnAnterior) {
            btnAnterior.disabled = true; 
            btnAnterior.textContent = "Anterior";
        }
        
        if (btnProximo) {
            btnProximo.disabled = empreendimentoSelecionado.tipoApresentacao === 'link';
            if (Array.isArray(empreendimentoSelecionado.tabelaId)) {
                btnProximo.textContent = "Escolher Torre / Tabela";
            } else {
                btnProximo.textContent = empreendimentoSelecionado.tipoApresentacao === 'link' ? "Apresentação externa" : "Mostrar Tabela";
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

        pdfViewer.src = obterUrlViewer(urlPdf, 'pdf');

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
            pdfViewer.classList.remove('modo-horizontal', 'modo-vertical', 'modo-link');
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

        const fullscreenHint = document.createElement('div');
        fullscreenHint.className = 'fullscreen-hint';
        fullscreenHint.textContent = 'Pressione Esc para sair da tela cheia';
        (mainViewerContainer || document.body).appendChild(fullscreenHint);

        const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
        const syncFullscreenState = () => {
            const active = Boolean(fullscreenElement());
            btnFullscreen.textContent = active ? 'Sair da tela cheia' : 'Tela cheia';
            btnFullscreen.setAttribute('aria-pressed', String(active));
            fullscreenHint.classList.toggle('visible', active);
        };

        const toggleFullscreen = async () => {
            if (!document.fullscreenElement) {
                const targetEl = document.documentElement;
                if (targetEl.requestFullscreen) {
                    await targetEl.requestFullscreen();
                } else if (targetEl.webkitRequestFullscreen) {
                    targetEl.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        };
        btnFullscreen.addEventListener('click', toggleFullscreen);
        btnExitFullscreen?.addEventListener('click', toggleFullscreen);
        document.addEventListener('fullscreenchange', syncFullscreenState);
        document.addEventListener('webkitfullscreenchange', syncFullscreenState);
        syncFullscreenState();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarViewer, { once: true });
} else {
    iniciarViewer();
}

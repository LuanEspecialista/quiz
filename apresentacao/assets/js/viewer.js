document.addEventListener('DOMContentLoaded', () => {
    const selectEmpreendimento = document.getElementById('select-empreendimento');
    const pdfViewer = document.getElementById('pdf-viewer');
    const viewerPlaceholder = document.getElementById('viewer-placeholder');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    const btnAnterior = document.getElementById('btn-anterior');
    const btnProximo = document.getElementById('btn-proximo');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    let estadoAtual = 'nenhuma'; 
    let empreendimentoSelecionado = null;

    pdfViewer.addEventListener('load', () => {
        if (pdfViewer.src && pdfViewer.src !== window.location.href) {
            loadingSpinner.classList.add('hidden');
            pdfViewer.classList.remove('hidden');
        }
    });

    selectEmpreendimento.addEventListener('change', () => {
        const idId = selectEmpreendimento.value;
        if (idId) {
            empreendimentoSelecionado = EMPREENDIMENTOS.find(emp => emp.id === idId);
            carregarApresentacao();
        } else {
            resetarViewer();
        }
    });

    function carregarApresentacao() {
        if (!empreendimentoSelecionado) return;
        estadoAtual = 'apresentacao';
        
        removerMenuTorres();
        
        pdfViewer.classList.add('hidden');
        viewerPlaceholder.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        // O SEGREDO ESTÁ AQUI: O sulfixo '#toolbar=0...' desativa as barras nativas do navegador
        pdfViewer.src = `assets/pdfs/apresentacoes/${empreendimentoSelecionado.id}.pdf#toolbar=0&navpanes=0&scrollbar=0`;

        btnAnterior.disabled = true; 
        btnAnterior.textContent = "Anterior";
        btnProximo.disabled = false;
        
        if (Array.isArray(empreendimentoSelecionado.tabelaId)) {
            btnProximo.textContent = "Escolher Torre / Tabela";
        } else {
            btnProximo.textContent = "Mostrar Tabela";
        }
    }

    function carregarTabela(nomeArquivoPdf) {
        estadoAtual = 'tabela';
        removerMenuTorres();

        pdfViewer.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        // Aplicado também no PDF da tabela
        pdfViewer.src = `assets/pdfs/tabelas/${nomeArquivoPdf}.pdf#toolbar=0&navpanes=0&scrollbar=0`;

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
            `;
            
            botaoTorre.addEventListener('mouseover', () => botaoTorre.style.backgroundColor = 'var(--dourado)');
            botaoTorre.addEventListener('mouseout', () => {
                botaoTorre.style.backgroundColor = 'var(--bg-cards)';
                botaoTorre.style.color = 'var(--texto-claro)';
            });

            botaoTorre.addEventListener('click', () => {
                carregarTabela(torre.arquivo);
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
        pdfViewer.classList.add('hidden');
        loadingSpinner.classList.add('hidden');
        viewerPlaceholder.classList.remove('hidden');
        
        btnAnterior.disabled = true;
        btnAnterior.textContent = "Anterior";
        btnProximo.disabled = true;
        btnProximo.textContent = "Próximo";
    }

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
});document.addEventListener('DOMContentLoaded', () => {
    const selectEmpreendimento = document.getElementById('select-empreendimento');
    const pdfViewer = document.getElementById('pdf-viewer');
    const viewerPlaceholder = document.getElementById('viewer-placeholder');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    const btnAnterior = document.getElementById('btn-anterior');
    const btnProximo = document.getElementById('btn-proximo');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    let estadoAtual = 'nenhuma'; 
    let empreendimentoSelecionado = null;

    pdfViewer.addEventListener('load', () => {
        if (pdfViewer.src && pdfViewer.src !== window.location.href) {
            loadingSpinner.classList.add('hidden');
            pdfViewer.classList.remove('hidden');
        }
    });

    selectEmpreendimento.addEventListener('change', () => {
        const idId = selectEmpreendimento.value;
        if (idId) {
            empreendimentoSelecionado = EMPREENDIMENTOS.find(emp => emp.id === idId);
            carregarApresentacao();
        } else {
            resetarViewer();
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
        if (!empreendimentoSelecionado) return;
        estadoAtual = 'apresentacao';
        
        removerMenuTorres();
        ajustarProporcaoFrame(empreendimentoSelecionado.orientacao);
        
        pdfViewer.classList.add('hidden');
        viewerPlaceholder.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        pdfViewer.src = `assets/pdfs/apresentacoes/${empreendimentoSelecionado.id}.pdf#toolbar=0&navpanes=0&scrollbar=0`;

        btnAnterior.disabled = true; 
        btnAnterior.textContent = "Anterior";
        btnProximo.disabled = false;
        
        if (Array.isArray(empreendimentoSelecionado.tabelaId)) {
            btnProximo.textContent = "Escolher Torre / Tabela";
        } else {
            btnProximo.textContent = "Mostrar Tabela";
        }
    }

    function carregarTabela(nomeArquivoPdf) {
        estadoAtual = 'tabela';
        removerMenuTorres();
        
        // Tabelas comerciais geralmente são verticais por padrão
        ajustarProporcaoFrame('vertical');

        pdfViewer.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        pdfViewer.src = `assets/pdfs/tabelas/${nomeArquivoPdf}.pdf#toolbar=0&navpanes=0&scrollbar=0`;

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
            `;
            
            botaoTorre.addEventListener('mouseover', () => botaoTorre.style.backgroundColor = 'var(--dourado)');
            botaoTorre.addEventListener('mouseout', () => {
                botaoTorre.style.backgroundColor = 'var(--bg-cards)';
                botaoTorre.style.color = 'var(--texto-claro)';
            });

            botaoTorre.addEventListener('click', () => {
                carregarTabela(torre.arquivo);
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
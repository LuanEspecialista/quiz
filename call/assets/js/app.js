const App = {
    // Estado do sistema: guarda as construtoras e o roteiro atual
    state: { construtoras: [], currentPlaybook: null },

    async init() {
        console.log("Iniciando carregamento de dados...");
        try {
            // Busca o arquivo JSON com a lista oficial de empreendimentos
            const res = await fetch('data/construtoras.json');
            
            if (!res.ok) throw new Error("Não foi possível encontrar o arquivo data/construtoras.json");
            
            this.state.construtoras = await res.json();
            console.log("Dados carregados com sucesso:", this.state.construtoras);
            
            this.renderConstrutoras();
            this.setupSearch();
        } catch (e) {
            console.error("ERRO CRÍTICO:", e.message);
            document.getElementById('grid-construtoras').innerHTML = 
                '<p style="color:red; font-size:12px;">Erro ao carregar construtoras. Certifique-se de usar o LIVE SERVER.</p>';
        }
    },

    // 1. Renderiza a Sidebar (Coluna da Esquerda)
    renderConstrutoras(lista = this.state.construtoras) {
        const grid = document.getElementById('grid-construtoras');
        if (!grid) return;

        grid.innerHTML = lista.map(c => `
            <div class="card-construtora" onclick="App.loadEmpreendimentos('${c.id}', this)">
                <h3 class="gold-text">${c.nome}</h3>
                <span>${c.empreendimentos.length} empreendimentos</span>
            </div>
        `).join('');
    },

    // 2. Renderiza a Barra Superior (Coluna Central)
    loadEmpreendimentos(id, element) {
        // Marca o card selecionado como ativo (dourado)
        document.querySelectorAll('.card-construtora').forEach(el => el.classList.remove('active'));
        element.classList.add('active');

        const constr = this.state.construtoras.find(c => c.id === id);
        const nav = document.getElementById('grid-empreendimentos');
        
        if (!nav) return;

        // Limpa o painel de roteiros até que um imóvel seja escolhido
        document.getElementById('playbook-panel').style.display = 'none';

        nav.innerHTML = constr.empreendimentos.map(e => `
            <div class="card-emp-mini" onclick="App.loadPlaybook('${id}','${e}')">
                <strong>${e.replace(/-/g, ' ').toUpperCase()}</strong>
                <br><small style="color:#A0A0A0">Penha - SC</small>
            </div>
        `).join('');
    },

    // 3. Carrega o Roteiro (Painel Central)
    async loadPlaybook(cId, eId) {
        try {
            // Tenta buscar o arquivo de roteiro (playbook.json) na pasta do imóvel
            const res = await fetch(`construtoras/${cId}/${eId}/playbook.json`);
            if (!res.ok) throw new Error();
            
            this.state.currentPlaybook = await res.json();
            
            // Mostra o painel e atualiza o nome do imóvel no topo
            document.getElementById('playbook-panel').style.display = 'block';
            document.getElementById('emp-name-display').innerText = this.state.currentPlaybook.nome;
            
            // Inicia na aba de LIGAÇÃO por padrão
            this.switchTab('ligacao');
        } catch(e) {
            alert("Roteiro para este imóvel ainda não foi configurado.");
        }
    },

    // 4. Troca de Abas (Ligação, WhatsApp, etc)
    switchTab(tabId) {
        // Estilo visual dos botões das abas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.innerText.toLowerCase().includes(tabId)) btn.classList.add('active');
        });

        const secao = this.state.currentPlaybook.secoes.find(s => s.id === tabId);
        const blocos = secao.conteudo.split('\n\n');
        
        const contentArea = document.getElementById('playbook-content');
        contentArea.innerHTML = blocos.map((texto, i) => `
            <div class="script-section">
                <div class="script-text">
                    <span class="block-number">${i+1}. PASSO</span>
                    <p id="t-${i}">${texto}</p>
                </div>
                <button class="btn-copy" onclick="App.copy('t-${i}', this)">COPIAR</button>
            </div>
        `).join('');
    },

    // 5. Função de Copiar Texto
    copy(id, btn) {
        const text = document.getElementById(id).innerText;
        navigator.clipboard.writeText(text);
        
        const originalText = btn.innerHTML;
        btn.innerHTML = "✓ COPIADO";
        btn.style.background = "var(--gold)";
        btn.style.color = "black";
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = "none";
            btn.style.color = "var(--gold)";
        }, 2000);
    },

    // 6. Inteligência da Barra de Busca
    setupSearch() {
        const searchInput = document.getElementById('mainSearch');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = this.state.construtoras.filter(c => 
                c.nome.toLowerCase().includes(termo) || 
                c.empreendimentos.some(emp => emp.toLowerCase().includes(termo))
            );
            this.renderConstrutoras(filtrados);
        });
    }
};

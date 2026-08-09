const Search = {
    init() {
        const input = document.getElementById('mainSearch');
        if (input) {
            input.addEventListener('input', (e) => this.filter(e.target.value));
        }
    },

    filter(term) {
        const query = term.toLowerCase();
        const filtered = App.state.construtoras.filter(c => 
            c.nome.toLowerCase().includes(query) || 
            c.empreendimentos.some(e => e.toLowerCase().includes(query))
        );
        // Atualiza a lista visualmente
        const grid = document.getElementById('grid-construtoras');
        grid.innerHTML = filtered.map(c => `
            <div class="card-construtora" onclick="App.loadEmpreendimentos('${c.id}')">
                <h3>${c.nome}</h3>
                <small>${c.empreendimentos.length} Opções</small>
            </div>
        `).join('');
    }
};
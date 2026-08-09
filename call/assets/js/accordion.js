const Accordion = {
    render(conteudo) {
        const display = document.getElementById('playbook-content');
        const blocos = conteudo.split('\n\n');
        
        display.innerHTML = blocos.map((texto, i) => `
            <div class="script-section">
                <div class="script-text">
                    <span class="block-number">${i+1}. PASSO</span>
                    <p id="txt-${i}">${texto}</p>
                </div>
                <button class="btn-copy" onclick="Clipboard.copy('txt-${i}', this)">
                    COPIAR
                </button>
            </div>
        `).join('');
    }
};
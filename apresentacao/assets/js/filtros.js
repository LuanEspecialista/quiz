// Função principal para rodar os filtros
function inicializarFiltrosApp() {
    const selectCidade = document.getElementById('select-cidade');
    const selectConstrutora = document.getElementById('select-construtora');
    const selectEmpreendimento = document.getElementById('select-empreendimento');

    if (!selectCidade || !selectConstrutora || !selectEmpreendimento) return;

    // 1. Popula Cidades no carregamento
    populaCidades();

    function populaCidades() {
        selectCidade.innerHTML = '<option value="">Selecione...</option>';
        if (typeof CIDADES !== 'undefined' && CIDADES.length > 0) {
            CIDADES.forEach(cidade => {
                const option = document.createElement('option');
                option.value = cidade.id;
                option.textContent = cidade.nome;
                selectCidade.appendChild(option);
            });
        }
    }

    // 2. Quando seleciona a Cidade -> Libera e filtra as Construtoras que existem NESSA cidade
    selectCidade.addEventListener('change', () => {
        const cidadeId = selectCidade.value;
        
        resetarSelect(selectConstrutora, "Selecione...");
        resetarSelect(selectEmpreendimento, "Selecione a construtora...");

        if (cidadeId && typeof EMPREENDIMENTOS !== 'undefined') {
            // Descobre quais construtoras têm empreendimentos nesta cidade
            const construtorasNaCidadeIds = [...new Set(
                EMPREENDIMENTOS
                    .filter(emp => emp.cidadeId === cidadeId)
                    .map(emp => emp.construtoraId)
            )];

            const construtorasFiltradas = CONSTRUTORAS.filter(c => construtorasNaCidadeIds.includes(c.id));

            if (construtorasFiltradas.length > 0) {
                selectConstrutora.disabled = false;
                construtorasFiltradas.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.nome;
                    selectConstrutora.appendChild(option);
                });
            } else {
                selectConstrutora.options[0].textContent = "Nenhuma construtora encontrada...";
            }
        }
    });

    // 3. Quando seleciona a Construtora -> Libera e filtra os Empreendimentos (Cidade + Construtora)
    selectConstrutora.addEventListener('change', () => {
        const cidadeId = selectCidade.value;
        const construtoraId = selectConstrutora.value;

        resetarSelect(selectEmpreendimento, "Selecione...");

        if (cidadeId && construtoraId && typeof EMPREENDIMENTOS !== 'undefined') {
            const empreendimentosFiltrados = EMPREENDIMENTOS.filter(emp => {
                return emp.cidadeId === cidadeId && emp.construtoraId === construtoraId;
            });

            if (empreendimentosFiltrados.length > 0) {
                selectEmpreendimento.disabled = false;
                empreendimentosFiltrados.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.id;
                    option.textContent = emp.nome;
                    selectEmpreendimento.appendChild(option);
                });
            } else {
                selectEmpreendimento.options[0].textContent = "Nenhum empreendimento encontrado...";
            }
        }
    });

    function resetarSelect(selectElement, textoPadrao) {
        selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
        selectElement.disabled = true;
    }
}

// EVITA O PROBLEMA DE SINCRONISMO:
// Executa se o evento for disparado OU se os dados já tiverem sido carregados antes
window.addEventListener('dadosCarregados', inicializarFiltrosApp);

if (typeof CIDADES !== 'undefined' && CIDADES.length > 0) {
    inicializarFiltrosApp();
}

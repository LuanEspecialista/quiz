function inicializarFiltrosApp() {
    const selectCidade = document.getElementById('select-cidade');
    const selectConstrutora = document.getElementById('select-construtora');
    const selectEmpreendimento = document.getElementById('select-empreendimento');

    if (!selectCidade || !selectConstrutora || !selectEmpreendimento) return;

    populaCidades();

    function populaCidades() {
        selectCidade.innerHTML = '<option value="">Selecione a cidade...</option>';
        if (typeof CIDADES !== 'undefined' && CIDADES.length > 0) {
            CIDADES.forEach(cidade => {
                const option = document.createElement('option');
                option.value = cidade.id;
                option.textContent = cidade.nome;
                selectCidade.appendChild(option);
            });
        }
    }

    // 1. FILTRA APENAS AS CONSTRUTORAS DA CIDADE SELECIONADA
    selectCidade.addEventListener('change', () => {
        const cidadeId = selectCidade.value ? selectCidade.value.toLowerCase().trim() : '';
        
        resetarSelect(selectConstrutora, "Selecione a construtora...");
        resetarSelect(selectEmpreendimento, "Selecione o empreendimento...");

        if (cidadeId && typeof EMPREENDIMENTOS !== 'undefined') {
            // Pega apenas os empreendimentos da cidade escolhida
            const empsDaCidade = EMPREENDIMENTOS.filter(emp => {
                const idCidadeEmp = emp.cidadeId ? emp.cidadeId.toLowerCase().trim() : '';
                return idCidadeEmp === cidadeId;
            });

            // Extrai os IDs das construtoras desses empreendimentos (sem duplicar)
            const idsConstrutorasAtivas = [...new Set(
                empsDaCidade.map(emp => emp.construtoraId ? emp.construtoraId.toLowerCase().trim() : '')
            )];

            // Filtra a lista global de CONSTRUTORAS mantendo só as que estão na lista ativa
            const construtorasFiltradas = CONSTRUTORAS.filter(c => {
                const idConstrutora = c.id ? c.id.toLowerCase().trim() : '';
                return idsConstrutorasAtivas.includes(idConstrutora);
            });

            if (construtorasFiltradas.length > 0) {
                selectConstrutora.disabled = false;
                construtorasFiltradas.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.nome;
                    selectConstrutora.appendChild(option);
                });
            } else {
                selectConstrutora.options[0].textContent = "Nenhuma construtora nesta cidade...";
            }
        }
    });

    // 2. FILTRA APENAS OS EMPREENDIMENTOS DA CONSTRUTORA + CIDADE SELECIONADAS
    selectConstrutora.addEventListener('change', () => {
        const cidadeId = selectCidade.value ? selectCidade.value.toLowerCase().trim() : '';
        const construtoraId = selectConstrutora.value ? selectConstrutora.value.toLowerCase().trim() : '';

        resetarSelect(selectEmpreendimento, "Selecione o empreendimento...");

        if (cidadeId && construtoraId && typeof EMPREENDIMENTOS !== 'undefined') {
            const empreendimentosFiltrados = EMPREENDIMENTOS.filter(emp => {
                const empCidade = emp.cidadeId ? emp.cidadeId.toLowerCase().trim() : '';
                const empConstrutora = emp.construtoraId ? emp.construtoraId.toLowerCase().trim() : '';
                return empCidade === cidadeId && empConstrutora === construtoraId;
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

window.addEventListener('dadosCarregados', inicializarFiltrosApp);

if (typeof CIDADES !== 'undefined' && CIDADES.length > 0) {
    inicializarFiltrosApp();
}

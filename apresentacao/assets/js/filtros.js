window.addEventListener('dadosCarregados', () => {
    const selectCidade = document.getElementById('select-cidade');
    const selectConstrutora = document.getElementById('select-construtora');
    const selectEmpreendimento = document.getElementById('select-empreendimento');

    // Popula o select de cidades
    populaCidades();

    function populaCidades() {
        selectCidade.innerHTML = '<option value="">Selecione...</option>';
        CIDADES.forEach(cidade => {
            const option = document.createElement('option');
            option.value = cidade.id;
            option.textContent = cidade.nome;
            selectCidade.appendChild(option);
        });
    }

    selectCidade.addEventListener('change', () => {
        if (selectCidade.value) {
            selectConstrutora.disabled = false;
            populaConstrutoras();
        } else {
            resetarSelect(selectConstrutora, "Selecione a cidade...");
            resetarSelect(selectEmpreendimento, "Selecione a construtora...");
        }
        filtrarEmpreendimentos();
    });

    selectConstrutora.addEventListener('change', () => {
        if (selectConstrutora.value) {
            selectEmpreendimento.disabled = false;
            selectEmpreendimento.options[0].textContent = "Selecione...";
        } else {
            resetarSelect(selectEmpreendimento, "Selecione a construtora...");
        }
        filtrarEmpreendimentos();
    });

    function populaConstrutoras() {
        selectConstrutora.innerHTML = '<option value="">Selecione...</option>';
        CONSTRUTORAS.forEach(constItem => {
            const option = document.createElement('option');
            option.value = constItem.id;
            option.textContent = constItem.nome;
            selectConstrutora.appendChild(option);
        });
    }

    function filtrarEmpreendimentos() {
        const cidadeSelecionada = selectCidade.value;
        const construtoraSelecionada = selectConstrutora.value;

        if (!cidadeSelecionada || !construtoraSelecionada) {
            resetarSelect(selectEmpreendimento, "Selecione a construtora...");
            return;
        }

        selectEmpreendimento.innerHTML = '<option value="">Selecione...</option>';

        const filtrados = EMPREENDIMENTOS.filter(emp => {
            return emp.cidadeId === cidadeSelecionada && emp.construtoraId === construtoraSelecionada;
        });

        if (filtrados.length > 0) {
            filtrados.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = emp.nome;
                selectEmpreendimento.appendChild(option);
            });
        } else {
            selectEmpreendimento.options[0].textContent = "Nenhum encontrado...";
        }
    }

    function resetarSelect(selectElement, textoPadrao) {
        selectElement.innerHTML = `<option value="">${textoPadrao}</option>`;
        selectElement.disabled = true;
    }
});

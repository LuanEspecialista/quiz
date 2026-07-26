/*
=========================================================
LUAN ESPECIALISTA
CENTRAL DE CONVERSÃO
APP.JS
VERSÃO DEFINITIVA
=========================================================
*/

const state = {

    construtoras: [],

    construtoraAtual: null,

    empreendimentoAtual: null,

    dados: null,

    playbook: null,

    secaoAtual: null

};

const ui = {

    construtoras: document.getElementById("construtoras"),

    empreendimentos: document.getElementById("empreendimentos"),

    empreendimentosSection: document.getElementById("empreendimentos-section"),

    sidebar: document.getElementById("sidebar"),

    content: document.getElementById("content"),

    pesquisa: document.getElementById("search")

};

document.addEventListener(

    "DOMContentLoaded",

    iniciar

);

/* =========================================================
INICIAR
========================================================= */

async function iniciar(){

    await carregarConstrutoras();

    renderConstrutoras();

    registrarPesquisa();

}

/* =========================================================
CARREGA CONSTRUTORAS
========================================================= */

async function carregarConstrutoras(){

    try{

        const resposta = await fetch(

            "data/construtoras.json"

        );

        if(!resposta.ok){

            throw new Error("Erro ao carregar construtoras.");

        }

        state.construtoras = await resposta.json();

    }

    catch(erro){

        console.error(erro);

    }

}

/* =========================================================
RENDERIZA CONSTRUTORAS
========================================================= */

function renderConstrutoras(){

    ui.construtoras.innerHTML = "";

    state.construtoras.forEach(construtora=>{

        const botao = document.createElement("button");

        botao.className = "chip";

        botao.textContent = construtora.nome;

        botao.onclick = ()=>{

            selecionarConstrutora(construtora);

        };

        ui.construtoras.appendChild(botao);

    });

}

/* =========================================================
SELECIONAR CONSTRUTORA
========================================================= */

function selecionarConstrutora(construtora){

    state.construtoraAtual = construtora;

    document.querySelectorAll("#construtoras .chip")

    .forEach(chip=>chip.classList.remove("active"));

    event.target.classList.add("active");

    renderEmpreendimentos();

}

/* =========================================================
RENDERIZA EMPREENDIMENTOS
========================================================= */

function renderEmpreendimentos(){

    ui.empreendimentosSection.classList.remove("hidden");

    ui.empreendimentos.innerHTML = "";

    state.construtoraAtual.empreendimentos.forEach(nome=>{

        const botao = document.createElement("button");

        botao.className = "chip";

        botao.textContent = formatarNome(nome);

        botao.onclick = ()=>{

            selecionarEmpreendimento(nome);

        };

        ui.empreendimentos.appendChild(botao);

    });

}

/* =========================================================
FORMATAR NOME
========================================================= */

function formatarNome(texto){

    return texto

    .replaceAll("-"," ")

    .replace(

        /\b\w/g,

        l=>l.toUpperCase()

    );

}

/* =========================================================
SELECIONAR EMPREENDIMENTO
========================================================= */

async function selecionarEmpreendimento(nome){

    state.empreendimentoAtual = nome;

    document.querySelectorAll("#empreendimentos .chip")

    .forEach(chip=>chip.classList.remove("active"));

    event.target.classList.add("active");

    await carregarDados();

    await carregarPlaybook();

    if(

        state.playbook &&

        state.playbook.secoes &&

        state.playbook.secoes.length

    ){

        state.secaoAtual = state.playbook.secoes[0].id;

        renderSidebar();

    }

}
/* =========================================================
CARREGAR DADOS
========================================================= */

async function carregarDados(){

    try{

        const resposta = await fetch(

            `construtoras/${state.construtoraAtual.id}/${state.empreendimentoAtual}/dados.json`

        );

        if(!resposta.ok){

            throw new Error("dados.json não encontrado.");

        }

        state.dados = await resposta.json();

    }

    catch(erro){

        console.error(erro);

    }

}

/* =========================================================
CARREGAR PLAYBOOK
========================================================= */

async function carregarPlaybook(){

    try{

        const resposta = await fetch(

            `construtoras/${state.construtoraAtual.id}/${state.empreendimentoAtual}/playbook.json`

        );

        if(!resposta.ok){

            throw new Error("playbook.json não encontrado.");

        }

        state.playbook = await resposta.json();

    }

    catch(erro){

        console.error(erro);

    }

}

/* =========================================================
RENDER SIDEBAR
========================================================= */

function renderSidebar(){

    ui.sidebar.innerHTML = "";

    state.playbook.secoes.forEach(secao=>{

        const item = document.createElement("button");

        item.className = "sidebar-item";

        item.textContent = secao.titulo;

        if(secao.id===state.secaoAtual){

            item.classList.add("active");

        }

        item.onclick = ()=>{

            state.secaoAtual = secao.id;

            renderSidebar();

        };

        ui.sidebar.appendChild(item);

    });

    renderConteudo();

}

/* =========================================================
RENDER CONTEÚDO
========================================================= */

function renderConteudo(){

    const secao = state.playbook.secoes.find(

        s=>s.id===state.secaoAtual

    );

    if(!secao){

        return;

    }

    ui.content.innerHTML = `

    <div class="playbook-card fade">

        <div class="playbook-header">

            <h2>${state.dados.nome}</h2>

            <p>

                ${state.dados.construtora}

                •

                ${state.dados.localizacao}

            </p>

        </div>

        ${state.dados.descricao ? `

        <div class="block">

            <div class="block-title">

                SOBRE O EMPREENDIMENTO

            </div>

            <div class="block-text">

                ${state.dados.descricao}

            </div>

        </div>

        ` : ""}

        <div class="block">

            <div class="block-title">

                ${secao.titulo}

            </div>

            <div class="block-text">

                ${secao.conteudo.replace(/\n/g,"<br>")}

            </div>

        </div>

        <button

            class="copy-button"

            onclick="copiarTexto()"

        >

            Copiar roteiro

        </button>

    </div>

    `;

}
/* =========================================================
COPIAR TEXTO
========================================================= */

function copiarTexto(){

    const secao = state.playbook.secoes.find(

        s => s.id === state.secaoAtual

    );

    if(!secao) return;

    navigator.clipboard.writeText(secao.conteudo);

}

/* =========================================================
PESQUISA
========================================================= */

function registrarPesquisa(){

    if(!ui.pesquisa) return;

    ui.pesquisa.addEventListener(

        "input",

        function(e){

            const texto = e.target.value

                .toLowerCase()

                .trim();

            document

                .querySelectorAll("#construtoras .chip")

                .forEach(chip=>{

                    chip.style.display = chip.innerText

                        .toLowerCase()

                        .includes(texto)

                        ? ""

                        : "none";

                });

        }

    );

}

/* =========================================================
ESTADO VAZIO
========================================================= */

function mostrarInicio(){

    ui.sidebar.innerHTML = `

        <div class="empty-sidebar">

            <p>

                Selecione um empreendimento

            </p>

        </div>

    `;

    ui.content.innerHTML = `

        <div class="empty-state">

            <h2>

                Central de Conversão

            </h2>

            <p>

                Escolha uma construtora e um empreendimento para iniciar.

            </p>

        </div>

    `;

}

mostrarInicio();

/* =========================================================
ATUALIZA BOTÕES ATIVOS
========================================================= */

function atualizarChips(container, valor){

    document

        .querySelectorAll(container + " .chip")

        .forEach(chip=>{

            chip.classList.remove("active");

            if(

                chip.textContent.trim().toLowerCase() ===

                valor.replaceAll("-"," ").toLowerCase()

            ){

                chip.classList.add("active");

            }

        });

}

/* =========================================================
VERSÕES ATUALIZADAS DAS SELEÇÕES
========================================================= */

function selecionarConstrutora(construtora){

    state.construtoraAtual = construtora;

    atualizarChips(

        "#construtoras",

        construtora.nome

    );

    renderEmpreendimentos();

}

async function selecionarEmpreendimento(nome){

    state.empreendimentoAtual = nome;

    atualizarChips(

        "#empreendimentos",

        formatarNome(nome)

    );

    await carregarDados();

    await carregarPlaybook();

    if(

        state.playbook &&

        state.playbook.secoes &&

        state.playbook.secoes.length

    ){

        state.secaoAtual = state.playbook.secoes[0].id;

        renderSidebar();

    }

}

/* =========================================================
FIM DO APP
========================================================= */

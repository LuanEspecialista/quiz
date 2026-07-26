/*
=========================================================
CENTRAL DE CONVERSÃO
LUAN ESPECIALISTA
APP.JS
=========================================================
*/

const state={

    construtoras:[],

    construtoraAtual:null,

    empreendimentoAtual:null,

    dados:null,

    playbook:null,

    secaoAtual:null

};

const ui={

    chipsConstrutoras:

    document.getElementById("construtoras"),

    chipsEmpreendimentos:

    document.getElementById("empreendimentos"),

    empreendimentosSection:

    document.getElementById("empreendimentos-section"),

    sidebar:

    document.getElementById("sidebar"),

    content:

    document.getElementById("content"),

    pesquisa:

    document.getElementById("search")

};

document.addEventListener(

    "DOMContentLoaded",

    iniciar

);

async function iniciar(){

    await carregarConstrutoras();

    renderConstrutoras();

    registrarPesquisa();

}
/*
=========================================================
CARREGA CONSTRUTORAS
=========================================================
*/

async function carregarConstrutoras(){

    try{

        const resposta=

        await fetch(

            "data/construtoras.json"

        );

        state.construtoras=

        await resposta.json();

    }

    catch(erro){

        console.error(

            erro

        );

    }

}
/*
=========================================================
RENDERIZA CONSTRUTORAS
=========================================================
*/

function renderConstrutoras(){

    ui.chipsConstrutoras.innerHTML="";

    state.construtoras.forEach(

        construtora=>{

            const botao=

            document.createElement("button");

            botao.className="chip";

            botao.innerText=

            construtora.nome;

            botao.onclick=()=>{

                selecionarConstrutora(

                    construtora

                );

            };

            ui.chipsConstrutoras

            .appendChild(

                botao

            );

        }

    );

}
/*
=========================================================
SELECIONA CONSTRUTORA
=========================================================
*/

function selecionarConstrutora(

    construtora

){

    state.construtoraAtual=

    construtora;

    renderEmpreendimentos();

}
/*
=========================================================
RENDERIZA EMPREENDIMENTOS
=========================================================
*/

function renderEmpreendimentos(){

    ui.empreendimentosSection

    .classList

    .remove("hidden");

    ui.chipsEmpreendimentos

    .innerHTML="";

    state.construtoraAtual

    .empreendimentos

    .forEach(

        empreendimento=>{

            const botao=

            document.createElement("button");

            botao.className="chip";

            botao.innerText=

            formatarNome(

                empreendimento

            );

            botao.onclick=()=>{

                selecionarEmpreendimento(

                    empreendimento

                );

            };

            ui.chipsEmpreendimentos

            .appendChild(

                botao

            );

        }

    );

}
/*
=========================================================
FORMATA NOME
=========================================================
*/

function formatarNome(

    texto

){

    return texto

    .replaceAll("-"," ")

    .replace(

        /\b\w/g,

        letra=>letra.toUpperCase()

    );

}
/*
=========================================================
SELECIONA EMPREENDIMENTO
=========================================================
*/

async function selecionarEmpreendimento(empreendimento){

    state.empreendimentoAtual = empreendimento;

    await carregarDados();

    await carregarPlaybook();

    state.secaoAtual = state.playbook.secoes[0].id;

    renderSidebar();

}
/*
=========================================================
CARREGA DADOS
=========================================================
*/

async function carregarDados(){

    try{

        const resposta = await fetch(

            `construtoras/${state.construtoraAtual.id}/${state.empreendimentoAtual}/dados.json`

        );

        state.dados = await resposta.json();

    }

    catch(e){

        console.error(e);

    }

}
/*
=========================================================
RENDER SIDEBAR
=========================================================
*/

function renderSidebar(){

    ui.sidebar.innerHTML="";

    state.playbook.secoes.forEach(secao=>{

        const item=document.createElement("button");

        item.className="sidebar-item";

        item.textContent=secao.titulo;

        if(secao.id===state.secaoAtual){

            item.classList.add("active");

        }

        item.onclick=()=>{

            state.secaoAtual=secao.id;

            renderSidebar();

        };

        ui.sidebar.appendChild(item);

    });

    renderConteudo();

}
/*
=========================================================
RENDER CONTEÚDO
=========================================================
*/

function renderConteudo(){

    const secao = state.playbook.secoes.find(

        s=>s.id===state.secaoAtual

    );

    if(!secao){

        return;

    }

    ui.content.innerHTML=`

    <div class="playbook-card fade">

        <div class="playbook-header">

            <h2>${state.dados.nome}</h2>

            <p>

                ${state.dados.construtora}

                • ${state.dados.cidade}

            </p>

        </div>

        <div class="block">

            <div class="block-title">

                ${secao.titulo}

            </div>

            <div class="block-text">

                ${secao.conteudo.replace(/\n/g,"<br>")}

            </div>

            <button

                class="copy-button"

                onclick="copiarTexto()"

            >

                Copiar roteiro

            </button>

        </div>

    </div>

    `;

}
/*
=========================================================
COPIAR TEXTO
=========================================================
*/

function copiarTexto(){

    const secao = state.playbook.secoes.find(

        s=>s.id===state.secaoAtual

    );

    navigator.clipboard.writeText(secao.conteudo);

}
/*
=========================================================
PESQUISA
=========================================================
*/

function registrarPesquisa(){

    ui.pesquisa.addEventListener(

        "input",

        e=>{

            const texto=e.target.value

            .toLowerCase()

            .trim();

            document

            .querySelectorAll(

                "#construtoras .chip"

            )

            .forEach(chip=>{

                chip.style.display=

                chip.innerText

                .toLowerCase()

                .includes(texto)

                ?"flex"

                :"none";

            });

        }

    );

}

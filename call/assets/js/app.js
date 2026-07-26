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

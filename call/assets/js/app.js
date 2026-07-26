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

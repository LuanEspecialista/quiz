/* ==========================================================
   MOTOR FINANCEIRO
   Projeto Patrimonial - Unidade 405
========================================================== */

const Financeiro = {

config:{

// Patrimônio

saldoInicial:475000.00,

valorCasa:450000.00,

valorApartamento:693011.47,



// Contrato

entrada:69301.15,

parcelaInicial:2772.05,

reforcoInicial:43313.16,

parcelas:100,

reforcos:8,



// Datas

inicioContrato:new Date(2026,6,11),

primeiraParcela:new Date(2026,7,5),

primeiroReforco:new Date(2027,6,10),

inicioObra:new Date(2028,0,1),

entrega:new Date(2031,11,1),

fimContrato:new Date(2034,8,5),



// Índices

cdiMensal:0.008,

cubMensal:0.0082,

ipcaMensal:0.009,



// Cenário

aporteMensal:1500,

aluguel:1800,

tipoAluguel:"saobento",

valorFinalEstimado:1200000,

corrigirCasa:true,

valorizacaoCasa:0.05

},

dados:[],

iniciar(){

this.dados=[];

let saldo=this.config.saldoInicial;

saldo-=this.config.entrada;



let valorParcela=this.config.parcelaInicial;

let valorReforco=this.config.reforcoInicial;

let valorApartamento=this.config.valorApartamento;

let valorCasa=this.config.valorCasa;



let data=new Date(2026,7,5);



for(let i=1;i<=100;i++){

let registro={

mes:i,

data:new Date(data),

saldoInicial:saldo,

saldoFinal:0,

parcela:0,

reforco:0,

rendimento:0,

aporte:0,

aluguel:0,

cub:0,

ipca:0,

valorApartamento:0,

valorCasa:0,

patrimonio:0

};

registro.rendimento=

saldo*this.config.cdiMensal;

saldo+=registro.rendimento;



if(data<=this.config.entrega){

valorParcela*=1+this.config.cubMensal;

registro.cub=this.config.cubMensal;

}else{

valorParcela*=1+this.config.ipcaMensal;

registro.ipca=this.config.ipcaMensal;

}



registro.parcela=valorParcela;

let aluguel=0;

if(data>this.config.entrega){

aluguel=this.config.aluguel;

}

registro.aluguel=aluguel;



let bolso=this.config.aporteMensal;



let restante=

valorParcela-

bolso-

aluguel;



if(restante<0){

restante=0;

}



saldo-=restante;

registro.aporte=bolso;

let meses=

(data.getFullYear()-2027)*12+

(data.getMonth()-6);



if(

meses>=0 &&

meses%12==0 &&

meses/12<8

){

valorReforco*=1+

(

data<=this.config.entrega

?

this.config.cubMensal

:

this.config.ipcaMensal

);

saldo-=valorReforco;

registro.reforco=valorReforco;

}

valorApartamento=

valorApartamento*

(

1+

(

this.config.valorFinalEstimado/

this.config.valorApartamento-1

)

/100

);



if(this.config.corrigirCasa){

valorCasa*=

1+

(

this.config.valorizacaoCasa/12

);

}



registro.valorApartamento=

valorApartamento;

registro.valorCasa=

valorCasa;

registro.saldoFinal=saldo;

registro.patrimonio=

saldo+

valorApartamento+

valorCasa;



this.dados.push(registro);



data.setMonth(

data.getMonth()+1

);

}



return this.dados;

},

resumo(){

const ultimo=

this.dados[

this.dados.length-1

];



return{

saldo:ultimo.saldoFinal,

patrimonio:ultimo.patrimonio,

apartamento:ultimo.valorApartamento,

casa:ultimo.valorCasa

};

},

setAluguel(v){

this.config.aluguel=Number(v);

},

setAporte(v){

this.config.aporteMensal=Number(v);

},

setCDI(v){

this.config.cdiMensal=Number(v)/100;

},

setCUB(v){

this.config.cubMensal=Number(v)/100;

},

setIPCA(v){

this.config.ipcaMensal=Number(v)/100;

},

setValorFinal(v){

this.config.valorFinalEstimado=

Number(v);

}

};

Financeiro.iniciar();
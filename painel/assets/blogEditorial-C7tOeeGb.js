var e={texto:`Texto curto`,subtitulo:`Subtítulo`,destaque:`Frase de destaque`,dado:`Dado importante`,lista:`Lista objetiva`,imagem:`Imagem`,galeria:`Galeria / slider`,comparativo:`Comparativo`},t=e=>({id:crypto.randomUUID(),tipo:e,titulo:``,texto:``,itens:e===`lista`||e===`comparativo`?[``]:void 0,imagens:e===`galeria`?[]:void 0,sugestao_imagem:e===`imagem`||e===`galeria`?``:void 0}),n=t=>{if(!t||typeof t!=`object`||Array.isArray(t))throw Error(`O pacote precisa ser um objeto JSON.`);let n=t,r=n.blocos&&typeof n.blocos==`object`?n.blocos:{},i=Array.isArray(r.secoes)?r.secoes:Array.isArray(n.secoes)?n.secoes:[],a=new Set(Object.keys(e)),o=i.map((e,t)=>{let n=e&&typeof e==`object`?e:{},r=a.has(String(n.tipo))?String(n.tipo):`texto`;return{...n,id:typeof n.id==`string`&&n.id?n.id:`${Date.now()}-${t}`,tipo:r,titulo:typeof n.titulo==`string`?n.titulo:``,texto:typeof n.texto==`string`?n.texto:``,itens:Array.isArray(n.itens)?n.itens.map(String):void 0,imagens:Array.isArray(n.imagens)?n.imagens:void 0}}),s=(Array.isArray(r.fontes)?r.fontes:Array.isArray(n.fontes)?n.fontes:[]).map(e=>{let t=e&&typeof e==`object`?e:{};return{titulo:String(t.titulo||t.nome||`Fonte consultada`),url:t.url?String(t.url):``,veiculo:t.veiculo?String(t.veiculo):``,data:t.data?String(t.data):``}});return{source:n,blocos:{...r,versao:2,secoes:o,fontes:s}}},r=e=>`Você é um editor-chefe especializado em conteúdo patrimonial, imobiliário, econômico e regional para o site de Luan Santos, corretor e especialista no litoral norte de Santa Catarina.

TEMA PRINCIPAL
${e.trim()||`[INFORME AQUI O TEMA DO ARTIGO]`}

OBJETIVO
Criar um artigo público útil, confiável, envolvente e escaneável no celular. O conteúdo pode tratar de imóveis, Selic, juros, inflação, impostos, consórcio, home equity, cidades, praias, Bandeira Azul, qualidade de vida, turismo, saúde, patrimônio ou oportunidades financeiras. O leitor deve compreender o assunto, continuar lendo e perceber autoridade consultiva, sem promessa de ganho, urgência artificial ou propaganda excessiva.

PESQUISA E CONFIABILIDADE
1. Pesquise informações atuais antes de escrever quando o tema depender de taxas, leis, impostos, indicadores, certificações ou dados de mercado.
2. Priorize fontes oficiais e primárias: Banco Central, Receita Federal, IBGE, órgãos municipais/estaduais, legislação, entidades certificadoras e documentos técnicos.
3. Não invente números, rentabilidade, valorização, economia tributária ou previsões.
4. Diferencie claramente fato, estimativa, cenário e opinião.
5. Nunca apresente resultado financeiro como garantido.

ARQUITETURA EDITORIAL
1. Produza de 3 a 7 blocos curtos, não um texto gigante.
2. Cada bloco de texto deve ter no máximo 2 ou 3 parágrafos curtos.
3. Alterne texto com dado, destaque, lista, comparação ou imagem quando isso melhorar a leitura.
4. Sugira de 1 a 5 imagens conforme a necessidade real. Para cada imagem, descreva o que procurar e onde ela deve aparecer. Não invente URLs.
5. Escolha um layout entre: artigo, guia, mercado, comparativo, case ou imovel.
6. Use CTA consultivo ligado ao tema e ao atendimento de Luan Santos.
7. Gere SEO natural para buscas do público, sem repetição artificial de palavras-chave.

FORMATO OBRIGATÓRIO
Responda somente com JSON válido, sem markdown, introdução ou comentários. Use exatamente esta estrutura:
{
  "titulo": "",
  "slug": "",
  "resumo": "",
  "categoria": "Mercado imobiliário | Cidades e bairros | Empreendimentos | Indicadores e economia | Investimentos | Turismo e estilo de vida | Notícias | Cases",
  "layout": "artigo | guia | mercado | comparativo | case | imovel",
  "cidade": "",
  "seo_titulo": "máximo aproximado de 60 caracteres",
  "seo_descricao": "máximo aproximado de 155 caracteres",
  "palavras_chave": [""],
  "blocos": {
    "versao": 2,
    "cta": "",
    "secoes": [
      {
        "tipo": "texto | subtitulo | destaque | dado | lista | imagem | galeria | comparativo",
        "titulo": "",
        "texto": "",
        "itens": ["use somente para lista ou comparativo"],
        "sugestao_imagem": "descreva a imagem e termos de busca; não invente URL"
      }
    ],
    "fontes": [
      { "titulo": "", "veiculo": "", "data": "AAAA-MM-DD", "url": "https://..." }
    ]
  }
}

Antes de responder, revise tamanho dos blocos, coerência do CTA, SEO, atualidade dos dados, correspondência entre afirmações e fontes e validade do JSON.`;export{e as i,t as n,n as r,r as t};
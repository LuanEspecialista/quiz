var e={texto:`Texto curto`,subtitulo:`Subtítulo`,destaque:`Frase de destaque`,dado:`Dado importante`,lista:`Lista objetiva`,imagem:`Imagem`,imagem_texto:`Imagem com texto`,galeria:`Galeria / slider`,video:`Vídeo`,pergunta:`Pergunta ao leitor`,cta:`Chamada para ação`,comparativo:`Comparativo`},t=e=>({id:crypto.randomUUID(),tipo:e,titulo:``,texto:``,itens:e===`lista`||e===`comparativo`?[``]:void 0,imagens:e===`galeria`?[]:void 0,sugestao_imagem:e===`imagem`||e===`imagem_texto`||e===`galeria`?``:void 0,tamanho:e===`imagem`||e===`imagem_texto`?`media`:void 0,alinhamento:e===`imagem`||e===`imagem_texto`?`esquerda`:void 0,proporcao:e===`imagem`||e===`imagem_texto`?`paisagem`:void 0}),n=t=>{if(!t||typeof t!=`object`||Array.isArray(t))throw Error(`O pacote precisa ser um objeto JSON.`);let n=t,r=n.blocos&&typeof n.blocos==`object`?n.blocos:{},i=Array.isArray(r.secoes)?r.secoes:Array.isArray(n.secoes)?n.secoes:[],a=new Set(Object.keys(e)),o=i.map((e,t)=>{let n=e&&typeof e==`object`?e:{},r=a.has(String(n.tipo))?String(n.tipo):`texto`;return{...n,id:typeof n.id==`string`&&n.id?n.id:`${Date.now()}-${t}`,tipo:r,titulo:typeof n.titulo==`string`?n.titulo:``,texto:typeof n.texto==`string`?n.texto:``,itens:Array.isArray(n.itens)?n.itens.map(String):void 0,imagens:Array.isArray(n.imagens)?n.imagens:void 0,tamanho:[`pequena`,`media`,`ampla`].includes(String(n.tamanho))?n.tamanho:`media`,alinhamento:[`esquerda`,`direita`,`centro`].includes(String(n.alinhamento))?n.alinhamento:`esquerda`,proporcao:[`quadrada`,`vertical`,`paisagem`].includes(String(n.proporcao))?n.proporcao:`paisagem`}}),s=(Array.isArray(r.fontes)?r.fontes:Array.isArray(n.fontes)?n.fontes:[]).map(e=>{let t=e&&typeof e==`object`?e:{};return{titulo:String(t.titulo||t.nome||`Fonte consultada`),url:t.url?String(t.url):``,veiculo:t.veiculo?String(t.veiculo):``,data:t.data?String(t.data):``}});return{source:n,blocos:{...r,versao:2,secoes:o,fontes:s}}},r=e=>{let t=e.blocos.secoes||[],n=t.filter(e=>[`imagem`,`imagem_texto`,`galeria`,`video`].includes(e.tipo)),r=t.reduce((e,t)=>e+(t.texto?.length||0)+(t.itens||[]).join(` `).length,0),i=[];return t.length>10&&i.push(`Há blocos demais. Agrupe ideias para evitar uma leitura cansativa.`),r>6e3&&i.push(`O conteúdo ultrapassa 6.000 caracteres e deve ser resumido antes da publicação.`),r>3500&&n.length<3&&i.push(`Artigo longo com pouca mídia: use ao menos 3 imagens, galerias ou vídeos.`),t.some(e=>(e.texto?.length||0)>900)&&i.push(`Existe bloco de texto acima de 900 caracteres.`),t.some(e=>[`pergunta`,`cta`].includes(e.tipo))||i.push(`Inclua ao menos uma interação ou chamada para ação durante a leitura.`),i},i=e=>{let t=e instanceof Error?e.message.match(/position\s+(\d+)/i):null;return t?Number(t[1]):null},a=(e,t)=>{let n=0;for(let r=t-1;r>=0&&e[r]===`\\`;--r)n+=1;return n%2==1},o=e=>{let t=``,n=!1;for(let r=0;r<e.length;r+=1){let i=e[r];i===`"`&&!a(e,r)&&(n=!n),t+=n&&(i===`
`||i===`\r`)?`\\n`:i}return t},s=e=>{let t=e.replace(/^\uFEFF/,``).trim().replace(/^```(?:json)?\s*/i,``).replace(/\s*```\s*$/i,``),n=t.indexOf(`{`),r=t.lastIndexOf(`}`);return n>=0&&r>n?t.slice(n,r+1):t},c=(e,t)=>{let n=i(t);if(n===null)return t instanceof Error?t.message:`JSON inválido.`;let r=e.slice(0,n);return`Erro próximo da linha ${r.split(`
`).length}, coluna ${n-r.lastIndexOf(`
`)}: “…${e.slice(Math.max(0,n-42),Math.min(e.length,n+42)).replace(/\s+/g,` `).trim()}…”. Verifique aspas, vírgulas e chaves nesse trecho.`},l=e=>{let t=o(s(e)).replace(/,\s*([}\]])/g,`$1`),l=t!==e.trim(),u;for(let e=0;e<30;e+=1)try{let e=n(JSON.parse(t));return{...e,repaired:l,avisos:r(e)}}catch(e){u=e;let n=i(e);if(n===null||n<1||n>=t.length)break;let r=t[n];if(!/[\p{L}\p{N}]/u.test(r))break;let o=n-1;for(;o>=0&&(t[o]!==`"`||a(t,o));)--o;if(o<0)break;t=`${t.slice(0,o)}\\${t.slice(o)}`,l=!0}throw Error(c(t,u))},u=e=>`Você é um editor-chefe especializado em conteúdo patrimonial, imobiliário, econômico e regional para a marca Luan Especialista, com atuação no litoral norte de Santa Catarina.

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

INTELIGÊNCIA EDITORIAL
1. Classifique a intenção principal como descoberta, guia, comparacao, decisao, oportunidade ou autoridade. A intenção deve comandar a copy, o ritmo, o layout e a ação esperada.
2. Produza de 5 a 9 blocos curtos, nunca um texto gigante. Se o assunto for amplo, agrupe por perfil ou decisão em vez de criar dezenas de parágrafos.
3. Cada bloco de texto deve ter no máximo 700 caracteres e 2 ou 3 parágrafos curtos.
4. Alterne texto, imagem com texto, dado, destaque, lista, comparação, galeria, vídeo, pergunta e CTA. Não coloque três blocos textuais consecutivos.
5. Tema visual amplo (praias, cidades, turismo, imóveis, arquitetura): planeje de 6 a 12 imagens variadas. Tema técnico: de 3 a 6 mídias. Não repita a imagem do card na abertura nem no conteúdo.
6. Para imagem com texto, defina posição esquerda/direita alternada, tamanho e proporção. Reserve imagem ampla somente para abertura ou momento realmente importante.
7. Para várias imagens relacionadas, use galeria. Informe de 4 a 10 sugestões distintas e uma legenda útil para cada uma.
8. Vídeo é opcional. Só crie bloco de vídeo quando houver URL informada ou quando o tema justificar que Luan selecione um vídeo depois; nunca invente URL.
9. Distribua uma microação natural no meio e uma ação principal no final: avaliar conteúdo, responder uma pergunta, compartilhar, WhatsApp ou agendar conversa. Sem urgência artificial.
10. Abra com benefício concreto e curiosidade; entregue valor antes de vender. Use frases curtas, linguagem humana e a autoridade local da marca Luan Especialista.

ARQUITETURA EDITORIAL
1. Produza uma experiência escaneável, com ritmo e espaços de respiração.
2. Cada bloco de texto deve ter no máximo 2 ou 3 parágrafos curtos.
3. Escolha um layout entre: artigo, guia, mercado, comparativo, case ou imovel de acordo com a intenção, não aleatoriamente.
6. Use CTA consultivo ligado ao tema e ao atendimento da equipe Luan Especialista. Prefira “Falar com a equipe”, “Quero orientação” ou “Conversar com o suporte”; nunca use “Conversar com Luan”.
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
    "intencao": "descoberta | guia | comparacao | decisao | oportunidade | autoridade",
    "leitura_minutos": 0,
    "aprendizados": ["três benefícios objetivos que o leitor encontrará"],
    "imagem_card_sugestao": "imagem exclusiva para a vitrine, diferente da abertura",
    "hero_sugestao": "imagem de abertura opcional e diferente da imagem do card",
    "exibir_hero": true,
    "cta": "",
    "secoes": [
      {
        "tipo": "texto | subtitulo | destaque | dado | lista | imagem | imagem_texto | galeria | video | pergunta | cta | comparativo",
        "titulo": "",
        "texto": "",
        "itens": ["use somente para lista ou comparativo"],
        "sugestao_imagem": "descreva uma imagem distinta e onde ela entra; não invente URL",
        "tamanho": "pequena | media | ampla",
        "alinhamento": "esquerda | direita | centro",
        "proporcao": "quadrada | vertical | paisagem",
        "video_url": "URL fornecida ou vazio",
        "video_titulo": "",
        "acao_rotulo": "",
        "acao_url": ""
      }
    ],
    "fontes": [
      { "titulo": "", "veiculo": "", "data": "AAAA-MM-DD", "url": "https://..." }
    ]
  }
}

Antes de responder, valide o JSON como se fosse executar JSON.parse: use barra invertida antes de qualquer aspa interna ao texto, não use quebras de linha literais dentro de valores, não deixe vírgula após o último item e feche todas as chaves e listas. Revise também tamanho dos blocos, variedade e não repetição das imagens, coerência do CTA, SEO, atualidade dos dados, correspondência entre afirmações e fontes. Não encurte nem interrompa o JSON.`;export{e as i,t as n,l as r,u as t};
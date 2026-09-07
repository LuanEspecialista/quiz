import{n as e}from"./rolldown-runtime-CbXtAM7H.js";import{Dt as t,Ft as n,Gt as r,Rt as i,et as a,gt as o,vt as s,x as c}from"./vendor-icons-CVRNgPx8.js";import{t as l}from"./vendor-react-BjXiONVe.js";import{t as u}from"./blogEditorial-C7tOeeGb.js";var d=e(r(),1),f=l(),p=`Você é um auditor de tabelas imobiliárias. Analise integralmente o PDF ou imagem anexado e transforme a tabela de vendas em dados estruturados, sem inventar, completar por suposição ou arredondar valores.

OBJETIVO
Extrair TODAS as unidades identificáveis e seus fluxos comerciais. Cada unidade deve permanecer vinculada ao empreendimento, bloco/torre e código corretos. A saída será importada em um sistema; precisão é mais importante que velocidade.

REGRAS OBRIGATÓRIAS
1. Leia todas as páginas, cabeçalhos, rodapés, legendas e observações.
2. Diferencie apartamento, studio, loft, casa, terreno, sala, loja e garagem. Não transforme vaga extra em apartamento.
3. Preserve Disponível, Reservada, Proposta, Bloqueada, Vendida, Permutada ou Fora de tabela. Se a tabela mostrar somente estoque atual, não invente unidades ausentes.
4. Não confunda dormitórios com quartos: dormitórios = quartos + suítes. Exemplo: 1 suíte + 2 quartos = tipologia 2Q+1S e 3 dormitórios.
5. Garden/Giardino, Duplex, Triplex, Cobertura e Penthouse são qualificadores da tipologia, não quantidade de dormitórios.
6. Separe área privativa, total, garagem, terraço, jardim e piscina. Não some áreas sem instrução explícita do documento.
7. Preserve números de vagas, vaga dupla/tripla, hobby box e depósito.
8. Valores devem ser números decimais em BRL, sem “R$” e sem separador de milhar. Não arredonde centavos.
9. Modele cada fase: reserva, ato/entrada, mensais, reforços/balões, chaves, pós-chaves e financiamento. Registre quantidade, valor unitário, percentual total, periodicidade, vencimentos, índice e juros.
10. Se houver alternativas (banco, direto com construtora, à vista ou fluxo misto), mantenha todas separadas. Não escolha uma pelo cliente.
11. Registre CUB, INCC, IPCA, IGP-M ou outro índice exatamente no período indicado, incluindo adicional mensal.
12. Valide para cada unidade: soma das fases versus valor total e soma dos percentuais versus 100%. Diferença de arredondamento deve ser informada; divergência real deve gerar alerta.
13. Quando título e valores divergirem, preserve os valores publicados e registre a divergência. Nunca force o cálculo para combinar com o título.
14. Campo ausente = null. Campo ilegível = null + alerta. Nunca adivinhe.
15. Não produza SQL, explicação comercial ou texto fora do JSON.

SAÍDA
Responda com um único bloco JSON válido, sem markdown, comentários ou reticências, neste formato:
{
  "versao_padrao": 2,
  "documento": { "arquivo": null, "data_tabela": null, "paginas_lidas": [], "moeda": "BRL" },
  "empreendimento": { "nome": null, "construtora": null, "cidade": null, "entrega": null },
  "regras_gerais": {
    "validade": null,
    "correcao_obra": null,
    "correcao_pos_chaves": null,
    "observacoes": []
  },
  "unidades": [
    {
      "identificacao": {
        "numero": null, "torre": null, "bloco": null, "andar": null, "final": null,
        "sku_sugerido": null, "tipo_ativo": null
      },
      "produto": {
        "tipologia_original": null, "tipologia_padrao": null,
        "quartos": null, "suites": null, "dormitorios": null, "banheiros": null,
        "area_privativa_m2": null, "area_total_m2": null, "area_garagem_m2": null,
        "area_terraco_m2": null, "area_jardim_m2": null, "area_piscina_m2": null,
        "vagas": [], "depositos": [], "posicao_solar": null, "vista": null, "complementos": []
      },
      "comercial": {
        "status": null, "valor_tabela": null, "valor_m2": null,
        "valor_anterior": null, "desconto_valor": null, "valor_promocional": null,
        "entrada": null, "validade_preco": null,
        "alternativas_fluxo": [
          {
            "nome": null, "modalidade": null, "percentual_ate_chaves": null,
            "percentual_pos_chaves": null,
            "fases": [
              {
                "momento": null, "nome": null, "quantidade": null,
                "valor_unitario": null, "valor_total": null, "percentual_total": null,
                "vencimento_inicial": null, "periodicidade_meses": null,
                "indice": null, "adicional_mensal_percentual": null, "destino": null
              }
            ]
          }
        ],
        "comissao_valor": null, "comissao_percentual": null,
        "aceita_permuta": null, "restricoes_divulgacao": [], "observacoes": []
      },
      "fonte": { "pagina": null, "linha_original": null, "conferido": true }
    }
  ],
  "validacao": {
    "quantidade_total": 0,
    "por_status": {},
    "por_torre": {},
    "fluxos_conferidos": 0,
    "fluxos_com_divergencia": 0,
    "duplicidades": [],
    "alertas": [],
    "campos_ilegíveis": []
  }
}

Antes de responder, confira novamente a contagem de linhas, códigos repetidos, torres e totais financeiros. O array unidades deve conter todos os registros identificáveis, nunca apenas uma amostra.`,m=`Você é um auditor técnico de memoriais, apresentações e materiais comerciais imobiliários. Analise integralmente todos os PDFs ou imagens anexados e estruture o empreendimento sem inventar informações.

OBJETIVO
Criar um cadastro mestre completo do empreendimento, adequado para apresentação, busca, comparação, afiliados e posterior associação de unidades.

REGRAS OBRIGATÓRIAS
1. Leia todas as páginas, inclusive plantas, mapas, legendas, textos pequenos, rodapés e registros legais.
2. Consolide fatos repetidos, mas preserve divergências em “alertas”; não escolha silenciosamente uma versão.
3. Diferencie construtora, incorporadora, proprietária/SPE, arquitetura, interiores e paisagismo.
4. Localização deve separar endereço, bairro, cidade, estado, coordenadas, distância do mar e referências próximas. Não estime distância.
5. Cronograma deve separar lançamento, início da obra, entrega e Habite-se.
6. Estrutura deve separar torres/blocos, pavimentos, unidades por andar, total de unidades, elevadores e vagas.
7. Tipologias devem usar padrão: Studio, Loft, 1Q, 1S, 1Q+1S, 2Q+1S etc., preservando o texto original. Garden/Giardino, Duplex, Triplex, Cobertura e Penthouse são qualificadores.
8. Separe áreas privativa, total, garagem, jardim e terraço. Não misture área do empreendimento com área das unidades.
9. Liste individualmente áreas de lazer, diferenciais, tecnologia, segurança, acessibilidade e sustentabilidade.
10. Registre restrições comerciais: pré-lançamento, exclusivo para investidores, não divulgar imagens, acesso por afiliado e método de apresentação.
11. Se houver fluxo comercial, use fases e alternativas separadas: direto construtora, banco, misto, consórcio e à vista. Preserve índices e juros por período.
12. Campo ausente = null. Campo ilegível = null + alerta. Nunca use conhecimento externo para completar o material.
13. Toda afirmação relevante deve apontar a página de origem.
14. Não produza SQL nem texto fora do JSON.

SAÍDA
Responda com um único bloco JSON válido, sem markdown, comentários ou reticências:
{
  "versao_padrao": 2,
  "empreendimento": {
    "identidade": {
      "nome_comercial": null, "construtora": null, "incorporadora": null,
      "proprietario_spe": null, "categoria": null, "segmento": null,
      "registro_incorporacao": null, "matricula": null, "site": null, "contato_comercial": null
    },
    "localizacao": {
      "endereco": null, "bairro": null, "cidade": null, "estado": null,
      "latitude": null, "longitude": null, "distancia_mar_m": null,
      "posicao": null, "referencias": []
    },
    "cronograma": {
      "inicio_comercial": null, "inicio_obra": null, "entrega": null,
      "habite_se": null, "prazo_meses": null, "percentual_obra": null
    },
    "produto": {
      "tipo": null, "torres": null, "pavimentos": null, "unidades": null,
      "unidades_por_andar": null, "elevadores": null, "area_terreno_m2": null,
      "area_construida_m2": null, "area_minima_m2": null, "area_maxima_m2": null,
      "blocos": [], "tipologias": [], "ambientes": [], "vagas_por_unidade": null
    },
    "lazer": {
      "quantidade": null, "areas": [], "area_total_m2": null,
      "entregue_equipado": null, "entregue_decorado": null
    },
    "diferenciais": [],
    "tecnologia_sustentabilidade": [],
    "seguranca": [],
    "acessibilidade": [],
    "profissionais": [],
    "comercial": {
      "status": null, "publico": null, "exclusivo_investidores": null,
      "permite_afiliados": null, "restricoes_divulgacao": [],
      "comissao_tipo": null, "comissao_valor": null, "comissao_regra": null,
      "validade_tabela": null, "observacoes": []
    },
    "fluxos_comerciais": [],
    "midias_identificadas": [],
    "fontes": []
  },
  "validacao": {
    "paginas_lidas": [],
    "campos_confirmados": 0,
    "divergencias": [],
    "alertas": [],
    "campos_ilegíveis": [],
    "campos_ausentes_importantes": []
  }
}

Antes de responder, faça uma segunda leitura para conferir números, nomes próprios, datas, contagens, áreas e registro de incorporação. Não resuma listas e nunca devolva apenas exemplos.`;function h({title:e,description:n,prompt:r,icon:i,copied:a,onCopy:s}){return(0,f.jsxs)(`article`,{style:{background:`#101012`,border:`1px solid #26262b`,borderRadius:12,padding:22,display:`grid`,gap:16},children:[(0,f.jsxs)(`div`,{style:{display:`flex`,gap:12,alignItems:`flex-start`},children:[(0,f.jsx)(`div`,{style:{width:42,height:42,borderRadius:10,background:`rgba(213,164,87,.12)`,color:`#d5a457`,display:`grid`,placeItems:`center`,flex:`0 0 auto`},children:(0,f.jsx)(i,{size:21})}),(0,f.jsxs)(`div`,{children:[(0,f.jsx)(`h2`,{style:{margin:0,fontSize:18},children:e}),(0,f.jsx)(`p`,{style:{margin:`6px 0 0`,color:`#92929d`,lineHeight:1.5,fontSize:13},children:n})]})]}),(0,f.jsx)(`div`,{style:{padding:`12px 14px`,borderRadius:8,background:`#0a0a0b`,border:`1px solid #202024`,color:`#777782`,fontSize:12,lineHeight:1.55,height:112,overflow:`hidden`,whiteSpace:`pre-wrap`,maskImage:`linear-gradient(#000 55%, transparent)`},children:r}),(0,f.jsxs)(`button`,{onClick:s,style:{height:42,border:a?`1px solid #218b57`:`1px solid #8e672e`,borderRadius:8,background:a?`#123021`:`#d5a457`,color:a?`#76dfa8`:`#080808`,fontWeight:800,cursor:`pointer`,display:`flex`,justifyContent:`center`,alignItems:`center`,gap:8},children:[a?(0,f.jsx)(t,{size:17}):(0,f.jsx)(o,{size:17}),a?`Prompt copiado`:`Copiar prompt completo`]})]})}function g(){let[e,t]=(0,d.useState)(null),[r,l]=(0,d.useState)(``),g=async(e,n)=>{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(n);else{let e=document.createElement(`textarea`);e.value=n,e.style.position=`fixed`,e.style.opacity=`0`,document.body.appendChild(e),e.select(),document.execCommand(`copy`),e.remove()}t(e),window.setTimeout(()=>t(t=>t===e?null:t),2200)};return(0,f.jsxs)(`section`,{style:{maxWidth:1120,margin:`0 auto`,display:`grid`,gap:22},children:[(0,f.jsxs)(`header`,{children:[(0,f.jsx)(`div`,{style:{color:`#d5a457`,textTransform:`uppercase`,letterSpacing:`.12em`,fontSize:11,fontWeight:800},children:`Inteligência de importação`}),(0,f.jsx)(`h1`,{style:{margin:`7px 0`,fontSize:28},children:`Central de Prompts`}),(0,f.jsx)(`p`,{style:{margin:0,color:`#9696a1`,maxWidth:760,lineHeight:1.55},children:`Use modelos preparados para entregar ao sistema exatamente a estrutura esperada, sem preenchimento manual repetitivo.`})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:9,alignItems:`center`,color:`#8fa695`,background:`#0e1712`,border:`1px solid #1e3b2a`,borderRadius:9,padding:`11px 14px`,fontSize:12},children:[(0,f.jsx)(c,{size:17}),` O resultado ainda deve ser revisado antes da importação quando o PDF estiver borrado, cortado ou tiver cálculos divergentes.`]}),(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(330px, 1fr))`,gap:16},children:[(0,f.jsx)(h,{title:`Prompt de Unidades`,description:`Para tabelas de preço, estoque, disponibilidade e condições de pagamento.`,prompt:p,icon:a,copied:e===`units`,onCopy:()=>void g(`units`,p)}),(0,f.jsx)(h,{title:`Prompt de Empreendimentos`,description:`Para apresentações, memoriais, folders e materiais comerciais completos.`,prompt:m,icon:n,copied:e===`enterprise`,onCopy:()=>void g(`enterprise`,m)})]}),(0,f.jsxs)(`section`,{style:{background:`#101012`,border:`1px solid #493a22`,borderRadius:12,padding:22,display:`grid`,gap:14},children:[(0,f.jsxs)(`div`,{style:{display:`flex`,gap:12,alignItems:`flex-start`},children:[(0,f.jsx)(`div`,{style:{width:42,height:42,borderRadius:10,background:`rgba(213,164,87,.12)`,color:`#d5a457`,display:`grid`,placeItems:`center`},children:(0,f.jsx)(i,{size:21})}),(0,f.jsxs)(`div`,{children:[(0,f.jsx)(`h2`,{style:{margin:0,fontSize:18},children:`Prompt de artigo para o Blog`}),(0,f.jsx)(`p`,{style:{margin:`6px 0 0`,color:`#92929d`,lineHeight:1.5,fontSize:13},children:`Gera texto escaneável, SEO, blocos, plano de imagens, CTA e fontes em um único JSON importável.`})]})]}),(0,f.jsxs)(`label`,{style:{color:`#c9c9cf`,fontSize:12},children:[`Qual é o tema?`,(0,f.jsx)(`textarea`,{value:r,onChange:e=>l(e.target.value),rows:3,placeholder:`Ex.: Como a Selic influencia o financiamento imobiliário e as decisões do investidor em 2026`,style:{width:`100%`,marginTop:6,boxSizing:`border-box`,background:`#09090b`,border:`1px solid #3a3a42`,borderRadius:8,color:`#f4f4f5`,padding:11}})]}),(0,f.jsxs)(`button`,{onClick:()=>void g(`blog`,u(r)),style:{height:42,border:e===`blog`?`1px solid #218b57`:`1px solid #8e672e`,borderRadius:8,background:e===`blog`?`#123021`:`#d5a457`,color:e===`blog`?`#76dfa8`:`#080808`,fontWeight:800,cursor:`pointer`,display:`flex`,justifyContent:`center`,alignItems:`center`,gap:8},children:[(0,f.jsx)(o,{size:17}),e===`blog`?`Prompt copiado`:`Copiar prompt para este tema`]}),(0,f.jsx)(`small`,{style:{color:`#777782`},children:`Na outra IA: cole o prompt, aguarde o JSON, copie a resposta e use “Importar pacote da IA” no editor do Blog.`})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:8,alignItems:`center`,color:`#686872`,fontSize:12},children:[(0,f.jsx)(s,{size:15}),` Versão 2 — compatível com o padrão interno de empreendimentos e unidades.`]})]})}export{g as default};
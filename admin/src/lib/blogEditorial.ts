export type EditorialSectionType = "texto" | "subtitulo" | "destaque" | "dado" | "lista" | "imagem" | "galeria" | "comparativo";

export type EditorialSection = {
  id: string;
  tipo: EditorialSectionType;
  titulo?: string;
  texto?: string;
  itens?: string[];
  imagem_url?: string;
  imagem_alt?: string;
  legenda?: string;
  imagens?: Array<{ url: string; alt: string; legenda?: string }>;
  sugestao_imagem?: string;
};

export type EditorialSource = {
  titulo: string;
  url?: string;
  veiculo?: string;
  data?: string;
};

export type StructuredEditorialBlocks = {
  versao?: number;
  destaque?: string;
  prova?: string;
  curiosidade?: string;
  cta?: string;
  secoes?: EditorialSection[];
  fontes?: EditorialSource[];
};

export const sectionLabels: Record<EditorialSectionType, string> = {
  texto: "Texto curto",
  subtitulo: "Subtítulo",
  destaque: "Frase de destaque",
  dado: "Dado importante",
  lista: "Lista objetiva",
  imagem: "Imagem",
  galeria: "Galeria / slider",
  comparativo: "Comparativo",
};

export const newEditorialSection = (tipo: EditorialSectionType): EditorialSection => ({
  id: crypto.randomUUID(),
  tipo,
  titulo: "",
  texto: "",
  itens: tipo === "lista" || tipo === "comparativo" ? [""] : undefined,
  imagens: tipo === "galeria" ? [] : undefined,
  sugestao_imagem: tipo === "imagem" || tipo === "galeria" ? "" : undefined,
});

export const normalizeEditorialPackage = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("O pacote precisa ser um objeto JSON.");
  const source = value as Record<string, unknown>;
  const blocks = (source.blocos && typeof source.blocos === "object" ? source.blocos : {}) as Record<string, unknown>;
  const rawSections = Array.isArray(blocks.secoes) ? blocks.secoes : Array.isArray(source.secoes) ? source.secoes : [];
  const allowed = new Set(Object.keys(sectionLabels));
  const secoes = rawSections.map((item, index) => {
    const section = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const tipo = allowed.has(String(section.tipo)) ? String(section.tipo) as EditorialSectionType : "texto";
    return {
      ...section,
      id: typeof section.id === "string" && section.id ? section.id : `${Date.now()}-${index}`,
      tipo,
      titulo: typeof section.titulo === "string" ? section.titulo : "",
      texto: typeof section.texto === "string" ? section.texto : "",
      itens: Array.isArray(section.itens) ? section.itens.map(String) : undefined,
      imagens: Array.isArray(section.imagens) ? section.imagens : undefined,
    } as EditorialSection;
  });
  const rawSources = Array.isArray(blocks.fontes) ? blocks.fontes : Array.isArray(source.fontes) ? source.fontes : [];
  const fontes = rawSources.map((item) => {
    const ref = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { titulo: String(ref.titulo || ref.nome || "Fonte consultada"), url: ref.url ? String(ref.url) : "", veiculo: ref.veiculo ? String(ref.veiculo) : "", data: ref.data ? String(ref.data) : "" };
  });
  return { source, blocos: { ...blocks, versao: 2, secoes, fontes } as StructuredEditorialBlocks };
};

export const buildBlogPrompt = (tema: string) => `Você é um editor-chefe especializado em conteúdo patrimonial, imobiliário, econômico e regional para o site de Luan Santos, corretor e especialista no litoral norte de Santa Catarina.

TEMA PRINCIPAL
${tema.trim() || "[INFORME AQUI O TEMA DO ARTIGO]"}

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

Antes de responder, revise tamanho dos blocos, coerência do CTA, SEO, atualidade dos dados, correspondência entre afirmações e fontes e validade do JSON.`;

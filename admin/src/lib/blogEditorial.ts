export type EditorialSectionType = "texto" | "subtitulo" | "destaque" | "dado" | "lista" | "imagem" | "imagem_texto" | "galeria" | "video" | "pergunta" | "cta" | "comparativo";

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
  tamanho?: "pequena" | "media" | "ampla";
  alinhamento?: "esquerda" | "direita" | "centro";
  proporcao?: "quadrada" | "vertical" | "paisagem";
  video_url?: string;
  video_titulo?: string;
  acao_rotulo?: string;
  acao_url?: string;
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
  intencao?: "descoberta" | "guia" | "comparacao" | "decisao" | "oportunidade" | "autoridade";
  leitura_minutos?: number;
  aprendizados?: string[];
  imagem_card_url?: string;
  exibir_hero?: boolean;
};

export const sectionLabels: Record<EditorialSectionType, string> = {
  texto: "Texto curto",
  subtitulo: "Subtítulo",
  destaque: "Frase de destaque",
  dado: "Dado importante",
  lista: "Lista objetiva",
  imagem: "Imagem",
  imagem_texto: "Imagem com texto",
  galeria: "Galeria / slider",
  video: "Vídeo",
  pergunta: "Pergunta ao leitor",
  cta: "Chamada para ação",
  comparativo: "Comparativo",
};

export const newEditorialSection = (tipo: EditorialSectionType): EditorialSection => ({
  id: crypto.randomUUID(),
  tipo,
  titulo: "",
  texto: "",
  itens: tipo === "lista" || tipo === "comparativo" ? [""] : undefined,
  imagens: tipo === "galeria" ? [] : undefined,
  sugestao_imagem: tipo === "imagem" || tipo === "imagem_texto" || tipo === "galeria" ? "" : undefined,
  tamanho: tipo === "imagem" || tipo === "imagem_texto" ? "media" : undefined,
  alinhamento: tipo === "imagem" || tipo === "imagem_texto" ? "esquerda" : undefined,
  proporcao: tipo === "imagem" || tipo === "imagem_texto" ? "paisagem" : undefined,
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
      tamanho: ["pequena", "media", "ampla"].includes(String(section.tamanho)) ? section.tamanho : "media",
      alinhamento: ["esquerda", "direita", "centro"].includes(String(section.alinhamento)) ? section.alinhamento : "esquerda",
      proporcao: ["quadrada", "vertical", "paisagem"].includes(String(section.proporcao)) ? section.proporcao : "paisagem",
    } as EditorialSection;
  });
  const rawSources = Array.isArray(blocks.fontes) ? blocks.fontes : Array.isArray(source.fontes) ? source.fontes : [];
  const fontes = rawSources.map((item) => {
    const ref = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { titulo: String(ref.titulo || ref.nome || "Fonte consultada"), url: ref.url ? String(ref.url) : "", veiculo: ref.veiculo ? String(ref.veiculo) : "", data: ref.data ? String(ref.data) : "" };
  });
  return { source, blocos: { ...blocks, versao: 2, secoes, fontes } as StructuredEditorialBlocks };
};

export type ParsedEditorialPackage = ReturnType<typeof normalizeEditorialPackage> & {
  repaired: boolean;
  avisos: string[];
};

const editorialWarnings = (parsed: ReturnType<typeof normalizeEditorialPackage>) => {
  const sections = parsed.blocos.secoes || [];
  const media = sections.filter((item) => ["imagem", "imagem_texto", "galeria", "video"].includes(item.tipo));
  const chars = sections.reduce((sum, item) => sum + (item.texto?.length || 0) + (item.itens || []).join(" ").length, 0);
  const warnings: string[] = [];
  if (sections.length > 10) warnings.push("Há blocos demais. Agrupe ideias para evitar uma leitura cansativa.");
  if (chars > 6000) warnings.push("O conteúdo ultrapassa 6.000 caracteres e deve ser resumido antes da publicação.");
  if (chars > 3500 && media.length < 3) warnings.push("Artigo longo com pouca mídia: use ao menos 3 imagens, galerias ou vídeos.");
  if (sections.some((item) => (item.texto?.length || 0) > 900)) warnings.push("Existe bloco de texto acima de 900 caracteres.");
  if (!sections.some((item) => ["pergunta", "cta"].includes(item.tipo))) warnings.push("Inclua ao menos uma interação ou chamada para ação durante a leitura.");
  return warnings;
};

const jsonErrorPosition = (error: unknown) => {
  const match = error instanceof Error ? error.message.match(/position\s+(\d+)/i) : null;
  return match ? Number(match[1]) : null;
};

const isEscaped = (value: string, index: number) => {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) slashes += 1;
  return slashes % 2 === 1;
};

const escapeLiteralLineBreaks = (value: string) => {
  let result = "";
  let inString = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"' && !isEscaped(value, index)) inString = !inString;
    if (inString && (char === "\n" || char === "\r")) result += "\\n";
    else result += char;
  }
  return result;
};

const cleanJsonEnvelope = (raw: string) => {
  const withoutFence = raw.replace(/^\uFEFF/, "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  return start >= 0 && end > start ? withoutFence.slice(start, end + 1) : withoutFence;
};

export const describeJsonError = (raw: string, error: unknown) => {
  const position = jsonErrorPosition(error);
  if (position === null) return error instanceof Error ? error.message : "JSON inválido.";
  const before = raw.slice(0, position);
  const line = before.split("\n").length;
  const column = position - before.lastIndexOf("\n");
  const excerpt = raw.slice(Math.max(0, position - 42), Math.min(raw.length, position + 42)).replace(/\s+/g, " ").trim();
  return `Erro próximo da linha ${line}, coluna ${column}: “…${excerpt}…”. Verifique aspas, vírgulas e chaves nesse trecho.`;
};

export const parseEditorialPackage = (raw: string): ParsedEditorialPackage => {
  let candidate = escapeLiteralLineBreaks(cleanJsonEnvelope(raw)).replace(/,\s*([}\]])/g, "$1");
  let repaired = candidate !== raw.trim();
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const normalized = normalizeEditorialPackage(JSON.parse(candidate));
      return { ...normalized, repaired, avisos: editorialWarnings(normalized) };
    } catch (error) {
      lastError = error;
      const position = jsonErrorPosition(error);
      if (position === null || position < 1 || position >= candidate.length) break;
      const unexpected = candidate[position];
      if (!/[\p{L}\p{N}]/u.test(unexpected)) break;
      let quote = position - 1;
      while (quote >= 0 && (candidate[quote] !== '"' || isEscaped(candidate, quote))) quote -= 1;
      if (quote < 0) break;
      candidate = `${candidate.slice(0, quote)}\\${candidate.slice(quote)}`;
      repaired = true;
    }
  }
  throw new Error(describeJsonError(candidate, lastError));
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
10. Abra com benefício concreto e curiosidade; entregue valor antes de vender. Use frases curtas, linguagem humana e autoridade local de Luan Santos.

ARQUITETURA EDITORIAL
1. Produza uma experiência escaneável, com ritmo e espaços de respiração.
2. Cada bloco de texto deve ter no máximo 2 ou 3 parágrafos curtos.
3. Escolha um layout entre: artigo, guia, mercado, comparativo, case ou imovel de acordo com a intenção, não aleatoriamente.
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

Antes de responder, valide o JSON como se fosse executar JSON.parse: use barra invertida antes de qualquer aspa interna ao texto, não use quebras de linha literais dentro de valores, não deixe vírgula após o último item e feche todas as chaves e listas. Revise também tamanho dos blocos, variedade e não repetição das imagens, coerência do CTA, SEO, atualidade dos dados, correspondência entre afirmações e fontes. Não encurte nem interrompa o JSON.`;

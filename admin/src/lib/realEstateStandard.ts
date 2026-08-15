export const STANDARD_VERSION = 2 as const;

export const TYPOLOGY_OPTIONS = [
  "Studio", "Loft", "1Q", "1S", "1Q+1S", "2Q", "2S", "2Q+1S", "1Q+2S",
  "3Q", "3S", "3Q+1S", "2Q+2S", "1Q+3S", "4Q", "4S",
  "Garden / Giardino", "Duplex", "Triplex", "Cobertura", "Cobertura Duplex", "Penthouse",
] as const;

export type UnitAvailability = "Disponível" | "Reservada" | "Proposta" | "Bloqueada" | "Vendida" | "Permutada" | "Fora de tabela";
export type AssetKind = "Apartamento" | "Studio" | "Loft" | "Casa" | "Sobrado" | "Terreno" | "Sala comercial" | "Loja" | "Garagem" | "Residencial" | "Comercial" | "Outro";
export type PaymentIndex = "Sem correção" | "CUB" | "INCC" | "IPCA" | "IGP-M" | "Poupança" | "CDI" | "Outro";
export type PaymentDestination = "Construtora" | "Incorporadora" | "Financiamento bancário" | "Consórcio" | "Quitação" | "Outro";
export type FlexibleFields = Record<string, string | number | boolean | null | string[] | number[] | Record<string, unknown>>;

export type CorrectionRule = {
  indice: PaymentIndex;
  indice_personalizado?: string;
  adicional_mensal_percentual?: number;
  inicio?: string;
  fim?: string;
  somente_variacao_positiva?: boolean;
  observacoes?: string;
};

export type PaymentPhase = {
  id: string;
  nome: string;
  momento: "reserva" | "ato" | "mensal" | "reforco" | "chaves" | "pos_chaves" | "financiamento" | "outro";
  quantidade: number;
  percentual_total?: number;
  valor_total?: number;
  valor_unitario?: number;
  parcela_inicial?: number;
  parcela_final?: number;
  vencimento_inicial?: string;
  vencimento_final?: string;
  periodicidade_meses?: number;
  indice: PaymentIndex;
  correcao?: CorrectionRule;
  juros_mensais?: number;
  juros_anuais?: number;
  carencia_meses?: number;
  destino: PaymentDestination;
  condicao?: string;
  extensoes?: FlexibleFields;
};

export type FlowAlternative = {
  id: string;
  nome: string;
  modalidade: "direto_construtora" | "financiamento_bancario" | "misto" | "consorcio" | "a_vista" | "personalizado";
  padrao?: boolean;
  percentual_ate_chaves?: number;
  percentual_pos_chaves?: number;
  fases: PaymentPhase[];
  regras_correcao?: CorrectionRule[];
  observacoes?: string;
  extensoes?: FlexibleFields;
};

export type CommercialFlow = {
  versao: typeof STANDARD_VERSION;
  nome: string;
  moeda: "BRL" | "USD" | "EUR" | string;
  percentual_ate_chaves?: number;
  percentual_pos_chaves?: number;
  entrega?: string;
  permite_financiamento_bancario: boolean;
  fases: PaymentPhase[];
  alternativas?: FlowAlternative[];
  regras_correcao?: CorrectionRule[];
  negociavel?: boolean;
  tolerancia_percentual?: number;
  observacoes?: string;
  fonte?: { arquivo?: string; data_tabela?: string; pagina?: number; conferencia?: string };
  extensoes?: FlexibleFields;
};

export type EnterpriseStandard = {
  versao: typeof STANDARD_VERSION;
  identidade?: {
    nome_comercial?: string;
    construtora?: string;
    incorporadora?: string;
    categoria?: string;
    segmento?: string;
    registro_incorporacao?: string;
    matricula?: string;
    proprietario_spe?: string;
    site?: string;
    contato_comercial?: string;
    extensoes?: FlexibleFields;
  };
  localizacao?: {
    endereco?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    latitude?: number;
    longitude?: number;
    distancia_mar_m?: number;
    posicao?: string;
    referencias?: string[];
    extensoes?: FlexibleFields;
  };
  cronograma?: {
    inicio_comercial?: string;
    inicio_obra?: string;
    entrega?: string;
    habite_se?: string;
    prazo_meses?: number;
    percentual_obra?: number;
    extensoes?: FlexibleFields;
  };
  produto?: {
    torres?: number;
    pavimentos?: number;
    unidades?: number;
    unidades_por_andar?: number;
    elevadores?: number;
    vagas_por_unidade?: string;
    tipologias?: string[];
    area_minima_m2?: number;
    area_maxima_m2?: number;
    area_terreno_m2?: number;
    area_construida_m2?: number;
    blocos?: Array<{ nome: string; pavimentos?: number; unidades?: number; elevadores?: number; extensoes?: FlexibleFields }>;
    ambientes?: string[];
    extensoes?: FlexibleFields;
  };
  lazer?: { quantidade?: number; areas?: string[]; area_total_m2?: number; entregue_equipado?: boolean; entregue_decorado?: boolean; extensoes?: FlexibleFields };
  diferenciais?: string[];
  tecnologia_sustentabilidade?: string[];
  profissionais?: Array<{ funcao: string; nome: string }>;
  comercial?: {
    status?: string;
    publico?: boolean;
    exclusivo_investidores?: boolean;
    permite_afiliados?: boolean;
    restricoes_divulgacao?: string[];
    comissao_tipo?: "percentual" | "valor" | "regra";
    comissao_valor?: number;
    comissao_regra?: string;
    validade_tabela?: string;
    observacoes?: string;
    extensoes?: FlexibleFields;
  };
  midias?: Array<{ tipo: "capa" | "galeria" | "planta" | "video" | "tour" | "documento" | "outro"; url: string; titulo?: string; ordem?: number; publico?: boolean }>;
  fluxo_comercial?: CommercialFlow;
  fonte?: { arquivo?: string; data_documento?: string; paginas?: number[]; conferido?: boolean };
  extensoes?: FlexibleFields;
};

export type UnitStandard = {
  versao: typeof STANDARD_VERSION;
  identificacao: {
    empreendimento: string;
    torre?: string;
    numero: string;
    andar?: number;
    sku: string;
    tipo_ativo: AssetKind;
    bloco?: string;
    final?: string;
    pavimento?: string;
    extensoes?: FlexibleFields;
  };
  produto: {
    tipologia_original?: string;
    tipologia_padrao: string;
    quartos: number;
    suites: number;
    dormitorios: number;
    banheiros?: number;
    vagas: number;
    area_privativa_m2?: number;
    area_total_m2?: number;
    area_garagem_m2?: number;
    area_terraço_m2?: number;
    area_jardim_m2?: number;
    area_piscina_m2?: number;
    posicao_solar?: string;
    orientacao?: string;
    vista?: string;
    mobiliada?: boolean;
    decorada?: boolean;
    vagas_identificadas?: Array<{ numero: string; tipo?: "simples" | "dupla" | "tripla" | "especial" | "moto"; coberta?: boolean }>;
    depositos?: Array<{ numero?: string; tipo: "hobby box" | "depósito" | "outro"; area_m2?: number }>;
    complementos?: string[];
    planta?: string;
    extensoes?: FlexibleFields;
  };
  comercial: {
    status: UnitAvailability;
    valor_tabela?: number;
    valor_m2?: number;
    valor_anterior?: number;
    desconto_valor?: number;
    desconto_percentual?: number;
    valor_promocional?: number;
    validade_preco?: string;
    entrada?: number;
    fluxo?: CommercialFlow;
    fluxos_alternativos?: FlowAlternative[];
    comissao_valor?: number;
    comissao_percentual?: number;
    aceita_permuta?: boolean;
    permuta_limite_percentual?: number;
    restricoes_divulgacao?: string[];
    observacoes?: string;
    extensoes?: FlexibleFields;
  };
  historico?: Array<{ data: string; status?: UnitAvailability; valor_tabela?: number; fonte?: string }>;
  midias?: Array<{ tipo: "imagem" | "planta" | "video" | "documento" | "outro"; url: string; titulo?: string; publico?: boolean }>;
  fonte?: { arquivo?: string; data_tabela?: string; pagina?: number; linha_original?: string; conferido?: boolean };
  extensoes?: FlexibleFields;
};

const normalized = (value: unknown) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function parseStandardTypology(value: unknown, fallbackBedrooms = 0) {
  const raw = normalized(value);
  const studio = /studio|loft|integrada/.test(raw);
  if (studio) return { key: /loft/.test(raw) ? "loft" : "studio", label: /loft/.test(raw) ? "Loft" : "Studio", quartos: 0, suites: 0, dormitorios: 0, studio: true };
  const count = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match) return Number(match[1]);
    }
    return 0;
  };
  const suites = count([/(\d+)\s*(?:suite|suites)/, /(?:^|[+\s])(\d+)\s*s(?:$|[+\s])/]);
  const quartosDescritos = count([/(\d+)\s*(?:quarto|quartos|dorm|dormitorios)/, /(?:^|[+\s])(\d+)\s*q(?:$|[+\s])/]);
  const dormitorios = quartosDescritos + suites || fallbackBedrooms;
  const quartos = quartosDescritos || Math.max(0, dormitorios - suites);
  const composition = [`${quartos}Q`, `${suites}S`].filter((item) => !item.startsWith("0")).join("+");
  const qualifiers = [
    /garden|giardino/.test(raw) ? "Garden" : "",
    /triplex/.test(raw) ? "Triplex" : (/duplex/.test(raw) ? "Duplex" : ""),
    /penthouse/.test(raw) ? "Penthouse" : "",
    /cobertura/.test(raw) ? "Cobertura" : "",
  ].filter(Boolean);
  const label = [composition, ...qualifiers].filter(Boolean).join(" · ") || String(value || "Não informado");
  return { key: normalized(label).replace(/\s/g, ""), label, quartos, suites, dormitorios, studio: false };
}

export function readCommercialFlow(enterprise: any): Partial<CommercialFlow> & Record<string, any> {
  return enterprise?.caracteristicas?.padrao_empreendimento?.fluxo_comercial
    || enterprise?.caracteristicas?.fluxo_comercial
    || {};
}

export function mergeEnterpriseStandard(current: unknown, standard: EnterpriseStandard) {
  const source = current && typeof current === "object" ? current as Record<string, unknown> : {};
  return { ...source, padrao_empreendimento: standard, fluxo_comercial: standard.fluxo_comercial || source.fluxo_comercial };
}

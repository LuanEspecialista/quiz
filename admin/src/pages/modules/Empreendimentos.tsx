import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Edit3,
  Image as ImageIcon,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
  Save,
  AlertCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { mergeEnterpriseStandard, parseStandardTypology, STANDARD_VERSION, TYPOLOGY_OPTIONS, type CommercialFlow } from "../../lib/realEstateStandard";
import { deliveryDateIso, deliveryLabelPt, normalizeDeliveryMonth } from "../../lib/deliveryDate";
import CurrencyInput from "../../components/CurrencyInput";

type Empreendimento = {
  id: string;
  nome?: string | null;
  titulo?: string | null;
  slug?: string | null;
  construtora_id?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  endereco?: string | null;
  tipo?: string | null;
  status?: string | null;
  descricao?: string | null;
  entrega?: string | null;
  entrega_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  numero_torres?: number | null;
  numero_pavimentos?: number | null;
  numero_unidades?: number | null;
  area_minima?: number | null;
  area_maxima?: number | null;
  faixa_preco?: number | null;
  valorizacao_aa?: number | null;
  quartos_disponiveis?: number[] | null;
  caracteristicas?: Record<string, unknown> | null;
  regras_correcao?: Record<string, unknown> | null;
  imagem_url?: string | null;
  ativo?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  unidades_cadastradas?: number;
  menor_preco_disponivel?: number | null;
  maior_preco_disponivel?: number | null;
  tipologias_estoque?: string[];
};

type EmpreendimentoImagem = {
  id: string;
  empreendimento_id: string;
  url: string;
  storage_path?: string | null;
  ordem?: number;
  titulo?: string | null;
  categoria?: string | null;
  tipologia_referencia?: string | null;
  visivel_cliente?: boolean;
  visivel_afiliado?: boolean;
  created_at?: string;
};

type FormData = {
  nome: string;
  construtora_id: string;
  cidade: string;
  bairro: string;
  endereco: string;
  tipo: string;
  status: string;
  entrega: string;
  inicio_comercial: string;
  percentual_ate_chaves: string;
  percentual_ato: string;
  baloes_por_ano: string;
  responsavel_pre_chaves: string;
  indice_pre_chaves: string;
  juros_pre_chaves: string;
  modelo_pos_chaves: string;
  parcelas_pos_chaves: string;
  indice_pos_chaves: string;
  juros_pos_chaves: string;
  permite_banco_pos_chaves: boolean;
  numero_torres: string;
  numero_pavimentos: string;
  numero_unidades: string;
  area_minima: string;
  area_maxima: string;
  faixa_preco: string;
  valorizacao_aa: string;
  tipologias_disponiveis: string[];
  descricao: string;
  imagem_url: string;
  ativo: boolean;
};

const STATUS_OPTIONS = [
  "Todos",
  "Pré-lançamento",
  "Lançamento",
  "Em obras",
  "Pronto",
  "Entregue",
  "Esgotado",
];

const TIPOLOGIA_OPTIONS = TYPOLOGY_OPTIONS;

function tipologiaBedrooms(value: string) {
  if (["Studio", "Loft"].includes(value)) return 0;
  return Array.from(value.matchAll(/(\d+)\s*[QS]/gi)).reduce((total, match) => total + Number(match[1]), 0);
}

function storedTipologias(item: Empreendimento) {
  const configured = item.caracteristicas && Array.isArray(item.caracteristicas.tipologias)
    ? item.caracteristicas.tipologias.filter((value): value is string => typeof value === "string")
    : [];
  if (configured.length) return configured;
  return (item.quartos_disponiveis || []).map((value) => value === 0 ? "Studio" : `${value}Q`);
}

const EMPTY_FORM: FormData = {
  nome: "",
  construtora_id: "",
  cidade: "",
  bairro: "",
  endereco: "",
  tipo: "",
  status: "Lançamento",
  entrega: "",
  inicio_comercial: "",
  percentual_ate_chaves: "",
  percentual_ato: "",
  baloes_por_ano: "1",
  responsavel_pre_chaves: "construtora",
  indice_pre_chaves: "CUB",
  juros_pre_chaves: "",
  modelo_pos_chaves: "financiamento_bancario",
  parcelas_pos_chaves: "",
  indice_pos_chaves: "IPCA",
  juros_pos_chaves: "",
  permite_banco_pos_chaves: true,
  numero_torres: "",
  numero_pavimentos: "",
  numero_unidades: "",
  area_minima: "",
  area_maxima: "",
  faixa_preco: "",
  valorizacao_aa: "",
  tipologias_disponiveis: [],
  descricao: "",
  imagem_url: "",
  ativo: true,
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const STORAGE_REFERENCE_PREFIX = "storage://empreendimentos/";

function coverReference(storagePath?: string | null, fallbackUrl = "") {
  return storagePath ? `${STORAGE_REFERENCE_PREFIX}${storagePath}` : fallbackUrl;
}

function isStoredCover(value?: string | null) {
  return Boolean(value?.startsWith(STORAGE_REFERENCE_PREFIX));
}

function coverStoragePath(value?: string | null) {
  return isStoredCover(value) ? value!.slice(STORAGE_REFERENCE_PREFIX.length) : null;
}

function resolveCoverUrl(cover: string | null | undefined, images: EmpreendimentoImagem[]) {
  const path = coverStoragePath(cover);
  if (!path) return cover || "";
  return images.find((image) => image.storage_path === path)?.url || "";
}

function imageIsCover(cover: string | null | undefined, image: EmpreendimentoImagem) {
  const path = coverStoragePath(cover);
  return path ? image.storage_path === path : Boolean(cover && cover === image.url);
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return formatCurrency(value);
}

function getStatusClass(status?: string | null) {
  const value = normalize(status);
  if (value.includes("pronto") || value.includes("entregue")) return "ready";
  if (value.includes("obra")) return "construction";
  if (value.includes("esgotado")) return "sold";
  return "launch";
}

export default function Empreendimentos() {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [construtoras, setConstrutoras] = useState<
    { id: string; nome?: string | null; name?: string | null }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [ativoFilter, setAtivoFilter] = useState("Todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empreendimento | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const [selectedForImages, setSelectedForImages] = useState<Empreendimento | null>(null);
  const [imagensGaleria, setImagensGaleria] = useState<EmpreendimentoImagem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [galeriasMap, setGaleriasMap] = useState<Record<string, string[]>>({});
  const [activeImageIndexes, setActiveImageIndexes] = useState<Record<string, number>>({});

  async function ensureBucketExists() {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === "empreendimentos");
      if (!exists) {
        await supabase.storage.createBucket("empreendimentos", {
          public: false,
        });
      }
    } catch (error) { throw error; }
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      await ensureBucketExists();

      const [empRes, constRes, imgRes, unitsRes] = await Promise.all([
        supabase
          .from("empreendimentos")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("construtoras")
          .select("id, nome")
          .order("nome", { ascending: true }),
        supabase
          .from("empreendimento_imagens")
          .select("*"),
        supabase
          .from("unidades")
          .select("empreendimento_id, tipologia, tipologia_dados, valor_tabela, status")
      ]);

      if (empRes.error) throw empRes.error;

      const unitMetrics = new Map<string, { total: number; minAvailable: number | null; maxAvailable: number | null; typologies: Set<string> }>();
      (unitsRes.data || []).forEach((unit: any) => {
        const id = String(unit.empreendimento_id || "");
        if (!id) return;
        const metric = unitMetrics.get(id) || { total: 0, minAvailable: null, maxAvailable: null, typologies: new Set<string>() };
        metric.total += 1;
        const parsed = parseStandardTypology(unit.tipologia_dados?.original || unit.tipologia);
        if (parsed.label && parsed.label !== "Não informado") metric.typologies.add(parsed.label);
        const available = ["disponivel", "disponível"].includes(normalize(unit.status));
        const price = Number(unit.valor_tabela);
        if (available && Number.isFinite(price) && price > 0) {
          metric.minAvailable = metric.minAvailable == null ? price : Math.min(metric.minAvailable, price);
          metric.maxAvailable = metric.maxAvailable == null ? price : Math.max(metric.maxAvailable, price);
        }
        unitMetrics.set(id, metric);
      });
      const listaEmps = ((empRes.data || []) as Empreendimento[]).map((emp) => {
        const metric = unitMetrics.get(String(emp.id));
        return metric ? {
          ...emp,
          unidades_cadastradas: metric.total,
          menor_preco_disponivel: metric.minAvailable,
          maior_preco_disponivel: metric.maxAvailable,
          tipologias_estoque: Array.from(metric.typologies).sort(),
        } : emp;
      });
      const todasImagens = await Promise.all(((imgRes.data || []) as EmpreendimentoImagem[]).map(async(img)=>{
        if(!img.storage_path)return img;
        const{data}=await supabase.storage.from("empreendimentos").createSignedUrl(img.storage_path,3600);
        return data?.signedUrl?{...img,url:data.signedUrl}:img;
      }));

      const map: Record<string, string[]> = {};
      listaEmps.forEach((emp) => {
        const imgsDoEmp = todasImagens
          .filter((img) => img.empreendimento_id === emp.id)
          .map((img) => img.url);

        const coverUrl = resolveCoverUrl(emp.imagem_url, todasImagens.filter((img) => img.empreendimento_id === emp.id));
        const listaFinal = [...imgsDoEmp];
        if (coverUrl && !listaFinal.includes(coverUrl)) {
          listaFinal.unshift(coverUrl);
        } else if (listaFinal.length === 0 && coverUrl) {
          listaFinal.push(coverUrl);
        }

        map[emp.id] = listaFinal;
      });

      setGaleriasMap(map);
      setEmpreendimentos(listaEmps);
      setConstrutoras((constRes.data || []) as any[]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Não foi possível carregar os empreendimentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const tiposDisponiveis = useMemo(() => {
    const tiposSet = new Set<string>();
    empreendimentos.forEach((item) => {
      if (item.tipo) tiposSet.add(item.tipo.trim());
    });
    return ["Todos", ...Array.from(tiposSet)];
  }, [empreendimentos]);

  const filtered = useMemo(() => {
    const term = normalize(search);
    return empreendimentos.filter((item) => {
      const matchesSearch =
        !term ||
        normalize(item.nome).includes(term) ||
        normalize(item.titulo).includes(term) ||
        normalize(item.cidade).includes(term) ||
        normalize(item.bairro).includes(term) ||
        normalize(item.endereco).includes(term);

      const matchesStatus =
        statusFilter === "Todos" ||
        normalize(item.status) === normalize(statusFilter);

      const matchesTipo =
        tipoFilter === "Todos" ||
        normalize(item.tipo) === normalize(tipoFilter);

      const matchesAtivo =
        ativoFilter === "Todos" ||
        (ativoFilter === "Ativos" && item.ativo !== false) ||
        (ativoFilter === "Inativos" && item.ativo === false);

      return matchesSearch && matchesStatus && matchesTipo && matchesAtivo;
    });
  }, [empreendimentos, search, statusFilter, tipoFilter, ativoFilter]);

  function getConstrutoraName(id?: string | null) {
    if (!id) return "Construtora não definida";
    const construtora = construtoras.find((item) => item.id === id);
    return construtora?.nome || construtora?.name || "Construtora não definida";
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(item: Empreendimento) {
    const fluxoComercial = item.caracteristicas && typeof item.caracteristicas.fluxo_comercial === "object"
      ? item.caracteristicas.fluxo_comercial as Record<string, unknown>
      : {};
    setEditing(item);
    setForm({
      nome: item.nome || item.titulo || "",
      construtora_id: item.construtora_id || "",
      cidade: item.cidade || "",
      bairro: item.bairro || "",
      endereco: item.endereco || "",
      tipo: item.tipo || "",
      status: item.status || "Lançamento",
      entrega: normalizeDeliveryMonth(item.entrega_date || item.entrega) || "",
      inicio_comercial: String(fluxoComercial.inicio_comercial || ""),
      percentual_ate_chaves: fluxoComercial.percentual_ate_chaves != null ? String(fluxoComercial.percentual_ate_chaves) : "",
      percentual_ato: fluxoComercial.percentual_ato != null ? String(fluxoComercial.percentual_ato) : "",
      baloes_por_ano: fluxoComercial.baloes_por_ano != null ? String(fluxoComercial.baloes_por_ano) : "1",
      responsavel_pre_chaves: String(fluxoComercial.responsavel_pre_chaves || "construtora"),
      indice_pre_chaves: String(fluxoComercial.indice_pre_chaves || item.regras_correcao?.indice_pre_chaves || "CUB"),
      juros_pre_chaves: fluxoComercial.juros_pre_chaves != null ? String(fluxoComercial.juros_pre_chaves) : "",
      modelo_pos_chaves: String(fluxoComercial.modelo_pos_chaves || "financiamento_bancario"),
      parcelas_pos_chaves: fluxoComercial.parcelas_pos_chaves != null ? String(fluxoComercial.parcelas_pos_chaves) : "",
      indice_pos_chaves: String(fluxoComercial.indice_pos_chaves || item.regras_correcao?.indice_pos_chaves || "IPCA"),
      juros_pos_chaves: fluxoComercial.juros_pos_chaves != null ? String(fluxoComercial.juros_pos_chaves) : String(item.regras_correcao?.juros_pos_chaves_am || ""),
      permite_banco_pos_chaves: fluxoComercial.permite_banco_pos_chaves !== false,
      numero_torres: item.numero_torres != null ? String(item.numero_torres) : "",
      numero_pavimentos: item.numero_pavimentos != null ? String(item.numero_pavimentos) : "",
      numero_unidades: item.numero_unidades != null ? String(item.numero_unidades) : "",
      area_minima: item.area_minima != null ? String(item.area_minima) : "",
      area_maxima: item.area_maxima != null ? String(item.area_maxima) : "",
      faixa_preco: item.faixa_preco != null ? String(item.faixa_preco) : "",
      valorizacao_aa: item.valorizacao_aa != null ? String(item.valorizacao_aa) : "",
      tipologias_disponiveis: storedTipologias(item),
      descricao: item.descricao || "",
      imagem_url: item.imagem_url || "",
      ativo: item.ativo ?? true,
    });
    setModalOpen(true);
  }

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function toggleAtivoRapido(item: Empreendimento, e: React.MouseEvent) {
    e.stopPropagation();
    const novoStatus = !(item.ativo ?? true);
    
    setEmpreendimentos((current) =>
      current.map((emp) => (emp.id === item.id ? { ...emp, ativo: novoStatus } : emp))
    );

    try {
      const { error } = await supabase
        .from("empreendimentos")
        .update({ ativo: novoStatus })
        .eq("id", item.id);

      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setEmpreendimentos((current) =>
        current.map((emp) => (emp.id === item.id ? { ...emp, ativo: !novoStatus } : emp))
      );
      setError("Não foi possível alterar o status de ativação.");
    }
  }

  async function save() {
    if (!form.nome.trim()) {
      setError("Informe o nome do empreendimento.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: Record<string, any> = {
        nome: form.nome.trim(),
        construtora_id: form.construtora_id || null,
        cidade: form.cidade.trim() || null,
        bairro: form.bairro.trim() || null,
        endereco: form.endereco.trim() || null,
        tipo: form.tipo.trim() || null,
        status: form.status || null,
        entrega: form.entrega.trim() || null,
        entrega_date: deliveryDateIso(form.entrega),
        descricao: form.descricao.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        ativo: form.ativo,
      };

      if (form.numero_torres) payload.numero_torres = Number(form.numero_torres);
      payload.numero_pavimentos = form.numero_pavimentos === "" ? null : Number(form.numero_pavimentos);
      if (form.numero_unidades) payload.numero_unidades = Number(form.numero_unidades);
      if (form.area_minima) payload.area_minima = Number(form.area_minima);
      if (form.area_maxima) payload.area_maxima = Number(form.area_maxima);
      if (form.faixa_preco) payload.faixa_preco = Number(form.faixa_preco.replace(/\D/g, ""));
      payload.valorizacao_aa = form.valorizacao_aa === "" ? null : Number(form.valorizacao_aa.replace(",", "."));
      payload.quartos_disponiveis = form.tipologias_disponiveis
        .map(tipologiaBedrooms)
        .filter((value, index, list) => Number.isInteger(value) && value >= 0 && list.indexOf(value) === index)
        .sort((a, b) => a - b);
      const commercialFlow: CommercialFlow = {
          versao: STANDARD_VERSION,
          nome: form.percentual_ate_chaves ? `${form.percentual_ate_chaves}% até as chaves` : "Fluxo comercial",
          moeda: "BRL",
          inicio_comercial: form.inicio_comercial || null,
          percentual_ate_chaves: form.percentual_ate_chaves === "" ? null : Number(form.percentual_ate_chaves.replace(",", ".")),
          percentual_pos_chaves: form.percentual_ate_chaves === "" ? undefined : 100 - Number(form.percentual_ate_chaves.replace(",", ".")),
          percentual_ato: form.percentual_ato === "" ? null : Number(form.percentual_ato.replace(",", ".")),
          baloes_por_ano: form.baloes_por_ano === "" ? 0 : Number(form.baloes_por_ano),
          responsavel_pre_chaves: form.responsavel_pre_chaves,
          indice_pre_chaves: form.indice_pre_chaves || null,
          juros_pre_chaves: form.juros_pre_chaves === "" ? null : Number(form.juros_pre_chaves.replace(",", ".")),
          modelo_pos_chaves: form.modelo_pos_chaves,
          parcelas_pos_chaves: form.parcelas_pos_chaves === "" ? null : Number(form.parcelas_pos_chaves),
          indice_pos_chaves: form.indice_pos_chaves || null,
          juros_pos_chaves: form.juros_pos_chaves === "" ? null : Number(form.juros_pos_chaves.replace(",", ".")),
          permite_banco_pos_chaves: form.permite_banco_pos_chaves,
          permite_financiamento_bancario: form.permite_banco_pos_chaves,
          entrega: form.entrega || undefined,
          fases: [],
      } as CommercialFlow;
      payload.caracteristicas = {
        ...mergeEnterpriseStandard(editing?.caracteristicas, {
          versao: STANDARD_VERSION,
          identidade: { nome_comercial: form.nome, categoria: form.tipo },
          localizacao: { endereco: form.endereco, bairro: form.bairro, cidade: form.cidade },
          cronograma: { inicio_comercial: form.inicio_comercial || undefined, entrega: form.entrega || undefined },
          produto: {
            torres: form.numero_torres === "" ? undefined : Number(form.numero_torres),
            unidades: form.numero_unidades === "" ? undefined : Number(form.numero_unidades),
            tipologias: form.tipologias_disponiveis,
            area_minima_m2: form.area_minima === "" ? undefined : Number(form.area_minima.replace(",", ".")),
            area_maxima_m2: form.area_maxima === "" ? undefined : Number(form.area_maxima.replace(",", ".")),
          },
          fluxo_comercial: commercialFlow,
        }),
        tipologias: form.tipologias_disponiveis,
      };

      if (editing) {
        const { data, error } = await supabase
          .from("empreendimentos")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();

        if (error) throw error;
        setEmpreendimentos((current) =>
          current.map((item) => (item.id === editing.id ? (data as Empreendimento) : item))
        );
      } else {
        const { data, error } = await supabase
          .from("empreendimentos")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setEmpreendimentos((current) => [data as Empreendimento, ...current]);
      }

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Não foi possível salvar o empreendimento.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Empreendimento) {
    const confirmed = window.confirm(
      `Excluir "${item.nome || item.titulo}"?\n\nEssa ação pode falhar caso existam registros vinculados.`
    );
    if (!confirmed) return;

    try {
      setError("");
      const { error } = await supabase.from("empreendimentos").delete().eq("id", item.id);
      if (error) throw error;
      setEmpreendimentos((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Não foi possível excluir este empreendimento.");
    }
  }

  async function openImages(item: Empreendimento) {
    setSelectedForImages(item);
    setImageModalOpen(true);
    await carregarImagensGaleria(item.id);
  }

  async function carregarImagensGaleria(empreendimentoId: string) {
    try {
      const { data, error } = await supabase
        .from("empreendimento_imagens")
        .select("*")
        .eq("empreendimento_id", empreendimentoId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const signed=await Promise.all((data as EmpreendimentoImagem[]).map(async(img)=>{if(!img.storage_path)return img;const{data:url}=await supabase.storage.from("empreendimentos").createSignedUrl(img.storage_path,3600);return url?.signedUrl?{...img,url:url.signedUrl}:img}));
        setImagensGaleria(signed);
      } else {
        setImagensGaleria([]);
      }
    } catch {
      setImagensGaleria([]);
    }
  }

  async function enviarImagens(files: FileList | File[]) {
    if (!files || files.length === 0 || !selectedForImages) return;

    setUploadingImages(true);
    setError("");

    let enviadas = 0;
    const falhas: string[] = [];
    try {
      await ensureBucketExists();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if(!file.type.startsWith("image/")){falhas.push(`${file.name}: tipo de arquivo não permitido.`);continue}
        if(file.size>15*1024*1024){falhas.push(`${file.name}: excede o limite de 15 MB.`);continue}
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${selectedForImages.id}/${Date.now()}-${i}-${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("empreendimentos")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          falhas.push(`${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from("empreendimentos").createSignedUrl(filePath,3600);
        const urlFinal = signedUrlData?.signedUrl || "";

        if (urlFinal && !signedUrlError) {
          const { error: imageError } = await supabase.from("empreendimento_imagens").insert({
            empreendimento_id: selectedForImages.id,
            url: urlFinal,
            storage_path: filePath,
            titulo: file.name.replace(/\.[^.]+$/, ""),
            categoria: "outro",
            visivel_cliente: false,
            visivel_afiliado: false,
          });
          if (imageError) {
            await supabase.storage.from("empreendimentos").remove([filePath]);
            falhas.push(`${file.name}: não entrou na galeria (${imageError.message}); o arquivo foi removido do armazenamento.`);
            continue;
          }
          enviadas++;

          if (!selectedForImages.imagem_url && i === 0) {
            await definirComoCapa(urlFinal, false, filePath);
          }
        }
      }

      await carregarImagensGaleria(selectedForImages.id);
      loadData();
      if (falhas.length) setError(`${enviadas} imagem(ns) enviada(s). ${falhas.join(" ")}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao fazer upload das imagens.");
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleUploadMultiplo(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) await enviarImagens(e.target.files);
    e.target.value = "";
  }

  async function atualizarImagem(img: EmpreendimentoImagem, patch: Partial<EmpreendimentoImagem>) {
    const { error } = await supabase.from("empreendimento_imagens").update(patch).eq("id", img.id);
    if (error) {
      setError(`Não foi possível atualizar a mídia: ${error.message}`);
      return;
    }
    setImagensGaleria((atual) => atual.map((item) => item.id === img.id ? { ...item, ...patch } : item));
  }

  async function definirComoCapa(url: string, recarregar = true, storagePath?: string | null) {
    if (!selectedForImages) return;

    try {
      const persistedCover = coverReference(storagePath, url);
      const { error } = await supabase
        .from("empreendimentos")
        .update({ imagem_url: persistedCover })
        .eq("id", selectedForImages.id);

      if (error) throw error;

      setSelectedForImages((prev) => (prev ? { ...prev, imagem_url: persistedCover } : prev));
      setEmpreendimentos((current) =>
        current.map((item) => (item.id === selectedForImages.id ? { ...item, imagem_url: persistedCover } : item))
      );

      loadData();
      if (recarregar) alert("Imagem definida como capa com sucesso!");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao definir capa.");
    }
  }

  async function excluirImagemGaleria(imgId: string) {
    if (!window.confirm("Deseja remover esta imagem da galeria?")) return;

    try {
      const media=imagensGaleria.find((img)=>img.id===imgId);
      if(media?.storage_path){const{error:storageError}=await supabase.storage.from("empreendimentos").remove([media.storage_path]);if(storageError)throw storageError}
      const{error:dbError}=await supabase.from("empreendimento_imagens").delete().eq("id", imgId);
      if(dbError)throw dbError;
      setImagensGaleria((current) => current.filter((img) => img.id !== imgId));

      if (media && imageIsCover(selectedForImages?.imagem_url, media)) {
        await definirComoCapa("", false);
      }
      loadData();
    } catch (err: any) {
      console.error(err);
      setError("Não foi possível excluir a imagem.");
    }
  }

  function nextImage(id: string, total: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveImageIndexes((prev) => {
      const current = prev[id] || 0;
      const nextIndex = (current + 1) % total;
      return { ...prev, [id]: nextIndex };
    });
  }

  function prevImage(id: string, total: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveImageIndexes((prev) => {
      const current = prev[id] || 0;
      const prevIndex = (current - 1 + total) % total;
      return { ...prev, [id]: prevIndex };
    });
  }

  return (
    <div className="empreendimentos-page">
      <style>{`
        .empreendimentos-page { min-height: calc(100vh - 48px); padding: 28px clamp(16px, 3vw, 36px) 48px; color: #f4f4f5; background: #09090b; box-sizing: border-box; }
        .emp-shell { width: 100%; max-width: 1500px; margin: 0 auto; }
        .emp-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 24px; }
        .emp-kicker { color: #c5a059; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 7px; }
        .emp-title { margin: 0; font-size: clamp(26px, 3vw, 38px); line-height: 1; font-weight: 700; letter-spacing: -.04em; }
        .emp-subtitle { margin: 9px 0 0; color: #71717a; font-size: 13px; }
        .emp-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 0 15px; border: 1px solid #d4aa5d; border-radius: 7px; background: #c5a059; color: #09090b; font-weight: 800; font-size: 12px; cursor: pointer; transition: .18s ease; white-space: nowrap; }
        .emp-primary:hover { background: #d5b06a; transform: translateY(-1px); }
        
        .emp-toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) repeat(3, 160px) auto; gap: 10px; padding: 12px; background: #101012; border: 1px solid #242428; border-radius: 10px; margin-bottom: 18px; }
        .emp-search { position: relative; }
        .emp-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #71717a; width: 16px; height: 16px; }
        .emp-input, .emp-select { width: 100%; height: 40px; box-sizing: border-box; border: 1px solid #29292e; border-radius: 6px; outline: none; background: #09090b; color: #e4e4e7; padding: 0 12px; font-size: 12px; transition: border-color .18s ease; }
        .emp-search .emp-input { padding-left: 38px; }
        .emp-input:focus, .emp-select:focus, .emp-textarea:focus { border-color: #c5a059; }
        .emp-refresh { height: 40px; width: 40px; display: grid; place-items: center; border: 1px solid #29292e; border-radius: 6px; background: #09090b; color: #a1a1aa; cursor: pointer; }
        .emp-refresh:hover { color: #c5a059; border-color: #c5a059; }
        
        .emp-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 22px; }
        .emp-stat { min-height: 72px; padding: 14px; box-sizing: border-box; border: 1px solid #202024; border-radius: 8px; background: #0f0f11; }
        .emp-stat-label { color: #71717a; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
        .emp-stat-value { margin-top: 7px; font-size: 20px; font-weight: 700; color: #f4f4f5; }
        .emp-stat-value.gold { color: #c5a059; }
        
        .emp-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .emp-card { overflow: hidden; background: #101012; border: 1px solid #242428; border-radius: 10px; transition: border-color .18s ease, transform .18s ease; opacity: 1; }
        .emp-card.inactive { opacity: 0.6; border-color: #1f1f23; }
        .emp-card:hover { border-color: #4a4030; transform: translateY(-2px); }
        
        .emp-cover { position: relative; height: 195px; background: #151518; overflow: hidden; }
        .emp-cover img { width: 100%; height: 100%; display: block; object-fit: cover; }
        .emp-cover-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #52525b; gap: 8px; font-size: 11px; }
        .emp-status { position: absolute; top: 10px; left: 10px; padding: 5px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; backdrop-filter: blur(10px); z-index: 2; }
        .emp-status.launch { color: #e5c47c; background: rgba(60, 47, 25, .9); border: 1px solid rgba(197,160,89,.35); }
        .emp-status.construction { color: #d4d4d8; background: rgba(39,39,42,.92); border: 1px solid #3f3f46; }
        .emp-status.ready { color: #86efac; background: rgba(20,60,38,.9); border: 1px solid rgba(34,197,94,.25); }
        .emp-status.sold { color: #fca5a5; background: rgba(70,25,25,.9); border: 1px solid rgba(239,68,68,.25); }
        
        .emp-image-action { position: absolute; right: 10px; bottom: 10px; display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 9px; border: 1px solid rgba(255,255,255,.15); border-radius: 5px; background: rgba(9,9,11,.88); color: #e4e4e7; cursor: pointer; font-size: 10px; font-weight: 700; z-index: 2; }
        .emp-image-action:hover { color: #c5a059; border-color: #c5a059; }
        
        .emp-slider-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(255,255,255,.2); background: rgba(9,9,11,.75); color: #fff; display: grid; place-items: center; cursor: pointer; z-index: 3; opacity: 0; transition: opacity .2s, background .2s, border-color .2s; }
        .emp-cover:hover .emp-slider-btn { opacity: 1; }
        .emp-slider-btn:hover { background: #c5a059; border-color: #c5a059; color: #09090b; }
        .emp-slider-prev { left: 8px; }
        .emp-slider-next { right: 8px; }
        .emp-slider-counter { position: absolute; bottom: 10px; left: 10px; background: rgba(9,9,11,.75); border: 1px solid rgba(255,255,255,.15); padding: 2px 7px; border-radius: 4px; font-size: 9px; font-weight: 700; color: #e4e4e7; z-index: 2; backdrop-filter: blur(4px); }

        .emp-card-body { padding: 15px; }
        .emp-card-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .emp-card-title { margin: 0; font-size: 16px; line-height: 1.2; font-weight: 700; }
        
        .emp-toggle-btn { background: transparent; border: none; cursor: pointer; color: #71717a; display: flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 4px; border-radius: 4px; transition: color .15s; }
        .emp-toggle-btn.active { color: #4ade80; }
        .emp-toggle-btn:hover { color: #f4f4f5; }

        .emp-builder { margin-top: 5px; color: #71717a; font-size: 10px; }
        .emp-location { display: flex; align-items: center; gap: 6px; margin-top: 13px; color: #a1a1aa; font-size: 11px; }
        .emp-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; padding-top: 13px; border-top: 1px solid #222225; }
        .emp-info { min-width: 0; }
        .emp-info-label { display: block; color: #52525b; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
        .emp-info-value { display: block; margin-top: 4px; color: #d4d4d8; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .emp-card-footer { display: flex; align-items: center; gap: 7px; margin-top: 14px; }
        .emp-action { flex: 1; height: 32px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid #29292e; border-radius: 5px; background: #151518; color: #a1a1aa; font-size: 10px; font-weight: 700; cursor: pointer; }
        .emp-action:hover { color: #f4f4f5; border-color: #52525b; }
        .emp-action.gold:hover { color: #c5a059; border-color: #c5a059; }
        .emp-action.delete:hover { color: #f87171; border-color: #7f1d1d; }
        
        .emp-empty { grid-column: 1 / -1; min-height: 260px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; border: 1px dashed #29292e; border-radius: 10px; background: #0d0d0f; color: #71717a; text-align: center; }
        .emp-empty strong { color: #d4d4d8; font-size: 14px; }
        .emp-empty span { font-size: 11px; }
        .emp-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 10px 12px; border: 1px solid #572222; border-radius: 6px; background: #1b0f0f; color: #fca5a5; font-size: 11px; }
        
        .emp-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.72); backdrop-filter: blur(5px); }
        .emp-modal { width: min(900px, 100%); max-height: calc(100vh - 40px); overflow: auto; background: #111113; border: 1px solid #2b2b30; border-radius: 10px; box-shadow: 0 25px 80px rgba(0,0,0,.5); }
        .emp-modal-header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 17px 18px; border-bottom: 1px solid #242428; background: #111113; }
        .emp-modal-title { margin: 0; font-size: 15px; }
        .emp-modal-subtitle { margin: 4px 0 0; color: #71717a; font-size: 10px; }
        .emp-close { width: 30px; height: 30px; display: grid; place-items: center; border: 1px solid #29292e; border-radius: 5px; background: #18181b; color: #a1a1aa; cursor: pointer; }
        .emp-close:hover { color: #fff; }
        .emp-modal-body { padding: 18px; }
        .emp-section-title { margin: 0 0 12px; color: #c5a059; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
        .emp-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .emp-field { min-width: 0; }
        .emp-field.full { grid-column: 1 / -1; }
        .emp-label { display: block; margin-bottom: 5px; color: #a1a1aa; font-size: 10px; }
        .emp-textarea { width: 100%; min-height: 100px; resize: vertical; box-sizing: border-box; padding: 10px; border: 1px solid #29292e; border-radius: 6px; outline: none; background: #09090b; color: #e4e4e7; font: inherit; font-size: 12px; }
        .emp-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid #242428; background: #111113; }
        .emp-secondary { height: 38px; padding: 0 14px; border: 1px solid #29292e; border-radius: 6px; background: #18181b; color: #a1a1aa; font-size: 11px; font-weight: 700; cursor: pointer; }
        .emp-secondary:hover { color: #fff; border-color: #52525b; }
        .emp-save { height: 38px; display: inline-flex; align-items: center; gap: 7px; padding: 0 16px; border: none; border-radius: 6px; background: #c5a059; color: #09090b; font-size: 11px; font-weight: 800; cursor: pointer; }
        .emp-save:disabled { opacity: .55; cursor: wait; }
        .emp-image-modal { width: min(850px, 100%); }

        .gallery-upload-box { border: 2px dashed #2b2b30; padding: 24px; border-radius: 8px; text-align: center; background: #0d0d0f; margin-bottom: 20px; cursor: pointer; transition: border-color .2s; }
        .gallery-upload-box:hover { border-color: #c5a059; }
        
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; margin-top: 15px; }
        .gallery-item { position: relative; background: #151518; border: 1px solid #242428; border-radius: 8px; overflow: hidden; }
        .gallery-item img { width: 100%; height: 115px; object-fit: cover; display: block; }
        .gallery-meta { padding: 8px; display: grid; gap: 6px; }
        .gallery-meta input, .gallery-meta select { width: 100%; box-sizing: border-box; min-height: 30px; border: 1px solid #303036; border-radius: 5px; background: #0d0d0f; color: #e4e4e7; padding: 0 7px; font-size: 11px; }
        .gallery-visibility { display: flex; gap: 8px; color: #c4c4cb; font-size: 10px; align-items: center; }
        
        .gallery-delete-btn { position: absolute; top: 6px; right: 6px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,0.75); border: 1px solid rgba(255,255,255,0.2); color: #f87171; display: grid; place-items: center; cursor: pointer; z-index: 3; transition: background .15s, color .15s, transform .15s; }
        .gallery-delete-btn:hover { background: #ef4444; color: #fff; transform: scale(1.08); }

        .gallery-cover-btn { position: absolute; bottom: 6px; left: 6px; right: 6px; height: 24px; background: rgba(9,9,11,0.85); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #d4d4d8; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; z-index: 3; backdrop-filter: blur(4px); transition: color .15s, border-color .15s; }
        .gallery-cover-btn:hover { color: #c5a059; border-color: #c5a059; }
        .gallery-cover-btn.is-cover { background: #c5a059; color: #09090b; border-color: #c5a059; }

        @media (max-width: 1200px) { .emp-toolbar { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 1100px) { .emp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 760px) {
          .empreendimentos-page { padding: 20px 14px 40px; }
          .emp-header { align-items: stretch; flex-direction: column; }
          .emp-primary, .emp-refresh { width: 100%; }
          .emp-toolbar, .emp-summary, .emp-grid, .emp-form-grid { grid-template-columns: 1fr; }
          .emp-field.full { grid-column: auto; }
          .emp-modal-footer { flex-direction: column-reverse; }
          .emp-secondary, .emp-save { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="emp-shell">
        <header className="emp-header">
          <div className="emp-title-wrap">
            <div className="emp-kicker">Gestão imobiliária</div>
            <h1 className="emp-title">Empreendimentos</h1>
            <p className="emp-subtitle">Gerencie empreendimentos, mídias e informações comerciais.</p>
          </div>
          <button type="button" className="emp-primary" onClick={openNew}>
            <Plus size={15} />
            Novo empreendimento
          </button>
        </header>

        {error && (
          <div className="emp-error">
            <AlertCircle size={15} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              style={{ marginLeft: "auto", border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <section className="emp-toolbar">
          <div className="emp-search">
            <Search />
            <input
              className="emp-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar nome, cidade, bairro..."
            />
          </div>
          
          <select className="emp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                Status: {status}
              </option>
            ))}
          </select>

          <select className="emp-select" value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
            {tiposDisponiveis.map((tipo) => (
              <option key={tipo} value={tipo}>
                Tipo: {tipo}
              </option>
            ))}
          </select>

          <select className="emp-select" value={ativoFilter} onChange={(e) => setAtivoFilter(e.target.value)}>
            <option value="Todos">Exibição: Todos</option>
            <option value="Ativos">Apenas Ativos</option>
            <option value="Inativos">Apenas Inativos</option>
          </select>

          <button type="button" className="emp-refresh" title="Atualizar" onClick={loadData}>
            <RefreshCw size={15} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />
          </button>
        </section>

        <section className="emp-summary">
          <div className="emp-stat">
            <div className="emp-stat-label">Total cadastrados</div>
            <div className="emp-stat-value">{empreendimentos.length}</div>
          </div>
          <div className="emp-stat">
            <div className="emp-stat-label">Em exibição nos filtros</div>
            <div className="emp-stat-value gold">{filtered.length}</div>
          </div>
          <div className="emp-stat">
            <div className="emp-stat-label">Ativos no sistema</div>
            <div className="emp-stat-value">{empreendimentos.filter(i => i.ativo !== false).length}</div>
          </div>
        </section>

        {loading ? (
          <div className="emp-empty">
            <RefreshCw size={22} style={{ color: "#c5a059", animation: "spin 1s linear infinite" }} />
            <strong>Carregando empreendimentos...</strong>
            <span>Consultando os dados da plataforma.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="emp-empty">
            <Building2 size={28} />
            <strong>{empreendimentos.length === 0 ? "Nenhum empreendimento cadastrado" : "Nenhum resultado encontrado"}</strong>
            <span>{empreendimentos.length === 0 ? "Comece cadastrando o primeiro empreendimento." : "Tente alterar os filtros selecionados acima."}</span>
            {empreendimentos.length === 0 && (
              <button type="button" className="emp-primary" onClick={openNew} style={{ marginTop: 5 }}>
                <Plus size={14} />
                Cadastrar empreendimento
              </button>
            )}
          </div>
        ) : (
          <section className="emp-grid">
            {filtered.map((item) => {
              const title = item.nome || item.titulo || "Empreendimento sem nome";
              const location = [item.bairro, item.cidade].filter(Boolean).join(" · ");
              const isAtivo = item.ativo ?? true;
              
              const imagensList = galeriasMap[item.id] || (item.imagem_url ? [item.imagem_url] : []);
              const currentIndex = activeImageIndexes[item.id] || 0;
              const currentImageUrl = imagensList[currentIndex] || item.imagem_url;

              return (
                <article className={`emp-card ${!isAtivo ? "inactive" : ""}`} key={item.id}>
                  <div className="emp-cover">
                    {currentImageUrl ? (
                      <img src={currentImageUrl} alt={title} loading="lazy" />
                    ) : (
                      <div className="emp-cover-empty">
                        <ImageIcon size={28} />
                        <span>Sem imagem de capa</span>
                      </div>
                    )}

                    {item.status && <span className={`emp-status ${getStatusClass(item.status)}`}>{item.status}</span>}

                    {imagensList.length > 1 && (
                      <>
                        <button 
                          type="button" 
                          className="emp-slider-btn emp-slider-prev" 
                          onClick={(e) => prevImage(item.id, imagensList.length, e)}
                          title="Imagem anterior"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button 
                          type="button" 
                          className="emp-slider-btn emp-slider-next" 
                          onClick={(e) => nextImage(item.id, imagensList.length, e)}
                          title="Próxima imagem"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <span className="emp-slider-counter">
                          {currentIndex + 1} / {imagensList.length}
                        </span>
                      </>
                    )}

                    <button type="button" className="emp-image-action" onClick={() => openImages(item)}>
                      <ImageIcon size={12} />
                      Mídias ({imagensList.length})
                    </button>
                  </div>

                  <div className="emp-card-body">
                    <div className="emp-card-header-row">
                      <h2 className="emp-card-title">{title}</h2>
                      <button
                        type="button"
                        className={`emp-toggle-btn ${isAtivo ? "active" : ""}`}
                        onClick={(e) => toggleAtivoRapido(item, e)}
                        title={isAtivo ? "Desativar empreendimento" : "Ativar empreendimento"}
                      >
                        {isAtivo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        <span style={{ fontSize: 9 }}>{isAtivo ? "Ativo" : "Inativo"}</span>
                      </button>
                    </div>

                    <div className="emp-builder">{getConstrutoraName(item.construtora_id)}</div>
                    {location && (
                      <div className="emp-location">
                        <MapPin size={13} />
                        {location}
                      </div>
                    )}

                    <div className="emp-info-grid">
                      <div className="emp-info">
                        <span className="emp-info-label">Entrega</span>
                        <span className="emp-info-value">{item.entrega_date || item.entrega ? deliveryLabelPt(item.entrega_date || item.entrega) : "—"}</span>
                      </div>
                      <div className="emp-info">
                        <span className="emp-info-label">Unidades</span>
                        <span className="emp-info-value">{item.unidades_cadastradas ?? item.numero_unidades ?? "—"}</span>
                      </div>
                      <div className="emp-info">
                        <span className="emp-info-label">Pavimentos</span>
                        <span className="emp-info-value">{item.numero_pavimentos ?? "—"}</span>
                      </div>
                      <div className="emp-info">
                        <span className="emp-info-label">Faixa de valores</span>
                        <span className="emp-info-value" title={item.menor_preco_disponivel != null && item.maior_preco_disponivel != null ? `${formatCurrency(item.menor_preco_disponivel)} a ${formatCurrency(item.maior_preco_disponivel)}` : undefined}>
                          {item.menor_preco_disponivel != null && item.maior_preco_disponivel != null
                            ? item.menor_preco_disponivel === item.maior_preco_disponivel
                              ? formatCompactCurrency(item.menor_preco_disponivel)
                              : `${formatCompactCurrency(item.menor_preco_disponivel)} – ${formatCompactCurrency(item.maior_preco_disponivel)}`
                            : formatCurrency(item.faixa_preco)}
                        </span>
                      </div>
                      <div className="emp-info">
                        <span className="emp-info-label">Valorização projetada</span>
                        <span className="emp-info-value">{item.valorizacao_aa != null ? `${Number(item.valorizacao_aa).toLocaleString("pt-BR")}% a.a.` : "—"}</span>
                      </div>
                      <div className="emp-info">
                        <span className="emp-info-label">Tipologias</span>
                        <span className="emp-info-value">{item.tipologias_estoque?.length ? item.tipologias_estoque.join(" · ") : storedTipologias(item).length ? storedTipologias(item).join(" · ") : "—"}</span>
                      </div>
                    </div>

                    <div className="emp-card-footer">
                      <button type="button" className="emp-action gold" onClick={() => openEdit(item)}>
                        <Edit3 size={12} />
                        Editar
                      </button>
                      <button type="button" className="emp-action" onClick={() => openImages(item)}>
                        <Upload size={12} />
                        Imagens
                      </button>
                      <button type="button" className="emp-action delete" onClick={() => remove(item)} title="Excluir">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {modalOpen && (
        <div className="emp-overlay" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="emp-modal">
            <div className="emp-modal-header">
              <div>
                <h2 className="emp-modal-title">{editing ? "Editar empreendimento" : "Novo empreendimento"}</h2>
                <p className="emp-modal-subtitle">Informações principais do empreendimento.</p>
              </div>
              <button type="button" className="emp-close" onClick={() => setModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="emp-modal-body">
              <h3 className="emp-section-title">Informações principais</h3>
              <div className="emp-form-grid">
                <div className="emp-field">
                  <label className="emp-label">Nome *</label>
                  <input
                    className="emp-input"
                    value={form.nome}
                    onChange={(e) => updateField("nome", e.target.value)}
                    placeholder="Ex.: Ocean View Residence"
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Construtora</label>
                  <select
                    className="emp-select"
                    value={form.construtora_id}
                    onChange={(e) => updateField("construtora_id", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {construtoras.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome || item.name || item.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Cidade</label>
                  <input
                    className="emp-input"
                    value={form.cidade}
                    onChange={(e) => updateField("cidade", e.target.value)}
                    placeholder="Ex.: Penha"
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Bairro</label>
                  <input
                    className="emp-input"
                    value={form.bairro}
                    onChange={(e) => updateField("bairro", e.target.value)}
                    placeholder="Ex.: Armação"
                  />
                </div>
                <div className="emp-field full">
                  <label className="emp-label">Endereço</label>
                  <input
                    className="emp-input"
                    value={form.endereco}
                    onChange={(e) => updateField("endereco", e.target.value)}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Tipo</label>
                  <input
                    className="emp-input"
                    value={form.tipo}
                    onChange={(e) => updateField("tipo", e.target.value)}
                    placeholder="Ex.: Residencial"
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Status</label>
                  <select
                    className="emp-select"
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                  >
                    {STATUS_OPTIONS.filter((s) => s !== "Todos").map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Entrega</label>
                  <input
                    className="emp-input"
                    type="month"
                    value={form.entrega}
                    onChange={(e) => updateField("entrega", e.target.value)}
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Número de torres</label>
                  <input
                    className="emp-input"
                    type="number"
                    min="0"
                    value={form.numero_torres}
                    onChange={(e) => updateField("numero_torres", e.target.value)}
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Número de pavimentos</label>
                  <input
                    className="emp-input"
                    type="number"
                    min="1"
                    step="1"
                    value={form.numero_pavimentos}
                    onChange={(e) => updateField("numero_pavimentos", e.target.value)}
                    placeholder="Ex.: 24"
                  />
                </div>
                <div className="emp-field full" style={{ marginTop: 8 }}>
                  <div style={{ borderTop: "1px solid #2c2418", paddingTop: 16 }}>
                    <strong style={{ color: "#e2b45e", fontSize: 13 }}>Inteligência de fluxo comercial</strong>
                    <p style={{ color: "#8d8d96", fontSize: 11, margin: "5px 0 0" }}>Essas regras permitem encontrar unidades pela capacidade real de pagamento do cliente.</p>
                  </div>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Início comercial</label>
                  <input className="emp-input" type="date" value={form.inicio_comercial} onChange={(e) => updateField("inicio_comercial", e.target.value)} />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Percentual exigido até as chaves</label>
                  <input className="emp-input" type="number" min="0" max="100" step="0.01" value={form.percentual_ate_chaves} onChange={(e) => updateField("percentual_ate_chaves", e.target.value)} placeholder="Ex.: 30 ou 50" />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Entrada mínima (% do imóvel)</label>
                  <input className="emp-input" type="number" min="0" max="100" step="0.01" value={form.percentual_ato} onChange={(e) => updateField("percentual_ato", e.target.value)} placeholder="Ex.: 10" />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Balões por ano</label>
                  <input className="emp-input" type="number" min="0" step="1" value={form.baloes_por_ano} onChange={(e) => updateField("baloes_por_ano", e.target.value)} placeholder="Ex.: 1" />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Responsável antes das chaves</label>
                  <select className="emp-select" value={form.responsavel_pre_chaves} onChange={(e) => updateField("responsavel_pre_chaves", e.target.value)}>
                    <option value="construtora">Direto com a construtora</option>
                    <option value="banco">Financiamento bancário</option>
                  </select>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Correção antes das chaves</label>
                  <select className="emp-select" value={form.indice_pre_chaves} onChange={(e) => updateField("indice_pre_chaves", e.target.value)}>
                    <option value="SEM_CORRECAO">Sem correção</option>
                    <option value="CUB">CUB</option>
                    <option value="INCC">INCC</option>
                    <option value="IPCA">IPCA</option>
                    <option value="IGPM">IGP-M</option>
                    <option value="BANCO">Condições do banco</option>
                  </select>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Juros antes das chaves (% a.m.)</label>
                  <input className="emp-input" type="number" min="0" step="0.01" value={form.juros_pre_chaves} onChange={(e) => updateField("juros_pre_chaves", e.target.value)} placeholder="0 se não houver" />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Saldo após as chaves</label>
                  <select className="emp-select" value={form.modelo_pos_chaves} onChange={(e) => updateField("modelo_pos_chaves", e.target.value)}>
                    <option value="financiamento_bancario">Financiamento bancário</option>
                    <option value="direto_construtora">Direto com a construtora</option>
                    <option value="quitacao_chaves">Quitação nas chaves</option>
                  </select>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Parcelas após as chaves</label>
                  <input className="emp-input" type="number" min="0" step="1" value={form.parcelas_pos_chaves} onChange={(e) => updateField("parcelas_pos_chaves", e.target.value)} placeholder="Ex.: 100 (se direto)" />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Correção após as chaves</label>
                  <select className="emp-select" value={form.indice_pos_chaves} onChange={(e) => updateField("indice_pos_chaves", e.target.value)}>
                    <option value="SEM_CORRECAO">Sem correção</option>
                    <option value="CUB">CUB</option>
                    <option value="INCC">INCC</option>
                    <option value="IPCA">IPCA</option>
                    <option value="IGPM">IGP-M</option>
                    <option value="BANCO">Condições do banco</option>
                  </select>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Juros após as chaves (% a.m.)</label>
                  <input className="emp-input" type="number" min="0" step="0.01" value={form.juros_pos_chaves} onChange={(e) => updateField("juros_pos_chaves", e.target.value)} placeholder="Ex.: 0,8" />
                </div>
                <label className="emp-field full" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 9, color: "#d4d4d8", fontSize: 12 }}>
                  <input type="checkbox" checked={form.permite_banco_pos_chaves} onChange={(e) => updateField("permite_banco_pos_chaves", e.target.checked)} />
                  Permitir financiamento bancário como alternativa após as chaves
                </label>
                <div className="emp-field">
                  <label className="emp-label">Número de unidades</label>
                  <input
                    className="emp-input"
                    type="number"
                    min="0"
                    value={form.numero_unidades}
                    onChange={(e) => updateField("numero_unidades", e.target.value)}
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Área mínima (m²)</label>
                  <input
                    className="emp-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.area_minima}
                    onChange={(e) => updateField("area_minima", e.target.value)}
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Área máxima (m²)</label>
                  <input
                    className="emp-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.area_maxima}
                    onChange={(e) => updateField("area_maxima", e.target.value)}
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Valor inicial</label>
                  <CurrencyInput
                    value={Number(form.faixa_preco) || 0}
                    onChange={(value) => updateField("faixa_preco", String(value))}
                    style={{ width:"100%", boxSizing:"border-box" }}
                  />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Valorização projetada (% a.a.)</label>
                  <input className="emp-input" type="number" min="0" step="0.01" value={form.valorizacao_aa} onChange={(e) => updateField("valorizacao_aa", e.target.value)} placeholder="Ex.: 12,5" />
                </div>
                <div className="emp-field">
                  <label className="emp-label">Tipologias disponíveis</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: 10, border: "1px solid #27272a", borderRadius: 7, background: "#101012" }}>
                    {TIPOLOGIA_OPTIONS.map((option) => {
                      const selected = form.tipologias_disponiveis.includes(option);
                      return <button key={option} type="button" aria-pressed={selected} onClick={() => updateField("tipologias_disponiveis", selected ? form.tipologias_disponiveis.filter((value) => value !== option) : [...form.tipologias_disponiveis, option])} style={{ border: `1px solid ${selected ? "#c5a059" : "#34343a"}`, background: selected ? "#3a2d17" : "#18181b", color: selected ? "#f3d28d" : "#a1a1aa", borderRadius: 999, padding: "7px 10px", fontSize: 12, cursor: "pointer" }}>{option}</button>;
                    })}
                  </div>
                </div>
                <div className="emp-field">
                  <label className="emp-label">Status Ativo no Site</label>
                  <select
                    className="emp-select"
                    value={form.ativo ? "true" : "false"}
                    onChange={(e) => updateField("ativo", e.target.value === "true")}
                  >
                    <option value="true">Ativo (Visível)</option>
                    <option value="false">Inativo (Oculto)</option>
                  </select>
                </div>
                <div className="emp-field full">
                  <label className="emp-label">URL da imagem de capa principal</label>
                  <input
                    className="emp-input"
                    value={form.imagem_url}
                    onChange={(e) => updateField("imagem_url", e.target.value)}
                    placeholder="Gerenciada automaticamente pelo painel de mídias"
                  />
                </div>
                <div className="emp-field full">
                  <label className="emp-label">Descrição</label>
                  <textarea
                    className="emp-textarea"
                    value={form.descricao}
                    onChange={(e) => updateField("descricao", e.target.value)}
                    placeholder="Descrição comercial do empreendimento..."
                  />
                </div>
              </div>
            </div>

            <div className="emp-modal-footer">
              <button type="button" className="emp-secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="emp-save" disabled={saving} onClick={save}>
                {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                {saving ? "Salvando..." : "Salvar empreendimento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {imageModalOpen && selectedForImages && (
        <div className="emp-overlay" onMouseDown={(e) => e.target === e.currentTarget && setImageModalOpen(false)}>
          <div className="emp-modal emp-image-modal">
            <div className="emp-modal-header">
              <div>
                <h2 className="emp-modal-title">Galeria de Mídias</h2>
                <p className="emp-modal-subtitle">{selectedForImages.nome || selectedForImages.titulo}</p>
              </div>
              <button type="button" className="emp-close" onClick={() => setImageModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="emp-modal-body">
              <label className="gallery-upload-box" style={{ display: "block" }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void enviarImagens(e.dataTransfer.files); }}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleUploadMultiplo}
                  disabled={uploadingImages}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <Upload size={24} color="#c5a059" />
                  <strong style={{ fontSize: 13, color: "#f4f4f5" }}>
                    {uploadingImages ? "Enviando imagens..." : "Arraste várias imagens aqui ou clique para selecionar"}
                  </strong>
                  <span style={{ fontSize: 11, color: "#71717a" }}>
                    Nomeie, classifique e escolha o que clientes e afiliados podem visualizar em cada mídia.
                  </span>
                </div>
              </label>

              <h3 className="emp-section-title" style={{ marginTop: 20 }}>
                Imagens cadastradas ({imagensGaleria.length})
              </h3>

              {imagensGaleria.length === 0 ? (
                <p style={{ color: "#71717a", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                  Nenhuma imagem extra na galeria ainda. Faça o upload acima.
                </p>
              ) : (
                <div className="gallery-grid">
                  {imagensGaleria.map((img) => {
                    const isCover = imageIsCover(selectedForImages.imagem_url, img);
                    return (
                      <div className="gallery-item" key={img.id}>
                        <img src={img.url} alt={img.titulo || "Galeria"} />
                        
                        <button
                          type="button"
                          className="gallery-delete-btn"
                          onClick={() => excluirImagemGaleria(img.id)}
                          title="Excluir imagem"
                        >
                          <X size={14} />
                        </button>

                        <button
                          type="button"
                          className={`gallery-cover-btn ${isCover ? "is-cover" : ""}`}
                          onClick={() => definirComoCapa(img.url, true, img.storage_path)}
                          title={isCover ? "Esta é a imagem de capa" : "Definir como capa"}
                        >
                          <Star size={10} fill={isCover ? "#09090b" : "none"} />
                          {isCover ? "Capa" : "Tornar capa"}
                        </button>
                        <div className="gallery-meta">
                          <input value={img.titulo || ""} onChange={(e) => atualizarImagem(img, { titulo: e.target.value })} placeholder="Nome da imagem (ex.: Planta 3 suítes)" />
                          <select value={img.categoria || "outro"} onChange={(e) => atualizarImagem(img, { categoria: e.target.value })}>
                            <option value="planta">Planta / tipologia</option><option value="fachada">Fachada</option><option value="lazer">Lazer</option><option value="localizacao">Localização</option><option value="decorado">Decorado</option><option value="outro">Outro</option>
                          </select>
                          <input value={img.tipologia_referencia || ""} onChange={(e) => atualizarImagem(img, { tipologia_referencia: e.target.value })} placeholder="Tipologia relacionada (opcional)" />
                          <div className="gallery-visibility">
                            <label><input type="checkbox" checked={Boolean(img.visivel_cliente)} onChange={(e) => atualizarImagem(img, { visivel_cliente: e.target.checked })} /> Cliente</label>
                            <label><input type="checkbox" checked={Boolean(img.visivel_afiliado)} onChange={(e) => atualizarImagem(img, { visivel_afiliado: e.target.checked })} /> Afiliado</label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

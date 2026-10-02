import { useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, Check, Copy, MapPin, MessageCircle, Phone, RotateCcw, Sparkles, Target, Video, Users, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Channel = "ligacao" | "whatsapp" | "email" | "meet" | "visita";
type LeadSource = "campanha" | "base_ativa" | "base_fria" | "foz_iguacu" | "indicacao";
type Temperature = "novo" | "morno" | "frio" | "reativacao";
type Tone = "consultiva" | "direta" | "premium";
type Stage = "atenção" | "diagnóstico" | "curadoria" | "microcompromisso" | "videochamada" | "visita" | "proposta";
type Goal = "moradia" | "investimento" | "lazer" | "patrimonio";
type Line = { say: string; ask: string; cue: string; next: string };

const tones: Tone[] = ["consultiva", "direta", "premium"];
const channels: Array<[Channel, string, typeof Phone]> = [["ligacao", "Ligação", Phone], ["whatsapp", "WhatsApp", MessageCircle], ["email", "E-mail", MessageCircle], ["meet", "Videochamada", Video], ["visita", "Visita", Users]];
const sources: Array<[LeadSource, string]> = [["campanha", "Campanha recente"], ["base_ativa", "Já buscou imóvel"], ["base_fria", "Base parada"], ["foz_iguacu", "Base matriz Foz"], ["indicacao", "Indicação"]];
const temperatures: Array<[Temperature, string]> = [["novo", "Novo"], ["morno", "Morno"], ["frio", "Frio"], ["reativacao", "Reativação"]];
const stages: Array<[Stage, string]> = [["atenção", "Atenção"], ["diagnóstico", "Diagnóstico"], ["curadoria", "Curadoria"], ["microcompromisso", "Próximo passo"], ["videochamada", "Videochamada"], ["visita", "Visita"], ["proposta", "Proposta"]];

const lessons = [
  { title: "Leitura de contexto: cidade e deslocamento", body: "A cidade de origem revela rotina, distância, repertório e a logística do próximo passo. Use isso para decidir entre WhatsApp, videochamada, visita ou encontro na imobiliária.", exercise: "Pergunte quando o cliente pretende vir ao litoral e qual experiência gostaria de viver aqui." },
  { title: "Vinhos, gastronomia e conexão natural", body: "Repertório só funciona quando nasce do que o cliente trouxe. Não force uma referência: use gastronomia para investigar lazer, família, hospitalidade e estilo de vida.", exercise: "Crie uma pergunta que conecte um restaurante ou experiência local ao objetivo do cliente." },
  { title: "Carros, relógios e sinais de contexto", body: "Marcas e objetos podem sugerir repertório, mas nunca provam patrimônio. Trate-os como hipótese e confirme com perguntas, sem classificar ou julgar a pessoa.", exercise: "Troque uma suposição por uma pergunta aberta sobre rotina, uso e prioridades." },
  { title: "Patrimônio sem promessa", body: "Investimento exige prazo, liquidez, risco, impostos, fluxo e cenário. O especialista apresenta premissas e compara alternativas; nunca promete valorização ou retorno.", exercise: "Pergunte se o cliente prioriza renda, uso, proteção patrimonial ou valorização potencial." },
  { title: "A segunda venda: vender a próxima conversa", body: "A primeira conversa não precisa vender o imóvel. Ela precisa entregar clareza suficiente para o cliente querer o próximo passo: comparação, simulação, Meet ou visita.", exercise: "Explique em uma frase qual benefício concreto o cliente terá em uma videochamada de 15 minutos." },
  { title: "Objeções são diagnósticos", body: "‘Está caro’, ‘vou pensar’ e ‘manda tudo’ podem esconder critérios diferentes. Antes de responder, descubra se a barreira é valor, entrada, confiança, tempo, localização ou decisão compartilhada.", exercise: "Reescreva uma resposta que faça uma pergunta antes de defender o produto." },
  { title: "Visita como experiência de decisão", body: "A visita não é passeio: é um roteiro para validar localização, deslocamento, produto e segurança. Combine data, decisores e o que será comparado.", exercise: "Monte um roteiro de visita com dois empreendimentos e três critérios de comparação." },
];

const line = (say: string, ask: string, cue: string, next: string): Line => ({ say, ask, cue, next });
const baseLines: Record<Channel, Record<Tone, Line>> = {
  ligacao: {
    consultiva: line("Olá, [Nome]. Aqui é [Seu nome]. Antes de te sugerir qualquer imóvel, posso entender o que faria essa decisão valer a pena para você?", "Hoje você olha mais para morar, investir, lazer ou patrimônio?", "Faça a pergunta e escute. Não preencha o silêncio.", "Conseguir uma resposta de contexto."),
    direta: line("Olá, [Nome]. Vou ser objetivo para não te fazer perder tempo: posso fazer duas perguntas e separar somente o que pode caber no seu cenário?", "Qual faixa e objetivo devo preservar?", "Objetividade sem pressa transmite segurança.", "Permissão para diagnosticar."),
    premium: line("Olá, [Nome]. Trabalho com uma curadoria de oportunidades no litoral. Quero entender a decisão por trás da busca antes de falar de produto.", "Seu foco é uso, liquidez, proteção patrimonial ou experiência para a família?", "Use tom calmo. Não invente exclusividade.", "Posicionar-se como curador."),
  },
  whatsapp: {
    consultiva: line("Olá, [Nome]! Para não te mandar uma lista genérica, posso separar duas opções conforme o que você realmente procura?", "É mais moradia, investimento, lazer ou patrimônio?", "Uma pergunta por mensagem. Material só depois do contexto.", "Obter o primeiro sinal de intenção."),
    direta: line("Claro, te mando pelo WhatsApp. Só preciso de um filtro para não te enviar PDF demais: qual objetivo e faixa de entrada devo considerar?", "Você prefere comparar entrada, parcela ou valor total?", "Transforme ‘me manda tudo’ em escolha simples.", "Conquistar uma resposta curta."),
    premium: line("Olá, [Nome]. Posso preparar uma leitura curta com as alternativas coerentes para o seu momento, sem catálogo aleatório.", "O que seria uma decisão bem-sucedida para você hoje?", "Diagnóstico antes de dossiê.", "Criar percepção de curadoria."),
  },
  email: {
    consultiva: line("Assunto: uma atualização sobre sua busca\n\nOlá, [Nome]. Sou [Seu nome], da Som Imóveis. Estou retomando seu contexto para não te enviar material genérico.", "Sua prioridade hoje é moradia, investimento, lazer ou patrimônio?", "E-mail deve abrir uma conversa; não despeje anexos.", "Conseguir resposta com contexto."),
    direta: line("Assunto: duas opções coerentes para você\n\nOlá, [Nome]. Posso filtrar duas alternativas e te mandar apenas o que fizer sentido para sua faixa e região?", "Você ainda busca imóvel ou prefere que eu encerre este contato?", "Dê uma saída respeitosa.", "Obter permissão ou encerrar."),
    premium: line("Assunto: uma leitura curta para sua próxima decisão\n\nOlá, [Nome]. Nossa equipe atua há 36 anos em Foz do Iguaçu e também atende o litoral de Santa Catarina. Posso preparar uma curadoria breve para seu momento?", "O que seria uma decisão bem-sucedida para você hoje?", "Use autoridade institucional sem transformar tempo de mercado em pressão.", "Criar percepção de confiança."),
  },
  meet: {
    consultiva: line("Em 15 minutos eu consigo mostrar duas opções, comparar o fluxo e eliminar as dúvidas principais, sem compromisso de decisão.", "Funciona melhor hoje no fim da tarde ou amanhã pela manhã?", "Ofereça duas janelas reais.", "Agendar videochamada."),
    direta: line("Isso fica mais claro em uma tela compartilhada do que em vinte mensagens. Eu mostro o essencial e você decide se vale avançar.", "Prefere [hora A] ou [hora B]?", "Venda o benefício da conversa, não a reunião.", "Confirmar data e horário."),
    premium: line("Posso organizar uma leitura executiva: duas alternativas, pontos de atenção e fluxo comparado, no seu ritmo.", "Qual janela permite que os decisores participem?", "Inclua quem participa da decisão.", "Criar compromisso de qualidade."),
  },
  visita: {
    consultiva: line("A visita faz sentido quando ajuda a comparar. Eu organizo um roteiro enxuto com a região e as duas opções mais aderentes ao que você disse.", "Você já tem alguma data para vir ao litoral?", "Confirme origem, deslocamento e objetivo.", "Descobrir a janela de viagem."),
    direta: line("Em vez de visitar dez lugares, eu separo dois que atendem aos seus critérios e deixo a comparação objetiva.", "Fica melhor [dia A] ou [dia B]?", "Visita com critério, não passeio.", "Escolher data."),
    premium: line("Quando você vier, posso organizar uma experiência privada e enxuta: chegada, contexto da região, comparação e próximos passos.", "Qual data permite que todos os decisores estejam presentes?", "Convide naturalmente, sem criar pressão.", "Agendar visita qualificada."),
  },
};

const situations: Record<string, { title: string; lines: Record<Tone, Line>; channel?: Channel }> = {
  preco: { title: "Só quero preço", lines: {
    consultiva: line("Claro, eu passo a faixa. Só quero evitar te dar um número sem contexto: você compara valor total, entrada mensal ou custo até as chaves?", "Qual desses três precisa caber melhor?", "Depois entregue faixa e duas opções.", "Escolher critério de comparação."),
    direta: line("Posso passar preço. Qual teto de investimento e qual valor você quer comprometer até as chaves?", "Com isso eu elimino o que não cabe.", "Preço sem fluxo é informação incompleta.", "Definir limite."),
    premium: line("O valor correto depende de como o capital fica distribuído. Posso mostrar duas faixas com entrada, reforços e saldo?", "Seu parâmetro principal é liquidez, parcela ou patrimônio final?", "Apresente números auditáveis.", "Autorizar comparação."),
  } },
  material: { title: "Manda tudo no WhatsApp", channel: "whatsapp", lines: {
    consultiva: line("Claro. Para não te afogar em PDF e tabela desatualizada: você quer uma opção para morar, investir ou aproveitar o litoral?", "Qual desses objetivos é o principal?", "Envie no máximo duas opções depois da resposta.", "Personalizar o material."),
    direta: line("Eu mando. Só preciso de um filtro: qual faixa de entrada é confortável e o que você quer comparar?", "Entrada, parcela ou valor total?", "Material sem contexto vira ruído.", "Receber filtro objetivo."),
    premium: line("Posso preparar um dossiê breve, com apenas o que importa para sua decisão e sem material repetido.", "Você quer priorizar experiência de uso, renda potencial ou liquidez?", "Converta catálogo em recomendação.", "Autorizar curadoria."),
  } },
  caro: { title: "Está caro", lines: {
    consultiva: line("Entendo. Quando você diz caro, está comparando valor total, entrada, parcela, localização ou outra região?", "Qual parte do fluxo precisaria ficar confortável?", "Não rebata. Descubra o critério.", "Localizar a barreira real."),
    direta: line("Pode estar fora do que você quer comprometer. Qual número faria a conversa valer a pena?", "É entrada, parcela ou valor final?", "Se não houver encaixe, ajuste a busca com respeito.", "Definir limite."),
    premium: line("Uma decisão premium é saber pelo que se paga e qual liquidez fica preservada. Quer que eu compare com uma opção dentro do seu limite?", "Qual critério deve pesar mais?", "Fale de valor com evidência.", "Aceitar comparação."),
  } },
  pensar: { title: "Vou pensar", lines: {
    consultiva: line("Claro. O que ainda precisa ficar claro para você pensar com segurança?", "É fluxo, localização, construtora ou comparação?", "Transforme adiamento em pendência objetiva.", "Definir a dúvida pendente."),
    direta: line("Perfeito. Qual é a principal dúvida antes do próximo passo? Posso te devolver isso em uma data combinada.", "Prefere que eu retome quando?", "Combine uma ação ou encerre sem insistência.", "Marcar retorno com permissão."),
    premium: line("Decisões relevantes pedem tempo. Posso deixar uma comparação executiva para sua reflexão e retomar somente quando fizer sentido?", "Qual informação aumentaria sua confiança?", "Respeito ao tempo é parte da experiência.", "Ganhar permissão para follow-up."),
  } },
  entrada: { title: "Não tenho entrada", lines: {
    consultiva: line("Obrigado pela clareza. Vamos entender qual entrada, parcela e reforço seriam saudáveis para você, sem apertar sua vida?", "Seu cenário pode melhorar em alguns meses ou existe um ativo a avaliar?", "Nunca prometa aprovação.", "Mapear capacidade real."),
    direta: line("Não vou te empurrar uma unidade. Qual valor você consegue aportar agora e por mês sem apertar sua vida?", "Existe renda futura, FGTS, imóvel, veículo ou outro ativo?", "Permuta depende de análise.", "Encontrar caminho viável."),
    premium: line("Capital inicial é apenas um componente. Importa proteger sua capacidade mensal e construir uma proposta viável.", "Quer simular menor entrada, mais prazo ou ativo em permuta?", "Use cenários, nunca garantias.", "Autorizar simulação."),
  } },
  parceiro: { title: "Preciso falar com meu parceiro", channel: "meet", lines: {
    consultiva: line("Faz sentido. Posso preparar um resumo curto para vocês verem juntos?", "Qual dúvida ele ou ela faria primeiro: segurança, valor, localização ou fluxo?", "Convide o decisor sem pressionar.", "Incluir o decisor."),
    direta: line("Vamos evitar versões diferentes da informação: posso marcar 15 minutos com vocês dois?", "Qual horário permite conversarmos juntos?", "Não crie urgência artificial.", "Agendar conversa conjunta."),
    premium: line("Uma decisão compartilhada merece uma leitura comum. Levo duas opções e os trade-offs claros para vocês.", "O que mais pesa para a família?", "Ouça o decisor ausente.", "Convidar todos para o próximo passo."),
  } },
  investidor: { title: "Quero investir", lines: {
    consultiva: line("Para eu não chamar qualquer imóvel de investimento: qual papel ele deve cumprir — renda, valorização, proteção ou liquidez?", "Qual aporte e horizonte você considera?", "Não use retorno sem premissas.", "Definir tese."),
    direta: line("Vamos começar pelo objetivo: renda agora, revenda, valorização ou diversificação?", "Qual prazo de saída você aceita?", "Separe imóvel de uso e tese de investimento.", "Definir prazo."),
    premium: line("Para patrimônio, comparo estratégia antes de produto: liquidez, risco, renda, saída e tributação.", "Sua prioridade é preservar caixa ou maximizar retorno potencial?", "Mostre cenários, não garantias.", "Autorizar análise patrimonial."),
  } },
};

const responses = [["preco", "Só quero preço"], ["material", "Manda tudo no WhatsApp"], ["caro", "Está caro"], ["pensar", "Vou pensar"], ["entrada", "Não tenho entrada"], ["parceiro", "Falar com parceiro(a)"], ["investidor", "Quero investir"]] as const;

const contextualOpenings: Record<LeadSource, Record<Channel, Line>> = {
  campanha: { ligacao: line("Olá, [Nome], aqui é [Seu nome], da Som Imóveis. Você demonstrou interesse em [produto/campanha] e eu queria entender se ainda faz sentido antes de te mandar qualquer coisa.", "O que chamou sua atenção naquela oportunidade?", "Confirme a origem e não presuma intenção.", "Validar o interesse da campanha."), whatsapp: line("Olá, [Nome]! Vi que você chegou até nós pela campanha de [produto]. Para eu ser objetivo: você busca morar, investir ou usar no litoral?", "Qual desses objetivos é o principal?", "Resposta curta e personalizada.", "Qualificar o lead."), email: line("Assunto: sobre o seu interesse em [produto]\n\nOlá, [Nome]. Recebi seu contato pela campanha e quero confirmar o que você está buscando antes de enviar opções.", "O que você gostaria de comparar primeiro?", "Retome o anúncio e faça uma única pergunta.", "Recuperar contexto."), meet: baseLines.meet.consultiva, visita: baseLines.visita.consultiva },
  base_ativa: { ligacao: line("Olá, [Nome], aqui é [Seu nome], da Som Imóveis. Nossa equipe falou com você há alguns meses sobre imóveis na região. Queria confirmar se aquele cenário ainda faz sentido.", "Você ainda busca [dois quartos/faixa/região] ou sua prioridade mudou?", "Mostre memória, mas confirme.", "Atualizar a necessidade."), whatsapp: line("Olá, [Nome]! Nossa equipe falou com você há alguns meses sobre imóveis na região. A busca por [perfil] ainda faz sentido ou mudou alguma coisa?", "Você continua olhando Penha ou Piçarras também entrou no radar?", "Use o histórico como ponte, não cobrança.", "Reabrir conversa."), email: line("Assunto: sua busca por imóvel na região\n\nOlá, [Nome]. Retomando o atendimento de alguns meses atrás: você procurava [perfil]. Posso atualizar as opções disponíveis hoje?", "O que mudou desde a nossa última conversa?", "Pergunte antes de anexar tabela.", "Atualizar briefing."), meet: baseLines.meet.consultiva, visita: baseLines.visita.consultiva },
  base_fria: { ligacao: line("Olá, [Nome], tudo bem? Aqui é [Seu nome], da Som Imóveis. Tenho você em uma base de um atendimento anterior e não quero presumir que sua busca continue. Posso fazer uma pergunta rápida?", "Hoje ainda existe interesse em imóvel ou posso atualizar seu cadastro e não insistir?", "Respeite a saída.", "Obter permissão."), whatsapp: line("Olá, [Nome]. Encontrei seu contato em um atendimento anterior e estou atualizando nossa base. Você ainda considera algum imóvel na região ou prefere não receber novidades?", "Responda ‘ainda busco’ ou ‘pode encerrar’.", "Baixa fricção e opt-out claro.", "Confirmar interesse."), email: line("Assunto: atualização de preferência\n\nOlá, [Nome]. Estou revisando contatos antigos da Som Imóveis. Você ainda considera comprar um imóvel ou prefere não receber novas oportunidades?", "Posso manter apenas um contato pontual quando surgir algo aderente?", "Não esconda a origem.", "Consentimento de continuidade."), meet: baseLines.meet.consultiva, visita: baseLines.visita.consultiva },
  foz_iguacu: { ligacao: line("Olá, [Nome], aqui é [Seu nome], da Som Imóveis. Você entrou em nossa base pela matriz de Foz do Iguaçu, onde atuamos há 36 anos. Hoje também atendemos Penha e a região do Beto Carrero World. Você já conhece esse litoral?", "Você já visitou Penha, Piçarras ou Barra Velha?", "Venda primeiro a região, não o imóvel.", "Descobrir familiaridade."), whatsapp: line("Olá, [Nome]! Nossa matriz de Foz do Iguaçu atua há 36 anos e hoje também atendemos Penha, Piçarras e Barra Velha. Você já conhece a região do Beto Carrero World?", "Você teria interesse em conhecer oportunidades daqui ou prefere assuntos ligados a Foz?", "Apresente a ponte institucional.", "Abrir interesse regional."), email: line("Assunto: uma nova região atendida pela Som Imóveis\n\nOlá, [Nome]. Nossa matriz em Foz do Iguaçu atua há 36 anos e hoje nossa equipe também atende o litoral de Santa Catarina, próximo ao Beto Carrero World.", "Você já conhece Penha e Piçarras ou gostaria de receber uma leitura curta da região?", "Conteúdo regional antes de oferta.", "Conquistar curiosidade."), meet: baseLines.meet.consultiva, visita: baseLines.visita.consultiva },
  indicacao: { ligacao: line("Olá, [Nome], aqui é [Seu nome], da Som Imóveis. [Indicador] comentou que talvez eu pudesse te ajudar com uma decisão imobiliária. Posso entender o que você procura?", "O que motivou você a conversar agora?", "Cite o indicador apenas se autorizado.", "Validar a indicação."), whatsapp: line("Olá, [Nome]! [Indicador] sugeriu que eu poderia ajudar. Posso te fazer uma pergunta antes de apresentar qualquer opção?", "O que você procura hoje?", "Peça permissão e personalize.", "Transformar indicação em conversa."), email: line("Assunto: indicação de [Indicador]\n\nOlá, [Nome]. [Indicador] sugeriu que eu poderia contribuir com sua busca. Prefiro entender o contexto antes de enviar material.", "Qual é a prioridade da sua decisão?", "Indicação abre a porta; não substitui diagnóstico.", "Iniciar diagnóstico."), meet: baseLines.meet.consultiva, visita: baseLines.visita.consultiva },
};

export default function PlaybookModule() {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [leadSource, setLeadSource] = useState<LeadSource>("campanha");
  const [temperature, setTemperature] = useState<Temperature>("novo");
  const [tone, setTone] = useState<Tone>("consultiva");
  const [situation, setSituation] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("atenção");
  const [goal, setGoal] = useState<Goal | "">("");
  const [origin, setOrigin] = useState("");
  const [profile, setProfile] = useState("");
  const [clientText, setClientText] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [nextContact, setNextContact] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const day = new Date().getDate() % lessons.length;
  const lesson = lessons[day];
  const current = useMemo(() => situation ? situations[situation].lines[tone] : contextualOpenings[leadSource][channel], [channel, leadSource, situation, tone]);
  const inferred = useMemo(() => {
    const text = clientText.toLowerCase();
    if (text.includes("whatsapp") || text.includes("manda") || text.includes("pdf")) return "O cliente quer controle e baixa fricção. Entregue uma resposta curta, mas peça um filtro antes do material.";
    if (text.includes("caro") || text.includes("entrada") || text.includes("parcela")) return "A barreira parece financeira, mas ainda falta saber se é entrada, parcela, valor total ou percepção de valor.";
    if (text.includes("visita") || text.includes("vir") || text.includes("litoral")) return "Existe sinal de logística. Descubra quando vem e transforme a viagem em um roteiro de comparação.";
    if (text.includes("pensar") || text.includes("depois")) return "Não pressione. Descubra o que falta ficar claro e combine retorno somente com permissão.";
    return "Ainda falta contexto. Faça uma pergunta aberta antes de apresentar produto ou material.";
  }, [clientText]);
  const selectSituation = (id: string | null) => { setSituation(id); if (id) { const item = situations[id]; if (item.channel) setChannel(item.channel); setHistory((items) => [...items, item.title]); setStage("diagnóstico"); } else setHistory([]); };
  const advance = (next: Stage, label: string) => { setStage(next); setHistory((items) => [...items, label]); };
  const copyCurrent = async () => { await navigator.clipboard?.writeText(`${current.say}\n\n${current.ask}`); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  const saveLeadAndInteraction = async (action?: string) => {
    setSaveStatus("Salvando...");
    if (!leadName.trim()) { setSaveStatus("Informe ao menos o nome do lead."); return; }
    const notes = [profile, clientText, `Origem detalhada: ${leadSource}`, `Temperatura: ${temperature}`, `Etapa comercial: ${stage}`, history.length ? `Caminho: ${history.join(" → ")}` : ""].filter(Boolean).join("\n");
    const clientPayload = { nome: leadName.trim(), telefone: leadPhone.trim() || null, email: leadEmail.trim() || null, cidade: origin.trim() || null, origem: leadSource, objetivo: goal || null, status: stage, proximo_contato: nextContact ? nextContact.slice(0, 10) : null, observacoes: notes || null, updated_at: new Date().toISOString() };
    let existingId = clientId;
    if (!existingId && clientPayload.email) {
      const existing = await supabase.from("clientes").select("id").eq("email", clientPayload.email).limit(1).maybeSingle();
      if (existing.error) { setSaveStatus(`Não foi possível localizar o cliente: ${existing.error.message}`); return; }
      existingId = existing.data?.id || null;
    }
    if (!existingId && clientPayload.telefone) {
      const existing = await supabase.from("clientes").select("id").eq("telefone", clientPayload.telefone).limit(1).maybeSingle();
      if (existing.error) { setSaveStatus(`Não foi possível localizar o cliente: ${existing.error.message}`); return; }
      existingId = existing.data?.id || null;
    }
    const result = existingId
      ? await supabase.from("clientes").update(clientPayload).eq("id", existingId).select("id").single()
      : await supabase.from("clientes").insert(clientPayload).select("id").single();
    if (result.error) { setSaveStatus(`Não foi possível salvar: ${result.error.message}`); return; }
    const savedId = result.data.id as string;
    setClientId(savedId);
    const interaction = await supabase.from("playbook_interacoes").insert({ cliente_id: savedId, lead_id: null, canal: channel, resumo: clientText || `Avanço registrado: ${action || current.next}`, proxima_acao: action || current.next });
    if (interaction.error) { setSaveStatus(`Lead salvo; interação pendente: ${interaction.error.message}`); return; }
    setSaveStatus("Cliente e próximo passo salvos na base principal.");
  };
  return <div style={{ color: "#eee", display: "grid", gap: 16, maxWidth: 1280 }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}><div><div style={{ color: "#d7ab63", fontSize: 12, fontWeight: 800, letterSpacing: 1.4 }}>NÚCLEO DE CONVERSÃO</div><h1 style={{ margin: "5px 0" }}>Especialista Comercial</h1><p style={{ margin: 0, color: "#aaa", maxWidth: 740 }}>Leia o contexto, escolha o próximo microcompromisso e conduza o cliente da conversa para a videochamada, visita ou proposta — sem resposta mecânica.</p></div><div style={badge}><Sparkles size={15} /> inteligência contextual ativa</div></header>
    <section style={{ ...panel, display: "grid", gap: 12 }}><div style={sectionTitle}><Target size={17} /> Mapa do funil</div><div style={funnel}>{stages.map(([id, label], index) => <button key={id} onClick={() => setStage(id)} style={stageButton(stage === id, index <= stages.findIndex(([s]) => s === stage))}><span>{index + 1}</span>{label}</button>)}</div><small style={{ color: "#aaa" }}>Regra: cada etapa vende a próxima. A conversa digital não precisa fechar o imóvel; precisa criar um avanço claro.</small></section>
    <section style={{ ...panel, display: "grid", gap: 12 }}><div style={sectionTitle}><Users size={17} /> Lead e leitura de contexto</div><div style={responsiveGrid}><label>Origem do lead<select style={input} value={leadSource} onChange={(e) => setLeadSource(e.target.value as LeadSource)}>{sources.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Temperatura<select style={input} value={temperature} onChange={(e) => setTemperature(e.target.value as Temperature)}>{temperatures.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Nome do lead<input style={input} value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Nome completo" /></label><label>WhatsApp / telefone<input style={input} value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="(47) 99999-9999" /></label><label>E-mail<input style={input} value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="cliente@email.com" /></label><label>Próximo contato<input type="datetime-local" style={input} value={nextContact} onChange={(e) => setNextContact(e.target.value)} /></label><label>Origem / cidade<input style={input} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex.: Blumenau, São Paulo, Pomerode" /></label><label>Objetivo<select style={input} value={goal} onChange={(e) => setGoal(e.target.value as Goal)}><option value="">Ainda não identificado</option><option value="moradia">Moradia</option><option value="investimento">Investimento</option><option value="lazer">Lazer / segunda residência</option><option value="patrimonio">Patrimônio</option></select></label><label style={{ gridColumn: "1 / -1" }}>Sinais e contexto<textarea style={{ ...input, minHeight: 66 }} value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="Família, profissão, viagens, estilo de vida, decisores, restrições..." /></label></div><div style={insight}><MapPin size={16} /><div><b>Hipótese de trabalho</b><p style={{ margin: "4px 0 0", color: "#d9d9d9" }}>{origin ? `Cliente de ${origin}. ` : "A cidade ainda não foi informada. "}{goal ? `Objetivo provável: ${goal}. ` : "Pergunte se é moradia, investimento, lazer ou patrimônio. "}{profile || "Não transforme sinais em certezas: confirme com perguntas."}</p></div></div><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><button onClick={() => void saveLeadAndInteraction()} style={gold}><Check size={14} /> Salvar lead e avanço</button>{saveStatus && <small style={{ color: saveStatus.includes("não") || saveStatus.includes("pendente") ? "#f3a6a6" : "#b9dfb9" }}>{saveStatus}</small>}</div></section>
    <section style={{ ...panel, display: "grid", gap: 12 }}><div style={sectionTitle}><MessageCircle size={17} /> O que o cliente acabou de dizer?</div><textarea style={{ ...input, minHeight: 72 }} value={clientText} onChange={(e) => setClientText(e.target.value)} placeholder="Cole a resposta do cliente ou escreva um resumo..." /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{responses.map(([id, label]) => <button key={id} onClick={() => selectSituation(id)} style={dark}>{label}</button>)}<button onClick={() => advance("videochamada", "Converter para videochamada")} style={action}><Video size={15} /> Converter para Meet</button><button onClick={() => advance("visita", "Converter para visita")} style={action}><CalendarCheck size={15} /> Converter para visita</button></div>{clientText && <div style={insight}><Sparkles size={16} /><div><b>Leitura do especialista</b><p style={{ margin: "4px 0 0", color: "#d9d9d9" }}>{inferred}</p></div></div>}</section>
    <section style={{ border: "1px solid #795e2f", borderRadius: 12, padding: 18, background: "linear-gradient(135deg,#15110b,#11100e)", display: "grid", gap: 14 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><small style={{ color: "#d7ab63", fontWeight: 800 }}>PRÓXIMA MELHOR RESPOSTA</small><span style={{ color: "#777" }}>· escolha canal e tom</span><div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>{tones.map((id) => <button key={id} onClick={() => setTone(id)} style={mini(tone === id)}>{id[0].toUpperCase() + id.slice(1)}</button>)}</div></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{channels.map(([id, label, Icon]) => <button key={id} onClick={() => { setChannel(id); setSituation(null); }} style={mini(channel === id)}><Icon size={14} /> {label}</button>)}</div><p style={{ fontSize: 19, lineHeight: 1.55, margin: 0, whiteSpace: "pre-line" }}>{current.say}</p><div style={{ borderLeft: "3px solid #c5a059", paddingLeft: 12 }}><b>Pergunta seguinte</b><p style={{ margin: "5px 0 0" }}>{current.ask}</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}><div style={metric}><small>OBJETIVO</small><strong>{current.next}</strong></div><div style={metric}><small>CANAL SUGERIDO</small><strong>{channel === "meet" ? "Videochamada de 15 min" : channel === "visita" ? "Visita com roteiro" : channel === "whatsapp" ? "WhatsApp com filtro" : "Ligação com permissão"}</strong></div><div style={metric}><small>COMO CONDUZIR</small><strong>{current.cue}</strong></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => void copyCurrent()} style={gold}><Copy size={14} /> {copied ? "Copiado" : "Copiar fala"}</button><button onClick={() => selectSituation(null)} style={dark}><RotateCcw size={14} /> Recomeçar</button><button onClick={() => { advance(channel === "visita" ? "visita" : "videochamada", current.next); void saveLeadAndInteraction(current.next); }} style={action}><ArrowRight size={14} /> Registrar e salvar próximo passo</button></div></section>
    <div style={responsiveGrid}><section style={panel}><div style={sectionTitle}><Target size={17} /> Próximo microcompromisso</div><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{["Responder uma pergunta de contexto", "Escolher entre duas opções", "Receber comparação personalizada", "Aceitar videochamada de 15 minutos", "Definir data de visita", "Incluir parceiro(a) / decisor"].map((item) => <button key={item} onClick={() => advance(item.includes("visita") ? "visita" : item.includes("video") ? "videochamada" : "microcompromisso", item)} style={{ ...dark, justifyContent: "flex-start" }}><Check size={14} color="#c5a059" /> {item}</button>)}</div></section><section style={panel}><div style={sectionTitle}><BookOpen size={17} /> Leitura diária do especialista</div><h3 style={{ margin: "12px 0 6px" }}>{lesson.title}</h3><p style={{ color: "#c9c9c9", lineHeight: 1.55, margin: 0 }}>{lesson.body}</p><div style={{ ...insight, marginTop: 12 }}><b>Aplicação comercial</b><p style={{ margin: "4px 0 0", color: "#d9d9d9" }}>{lesson.exercise}</p></div></section></div>
    <section style={panel}><div style={sectionTitle}>Mapa da conversa</div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>{history.length ? history.map((item, index) => <span key={`${item}-${index}`} style={crumb}>{index + 1}. {item}</span>) : <small style={{ color: "#777" }}>As decisões aparecerão aqui conforme você conduz a conversa.</small>}</div></section>
    <footer style={{ padding: 13, border: "1px solid #29292e", borderRadius: 9, color: "#aaa", lineHeight: 1.5 }}>Princípio comercial: escuta, perguntas claras, dados reais e liberdade de escolha. Nunca invente urgência, promessa de rentabilidade ou exclusividade. O especialista usa repertório para criar conexão, não para julgar o cliente.</footer>
  </div>;
}

const panel = { border: "1px solid #29292e", borderRadius: 10, padding: 16, background: "#101012" };
const sectionTitle = { display: "flex", alignItems: "center", gap: 7, color: "#edcf91", fontWeight: 800 };
const funnel = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))", gap: 7 };
const responsiveGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10 };
const input = { width: "100%", marginTop: 6, padding: "10px 11px", background: "#17171a", border: "1px solid #35353d", borderRadius: 7, color: "#eee", resize: "vertical" as const };
const dark = { background: "#101012", border: "1px solid #35353d", color: "#eee", padding: "9px 11px", borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const action = { ...dark, borderColor: "#6d562c", color: "#edcf91" };
const gold = { ...dark, background: "#c5a059", border: "1px solid #c5a059", color: "#17120a", fontWeight: 800 };
const badge = { display: "inline-flex", alignItems: "center", gap: 6, color: "#edcf91", background: "#211a0d", border: "1px solid #6d562c", padding: "8px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 };
const insight = { display: "flex", gap: 10, alignItems: "flex-start", padding: 11, background: "#171513", border: "1px solid #413521", borderRadius: 8, color: "#edcf91" };
const metric = { display: "grid", gap: 5, padding: 10, background: "#111114", border: "1px solid #302c25", borderRadius: 8 };
const crumb = { padding: "7px 9px", borderRadius: 99, background: "#211a0d", border: "1px solid #6d562c", color: "#edcf91", fontSize: 12 };
const mini = (active: boolean) => ({ padding: "7px 9px", cursor: "pointer", background: active ? "#c5a059" : "#17171a", color: active ? "#17120a" : "#eee", border: "1px solid #4a4030", borderRadius: 6, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 });
const stageButton = (active: boolean, passed: boolean) => ({ padding: "8px 9px", cursor: "pointer", background: active ? "#c5a059" : passed ? "#2b2416" : "#17171a", color: active ? "#17120a" : passed ? "#edcf91" : "#aaa", border: `1px solid ${active ? "#c5a059" : passed ? "#6d562c" : "#35353d"}`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700 });

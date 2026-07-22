const fs = require('fs');
const path = require('path');

// Diretório de saída para os dados das cidades
const outputDir = path.join(__dirname, 'cidades');

// Certifica-se de que a pasta existe
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Base de Dados Estratégica das 10 Cidades (Dossiê 2026 + Biblioteca de Cidades)
const cidades = [
    {
        id: "1",
        nome: "Penha",
        estado: "SC",
        posicionamento: "Tese de entretenimento, fluxo recorrente e transformação da permanência turística.",
        dados_gerais: {
            populacao: "Aprox. 34.000 hab. (com forte população flutuante)",
            perfil_economico: "Economia baseada no turismo de entretenimento, pesca artesanal e crescente construção civil de alto padrão.",
            infraestrutura: "Recebendo investimentos massivos em saneamento, pavimentação de acessos secundários e revitalização de vias turísticas.",
            seguranca: "Índices excelentes de segurança pública, característicos de cidades balneárias monitoradas."
        },
        vetores_valorizacao: {
            principal: "Plano de expansão de R$ 2 bilhões do Beto Carrero World.",
            impacto: "Conversão do turismo de 'um único dia' para permanência de múltiplos dias com hotelaria integrada, gerando alta demanda por locação de temporada e valorização imobiliária no entorno."
        },
        caracteristicas: {
            turismo: "Mais de 19 praias, com destaque para a Praia Vermelha (preservada) e a Praia da Saudade.",
            gastronomia: "Polo gastronômico focado em frutos do mar, com tradição na culinária açoriana.",
            natureza: "Pontas de pedra, trilhas ecológicas, ecoturismo e observação de baleias-franca."
        },
        frases_persuasivas: {
            investidor: "Invista onde o fluxo de pessoas é garantido o ano inteiro pelo maior polo de entretenimento da América Latina.",
            moradia: "A tranquilidade de viver em uma península cercada por 19 praias, com a segurança que sua família merece."
        }
    },
    {
        id: "2",
        nome: "Balneário Piçarras",
        estado: "SC",
        posicionamento: "Caso de valorização por infraestrutura premium, qualificação ambiental e urbanismo visível.",
        dados_gerais: {
            populacao: "Aprox. 25.000 hab.",
            perfil_economico: "Forte adensamento imobiliário verticalizado de alto padrão, comércio forte e serviços voltados ao bem-estar.",
            infraestrutura: "Destaque para o saneamento básico exemplar, alargamento recente da faixa de areia da Praia Central e calçadões padronizados.",
            seguranca: "Monitoramento por câmeras e excelente policiamento local."
        },
        vetores_valorizacao: {
            principal: "Certificação Internacional Bandeira Azul em toda a extensão reconhecida da orla.",
            impacto: "Garantia de balneabilidade, preservação ambiental e urbanismo planejado que atraem investidores exigentes e garantem liquidez superior."
        },
        caracteristicas: {
            turismo: "Turismo focado em esportes náuticos, veraneio de alto padrão e praias extremamente limpas.",
            gastronomia: "Restaurantes sofisticados na avenida principal e na orla, com gastronomia internacional e contemporânea.",
            natureza: "Orla contínua propícia para caminhadas, águas calmas e protegidas, ideais para famílias."
        },
        frases_persuasivas: {
            investidor: "Adquira patrimônio na praia com o m² que mais se valoriza devido ao planejamento urbano e selo ambiental internacional.",
            moradia: "Qualidade de vida pé na areia em uma orla premiada mundialmente pela sua limpeza e organização."
        }
    },
    {
        id: "3",
        nome: "Barra Velha",
        estado: "SC",
        posicionamento: "Tese de entrada relativa, antecipação de ciclo e captura de upside em estágio inicial.",
        dados_gerais: {
            populacao: "Aprox. 31.000 hab.",
            perfil_economico: "Crescimento industrial acelerado às margens da BR-101, forte expansão do comércio e início do boom imobiliário costeiro.",
            infraestrutura: "Investimentos em acessibilidade, pontes de ligação interna e pavimentação da região costeira (bairro Itajuba).",
            seguranca: "Crescimento monitorado com reforço contínuo de infraestrutura de segurança."
        },
        vetores_valorizacao: {
            principal: "Excelente custo de entrada com alto potencial de valorização acumulada (upside).",
            impacto: "A cidade atrai quem busca antecipar o ciclo de valorização que já ocorreu nas vizinhas Piçarras e Penha, comprando metros quadrados mais competitivos com alto teto de crescimento."
        },
        caracteristicas: {
            turismo: "Lagoa de Barra Velha (esportes náuticos), Praia da Península e a icônica estátua do Cristo.",
            gastronomia: "Forte presença de petiscarias tradicionais e restaurantes de cozinha caseira litorânea.",
            natureza: "Encontro da lagoa com o mar, praias ideais para o surf e pesca esportiva."
        },
        frases_persuasivas: {
            investidor: "Antecipe-se ao mercado. Compre no início do ciclo imobiliário e garanta o maior ganho de capital da região.",
            moradia: "A praticidade do acesso rápido à BR-101 combinada com a paz de viver entre a lagoa e o mar."
        }
    },
    {
        id: "4",
        nome: "Navegantes",
        estado: "SC",
        posicionamento: "Hub logístico aeroportuário integrado ao crescimento industrial e imobiliário costeiro.",
        dados_gerais: {
            populacao: "Aprox. 86.000 hab.",
            perfil_economico: "Economia robusta baseada no Aeroporto Internacional, terminal portuário privado (Portonave), pesca industrial e estaleiros.",
            infraestrutura: "Excelente conexão logística rodoviária e portuária, vias duplicadas de acesso à orla do Gravatá.",
            seguranca: "Segurança estruturada para suportar um rápido crescimento demográfico."
        },
        vetores_valorizacao: {
            principal: "Duplicação de acessos e crescimento exponencial do bairro Gravatá (limítrofe a Piçarras).",
            impacto: "O vetor imobiliário residencial é empurrado pela solidez econômica dos empregos de alta renda gerados pelos setores portuário, logístico e aeroportuário."
        },
        caracteristicas: {
            turismo: "Orla com ciclovia contínua, Praia do Gravatá com excelente infraestrutura urbana.",
            gastronomia: "Opções variadas que atendem desde o público corporativo até turistas de temporada à beira-mar.",
            natureza: "Praias de mar aberto ideais para o surf e o molhe norte da barra do rio Itajaí-Açu."
        },
        frases_persuasivas: {
            investidor: "O casamento perfeito entre o PIB logístico de Santa Catarina e a forte valorização imobiliária residencial da orla.",
            moradia: "Viver perto do seu trabalho global com a liberdade de caminhar no calçadão à beira-mar todos os dias."
        }
    },
    {
        id: "5",
        nome: "Balneário Camboriú",
        estado: "SC",
        posicionamento: "Vitrine do mercado de altíssimo padrão nacional e referência máxima de teto de preço (branding de escassez).",
        dados_gerais: {
            populacao: "Aprox. 140.000 hab. (população flutuante passa de 1 milhão na temporada)",
            perfil_economico: "Construção civil de superluxo, turismo internacional, comércio de grife e serviços financeiros de alta renda.",
            infraestrutura: "Alargamento histórico da faixa de areia, saneamento de ponta, asfalto impecável e segurança tecnológica preventiva.",
            seguranca: "Considerada uma das cidades mais seguras do Brasil através de forte investimento em monitoramento e guarda municipal."
        },
        vetores_valorizacao: {
            principal: "Escassez absoluta de terrenos frente-mar e grifes arquitetônicas internacionais.",
            impacto: "Funciona como a âncora de preços do litoral. A valorização aqui dita o ritmo e empurra o crescimento de todo o Litoral Norte de SC."
        },
        caracteristicas: {
            turismo: "Arranha-céus icônicos, vida noturna de classe mundial, teleférico do Parque Unipraias.",
            gastronomia: "Polo gastronômico internacional de luxo ao longo da Avenida Atlântica e Marina.",
            natureza: "Praia Central urbanizada integrada às praias preservadas da rodovia Interpraias (Laranjeiras, Taquaras, Estaleirinho)."
        },
        frases_persuasivas: {
            investidor: "O metro quadrado mais cobiçado e seguro do país. Onde a escassez de espaço garante a perenidade do seu patrimônio.",
            moradia: "Estilo de vida cosmopolita e luxuoso, com o mar aos seus pés e segurança absoluta."
        }
    },
    {
        id: "6",
        nome: "Joinville",
        estado: "SC",
        posicionamento: "Maior economia do estado, hub de tecnologia e potência industrial nacional (lastro patrimonial de solidez).",
        dados_gerais: {
            populacao: "Aprox. 616.000 hab.",
            perfil_economico: "Maior PIB de Santa Catarina. Polo metal-mecânico, de tecnologia, plástico, químico e de saúde de referência.",
            infraestrutura: "Estrutura urbana completa de metrópole, universidades federais, aeroporto próprio e excelentes hospitais.",
            seguranca: "Segurança estruturada e planejada para os padrões de uma grande cidade industrial de alta renda."
        },
        vetores_valorizacao: {
            principal: "Geração de riqueza contínua e diversificação econômica.",
            impacto: "A proximidade de Joinville com o Litoral Norte garante que as famílias de alta renda industrial comprem suas segundas residências e façam investimentos imobiliários em Penha, Piçarras e Barra Velha."
        },
        caracteristicas: {
            turismo: "Festival de Dança de Joinville, Escola do Teatro Bolshoi, turismo de negócios e eventos culturais germânicos.",
            gastronomia: "Culinária alemã tradicional, confeitarias históricas e forte cena de cervejarias artesanais.",
            natureza: "Cercada pela exuberante Serra Dona Francisca, com turismo rural forte e preservado."
        },
        frases_persuasivas: {
            investidor: "O polo gerador de riqueza de Santa Catarina. O lastro econômico que sustenta e consome a valorização do litoral norte.",
            moradia: "A estrutura de uma metrópole com a forte cultura europeia de organização, educação e qualidade de vida."
        }
    },
    {
        id: "7",
        nome: "Itajaí",
        estado: "SC",
        posicionamento: "Segunda maior economia do estado, referência em mercado imobiliário de alto padrão integrado ao lifestyle náutico.",
        dados_gerais: {
            populacao: "Aprox. 264.000 hab.",
            perfil_economico: "Polo portuário gigante, maior mercado pesqueiro do país, polo náutico de luxo (Marina Itajaí) e polo universitário e de saúde.",
            infraestrutura: "Urbanismo sofisticado (bairro Cabeçudas e Praia Brava), excelente malha viária e conexão rápida com Balneário Camboriú.",
            seguranca: "Forte policiamento, bairros nobres monitorados por inteligência de segurança integrada."
        },
        vetores_valorizacao: {
            principal: "Valorização estrondosa da Praia Brava e consolidação do mercado náutico de alto padrão.",
            impacto: "Combina a solidez econômica de um porto global de águas profundas com o lifestyle de alto luxo da Praia Brava, criando um dos m² mais valorizados do país."
        },
        caracteristicas: {
            turismo: "Volvo Ocean Race (stopover histórico), Marina Itajaí, Mercado Público e praias icônicas.",
            gastronomia: "Efervescente polo gastronômico na orla da Praia Brava e no centro histórico/portuário.",
            natureza: "Belezas naturais como o Canto do Morcego, Praia do Atalaia e Cabeçudas."
        },
        frases_persuasivas: {
            investidor: "Invista na economia que move os portos do Sul do país, aliada à valorização imobiliária imbatível da Praia Brava.",
            moradia: "Equilíbrio perfeito entre o desenvolvimento de uma cidade forte e o privilégio de morar em frente à Brava."
        }
    },
    {
        id: "8",
        nome: "Porto Belo",
        estado: "SC",
        posicionamento: "Capital catarinense dos transatlânticos, foco de condomínios aeronáuticos e forte expansão horizontal de luxo.",
        dados_gerais: {
            populacao: "Aprox. 27.000 hab.",
            perfil_economico: "Economia voltada ao turismo marítimo, construção civil em vertiginosa ascensão e mercado de luxo residencial e náutico.",
            infraestrutura: "Recebendo grandes investimentos em novos acessos urbanos, asfalto e planejamento de bairros planejados de alto padrão.",
            seguranca: "Excelente índice de tranquilidade, típica de uma baía protegida de alto padrão."
        },
        vetores_valorizacao: {
            principal: "Proximidade de Itapema e Balneário Camboriú com apelo geográfico único de baía náutica.",
            impacto: "A escassez de terrenos nas cidades vizinhas gerou um transbordo de investimentos espetacular para Porto Belo, transformando a cidade em canteiro de obras de altíssimo padrão."
        },
        caracteristicas: {
            turismo: "Ilha de Porto Belo, porto de parada de cruzeiros internacionais, costões e praias calmas.",
            gastronomia: "Restaurantes charmosos à beira da baía, especialistas em maricultura e gastronomia gourmet.",
            natureza: "Águas mansas e verde-esmeralda, ideais para iates e esportes à vela."
        },
        frases_persuasivas: {
            investidor: "O novo refúgio do mercado náutico catarinense. Onde a geografia da baía desenha um cenário perfeito de valorização contínua.",
            moradia: "A tranquilidade de viver em uma enseada paradisíaca, integrada ao desenvolvimento imobiliário mais charmoso do estado."
        }
    },
    {
        id: "9",
        nome: "Itapema",
        estado: "SC",
        posicionamento: "Segundo mercado imobiliário mais verticalizado do estado, referência de valorização consolidada e infraestrutura de orla.",
        dados_gerais: {
            populacao: "Aprox. 75.000 hab.",
            perfil_economico: "Forte construção civil de médio-alto e alto padrão, comércio forte e turismo de veraneio massivo de alta renda.",
            infraestrutura: "Investimentos robustos na infraestrutura da Meia Praia, calçadões padronizados e andamento do projeto do Parque Linear e alargamento da faixa de areia.",
            seguranca: "Monitoramento por vídeo sofisticado e forte policiamento preventivo."
        },
        vetores_valorizacao: {
            principal: "Consolidação imobiliária como alternativa direta a Balneário Camboriú.",
            impacto: "O mercado de Meia Praia dita tendências de rentabilidade e liquidez rápida, sendo um prato cheio para investidores focados em giros imobiliários rápidos."
        },
        caracteristicas: {
            turismo: "Meia Praia, Canto da Praia (reduto de pescadores e restaurantes), ponte dos suspiros.",
            gastronomia: "Opções sofisticadas com vista para o mar, focado em frutos do mar grelhados e bistrôs requintados.",
            natureza: "Costão rochoso com trilhas rápidas e praias com excelente faixa de areia para práticas esportivas."
        },
        frases_persuasivas: {
            investidor: "Liquidez imediata e rentabilidade comprovada em um dos mercados verticais mais sólidos e consolidados do Sul do país.",
            moradia: "O privilégio de viver em uma praia com infraestrutura de lazer completa, calçadões planos e comércio ativo o ano inteiro."
        }
    },
    {
        id: "10",
        nome: "Araquari",
        estado: "SC",
        posicionamento: "Sustentação logística e industrial do eixo norte (a 'Manaus catarinense' da BR-101).",
        dados_gerais: {
            populacao: "Aprox. 45.000 hab. (crescimento populacional proporcional mais rápido do estado)",
            perfil_economico: "Polo automotivo internacional (fábrica da BMW), grandes multinacionais logísticas, metalúrgicas e indústrias de transformação.",
            infraestrutura: "Crescendo em ritmo acelerado na pavimentação de distritos industriais, saneamento e condomínios de galpões.",
            seguranca: "Policiamento focado na segurança industrial e residencial do município."
        },
        vetores_valorizacao: {
            principal: "Instalação contínua de indústrias globais de altíssimo valor agregado (BMW, etc.).",
            impacto: "A geração massiva de empregos técnicos e executivos de alto escalão cria um fluxo financeiro de trabalhadores que buscam habitação e lazer nas praias próximas (especialmente Barra Velha e Balneário Piçarras)."
        },
        caracteristicas: {
            turismo: "Turismo de negócios, festas tradicionais religiosas e rota gastronômica do maracujá.",
            gastronomia: "Chas e culinária típica do interior catarinense, restaurantes com foco no público corporativo.",
            natureza: "Banhada por rios e canais navegáveis que desembocam na Baía da Babitonga."
        },
        frases_persuasivas: {
            investidor: "O motor industrial silencioso que empurra o PIB da região. Onde o emprego cresce, o mercado imobiliário litorâneo vizinho explode.",
            moradia: "O sossego e custo de vida de uma cidade do interior que cresce de braços dados com marcas globais como a BMW."
        }
    }
];

// Escreve cada arquivo individualmente
cidades.forEach(cidade => {
    const filePath = path.join(outputDir, `${cidade.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(cidade, null, 4), 'utf-8');
    console.log(`✅ Arquivo criado: cidades/${cidade.id}.json`);
});

console.log(`\n🎉 Sucesso! Todas as 10 cidades foram geradas com sucesso para a Plataforma de Estratégia Patrimonial - Luan Especialista!`);
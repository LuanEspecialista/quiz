export async function onRequest(context) {
  // Configuração dos cabeçalhos do CORS para evitar bloqueios de segurança
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Trata requisições OPTIONS (pré-envio do navegador)
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Pega o código de acesso enviado pela URL (ex: ?codigo=TESTE123)
    const { searchParams } = new URL(context.request.url);
    const codigo = searchParams.get("codigo");

    if (!codigo) {
      return new Response(JSON.stringify({ error: "Código não fornecido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Busca as chaves do Supabase salvas nas variáveis de ambiente da Cloudflare
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta (Variáveis ausentes)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Faz a requisição direta para a API do seu Supabase filtrando pelo codigo_acesso
    const targetUrl = `${supabaseUrl}/rest/v1/analises?codigo_acesso=eq.${encodeURIComponent(codigo)}&select=*`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: "Erro na resposta do Supabase", detalhes: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // 4. Se não encontrar nenhuma linha correspondente ao código
    if (data.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma análise encontrada com este código." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retorna os dados encontrados (pega a primeira linha da resposta)
    return new Response(JSON.stringify(data[0]), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // Captura qualquer falha imprevista no servidor
    return new Response(JSON.stringify({ error: "Erro interno no servidor.", detalhes: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
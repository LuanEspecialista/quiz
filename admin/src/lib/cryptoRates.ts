export type CryptoIndicator = {
  id: string;
  sku: string;
  nome: string;
  categoria: "CRIPTO";
  valor: number;
  valor_atual: number;
  tendencia: number;
  variacao_24h: number;
  data_atualizacao: string;
  indexador_base: string;
  automatico: true;
};

const CACHE_KEY = "luan.crypto.brl";
const CACHE_TTL = 5 * 60_000;

export async function getCryptoIndicators(): Promise<CryptoIndicator[]> {
  try {
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true&include_last_updated_at=true");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const now = new Date().toISOString();
    const indicators = ([
      { id: "crypto-btc", sku: "BTC-BRL", nome: "BTC", categoria: "CRIPTO", valor: Number(data.bitcoin?.brl), valor_atual: Number(data.bitcoin?.brl), variacao_24h: Number(data.bitcoin?.brl_24h_change || 0), tendencia: Math.sign(Number(data.bitcoin?.brl_24h_change || 0)), data_atualizacao: data.bitcoin?.last_updated_at ? new Date(data.bitcoin.last_updated_at * 1000).toISOString() : now, indexador_base: "CoinGecko · BRL", automatico: true },
      { id: "crypto-eth", sku: "ETH-BRL", nome: "ETH", categoria: "CRIPTO", valor: Number(data.ethereum?.brl), valor_atual: Number(data.ethereum?.brl), variacao_24h: Number(data.ethereum?.brl_24h_change || 0), tendencia: Math.sign(Number(data.ethereum?.brl_24h_change || 0)), data_atualizacao: data.ethereum?.last_updated_at ? new Date(data.ethereum.last_updated_at * 1000).toISOString() : now, indexador_base: "CoinGecko · BRL", automatico: true },
    ] satisfies CryptoIndicator[]).filter((item) => Number.isFinite(item.valor_atual) && item.valor_atual > 0);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), indicators }));
    return indicators;
  } catch (error) {
    console.warn("Cotações de cripto indisponíveis; usando cache quando possível.", error);
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached?.indicators && Date.now() - Number(cached.savedAt) <= CACHE_TTL * 12) return cached.indicators;
    } catch { /* cache inválido */ }
    return [];
  }
}

// Edge Function: proxy para a classificação oficial de NCM (Portal Único
// Siscomex / Receita Federal), usada pelo botão "🔍 NCM" em Análise de
// Imobilizado (valor-residual.html).
//
// O navegador não consegue chamar a API do Siscomex diretamente (bloqueio
// de CORS do lado deles) — o servidor de fora não tem essa restrição, então
// esta function busca a tabela oficial e devolve só a descrição do NCM
// pedido, resolvendo o "Failed to fetch" no navegador do usuário.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "vr-ncm-classif" → colar este código → Deploy function.
// Não precisa de nenhum secret — a API do Siscomex é pública.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NCM_FONTE_URL = 'https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json?perfil=PUBLICO';

// Cache em memória do processo (Edge Functions do Supabase ficam "quentes"
// entre chamadas próximas) — evita rebaixar os ~3MB da tabela oficial a
// cada clique no botão "🔍 NCM". Expira em 6h pra sempre acompanhar
// atualizações reais da tabela sem depender de redeploy.
let _cache: { dados: any[]; buscadoEm: number } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000;

async function carregarNomenclaturas(): Promise<any[]> {
  if (_cache && (Date.now() - _cache.buscadoEm) < CACHE_MS) return _cache.dados;
  const resp = await fetch(NCM_FONTE_URL);
  if (!resp.ok) throw new Error('Portal Siscomex respondeu com status ' + resp.status);
  const data = await resp.json();
  const dados = Array.isArray(data?.Nomenclaturas) ? data.Nomenclaturas : [];
  _cache = { dados, buscadoEm: Date.now() };
  return dados;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { ncm } = await req.json();
    const ncmDigits = String(ncm || '').replace(/\D/g, '');
    if (!ncmDigits || ncmDigits.length < 2) {
      return new Response(JSON.stringify({ error: 'Informe ao menos parte do NCM.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const nomenclaturas = await carregarNomenclaturas();
    // O código na tabela oficial vem com pontos (ex: "9027.10.00") — compara
    // só pelos dígitos, igual já era feito no navegador.
    const porDigitos = (n: any) => String(n.Codigo || '').replace(/\D/g, '');
    const alvo = nomenclaturas.find((n: any) => porDigitos(n) === ncmDigits);

    if (!alvo) {
      return new Response(JSON.stringify({ encontrado: false }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Monta o "caminho" hierárquico (capítulo de 2 dígitos, posição de 4,
    // subposição de 6, item de 8) — cada nível é um registro à parte na
    // tabela oficial. Nem todo NCM tem os 4 níveis (alguns pulam direto de
    // posição pra item de 8 dígitos, por exemplo), então só inclui os que
    // realmente existem, sem repetir o próprio item já encontrado.
    const caminho: { codigo: string; descricao: string }[] = [];
    for (const tam of [2, 4, 6]) {
      if (ncmDigits.length <= tam) break;
      const prefixo = ncmDigits.slice(0, tam);
      const nivel = nomenclaturas.find((n: any) => porDigitos(n) === prefixo);
      if (nivel) caminho.push({ codigo: nivel.Codigo, descricao: nivel.Descricao });
    }

    return new Response(JSON.stringify({
      encontrado: true,
      codigo: alvo.Codigo,
      descricao: alvo.Descricao,
      caminho,
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

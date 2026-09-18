// Edge Function: extração via IA do "AVISO E RECIBO DE FÉRIAS" ESCANEADO (PDF
// só de imagem, sem texto selecionável), para o botão "📋 Processar FOPAG" do
// módulo Lançamentos Bancários (pedido do usuário 18/09/2026, Peixoto Auto
// Peças: SISPAG SALARIOS de férias não era resolvido — o FOPAG só lia o
// Relatório de Líquidos). Devolve { nomeEmpregado, totalLiquido, gozoInicio,
// gozoFim } — o site casa o totalLiquido com a saída do extrato (valor exato)
// e debita a conta de férias.
//
// Mesmo padrão de lancctb-parse-guia-tributo: o client renderiza as páginas
// como imagem e manda em `imagens`.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via
// Editor → nome "lancctb-parse-recibo-ferias" → colar este código → Deploy.
// Secrets: GEMINI_API_KEY (já configurada no projeto). SEM thinkingConfig
// (o gemini-3.6-flash rejeita com HTTP 400).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-3.6-flash';

const PROMPT = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo os dados de um "AVISO E RECIBO DE FÉRIAS" (imagem escaneada) de um empregado.

Responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "nomeEmpregado": "nome completo do empregado como impresso em 'Nome do empregado', ou null",
  "totalLiquido": número positivo (o valor de 'TOTAL LIQUIDO' na seção Proventos e Descontos — é o líquido a pagar, NÃO o total dos proventos nem a base de cálculo),
  "gozoInicio": "AAAA-MM-DD do início do 'Gozo das Férias', ou null",
  "gozoFim": "AAAA-MM-DD do fim do 'Gozo das Férias', ou null"
}

Regras:
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, ponto decimal — ex: 2724.36).
- O documento pode ter mais de uma página (aviso + recibo + comprovante de pagamento). Use sempre o TOTAL LIQUIDO do aviso/recibo de férias.
- Se não conseguir identificar o valor com confiança, devolva totalLiquido como 0 — nunca invente números.`;

function limparJson(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chamarGemini(parts: unknown[]): Promise<unknown> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nos secrets da function');

  const MAX_TENTATIVAS = 3;
  let ultimoErro = '';
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      }
    );
    if (resp.ok) {
      const data = await resp.json();
      const raw = data?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === 'string')?.text || '';
      if (!raw) throw new Error('Gemini não retornou texto — resposta: ' + JSON.stringify(data).slice(0, 300));
      return JSON.parse(limparJson(raw));
    }
    const errText = await resp.text();
    ultimoErro = 'Erro na API da IA (Gemini, ' + resp.status + '): ' + errText.slice(0, 300);
    const retentavel = resp.status === 503 || resp.status === 429;
    if (!retentavel || tentativa === MAX_TENTATIVAS) throw new Error(ultimoErro);
    await sleep(2000 * tentativa);
  }
  throw new Error(ultimoErro);
}

async function extrairViaGeminiImagens(imagens: string[]): Promise<unknown> {
  const imgs = imagens.slice(0, 5);
  const parts: unknown[] = [{ text: PROMPT }];
  for (const img of imgs) {
    const m = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!m) continue;
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  return chamarGemini(parts);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { imagens } = await req.json();

    if (!Array.isArray(imagens) || !imagens.length) {
      return new Response(JSON.stringify({ error: 'Nenhuma imagem da guia foi enviada.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const dados = await extrairViaGeminiImagens(imagens);

    return new Response(JSON.stringify(dados), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

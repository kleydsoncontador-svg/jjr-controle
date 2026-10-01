// Edge Function: explica em linguagem simples "o que é" o ativo, a partir da
// descrição (que geralmente vem crua/abreviada da nota fiscal) — via Gemini.
// Usada pelo botão "🤖 O que é?" em valor-residual.html, logo abaixo de
// "Descrição do Ativo". Pedido do usuário 01/10/2026 (mesma ideia do campo
// "O que é" de um catálogo de produtos de e-commerce).
//
// Deploy: Supabase Dashboard → Edge Functions → New Function → nome
// "vr-o-que-e" → colar este código.
// Secrets: GEMINI_API_KEY (já configurada no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-3.6-flash';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chamarGemini(prompt: string): Promise<string> {
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
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      }
    );
    if (resp.ok) {
      const data = await resp.json();
      const raw = data?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === 'string')?.text || '';
      if (!raw) throw new Error('Gemini não retornou texto — resposta: ' + JSON.stringify(data).slice(0, 300));
      return raw;
    }
    const errText = await resp.text();
    ultimoErro = 'Erro na API da IA (Gemini, ' + resp.status + '): ' + errText.slice(0, 300);
    const retentavel = resp.status === 503 || resp.status === 429;
    if (!retentavel || tentativa === MAX_TENTATIVAS) throw new Error(ultimoErro);
    await sleep(2000 * tentativa);
  }
  throw new Error(ultimoErro);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { descricao, categoriaLabel, ncm } = await req.json();
    if (!descricao) {
      return new Response(JSON.stringify({ error: 'Descrição do ativo é obrigatória' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Você ajuda um contador a entender rapidamente um item de uma nota fiscal de ativo imobilizado.

Descrição do item (vem direto da nota fiscal, pode estar abreviada/com jargão de fornecedor): "${descricao}"
Categoria contábil informada pelo usuário: ${categoriaLabel ?? '(não informada)'}
NCM informado: ${ncm ?? '(não informado)'}

Explique em português, em 1 a 2 frases curtas e objetivas, O QUE É esse item/produto — pra que serve, que tipo de equipamento/bem é. Sem jargão contábil, sem repetir a descrição crua, sem inventar características que não dá pra inferir. Se a descrição for ambígua demais pra identificar com confiança, diga isso objetivamente em vez de chutar.

Responda SOMENTE com um JSON válido, exatamente neste formato:
{ "oQueE": "texto da explicação aqui" }`;

    let raw = await chamarGemini(prompt);
    raw = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    const dados = JSON.parse(raw);

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

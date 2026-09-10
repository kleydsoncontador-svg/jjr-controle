// Edge Function: extração de valores de faturamento (Saídas/Serviços/Outros,
// mês a mês) de um relatório de faturamento via IA (Gemini, chave paga).
// Usada pelo botão "📎 Incluir PDF Faturamento" em Lucros / Dividendos Fiscal, em index.html
//
// Migrado de Groq pra Gemini (pedido do usuário 08/09/2026: nenhum campo do
// site deve depender do Groq free-tier, rate limit agressivo e causa real
// de falhas intermitentes vistas em produção).
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "luc-extrair-faturamento" → colar este código → Deploy function.
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
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
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
    const { texto } = await req.json();
    if (!texto || typeof texto !== 'string' || texto.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'Texto do relatório vazio ou não reconhecido — confira se o PDF não é uma imagem escaneada sem texto selecionável.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const textoLimitado = texto.slice(0, 24000);

    const prompt = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo valores de faturamento (Saídas/Vendas, Serviços e Outros) de um relatório de faturamento de uma empresa, para lançamento no controle de Lucros/Dividendos Fiscal do escritório. O relatório pode trazer um único mês ou vários meses em linhas separadas (ex: uma tabela com uma linha por mês, de Janeiro a Dezembro).

Texto extraído do(s) PDF(s) (pode incluir mais de um documento, cada um identificado por "=== NOME DO ARQUIVO ==="):

"""
${textoLimitado}
"""

Extraia os dados e responda SOMENTE com um JSON válido, exatamente neste formato (use null pro que não encontrar — não invente valores):

{
  "cnpj": "CNPJ da empresa dona do faturamento (emitente do relatório), formatado como 00.000.000/0000-00 se possível" ou null,
  "razaoSocial": "razão social/nome da empresa dona do faturamento, se identificado no relatório" ou null,
  "lancamentos": [
    {
      "mes": "MM" (mês de competência, 2 dígitos, ex: "03" pra março),
      "ano": "AAAA" (ano de competência, ex: "2026"),
      "saidas": número (valor de Saídas/Vendas de mercadorias/produtos do mês — 0 se não houver),
      "servicos": número (valor de Serviços prestados no mês — 0 se não houver),
      "outros": número (outras receitas do mês que não sejam Saídas nem Serviços, se o relatório trouxer essa coluna — 0 se não houver)
    }
  ],
  "observacoes": "1-2 frases em português caso haja ambiguidade sobre a classificação dos valores, meses não identificados, ou linhas de total que não devem ser incluídas como um mês"
}

Um item no array "lancamentos" para cada mês encontrado no relatório (não inclua a linha de "Total/Totais" do relatório como um lançamento — ela é apenas a soma dos meses). Se o relatório trouxer só um mês, retorne um array com um único item. Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 61150.00).`;

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

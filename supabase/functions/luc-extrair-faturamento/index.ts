// Edge Function: extração de valores de faturamento (Saídas/Serviços/Outros,
// mês a mês) de um relatório de faturamento via IA (Groq)
// Usada pelo botão "📎 Incluir PDF Faturamento" em Lucros / Dividendos Fiscal, em index.html
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "luc-extrair-faturamento" → colar este código → Deploy function.
// Usa o mesmo secret GROQ_API_KEY já configurado pras outras functions do projeto
// (secrets de Edge Functions são por projeto, não por função — não precisa
// cadastrar de novo).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_MODEL = 'llama-3.3-70b-versatile';

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

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY não configurada nos secrets da function' }), {
        status: 500,
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

    const aiResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error('Erro na API da IA (' + aiResp.status + '): ' + errText.slice(0, 300));
    }
    const aiData = await aiResp.json();
    let raw: string = aiData?.choices?.[0]?.message?.content || '';
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

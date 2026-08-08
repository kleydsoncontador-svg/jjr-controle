// Edge Function: extração de dados de um Livro Razão via IA (Groq), pro
// módulo "Demonstrativos Contábeis" em index.html. Nesta primeira etapa
// extrai um RESUMO por conta (saldo anterior, débitos e créditos do período,
// saldo atual) — não lançamento por lançamento, para manter o processamento
// leve e evitar cortar contas em razões longos.
// Usada tanto pelo upload em lote (várias empresas de uma vez) quanto pelo
// upload avulso (um único arquivo dentro da empresa).
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "democ-extrair-livrorazao" → colar este código → Deploy function.
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
      return new Response(JSON.stringify({ error: 'Texto do livro razão vazio ou não reconhecido — confira se o PDF não é uma imagem escaneada sem texto selecionável.' }), {
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

    // Livro Razão costuma ser o documento mais longo (várias páginas por
    // conta, com um lançamento por linha) — usa o maior limite de texto do
    // módulo, mesmo assim pedindo à IA só o resumo por conta, não cada
    // lançamento individual.
    const textoLimitado = texto.slice(0, 45000);

    const prompt = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo um RESUMO por conta de um Livro Razão de uma empresa, para lançamento no módulo "Demonstrativos Contábeis" do escritório. Não extraia lançamento por lançamento — extraia apenas o resumo de cada conta (o Livro Razão normalmente já traz "Saldo Anterior" no início de cada conta e "Total"/"Saldo Atual" no fim).

Texto extraído do PDF:

"""
${textoLimitado}
"""

Extraia os dados e responda SOMENTE com um JSON válido, exatamente neste formato (use null pro que não encontrar — não invente valores):

{
  "cnpj": "CNPJ da empresa dona do livro razão, formatado como 00.000.000/0000-00 se possível" ou null,
  "razaoSocial": "razão social/nome da empresa" ou null,
  "mes": "MM" (mês de referência do razão, 2 dígitos) ou null,
  "ano": "AAAA" (ano de referência do razão) ou null,
  "contas": [
    {
      "codigo_analitico": "código analítico completo da conta, ex: 1.1.01.001" ou null,
      "codigo_reduzido": "código reduzido da conta, se houver" ou null,
      "nome_conta": "nome/descrição da conta",
      "saldo_anterior": número (saldo no início do período — POSITIVO se devedor, NEGATIVO se credor; 0 se não encontrar),
      "debitos": número (total de débitos lançados na conta durante o período — sempre positivo; 0 se não houver),
      "creditos": número (total de créditos lançados na conta durante o período — sempre positivo; 0 se não houver),
      "saldo": número (saldo final/atual da conta ao fim do período — POSITIVO se devedor, NEGATIVO se credor)
    }
  ],
  "observacoes": "1-3 frases em português sobre ambiguidades, contas cujo sinal ficou incerto, ou se o razão parece estar incompleto/cortado (ex: se alguma conta claramente continua em uma página que não foi enviada)"
}

Inclua uma entrada por conta que aparecer no razão, mesmo que o saldo final seja zero. Não invente débitos/créditos que não estejam explícitos — se o documento só trouxer o saldo final da conta sem o detalhamento de débitos/créditos do período, retorne debitos e creditos como 0. Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 61150.00).`;

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

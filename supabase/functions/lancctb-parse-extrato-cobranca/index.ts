// Edge Function: extração de extratos de cobrança (recebimentos) via IA
// Para o módulo Lançamentos Bancários (upload de PDF de Extrato de Cobrança)
//
// Um PDF de "Extrato de Movimentação de Cobrança" (Itaú, BB, etc.) traz
// TODOS os boletos recebidos em um período, listados em tabelas.
// Precisa extrair: Carteira, Pagador, Tipo, Nosso número, Seu número,
// Vencimento, Agência receptora, Valor boleto, Descrição da operação,
// Operações valor, Crédito/Débito.
//
// Usa APENAS Gemini Vision para extrair.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via
// Editor → nome "lancctb-parse-extrato-cobranca" → colar este código → Deploy.
// Secrets: GEMINI_API_KEY (já configurada no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-3.6-flash';

const PROMPT = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo TODOS os dados de extratos de movimentação de cobrança (recebimentos de boletos via banco).

O documento traz uma tabela "Movimentação detalhada" com estas colunas:
- Cart. (carteira, ex: 109)
- Pagador (nome do cliente que pagou)
- Tipo (boleto)
- Nosso número (número do boleto no banco)
- Seu número (número do boleto do cliente)
- Vencimento (data de vencimento do boleto)
- Ag.rec. (agência receptora)
- Valor boleto (valor da operação em R$)
- Descrição da operação (liquidação, tarifa de cobrança, juros, multa, desconto, outro)
- Operações valor (valor final da operação)
- Crédito/Débito (crédito na conta)

Extraia CADA linha da tabela como um item separado. Se houver múltiplas operações para o mesmo boleto (ex: liquidação + tarifa de cobrança), crie um item separado para CADA operação com o MESMO pagador/cliente.

Responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "recebimentos": [
    {
      "data_pagamento": "AAAA-MM-DD",
      "carteira": "109",
      "pagador_nome": "nome do cliente/pagador",
      "tipo": "boleto",
      "nosso_numero": "número do boleto no banco",
      "seu_numero": "número do boleto do cliente",
      "data_vencimento": "AAAA-MM-DD",
      "agencia_receptora": "código da agência receptora",
      "valor_boleto": número (ex: 500.64),
      "descricao_operacao": "liquidação|tarifa_cobranca|juros|multa|desconto|outro",
      "operacoes_valor": número (ex: -1.50),
      "credito_debito": número (ex: 499.14),
      "numero_parcela": 1 (ou 2,3... se houver múltiplas operações do mesmo boleto)
    }
  ]
}

Regras:
- Cada operação distinta do mesmo boleto vira um item separado — não agrupe
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, ponto decimal)
- Datas sempre em formato AAAA-MM-DD (converta de DD/MM/AAAA)
- Extraia TODAS as colunas visíveis no PDF, sem omitir nenhuma informação
- Nunca invente dados — use null quando a informação genuinamente não aparece
- Se houver "liquidação tarifa de cobrança", crie 2 items: um com "liquidacao", outro com "tarifa_cobranca"
`;

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

async function extrairViaGeminiTexto(texto: string): Promise<unknown> {
  const textoLimitado = texto.slice(0, 400000);
  return chamarGemini([{ text: PROMPT + '\n\nTexto extraído do PDF:\n\n"""\n' + textoLimitado + '\n"""' }]);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS
    });
  }

  try {
    const { texto } = await req.json();

    const temTexto = typeof texto === 'string' && texto.trim().length >= 20;
    if (!temTexto) {
      return new Response(JSON.stringify({ error: 'Texto do PDF vazio ou muito curto.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const resultado = await extrairViaGeminiTexto(texto);
    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: mensagem }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

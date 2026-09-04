// Edge Function: extração de extrato bancário (PDF) via IA, para o módulo
// Lançamentos Bancários (aba "Extrato bancário"). Excel/CSV têm um caminho
// determinístico mais barato no client (xlsx.full.min.js já carregado) —
// esta function só entra quando o extrato vem em PDF, que é o formato mais
// comum vindo direto do internet banking.
//
// Explorei ~30 layouts reais de extrato (Itaú, Santander, Sicoob, Safra,
// Mercado Pago, etc. — pasta de referência da JJR) e nenhum segue o mesmo
// formato de colunas: uns têm "Saldo" em toda linha, outros só na última
// do dia; uns separam Entrada/Saída em colunas, outros usam sinal negativo
// numa coluna "Valor" só; histórico às vezes vem em 1 linha, às vezes em 2
// (descrição + complemento tipo "PERIODO: ..." ou nome do CNPJ). Por isso
// o prompt normaliza tudo pro mesmo formato de saída independente do banco
// de origem, em vez de tentar um parser fixo por banco.
//
// Aceita `texto` (via pdfjsLib no client, processado via Groq) OU `imagens`
// (extrato escaneado, processado via Gemini). Mesmo padrão das outras
// functions de extração deste projeto.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via
// Editor → nome "lancctb-parse-extrato" → colar este código → Deploy.
// Secrets: GROQ_API_KEY e GEMINI_API_KEY (já configurados no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_MODEL_TEXTO = 'openai/gpt-oss-120b';
const GEMINI_MODEL = 'gemini-3.6-flash';

const PROMPT = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo os lançamentos de um extrato de conta corrente (PDF) para conciliação bancária. O extrato pode ser de qualquer banco (Itaú, Santander, Sicoob, Safra, Banco do Brasil, Mercado Pago, etc.) — os formatos de coluna variam bastante entre bancos; normalize tudo para a mesma estrutura de saída abaixo, não tente preservar as colunas originais.

Responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "lancamentos": [
    {
      "data": "AAAA-MM-DD",
      "historico": "descrição do lançamento exatamente como aparece (concatene linha de complemento se houver, ex: nome de quem pagou/recebeu, período de referência)",
      "valor_saida": número positivo ou 0 (valor debitado da conta nesse lançamento),
      "valor_entrada": número positivo ou 0 (valor creditado na conta nesse lançamento),
      "documento": "número de documento/controle se aparecer, senão null"
    }
  ],
  "saldo_final_extrato": número ou null (o saldo final que aparece no documento, para conferência — não é um lançamento, é só o total do período)
}

Regras:
- NÃO inclua linhas de "SALDO ANTERIOR", "SALDO DO DIA", "SALDO BLOQUEADO" como lançamentos — essas são só marcadores de saldo acumulado, não movimentações reais. Ignore-as (o saldo final vai só no campo separado "saldo_final_extrato").
- Cada lançamento tem OU valor_saida OU valor_entrada preenchido (o outro fica 0) — nunca os dois ao mesmo tempo.
- Se o extrato usa uma única coluna "Valor" com sinal negativo para débito, converta: negativo → valor_saida; positivo → valor_entrada.
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, ponto decimal — ex: 3994.10, sempre positivo mesmo quando é saída).
- Datas sempre em AAAA-MM-DD; se o extrato só mostrar dia/mês sem ano (comum em extratos por período), infira o ano pelo cabeçalho do documento (ex: "Extrato de 01/09/2026 até 30/09/2026").
- Preserve a ordem cronológica em que os lançamentos aparecem no documento.`;

function limparJson(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
}

async function extrairViaGroq(texto: string): Promise<unknown> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada nos secrets da function');

  const textoLimitado = texto.slice(0, 60000);
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: GROQ_MODEL_TEXTO,
      messages: [{ role: 'user', content: PROMPT + '\n\nTexto extraído do PDF:\n\n"""\n' + textoLimitado + '\n"""' }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('Erro na API da IA (Groq, ' + resp.status + '): ' + errText.slice(0, 300));
  }
  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  return JSON.parse(limparJson(raw));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extrairViaGemini(imagens: string[]): Promise<unknown> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nos secrets da function');

  const imgs = imagens.slice(0, 20);
  const parts: unknown[] = [{ text: PROMPT }];
  for (const img of imgs) {
    const m = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!m) continue;
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { texto, imagens } = await req.json();

    const temTexto = typeof texto === 'string' && texto.trim().length >= 20;
    const temImagens = Array.isArray(imagens) && imagens.length > 0;

    if (!temTexto && !temImagens) {
      return new Response(JSON.stringify({ error: 'Nem texto nem imagem do PDF foram enviados, ou o texto veio vazio/muito curto.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const dados = temTexto ? await extrairViaGroq(texto) : await extrairViaGemini(imagens);

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

// Edge Function: "Processar via IA" do Registro Contábil (módulo Lançamentos
// Bancários) — último recurso de conciliação, DEPOIS que Comprovantes,
// Comprovantes de Recebimento, Tributos e Notas Fiscais (matching
// determinístico) já rodaram e ainda sobrou pendência. Só amarra
// Pagamento/Recebimento × Nota Fiscal — nunca tenta achar Comprovante nem
// classificar Tributo (isso é feito pelos outros botões).
//
// Recebe um LOTE de pendências (cada uma já com sua própria lista de NFs
// candidatas, montada no client a partir de notas_fiscais_parcelas ainda
// pendentes da empresa) e devolve, pra cada uma, no máximo 1 candidata
// escolhida + uma explicação curta do porquê (a explicação fica salva em
// lancamentos_contabeis.informacao_extra e aparece numa coluna extra no
// Registro Contábil, pra dar transparência e o contador poder auditar/
// desfazer se a IA errar). Pedido explícito do usuário (05/09/2026): mais
// vale a IA responder "sem match confiável" (null) do que arriscar casar
// errado — dado contábil real de cliente pagante, sem review humano antes
// de gravar.
//
// Mesmo padrão Groq→Gemini das outras Edge Functions do módulo
// (lancctb-parse-comprovante/extrato): texto curto vai pro Groq (mais
// rápido), lote grande ou erro de cota cai pro Gemini.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function →
// Via Editor → nome "lancctb-ia-matching" → colar este código → Deploy.
// Secrets: GROQ_API_KEY e GEMINI_API_KEY (já configurados no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GEMINI_MODEL = 'gemini-3.6-flash';
// Acima disso (em caracteres do prompt montado) vai direto pro Gemini —
// mesmo raciocínio de TEXTO_LIMITE_GROQ em lancctb-parse-comprovante (teto
// de 8000 TPM da conta Groq, compartilhado com as outras functions).
const PROMPT_LIMITE_GROQ = 6000;

function montarPrompt(lote: any[]): string {
  return `Você é um assistente de conciliação bancária de um escritório de contabilidade brasileiro. Pra cada LANÇAMENTO de extrato bancário abaixo (um pagamento feito ou um recebimento recebido pela empresa), veja a lista de NOTAS FISCAIS candidatas dela e diga qual (se alguma) provavelmente corresponde àquele lançamento — comparando o nome do fornecedor/cliente contra o histórico bancário (que costuma vir abreviado, sem acento, ou com sigla do sistema de pagamento do banco) e o valor/data.

Regras importantes:
- Só escolha uma candidata quando tiver razoável confiança pela combinação de nome (mesmo que abreviado/parcial) E valor E data plausíveis. Nunca escolha só por coincidência de valor sem nenhuma pista de nome no histórico.
- Se nenhuma candidata for razoavelmente confiável, responda parcela_id null — é MELHOR deixar pendente do que casar errado (é dinheiro real de cliente pagante).
- "explicacao" deve ser 1 frase curta (até 15 palavras) dizendo o motivo (ex: "Histórico cita 'RSHOP' e o nome do fornecedor começa assim, valor idêntico").
- Nunca invente CNPJ, nome ou valor que não estejam nos dados fornecidos.

Responda SOMENTE com um JSON válido, exatamente neste formato:
{
  "resultados": [
    { "lancamento_id": 123, "parcela_id": 456, "explicacao": "motivo curto" },
    { "lancamento_id": 124, "parcela_id": null, "explicacao": "nenhuma candidata bate com confiança" }
  ]
}

Lote de lançamentos e candidatas:
${JSON.stringify(lote)}`;
}

function limparJson(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
}

async function chamarGroq(prompt: string): Promise<unknown> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada nos secrets da function');

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
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

async function chamarGemini(prompt: string): Promise<unknown> {
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
    const { lote } = await req.json();
    if (!Array.isArray(lote) || !lote.length) {
      return new Response(JSON.stringify({ error: 'Lote de lançamentos vazio ou ausente.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const prompt = montarPrompt(lote);
    let dados: unknown;
    if (prompt.length > PROMPT_LIMITE_GROQ) {
      dados = await chamarGemini(prompt);
    } else {
      try {
        dados = await chamarGroq(prompt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/Groq/.test(msg) && /(413|429)/.test(msg)) {
          dados = await chamarGemini(prompt);
        } else {
          throw e;
        }
      }
    }

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

// Edge Function: extração de dados de um Balancete de Verificação (contas +
// saldos) via IA (Gemini, chave paga), pro módulo "Demonstrativos Contábeis"
// em index.html. Usada tanto pelo upload em lote (várias empresas de uma
// vez) quanto pelo upload avulso (um único arquivo dentro da empresa).
//
// Migrado de Groq pra Gemini (pedido do usuário 08/09/2026: nenhum campo do
// site deve depender do Groq free-tier, rate limit agressivo e causa real
// de falhas intermitentes vistas em produção).
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "democ-extrair-balancete" → colar este código → Deploy function.
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
      return new Response(JSON.stringify({ error: 'Texto do balancete vazio ou não reconhecido — confira se o PDF não é uma imagem escaneada sem texto selecionável.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Balancetes costumam ser longos (uma linha por conta) — usa um limite
    // maior que as outras functions do projeto pra não cortar contas no meio.
    const textoLimitado = texto.slice(0, 40000);

    const prompt = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo os dados de um Balancete de Verificação (ou Balancete Analítico) de uma empresa, para lançamento no módulo "Demonstrativos Contábeis" do escritório.

Texto extraído do PDF:

"""
${textoLimitado}
"""

Extraia os dados e responda SOMENTE com um JSON válido, exatamente neste formato (use null pro que não encontrar — não invente valores):

{
  "cnpj": "CNPJ da empresa dona do balancete, formatado como 00.000.000/0000-00 se possível" ou null,
  "razaoSocial": "razão social/nome da empresa" ou null,
  "mes": "MM" (mês de referência do balancete, 2 dígitos) ou null,
  "ano": "AAAA" (ano de referência do balancete) ou null,
  "contas": [
    {
      "codigo_analitico": "código analítico completo da conta, ex: 1.1.01.001" ou null,
      "codigo_reduzido": "código reduzido da conta, se houver" ou null,
      "nome_conta": "nome/descrição da conta",
      "saldo": número (saldo final/atual da conta — POSITIVO se o saldo for devedor, NEGATIVO se o saldo for credor; se o balancete trouxer colunas separadas de saldo devedor e credor, use o valor da coluna que tiver valor, com o sinal correspondente)
    }
  ],
  "observacoes": "1-3 frases em português sobre ambiguidades, contas cujo sinal (devedor/credor) ficou incerto, ou se o balancete parece estar incompleto/cortado"
}

Inclua todas as contas analíticas (as que têm saldo, de qualquer nível/grupo — Ativo, Passivo, Patrimônio Líquido, Receitas, Custos, Despesas). Não inclua linhas de "Total Geral" nem subtotais de grupo (ex: "Total do Ativo Circulante") como se fossem uma conta — essas são apenas somatórios. Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 61150.00).`;

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

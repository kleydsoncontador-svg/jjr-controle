// Edge Function: extração de dados de contrato de empréstimo (CCB, etc.) via
// IA (Gemini, chave paga)
// Usada pelo botão "🔍 Extrair Dados do Contrato (IA)" no módulo Empréstimos, em index.html
//
// Migrado de Groq pra Gemini (pedido do usuário 08/09/2026: nenhum campo do
// site deve depender do Groq free-tier, rate limit agressivo e causa real
// de falhas intermitentes vistas em produção).
//
// Deploy: Supabase Dashboard → Edge Functions → New Function → nome
// "emp-extrair-contrato" → colar este código.
// Secrets: GEMINI_API_KEY (já configurada no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-2.0-flash';

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
      return new Response(JSON.stringify({ error: 'Texto do contrato vazio ou não reconhecido — confira se o PDF não é uma imagem escaneada sem texto selecionável.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Limita o texto enviado pra manter o prompt rápido e barato — as
    // informações relevantes (preâmbulo/quadro-resumo) ficam sempre no
    // início do contrato; o resto costuma ser cláusula padrão.
    const textoLimitado = texto.slice(0, 24000);

    const prompt = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo dados de um contrato de empréstimo/financiamento (CCB, Cédula de Crédito Bancário, contrato de Pronampe, financiamento, etc.) e, se houver, da apólice de seguro vinculada, para cadastro no sistema de controle contábil do escritório.

Texto extraído do(s) PDF(s) (pode incluir mais de um documento, cada um identificado por "=== NOME DO ARQUIVO ==="):

"""
${textoLimitado}
"""

Extraia os dados e responda SOMENTE com um JSON válido, exatamente neste formato (use null para o que não encontrar — não invente valores):

{
  "credorTipo": "Banco" | "Governamental" | "Sócio" | "Terceiros" | "Outro" | null,
  "credorNome": "nome do banco/credor" ou null,
  "contratoNumero": "número do contrato/operação/CCB" ou null,
  "nomeEmprestimo": "nome curto sugerido pro empréstimo, ex: Pronampe Itaú 2026" ou null,
  "valorCredito": número (valor do crédito/principal liberado, sem tarifa/IOF/seguro) ou null,
  "valorTarifa": número (tarifa de contratação/abertura de crédito) ou null,
  "valorIOF": número (IOF total do contrato) ou null,
  "valorSeguro": número (prêmio do seguro vinculado ao empréstimo, se houver apólice) ou null,
  "outrosCustosFinanciados": número (outros custos financiados dentro do contrato, que não sejam tarifa/IOF/seguro) ou null,
  "taxaJurosMensal": número (taxa de juros remuneratórios nominal, em % ao mês — ex: 0.48 pra 0,48% a.m.) ou null,
  "sistemaAmortizacao": "PRICE" ou "SAC" (PRICE se o contrato usar Tabela Price/parcelas fixas; SAC se mencionar Sistema de Amortização Constante; use PRICE como padrão se não ficar claro) ou null,
  "totalParcelas": número (quantidade total de parcelas) ou null,
  "dataContratacao": "DD/MM/AAAA" (data de assinatura/liberação do crédito) ou null,
  "primeiroVencimento": "DD/MM/AAAA" (data do 1º vencimento) ou null,
  "valorParcelaInformado": número (o valor de parcela mensal que consta explicitamente no contrato, se houver) ou null,
  "observacoes": "1-3 frases em português sobre ambiguidades, campos não encontrados, ou se o valor da parcela informado no contrato não bate com uma Tabela Price simples usando a taxa de juros nominal extraída (nesse caso, avise que pode ser necessário usar uma 'Taxa Personalizada' no sistema)"
}

Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 61150.00). Taxas sempre em número puro representando o percentual (ex: 0.48, não 0.0048).`;

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

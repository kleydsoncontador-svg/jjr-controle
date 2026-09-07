// Edge Function: extração de comprovantes bancários via IA, para o módulo
// Lançamentos Bancários (upload de PDF de comprovantes, aba "Comprovantes").
//
// Um único arquivo PDF de comprovantes bancários costuma trazer DEZENAS de
// comprovantes empilhados (um por página, ou vários por página) — não é
// "1 arquivo = 1 pagamento". Confirmado explorando arquivos reais da Fast
// Lube: um PDF do Itaú com 50 páginas trouxe 6 subtipos diferentes de
// layout dentro do mesmo arquivo:
//   1. Transferência conta-a-conta (TED interno) — "Dados da conta debitada/
//      creditada", sem CNPJ do recebedor explícito às vezes.
//   2. PIX — "dados do pagador/recebedor", às vezes com chave PIX e um campo
//      "identificação no comprovante" que pode trazer o nº da NF (ótimo pra
//      matching automático).
//   3. Pagamento de boleto — linha digitável, Beneficiário, e às vezes um
//      "Beneficiário Final" diferente do Beneficiário direto (operação de
//      factoring/cessão de crédito) — nesse caso o Beneficiário Final é
//      quem interessa pro matching (é o fornecedor real).
//   4. Pagamento de concessionária — só código de barras, sem nome do
//      favorecido.
//   5. DARF (imposto federal) — sem "beneficiário" no sentido comercial.
//   6. SEFAZ-SP/DARE (imposto estadual) — idem.
// Por isso a extração pede uma LISTA de comprovantes, não um objeto único,
// e o prompt orienta explicitamente a tratar cada subtipo.
//
// Aceita `texto` (extraído via pdfjsLib no client) OU `imagens` (array de
// data URIs base64, para PDF escaneado sem texto selecionável). Mesmo
// padrão de convaplicfin-extrair-tabela/index.ts.
//
// Usa APENAS Gemini Vision para extrair comprovantes.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via
// Editor → nome "lancctb-parse-comprovante" → colar este código → Deploy.
// Secrets: GEMINI_API_KEY (já configurada no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-2.0-flash';

const PROMPT = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo TODOS os dados de comprovantes bancários (PDF) para conciliação contábil. Um único documento pode conter VÁRIOS comprovantes diferentes (um por página ou mais), de tipos diferentes: transferência entre contas (TED), PIX, pagamento de boleto, pagamento de concessionária (só código de barras), DARF (imposto federal), guia SEFAZ/DARE (imposto estadual), entre outros. Extraia CADA comprovante como um item separado da lista.

IMPORTANTE: Se um boleto tiver múltiplas operações (ex: liquidação + tarifa de cobrança), crie um item separado para CADA operação com o MESMO cliente/beneficiário.

Responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "comprovantes": [
    {
      "data_pagamento": "AAAA-MM-DD",
      "cliente_fornecedor_nome": "nome do recebedor/beneficiário (use o 'Beneficiário Final' quando ele existir e for diferente do 'Beneficiário' — é o fornecedor real numa operação de factoring/cessão; senão use o nome do recebedor/beneficiário comum)",
      "cnpj_cpf": "CNPJ ou CPF do recebedor, só dígitos, ou null se não houver (ex: pagamento de concessionária só com código de barras)",
      "documento_numero": "número/identificação do documento se houver (linha digitável resumida, número DARF/DARE, 'Seu número' ou similar — o identificador ÚNICO do boleto/documento)",
      "numero_parcela": número ou null (número da parcela/sequência se for um pagamento em parcelas do mesmo cliente — ex: 1, 2, 3... use 1 como padrão se houver só um),
      "agencia_recebedora": "código numérico ou null (a agência recebedora do banco, se estiver no comprovante)",
      "data_vencimento": "AAAA-MM-DD ou null se o comprovante não tiver data de vencimento distinta da data de pagamento (ex: PIX, TED)",
      "valor_documento": número ou null (valor original do boleto antes de desconto/juros/multa; para PIX/TED/tarifa, use o valor da operação),
      "valor_pago": número (valor efetivamente pago/transferido nesta operação — sempre presente),
      "juros": número ou 0,
      "multa": número ou 0,
      "desconto": número ou 0,
      "tipo_operacao": "liquidação|tarifa_cobranca|juros|multa|desconto|outro (tipo específico desta operação)",
      "observacao": "1 frase com o tipo de operação e detalhes (ex: 'Boleto liquidação', 'Tarifa de cobrança', 'Juros', 'PIX Transferência', 'DARF', 'Pagamento concessionária VIVO-SP')"
    }
  ]
}

Regras:
- Cada operação distinta vira um item separado — não agrupe (ex: boleto R$ 500 + tarifa R$ 1,50 = 2 items com o MESMO cliente).
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, ponto decimal — ex: 3994.10).
- Datas sempre em formato AAAA-MM-DD (converta de DD/MM/AAAA).
- CNPJ/CPF sempre só dígitos (remova pontuação); se estiver mascarado ou ausente, use null.
- Nunca invente dados que não estão no documento — use null quando a informação genuinamente não aparece.
- Extraia TODAS as colunas e informações visíveis no PDF, incluindo agência recebedora, número de parcela, etc.`;

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
  // Até 20 páginas por request — comprovantes em lote podem ter dezenas de
  // páginas; o client deve dividir em blocos de 20 e chamar a function
  // várias vezes se o arquivo for maior que isso.
  const imgs = imagens.slice(0, 20);
  const parts: unknown[] = [{ text: PROMPT }];
  for (const img of imgs) {
    const m = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!m) continue;
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  return chamarGemini(parts);
}

async function extrairViaGeminiTexto(texto: string): Promise<unknown> {
  // Sem o teto apertado de TPM do Groq — o limite aqui é só o contexto do
  // modelo (bem maior que qualquer PDF de comprovantes real).
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
    const { texto, imagens } = await req.json();

    const temTexto = typeof texto === 'string' && texto.trim().length >= 20;
    const temImagens = Array.isArray(imagens) && imagens.length > 0;

    if (!temTexto && !temImagens) {
      return new Response(JSON.stringify({ error: 'Nem texto nem imagem do PDF foram enviados, ou o texto veio vazio/muito curto.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let dados: unknown;
    if (temImagens) {
      dados = await extrairViaGeminiImagens(imagens);
    } else {
      dados = await extrairViaGeminiTexto(texto);
    }

    return new Response(JSON.stringify(dados), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : '';
    console.error('[lancctb-parse-comprovante] Erro na extração:', errorMsg, errorStack);
    return new Response(JSON.stringify({
      error: errorMsg,
      tipo_erro: e instanceof Error ? e.constructor.name : 'Erro desconhecido',
      debug_info: errorMsg.includes('JSON') ? 'Possível erro ao parsear JSON da IA' :
                  errorMsg.includes('413') ? 'Arquivo muito grande (413 Groq)' :
                  errorMsg.includes('429') ? 'Rate limit atingido (429)' :
                  errorMsg.includes('503') ? 'Serviço indisponível (503)' :
                  'Erro na API ou processamento'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

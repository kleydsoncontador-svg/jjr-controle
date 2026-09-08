// Edge Function: extração de dados de documentos de imóvel (escritura, matrícula,
// contrato de compra e venda, carnê de IPTU, etc.) via IA (Gemini, chave paga).
// Usada pelo botão "🔍 Extrair Dados dos Documentos (IA)" no módulo Imóveis, em index.html
//
// Migrado de Groq pra Gemini (pedido do usuário 08/09/2026: nenhum campo do
// site deve depender do Groq free-tier, rate limit agressivo e causa real
// de falhas intermitentes vistas em produção).
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "imv-extrair-dados" → colar este código → Deploy function.
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
      return new Response(JSON.stringify({ error: 'Texto do(s) documento(s) vazio ou não reconhecido — confira se o PDF não é uma imagem escaneada sem texto selecionável.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Limita o texto enviado pra manter o prompt rápido e barato — as
    // informações relevantes (quadro-resumo/qualificação das partes) ficam
    // sempre no início do documento; o resto costuma ser cláusula padrão.
    const textoLimitado = texto.slice(0, 24000);

    const prompt = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo dados de documentos de um imóvel (escritura pública, matrícula do cartório de registro de imóveis, contrato de compra e venda, carnê de IPTU/ITR, etc.) para cadastro no sistema de controle contábil do escritório.

Texto extraído do(s) PDF(s) (pode incluir mais de um documento, cada um identificado por "=== NOME DO ARQUIVO ==="):

"""
${textoLimitado}
"""

Extraia os dados e responda SOMENTE com um JSON válido, exatamente neste formato (use null para o que não encontrar — não invente valores):

{
  "descricaoSugerida": "descrição curta pra identificar o imóvel, ex: Apto 302 Ed. Central ou Lote 4B Jardim Veranico" ou null,
  "tipoImovel": "Apartamento" | "Casa" | "Terreno" | "Sala Comercial" | "Galpão" | "Loja" | "Imóvel Rural" | "Outro" ou null,
  "dataAquisicao": "DD/MM/AAAA" (data da escritura/assinatura do contrato de compra e venda) ou null,
  "valorTotalAquisicao": número (valor total pago pelo imóvel, conforme escritura/contrato) ou null,
  "cep": "00000-000" ou null,
  "logradouro": "nome da rua/avenida" ou null,
  "numero": "número do imóvel" ou null,
  "complemento": "apto/bloco/quadra/lote, se houver" ou null,
  "bairro": "bairro" ou null,
  "cidade": "cidade" ou null,
  "uf": "sigla do estado, 2 letras" ou null,
  "areaTotal": "área total com unidade, ex: 120 m²" ou null,
  "numeroMatricula": "número da matrícula no cartório de registro de imóveis" ou null,
  "cartorioRegistro": "nome/número do cartório de registro de imóveis" ou null,
  "iptuInscricao": "número de inscrição imobiliária/IPTU/ITR/CCIR, se houver" ou null,
  "vendedores": [{"nome": "nome completo", "cpfCnpj": "CPF ou CNPJ formatado", "participacao": "% de participação na venda, se houver mais de um vendedor, ex: 50%"}] (lista de todos os vendedores/outorgantes identificados no documento; array vazio [] se não encontrar nenhum),
  "observacoes": "um parágrafo corrido (4-8 frases) resumindo a aquisição, como uma nota de arquivo pra consulta futura: o que é o imóvel e onde fica, área, matrícula e cartório de registro, forma de pagamento (à vista/parcelado, valor, banco/meio), dados da escritura (cartório, livro, folhas, protocolo, escrevente, se houver), vendedores/outorgantes e regime de bens quando mencionado, e ao final quaisquer pendências (ex: falta registrar a transferência no cartório de imóveis) ou divergências entre os documentos anexados (ex: valor da escritura diferente do valor do contrato). Sempre preencher, mesmo que o documento esteja completo — nesse caso, é só o resumo, sem pendências."
}

Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 350000.00).`;

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

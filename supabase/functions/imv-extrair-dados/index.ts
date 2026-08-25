// Edge Function: extração de dados de documentos de imóvel (escritura, matrícula,
// contrato de compra e venda, carnê de IPTU, etc.) via IA (Groq)
// Usada pelo botão "🔍 Extrair Dados dos Documentos (IA)" no módulo Imóveis, em index.html
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "imv-extrair-dados" → colar este código → Deploy function.
// Usa o mesmo secret GROQ_API_KEY já configurado pras outras functions do projeto
// (secrets de Edge Functions são por projeto, não por função — não precisa
// cadastrar de novo).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// llama-3.3-70b-versatile foi descontinuado pelo Groq em 17/06/2026 —
// migrado para o substituto recomendado pela própria Groq.
const GROQ_MODEL = 'openai/gpt-oss-120b';

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

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY não configurada nos secrets da function' }), {
        status: 500,
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

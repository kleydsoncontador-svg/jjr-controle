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
  "origemAquisicao": exatamente uma destas opções: "Compra e Venda" | "Doação" | "Integralização de Capital" | "Herança / Inventário" | "Permuta" | "Dação em Pagamento" | "Adjudicação / Arrematação (Leilão)" | "Construção / Incorporação Própria" | "Usucapião" | "Cisão / Fusão / Incorporação de Empresa" | "Outra" (como o imóvel entrou no patrimônio: escritura de compra e venda, doação, ata de assembleia que integraliza/aumenta capital com o imóvel, formal de partilha, etc.) ou null,
  "origemDetalhe": "instrumento e dados da origem, ex: Ata de Assembleia Geral Extraordinária de 30/07/2019 registrada na JUCESP, ou Escritura de Compra e Venda lavrada no 12º Tabelião de Notas de São Paulo, Livro 3727, fls. 081" ou null,
  "valorTerreno": número (valor do terreno/fração ideal, se o documento separar) ou null,
  "valorEdificacao": número (valor da construção/edificação/benfeitorias, se o documento separar; caso o imóvel seja apartamento/sala e o documento não separe terreno, use o valor total de aquisição) ou null,
  "valorMercadoAtual": número (valor de avaliação/mercado informado em laudo, se houver; NÃO usar o valor venal do IPTU) ou null,
  "vendedores": [{"nome": "nome completo", "cpfCnpj": "CPF ou CNPJ formatado", "participacao": "% de participação, se houver mais de um, ex: 50%"}] (lista de todas as partes que TRANSMITEM o imóvel — vendedores, doadores, sócios que integralizam, espólio, permutantes, executados, empresa de origem — identificadas no documento; array vazio [] se não encontrar nenhuma),
  "outrosCustos": [{"data": "DD/MM/AAAA" ou null, "fornecedor": "quem recebeu (ex: Tabelionato de Notas, Cartório de Registro de Imóveis, Prefeitura — ITBI, Leiloeiro)", "valor": número}] (custos de aquisição além do preço: ITBI, escritura, registro, comissão de leiloeiro, certidões — só os que aparecem nos documentos; array vazio [] se não houver),
  "pagamentos": [{"forma": exatamente "À Vista" | "Financiamento Bancário" | "Parcelado Direto (Vendedor)" | "FGTS" | "Permuta" | "Outro", "valor": número ou null, "banco": "banco/entidade ou null", "parcelas": "nº de parcelas ou null", "obs": "detalhe curto ou null"}] (formas de pagamento descritas; em integralização de capital use "Outro" com obs "Integralização de capital"; array vazio [] se não houver),
  "alienacao": {"data": "DD/MM/AAAA", "comprador": "nome", "valor": número, "forma": "à vista/parcelado...", "obs": "..."} (SOMENTE se o documento mostrar que a empresa VENDEU o imóvel; caso contrário null),
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

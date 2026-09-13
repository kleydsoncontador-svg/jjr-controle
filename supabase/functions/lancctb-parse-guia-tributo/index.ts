// Edge Function: extração via IA de GUIA DE TRIBUTO escaneada (DARF, GNRE,
// DAMSP/TFE, FGTS etc. — qualquer guia de pagamento de imposto), para o
// módulo Lançamentos Bancários (botão "🔄 Processar Tributos", checkbox
// "🤖 IA em guias escaneadas"). Existe porque a leitura sem IA (pdfjsLib,
// client-side) só funciona em PDF com texto selecionável — quando a guia é
// uma imagem escaneada (achado real 13/09/2026: "GuiaPagamento_072026_
// PIS_COFINS" da Accurare, 331KB de imagem, zero texto extraível), não tem
// nenhum texto pra ler e o botão fica sem PDF encontrado pra sempre.
//
// Mesmo padrão de OCR via visão já usado em lancctb-parse-extrato/
// convaplicfin-extrair-tabela: renderiza a página como imagem no client e
// manda pra cá. Só aceita `imagens` (guia sempre cabe em 1-2 páginas,
// nunca vale a pena mandar texto aqui — se tivesse texto, o client nem
// chamaria esta function, resolveria sem IA).
//
// Formato de saída ESPELHA _lancctbExtrairComposicaoDarf (index.html) pra
// plugar direto no mesmo pipeline (rateio automático quando a guia junta
// 2+ impostos, Histórico Utilizado pré-preenchido) sem nenhuma mudança no
// resto do código: { itens:[{codigo,denominacao,valor}], valorTotal,
// competencia }.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via
// Editor → nome "lancctb-parse-guia-tributo" → colar este código → Deploy.
// Secrets: GEMINI_API_KEY (já configurada no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-3.6-flash';

const PROMPT = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo os dados de uma GUIA DE PAGAMENTO DE TRIBUTO (imagem escaneada) — pode ser DARF, GNRE, DAS, FGTS, DAMSP (TFE/ISS da Prefeitura de SP), GPS ou qualquer outra guia de arrecadação federal/estadual/municipal.

Responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "itens": [
    { "codigo": "código da receita se aparecer (ex: '2172'), senão null", "denominacao": "nome do imposto/encargo (ex: 'COFINS', 'TFE', 'Multa', 'Juros')", "valor": número positivo }
  ],
  "valorTotal": número positivo (o valor TOTAL a pagar da guia — se a guia tiver Multa/Juros/Atualização separados do Principal, valorTotal é a SOMA de tudo, e cada um desses componentes vira um item próprio em "itens"),
  "competencia": "período de referência no formato MM/AAAA, ou 'Nº Trim.AAAA' se for trimestral, ou null se não conseguir identificar"
}

Regras:
- Se a guia tiver uma "Composição do Documento de Arrecadação" com várias linhas de código+denominação+valor (DARF que junta 2+ impostos, ex: PIS+COFINS ou IRPJ+CSLL), inclua UM item por linha dessa composição, com o "código" de cada um.
- Se a guia for de um imposto só mas tiver campos separados de Valor Principal + Multa + Juros + Atualização Monetária + Outros Encargos (comum em guias municipais tipo DAMSP/TFE), inclua um item para o principal (com o nome do tributo, ex: "TFE") e um item adicional PRA CADA um desses campos que for MAIOR que zero — NUNCA inclua um item de Multa ou Juros com valor zero, e NUNCA invente um valor de Multa/Juros que não esteja explicitamente impresso na guia.
- Se a guia for simples (1 valor só, sem composição nem campos de encargo separados, ex: FGTS, GNRE simples), devolva um único item com a denominação/sigla do tributo (tirada do título/logotipo da guia) e o valor total.
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, ponto decimal — ex: 1234.56).
- Se não conseguir identificar nenhum valor com confiança, devolva itens como array vazio [] e valorTotal como 0 — nunca invente números.`;

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
  const imgs = imagens.slice(0, 5);
  const parts: unknown[] = [{ text: PROMPT }];
  for (const img of imgs) {
    const m = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!m) continue;
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  return chamarGemini(parts);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { imagens } = await req.json();

    if (!Array.isArray(imagens) || !imagens.length) {
      return new Response(JSON.stringify({ error: 'Nenhuma imagem da guia foi enviada.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const dados = await extrairViaGeminiImagens(imagens);

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

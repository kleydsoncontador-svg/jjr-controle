// Edge Function: confere se as NORMAS BRASILEIRAS DE CONTABILIDADE (NBC) do CFC mudaram de revisão. Chamada SOMENTE pelo botão "Atualizar versão (IA)" / "Verificar atualizações da seção" do módulo NBC (nbc-ui.js).
//
// REGRA (pedido do usuário 24/10/2026): a IA só PROPÕE — para cada norma que mudou devolve a revisão nova, a data do DOU, COMO ERA × COMO FICOU e a fonte oficial. O site mostra tudo ao usuário e só grava depois de ele confirmar.
// Esta função NÃO baixa o texto das normas (o texto será uma etapa futura).
//
// Deploy: Supabase Dashboard → Edge Functions → New Function → nome "nbc-atualizar-norma" → colar este código. ***AINDA NÃO PUBLICADA*** (aguardando o usuário).
// Secrets: GEMINI_API_KEY (já configurada). NÃO enviar thinkingConfig (o modelo responde HTTP 400).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GEMINI_MODEL = 'gemini-3.6-flash';

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function chamarGemini(prompt: string, comBusca: boolean): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nos secrets da function');
  const corpo: Record<string, unknown> = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } };
  if (comBusca) corpo.tools = [{ google_search: {} }];
  else (corpo.generationConfig as Record<string, unknown>).responseMimeType = 'application/json';
  let ultimoErro = '';
  for (let t = 1; t <= 3; t++) {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(corpo),
    });
    if (resp.ok) {
      const data = await resp.json();
      const raw = (data?.candidates?.[0]?.content?.parts || []).filter((p: any) => typeof p.text === 'string').map((p: any) => p.text).join('\n');
      if (!raw) throw new Error('A IA não retornou texto — resposta: ' + JSON.stringify(data).slice(0, 300));
      return raw;
    }
    const errText = await resp.text();
    ultimoErro = 'Erro na API da IA (Gemini, ' + resp.status + '): ' + errText.slice(0, 300);
    if (resp.status === 400 && comBusca) throw new Error('SEM_BUSCA:' + ultimoErro);
    if ((resp.status !== 503 && resp.status !== 429) || t === 3) throw new Error(ultimoErro);
    await sleep(2000 * t);
  }
  throw new Error(ultimoErro);
}

function extrairJson(raw: string): any {
  let s = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  const H = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
  try {
    const { hoje, secao, fonte_url, itens } = await req.json();
    if (!Array.isArray(itens) || !itens.length) return new Response(JSON.stringify({ error: 'Envie a lista de normas a conferir.' }), { status: 400, headers: H });

    const prompt = `Você é um pesquisador de normas contábeis brasileiras. Hoje é ${hoje}.
Tarefa: conferir, no site oficial do Conselho Federal de Contabilidade (cfc.org.br), seção "${secao}" (${fonte_url}), se alguma das NBC abaixo MUDOU DE REVISÃO desde a revisão cadastrada.

REGRAS RÍGIDAS:
- Use SOMENTE fontes oficiais (cfc.org.br e a Resolução CFC publicada no DOU). Cada proposta precisa trazer o link da fonte oficial.
- Se a revisão cadastrada continua sendo a última, NÃO proponha nada para ela. Na dúvida, não proponha. NÃO invente números de revisão, datas ou resoluções.
- "antes" = como era (o que dizia a revisão anterior / o que mudou no ponto principal); "depois" = como ficou na revisão nova. Seja objetivo (1 a 2 frases cada), sem copiar o texto da norma.
- "revisao_nova" no formato do CFC, ex.: "R2", "R3". "dou_nova" = data de publicação no DOU, dd/mm/aaaa.

NORMAS CADASTRADAS:
${JSON.stringify(itens, null, 1)}

Responda SOMENTE com JSON válido:
{
  "resumo": "1 frase: o que foi conferido e o que foi encontrado",
  "propostas": [
    { "codigo": "NBC TG 01", "revisao_nova": "R5", "dou_nova": "dd/mm/aaaa", "antes": "...", "depois": "...", "resumo": "...", "fonte": "https://cfc.org.br/..." }
  ]
}`;

    let raw: string; let usouBusca = true;
    try { raw = await chamarGemini(prompt, true); }
    catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      if (!m.startsWith('SEM_BUSCA:')) throw e;
      usouBusca = false; raw = await chamarGemini(prompt, false);
    }
    let dados: any;
    try { dados = extrairJson(raw); } catch { throw new Error('A IA devolveu uma resposta fora do formato esperado. Tente de novo.'); }
    const propostas = (Array.isArray(dados?.propostas) ? dados.propostas : []).filter((p: any) =>
      p && p.codigo && p.revisao_nova && /^https?:\/\//.test(String(p.fonte || '')));
    return new Response(JSON.stringify({ resumo: String(dados?.resumo || ''), propostas, usou_busca_web: usouBusca }), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: H });
  }
});

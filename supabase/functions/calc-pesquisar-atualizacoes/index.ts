// Edge Function: pesquisa de ATUALIZAÇÕES de parâmetros legais para as Calculadoras JJR.
// Chamada SOMENTE pelo botão "🤖 Pesquisar atualizações" em Calculadoras → Bases Legais.
//
// REGRA DE OURO (pedido do usuário 20/10/2026): a IA NÃO calcula, NÃO escolhe alíquota/base/fórmula e NÃO altera parâmetro.
// Ela só devolve PROPOSTAS (parâmetro atual × novo sugerido, base legal, vigência, fonte oficial). O site guarda como
// "pendente"; só um administrador aprova — e a aprovação cria uma NOVA versão do conjunto, nunca sobrescreve.
//
// Deploy: Supabase Dashboard → Edge Functions → New Function → nome "calc-pesquisar-atualizacoes" → colar este código.
// Secrets: GEMINI_API_KEY (já configurada no projeto). NÃO enviar thinkingConfig (o modelo responde HTTP 400).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-3.6-flash';
const FONTES = 'Planalto (planalto.gov.br), Receita Federal (gov.br/receitafederal), INSS/Previdência (gov.br/inss), MTE (gov.br/trabalho-e-emprego), eSocial, FGTS Digital, gov.br, CONFAZ, SEFAZ de cada UF e Assembleias Legislativas.';

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function chamarGemini(prompt: string, comBusca: boolean): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nos secrets da function');
  const corpo: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 },
  };
  if (comBusca) corpo.tools = [{ google_search: {} }]; // com busca na web não se combina com responseMimeType JSON
  else (corpo.generationConfig as Record<string, unknown>).responseMimeType = 'application/json';
  let ultimoErro = '';
  for (let t = 1; t <= 3; t++) {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(corpo),
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
    const { hoje, conjuntos, foco } = await req.json();
    if (!Array.isArray(conjuntos)) return new Response(JSON.stringify({ error: 'Envie a lista de conjuntos de parâmetros atuais.' }), { status: 400, headers: H });

    const prompt = `Você é um pesquisador de legislação tributária e trabalhista brasileira. Hoje é ${hoje}.
Sua única tarefa: verificar se ALGUM dos parâmetros legais abaixo (cadastrados no sistema de uma contabilidade) MUDOU ou foi atualizado, e propor a alteração.

REGRAS RÍGIDAS:
- Você NÃO calcula nada e NÃO escolhe alíquotas, bases ou fórmulas por conta própria. Só reporta mudanças que estejam em NORMA PUBLICADA.
- Use SOMENTE fontes oficiais: ${FONTES} Cada proposta precisa trazer o link da fonte oficial.
- Se não encontrar mudança comprovada, devolva "propostas": []. NÃO invente. Na dúvida, não proponha.
- "parametro" deve ser exatamente o nome de uma chave existente em "parametros" do conjunto. "novo_valor" deve ter o MESMO formato (tipo JSON) do valor atual (número como string decimal com ponto, ex.: "0.075", se o atual for string; array de objetos com as mesmas chaves, se o atual for array).
- "vigencia_inicial" no formato AAAA-MM-DD, a data em que a norma passa a valer.
- Não repita valores que já são iguais aos atuais.

${foco ? String(foco).slice(0, 1500) + ' ' : ''}

CONJUNTOS ATUAIS:
${JSON.stringify(conjuntos, null, 1)}

Responda SOMENTE com JSON válido neste formato:
{
  "resumo": "1 frase: o que foi verificado e o que foi encontrado",
  "propostas": [
    { "calculator_key": "...", "uf": "SP ou vazio", "parametro": "...", "novo_valor": <mesmo formato do atual>, "base_legal": "norma, número e artigo", "vigencia_inicial": "AAAA-MM-DD", "fonte": "https://... (oficial)", "observacao": "..." }
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
      p && p.calculator_key && p.parametro && p.novo_valor !== undefined && p.novo_valor !== null && /^https?:\/\//.test(String(p.fonte || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(p.vigencia_inicial || '')));
    return new Response(JSON.stringify({ resumo: String(dados?.resumo || ''), propostas, usou_busca_web: usouBusca }), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: H });
  }
});

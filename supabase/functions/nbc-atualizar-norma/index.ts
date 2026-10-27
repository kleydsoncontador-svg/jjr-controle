// Edge Function: NORMAS BRASILEIRAS DE CONTABILIDADE (NBC) do CFC. Chamada SOMENTE pelos botões do módulo NBC (nbc-ui.js). Dois modos:
//   (padrão)  "Atualizar versão (IA)" / "Verificar atualizações da seção": confere se alguma NBC mudou de revisão.
//   modo "explicar": gera a EXPLICAÇÃO SIMPLES da norma (linguagem de quem não entende de norma, com a referência do item na norma original) + no mínimo 10 EXEMPLOS PRÁTICOS. (pedido do usuário 26/10/2026)
//
// REGRA: a IA só PROPÕE — o site mostra tudo ao usuário e só grava depois de ele confirmar. Nunca inventar número de item/parágrafo: se não houver certeza, a referência é "ver norma".
//
// Deploy: Supabase Dashboard → Edge Functions → nbc-atualizar-norma → colar este código.
// Secrets: GEMINI_API_KEY (já configurada). NÃO enviar thinkingConfig (o modelo responde HTTP 400).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GEMINI_MODEL = 'gemini-3.6-flash';

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function chamarGemini(prompt: string, comBusca: boolean, maxTokens = 4096): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nos secrets da function');
  const corpo: Record<string, unknown> = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens } };
  if (comBusca) corpo.tools = [{ google_search: {} }];
  else (corpo.generationConfig as Record<string, unknown>).responseMimeType = 'application/json';
  let ultimoErro = '';
  for (let t = 1; t <= 3; t++) {
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent', {
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
  const cerca = String.fromCharCode(96, 96, 96);
  let s = raw.trim();
  if (s.startsWith(cerca)) { s = s.slice(3); if (s.toLowerCase().startsWith('json')) s = s.slice(4); }
  if (s.endsWith(cerca)) s = s.slice(0, -3);
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

async function comBuscaOuSem(prompt: string, maxTokens: number): Promise<{ raw: string; usouBusca: boolean }> {
  try { return { raw: await chamarGemini(prompt, true, maxTokens), usouBusca: true }; }
  catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (!m.startsWith('SEM_BUSCA:')) throw e;
    return { raw: await chamarGemini(prompt, false, maxTokens), usouBusca: false };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  const H = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
  try {
    const corpoReq = await req.json();

    // ───────────── modo "explicar" ─────────────
    if (corpoReq.modo === 'explicar') {
      const { hoje, codigo, nome, revisao, dou, cpc, iasb, fonte_url } = corpoReq;
      const minEx = Number(corpoReq.min_exemplos) || 10;
      if (!codigo || !nome) return new Response(JSON.stringify({ error: 'Informe o código e o nome da norma.' }), { status: 400, headers: H });
      const prompt = 'Você é contador e professor, e escreve para quem NÃO entende de normas contábeis. Hoje é ' + hoje + '.\n' +
        'Norma: ' + codigo + (revisao ? ' (' + revisao + ')' : '') + ' — ' + nome + (dou ? ' — publicada no DOU em ' + dou : '') + (cpc ? ' — correlação CPC: ' + cpc : '') + (iasb ? ' — IASB: ' + iasb : '') + '.\n' +
        'Fonte oficial: ' + (fonte_url || 'site do Conselho Federal de Contabilidade (cfc.org.br)') + '.\n\n' +
        'TAREFA: explique esta norma, NA REVISÃO VIGENTE indicada, em linguagem simples, e dê no MÍNIMO ' + minEx + ' exemplos práticos de empresas brasileiras usando a norma no dia a dia.\n\n' +
        'REGRAS RÍGIDAS:\n' +
        '- Baseie-se SOMENTE na norma oficial (CFC / CPC) na revisão informada. Se algo não puder ser confirmado, diga no campo "aviso".\n' +
        '- NUNCA invente número de item/parágrafo. No campo "ref" use "itens 9 a 12" SOMENTE se tiver certeza; senão escreva "ver norma".\n' +
        '- Linguagem simples, sem juridiquês: explique o termo técnico quando usar. Frases curtas.\n' +
        '- Exemplos realistas (valores em R$, tipo de empresa brasileira: comércio, indústria, serviços), variados, cada um mostrando UMA ideia da norma. "lancamento" em partida dobrada, ex.: "D - Estoques 10.000,00 / C - Fornecedores 10.000,00"; se não houver lançamento use "—".\n' +
        '- Não copie trechos longos da norma. Escreva com suas palavras.\n\n' +
        'Responda SOMENTE com JSON válido neste formato:\n' +
        '{\n  "resumo": "2 a 4 frases: do que trata a norma, em palavras simples",\n  "objetivo": "1 frase: para que ela serve na prática",\n' +
        '  "pontos": [ { "titulo": "...", "texto": "1 a 3 frases simples", "ref": "itens X a Y | ver norma" } ],\n' +
        '  "termos": [ { "termo": "...", "significado": "..." } ],\n' +
        '  "exemplos": [ { "titulo": "...", "situacao": "caso concreto com valores", "tratamento": "o que a norma manda fazer, em palavras simples", "lancamento": "D - ... / C - ... (ou —)", "ref": "itens X a Y | ver norma" } ],\n' +
        '  "aviso": "observações ou \\"\\" se nada",\n  "fonte": "url oficial consultada"\n}\n' +
        'Use de 6 a 10 "pontos", de 4 a 8 "termos" e no mínimo ' + minEx + ' "exemplos".';
      const { raw, usouBusca } = await comBuscaOuSem(prompt, 8192);
      let dados: any;
      try { dados = extrairJson(raw); } catch { throw new Error('A IA devolveu uma resposta fora do formato esperado. Tente de novo.'); }
      const arr = (x: unknown) => (Array.isArray(x) ? x : []);
      const pontos = arr(dados?.pontos).filter((p: any) => p && (p.titulo || p.texto));
      const termos = arr(dados?.termos).filter((t: any) => t && t.termo);
      const exemplos = arr(dados?.exemplos).filter((x: any) => x && (x.titulo || x.situacao));
      let aviso = String(dados?.aviso || '');
      if (exemplos.length < minEx) aviso = (aviso ? aviso + ' ' : '') + 'A IA devolveu só ' + exemplos.length + ' exemplo(s), menos que os ' + minEx + ' pedidos — gere de novo.';
      if (!usouBusca) aviso = (aviso ? aviso + ' ' : '') + 'Sem busca na web desta vez: confira com a norma original.';
      return new Response(JSON.stringify({
        resumo: String(dados?.resumo || ''), objetivo: String(dados?.objetivo || ''), pontos, termos, exemplos, aviso, fonte: String(dados?.fonte || fonte_url || ''), usou_busca_web: usouBusca,
      }), { headers: H });
    }

    // ───────────── modo padrão: conferir revisões ─────────────
    const { hoje, secao, fonte_url, itens } = corpoReq;
    if (!Array.isArray(itens) || !itens.length) return new Response(JSON.stringify({ error: 'Envie a lista de normas a conferir.' }), { status: 400, headers: H });

    const prompt = 'Você é um pesquisador de normas contábeis brasileiras. Hoje é ' + hoje + '.\n' +
      'Tarefa: conferir, no site oficial do Conselho Federal de Contabilidade (cfc.org.br), seção "' + secao + '" (' + fonte_url + '), se alguma das NBC abaixo MUDOU DE REVISÃO desde a revisão cadastrada.\n\n' +
      'REGRAS RÍGIDAS:\n' +
      '- Use SOMENTE fontes oficiais (cfc.org.br e a Resolução CFC publicada no DOU). Cada proposta precisa trazer o link da fonte oficial.\n' +
      '- Se a revisão cadastrada continua sendo a última, NÃO proponha nada para ela. Na dúvida, não proponha. NÃO invente números de revisão, datas ou resoluções.\n' +
      '- "antes" = como era (o que dizia a revisão anterior / o que mudou no ponto principal); "depois" = como ficou na revisão nova. Seja objetivo (1 a 2 frases cada), sem copiar o texto da norma.\n' +
      '- "revisao_nova" no formato do CFC, ex.: "R2", "R3". "dou_nova" = data de publicação no DOU, dd/mm/aaaa.\n\n' +
      'NORMAS CADASTRADAS:\n' + JSON.stringify(itens, null, 1) + '\n\n' +
      'Responda SOMENTE com JSON válido:\n' +
      '{\n  "resumo": "1 frase: o que foi conferido e o que foi encontrado",\n  "propostas": [\n    { "codigo": "NBC TG 01", "revisao_nova": "R5", "dou_nova": "dd/mm/aaaa", "antes": "...", "depois": "...", "resumo": "...", "fonte": "https://cfc.org.br/..." }\n  ]\n}';

    const { raw, usouBusca } = await comBuscaOuSem(prompt, 4096);
    let dados: any;
    try { dados = extrairJson(raw); } catch { throw new Error('A IA devolveu uma resposta fora do formato esperado. Tente de novo.'); }
    const propostas = (Array.isArray(dados?.propostas) ? dados.propostas : []).filter((p: any) =>
      p && p.codigo && p.revisao_nova && /^https?:\/\//.test(String(p.fonte || '')));
    return new Response(JSON.stringify({ resumo: String(dados?.resumo || ''), propostas, usou_busca_web: usouBusca }), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: H });
  }
});

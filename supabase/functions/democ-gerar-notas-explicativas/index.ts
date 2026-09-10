// Edge Function: gera o rascunho das Notas Explicativas às Demonstrações
// Contábeis (exercício anual) via IA, pro módulo "Demonstrativos Contábeis"
// em index.html — item "Notas Explicativas" (pedido do usuário 09/09/2026).
//
// Base normativa: NBC TG 51 (correlato IFRS 18, "Apresentação e Divulgação
// nas Demonstrações Contábeis") — ver reference_cfc_normas_contabeis na
// memória do projeto. O texto gerado é sempre um RASCUNHO pra revisão do
// contador, nunca a versão final — a IA é instruída a nunca inventar valor
// numérico que não veio no payload.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "democ-gerar-notas-explicativas" → colar este código → Deploy function.
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
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
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

function fmtBRL(v: unknown): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0)) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const {
      empresaNome, cnpj, ano, balancete, dre,
      temLivroRazao, mesesLivroRazao,
      contingencias, eventosSubsequentes, politicaContabilEspecifica,
    } = body || {};

    if (!empresaNome || !ano) {
      return new Response(JSON.stringify({ error: 'Faltam dados obrigatórios (empresa/ano).' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    if (!balancete && !dre) {
      return new Response(JSON.stringify({ error: 'Sem Balancete nem DRE deste ano — nada pra basear a nota.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const linhasBalancete = balancete
      ? `Balancete — posição em ${balancete.mesReferencia}/${ano} (meses recebidos no ano: ${(balancete.mesesDisponiveis || []).join(', ')}):\n`
        + (balancete.contas || []).map((c: any) => `- ${c.nome} (${c.codigo || 's/código'}): R$ ${fmtBRL(c.saldo)}`).join('\n')
      : 'Balancete: NÃO DISPONÍVEL para este ano.';

    const linhasDre = dre
      ? `DRE — total ANUAL somando os meses recebidos (${(dre.mesesDisponiveis || []).join(', ')}${(dre.mesesDisponiveis || []).length < 12 ? ' — ANO INCOMPLETO' : ''}):\n`
        + (dre.contas || []).map((c: any) => `- ${c.nome} (${c.codigo || 's/código'}): R$ ${fmtBRL(c.valorAnual)}`).join('\n')
      : 'DRE: NÃO DISPONÍVEL para este ano.';

    const prompt = `Você é um contador brasileiro sênior redigindo o RASCUNHO das Notas Explicativas às Demonstrações Contábeis de uma empresa, para revisão posterior por um contador humano antes de uso oficial. Siga a estrutura e o espírito da NBC TG 51 (Apresentação e Divulgação nas Demonstrações Contábeis — correlata à IFRS 18), adaptando ao porte da empresa (linguagem objetiva, sem enrolação).

DADOS DA EMPRESA:
- Razão social: ${empresaNome}
- CNPJ: ${cnpj || 'não informado'}
- Exercício de referência: ${ano}

${linhasBalancete}

${linhasDre}

Livro Razão do exercício: ${temLivroRazao ? `registrado para os meses ${(mesesLivroRazao || []).join(', ')} (arquivo apenas arquivado, seu conteúdo NÃO foi lido/analisado — não descreva números dele, só pode mencionar que existe como suporte documental)` : 'não há registro de Livro Razão para este exercício'}.

Informações fornecidas pelo contador (use literalmente o que houver; se estiver vazio, escreva a frase padrão indicando que não há):
- Contingências (processos judiciais, garantias, avais): ${contingencias || '(nada informado)'}
- Eventos subsequentes ao encerramento do exercício: ${eventosSubsequentes || '(nada informado)'}
- Política contábil específica desta empresa: ${politicaContabilEspecifica || '(nada informado — usar política contábil padrão aplicável a empresas de pequeno/médio porte no Brasil)'}

REGRAS OBRIGATÓRIAS:
1. NUNCA invente valor numérico que não esteja explicitamente nos dados acima. Se um número não foi fornecido, escreva qualitativamente (ex: "não houve" / "não aplicável") em vez de estimar.
2. Se o Balancete ou o DRE estiverem marcados como NÃO DISPONÍVEL ou ano incompleto, mencione essa limitação na nota (ex: "com base nos dados disponíveis até o momento da elaboração").
3. Use linguagem técnica contábil brasileira, terceira pessoa, tom formal de documento oficial.
4. Não repita a mesma informação em seções diferentes.

Responda SOMENTE com um JSON válido neste formato exato:
{
  "secoes": [
    { "titulo": "1. Contexto Operacional", "texto": "..." },
    { "titulo": "2. Base de Elaboração e Apresentação das Demonstrações Contábeis", "texto": "..." },
    { "titulo": "3. Principais Práticas Contábeis", "texto": "..." },
    { "titulo": "4. Composição do Ativo e Passivo", "texto": "..." },
    { "titulo": "5. Composição do Resultado do Exercício", "texto": "..." },
    { "titulo": "6. Contingências", "texto": "..." },
    { "titulo": "7. Eventos Subsequentes", "texto": "..." }
  ]
}

Cada "texto" deve ter de 2 a 6 frases (parágrafo corrido, sem marcadores/bullets, use "\\n\\n" só se precisar de mais de um parágrafo dentro da mesma seção).`;

    let raw = await chamarGemini(prompt);
    raw = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    const dados = JSON.parse(raw);

    if (!dados || !Array.isArray(dados.secoes) || !dados.secoes.length) {
      throw new Error('A IA não retornou nenhuma seção válida.');
    }

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

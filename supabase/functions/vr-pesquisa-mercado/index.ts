// Edge Function: pesquisa de mercado + obsolescência via IA (Gemini, chave paga)
// Usada pelo botão "🔍 Pesquisar Mercado (IA)" em valor-residual.html
//
// Migrado de Groq pra Gemini (pedido do usuário 08/09/2026: nenhum campo do
// site deve depender do Groq free-tier, rate limit agressivo e causa real
// de falhas intermitentes vistas em produção).
//
// Deploy: Supabase Dashboard → Edge Functions → New Function → nome
// "vr-pesquisa-mercado" → colar este código.
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
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
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
    const { descricao, categoriaLabel, valorCusto, vidaUtilAnos } = await req.json();
    if (!descricao) {
      return new Response(JSON.stringify({ error: 'Descrição do ativo é obrigatória' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const custoFmt = typeof valorCusto === 'number' ? valorCusto.toFixed(2) : String(valorCusto ?? '');
    const prompt = `Você é um perito em avaliação de bens do ativo imobilizado para fins contábeis/fiscais no Brasil.

Ativo: "${descricao}"
Categoria contábil (fonte confiável do TIPO de bem): ${categoriaLabel ?? ''}
Valor de custo (nota fiscal, já incluindo frete): R$ ${custoFmt}
Vida útil estimada: ${vidaUtilAnos ?? ''} anos

Atenção: a descrição do ativo vem direto da nota fiscal e costuma vir abreviada com jargão/códigos internos do fornecedor (sigla de modelo, cor, tecido, acabamento, medidas) — não é uma frase em português natural. NÃO tente decifrar cada sigla isoladamente nem invente um tipo de produto diferente a partir de uma palavra ambígua (ex: não conclua "equipamento de pintura" só porque aparece algo como "PINT" ou "TINTA" na descrição). Use a Categoria contábil acima como referência principal do tipo de bem, e a descrição apenas como pista de modelo/acabamento dentro dessa categoria.

Pesquise, com base no seu conhecimento do mercado brasileiro de bens novos e usados, e responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "mercado": {
    "novo_faixa": "faixa de preço de um item novo equivalente, ex: R$ 2.700 a R$ 3.000",
    "usado_recente_faixa": "faixa de preço usado com 1-2 anos de uso",
    "usado_medio_faixa": "faixa de preço usado com 3-5 anos de uso",
    "usado_antigo_faixa": "faixa de preço usado com 5+ anos de uso",
    "analise_demanda": "1-2 frases sobre a demanda deste tipo de item usado no mercado secundário brasileiro",
    "velocidade_venda": "estimativa de tempo pra vender, ex: 15 a 45 dias"
  },
  "obsolescencia": {
    "nivel": "Baixa, Moderada, Alta ou Muito Alta",
    "fatores": [
      { "aspecto": "nome do fator (ex: evolução tecnológica)", "status_futuro": "o que muda nos próximos anos", "risco": "Baixo, Médio ou Alto", "impacto": "ex: -20%" }
    ],
    "conclusao": "1-2 frases concluindo sobre a obsolescência esperada deste ativo"
  },
  "residual_sugerido": {
    "conservador_pct": número entre 0 e 100,
    "realista_pct": número entre 0 e 100,
    "otimista_pct": número entre 0 e 100,
    "justificativa": "1-3 frases justificando o percentual realista sugerido, citando a pesquisa de mercado acima"
  }
}

Use valores realistas para o mercado brasileiro — não invente números absurdos, e mantenha conservador_pct < realista_pct < otimista_pct.`;

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

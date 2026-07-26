// Edge Function: pesquisa de mercado + obsolescência via IA (Claude/Anthropic)
// Usada pelo botão "🔍 Pesquisar Mercado (IA)" em valor-residual.html
//
// Deploy: Supabase Dashboard → Edge Functions → New Function → nome
// "vr-pesquisa-mercado" → colar este código.
// Secret necessário: ANTHROPIC_API_KEY (Project Settings → Edge Functions → Secrets)
// Obtenha a chave em https://console.anthropic.com/settings/keys (chave de API,
// diferente do login do claude.ai).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada nos secrets da function' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const custoFmt = typeof valorCusto === 'number' ? valorCusto.toFixed(2) : String(valorCusto ?? '');
    const prompt = `Você é um perito em avaliação de bens do ativo imobilizado para fins contábeis/fiscais no Brasil.

Ativo: "${descricao}"
Categoria contábil: ${categoriaLabel ?? ''}
Valor de custo (nota fiscal, já incluindo frete): R$ ${custoFmt}
Vida útil estimada: ${vidaUtilAnos ?? ''} anos

Pesquise, com base no seu conhecimento do mercado brasileiro de bens novos e usados, e responda SOMENTE com um JSON válido (sem markdown, sem texto fora do JSON), exatamente neste formato:

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
    "nivel": "Baixa" | "Moderada" | "Alta" | "Muito Alta",
    "fatores": [
      { "aspecto": "nome do fator (ex: evolução tecnológica)", "status_futuro": "o que muda nos próximos anos", "risco": "Baixo" | "Médio" | "Alto", "impacto": "ex: -20%" }
    ],
    "conclusao": "1-2 frases concluindo sobre a obsolescência esperada deste ativo"
  },
  "residual_sugerido": {
    "conservador_pct": <número entre 0 e 100>,
    "realista_pct": <número entre 0 e 100>,
    "otimista_pct": <número entre 0 e 100>,
    "justificativa": "1-3 frases justificando o percentual realista sugerido, citando a pesquisa de mercado acima"
  }
}

Use valores realistas para o mercado brasileiro — não invente números absurdos, e mantenha conservador_pct < realista_pct < otimista_pct.`;

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error('Erro na API da IA (' + aiResp.status + '): ' + errText.slice(0, 300));
    }
    const aiData = await aiResp.json();
    let raw: string = aiData?.content?.[0]?.text || '';
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

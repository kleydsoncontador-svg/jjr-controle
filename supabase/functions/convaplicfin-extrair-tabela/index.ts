// Edge Function: extração genérica da tabela de movimentação de um extrato de
// aplicação financeira via IA — não assume nenhum banco/modelo específico,
// extrai as colunas e linhas exatamente como aparecem no extrato.
// Usada pelo Conversor de Aplicações Financeiras em index.html quando o
// parser fixo (Invest Fácil Bradesco) não reconhece o modelo do PDF.
//
// `imagens` (array de data URIs base64, usado quando o PDF é uma imagem
// escaneada sem texto selecionável — ex: "Aplic. Aut Mais Itaú" — processado
// projeto não tem nenhum modelo de visão disponível).
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new 
Regras:
- "Data" é sempre a primeira coluna e é obrigatória em toda linha — nunca null.
- Cada chave dentro de "colunas" deve aparecer, com o mesmo nome exato, em toda linha de "linhas" (use null quando aquela linha não tiver valor naquela coluna).
- NÃO inclua a linha de "Total"/"Acumulado do Mês" como uma linha de movimentação — ela é só a soma; mencione isso em "observacoes" se houver.
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 3994.10). Células vazias na tabela original viram null.
- Preserve os nomes de coluna exatamente como aparecem no documento (incluindo acentos), pois eles serão usados depois para o usuário mapear cada coluna para uma conta contábil.`;

function limparJson(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extrairViaGemini(imagens: string[]): Promise<unknown> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada nos secrets da function');

  // No máximo 5 imagens por request — mais que suficiente pra um extrato de
  // aplicação financeira (raramente passa de 1-2 páginas).
  const imgs = imagens.slice(0, 5);
  const parts: unknown[] = [{ text: PROMPT }];
  for (const img of imgs) {
    const m = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!m) continue;
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }

  // O tier gratuito do Gemini retorna 503 "model is currently experiencing
  // high demand" com frequência (sobrecarga temporária do lado do Google,
  // não um erro real) — descoberto testando com o PDF real do Itaú em
  // 18/08/2026. Tenta de novo automaticamente em vez de fazer o usuário
  // clicar "Processar" manualmente várias vezes.
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
    await sleep(2000 * tentativa); // 2s, depois 4s
  }
  throw new Error(ultimoErro);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { texto, imagens } = await req.json();

    const temTexto = typeof texto === 'string' && texto.trim().length >= 20;
    const temImagens = Array.isArray(imagens) && imagens.length > 0;

    if (!temTexto && !temImagens) {
      return new Response(JSON.stringify({ error: 'Nem texto nem imagem do extrato foram enviados, ou o texto veio vazio/muito curto.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

        // imagem (Gemini) quando o PDF não tem texto selecionável.
    const dados = temTexto ? await extrairViaGroq(texto) : await extrairViaGemini(imagens);

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

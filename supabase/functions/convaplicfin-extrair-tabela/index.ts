// Edge Function: extração genérica da tabela de movimentação de um extrato de
// aplicação financeira via IA (Groq) — não assume nenhum banco/modelo
// específico, extrai as colunas e linhas exatamente como aparecem no extrato.
// Usada pelo Conversor de Aplicações Financeiras em index.html quando o
// parser fixo (Invest Fácil Bradesco) não reconhece o modelo do PDF.
//
// Aceita `texto` (extraído via pdfjsLib no client). Suporte a `imagens`
// (PDF escaneado sem texto) ainda NÃO está disponível: a conta Groq deste
// projeto não tem nenhum modelo de visão habilitado hoje (confirmado via
// GET /openai/v1/models — só texto: gpt-oss-120b/20b, qwen3.6-27b). Ver
// conversa de 18/08/2026 no jjr-controle.
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// → nome "convaplicfin-extrair-tabela" → colar este código → Deploy function.
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
const GROQ_MODEL_TEXTO = 'openai/gpt-oss-120b';

const PROMPT = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo a tabela de movimentação de um extrato de aplicação financeira (CDB, fundo, aplicação automática, etc.) para lançamento contábil. O extrato pode ser de qualquer banco — não assuma um modelo específico, leia exatamente as colunas que aparecem no cabeçalho da tabela de movimentação/resgates do documento.

Responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "colunas": ["Data", "Nome da 2ª coluna exatamente como no cabeçalho", "Nome da 3ª coluna", ...],
  "linhas": [
    { "Data": "DD/MM/AAAA", "Nome da 2ª coluna": número ou null, "Nome da 3ª coluna": número ou null, ... }
  ],
  "observacoes": "1-2 frases em português caso haja ambiguidade, colunas que não ficaram claras, ou linhas de total/acumulado que você excluiu"
}

Regras:
- "Data" é sempre a primeira coluna e é obrigatória em toda linha — nunca null.
- Cada chave dentro de "colunas" deve aparecer, com o mesmo nome exato, em toda linha de "linhas" (use null quando aquela linha não tiver valor naquela coluna).
- NÃO inclua a linha de "Total"/"Acumulado do Mês" como uma linha de movimentação — ela é só a soma; mencione isso em "observacoes" se houver.
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 3994.10). Células vazias na tabela original viram null.
- Preserve os nomes de coluna exatamente como aparecem no documento (incluindo acentos), pois eles serão usados depois para o usuário mapear cada coluna para uma conta contábil.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { texto, imagens } = await req.json();

    const temTexto = typeof texto === 'string' && texto.trim().length >= 20;
    const temImagens = Array.isArray(imagens) && imagens.length > 0;

    if (temImagens && !temTexto) {
      return new Response(JSON.stringify({ error: 'Este PDF parece ser uma imagem escaneada (sem texto selecionável). A leitura por imagem ainda não está disponível — avise o Kleydson.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!temTexto) {
      return new Response(JSON.stringify({ error: 'Texto do extrato vazio ou muito curto.' }), {
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

    const textoLimitado = (texto as string).slice(0, 24000);
    const messages = [{ role: 'user', content: PROMPT + '\n\nTexto extraído do PDF:\n\n"""\n' + textoLimitado + '\n"""' }];

    const aiResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: GROQ_MODEL_TEXTO,
        messages,
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

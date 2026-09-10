// Edge Function: extração genérica da tabela de movimentação de um extrato de
// aplicação financeira via IA — não assume nenhum banco/modelo específico,
// extrai as colunas e linhas exatamente como aparecem no extrato.
// Usada pelo Conversor de Aplicações Financeiras em index.html quando o
// parser fixo (Invest Fácil Bradesco) não reconhece o modelo do PDF, e
// também pela importação em massa de Aplicações/Resgates via PDF na aba
// "Aplicações Financeiras" do módulo Lançamentos Contábeis (Fase 14).
//
// Aceita `texto` (via pdfjsLib no client) OU `imagens` (array de data URIs
// base64, usado quando o PDF é uma imagem escaneada sem texto selecionável).
//
// Usa SEMPRE Gemini (chave paga) — pedido do usuário 08/09/2026: nenhum
// campo do site deve depender do Groq (free-tier com rate limit agressivo).
// BUG CORRIGIDO 08/09/2026: esta function ficou com um `extrairViaGroq`
// nunca definido (ReferenceError → sempre HTTP 500 pra PDF com texto
// selecionável, o caso mais comum) — sobrou de uma migração incompleta
// Groq→Gemini numa sessão anterior. Reescrita seguindo o mesmo padrão já
// usado em lancctb-parse-extrato (texto E imagens via Gemini).
//
// Deploy: Supabase Dashboard → Edge Functions → Deploy a new function → Via
// Editor → nome "convaplicfin-extrair-tabela" → colar este código → Deploy.
// Secrets: GEMINI_API_KEY (já configurada no projeto).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-3.6-flash';

const PROMPT = `Você é um assistente de um escritório de contabilidade brasileiro, extraindo a tabela de movimentação de um extrato de aplicação financeira (PDF de banco — Bradesco, Itaú, Safra, etc., cada um com um layout de colunas diferente) para conciliação bancária. Extraia a tabela EXATAMENTE como aparece no documento, sem tentar adivinhar ou normalizar o significado de cada coluna — isso é feito depois, pelo usuário, mapeando cada coluna manualmente.

Responda SOMENTE com um JSON válido, exatamente neste formato:

{
  "colunas": ["nome da 1ª coluna", "nome da 2ª coluna", "..."],
  "linhas": [
    { "_secao": "nome da seção/tabela de onde essa linha veio", "nome da 1ª coluna": "valor", "nome da 2ª coluna": "valor", "...": "..." }
  ],
  "observacoes": "1-2 frases em português caso haja ambiguidade, seções que não ficaram claras, ou linhas de total que você excluiu"
}

Regras:
- "Data" é sempre a primeira coluna e é obrigatória em toda linha — nunca null. Se o documento tiver mais de uma coluna de data (ex: "Dt. Aplicação", "Dt. Vencto", "Dt. Resgate"), inclua TODAS como colunas separadas, na ordem em que aparecem — a primeira coluna do JSON continua sendo a que representa a data efetiva daquele movimento (data da aplicação numa linha de aplicação; data do resgate numa linha de resgate).
- Cada chave dentro de "colunas" deve aparecer, com o mesmo nome exato, em toda linha de "linhas" (use null quando aquela linha não tiver valor naquela coluna).
- "_secao" é OBRIGATÓRIO em toda linha e identifica de qual seção/tabela do documento ela veio (ex: "Aplicações", "Resgates / Vencimentos", "Resgates Antecipados/Vencimentos"). Use o texto do cabeçalho da seção como aparece no documento. Isso é essencial: quando o documento tem mais de uma seção com as MESMAS colunas (ex: "Vlr Princ. (R$)" aparece tanto em "Aplicações" quanto em "Resgates/Vencimentos", mas significa "quanto foi aplicado" numa e "quanto foi resgatado" na outra), o "_secao" é o que permite ao usuário mapear cada coluna corretamente por seção depois — sem ele, colunas com o mesmo nome de seções diferentes ficam ambíguas e a coluna deixa de fazer sentido.
- Se o documento tiver mais de uma seção/tabela (ex: "Aplicações" e "Resgates/Vencimentos", cada uma com colunas diferentes), combine tudo numa única lista de "linhas" usando a UNIÃO de todas as colunas encontradas em qualquer seção — uma linha de "Aplicações" só preenche as colunas daquela seção e usa null nas colunas exclusivas de "Resgates/Vencimentos", e vice-versa.
- NÃO inclua a linha de "Total"/"Acumulado do Mês"/"Saldo Anterior" como uma linha de movimentação — ela é só a soma ou o saldo de abertura; mencione isso em "observacoes" se houver.
- Valores monetários sempre em número puro (sem "R$", sem separador de milhar, com ponto decimal — ex: 3994.10). Células vazias na tabela original viram null.
- Preserve os nomes de coluna exatamente como aparecem no documento (incluindo acentos e abreviações, ex: "Vlr Princ. (R$)", "Dt. Resgate / Carência"), pois eles serão usados depois para o usuário mapear cada coluna manualmente.
- CUIDADO com cabeçalhos de coluna colados um no outro no texto extraído (comum quando o PDF não preserva espaçamento visual — ex: o texto pode vir como "Principal Resgate Rendimento IOF IR Crédito" sem separador nenhum entre as palavras). Extratos de aplicação financeira em português SEMPRE têm essas colunas como conceitos DISTINTOS, cada uma com seu próprio valor numérico por linha — nunca junte duas dessas palavras numa coluna só: "Principal", "Resgate", "Rendimento", "IOF", "IR"/"IRRF", "Crédito", "Líquido", "Bruto", "Taxa". Se o cabeçalho parecer ambíguo, use a CONTAGEM DE VALORES NUMÉRICOS em cada linha de dados como guia: se uma linha tem 6 números depois da Taxa, e você só nomeou 5 colunas de valor, falta separar um cabeçalho colado — errar juntando duas colunas é pior que arriscar separá-las, porque perde um valor real (ex: "Principal Resgate" errado juntaria dois valores diferentes, "1480,50" do Principal e "1480,84" do Resgate, descartando um deles).`;

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
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
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

async function extrairViaGeminiImagens(imagens: string[]): Promise<unknown> {
  // No máximo 5 imagens por request — mais que suficiente pra um extrato de
  // aplicação financeira (raramente passa de 1-2 páginas).
  const imgs = imagens.slice(0, 5);
  const parts: unknown[] = [{ text: PROMPT }];
  for (const img of imgs) {
    // Evita regex com barra escapada aqui de propósito (já causou um bug
    // real de transmissão via browser automation ao colar o código no
    // editor do Supabase — a barra escapada \/ virava / sem querer,
    // quebrando o regex e derrubando o deploy). Parse manual, mais robusto.
    if (!img.startsWith('data:')) continue;
    const idxBase64 = img.indexOf(';base64,');
    if (idxBase64 < 0) continue;
    const mimeType = img.slice('data:'.length, idxBase64);
    const data = img.slice(idxBase64 + ';base64,'.length);
    if (!mimeType || !data) continue;
    parts.push({ inlineData: { mimeType, data } });
  }
  return chamarGemini(parts);
}

async function extrairViaGeminiTexto(texto: string): Promise<unknown> {
  const textoLimitado = texto.slice(0, 400000);
  return chamarGemini([{ text: PROMPT + '\n\nTexto extraído do PDF:\n\n"""\n' + textoLimitado + '\n"""' }]);
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

    const dados = temImagens ? await extrairViaGeminiImagens(imagens) : await extrairViaGeminiTexto(texto);

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

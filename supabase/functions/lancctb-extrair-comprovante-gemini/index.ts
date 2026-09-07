import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Apenas POST", { status: 405 });
  }

  try {
    const { pdfPages } = await req.json();

    if (!pdfPages || !Array.isArray(pdfPages)) {
      return new Response(
        JSON.stringify({ error: "pdfPages deve ser um array de imagens base64" }),
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY não configurada" }),
        { status: 500 }
      );
    }

    const comprovantes: any[] = [];

    // Processa cada página
    for (let i = 0; i < pdfPages.length; i++) {
      const pageBase64 = pdfPages[i];

      const prompt = `Analise este comprovante bancário/financeiro e extraia os dados estruturados.

IMPORTANTE: Retorne EXATAMENTE em JSON, sem markdown ou explicações.

Procure pelos campos:
- data_pagamento: data no formato YYYY-MM-DD (procure por "Data", "Dt", "Data da Operação", etc)
- cliente_fornecedor_nome: nome do beneficiário/recebedor/pagador
- cnpj_cpf: CPF ou CNPJ (ex: 123.456.789-00 ou 12.345.678/0001-90)
- valor_pago: valor em número (ex: 1000.50, sem R$)
- observacao: tipo de operação, descrição breve

Se não encontrar um campo, deixe vazio ("").
Se encontrar múltiplos comprovantes na mesma imagem, retorne um array.
Se não houver dados válidos, retorne null.

Formato esperado:
{
  "data_pagamento": "2026-07-06",
  "cliente_fornecedor_nome": "NOME DO BENEFICIÁRIO",
  "cnpj_cpf": "12.345.678/0001-90",
  "valor_pago": 1000.50,
  "observacao": "PIX Transferência"
}

RETORNE APENAS O JSON, NADA MAIS.`;

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
          GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: pageBase64,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        console.error(
          "Gemini error:",
          response.status,
          await response.text()
        );
        continue;
      }

      const result = await response.json();
      const text =
        result.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!text) continue;

      try {
        // Tenta parsear como JSON direto
        let data = JSON.parse(text);

        // Se for array (múltiplos comprovantes na página)
        if (Array.isArray(data)) {
          comprovantes.push(...data.filter((c) => c && c.valor_pago > 0));
        } else if (data && data.valor_pago > 0) {
          // Se for objeto único
          comprovantes.push(data);
        }
      } catch (e) {
        // Tenta extrair JSON do texto se houver markdown
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[0]);
            if (Array.isArray(data)) {
              comprovantes.push(...data.filter((c) => c && c.valor_pago > 0));
            } else if (data && data.valor_pago > 0) {
              comprovantes.push(data);
            }
          } catch (e2) {
            console.error("Erro ao parsear JSON da página", i, e2);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: comprovantes.length > 0,
        total: comprovantes.length,
        comprovantes,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500 }
    );
  }
});

-- Regra por Histórico + Valor (pedido do usuário 08/09/2026): "queremos tbm
-- poder criar regra com histórico contém + valor. então sempre que tiver um
-- histórico e o mesmo valor a gente determina como irá contabilizar" — uma
-- Regra do tipo 'historico' pode opcionalmente exigir também que o valor do
-- lançamento bata (dentro da tolerância padrão do matching), permitindo
-- várias regras com o MESMO texto de histórico genérico (ex: "Sispag
-- Fornecedores") indo pra contas diferentes conforme o valor.
ALTER TABLE public.regras_matching
  ADD COLUMN IF NOT EXISTS valor_gatilho NUMERIC(15,2);

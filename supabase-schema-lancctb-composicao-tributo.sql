-- Lançamentos Contábeis — "Processar Tributos": guarda a composição por
-- imposto (código/denominação/valor) direto na linha de lancamentos_extrato,
-- em vez de fragmentar o extrato em N linhas separadas (achado real
-- 22/09/2026, INSS CLD cód. 1099+1138: "ficou separado, deveria ser um
-- crédito para vários débitos" — a divisão antiga criava N créditos
-- bancários independentes em vez de 1 crédito : N débitos).
ALTER TABLE public.lancamentos_extrato
  ADD COLUMN IF NOT EXISTS composicao_tributo JSONB;

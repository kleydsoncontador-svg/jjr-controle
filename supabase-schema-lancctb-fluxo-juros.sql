-- Fluxo de Caixa: juros, desconto/abatimento e multa PAGOS por linha (pedido do usuário 16/10/2026, Kajuna).
-- Só ADICIONA colunas (não apaga nem altera nada que já existe); linhas antigas ficam com 0.
ALTER TABLE public.fluxo_caixa_lancamentos ADD COLUMN IF NOT EXISTS valor_juros    NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.fluxo_caixa_lancamentos ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.fluxo_caixa_lancamentos ADD COLUMN IF NOT EXISTS valor_multa    NUMERIC(15,2) NOT NULL DEFAULT 0;

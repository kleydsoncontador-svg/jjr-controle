-- ═══════════════════════════════════════════════════════════════
-- Adição de novos campos a comprovantes_recebimento
-- Para capturar TODAS as colunas do Extrato de Cobrança (recebimentos)
-- ═══════════════════════════════════════════════════════════════

-- Adicionar coluna carteira (identificador da carteira de cobrança)
ALTER TABLE public.comprovantes_recebimento
  ADD COLUMN IF NOT EXISTS carteira TEXT;

-- Adicionar coluna nosso_numero (número do boleto no banco)
ALTER TABLE public.comprovantes_recebimento
  ADD COLUMN IF NOT EXISTS nosso_numero TEXT;

-- Adicionar coluna agencia_receptora (agência recebedora do banco)
ALTER TABLE public.comprovantes_recebimento
  ADD COLUMN IF NOT EXISTS agencia_receptora TEXT;

-- Adicionar coluna tipo_operacao (liquidação, tarifa_cobranca, juros, multa, desconto, outro)
ALTER TABLE public.comprovantes_recebimento
  ADD COLUMN IF NOT EXISTS tipo_operacao TEXT
    CHECK (tipo_operacao IS NULL OR tipo_operacao IN ('liquidacao','tarifa_cobranca','juros','multa','desconto','outro'));

-- Adicionar coluna numero_parcela (para separar múltiplas operações do mesmo boleto)
ALTER TABLE public.comprovantes_recebimento
  ADD COLUMN IF NOT EXISTS numero_parcela SMALLINT DEFAULT 1;

-- Criar índice para facilitar busca por operação
CREATE INDEX IF NOT EXISTS idx_comprov_receb_tipo_operacao
  ON public.comprovantes_recebimento (empresa_eid, tipo_operacao);

-- Criar índice para facilitar busca por agência receptora
CREATE INDEX IF NOT EXISTS idx_comprov_receb_agencia
  ON public.comprovantes_recebimento (empresa_eid, agencia_receptora);

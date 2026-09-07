-- ═══════════════════════════════════════════════════════════════
-- Adição de novos campos a comprovantes_bancarios
-- Para extrair TODAS as informações do PDF (parcela, agência, tipo de operação)
-- ═══════════════════════════════════════════════════════════════

-- Adicionar coluna numero_parcela (para pagamentos em parcelas do mesmo cliente)
ALTER TABLE public.comprovantes_bancarios
  ADD COLUMN IF NOT EXISTS numero_parcela SMALLINT DEFAULT 1;

-- Adicionar coluna agencia_recebedora (agência recebedora do banco)
ALTER TABLE public.comprovantes_bancarios
  ADD COLUMN IF NOT EXISTS agencia_recebedora TEXT;

-- Adicionar coluna tipo_operacao (liquidação, tarifa, juros, multa, desconto, outro)
ALTER TABLE public.comprovantes_bancarios
  ADD COLUMN IF NOT EXISTS tipo_operacao TEXT DEFAULT 'liquidacao'
    CHECK (tipo_operacao IN ('liquidacao','tarifa_cobranca','juros','multa','desconto','outro'));

-- Criar índice para facilitar busca por operação
CREATE INDEX IF NOT EXISTS idx_comprov_tipo_operacao
  ON public.comprovantes_bancarios (empresa_eid, tipo_operacao);

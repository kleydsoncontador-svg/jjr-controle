-- ═══════════════════════════════════════════════════════════════
-- Adiciona natureza_operacao (texto livre do <natOp> do XML — "VENDA DE
-- MERCADORIA", "DEVOLUCAO DE COMPRA", "REMESSA PARA CONSERTO" etc.) em
-- notas_fiscais. Pedido do usuário 12/09/2026: mostrar essa coluna em
-- NF-e Entrada/Saída e poder filtrar/excluir do matching automático tudo
-- que não for compra/venda/devolução (remessa, transferência, bonificação,
-- amostra grátis etc. nunca geram pagamento nem recebimento de verdade).
--
-- Sem exclusão física nenhuma — a classificação (_lancctbNaturezaEhFinanceira,
-- index.html) só controla exibição/filtro/candidatura ao matching; a NF
-- continua salva e visível via filtro "Outras", nunca perdida.
--
-- ✅ EXECUTADO no Supabase em 12/09/2026.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS natureza_operacao TEXT;

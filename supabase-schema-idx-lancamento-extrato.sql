-- ═══════════════════════════════════════════════════════════════════════════
-- Índices faltando em lancamento_extrato_id — achado real 29/09/2026 (Kazangil,
-- "AINDA COM PROBLEMA PRA EXCLUIR EXTRATOS GRANDES").
--
-- Nenhuma das tabelas com FK pra lancamentos_extrato(id) tinha índice na coluna
-- lancamento_extrato_id. Ao apagar em lote de lancamentos_extrato, o Postgres
-- precisa verificar, PRA CADA LINHA apagada, se alguma linha dessas tabelas
-- ainda referencia ela — sem índice, isso é uma varredura sequencial da tabela
-- INTEIRA (compartilhada entre ~100 empresas) por linha apagada, e travava com
-- "canceling statement due to statement timeout" (57014) em contas com
-- extratos grandes (Kazangil: 223 lançamentos de 1 mês).
--
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_nfp_lancamento_extrato ON public.notas_fiscais_parcelas (lancamento_extrato_id);
CREATE INDEX IF NOT EXISTS idx_comprov_pag_lancamento_extrato ON public.comprovantes_bancarios (lancamento_extrato_id);
CREATE INDEX IF NOT EXISTS idx_comprov_receb_lancamento_extrato ON public.comprovantes_recebimento (lancamento_extrato_id);
CREATE INDEX IF NOT EXISTS idx_comprov_sal_lancamento_extrato ON public.comprovantes_salarios (lancamento_extrato_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_lancamento_extrato ON public.fluxo_caixa_lancamentos (lancamento_extrato_id);
CREATE INDEX IF NOT EXISTS idx_aplicfin_mov_lancamento_extrato ON public.aplicacoes_financeiras_movimentos (lancamento_extrato_id);
CREATE INDEX IF NOT EXISTS idx_lanc_ctb_lancamento_extrato ON public.lancamentos_contabeis (lancamento_extrato_id);

ANALYZE public.notas_fiscais_parcelas;
ANALYZE public.comprovantes_bancarios;
ANALYZE public.comprovantes_recebimento;
ANALYZE public.comprovantes_salarios;
ANALYZE public.fluxo_caixa_lancamentos;
ANALYZE public.aplicacoes_financeiras_movimentos;
ANALYZE public.lancamentos_contabeis;

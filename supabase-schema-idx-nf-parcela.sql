-- ═══════════════════════════════════════════════════════════════════════════
-- Índice faltando em lancamentos_contabeis.nf_parcela_id — achado real
-- 01/10/2026 (exclusão em massa de NF da Rufato, igual ao achado de
-- lancamento_extrato_id em 29/09/2026): sem índice, apagar linhas de
-- notas_fiscais_parcelas força o Postgres a varrer lancamentos_contabeis
-- INTEIRA (132 mil linhas, compartilhada entre ~100 empresas) pra cada linha
-- apagada, travando com "canceling statement due to statement timeout".
--
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_lanc_ctb_nf_parcela ON public.lancamentos_contabeis (nf_parcela_id);

ANALYZE public.lancamentos_contabeis;

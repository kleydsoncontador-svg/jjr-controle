-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fluxo de Caixa — Adicionar colunas
-- Número, Parcela, Unidade e PORT_NOM para melhor rastreamento
-- do documento/negócio no Excel do cliente.
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.fluxo_caixa_lancamentos ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.fluxo_caixa_lancamentos ADD COLUMN IF NOT EXISTS parcela INT;
ALTER TABLE public.fluxo_caixa_lancamentos ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE public.fluxo_caixa_lancamentos ADD COLUMN IF NOT EXISTS port_nom TEXT;

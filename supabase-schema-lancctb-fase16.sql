-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 16 (vínculo de Comprovantes de
-- Pagamento com o Visão Geral). Execute no SQL Editor do Supabase.
--
-- Mesmo mecanismo já usado em Agência Bancária (Extrato) e Aplicações
-- Financeiras (Fase 13) — cada conta pode ter um item do checklist
-- "Documentação Recebida" do Visão Geral vinculado, mas agora um vínculo
-- PRÓPRIO pra Comprovantes de Pagamento (documento diferente do Extrato,
-- então precisa de campo separado — reaproveitar doc_visao_geral_nome
-- marcaria o item errado quando só o comprovante chegou, sem o extrato).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agencias_bancarias ADD COLUMN IF NOT EXISTS doc_visao_geral_comprovantes_nome TEXT;

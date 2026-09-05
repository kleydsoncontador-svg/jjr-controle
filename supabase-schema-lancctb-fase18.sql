-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 18 (vínculo de Fluxo de Caixa com o
-- Visão Geral + seletor direto nas telas de Extrato Bancário e Fluxo de
-- Caixa). Execute no SQL Editor do Supabase.
--
-- Pedido do usuário (05/09/2026): o campo "Vincular X ao item do Visão
-- Geral" que já existe em Comprovantes de Pagamento (Fase 16) deve
-- aparecer também nas telas de Extrato Bancário e Fluxo de Caixa (mas não
-- em Notas Fiscais, Regras, Agência Bancária ou Plano de Contas).
--
-- Extrato Bancário reaproveita o campo já existente
-- agencias_bancarias.doc_visao_geral_nome (Fase 13) — só ganha o seletor
-- direto na tela, sem precisar ir em Agência Bancária editar. Fluxo de
-- Caixa precisa de campo PRÓPRIO (documento diferente).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.agencias_bancarias ADD COLUMN IF NOT EXISTS doc_visao_geral_fluxo_nome TEXT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 14 (Processar via IA no Registro
-- Contábil). Execute no SQL Editor do Supabase depois das fases anteriores.
--
-- Contexto: novo botão "🤖 Processar via IA" no Registro Contábil — último
-- recurso de conciliação, só depois que Comprovantes, Comprovantes de
-- Recebimento, Tributos e Notas Fiscais (matching determinístico) já
-- rodaram e ainda sobrou pendência. A IA (Groq/Gemini, mesmo padrão já
-- usado no módulo) só amarra Pagamento/Recebimento × Nota Fiscal, nunca
-- decide sozinha sem deixar rastro: toda vez que ela escolhe uma NF, grava
-- uma explicação curta do porquê em informacao_extra (coluna que já existe
-- no schema original, nunca usada até agora) — aparece numa coluna extra no
-- Registro Contábil pro contador conferir/desfazer se achar que errou.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.lancamentos_contabeis DROP CONSTRAINT IF EXISTS lancamentos_contabeis_origem_match_check;
ALTER TABLE public.lancamentos_contabeis ADD CONSTRAINT lancamentos_contabeis_origem_match_check
  CHECK (origem_match IN ('automatico_triangular','regra','manual','ia'));

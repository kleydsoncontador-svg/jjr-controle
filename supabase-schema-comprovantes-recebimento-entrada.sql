-- ═══════════════════════════════════════════════════════════════
-- Adiciona 'entrada' ao enum de tipo_operacao em comprovantes_recebimento —
-- o parser Itaú (_lancctbNormalizarTipoOperacaoItau) e a tela (OP_LABEL,
-- index.html) já reconheciam esse tipo, mas a constraint do banco nunca
-- foi atualizada pra aceitá-lo — todo comprovante de recebimento cujo tipo
-- de operação continha "entrada" quebrava o insert em lote inteiro com
-- "violates check constraint comprovantes_recebimento_tipo_operacao_check"
-- (achado real 11/09/2026, upload de 5379 comprovantes). Execute no SQL
-- Editor do Supabase.
--
-- ✅ EXECUTADO no Supabase em 11/09/2026.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.comprovantes_recebimento
  DROP CONSTRAINT IF EXISTS comprovantes_recebimento_tipo_operacao_check;

ALTER TABLE public.comprovantes_recebimento
  ADD CONSTRAINT comprovantes_recebimento_tipo_operacao_check
    CHECK (tipo_operacao IS NULL OR tipo_operacao IN ('valor_boleto','liquidacao','tarifa_cobranca','juros','multa','desconto','entrada','outro'));

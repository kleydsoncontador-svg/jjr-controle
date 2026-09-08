-- ═══════════════════════════════════════════════════════════════
-- Adiciona 'valor_boleto' ao enum de tipo_operacao em
-- comprovantes_recebimento — nova linha pedida pelo usuário pra mostrar
-- o valor bruto/de face do boleto, além de liquidação e tarifa/juros/etc.
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.comprovantes_recebimento
  DROP CONSTRAINT IF EXISTS comprovantes_recebimento_tipo_operacao_check;

ALTER TABLE public.comprovantes_recebimento
  ADD CONSTRAINT comprovantes_recebimento_tipo_operacao_check
    CHECK (tipo_operacao IS NULL OR tipo_operacao IN ('valor_boleto','liquidacao','tarifa_cobranca','juros','multa','desconto','outro'));

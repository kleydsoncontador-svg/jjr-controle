-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 18 (Fusão de "Comprovantes de
-- Pagamentos de Salários" dentro de "Comprovantes de Pagamentos").
--
-- Pedido do usuário (10/09/2026): "ah, acho melhor unificar comprovantes de
-- pagamentos e comprovantes de pagamentos de salários, fica só comprovantes
-- de pagamentos, pois vou ler os dois por lá" — confirmado como fusão total
-- (migrar os dados pra 1 tabela só, não só unificar a tela de upload).
--
-- comprovantes_salarios (Fase 17) tem EXATAMENTE as mesmas colunas de
-- comprovantes_bancarios (mesmo desenho de tabela, só nome diferente) —
-- migração é 1:1, sem transformação de dado nenhuma.
--
-- Execute no SQL Editor do Supabase, DEPOIS de já ter feito o deploy do
-- index.html que remove a aba/botão de Salários (senão nada mais escreve
-- em comprovantes_salarios, mas o que já tinha lá seguiria invisível).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.comprovantes_bancarios
  (empresa_eid, conta_bancaria_id, data_pagamento, cliente_fornecedor_nome,
   cnpj_cpf, documento_numero, data_vencimento, valor_documento, valor_pago,
   juros, multa, desconto, observacao, arquivo_storage_path,
   status_conciliacao, lancamento_extrato_id, created_at, updated_at)
SELECT
   empresa_eid, conta_bancaria_id, data_pagamento, cliente_fornecedor_nome,
   cnpj_cpf, documento_numero, data_vencimento, valor_documento, valor_pago,
   juros, multa, desconto,
   -- marca a origem no campo observacao pra não perder o rastro de que veio
   -- do lote de Salários (auditoria) — não interfere em nada da conciliação
   CASE WHEN observacao IS NULL OR observacao = '' THEN '[ex-Comprovante de Salários]'
        ELSE observacao || ' [ex-Comprovante de Salários]' END,
   arquivo_storage_path, status_conciliacao, lancamento_extrato_id,
   created_at, updated_at
FROM public.comprovantes_salarios;

-- NADA é apagado aqui de propósito (regra do projeto: nunca perder dado do
-- usuário). A tabela public.comprovantes_salarios e o bucket de Storage
-- "comprovantes-salarios" continuam existindo intactos como backup —
-- confira o SELECT abaixo batendo a mesma contagem antes de considerar a
-- migração concluída, e só então avalie (com o usuário, não sozinho) se um
-- dia vale a pena arquivar/dropar o que ficou para trás.

-- Conferência pós-migração (rode os dois e compare as contagens):
-- SELECT count(*) FROM public.comprovantes_salarios;
-- SELECT count(*) FROM public.comprovantes_bancarios WHERE observacao ILIKE '%ex-Comprovante de Salários%';

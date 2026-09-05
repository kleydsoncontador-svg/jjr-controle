-- ═══════════════════════════════════════════════════════════════════════════
-- Correção de dados: lançamentos gerados com a NF do lado errado (bug real
-- encontrado pelo usuário 05/09/2026, Fast Lube — código já corrigido no
-- index.html). Causa: quando uma saída bancária tinha histórico genérico
-- (ex.: "Tar/Custas Cobrança", "Sispag Salários") e por isso não achava um
-- Comprovante pra ancorar o CNPJ, o motor de matching (passo "Notas
-- Fiscais") comparava só VALOR+DATA contra TODAS as parcelas pendentes,
-- sem checar se a nota era de COMPRA ou de VENDA — podia casar por
-- coincidência contra uma nota de VENDA da própria empresa, virando um
-- "Pagamento a [nome da própria empresa]" sem sentido nenhum.
--
-- Rode em 2 passos, NESTA ORDEM:
--   1) O SELECT abaixo (diagnóstico) — confira a lista antes de desfazer.
--   2) O bloco DO (desfazer) — só depois de confirmar a lista do passo 1.
--
-- Ajuste o empresa_eid e a lista de CNPJs/nome pra outra empresa se precisar
-- rodar isso em algum outro cliente também afetado.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── PASSO 1: diagnóstico (só leitura, roda e confere a lista) ────────────
SELECT id, lote_id, data, tipo, valor, historico, cliente_fornecedor_nome,
       cnpj_cpf, lancamento_extrato_id, regra_matching_id, origem_match
FROM public.lancamentos_contabeis
WHERE empresa_eid = '163'
  AND estornado = false
  AND origem_match IN ('automatico_triangular','ia')
  AND (
    upper(cliente_fornecedor_nome) LIKE '%FAST LUBE%'
    OR cnpj_cpf IN ('71810931000101','71810931000365','71810931000446')
  )
ORDER BY data;

-- ─── PASSO 2: desfazer (SÓ depois de conferir a lista acima) ──────────────
-- Estorna o lote inteiro (as 2 linhas, D e C), devolve o lançamento do
-- extrato pra "pendente" (aparece de novo no Registro Contábil, pronto pra
-- reprocessar com o código já corrigido) e devolve a parcela de NF usada
-- indevidamente pra "pendente" também, desvinculando do extrato errado.
DO $$
DECLARE
  v_lote UUID;
  v_extrato_id BIGINT;
BEGIN
  FOR v_lote, v_extrato_id IN
    SELECT DISTINCT lote_id, lancamento_extrato_id
    FROM public.lancamentos_contabeis
    WHERE empresa_eid = '163'
      AND estornado = false
      AND origem_match IN ('automatico_triangular','ia')
      AND (
        upper(cliente_fornecedor_nome) LIKE '%FAST LUBE%'
        OR cnpj_cpf IN ('71810931000101','71810931000365','71810931000446')
      )
  LOOP
    UPDATE public.lancamentos_contabeis SET estornado = true WHERE lote_id = v_lote;
    IF v_extrato_id IS NOT NULL THEN
      UPDATE public.lancamentos_extrato SET status_conciliacao = 'pendente' WHERE id = v_extrato_id;
      UPDATE public.notas_fiscais_parcelas SET status_conciliacao = 'pendente', lancamento_extrato_id = NULL WHERE lancamento_extrato_id = v_extrato_id;
    END IF;
  END LOOP;
END $$;

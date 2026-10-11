-- Gravação em LOTE do matching (Registro Contábil): grava N lançamentos de uma vez, no servidor.
-- Cada item faz exatamente o que o navegador fazia em 2 a 4 chamadas separadas:
--   1) criar_lancamento_partida_dobrada(linhas)  (confere débito = crédito)
--   2) lancamentos_extrato.status_conciliacao = 'conciliado'
--   3) comprovante (pagamentos/recebimentos) -> 'conciliado' + lancamento_extrato_id   (opcional)
--   4) fluxo_caixa_lancamentos -> 'associado' + lancamento_extrato_id                  (opcional)
-- Cada item roda no seu próprio sub-bloco: se um falhar, os outros seguem e o resultado informa qual falhou e por quê.
-- É IDEMPOTENTE: se o extrato já tem lançamento contábil ativo (não estornado), NÃO cria outro — só garante o status.
-- Assim, repetir a chamada (queda de rede, clique duplo) nunca duplica lançamento.
-- SECURITY INVOKER (padrão): respeita o RLS do usuário logado, igual às chamadas diretas de hoje.

CREATE OR REPLACE FUNCTION public.criar_lancamentos_partida_dobrada_lote(itens JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_item   JSONB;
  v_idx    INT := 0;
  v_res    JSONB := '[]'::jsonb;
  v_lote   UUID;
  v_extr   BIGINT;
  v_comp   BIGINT;
  v_fluxo  BIGINT;
  v_ja     BOOLEAN;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(itens) LOOP
    v_idx := v_idx + 1;
    BEGIN
      v_extr  := NULLIF(v_item->>'extrato_id','')::BIGINT;
      v_comp  := NULLIF(v_item->>'comprovante_id','')::BIGINT;
      v_fluxo := NULLIF(v_item->>'fluxo_id','')::BIGINT;
      v_lote  := NULL;
      v_ja    := FALSE;

      IF v_extr IS NOT NULL THEN
        SELECT EXISTS (SELECT 1 FROM public.lancamentos_contabeis
                        WHERE lancamento_extrato_id = v_extr AND estornado = FALSE) INTO v_ja;
      END IF;

      IF NOT v_ja THEN
        v_lote := public.criar_lancamento_partida_dobrada(v_item->'linhas');
      END IF;

      IF v_extr IS NOT NULL THEN
        UPDATE public.lancamentos_extrato SET status_conciliacao = 'conciliado' WHERE id = v_extr;
      END IF;

      IF v_comp IS NOT NULL THEN
        IF v_item->>'comprovante_tabela' = 'comprovantes_recebimento' THEN
          UPDATE public.comprovantes_recebimento
             SET status_conciliacao = 'conciliado', lancamento_extrato_id = v_extr WHERE id = v_comp;
        ELSIF v_item->>'comprovante_tabela' = 'comprovantes_bancarios' THEN
          UPDATE public.comprovantes_bancarios
             SET status_conciliacao = 'conciliado', lancamento_extrato_id = v_extr WHERE id = v_comp;
        END IF;
      END IF;

      IF v_fluxo IS NOT NULL THEN
        UPDATE public.fluxo_caixa_lancamentos
           SET status_associado = 'associado', lancamento_extrato_id = v_extr WHERE id = v_fluxo;
      END IF;

      v_res := v_res || jsonb_build_array(jsonb_build_object('idx', v_idx, 'ok', TRUE, 'lote', v_lote, 'ja_existia', v_ja));
    EXCEPTION WHEN OTHERS THEN
      v_res := v_res || jsonb_build_array(jsonb_build_object('idx', v_idx, 'ok', FALSE, 'erro', SQLERRM));
    END;
  END LOOP;
  RETURN v_res;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 17 (Comprovantes Bancários de
-- Pagamentos de Salários). Execute no SQL Editor do Supabase.
--
-- Contexto (usuário, 05/09/2026): alguns clientes mandam o comprovante do
-- lote SISPAG SALÁRIOS (pagamento de folha em lote, cobrindo vários
-- funcionários de uma vez) só pra a JJR ver que o pagamento saiu — mesmo
-- espírito de Comprovantes de Pagamento, mas um documento DIFERENTE
-- (batch de folha, não 1 fornecedor único), por isso tabela e bucket
-- próprios — mesmo padrão já usado pra separar Comprovantes de
-- Recebimento de Comprovantes de Pagamento.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.comprovantes_salarios (
  id                      BIGSERIAL PRIMARY KEY,
  empresa_eid             TEXT NOT NULL,
  conta_bancaria_id       BIGINT REFERENCES public.agencias_bancarias(id),
  data_pagamento          DATE NOT NULL,
  cliente_fornecedor_nome TEXT, -- nome do funcionário, quando o lote detalha por pessoa
  cnpj_cpf                TEXT, -- CPF do funcionário, quando disponível
  documento_numero        TEXT,
  data_vencimento         DATE,
  valor_documento         NUMERIC(15,2),
  valor_pago              NUMERIC(15,2) NOT NULL,
  juros                   NUMERIC(15,2) NOT NULL DEFAULT 0,
  multa                   NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto                NUMERIC(15,2) NOT NULL DEFAULT 0,
  observacao              TEXT,
  arquivo_storage_path    TEXT,
  status_conciliacao      TEXT NOT NULL DEFAULT 'pendente'
                           CHECK (status_conciliacao IN ('pendente','conciliado','ignorado')),
  lancamento_extrato_id   BIGINT REFERENCES public.lancamentos_extrato(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comprov_salarios_empresa_data_status
  ON public.comprovantes_salarios (empresa_eid, data_pagamento, status_conciliacao);
CREATE INDEX IF NOT EXISTS idx_comprov_salarios_cnpj ON public.comprovantes_salarios (empresa_eid, cnpj_cpf);

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_comprovantes_salarios_updated_at ON public.comprovantes_salarios;
  CREATE TRIGGER trg_comprovantes_salarios_updated_at BEFORE UPDATE ON public.comprovantes_salarios
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END $$;

ALTER TABLE public.comprovantes_salarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all ON public.comprovantes_salarios;
CREATE POLICY auth_all ON public.comprovantes_salarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage bucket novo — criar manualmente no Supabase Dashboard → Storage:
--   comprovantes-salarios  (privado)
-- Depois rode o bloco de policies abaixo.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS comprov_salarios_insert_auth ON storage.objects;
CREATE POLICY comprov_salarios_insert_auth ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes-salarios');

DROP POLICY IF EXISTS comprov_salarios_select_auth ON storage.objects;
CREATE POLICY comprov_salarios_select_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes-salarios');

DROP POLICY IF EXISTS comprov_salarios_delete_auth ON storage.objects;
CREATE POLICY comprov_salarios_delete_auth ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes-salarios');

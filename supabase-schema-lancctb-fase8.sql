-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 8 (Fluxo de Caixa, Comprovantes de
-- Recebimento, Regra multi-linha). Execute no SQL Editor do Supabase DEPOIS
-- de supabase-schema-lancctb.sql (reaproveita agencias_bancarias,
-- lancamentos_extrato, plano_contas, regras_matching e
-- public.set_updated_at() já existentes).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── comprovantes_recebimento: espelha comprovantes_bancarios, mas pro lado
-- de vendas/recebimentos — aba própria "Comprovantes de Recebimento",
-- separada de "Comprovantes" (que passa a ser entendida implicitamente
-- como "de Pagamento"). Roda ANTES do Fluxo de Caixa na ordem de resolução
-- do matching (mesmo grau de prioridade que Comprovantes de Pagamento). ──
CREATE TABLE IF NOT EXISTS public.comprovantes_recebimento (
  id                      BIGSERIAL PRIMARY KEY,
  empresa_eid             TEXT NOT NULL,
  conta_bancaria_id       BIGINT REFERENCES public.agencias_bancarias(id),
  data_pagamento          DATE NOT NULL,
  cliente_fornecedor_nome TEXT,
  cnpj_cpf                TEXT,
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
CREATE INDEX IF NOT EXISTS idx_comprov_receb_empresa_data_status
  ON public.comprovantes_recebimento (empresa_eid, data_pagamento, status_conciliacao);
CREATE INDEX IF NOT EXISTS idx_comprov_receb_cnpj ON public.comprovantes_recebimento (empresa_eid, cnpj_cpf);

-- ─── fluxo_caixa_lancamentos: Excel/PDF de fluxo de caixa do próprio
-- cliente (contas a pagar/receber já baixadas) — fonte extra de nome/CNPJ/
-- classificação quando o histórico do banco é genérico demais (ex: "Sispag
-- Fornecedores"). Confirmado com arquivo real da Fast Lube: além de
-- data/descrição/valor, o Excel do cliente já traz Razão social, CNPJ,
-- número do documento/NF e até uma "Descrição da conta" (classificação
-- usada pelo ERP do próprio cliente) — por isso os campos extras abaixo,
-- todos opcionais (nem todo cliente manda um Excel tão completo). ───────
CREATE TABLE IF NOT EXISTS public.fluxo_caixa_lancamentos (
  id                      BIGSERIAL PRIMARY KEY,
  empresa_eid             TEXT NOT NULL,
  conta_bancaria_id       BIGINT REFERENCES public.agencias_bancarias(id), -- NULL = vale pra qualquer conta
  data                    DATE NOT NULL,
  descricao               TEXT NOT NULL,
  valor_saida             NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_entrada           NUMERIC(15,2) NOT NULL DEFAULT 0,
  cliente_fornecedor_nome TEXT,
  cnpj_cpf                TEXT,
  documento_numero        TEXT,
  descricao_conta_origem  TEXT, -- "Descrição da conta" do arquivo do cliente — só referência/sugestão, não é FK pro nosso plano_contas
  status_associado        TEXT NOT NULL DEFAULT 'nao_associado' CHECK (status_associado IN ('associado','nao_associado')),
  lancamento_extrato_id   BIGINT REFERENCES public.lancamentos_extrato(id),
  arquivo_origem          TEXT, -- nome do arquivo importado, referência
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fluxo_empresa_status ON public.fluxo_caixa_lancamentos (empresa_eid, status_associado);
CREATE INDEX IF NOT EXISTS idx_fluxo_cnpj ON public.fluxo_caixa_lancamentos (empresa_eid, cnpj_cpf);

-- ─── regras_matching_linhas: linhas extras de uma Regra que precisa abrir
-- mais de 1 débito ou crédito (ex: DARF com IRPJ+CSLL). A regra "pai" em
-- regras_matching continua guardando a 1ª linha de contrapartida
-- (conta_contabil_id/dc); linhas ADICIONAIS (2ª em diante) ficam aqui.
-- valor_fixo só é usado se o valor daquele imposto for sempre igual;
-- normalmente fica NULL e quem preenche é a busca em Tributos do Mês (ou
-- o usuário, se não achar o PDF). ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.regras_matching_linhas (
  id                  BIGSERIAL PRIMARY KEY,
  regra_id            BIGINT NOT NULL REFERENCES public.regras_matching(id) ON DELETE CASCADE,
  ordem               SMALLINT NOT NULL DEFAULT 1,
  conta_contabil_id   BIGINT NOT NULL REFERENCES public.plano_contas(id),
  dc                  TEXT NOT NULL CHECK (dc IN ('D','C')),
  descricao_imposto   TEXT, -- ex: "IRPJ", "CSLL" — usado pra casar com o nome do arquivo em Tributos do Mês
  valor_fixo          NUMERIC(15,2),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_regras_linhas_regra ON public.regras_matching_linhas (regra_id);

-- ─── plano_contas.enviar_pontos_atencao: conta marcada aqui manda, de forma
-- automática, todo lançamento que a debitar/creditar pro módulo "Pontos de
-- Atenção" (mesmo módulo já usado noutras partes do site pra listar itens
-- que o contador não sabe classificar e manda o cliente identificar) —
-- mesmo espírito de "flagar pagamento/recebimento" já usado em Composição
-- de Saldos, só que aqui a marcação é por CONTA (permanente), não por
-- lançamento avulso. Reversível a qualquer momento, um por um ou em lote
-- por busca — mesmo padrão de ignorada_em_regras. ─────────────────────────
ALTER TABLE public.plano_contas ADD COLUMN IF NOT EXISTS enviar_pontos_atencao BOOLEAN NOT NULL DEFAULT false;

-- ─── Triggers de updated_at (reaproveita public.set_updated_at() já existente) ─
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['comprovantes_recebimento','fluxo_caixa_lancamentos']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s
                     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- ─── RLS: mesmo padrão do resto do app — autenticado lê/escreve tudo ───────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['comprovantes_recebimento','fluxo_caixa_lancamentos','regras_matching_linhas']
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%1$s', t);
    EXECUTE format('CREATE POLICY auth_all ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage buckets novos — criar manualmente no Supabase Dashboard → Storage:
--   comprovantes-recebimento  (PDFs/imagens de comprovantes de recebimento)
--   fluxo-caixa               (Excel/PDF original do Fluxo de Caixa enviado)
-- Depois rodar supabase-storage-policies-lancctb-fase8.sql pras policies.
-- ═══════════════════════════════════════════════════════════════════════════

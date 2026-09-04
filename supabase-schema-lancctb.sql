-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — tabelas relacionais dedicadas
-- Execute este script no SQL Editor do Supabase (mesmo projeto do
-- supabase-schema.sql principal). Reaproveita public.set_updated_at() já
-- criada por aquele script — rode-o primeiro se ainda não rodou.
--
-- Por que tabelas dedicadas em vez do padrão dados_app (key/value)? Este
-- módulo espera 300-400 mil NFs/mês no total (até ~20k/mês por cliente de
-- alto volume), com necessidade de índice por CNPJ/data/status e paginação
-- real no servidor — inviável numa única chave JSONB. É a primeira exceção
-- arquitetural do projeto: configuração leve continua em dados_app via
-- S.g/S.s (chave lancctb_config_<eid>), só os dados volumosos vêm pra cá.
--
-- eid é TEXT com conteúdo numérico e vive dentro do JSONB da chave "emps" —
-- não existe tabela relacional "empresas". Por isso toda referência aqui é
-- empresa_eid TEXT NOT NULL (validada em código contra S.emps()), não uma
-- FK de verdade.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── fila_sieg: checkpoint de captura por CNPJ (matriz OU filial) ─────────
-- Uma empresa com N filiais gera N+1 linhas aqui, todas com o mesmo
-- empresa_eid — é isso que consolida a captura das filiais sob a matriz.
CREATE TABLE IF NOT EXISTS public.fila_sieg (
  id                          BIGSERIAL PRIMARY KEY,
  empresa_eid                 TEXT NOT NULL,
  cnpj                        TEXT NOT NULL,
  tipo_doc                    TEXT NOT NULL CHECK (tipo_doc IN ('nfe','nfse')),
  status                      TEXT NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente','processando','erro','concluido')),
  data_emissao_inicio         DATE,
  data_emissao_fim_checkpoint DATE,
  skip_checkpoint             INT NOT NULL DEFAULT 0,
  prioridade                  SMALLINT NOT NULL DEFAULT 5, -- menor = roda antes; alto volume = 1
  tentativas                  INT NOT NULL DEFAULT 0,
  ultimo_erro                 TEXT,
  proxima_execucao            TIMESTAMPTZ DEFAULT NOW(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_eid, cnpj, tipo_doc)
);
CREATE INDEX IF NOT EXISTS idx_fila_sieg_status_prox ON public.fila_sieg (status, proxima_execucao);

-- ─── notas_fiscais: cabeçalho (XML fica no Storage, não no Postgres) ──────
CREATE TABLE IF NOT EXISTS public.notas_fiscais (
  id                  BIGSERIAL PRIMARY KEY,
  empresa_eid         TEXT NOT NULL,
  tipo                TEXT NOT NULL CHECK (tipo IN ('nfe','nfse')),
  chave_acesso        TEXT,
  numero              TEXT NOT NULL,
  serie               TEXT,
  modelo              TEXT,
  cnpj_emitente       TEXT NOT NULL,
  nome_emitente       TEXT,
  cnpj_destinatario   TEXT,
  nome_destinatario   TEXT,
  direcao             TEXT CHECK (direcao IN ('compra','venda')),
  data_emissao        DATE NOT NULL,
  valor_total         NUMERIC(15,2) NOT NULL DEFAULT 0,
  iss_valor           NUMERIC(15,2),
  xml_storage_path    TEXT,
  status_captura      TEXT NOT NULL DEFAULT 'metadados' CHECK (status_captura IN ('metadados','xml_completo')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_eid, tipo, chave_acesso),
  UNIQUE (empresa_eid, tipo, cnpj_emitente, numero, serie)
);
CREATE INDEX IF NOT EXISTS idx_nf_empresa_data ON public.notas_fiscais (empresa_eid, data_emissao);
CREATE INDEX IF NOT EXISTS idx_nf_cnpj_emit    ON public.notas_fiscais (empresa_eid, cnpj_emitente);
CREATE INDEX IF NOT EXISTS idx_nf_cnpj_dest    ON public.notas_fiscais (empresa_eid, cnpj_destinatario);

-- ─── notas_fiscais_parcelas: unidade real de conciliação (1 NF pode ter N) ─
CREATE TABLE IF NOT EXISTS public.notas_fiscais_parcelas (
  id                       BIGSERIAL PRIMARY KEY,
  nf_id                    BIGINT NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  empresa_eid              TEXT NOT NULL,
  numero_parcela           INT NOT NULL DEFAULT 1,
  data_vencimento          DATE NOT NULL,
  valor_parcela            NUMERIC(15,2) NOT NULL,
  status_conciliacao       TEXT NOT NULL DEFAULT 'pendente'
                             CHECK (status_conciliacao IN ('pendente','conciliado','ignorado')),
  lancamento_extrato_id    BIGINT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (nf_id, numero_parcela)
);
CREATE INDEX IF NOT EXISTS idx_nfp_empresa_venc_status
  ON public.notas_fiscais_parcelas (empresa_eid, data_vencimento, status_conciliacao);
-- índice-chave do matching triangular: candidatos por CNPJ ainda pendentes
CREATE INDEX IF NOT EXISTS idx_nfp_pendentes_cnpj
  ON public.notas_fiscais_parcelas (empresa_eid, status_conciliacao)
  INCLUDE (valor_parcela, data_vencimento)
  WHERE status_conciliacao = 'pendente';

-- ─── plano_contas ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plano_contas (
  id              BIGSERIAL PRIMARY KEY,
  empresa_eid     TEXT NOT NULL,
  numero_conta    TEXT NOT NULL,
  classificacao   TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('S','A')), -- Sintética/Analítica
  descricao       TEXT NOT NULL,
  grau            SMALLINT,
  conta_pai_id    BIGINT REFERENCES public.plano_contas(id),
  ignorada_em_regras BOOLEAN NOT NULL DEFAULT false, -- não aparece no select
                                                        -- de contrapartida ao
                                                        -- criar Regra (ex:
                                                        -- contas de dedução
                                                        -- de receita) — por
                                                        -- conta única ou em
                                                        -- lote por grupo de
                                                        -- classificação, sempre reversível
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_eid, numero_conta)
  -- Sem UNIQUE(empresa_eid, classificacao): a mesma classificação contábil
  -- pode aparecer 2x legitimamente quando matriz e filial compartilham a
  -- mesma linha do plano com números de conta diferentes (ex: "SHOPEE PAY
  -- C/C ... " da matriz e da Filial SP, ambas em 1.1.1.02.200001) — mesmo
  -- padrão já visto em outras partes do jjr-controle (ver memória "Vagas
  -- reservadas no plano JJR").
);
CREATE INDEX IF NOT EXISTS idx_plano_contas_empresa ON public.plano_contas (empresa_eid);

-- ─── agencias_bancarias ─────────────────────────────────────────────────────
-- Sempre da MATRIZ — filiais não têm conta bancária própria; NFs emitidas
-- com CNPJ de filial são pagas/recebidas pela conta da matriz mesmo assim.
CREATE TABLE IF NOT EXISTS public.agencias_bancarias (
  id                  BIGSERIAL PRIMARY KEY,
  empresa_eid         TEXT NOT NULL,
  banco_codigo        TEXT,
  banco_nome          TEXT,
  filial_codigo       TEXT,
  agencia             TEXT NOT NULL,
  conta_corrente      TEXT NOT NULL,
  digito_cc           TEXT,
  descricao           TEXT,
  conta_contabil_id   BIGINT REFERENCES public.plano_contas(id),
  saldo_inicial       NUMERIC(15,2) NOT NULL DEFAULT 0, -- saldo do dia anterior ao 1º lançamento
                                                          -- importado, editável na tela de Extrato
                                                          -- bancário — âncora do saldo corrido exibido
  ativo               BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agencias_empresa ON public.agencias_bancarias (empresa_eid);

-- ─── lancamentos_extrato ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lancamentos_extrato (
  id                     BIGSERIAL PRIMARY KEY,
  empresa_eid            TEXT NOT NULL,
  conta_bancaria_id      BIGINT NOT NULL REFERENCES public.agencias_bancarias(id),
  data_pagamento         DATE NOT NULL,
  valor_saida            NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_entrada          NUMERIC(15,2) NOT NULL DEFAULT 0,
  historico_bancario     TEXT,
  informacao             TEXT,
  documento              TEXT,
  status_conciliacao     TEXT NOT NULL DEFAULT 'pendente'
                          CHECK (status_conciliacao IN ('pendente','conciliado','parcial','ignorado')),
  origem_importacao      TEXT NOT NULL CHECK (origem_importacao IN ('excel','csv','pdf_texto','pdf_ocr_ia','pdf_estruturado','manual')),
  hash_dedup             TEXT NOT NULL, -- sha256(conta+data+entrada+saida+historico), calculado em app
  lancamento_contabil_lote_id UUID,     -- preenchido quando resolvido (lancamentos_contabeis.lote_id)
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conta_bancaria_id, hash_dedup)
);
CREATE INDEX IF NOT EXISTS idx_lanc_extrato_empresa_data_status
  ON public.lancamentos_extrato (empresa_eid, data_pagamento, status_conciliacao);

ALTER TABLE public.notas_fiscais_parcelas
  DROP CONSTRAINT IF EXISTS fk_nfp_lanc_extrato;
ALTER TABLE public.notas_fiscais_parcelas
  ADD CONSTRAINT fk_nfp_lanc_extrato
  FOREIGN KEY (lancamento_extrato_id) REFERENCES public.lancamentos_extrato(id);

-- ─── comprovantes_bancarios ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comprovantes_bancarios (
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
CREATE INDEX IF NOT EXISTS idx_comprov_empresa_data_status
  ON public.comprovantes_bancarios (empresa_eid, data_pagamento, status_conciliacao);
CREATE INDEX IF NOT EXISTS idx_comprov_cnpj ON public.comprovantes_bancarios (empresa_eid, cnpj_cpf);

-- ─── regras_matching ────────────────────────────────────────────────────────
-- Fallback manual do matching automático (ver Camada 1 no plano) — o
-- contador cadastra "quando o histórico contém X (ou é do CNPJ Y), lança
-- na conta Z como D/C". origem='ia_sugerida' + regra_origem_id registram
-- quando uma regra nasceu de sugestão de IA e foi clonada pra outra empresa.
CREATE TABLE IF NOT EXISTS public.regras_matching (
  id                          BIGSERIAL PRIMARY KEY,
  empresa_eid                 TEXT NOT NULL,
  descricao                   TEXT NOT NULL,
  tipo_regra                  TEXT NOT NULL CHECK (tipo_regra IN ('historico','cliente_fornecedor')),
  historico_gatilho           TEXT,
  cnpj_cpf_gatilho             TEXT,
  dc                          TEXT NOT NULL CHECK (dc IN ('D','C')),
  conta_contabil_id           BIGINT NOT NULL REFERENCES public.plano_contas(id),
  agencia_bancaria_id         BIGINT REFERENCES public.agencias_bancarias(id), -- NULL = todas
  aplica_historico_extrato    BOOLEAN NOT NULL DEFAULT true,
  origem                      TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','ia_sugerida')),
  regra_origem_id             BIGINT REFERENCES public.regras_matching(id),
  ativo                       BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  TEXT
);
CREATE INDEX IF NOT EXISTS idx_regras_empresa_ativo ON public.regras_matching (empresa_eid, ativo);

-- ─── lancamentos_contabeis: resultado final, partida dobrada ───────────────
CREATE TABLE IF NOT EXISTS public.lancamentos_contabeis (
  id                      BIGSERIAL PRIMARY KEY,
  lote_id                 UUID NOT NULL, -- agrupa as N linhas (débito+crédito) de UMA transação
  empresa_eid             TEXT NOT NULL,
  data                    DATE NOT NULL,
  classificacao           TEXT NOT NULL,     -- cópia congelada de plano_contas.classificacao
  conta_contabil_id       BIGINT NOT NULL REFERENCES public.plano_contas(id),
  tipo                    TEXT NOT NULL CHECK (tipo IN ('D','C')),
  valor                   NUMERIC(15,2) NOT NULL CHECK (valor > 0),
  historico                TEXT NOT NULL,
  cliente_fornecedor_nome TEXT,
  cnpj_cpf                TEXT,
  nf_parcela_id            BIGINT REFERENCES public.notas_fiscais_parcelas(id),
  comprovante_id           BIGINT REFERENCES public.comprovantes_bancarios(id),
  lancamento_extrato_id    BIGINT REFERENCES public.lancamentos_extrato(id),
  regra_matching_id        BIGINT REFERENCES public.regras_matching(id),
  origem_match             TEXT NOT NULL CHECK (origem_match IN ('automatico_triangular','regra','manual')),
  anexo_storage_path       TEXT,
  informacao_extra         TEXT,
  estornado                BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                TEXT
);
CREATE INDEX IF NOT EXISTS idx_lanc_ctb_empresa_data ON public.lancamentos_contabeis (empresa_eid, data);
CREATE INDEX IF NOT EXISTS idx_lanc_ctb_lote          ON public.lancamentos_contabeis (lote_id);
CREATE INDEX IF NOT EXISTS idx_lanc_ctb_conta          ON public.lancamentos_contabeis (empresa_eid, conta_contabil_id);

-- ─── RPC: inserção atômica de partida dobrada, valida D=C antes de gravar ──
CREATE OR REPLACE FUNCTION public.criar_lancamento_partida_dobrada(linhas JSONB)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_lote_id UUID := gen_random_uuid();
  v_soma_d NUMERIC(15,2);
  v_soma_c NUMERIC(15,2);
BEGIN
  SELECT COALESCE(SUM((l->>'valor')::NUMERIC) FILTER (WHERE l->>'tipo' = 'D'), 0),
         COALESCE(SUM((l->>'valor')::NUMERIC) FILTER (WHERE l->>'tipo' = 'C'), 0)
  INTO v_soma_d, v_soma_c
  FROM jsonb_array_elements(linhas) AS l;

  IF v_soma_d <> v_soma_c THEN
    RAISE EXCEPTION 'Partida não fechada: débito % <> crédito %', v_soma_d, v_soma_c;
  END IF;

  INSERT INTO public.lancamentos_contabeis
    (lote_id, empresa_eid, data, classificacao, conta_contabil_id, tipo, valor, historico,
     cliente_fornecedor_nome, cnpj_cpf, nf_parcela_id, comprovante_id, lancamento_extrato_id,
     regra_matching_id, origem_match, created_by)
  SELECT v_lote_id, l->>'empresa_eid', (l->>'data')::DATE, l->>'classificacao',
         (l->>'conta_contabil_id')::BIGINT, l->>'tipo', (l->>'valor')::NUMERIC, l->>'historico',
         l->>'cliente_fornecedor_nome', l->>'cnpj_cpf',
         (l->>'nf_parcela_id')::BIGINT, (l->>'comprovante_id')::BIGINT, (l->>'lancamento_extrato_id')::BIGINT,
         (l->>'regra_matching_id')::BIGINT, l->>'origem_match', l->>'created_by'
  FROM jsonb_array_elements(linhas) AS l;

  RETURN v_lote_id;
END;
$$;

-- ─── Triggers de updated_at (reaproveita public.set_updated_at() já existente) ─
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fila_sieg','notas_fiscais','notas_fiscais_parcelas','plano_contas',
    'agencias_bancarias','lancamentos_extrato','comprovantes_bancarios','regras_matching','lancamentos_contabeis']
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
  FOREACH t IN ARRAY ARRAY['fila_sieg','notas_fiscais','notas_fiscais_parcelas','plano_contas',
    'agencias_bancarias','lancamentos_extrato','comprovantes_bancarios','regras_matching','lancamentos_contabeis']
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%1$s', t);
    EXECUTE format('CREATE POLICY auth_all ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage buckets — criar manualmente no Supabase Dashboard → Storage:
--   nf-xmls            (XMLs completos das NFs)
--   comprovantes        (PDFs/imagens de comprovantes bancários)
--   extratos-originais  (arquivo original do extrato enviado)
-- Em cada bucket, criar policy de INSERT/SELECT para role "authenticated"
-- com "true" — mesmo padrão de RLS usado acima.
-- ═══════════════════════════════════════════════════════════════════════════

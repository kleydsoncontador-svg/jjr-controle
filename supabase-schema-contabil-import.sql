-- ═══════════════════════════════════════════════════════════════
-- Importação contábil estruturada (Livro Razão + Balancete + DRE) — SEM guardar PDF.
-- Só dados estruturados; nenhum arquivo, base64, texto de página ou imagem.
-- Tabelas próprias (não entram no carregamento inicial do site, ao contrário de dados_app).
-- Valores monetários em NUMERIC(15,2); centavos inteiros no código, texto com 2 casas ao gravar.
-- ═══════════════════════════════════════════════════════════════

-- ─── accounting_imports: auditoria leve de cada arquivo lido ────────────────
CREATE TABLE IF NOT EXISTS public.accounting_imports (
  id             BIGSERIAL PRIMARY KEY,
  empresa_eid    TEXT NOT NULL,
  company_cnpj   TEXT NOT NULL,                       -- só dígitos
  document_type  TEXT NOT NULL CHECK (document_type IN ('GENERAL_LEDGER','TRIAL_BALANCE','INCOME_STATEMENT')),
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  competence     TEXT,                                 -- AAAA-MM quando o período é de um único mês
  file_name      TEXT,
  file_hash      TEXT NOT NULL,                        -- SHA-256 do arquivo (o arquivo em si NÃO é guardado)
  parser_version TEXT NOT NULL,
  pages          INT,
  row_count      INT,
  warnings       JSONB,
  validation     JSONB,
  summary        JSONB,
  imported_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imported_by    TEXT,
  UNIQUE (empresa_eid, document_type, file_hash)
);
CREATE INDEX IF NOT EXISTS idx_acc_imports_emp ON public.accounting_imports (empresa_eid, document_type, period_end);

-- ─── Livro Razão ────────────────────────────────────────────────────────────
-- Cadastro das contas PATRIMONIAIS vistas no razão (grupo pela classificação, por segmentos).
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  empresa_eid          TEXT NOT NULL,
  code                 TEXT NOT NULL,
  classification       TEXT NOT NULL,
  description          TEXT,
  group_name           TEXT NOT NULL,
  opening_date         DATE,                           -- início do período do PDF que trouxe o saldo anterior
  opening_cents        BIGINT,                         -- saldo anterior, algébrico: D positivo, C negativo
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_eid, code)
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id             BIGSERIAL PRIMARY KEY,
  empresa_eid    TEXT NOT NULL,
  account_code   TEXT NOT NULL,
  entry_date     DATE NOT NULL,
  entry_number   TEXT,
  history        TEXT,
  counterpart    TEXT,                                 -- código(s) da contrapartida, inclusive contas de resultado; vazio = partida múltipla
  debit          NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit         NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance        NUMERIC(15,2),                        -- Saldo-Exercício (valor absoluto)
  balance_side   CHAR(1) CHECK (balance_side IN ('D','C')),
  competence     TEXT NOT NULL,                        -- AAAA-MM
  source_page    INT,
  import_id      BIGINT REFERENCES public.accounting_imports(id) ON DELETE SET NULL,
  dedup_key      TEXT NOT NULL,                        -- sha256(empresa|conta|data|número|contrapartida|débito|crédito|ocorrência)
  UNIQUE (empresa_eid, dedup_key)
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_conta ON public.ledger_entries (empresa_eid, account_code, entry_date);

CREATE TABLE IF NOT EXISTS public.ledger_monthly_summary (
  empresa_eid       TEXT NOT NULL,
  account_code      TEXT NOT NULL,
  competence        TEXT NOT NULL,                     -- AAAA-MM
  opening_cents     BIGINT NOT NULL,                   -- algébrico (D+, C−)
  debit_cents       BIGINT NOT NULL,
  credit_cents      BIGINT NOT NULL,
  closing_cents     BIGINT NOT NULL,
  closing_side      CHAR(1),
  printed_debit_cents  BIGINT,                         -- "Total do mês" impresso (conferência)
  printed_credit_cents BIGINT,
  reconciled        BOOLEAN NOT NULL DEFAULT false,
  closing_entries_debit_cents  BIGINT NOT NULL DEFAULT 0,   -- parte do mês vinda de "Apuração do Resultado"
  closing_entries_credit_cents BIGINT NOT NULL DEFAULT 0,
  entries_count     INT NOT NULL DEFAULT 0,
  import_id         BIGINT REFERENCES public.accounting_imports(id) ON DELETE SET NULL,
  PRIMARY KEY (empresa_eid, account_code, competence)
);

-- ─── Balancete: TODAS as contas (1 a 6, sintéticas e analíticas) ─────────────
CREATE TABLE IF NOT EXISTS public.trial_balance_accounts (
  id               BIGSERIAL PRIMARY KEY,
  empresa_eid      TEXT NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  competence       TEXT,
  code             TEXT NOT NULL,
  classification   TEXT NOT NULL,                      -- sempre string
  description      TEXT,
  is_analytic      BOOLEAN NOT NULL,
  level            INT,
  prev_balance     NUMERIC(15,2) NOT NULL, prev_side   CHAR(1) CHECK (prev_side IN ('D','C')),
  debit            NUMERIC(15,2) NOT NULL,
  credit           NUMERIC(15,2) NOT NULL,
  balance          NUMERIC(15,2) NOT NULL, balance_side CHAR(1) CHECK (balance_side IN ('D','C')),
  import_id        BIGINT REFERENCES public.accounting_imports(id) ON DELETE SET NULL,
  UNIQUE (empresa_eid, period_start, period_end, classification, code)
);

-- RESUMO DO BALANCETE (uma linha por período) — inclui os resultados do mês e do exercício
CREATE TABLE IF NOT EXISTS public.trial_balance_summary (
  id                     BIGSERIAL PRIMARY KEY,
  empresa_eid            TEXT NOT NULL,
  period_start           DATE NOT NULL,
  period_end             DATE NOT NULL,
  competence             TEXT,
  sections               JSONB NOT NULL,               -- linhas do resumo (ATIVO, PASSIVO, RECEITAS…), valores em centavos
  monthly_result_period_start  DATE, monthly_result_period_end DATE,
  monthly_result_amount  NUMERIC(15,2), monthly_result_side CHAR(1), monthly_result_type TEXT, monthly_result_signed NUMERIC(15,2),
  exercise_result_period_start DATE, exercise_result_period_end DATE,
  exercise_result_amount NUMERIC(15,2), exercise_result_side CHAR(1), exercise_result_type TEXT, exercise_result_signed NUMERIC(15,2),
  import_id              BIGINT REFERENCES public.accounting_imports(id) ON DELETE SET NULL,
  UNIQUE (empresa_eid, period_start, period_end)
);

-- ─── DRE: TODAS as linhas (contas, grupos, subtotais, resultado) ─────────────
CREATE TABLE IF NOT EXISTS public.income_statement_lines (
  id              BIGSERIAL PRIMARY KEY,
  empresa_eid     TEXT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  competence      TEXT,
  line_no         INT NOT NULL,
  code            TEXT,
  classification  TEXT,
  description     TEXT NOT NULL,
  indent          INT,
  amount          NUMERIC(15,2),                        -- entre parênteses no PDF = negativo
  amount_text     TEXT,                                 -- texto original do valor
  is_result       BOOLEAN NOT NULL DEFAULT false,       -- linha do resultado final (LUCRO/PREJUÍZO DO EXERCÍCIO)
  import_id       BIGINT REFERENCES public.accounting_imports(id) ON DELETE SET NULL,
  UNIQUE (empresa_eid, period_start, period_end, line_no)
);

-- ─── RLS: mesmo padrão do resto do app (usuário autenticado lê/escreve) ─────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['accounting_imports','ledger_accounts','ledger_entries','ledger_monthly_summary',
    'trial_balance_accounts','trial_balance_summary','income_statement_lines']
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%1$s', t);
    EXECUTE format('CREATE POLICY auth_all ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

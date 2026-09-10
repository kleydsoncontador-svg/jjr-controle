-- ═══════════════════════════════════════════════════════════════════════════
-- Importação de Extratos de Aplicações Financeiras SEM IA — mapeamento + auditoria
-- (Ganhos / Rendimentos e, futuramente, o Conversor de Aplicações Financeiras)
--
-- "Memória" = Supabase (item 3 do spec do usuário 10/09/2026). O parser
-- determinístico (pdf.js, sem IA/LLM/OCR) extrai um catálogo de source_keys
-- por banco/modelo/produto; o usuário associa UMA VEZ cada coluna da tela a
-- um source_key; a associação fica aqui e é reaplicada sozinha nos meses
-- seguintes enquanto o fingerprint do modelo continuar compatível.
--
-- Reaproveita public.set_updated_at() já criada em supabase-schema.sql.
-- Padrão do módulo: RLS auth_all (authenticated lê/escreve tudo), nada de
-- service_role, migrations antigas intactas.
--
-- aplicacao_id / produto_filtro são NOT NULL DEFAULT '' (não NULL) só pra que
-- o UNIQUE simples e o upsert por on_conflict funcionem — '' = "sem produto".
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.aplicfin_modelo_mapeamento (
  id                BIGSERIAL PRIMARY KEY,
  empresa_eid       TEXT NOT NULL,
  modulo            TEXT NOT NULL DEFAULT 'ganhos'
                      CHECK (modulo IN ('ganhos','conv_aplicfin')),
  aplicacao_id      TEXT NOT NULL DEFAULT '',   -- id da aplicação/ganho no dados_app ('' = vale pra qualquer)
  banco             TEXT NOT NULL,              -- 'ITAU' | 'BB' | 'BRADESCO'
  modelo            TEXT NOT NULL,              -- 'itau_aplic_aut_mais' | 'bb_rende_facil' | 'bradesco_padrao' | 'bradesco_cdb_multi'
  fingerprint_hash  TEXT NOT NULL,              -- hash das características fixas do modelo (título/cabeçalhos), NÃO do nome do arquivo
  produto_filtro    TEXT NOT NULL DEFAULT '',   -- '' = produto único; senão nome exato do produto (ex: '2851 - Invest Facil')
  site_column       TEXT NOT NULL,              -- id da coluna da tela: 'bruto','iof','irrf','aplic','resgate','rendMes','rendLiq','saldoBrutoExtrato',...
  source_key        TEXT NOT NULL,              -- ex: 'itau_aplic_aut_mais.final_position.gross'
  source_label      TEXT,                       -- rótulo legível mostrado na tela
  calc_type         TEXT NOT NULL DEFAULT 'DIRECT_TOTAL'
                      CHECK (calc_type IN ('DIRECT_TOTAL','SUM','CONDITIONAL_SUM','FIRST_POSITION','LAST_POSITION')),
  filtro            JSONB,                      -- ex: {"historico":"Resgate"} para CONDITIONAL_SUM
  parser_version    TEXT NOT NULL DEFAULT 'v1',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        TEXT,
  CONSTRAINT uq_aplicfin_map UNIQUE (empresa_eid, modulo, modelo, aplicacao_id, produto_filtro, site_column)
);
CREATE INDEX IF NOT EXISTS idx_aplicfin_map_lookup
  ON public.aplicfin_modelo_mapeamento (empresa_eid, modulo, modelo, fingerprint_hash);

CREATE TABLE IF NOT EXISTS public.aplicfin_import_auditoria (
  id                BIGSERIAL PRIMARY KEY,
  empresa_eid       TEXT NOT NULL,
  modulo            TEXT NOT NULL DEFAULT 'ganhos',
  aplicacao_id      TEXT NOT NULL DEFAULT '',
  competencia       TEXT NOT NULL,              -- 'AAAA-MM'
  banco             TEXT NOT NULL,
  modelo            TEXT NOT NULL,
  produto_filtro    TEXT NOT NULL DEFAULT '',
  site_column       TEXT NOT NULL,
  source_key        TEXT NOT NULL,
  source_label      TEXT,
  source_section    TEXT,
  raw_value         NUMERIC(18,2),
  calculated_value  NUMERIC(18,2),
  calculation_type  TEXT,
  page_number       INT,
  parser_version    TEXT,
  arquivo_nome      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_aplicfin_aud UNIQUE (empresa_eid, modulo, aplicacao_id, competencia, produto_filtro, site_column)
);
CREATE INDEX IF NOT EXISTS idx_aplicfin_aud_lookup
  ON public.aplicfin_import_auditoria (empresa_eid, modulo, aplicacao_id, competencia);

DROP TRIGGER IF EXISTS trg_aplicfin_map_updated_at ON public.aplicfin_modelo_mapeamento;
CREATE TRIGGER trg_aplicfin_map_updated_at BEFORE UPDATE ON public.aplicfin_modelo_mapeamento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['aplicfin_modelo_mapeamento','aplicfin_import_auditoria']
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%1$s', t);
    EXECUTE format('CREATE POLICY auth_all ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

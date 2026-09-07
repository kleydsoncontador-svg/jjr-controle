-- ═══════════════════════════════════════════════════════════════
-- Regras de associação automática para Fluxo de Caixa
-- PORT/NEGÓCIO → Conta Bancária (reaproveitável em múltiplos períodos)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fluxo_caixa_regras (
  id                  BIGSERIAL PRIMARY KEY,
  empresa_eid         TEXT NOT NULL,
  port_negocio        TEXT NOT NULL,
  conta_bancaria_id   BIGINT NOT NULL REFERENCES public.agencias_bancarias(id),
  nome_regra          TEXT,
  data_criacao        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_aplicacao    TIMESTAMPTZ,
  qtd_aplicacoes      INT NOT NULL DEFAULT 1,
  ativo               BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (empresa_eid, port_negocio)
);

CREATE INDEX IF NOT EXISTS idx_fluxo_regras_empresa
  ON public.fluxo_caixa_regras (empresa_eid, ativo);

-- RLS: autenticado lê/escreve tudo
ALTER TABLE public.fluxo_caixa_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all ON public.fluxo_caixa_regras;
CREATE POLICY auth_all ON public.fluxo_caixa_regras
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger de atualização automática
CREATE OR REPLACE FUNCTION public.set_updated_at_fluxo_regras()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultima_aplicacao = NOW();
  NEW.qtd_aplicacoes = COALESCE(NEW.qtd_aplicacoes, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fluxo_regras_aplicacao ON public.fluxo_caixa_regras;
CREATE TRIGGER trg_fluxo_regras_aplicacao BEFORE UPDATE ON public.fluxo_caixa_regras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_fluxo_regras();

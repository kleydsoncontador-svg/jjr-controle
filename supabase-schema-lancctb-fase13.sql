-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 13 (Aplicações Financeiras + vínculo
-- com o checklist "Documentação Recebida" do Visão Geral). Execute no SQL
-- Editor do Supabase depois das fases anteriores (reaproveita
-- agencias_bancarias, plano_contas, lancamentos_extrato,
-- public.set_updated_at() já existentes).
--
-- Contexto: o usuário quer (1) cadastrar as aplicações financeiras (Aut
-- Mais, CDB-DI, CDB-Plus, Fundos de Investimento...) por conta corrente, já
-- que muitos extratos bancários não trazem as movimentações de aplicação/
-- resgate junto (cada banco/cliente manda um modelo diferente); quando o
-- extrato do banco NÃO traz essas linhas, o usuário lança a aplicação/
-- resgate aqui e o site injeta uma linha sintética em lancamentos_extrato
-- (destacada em amarelo na tela, reconhecida por
-- origem_importacao='aplicacao_financeira') pra fechar o saldo corrido e
-- pra entrar no Registro Contábil como qualquer outra pendência (usuário
-- classifica pela Regra normalmente, inclusive com rateio se quiser separar
-- IR retido); e (2) vincular itens do módulo (conta corrente, aplicação
-- financeira) a uma linha específica do checklist "Documentação Recebida"
-- do Visão Geral (tabela dados_app, chave chk_<eid>, campo
-- documentos[].nome) — ao importar o documento correspondente pra um mês,
-- aquela linha já fica marcada "ok" automaticamente naquele mês, sem
-- precisar marcar na mão duas vezes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── agencias_bancarias: vínculo com o Visão Geral ────────────────────────
-- Guarda o NOME exato do item em chk.documentos (não um ID — essa lista
-- não tem ID estável, só nome) pra saber qual linha marcar automaticamente
-- quando um Extrato Bancário é importado pra essa conta.
ALTER TABLE public.agencias_bancarias ADD COLUMN IF NOT EXISTS doc_visao_geral_nome TEXT;

-- ─── agencias_bancarias: origem do extrato ────────────────────────────────
-- Algumas empresas continuam sendo capturadas pelo Mister Contador (fonte
-- diferente do extrato original do banco — Mister exporta um "Relatório de
-- Conta Corrente" com layout uniforme pra qualquer banco). Guardar a
-- origem permite reconhecer esse layout de forma determinística (Fase 13)
-- e mostrar um selo "Origem: Mister Contador" no card da conta.
ALTER TABLE public.agencias_bancarias ADD COLUMN IF NOT EXISTS origem_extrato TEXT NOT NULL DEFAULT 'banco'
  CHECK (origem_extrato IN ('banco','mister_contador'));

-- ─── lancamentos_extrato: nova origem "aplicação financeira" ──────────────
-- Recria o CHECK pra incluir o novo valor sem perder o que já existia.
ALTER TABLE public.lancamentos_extrato DROP CONSTRAINT IF EXISTS lancamentos_extrato_origem_importacao_check;
ALTER TABLE public.lancamentos_extrato ADD CONSTRAINT lancamentos_extrato_origem_importacao_check
  CHECK (origem_importacao IN ('excel','csv','pdf_texto','pdf_ocr_ia','pdf_estruturado','manual','aplicacao_financeira'));

-- ─── aplicacoes_financeiras: registro do "produto" (Aut Mais, CDB-DI...) ──
CREATE TABLE IF NOT EXISTS public.aplicacoes_financeiras (
  id                    BIGSERIAL PRIMARY KEY,
  empresa_eid           TEXT NOT NULL,
  conta_bancaria_id     BIGINT NOT NULL REFERENCES public.agencias_bancarias(id),
  nome                  TEXT NOT NULL, -- ex: "Aut Mais Itaú", "CDB-DI", "Fundos de Investimento"
  conta_contabil_id     BIGINT REFERENCES public.plano_contas(id), -- conta de ativo (contrapartida), opcional — pode classificar via Regra depois
  levar_para_extrato    BOOLEAN NOT NULL DEFAULT true, -- esse tipo gera lançamento sintético no Extrato Bancário? (depende do modelo de extrato do banco/cliente)
  valor_usar_extrato    TEXT NOT NULL DEFAULT 'bruto' CHECK (valor_usar_extrato IN ('bruto','liquido')), -- resgate: qual valor vira o lançamento no extrato
  doc_visao_geral_nome  TEXT, -- nome do item em chk.documentos (Visão Geral) pra flag automático
  ativo                 BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aplic_fin_empresa ON public.aplicacoes_financeiras (empresa_eid);

-- ─── aplicacoes_financeiras_movimentos: aplicação ou resgate lançado ──────
CREATE TABLE IF NOT EXISTS public.aplicacoes_financeiras_movimentos (
  id                    BIGSERIAL PRIMARY KEY,
  aplicacao_id          BIGINT NOT NULL REFERENCES public.aplicacoes_financeiras(id) ON DELETE CASCADE,
  empresa_eid           TEXT NOT NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('aplicacao','resgate')),
  data                  DATE NOT NULL,
  valor_bruto           NUMERIC(15,2) NOT NULL,
  valor_liquido         NUMERIC(15,2), -- só relevante pra resgate (bruto - IR retido); aplicação usa só valor_bruto
  lancamento_extrato_id BIGINT REFERENCES public.lancamentos_extrato(id), -- linha sintética gerada, quando levar_para_extrato=true
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aplic_fin_mov_aplicacao ON public.aplicacoes_financeiras_movimentos (aplicacao_id);
CREATE INDEX IF NOT EXISTS idx_aplic_fin_mov_empresa_data ON public.aplicacoes_financeiras_movimentos (empresa_eid, data);

-- ─── Trigger de updated_at + RLS (mesmo padrão do resto do módulo) ────────
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_aplicacoes_financeiras_updated_at ON public.aplicacoes_financeiras;
  CREATE TRIGGER trg_aplicacoes_financeiras_updated_at BEFORE UPDATE ON public.aplicacoes_financeiras
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['aplicacoes_financeiras','aplicacoes_financeiras_movimentos']
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON public.%1$s', t);
    EXECUTE format('CREATE POLICY auth_all ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

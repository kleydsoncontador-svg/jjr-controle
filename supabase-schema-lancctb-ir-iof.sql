-- Aplicações Financeiras: guardar IRRF e IOF por linha de movimento (não só
-- o valor bruto/líquido), pedido do usuário 22/09/2026: "todos os módulos
-- precisam trazer cada linha de IOF e IRRF... e nós poderemos dentro dele,
-- gerar um TXT do IRRF e IOF para lançamento".
--
-- O leitor determinístico do "Extrato Padrão" Bradesco (Invest Fácil e
-- afins, _lancctbAplicParseBradescoPadraoDet) já extraía "Vlr. IOF (R$)" e
-- "Vlr. IRRF (R$)" por linha, mas essas colunas eram descartadas porque
-- _lancctbAplicDetectarMapeamentoAutomatico não tinha alvo pra elas — o
-- schema já tinha valor_bruto/valor_liquido/valor_principal; faltava isto.
ALTER TABLE public.aplicacoes_financeiras_movimentos
  ADD COLUMN IF NOT EXISTS valor_ir  NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS valor_iof NUMERIC(15,2);

-- ─── "Como se fosse um extrato mesmo" (pedido do usuário 22/09/2026) ──────
-- (1) Saldo inicial editável por Aplicação, igual ao já existente em
--     agencias_bancarias.saldo_inicial pro Extrato Bancário — a tela passa a
--     navegar por mês (não mistura mais) e mostrar uma coluna Saldo corrido.
ALTER TABLE public.aplicacoes_financeiras
  ADD COLUMN IF NOT EXISTS saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0;

-- (2) "eu escolho se irão pra o extrato bancário ou não, escolho se
--     resgates e aplicações irão ou não" — o toggle único levar_para_extrato
--     vira dois, um por tipo de movimento (mantém a coluna antiga só pra não
--     perder o valor já configurado; passa a ser ignorada pelo código).
ALTER TABLE public.aplicacoes_financeiras
  ADD COLUMN IF NOT EXISTS levar_aplicacao_para_extrato BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS levar_resgate_para_extrato   BOOLEAN NOT NULL DEFAULT true;
UPDATE public.aplicacoes_financeiras
  SET levar_aplicacao_para_extrato = levar_para_extrato,
      levar_resgate_para_extrato   = levar_para_extrato;

-- (3) "poderei lançar o rendimento de forma manual" — novo tipo de
--     movimento, só soma no saldo da Aplicação (nunca gera lançamento no
--     Extrato Bancário — não é uma movimentação real da conta corrente,
--     IOF/IRRF também nunca geram lançamento próprio no Extrato, já era
--     assim: só o valor da linha de Aplicação/Resgate escolhido no
--     cadastro vai pro Extrato).
ALTER TABLE public.aplicacoes_financeiras_movimentos DROP CONSTRAINT IF EXISTS aplicacoes_financeiras_movimentos_tipo_check;
ALTER TABLE public.aplicacoes_financeiras_movimentos ADD CONSTRAINT aplicacoes_financeiras_movimentos_tipo_check
  CHECK (tipo IN ('aplicacao','resgate','rendimento'));

-- Aplicações Financeiras: complementar o Extrato Bancário com Aplicações e
-- Resgates diários lidos de um PDF (ex: extrato de aplicações do Bradesco,
-- que traz Vlr Princ./Vlr Bruto/Vlr Líquido por resgate), escolhendo na
-- hora do import qual valor (Principal, Bruto ou Líquido) vira o
-- lançamento no Extrato — pedido do usuário 08/09/2026.
--
-- O schema já tinha valor_bruto/valor_liquido; faltava valor_principal.
ALTER TABLE public.aplicacoes_financeiras_movimentos
  ADD COLUMN IF NOT EXISTS valor_principal NUMERIC(15,2);

-- "No Resgate, usar no Extrato Bancário" (aplicacoes_financeiras.valor_usar_extrato)
-- passa a aceitar também 'principal', além de 'bruto'/'liquido' já existentes.
ALTER TABLE public.aplicacoes_financeiras
  DROP CONSTRAINT IF EXISTS aplicacoes_financeiras_valor_usar_extrato_check;
ALTER TABLE public.aplicacoes_financeiras
  ADD CONSTRAINT aplicacoes_financeiras_valor_usar_extrato_check
    CHECK (valor_usar_extrato IS NULL OR valor_usar_extrato IN ('principal','bruto','liquido'));

-- Guarda o mapeamento de colunas "ensinado" pelo usuário na 1ª vez que
-- importa um PDF de um padrão novo pra esta Aplicação — igual ao já feito
-- em Ganhos/Rendimentos (getGanhos().mapeamentoColunasIA), mas aqui a
-- Aplicação é uma linha de tabela relacional, não um item de dados_app.
ALTER TABLE public.aplicacoes_financeiras
  ADD COLUMN IF NOT EXISTS mapeamento_colunas_ia JSONB;

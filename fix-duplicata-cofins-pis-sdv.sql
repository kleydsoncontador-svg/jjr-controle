-- Remove o lançamento duplicado (lote da Regra 33, que tinha o histórico
-- "PIS" errado repetindo o texto de COFINS, e competência quebrada "0")
-- da SDV Participações — mantém o lote da Regra 34, que está correto.
-- Verificado antes de rodar: cada regra só tinha essas 3 linhas mesmo
-- (nenhuma outra transação usa a Regra 33), então é seguro apagar as duas.
DELETE FROM lancamentos_contabeis WHERE lote_id = '0abe5c46-b12e-49db-b0ef-6cc0af65140b';
DELETE FROM regras_matching_linhas WHERE regra_id = 33;
DELETE FROM regras_matching WHERE id = 33;

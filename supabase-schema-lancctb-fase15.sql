-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 15 (corrige ordenação da listagem de
-- NF-e/NFS-e por Data de Emissão). Execute no SQL Editor do Supabase.
--
-- Bug real encontrado (05/09/2026): a listagem tentava ordenar
-- notas_fiscais_parcelas pela data_emissao de notas_fiscais (embutida via
-- !inner) usando o parâmetro foreignTable do supabase-js. Descobri
-- testando com dado real que o PostgREST NÃO ordena a query externa por
-- uma coluna de uma tabela embutida many-to-one dessa forma — o parâmetro
-- só reordena um array embutido (relação um-pra-muitos), que não é o caso
-- aqui (cada parcela pertence a 1 nota só). Resultado: a ordenação era
-- ignorada silenciosamente, sem erro nenhum.
-- Correção: copiar data_emissao pra dentro de notas_fiscais_parcelas no
-- momento da gravação (ela nunca muda depois que a nota é capturada), pra
-- poder ordenar/filtrar direto na tabela base, sem depender de embed.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.notas_fiscais_parcelas ADD COLUMN IF NOT EXISTS data_emissao DATE;

UPDATE public.notas_fiscais_parcelas p
SET data_emissao = nf.data_emissao
FROM public.notas_fiscais nf
WHERE nf.id = p.nf_id AND p.data_emissao IS NULL;

CREATE INDEX IF NOT EXISTS idx_nfp_empresa_emissao ON public.notas_fiscais_parcelas (empresa_eid, data_emissao);

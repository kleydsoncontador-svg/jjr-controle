-- ═══════════════════════════════════════════════════════════════
-- Duplica tipo/direcao (de notas_fiscais) como colunas próprias em
-- notas_fiscais_parcelas — mesmo motivo já documentado pra data_emissao:
-- sem essas colunas próprias, o filtro por tipo/direção na aba NF-e/NFS-e
-- Entrada/Saída (renderLancctbNotas, index.html) obriga o Postgres a
-- materializar o JOIN inteiro com notas_fiscais antes de filtrar, e a
-- contagem "estimated" do PostgREST fica MUITO errada nessa combinação.
--
-- Achado real 11/09/2026 (Kajuna, empresa #238): a NF 45320 existia, com
-- data certa (17/08/2026), mas nunca aparecia na listagem — o "estimated"
-- dizia 1199 parcelas (24 páginas) quando na real eram 6972 (~140
-- páginas); a NF ficava numa página que a paginação nunca deixava alcançar.
-- Com tipo/direcao como colunas próprias e indexadas, o filtro roda 100%
-- por índice sem precisar do join, e count:'exact' volta a ser rápido.
--
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.notas_fiscais_parcelas
  ADD COLUMN IF NOT EXISTS tipo TEXT,
  ADD COLUMN IF NOT EXISTS direcao TEXT;

UPDATE public.notas_fiscais_parcelas AS p
SET tipo = nf.tipo, direcao = nf.direcao
FROM public.notas_fiscais AS nf
WHERE p.nf_id = nf.id AND (p.tipo IS DISTINCT FROM nf.tipo OR p.direcao IS DISTINCT FROM nf.direcao);

CREATE INDEX IF NOT EXISTS idx_nfp_empresa_tipo_direcao_emissao
  ON public.notas_fiscais_parcelas (empresa_eid, tipo, direcao, data_emissao);

ANALYZE public.notas_fiscais_parcelas;

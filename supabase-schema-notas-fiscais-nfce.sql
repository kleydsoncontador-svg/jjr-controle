-- ═══════════════════════════════════════════════════════════════
-- Adiciona 'nfce' (Nota Fiscal de Consumidor Eletrônica, modelo 65) ao
-- enum de tipo em notas_fiscais/notas_fiscais_parcelas — pedido do usuário
-- 11/09/2026. Mesmo schema XML da NF-e (infNFe), reclassificado só pelo
-- campo <mod>65</mod> já extraído pelo parser existente
-- (_lancctbParsearNFeXml) — nenhum parser novo foi necessário.
--
-- ✅ EXECUTADO no Supabase em 11/09/2026.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.notas_fiscais
  DROP CONSTRAINT IF EXISTS notas_fiscais_tipo_check;
ALTER TABLE public.notas_fiscais
  ADD CONSTRAINT notas_fiscais_tipo_check CHECK (tipo IN ('nfe','nfse','nfce'));

-- ═══════════════════════════════════════════════════════════════════════════
-- Retenções federais na NFS-e (PIS/COFINS/CSLL/IRRF) — pedido do usuário
-- 01/10/2026: "precisa criar uma coluna valor líquido, onde serão deduzidos
-- ISS, PIS, COFINS, CSLL (4,65%) quando houver na NF. E aí precisa tentar
-- amarrar valor bruto e valor líquido."
--
-- No layout Nacional da NFS-e, PIS+COFINS+CSLL retidos vêm SOMADOS num único
-- campo (vRetCSLL) — o valor de cada um é derivado aqui pelas alíquotas
-- padrão (PIS 0,65% / COFINS 3% / CSLL 1% do valor do serviço), a pedido do
-- usuário: "se não estiver 4,65%, vc arruma, pois o padrão de emissão
-- mudou, e alguns estão vindo majoradas". IRRF (vRetIRRF) vem separado e é
-- gravado como está, sem correção de alíquota (varia por tipo de serviço).
--
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS pis_valor    NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS cofins_valor NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS csll_valor   NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS irrf_valor   NUMERIC(15,2);

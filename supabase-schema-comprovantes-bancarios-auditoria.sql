-- ═══════════════════════════════════════════════════════════════════════════
-- Comprovantes de Pagamento — campos de auditoria do parser determinístico
-- do Itaú (ampliação 10/09/2026: boleto novo, PIX transf/QR, transferência
-- conta, DARF, DARE-SP, e-Social, tributos estaduais/GNRE, tributos
-- municipais, concessionária, código de barras genérico).
--
-- Migration INCREMENTAL: só ADD COLUMN IF NOT EXISTS. Nada é apagado,
-- nenhuma migration antiga é alterada, RLS intacto. Os dados que já estão
-- em comprovantes_bancarios continuam válidos (colunas novas ficam NULL).
--
-- A tela principal continua mostrando só as 7 colunas de sempre (DT PGTO,
-- CLIENTE/FORNECEDOR, CPF/CNPJ, DOCUMENTO, DT VCTO, VALOR, STATUS). Estes
-- campos são só pra auditoria e dedup.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS parser_type              TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS transaction_id           TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS ctrl                     TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS barcode                  TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS barcode_normalized       TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS payment_reference        TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS beneficiary_name         TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS beneficiary_document     TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS final_beneficiary_name   TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS final_beneficiary_document TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS qr_code_identifier       TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS expiration_at            TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS raw_text                 TEXT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS warnings                 JSONB;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS page_number              INT;
ALTER TABLE public.comprovantes_bancarios ADD COLUMN IF NOT EXISTS hash_dedup               TEXT;

-- Índice único de deduplicação por empresa. NÃO-parcial de propósito: o
-- PostgREST/supabase-js precisa de um índice único simples pra casar o
-- ON CONFLICT do upsert (um índice PARCIAL "WHERE hash_dedup IS NOT NULL"
-- dá "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification"). As linhas antigas com hash_dedup NULL não conflitam
-- entre si porque no Postgres NULL != NULL num índice único (NULLS DISTINCT).
CREATE UNIQUE INDEX IF NOT EXISTS uq_comprov_bancarios_hash
  ON public.comprovantes_bancarios (empresa_eid, hash_dedup);

CREATE INDEX IF NOT EXISTS idx_comprov_bancarios_parser_type
  ON public.comprovantes_bancarios (empresa_eid, parser_type);

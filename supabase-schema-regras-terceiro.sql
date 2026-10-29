-- 29/10/2026 — Regras: condições opcionais "Cliente/Fornecedor contém" e "Comprovante contém" (Cadastrar regra).
-- Já aplicado no Supabase (SQL Editor) em 29/10/2026.
ALTER TABLE public.regras_matching
  ADD COLUMN IF NOT EXISTS cliente_gatilho text,
  ADD COLUMN IF NOT EXISTS comprovante_gatilho text;

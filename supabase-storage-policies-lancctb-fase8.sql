-- ═══════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 8: policies dos buckets novos
-- Rodar no SQL Editor do Supabase, uma vez, depois de criar os buckets
-- "comprovantes-recebimento" e "fluxo-caixa" (Storage → New bucket, privados).
-- Mesmo padrão de acesso do resto do app: qualquer usuário autenticado
-- pode ler/gravar (sem RLS por usuário/empresa).
-- ═══════════════════════════════════════════════════════════════

-- ─── bucket "comprovantes-recebimento" ─────────────────────────────────────
DROP POLICY IF EXISTS comprov_receb_insert_auth ON storage.objects;
CREATE POLICY comprov_receb_insert_auth ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes-recebimento');

DROP POLICY IF EXISTS comprov_receb_select_auth ON storage.objects;
CREATE POLICY comprov_receb_select_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes-recebimento');

DROP POLICY IF EXISTS comprov_receb_delete_auth ON storage.objects;
CREATE POLICY comprov_receb_delete_auth ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes-recebimento');

-- ─── bucket "fluxo-caixa" (Excel/PDF original do Fluxo de Caixa) ───────────
DROP POLICY IF EXISTS fluxo_caixa_insert_auth ON storage.objects;
CREATE POLICY fluxo_caixa_insert_auth ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fluxo-caixa');

DROP POLICY IF EXISTS fluxo_caixa_select_auth ON storage.objects;
CREATE POLICY fluxo_caixa_select_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fluxo-caixa');

DROP POLICY IF EXISTS fluxo_caixa_delete_auth ON storage.objects;
CREATE POLICY fluxo_caixa_delete_auth ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fluxo-caixa');

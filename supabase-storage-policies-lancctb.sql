-- ═══════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — policies dos buckets de Storage
-- Rodar no SQL Editor do Supabase, uma vez, depois de criar os buckets
-- "comprovantes" e "extratos-originais" (Storage → New bucket, privados).
-- Mesmo padrão de acesso do resto do app: qualquer usuário autenticado
-- pode ler/gravar (sem RLS por usuário/empresa).
-- ═══════════════════════════════════════════════════════════════

-- ─── bucket "comprovantes" (PDF original dos comprovantes bancários) ──────
DROP POLICY IF EXISTS comprovantes_insert_auth ON storage.objects;
CREATE POLICY comprovantes_insert_auth ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprovantes');

DROP POLICY IF EXISTS comprovantes_select_auth ON storage.objects;
CREATE POLICY comprovantes_select_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'comprovantes');

DROP POLICY IF EXISTS comprovantes_delete_auth ON storage.objects;
CREATE POLICY comprovantes_delete_auth ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'comprovantes');

-- ─── bucket "extratos-originais" (reservado — não usado ainda na Fase 3) ──
DROP POLICY IF EXISTS extratos_insert_auth ON storage.objects;
CREATE POLICY extratos_insert_auth ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'extratos-originais');

DROP POLICY IF EXISTS extratos_select_auth ON storage.objects;
CREATE POLICY extratos_select_auth ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'extratos-originais');

DROP POLICY IF EXISTS extratos_delete_auth ON storage.objects;
CREATE POLICY extratos_delete_auth ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'extratos-originais');

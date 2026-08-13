-- ═══════════════════════════════════════════════════════════════════════════
-- JJR Controle Contábil — Supabase Schema
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Tabela principal de dados (key-value com JSONB) ─────────────────────────
-- Todos os dados do app são armazenados aqui como pares chave/valor JSON.
-- Chaves usadas pelo app:
--   emps            → array de empresas
--   chk_{eid}       → checklist de cada empresa (documentos + tarefas + obs)
--   listagem        → array de documentos/tarefas padrão
--   meses           → array de meses disponíveis (ex: ["2026-01","2026-02",...])
--   fechAtual       → mês de fechamento atual (ex: "2026-05")
--   operador        → nome do operador atual
--   sistemasFin     → array de sistemas financeiros disponíveis
--   decl_{tipo}_{eid}_{ano} → declarações contábeis (ecd, cb, dimob, defis, ibge)
--   ta_{eid}        → tributos em atraso por empresa
--   luc_res_{eid}   → resultado mensal de lucros por empresa
--   luc_socios_{eid}→ sócios de cada empresa
--   luc_dist_{eid}_{mes} → distribuição de lucros por empresa/mês
--   luc_anos        → array de anos configurados em Lucros/Dividendos
--   luc_saldo_ant_{eid}_{ano} → saldo anterior de lucros
--   tribMes_{eid}   → forma de tributação por mês para cada empresa
--   seeded_ccc_v3   → flag de carga inicial executada
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dados_app (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);

-- Index para queries de prefixo (ex: listar todos os chk_*, luc_dist_*, etc.)
CREATE INDEX IF NOT EXISTS idx_dados_app_key_prefix
  ON public.dados_app USING btree (key text_pattern_ops);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dados_app_updated_at ON public.dados_app;
CREATE TRIGGER trg_dados_app_updated_at
  BEFORE UPDATE ON public.dados_app
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Apenas usuários autenticados podem ler e escrever.
-- Para multi-tenant (cada usuário vê só seus dados), adicione uma coluna
-- user_id UUID e políticas com auth.uid() = user_id.

ALTER TABLE public.dados_app ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado pode ler todos os dados do escritório
CREATE POLICY "auth_select" ON public.dados_app
  FOR SELECT TO authenticated USING (true);

-- Inserção: qualquer usuário autenticado pode inserir
CREATE POLICY "auth_insert" ON public.dados_app
  FOR INSERT TO authenticated WITH CHECK (true);

-- Atualização: qualquer usuário autenticado pode atualizar
CREATE POLICY "auth_update" ON public.dados_app
  FOR UPDATE TO authenticated USING (true);

-- Deleção: qualquer usuário autenticado pode deletar
CREATE POLICY "auth_delete" ON public.dados_app
  FOR DELETE TO authenticated USING (true);

-- ─── Como criar usuários ──────────────────────────────────────────────────────
-- No Supabase Dashboard → Authentication → Users → "Add user"
-- Ou via SQL:
--
-- SELECT auth.uid(); -- confirma que está autenticado
--
-- Para criar via API (requer service_role key, use apenas no servidor):
-- POST /auth/v1/admin/users
-- { "email": "kleydson@jjr.com.br", "password": "sua-senha-segura",
--   "user_metadata": { "nome": "Kleydson", "perfil": "admin" } }
--
-- Para criação em massa a partir dos responsáveis do sistema:
-- Use o painel Authentication > Users do Dashboard do Supabase.
-- Os responsáveis padrão do sistema são: Kleydson, Fernanda, Rafael, Aline, etc.
-- (derivados automaticamente do campo resp das empresas no EMP_SEED)

-- ─── Verificação ─────────────────────────────────────────────────────────────
-- Após executar, confirme com:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'dados_app';
-- SELECT policyname FROM pg_policies WHERE tablename = 'dados_app';

-- ═══════════════════════════════════════════════════════════════════════════
-- SOCORRO: "Não foi possível salvar na nuvem" para todos os operadores
-- ═══════════════════════════════════════════════════════════════════════════
-- Sintoma: ninguém consegue salvar, o app mostra aviso de sessão/permissão, e
-- no console aparece o erro 42501 "new row violates row-level security policy".
-- Já aconteceu uma vez (11/08/2026) e custou um dia de trabalho de um operador,
-- porque na época o app deixava continuar digitando mesmo sem salvar.
--
-- ANTES DE MAIS NADA: avise todos a NÃO limparem cache nem trocarem de máquina.
-- O trabalho não salvo fica no IndexedDB de cada computador e sobe sozinho
-- quando a conexão voltar (ver _loadFromSupabase no index.html).
--
-- Passo 1 — ver o que existe hoje:
--   SELECT policyname, cmd, roles::text FROM pg_policies WHERE tablename='dados_app';
--   (o esperado são 4 linhas: auth_select/auth_insert/auth_update/auth_delete,
--    todas com roles = {authenticated})
--
-- Passo 2 — restaurar (seguro rodar mesmo se já existirem):
--   ALTER TABLE public.dados_app ENABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "auth_select" ON public.dados_app;
--   CREATE POLICY "auth_select" ON public.dados_app FOR SELECT TO authenticated USING (true);
--   DROP POLICY IF EXISTS "auth_insert" ON public.dados_app;
--   CREATE POLICY "auth_insert" ON public.dados_app FOR INSERT TO authenticated WITH CHECK (true);
--   DROP POLICY IF EXISTS "auth_update" ON public.dados_app;
--   CREATE POLICY "auth_update" ON public.dados_app FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
--   DROP POLICY IF EXISTS "auth_delete" ON public.dados_app;
--   CREATE POLICY "auth_delete" ON public.dados_app FOR DELETE TO authenticated USING (true);
--
-- Passo 3 — cada operador faz logout e login de novo (pra pegar sessão nova).
--
-- Como confirmar que voltou: basta abrir o sistema. Desde 11/08/2026 o app faz
-- um teste real de gravação na abertura (_verificarPermissaoDeGravar) e trava a
-- tela avisando se não conseguir salvar — se abrir sem aviso, está funcionando.
--
-- OBS: testar com a anon key (curl sem login) SEMPRE dá esse mesmo erro 42501,
-- porque as políticas são TO authenticated. Isso não prova que está quebrado —
-- o teste válido é com um usuário logado.

-- ─── Realtime (sincronização entre operadores sem precisar dar F5) ───────────
-- OBRIGATÓRIO rodar este comando uma vez para o app atualizar a tela sozinho
-- quando outro operador salvar algo (ex: marcar fechamento, editar ganhos):
ALTER PUBLICATION supabase_realtime ADD TABLE public.dados_app;

-- Confirme que funcionou com:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- (deve listar 'dados_app' no resultado)

-- ═══════════════════════════════════════════════════════════════════════════
-- Módulo Lançamentos Bancários — Fase 19 (campo "Histórico Utilizado" próprio
-- na Regra, separado da Descrição). Execute no SQL Editor do Supabase.
--
-- Pedido do usuário (05/09/2026): a Regra precisa de uma escolha explícita
-- entre gravar um texto FIXO (replicado em todo lançamento que cair nessa
-- regra) ou MANTER o histórico original do extrato bancário de cada
-- lançamento. Antes disso o campo "Descrição" fazia as duas coisas ao mesmo
-- tempo (nome da regra na listagem E texto fixo do histórico), e era
-- obrigatório — não dava pra escolher "manter o original".
--
-- historico_fixo = NULL  → mantém o histórico bancário original de cada
--                            lançamento (opção "Manter o histórico original").
-- historico_fixo = texto → usa esse texto fixo em todo lançamento da regra
--                            (opção "Personalizado").
-- "descricao" continua sendo só o NOME da regra na listagem, sem mudança.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.regras_matching ADD COLUMN IF NOT EXISTS historico_fixo TEXT;

-- Migração dos dados já existentes: hoje "descricao" também fazia o papel de
-- histórico fixo (comportamento antigo) — copia o valor atual pra não mudar
-- o resultado de nenhuma regra já cadastrada.
UPDATE public.regras_matching SET historico_fixo = descricao WHERE historico_fixo IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- Adiciona 'cte' (Conhecimento de Transporte Eletrônico, modelo 57/67) ao
-- enum de tipo em notas_fiscais — pedido do usuário 16/09/2026. Schema de
-- XML bem diferente de NF-e/NFS-e (raiz <CTe>/<cteProc>, blocos
-- emit/rem/dest/exped/receb em vez de emit/dest), parser próprio
-- (_lancctbParsearCTeXml). notas_fiscais_parcelas.tipo não tem CHECK
-- próprio (coluna TEXT livre, duplicada de notas_fiscais só por
-- performance de filtro — ver supabase-schema-nfp-tipo-direcao.sql), não
-- precisa de migration separada.
--
-- Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.notas_fiscais
  DROP CONSTRAINT IF EXISTS notas_fiscais_tipo_check;
ALTER TABLE public.notas_fiscais
  ADD CONSTRAINT notas_fiscais_tipo_check CHECK (tipo IN ('nfe','nfse','nfce','cte'));

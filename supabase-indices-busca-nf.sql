-- Índices de busca de NF (11/10/2026) — SOMENTE ADITIVO: não altera, não apaga nem move nenhum dado; só cria índices (IF NOT EXISTS).
-- Motivo: com ~340 mil NFs e ~384 mil parcelas, a busca por texto (nome/CNPJ/número) e por faixa de valor estourava o tempo limite do banco
-- ("canceling statement due to statement timeout") — é o que deixava o modal "Cadastrar regra" lento e o "Processar" carregando NF demais.
-- Pode ser rodado de novo sem problema (IF NOT EXISTS). Cada CREATE INDEX trava gravações na tabela por alguns segundos enquanto roda.

create extension if not exists pg_trgm;

-- parcelas pendentes por empresa e faixa de valor (busca manual de NF, matching)
create index if not exists idx_nf_parcelas_emp_status_valor on public.notas_fiscais_parcelas (empresa_eid, status_conciliacao, valor_parcela);
create index if not exists idx_nf_parcelas_nf_id on public.notas_fiscais_parcelas (nf_id);

-- notas por empresa/direção/número (busca exata e prefixo)
create index if not exists idx_nf_emp_dir_numero on public.notas_fiscais (empresa_eid, direcao, numero);

-- busca por texto (ILIKE '%...%') em nome, CNPJ e número
create index if not exists idx_nf_nome_emit_trgm on public.notas_fiscais using gin (nome_emitente gin_trgm_ops);
create index if not exists idx_nf_nome_dest_trgm on public.notas_fiscais using gin (nome_destinatario gin_trgm_ops);
create index if not exists idx_nf_cnpj_emit_trgm on public.notas_fiscais using gin (cnpj_emitente gin_trgm_ops);
create index if not exists idx_nf_cnpj_dest_trgm on public.notas_fiscais using gin (cnpj_destinatario gin_trgm_ops);
create index if not exists idx_nf_numero_trgm on public.notas_fiscais using gin (numero gin_trgm_ops);

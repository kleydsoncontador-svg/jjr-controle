-- ─── Formulário online dos Pontos de Atenção (06/11/2026) ───────────────────────────────────────
-- O escritório gera um link (token longo e aleatório) com os lançamentos que precisam de esclarecimento;
-- o cliente abre o link SEM login, responde (tem NF? nº, parcela, fornecedor/cliente, tipo/natureza) e envia.
-- Segurança: a tabela tem RLS ligada e SÓ o usuário logado do escritório (authenticated) enxerga/edita direto.
-- A página pública fala apenas com as 2 funções abaixo (SECURITY DEFINER), que exigem o token exato e respeitam a validade.

create table if not exists public.pa_formularios (
  token        text primary key,
  empresa_eid  text not null,
  empresa_nome text,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null default (now() + interval '30 days'),
  linhas       jsonb not null default '[]'::jsonb,   -- [{id,data,valor,tipo,hist,perg:{fornecedor,tipo,nf}}]
  respostas    jsonb not null default '{}'::jsonb,   -- {id:{nf,nf_num,parcela,nome,tipo,tipo_lista}}
  enviado_em   timestamptz,
  criado_por   text
);
create index if not exists pa_formularios_empresa_idx on public.pa_formularios (empresa_eid);

alter table public.pa_formularios enable row level security;
drop policy if exists pa_form_authenticated_all on public.pa_formularios;
create policy pa_form_authenticated_all on public.pa_formularios for all to authenticated using (true) with check (true);
-- (nenhuma policy para anon: a página pública NÃO lê/escreve a tabela direto)

create or replace function public.pa_form_get(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
           'empresa', empresa_nome, 'linhas', linhas, 'respostas', respostas,
           'enviado_em', enviado_em, 'expira_em', expira_em)
    from public.pa_formularios
   where token = p_token and length(p_token) >= 32 and expira_em > now();
$$;

create or replace function public.pa_form_save(p_token text, p_respostas jsonb, p_final boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or length(p_token) < 32 then return false; end if;
  if p_respostas is null or jsonb_typeof(p_respostas) <> 'object' then return false; end if;
  if pg_column_size(p_respostas) > 300000 then raise exception 'respostas grandes demais'; end if;
  update public.pa_formularios
     set respostas = p_respostas,
         enviado_em = case when p_final then now() else enviado_em end
   where token = p_token and expira_em > now();
  return found;
end;
$$;

revoke all on function public.pa_form_get(text) from public;
revoke all on function public.pa_form_save(text, jsonb, boolean) from public;
grant execute on function public.pa_form_get(text) to anon, authenticated;
grant execute on function public.pa_form_save(text, jsonb, boolean) to anon, authenticated;

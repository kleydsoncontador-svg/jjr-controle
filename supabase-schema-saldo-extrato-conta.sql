-- Saldo do extrato/registro por conta somado NO SERVIDOR (o Bradesco da Rufato tem ~88 mil linhas; baixar todas levava ~30 s).
-- Mesma regra da tela: ignora 'ignorado' e 'referencia'. Anterior = tudo antes do mês; entradas/saídas = só o mês (p_mes = 'AAAA-MM').
create or replace function public.saldo_extrato_conta(p_eid text, p_conta bigint, p_mes text)
returns table(ant numeric, ent numeric, sai numeric)
language sql stable security invoker as $$
  select
    coalesce(sum(case when to_char(data_pagamento,'YYYY-MM') < p_mes then valor_entrada - valor_saida end),0),
    coalesce(sum(case when to_char(data_pagamento,'YYYY-MM') = p_mes then valor_entrada end),0),
    coalesce(sum(case when to_char(data_pagamento,'YYYY-MM') = p_mes then valor_saida end),0)
  from public.lancamentos_extrato
  where empresa_eid = p_eid and conta_bancaria_id = p_conta
    and status_conciliacao not in ('ignorado','referencia');
$$;
grant execute on function public.saldo_extrato_conta(text,bigint,text) to anon, authenticated;

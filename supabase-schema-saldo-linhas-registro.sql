-- Saldo corrido (após cada lançamento) só das linhas pedidas, somado no servidor. Mesma ordem da tela: data, id. Ignora 'ignorado'/'reabsorvido'/'referencia'.
create or replace function public.saldo_linhas_registro(p_eid text, p_conta bigint, p_desde date, p_ids bigint[])
returns table(id bigint, saldo numeric)
language sql stable security invoker as $$
  select t.id, t.saldo from (
    select l.id, sum(l.valor_entrada - l.valor_saida) over (order by l.data_pagamento, l.id rows between unbounded preceding and current row) as saldo
    from public.lancamentos_extrato l
    where l.empresa_eid = p_eid and l.conta_bancaria_id = p_conta
      and l.status_conciliacao not in ('ignorado','reabsorvido','referencia')
      and (p_desde is null or l.data_pagamento >= p_desde)
  ) t where t.id = any(p_ids);
$$;
grant execute on function public.saldo_linhas_registro(text,bigint,date,bigint[]) to anon, authenticated;

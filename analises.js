/* Análises Contábeis — módulo por empresa (lista de empresas → contas contábeis → balancete do mês → calcular todas as análises).
   Fluxo (pedido do usuário 28/10/2026): 1) incluir a empresa; 2) ANTES DE TUDO definir as contas contábeis de cada análise (como o “Definir as Contas…” do Domínio);
   3) importar o balancete do mês (Demonstrativos Contábeis) e escolher o mês; 4) “Calcular todas” → cada análise é uma linha da lista, com a fórmula.
   Os cálculos vêm do motor JJRCalc (calc-motor.js: analise_indices e ebitda_eva); este arquivo só monta as entradas a partir do balancete salvo no site. */
(function () {
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const C = () => window.JJRCalc;
  const AN = { aberto: {}, editando: {}, periodo: {}, periodos: {}, chart: {}, resultado: {}, ocupado: {}, medios: {}, carregou: {} };
  const KEY = eid => 'analises_cfg_' + eid;

  // Variáveis (contas) que alimentam as análises. nat = natureza do saldo que deve ficar positivo (D = devedor, C = credor).
  // padrao = classificação do plano de contas padrão JJR (confira e ajuste: cada empresa pode ter plano diferente).
  const VARS = [
    { g: 'Ativo', k: 'disponivel', l: 'Disponível (caixa, bancos e aplicações de liquidez imediata)', nat: 'D', padrao: ['1.1.1'], uso: 'Liquidez imediata' },
    { g: 'Ativo', k: 'clientes', l: 'Clientes / duplicatas a receber', nat: 'D', padrao: ['1.1.2'], uso: 'Prazo médio de recebimento' },
    { g: 'Ativo', k: 'estoques', l: 'Estoques', nat: 'D', padrao: ['1.1.6'], uso: 'Liquidez seca, prazo de estoques' },
    { g: 'Ativo', k: 'despAntecipadas', l: 'Despesas antecipadas (opcional)', nat: 'D', padrao: [], uso: 'Liquidez seca (variante)', opc: true },
    { g: 'Ativo', k: 'ativoCirculante', l: 'ATIVO CIRCULANTE (conta sintética do total)', nat: 'D', padrao: ['1.1'], uso: 'Todas as liquidezes e o CCL' },
    { g: 'Ativo', k: 'rlp', l: 'Realizável a longo prazo', nat: 'D', padrao: ['1.2.1'], uso: 'Liquidez geral' },
    { g: 'Ativo', k: 'investimentos', l: 'Investimentos', nat: 'D', padrao: ['1.2.2', '1.2.3'], uso: 'Imobilização' },
    { g: 'Ativo', k: 'imobilizado', l: 'Imobilizado', nat: 'D', padrao: ['1.2.4'], uso: 'Imobilização' },
    { g: 'Ativo', k: 'intangivel', l: 'Intangível', nat: 'D', padrao: ['1.2.5'], uso: 'Imobilização' },
    { g: 'Ativo', k: 'ativoNaoCirculante', l: 'ATIVO NÃO CIRCULANTE (conta sintética do total)', nat: 'D', padrao: ['1.2'], uso: 'Ativo total; o que sobrar entra em “outros”' },
    { g: 'Passivo e PL', k: 'passivoCirculante', l: 'PASSIVO CIRCULANTE (conta sintética do total)', nat: 'C', padrao: ['2.1'], uso: 'Liquidezes, endividamento' },
    { g: 'Passivo e PL', k: 'fornecedores', l: 'Fornecedores (circulante)', nat: 'C', padrao: ['2.1.2'], uso: 'Prazo médio de pagamento' },
    { g: 'Passivo e PL', k: 'elp', l: 'PASSIVO NÃO CIRCULANTE (conta sintética do total)', nat: 'C', padrao: ['2.2'], uso: 'Liquidez geral, endividamento' },
    { g: 'Passivo e PL', k: 'patrimonioLiquido', l: 'PATRIMÔNIO LÍQUIDO (conta sintética, sem o resultado do exercício)', nat: 'C', padrao: ['2.3'], uso: 'ROE, garantia, imobilização (o resultado ainda não apurado é somado sozinho)' },
    { g: 'Resultado', k: 'receitaBruta', l: 'Receita bruta de vendas e serviços', nat: 'C', padrao: ['3.1.1'], uso: 'Prazo de recebimento, receita líquida' },
    { g: 'Resultado', k: 'deducoes', l: '(−) Deduções da receita (impostos sobre vendas, devoluções)', nat: 'D', padrao: ['3.1.2'], uso: 'Receita líquida' },
    { g: 'Resultado', k: 'outrasReceitas', l: 'Outras receitas operacionais', nat: 'C', padrao: ['3.1.4'], uso: 'EBIT' },
    { g: 'Resultado', k: 'receitasFinanceiras', l: 'Receitas financeiras', nat: 'C', padrao: ['3.1.3'], uso: 'Lucro líquido, EBIT' },
    { g: 'Resultado', k: 'cmv', l: 'Custos (CMV / CPV / CSP)', nat: 'D', padrao: ['4.1'], uso: 'Prazos, EBIT' },
    { g: 'Resultado', k: 'despesasOperacionais', l: 'Despesas operacionais (comerciais, administrativas e outras — SEM as financeiras)', nat: 'D', padrao: ['4.2.1', '4.2.2', '4.2.4'], uso: 'EBIT' },
    { g: 'Resultado', k: 'despesasFinanceiras', l: 'Despesas financeiras', nat: 'D', padrao: ['4.2.3'], uso: 'Lucro líquido, cobertura de juros' },
    { g: 'Resultado', k: 'irCsll', l: 'IRPJ e CSLL (tributos sobre o lucro)', nat: 'D', padrao: ['4.3'], uso: 'Lucro líquido' },
    { g: 'Resultado', k: 'depreciacao', l: 'Depreciação e amortização (contas de despesa) — opcional', nat: 'D', padrao: [], uso: 'EBITDA', opc: true },
    { g: 'Resultado', k: 'compras', l: 'Compras do período (opcional)', nat: 'D', padrao: [], uso: 'Prazo médio de pagamento (sem isso usa o CMV)', opc: true },
    { g: 'Dívida e caixa', k: 'dividaOnerosa', l: 'Dívida onerosa: empréstimos e financiamentos (curto + longo prazo) — opcional', nat: 'C', padrao: [], uso: 'WACC, EVA, dívida líquida', opc: true },
    { g: 'Dívida e caixa', k: 'caixaEquivalentes', l: 'Caixa e aplicações financeiras (para a dívida líquida)', nat: 'D', padrao: ['1.1.1'], uso: 'Capital investido, dívida líquida' }
  ];
  // sugestões por nome do plano de contas do balancete (quando a conta padrão não existe)
  const SUGESTOES = {
    despAntecipadas: { raiz: '1.1', re: /ANTECIPAD/i }, intangivel: { raiz: '1.2', re: /INTANG/i }, investimentos: { raiz: '1.2', re: /^INVESTIMENTOS?$/i },
    depreciacao: { raiz: '4', re: /DEPRECIA|AMORTIZA/i, analitica: true },
    dividaOnerosa: { raiz: '2', re: /EMPR[ÉE]STIMO|FINANCIAMENTO/i, analitica: true }
  };

  const cfgGet = eid => { try { const c = S.g(KEY(eid)); return c && typeof c === 'object' && c.contas ? c : null; } catch (e) { return null; } };
  const cfgSet = (eid, c) => S.s(KEY(eid), c);
  const brl = c => 'R$ ' + C().brl(Math.round(c));
  const f2 = (v, mx) => v.toLocaleString('pt-BR', { minimumFractionDigits: Math.min(2, mx), maximumFractionDigits: mx });
  const compBr = pe => String(pe).slice(5, 7) + '/' + String(pe).slice(0, 4);
  const emp = eid => (S.emps() || []).find(e => String(e.eid) === String(eid));

  // ───────────── dados salvos no site (balancete importado) ─────────────
  async function carregarPeriodos(eid) {
    const r = await _supaClient.from('trial_balance_summary').select('period_start,period_end,competence').eq('empresa_eid', String(eid)).order('period_end', { ascending: false }).limit(60);
    AN.periodos[eid] = (r.data || []);
    if (!AN.periodo[eid] && AN.periodos[eid].length) AN.periodo[eid] = AN.periodos[eid][0].period_end;
    if (AN.periodos[eid].length) {
      const p = AN.periodos[eid][0];
      const c = await _supaClient.from('trial_balance_accounts').select('classification,description,is_analytic,level').eq('empresa_eid', String(eid)).eq('period_start', p.period_start).eq('period_end', p.period_end).order('classification').limit(3000);
      AN.chart[eid] = c.data || [];
    } else AN.chart[eid] = [];
    AN.carregou[eid] = true;
  }
  async function contasDoPeriodo(eid, periodEnd) {
    const p = (AN.periodos[eid] || []).find(x => x.period_end === periodEnd); if (!p) return null;
    const out = []; let off = 0;
    while (true) {
      const r = await _supaClient.from('trial_balance_accounts').select('classification,description,is_analytic,balance,balance_side').eq('empresa_eid', String(eid)).eq('period_start', p.period_start).eq('period_end', p.period_end).order('classification').range(off, off + 999);
      if (r.error) throw r.error; (r.data || []).forEach(x => out.push(x)); if ((r.data || []).length < 1000) break; off += 1000;
    }
    return out;
  }
  const mapa = lista => { const m = {}; (lista || []).forEach(a => { m[a.classification] = a; }); return m; };
  const ehDescendente = (a, b) => a !== b && a.startsWith(b + '.');
  // soma o saldo (com sinal pela natureza) das contas escolhidas; contas filhas de outra já escolhida não entram (evita contar duas vezes)
  function valorVar(m, codigos, nat) {
    const cods = (codigos || []).filter(c => !(codigos || []).some(o => ehDescendente(c, o)));
    let tot = 0; const usadas = [], faltam = [];
    cods.forEach(c => { const a = m[c]; if (!a) { faltam.push(c); return; } const v = Math.round(Number(a.balance) * 100) * (a.balance_side === nat ? 1 : (a.balance_side ? -1 : 0)); tot += v; usadas.push({ cod: c, desc: a.description, v }); });
    return { cents: tot, usadas, faltam };
  }

  // ───────────── cálculo de todas as análises ─────────────
  async function calcularTudo(eid) {
    const cfg = cfgGet(eid); if (!cfg) throw new Error('Defina as contas contábeis primeiro.');
    const pe = AN.periodo[eid]; if (!pe) throw new Error('Escolha o mês do balancete (importe o balancete se a lista estiver vazia).');
    const contas = await contasDoPeriodo(eid, pe); if (!contas || !contas.length) throw new Error('Este balancete não tem contas salvas.');
    const m = mapa(contas), val = {}, origem = [], avisos = [];
    VARS.forEach(v => { const r = valorVar(m, (cfg.contas || {})[v.k] || [], v.nat); val[v.k] = r.cents; origem.push({ v, r }); if (r.faltam.length) avisos.push('“' + v.l + '”: conta(s) ' + r.faltam.join(', ') + ' não existe(m) neste balancete.'); });
    ['disponivel', 'clientes', 'estoques', 'imobilizado'].forEach(k => { if (val[k] < 0) avisos.push('Saldo CREDOR em “' + VARS.find(v => v.k === k).l + '” (' + brl(val[k]) + '): confira os lançamentos, pois isso distorce os índices (por exemplo, a liquidez seca fica maior que a corrente).'); });
    const need = ['ativoCirculante', 'ativoNaoCirculante', 'passivoCirculante', 'patrimonioLiquido'];
    for (const k of need) if (!((cfg.contas || {})[k] || []).length) throw new Error('Defina as contas de: ' + VARS.find(v => v.k === k).l);
    // resultado do exercício ainda não apurado = contas 3 (receitas) − contas 4 (custos e despesas) do balancete
    const bal = (cod, nat) => { const a = m[cod]; return a ? Math.round(Number(a.balance) * 100) * (a.balance_side === nat ? 1 : (a.balance_side ? -1 : 0)) : 0; };
    const resBal = bal('3', 'C') - bal('4', 'D');
    const rl = val.receitaBruta - val.deducoes;
    const ebit = rl + val.outrasReceitas - val.cmv - val.despesasOperacionais;
    const lair = ebit + val.receitasFinanceiras - val.despesasFinanceiras;
    const ll = lair - val.irCsll;
    if (Math.abs(ll - resBal) > 100) avisos.push('O lucro calculado com as contas definidas (' + brl(ll) + ') difere do resultado do balancete (receitas − custos e despesas = ' + brl(resBal) + '). Há conta de resultado fora do mapa: revise as contas de resultado.');
    const plAj = val.patrimonioLiquido + resBal;
    if (plAj <= 0) avisos.push('Patrimônio líquido ajustado (PL + resultado do exercício) = ' + brl(plAj) + ': passivo a descoberto. Os índices que dividem pelo PL (grau de endividamento, ROE, imobilização do PL, Kanitz) não se aplicam.');
    const outrosAnc = val.ativoNaoCirculante - (val.rlp + val.investimentos + val.imobilizado + val.intangivel);
    const at = val.ativoCirculante + val.ativoNaoCirculante;
    const mes = Number(pe.slice(5, 7)), dias = 30 * mes;
    // saldos do início do exercício (balancete de dezembro do ano anterior), se importado — para saldos médios
    let ant = null;
    const pAnt = (AN.periodos[eid] || []).find(x => x.period_end === (Number(pe.slice(0, 4)) - 1) + '-12-31');
    if (pAnt && cfg.medios) {
      const cAnt = await contasDoPeriodo(eid, pAnt.period_end), mA = mapa(cAnt || []);
      const g = k => valorVar(mA, (cfg.contas || {})[k] || [], VARS.find(v => v.k === k).nat).cents;
      const resA = (mA['3'] ? Math.round(Number(mA['3'].balance) * 100) * (mA['3'].balance_side === 'C' ? 1 : -1) : 0) - (mA['4'] ? Math.round(Number(mA['4'].balance) * 100) * (mA['4'].balance_side === 'D' ? 1 : -1) : 0);
      ant = { at: g('ativoCirculante') + g('ativoNaoCirculante'), pl: g('patrimonioLiquido') + resA, est: g('estoques'), cli: g('clientes'), forn: g('fornecedores') };
    } else if (cfg.medios) avisos.push('Saldos médios: o balancete de dezembro/' + (Number(pe.slice(0, 4)) - 1) + ' não foi importado; usei os saldos finais.');
    const R = c => (c / 100).toFixed(2);
    const inpA = { disponivel: R(val.disponivel), clientes: R(val.clientes), estoques: R(val.estoques), despAntecipadas: val.despAntecipadas ? R(val.despAntecipadas) : '', ativoCirculante: R(val.ativoCirculante), rlp: R(val.rlp), investimentos: R(val.investimentos), imobilizado: R(val.imobilizado), intangivel: R(val.intangivel), outrosAnc: R(outrosAnc),
      passivoCirculante: R(val.passivoCirculante), fornecedores: R(val.fornecedores), elp: R(val.elp), patrimonioLiquido: R(plAj),
      receitaBruta: R(val.receitaBruta), receitaLiquida: R(rl), cmv: R(val.cmv), lucroOperacional: R(ebit), lucroLiquido: R(ll), compras: val.compras ? R(val.compras) : '', diasPeriodo: String(dias),
      ativoTotalAnt: ant ? R(ant.at) : '', plAnt: ant ? R(ant.pl) : '', estoquesAnt: ant ? R(ant.est) : '', clientesAnt: ant ? R(ant.cli) : '', fornecedoresAnt: ant ? R(ant.forn) : '', usarSaldosMedios: !!ant };
    const ra = C().calcular('analise_indices', inpA); if (!ra.ok) throw new Error(ra.erro);
    const inpB = { lucroLiquido: R(ll), irCsll: R(val.irCsll), despesasFinanceiras: R(val.despesasFinanceiras), receitasFinanceiras: R(val.receitasFinanceiras), depreciacaoAmortizacao: R(val.depreciacao), ebitInformado: R(ebit), receitaLiquida: R(rl), aliquota: String(cfg.aliq || '34'),
      patrimonioLiquido: R(plAj), dividaOnerosa: R(val.dividaOnerosa), caixaEquivalentes: R(val.caixaEquivalentes), ativoTotal: R(at), passivoCirculante: R(val.passivoCirculante), custoCapitalProprio: String(cfg.ke || ''), custoDivida: String(cfg.kd || '') };
    const rb = C().calcular('ebitda_eva', inpB); if (!rb.ok) throw new Error(rb.erro);
    const linhas = [];
    ra.resultado.indices.forEach(i => linhas.push(Object.assign({}, i, { grupo: 'Coeficientes — ' + i.grupo })));
    // análises extras a partir dos mesmos números
    const ind = n => (ra.resultado.indices.find(i => i.nome === n) || {}).valor;
    const ml = ind('Margem Líquida'), giro = ind('Índice de Giro do Ativo');
    const mult = plAj > 0 ? at / plAj : null;
    linhas.push({ grupo: 'DuPont (decomposição do ROE)', nome: 'Margem líquida', valor: ml, unidade: '%', formula: 'Lucro líquido ÷ Receita líquida', nota: '' });
    linhas.push({ grupo: 'DuPont (decomposição do ROE)', nome: 'Giro do ativo', valor: giro, unidade: 'x', formula: 'Receita líquida ÷ Ativo total', nota: '' });
    linhas.push({ grupo: 'DuPont (decomposição do ROE)', nome: 'Multiplicador de alavancagem', valor: mult === null ? null : Math.round(mult * 10000) / 10000, unidade: 'x', formula: 'Ativo total ÷ Patrimônio líquido', nota: '' });
    linhas.push({ grupo: 'DuPont (decomposição do ROE)', nome: 'ROE = margem × giro × alavancagem', valor: (ml === null || giro === null || mult === null) ? null : Math.round(ml * giro * mult * 10000) / 10000, unidade: '%', formula: 'Margem líquida × Giro do ativo × Multiplicador', nota: 'dá o mesmo ROE da linha de rentabilidade (lucro líquido ÷ PL).' });
    const ncg = val.clientes + val.estoques - val.fornecedores, cdg = plAj + val.elp - val.ativoNaoCirculante, st = cdg - ncg;
    linhas.push({ grupo: 'Capital de giro (versão simplificada de Fleuriet)', nome: 'Necessidade de capital de giro (NCG)', valor: ncg, unidade: 'R$', formula: 'Clientes + Estoques − Fornecedores', nota: 'versão simplificada: só considera clientes, estoques e fornecedores como contas cíclicas.' });
    linhas.push({ grupo: 'Capital de giro (versão simplificada de Fleuriet)', nome: 'Capital de giro (CDG)', valor: cdg, unidade: 'R$', formula: 'Patrimônio líquido + Passivo não circulante − Ativo não circulante', nota: '' });
    linhas.push({ grupo: 'Capital de giro (versão simplificada de Fleuriet)', nome: 'Saldo de tesouraria (T)', valor: st, unidade: 'R$', formula: 'CDG − NCG', nota: st >= 0 ? 'positivo: o capital de giro cobre a necessidade.' : 'negativo: a empresa depende de dívida de curto prazo para financiar o giro.' });
    rb.resultado.indices.filter(i => !/^ROE|^ROA/.test(i.nome)).forEach(i => linhas.push(Object.assign({}, i, { grupo: 'EBITDA, retornos e EVA — ' + i.grupo })));
    linhas.push({ grupo: 'Conferências do balancete', nome: 'Ativo total', valor: at, unidade: 'R$', formula: 'Ativo circulante + Ativo não circulante', nota: '' });
    linhas.push({ grupo: 'Conferências do balancete', nome: 'Passivo + PL (com o resultado ainda não apurado)', valor: val.passivoCirculante + val.elp + plAj, unidade: 'R$', formula: 'Passivo circulante + Passivo não circulante + (PL + resultado do exercício)', nota: 'deve ser igual ao ativo total.' });
    linhas.push({ grupo: 'Conferências do balancete', nome: 'Resultado do exercício no balancete (receitas − custos e despesas)', valor: resBal, unidade: 'R$', formula: 'Contas de resultado 3 e 4', nota: 'não está dentro do PL do balancete até a apuração; é somado ao PL nas análises.' });
    (ra.avisos || []).slice(1).forEach(a => avisos.push(a)); (rb.avisos || []).slice(1).forEach(a => avisos.push(a));
    avisos.push('Período acumulado de ' + mes + ' mês(es) do exercício (' + dias + ' dias nos prazos): margens e retornos NÃO estão anualizados.');
    return { eid, periodo: pe, linhas, avisos, origem, kanitz: ra.resultado.kanitz, dias, mes, plAj, resBal };
  }

  // ───────────── telas ─────────────
  const fv = (v, u) => v === null || v === undefined ? '<span style="color:var(--slate)">não se aplica</span>' : (u === 'R$' ? brl(v) : u === '%' ? f2(v, 2) + '%' : u === 'dias' ? f2(v, 1) + ' dias' : u === 'pp' ? f2(v, 2) + ' p.p.' : f2(v, 4));
  function listaHtml(res) {
    let g = '', h = '';
    res.linhas.forEach((i, n) => {
      if (i.grupo !== g) { g = i.grupo; h += `<tr><td colspan="3" style="background:var(--ink2);color:#fff;font-weight:700;font-size:12px;padding:5px 8px">${E(g)}</td></tr>`; }
      h += `<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px"><b>${E(i.nome)}</b>${i.nota ? `<div style="font-size:11px;color:var(--slate)">${E(i.nota)}</div>` : ''}</td><td style="padding:5px 8px;font-size:11.5px;color:var(--slate)">${E(i.formula)}</td><td style="padding:5px 8px;text-align:right;white-space:nowrap"><b>${fv(i.valor, i.unidade)}</b></td></tr>`;
    });
    const kz = res.kanitz && res.kanitz.valor !== null ? `<div style="margin:8px 0;padding:8px 10px;border:1px solid var(--border);border-radius:6px"><b>Fator de insolvência (Kanitz): ${f2(res.kanitz.valor, 2)} — ${E(res.kanitz.faixa)}</b></div>` : '';
    return kz + `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th style="text-align:left;padding:5px 8px">Análise</th><th style="text-align:left;padding:5px 8px">Fórmula</th><th style="text-align:right;padding:5px 8px">Resultado</th></tr></thead><tbody>${h}</tbody></table></div>`;
  }
  function origemHtml(res) {
    const rows = res.origem.map(o => `<tr style="border-top:1px solid var(--border)"><td style="padding:4px 8px">${E(o.v.l)}</td><td style="padding:4px 8px;font-size:11.5px">${o.r.usadas.length ? o.r.usadas.map(u => E(u.cod + ' ' + u.desc)).join('<br>') : '<span style="color:var(--slate)">— sem contas —</span>'}</td><td style="padding:4px 8px;text-align:right;white-space:nowrap">${brl(o.r.cents)}</td></tr>`).join('');
    return `<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Contas usadas em cada valor (origem)</summary><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><tbody>${rows}</tbody></table></div></details>`;
  }
  function formContasHtml(eid, cfg) {
    const chart = AN.chart[eid] || [], desc = {}; chart.forEach(a => { desc[a.classification] = a.description; });
    let g = '', rows = '';
    VARS.forEach(v => {
      if (v.g !== g) { g = v.g; rows += `<tr><td colspan="3" style="background:var(--ink2);color:#fff;font-weight:700;font-size:12px;padding:5px 8px">${E(g)}</td></tr>`; }
      const cods = cfg && cfg.contas && cfg.contas[v.k] ? cfg.contas[v.k] : (cfg ? [] : v.padrao);
      rows += `<tr style="border-top:1px solid var(--border)"><td style="padding:5px 8px;max-width:340px"><b>${E(v.l)}</b><div style="font-size:11px;color:var(--slate)">usada em: ${E(v.uso)}</div></td>
        <td style="padding:5px 8px;min-width:240px"><input class="fi" id="anC_${eid}_${v.k}" value="${E(cods.join(', '))}" placeholder="${v.opc ? 'opcional' : 'ex.: 1.1.1'}" style="font-size:12px" oninput="anCodigosMudou('${eid}','${v.k}')"><div id="anD_${eid}_${v.k}" style="font-size:11px;color:var(--slate);margin-top:2px">${cods.map(c => E(c + ' ' + (desc[c] || ''))).join(' · ')}</div></td>
        <td style="padding:5px 8px;white-space:nowrap"><button class="btn bo bsm" onclick="anEscolher('${eid}','${v.k}')" ${chart.length ? '' : 'disabled title="Importe um balancete para listar as contas da empresa"'}>Escolher…</button></td></tr>`;
    });
    return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><tbody>${rows}</tbody></table></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;align-items:end">
        <div><label class="fl" style="font-size:11px">Custo do capital próprio — Ke (% ao ano)</label><input class="fi" id="anKe_${eid}" value="${E(cfg && cfg.ke || '')}" style="width:130px" placeholder="ex.: 15"></div>
        <div><label class="fl" style="font-size:11px">Custo da dívida antes do IR — Kd (% ao ano)</label><input class="fi" id="anKd_${eid}" value="${E(cfg && cfg.kd || '')}" style="width:130px" placeholder="ex.: 12"></div>
        <div><label class="fl" style="font-size:11px">Alíquota IR/CSLL (%)</label><input class="fi" id="anAl_${eid}" value="${E(cfg && cfg.aliq || '34')}" style="width:90px"></div>
        <label style="font-size:12px"><input type="checkbox" id="anMed_${eid}" ${cfg && cfg.medios ? 'checked' : ''}> Usar saldos médios (precisa do balancete de dezembro do ano anterior)</label>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn bp bsm" onclick="anSalvarContas('${eid}')">💾 Salvar contas</button>
        <button class="btn bo bsm" onclick="anSugerir('${eid}')" ${chart.length ? '' : 'disabled'} title="Procura no plano de contas do balancete importado as contas que faltam, pelo nome">✨ Sugerir pelo plano da empresa</button>
        ${cfg ? `<button class="btn bo bsm" onclick="anCancelarEdicao('${eid}')">Cancelar</button>` : ''}</div>`;
  }
  function cartaoHtml(eid) {
    const e = emp(eid), cfg = cfgGet(eid), aberto = !!AN.aberto[eid], ed = AN.editando[eid] || !cfg;
    let corpo = '';
    if (aberto) {
      const per = AN.periodos[eid] || [], pe = AN.periodo[eid] || '';
      corpo += `<div style="margin-top:12px"><div style="font-weight:700;color:#1E3558;margin-bottom:6px">1) Contas contábeis das análises ${cfg ? '<span style="color:var(--green);font-weight:600">✓ definidas</span>' : '<span style="color:#d97706;font-weight:600">— defina antes de tudo</span>'}</div>`;
      if (ed) corpo += `<div style="font-size:12px;color:var(--slate);margin-bottom:8px">Informe a classificação de cada conta (ex.: 1.1.1). Já vêm preenchidas as do plano padrão JJR — confira. Se a empresa tem plano diferente, ajuste (o botão “Escolher…” lista as contas do balancete importado). Contas “filhas” de uma conta já escolhida não são somadas de novo.</div>` + formContasHtml(eid, cfg);
      else corpo += `<div style="font-size:12px;color:var(--slate)">${VARS.filter(v => ((cfg.contas || {})[v.k] || []).length).length} de ${VARS.length} valores com contas definidas. <button class="btn bo bsm" onclick="anEditar('${eid}')">✎ Editar contas</button></div>`;
      corpo += '</div>';
      corpo += `<div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--border);${cfg ? '' : 'opacity:.5;pointer-events:none'}"><div style="font-weight:700;color:#1E3558;margin-bottom:6px">2) Demonstrativos do mês</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn bp bsm" onclick="CtbImport.abrir('${eid}','TRIAL_BALANCE')">📥 Importar balancete (PDF do Domínio)</button><button class="btn bo bsm" onclick="CtbImport.daPasta('${eid}','TRIAL_BALANCE')">📂 Ler da pasta Balancete</button><button class="btn bo bsm" onclick="anAtualizar('${eid}')">↻ Atualizar lista de meses</button></div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label style="font-size:12px;font-weight:600">Mês do balancete:</label><select class="si" id="anPer_${eid}" onchange="anPeriodo('${eid}',this.value)">${per.length ? per.map(p => `<option value="${E(p.period_end)}" ${p.period_end === pe ? 'selected' : ''}>${E(compBr(p.period_end))}</option>`).join('') : '<option value="">— nenhum balancete importado —</option>'}</select></div></div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--border);${cfg ? '' : 'opacity:.5;pointer-events:none'}"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div style="font-weight:700;color:#1E3558">3) Análises</div><button class="btn bp bsm" id="anBtn_${eid}" onclick="anCalcular('${eid}')" ${AN.ocupado[eid] ? 'disabled' : ''}>⚙ Calcular todas</button>
          ${AN.resultado[eid] ? `<button class="action-btn action-btn-excel" onclick="anExcel('${eid}')">📊 Excel</button><button class="action-btn action-btn-pdf" onclick="anImprimir('${eid}')">🖨️ PDF</button>` : ''}</div>
          <div id="anMsg_${eid}" style="font-size:12px;margin:6px 0"></div><div id="anRes_${eid}">${AN.resultado[eid] ? resultadoHtml(eid) : ''}</div></div>`;
    }
    return `<div style="background:var(--white);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="anToggle('${eid}')"><span style="color:var(--slate)">${aberto ? '▾' : '▸'}</span><b>#${E(eid)} - ${E(e ? e.nome : '')}</b><span style="font-family:monospace;color:var(--slate);font-size:12px">${E(e ? e.cnpj || '' : '')}</span>
        <span style="font-size:11px;border-radius:10px;padding:2px 8px;${cfg ? 'background:#16a34a22;color:#16a34a' : 'background:#d9770622;color:#d97706'}">${cfg ? 'Contas definidas' : 'Definir contas'}</span>
        <span style="flex:1"></span><button class="icon-btn" onclick="event.stopPropagation();excluirEmpresaMenu('analises','${eid}')" title="Remover da lista" style="border:none;background:none;cursor:pointer;color:var(--slate)">🗑</button></div>${corpo}</div>`;
  }
  function resultadoHtml(eid) {
    const res = AN.resultado[eid]; if (!res) return '';
    return `<div style="font-size:12px;color:var(--slate);margin-bottom:6px">Balancete de <b>${E(compBr(res.periodo))}</b> — acumulado do exercício (${res.mes} mês(es)).</div>${res.avisos.length ? `<div style="font-size:11.5px;color:#d97706;margin-bottom:8px">${res.avisos.map(a => '⚠ ' + E(a)).join('<br>')}</div>` : ''}${listaHtml(res)}${origemHtml(res)}`;
  }
  window.renderAnalisesLista = function () {
    const cont = document.getElementById('analisesListaContainer'); if (!cont) return;
    const adic = ensureMenuAdicionadasMigrado('analises'); const eids = Object.keys(adic).sort((a, b) => Number(a) - Number(b));
    let lista = eids;
    if (typeof _empresaGlobal !== 'undefined' && _empresaGlobal) lista = eids.filter(x => x === String(_empresaGlobal));
    cont.innerHTML = lista.length ? lista.map(cartaoHtml).join('') : '<div style="text-align:center;color:var(--slate);padding:40px 20px">Nenhuma empresa na lista. Inclua uma empresa acima para começar: primeiro você define as contas contábeis, depois importa o balancete do mês.</div>';
  };

  // ───────────── ações ─────────────
  const reabrir = eid => window.renderAnalisesLista();
  window.anToggle = async function (eid) {
    AN.aberto[eid] = !AN.aberto[eid]; reabrir(eid);
    if (AN.aberto[eid] && !AN.carregou[eid]) { try { await carregarPeriodos(eid); } catch (e) { console.warn(e); } reabrir(eid); }
  };
  window.anEditar = eid => { AN.editando[eid] = true; reabrir(eid); };
  window.anCancelarEdicao = eid => { AN.editando[eid] = false; reabrir(eid); };
  window.anAtualizar = async eid => { try { await carregarPeriodos(eid); toast('Lista de meses atualizada.', 'ok'); } catch (e) { toast('Erro: ' + e.message, 'err'); } reabrir(eid); };
  window.anPeriodo = (eid, v) => { AN.periodo[eid] = v; };
  window.anCodigosMudou = (eid, k) => {
    const el = document.getElementById('anC_' + eid + '_' + k), dv = document.getElementById('anD_' + eid + '_' + k); if (!el || !dv) return;
    const desc = {}; (AN.chart[eid] || []).forEach(a => { desc[a.classification] = a.description; });
    dv.innerHTML = lerCodigos(el.value).map(c => E(c + ' ' + (desc[c] || '(conta não encontrada no balancete importado)'))).join(' · ');
  };
  const lerCodigos = t => [...new Set(String(t || '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean))];
  window.anSalvarContas = function (eid) {
    const contas = {}; VARS.forEach(v => { contas[v.k] = lerCodigos((document.getElementById('anC_' + eid + '_' + v.k) || {}).value); });
    for (const k of ['ativoCirculante', 'ativoNaoCirculante', 'passivoCirculante', 'patrimonioLiquido', 'receitaBruta', 'cmv']) if (!contas[k].length) { toast('Defina as contas de: ' + VARS.find(v => v.k === k).l, 'warn'); return; }
    const g = id => (document.getElementById(id) || {}).value || '';
    cfgSet(eid, { v: 1, contas, ke: g('anKe_' + eid).trim(), kd: g('anKd_' + eid).trim(), aliq: g('anAl_' + eid).trim() || '34', medios: !!(document.getElementById('anMed_' + eid) || {}).checked, salvoEm: new Date().toISOString(), por: (typeof currentUser !== 'undefined' && currentUser && (currentUser.nome || currentUser.login)) || '' });
    AN.editando[eid] = false; toast('Contas salvas.', 'ok'); reabrir(eid);
  };
  window.anSugerir = function (eid) {
    const chart = AN.chart[eid] || []; let n = 0;
    Object.keys(SUGESTOES).forEach(k => {
      const s = SUGESTOES[k], el = document.getElementById('anC_' + eid + '_' + k); if (!el || lerCodigos(el.value).length) return;
      const ach = chart.filter(a => (a.classification === s.raiz || a.classification.startsWith(s.raiz + '.') || s.raiz === '4' && a.classification.startsWith('4')) && (!s.analitica || a.is_analytic) && s.re.test(a.description)).map(a => a.classification);
      const filtrado = ach.filter(c => !ach.some(o => ehDescendente(c, o)));
      if (filtrado.length) { el.value = filtrado.slice(0, 8).join(', '); window.anCodigosMudou(eid, k); n++; }
    });
    toast(n ? n + ' campo(s) preenchido(s) pelo nome das contas — confira antes de salvar.' : 'Nada novo encontrado pelo nome das contas.', n ? 'ok' : 'info');
  };
  window.anEscolher = function (eid, k) {
    const chart = AN.chart[eid] || [], v = VARS.find(x => x.k === k), sel = new Set(lerCodigos((document.getElementById('anC_' + eid + '_' + k) || {}).value));
    document.getElementById('anOv')?.remove();
    const ov = document.createElement('div'); ov.id = 'anOv'; ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = `<div style="background:var(--white);color:var(--ink);border-radius:10px;max-width:760px;width:100%;max-height:86vh;display:flex;flex-direction:column;padding:14px"><div style="font-weight:700;margin-bottom:6px">Escolher contas — ${E(v.l)}</div>
      <input class="fi" id="anBusca" placeholder="🔍 filtrar por código ou nome…" oninput="anFiltroPicker()" style="margin-bottom:8px"><div id="anLista" style="overflow:auto;flex:1;border:1px solid var(--border);border-radius:6px;padding:4px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn bo" onclick="document.getElementById('anOv').remove()">Cancelar</button><button class="btn bp" onclick="anPickerOk('${eid}','${k}')">Usar as marcadas</button></div></div>`;
    document.body.appendChild(ov); ov._chart = chart; ov._sel = sel; window.anFiltroPicker();
  };
  window.anFiltroPicker = function () {
    const ov = document.getElementById('anOv'); if (!ov) return; const t = ((document.getElementById('anBusca') || {}).value || '').toLowerCase();
    document.getElementById('anLista').innerHTML = ov._chart.filter(a => !t || (a.classification + ' ' + a.description).toLowerCase().includes(t)).slice(0, 400).map(a => `<label style="display:flex;gap:6px;align-items:center;font-size:12px;padding:2px 4px;padding-left:${4 + (a.level || 1) * 10}px"><input type="checkbox" value="${E(a.classification)}" ${ov._sel.has(a.classification) ? 'checked' : ''} onchange="anPickerMarca(this)"> <span style="font-family:monospace">${E(a.classification)}</span> ${a.is_analytic ? '' : '<b>'}${E(a.description)}${a.is_analytic ? '' : '</b>'}</label>`).join('');
  };
  window.anPickerMarca = cb => { const ov = document.getElementById('anOv'); if (cb.checked) ov._sel.add(cb.value); else ov._sel.delete(cb.value); };
  window.anPickerOk = function (eid, k) { const ov = document.getElementById('anOv'); const el = document.getElementById('anC_' + eid + '_' + k); el.value = [...ov._sel].sort().join(', '); ov.remove(); window.anCodigosMudou(eid, k); };
  window.anCalcular = async function (eid) {
    const msg = document.getElementById('anMsg_' + eid); AN.ocupado[eid] = true; if (msg) { msg.style.color = 'var(--slate)'; msg.textContent = 'Lendo o balancete e calculando…'; }
    try { AN.resultado[eid] = await calcularTudo(eid); AN.ocupado[eid] = false; reabrir(eid); const m2 = document.getElementById('anMsg_' + eid); if (m2) { m2.style.color = '#16a34a'; m2.textContent = AN.resultado[eid].linhas.length + ' análises calculadas.'; } }
    catch (e) { AN.ocupado[eid] = false; console.error(e); const m2 = document.getElementById('anMsg_' + eid); if (m2) { m2.style.color = '#dc2626'; m2.textContent = e.message || String(e); } const b = document.getElementById('anBtn_' + eid); if (b) b.disabled = false; }
  };
  const dadosPlanilha = eid => { const r = AN.resultado[eid], e = emp(eid); const aoa = [['Análises Contábeis'], ['Empresa', '#' + eid + ' - ' + (e ? e.nome : '')], ['Balancete de', compBr(r.periodo) + ' (acumulado do exercício, ' + r.mes + ' mês(es))'], [], ['Grupo', 'Análise', 'Fórmula', 'Resultado', 'Unidade', 'Observação']];
    r.linhas.forEach(i => aoa.push([i.grupo, i.nome, i.formula, i.valor === null ? 'não se aplica' : (i.unidade === 'R$' ? i.valor / 100 : i.valor), i.unidade === 'x' ? 'vezes' : i.unidade, i.nota || '']));
    aoa.push([]); r.avisos.forEach(a => aoa.push(['Aviso', a])); return aoa; };
  window.anExcel = function (eid) {
    if (!AN.resultado[eid]) return; const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(dadosPlanilha(eid)); ws['!cols'] = [{ wch: 34 }, { wch: 52 }, { wch: 70 }, { wch: 18 }, { wch: 10 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Análises'); XLSX.writeFile(wb, 'Analises_Contabeis_' + eid + '_' + AN.resultado[eid].periodo + '.xlsx');
  };
  window.anImprimir = function (eid) {
    const r = AN.resultado[eid]; if (!r) return; const e = emp(eid), w = window.open('', '_blank'); if (!w) { toast('Libere pop-ups para imprimir.', 'err'); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Análises Contábeis</title><style>body{font:12px Arial,sans-serif;margin:20px;color:#111}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:3px 6px;text-align:left;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}tr.g td{background:#eee;font-weight:700}</style><h2>Análises Contábeis</h2><p><b>#' + E(eid) + ' - ' + E(e ? e.nome : '') + '</b><br>Balancete de ' + E(compBr(r.periodo)) + ' — acumulado do exercício (' + r.mes + ' mês(es))</p>' + (r.avisos.length ? '<p>' + r.avisos.map(a => '⚠ ' + E(a)).join('<br>') + '</p>' : '') + (() => { let g = '', h = ''; r.linhas.forEach(i => { if (i.grupo !== g) { g = i.grupo; h += '<tr class="g"><td colspan="3">' + E(g) + '</td></tr>'; } h += '<tr><td><b>' + E(i.nome) + '</b>' + (i.nota ? '<br><small>' + E(i.nota) + '</small>' : '') + '</td><td><small>' + E(i.formula) + '</small></td><td><b>' + fv(i.valor, i.unidade).replace(/<[^>]+>/g, '') + '</b></td></tr>'; }); return '<table>' + h + '</table>'; })());
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
})();

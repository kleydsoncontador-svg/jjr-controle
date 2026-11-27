/* Módulo MODELOS — Estoque (pedido do usuário 27/11/2026): layouts que a contabilidade pede ao fornecedor do ERP de estoque do
   cliente, com base no CPC 16 (R1) / NBC TG 16 — Estoques e no RIR/2018 (custo médio ponderado ou PEPS; UEPS vedado).
   Três modelos:
   • Revenda — completo: resumo mensal por produto (entradas e saídas por natureza, a custo, com conferência) + movimentos por nota
     + em poder de terceiros + resumo contábil.
   • Revenda — simplificado: resumo mensal por produto (entradas, CMV, outras saídas) + detalhe das outras saídas + resumo contábil.
     Sem remessas (entrada e saída de remessa não entram — pedido do usuário).
   • Indústria: matérias-primas → produtos em elaboração (MP + mão de obra direta + custos indiretos) → produtos acabados (CPV),
     com as conferências entre as etapas.
   Uso e consumo NÃO entra nos estoques de revenda (pedido do usuário): mercadoria retirada para uso próprio vai em "Outras saídas". */
(function (root) {
  const TITULO = 'JJR CONSULTORIA CONTÁBIL SS';
  const COR = { tit: 'FF0F7B6C', cab: 'FF1E293B', grp: 'FF334155', inp: 'FFFFF7D6', calc: 'FFEFF3F6', borda: 'FFCBD5E1', ent: 'FFDCFCE7', sai: 'FFFEE2E2', sld: 'FFE0F2FE' };
  const borda = { top: { style: 'thin', color: { argb: COR.borda } }, left: { style: 'thin', color: { argb: COR.borda } }, bottom: { style: 'thin', color: { argb: COR.borda } }, right: { style: 'thin', color: { argb: COR.borda } } };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const FMT_V = '#,##0.00;[Red]-#,##0.00', FMT_Q = '#,##0.####;[Red]-#,##0.####', FMT_U = '#,##0.0000;[Red]-#,##0.0000';
  const FMT_DOC = '[<=99999999999]000"."000"."000"-"00;00"."000"."000"/"0000"-"00';
  const letra = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const N_LIN = 3000;
  const CMV = 'D CMV / C Estoque (CPC 16 item 34)';
  const PERDA = 'Perda NORMAL (manuseio/transporte) → custo; perda ANORMAL → outras despesas operacionais (CPC 16 item 16). Fiscal: dedutível só se comprovada (laudo, BO ou termo de inutilização — RIR/2018 art. 303)';
  const DOAC = 'D Despesa (doações / brindes / propaganda) / C Estoque — NÃO é CMV. Doação e brinde são indedutíveis em regra (Lei 9.249/95 art. 13)';
  // naturezas: [chave, rótulo, E/S, contabilização]
  const MODELOS = {
    revenda: {
      nome: 'Estoque — revenda (completo)', arq: 'Modelo Estoque Revenda Completo',
      desc: 'Comércio. Resumo mensal por produto com entradas e saídas separadas por natureza (a custo, com conferência), movimentos por nota fiscal, estoque em poder de terceiros e resumo contábil.',
      abas: [{ nome: 'Resumo por produto', sub: 'Mercadorias para revenda — resumo mensal por produto (quantidade e valor de CUSTO)', fixas: [['Código do produto', 14], ['Descrição', 38], ['NCM', 11], ['Unidade', 8]], nat: [
        ['compra', 'Compras (custo de aquisição)', 'E', 'D Estoque / C Fornecedores — custo = preço + frete + seguro + IPI/ICMS-ST não recuperáveis − descontos − ICMS/PIS/COFINS recuperáveis (CPC 16 item 11)'],
        ['devvenda', 'Devoluções de vendas', 'E', 'D Estoque / C CMV (volta pelo custo da saída original)'],
        ['bonif', 'Bonificações recebidas', 'E', 'Entra em quantidade com custo zero: dilui o custo médio'],
        ['outent', 'Outras entradas (transferências, ajustes de inventário +)', 'E', 'D Estoque / C conta de origem (transferência) ou ajuste de inventário (sobra)'],
        ['venda', 'Vendas — custo (CMV)', 'S', CMV],
        ['devcompra', 'Devoluções de compras', 'S', 'D Fornecedores / C Estoque (estorno da compra — não é custo)'],
        ['perda', 'Perdas, avarias, quebras, vencidos', 'S', PERDA],
        ['doacao', 'Doações, brindes e amostras', 'S', DOAC],
        ['outsai', 'Outras saídas (transferências, ajustes de inventário −, retirada para uso próprio)', 'S', 'D conta de destino (transferência, ajuste de inventário ou despesa, se for retirada para uso próprio) / C Estoque']] }],
      movimentos: true, terceiros: true
    },
    simples: {
      nome: 'Estoque — revenda (simplificado)', arq: 'Modelo Estoque Revenda Simplificado',
      desc: 'Comércio, versão enxuta: por produto, saldo inicial, entradas, custo das vendas (CMV), outras saídas e saldo final (a custo, com conferência). As outras saídas são detalhadas numa aba própria. Sem remessas.',
      abas: [{ nome: 'Resumo por produto', sub: 'Mercadorias para revenda — resumo mensal por produto (versão simplificada)', fixas: [['Código do produto', 14], ['Descrição', 38], ['NCM', 11], ['Unidade', 8]], nat: [
        ['entrada', 'Entradas (compras, devoluções de vendas e bonificações)', 'E', 'D Estoque / C Fornecedores ou CMV (devolução de venda). Compra a custo: preço + frete + seguro + IPI/ICMS-ST não recuperáveis − descontos − impostos recuperáveis'],
        ['venda', 'Vendas — custo (CMV)', 'S', CMV],
        ['outsai', 'Outras saídas (perdas, devoluções de compras, doações, ajustes) — detalhar na aba "Outras saídas"', 'S', 'Cada tipo tem uma contabilização: perda (custo ou despesa), devolução de compra (estorno), doação/brinde (despesa indedutível), ajuste de inventário']] }],
      outrasSaidas: true
    },
    industria: {
      nome: 'Estoque — indústria', arq: 'Modelo Estoque Industria',
      desc: 'Indústria: matérias-primas → produtos em elaboração (matéria-prima + mão de obra direta + custos indiretos) → produtos acabados (custo dos produtos vendidos), com conferência entre as etapas.',
      abas: [
        { nome: 'Matérias-primas', sub: 'Matérias-primas, materiais secundários e embalagens — resumo mensal (a custo)', fixas: [['Código', 14], ['Descrição', 38], ['NCM', 11], ['Unidade', 8]], nat: [
          ['compra', 'Compras (custo de aquisição)', 'E', 'D Estoque de matérias-primas / C Fornecedores — custo sem os impostos recuperáveis (ICMS, IPI, PIS, COFINS)'],
          ['outent', 'Outras entradas (sobras que voltam da produção, ajustes +)', 'E', 'D Matérias-primas / C Produtos em elaboração (sobra) ou ajuste de inventário'],
          ['requis', 'Requisições para a produção (consumo)', 'S', 'D Produtos em elaboração / C Matérias-primas — tem que bater com "Matéria-prima requisitada" da aba Em elaboração'],
          ['devcompra', 'Devoluções de compras', 'S', 'D Fornecedores / C Matérias-primas (estorno da compra)'],
          ['perda', 'Perdas, avarias, vencidos', 'S', PERDA],
          ['outsai', 'Outras saídas (venda de matéria-prima, transferências, ajustes −)', 'S', 'Venda de matéria-prima: D Custo das vendas / C Matérias-primas; demais: conta de destino']] },
        { nome: 'Em elaboração', sub: 'Produtos em elaboração — por ordem de produção ou produto (a custo). Quantidade: preencha só se fizer sentido', fixas: [['Ordem de produção / produto', 18], ['Descrição', 38], ['Unidade', 8]], nat: [
          ['mp', 'Matéria-prima requisitada', 'E', 'Vem da aba Matérias-primas (requisições)'],
          ['mod', 'Mão de obra direta (salários e encargos da produção)', 'E', 'D Produtos em elaboração / C Custo da mão de obra da produção (CPC 16 item 12)'],
          ['cif', 'Custos indiretos de fabricação (energia, depreciação, manutenção, aluguel da fábrica…)', 'E', 'D Produtos em elaboração / C Custos indiretos — os fixos alocados pela capacidade normal; a parte ociosa vai para despesa (CPC 16 item 13)'],
          ['acab', 'Transferido para produtos acabados (custo da produção)', 'S', 'D Produtos acabados / C Produtos em elaboração — tem que bater com "Produção do período" da aba Acabados'],
          ['perda', 'Perdas anormais na produção', 'S', 'D Outras despesas operacionais / C Produtos em elaboração (CPC 16 item 16)']] },
        { nome: 'Produtos acabados', sub: 'Produtos acabados — resumo mensal por produto (a custo)', fixas: [['Código do produto', 14], ['Descrição', 38], ['NCM', 11], ['Unidade', 8]], nat: [
          ['prod', 'Produção do período (vinda de Em elaboração)', 'E', 'D Produtos acabados / C Produtos em elaboração'],
          ['devvenda', 'Devoluções de vendas', 'E', 'D Produtos acabados / C Custo dos produtos vendidos'],
          ['outent', 'Outras entradas (ajustes de inventário +)', 'E', 'D Produtos acabados / C ajuste de inventário'],
          ['venda', 'Vendas — custo (CPV)', 'S', 'D Custo dos produtos vendidos / C Produtos acabados (CPC 16 item 34)'],
          ['perda', 'Perdas, avarias, vencidos', 'S', PERDA],
          ['doacao', 'Doações, brindes e amostras', 'S', DOAC],
          ['outsai', 'Outras saídas (transferências, ajustes de inventário −)', 'S', 'D conta de destino / C Produtos acabados']] }],
      movimentos: true, terceiros: true, industria: true
    }
  };
  const ORDEM_EST = ['revenda', 'simples', 'industria'];

  function cabecalho(ws, ult, sub, emp, metodo) {
    ws.mergeCells('A1:' + ult + '1'); const t = ws.getCell('A1'); t.value = TITULO; t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; t.fill = fill(COR.tit); t.alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(1).height = 30;
    ws.mergeCells('A2:' + ult + '2'); const t2 = ws.getCell('A2'); t2.value = sub; t2.font = { bold: true, size: 12, color: { argb: COR.grp } }; t2.alignment = { horizontal: 'center' };
    const lbl = (c, v) => { const x = ws.getCell(c); x.value = v; x.font = { bold: true, color: { argb: COR.grp } }; x.alignment = { horizontal: 'right' }; };
    const inp = (c, v, fmt) => { const x = ws.getCell(c); if (v != null) x.value = v; x.fill = fill(COR.inp); x.border = borda; if (fmt) x.numFmt = fmt; };
    lbl('B4', 'Empresa:'); ws.mergeCells('C4:F4'); inp('C4', emp ? emp.nome : null);
    lbl('B5', 'CNPJ:'); ws.mergeCells('C5:D5'); inp('C5', emp ? (typeof _fmtCnpjCpf === 'function' ? _fmtCnpjCpf(emp.cnpjNum || emp.cnpj || '') : '') : null);
    lbl('B6', 'Mês de referência:'); inp('C6', null, 'mm/yyyy');
    if (metodo !== false) {
      lbl('B7', 'Método de custo:'); ws.mergeCells('C7:D7'); inp('C7', 'Custo médio ponderado móvel (a cada entrada)');
      ws.getCell('C7').dataValidation = { type: 'list', allowBlank: false, formulae: ['"Custo médio ponderado móvel (a cada entrada),Custo médio ponderado mensal (fim do mês),PEPS (primeiro que entra primeiro que sai)"'], showErrorMessage: true, errorTitle: 'Método', error: 'O CPC 16 e o RIR/2018 só aceitam custo médio ponderado ou PEPS (UEPS é vedado).' };
    }
  }
  function cabTabela(ws, row, cols) { const hr = ws.getRow(row); hr.height = 44; cols.forEach((c, i) => { const x = hr.getCell(i + 1); x.value = c[0]; x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }; x.fill = fill(COR.cab); x.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }; x.border = borda; }); }

  // aba de movimentação mensal: saldo inicial + entradas − saídas = saldo final (do ERP), com custo médio e conferência
  function abaMov(wb, A, emp, cor) {
    const ws = wb.addWorksheet(A.nome, { views: [{ state: 'frozen', xSplit: 2, ySplit: 13 }], properties: { tabColor: { argb: cor } }, pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    const fixas = A.fixas, grupos = [['Saldo inicial', 'sld', 'ini']].concat(A.nat.map(n => [n[1], n[2] === 'E' ? 'ent' : 'sai', n[0]])).concat([['Saldo final (do sistema)', 'sld', 'fim']]);
    fixas.forEach((f, i) => ws.getColumn(i + 1).width = f[1]);
    let col = fixas.length; const pos = {};
    grupos.forEach(g => { pos[g[2]] = col; ws.getColumn(col + 1).width = 12; ws.getColumn(col + 2).width = 15; col += 2; });
    const cMed = col, cCq = col + 1, cCv = col + 2; [cMed, cCq, cCv].forEach(c => ws.getColumn(c + 1).width = 15);
    const ult = letra(cCv);
    cabecalho(ws, ult, A.sub, emp);
    ws.mergeCells('H4:' + ult + '7'); const nt = ws.getCell('H4');
    nt.value = 'Uma linha por item. Entradas em verde, saídas em vermelho, sempre pelo CUSTO (nunca pelo preço de venda). Saldo final = saldo inicial + entradas − saídas: as duas colunas de Conferência, no fim, precisam dar zero. Veja a aba Instruções.';
    nt.font = { italic: true, size: 10, color: { argb: 'FF64748B' } }; nt.alignment = { wrapText: true, vertical: 'middle' };
    const R1 = 11, R2 = 12, RT = 13, INI = 14, FIM = INI + N_LIN - 1;
    fixas.forEach((f, i) => { ws.mergeCells(letra(i) + R1 + ':' + letra(i) + R2); ws.getCell(letra(i) + R1).value = f[0]; });
    grupos.forEach(g => { const a = letra(pos[g[2]]), b = letra(pos[g[2]] + 1); ws.mergeCells(a + R1 + ':' + b + R1); ws.getCell(a + R1).value = (g[1] === 'ent' ? 'ENTRADA — ' : g[1] === 'sai' ? 'SAÍDA — ' : '') + g[0]; ws.getCell(a + R2).value = 'Quantidade'; ws.getCell(b + R2).value = 'Valor (custo)'; });
    [[cMed, 'Custo médio unitário final'], [cCq, 'Conferência quantidade (tem que dar 0)'], [cCv, 'Conferência valor (tem que dar 0)']].forEach(([c, t]) => { const L = letra(c); ws.mergeCells(L + R1 + ':' + L + R2); ws.getCell(L + R1).value = t; });
    for (let c = 0; c <= cCv; c++) [R1, R2].forEach(r => { const x = ws.getCell(letra(c) + r); x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }; x.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }; x.border = borda;
      let cf = COR.cab; if (r === R1 && c >= fixas.length && c < cMed) { const g = grupos[Math.floor((c - fixas.length) / 2)]; cf = g[1] === 'ent' ? 'FF166534' : g[1] === 'sai' ? 'FF991B1B' : 'FF075985'; } x.fill = fill(cf); });
    ws.getRow(R1).height = 56; ws.getRow(R2).height = 18;
    ws.getCell('B' + RT).value = 'TOTAIS'; ws.getCell('B' + RT).font = { bold: true };
    for (let c = fixas.length; c <= cCv; c++) { if (c === cMed) continue; const L = letra(c), x = ws.getCell(L + RT); x.value = { formula: 'SUM(' + L + INI + ':' + L + FIM + ')' }; x.numFmt = (c - fixas.length) % 2 === 0 && c < cMed ? FMT_Q : FMT_V; x.font = { bold: true }; x.fill = fill(COR.calc); x.border = borda; }
    const ent = A.nat.filter(n => n[2] === 'E').map(n => n[0]), sai = A.nat.filter(n => n[2] === 'S').map(n => n[0]);
    const somaQ = (ks, r) => ks.map(k => letra(pos[k]) + r).join('+'), somaV = (ks, r) => ks.map(k => letra(pos[k] + 1) + r).join('+');
    for (let r = INI; r <= FIM; r++) {
      const row = ws.getRow(r);
      for (let c = 0; c <= cCv; c++) {
        const x = row.getCell(c + 1); x.border = borda;
        if (c >= fixas.length && c < cMed) { x.numFmt = (c - fixas.length) % 2 === 0 ? FMT_Q : FMT_V; const g = grupos[Math.floor((c - fixas.length) / 2)]; if (g[1] === 'ent') x.fill = fill(COR.ent); else if (g[1] === 'sai') x.fill = fill(COR.sai); }
      }
      if (r <= INI + 999) { // fórmulas nas primeiras 1.000 linhas (o resto fica livre para colar)
        const qf = letra(pos.fim) + r, vf = letra(pos.fim + 1) + r;
        row.getCell(cMed + 1).value = { formula: 'IF(N(' + qf + ')=0,"",' + vf + '/' + qf + ')' }; row.getCell(cMed + 1).numFmt = FMT_U; row.getCell(cMed + 1).fill = fill(COR.calc);
        row.getCell(cCq + 1).value = { formula: 'IF(A' + r + '="","",ROUND(' + letra(pos.ini) + r + '+' + somaQ(ent, r) + '-(' + somaQ(sai, r) + ')-' + qf + ',4))' }; row.getCell(cCq + 1).numFmt = FMT_Q; row.getCell(cCq + 1).fill = fill(COR.calc);
        row.getCell(cCv + 1).value = { formula: 'IF(A' + r + '="","",ROUND(' + letra(pos.ini + 1) + r + '+' + somaV(ent, r) + '-(' + somaV(sai, r) + ')-' + vf + ',2))' }; row.getCell(cCv + 1).numFmt = FMT_V; row.getCell(cCv + 1).fill = fill(COR.calc);
      }
    }
    [cCq, cCv].forEach(c => { const L = letra(c); ws.addConditionalFormatting({ ref: L + INI + ':' + L + (INI + 999), rules: [{ type: 'expression', formulae: ['AND(' + L + INI + '<>"",ABS(N(' + L + INI + '))>0.009)'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFCA5A5' } }, font: { bold: true, color: { argb: 'FF991B1B' } } } }] }); });
    return { ws, pos, RT, A };
  }

  async function montar(chave, eid) {
    const M = MODELOS[chave]; if (!M) throw new Error('modelo desconhecido');
    const emp = eid ? (S.emps().find(e => String(e.eid) === String(eid)) || null) : null;
    const wb = new ExcelJS.Workbook(); wb.creator = 'JJR Consultoria Contábil SS'; wb.created = new Date();
    // ── Instruções
    const wi = wb.addWorksheet('Instruções', { properties: { tabColor: { argb: COR.tit } } });
    wi.getColumn(1).width = 4; wi.getColumn(2).width = 120;
    cabecalho(wi, 'B', M.nome + ' — relatório para a contabilidade (CPC 16 / NBC TG 16)', emp, false);
    const txt = [['O QUE PRECISAMOS (todo mês, até o dia 10 do mês seguinte — período fechado do dia 1º ao último dia do mês)', true], ['Nos sistemas, este relatório costuma se chamar Kardex sintético, Razão auxiliar de estoque, Movimentação de estoque valorizada ou Demonstrativo de movimentação de estoque. Se o seu sistema já tiver um relatório padrão assim, ele pode ser usado, desde que traga as mesmas informações (por produto, quantidade e valor de custo).']];
    if (M.industria) txt.push(['1. Aba "Matérias-primas": por item, saldo inicial, compras, requisições para a produção e demais saídas, saldo final — quantidade e valor de CUSTO.'], ['2. Aba "Em elaboração": por ordem de produção (ou produto), a matéria-prima requisitada, a mão de obra direta, os custos indiretos e o que foi transferido para acabados.'], ['3. Aba "Produtos acabados": por produto, produção do período, vendas a custo (CPV), perdas, doações e saldo final.'], ['4. Abas "Movimentos" e "Em poder de terceiros": como no comércio — ligam o estoque às notas fiscais.']);
    else if (chave === 'simples') txt.push(['1. Aba "Resumo por produto": por produto, saldo inicial, total de entradas, custo das vendas (CMV), outras saídas e saldo final — quantidade e valor de CUSTO.'], ['2. Aba "Outras saídas": cada saída que NÃO é venda (perda, devolução de compra, doação, ajuste) com data, produto, quantidade, custo e motivo.'], ['• Remessas (demonstração, consignação, conserto) não entram neste modelo: não lance a saída nem o retorno.']);
    else txt.push(['1. Aba "Resumo por produto": uma linha por produto com saldo inicial, entradas e saídas separadas por natureza e saldo final — quantidade e valor de CUSTO.'], ['2. Aba "Movimentos": cada entrada e saída do mês com data, documento (nº da nota), CFOP, natureza, produto, quantidade e custo. É ela que liga o estoque às notas fiscais.'], ['3. Aba "Em poder de terceiros": mercadoria nossa que está fora (demonstração, consignação, conserto, armazém). Ela CONTINUA sendo estoque da empresa.']);
    txt.push(['REGRAS DE VALOR (CPC 16 e RIR/2018)', true],
      ['• Método de custo: custo médio ponderado (móvel, recalculado a cada entrada, ou mensal) ou PEPS. Informe no cabeçalho qual o sistema usa. O UEPS (último que entra, primeiro que sai) não é aceito.'],
      ['• Custo de compra = preço + frete + seguro + IPI e ICMS-ST que NÃO são recuperados − descontos − ICMS, PIS e COFINS que a empresa recupera (crédito).'],
      ['• Saídas sempre pelo CUSTO (médio do momento ou PEPS), nunca pelo preço de venda.'],
      ['• Saldo final = saldo inicial + entradas − saídas. A coluna "Conferência" precisa dar zero em quantidade e em valor.'],
      ['• O saldo final de dezembro precisa ser igual ao inventário do Bloco H da EFD (quantidade e valor por item).']);
    if (M.industria) txt.push(['CUSTO DE PRODUÇÃO (CPC 16 itens 12 a 16)', true], ['• Custo do produto = matéria-prima + mão de obra direta + custos indiretos de fabricação. Os custos indiretos FIXOS são distribuídos pela capacidade normal da fábrica; a parte de ociosidade vai para despesa, não para o estoque.'], ['• Despesas de vendas, administrativas, armazenagem de produto acabado e perdas anormais NÃO entram no custo do produto.'], ['• Lucro Real: o custo precisa vir de um sistema de custos integrado e coordenado com a contabilidade; sem ele, a Receita pode arbitrar o valor dos estoques (RIR/2018). A parte fiscal da produção (Bloco K da EFD) é tratada com o departamento fiscal.']);
    txt.push(['O QUE NÃO ENTRA COMO BAIXA DE ESTOQUE', true]);
    if (chave !== 'simples') txt.push(['• Remessa para demonstração, consignação, conserto ou industrialização: o produto sai fisicamente, mas continua sendo da empresa. Informe na aba "Em poder de terceiros" e NÃO desconte do saldo.'], ['• Mercadoria de terceiros em nosso poder (recebida em consignação, demonstração ou conserto) NÃO é estoque da empresa.']);
    if (!M.industria) txt.push(['• Material de uso e consumo (escritório, limpeza etc.) não faz parte do estoque de mercadorias. Se uma mercadoria de revenda for retirada para uso próprio, lance em "Outras saídas" e explique.']);
    txt.push(['SEPARAR SEMPRE (cada uma tem tratamento contábil e fiscal diferente)', true], ['• Venda (custo) · Perda/avaria/vencido · Doação, brinde e amostra · Devolução de compra · Ajustes de inventário. Não juntar tudo como "baixa".'], ['• Perdas e avarias: guardar laudo, boletim de ocorrência ou termo de inutilização — sem isso o valor não é dedutível no IRPJ/CSLL.']);
    txt.forEach((x, k) => { const c = wi.getCell('B' + (9 + k)); c.value = x[0]; c.alignment = { wrapText: true, vertical: 'top' }; if (x[1]) { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = fill(COR.grp); } });

    // ── abas de movimentação
    const cores = ['FF2563EB', 'FF7C3AED', 'FF0891B2'];
    const abas = M.abas.map((A, i) => abaMov(wb, A, emp, cores[i % 3]));
    const wl = wb.addWorksheet('Listas'); wl.state = 'hidden';

    // ── Movimentos (detalhe por documento)
    if (M.movimentos) {
      const natMov = [].concat(...M.abas.map(A => A.nat.map(n => (M.abas.length > 1 ? A.nome + ': ' : '') + n[1] + '|' + (n[2] === 'E' ? 'Entrada' : 'Saída')))).concat(['Remessa p/ demonstração, consignação ou conserto (NÃO baixa o estoque)|Não baixa', 'Retorno de demonstração, consignação ou conserto|Não entra']);
      natMov.forEach((n, k) => { const [a, b] = n.split('|'); wl.getCell('A' + (k + 1)).value = a; wl.getCell('B' + (k + 1)).value = b; });
      const wm = wb.addWorksheet('Movimentos', { views: [{ state: 'frozen', ySplit: 11 }], properties: { tabColor: { argb: 'FF7C3AED' } } });
      const cm = [['Data', 12, 'dd/mm/yyyy'], ['Tipo de documento (NF-e, NFC-e, requisição, ajuste…)', 16], ['Nº do documento', 12], ['Série', 7], ['CFOP', 8], ['Natureza do movimento', 38], ['Entrada ou Saída', 10], ['Código do item', 14], ['Descrição do item', 34], ['Quantidade', 12, FMT_Q], ['Custo unitário', 14, FMT_U], ['Custo total', 15, FMT_V], ['Valor da nota (venda/compra)', 15, FMT_V], ['Fornecedor / Cliente', 30], ['CNPJ / CPF', 19, FMT_DOC], ['Observação (laudo de perda, nº do ajuste…)', 34]];
      cm.forEach((c, i) => wm.getColumn(i + 1).width = c[1]);
      cabecalho(wm, letra(cm.length - 1), 'Movimentos do mês (um por documento e item)', emp, false);
      cabTabela(wm, 11, cm); wm.autoFilter = { from: { row: 11, column: 1 }, to: { row: 11, column: cm.length } };
      for (let r = 12; r <= 12 + N_LIN - 1; r++) {
        const row = wm.getRow(r); cm.forEach((c, i) => { const x = row.getCell(i + 1); x.border = borda; if (c[2]) x.numFmt = c[2]; });
        row.getCell(6).dataValidation = { type: 'list', allowBlank: true, formulae: ['Listas!$A$1:$A$' + natMov.length], showErrorMessage: false };
        row.getCell(7).value = { formula: 'IF(F' + r + '="","",IFERROR(VLOOKUP(F' + r + ',Listas!$A$1:$B$' + natMov.length + ',2,FALSE),""))' }; row.getCell(7).fill = fill(COR.calc);
        row.getCell(12).value = { formula: 'IF(OR(J' + r + '="",K' + r + '=""),"",ROUND(J' + r + '*K' + r + ',2))' }; row.getCell(12).fill = fill(COR.calc);
      }
    }
    // ── Outras saídas (simplificado)
    if (M.outrasSaidas) {
      const motivos = ['Perda / avaria / quebra / vencido', 'Devolução de compra', 'Doação, brinde ou amostra', 'Ajuste de inventário (falta)', 'Retirada para uso próprio', 'Outra (explique na observação)'];
      motivos.forEach((n, k) => { wl.getCell('A' + (k + 1)).value = n; });
      const wo = wb.addWorksheet('Outras saídas', { views: [{ state: 'frozen', ySplit: 11 }], properties: { tabColor: { argb: 'FFDC2626' } } });
      const co = [['Data', 12, 'dd/mm/yyyy'], ['Código do produto', 14], ['Descrição', 34], ['Quantidade', 12, FMT_Q], ['Custo total', 15, FMT_V], ['Motivo', 30], ['Nº da nota / documento', 14], ['Observação (laudo, BO, termo de inutilização…)', 40]];
      co.forEach((c, i) => wo.getColumn(i + 1).width = c[1]);
      cabecalho(wo, letra(co.length - 1), 'Outras saídas do mês (tudo o que NÃO é venda) — a soma tem que bater com a coluna "Outras saídas" do resumo', emp, false);
      cabTabela(wo, 11, co);
      for (let r = 12; r <= 1011; r++) { const row = wo.getRow(r); co.forEach((c, i) => { const x = row.getCell(i + 1); x.border = borda; if (c[2]) x.numFmt = c[2]; }); row.getCell(6).dataValidation = { type: 'list', allowBlank: true, formulae: ['Listas!$A$1:$A$' + motivos.length], showErrorMessage: false }; }
    }
    // ── Em poder de terceiros
    if (M.terceiros) {
      const wt = wb.addWorksheet('Em poder de terceiros', { properties: { tabColor: { argb: 'FFD97706' } } });
      const ct = [['Sentido', 24], ['Código do item', 14], ['Descrição', 34], ['Quantidade', 12, FMT_Q], ['Valor de custo', 15, FMT_V], ['Motivo', 26], ['Nº da nota de remessa', 13], ['Data da remessa', 12, 'dd/mm/yyyy'], ['Prazo de retorno', 12, 'dd/mm/yyyy'], ['Com quem está (nome)', 30], ['CNPJ / CPF', 19, FMT_DOC]];
      ct.forEach((c, i) => wt.getColumn(i + 1).width = c[1]);
      cabecalho(wt, letra(ct.length - 1), 'Estoque em poder de terceiros (é nosso — continua no saldo) e de terceiros em nosso poder (não é nosso — fora do saldo)', emp, false);
      cabTabela(wt, 11, ct);
      for (let r = 12; r <= 511; r++) { const row = wt.getRow(r); ct.forEach((c, i) => { const x = row.getCell(i + 1); x.border = borda; if (c[2]) x.numFmt = c[2]; }); row.getCell(1).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Nosso em poder de terceiros,De terceiros em nosso poder"'], showErrorMessage: false }; row.getCell(6).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Demonstração,Consignação,Conserto,Industrialização,Armazém geral"'], showErrorMessage: false }; }
    }
    // ── Resumo contábil (totais de cada aba + como contabilizar)
    const wr = wb.addWorksheet('Resumo contábil', { properties: { tabColor: { argb: COR.tit } } });
    [4, 50, 14, 17, 90].forEach((w, i) => wr.getColumn(i + 1).width = w);
    cabecalho(wr, 'E', 'Resumo contábil do mês (totais por natureza)', emp, false);
    let r = 10; const refT = {};
    abas.forEach(X => {
      const P = "'" + X.A.nome + "'!";
      wr.mergeCells('B' + r + ':E' + r); const g = wr.getCell('B' + r); g.value = X.A.nome.toUpperCase(); g.font = { bold: true, color: { argb: 'FFFFFFFF' } }; g.fill = fill(COR.grp); r++;
      ['', 'Natureza', 'Quantidade', 'Valor (custo)', 'Como contabilizar'].forEach((t, i) => { const x = wr.getCell(r, i + 1); if (!i) return; x.value = t; x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = fill(COR.cab); x.border = borda; }); r++;
      const linhas = [['Saldo inicial', 'ini', '', 'Deve ser igual ao saldo do mês anterior na contabilidade.']].concat(X.A.nat.map(n => [(n[2] === 'E' ? '(+) ' : '(−) ') + n[1], n[0], n[2], n[3]])).concat([['(=) Saldo final do sistema', 'fim', '', 'Deve ser igual à conta de estoque no balancete do mês (e ao Bloco H em 31/12).']]);
      const ini = r, eR = [], sR = [];
      linhas.forEach(l => { const row = wr.getRow(r);
        row.getCell(2).value = l[0]; row.getCell(3).value = { formula: P + letra(X.pos[l[1]]) + X.RT }; row.getCell(4).value = { formula: P + letra(X.pos[l[1]] + 1) + X.RT };
        row.getCell(3).numFmt = FMT_Q; row.getCell(4).numFmt = FMT_V; row.getCell(5).value = l[3];
        for (let c = 2; c <= 5; c++) { const x = row.getCell(c); x.border = borda; x.alignment = { wrapText: true, vertical: 'top' }; x.fill = fill(l[2] === 'E' ? COR.ent : l[2] === 'S' ? COR.sai : COR.sld); }
        if (!l[2]) row.font = { bold: true }; if (l[2] === 'E') eR.push(r); if (l[2] === 'S') sR.push(r); refT[X.A.nome + '|' + l[1]] = r; r++; });
      wr.getCell('B' + r).value = 'Conferência (inicial + entradas − saídas − final)'; wr.getCell('B' + r).font = { bold: true };
      ['C', 'D'].forEach(L => { const x = wr.getCell(L + r); x.value = { formula: 'ROUND(' + L + ini + '+' + eR.map(k => L + k).join('+') + '-(' + sR.map(k => L + k).join('+') + ')-' + L + (r - 1) + ',2)' }; x.numFmt = L === 'C' ? FMT_Q : FMT_V; x.font = { bold: true }; x.fill = fill(COR.calc); x.border = borda; });
      r += 2;
    });
    if (M.industria) { // conferências entre as etapas
      wr.mergeCells('B' + r + ':E' + r); const g = wr.getCell('B' + r); g.value = 'CONFERÊNCIA ENTRE AS ETAPAS (tem que dar zero)'; g.font = { bold: true, color: { argb: 'FFFFFFFF' } }; g.fill = fill(COR.grp); r++;
      [['Requisições de matéria-prima − matéria-prima requisitada em elaboração', 'Matérias-primas|requis', 'Em elaboração|mp'], ['Transferido para acabados − produção do período nos acabados', 'Em elaboração|acab', 'Produtos acabados|prod']].forEach(([t, a, b]) => {
        wr.getCell('B' + r).value = t; const x = wr.getCell('D' + r); x.value = { formula: 'ROUND(D' + refT[a] + '-D' + refT[b] + ',2)' }; x.numFmt = FMT_V; x.font = { bold: true }; x.fill = fill(COR.calc); x.border = borda; wr.getCell('B' + r).border = borda; r++; });
    }
    if (M.outrasSaidas) { // 27/11/2026: a coluna Outras saídas do resumo tem que bater com a soma da aba Outras saídas
      wr.mergeCells('B' + r + ':E' + r); const g = wr.getCell('B' + r); g.value = 'CONFERÊNCIA DAS OUTRAS SAÍDAS (tem que dar zero)'; g.font = { bold: true, color: { argb: 'FFFFFFFF' } }; g.fill = fill(COR.grp); r++;
      wr.getCell('B' + r).value = 'Outras saídas do resumo − soma da aba Outras saídas'; wr.getCell('B' + r).border = borda;
      const x = wr.getCell('D' + r); x.value = { formula: 'ROUND(D' + refT['Resumo por produto|outsai'] + "-SUM('Outras saídas'!E12:E1011),2)" }; x.numFmt = FMT_V; x.font = { bold: true }; x.fill = fill(COR.calc); x.border = borda; r++;
    }
    await wr.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true });
    wb.views = [{ activeTab: 1 }];
    return { wb, emp };
  }

  async function arquivo(chave) {
    const eid = (document.getElementById('modFluxoEmp') || {}).value || '';
    const { wb, emp } = await montar(chave, eid);
    return { nome: MODELOS[chave].arq + (emp ? ' - ' + String(emp.nome).replace(/[\\/:*?"<>|]/g, '').slice(0, 50) : '') + '.xlsx', buf: await wb.xlsx.writeBuffer() };
  }
  async function gerar(chave, btn) {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca ExcelJS não carregada', 'err'); return; }
    const txt = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando…'; }
    try {
      const f = await arquivo(chave);
      const blob = new Blob([f.buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('Modelo gerado: ' + f.nome, 'ok');
    } finally { if (btn) { btn.disabled = false; btn.textContent = txt; } }
  }
  function cardsHtml() {
    const ic = { revenda: '📦', simples: '📋', industria: '🏭' };
    return '<div style="font-size:13px;font-weight:700;margin:22px 0 10px">Estoque (CPC 16)</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">'
      + ORDEM_EST.map(k => { const M = MODELOS[k]; return '<div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px">'
        + '<div style="display:flex;gap:8px;align-items:center"><span style="font-size:20px">' + ic[k] + '</span><b style="font-size:13.5px">' + M.nome + '</b></div>'
        + '<div style="font-size:12px;color:var(--slate);flex:1">' + M.desc + '</div>'
        + '<button class="action-btn action-btn-excel" onclick="ModEstoque.gerar(\'' + k + '\',this)">📊 Gerar Excel</button></div>'; }).join('')
      + '</div>';
  }
  root.ModEstoque = { montar, gerar, arquivo, cardsHtml, MODELOS };
})(window);

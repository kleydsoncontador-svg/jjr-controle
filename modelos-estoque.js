/* Módulo MODELOS — Estoque (pedido do usuário 27/11/2026): layout que a contabilidade pede ao fornecedor do ERP de estoque do
   cliente, com base no CPC 16 (R1) / NBC TG 16 — Estoques e no RIR/2018 (custo médio ponderado ou PEPS; UEPS vedado).
   Abas: Instruções · Resumo por produto (mensal: saldo inicial + entradas por natureza − saídas por natureza = saldo final,
   quantidade e valor de CUSTO, com conferência automática) · Movimentos (detalhe por documento, para conciliar com as notas) ·
   Em poder de terceiros (demonstração/consignação/conserto: continua sendo estoque da empresa) · Resumo contábil (totais por natureza
   e a contabilização de cada uma). */
(function (root) {
  const TITULO = 'JJR CONSULTORIA CONTÁBIL SS';
  const COR = { tit: 'FF0F7B6C', cab: 'FF1E293B', grp: 'FF334155', inp: 'FFFFF7D6', calc: 'FFEFF3F6', borda: 'FFCBD5E1', ent: 'FFDCFCE7', sai: 'FFFEE2E2', sld: 'FFE0F2FE' };
  const borda = { top: { style: 'thin', color: { argb: COR.borda } }, left: { style: 'thin', color: { argb: COR.borda } }, bottom: { style: 'thin', color: { argb: COR.borda } }, right: { style: 'thin', color: { argb: COR.borda } } };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const FMT_V = '#,##0.00;[Red]-#,##0.00', FMT_Q = '#,##0.####;[Red]-#,##0.####', FMT_U = '#,##0.0000;[Red]-#,##0.0000';
  const letra = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const N_LIN = 3000;
  // naturezas: [chave, rótulo, E/S, contabilização]
  const NAT = [
    ['compra', 'Compras (custo de aquisição)', 'E', 'D Estoque / C Fornecedores — custo = preço + frete + seguro + IPI/ICMS-ST não recuperáveis − descontos − ICMS/PIS/COFINS recuperáveis (CPC 16 item 11)'],
    ['devvenda', 'Devoluções de vendas', 'E', 'D Estoque / C CMV (volta pelo custo da saída original)'],
    ['bonif', 'Bonificações recebidas', 'E', 'Entra em quantidade; o valor dilui o custo médio (receita de bonificação só se houver valor econômico separado)'],
    ['outent', 'Outras entradas (transferências, ajustes de inventário +)', 'E', 'D Estoque / C conta de origem (transferência) ou ajuste de inventário (sobra)'],
    ['venda', 'Vendas — custo (CMV)', 'S', 'D CMV / C Estoque (CPC 16 item 34)'],
    ['devcompra', 'Devoluções de compras', 'S', 'D Fornecedores / C Estoque (estorno da compra — não é custo)'],
    ['perda', 'Perdas, avarias, quebras, vencidos', 'S', 'Perda NORMAL do manuseio/transporte → custo; perda ANORMAL → outras despesas operacionais (CPC 16 item 16). Fiscal: dedutível se comprovada por laudo (RIR/2018 art. 303)'],
    ['consumo', 'Uso e consumo próprio', 'S', 'D Despesa de material de consumo (ou Imobilizado, se for bem durável) / C Estoque — NÃO é CMV'],
    ['doacao', 'Doações, brindes e amostras', 'S', 'D Despesa (doações / brindes / propaganda) / C Estoque — NÃO é CMV. Doação e brinde são indedutíveis em regra (Lei 9.249/95 art. 13)'],
    ['outsai', 'Outras saídas (transferências, ajustes de inventário −)', 'S', 'D conta de destino (transferência) ou ajuste de inventário (falta) / C Estoque']
  ];
  const NAT_MOV = NAT.map(n => n[1]).concat(['Remessa p/ demonstração, consignação ou conserto (NÃO baixa o estoque)', 'Retorno de demonstração, consignação ou conserto']);

  function cabecalho(ws, ult, sub, emp) {
    ws.mergeCells('A1:' + ult + '1'); const t = ws.getCell('A1'); t.value = TITULO; t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; t.fill = fill(COR.tit); t.alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(1).height = 30;
    ws.mergeCells('A2:' + ult + '2'); const t2 = ws.getCell('A2'); t2.value = sub; t2.font = { bold: true, size: 12, color: { argb: COR.grp } }; t2.alignment = { horizontal: 'center' };
    const lbl = (c, v) => { const x = ws.getCell(c); x.value = v; x.font = { bold: true, color: { argb: COR.grp } }; x.alignment = { horizontal: 'right' }; };
    const inp = (c, v, fmt) => { const x = ws.getCell(c); if (v != null) x.value = v; x.fill = fill(COR.inp); x.border = borda; if (fmt) x.numFmt = fmt; };
    lbl('B4', 'Empresa:'); ws.mergeCells('C4:F4'); inp('C4', emp ? emp.nome : null);
    lbl('B5', 'CNPJ:'); ws.mergeCells('C5:D5'); inp('C5', emp ? (typeof _fmtCnpjCpf === 'function' ? _fmtCnpjCpf(emp.cnpjNum || emp.cnpj || '') : '') : null);
    lbl('B6', 'Mês de referência:'); inp('C6', null, 'mm/yyyy');
    lbl('B7', 'Método de custo:'); ws.mergeCells('C7:D7'); inp('C7', 'Custo médio ponderado');
    ws.getCell('C7').dataValidation = { type: 'list', allowBlank: false, formulae: ['"Custo médio ponderado,PEPS (primeiro que entra primeiro que sai)"'], showErrorMessage: true, errorTitle: 'Método', error: 'O CPC 16 e o RIR/2018 só aceitam custo médio ponderado ou PEPS (UEPS é vedado).' };
  }

  async function montar(eid) {
    const emp = eid ? (S.emps().find(e => String(e.eid) === String(eid)) || null) : null;
    const wb = new ExcelJS.Workbook(); wb.creator = 'JJR Consultoria Contábil SS'; wb.created = new Date();
    // ── Instruções
    const wi = wb.addWorksheet('Instruções', { properties: { tabColor: { argb: COR.tit } } });
    wi.getColumn(1).width = 4; wi.getColumn(2).width = 120;
    cabecalho(wi, 'B', 'Relatório de estoque para a contabilidade — CPC 16 (R1) / NBC TG 16', emp);
    const txt = [
      ['O QUE PRECISAMOS (todo mês, até o dia 10 do mês seguinte)', true],
      ['1. Aba "Resumo por produto": uma linha por produto com saldo inicial, entradas e saídas separadas por natureza e saldo final — quantidade e valor de CUSTO (nunca preço de venda).'],
      ['2. Aba "Movimentos": cada entrada e saída do mês com data, documento (nº da nota), CFOP, natureza, produto, quantidade e custo. É ela que liga o estoque às notas fiscais.'],
      ['3. Aba "Em poder de terceiros": mercadoria nossa que está fora (demonstração, consignação, conserto, industrialização, armazém). Ela CONTINUA sendo estoque da empresa.'],
      ['REGRAS DE VALOR (CPC 16 e RIR/2018)', true],
      ['• Método de custo: custo médio ponderado ou PEPS. O UEPS (último que entra, primeiro que sai) não é aceito.'],
      ['• Custo de compra = preço + frete + seguro + IPI e ICMS-ST que NÃO são recuperados − descontos − ICMS, PIS e COFINS que a empresa recupera (crédito).'],
      ['• Saídas sempre pelo CUSTO (médio do momento ou PEPS). O valor de venda vai só na aba Movimentos, coluna "Valor da nota".'],
      ['• Devolução de venda volta pelo custo da saída original. Devolução de compra sai pelo custo da nota de compra.'],
      ['• Saldo final = saldo inicial + entradas − saídas. A coluna "Conferência" precisa dar zero em quantidade e em valor.'],
      ['• O saldo final de dezembro precisa ser igual ao inventário do Bloco H da EFD (quantidade e valor por item).'],
      ['O QUE NÃO É BAIXA DE ESTOQUE', true],
      ['• Remessa para demonstração, consignação, conserto ou industrialização: o produto sai fisicamente, mas continua sendo da empresa. Informe na aba "Em poder de terceiros" e NÃO desconte do saldo.'],
      ['• Mercadoria de terceiros em nosso poder (recebida em consignação, demonstração ou conserto) NÃO é estoque da empresa e não entra no saldo.'],
      ['SEPARAR SEMPRE (cada uma tem tratamento contábil e fiscal diferente)', true],
      ['• Venda (custo das vendas) · Perda/avaria/vencido · Uso e consumo próprio · Doação, brinde e amostra · Ajustes de inventário. Não juntar tudo como "baixa".'],
      ['• Perdas e avarias: guardar laudo, boletim de ocorrência ou termo de inutilização — sem isso o valor não é dedutível no IRPJ/CSLL.']
    ];
    txt.forEach((x, k) => { const c = wi.getCell('B' + (9 + k)); c.value = x[0]; c.alignment = { wrapText: true, vertical: 'top' }; if (x[1]) { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = fill(COR.grp); } });

    // ── Resumo por produto
    const ws = wb.addWorksheet('Resumo por produto', { views: [{ state: 'frozen', xSplit: 2, ySplit: 13 }], properties: { tabColor: { argb: 'FF2563EB' } }, pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    const fixas = [['Código do produto', 14], ['Descrição', 38], ['NCM', 11], ['Unidade', 8]];
    const grupos = [['Saldo inicial', 'sld', 'ini']].concat(NAT.map(n => [n[1], n[2] === 'E' ? 'ent' : 'sai', n[0]])).concat([['Saldo final (do ERP)', 'sld', 'fim']]);
    fixas.forEach((f, i) => ws.getColumn(i + 1).width = f[1]);
    let col = fixas.length; const pos = {};
    grupos.forEach(g => { pos[g[2]] = col; ws.getColumn(col + 1).width = 12; ws.getColumn(col + 2).width = 15; col += 2; });
    const cMed = col, cCq = col + 1, cCv = col + 2; [cMed, cCq, cCv].forEach(c => ws.getColumn(c + 1).width = 15);
    const ult = letra(cCv);
    cabecalho(ws, ult, 'Estoque — resumo mensal por produto (quantidade e valor de CUSTO)', emp);
    ws.mergeCells('H4:' + ult + '7'); const nt = ws.getCell('H4');
    nt.value = 'Uma linha por produto. Entradas em verde, saídas em vermelho, sempre pelo CUSTO. Saldo final = saldo inicial + entradas − saídas: as duas colunas de Conferência (no fim) precisam dar zero. Veja a aba Instruções.';
    nt.font = { italic: true, size: 10, color: { argb: 'FF64748B' } }; nt.alignment = { wrapText: true, vertical: 'middle' };
    const R1 = 11, R2 = 12, RT = 13, INI = 14, FIM = INI + N_LIN - 1;
    fixas.forEach((f, i) => { ws.mergeCells(letra(i) + R1 + ':' + letra(i) + R2); const c = ws.getCell(letra(i) + R1); c.value = f[0]; });
    grupos.forEach(g => { const a = letra(pos[g[2]]), b = letra(pos[g[2]] + 1); ws.mergeCells(a + R1 + ':' + b + R1); ws.getCell(a + R1).value = (g[1] === 'ent' ? 'ENTRADA — ' : g[1] === 'sai' ? 'SAÍDA — ' : '') + g[0]; ws.getCell(a + R2).value = 'Quantidade'; ws.getCell(b + R2).value = 'Valor (custo)'; ws.getCell(a + R1).fill = fill(g[1] === 'ent' ? 'FF166534' : g[1] === 'sai' ? 'FF991B1B' : 'FF075985'); });
    [[cMed, 'Custo médio unitário final'], [cCq, 'Conferência quantidade (tem que dar 0)'], [cCv, 'Conferência valor (tem que dar 0)']].forEach(([c, t]) => { const L = letra(c); ws.mergeCells(L + R1 + ':' + L + R2); ws.getCell(L + R1).value = t; });
    for (let c = 0; c <= cCv; c++) [R1, R2].forEach(r => { const x = ws.getCell(letra(c) + r); x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }; if (!x.fill || !x.fill.fgColor || r === R2 || c < fixas.length || c >= cMed) x.fill = fill(COR.cab); x.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }; x.border = borda; });
    ws.getRow(R1).height = 44; ws.getRow(R2).height = 18;
    // linha de totais (fica fixa logo abaixo do cabeçalho)
    ws.getCell('B' + RT).value = 'TOTAIS'; ws.getCell('B' + RT).font = { bold: true };
    for (let c = fixas.length; c <= cCv; c++) { if (c === cMed) continue; const L = letra(c), x = ws.getCell(L + RT); x.value = { formula: 'SUM(' + L + INI + ':' + L + FIM + ')' }; x.numFmt = (c - fixas.length) % 2 === 0 && c < cMed ? FMT_Q : FMT_V; x.font = { bold: true }; x.fill = fill(COR.calc); x.border = borda; }
    const ent = NAT.filter(n => n[2] === 'E').map(n => n[0]), sai = NAT.filter(n => n[2] === 'S').map(n => n[0]);
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

    // ── Movimentos (detalhe)
    const wm = wb.addWorksheet('Movimentos', { views: [{ state: 'frozen', ySplit: 11 }], properties: { tabColor: { argb: 'FF7C3AED' } } });
    const cm = [['Data', 12, 'dd/mm/yyyy'], ['Tipo de documento (NF-e, NFC-e, NFS-e, ajuste…)', 16], ['Nº do documento', 12], ['Série', 7], ['CFOP', 8], ['Natureza do movimento', 34], ['Entrada ou Saída', 10], ['Código do produto', 14], ['Descrição do produto', 34], ['Quantidade', 12, FMT_Q], ['Custo unitário', 14, FMT_U], ['Custo total', 15, FMT_V], ['Valor da nota (venda/compra)', 15, FMT_V], ['Fornecedor / Cliente', 30], ['CNPJ / CPF', 19, '[<=99999999999]000"."000"."000"-"00;00"."000"."000"/"0000"-"00'], ['Observação (laudo de perda, nº do ajuste…)', 34]];
    cm.forEach((c, i) => wm.getColumn(i + 1).width = c[1]);
    cabecalho(wm, letra(cm.length - 1), 'Estoque — movimentos do mês (um por documento e produto)', emp);
    const hr = wm.getRow(11); hr.height = 44;
    cm.forEach((c, i) => { const x = hr.getCell(i + 1); x.value = c[0]; x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }; x.fill = fill(COR.cab); x.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }; x.border = borda; });
    wm.autoFilter = { from: { row: 11, column: 1 }, to: { row: 11, column: cm.length } };
    const wl = wb.addWorksheet('Listas'); wl.state = 'hidden';
    NAT_MOV.forEach((n, k) => { wl.getCell('A' + (k + 1)).value = n; wl.getCell('B' + (k + 1)).value = k < NAT.length ? (NAT[k][2] === 'E' ? 'Entrada' : 'Saída') : (k === NAT.length ? 'Não baixa' : 'Não entra'); });
    for (let r = 12; r <= 12 + N_LIN - 1; r++) {
      const row = wm.getRow(r);
      cm.forEach((c, i) => { const x = row.getCell(i + 1); x.border = borda; if (c[2]) x.numFmt = c[2]; });
      row.getCell(6).dataValidation = { type: 'list', allowBlank: true, formulae: ['Listas!$A$1:$A$' + NAT_MOV.length], showErrorMessage: false };
      row.getCell(7).value = { formula: 'IF(F' + r + '="","",IFERROR(VLOOKUP(F' + r + ',Listas!$A$1:$B$' + NAT_MOV.length + ',2,FALSE),""))' }; row.getCell(7).fill = fill(COR.calc);
      row.getCell(12).value = { formula: 'IF(OR(J' + r + '="",K' + r + '=""),"",ROUND(J' + r + '*K' + r + ',2))' }; row.getCell(12).fill = fill(COR.calc);
    }

    // ── Em poder de terceiros
    const wt = wb.addWorksheet('Em poder de terceiros', { properties: { tabColor: { argb: 'FFD97706' } } });
    const ct = [['Código do produto', 14], ['Descrição', 34], ['Quantidade', 12, FMT_Q], ['Valor de custo', 15, FMT_V], ['Motivo (demonstração, consignação, conserto, industrialização, armazém)', 26], ['Nº da nota de remessa', 13], ['Data da remessa', 12, 'dd/mm/yyyy'], ['Prazo de retorno', 12, 'dd/mm/yyyy'], ['Com quem está (nome)', 30], ['CNPJ / CPF', 19, '[<=99999999999]000"."000"."000"-"00;00"."000"."000"/"0000"-"00']];
    ct.forEach((c, i) => wt.getColumn(i + 1).width = c[1]);
    cabecalho(wt, letra(ct.length - 1), 'Estoque da empresa que está com terceiros (continua no saldo — não é baixa)', emp);
    const ht = wt.getRow(11); ht.height = 44;
    ct.forEach((c, i) => { const x = ht.getCell(i + 1); x.value = c[0]; x.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9.5 }; x.fill = fill(COR.cab); x.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }; x.border = borda; });
    for (let r = 12; r <= 511; r++) { const row = wt.getRow(r); ct.forEach((c, i) => { const x = row.getCell(i + 1); x.border = borda; if (c[2]) x.numFmt = c[2]; }); row.getCell(5).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Demonstração,Consignação,Conserto,Industrialização,Armazém geral"'], showErrorMessage: false }; }

    // ── Resumo contábil (totais da aba Resumo por produto)
    const wr = wb.addWorksheet('Resumo contábil', { properties: { tabColor: { argb: COR.tit } } });
    [4, 46, 14, 17, 90].forEach((w, i) => wr.getColumn(i + 1).width = w);
    cabecalho(wr, 'E', 'Resumo contábil do mês (totais por natureza)', emp);
    const hrr = wr.getRow(10); ['', 'Natureza', 'Quantidade', 'Valor (custo)', 'Como contabilizar'].forEach((t, i) => { const x = hrr.getCell(i + 1); x.value = t; x.font = { bold: true, color: { argb: 'FFFFFFFF' } }; x.fill = fill(COR.cab); x.border = borda; x.alignment = { vertical: 'middle', wrapText: true }; });
    const P = "'Resumo por produto'!";
    const linhas = [['Saldo inicial', 'ini', '', 'Deve ser igual ao saldo final do mês anterior na contabilidade.']].concat(NAT.map(n => [(n[2] === 'E' ? '(+) ' : '(−) ') + n[1], n[0], n[2], n[3]])).concat([['(=) Saldo final do ERP', 'fim', '', 'Deve ser igual à conta Estoque no balancete do mês (e ao Bloco H em 31/12).']]);
    linhas.forEach((l, k) => {
      const r = 11 + k, row = wr.getRow(r);
      row.getCell(2).value = l[0]; row.getCell(3).value = { formula: P + letra(pos[l[1]]) + RT }; row.getCell(4).value = { formula: P + letra(pos[l[1]] + 1) + RT };
      row.getCell(3).numFmt = FMT_Q; row.getCell(4).numFmt = FMT_V; row.getCell(5).value = l[3];
      for (let c = 2; c <= 5; c++) { const x = row.getCell(c); x.border = borda; x.alignment = { wrapText: true, vertical: 'top' }; if (l[2] === 'E') x.fill = fill(COR.ent); else if (l[2] === 'S') x.fill = fill(COR.sai); else x.fill = fill(COR.sld); }
      if (!l[2]) row.font = { bold: true };
    });
    const rc = 11 + linhas.length + 1;
    wr.getCell('B' + rc).value = 'Conferência (saldo inicial + entradas − saídas − saldo final)'; wr.getCell('B' + rc).font = { bold: true };
    const ini = 11, fim = 11 + linhas.length - 1, eRows = [], sRows = [];
    linhas.forEach((l, k) => { if (l[2] === 'E') eRows.push(11 + k); if (l[2] === 'S') sRows.push(11 + k); });
    ['C', 'D'].forEach(L => { const x = wr.getCell(L + rc); x.value = { formula: 'ROUND(' + L + ini + '+' + eRows.map(r => L + r).join('+') + '-(' + sRows.map(r => L + r).join('+') + ')-' + L + fim + ',2)' }; x.numFmt = L === 'C' ? FMT_Q : FMT_V; x.font = { bold: true }; x.fill = fill(COR.calc); x.border = borda; });
    await wr.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true });
    wb.views = [{ activeTab: 1 }];
    return { wb, emp };
  }

  async function gerar(btn) {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca ExcelJS não carregada', 'err'); return; }
    const eid = (document.getElementById('modFluxoEmp') || {}).value || '';
    const txt = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = '⏳ Gerando…'; }
    try {
      const { wb, emp } = await montar(eid);
      const nome = 'Modelo Estoque CPC 16' + (emp ? ' - ' + String(emp.nome).replace(/[\\/:*?"<>|]/g, '').slice(0, 50) : '') + '.xlsx';
      const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('Modelo gerado: ' + nome, 'ok');
    } finally { if (btn) { btn.disabled = false; btn.textContent = txt; } }
  }
  function cardsHtml() {
    return '<div style="font-size:13px;font-weight:700;margin:22px 0 10px">Estoque</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px"><div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px">'
      + '<div style="display:flex;gap:8px;align-items:center"><span style="font-size:20px">📦</span><b style="font-size:13.5px">Estoque completo (CPC 16)</b></div>'
      + '<div style="font-size:12px;color:var(--slate);flex:1">Layout para o fornecedor do ERP de estoque: resumo mensal por produto (saldo inicial, entradas e saídas por natureza, saldo final, a custo, com conferência), movimentos por nota, estoque em poder de terceiros e resumo contábil.</div>'
      + '<button class="action-btn action-btn-excel" onclick="ModEstoque.gerar(this)">📊 Gerar Excel</button></div></div>';
  }
  root.ModEstoque = { montar, gerar, cardsHtml, NAT };
})(window);

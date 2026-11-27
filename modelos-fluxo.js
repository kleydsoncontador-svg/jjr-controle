/* Módulo MODELOS (pedido do usuário 27/11/2026) — planilhas padrão da JJR para o cliente preencher e devolver.
   1º modelo: Fluxo de Caixa, em 5 variações: só pagamentos · só recebimentos · pagamentos e recebimentos em abas separadas ·
   entrada e saída na MESMA coluna (saída negativa) · entrada e saída em COLUNAS diferentes.
   Cabeçalho: JJR CONSULTORIA CONTÁBIL SS, empresa/CNPJ, data inicial e final, banco (opcional), saldo inicial e
   "as saídas estão digitadas como positivas/negativas". Colunas: data da movimentação, histórico bancário,
   fornecedor/cliente (destinatário/remetente), tipo de gasto (lista dos Pontos de Atenção + o que o cliente digitar na coluna
   "tipo novo", que entra na lista sozinho), nº da NF, valores, saldo e, por último, a descrição detalhada.
   A aba escondida "_jjr" marca o arquivo; ao anexar no Fluxo de Caixa (Lançamentos Contábeis) o leitor reconhece o modelo
   (ModFluxo.ehModelo / ModFluxo.lerWorkbook) e usa a mesma tela de conferência do Fluxo por banco. */
(function (root) {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TITULO = 'JJR CONSULTORIA CONTÁBIL SS';
  const MARCA = 'JJR_MODELO_FLUXO';
  const LIN_CAB = 17, LIN_INI = 18, LIN_FIM = 517, N_MANUAL = 300;
  const VARIANTES = {
    pag: { nome: 'Só pagamentos', desc: 'Uma aba só com as SAÍDAS do banco (pagamentos), com o saldo de cada dia.', abas: [{ nome: 'Pagamentos', tipo: 'pag', cols: ['saida', 'saldo'] }] },
    rec: { nome: 'Só recebimentos', desc: 'Uma aba só com as ENTRADAS do banco (recebimentos), com o saldo de cada dia.', abas: [{ nome: 'Recebimentos', tipo: 'rec', cols: ['entrada', 'saldo'] }] },
    abas: { nome: 'Pagamentos e recebimentos em abas separadas', desc: 'Uma aba de Pagamentos e outra de Recebimentos. O cabeçalho é preenchido uma vez (aba Pagamentos); o saldo do dia soma as duas abas.', abas: [{ nome: 'Pagamentos', tipo: 'pag', cols: ['saida', 'saldo'] }, { nome: 'Recebimentos', tipo: 'rec', cols: ['entrada', 'saldo'], espelho: true }] },
    mesma: { nome: 'Entrada e saída na mesma coluna', desc: 'Uma aba com uma coluna de valor só: entrada positiva, saída NEGATIVA (com sinal de menos). Saldo de cada dia.', abas: [{ nome: 'Fluxo de Caixa', tipo: 'mix', cols: ['valor', 'saldo'] }] },
    col: { nome: 'Entrada e saída em colunas diferentes', desc: 'Uma aba com uma coluna de Valor de saída e outra de Valor de entrada. Saldo de cada dia.', abas: [{ nome: 'Fluxo de Caixa', tipo: 'mix', cols: ['saida', 'entrada', 'saldo'] }] }
  };
  const ORDEM = ['pag', 'rec', 'abas', 'mesma', 'col'];
  const letra = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }; // 0 → A
  const ref = nome => "'" + nome.replace(/'/g, "''") + "'";
  function tiposPadrao(tipo) {
    const L = (root.ALERTA_TIPOS || []).filter(t => tipo === 'mix' || t.uso === 'ambos' || t.uso === (tipo === 'pag' ? 'pagamento' : 'recebimento')).map(t => t.nome);
    return [...new Set(L)].sort((a, b) => a.localeCompare(b, 'pt'));
  }
  function colunasDaAba(aba) {
    const tp = aba.tipo;
    const c = [
      { k: 'data', t: 'Data da movimentação', w: 14 },
      { k: 'hist', t: 'Histórico bancário (como aparece no extrato)', w: 40 },
      { k: 'forn', t: tp === 'pag' ? 'Fornecedor (destinatário)' : tp === 'rec' ? 'Cliente (remetente)' : 'Fornecedor / Cliente (destinatário / remetente)', w: 34 },
      { k: 'doc', t: 'CNPJ / CPF', w: 20 },
      { k: 'nf', t: 'Nº da nota fiscal (se houver)', w: 14 }
    ];
    aba.cols.forEach(k => {
      if (k === 'saida') c.push({ k, t: 'Valor de saída', w: 16 });
      if (k === 'entrada') c.push({ k, t: 'Valor de entrada', w: 16 });
      if (k === 'valor') c.push({ k, t: 'Valor (entrada + / saída −)', w: 18 });
    });
    c.push({ k: 'tipoL', t: tp === 'pag' ? 'Tipo de gasto' : tp === 'rec' ? 'Tipo de recebimento' : 'Tipo de gasto / recebimento', w: 34 });
    c.push({ k: 'part', t: tp === 'pag' ? 'Marque "Sim" se o gasto é particular do sócio ou de terceiros (não é da empresa)' : tp === 'rec' ? 'Marque "Sim" se a receita é do sócio ou de terceiros (não é da empresa)' : 'Marque "Sim" se é particular do sócio ou de terceiros (não é da empresa)', w: 24 });
    c.push({ k: 'desc', t: 'Descrição / histórico detalhado (para a contabilidade)', w: 46 });
    if (aba.cols.includes('saldo')) c.push({ k: 'saldo', t: 'Saldo (no fim do dia — automático)', w: 18 });
    c.forEach((x, i) => { x.i = i; x.L = letra(i); });
    return c;
  }
  const COR = { tit: 'FF0F7B6C', cab: 'FF1E293B', inp: 'FFFFF7D6', calc: 'FFEFF3F6', borda: 'FFCBD5E1', lbl: 'FF334155' };
  const borda = { top: { style: 'thin', color: { argb: COR.borda } }, left: { style: 'thin', color: { argb: COR.borda } }, bottom: { style: 'thin', color: { argb: COR.borda } }, right: { style: 'thin', color: { argb: COR.borda } } };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const FMT_V = '#,##0.00;[Red]-#,##0.00';

  const empSel = () => { const eid = (document.getElementById('modFluxoEmp') || {}).value || ''; return { eid, emp: eid ? (S.emps().find(e => String(e.eid) === String(eid)) || null) : null }; };
  const nomeLimpo = emp => emp ? ' - ' + String(emp.nome).replace(/[\\/:*?"<>|]/g, '').slice(0, 50) : '';
  function baixarBlob(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  async function arquivo(chave) {
    const { eid, emp } = empSel(); const { wb } = await montar(chave, eid);
    return { nome: 'Modelo Fluxo de Caixa - ' + VARIANTES[chave].nome + nomeLimpo(emp) + '.xlsx', buf: await wb.xlsx.writeBuffer() };
  }
  async function gerar(chave) {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca ExcelJS não carregada', 'err'); return; }
    if (!VARIANTES[chave]) return;
    const f = await arquivo(chave);
    baixarBlob(new Blob([f.buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), f.nome);
    toast('Modelo gerado: ' + f.nome, 'ok');
  }
  async function montar(chave, eid) {
    const V = VARIANTES[chave];
    const emp = eid ? (S.emps().find(e => String(e.eid) === String(eid)) || null) : null;
    const wb = new ExcelJS.Workbook(); wb.creator = 'JJR Consultoria Contábil SS'; wb.created = new Date();
    const abas = V.abas.map(a => Object.assign({}, a, { colunas: colunasDaAba(a) }));
    // cria as abas visíveis primeiro (ordem das abas no Excel), depois Listas e _jjr
    abas.forEach(a => { a.ws = wb.addWorksheet(a.nome, { views: [{ state: 'frozen', ySplit: LIN_CAB }], properties: { tabColor: { argb: a.tipo === 'rec' ? 'FF16A34A' : a.tipo === 'pag' ? 'FFDC2626' : COR.tit } }, pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } }); });
    const wl = wb.addWorksheet('Listas'); wl.state = 'hidden';
    const wm = wb.addWorksheet('_jjr'); wm.state = 'veryHidden';
    wm.getCell('A1').value = MARCA; wm.getCell('B1').value = 1;
    wm.getCell('A2').value = 'variante'; wm.getCell('B2').value = chave;
    wm.getCell('A3').value = 'eid'; wm.getCell('B3').value = eid || '';
    wm.getCell('A4').value = 'gerado'; wm.getCell('B4').value = new Date().toISOString();
    const princ = abas[0];
    abas.forEach((a, ia) => {
      const ws = a.ws, C = a.colunas, ult = C[C.length - 1].L, col = k => C.find(x => x.k === k);
      const aux = letra(C.length + 2), aux2 = letra(C.length + 3); // colunas auxiliares escondidas (tipos e fornecedores digitados → listas)
      C.forEach(x => { ws.getColumn(x.i + 1).width = x.w; });
      ws.getColumn(C.length + 3).hidden = true; ws.getColumn(C.length + 4).hidden = true;
      // título
      ws.mergeCells('A1:' + ult + '1'); const t = ws.getCell('A1'); t.value = TITULO; t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; t.fill = fill(COR.tit); t.alignment = { vertical: 'middle', horizontal: 'center' }; ws.getRow(1).height = 30;
      ws.mergeCells('A2:' + ult + '2'); const t2 = ws.getCell('A2'); t2.value = 'Fluxo de Caixa — ' + V.nome + (V.abas.length > 1 ? ' (aba ' + a.nome + ')' : ''); t2.font = { bold: true, size: 12, color: { argb: COR.lbl } }; t2.alignment = { horizontal: 'center' };
      ws.mergeCells('A3:' + ult + '3'); const t3 = ws.getCell('A3');
      t3.value = a.espelho ? 'O cabeçalho desta aba vem da aba Pagamentos (preencha lá). Aqui, só os recebimentos: uma linha por movimentação do extrato.' : 'Preencha os campos amarelos. Uma linha por movimentação do extrato bancário. Depois, devolva este arquivo para a JJR.';
      t3.font = { italic: true, size: 10, color: { argb: 'FF64748B' } }; t3.alignment = { horizontal: 'center', wrapText: true };
      // cabeçalho: rótulo em B, valor em C (um por linha)
      const lbl = (end, txt) => { const c = ws.getCell(end); c.value = txt; c.font = { bold: true, color: { argb: COR.lbl } }; c.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }; };
      const inp = (end, v, fmt) => { const c = ws.getCell(end); if (a.espelho) { c.value = { formula: ref(princ.nome) + '!' + end }; c.fill = fill(COR.calc); } else { if (v != null) c.value = v; c.fill = fill(COR.inp); c.protection = { locked: false }; } c.border = borda; if (fmt) c.numFmt = fmt; c.alignment = { vertical: 'middle' }; };
      lbl('B5', 'Empresa:'); ws.mergeCells('C5:E5'); inp('C5', emp ? emp.nome : null);
      lbl('B6', 'CNPJ:'); inp('C6', emp ? (typeof _fmtCnpjCpf === 'function' ? _fmtCnpjCpf(emp.cnpjNum || emp.cnpj || '') : (emp.cnpj || '')) : null);
      lbl('B7', 'Data inicial:'); inp('C7', null, 'dd/mm/yyyy');
      lbl('B8', 'Data final:'); inp('C8', null, 'dd/mm/yyyy');
      lbl('B9', 'Banco (opcional):'); inp('C9', null);
      lbl('B10', 'Agência / conta (opcional):'); inp('C10', null);
      lbl('B11', 'Digite o saldo inicial do banco:'); inp('C11', null, FMT_V);
      lbl('B12', 'As saídas estão digitadas como:');
      const sx = ws.getCell('C12');
      if (a.tipo === 'mix' && a.cols.includes('valor')) { sx.value = 'Negativas (obrigatório nesta planilha)'; sx.fill = fill(COR.calc); sx.border = borda; }
      else if (a.tipo === 'rec') { sx.value = a.espelho ? { formula: ref(princ.nome) + '!C12' } : 'Não se aplica (só entradas)'; sx.fill = fill(COR.calc); sx.border = borda; }
      else { inp('C12', 'Positivas (sem sinal: 150)'); if (!a.espelho) sx.dataValidation = { type: 'list', allowBlank: false, formulae: ['"Positivas (sem sinal: 150),Negativas (com sinal: -150)"'], showErrorMessage: true, errorTitle: 'Escolha da lista', error: 'Escolha Positivas ou Negativas.' }; }
      ws.mergeCells('D12:' + ult + '12'); const nt = ws.getCell('D12');
      nt.value = (a.tipo === 'mix' && a.cols.includes('valor')) ? 'Entrada com valor positivo (150,00) e saída com sinal de menos (-150,00). O saldo soma tudo a partir do saldo inicial.'
        : a.tipo === 'rec' ? 'Esta aba só tem entradas.' : 'Informe se digitou as saídas sem sinal (150,00) ou com sinal de menos (-150,00). O saldo é calculado certo nos dois casos.';
      nt.font = { size: 9.5, italic: true, color: { argb: 'FF64748B' } }; nt.alignment = { wrapText: true, vertical: 'middle' }; ws.getRow(12).height = 30;
      // totais — saídas, entradas e saldo final do período (soma as abas no modelo de abas separadas)
      const rngA = (aa, k) => { const x = aa.colunas.find(c => c.k === k); return x ? ref(aa.nome) + '!$' + x.L + '$' + LIN_INI + ':$' + x.L + '$' + LIN_FIM : null; };
      const fSai = [], fEnt = [];
      abas.forEach(aa => { const s = rngA(aa, 'saida'), e = rngA(aa, 'entrada'), v = rngA(aa, 'valor'); if (s) fSai.push('SUMPRODUCT(ABS(' + s + '))'); if (e) fEnt.push('SUMPRODUCT(ABS(' + e + '))'); if (v) { fSai.push('-SUMIF(' + v + ',"<0")'); fEnt.push('SUMIF(' + v + ',">0")'); } });
      const tot = (end, txt, f) => { lbl('B' + end, txt); const c = ws.getCell('C' + end); c.value = { formula: f }; c.numFmt = FMT_V; c.fill = fill(COR.calc); c.border = borda; c.font = { bold: true }; };
      tot(13, 'Total de saídas:', fSai.length ? fSai.join('+') : '0');
      tot(14, 'Total de entradas:', fEnt.length ? fEnt.join('+') : '0');
      tot(15, 'Saldo final:', ref(princ.nome) + '!$C$11+C14-C13');
      // cabeçalho das colunas
      const hr = ws.getRow(LIN_CAB); hr.height = 42;
      C.forEach(x => { const c = hr.getCell(x.i + 1); c.value = x.t; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; c.fill = fill(COR.cab); c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; c.border = borda; });
      ws.getCell(aux + LIN_CAB).value = 'aux'; ws.getCell(aux2 + LIN_CAB).value = 'aux2';
      ws.autoFilter = { from: { row: LIN_CAB, column: 1 }, to: { row: LIN_CAB, column: C.length } };
      // listas: tipos = padrão (Pontos de Atenção) + o que for digitado na própria coluna; fornecedores/clientes = o que já foi digitado na coluna
      const lc = letra(ia * 2), lf = letra(ia * 2 + 1), pad = tiposPadrao(a.tipo), fimPad = 1 + pad.length;
      wl.getCell(lc + '1').value = 'Tipos — ' + a.nome; wl.getColumn(ia * 2 + 1).width = 44;
      wl.getCell(lf + '1').value = 'Fornecedores/clientes — ' + a.nome; wl.getColumn(ia * 2 + 2).width = 44;
      pad.forEach((n, k) => { wl.getCell(lc + (2 + k)).value = n; });
      const tN = col('tipoL').L, fN = col('forn').L, rg = (L) => ref(a.nome) + '!$' + L + '$' + LIN_INI + ':$' + L + '$' + LIN_FIM;
      for (let k = 1; k <= N_MANUAL; k++) wl.getCell(lc + (fimPad + k)).value = { formula: 'IFERROR(INDEX(' + rg(tN) + ',MATCH(' + k + ',' + rg(aux) + ',0)),"")' };
      for (let k = 1; k <= LIN_FIM - LIN_INI + 1; k++) wl.getCell(lf + (1 + k)).value = { formula: 'IFERROR(INDEX(' + rg(fN) + ',MATCH(' + k + ',' + rg(aux2) + ',0)),"")' };
      const fimLista = fimPad + N_MANUAL, fimForn = 1 + (LIN_FIM - LIN_INI + 1);
      const fLista = 'OFFSET(Listas!$' + lc + '$2,0,0,MAX(1,COUNTIF(Listas!$' + lc + '$2:$' + lc + '$' + fimLista + ',"?*")),1)';
      const fForn = 'OFFSET(Listas!$' + lf + '$2,0,0,MAX(1,COUNTIF(Listas!$' + lf + '$2:$' + lf + '$' + fimForn + ',"?*")),1)';
      const FMT_DOC = '[<=99999999999]000"."000"."000"-"00;00"."000"."000"/"0000"-"00';
      { const p = col('part').L; ws.addConditionalFormatting({ ref: p + LIN_INI + ':' + p + LIN_FIM, rules: [{ type: 'expression', formulae: ['LEN(TRIM(' + p + LIN_INI + '))>0'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFED7AA' } }, font: { bold: true } } }] }); }
      // linhas de dados
      const cSai = col('saida'), cEnt = col('entrada'), cVal = col('valor'), cSal = col('saldo');
      for (let r = LIN_INI; r <= LIN_FIM; r++) {
        const row = ws.getRow(r);
        C.forEach(x => { const c = row.getCell(x.i + 1); c.border = borda; if (x.k !== 'saldo') c.protection = { locked: false }; if (x.k === 'data') c.numFmt = 'dd/mm/yyyy'; if (x.k === 'saida' || x.k === 'entrada' || x.k === 'valor' || x.k === 'saldo') c.numFmt = FMT_V; if (x.k === 'hist' || x.k === 'desc' || x.k === 'forn' || x.k === 'tipoL') c.alignment = { wrapText: true, vertical: 'top' }; if (x.k === 'doc') { c.numFmt = FMT_DOC; c.alignment = { horizontal: 'left' }; } if (x.k === 'part') c.alignment = { horizontal: 'center' }; });
        row.getCell(col('data').i + 1).dataValidation = { type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(2000, 0, 1)], showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Data', error: 'Digite uma data (dd/mm/aaaa).' };
        // lista + digitação livre, sem mensagem de erro: o que for digitado e não estiver na lista entra na lista sozinho
        row.getCell(col('tipoL').i + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [fLista], showErrorMessage: false };
        row.getCell(col('forn').i + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [fForn], showErrorMessage: false };
        row.getCell(col('part').i + 1).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Sim"'], showErrorMessage: false };
        // auxiliares: numeram cada tipo novo (1ª vez, fora da lista padrão) e cada fornecedor/cliente (1ª vez)
        ws.getCell(aux + r).value = { formula: 'IF(OR(' + tN + r + '="",COUNTIF(Listas!$' + lc + '$2:$' + lc + '$' + fimPad + ',' + tN + r + ')>0,COUNTIF(' + tN + '$' + LIN_INI + ':' + tN + r + ',' + tN + r + ')>1),"",MAX(' + aux + '$' + LIN_CAB + ':' + aux + (r - 1) + ')+1)' };
        ws.getCell(aux2 + r).value = { formula: 'IF(OR(' + fN + r + '="",COUNTIF(' + fN + '$' + LIN_INI + ':' + fN + r + ',' + fN + r + ')>1),"",MAX(' + aux2 + '$' + LIN_CAB + ':' + aux2 + (r - 1) + ')+1)' };
        if (cSal) {
          // saldo no FIM DO DIA: aparece só na última linha de cada data (a lista pode estar fora de ordem) e soma todas as abas do arquivo
          const c = row.getCell(cSal.i + 1); c.fill = fill(COR.calc); c.font = { bold: true };
          const dt = 'A' + r, parts = [];
          abas.forEach(aa => {
            const D = ref(aa.nome) + '!$A$' + LIN_INI + ':$A$' + LIN_FIM, cc = k => { const x = aa.colunas.find(y => y.k === k); return x ? ref(aa.nome) + '!$' + x.L + '$' + LIN_INI + ':$' + x.L + '$' + LIN_FIM : null; };
            const e = cc('entrada'), sa = cc('saida'), v = cc('valor');
            if (e) parts.push('+SUMIF(' + D + ',"<="&' + dt + ',' + e + ')');
            if (sa) parts.push('-SUMPRODUCT((' + D + '<=' + dt + ')*ABS(' + sa + '))');
            if (v) parts.push('+SUMIF(' + D + ',"<="&' + dt + ',' + v + ')');
          });
          const ultimaDoDia = r < LIN_FIM ? 'COUNTIF(A' + (r + 1) + ':A$' + LIN_FIM + ',' + dt + ')>0' : 'FALSE';
          c.value = { formula: 'IF(OR(' + dt + '="",' + ultimaDoDia + '),"",$C$11' + parts.join('') + ')' };
        }
      }
    });
    // 27/11/2026: abas protegidas — só os campos amarelos e as linhas de lançamento ficam livres; cabeçalho espelhado, totais e saldo ficam bloqueados (Revisar → Desproteger Planilha, sem senha)
    const opt = { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true, autoFilter: true, sort: false };
    await Promise.all(abas.map(a => a.ws.protect('', opt)).concat([wl.protect('', opt)]));
    return { wb, emp };
  }

  // ── tela do módulo
  function render() {
    const el = document.getElementById('modelosRoot'); if (!el) return;
    const emps = (S.emps() || []).filter(e => e.ativo !== false).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt'));
    const icone = { pag: '📤', rec: '📥', abas: '🗂️', mesma: '↕️', col: '⇆' };
    el.innerHTML = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px">'
      + '<label style="font-size:12.5px;font-weight:600">Empresa (opcional — preenche nome e CNPJ no modelo):</label>'
      + '<select class="si" id="modFluxoEmp" style="min-width:320px;max-width:100%"><option value="">— Em branco (o cliente preenche) —</option>' + emps.map(e => '<option value="' + E(e.eid) + '">' + E(e.eid + ' - ' + e.nome) + '</option>').join('') + '</select></div>'
      + '<div style="display:flex;align-items:center;gap:12px;margin:4px 0 10px;flex-wrap:wrap"><span style="font-size:13px;font-weight:700">Fluxo de Caixa</span>'
      + '<label style="display:flex;gap:6px;align-items:center;font-size:12.5px;cursor:pointer"><input type="checkbox" id="modFluxoTodos" onchange="ModFluxo.marcarTodos(this.checked)" style="cursor:pointer"> Selecionar todos</label>'
      + '<button class="action-btn action-btn-excel" id="modFluxoBaixarSel" style="display:none" onclick="ModFluxo.baixarSelecionados(this)">📥 Baixar selecionados</button></div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">'
      + ORDEM.map(k => { const V = VARIANTES[k]; return '<div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px">'
        + '<div style="display:flex;gap:8px;align-items:flex-start"><span style="font-size:20px">' + icone[k] + '</span><b style="font-size:13.5px;flex:1">' + E(V.nome) + '</b><input type="checkbox" class="modFluxoSel" value="' + k + '" title="Selecionar para baixar junto" onchange="ModFluxo.atualizarSel()" style="width:17px;height:17px;cursor:pointer;flex-shrink:0"></div>'
        + '<div style="font-size:12px;color:var(--slate);flex:1">' + E(V.desc) + '</div>'
        + '<button class="action-btn action-btn-excel" onclick="ModFluxo.gerar(\'' + k + '\')">📊 Gerar Excel</button></div>'; }).join('')
      + '</div>'
      + (root.ModEstoque ? ModEstoque.cardsHtml() : '')
      + '<div style="font-size:12px;color:var(--slate);margin-top:16px;line-height:1.5">Todos os modelos têm o cabeçalho da JJR, data inicial e final, banco (opcional), saldo inicial e a indicação de como as saídas foram digitadas. '
      + 'A lista de tipos é a mesma dos Pontos de Atenção; o cliente também pode digitar um tipo novo ou um fornecedor/cliente novo, e eles passam a aparecer na lista das próximas linhas. '
      + 'Quando o cliente devolver, anexe o arquivo em <b>Lançamentos Contábeis → Fluxo de Caixa</b>: o site reconhece o modelo sozinho.</div>';
  }

  // ── leitura do modelo devolvido (SheetJS) → mesmo formato do Fluxo por banco (_fxmb)
  const norm = s => (typeof _convMpRemoverAcentos === 'function' ? _convMpRemoverAcentos(String(s == null ? '' : s)) : String(s == null ? '' : s)).toLowerCase().replace(/\s+/g, ' ').trim();
  function ehModelo(wb) {
    try { const w = wb.Sheets['_jjr']; return !!(w && w.A1 && String(w.A1.v) === MARCA); } catch (e) { return false; }
  }
  function valorBR(v, comSinal) {
    if (typeof v === 'number') return comSinal ? v : Math.abs(v);
    let t = String(v == null ? '' : v).replace(/R\$/gi, '').replace(/\s/g, ''); if (!t) return NaN;
    const neg = /^[-−(]/.test(t) || /-$/.test(t); t = t.replace(/[-−()]/g, '');
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(t); if (isNaN(n)) return NaN;
    return comSinal ? (neg ? -n : n) : n;
  }
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function lerWorkbook(wb, nomeArquivo) {
    const ags = ((typeof _lancctbUltimasAgencias !== 'undefined' && _lancctbUltimasAgencias) || []).filter(a => a.ativo !== false);
    const fech = String((S.fechAtual && S.fechAtual()) || ''), soMes = !!(document.getElementById('lancctbFluxoImportSoMesAtual') || {}).checked;
    const resumo = [], registros = [], vistos = {};
    let bancoPrinc = '';
    wb.SheetNames.filter(n => n !== '_jjr' && n !== 'Listas').forEach(nome => {
      const m = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: '', cellDates: true });
      const hi = m.findIndex(r => (r || []).some(x => /^data da movimenta/.test(norm(x)))); if (hi < 0) return;
      const cab = m[hi].map(norm), ix = re => cab.findIndex(x => re.test(x));
      const c = { data: ix(/^data da movimenta/), hist: ix(/^historico bancario/), forn: ix(/^(fornecedor|cliente)/), tipoL: ix(/^tipo de (gasto|recebimento)/), tipoN: ix(/^tipo novo/), doc: ix(/^cnpj/), part: ix(/^marque/), nf: ix(/^n.{0,3} da nota/), saida: ix(/^valor de saida/), entrada: ix(/^valor de entrada/), valor: ix(/^valor \(entrada/), desc: ix(/^descricao/) };
      const campo = re => { for (let r = 0; r < hi; r++) { const row = m[r] || []; for (let k = 0; k < row.length; k++) if (re.test(norm(row[k]))) return row[k + 1] == null ? '' : row[k + 1]; } return ''; }; // valor fica na célula logo à direita do rótulo
      let banco = String(campo(/^banco/) || '').trim(); if (!banco && bancoPrinc) banco = bancoPrinc; if (banco && !bancoPrinc) bancoPrinc = banco;
      const agcc = String(campo(/^agencia/) || '').trim();
      let n = 0, ent = 0, sai = 0, descartadas = 0, foraMes = 0;
      const tx = (r, k) => (k >= 0 ? String(r[k] == null ? '' : r[k]).trim() : '');
      m.slice(hi + 1).forEach((r, k) => {
        r = r || [];
        const data = _fxmbData(c.data >= 0 ? r[c.data] : '');
        const part = !!tx(r, c.part) && !/^(nao|não|n)$/i.test(tx(r, c.part)); let doc = c.doc >= 0 ? r[c.doc] : ''; doc = typeof doc === 'number' ? String(Math.round(doc)) : String(doc || '').replace(/\D/g, ''); if (doc) doc = doc.length > 11 ? doc.padStart(14, '0') : doc.padStart(11, '0');
        const hist = tx(r, c.hist), forn = tx(r, c.forn), tipo = tx(r, c.tipoN) || tx(r, c.tipoL), nf = c.nf >= 0 ? r[c.nf] : '', desc = tx(r, c.desc);
        let vs = c.saida >= 0 ? valorBR(r[c.saida]) : NaN, ve = c.entrada >= 0 ? valorBR(r[c.entrada]) : NaN;
        if (c.valor >= 0) { const v = valorBR(r[c.valor], true); if (!isNaN(v)) { if (v < 0) vs = -v; else ve = v; } }
        const temValor = (vs > 0) || (ve > 0);
        if (!data && !temValor && !hist && !forn) return; // linha vazia
        if (!data || !temValor) { descartadas++; return; }
        if (soMes && fech && data.slice(0, 7) !== fech) { foraMes++; return; }
        const base = { aba: nome, data, descricao: [hist, desc, part ? 'PARTICULAR DO SÓCIO / DE TERCEIROS (marcado pelo cliente)' : ''].filter(Boolean).join(' | ') || forn || 'Lançamento do fluxo', cnpj: doc || null, particular: part, documento_numero: _fxmbDocNf(nf), categoria: tipo || null, forma: null, fornecedor: forn || null, banco: banco || null, linha: hi + k + 2 };
        [['S', vs], ['E', ve]].forEach(([t, v]) => {
          if (!(v > 0)) return;
          const v2 = Math.round(v * 100) / 100, kk = data + '|' + t + '|' + v2 + '|' + norm(forn) + '|' + norm(hist);
          vistos[kk] = (vistos[kk] || 0) + 1;
          registros.push(Object.assign({}, base, { valor_entrada: t === 'E' ? v2 : 0, valor_saida: t === 'S' ? v2 : 0, cod: 'JJR' + hash(kk) + '-' + vistos[kk] }));
          n++; if (t === 'E') ent += v2; else sai += v2;
        });
      });
      let conta = banco ? _fxmbContaDaAba(banco + (agcc ? ' ' + agcc : ''), ags) : null; if (!conta && ags.length === 1) conta = ags[0];
      resumo.push({ aba: nome, abaTxt: nome + (banco ? ' — ' + banco : ''), n, ent: Math.round(ent * 100) / 100, sai: Math.round(sai * 100) / 100, descartadas, foraMes, contaId: conta ? String(conta.id) : '' });
    });
    return { resumo, registros, arquivo: nomeArquivo, jjr: true };
  }
  function atualizarSel() {
    const sel = [...document.querySelectorAll('.modFluxoSel:checked')].map(c => c.value), todos = document.querySelectorAll('.modFluxoSel').length;
    const b = document.getElementById('modFluxoBaixarSel'); if (b) { b.style.display = sel.length ? '' : 'none'; b.textContent = '📥 Baixar selecionados (' + sel.length + ')'; }
    const t = document.getElementById('modFluxoTodos'); if (t) t.checked = sel.length === todos && todos > 0;
  }
  function marcarTodos(on) { document.querySelectorAll('.modFluxoSel').forEach(c => { c.checked = !!on; }); atualizarSel(); }
  async function baixarSelecionados(btn) {
    const sel = [...document.querySelectorAll('.modFluxoSel:checked')].map(c => c.value); if (!sel.length) return;
    if (btn) btn.disabled = true;
    const txt = btn ? btn.textContent : '';
    try {
      if (sel.length === 1) { await gerar(sel[0]); return; }
      // 27/11/2026: vários modelos de uma vez saem num arquivo .zip só (só nesta tela)
      if (typeof JSZip === 'undefined') { toast('Biblioteca de ZIP não carregada — recarregue a página (Ctrl+F5).', 'err'); return; }
      if (btn) btn.textContent = '⏳ Gerando ' + sel.length + ' modelos…';
      const zip = new JSZip();
      for (const k of ORDEM.filter(x => sel.includes(x))) { const f = await arquivo(k); zip.file(f.nome, f.buf); }
      const nomeZip = 'Modelos Fluxo de Caixa' + nomeLimpo(empSel().emp) + '.zip';
      baixarBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), nomeZip);
      toast(sel.length + ' modelos baixados em um arquivo ZIP: ' + nomeZip, 'ok');
    } finally { if (btn) { btn.disabled = false; if (txt) btn.textContent = txt; } }
  }
  root.ModFluxo = { atualizarSel, marcarTodos, baixarSelecionados, gerar, montar, render, ehModelo, lerWorkbook, VARIANTES };
})(window);

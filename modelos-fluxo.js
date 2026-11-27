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
  const LIN_CAB = 11, LIN_INI = 12, LIN_FIM = 511, N_MANUAL = 300;
  const VARIANTES = {
    pag: { nome: 'Só pagamentos', desc: 'Uma aba só com as SAÍDAS do banco (pagamentos), com saldo linha a linha.', abas: [{ nome: 'Pagamentos', tipo: 'pag', cols: ['saida', 'saldo'] }] },
    rec: { nome: 'Só recebimentos', desc: 'Uma aba só com as ENTRADAS do banco (recebimentos), com saldo linha a linha.', abas: [{ nome: 'Recebimentos', tipo: 'rec', cols: ['entrada', 'saldo'] }] },
    abas: { nome: 'Pagamentos e recebimentos em abas separadas', desc: 'Uma aba de Pagamentos e outra de Recebimentos. O cabeçalho é preenchido uma vez (aba Pagamentos) e o saldo final soma as duas.', abas: [{ nome: 'Pagamentos', tipo: 'pag', cols: ['saida'] }, { nome: 'Recebimentos', tipo: 'rec', cols: ['entrada'], espelho: true }] },
    mesma: { nome: 'Entrada e saída na mesma coluna', desc: 'Uma aba com uma coluna de valor só: entrada positiva, saída NEGATIVA (com sinal de menos). Saldo linha a linha.', abas: [{ nome: 'Fluxo de Caixa', tipo: 'mix', cols: ['valor', 'saldo'] }] },
    col: { nome: 'Entrada e saída em colunas diferentes', desc: 'Uma aba com uma coluna de Valor de saída e outra de Valor de entrada. Saldo linha a linha.', abas: [{ nome: 'Fluxo de Caixa', tipo: 'mix', cols: ['saida', 'entrada', 'saldo'] }] }
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
      { k: 'tipoL', t: (tp === 'pag' ? 'Tipo de gasto' : tp === 'rec' ? 'Tipo de recebimento' : 'Tipo de gasto / recebimento') + ' (escolha na lista)', w: 34 },
      { k: 'tipoN', t: 'Tipo novo (digite se não achar na lista — ele entra na lista)', w: 30 },
      { k: 'nf', t: 'Nº da nota fiscal (se houver)', w: 14 }
    ];
    aba.cols.forEach(k => {
      if (k === 'saida') c.push({ k, t: 'Valor de saída', w: 16 });
      if (k === 'entrada') c.push({ k, t: 'Valor de entrada', w: 16 });
      if (k === 'valor') c.push({ k, t: 'Valor (entrada + / saída −)', w: 18 });
      if (k === 'saldo') c.push({ k, t: 'Saldo', w: 16 });
    });
    c.push({ k: 'desc', t: 'Descrição / histórico detalhado (para a contabilidade)', w: 46 });
    c.forEach((x, i) => { x.i = i; x.L = letra(i); });
    return c;
  }
  const COR = { tit: 'FF0F7B6C', cab: 'FF1E293B', inp: 'FFFFF7D6', calc: 'FFEFF3F6', borda: 'FFCBD5E1', lbl: 'FF334155' };
  const borda = { top: { style: 'thin', color: { argb: COR.borda } }, left: { style: 'thin', color: { argb: COR.borda } }, bottom: { style: 'thin', color: { argb: COR.borda } }, right: { style: 'thin', color: { argb: COR.borda } } };
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const FMT_V = '#,##0.00;[Red]-#,##0.00';

  async function gerar(chave) {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca ExcelJS não carregada', 'err'); return; }
    const V = VARIANTES[chave]; if (!V) return;
    const eid = (document.getElementById('modFluxoEmp') || {}).value || '';
    const { wb, emp } = montar(chave, eid);
    const nomeEmp = emp ? ' - ' + String(emp.nome).replace(/[\\/:*?"<>|]/g, '').slice(0, 50) : '';
    const nomeArq = 'Modelo Fluxo de Caixa - ' + V.nome + nomeEmp + '.xlsx';
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomeArq; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Modelo gerado: ' + nomeArq, 'ok');
  }
  function montar(chave, eid) {
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
      const aux = letra(C.length + 2); // coluna auxiliar escondida (tipos novos → lista)
      C.forEach(x => { ws.getColumn(x.i + 1).width = x.w; });
      ws.getColumn(C.length + 3).hidden = true;
      // título
      ws.mergeCells('A1:' + ult + '1'); const t = ws.getCell('A1'); t.value = TITULO; t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }; t.fill = fill(COR.tit); t.alignment = { vertical: 'middle', horizontal: 'center' }; ws.getRow(1).height = 30;
      ws.mergeCells('A2:' + ult + '2'); const t2 = ws.getCell('A2'); t2.value = 'Fluxo de Caixa — ' + V.nome + (V.abas.length > 1 ? ' (aba ' + a.nome + ')' : ''); t2.font = { bold: true, size: 12, color: { argb: COR.lbl } }; t2.alignment = { horizontal: 'center' };
      ws.mergeCells('A3:' + ult + '3'); const t3 = ws.getCell('A3');
      t3.value = a.espelho ? 'O cabeçalho desta aba vem da aba Pagamentos (preencha lá). Aqui, só os recebimentos: uma linha por movimentação do extrato.' : 'Preencha os campos amarelos. Uma linha por movimentação do extrato bancário. Depois, devolva este arquivo para a JJR.';
      t3.font = { italic: true, size: 10, color: { argb: 'FF64748B' } }; t3.alignment = { horizontal: 'center', wrapText: true };
      // cabeçalho (rótulo em B, valor em C; rótulo em D, valor em E)
      const lbl = (end, txt) => { const c = ws.getCell(end); c.value = txt; c.font = { bold: true, color: { argb: COR.lbl } }; c.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }; };
      const inp = (end, v, fmt) => { const c = ws.getCell(end); if (a.espelho) { c.value = { formula: ref(princ.nome) + '!' + end }; c.fill = fill(COR.calc); } else { if (v != null) c.value = v; c.fill = fill(COR.inp); } c.border = borda; if (fmt) c.numFmt = fmt; c.alignment = { vertical: 'middle' }; };
      lbl('B5', 'Empresa:'); ws.mergeCells('C5:E5'); inp('C5', emp ? emp.nome : null);
      lbl('F5', 'CNPJ:'); ws.mergeCells('G5:' + (C.length > 8 ? 'H5' : 'H5')); inp('G5', emp ? (typeof _fmtCnpjCpf === 'function' ? _fmtCnpjCpf(emp.cnpjNum || emp.cnpj || '') : (emp.cnpj || '')) : null);
      lbl('B6', 'Data inicial:'); inp('C6', null, 'dd/mm/yyyy');
      lbl('D6', 'Data final:'); inp('E6', null, 'dd/mm/yyyy');
      lbl('B7', 'Banco (opcional):'); inp('C7', null);
      lbl('D7', 'Agência / conta (opcional):'); inp('E7', null);
      lbl('B8', 'Saldo inicial do banco:'); inp('C8', null, FMT_V);
      lbl('D8', 'As saídas estão digitadas como:');
      const sx = ws.getCell('E8');
      if (a.tipo === 'mix' && a.cols.includes('valor')) { sx.value = 'Negativas (obrigatório nesta planilha)'; sx.fill = fill(COR.calc); sx.border = borda; }
      else if (a.tipo === 'rec') { sx.value = a.espelho ? { formula: ref(princ.nome) + '!E8' } : 'Não se aplica (só entradas)'; sx.fill = fill(COR.calc); sx.border = borda; }
      else { inp('E8', 'Positivas (ex.: 150,00)'); if (!a.espelho) sx.dataValidation = { type: 'list', allowBlank: false, formulae: ['"Positivas (ex.: 150,00),Negativas (ex.: -150,00)"'], showErrorMessage: true, errorTitle: 'Escolha da lista', error: 'Escolha Positivas ou Negativas.' }; }
      ws.mergeCells('F8:' + ult + '8'); const nt = ws.getCell('F8');
      nt.value = (a.tipo === 'mix' && a.cols.includes('valor')) ? 'Entrada com valor positivo (150,00) e saída com sinal de menos (-150,00). O saldo soma tudo a partir do saldo inicial.'
        : 'Informe se digitou as saídas sem sinal (150,00) ou com sinal de menos (-150,00). O saldo é calculado certo nos dois casos.';
      nt.font = { size: 9.5, italic: true, color: { argb: 'FF64748B' } }; nt.alignment = { wrapText: true, vertical: 'middle' }; ws.getRow(8).height = 30;
      // totais (linha 9) — saídas, entradas e saldo final do período (soma as abas no modelo de abas separadas)
      const rngA = (aa, k) => { const x = aa.colunas.find(c => c.k === k); return x ? ref(aa.nome) + '!$' + x.L + '$' + LIN_INI + ':$' + x.L + '$' + LIN_FIM : null; };
      const fSai = [], fEnt = [];
      abas.forEach(aa => { const s = rngA(aa, 'saida'), e = rngA(aa, 'entrada'), v = rngA(aa, 'valor'); if (s) fSai.push('SUMPRODUCT(ABS(' + s + '))'); if (e) fEnt.push('SUMPRODUCT(ABS(' + e + '))'); if (v) { fSai.push('-SUMIF(' + v + ',"<0")'); fEnt.push('SUMIF(' + v + ',">0")'); } });
      lbl('B9', 'Total de saídas:'); const ts = ws.getCell('C9'); ts.value = { formula: fSai.length ? fSai.join('+') : '0' }; ts.numFmt = FMT_V; ts.fill = fill(COR.calc); ts.border = borda; ts.font = { bold: true };
      lbl('D9', 'Total de entradas:'); const te = ws.getCell('E9'); te.value = { formula: fEnt.length ? fEnt.join('+') : '0' }; te.numFmt = FMT_V; te.fill = fill(COR.calc); te.border = borda; te.font = { bold: true };
      lbl('F9', 'Saldo final:'); ws.mergeCells('G9:H9'); const tf = ws.getCell('G9'); tf.value = { formula: ref(princ.nome) + '!$C$8+E9-C9' }; tf.numFmt = FMT_V; tf.fill = fill(COR.calc); tf.border = borda; tf.font = { bold: true };
      // cabeçalho das colunas
      const hr = ws.getRow(LIN_CAB); hr.height = 42;
      C.forEach(x => { const c = hr.getCell(x.i + 1); c.value = x.t; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; c.fill = fill(COR.cab); c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; c.border = borda; });
      ws.getCell(aux + LIN_CAB).value = 'aux';
      ws.autoFilter = { from: { row: LIN_CAB, column: 1 }, to: { row: LIN_CAB, column: C.length } };
      // lista de tipos: padrão (Pontos de Atenção) + tipos novos digitados nesta aba
      const lc = letra(ia), pad = tiposPadrao(a.tipo), fimPad = 1 + pad.length;
      wl.getCell(lc + '1').value = 'Tipos — ' + a.nome; wl.getColumn(ia + 1).width = 44;
      pad.forEach((n, k) => { wl.getCell(lc + (2 + k)).value = n; });
      const tN = col('tipoN').L;
      for (let k = 1; k <= N_MANUAL; k++) wl.getCell(lc + (fimPad + k)).value = { formula: 'IFERROR(INDEX(' + ref(a.nome) + '!$' + tN + '$' + LIN_INI + ':$' + tN + '$' + LIN_FIM + ',MATCH(' + k + ',' + ref(a.nome) + '!$' + aux + '$' + LIN_INI + ':$' + aux + '$' + LIN_FIM + ',0)),"")' };
      const fimLista = fimPad + N_MANUAL;
      const fLista = 'OFFSET(Listas!$' + lc + '$2,0,0,MAX(1,COUNTIF(Listas!$' + lc + '$2:$' + lc + '$' + fimLista + ',"?*")),1)';
      // linhas de dados
      const cSai = col('saida'), cEnt = col('entrada'), cVal = col('valor'), cSal = col('saldo');
      for (let r = LIN_INI; r <= LIN_FIM; r++) {
        const row = ws.getRow(r);
        C.forEach(x => { const c = row.getCell(x.i + 1); c.border = borda; if (x.k === 'data') c.numFmt = 'dd/mm/yyyy'; if (x.k === 'saida' || x.k === 'entrada' || x.k === 'valor' || x.k === 'saldo') c.numFmt = FMT_V; if (x.k === 'hist' || x.k === 'desc' || x.k === 'forn') c.alignment = { wrapText: true, vertical: 'top' }; });
        row.getCell(col('data').i + 1).dataValidation = { type: 'date', operator: 'greaterThan', allowBlank: true, formulae: [new Date(2000, 0, 1)], showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Data', error: 'Digite uma data (dd/mm/aaaa).' };
        row.getCell(col('tipoL').i + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [fLista], showErrorMessage: true, errorStyle: 'information', errorTitle: 'Tipo fora da lista', error: 'Esse tipo não está na lista. Para ele entrar na lista, digite na coluna "Tipo novo".' };
        // auxiliar: numera cada tipo novo (1ª vez que aparece e que não está na lista padrão)
        ws.getCell(aux + r).value = { formula: 'IF(OR(' + tN + r + '="",COUNTIF(Listas!$' + lc + '$2:$' + lc + '$' + fimPad + ',' + tN + r + ')>0,COUNTIF(' + tN + '$' + LIN_INI + ':' + tN + r + ',' + tN + r + ')>1),"",MAX(' + aux + '$' + LIN_CAB + ':' + aux + (r - 1) + ')+1)' };
        if (cSal) {
          const c = row.getCell(cSal.i + 1); c.fill = fill(COR.calc);
          const S0 = '$C$8', parts = [];
          if (cEnt) parts.push('+SUM(' + cEnt.L + '$' + LIN_INI + ':' + cEnt.L + r + ')');
          if (cSai) parts.push('-SUMPRODUCT(ABS(' + cSai.L + '$' + LIN_INI + ':' + cSai.L + r + '))');
          if (cVal) parts.push('+SUM(' + cVal.L + '$' + LIN_INI + ':' + cVal.L + r + ')');
          const vazio = [cSai, cEnt, cVal].filter(Boolean).map(x => x.L + r + '=""');
          c.value = { formula: 'IF(' + (vazio.length > 1 ? 'AND(' + vazio.join(',') + ')' : vazio[0]) + ',"",' + S0 + parts.join('') + ')' };
        }
      }
    });
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
      + '<div style="font-size:13px;font-weight:700;margin:4px 0 10px">Fluxo de Caixa</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">'
      + ORDEM.map(k => { const V = VARIANTES[k]; return '<div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px">'
        + '<div style="display:flex;gap:8px;align-items:center"><span style="font-size:20px">' + icone[k] + '</span><b style="font-size:13.5px">' + E(V.nome) + '</b></div>'
        + '<div style="font-size:12px;color:var(--slate);flex:1">' + E(V.desc) + '</div>'
        + '<button class="action-btn action-btn-excel" onclick="ModFluxo.gerar(\'' + k + '\')">📊 Gerar Excel</button></div>'; }).join('')
      + '</div>'
      + '<div style="font-size:12px;color:var(--slate);margin-top:16px;line-height:1.5">Todos os modelos têm o cabeçalho da JJR, data inicial e final, banco (opcional), saldo inicial e a indicação de como as saídas foram digitadas. '
      + 'A lista de tipos é a mesma dos Pontos de Atenção, e o que o cliente digitar na coluna "Tipo novo" passa a aparecer na lista. '
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
      const c = { data: ix(/^data da movimenta/), hist: ix(/^historico bancario/), forn: ix(/^(fornecedor|cliente)/), tipoL: ix(/^tipo de (gasto|recebimento)/), tipoN: ix(/^tipo novo/), nf: ix(/^n.{0,3} da nota/), saida: ix(/^valor de saida/), entrada: ix(/^valor de entrada/), valor: ix(/^valor \(entrada/), desc: ix(/^descricao/) };
      const campo = re => { for (let r = 0; r < hi; r++) { const row = m[r] || []; for (let k = 0; k < row.length; k++) if (re.test(norm(row[k]))) return row[k + 1] == null ? '' : row[k + 1]; } return ''; }; // valor fica na célula logo à direita do rótulo
      let banco = String(campo(/^banco/) || '').trim(); if (!banco && bancoPrinc) banco = bancoPrinc; if (banco && !bancoPrinc) bancoPrinc = banco;
      const agcc = String(campo(/^agencia/) || '').trim();
      let n = 0, ent = 0, sai = 0, descartadas = 0, foraMes = 0;
      const tx = (r, k) => (k >= 0 ? String(r[k] == null ? '' : r[k]).trim() : '');
      m.slice(hi + 1).forEach((r, k) => {
        r = r || [];
        const data = _fxmbData(c.data >= 0 ? r[c.data] : '');
        const hist = tx(r, c.hist), forn = tx(r, c.forn), tipo = tx(r, c.tipoN) || tx(r, c.tipoL), nf = c.nf >= 0 ? r[c.nf] : '', desc = tx(r, c.desc);
        let vs = c.saida >= 0 ? valorBR(r[c.saida]) : NaN, ve = c.entrada >= 0 ? valorBR(r[c.entrada]) : NaN;
        if (c.valor >= 0) { const v = valorBR(r[c.valor], true); if (!isNaN(v)) { if (v < 0) vs = -v; else ve = v; } }
        const temValor = (vs > 0) || (ve > 0);
        if (!data && !temValor && !hist && !forn) return; // linha vazia
        if (!data || !temValor) { descartadas++; return; }
        if (soMes && fech && data.slice(0, 7) !== fech) { foraMes++; return; }
        const base = { aba: nome, data, descricao: [hist, desc].filter(Boolean).join(' | ') || forn || 'Lançamento do fluxo', documento_numero: _fxmbDocNf(nf), categoria: tipo || null, forma: null, fornecedor: forn || null, banco: banco || null, linha: hi + k + 2 };
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
  root.ModFluxo = { gerar, montar, render, ehModelo, lerWorkbook, VARIANTES };
})(window);

/* ═══════════════════════════════════════════════════════════════════════
 * ESTOQUE (custo médio ponderado mensal) — pedido do usuário 26/11/2026
 * Base: planilha "Estoques.xlsx" (aba Planilha2). Por empresa e ano, 12 subabas (meses).
 * Por produto, em cada mês:
 *   Estoque inicial = estoque final do mês anterior (janeiro: digitado/importado)
 *   Novo preço médio: qtd = inicial + entradas; total = inicial + entradas; preço médio = total ÷ qtd
 *   CMV = qtd. saída × preço médio · Estoque final = (qtd − saídas ; total − CMV)
 * Dados em S: estoque_<eid>_<ano> = { ini:{prod:{q,t}}, meses:{1..12:{ent:{prod:{q,t}}, sai:{prod:q}}} }
 * ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const ST = { eid: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, filtro: '', soMov: false };
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const R2 = v => Math.round((Number(v) || 0) * 100) / 100, R4 = v => Math.round((Number(v) || 0) * 10000) / 10000;
  const F = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const Q = v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  const num = t => { if (typeof t === 'number') return t; const s = String(t == null ? '' : t).replace(/[^\d,.-]/g, ''); if (!s) return 0; return parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
  const chave = (eid, ano) => 'estoque_' + eid + '_' + ano;
  function ler(eid, ano) { let v = null; try { v = S.g(chave(eid, ano)); } catch (e) { } if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } } v = v || {}; v.ini = v.ini || {}; v.meses = v.meses || {}; for (let m = 1; m <= 12; m++) { v.meses[m] = v.meses[m] || {}; v.meses[m].ent = v.meses[m].ent || {}; v.meses[m].sai = v.meses[m].sai || {}; } return v; }
  function gravar(eid, ano, o) { S.s(chave(eid, ano), o); }
  // calcula todos os meses até "ate" (inclusive); devolve { linhas do mês, totais }
  function calcular(o, ate) {
    const prods = new Set(Object.keys(o.ini)); for (let m = 1; m <= 12; m++) { Object.keys(o.meses[m].ent).forEach(p => prods.add(p)); Object.keys(o.meses[m].sai).forEach(p => prods.add(p)); }
    let atual = {}; [...prods].forEach(p => { const i = o.ini[p] || {}; atual[p] = { q: num(i.q), t: num(i.t) }; });
    let linhas = [];
    for (let m = 1; m <= ate; m++) {
      const mm = o.meses[m]; linhas = [];
      const prox = {};
      [...prods].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true })).forEach(p => {
        const si = atual[p] || { q: 0, t: 0 }, en = mm.ent[p] || {}, eq = num(en.q), et = num(en.t);
        const nq = R4(si.q + eq), nt = si.t + et, pm = nq ? nt / nq : 0; /* sem arredondar no meio da conta (igual ao Excel); só na tela */
        const sq = num(mm.sai[p]), cmv = sq * pm;
        const fq = R4(nq - sq), ft = nt - cmv;
        linhas.push({ p, iq: si.q, it: si.t, eq, et, em: eq ? et / eq : 0, nq, nt, pm, sq, cmv, fq, ft, alerta: sq > nq + 1e-9 });
        prox[p] = { q: fq, t: ft };
      });
      atual = prox;
    }
    return linhas;
  }

  // ── lista padrão de empresas ──
  function abrir() { const la = document.getElementById('estoqueListaArea'), rt = document.getElementById('estoqueRoot'); if (la) la.style.display = ''; if (rt) rt.style.display = 'none'; if (typeof prepararAdicionarEmpresa === 'function') prepararAdicionarEmpresa('estoque'); }
  function abrirEmp(eid) { ST.eid = String(eid); const la = document.getElementById('estoqueListaArea'), rt = document.getElementById('estoqueRoot'); if (la) la.style.display = 'none'; if (rt) rt.style.display = ''; render(); }

  function render() {
    const el = document.getElementById('estoqueRoot'); if (!el) return;
    const emp = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {};
    const anos = []; for (let a = new Date().getFullYear() + 1; a >= 2020; a--) anos.push(a);
    let h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button class="btn bo bsm" onclick="Estoque.abrir()">← Empresas</button><b style="font-size:15px">#' + E(ST.eid) + ' ' + E(emp.nome || '') + '</b>'
      + '<select class="si" onchange="Estoque.ano(this.value)">' + anos.map(a => '<option' + (a === ST.ano ? ' selected' : '') + '>' + a + '</option>').join('') + '</select>'
      + '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' + (ST.mes === 1 ? '<button class="btn bo bsm" onclick="Estoque.importar(\'ini\')" title="Excel com produto, quantidade e total do estoque em 31/12 do ano anterior">📥 Estoque inicial</button>' : '') + '<button class="btn bo bsm" onclick="Estoque.importar(\'ent\')" title="Excel com produto, quantidade e total (ou média) das entradas do mês">📥 Entradas do mês</button><button class="btn bo bsm" onclick="Estoque.importar(\'sai\')" title="Excel com produto e quantidade das saídas do mês">📥 Saídas do mês</button><button class="btn bo bsm" onclick="Estoque.novoProduto()">+ Produto</button><button class="action-btn action-btn-excel" onclick="Estoque.excel()">📊 Gerar Excel</button></span></div>';
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">' + MESES.map((n, i) => '<button class="btn ' + (ST.mes === i + 1 ? 'bp' : 'bo') + ' bsm" style="min-width:52px" onclick="Estoque.mes(' + (i + 1) + ')">' + n + '/' + String(ST.ano).slice(2) + '</button>').join('') + '<input class="si" placeholder="🔎 filtrar produto" value="' + E(ST.filtro) + '" oninput="Estoque.filtrar(this.value)" style="margin-left:auto;min-width:200px"><label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="checkbox" ' + (ST.soMov ? 'checked' : '') + ' onchange="Estoque.soMov(this.checked)"> só com saldo/movimento</label></div>';
    h += '<div id="estoqueCorpo"></div>';
    el.innerHTML = h; corpo();
  }
  function corpo() {
    const el = document.getElementById('estoqueCorpo'); if (!el) return; const o = ler(ST.eid, ST.ano), ls0 = calcular(o, ST.mes);
    const f = ST.filtro.trim().toLowerCase(); const ls = ls0.filter(l => (!f || String(l.p).toLowerCase().includes(f)) && (!ST.soMov || l.iq || l.it || l.eq || l.sq || l.fq || l.ft));
    if (!ls0.length) { el.innerHTML = '<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;color:var(--slate)">Nenhum produto ainda. Importe o <b>estoque inicial</b> (em Jan) ou as <b>entradas</b> do mês, ou clique em <b>+ Produto</b>.</div>'; return; }
    const grp = (t, n, cor) => '<th colspan="' + n + '" style="padding:5px;text-align:center;background:' + cor + ';color:#fff;position:sticky;top:0;z-index:2">' + t + '</th>';
    const th = (t) => '<th style="padding:5px 6px;text-align:right;background:var(--ink2);color:#fff;position:sticky;top:26px;z-index:2;white-space:nowrap">' + t + '</th>';
    const ini = ST.mes === 1, ed = (k, p, v, dec) => '<td style="padding:1px"><input class="si" value="' + (v ? (dec ? Q(v) : F(v)) : '') + '" placeholder="—" onfocus="this.select()" onchange="Estoque.set(\'' + k + '\',\'' + E(String(p)).replace(/'/g, '&#39;') + '\',this.value)" style="width:100%;min-width:74px;text-align:right;font-size:12px;padding:3px 4px"></td>';
    const v = (x, b, cor, dec) => '<td style="padding:4px 6px;text-align:right;font-family:var(--mono);white-space:nowrap;' + (b ? 'font-weight:700;' : '') + (cor ? 'color:' + cor + ';' : '') + '">' + (x ? (dec ? Q(x) : F(x)) : '') + '</td>';
    let t = '<div style="overflow:auto;max-height:calc(100vh - 320px);border:1px solid var(--border);border-radius:6px"><table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>' + '<th rowspan="2" style="padding:5px 8px;text-align:left;background:var(--ink2);color:#fff;position:sticky;top:0;left:0;z-index:3">Produto</th>'
      + grp('Estoque inicial', 2, '#1E3558') + grp('Entradas', 3, '#0F766E') + grp('Novo preço médio', 3, '#334155') + grp('Saídas', 2, '#9A3412') + grp('Estoque final', 2, '#854D0E') + '</tr><tr>'
      + th('Qtd.') + th('Total') + th('Qtd.') + th('Média') + th('Total') + th('Quantidade') + th('Total') + th('Preço médio') + th('Qtd.') + th('CMV') + th('Qtd.') + th('Total') + '</tr></thead><tbody>';
    const T = { iq: 0, it: 0, eq: 0, et: 0, nq: 0, nt: 0, sq: 0, cmv: 0, fq: 0, ft: 0 };
    ls.forEach(l => { Object.keys(T).forEach(k => T[k] += l[k]);
      t += '<tr' + (l.alerta ? ' style="background:rgba(220,38,38,.12)" title="Saída maior que o estoque disponível"' : '') + '><td style="padding:4px 8px;font-weight:600;position:sticky;left:0;background:var(--white)">' + E(l.p) + '</td>'
        + (ini ? ed('iq', l.p, l.iq, 1) + ed('it', l.p, l.it) : v(l.iq, 0, 0, 1) + v(l.it))
        + ed('eq', l.p, l.eq, 1) + v(l.em, 0, 'var(--slate)') + ed('et', l.p, l.et)
        + v(l.nq, 0, 0, 1) + v(l.nt) + v(l.pm, 1)
        + ed('sq', l.p, l.sq, 1) + v(l.cmv, 1, '#9A3412')
        + v(l.fq, 1, l.fq < 0 ? '#dc2626' : '', 1) + v(l.ft, 1, l.ft < 0 ? '#dc2626' : '') + '</tr>'; });
    t += '<tr style="font-weight:700;background:var(--bg)"><td style="padding:5px 8px;position:sticky;left:0;background:var(--bg)">TOTAL (' + ls.length + ' produtos)</td>' + v(T.iq, 1, 0, 1) + v(T.it, 1) + v(T.eq, 1, 0, 1) + '<td></td>' + v(T.et, 1) + v(T.nq, 1, 0, 1) + v(T.nt, 1) + '<td></td>' + v(T.sq, 1, 0, 1) + v(T.cmv, 1) + v(T.fq, 1, 0, 1) + v(T.ft, 1) + '</tr></tbody></table></div>';
    const al = ls0.filter(l => l.alerta).length;
    el.innerHTML = (al ? '<div style="color:#dc2626;font-size:12.5px;margin-bottom:6px">⚠ ' + al + ' produto(s) com saída maior que o estoque disponível no mês (linhas em vermelho).</div>' : '') + t + '<div style="font-size:11.5px;color:var(--slate);margin-top:6px">Estoque inicial de ' + MESES[ST.mes - 1] + ' = estoque final de ' + (ST.mes === 1 ? 'dezembro do ano anterior (digitado ou importado)' : MESES[ST.mes - 2]) + '. Preço médio = (total inicial + total das entradas) ÷ (qtd. inicial + qtd. das entradas). CMV = qtd. de saída × preço médio.</div>';
  }
  // ── edição ──
  function set(k, p, val) {
    const o = ler(ST.eid, ST.ano), m = o.meses[ST.mes], n = num(val);
    if (k === 'iq' || k === 'it') { o.ini[p] = o.ini[p] || {}; o.ini[p][k === 'iq' ? 'q' : 't'] = n; }
    else if (k === 'eq' || k === 'et') { m.ent[p] = m.ent[p] || {}; m.ent[p][k === 'eq' ? 'q' : 't'] = n; if (!num(m.ent[p].q) && !num(m.ent[p].t)) delete m.ent[p]; }
    else if (k === 'sq') { if (n) m.sai[p] = n; else delete m.sai[p]; }
    gravar(ST.eid, ST.ano, o); corpo();
  }
  function novoProduto() { const p = String(prompt('Código/descrição do produto:') || '').trim(); if (!p) return; const o = ler(ST.eid, ST.ano); if (!o.ini[p]) o.ini[p] = { q: 0, t: 0 }; gravar(ST.eid, ST.ano, o); corpo(); }
  // importa Excel: acha as colunas pelo cabeçalho (produto/código, qtd/quantidade, total/valor, média/preço)
  function importar(tipo) {
    if (typeof XLSX === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; let aoa;
      try { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null }); } catch (e) { toast('Não consegui ler: ' + e.message, 'err'); return; }
      const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
      let hdr = -1, cP = -1, cQ = -1, cT = -1, cM = -1;
      for (let r = 0; r < Math.min(aoa.length, 15) && hdr < 0; r++) { const row = (aoa[r] || []).map(nrm); const ip = row.findIndex(x => /^(PRODUTO|CODIGO|COD\.?|ITEM|DESCRICAO)/.test(x)); const iq = row.findIndex(x => /^(QTD|QUANT)/.test(x)); if (ip >= 0 && iq >= 0) { hdr = r; cP = ip; cQ = iq; cT = row.findIndex(x => /^(TOTAL|VALOR|VL)/.test(x)); cM = row.findIndex(x => /(MEDIA|PRECO|UNIT)/.test(x)); } }
      if (hdr < 0) { cP = 0; cQ = 1; cT = tipo === 'sai' ? -1 : (aoa[0] && aoa[0].length >= 4 ? 3 : 2); cM = aoa[0] && aoa[0].length >= 4 ? 2 : -1; hdr = typeof (aoa[0] || [])[1] === 'number' ? -1 : 0; }
      const o = ler(ST.eid, ST.ano), m = o.meses[ST.mes]; let n = 0, soma = 0;
      for (let r = hdr + 1; r < aoa.length; r++) { const row = aoa[r] || []; const p = row[cP]; if (p == null || String(p).trim() === '') continue; const prod = String(p).trim(); const q = num(row[cQ]); let tv = cT >= 0 ? num(row[cT]) : 0; if (!tv && cM >= 0) tv = R2(q * num(row[cM])); if (!q && !tv) continue;
        if (tipo === 'ini') o.ini[prod] = { q, t: tv }; else if (tipo === 'ent') m.ent[prod] = { q, t: tv }; else m.sai[prod] = q; n++; soma += tipo === 'sai' ? q : tv; }
      if (!n) { toast('Nenhuma linha com produto e quantidade encontrada.', 'err'); return; }
      gravar(ST.eid, ST.ano, o); const nm = { ini: 'Estoque inicial', ent: 'Entradas de ' + MESES[ST.mes - 1], sai: 'Saídas de ' + MESES[ST.mes - 1] }[tipo];
      alert(nm + ': ' + n + ' produto(s) importado(s) de ' + f.name + ' (' + (tipo === 'sai' ? 'qtd. total ' + Q(soma) : 'total R$ ' + F(soma)) + '). Se o produto já tinha valor neste mês, foi substituído.'); render();
    };
    inp.click();
  }
  async function excel() {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const o = ler(ST.eid, ST.ano), emp = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {};
    const wb = new ExcelJS.Workbook(), fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } }), bd = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    const MO = '#,##0.00;[Red]-#,##0.00', QT = '#,##0.####';
    for (let m = 1; m <= 12; m++) {
      const ls = calcular(o, m).filter(l => l.iq || l.it || l.eq || l.sq || l.fq || l.ft); if (!ls.length && m > ST.mes) continue;
      const ws = wb.addWorksheet(MESES[m - 1] + '-' + ST.ano, { views: [{ showGridLines: false, state: 'frozen', ySplit: 6, xSplit: 1 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      ws.columns = [{ width: 24 }, ...Array(12).fill({ width: 14 })];
      const fx = (r, t, cor, tam) => { ws.mergeCells(r, 1, r, 13); const c = ws.getCell(r, 1); c.value = t; c.font = { bold: true, size: tam, color: { argb: 'FFFFFFFF' } }; c.fill = fill(cor); ws.getRow(r).height = tam + 10; };
      fx(1, 'JJR CONSULTORIA CONTÁBIL', 'FF1E3558', 16); fx(2, 'Controle de Estoque — custo médio ponderado — ' + MESES[m - 1] + '/' + ST.ano, 'FF0F766E', 12);
      ws.mergeCells(3, 1, 3, 13); ws.getCell(3, 1).value = (emp.nome || '#' + ST.eid) + (emp.cnpj ? ' · CNPJ ' + emp.cnpj : ''); ws.getCell(3, 1).font = { bold: true, color: { argb: 'FF1E3558' } };
      const g = [['Produto', 1, 'FF1E3558'], ['Estoque inicial', 2, 'FF1E3558'], ['Entradas', 3, 'FF0F766E'], ['Novo preço médio', 3, 'FF334155'], ['Saídas', 2, 'FF9A3412'], ['Estoque final', 2, 'FF854D0E']]; let c0 = 1;
      g.forEach(([t, n, cor]) => { if (n > 1) ws.mergeCells(5, c0, 5, c0 + n - 1); const c = ws.getCell(5, c0); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = fill(cor); c.alignment = { horizontal: 'center' }; for (let k = 0; k < n; k++) ws.getCell(5, c0 + k).fill = fill(cor); c0 += n; });
      ['', 'Qtd.', 'Total', 'Qtd.', 'Média', 'Total', 'Quantidade', 'Total', 'Preço médio', 'Qtd.', 'CMV', 'Qtd.', 'Total'].forEach((t, i) => { const c = ws.getCell(6, i + 1); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = fill('FF475569'); c.border = bd; c.alignment = { horizontal: i ? 'right' : 'left' }; });
      let r = 7; const T = Array(13).fill(0);
      ls.forEach((l, k) => { const vals = [String(l.p), l.iq, l.it, l.eq, l.em, l.et, l.nq, l.nt, l.pm, l.sq, l.cmv, l.fq, l.ft];
        vals.forEach((x, i) => { const c = ws.getCell(r, i + 1); c.value = i ? R4(x) : x; c.border = bd; c.fill = fill(l.alerta ? 'FFFEE2E2' : (k % 2 ? 'FFF1F5F9' : 'FFFFFFFF')); if (i) { c.numFmt = [1, 3, 6, 9, 11].includes(i) ? QT : MO; if (![4, 8].includes(i)) T[i] += Number(x) || 0; } if (i === 12 || i === 10) c.font = { bold: true }; }); r++; });
      const tl = ws.getCell(r, 1); tl.value = 'TOTAL'; for (let i = 1; i <= 13; i++) { const c = ws.getCell(r, i); c.fill = fill('FFFFD700'); c.font = { bold: true }; c.border = bd; if (i > 1 && ![5, 9].includes(i)) { c.value = R2(T[i - 1]); c.numFmt = [2, 4, 7, 10, 12].includes(i) ? QT : MO; } }
    }
    const buf = await wb.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = 'Estoque_' + ST.eid + '_' + ST.ano + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  root.Estoque = { abrir, abrirEmp, render, ano: a => { ST.ano = +a; render(); }, mes: m => { ST.mes = m; render(); }, filtrar: v => { ST.filtro = v; clearTimeout(root._estT); root._estT = setTimeout(corpo, 250); }, soMov: v => { ST.soMov = v; corpo(); }, set, novoProduto, importar, excel, _calcular: calcular, _ler: ler };
})(typeof window !== 'undefined' ? window : this);

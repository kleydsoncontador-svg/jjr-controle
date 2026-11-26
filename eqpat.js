/* ═══════════════════════════════════════════════════════════════════════
 * CÁLCULO DA EQUIVALÊNCIA PATRIMONIAL — pedido do usuário 26/11/2026
 * Base: planilha "08 - Cálculo da Equivalência Patrimonial.xlsx" (aba 2023).
 * Por empresa investidora: uma ou mais investidas; para cada data-base (normalmente 31/12):
 *   Saldo final do PL = saldo inicial + aporte − diminuição de capital + AFAC + lucro − prejuízo + ajustes(+) − ajustes(−)
 *   Investimento atualizado = saldo final × % de participação
 *   Resultado da equivalência = (lucro − prejuízo + ajustes(+) − ajustes(−)) × % participação
 *   Variação do investimento = investimento atualizado − investimento atualizado anterior
 * Saldo inicial de cada linha = saldo final da linha anterior (a 1ª linha pode ser digitada).
 * Dados em S: eqpat_<eid> = { investidas:[{id,nome,cnpj,linhas:[{data,si,aporte,dim,afac,lucro,prej,ajPos,ajNeg,pct,divid,obs}]}] }
 * ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const ST = { eid: '', inv: '' };
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const R2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const F = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = t => { if (typeof t === 'number') return t; const s = String(t || '').replace(/[^\d,.-]/g, ''); if (!s) return 0; return parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
  const chave = eid => 'eqpat_' + eid;
  function ler(eid) { let v = null; try { v = S.g(chave(eid)); } catch (e) { } if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } } v = v || {}; v.investidas = v.investidas || []; return v; }
  function gravar(eid, o) { S.s(chave(eid), o); }
  const CAMPOS = [['aporte', 'Aporte de capital', 1], ['dim', 'Diminuição de capital', -1], ['afac', 'Adto. p/ futuro aumento de capital (AFAC)', 1], ['lucro', 'Lucro do exercício', 1], ['prej', '(−) Prejuízo do exercício', -1], ['ajPos', 'Ajustes de exercícios anteriores (+)', 1], ['ajNeg', '(−) Ajustes de exercícios anteriores', -1]];
  // cálculo de todas as linhas de uma investida (em ordem de data)
  function calcular(inv) {
    const ls = (inv.linhas || []).slice().sort((a, b) => String(a.data).localeCompare(String(b.data)));
    let antSF = null, antInv = 0;
    return ls.map((l, i) => {
      const si = i === 0 || l.siManual ? num(l.si) : antSF;
      const mov = CAMPOS.reduce((s, c) => s + c[2] * num(l[c[0]]), 0);
      const sf = R2(si + mov), pct = num(l.pct) / 100;
      const invAt = R2(sf * pct), resultado = R2((num(l.lucro) - num(l.prej) + num(l.ajPos) - num(l.ajNeg)) * pct);
      const variacao = R2(invAt - antInv);
      const r = Object.assign({}, l, { si: R2(si), sf, pctN: num(l.pct), invAt, resultado, variacao, tipo: resultado > 0.004 ? 'Resultado positivo da equivalência patrimonial' : (resultado < -0.004 ? 'Resultado negativo da equivalência patrimonial' : '') });
      antSF = sf; antInv = invAt; return r;
    });
  }
  const dataBR = d => d ? String(d).split('-').reverse().join('/') : '';

  // ── lista padrão de empresas ──
  function abrir() { const la = document.getElementById('eqpatListaArea'), rt = document.getElementById('eqpatRoot'); if (la) la.style.display = ''; if (rt) rt.style.display = 'none'; if (typeof prepararAdicionarEmpresa === 'function') prepararAdicionarEmpresa('eqpat'); }
  function abrirEmp(eid) { ST.eid = String(eid); const o = ler(ST.eid); ST.inv = (o.investidas[0] || {}).id || ''; const la = document.getElementById('eqpatListaArea'), rt = document.getElementById('eqpatRoot'); if (la) la.style.display = 'none'; if (rt) rt.style.display = ''; render(); }

  function render() {
    const el = document.getElementById('eqpatRoot'); if (!el) return;
    const emp = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {}, o = ler(ST.eid);
    let h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><button class="btn bo bsm" onclick="EqPat.abrir()">← Empresas</button><b style="font-size:15px">#' + E(ST.eid) + ' ' + E(emp.nome || '') + '</b><span style="font-size:12px;color:var(--slate)">(investidora)</span>'
      + '<span style="margin-left:auto;display:flex;gap:8px"><button class="btn bp bsm" onclick="EqPat.novaInvestida()">+ Investida</button>' + (o.investidas.length ? '<button class="action-btn action-btn-excel" onclick="EqPat.excel()">📊 Gerar Excel</button>' : '') + '</span></div>';
    if (!o.investidas.length) { el.innerHTML = h + '<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;color:var(--slate)">Nenhuma investida cadastrada. Clique em <b>+ Investida</b> e informe a empresa da qual esta empresa tem participação.</div>'; return; }
    if (!o.investidas.some(i => i.id === ST.inv)) ST.inv = o.investidas[0].id;
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + o.investidas.map(i => '<button class="btn ' + (i.id === ST.inv ? 'bp' : 'bo') + ' bsm" onclick="EqPat.inv(\'' + i.id + '\')">' + E(i.nome || 'Investida') + '</button>').join('') + '</div>';
    const inv = o.investidas.find(i => i.id === ST.inv), rows = calcular(inv);
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;font-size:12.5px"><b>Investida:</b> <input class="si" value="' + E(inv.nome || '') + '" placeholder="nome da investida" onchange="EqPat.setInv(\'nome\',this.value)" style="min-width:280px"> <input class="si" value="' + E(inv.cnpj || '') + '" placeholder="CNPJ" onchange="EqPat.setInv(\'cnpj\',this.value)" style="width:170px"> <button class="btn bo bsm" onclick="EqPat.novaLinha()">+ Data-base</button><button class="btn bsm" style="background:#dc2626;color:#fff" onclick="EqPat.excluirInv()">Excluir investida</button></div>';
    const th = (t, r) => '<th style="padding:6px 6px;background:var(--ink2);color:#fff;text-align:' + (r ? 'right' : 'left') + ';white-space:normal;font-size:11px;position:sticky;top:0">' + t + '</th>';
    const inp = (i, k, v) => '<td style="padding:2px"><input class="si" value="' + (v ? F(v) : '') + '" placeholder="0,00" onfocus="this.select()" onchange="EqPat.setLinha(' + i + ',\'' + k + '\',this.value)" style="width:100%;min-width:92px;text-align:right;font-size:12px;padding:4px"></td>';
    const out = (v, b, cor) => '<td style="padding:4px 6px;text-align:right;font-family:var(--mono);white-space:nowrap;' + (b ? 'font-weight:700;' : '') + (cor ? 'color:' + cor + ';' : '') + '">' + F(v) + '</td>';
    let t = '<div style="overflow:auto;max-height:calc(100vh - 330px);border:1px solid var(--border);border-radius:6px"><table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>' + th('Data-base') + th('Saldo inicial do PL', 1) + CAMPOS.map(c => th(c[1], 1)).join('') + th('Saldo final do PL', 1) + th('% participação', 1) + th('Investimento atualizado', 1) + th('Lucros / dividendos', 1) + th('Resultado da equivalência', 1) + th('Variação do investimento', 1) + th('') + '</tr></thead><tbody>';
    rows.forEach(r => {
      const i = inv.linhas.indexOf(inv.linhas.find(x => x.id === r.id));
      t += '<tr><td style="padding:2px"><input type="date" class="si" value="' + E(r.data || '') + '" onchange="EqPat.setLinha(' + i + ',\'data\',this.value)" style="font-size:12px;padding:3px"></td>'
        + (r === rows[0] || r.siManual ? inp(i, 'si', r.si) : out(r.si))
        + CAMPOS.map(c => inp(i, c[0], num(r[c[0]]))).join('')
        + out(r.sf, 1) + '<td style="padding:2px"><input class="si" value="' + (r.pctN ? String(r.pctN).replace('.', ',') : '') + '" placeholder="%" onchange="EqPat.setLinha(' + i + ',\'pct\',this.value)" style="width:70px;text-align:right;font-size:12px;padding:4px"></td>'
        + out(r.invAt, 1) + inp(i, 'divid', num(r.divid)) + out(r.resultado, 1, r.resultado < 0 ? '#dc2626' : (r.resultado > 0 ? '#16a34a' : '')) + out(r.variacao)
        + '<td style="padding:2px;text-align:center"><button class="icon-btn" title="Excluir esta data-base" onclick="EqPat.excluirLinha(' + i + ')" style="border:none;background:none;cursor:pointer;color:#dc2626">🗑️</button></td></tr>';
      if (r.tipo) t += '<tr><td colspan="16" style="padding:2px 8px 6px;font-size:11.5px;color:' + (r.resultado < 0 ? '#dc2626' : '#16a34a') + '">↳ ' + dataBR(r.data) + ': ' + r.tipo + ' de R$ ' + F(Math.abs(r.resultado)) + ' — lançamento: ' + (r.resultado > 0 ? 'D Investimentos (participação em ' + E(inv.nome || 'investida') + ') / C Receita de equivalência patrimonial' : 'D Despesa de equivalência patrimonial / C Investimentos (participação em ' + E(inv.nome || 'investida') + ')') + (num(r.divid) ? ' · Dividendos: D Dividendos a receber / C Investimentos R$ ' + F(num(r.divid)) : '') + '</td></tr>';
    });
    const tot = k => rows.reduce((s, r) => s + num(r[k]), 0);
    t += '<tr style="font-weight:700;background:var(--bg)"><td style="padding:5px 6px">Totais</td><td></td>' + CAMPOS.map(c => out(tot(c[0]))).join('') + '<td></td><td></td><td></td>' + out(tot('divid')) + out(rows.reduce((s, r) => s + r.resultado, 0)) + out(rows.reduce((s, r) => s + r.variacao, 0)) + '<td></td></tr></tbody></table></div>';
    h += t + '<div style="font-size:11.5px;color:var(--slate);margin-top:6px">Saldo inicial de cada data-base = saldo final da anterior (só a primeira é digitada). Resultado da equivalência = (lucro − prejuízo + ajustes) × % de participação. Investimento atualizado = saldo final do PL × % de participação.</div>';
    el.innerHTML = h;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function mut(fn) { const o = ler(ST.eid); const inv = o.investidas.find(i => i.id === ST.inv); fn(o, inv); gravar(ST.eid, o); render(); }
  function novaInvestida() { const nome = prompt('Nome da investida (empresa da qual esta empresa tem participação):'); if (!nome) return; const o = ler(ST.eid); const id = uid(); const ano = new Date().getFullYear() - 1; o.investidas.push({ id, nome: nome.trim(), cnpj: '', linhas: [{ id: uid(), data: ano + '-12-31', pct: 100 }] }); gravar(ST.eid, o); ST.inv = id; render(); }
  function excluirInv() { const o = ler(ST.eid); const inv = o.investidas.find(i => i.id === ST.inv); if (!inv || !confirm('Excluir a investida "' + inv.nome + '" e todas as datas-base dela?')) return; o.investidas = o.investidas.filter(i => i.id !== ST.inv); gravar(ST.eid, o); ST.inv = ''; render(); }
  function novaLinha() { mut((o, inv) => { const ult = (inv.linhas || []).map(l => l.data).sort().pop(); const y = ult ? (+ult.slice(0, 4) + 1) : new Date().getFullYear(); const pctAnt = (inv.linhas || []).slice().sort((a, b) => String(a.data).localeCompare(String(b.data))).map(l => l.pct).filter(Boolean).pop(); inv.linhas.push({ id: uid(), data: y + '-12-31', pct: pctAnt || 100 }); }); }
  function excluirLinha(i) { if (!confirm('Excluir esta data-base?')) return; mut((o, inv) => { inv.linhas.splice(i, 1); }); }
  function setLinha(i, k, v) { mut((o, inv) => { const l = inv.linhas[i]; if (!l) return; if (k === 'data') l.data = v; else if (k === 'pct') l.pct = num(v); else { l[k] = num(v); if (k === 'si') l.siManual = l !== inv.linhas.slice().sort((a, b) => String(a.data).localeCompare(String(b.data)))[0]; } }); }
  function setInv(k, v) { mut((o, inv) => { inv[k] = String(v || '').trim(); }); }
  function inv(id) { ST.inv = id; render(); }
  async function excel() {
    const o = ler(ST.eid); if (typeof ExcelJS === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const emp = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {};
    const AZUL = 'FF1E3558', VERDE = 'FF0F766E', OURO = 'FFFFD700', CINZA = 'FFF1F5F9', BR = 'FFFFFFFF';
    const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } }), bd = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    const wb = new ExcelJS.Workbook(); const MOEDA = '#,##0.00;[Red]-#,##0.00';
    o.investidas.forEach(inv => {
      const ws = wb.addWorksheet(String(inv.nome || 'Investida').replace(/[\\/?*\[\]:]/g, ' ').slice(0, 30), { views: [{ showGridLines: false }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      const cols = ['Data-base', 'Saldo inicial do PL', ...CAMPOS.map(c => c[1]), 'Saldo final do PL', '% participação', 'Investimento atualizado', 'Lucros / dividendos', 'Resultado da equivalência', 'Variação do investimento', 'Tipo'];
      ws.columns = cols.map((c, i) => ({ width: i === 0 ? 12 : (i === cols.length - 1 ? 44 : 16) }));
      const faixa = (r, txt, cor, tam) => { ws.mergeCells(r, 1, r, cols.length); const c = ws.getCell(r, 1); c.value = txt; c.font = { size: tam, bold: true, color: { argb: BR } }; c.fill = fill(cor); ws.getRow(r).height = tam + 10; };
      faixa(1, 'JJR CONSULTORIA CONTÁBIL', AZUL, 16); faixa(2, 'Cálculo da Equivalência Patrimonial', VERDE, 12);
      ws.mergeCells(3, 1, 3, cols.length); ws.getCell(3, 1).value = 'Investidora: ' + (emp.nome || '#' + ST.eid) + (emp.cnpj ? ' · CNPJ ' + emp.cnpj : '') + '   |   Investida: ' + (inv.nome || '') + (inv.cnpj ? ' · CNPJ ' + inv.cnpj : ''); ws.getCell(3, 1).font = { bold: true, color: { argb: AZUL } };
      let r = 5; cols.forEach((t, i) => { const c = ws.getCell(r, i + 1); c.value = t; c.font = { bold: true, color: { argb: BR }, size: 10 }; c.fill = fill(VERDE); c.border = bd; c.alignment = { wrapText: true, vertical: 'middle', horizontal: i ? 'center' : 'left' }; }); ws.getRow(r).height = 32; r++;
      calcular(inv).forEach((l, k) => { const vals = [dataBR(l.data), l.si, ...CAMPOS.map(c => num(l[c[0]])), l.sf, l.pctN / 100, l.invAt, num(l.divid), l.resultado, l.variacao, l.tipo];
        vals.forEach((v, i) => { const c = ws.getCell(r, i + 1); c.value = v; c.border = bd; c.fill = fill(k % 2 ? CINZA : BR); if (i > 0 && i < vals.length - 1) { c.numFmt = i === cols.length - 6 ? '0.00%' : MOEDA; c.alignment = { horizontal: 'right' }; } if (i === cols.length - 5 || i === cols.length - 3) c.font = { bold: true }; }); r++; });
      ws.mergeCells(r + 1, 1, r + 1, cols.length); ws.getCell(r + 1, 1).value = 'Resultado da equivalência = (lucro − prejuízo + ajustes) × % de participação · Investimento atualizado = saldo final do PL × % de participação'; ws.getCell(r + 1, 1).font = { italic: true, size: 9, color: { argb: 'FF475569' } };
    });
    const buf = await wb.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = 'Equivalencia_Patrimonial_' + ST.eid + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  root.EqPat = { abrir, abrirEmp, render, novaInvestida, excluirInv, novaLinha, excluirLinha, setLinha, setInv, inv, excel, _calcular: calcular };
})(typeof window !== 'undefined' ? window : this);

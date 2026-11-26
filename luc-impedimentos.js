/* ═══ Lucros / Dividendos → 🚫 Impedimentos (pedido do usuário 26/11/2026) ═══
   STF, ADI 5.161 (tese fixada em 30/09/2026): a multa do art. 32 da Lei 4.357/1964 e do art. 52 da Lei 8.212/1991 por distribuir lucros
   só incide quando, AO MESMO TEMPO: (1) há débito inscrito em dívida ativa da União; (2) a exigibilidade NÃO está suspensa (art. 151 CTN);
   (3) o débito NÃO está garantido (art. 9º da Lei 6.830/80).
   Aqui o usuário inclui a empresa, marca os requisitos que ela cumpre e, mês a mês, BLOQUEIA a distribuição a partir de um mês — os meses
   seguintes ficam bloqueados até um mês em que ele DESBLOQUEIA. Mês bloqueado: Lucros/Dividendos não deixa lançar pagamento nem crédito de lucro.
   Dados (dados_app): luc_impedimentos = { "<eid>": { req:{inscrito,naoSuspensa,naoGarantida}, ev:{ "AAAA-MM":"bloq"|"desbloq" }, obs, desde } } */
(function (root) {
  'use strict';
  const KEY = 'luc_impedimentos';
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const REQ = [
    ['inscrito', 'Dívida ativa', 'Débito definitivamente constituído e INSCRITO em dívida ativa da União'],
    ['naoSuspensa', 'Não suspensa', 'Exigibilidade NÃO suspensa (nenhuma causa do art. 151 do CTN: parcelamento, liminar, impugnação…)'],
    ['naoGarantida', 'Sem garantia', 'Débito NÃO garantido (nenhuma modalidade do art. 9º da Lei 6.830/80: depósito, fiança, seguro, penhora…)']
  ];
  const ST = { ano: new Date().getFullYear(), fc: {}, foco: '' };
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  function dados() { let v = null; try { v = S.g(KEY); } catch (e) { } return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
  function salvar(d) { S.s(KEY, d); }
  function emp(eid) { return (S.emps() || []).find(e => String(e.eid) === String(eid)) || {}; }
  // situação do mês "AAAA-MM": vale o último evento até esse mês (vem dos anos anteriores também)
  function bloqueado(eid, mk) {
    const r = dados()[String(eid)]; if (!r || !r.ev) return false;
    let ult = null; Object.keys(r.ev).sort().forEach(k => { if (k <= mk) ult = r.ev[k]; });
    return ult === 'bloq';
  }
  function mkDe(ano, mes) { return String(ano) + '-' + String(mes).padStart(2, '0'); }
  function reqOk(r) { return !!(r && r.req && REQ.every(([k]) => r.req[k])); }

  // ── tela ──
  // 26/11/2026: tela COMPLETA do site (page-lucimp), não janela. Duas vistas: lista das empresas e Base legal.
  let _anoIni = false;
  function abrir() { ST.view = 'lista'; if (typeof goPage === 'function') goPage('lucimp'); else render(); }
  function fechar() { if (typeof goPage === 'function') goPage('lucros'); }
  function base(tema) { ST.view = 'base'; ST.tema = tema || ''; render(); }
  function render() {
    const ov = document.getElementById('lucImpRoot'); if (!ov) return;
    if (!_anoIni) { _anoIni = true; const fa = (typeof S.fechAtual === 'function' && S.fechAtual()) || ''; const a = parseInt(String(fa).slice(0, 4), 10); if (a) ST.ano = a; }
    if (ST.view === 'base') { renderBase(ov); return; }
    const lista = (S.emps() || []).slice().sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    const anos = []; for (let y = ST.ano - 3; y <= ST.ano + 2; y++) anos.push(y);
    ov.innerHTML = '<div style="display:flex;flex-direction:column;min-height:calc(100vh - 120px)">'
      + '<div style="padding:4px 0 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
      + '<button class="btn bo bsm" onclick="LucImp.fechar()">← Lucros / Dividendos</button>'
      + '<div class="ptitle" style="margin:0">🚫 Impedimentos à distribuição de lucros</div>'
      + '<span style="margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><button class="action-btn action-btn-excel" onclick="LucImp.excel()" title="Excel personalizado (JJR) com a lista da tela">📊 Gerar Excel</button><button class="action-btn action-btn-pdf" onclick="LucImp.pdf()" title="Relatório em PDF">📄 Gerar PDF</button><button class="btn bo bsm" onclick="LucImp.teams()" title="Copia a tabela formatada para colar (Ctrl+V) no Teams">💬 Copiar p/ Teams</button><button class="btn bp bsm" onclick="LucImp.base()" title="Leis e artigos (texto original) com explicação simples">📜 Base legal</button><select class="si" onchange="LucImp.ano(this.value)">' + anos.map(y => '<option' + (y === ST.ano ? ' selected' : '') + '>' + y + '</option>').join('') + '</select></span></div>'
      + '<div class="psub" style="margin:0 0 10px">STF, ADI 5.161 (30/09/2026): a multa do art. 32 da Lei 4.357/64 e do art. 52 da Lei 8.212/91 por distribuir lucros só existe quando os 3 requisitos acontecem ao mesmo tempo. Clique no nome de cada requisito para ver a lei.</div>'
      + '<div style="padding:10px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">'
      + '<label style="font-weight:700;font-size:13px">Adicionar empresa:</label>'
      + '<input class="si" id="lucImpAdd" list="lucImpDL" placeholder="🔍 ID, nome ou CNPJ…" style="width:360px">'
      + '<datalist id="lucImpDL">' + lista.map(e => '<option value="' + E(e.eid + ' — ' + (e.nome || '') + (e.cnpj ? ' — ' + e.cnpj : '')) + '"></option>').join('') + '</datalist>'
      + '<button class="btn bp bsm" onclick="LucImp.adicionar()">＋ Adicionar</button>'
      + '<span style="font-size:11.5px;color:var(--slate);margin-left:8px">Clique no mês para <b>bloquear a partir dele</b>; os meses seguintes ficam bloqueados até você clicar num mês para <b>desbloquear</b>. Clicar de novo no mesmo mês desfaz.</span></div>'
      + '<div id="lucImpCorpo" style="flex:1;overflow:auto;max-height:calc(100vh - 260px);margin-top:8px"></div></div>';
    corpo();
  }
  const fIn = (k, ph, w) => '<th style="padding:3px;background:var(--ink3,#2D3447)"><input class="si" data-fc="' + k + '" value="' + E(ST.fc[k] || '') + '" placeholder="' + (ph || '🔎') + '" oninput="LucImp.fcol(\'' + k + '\',this.value)" style="width:100%;min-width:' + (w || 50) + 'px;font-size:11px;padding:2px 4px"></th>';
  const fSel = (k, ops) => '<th style="padding:3px;background:var(--ink3,#2D3447)"><select class="si" onchange="LucImp.fcol(\'' + k + '\',this.value,1)" style="width:100%;font-size:11px;padding:2px">' + ops.map(([v, t]) => '<option value="' + v + '"' + ((ST.fc[k] || '') === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></th>';
  // linhas da tela (com os filtros de coluna) — usadas também pelo Excel, PDF e Teams
  function linhasAtuais() {
    const d = dados(), fc = ST.fc; const fa = (typeof S.fechAtual === 'function' && S.fechAtual()) || '';
    const mkHoje = String(fa).slice(0, 7);
    const ids = Object.keys(d).filter(k => d[k] && typeof d[k] === 'object');
    let linhas = ids.map(eid => { const e = emp(eid), r = d[eid]; return { eid, nome: e.nome || '(empresa #' + eid + ')', cnpj: e.cnpj || '', r, hoje: mkHoje ? bloqueado(eid, mkHoje) : false }; })
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    linhas = linhas.filter(l => (!fc.eid || String(l.eid).includes(fc.eid.trim())) && (!fc.nome || nrm(l.nome).includes(nrm(fc.nome))) && (!fc.cnpj || String(l.cnpj).replace(/\D/g, '').includes(String(fc.cnpj).replace(/\D/g, '')))
      && REQ.every(([k]) => !fc[k] || (fc[k] === 's' ? !!(l.r.req || {})[k] : !(l.r.req || {})[k]))
      && (!fc.sit || (fc.sit === 'bloq' ? l.hoje : !l.hoje)));
    linhas.forEach(l => { l.meses = []; for (let m = 1; m <= 12; m++) { const mk = mkDe(ST.ano, m); l.meses.push({ mk, b: bloqueado(l.eid, mk), ev: (l.r.ev || {})[mk] || '' }); } l.ok = reqOk(l.r); });
    return { linhas, ids, mkHoje };
  }
  function corpo() {
    const el = document.getElementById('lucImpCorpo'); if (!el) return;
    const { linhas, ids, mkHoje } = linhasAtuais();
    const th = (t, al, tt) => '<th style="padding:6px 6px;background:var(--ink2);color:#fff;font-size:11px;white-space:nowrap;text-align:' + (al || 'center') + '"' + (tt ? ' title="' + E(tt) + '"' : '') + '>' + t + '</th>';
    let h = '<table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead style="position:sticky;top:0;z-index:2"><tr>'
      + th('ID') + th('Empresa', 'left') + th('CNPJ', 'left') + REQ.map(([k, n, t]) => th('<span onclick="LucImp.base(\'' + k + '\')" style="cursor:pointer;text-decoration:underline dotted" title="' + E(t) + ' — clique para ver a base legal">' + n + ' 📜</span>', 'center')).join('') + th('3 requisitos') + th('Situação ' + (mkHoje ? mkHoje.slice(5) + '/' + mkHoje.slice(0, 4) : 'hoje'))
      + MESES.map(m => th(m + '/' + String(ST.ano).slice(2))).join('') + th('') + '</tr><tr>'
      + fIn('eid', 'ID', 40) + fIn('nome', '🔎 empresa', 160) + fIn('cnpj', 'CNPJ', 90) + REQ.map(([k]) => fSel(k, [['', 'Todos'], ['s', '✔'], ['n', '—']])).join('')
      + '<th style="background:var(--ink3,#2D3447)"></th>' + fSel('sit', [['', 'Todas'], ['bloq', '🔒 Impedida'], ['lib', '✅ Liberada']])
      + MESES.map(() => '<th style="background:var(--ink3,#2D3447)"></th>').join('') + '<th style="background:var(--ink3,#2D3447)"></th></tr></thead><tbody>';
    if (!linhas.length) h += '<tr><td colspan="' + (8 + 12) + '" style="padding:18px;text-align:center;color:var(--slate)">' + (ids.length ? 'Nenhuma empresa com esses filtros.' : 'Nenhuma empresa incluída ainda. Use “Adicionar empresa” acima.') + '</td></tr>';
    linhas.forEach((l, i) => {
      const ok = reqOk(l.r), bg = i % 2 ? 'var(--bg)' : 'var(--white)';
      h += '<tr style="background:' + bg + ';border-bottom:1px solid var(--border)">'
        + '<td style="padding:5px 6px;text-align:center"><span class="idtag">' + E(l.eid) + '</span></td>'
        + '<td style="padding:5px 6px;font-weight:600">' + E(l.nome) + '</td>'
        + '<td style="padding:5px 6px;font-family:var(--mono);font-size:11px;white-space:nowrap">' + E(l.cnpj) + '</td>'
        + REQ.map(([k, n, t]) => '<td style="padding:5px 6px;text-align:center" title="' + E(t) + '"><input type="checkbox" ' + ((l.r.req || {})[k] ? 'checked' : '') + ' onchange="LucImp.req(\'' + l.eid + '\',\'' + k + '\',this.checked)" style="width:16px;height:16px;cursor:pointer"></td>').join('')
        + '<td style="padding:5px 6px;text-align:center;font-weight:700;color:' + (ok ? '#dc2626' : 'var(--slate)') + '" title="' + (ok ? 'Os 3 requisitos estão marcados: distribuir lucro gera multa' : 'Faltam requisitos: sem multa pela tese do STF') + '">' + (ok ? '⚠ Sim' : 'Não') + '</td>'
        + '<td style="padding:5px 6px;text-align:center;white-space:nowrap;font-weight:700;color:' + (l.hoje ? '#dc2626' : '#16a34a') + '">' + (l.hoje ? '🔒 Impedida' : '✅ Liberada') + '</td>';
      for (let m = 1; m <= 12; m++) {
        const mk = mkDe(ST.ano, m), b = bloqueado(l.eid, mk), ev = (l.r.ev || {})[mk];
        const txt = ev === 'bloq' ? '🔒 bloqueia' : ev === 'desbloq' ? '🔓 libera' : (b ? '🔒' : '');
        h += '<td onclick="LucImp.mes(\'' + l.eid + '\',\'' + mk + '\')" title="' + (ev ? 'Clique para desfazer este ' + (ev === 'bloq' ? 'bloqueio' : 'desbloqueio') : (b ? 'Bloqueado — clique para DESBLOQUEAR a partir deste mês' : 'Liberado — clique para BLOQUEAR a partir deste mês')) + '" style="padding:5px 4px;text-align:center;cursor:pointer;white-space:nowrap;font-size:11px;min-width:58px;border-left:1px solid var(--border);'
          + (b ? 'background:rgba(220,38,38,.16);color:#dc2626;font-weight:' + (ev ? 800 : 600) : (ev === 'desbloq' ? 'background:rgba(22,163,74,.14);color:#16a34a;font-weight:800' : 'color:var(--slate)')) + '">' + txt + '</td>';
      }
      h += '<td style="padding:5px 6px;text-align:center"><button class="icon-btn" onclick="LucImp.remover(\'' + l.eid + '\')" title="Tirar a empresa da lista">🗑️</button></td></tr>';
    });
    el.innerHTML = h + '</tbody></table>';
    if (ST.foco) { const inp = el.querySelector('[data-fc="' + ST.foco + '"]'); if (inp) { inp.focus(); const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e) { } } }
  }
  function adicionar() {
    const inp = document.getElementById('lucImpAdd'); const v = String(inp && inp.value || '').trim(); if (!v) { toast('Escolha a empresa.', 'err'); return; }
    const id = (v.match(/^(\d+)\s*—/) || [])[1];
    let e = id ? emp(id) : null;
    if (!e || !e.eid) { const n = nrm(v), dg = v.replace(/\D/g, ''); const c = (S.emps() || []).filter(x => String(x.eid) === v || nrm(x.nome).includes(n) || (dg.length >= 8 && String(x.cnpj || '').replace(/\D/g, '').includes(dg))); if (c.length !== 1) { toast(c.length ? 'Mais de uma empresa encontrada — escolha na lista.' : 'Empresa não encontrada.', 'err'); return; } e = c[0]; }
    const d = dados(); if (d[String(e.eid)]) { toast('Essa empresa já está na lista.', 'info'); return; }
    d[String(e.eid)] = { req: { inscrito: false, naoSuspensa: false, naoGarantida: false }, ev: {}, desde: new Date().toISOString().slice(0, 10) };
    salvar(d); inp.value = ''; toast('Empresa incluída: ' + (e.nome || e.eid), 'ok'); corpo();
  }
  function remover(eid) {
    const d = dados(), r = d[String(eid)]; if (!r) return;
    const nEv = Object.keys(r.ev || {}).length;
    if (!confirm('Tirar ' + (emp(eid).nome || '#' + eid) + ' da lista de Impedimentos?' + (nEv ? '\n\nEla tem ' + nEv + ' bloqueio(s)/desbloqueio(s) marcados — eles serão apagados e a distribuição de lucros volta a ficar liberada em todos os meses.' : ''))) return;
    delete d[String(eid)]; salvar(d); toast('Empresa retirada da lista.', 'ok'); corpo();
  }
  function req(eid, k, v) { const d = dados(), r = d[String(eid)]; if (!r) return; r.req = r.req || {}; r.req[k] = !!v; salvar(d); corpo(); }
  function mes(eid, mk) {
    const d = dados(), r = d[String(eid)]; if (!r) return; r.ev = r.ev || {};
    if (r.ev[mk]) { delete r.ev[mk]; }
    else {
      const antes = bloqueado(eid, mk); // situação vinda dos meses anteriores (sem evento neste mês)
      if (!antes && !reqOk(r) && !confirm('A empresa não está com os 3 requisitos marcados (dívida ativa, não suspensa, sem garantia).\n\nBloquear a distribuição de lucros a partir de ' + mk.slice(5) + '/' + mk.slice(0, 4) + ' mesmo assim?')) return;
      r.ev[mk] = antes ? 'desbloq' : 'bloq';
    }
    // eventos que não mudam nada (bloqueio sobre bloqueio) são limpos para a linha do tempo ficar simples
    let st = false; Object.keys(r.ev).sort().forEach(k => { const novo = r.ev[k] === 'bloq'; if (novo === st) delete r.ev[k]; else st = novo; });
    salvar(d); if (typeof _lucCalcCache !== 'undefined') try { _lucCalcCache = {}; } catch (e) { }
    corpo();
  }
  // ── Relatórios: Excel (personalizado JJR), PDF e Teams — mesma lista/filtros da tela ──
  const celMes = x => x.ev === 'bloq' ? 'Bloqueia' : x.ev === 'desbloq' ? 'Libera' : (x.b ? 'Bloqueado' : '');
  const hojeBR = () => new Date().toLocaleDateString('pt-BR');
  const sitTxt = (l, mkHoje) => l.hoje ? 'Impedida' : 'Liberada';
  async function excel() {
    const { linhas, mkHoje } = linhasAtuais(); if (!linhas.length) { toast('Nenhuma empresa na lista.', 'err'); return; }
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca de Excel não carregada. Atualize a página (Ctrl+F5).', 'err'); return; }
    const AZUL = 'FF1E3558', VERDE = 'FF0F766E', OURO = 'FFFFD700', BRANCO = 'FFFFFFFF', VERM = 'FFB91C1C', VERM_CL = 'FFFEE2E2', VERDE_CL = 'FFDCFCE7', VERDE_OK = 'FF15803D', CINZA = 'FFF1F5F9', AMAR_CL = 'FFFEF3C7';
    const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
    const bd = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    const NC = 8 + 12;
    const wb = new ExcelJS.Workbook(); wb.creator = 'JJR Consultoria Contábil';
    const ws = wb.addWorksheet('Impedimentos ' + ST.ano, { views: [{ showGridLines: false, state: 'frozen', ySplit: 6, xSplit: 2 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } } });
    ws.columns = [{ width: 7 }, { width: 44 }, { width: 20 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 12 }, { width: 13 }, ...Array(12).fill({ width: 10.5 })];
    const faixa = (r, txt, cor, tam, corTxt, alt) => { ws.mergeCells(r, 1, r, NC); const c = ws.getCell(r, 1); c.value = txt; c.font = { name: 'Calibri', size: tam || 11, bold: true, color: { argb: corTxt || BRANCO } }; c.fill = fill(cor); c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }; ws.getRow(r).height = alt || 20; };
    faixa(1, 'JJR CONSULTORIA CONTÁBIL', AZUL, 16, OURO, 28);
    faixa(2, 'Impedimentos à distribuição de lucros — ' + ST.ano, VERDE, 13, BRANCO, 22);
    faixa(3, 'STF, ADI 5.161 (30/09/2026): a multa do art. 32 da Lei 4.357/1964 e do art. 52 da Lei 8.212/1991 só incide quando os 3 requisitos existem ao mesmo tempo — débito inscrito em dívida ativa, exigibilidade não suspensa (art. 151 CTN) e sem garantia (art. 9º Lei 6.830/80).', CINZA, 9.5, 'FF334155', 30);
    faixa(4, 'Gerado em ' + hojeBR() + (mkHoje ? ' · Situação no Fechamento Atual ' + mkHoje.slice(5) + '/' + mkHoje.slice(0, 4) : '') + ' · ' + linhas.length + ' empresa(s)', CINZA, 9, 'FF64748B', 16);
    const cab = ['ID', 'Empresa', 'CNPJ', 'Dívida ativa', 'Não suspensa', 'Sem garantia', '3 requisitos', 'Situação', ...MESES.map(m => m + '/' + String(ST.ano).slice(2))];
    const r6 = ws.getRow(6); cab.forEach((t, i) => { const c = r6.getCell(i + 1); c.value = t; c.font = { bold: true, color: { argb: BRANCO }, size: 10 }; c.fill = fill(i >= 8 ? VERDE : AZUL); c.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle', wrapText: true }; c.border = bd; }); r6.height = 30;
    let r = 7;
    linhas.forEach((l, i) => {
      const row = ws.getRow(r), zebra = i % 2 ? CINZA : BRANCO;
      const vals = [Number(l.eid) || l.eid, l.nome, l.cnpj, ...REQ.map(([k]) => (l.r.req || {})[k] ? 'Sim' : 'Não'), l.ok ? 'Sim' : 'Não', sitTxt(l, mkHoje), ...l.meses.map(celMes)];
      vals.forEach((v, j) => { const c = row.getCell(j + 1); c.value = v; c.border = bd; c.fill = fill(zebra); c.font = { size: 10 }; c.alignment = { horizontal: j === 1 ? 'left' : 'center', vertical: 'middle' }; });
      REQ.forEach((_, q) => { const c = row.getCell(4 + q); if (c.value === 'Sim') { c.font = { size: 10, bold: true, color: { argb: VERM } }; } else c.font = { size: 10, color: { argb: 'FF64748B' } }; });
      const c7 = row.getCell(7); if (l.ok) { c7.fill = fill(VERM_CL); c7.font = { size: 10, bold: true, color: { argb: VERM } }; }
      const c8 = row.getCell(8); c8.fill = fill(l.hoje ? VERM_CL : VERDE_CL); c8.font = { size: 10, bold: true, color: { argb: l.hoje ? VERM : VERDE_OK } };
      l.meses.forEach((x, j) => { const c = row.getCell(9 + j); if (x.b) { c.fill = fill(VERM_CL); c.font = { size: 10, bold: !!x.ev, color: { argb: VERM } }; } else if (x.ev === 'desbloq') { c.fill = fill(VERDE_CL); c.font = { size: 10, bold: true, color: { argb: VERDE_OK } }; } });
      r++;
    });
    r++;
    const leg = (txt, cor) => { ws.mergeCells(r, 1, r, NC); const c = ws.getCell(r, 1); c.value = txt; c.font = { size: 9, color: { argb: 'FF334155' } }; c.fill = fill(cor); c.alignment = { horizontal: 'left', indent: 1 }; r++; };
    leg('Legenda: "Bloqueia" = mês a partir do qual a distribuição de lucros fica bloqueada; "Bloqueado" = mês bloqueado (herdado); "Libera" = mês em que a distribuição volta a ser permitida.', AMAR_CL);
    leg('Multa (quando os 3 requisitos existem): 50% do valor distribuído (empresa) e 50% do recebido (diretores/administradores), limitada a 50% do débito não garantido — Lei 4.357/1964, art. 32, §§ 1º e 2º.', AMAR_CL);
    ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + linhas.length, column: NC } };
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = 'Impedimentos_distribuicao_lucros_' + ST.ano + '.xlsx'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Excel gerado.', 'ok');
  }
  function pdf() {
    const { linhas, mkHoje } = linhasAtuais(); if (!linhas.length) { toast('Nenhuma empresa na lista.', 'err'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { toast('Biblioteca de PDF não carregada. Atualize a página (Ctrl+F5).', 'err'); return; }
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 53, 88); doc.rect(0, 0, W, 16, 'F'); doc.setTextColor(255, 215, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('JJR CONSULTORIA CONTÁBIL', 10, 10.5);
    doc.setFillColor(15, 118, 110); doc.rect(0, 16, W, 9, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(11.5); doc.text('Impedimentos à distribuição de lucros — ' + ST.ano, 10, 22);
    doc.setTextColor(51, 65, 85); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(doc.splitTextToSize('STF, ADI 5.161 (30/09/2026): a multa do art. 32 da Lei 4.357/1964 e do art. 52 da Lei 8.212/1991 só incide quando os 3 requisitos existem ao mesmo tempo — débito inscrito em dívida ativa, exigibilidade não suspensa (art. 151 CTN) e sem garantia (art. 9º Lei 6.830/80).', W - 20), 10, 30);
    doc.setTextColor(100, 116, 139); doc.text('Gerado em ' + hojeBR() + (mkHoje ? ' · Situação no Fechamento Atual ' + mkHoje.slice(5) + '/' + mkHoje.slice(0, 4) : '') + ' · ' + linhas.length + ' empresa(s)', 10, 38);
    const head = [['ID', 'Empresa', 'CNPJ', 'Dívida ativa', 'Não susp.', 'Sem garant.', '3 req.', 'Situação', ...MESES.map(m => m + '/' + String(ST.ano).slice(2))]];
    const body = linhas.map(l => [String(l.eid), l.nome, l.cnpj, ...REQ.map(([k]) => (l.r.req || {})[k] ? 'Sim' : 'Não'), l.ok ? 'Sim' : 'Não', sitTxt(l, mkHoje), ...l.meses.map(x => x.ev === 'bloq' ? 'Bloqueia' : x.ev === 'desbloq' ? 'Libera' : (x.b ? 'Bloq.' : ''))]);
    doc.autoTable({ startY: 41, head, body, theme: 'grid', styles: { fontSize: 7, cellPadding: 1.4, halign: 'center', valign: 'middle', lineColor: [203, 213, 225], lineWidth: 0.1 }, headStyles: { fillColor: [30, 53, 88], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'left', cellWidth: 52 }, 2: { cellWidth: 27 } }, alternateRowStyles: { fillColor: [241, 245, 249] },
      didParseCell: c => { if (c.section !== 'body') return; const l = linhas[c.row.index]; const j = c.column.index;
        if (j >= 3 && j <= 5 && c.cell.raw === 'Sim') { c.cell.styles.textColor = [185, 28, 28]; c.cell.styles.fontStyle = 'bold'; }
        if (j === 6 && l.ok) { c.cell.styles.fillColor = [254, 226, 226]; c.cell.styles.textColor = [185, 28, 28]; c.cell.styles.fontStyle = 'bold'; }
        if (j === 7) { c.cell.styles.fillColor = l.hoje ? [254, 226, 226] : [220, 252, 231]; c.cell.styles.textColor = l.hoje ? [185, 28, 28] : [21, 128, 61]; c.cell.styles.fontStyle = 'bold'; }
        if (j >= 8) { const x = l.meses[j - 8]; if (x.b) { c.cell.styles.fillColor = [254, 226, 226]; c.cell.styles.textColor = [185, 28, 28]; if (x.ev) c.cell.styles.fontStyle = 'bold'; } else if (x.ev === 'desbloq') { c.cell.styles.fillColor = [220, 252, 231]; c.cell.styles.textColor = [21, 128, 61]; c.cell.styles.fontStyle = 'bold'; } } } });
    let y = doc.lastAutoTable.finalY + 6; doc.setFontSize(7.5); doc.setTextColor(51, 65, 85);
    doc.text(doc.splitTextToSize('Legenda: "Bloqueia" = mês a partir do qual a distribuição de lucros fica bloqueada; "Bloq." = mês bloqueado; "Libera" = mês em que a distribuição volta a ser permitida. Multa (com os 3 requisitos): 50% do valor distribuído (empresa) e 50% do recebido (diretores), limitada a 50% do débito não garantido — Lei 4.357/1964, art. 32, §§ 1º e 2º.', W - 20), 10, y);
    const n = doc.getNumberOfPages(); for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.text('JJR Consultoria Contábil · página ' + p + ' de ' + n, W - 10, doc.internal.pageSize.getHeight() - 5, { align: 'right' }); }
    doc.save('Impedimentos_distribuicao_lucros_' + ST.ano + '.pdf'); toast('PDF gerado.', 'ok');
  }
  async function teams() {
    const { linhas, mkHoje } = linhasAtuais(); if (!linhas.length) { toast('Nenhuma empresa na lista.', 'err'); return; }
    const td = (v, st) => '<td style="border:1px solid #CBD5E1;padding:4px 6px;font-size:12px;text-align:center;' + (st || '') + '">' + E(v) + '</td>';
    const thh = (v, cor) => '<th style="border:1px solid #CBD5E1;padding:5px 6px;font-size:12px;background:' + (cor || '#1E3558') + ';color:#fff">' + E(v) + '</th>';
    let html = '<div style="font-family:Segoe UI,Arial;font-size:13px"><div style="background:#1E3558;color:#FFD700;font-weight:700;font-size:15px;padding:6px 10px">JJR CONSULTORIA CONTÁBIL</div>'
      + '<div style="background:#0F766E;color:#fff;font-weight:700;padding:5px 10px">Impedimentos à distribuição de lucros — ' + ST.ano + '</div>'
      + '<div style="color:#334155;font-size:12px;margin:6px 0">STF, ADI 5.161 (30/09/2026): multa do art. 32 da Lei 4.357/1964 e do art. 52 da Lei 8.212/1991 só com os 3 requisitos ao mesmo tempo (dívida ativa, não suspensa, sem garantia).</div>'
      + '<table style="border-collapse:collapse"><tr>' + thh('ID') + thh('Empresa') + thh('CNPJ') + thh('Dívida ativa') + thh('Não suspensa') + thh('Sem garantia') + thh('3 requisitos') + thh('Situação') + MESES.map(m => thh(m + '/' + String(ST.ano).slice(2), '#0F766E')).join('') + '</tr>';
    const txt = ['JJR CONSULTORIA CONTÁBIL', 'Impedimentos à distribuição de lucros — ' + ST.ano, ''];
    linhas.forEach((l, i) => {
      const zebra = i % 2 ? 'background:#F1F5F9;' : '';
      html += '<tr>' + td(l.eid, zebra) + td(l.nome, zebra + 'text-align:left;font-weight:600') + td(l.cnpj, zebra) + REQ.map(([k]) => td((l.r.req || {})[k] ? 'Sim' : 'Não', zebra + ((l.r.req || {})[k] ? 'color:#B91C1C;font-weight:700' : 'color:#64748B'))).join('')
        + td(l.ok ? 'Sim' : 'Não', l.ok ? 'background:#FEE2E2;color:#B91C1C;font-weight:700' : zebra)
        + td(sitTxt(l, mkHoje), l.hoje ? 'background:#FEE2E2;color:#B91C1C;font-weight:700' : 'background:#DCFCE7;color:#15803D;font-weight:700')
        + l.meses.map(x => td(celMes(x), x.b ? 'background:#FEE2E2;color:#B91C1C;' + (x.ev ? 'font-weight:700' : '') : (x.ev === 'desbloq' ? 'background:#DCFCE7;color:#15803D;font-weight:700' : zebra))).join('') + '</tr>';
      const bl = l.meses.filter(x => x.b).map(x => MESES[+x.mk.slice(5) - 1]);
      txt.push(l.eid + ' - ' + l.nome + ' (' + l.cnpj + ') | 3 requisitos: ' + (l.ok ? 'Sim' : 'Não') + ' | ' + sitTxt(l, mkHoje) + ' | Meses bloqueados em ' + ST.ano + ': ' + (bl.length ? bl.join(', ') : 'nenhum'));
    });
    html += '</table><div style="font-size:11px;color:#64748B;margin-top:6px">"Bloqueia" = início do bloqueio · "Bloqueado" = mês bloqueado · "Libera" = distribuição permitida de novo. Gerado em ' + hojeBR() + '.</div></div>';
    const t = txt.join('\n');
    try {
      if (window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([t], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(t);
      toast('Copiado! Cole (Ctrl+V) na conversa do Teams.', 'ok');
    } catch (e) { try { await navigator.clipboard.writeText(t); toast('Copiado como texto. Cole (Ctrl+V) no Teams.', 'ok'); } catch (e2) { toast('Não consegui copiar: ' + e2.message, 'err'); } }
  }
  // ── Base legal (tela inteira): texto original do Planalto + explicação simples embaixo de cada dispositivo ──
  function renderBase(ov) {
    const B = root.LUC_IMP_BASE || [];
    const nav = B.map(s => '<button class="btn ' + (ST.tema === s.id ? 'bp' : 'bo') + ' bsm" onclick="LucImp.irBase(\'' + s.id + '\')">' + E(s.titulo.split(' — ')[0]) + '</button>').join('');
    const item = it => '<div style="margin:0 0 12px">'
      + '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:14.5px;line-height:1.55;color:var(--ink)">' + E(it.t) + '</div>'
      + '<div style="margin-top:3px;padding:6px 10px;border-left:3px solid var(--teal);background:rgba(15,118,110,.08);font-size:13px;line-height:1.5;color:var(--ink)">(' + E(it.e) + ')</div></div>';
    let h = '<div style="padding:4px 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--border)">'
      + '<button class="btn bo bsm" onclick="LucImp.voltar()">← Impedimentos</button>'
      + '<div class="ptitle" style="margin:0">📜 Base legal — distribuição de lucros com débito federal</div>'
      + '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' + nav + '</span></div>'
      + '<div style="max-width:980px;margin:14px auto 40px">'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:14px">Textos copiados do site oficial do Planalto (redação vigente em 26/11/2026; trechos revogados omitidos). Embaixo de cada dispositivo, entre parênteses, a explicação em linguagem simples. A tese do STF (ADI 5.161, 30/09/2026) está resumida conforme noticiado; confira o acórdão antes de citar em parecer.</div>';
    B.forEach(s => {
      h += '<section id="lucImpB_' + s.id + '" style="scroll-margin-top:70px;margin:0 0 26px;padding:16px 18px;border:1px solid var(--border);border-radius:10px;background:var(--white);' + (ST.tema === s.id ? 'box-shadow:0 0 0 2px var(--teal)' : '') + '">'
        + '<h2 style="margin:0 0 8px;font-size:18px;color:var(--teal)">' + E(s.titulo) + '</h2>'
        + (s.intro ? '<div style="font-size:13.5px;line-height:1.55;margin-bottom:12px">' + E(s.intro) + '</div>' : '');
      (s.itens || []).forEach(it => { h += item(it); });
      (s.leis || []).forEach(l => {
        if (l.nome) h += '<h3 style="margin:14px 0 8px;font-size:14.5px;color:var(--ink)">' + E(l.nome) + (l.url ? ' <a href="' + E(l.url) + '" target="_blank" rel="noopener" style="font-size:11.5px;font-weight:400">(abrir no Planalto ↗)</a>' : '') + '</h3>';
        l.itens.forEach(it => { h += item(it); });
      });
      h += '</section>';
    });
    ov.innerHTML = h + '</div>';
    if (ST.tema) setTimeout(() => irBase(ST.tema), 30); else window.scrollTo(0, 0);
  }
  function irBase(id) { ST.tema = id; const el = document.getElementById('lucImpB_' + id); if (!el) return; document.querySelectorAll('[id^="lucImpB_"]').forEach(x => x.style.boxShadow = x === el ? '0 0 0 2px var(--teal)' : ''); el.scrollIntoView({ block: 'start' }); }
  root.LucImp = {
    abrir, fechar, render, adicionar, remover, req, mes, base, irBase, excel, pdf, teams,
    voltar: () => { ST.view = 'lista'; render(); window.scrollTo(0, 0); },
    ano: a => { ST.ano = +a; render(); },
    fcol: (k, v, ja) => { ST.fc[k] = v; ST.foco = ja ? '' : k; clearTimeout(root._lucImpF); root._lucImpF = setTimeout(corpo, ja ? 0 : 250); },
    bloqueado: (eid, ano, mes) => bloqueado(eid, mkDe(ano, mes)),
    reqOk: eid => reqOk(dados()[String(eid)])
  };
})(window);

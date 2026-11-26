/* ═══════════════════════════════════════════════════════════════════════
 * CONTROLE DE ESTOQUE (custo médio ponderado mensal, a partir dos XMLs) — pedido do usuário 26/11/2026
 * Base: "Estoques.xlsx" (Planilha2) + lista de CFOP de "Conciliação por CFOP.xlsx".
 * Por empresa → anos (+ Ano; padrão = ano do Fechamento Atual) → abas Estoque / Entradas / Saídas, cada uma com 12 meses.
 * XMLs de NF-e anexados pelo usuário (arquivos ou pasta): cada item vira uma linha (data, NF, fornecedor/cliente, CFOP, NCM, produto, qtd, valores).
 * Classe pelo CFOP: compra · devolução de venda (entradas) · venda · devolução de compra (saídas) · outra (não mexe no estoque).
 * Custo da entrada = valor do produto + frete + seguro + outras despesas − desconto + IPI + ICMS-ST (rateados pelo valor dos produtos
 *   quando vêm só no total da nota; diferença que sobrar entre o total da nota e a soma dos itens também é rateada)
 *   − impostos marcados para descontar na ⚙ (ICMS, PIS, COFINS, ICMS-ST, IPI).
 * Mês: inicial (estoque inicial importado ou final do mês anterior) + compras + devoluções de venda (pelo preço médio inicial)
 *   − devoluções de compra (pelo custo da nota) → preço médio → vendas × preço médio = CMV → final.
 * Produto novo no mês (não estava no estoque) entra na última linha, em amarelo, status "Novo".
 * Dados em S: ctrlest_<eid> (anos, config, cadastro de produtos, vínculos) · ctrlest_<eid>_<ano> (estoque inicial por mês) ·
 *   ctrlest_<eid>_<ano>_<mm> (itens dos XMLs do mês). Nada é apagado ao reimportar: o mesmo item (chave+item) é substituído.
 * ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const fechAno = () => { try { return +String(S.fechAtual()).slice(0, 4) || new Date().getFullYear(); } catch (e) { return new Date().getFullYear(); } };
  const fechMes = () => { try { return +String(S.fechAtual()).slice(5, 7) || 1; } catch (e) { return 1; } };
  const ST = { eid: '', ano: fechAno(), mes: fechMes(), aba: 'est', filtro: '', soMov: true };
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const R2 = v => Math.round((Number(v) || 0) * 100) / 100, R4 = v => Math.round((Number(v) || 0) * 10000) / 10000;
  const F = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const Q = v => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
  const num = t => { if (typeof t === 'number') return t; const s = String(t == null ? '' : t).replace(/[^\d,.-]/g, ''); if (!s) return 0; return parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
  const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const sOk = v => { try { const x = S.g(v); if (typeof x === 'string') { try { return JSON.parse(x); } catch (e) { return null; } } return x; } catch (e) { return null; } };
  // ── armazenamento ──
  const kEmp = eid => 'ctrlest_' + eid, kAno = (eid, a) => 'ctrlest_' + eid + '_' + a, kMes = (eid, a, m) => 'ctrlest_' + eid + '_' + a + '_' + String(m).padStart(2, '0');
  function lerEmp(eid) { const v = sOk(kEmp(eid)) || {}; v.anos = v.anos || []; v.cfg = v.cfg || {}; v.cfg.ded = v.cfg.ded || {}; v.cfg.cfop = v.cfg.cfop || {}; v.prod = v.prod || {}; v.vinc = v.vinc || {}; return v; }
  function lerAno(eid, a) { const v = sOk(kAno(eid, a)) || {}; v.iniMes = v.iniMes || {}; return v; }
  function lerMes(eid, a, m) { const v = sOk(kMes(eid, a, m)) || {}; v.itens = v.itens || []; return v; }

  // ── CFOP: classe de estoque (compra / devolução de venda / venda / devolução de compra / outra) ──
  // nota de ENTRADA emitida por terceiro traz o CFOP do emitente (5102 = venda dele = nossa compra 1102): converte 5/6/7 → 1/2/3
  function cfopNosso(cfop, tipo) { const c = parseInt(cfop, 10) || 0; return tipo === 'E' && c >= 5000 ? c - 4000 : c; }
  function classeCfop(cfop0, cfgEmp, tipo) {
    const c = cfopNosso(cfop0, tipo); if (cfgEmp && cfgEmp.cfop && cfgEmp.cfop[c]) return cfgEmp.cfop[c];
    const d = Math.floor(c / 1000), x = c % 1000, dev = root.CFOP_JJR && root.CFOP_JJR[c] ? root.CFOP_JJR[c][1] === 1 : false;
    if (d >= 1 && d <= 3) { if ((x >= 101 && x <= 128) || x === 401 || x === 403 || x === 406 || x === 407) return 'compra'; if (dev && [201, 202, 203, 204, 208, 209, 212, 410, 411].includes(x)) return 'devvenda'; return 'outra'; }
    if (d >= 5 && d <= 7) { if ((x >= 101 && x <= 125) || [401, 402, 403, 404, 405].includes(x) || (x >= 651 && x <= 656)) return 'venda'; if (dev && [201, 202, 205, 206, 207, 208, 209, 210, 410, 411, 412, 413].includes(x)) return 'devcompra'; return 'outra'; }
    return 'outra';
  }
  const ROT_CL = { compra: 'Compra', devvenda: 'Devolução de venda', venda: 'Venda', devcompra: 'Devolução de compra', outra: 'Outra (não mexe no estoque)' };

  // ── leitura do XML de NF-e ──
  function lerXml(txt, cnpjEmp) {
    const doc = new DOMParser().parseFromString(txt, 'text/xml');
    const tg = (el, n) => { if (!el) return null; const x = el.getElementsByTagName(n); return x.length ? x[0] : null; };
    const tx = (el, n) => { const x = tg(el, n); return x ? x.textContent.trim() : ''; };
    const inf = tg(doc, 'infNFe'); if (!inf) return null;
    const chave = (inf.getAttribute('Id') || '').replace(/^NFe/, '');
    const ide = tg(inf, 'ide'), emit = tg(inf, 'emit'), dest = tg(inf, 'dest');
    const cE = (tx(emit, 'CNPJ') || tx(emit, 'CPF')).replace(/\D/g, ''), cD = (tx(dest, 'CNPJ') || tx(dest, 'CPF')).replace(/\D/g, '');
    const raiz = String(cnpjEmp || '').replace(/\D/g, '').slice(0, 8);
    const tpNF = tx(ide, 'tpNF'); let tipo;
    if (raiz && cE.slice(0, 8) === raiz) tipo = tpNF === '0' ? 'E' : 'S'; else if (raiz && cD.slice(0, 8) === raiz) tipo = 'E'; else return { erro: 'nota não é desta empresa (emitente ' + cE + ', destinatário ' + cD + ')' };
    const part = tipo === 'E' ? (cE.slice(0, 8) === raiz ? dest : emit) : dest;
    const data = (tx(ide, 'dhEmi') || tx(ide, 'dEmi')).slice(0, 10), nf = tx(ide, 'nNF');
    const tot = tg(inf, 'ICMSTot'), T = k => num(tx(tot, k));
    const dets = [...inf.getElementsByTagName('det')];
    const itens = dets.map(d => { const p = tg(d, 'prod'), im = tg(d, 'imposto'); const icms = tg(im, 'ICMS');
      return { n: +d.getAttribute('nItem') || 0, cprod: tx(p, 'cProd'), gtin: /^\d{8,14}$/.test(tx(p, 'cEAN')) ? tx(p, 'cEAN') : '', desc: tx(p, 'xProd'), ncm: tx(p, 'NCM'), cfop: tx(p, 'CFOP'), un: tx(p, 'uCom'), q: num(tx(p, 'qCom')), vProd: num(tx(p, 'vProd')),
        vFrete: num(tx(p, 'vFrete')), vSeg: num(tx(p, 'vSeg')), vOutro: num(tx(p, 'vOutro')), vDesc: num(tx(p, 'vDesc')), vIPI: num(tx(tg(im, 'IPI'), 'vIPI')), vST: num(tx(icms, 'vICMSST')) + num(tx(icms, 'vFCPST')), vICMS: num(tx(icms, 'vICMS')), vPIS: num(tx(tg(im, 'PIS'), 'vPIS')), vCOFINS: num(tx(tg(im, 'COFINS'), 'vCOFINS')) }; });
    // rateio: o que veio só no total da nota vai para os itens pelo valor do produto; a diferença que sobrar (total da nota − itens) também
    const sP = itens.reduce((s, i) => s + i.vProd, 0) || 1;
    [['vFrete', 'vFrete'], ['vSeg', 'vSeg'], ['vOutro', 'vOutro'], ['vDesc', 'vDesc'], ['vIPI', 'vIPI'], ['vST', 'vST']].forEach(([k, kt]) => { const ti = itens.reduce((s, i) => s + i[k], 0), tn = kt === 'vST' ? T('vST') + T('vFCPST') : T(kt); if (tn > ti + 0.005) itens.forEach(i => { i[k] += (tn - ti) * i.vProd / sP; }); });
    const somaIt = itens.reduce((s, i) => s + i.vProd + i.vFrete + i.vSeg + i.vOutro - i.vDesc + i.vIPI + i.vST, 0), dif = R2(T('vNF') - somaIt);
    if (Math.abs(dif) >= 0.01) itens.forEach(i => { i.vDif = dif * i.vProd / sP; });
    return { chave, tipo, data, nf, part: tx(part, 'xNome'), partCnpj: (tx(part, 'CNPJ') || tx(part, 'CPF')), vNF: T('vNF'), itens };
  }
  // custo do item de entrada (com as deduções da ⚙)
  function custoItem(i, ded) { let c = i.vProd + i.vFrete + i.vSeg + i.vOutro - i.vDesc + (i.vDif || 0) + i.vIPI + i.vST; if (ded.icms) c -= i.vICMS; if (ded.pis) c -= i.vPIS; if (ded.cofins) c -= i.vCOFINS; if (ded.st) c -= i.vST; if (ded.ipi) c -= i.vIPI; return c; }

  // ── produto do estoque para um item (vínculo manual → GTIN → código → descrição → novo com o código) ──
  function chaveProduto(emp, it) {
    const kv = (it.tipo === 'E' ? 'E|' + String(it.partCnpj || '').slice(0, 8) + '|' : 'S||') + it.cprod; if (emp.vinc[kv]) return emp.vinc[kv];
    if (it.tipo === 'S') return it.cprod;
    if (it.gtin) { const k = Object.keys(emp.prod).find(p => emp.prod[p].gtin === it.gtin); if (k) return k; }
    if (emp.prod[it.cprod]) return it.cprod;
    const dn = nrm(it.desc); const k2 = Object.keys(emp.prod).find(p => nrm(emp.prod[p].desc) === dn); if (k2) return k2;
    return it.cprod;
  }

  // ── cálculo do estoque mês a mês ──
  function calcularAno(eid, ano, ateMes) {
    const emp = lerEmp(eid), a = lerAno(eid, ano), ded = emp.cfg.ded;
    let atual = {}, conhecidos = new Set();
    // estoque inicial do ano: dezembro do ano anterior, se existir
    if (emp.anos.includes(ano - 1)) { const ant = calcularAno(eid, ano - 1, 12); ant.linhas.forEach(l => { atual[l.p] = { q: l.fq, t: l.ft }; conhecidos.add(l.p); }); }
    let res = null; const ordem = [];
    for (let m = 1; m <= ateMes; m++) {
      if (a.iniMes[m]) { atual = {}; Object.keys(a.iniMes[m]).forEach(p => { atual[p] = { q: num(a.iniMes[m][p].q), t: num(a.iniMes[m][p].t) }; if (!conhecidos.has(p)) { conhecidos.add(p); ordem.push(p); } }); }
      Object.keys(atual).forEach(p => { if (!ordem.includes(p)) ordem.push(p); conhecidos.add(p); });
      const mv = {}, novos = [];
      lerMes(eid, ano, m).itens.forEach(it => { const cl = classeCfop(it.cfop, emp.cfg, it.tipo); if (cl === 'outra') return; const p = chaveProduto(emp, it); const o = mv[p] = mv[p] || { cq: 0, ct: 0, dvq: 0, vq: 0, dcq: 0, dct: 0, desc: it.desc };
        if (cl === 'compra') { o.cq += it.q; o.ct += custoItem(it, ded); } else if (cl === 'devvenda') o.dvq += it.q; else if (cl === 'venda') o.vq += it.q; else if (cl === 'devcompra') { o.dcq += it.q; o.dct += custoItem(it, ded); }
        if (!conhecidos.has(p)) { conhecidos.add(p); novos.push(p); } });
      novos.forEach(p => ordem.push(p));
      const linhas = [], prox = {};
      ordem.forEach(p => { const si = atual[p] || { q: 0, t: 0 }, o = mv[p] || { cq: 0, ct: 0, dvq: 0, vq: 0, dcq: 0, dct: 0 };
        const pmIni = si.q ? si.t / si.q : (o.cq ? o.ct / o.cq : 0), dvt = o.dvq * pmIni;
        const dq = R4(si.q + o.cq + o.dvq - o.dcq), dt = si.t + o.ct + dvt - o.dct, pm = dq ? dt / dq : 0, cmv = o.vq * pm;
        const l = { p, desc: (emp.prod[p] || {}).desc || o.desc || (a.iniMes[m] && a.iniMes[m][p] && a.iniMes[m][p].desc) || '', novo: novos.includes(p), iq: si.q, it: si.t, cq: o.cq, ct: o.ct, dvq: o.dvq, dvt, dcq: o.dcq, dct: o.dct, dq, dt, pm, vq: o.vq, cmv, fq: R4(dq - o.vq), ft: dt - cmv };
        l.alerta = l.fq < -1e-9; linhas.push(l); prox[p] = { q: l.fq, t: l.ft }; });
      atual = prox; res = { linhas };
    }
    return res || { linhas: [] };
  }

  // ── lista padrão de empresas ──
  function abrir() { const la = document.getElementById('estoqueListaArea'), rt = document.getElementById('estoqueRoot'); if (la) la.style.display = ''; if (rt) rt.style.display = 'none'; if (typeof prepararAdicionarEmpresa === 'function') prepararAdicionarEmpresa('estoque'); }
  function abrirEmp(eid) { ST.eid = String(eid); const emp = lerEmp(ST.eid); if (!emp.anos.length) { emp.anos = [fechAno()]; S.s(kEmp(ST.eid), emp); } ST.ano = emp.anos.includes(fechAno()) ? fechAno() : emp.anos[emp.anos.length - 1]; ST.mes = fechMes(); const la = document.getElementById('estoqueListaArea'), rt = document.getElementById('estoqueRoot'); if (la) la.style.display = 'none'; if (rt) rt.style.display = ''; render(); }

  function render() {
    const el = document.getElementById('estoqueRoot'); if (!el) return;
    const empC = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {}, emp = lerEmp(ST.eid);
    let h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button class="btn bo bsm" onclick="Estoque.abrir()">← Empresas</button><b style="font-size:15px">#' + E(ST.eid) + ' ' + E(empC.nome || '') + '</b>'
      + '<select class="si" onchange="Estoque.ano(this.value)">' + emp.anos.slice().sort().map(a => '<option' + (a === ST.ano ? ' selected' : '') + '>' + a + '</option>').join('') + '</select><button class="btn bo bsm" onclick="Estoque.novoAno()" title="Abrir um novo ano">+ Ano</button>'
      + '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="btn bo bsm" onclick="Estoque.anexarXml()" title="Escolha à mão os XMLs das NF-e (pode marcar vários): o site separa entrada e saída pelo CNPJ e o mês pela data da nota">📎 Anexar notas</button><span id="estPastaBtns"></span><button class="btn bo bsm" onclick="Estoque.importarInicial()" title="Excel do inventário (código, descrição, quantidade, total) — vira o estoque inicial do mês aberto">📥 Estoque inicial (' + MESES[ST.mes - 1] + ')</button><button class="btn bo bsm" onclick="Estoque.config()" title="O que descontar do custo das entradas">⚙ Custo das entradas</button><button class="action-btn action-btn-excel" onclick="Estoque.excel()">📊 Gerar Excel</button></span></div>';
    const ab = (k, t) => '<button class="btn ' + (ST.aba === k ? 'bp' : 'bo') + ' bsm" onclick="Estoque.aba(\'' + k + '\')">' + t + '</button>';
    h += '<div style="display:flex;gap:6px;margin-bottom:6px">' + ab('est', '📦 Estoque') + ab('ent', '⬇️ Entradas') + ab('sai', '⬆️ Saídas') + '</div>';
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;align-items:center">' + MESES.map((n, i) => '<button class="btn ' + (ST.mes === i + 1 ? 'bp' : 'bo') + ' bsm" style="min-width:52px" onclick="Estoque.mes(' + (i + 1) + ')">' + n + '/' + String(ST.ano).slice(2) + '</button>').join('') + '<input class="si" placeholder="🔎 filtrar" value="' + E(ST.filtro) + '" oninput="Estoque.filtrar(this.value)" style="margin-left:auto;min-width:200px">' + (ST.aba === 'est' ? '<label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="checkbox" ' + (ST.soMov ? 'checked' : '') + ' onchange="Estoque.soMov(this.checked)"> só com saldo/movimento</label>' : '') + '</div><div id="estoqueCorpo"></div>';
    el.innerHTML = h; corpo(); pastaBotoes();
  }
  const th = (t, al) => '<th style="padding:5px 6px;text-align:' + (al || 'right') + ';background:var(--ink2);color:#fff;white-space:nowrap;font-size:11px">' + t + '</th>';
  // filtros por coluna (texto contém; número aceita 10, >0, <0, =0, >=100, <=50)
  const casaNum = (v, ex) => { ex = String(ex || '').trim(); if (!ex) return true; const m = ex.match(/^(>=|<=|>|<|=)?\s*(-?[\d.,]+)$/); if (!m) return true; const n = num(m[2]), x = R2(v); switch (m[1]) { case '>': return x > n; case '<': return x < n; case '>=': return x >= n; case '<=': return x <= n; default: return Math.abs(x - n) < 0.005; } };
  const casaTxt = (v, ex) => !String(ex || '').trim() || nrm(v).includes(nrm(ex));
  const fIn = (k, ph, w) => '<th style="padding:3px 3px;background:var(--ink3,#2D3447)"><input class="si" data-fc="' + k + '" value="' + E((ST.fc || {})[k] || '') + '" placeholder="' + (ph || '🔎') + '" oninput="Estoque.fcol(\'' + k + '\',this.value)" style="width:100%;min-width:' + (w || 52) + 'px;font-size:11px;padding:2px 4px" title="Texto: contém. Número: 10, >0, <0, =0, >=100"></th>';
  const grp = (t, n, cor) => '<th colspan="' + n + '" style="padding:4px;text-align:center;background:' + cor + ';color:#fff;font-size:11px">' + t + '</th>';
  const THEAD = '<thead style="position:sticky;top:0;z-index:3">';
  const vc = (x, b, cor, dec) => '<td style="padding:4px 6px;text-align:right;font-family:var(--mono);white-space:nowrap;' + (b ? 'font-weight:700;' : '') + (cor ? 'color:' + cor + ';' : '') + '">' + (Math.abs(x) > 1e-9 ? (dec ? Q(x) : F(x)) : '') + '</td>';
  /* 26/11/2026: linhas verticais entre as colunas (e horizontais entre as linhas) */
  const ESTILO = '<style>#estoqueCorpo table.est-grade td,#estoqueCorpo table.est-grade th{border-right:1px solid rgba(100,116,139,.45);border-bottom:1px solid rgba(100,116,139,.25)}#estoqueCorpo table.est-grade th{border-right-color:rgba(255,255,255,.25)}</style>';
  const box = t => ESTILO + '<div style="overflow:auto;max-height:calc(100vh - 330px);border:1px solid var(--border);border-radius:6px"><table class="luc-t est-grade" style="width:100%;border-collapse:collapse;font-size:12px">' + t + '</table></div>';
  function corpo() { corpo0(); if (ST.foco) { const i = document.querySelector('#estoqueCorpo [data-fc="' + ST.foco + '"]'); if (i) { i.focus(); const n = i.value.length; try { i.setSelectionRange(n, n); } catch (e) { } } } }
  function corpo0() {
    const el = document.getElementById('estoqueCorpo'); if (!el) return; const f = nrm(ST.filtro), emp = lerEmp(ST.eid);
    if (ST.aba === 'est') {
      const r = calcularAno(ST.eid, ST.ano, ST.mes); let ls = r.linhas.filter(l => !f || nrm(l.p + ' ' + l.desc).includes(f)); if (ST.soMov) ls = ls.filter(l => l.iq || l.it || l.cq || l.dvq || l.vq || l.dcq || l.fq || Math.abs(l.ft) > 0.004);
      if (!r.linhas.length) { el.innerHTML = '<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;color:var(--slate)">Sem estoque neste mês. Importe o <b>estoque inicial</b> (inventário) e anexe os <b>XMLs</b> das notas de entrada e saída.</div>'; return; }
      const T = {}; ['iq', 'it', 'cq', 'ct', 'dvq', 'dvt', 'dq', 'dt', 'vq', 'cmv', 'dcq', 'dct', 'fq', 'ft'].forEach(k => T[k] = 0);
      const C15 = ['iq', 'it', 'cq', 'ct', 'dvq', 'dvt', 'dcq', 'dct', 'dq', 'dt', 'pm', 'vq', 'cmv', 'fq', 'ft']; const fc = ST.fc || {};
      ls = ls.filter(l => (!fc.st || (fc.st === 'novo' ? l.novo : fc.st === 'neg' ? l.alerta : fc.st === 'mov' ? (l.cq || l.dvq || l.vq || l.dcq) : (!l.novo && !l.alerta))) && casaTxt(l.p, fc.p) && casaTxt(l.desc, fc.d) && C15.every(k => casaNum(l[k], fc[k])));
      let t = THEAD + '<tr>' + '<th rowspan="2" style="padding:5px;background:var(--ink2);color:#fff">Status</th><th rowspan="2" style="padding:5px 8px;text-align:left;background:var(--ink2);color:#fff">Produto</th><th rowspan="2" style="padding:5px 8px;text-align:left;background:var(--ink2);color:#fff">Descrição</th>'
        + grp('Estoque inicial', 2, '#1E3558') + grp('Compras', 2, '#0F766E') + grp('Devoluções de venda', 2, '#0E7490') + grp('Devoluções de compra', 2, '#7C2D12') + grp('Disponível / preço médio', 3, '#334155') + grp('Vendas', 2, '#9A3412') + grp('Estoque final', 2, '#854D0E') + '</tr><tr>'
        + ['Qtd.', 'Total', 'Qtd.', 'Custo', 'Qtd.', 'Custo', 'Qtd.', 'Custo', 'Qtd.', 'Total', 'Preço médio', 'Qtd.', 'CMV', 'Qtd.', 'Total'].map(x => th(x, 'right')).join('') + '</tr>'
        + '<tr><th style="padding:3px;background:var(--ink3,#2D3447)"><select class="si" onchange="Estoque.fcol(\'st\',this.value,1)" style="font-size:11px;padding:2px"><option value="">Todos</option><option value="novo"' + (fc.st === 'novo' ? ' selected' : '') + '>Novo</option><option value="neg"' + (fc.st === 'neg' ? ' selected' : '') + '>Negativo</option><option value="mov"' + (fc.st === 'mov' ? ' selected' : '') + '>Com movimento</option><option value="ok"' + (fc.st === 'ok' ? ' selected' : '') + '>Sem alerta</option></select></th>' + fIn('p', '🔎 produto', 90) + fIn('d', '🔎 descrição', 140) + C15.map(k => fIn(k)).join('') + '</tr></thead><tbody>';
      ls.forEach(l => { Object.keys(T).forEach(k => T[k] += l[k]);
        t += '<tr style="' + (l.novo ? 'background:#fef08a;color:#111' : (l.alerta ? 'background:rgba(220,38,38,.12)' : '')) + '"><td style="padding:3px 6px;text-align:center">' + (l.novo ? '<b style="color:#854d0e">Novo</b>' : '') + '</td><td style="padding:3px 8px;font-weight:600;white-space:nowrap">' + E(l.p) + '</td><td style="padding:3px 8px;font-size:11.5px">' + E(l.desc) + '</td>'
          + vc(l.iq, 0, 0, 1) + vc(l.it) + vc(l.cq, 0, 0, 1) + vc(l.ct) + vc(l.dvq, 0, 0, 1) + vc(l.dvt) + vc(l.dcq, 0, 0, 1) + vc(l.dct) + vc(l.dq, 0, 0, 1) + vc(l.dt) + vc(l.pm, 1) + vc(l.vq, 0, 0, 1) + vc(l.cmv, 1, '#9A3412') + vc(l.fq, 1, l.fq < 0 ? '#dc2626' : '', 1) + vc(l.ft, 1, l.ft < -0.004 ? '#dc2626' : '') + '</tr>'; });
      t += '<tr style="font-weight:700;background:var(--bg)"><td></td><td colspan="2" style="padding:5px 8px">TOTAL (' + ls.length + ')</td>' + ['iq', 'it', 'cq', 'ct', 'dvq', 'dvt', 'dcq', 'dct', 'dq', 'dt'].map((k, i) => vc(T[k], 1, 0, i % 2 === 0)).join('') + '<td></td>' + vc(T.vq, 1, 0, 1) + vc(T.cmv, 1) + vc(T.fq, 1, 0, 1) + vc(T.ft, 1) + '</tr></tbody>';
      const nN = r.linhas.filter(l => l.novo).length, nA = r.linhas.filter(l => l.alerta).length;
      el.innerHTML = (nN ? '<div style="font-size:12.5px;margin-bottom:4px"><span style="background:#fef08a;color:#854d0e;padding:1px 6px;border-radius:4px;font-weight:700">' + nN + ' produto(s) novo(s)</span> neste mês (no fim da lista).</div>' : '') + (nA ? '<div style="color:#dc2626;font-size:12.5px;margin-bottom:4px">⚠ ' + nA + ' produto(s) com saída maior que o estoque (vermelho): falta estoque inicial, entrada ou vínculo do produto.</div>' : '') + box(t)
        + '<div style="font-size:11.5px;color:var(--slate);margin-top:6px">Inicial = ' + (lerAno(ST.eid, ST.ano).iniMes[ST.mes] ? 'estoque inicial importado para ' + MESES[ST.mes - 1] : 'estoque final do mês anterior') + '. Compras e devoluções de compra pelo custo da nota (⚙). Devolução de venda volta pelo preço médio inicial. Preço médio = total disponível ÷ qtd. disponível. CMV = vendas × preço médio.</div>';
      return;
    }
    const tipo = ST.aba === 'ent' ? 'E' : 'S', ded = emp.cfg.ded;
    const its = lerMes(ST.eid, ST.ano, ST.mes).itens.filter(i => i.tipo === tipo).filter(i => !f || nrm([i.nf, i.part, i.cfop, i.cprod, i.desc, i.ncm].join(' ')).includes(f)).sort((a, b) => String(a.data).localeCompare(String(b.data)) || String(a.nf).localeCompare(String(b.nf)) || a.n - b.n);
    if (!its.length) { el.innerHTML = '<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;color:var(--slate)">Nenhuma nota de ' + (tipo === 'E' ? 'entrada' : 'saída') + ' em ' + MESES[ST.mes - 1] + '/' + ST.ano + '. Use <b>📥 Anexar XMLs</b> ou <b>📁 Pasta de XMLs</b>.</div>'; return; }
    const dlP = '<datalist id="estProdDL">' + Object.keys(emp.prod).slice(0, 3000).map(p => '<option value="' + E(p) + '" label="' + E(p + ' — ' + (emp.prod[p].desc || '')) + '"></option>').join('') + '</datalist>';
    const fc = ST.fc || {};
    const colsF = tipo === 'E' ? ['data', 'nf', 'part', 'cfop', 'op', 'cprod', 'desc', 'ncm', 'q', 'vProd', 'fr', 'vDesc', 'vIPI', 'vST', 'vICMS', 'vPIS', 'vCOFINS', 'custo', 'cu', 'prod'] : ['data', 'nf', 'part', 'cfop', 'op', 'cprod', 'desc', 'ncm', 'q', 'vProd', 'prod'];
    const valCol = (i, k) => { const cl = classeCfop(i.cfop, emp.cfg, i.tipo), c = custoItem(i, ded); return ({ data: String(i.data).split('-').reverse().join('/'), op: ROT_CL[cl], fr: i.vFrete + i.vSeg + i.vOutro + (i.vDif || 0), custo: c, cu: i.q ? c / i.q : 0, prod: chaveProduto(emp, i) })[k] ?? i[k]; };
    const numCols = ['q', 'vProd', 'fr', 'vDesc', 'vIPI', 'vST', 'vICMS', 'vPIS', 'vCOFINS', 'custo', 'cu'];
    const its2 = its.filter(i => colsF.every(k => numCols.includes(k) ? casaNum(valCol(i, k), fc['x_' + k]) : casaTxt(valCol(i, k), fc['x_' + k])));
    its.length = 0; its2.forEach(x => its.push(x));
    let t = THEAD + '<tr>' + th('Data', 'left') + th('NF', 'left') + th(tipo === 'E' ? 'Fornecedor' : 'Cliente', 'left') + th('CFOP', 'left') + th('Operação', 'left') + th('Código', 'left') + th('Descrição', 'left') + th('NCM', 'left') + th('Qtd.') + th('Valor produto')
      + (tipo === 'E' ? th('Frete/seg./outras') + th('Desconto') + th('IPI') + th('ICMS-ST') + th('ICMS') + th('PIS') + th('COFINS') + th('Custo no estoque') + th('Custo unit.') + th('Produto no estoque', 'left') : th('Produto no estoque', 'left')) + '</tr><tr>' + colsF.map(k => fIn('x_' + k, numCols.includes(k) ? '' : '🔎', ['desc', 'part'].includes(k) ? 110 : 52)).join('') + '</tr></thead><tbody>';
    let tq = 0, tv = 0, tc = 0;
    its.forEach(i => { const cl = classeCfop(i.cfop, emp.cfg, i.tipo), c = tipo === 'E' ? custoItem(i, ded) : 0, p = chaveProduto(emp, i); tq += i.q; tv += i.vProd; tc += c;
      const kv = (i.tipo === 'E' ? 'E|' + String(i.partCnpj || '').slice(0, 8) + '|' : 'S||') + i.cprod;
      t += '<tr style="' + (cl === 'outra' ? 'opacity:.55' : '') + '"><td style="padding:3px 6px;white-space:nowrap">' + E(String(i.data).split('-').reverse().join('/')) + '</td><td style="padding:3px 6px">' + E(i.nf) + '</td><td style="padding:3px 6px;font-size:11.5px">' + E(i.part) + '</td><td style="padding:3px 6px;white-space:nowrap" title="' + E(((root.CFOP_JJR || {})[cfopNosso(i.cfop, i.tipo)] || [''])[0]) + '">' + E(i.cfop) + (cfopNosso(i.cfop, i.tipo) != i.cfop ? ' → ' + cfopNosso(i.cfop, i.tipo) : '') + '</td><td style="padding:3px 6px;font-size:11px">' + ROT_CL[cl] + '</td><td style="padding:3px 6px;white-space:nowrap">' + E(i.cprod) + '</td><td style="padding:3px 6px;font-size:11.5px">' + E(i.desc) + '</td><td style="padding:3px 6px">' + E(i.ncm) + '</td>' + vc(i.q, 0, 0, 1) + vc(i.vProd)
        + (tipo === 'E' ? vc(i.vFrete + i.vSeg + i.vOutro + (i.vDif || 0)) + vc(i.vDesc) + vc(i.vIPI) + vc(i.vST) + vc(i.vICMS, 0, ded.icms ? '#16a34a' : 'var(--slate)') + vc(i.vPIS, 0, ded.pis ? '#16a34a' : 'var(--slate)') + vc(i.vCOFINS, 0, ded.cofins ? '#16a34a' : 'var(--slate)') + vc(c, 1) + vc(i.q ? c / i.q : 0) : '')
        + '<td style="padding:2px"><input class="si" list="estProdDL" value="' + E(p) + '" onchange="Estoque.vincular(\'' + E(kv).replace(/'/g, '&#39;') + '\',this.value)" style="width:150px;font-size:11.5px;padding:3px"></td></tr>'; });
    t += '<tr style="font-weight:700;background:var(--bg)"><td colspan="8" style="padding:5px 6px">TOTAL (' + its.length + ' itens)</td>' + vc(tq, 1, 0, 1) + vc(tv, 1) + (tipo === 'E' ? '<td colspan="7"></td>' + vc(tc, 1) + '<td></td>' : '') + '<td></td></tr></tbody>';
    el.innerHTML = dlP + box(t) + '<div style="font-size:11.5px;color:var(--slate);margin-top:6px">Linhas apagadas = operação que não mexe no estoque (remessa, transferência etc.). "Produto no estoque": a qual produto do estoque o item vai; troque se o código do fornecedor for diferente do seu (vale para as próximas notas também).' + (tipo === 'E' ? ' Impostos em verde = descontados do custo (⚙).' : '') + '</div>';
  }

  // ── ações ──
  function novoAno() { const emp = lerEmp(ST.eid); const a = parseInt(prompt('Qual ano abrir?', String(Math.max(...emp.anos, fechAno()) + 1)), 10); if (!a || a < 2000 || a > 2100) return; if (!emp.anos.includes(a)) emp.anos.push(a); emp.anos.sort(); S.s(kEmp(ST.eid), emp); ST.ano = a; ST.mes = 1; render(); }
  function config() {
    const emp = lerEmp(ST.eid), d = emp.cfg.ded; const it = [['icms', 'ICMS'], ['pis', 'PIS'], ['cofins', 'COFINS'], ['st', 'ICMS-ST'], ['ipi', 'IPI']];
    const ov = document.createElement('div'); ov.id = 'estCfgModal'; ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:10px;max-width:520px;width:100%;padding:18px 20px"><b style="font-size:15px">⚙ Custo das entradas</b><div style="font-size:12.5px;color:var(--slate);margin:6px 0 10px">Marque os impostos que a empresa <b>recupera</b> (crédito): eles são descontados do custo do produto que vai para o estoque. Frete, seguro, outras despesas e a diferença da nota são sempre rateados pelo valor dos produtos; desconto é sempre abatido.</div>'
      + it.map(([k, n]) => '<label style="display:flex;gap:8px;align-items:center;margin:5px 0"><input type="checkbox" data-ded="' + k + '" ' + (d[k] ? 'checked' : '') + '> Descontar <b>' + n + '</b> do custo</label>').join('')
      + '<div style="text-align:right;margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button class="btn bo bsm" onclick="document.getElementById(\'estCfgModal\').remove()">Cancelar</button><button class="btn bp bsm" onclick="Estoque.salvarConfig()">Salvar</button></div></div>';
    document.getElementById('estCfgModal')?.remove(); document.body.appendChild(ov);
  }
  function salvarConfig() { const emp = lerEmp(ST.eid); document.querySelectorAll('#estCfgModal input[data-ded]').forEach(c => { emp.cfg.ded[c.dataset.ded] = c.checked; }); S.s(kEmp(ST.eid), emp); document.getElementById('estCfgModal')?.remove(); toast('Custo das entradas atualizado.', 'ok'); render(); }
  function vincular(kv, val) { const emp = lerEmp(ST.eid); val = String(val || '').trim(); if (val) emp.vinc[kv] = val; else delete emp.vinc[kv]; S.s(kEmp(ST.eid), emp); toast(val ? 'Vínculo salvo (vale para as próximas notas desse produto).' : 'Vínculo removido.', 'ok'); corpo(); }
  function anexarXml() { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.accept = '.xml'; inp.onchange = () => processarArquivos([...inp.files]); inp.click(); }
  // ── pasta da empresa (guardada neste navegador, uma por empresa) → 🔄 Importar XMLs sem escolher arquivo ──
  function dbH() { return new Promise((res, rej) => { const rq = indexedDB.open('ctrlest_handles', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('h'); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
  async function handleGet(eid) { const db = await dbH(); return new Promise(r => { const q = db.transaction('h', 'readonly').objectStore('h').get(String(eid)); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); }
  async function handleSet(eid, h) { const db = await dbH(); return new Promise(r => { const tx = db.transaction('h', 'readwrite'); if (h) tx.objectStore('h').put(h, String(eid)); else tx.objectStore('h').delete(String(eid)); tx.oncomplete = () => r(); tx.onerror = () => r(); }); }
  async function pastaBotoes() { const sp = document.getElementById('estPastaBtns'); if (!sp) return; if (!window.showDirectoryPicker) { sp.innerHTML = ''; return; } let h = null; try { h = await handleGet(ST.eid); } catch (e) { }
    sp.innerHTML = h ? '<button class="btn bp bsm" onclick="Estoque.importarPasta()" title="Lê todos os XMLs de NF-e da pasta ' + E(h.name) + ' (e subpastas)">🔄 Importar XMLs</button><button class="btn bo bsm" onclick="Estoque.definirPasta()" title="Trocar a pasta desta empresa" style="font-size:11px">📁 ' + E(h.name) + '</button>' : '<button class="btn bo bsm" onclick="Estoque.definirPasta()" title="Aponte uma vez a pasta onde ficam os XMLs desta empresa (ex.: SIEG\\NF-es\\CNPJ). Depois é só clicar em Importar XMLs">📁 Pasta da empresa</button>'; }
  async function definirPasta() { if (!window.showDirectoryPicker) { toast('Este navegador não permite guardar pasta. Use o Chrome ou o Edge, ou o 📎 Anexar notas.', 'err'); return; } try { const h = await window.showDirectoryPicker({ mode: 'read' }); await handleSet(ST.eid, h); toast('Pasta guardada para esta empresa: ' + h.name + '. Agora é só clicar em 🔄 Importar XMLs.', 'ok'); pastaBotoes(); } catch (e) { if (e.name !== 'AbortError') toast('Erro: ' + e.message, 'err'); } }
  async function importarPasta() { const h = await handleGet(ST.eid); if (!h) { definirPasta(); return; }
    try { let p = await h.queryPermission({ mode: 'read' }); if (p !== 'granted') p = await h.requestPermission({ mode: 'read' }); if (p !== 'granted') { toast('Sem permissão para ler a pasta.', 'err'); return; } } catch (e) { toast('Não consegui acessar a pasta: ' + e.message, 'err'); return; }
    const arqs = []; toast('Lendo a pasta ' + h.name + '…', 'info');
    const andar = async (dir) => { for await (const [nome, item] of dir.entries()) { if (item.kind === 'directory') await andar(item); else if (/\.xml$/i.test(nome)) arqs.push(await item.getFile()); } };
    try { await andar(h); } catch (e) { toast('Erro lendo a pasta: ' + e.message, 'err'); return; }
    if (!arqs.length) { toast('Nenhum XML na pasta ' + h.name + '.', 'err'); return; } processarArquivos(arqs); }
  async function processarArquivos(lista) {
    {
      const empC = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {}; if (!empC.cnpj) { toast('A empresa está sem CNPJ no cadastro.', 'err'); return; }
      const arqs = lista.filter(f => /\.xml$/i.test(f.name)); if (!arqs.length) { toast('Nenhum XML encontrado.', 'err'); return; }
      const porMes = {}, erros = []; let nNotas = 0, nItens = 0;
      for (const f of arqs) { try { const n = lerXml(await f.text(), empC.cnpj); if (!n) continue; if (n.erro) { erros.push(f.name + ': ' + n.erro); continue; } const a = +n.data.slice(0, 4), m = +n.data.slice(5, 7); const k = a + '|' + m; (porMes[k] = porMes[k] || []).push(n); nNotas++; nItens += n.itens.length; } catch (e) { erros.push(f.name + ': ' + e.message); } }
      const emp = lerEmp(ST.eid); const anosNovos = [];
      Object.keys(porMes).forEach(k => { const [a, m] = k.split('|').map(Number); if (!emp.anos.includes(a)) { emp.anos.push(a); anosNovos.push(a); }
        const mm = lerMes(ST.eid, a, m), idx = {}; mm.itens.forEach((i, j) => { idx[i.ch + '|' + i.n] = j; });
        porMes[k].forEach(n => n.itens.forEach(i => { const reg = Object.assign({ ch: n.chave, tipo: n.tipo, data: n.data, nf: n.nf, part: n.part, partCnpj: n.partCnpj }, i); Object.keys(reg).forEach(x => { if (typeof reg[x] === 'number') reg[x] = R4(reg[x]); }); const kk = reg.ch + '|' + reg.n; if (idx[kk] != null) mm.itens[idx[kk]] = reg; else { idx[kk] = mm.itens.length; mm.itens.push(reg); }
          if (n.tipo === 'S' && !emp.prod[i.cprod]) emp.prod[i.cprod] = { desc: i.desc, gtin: i.gtin, ncm: i.ncm }; }));
        S.s(kMes(ST.eid, a, m), mm); });
      emp.anos.sort(); S.s(kEmp(ST.eid), emp);
      alert(nNotas + ' nota(s) lida(s), ' + nItens + ' item(ns), em ' + Object.keys(porMes).length + ' mês(es).' + (anosNovos.length ? '\nAno(s) aberto(s) sozinho(s): ' + anosNovos.join(', ') + '.' : '') + (erros.length ? '\n\nNão lidos (' + erros.length + '):\n' + erros.slice(0, 12).join('\n') + (erros.length > 12 ? '\n…' : '') : '') + '\n\nSe a mesma nota já estava, foi substituída (não duplica).');
      render();
    }
  }
  function importarInicial() {
    if (typeof XLSX === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; let aoa; try { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null }); } catch (e) { toast('Não consegui ler: ' + e.message, 'err'); return; }
      let hdr = -1, cP = -1, cD = -1, cQ = -1, cT = -1, cU = -1;
      for (let r = 0; r < Math.min(aoa.length, 15) && hdr < 0; r++) { const row = (aoa[r] || []).map(nrm); const ip = row.findIndex(x => /^(CODIGO|PRODUTO|COD\.?|ITEM)$/.test(x) || /^CODIGO DO PRODUTO/.test(x)); const iq = row.findIndex(x => /^(QTD|QUANT)/.test(x)); if (ip >= 0 && iq >= 0) { hdr = r; cP = ip; cQ = iq; cD = row.findIndex(x => /^(NOME|DESCRICAO)/.test(x)); cT = row.findIndex(x => /^TOTAL( CUSTO)?$/.test(x)); if (cT < 0) cT = row.findIndex(x => /^TOTAL/.test(x)); cU = row.findIndex(x => /CUSTO MEDIO|VALOR CUSTO|UNIT/.test(x)); } }
      if (hdr < 0) { toast('Não achei as colunas código e quantidade no cabeçalho.', 'err'); return; }
      const a = lerAno(ST.eid, ST.ano), emp = lerEmp(ST.eid), ini = {}; let n = 0, tot = 0;
      for (let r = hdr + 1; r < aoa.length; r++) { const row = aoa[r] || []; const p = row[cP]; if (p == null || String(p).trim() === '') continue; const k = String(p).trim(); const q = num(row[cQ]); let t = cT >= 0 ? num(row[cT]) : 0; if (!t && cU >= 0) t = q * num(row[cU]); const desc = cD >= 0 ? String(row[cD] || '').trim() : '';
        ini[k] = { q, t: R2(t), desc }; if (!emp.prod[k]) emp.prod[k] = { desc }; else if (desc && !emp.prod[k].desc) emp.prod[k].desc = desc; n++; tot += t; }
      if (!n) { toast('Nenhum produto encontrado.', 'err'); return; }
      if (a.iniMes[ST.mes] && !confirm('Já existe estoque inicial em ' + MESES[ST.mes - 1] + '/' + ST.ano + '. Substituir pelo deste arquivo?')) return;
      a.iniMes[ST.mes] = ini; S.s(kAno(ST.eid, ST.ano), a); S.s(kEmp(ST.eid), emp);
      alert('Estoque inicial de ' + MESES[ST.mes - 1] + '/' + ST.ano + ': ' + n + ' produto(s), total R$ ' + F(tot) + '.'); render();
    };
    inp.click();
  }
  async function excel() {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const empC = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {};
    const wb = new ExcelJS.Workbook(), fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } }), bd = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    const MO = '#,##0.00;[Red]-#,##0.00', QT = '#,##0.####';
    for (let m = 1; m <= 12; m++) {
      const ls = calcularAno(ST.eid, ST.ano, m).linhas.filter(l => l.iq || l.it || l.cq || l.dvq || l.vq || l.dcq || l.fq || Math.abs(l.ft) > 0.004); if (!ls.length) continue;
      const ws = wb.addWorksheet(MESES[m - 1] + '-' + ST.ano, { views: [{ showGridLines: false, state: 'frozen', ySplit: 6, xSplit: 3 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      ws.columns = [{ width: 8 }, { width: 18 }, { width: 40 }, ...Array(15).fill({ width: 13 })];
      const fx = (r, t, cor, tam) => { ws.mergeCells(r, 1, r, 18); const c = ws.getCell(r, 1); c.value = t; c.font = { bold: true, size: tam, color: { argb: 'FFFFFFFF' } }; c.fill = fill(cor); ws.getRow(r).height = tam + 10; };
      fx(1, 'JJR CONSULTORIA CONTÁBIL', 'FF1E3558', 16); fx(2, 'Controle de Estoque — custo médio ponderado — ' + MESES[m - 1] + '/' + ST.ano, 'FF0F766E', 12);
      ws.mergeCells(3, 1, 3, 18); ws.getCell(3, 1).value = (empC.nome || '#' + ST.eid) + (empC.cnpj ? ' · CNPJ ' + empC.cnpj : ''); ws.getCell(3, 1).font = { bold: true, color: { argb: 'FF1E3558' } };
      const g = [['', 3, 'FF1E3558'], ['Estoque inicial', 2, 'FF1E3558'], ['Compras', 2, 'FF0F766E'], ['Devoluções de venda', 2, 'FF0E7490'], ['Devoluções de compra', 2, 'FF7C2D12'], ['Disponível', 3, 'FF334155'], ['Vendas', 2, 'FF9A3412'], ['Estoque final', 2, 'FF854D0E']]; let c0 = 1;
      g.forEach(([t, n, cor]) => { ws.mergeCells(5, c0, 5, c0 + n - 1); const c = ws.getCell(5, c0); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.alignment = { horizontal: 'center' }; for (let k = 0; k < n; k++) ws.getCell(5, c0 + k).fill = fill(cor); c0 += n; });
      ['Status', 'Produto', 'Descrição', 'Qtd.', 'Total', 'Qtd.', 'Custo', 'Qtd.', 'Custo', 'Qtd.', 'Custo', 'Qtd.', 'Total', 'Preço médio', 'Qtd.', 'CMV', 'Qtd.', 'Total'].forEach((t, i) => { const c = ws.getCell(6, i + 1); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = fill('FF475569'); c.border = bd; c.alignment = { horizontal: i > 2 ? 'right' : 'left' }; });
      let r = 7; const T = Array(18).fill(0);
      ls.forEach((l, k) => { const vals = [l.novo ? 'Novo' : '', l.p, l.desc, l.iq, l.it, l.cq, l.ct, l.dvq, l.dvt, l.dcq, l.dct, l.dq, l.dt, l.pm, l.vq, l.cmv, l.fq, l.ft];
        vals.forEach((x, i) => { const c = ws.getCell(r, i + 1); c.value = i > 2 ? R4(x) : x; c.border = bd; c.fill = fill(l.novo ? 'FFFEF08A' : (l.alerta ? 'FFFEE2E2' : (k % 2 ? 'FFF1F5F9' : 'FFFFFFFF'))); if (i > 2) { c.numFmt = [3, 5, 7, 9, 11, 14, 16].includes(i) ? QT : MO; if (i !== 13) T[i] += Number(x) || 0; } }); r++; });
      for (let i = 1; i <= 18; i++) { const c = ws.getCell(r, i); c.fill = fill('FFFFD700'); c.font = { bold: true }; c.border = bd; if (i === 2) c.value = 'TOTAL'; if (i > 3 && i !== 14) { c.value = R2(T[i - 1]); c.numFmt = [4, 6, 8, 10, 12, 15, 17].includes(i) ? QT : MO; } }
    }
    if (!wb.worksheets.length) { toast('Nada para exportar neste ano.', 'err'); return; }
    const buf = await wb.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = 'Controle_de_Estoque_' + ST.eid + '_' + ST.ano + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  root.Estoque = { abrir, abrirEmp, render, novoAno, config, salvarConfig, vincular, anexarXml, definirPasta, importarPasta, importarInicial, excel,
    fcol: (k, v, ja) => { ST.fc = ST.fc || {}; ST.fc[k] = v; ST.foco = ja ? '' : k; clearTimeout(root._estF); root._estF = setTimeout(corpo, ja ? 0 : 300); },
    ano: a => { ST.ano = +a; render(); }, mes: m => { ST.mes = m; render(); }, aba: a => { ST.aba = a; render(); }, filtrar: v => { ST.filtro = v; clearTimeout(root._estT); root._estT = setTimeout(corpo, 250); }, soMov: v => { ST.soMov = v; corpo(); },
    _lerXml: lerXml, _classe: classeCfop, _calc: calcularAno, _custo: custoItem };
})(typeof window !== 'undefined' ? window : this);

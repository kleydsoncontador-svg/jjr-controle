/* ═══════════════════════════════════════════════════════════════════════
 * DE-PARA CONTÁBIL × ECF (plano referencial) — pedido do usuário 26/11/2026
 * Base: planilha "Depara - Balancete e DRE - Contábil x Fiscal (referencial).xlsx"
 * Lê os 4 relatórios do Domínio (Balancete e DRE, no plano Contábil e no Referencial),
 * liga cada conta contábil a uma conta referencial (automático + manual) e confere
 * se a soma das contas contábeis de cada conta referencial bate com o saldo referencial.
 * Dados por empresa em S: deparaecf_<eid> = { map:{cls:{ref,orig}}, dados:{...}, arquivo, em }
 * Sem IA. Nada é apagado: reimportar só troca os relatórios; o de-para fica.
 * ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const ST = { eid: '', aba: 'map', filtro: '', soPend: false };
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const F = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const R2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const chave = eid => 'deparaecf_' + eid;
  function ler(eid) { let v = null; try { v = S.g(chave(eid)); } catch (e) { } if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } } v = v || {}; v.map = v.map || {}; v.dados = v.dados || null; return v; }
  function gravar(eid, o) { S.s(chave(eid), o); }
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  // ── leitura de uma aba (Balancete ou DRE do Domínio exportado em Excel) ──
  function lerAba(aoa, tipo) {
    const linhas = []; let colCodRef = -1, hdr = -1;
    for (let r = 0; r < Math.min(aoa.length, 30); r++) { const row = aoa[r] || []; const t = row.map(norm); if (t.some(x => x === 'CLASSIFICACAO') || t.some(x => x === 'DESCRICAO' || x === 'DESCRICAO DA CONTA')) { hdr = r; const iSR = t.findIndex(x => x === 'SALDO REF.'); if (iSR >= 0) { const iC = t.findIndex((x, j) => j > iSR && x === 'CODIGO'); if (iC >= 0) colCodRef = iC; } break; } }
    for (let r = 0; r < aoa.length; r++) {
      const row = aoa[r] || []; let iCls = -1;
      for (let j = 1; j <= 4; j++) { const v = row[j]; if (typeof v === 'string' && /^\d+(\.\d+)*$/.test(v.trim())) { iCls = j; break; } }
      if (iCls < 0) continue;
      const cls = String(row[iCls]).trim(); let desc = '', iDesc = -1;
      for (let j = iCls + 1; j < row.length; j++) { const v = row[j]; if (typeof v === 'string' && v.trim() && !/^\d+(\.\d+)*$/.test(v.trim())) { desc = v.trim(); iDesc = j; break; } }
      const nums = []; for (let j = (iDesc >= 0 ? iDesc + 1 : iCls + 1); j < row.length; j++) { if (colCodRef >= 0 && j >= colCodRef - 1) break; const v = row[j]; if (typeof v === 'number' && isFinite(v)) nums.push(v); }
      const cod = typeof row[0] === 'number' ? row[0] : (parseInt(row[0], 10) || null);
      const it = { cod, cls, desc };
      if (tipo === 'bal') { if (nums.length < 4) continue; const n = nums.slice(-4); it.sa = R2(n[0]); it.d = R2(n[1]); it.c = R2(n[2]); it.saldo = R2(n[3]); }
      else { if (!nums.length) continue; it.saldo = R2(nums[0]); }
      if (colCodRef >= 0) { const rc = row[colCodRef]; if (rc != null && rc !== '') it.refCodArq = typeof rc === 'number' ? rc : (parseInt(rc, 10) || null); }
      linhas.push(it);
    }
    if (tipo === 'bal') linhas.forEach((l, i) => { const nx = linhas[i + 1]; l.analitica = !(nx && nx.cls.indexOf(l.cls + '.') === 0); });
    else linhas.forEach(l => { l.analitica = true; });
    return linhas;
  }
  function identificarAbas(wb) {
    const out = {}; let cnpj = '', periodo = '';
    wb.SheetNames.forEach(nome => {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: null });
      const topo = aoa.slice(0, 12).map(r => (r || []).filter(v => v != null).join(' ')).join(' | ');
      const n = norm(nome + ' ' + topo);
      const tipo = /BALANCETE/.test(n) ? 'bal' : (/RESULTADO DO EXERCICIO|\bDRE\b/.test(n) ? 'dre' : '');
      if (!tipo) return;
      // referencial × contábil: pelo nome da aba; sem pista no nome, pelo formato da classificação (referencial = 1.01 / 3.01, 2º nível com 2 dígitos)
      const nn = norm(nome); let ref;
      if (/REFERENCIAL|ECF|FISCAL/.test(nn)) ref = true; else if (/CONTABIL/.test(nn)) ref = false;
      else { const cl = aoa.slice(0, 60).map(r => (r || []).find(v => typeof v === 'string' && /^\d+\.\d+/.test(v.trim()))).filter(Boolean); ref = cl.length > 0 && cl.filter(c => /^\d\.0\d(\.|$)/.test(c.trim())).length > cl.length / 2; }
      const m = topo.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/); if (m && !cnpj) cnpj = m[0];
      const p = topo.match(/\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}/); if (p && !periodo) periodo = p[0];
      out[tipo + (ref ? 'Ref' : 'Cont')] = lerAba(aoa, tipo);
    });
    return { abas: out, cnpj, periodo };
  }

  // ── de-para automático ──
  function autoMapear(o) {
    const d = o.dados; if (!d) return 0; let n = 0;
    const refPorCod = {}; [...(d.balRef || []), ...(d.dreRef || [])].forEach(r => { if (r.cod != null && !refPorCod[r.cod]) refPorCod[r.cod] = r.cls; });
    const set = (cls, ref, orig) => { const cur = o.map[cls]; if (cur && cur.orig === 'manual') return; if (cur && cur.ref === ref) return; o.map[cls] = { ref, orig }; n++; };
    // 1) código referencial que já estava na planilha (coluna "Código")
    [...(d.dreCont || []), ...(d.balCont || [])].forEach(c => { if (c.refCodArq != null && refPorCod[c.refCodArq]) set(c.cls, refPorCod[c.refCodArq], 'planilha'); });
    // 2) DRE: o Domínio lista o referencial na mesma ordem do contábil (uma linha por conta) → casa por ordem + valor
    // (o Domínio ordena o referencial pela conta referencial, então casa pelo VALOR de cada linha: 1 linha referencial para 1 linha contábil)
    const dc = d.dreCont || [], dr = (d.dreRef || []).map(x => Object.assign({}, x, { usado: false }));
    const pega = c => { const cand = dr.filter(x => !x.usado && Math.abs(x.saldo - c.saldo) < 0.005); if (!cand.length) return null; const clsU = [...new Set(cand.map(x => x.cls))]; if (clsU.length !== 1) return null; cand[0].usado = true; return clsU[0]; };
    dc.forEach(c => { const m = o.map[c.cls]; if (m) { const k = dr.find(x => !x.usado && x.cls === m.ref && Math.abs(x.saldo - c.saldo) < 0.005); if (k) k.usado = true; } });
    dc.forEach(c => { if (o.map[c.cls]) return; const ref = pega(c); if (ref) set(c.cls, ref, 'auto DRE'); });
    // 3) Balancete: conta analítica com o mesmo movimento (débito e crédito) e saldo de UMA só conta referencial
    const ra = (d.balRef || []).filter(r => r.analitica), idx = {};
    ra.forEach(r => { const k = r.d + '|' + r.c + '|' + r.saldo; (idx[k] = idx[k] || []).push(r); });
    (d.balCont || []).filter(c => c.analitica && !o.map[c.cls]).forEach(c => { const l = idx[c.d + '|' + c.c + '|' + c.saldo]; if (l && l.length === 1) set(c.cls, l[0].cls, 'auto saldo'); });
    // 4) Balancete: GRUPO contábil (conta sintética) com o mesmo débito, crédito e saldo de uma conta referencial → todas as analíticas do grupo vão para ela
    const bc = d.balCont || [];
    bc.filter(g => !g.analitica).forEach(g => { const l = idx[g.d + '|' + g.c + '|' + g.saldo]; if (!l || l.length !== 1) return; bc.filter(c => c.analitica && c.cls.indexOf(g.cls + '.') === 0 && !o.map[c.cls]).forEach(c => set(c.cls, l[0].cls, 'auto grupo')); });
    return n;
  }

  // ── conciliação: soma do contábil mapeado × saldo referencial ──
  function conciliar(o, tipo) {
    const d = o.dados || {}; const ref = tipo === 'bal' ? (d.balRef || []).filter(r => r.analitica) : agruparDreRef(d.dreRef || []);
    const cont = tipo === 'bal' ? (d.balCont || []).filter(c => c.analitica) : (d.dreCont || []);
    const soma = {}, contas = {}; cont.forEach(c => { const m = o.map[c.cls]; if (!m) return; soma[m.ref] = R2((soma[m.ref] || 0) + c.saldo); (contas[m.ref] = contas[m.ref] || []).push(c); });
    const linhas = ref.map(r => ({ cls: r.cls, desc: r.desc, ref: r.saldo, cont: R2(soma[r.cls] || 0), contas: contas[r.cls] || [] }));
    linhas.forEach(l => { l.dif = R2(l.ref - l.cont); });
    const semMapa = cont.filter(c => !o.map[c.cls] && Math.abs(c.saldo) >= 0.005);
    return { linhas, semMapa };
  }
  function agruparDreRef(dr) { const m = {}; dr.forEach(r => { (m[r.cls] = m[r.cls] || { cls: r.cls, desc: r.desc, saldo: 0 }).saldo = R2(m[r.cls].saldo + r.saldo); }); return Object.values(m); }

  // ── tela ──
  function opcoesEmpresas() { const emps = (S.emps() || []).slice().sort((a, b) => (+a.eid || 0) - (+b.eid || 0)); return '<option value="">— escolha a empresa —</option>' + emps.map(e => '<option value="' + E(e.eid) + '"' + (String(e.eid) === String(ST.eid) ? ' selected' : '') + '>#' + E(e.eid) + ' ' + E(e.nome) + '</option>').join(''); }
  function render() {
    const el = document.getElementById('deparaEcfRoot'); if (!el) return;
    const o = ST.eid ? ler(ST.eid) : null, d = o && o.dados;
    const empA = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {};
    let h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><button class="btn bo bsm" onclick="DeparaECF.abrir()">← Empresas</button><b style="font-size:15px">#' + E(ST.eid) + ' ' + E(empA.nome || '') + '</b>'
      + '<button class="btn bp" onclick="DeparaECF.importar()" ' + (ST.eid ? '' : 'disabled') + ' title="Excel com os relatórios do Domínio: Balancete e DRE no plano Contábil e no Referencial (pode ser 1 arquivo com as 4 abas ou vários arquivos)">📥 Importar relatórios do Domínio (Excel)</button>'
      + (d ? '<button class="action-btn action-btn-excel" onclick="DeparaECF.excel()">📊 Gerar Excel</button>' : '') + '</div>';
    if (!ST.eid) { el.innerHTML = h + '<div class="psub">Escolha a empresa para ver ou montar o de-para.</div>'; return; }
    if (!d) { el.innerHTML = h + '<div style="padding:14px;border:1px dashed var(--border);border-radius:8px;color:var(--slate);font-size:13px">Nenhum relatório importado ainda para esta empresa. No Domínio, gere o <b>Balancete</b> e a <b>DRE</b> no plano <b>Contábil</b> e no plano <b>Referencial</b>, exporte em Excel e importe aqui (pode ser a mesma planilha de de-para que vocês já usam).</div>'; return; }
    const cB = conciliar(o, 'bal'), cD = conciliar(o, 'dre');
    const okB = cB.linhas.filter(l => Math.abs(l.dif) < 0.005).length, okD = cD.linhas.filter(l => Math.abs(l.dif) < 0.005).length;
    const contAnal = (d.balCont || []).filter(c => c.analitica), mapeadas = contAnal.filter(c => o.map[c.cls]).length;
    h += '<div style="font-size:12px;color:var(--slate);margin-bottom:8px">Arquivo: <b>' + E(o.arquivo || '') + '</b> · período ' + E(d.periodo || '—') + ' · importado em ' + E(o.em ? new Date(o.em).toLocaleString('pt-BR') : '') + '</div>';
    const card = (t, v, cor) => '<div style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;min-width:170px"><div style="font-size:11px;color:var(--slate)">' + t + '</div><div style="font-size:18px;font-weight:700;color:' + (cor || 'var(--ink)') + '">' + v + '</div></div>';
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">' + card('Contas contábeis com de-para', mapeadas + ' de ' + contAnal.length, mapeadas === contAnal.length ? '#16a34a' : '#d97706') + card('Balancete referencial conferido', okB + ' de ' + cB.linhas.length, okB === cB.linhas.length ? '#16a34a' : '#dc2626') + card('DRE referencial conferida', okD + ' de ' + cD.linhas.length, okD === cD.linhas.length ? '#16a34a' : '#dc2626') + '</div>';
    const ab = (k, t) => '<button class="btn ' + (ST.aba === k ? 'bp' : 'bo') + ' bsm" onclick="DeparaECF.aba(\'' + k + '\')">' + t + '</button>';
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + ab('map', '🔗 De-para das contas') + ab('bal', '⚖️ Conferência do Balancete') + ab('dre', '📈 Conferência da DRE') + '<input class="si" placeholder="🔎 filtrar conta, classificação ou descrição" value="' + E(ST.filtro) + '" oninput="DeparaECF.filtrar(this.value)" style="margin-left:auto;min-width:260px"><label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="checkbox" ' + (ST.soPend ? 'checked' : '') + ' onchange="DeparaECF.soPend(this.checked)"> só pendências</label></div>';
    h += '<div id="deparaEcfCorpo"></div>';
    el.innerHTML = h; corpo();
  }
  function corpo() {
    const el = document.getElementById('deparaEcfCorpo'); if (!el || !ST.eid) return; const o = ler(ST.eid), d = o.dados || {};
    const f = norm(ST.filtro), passa = (...t) => !f || norm(t.join(' ')).includes(f);
    const th = (t, dir) => '<th style="padding:6px 8px;text-align:' + (dir ? 'right' : 'left') + ';position:sticky;top:0;background:var(--ink2);color:#fff;z-index:1">' + t + '</th>';
    const td = (v, dir, x) => '<td style="padding:5px 8px;' + (dir ? 'text-align:right;font-family:var(--mono);white-space:nowrap;' : '') + (x || '') + '">' + v + '</td>';
    const box = t => '<div style="overflow:auto;max-height:calc(100vh - 330px);border:1px solid var(--border);border-radius:6px"><table class="luc-t" style="width:100%;border-collapse:collapse;font-size:12px">' + t + '</table></div>';
    const refs = [...(d.balRef || []).filter(r => r.analitica), ...agruparDreRef(d.dreRef || [])]; const refDesc = {}; refs.forEach(r => { refDesc[r.cls] = r.desc; });
    if (ST.aba === 'map') {
      const dl = '<datalist id="deparaEcfRefs">' + [...new Map(refs.map(r => [r.cls, r])).values()].map(r => '<option value="' + E(r.cls) + '" label="' + E(r.cls + ' — ' + r.desc) + '"></option>').join('') + '</datalist>';
      const lin = (d.balCont || []).filter(c => c.analitica && (Math.abs(c.saldo) >= 0.005 || c.d || c.c)).filter(c => passa(c.cls, c.desc, (o.map[c.cls] || {}).ref || '')).filter(c => !ST.soPend || !o.map[c.cls]);
      el.innerHTML = dl + box('<thead><tr>' + th('Conta contábil') + th('Descrição') + th('Saldo atual', 1) + th('Conta referencial (ECF)') + th('Descrição referencial') + th('Origem') + '</tr></thead><tbody>' + lin.map(c => { const m = o.map[c.cls]; return '<tr style="' + (m ? '' : 'background:rgba(217,119,6,.12)') + '">' + td('<b>' + E(c.cls) + '</b>') + td(E(c.desc)) + td(F(c.saldo), 1) + td('<input class="si" list="deparaEcfRefs" value="' + E(m ? m.ref : '') + '" placeholder="classificação referencial" onchange="DeparaECF.definir(\'' + E(c.cls) + '\',this.value)" style="width:170px;font-size:12px">') + td(E(m ? (refDesc[m.ref] || '⚠ conta não está no referencial importado') : '—'), 0, 'font-size:11.5px') + td(m ? E(m.orig) : '<span style="color:#d97706;font-weight:700">sem de-para</span>', 0, 'font-size:11px') + '</tr>'; }).join('') + '</tbody>');
      return;
    }
    const c = conciliar(o, ST.aba);
    const lin = c.linhas.filter(l => passa(l.cls, l.desc, l.contas.map(x => x.cls + ' ' + x.desc).join(' '))).filter(l => !ST.soPend || Math.abs(l.dif) >= 0.005);
    const tot = lin.reduce((a, l) => { a.r += l.ref; a.c += l.cont; return a; }, { r: 0, c: 0 });
    let t = '<thead><tr>' + th('Conta referencial (ECF)') + th('Descrição') + th('Saldo referencial', 1) + th('Soma das contas contábeis', 1) + th('Diferença', 1) + th('Conferência') + th('Contas contábeis ligadas') + '</tr></thead><tbody>'
      + lin.map(l => { const ok = Math.abs(l.dif) < 0.005; return '<tr style="' + (ok ? '' : 'background:rgba(220,38,38,.10)') + '">' + td('<b>' + E(l.cls) + '</b>') + td(E(l.desc)) + td(F(l.ref), 1) + td(F(l.cont), 1) + td(F(l.dif), 1, ok ? '' : 'color:#dc2626;font-weight:700') + td(ok ? '<span style="color:#16a34a;font-weight:700">✓ bate</span>' : '<span style="color:#dc2626;font-weight:700">✗ diferença</span>') + td(l.contas.map(x => E(x.cls) + ' ' + E(x.desc) + ' (' + F(x.saldo) + ')').join('<br>') || '<span style="color:var(--slate)">nenhuma</span>', 0, 'font-size:11px') + '</tr>'; }).join('')
      + '<tr style="font-weight:700">' + td('Total') + td('') + td(F(tot.r), 1) + td(F(tot.c), 1) + td(F(tot.r - tot.c), 1) + td('') + td('') + '</tr></tbody>';
    let extra = '';
    if (c.semMapa.length) extra = '<div style="margin-top:10px;font-size:12.5px;color:#d97706"><b>⚠ ' + c.semMapa.length + ' conta(s) contábil(is) com saldo e sem de-para</b> (não entram em nenhuma conta referencial): ' + c.semMapa.slice(0, 15).map(x => E(x.cls + ' ' + x.desc + ' ' + F(x.saldo))).join(' · ') + (c.semMapa.length > 15 ? ' …' : '') + ' — ligue-as na aba "De-para das contas".</div>';
    el.innerHTML = box(t) + extra;
  }

  // ── ações ──
  function empresa(eid) { ST.eid = eid; render(); }
  function aba(a) { ST.aba = a; render(); }
  function filtrar(v) { ST.filtro = v; clearTimeout(root._depT); root._depT = setTimeout(corpo, 250); }
  function soPend(v) { ST.soPend = v; corpo(); }
  function definir(cls, v) {
    const o = ler(ST.eid); v = String(v || '').trim();
    if (!v) delete o.map[cls]; else o.map[cls] = { ref: v, orig: 'manual' };
    gravar(ST.eid, o); toast(v ? 'De-para salvo: ' + cls + ' → ' + v : 'De-para removido de ' + cls, 'ok'); render();
  }
  function importar() {
    if (typeof XLSX === 'undefined') { toast('Biblioteca de Excel não carregada. Atualize a página (Ctrl+F5).', 'err'); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls'; inp.multiple = true;
    inp.onchange = async () => {
      const abas = {}; let cnpj = '', periodo = '', nomes = [];
      for (const f of inp.files) { try { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const r = identificarAbas(wb); Object.assign(abas, r.abas); cnpj = cnpj || r.cnpj; periodo = periodo || r.periodo; nomes.push(f.name); } catch (e) { toast('Não consegui ler ' + f.name + ': ' + e.message, 'err'); } }
      const falta = ['balCont', 'balRef', 'dreCont', 'dreRef'].filter(k => !abas[k] || !abas[k].length);
      if (falta.length === 4) { toast('Não achei Balancete nem DRE nos arquivos.', 'err'); return; }
      const emp = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {};
      if (cnpj && emp.cnpj && cnpj.replace(/\D/g, '').slice(0, 8) !== String(emp.cnpj).replace(/\D/g, '').slice(0, 8)) { if (!confirm('O CNPJ do arquivo (' + cnpj + ') não é o da empresa escolhida (' + emp.cnpj + '). Importar mesmo assim?')) return; }
      const o = ler(ST.eid); const antes = o.dados || {};
      o.dados = { balCont: abas.balCont || antes.balCont || [], balRef: abas.balRef || antes.balRef || [], dreCont: abas.dreCont || antes.dreCont || [], dreRef: abas.dreRef || antes.dreRef || [], periodo: periodo || antes.periodo || '' };
      o.arquivo = nomes.join(', '); o.em = new Date().toISOString();
      const n = autoMapear(o); gravar(ST.eid, o);
      const nomesAba = { balCont: 'Balancete contábil', balRef: 'Balancete referencial', dreCont: 'DRE contábil', dreRef: 'DRE referencial' };
      alert('Importado: ' + ['balCont', 'balRef', 'dreCont', 'dreRef'].filter(k => abas[k] && abas[k].length).map(k => nomesAba[k] + ' (' + abas[k].length + ' linhas)').join(', ') + '.\n' + (falta.length ? 'Não veio neste arquivo (mantido o anterior, se havia): ' + falta.map(k => nomesAba[k]).join(', ') + '.\n' : '') + n + ' ligação(ões) contábil → referencial feitas automaticamente. As que você editou à mão não foram mexidas.');
      render();
    };
    inp.click();
  }
  async function excel() {
    const o = ler(ST.eid), d = o.dados; if (!d) return; if (typeof ExcelJS === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const emp = (S.emps() || []).find(e => String(e.eid) === String(ST.eid)) || {};
    const AZUL = 'FF1E3558', VERDE = 'FF0F766E', OURO = 'FFFFD700', CINZA = 'FFF1F5F9', BR = 'FFFFFFFF';
    const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } }), borda = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    const MOEDA = '#,##0.00;[Red]-#,##0.00';
    const wb = new ExcelJS.Workbook();
    const cab = (ws, tit, ncol) => { ws.mergeCells(1, 1, 1, ncol); ws.getCell(1, 1).value = 'JJR CONSULTORIA CONTÁBIL'; ws.getCell(1, 1).font = { size: 16, bold: true, color: { argb: BR } }; ws.getCell(1, 1).fill = fill(AZUL); ws.getRow(1).height = 28;
      ws.mergeCells(2, 1, 2, ncol); ws.getCell(2, 1).value = tit; ws.getCell(2, 1).font = { size: 12, bold: true, color: { argb: BR } }; ws.getCell(2, 1).fill = fill(VERDE); ws.getRow(2).height = 20;
      ws.mergeCells(3, 1, 3, ncol); ws.getCell(3, 1).value = (emp.nome || ('#' + ST.eid)) + (emp.cnpj ? ' · CNPJ ' + emp.cnpj : '') + (d.periodo ? ' · período ' + d.periodo : ''); ws.getCell(3, 1).font = { bold: true, color: { argb: AZUL } }; return 5; };
    const tabela = (ws, r, cols, linhas, moedas, destacar) => { cols.forEach((t, i) => { const c = ws.getCell(r, i + 1); c.value = t; c.font = { bold: true, color: { argb: BR } }; c.fill = fill(VERDE); c.border = borda; }); r++;
      linhas.forEach((l, k) => { l.forEach((v, i) => { const c = ws.getCell(r, i + 1); c.value = v; c.border = borda; c.fill = fill(destacar && destacar(l) ? 'FFFEE2E2' : (k % 2 ? CINZA : BR)); if (moedas.includes(i)) { c.numFmt = MOEDA; c.alignment = { horizontal: 'right' }; } }); r++; }); return r; };
    const w1 = wb.addWorksheet('De-para', { views: [{ showGridLines: false }] }); w1.columns = [{ width: 18 }, { width: 46 }, { width: 18 }, { width: 22 }, { width: 60 }, { width: 14 }];
    const refs = [...(d.balRef || []), ...(d.dreRef || [])]; const rd = {}; refs.forEach(r => { rd[r.cls] = r.desc; });
    let r = cab(w1, 'De-para Contábil × ECF (plano referencial)', 6);
    tabela(w1, r, ['Conta contábil', 'Descrição', 'Saldo atual', 'Conta referencial', 'Descrição referencial', 'Origem'], (d.balCont || []).filter(c => c.analitica && (Math.abs(c.saldo) >= 0.005 || c.d || c.c)).map(c => { const m = o.map[c.cls]; return [c.cls, c.desc, c.saldo, m ? m.ref : '', m ? (rd[m.ref] || '') : 'SEM DE-PARA', m ? m.orig : '']; }), [2], l => !l[3]);
    ['bal', 'dre'].forEach(tp => { const ws = wb.addWorksheet(tp === 'bal' ? 'Conferência Balancete' : 'Conferência DRE', { views: [{ showGridLines: false }] }); ws.columns = [{ width: 20 }, { width: 55 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 12 }];
      const c = conciliar(o, tp); let rr = cab(ws, 'Conferência ' + (tp === 'bal' ? 'do Balancete' : 'da DRE') + ' — referencial × soma das contas contábeis', 6);
      tabela(ws, rr, ['Conta referencial', 'Descrição', 'Saldo referencial', 'Soma contábil', 'Diferença', 'Conferência'], c.linhas.map(l => [l.cls, l.desc, l.ref, l.cont, l.dif, Math.abs(l.dif) < 0.005 ? 'OK' : 'DIFERENÇA']), [2, 3, 4], l => l[5] !== 'OK'); });
    const buf = await wb.xlsx.writeBuffer(); const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = 'Depara_Contabil_x_ECF_' + ST.eid + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  // lista padrão de empresas (Adicionar empresa + tabela com filtros), igual Ganhos/Rendimentos
  function abrir() { const la = document.getElementById('deparaecfListaArea'), rt = document.getElementById('deparaEcfRoot'); if (la) la.style.display = ''; if (rt) rt.style.display = 'none'; if (typeof prepararAdicionarEmpresa === 'function') prepararAdicionarEmpresa('deparaecf'); }
  function abrirEmp(eid) { ST.eid = String(eid); const la = document.getElementById('deparaecfListaArea'), rt = document.getElementById('deparaEcfRoot'); if (la) la.style.display = 'none'; if (rt) rt.style.display = ''; render(); }
  root.DeparaECF = { abrirEmp, abrir, render, empresa, aba, filtrar, soPend, definir, importar, excel, _lerAba: lerAba, _identificar: identificarAbas, _auto: autoMapear, _conciliar: conciliar };
})(typeof window !== 'undefined' ? window : this);

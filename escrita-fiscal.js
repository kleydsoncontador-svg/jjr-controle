/* ─────────────────────────────────────────────────────────────────────────────────────────────────────────
   ESCRITA FISCAL (aba dourada em Lançamentos Contábeis) — pedido do usuário 26/11/2026.
   Confronta o LIVRO FISCAL de Entradas/Saídas do sistema fiscal com as notas do site (NF-e, NFS-e, NFC-e, CT-e):
     • o que está no site e não está no fiscal, e vice-versa — por número + CNPJ/CPF, depois número + valor, depois CNPJ + valor + data;
     • coluna Operação (Venda, Compra, Devolução de venda, Devolução de compra, Remessa, Serviço) pelo CFOP do livro
       (nota que só existe no site: pela natureza da operação/tipo da nota);
     • faixa de meses (‹ Jan … Dez ›); o selo de cada mês abre a janela com as 2 abas de diferenças;
     • "No site, não no fiscal" gera o TXT padrão de lançamentos (Mister Contador) com as contas da ⚙️ engrenagem.
   Leitura do livro: SPED EFD (C100/D100/A100 + 0150), planilha Excel/CSV (cabeçalho reconhecido sozinho) e PDF (leitura genérica —
   ajustar ao modelo do sistema fiscal quando o usuário mandar os modelos).
   Armazenamento (dados_app): escfis_cfg_<eid> (contas por operação), escfis_<eid>_<AAAA-MM>_<E|S> (linhas do livro),
   escfis_res_<eid>_<AAAA-MM> (contagem do último confronto, para o selo do mês).
   ───────────────────────────────────────────────────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';
  const OURO = '#D4A537';
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const OPS = { venda: 'Venda', compra: 'Compra', dev_venda: 'Devolução de venda', dev_compra: 'Devolução de compra', remessa: 'Remessa', servico: 'Serviço' };
  // operações contábeis do TXT (as contas ficam na engrenagem, por empresa)
  const OPS_TXT = [
    ['compra_mercadoria', 'Compra de mercadoria para revenda (estoque)', 'compra', 'Compra de mercadoria NF'],
    ['compra_uso_consumo', 'Compra para uso e consumo', 'compra', 'Compra p/ uso e consumo NF'],
    ['venda', 'Vendas', 'venda', 'Venda NF'],
    ['servico_prestado', 'Serviço prestado', 'servico', 'Servico prestado NF'],
    ['servico_tomado', 'Serviço tomado', 'servico', 'Servico tomado NF'],
    ['dev_venda', 'Devolução de venda', 'dev_venda', 'Devolucao de venda NF'],
    ['dev_compra_mercadoria', 'Devolução de compra — mercadoria para revenda', 'dev_compra', 'Devolucao de compra de mercadoria NF'],
    ['dev_compra_uso_consumo', 'Devolução de compra — uso e consumo', 'dev_compra', 'Devolucao de compra de uso e consumo NF'],
  ];
  const OPT = Object.fromEntries(OPS_TXT.map(o => [o[0], o]));
  const fechYm = () => { try { const f = String(S.fechAtual() || '').slice(0, 7); if (/^\d{4}-\d{2}$/.test(f)) return f; } catch (e) { } return new Date().toISOString().slice(0, 7); };
  const ST = { eid: '', ym: fechYm(), f: {}, site: [], fisc: [], ok: false, carregando: false, mAba: 'fisc', mf: {}, mSel: {}, mDet: {} };
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const F = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const R2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const num = t => { if (typeof t === 'number') return t; const s = String(t == null ? '' : t).replace(/[^\d,.-]/g, ''); if (!s) return 0; return parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0; };
  const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const dig = s => String(s || '').replace(/\D/g, '');
  const numNf = s => { const d = dig(s).replace(/^0+/, ''); return d || ''; };
  const br = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';
  const fmtDoc = d => { d = dig(d); if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'); if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'); return d; };
  const fmtCfop = c => (c && c.length === 4) ? c[0] + '.' + c.slice(1) : (c || '');
  const sOk = k => { try { const x = S.g(k); if (typeof x === 'string') { try { return JSON.parse(x); } catch (e) { return null; } } return x; } catch (e) { return null; } };
  const kCfg = eid => 'escfis_cfg_' + eid, kMes = (eid, ym, es) => 'escfis_' + eid + '_' + ym + '_' + es, kRes = (eid, ym) => 'escfis_res_' + eid + '_' + ym;
  function cfg(eid) { const v = sOk(kCfg(eid || ST.eid)) || {}; v.contas = v.contas || {}; v.compraPadrao = v.compraPadrao || 'mercadoria'; return v; }
  function lerLivro(eid, ym) { return ['E', 'S'].reduce((a, es) => { const v = sOk(kMes(eid, ym, es)); return a.concat((v && v.rows) || []); }, []); }
  function infoLivro(eid, ym) { return ['E', 'S'].map(es => { const v = sOk(kMes(eid, ym, es)); return v && v.rows ? { es, n: v.rows.length, arq: v.arquivo || '', em: v.em || '' } : null; }).filter(Boolean); }
  function somaMes(ym, n) { const [a, m] = ym.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function cnpjEmp(eid) { try { const e = S.emps().find(x => String(x.eid) === String(eid)); return dig(e && (e.cnpjNum || e.cnpj)); } catch (e) { return ''; } }

  // ── classificação ──
  // CFOP do livro → operação simplificada + operação contábil do TXT (det). 1/2/3 = entrada, 5/6/7 = saída.
  function classCfop(c0) {
    const c = dig(c0); if (c.length !== 4) return null;
    const d = +c[0], r = +c.slice(1), es = d <= 3 ? 'E' : 'S';
    if (es === 'E') {
      if ([201, 202, 203, 204, 208, 209, 410, 411].includes(r)) return { es, op: 'dev_venda', det: 'dev_venda' };
      if ([406, 407, 551, 556].includes(r) || (r >= 250 && r <= 257)) return { es, op: 'compra', det: 'compra_uso_consumo' };
      if ((r >= 300 && r <= 306) || (r >= 350 && r <= 360) || r === 933) return { es, op: 'servico', det: 'servico_tomado' };
      if ((r >= 101 && r <= 129) || (r >= 401 && r <= 403) || r === 652 || r === 653) return { es, op: 'compra', det: 'compra_mercadoria' };
      return { es, op: 'remessa', det: null };
    }
    if ([201, 202, 208, 209, 210, 410, 411].includes(r)) return { es, op: 'dev_compra', det: 'dev_compra_mercadoria' };
    if ([412, 413, 553, 556].includes(r)) return { es, op: 'dev_compra', det: 'dev_compra_uso_consumo' };
    if ((r >= 300 && r <= 307) || (r >= 350 && r <= 360) || r === 933) return { es, op: 'servico', det: 'servico_prestado' };
    if ((r >= 101 && r <= 125) || (r >= 401 && r <= 405) || r === 551 || (r >= 651 && r <= 662)) return { es, op: 'venda', det: 'venda' };
    return { es, op: 'remessa', det: null };
  }
  // nota do site (sem CFOP): pelo tipo da nota, direção e natureza da operação
  function classSite(n, cf) {
    const nat = nrm(n.natureza_operacao), ent = n.es === 'E', uso = cf.compraPadrao === 'uso';
    if (n.tipo === 'nfse') return ent ? { op: 'servico', det: 'servico_tomado' } : { op: 'servico', det: 'servico_prestado' };
    if (n.tipo === 'cte') return { op: 'servico', det: 'servico_tomado' };
    if (/DEVOL/.test(nat)) return ent ? { op: 'dev_venda', det: 'dev_venda' } : { op: 'dev_compra', det: /CONSUMO|ATIVO|IMOBILIZ/.test(nat) || uso ? 'dev_compra_uso_consumo' : 'dev_compra_mercadoria' };
    if (/REMESSA|RETORNO|TRANSFER|BONIFIC|COMODATO|DEMONSTR|CONSERTO|AMOSTRA|BRINDE|DOACAO|CONSIGNA|ARMAZEN|LOCACAO|EMPRESTIMO|GARANTIA/.test(nat)) return { op: 'remessa', det: null };
    if (ent) return { op: 'compra', det: /CONSUMO|ATIVO|IMOBILIZ/.test(nat) || uso ? 'compra_uso_consumo' : 'compra_mercadoria' };
    return { op: 'venda', det: 'venda' };
  }

  // ── notas do site no mês ──
  async function carregarSite(eid, ym) {
    const [a, m] = ym.split('-').map(Number), fim = ym + '-' + String(new Date(a, m, 0).getDate()).padStart(2, '0');
    const sel = 'id,tipo,numero,serie,modelo,data_emissao,cnpj_emitente,nome_emitente,cnpj_destinatario,nome_destinatario,direcao,valor_total,natureza_operacao';
    const { data, error } = await _lancctbFetchTudo(() => _supaClient.from('notas_fiscais').select(sel).eq('empresa_eid', String(eid)).gte('data_emissao', ym + '-01').lte('data_emissao', fim).order('data_emissao').order('id'));
    if (error) throw new Error(error.message);
    const vistos = new Set(), cn = cnpjEmp(eid), raiz = cn.slice(0, 8), cf = cfg(eid);
    return (data || []).filter(n => !vistos.has(n.id) && vistos.add(n.id)).map(n => {
      const ent = n.direcao === 'compra';
      // contraparte = quem NÃO é a empresa (entrada própria/devolução emitida pela empresa inverte os lados)
      let doc = dig(ent ? n.cnpj_emitente : n.cnpj_destinatario), nome = ent ? n.nome_emitente : n.nome_destinatario;
      if (raiz && doc.slice(0, 8) === raiz) { doc = dig(ent ? n.cnpj_destinatario : n.cnpj_emitente); nome = ent ? n.nome_destinatario : n.nome_emitente; }
      const o = { id: n.id, tipo: n.tipo, es: ent ? 'E' : 'S', data: n.data_emissao, numero: numNf(n.numero), serie: n.serie || '', doc, nome: nome || '', valor: R2(n.valor_total), natureza_operacao: n.natureza_operacao || '' };
      Object.assign(o, classSite(o, cf)); return o;
    });
  }

  // ── confronto site × livro ──
  function confrontar(site, fisc) {
    site.forEach(s => { s.par = null; }); fisc.forEach(f => { f.par = null; });
    const tentar = (ok) => site.forEach(s => { if (s.par) return; let best = null, bd = 1e9; fisc.forEach(f => { if (f.par || f.es !== s.es || !ok(s, f)) return; const d = Math.abs(f.valor - s.valor); if (d < bd) { bd = d; best = f; } }); if (best) { s.par = best; best.par = s; } });
    const mesmoDoc = (a, b) => a && b && (a === b || (a.length === 14 && b.length === 14 && a.slice(0, 8) === b.slice(0, 8)));
    const valOk = (a, b) => Math.abs(a - b) <= 0.05;
    tentar((s, f) => s.numero && s.numero === f.numero && mesmoDoc(s.doc, f.doc));
    tentar((s, f) => s.numero && s.numero === f.numero && valOk(s.valor, f.valor) && (!s.doc || !f.doc || mesmoDoc(s.doc, f.doc)));
    tentar((s, f) => mesmoDoc(s.doc, f.doc) && valOk(s.valor, f.valor) && s.data === f.data);
  }
  function linhasTela() {
    const L = [];
    ST.site.forEach(s => {
      const f = s.par, cl = f && classCfop(f.cfop);
      const obs = []; if (f && Math.abs(f.valor - s.valor) > 0.05) obs.push('valor diferente'); if (f && f.data && f.data !== s.data) obs.push('data no fiscal ' + br(f.data)); if (f && f.numero !== s.numero) obs.push('nº no fiscal ' + f.numero);
      L.push({ sit: f ? 'fiscal' : 'nao_fiscal', es: s.es, data: s.data, numero: s.numero, doc: s.doc || (f && f.doc) || '', nome: s.nome || (f && f.nome) || '', cfop: f ? f.cfop : '', op: cl ? cl.op : s.op, vs: s.valor, vf: f ? f.valor : null, obs: obs.join('; '), ref: s });
    });
    ST.fisc.filter(f => !f.par).forEach(f => { const cl = classCfop(f.cfop); L.push({ sit: 'so_fiscal', es: f.es, data: f.data, numero: f.numero, doc: f.doc, nome: f.nome, cfop: f.cfop, op: cl ? cl.op : (f.es === 'E' ? 'compra' : 'venda'), vs: null, vf: f.valor, obs: '', ref: f }); });
    return L.sort((a, b) => (a.data || '').localeCompare(b.data || '') || (+a.numero || 0) - (+b.numero || 0));
  }
  const SIT = { fiscal: 'Está no fiscal', nao_fiscal: 'Não está no fiscal', so_fiscal: 'Só no fiscal (não está no site)' };
  const SITCOR = { fiscal: 'var(--green)', nao_fiscal: 'var(--red)', so_fiscal: 'var(--amber)' };

  // ── tela principal ──
  async function render(eid) {
    if (eid !== undefined) { if (String(eid) !== ST.eid) { ST.eid = String(eid); ST.ok = false; } }
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    const [a, m] = ST.ym.split('-').map(Number), inf = infoLivro(ST.eid, ST.ym);
    let h = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'
      + '<b style="color:' + OURO + ';font-size:15px">📒 Escrita Fiscal</b>'
      + '<span style="font-size:12px;color:var(--slate)">confronto do livro fiscal (entradas e saídas) com as notas do site</span>'
      + '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">'
      + '<button class="btn bo bsm" onclick="EscFis.importar()" title="Livro fiscal de Entradas e/ou Saídas do sistema fiscal: SPED EFD (.txt), planilha (.xlsx/.csv) ou PDF">📥 Importar livro fiscal</button>'
      + '<button class="btn bo bsm" onclick="EscFis.diferencas()" title="Janela com as notas que estão só no fiscal e só no site (com o TXT)">🔎 Diferenças de ' + MESES_L[m - 1] + '</button>'
      + '<button class="action-btn action-btn-excel" onclick="EscFis.excel()">📊 Gerar Excel</button>'
      + '<button class="btn bo bsm" onclick="EscFis.config()" title="Contas de cada operação para o TXT">⚙️</button></span></div>';
    // faixa de meses (‹ ano ›) — o selo de cada mês abre as diferenças daquele mês
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">'
      + '<button class="btn bo bsm" onclick="EscFis.mes(-1)" title="Mês anterior">‹</button>'
      + MESES.map((n, i) => {
        const ym = a + '-' + String(i + 1).padStart(2, '0'), at = ym === ST.ym, r = sOk(kRes(ST.eid, ym));
        const tot = r ? (r.soFiscal || 0) + (r.soSite || 0) : null;
        const selo = r ? '<span onclick="event.stopPropagation();EscFis.diferencas(\'' + ym + '\')" title="Abrir as diferenças de ' + MESES_L[i] + ' (só no fiscal: ' + r.soFiscal + ' · só no site: ' + r.soSite + ')" style="display:block;margin:0 auto 2px;width:max-content;font-size:10px;padding:0 6px;border-radius:8px 8px 0 0;cursor:pointer;background:' + (tot ? 'var(--red-bg)' : 'var(--green-bg)') + ';color:' + (tot ? 'var(--red)' : 'var(--green)') + '">' + (tot ? '⚠ ' + tot : '✓') + '</span>' : '<span style="display:block;height:15px"></span>';
        return '<div style="text-align:center">' + selo + '<button class="btn ' + (at ? 'bp' : 'bo') + ' bsm" style="min-width:46px' + (at ? '' : ';color:' + OURO) + '" onclick="EscFis.irMes(\'' + ym + '\')">' + n + '</button></div>';
      }).join('')
      + '<button class="btn bo bsm" onclick="EscFis.mes(1)" title="Próximo mês">›</button>'
      + '<span style="margin-left:8px;font-weight:700">' + a + '</span>'
      + '<button class="btn bo bsm" onclick="EscFis.mes(-12)" title="Ano anterior">«</button><button class="btn bo bsm" onclick="EscFis.mes(12)" title="Próximo ano">»</button></div>';
    h += '<div style="font-size:12px;color:var(--slate);margin-bottom:8px">Livro fiscal de ' + MESES_L[m - 1] + '/' + a + ': '
      + (inf.length ? inf.map(i => '<b>' + (i.es === 'E' ? 'Entradas' : 'Saídas') + '</b> ' + i.n + ' nota(s)' + (i.arq ? ' (' + E(i.arq) + ')' : '')).join(' · ') + ' <button class="btn bo bsm" style="padding:0 6px;font-size:10.5px" onclick="EscFis.apagarMes()" title="Apaga só o livro fiscal importado deste mês (as notas do site não são tocadas)">🗑 apagar livro do mês</button>' : '<span style="color:var(--amber)">nenhum livro importado — use 📥 Importar livro fiscal</span>')
      + '</div><div id="escfisResumo" style="margin-bottom:8px;font-size:12.5px"></div><div id="escfisTab"></div>';
    el.innerHTML = h;
    if (!ST.ok || ST.okYm !== ST.ym || ST.okEid !== ST.eid) await carregar(); else corpo();
  }
  async function carregar() {
    const box = document.getElementById('escfisTab'); if (box) box.innerHTML = '<div style="padding:14px;color:var(--slate)">Carregando as notas de ' + br(ST.ym + '-01').slice(3) + '…</div>';
    const eid = ST.eid, ym = ST.ym;
    try { ST.site = await carregarSite(eid, ym); } catch (e) { if (box) box.innerHTML = '<div style="color:var(--red)">Erro ao buscar as notas do site: ' + E(e.message) + '</div>'; return; }
    if (eid !== ST.eid || ym !== ST.ym) return; // trocou de mês/empresa no meio
    ST.fisc = lerLivro(eid, ym).map(r => Object.assign({}, r));
    confrontar(ST.site, ST.fisc); ST.ok = true; ST.okYm = ym; ST.okEid = eid;
    if (ST.fisc.length) { const r = { soFiscal: ST.fisc.filter(f => !f.par).length, soSite: ST.site.filter(s => !s.par).length, em: new Date().toISOString().slice(0, 10) }; const ant = sOk(kRes(eid, ym)); if (!ant || ant.soFiscal !== r.soFiscal || ant.soSite !== r.soSite) { S.s(kRes(eid, ym), r); render(); return; } }
    corpo();
  }
  function filtrar(L, f) {
    const t = (v, q) => !q || nrm(v).includes(nrm(q));
    return L.filter(l => (!f.sit || l.sit === f.sit) && (!f.es || l.es === f.es) && (!f.op || l.op === f.op)
      && t(br(l.data), f.data) && t(l.numero, f.numero) && (!f.doc || dig(l.doc).includes(dig(f.doc)) || t(l.doc, f.doc)) && t(l.nome, f.nome) && (!f.cfop || dig(l.cfop).includes(dig(f.cfop)))
      && (!f.vs || (l.vs != null && F(l.vs).includes(f.vs))) && (!f.vf || (l.vf != null && F(l.vf).includes(f.vf))) && t(l.obs, f.obs));
  }
  const thF = (k, ph, st, cb) => '<th style="padding:3px 4px"><input class="si" placeholder="🔎 ' + ph + '" value="' + E(st[k] || '') + '" style="width:100%;font-size:11px" oninput="' + cb + '(\'' + k + '\',this.value)"></th>';
  const thS = (k, opts, st, cb) => '<th style="padding:3px 4px"><select class="si" style="width:100%;font-size:11px" onchange="' + cb + '(\'' + k + '\',this.value)"><option value="">Todos</option>' + opts.map(([v, n]) => '<option value="' + v + '"' + (st[k] === v ? ' selected' : '') + '>' + E(n) + '</option>').join('') + '</select></th>';
  function corpo() {
    const box = document.getElementById('escfisTab'); if (!box) return;
    const L = linhasTela(), V = filtrar(L, ST.f), f = ST.f, cb = 'EscFis.filtro';
    const n = k => L.filter(l => l.sit === k).length;
    const rs = document.getElementById('escfisResumo');
    if (rs) rs.innerHTML = '<b>' + L.length + '</b> nota(s) no mês · <span style="color:var(--green)">está no fiscal: <b>' + n('fiscal') + '</b></span> · <span style="color:var(--red)">não está no fiscal: <b>' + n('nao_fiscal') + '</b></span> · <span style="color:var(--amber)">só no fiscal: <b>' + n('so_fiscal') + '</b></span>' + (!ST.fisc.length ? ' <span style="color:var(--slate)">(sem livro fiscal importado neste mês, todas aparecem como "não está no fiscal")</span>' : '');
    const head = '<tr><th>Situação</th><th>E/S</th><th>Data emissão</th><th>Número</th><th>CNPJ/CPF</th><th>Destinatário / Remetente</th><th>CFOP</th><th>Operação</th><th style="text-align:right">Valor no site</th><th style="text-align:right">Valor no fiscal</th><th>Observação</th></tr>'
      + '<tr>' + thS('sit', Object.entries(SIT), f, cb) + thS('es', [['E', 'Entrada'], ['S', 'Saída']], f, cb) + thF('data', 'data', f, cb) + thF('numero', 'número', f, cb) + thF('doc', 'CNPJ/CPF', f, cb) + thF('nome', 'nome', f, cb) + thF('cfop', 'CFOP', f, cb) + thS('op', Object.entries(OPS), f, cb) + thF('vs', 'valor', f, cb) + thF('vf', 'valor', f, cb) + thF('obs', 'obs.', f, cb) + '</tr>';
    const body = V.length ? V.map(l => '<tr><td style="color:' + SITCOR[l.sit] + ';font-weight:600;white-space:nowrap">' + SIT[l.sit] + '</td><td>' + (l.es === 'E' ? 'Entrada' : 'Saída') + '</td><td>' + br(l.data) + '</td><td>' + E(l.numero) + '</td><td style="font-family:var(--mono);font-size:11px;white-space:nowrap">' + E(fmtDoc(l.doc)) + '</td><td>' + E(l.nome) + '</td><td>' + E(fmtCfop(l.cfop)) + '</td><td>' + E(OPS[l.op] || '') + '</td><td style="text-align:right">' + (l.vs == null ? '—' : F(l.vs)) + '</td><td style="text-align:right">' + (l.vf == null ? '—' : F(l.vf)) + '</td><td style="font-size:11px;color:var(--amber)">' + E(l.obs) + '</td></tr>').join('')
      : '<tr><td colspan="11" style="padding:14px;color:var(--slate)">Nenhuma nota com esses filtros.</td></tr>';
    const tv = V.reduce((s, l) => s + (l.vs || 0), 0), tf = V.reduce((s, l) => s + (l.vf || 0), 0);
    box.innerHTML = '<div style="overflow-x:auto"><table class="tbl" style="width:100%;font-size:12px"><thead style="position:sticky;top:0;z-index:2">' + head + '</thead><tbody>' + body + '</tbody><tfoot><tr style="font-weight:700"><td colspan="8">' + V.length + ' nota(s) filtrada(s)</td><td style="text-align:right">' + F(tv) + '</td><td style="text-align:right">' + F(tf) + '</td><td></td></tr></tfoot></table></div>';
  }
  let _tmF = null;
  function filtro(k, v) { ST.f[k] = v; clearTimeout(_tmF); _tmF = setTimeout(corpo, 200); }
  function irMes(ym) { ST.ym = ym; ST.ok = false; render(); }
  function mes(n) { irMes(somaMes(ST.ym, n)); }
  function apagarMes() {
    const [a, m] = ST.ym.split('-');
    if (!confirm('Apagar o livro fiscal importado de ' + MESES_L[+m - 1] + '/' + a + '?\n\nSó o livro fiscal deste mês é apagado — as notas do site não são tocadas. Depois é só importar de novo.')) return;
    ['E', 'S'].forEach(es => { if (sOk(kMes(ST.eid, ST.ym, es))) S.s(kMes(ST.eid, ST.ym, es), { rows: [], arquivo: '', em: '' }); });
    S.s(kRes(ST.eid, ST.ym), { soFiscal: 0, soSite: 0, em: '', semLivro: true }); ST.ok = false; render();
  }

  // ── janela de diferenças do mês (2 abas) ──
  async function diferencas(ym) {
    if (ym && ym !== ST.ym) { ST.ym = ym; ST.ok = false; await render(); }
    else if (!ST.ok) await carregar();
    if (!ST.fisc.length && !confirm('Não há livro fiscal importado em ' + MESES_L[+ST.ym.slice(5) - 1] + '/' + ST.ym.slice(0, 4) + ' — todas as notas do site vão aparecer como "não está no fiscal". Abrir mesmo assim?')) return;
    ST.mf = { fisc: {}, site: {} }; ST.mSel = {}; ST.mDet = {};
    ST.site.filter(s => !s.par).forEach(s => { ST.mDet[s.id] = s.det || ''; ST.mSel[s.id] = !!s.det; });
    let ov = document.getElementById('escfisModal'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'escfisModal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99990;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:12px;width:min(1400px,100%);max-height:94vh;display:flex;flex-direction:column;box-shadow:var(--shadow-md)"><div id="escfisModalCorpo" style="padding:14px 16px;overflow:auto"></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov); modal();
  }
  function modal() {
    const el = document.getElementById('escfisModalCorpo'); if (!el) return;
    const [a, m] = ST.ym.split('-').map(Number), so = ST.fisc.filter(f => !f.par), ss = ST.site.filter(s => !s.par);
    const ab = (k, t, n) => '<button onclick="EscFis.mAba(\'' + k + '\')" style="padding:8px 14px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:' + (ST.mAba === k ? OURO : 'var(--slate)') + ';border-bottom:2px solid ' + (ST.mAba === k ? OURO : 'transparent') + '">' + t + ' (' + n + ')</button>';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><b style="font-size:15px;color:' + OURO + '">📒 Escrita Fiscal — ' + MESES_L[m - 1] + '/' + a + '</b>'
      + '<span style="margin-left:auto;display:flex;gap:6px"><button class="btn bo bsm" onclick="EscFis.mMes(-1)" title="Mês anterior">‹</button><button class="btn bo bsm" onclick="EscFis.mMes(1)" title="Próximo mês">›</button><button class="action-btn action-btn-excel" onclick="EscFis.excelModal()">📊 Gerar Excel</button><button class="btn bo bsm" onclick="document.getElementById(\'escfisModal\').remove()">Fechar</button></span></div>'
      + '<div style="border-bottom:1px solid var(--border);margin-bottom:10px">' + ab('fisc', 'No fiscal, não no site', so.length) + ab('site', 'No site, não no fiscal', ss.length) + '</div><div id="escfisModalTab"></div>';
    modalTab();
  }
  function modalLinhas(aba) {
    if (aba === 'fisc') return ST.fisc.filter(f => !f.par).map(f => { const cl = classCfop(f.cfop); return { sit: 'so_fiscal', es: f.es, data: f.data, numero: f.numero, doc: f.doc, nome: f.nome, cfop: f.cfop, op: cl ? cl.op : '', vs: null, vf: f.valor, obs: '', ref: f }; });
    return ST.site.filter(s => !s.par).map(s => ({ sit: 'nao_fiscal', es: s.es, data: s.data, numero: s.numero, doc: s.doc, nome: s.nome, cfop: '', op: s.op, vs: s.valor, vf: null, obs: s.tipo.toUpperCase() + (s.natureza_operacao ? ' · ' + s.natureza_operacao : ''), ref: s }));
  }
  function modalTab() {
    const el = document.getElementById('escfisModalTab'); if (!el) return;
    const aba = ST.mAba, f = ST.mf[aba] = ST.mf[aba] || {}, cb = 'EscFis.mFiltro', V = filtrar(modalLinhas(aba), f);
    if (aba === 'fisc') {
      el.innerHTML = '<div style="font-size:12px;color:var(--slate);margin-bottom:6px">Notas que estão no livro fiscal mas <b>não foram encontradas no site</b> (falta importar o XML no site, ou a nota está com outro número/CNPJ).</div>'
        + '<div style="overflow-x:auto"><table class="tbl" style="width:100%;font-size:12px"><thead><tr><th>E/S</th><th>Data emissão</th><th>Número</th><th>CNPJ/CPF</th><th>Destinatário / Remetente</th><th>CFOP</th><th>Operação</th><th style="text-align:right">Valor</th></tr><tr>'
        + thS('es', [['E', 'Entrada'], ['S', 'Saída']], f, cb) + thF('data', 'data', f, cb) + thF('numero', 'número', f, cb) + thF('doc', 'CNPJ/CPF', f, cb) + thF('nome', 'nome', f, cb) + thF('cfop', 'CFOP', f, cb) + thS('op', Object.entries(OPS), f, cb) + thF('vf', 'valor', f, cb) + '</tr></thead><tbody>'
        + (V.length ? V.map(l => '<tr><td>' + (l.es === 'E' ? 'Entrada' : 'Saída') + '</td><td>' + br(l.data) + '</td><td>' + E(l.numero) + '</td><td style="font-family:var(--mono);font-size:11px">' + E(fmtDoc(l.doc)) + '</td><td>' + E(l.nome) + '</td><td>' + E(fmtCfop(l.cfop)) + '</td><td>' + E(OPS[l.op] || '') + '</td><td style="text-align:right">' + F(l.vf) + '</td></tr>').join('') : '<tr><td colspan="8" style="padding:12px;color:var(--slate)">Nenhuma nota.</td></tr>')
        + '</tbody><tfoot><tr style="font-weight:700"><td colspan="7">' + V.length + ' nota(s)</td><td style="text-align:right">' + F(V.reduce((s, l) => s + l.vf, 0)) + '</td></tr></tfoot></table></div>';
      return;
    }
    const cf = cfg(), optDet = es => '<option value="">— não lançar —</option>' + OPS_TXT.filter(o => es === 'E' ? ['compra_mercadoria', 'compra_uso_consumo', 'servico_tomado', 'dev_venda'].includes(o[0]) : ['venda', 'servico_prestado', 'dev_compra_mercadoria', 'dev_compra_uso_consumo'].includes(o[0])).map(o => '<option value="' + o[0] + '">' + E(o[1]) + '</option>').join('');
    const sel = V.filter(l => ST.mSel[l.ref.id] && ST.mDet[l.ref.id]);
    const semConta = [...new Set(sel.map(l => ST.mDet[l.ref.id]).filter(d => { const c = cf.contas[d] || {}; return !c.deb || !c.cred; }))];
    el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--slate);margin-bottom:6px"><span>Notas que estão no site mas <b>não estão no livro fiscal</b>. Escolha a operação de cada uma e gere o TXT de lançamentos (contas da ⚙️).</span>'
      + '<span style="margin-left:auto;display:flex;gap:6px"><button class="btn bo bsm" onclick="EscFis.config()">⚙️ Contas</button><button class="btn bp bsm" onclick="EscFis.txt()">📄 Gerar TXT (' + sel.length + ')</button></span></div>'
      + (semConta.length ? '<div style="font-size:12px;color:var(--red);margin-bottom:6px">⚠ Falta conta na ⚙️ para: ' + semConta.map(d => E(OPT[d][1])).join(', ') + '</div>' : '')
      + '<div style="overflow-x:auto"><table class="tbl" style="width:100%;font-size:12px"><thead><tr><th><input type="checkbox" title="Marcar/desmarcar todas as filtradas" onchange="EscFis.mTodas(this.checked)"></th><th>E/S</th><th>Data emissão</th><th>Número</th><th>CNPJ/CPF</th><th>Destinatário / Remetente</th><th>Operação</th><th>Lançar como (TXT)</th><th style="text-align:right">Valor</th><th>Tipo · natureza</th></tr><tr><th></th>'
      + thS('es', [['E', 'Entrada'], ['S', 'Saída']], f, cb) + thF('data', 'data', f, cb) + thF('numero', 'número', f, cb) + thF('doc', 'CNPJ/CPF', f, cb) + thF('nome', 'nome', f, cb) + thS('op', Object.entries(OPS), f, cb) + '<th></th>' + thF('vs', 'valor', f, cb) + thF('obs', 'tipo/natureza', f, cb) + '</tr></thead><tbody>'
      + (V.length ? V.map(l => { const id = l.ref.id; return '<tr><td><input type="checkbox"' + (ST.mSel[id] ? ' checked' : '') + ' onchange="EscFis.mMarca(' + id + ',this.checked)"></td><td>' + (l.es === 'E' ? 'Entrada' : 'Saída') + '</td><td>' + br(l.data) + '</td><td>' + E(l.numero) + '</td><td style="font-family:var(--mono);font-size:11px">' + E(fmtDoc(l.doc)) + '</td><td>' + E(l.nome) + '</td><td>' + E(OPS[l.op] || '') + '</td><td><select class="si" style="font-size:11px;max-width:230px" onchange="EscFis.mDet(' + id + ',this.value)">' + optDet(l.es).replace('value="' + (ST.mDet[id] || '') + '"', 'value="' + (ST.mDet[id] || '') + '" selected') + '</select></td><td style="text-align:right">' + F(l.vs) + '</td><td style="font-size:11px;color:var(--slate)">' + E(l.obs) + '</td></tr>'; }).join('') : '<tr><td colspan="10" style="padding:12px;color:var(--slate)">Nenhuma nota.</td></tr>')
      + '</tbody><tfoot><tr style="font-weight:700"><td colspan="8">' + V.length + ' nota(s) · ' + sel.length + ' marcada(s) para o TXT</td><td style="text-align:right">' + F(V.reduce((s, l) => s + l.vs, 0)) + '</td><td></td></tr></tfoot></table></div>';
  }
  let _tmM = null;
  function mFiltro(k, v) { (ST.mf[ST.mAba] = ST.mf[ST.mAba] || {})[k] = v; clearTimeout(_tmM); _tmM = setTimeout(modalTab, 200); }
  async function mMes(n) { const ym = somaMes(ST.ym, n); ST.ym = ym; ST.ok = false; await render(); await diferencas(); }
  function mTodas(v) { filtrar(modalLinhas('site'), ST.mf.site || {}).forEach(l => { ST.mSel[l.ref.id] = v && !!ST.mDet[l.ref.id]; }); modalTab(); }

  // ── TXT padrão (Mister Contador) das notas do site que não estão no fiscal ──
  async function txt() {
    const cf = cfg(), V = filtrar(modalLinhas('site'), ST.mf.site || {}).filter(l => ST.mSel[l.ref.id] && ST.mDet[l.ref.id]);
    if (!V.length) { toast('Marque ao menos uma nota com a operação escolhida.', 'err'); return; }
    const falta = [...new Set(V.map(l => ST.mDet[l.ref.id]).filter(d => { const c = cf.contas[d] || {}; return !c.deb || !c.cred; }))];
    if (falta.length) { toast('Falta a conta débito/crédito na ⚙️ para: ' + falta.map(d => OPT[d][1]).join(', '), 'err'); config(); return; }
    const linhas = V.map(l => { const d = ST.mDet[l.ref.id], c = cf.contas[d]; return { data: br(l.data), debito: c.deb, credito: c.cred, valor: l.vs, historico: (OPT[d][3] + ' ' + l.numero + (l.nome ? ' - ' + l.nome : '')).slice(0, 200) }; });
    let empNome = ST.eid; try { const e = S.emps().find(x => String(x.eid) === ST.eid); empNome = (e && e.nome) || ST.eid; } catch (e) { }
    const nome = 'Escrita_Fiscal_' + String(empNome).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) + '_' + ST.ym + '.txt';
    const naPasta = await baixarTxtMisterContador(cnpjEmp(ST.eid), linhas, nome);
    toast('TXT gerado: ' + linhas.length + ' lançamento(s), total R$ ' + F(linhas.reduce((s, l) => s + l.valor, 0)) + (naPasta ? '. Salvo na sua pasta de downloads automáticos.' : '. Baixado pelo navegador.'), 'ok');
  }

  // ── engrenagem: contas por operação ──
  function config() {
    const cf = cfg(); let ov = document.getElementById('escfisCfg'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'escfisCfg';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99995;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:12px;width:min(760px,100%);max-height:92vh;overflow:auto;padding:16px 18px;box-shadow:var(--shadow-md)">'
      + '<div style="font-weight:700;font-size:15px;color:' + OURO + ';margin-bottom:4px">⚙️ Escrita Fiscal — contas desta empresa</div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px">Contas (código reduzido) usadas SEMPRE no TXT de cada operação desta empresa. Remessas não geram lançamento.</div>'
      + '<table class="tbl" style="width:100%;font-size:12.5px"><thead><tr><th>Operação</th><th>Conta débito</th><th>Conta crédito</th></tr></thead><tbody>'
      + OPS_TXT.map(o => { const c = cf.contas[o[0]] || {}; return '<tr><td>' + E(o[1]) + '</td><td><input class="fi" data-op="' + o[0] + '" data-l="deb" value="' + E(c.deb || '') + '" inputmode="numeric" style="width:110px;padding:4px 6px"></td><td><input class="fi" data-op="' + o[0] + '" data-l="cred" value="' + E(c.cred || '') + '" inputmode="numeric" style="width:110px;padding:4px 6px"></td></tr>'; }).join('')
      + '</tbody></table>'
      + '<div style="margin-top:12px;font-size:12.5px"><b>Compras que só estão no site (sem CFOP)</b> entram como: <label><input type="radio" name="escfisCp" value="mercadoria"' + (cf.compraPadrao !== 'uso' ? ' checked' : '') + '> mercadoria para revenda (estoque)</label> <label style="margin-left:8px"><input type="radio" name="escfisCp" value="uso"' + (cf.compraPadrao === 'uso' ? ' checked' : '') + '> uso e consumo</label>'
      + '<div style="font-size:11px;color:var(--slate)">Nota com "uso e consumo", "ativo" ou "imobilizado" na natureza da operação vai sempre para uso e consumo. Dá para trocar nota a nota na janela de diferenças.</div></div>'
      + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn bo" onclick="document.getElementById(\'escfisCfg\').remove()">Cancelar</button><button class="btn bp" onclick="EscFis.salvarConfig()">Salvar</button></div></div>';
    document.body.appendChild(ov);
  }
  function salvarConfig() {
    const ov = document.getElementById('escfisCfg'); if (!ov) return; const cf = cfg(); let erro = '';
    ov.querySelectorAll('input[data-op]').forEach(i => { const v = i.value.trim(); if (v && !/^\d+$/.test(v)) erro = 'As contas devem ser só números (código reduzido).'; cf.contas[i.dataset.op] = cf.contas[i.dataset.op] || {}; cf.contas[i.dataset.op][i.dataset.l] = v; });
    if (erro) { toast(erro, 'err'); return; }
    const cp = ov.querySelector('input[name="escfisCp"]:checked'); const mudouCp = cp && cp.value !== cf.compraPadrao; if (cp) cf.compraPadrao = cp.value;
    S.s(kCfg(ST.eid), cf); ov.remove(); toast('Contas da Escrita Fiscal salvas.', 'ok');
    if (mudouCp) { ST.ok = false; render(); } else if (document.getElementById('escfisModalTab')) modalTab();
  }

  // ── importação do livro fiscal ──
  function importar() {
    let ov = document.getElementById('escfisImp'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'escfisImp';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99995;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:12px;width:min(520px,100%);padding:16px 18px;box-shadow:var(--shadow-md)">'
      + '<div style="font-weight:700;font-size:15px;color:' + OURO + ';margin-bottom:8px">📥 Importar livro fiscal</div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px">Aceita SPED EFD (.txt), planilha (.xlsx, .xls, .csv) ou PDF do livro de Entradas/Saídas. As notas entram no mês da data de emissão; o livro já importado desses meses (mesmo tipo) é substituído.</div>'
      + '<div style="font-size:12.5px;margin-bottom:10px"><b>Este arquivo é:</b><br><label><input type="radio" name="escfisTipo" value="" checked> descobrir pelo CFOP</label> <label style="margin-left:8px"><input type="radio" name="escfisTipo" value="E"> livro de Entradas</label> <label style="margin-left:8px"><input type="radio" name="escfisTipo" value="S"> livro de Saídas</label></div>'
      + '<input type="file" id="escfisArq" multiple accept=".txt,.csv,.xlsx,.xls,.pdf" class="fi" style="width:100%">'
      + '<div id="escfisImpMsg" style="font-size:12px;margin-top:8px"></div>'
      + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn bo" onclick="document.getElementById(\'escfisImp\').remove()">Cancelar</button><button class="btn bp" onclick="EscFis.processar()">Importar</button></div></div>';
    document.body.appendChild(ov);
  }
  async function processar() {
    const ov = document.getElementById('escfisImp'), arqs = [...(document.getElementById('escfisArq').files || [])], msg = document.getElementById('escfisImpMsg');
    const tipo = (ov.querySelector('input[name="escfisTipo"]:checked') || {}).value || '';
    if (!arqs.length) { toast('Escolha o arquivo do livro fiscal.', 'err'); return; }
    let rows = [], avisos = [];
    for (const f of arqs) {
      msg.textContent = 'Lendo ' + f.name + '…';
      try { const r = await lerArquivo(f, tipo); r.rows.forEach(x => { x.arq = f.name; }); rows = rows.concat(r.rows); if (r.aviso) avisos.push(f.name + ': ' + r.aviso); }
      catch (e) { avisos.push(f.name + ': ' + e.message); }
    }
    rows = agrupar(rows.filter(r => r.data && r.es && (r.numero || r.valor)));
    if (!rows.length) { msg.innerHTML = '<span style="color:var(--red)">Nenhuma nota reconhecida.' + (avisos.length ? '<br>' + avisos.map(E).join('<br>') : '') + '</span><br><span style="color:var(--slate)">Me mande este modelo para eu ajustar a leitura.</span>'; return; }
    const grupos = {}; rows.forEach(r => { const k = r.data.slice(0, 7) + '|' + r.es; (grupos[k] = grupos[k] || []).push(r); });
    const ks = Object.keys(grupos).sort(), ja = ks.filter(k => { const [ym, es] = k.split('|'); const v = sOk(kMes(ST.eid, ym, es)); return v && v.rows && v.rows.length; });
    const desc = ks.map(k => { const [ym, es] = k.split('|'); return (es === 'E' ? 'Entradas' : 'Saídas') + ' ' + ym.slice(5) + '/' + ym.slice(0, 4) + ': ' + grupos[k].length + ' nota(s), R$ ' + F(grupos[k].reduce((s, r) => s + r.valor, 0)); }).join('\n');
    if (!confirm('Livro fiscal lido:\n\n' + desc + (ja.length ? '\n\nJá existe livro importado em ' + ja.map(k => k.replace('|E', ' (entradas)').replace('|S', ' (saídas)')).join(', ') + ' — será SUBSTITUÍDO.' : '') + (avisos.length ? '\n\nAvisos:\n' + avisos.join('\n') : '') + '\n\nGravar?')) return;
    const nomeArq = arqs.map(f => f.name).join(', ').slice(0, 120), hoje = new Date().toISOString().slice(0, 10);
    ks.forEach(k => { const [ym, es] = k.split('|'); S.s(kMes(ST.eid, ym, es), { rows: grupos[k].map(r => ({ es: r.es, data: r.data, numero: r.numero, serie: r.serie || '', doc: r.doc || '', nome: r.nome || '', cfop: r.cfop || '', valor: R2(r.valor) })), arquivo: nomeArq, em: hoje }); });
    ov.remove(); toast('Livro fiscal importado: ' + rows.length + ' nota(s) em ' + [...new Set(ks.map(k => k.split('|')[0]))].length + ' mês(es).', 'ok');
    const primeiro = ks[0].split('|')[0]; if (!ks.some(k => k.startsWith(ST.ym))) ST.ym = primeiro; ST.ok = false; render();
  }
  // várias linhas da mesma nota (uma por CFOP/alíquota) → 1 nota com a soma; CFOP = o de maior valor
  function agrupar(rows) {
    const m = new Map();
    rows.forEach(r => { const k = r.es + '|' + (r.numero || '?' + r.data + r.valor) + '|' + (r.serie || '') + '|' + (r.doc || ''); const g = m.get(k); if (!g) { m.set(k, Object.assign({ _cf: { [r.cfop || '']: r.valor } }, r)); return; } g.valor = R2(g.valor + r.valor); g._cf[r.cfop || ''] = (g._cf[r.cfop || ''] || 0) + r.valor; if (!g.nome && r.nome) g.nome = r.nome; if (!g.doc && r.doc) g.doc = r.doc; });
    return [...m.values()].map(g => { const cf = Object.entries(g._cf).sort((a, b) => b[1] - a[1])[0]; g.cfop = cf ? cf[0] : g.cfop; delete g._cf; return g; });
  }
  const isoDe = v => {
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
    const s = String(v || '').trim(); let x = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (x) return x[3] + '-' + x[2] + '-' + x[1];
    x = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (x) return x[0]; x = s.match(/^(\d{2})(\d{2})(\d{4})$/); if (x) return x[3] + '-' + x[2] + '-' + x[1]; return '';
  };
  const esDe = (cfop, tipo) => { const c = dig(cfop); if (c.length === 4) return +c[0] <= 3 ? 'E' : 'S'; return tipo || ''; };
  async function lerArquivo(f, tipo) {
    const nome = f.name.toLowerCase();
    if (nome.endsWith('.pdf')) return lerPdf(await f.arrayBuffer(), tipo);
    if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); let out = { rows: [] }; wb.SheetNames.forEach(sn => { const r = lerTabela(XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }), tipo); out.rows = out.rows.concat(r.rows); if (r.aviso && !out.rows.length) out.aviso = r.aviso; }); return out; }
    let txt = await f.text(); if (txt.includes('�')) { try { txt = new TextDecoder('windows-1252').decode(await f.arrayBuffer()); } catch (e) { } }
    if (/^\|0000\|/m.test(txt.slice(0, 2000))) return lerSped(txt);
    const sep = (txt.split('\n')[0].match(/;/g) || []).length >= 2 ? ';' : (txt.split('\n')[0].match(/\t/g) || []).length >= 2 ? '\t' : ',';
    return lerTabela(txt.split(/\r?\n/).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, ''))), tipo);
  }
  // SPED EFD ICMS/IPI (C100 + C190, D100 + D190) e EFD Contribuições (A100 serviços), participantes pelo 0150
  function lerSped(txt) {
    const part = {}, rows = []; let cur = null;
    const fim = () => { if (cur) { if (!cur.cfop && cur._cfs.length) cur.cfop = cur._cfs.sort((a, b) => b[1] - a[1])[0][0]; delete cur._cfs; rows.push(cur); cur = null; } };
    txt.split(/\r?\n/).forEach(l => {
      const c = l.split('|'); const reg = c[1];
      if (reg === '0150') part[c[2]] = { nome: c[3], doc: dig(c[5]) || dig(c[6]) };
      else if (reg === 'C100' || reg === 'D100' || reg === 'A100') {
        fim(); const ent = c[2] === '0';
        let o;
        if (reg === 'C100') o = { sit: c[6], serie: c[7], numero: numNf(c[8]), data: isoDe(c[10]), valor: num(c[12]), part: c[4] };
        else if (reg === 'D100') o = { sit: c[6], serie: c[7], numero: numNf(c[9]), data: isoDe(c[11]), valor: num(c[15]), part: c[4] };
        else o = { sit: c[5], serie: c[6], numero: numNf(c[8]), data: isoDe(c[10]), valor: num(c[12]), part: c[4], cfop: ent ? '1933' : '5933' };
        if (['02', '03', '04', '05'].includes(o.sit)) return; // cancelada / denegada / inutilizada
        const p = part[o.part] || {};
        cur = { es: ent ? 'E' : 'S', data: o.data, numero: o.numero, serie: o.serie || '', doc: p.doc || '', nome: p.nome || '', cfop: o.cfop || '', valor: o.valor, _cfs: [] };
      } else if ((reg === 'C190' || reg === 'D190') && cur) cur._cfs.push([dig(c[3]), num(c[5])]);
    });
    fim();
    // 0150 pode vir depois? (não pelo leiaute, mas garante) — completa nome/doc pelo código
    return { rows };
  }
  // planilha/CSV: acha a linha de cabeçalho e as colunas sozinho
  function lerTabela(aoa, tipo) {
    const H = h => nrm(h).toLowerCase();
    const acha = (cab, testes) => { for (const t of testes) { const i = cab.findIndex(h => t(H(h))); if (i >= 0) return i; } return -1; };
    for (let li = 0; li < Math.min(40, aoa.length); li++) {
      const cab = (aoa[li] || []).map(x => String(x == null ? '' : x));
      const ix = {
        data: acha(cab, [h => /emiss/.test(h), h => /data (do )?doc|dt\.? ?doc/.test(h), h => /^data$|^dt$/.test(h), h => /^data/.test(h)]),
        numero: acha(cab, [h => /^(n[o°º.]?|num(ero)?|nota|nf|n\. ?doc|num\.? ?doc|numero (da )?nota|numero do documento|documento|doc)$/.test(h.replace(/[º°]/g, 'o')), h => /^n(umero|o|º)?\.? ?(doc|nf|nota)/.test(h)]),
        serie: acha(cab, [h => /^serie/.test(h)]),
        doc: acha(cab, [h => /cnpj|cpf/.test(h)]),
        nome: acha(cab, [h => /razao|fornecedor|cliente|remetente|destinatario|participante|emitente/.test(h), h => /^nome/.test(h)]),
        cfop: acha(cab, [h => /cfop/.test(h)]),
        valor: acha(cab, [h => /valor contabil|vl\.? ?contabil/.test(h), h => /valor total|vl\.? ?total|valor (do )?doc|vl\.? ?doc/.test(h), h => /^total$/.test(h), h => /^valor$/.test(h)]),
      };
      if (ix.data < 0 || ix.valor < 0 || (ix.numero < 0 && ix.doc < 0)) continue;
      const rows = [];
      for (let k = li + 1; k < aoa.length; k++) {
        const r = aoa[k] || []; const data = isoDe(r[ix.data]); if (!data) continue;
        const cfop = ix.cfop >= 0 ? dig(r[ix.cfop]) : '', es = esDe(cfop, tipo);
        rows.push({ es, data, numero: ix.numero >= 0 ? numNf(r[ix.numero]) : '', serie: ix.serie >= 0 ? String(r[ix.serie] || '') : '', doc: ix.doc >= 0 ? dig(r[ix.doc]) : '', nome: ix.nome >= 0 ? String(r[ix.nome] || '').trim() : '', cfop, valor: num(r[ix.valor]) });
      }
      const semEs = rows.filter(r => !r.es).length;
      return { rows, aviso: semEs ? semEs + ' linha(s) sem CFOP: escolha "livro de Entradas" ou "Saídas" ao importar' : '' };
    }
    return { rows: [], aviso: 'não achei o cabeçalho (preciso de colunas de data, número ou CNPJ/CPF e valor)' };
  }
  // PDF: leitura GENÉRICA por linha (data + número + CNPJ/CPF + CFOP + valor). Ajustar ao modelo do sistema fiscal quando o usuário mandar.
  async function lerPdf(buf, tipo) {
    if (typeof pdfjsLib === 'undefined') throw new Error('leitor de PDF não carregado');
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise, rows = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const pg = await pdf.getPage(p), tc = await pg.getTextContent(), linhas = new Map();
      tc.items.forEach(it => { const y = Math.round(it.transform[5] / 3) * 3; if (!linhas.has(y)) linhas.set(y, []); linhas.get(y).push({ x: it.transform[4], s: it.str }); });
      [...linhas.entries()].sort((a, b) => b[0] - a[0]).forEach(([, its]) => {
        const toks = its.sort((a, b) => a.x - b.x).map(i => i.s.trim()).filter(Boolean), t = toks.join(' ');
        const datas = [...t.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)].map(x => x[1]); if (!datas.length) return;
        const money = t.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/); if (!money) return;
        const cfopM = t.match(/\b([1-3]|[5-7])\.(\d{3})\b/), cfop = cfopM ? cfopM[1] + cfopM[2] : '';
        const docM = t.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
        const dataUsada = datas.length > 1 ? datas[1] : datas[0], pos = t.indexOf(dataUsada);
        const antes = t.slice(0, pos).match(/\b\d{1,9}\b/g), depois = t.slice(pos + 10).match(/\b\d{1,9}\b/);
        const numero = numNf((antes && antes[antes.length - 1]) || (depois && depois[0]) || '');
        let nome = ''; if (docM) { const dps = t.slice(t.indexOf(docM[0]) + docM[0].length).match(/^\s*([A-Za-zÀ-ÿ][^\d]{2,60})/); if (dps) nome = dps[1].trim(); }
        const es = esDe(cfop, tipo); rows.push({ es, data: isoDe(dataUsada), numero, serie: '', doc: docM ? dig(docM[0]) : '', nome, cfop, valor: num(money[0]) });
      });
    }
    return { rows, aviso: 'PDF lido pelo modo genérico — confira os valores; mande o modelo para ajustar a leitura.' + (rows.some(r => !r.es) ? ' Linhas sem CFOP: escolha Entradas ou Saídas.' : '') };
  }

  // ── Excel (todas as linhas filtradas, não só a tela) ──
  function planilha(L, nomeAba, titulo) {
    const cab = ['Situação', 'E/S', 'Data emissão', 'Número', 'CNPJ/CPF', 'Destinatário / Remetente', 'CFOP', 'Operação', 'Valor no site', 'Valor no fiscal', 'Observação'];
    const aoa = [['JJR CONSULTORIA CONTÁBIL'], [titulo], [], cab].concat(L.map(l => [SIT[l.sit], l.es === 'E' ? 'Entrada' : 'Saída', br(l.data), l.numero, fmtDoc(l.doc), l.nome, fmtCfop(l.cfop), OPS[l.op] || '', l.vs == null ? '' : l.vs, l.vf == null ? '' : l.vf, l.obs]));
    const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 26 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 40 }, { wch: 7 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 40 }];
    return [ws, nomeAba];
  }
  function salvarXlsx(abas, arq) { const wb = XLSX.utils.book_new(); abas.forEach(([ws, n]) => XLSX.utils.book_append_sheet(wb, ws, n)); XLSX.writeFile(wb, arq); }
  function empNome() { try { const e = S.emps().find(x => String(x.eid) === ST.eid); return (e && e.nome) || ST.eid; } catch (e) { return ST.eid; } }
  function excel() {
    if (typeof XLSX === 'undefined') { toast('Biblioteca XLSX não carregada', 'err'); return; }
    const [a, m] = ST.ym.split('-').map(Number), L = filtrar(linhasTela(), ST.f);
    salvarXlsx([planilha(L, 'Escrita Fiscal', '#' + ST.eid + ' ' + empNome() + ' — Escrita Fiscal ' + MESES_L[m - 1] + '/' + a)], 'Escrita_Fiscal_' + ST.eid + '_' + ST.ym + '.xlsx');
  }
  function excelModal() {
    if (typeof XLSX === 'undefined') { toast('Biblioteca XLSX não carregada', 'err'); return; }
    const [a, m] = ST.ym.split('-').map(Number), t = '#' + ST.eid + ' ' + empNome() + ' — ' + MESES_L[m - 1] + '/' + a;
    salvarXlsx([planilha(filtrar(modalLinhas('fisc'), ST.mf.fisc || {}), 'No fiscal, nao no site', t + ' — no fiscal, não no site'), planilha(filtrar(modalLinhas('site'), ST.mf.site || {}), 'No site, nao no fiscal', t + ' — no site, não no fiscal')], 'Escrita_Fiscal_Diferencas_' + ST.eid + '_' + ST.ym + '.xlsx');
  }

  root.EscFis = {
    render: () => render(typeof _lancctbEidAtual !== 'undefined' ? _lancctbEidAtual : ST.eid), importar, processar, config, salvarConfig, diferencas, excel, excelModal, txt, apagarMes,
    irMes, mes, filtro, mFiltro, mMes, mTodas,
    mAba: k => { ST.mAba = k; modal(); }, mMarca: (id, v) => { ST.mSel[id] = v; modalTab(); }, mDet: (id, v) => { ST.mDet[id] = v; if (!v) ST.mSel[id] = false; else ST.mSel[id] = true; modalTab(); },
    _t: { classCfop, classSite, confrontar, lerSped, lerTabela, agrupar, isoDe },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.EscFis;
})(typeof window !== 'undefined' ? window : globalThis);

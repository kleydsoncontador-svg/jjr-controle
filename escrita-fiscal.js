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
  const fmtCfop = c => String(c || '').split('/').map(x => x.length === 4 ? x[0] + '.' + x.slice(1) : x).join(' / ');
  const sOk = k => { try { const x = S.g(k); if (typeof x === 'string') { try { return JSON.parse(x); } catch (e) { return null; } } return x; } catch (e) { return null; } };
  // livros: E = Entradas (compras, devoluções de venda, serviços tomados), S = Saídas, V = Serviços (prestados). Só os DADOS lidos ficam guardados — o PDF nunca.
  const LIVROS = ['E', 'S', 'V'], LIVRO_NOME = { E: 'Entradas', S: 'Saídas', V: 'Serviços' };
  const kCfg = eid => 'escfis_cfg_' + eid, kMes = (eid, ym, lv) => 'escfis_' + eid + '_' + ym + '_' + lv, kRes = (eid, ym) => 'escfis_res_' + eid + '_' + ym;
  function cfg(eid) { const v = sOk(kCfg(eid || ST.eid)) || {}; v.contas = v.contas || {}; v.compraPadrao = v.compraPadrao || 'mercadoria'; return v; }
  // linhas guardadas compactas: [data, numero, serie, doc, nome, cfop, valor]
  const pack = r => [r.data, r.numero || '', r.serie || '', r.doc || '', r.nome || '', r.cfop || '', R2(r.valor)];
  const unpack = (a, lv) => Array.isArray(a) ? { livro: lv, es: lv === 'E' ? 'E' : 'S', data: a[0], numero: a[1], serie: a[2], doc: a[3], nome: a[4], cfop: a[5], valor: a[6] } : Object.assign({ livro: lv }, a);
  function lerLivro(eid, ym) { return LIVROS.reduce((acc, lv) => { const v = sOk(kMes(eid, ym, lv)); return acc.concat(((v && v.rows) || []).map(a => unpack(a, lv))); }, []); }
  function infoLivro(eid, ym) { return LIVROS.map(lv => { const v = sOk(kMes(eid, ym, lv)); return v && v.rows && v.rows.length ? { lv, n: v.rows.length, arq: v.arquivo || '', em: v.em || '' } : null; }).filter(Boolean); }
  function gravarLivro(eid, ym, lv, rows, meta) { S.s(kMes(eid, ym, lv), Object.assign({ rows: rows.map(pack), em: new Date().toISOString().slice(0, 10) }, meta || {})); S.s(kRes(eid, ym), { soFiscal: null, soSite: null, em: '' }); }
  function apagarLivro(eid, ym, lv) { if (sOk(kMes(eid, ym, lv))) S.s(kMes(eid, ym, lv), { rows: [], arquivo: '', em: '' }); }
  // operação de uma linha do livro: pelo CFOP; livro de Serviços (sem CFOP) = serviço prestado
  function opFisc(f) { const cl = classCfop(f.cfop); if (cl) return cl; if (f.livro === 'V') return { es: 'S', op: 'servico', det: 'servico_prestado' }; return { es: f.es, op: f.es === 'E' ? 'compra' : 'venda', det: null }; }
  function somaMes(ym, n) { const [a, m] = ym.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function cnpjEmp(eid) { try { const e = S.emps().find(x => String(x.eid) === String(eid)); return dig(e && (e.cnpjNum || e.cnpj)); } catch (e) { return ''; } }

  // ── classificação ──
  // CFOP do livro → operação simplificada + operação contábil do TXT (det). 1/2/3 = entrada, 5/6/7 = saída.
  function classCfop(c0) {
    const c = dig(String(c0 || '').split('/')[0]); if (c.length !== 4) return null;
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
    // por índice (MD2 tem ~4 mil notas/mês). Lado (entrada/saída) só desempata: nota de ENTRADA emitida pela própria empresa
    // (retorno/devolução, série própria) fica no site como "saída" porque o emitente é a empresa — número + CNPJ/valor bastam.
    const porNum = new Map(), porDoc = new Map();
    fisc.forEach(f => { if (f.numero) (porNum.get(f.numero) || porNum.set(f.numero, []).get(f.numero)).push(f); if (f.doc) { const k = f.doc.length === 14 ? f.doc.slice(0, 8) : f.doc; (porDoc.get(k) || porDoc.set(k, []).get(k)).push(f); } });
    const tentar = (cands, ok) => site.forEach(s => { if (s.par) return; let best = null, bd = 1e9; (cands(s) || []).forEach(f => { if (f.par || !ok(s, f)) return; const d = Math.abs(f.valor - s.valor) + (f.es === s.es ? 0 : 0.001) + (f.data === s.data ? 0 : 0.0001); if (d < bd) { bd = d; best = f; } }); if (best) { s.par = best; best.par = s; } });
    const cNum = s => porNum.get(s.numero), cDoc = s => s.doc ? porDoc.get(s.doc.length === 14 ? s.doc.slice(0, 8) : s.doc) : null;
    const mesmoDoc = (a, b) => a && b && (a === b || (a.length === 14 && b.length === 14 && a.slice(0, 8) === b.slice(0, 8)));
    const valOk = (a, b) => Math.abs(a - b) <= 0.05;
    tentar(cNum, (s, f) => s.numero && mesmoDoc(s.doc, f.doc));
    tentar(cNum, (s, f) => s.numero && valOk(s.valor, f.valor) && (!s.doc || !f.doc || mesmoDoc(s.doc, f.doc)));
    tentar(cDoc, (s, f) => f.es === s.es && valOk(s.valor, f.valor) && s.data === f.data);
  }
  // 26/11/2026 (pedido do usuário): a lista principal são as NOTAS DO LIVRO FISCAL (uma por nota, já consolidada quando o Domínio
  // abre a nota em 2+ linhas de CFOP), com o valor no fiscal e, ao lado, o valor da mesma nota no site. As notas que só existem no site
  // ficam na janela de Diferenças (aba "No site, não no fiscal", com o TXT).
  function linhasTela() {
    return ST.fisc.map(f => {
      const s = f.par, obs = [];
      if (s && Math.abs(f.valor - s.valor) > 0.05) obs.push('diferença de R$ ' + F(R2(f.valor - s.valor)));
      if (s && s.data && f.data !== s.data) obs.push('data no site ' + br(s.data)); if (s && f.numero !== s.numero) obs.push('nº no site ' + s.numero);
      if (s) obs.push('no site: ' + ({ nfe: 'NF-e', nfse: 'NFS-e', nfce: 'NFC-e', cte: 'CT-e' }[s.tipo] || s.tipo) + ' ' + (s.es === 'E' ? 'entrada' : 'saída'));
      return { sit: s ? (Math.abs(f.valor - s.valor) > 0.05 ? 'valor_dif' : 'site') : (opFisc(f).op === 'remessa' ? 'remessa' : 'nao_site'), es: f.es, data: f.data, numero: f.numero, doc: f.doc || (s && s.doc) || '', nome: f.nome || (s && s.nome) || '', cfop: f.cfop, op: opFisc(f).op, vf: f.valor, vs: s ? s.valor : null, obs: obs.join(' · '), ref: f };
    }).sort((a, b) => (a.data || '').localeCompare(b.data || '') || (+a.numero || 0) - (+b.numero || 0));
  }
  const SIT = { remessa: 'Remessa (não considerada)', site: 'Está no site', valor_dif: 'No site, valor diferente', nao_site: 'Não está no site', nao_fiscal: 'Não está no fiscal', so_fiscal: 'Não está no site' };
  const SITCOR = { remessa: 'var(--slate)', site: 'var(--green)', valor_dif: 'var(--amber)', nao_site: 'var(--red)', nao_fiscal: 'var(--red)', so_fiscal: 'var(--red)' };

  // ── tela principal ──
  async function render(eid) {
    if (eid !== undefined) { if (String(eid) !== ST.eid) { ST.eid = String(eid); ST.ok = false; } }
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    const [a, m] = ST.ym.split('-').map(Number), inf = infoLivro(ST.eid, ST.ym);
    let h = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">'
      + '<b style="color:' + OURO + ';font-size:15px">📒 Escrita Fiscal</b>'
      + '<span style="font-size:12px;color:var(--slate)">confronto do livro fiscal (entradas e saídas) com as notas do site</span>'
      + '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">'
      + '<button class="btn bo bsm" onclick="EscFis.importar()" title="Anexar o livro fiscal desta empresa: PDF do Domínio, planilha Excel (.xls/.xlsx/.csv) ou SPED EFD (.txt). Só os dados ficam no site.">📎 Anexar livro (PDF ou Excel)</button>'
      + '<button class="btn bo bsm" onclick="EscFis.diferencas()" title="Janela com as notas que estão só no fiscal e só no site (com o TXT)">🔎 Diferenças de ' + MESES_L[m - 1] + '</button>'
      + '<button class="action-btn action-btn-excel" onclick="EscFis.excel()">📊 Gerar Excel</button>'
      + '<button class="btn bo bsm" onclick="EscFis.config()" title="Contas de cada operação para o TXT">⚙️</button></span></div>';
    // faixa de meses (‹ ano ›) — o selo de cada mês abre as diferenças daquele mês
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">'
      + '<button class="btn bo bsm" onclick="EscFis.mes(-1)" title="Mês anterior">‹</button>'
      + MESES.map((n, i) => {
        const ym = a + '-' + String(i + 1).padStart(2, '0'), at = ym === ST.ym, r0 = sOk(kRes(ST.eid, ym)), r = r0 && r0.soFiscal != null ? r0 : null, temLivro = !r && infoLivro(ST.eid, ym).length;
        const tot = r ? (r.soFiscal || 0) + (r.soSite || 0) : null;
        const selo = r ? '<span onclick="event.stopPropagation();EscFis.diferencas(\'' + ym + '\')" title="Abrir as diferenças de ' + MESES_L[i] + ' (só no fiscal: ' + r.soFiscal + ' · só no site: ' + r.soSite + ')" style="display:block;margin:0 auto 2px;width:max-content;font-size:10px;padding:0 6px;border-radius:8px 8px 0 0;cursor:pointer;background:' + (tot ? 'var(--red-bg)' : 'var(--green-bg)') + ';color:' + (tot ? 'var(--red)' : 'var(--green)') + '">' + (tot ? '⚠ ' + tot : '✓') + '</span>' : (temLivro ? '<span onclick="event.stopPropagation();EscFis.diferencas(\'' + ym + '\')" title="Livro fiscal importado, ainda não conferido — clique para conferir" style="display:block;margin:0 auto 2px;width:max-content;font-size:10px;padding:0 6px;border-radius:8px 8px 0 0;cursor:pointer;background:var(--gray-bg);color:var(--slate)">📒</span>' : '<span style="display:block;height:15px"></span>');
        return '<div style="text-align:center">' + selo + '<button class="btn ' + (at ? 'bp' : 'bo') + ' bsm" style="min-width:46px' + (at ? '' : ';color:' + OURO) + '" onclick="EscFis.irMes(\'' + ym + '\')">' + n + '</button></div>';
      }).join('')
      + '<button class="btn bo bsm" onclick="EscFis.mes(1)" title="Próximo mês">›</button>'
      + '<span style="margin-left:8px;font-weight:700">' + a + '</span>'
      + '<button class="btn bo bsm" onclick="EscFis.mes(-12)" title="Ano anterior">«</button><button class="btn bo bsm" onclick="EscFis.mes(12)" title="Próximo ano">»</button></div>';
    h += '<div style="font-size:12px;color:var(--slate);margin-bottom:8px">Livro fiscal de ' + MESES_L[m - 1] + '/' + a + ': '
      + (inf.length ? inf.map(i => '<b>' + LIVRO_NOME[i.lv] + '</b> ' + i.n + ' nota(s)' + (i.arq ? ' (' + E(i.arq) + ')' : '')).join(' · ') + ' <button class="btn bo bsm" style="padding:0 6px;font-size:10.5px" onclick="EscFis.excluirLivros()" title="Excluir os livros fiscais importados de um ou vários meses (as notas do site não são tocadas)">🗑 excluir livros…</button>' : '<span style="color:var(--amber)">nenhum livro importado — use 📎 Anexar livro ou o 📒 da lista de empresas</span>')
      + '</div><div id="escfisResumo" style="margin-bottom:8px;font-size:12.5px"></div><div id="escfisTab"></div>';
    el.innerHTML = h;
    if (!ST.ok || ST.okYm !== ST.ym || ST.okEid !== ST.eid) await carregar(); else corpo();
  }
  async function carregar() {
    const box = document.getElementById('escfisTab'); if (box) box.innerHTML = '<div style="padding:14px;color:var(--slate)">Carregando as notas de ' + br(ST.ym + '-01').slice(3) + '…</div>';
    const eid = ST.eid, ym = ST.ym;
    try { ST.site = await carregarSite(eid, ym); } catch (e) { if (box) box.innerHTML = '<div style="color:var(--red)">Erro ao buscar as notas do site: ' + E(e.message) + '</div>'; return; }
    if (eid !== ST.eid || ym !== ST.ym) return; // trocou de mês/empresa no meio
    ST.fisc = [somaMes(ym, -1), ym, somaMes(ym, 1)].reduce((a, m) => a.concat(lerLivro(eid, m)), []).filter(r => String(r.data || '').slice(0, 7) === ym).map(r => Object.assign({}, r));
    confrontar(ST.site, ST.fisc); ST.ok = true; ST.okYm = ym; ST.okEid = eid;
    if (ST.fisc.length) { const r = { soFiscal: pendF().length, soSite: pendS().length, em: new Date().toISOString().slice(0, 10) }; const ant = sOk(kRes(eid, ym)); if (!ant || ant.soFiscal !== r.soFiscal || ant.soSite !== r.soSite) { S.s(kRes(eid, ym), r); render(); return; } }
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
    const n = k => L.filter(l => l.sit === k).length, soSite = pendS().length;
    const rs = document.getElementById('escfisResumo');
    if (rs) rs.innerHTML = !ST.fisc.length
      ? '<span style="color:var(--amber)">Nenhum livro fiscal importado neste mês. Importe pelo botão <b>📒 Importar Livros Fiscais (PDF)</b> na lista de Lançamentos Contábeis (todas as empresas) ou pelo <b>📎 Anexar livro (PDF ou Excel)</b> aqui em cima.</span>' + (ST.site.length ? ' <span style="color:var(--slate)">(o site tem ' + ST.site.length + ' nota(s) neste mês)</span>' : '')
      : '<b>' + L.length + '</b> nota(s) no livro fiscal · <span style="color:var(--green)">está no site: <b>' + n('site') + '</b></span> · <span style="color:var(--amber)">no site com valor diferente: <b>' + n('valor_dif') + '</b></span> · <span style="color:var(--red)">não está no site: <b>' + n('nao_site') + '</b></span>'
        + (soSite ? ' · <a href="#" onclick="event.preventDefault();EscFis.diferencas()" style="color:var(--red)"><b>' + soSite + '</b> nota(s) do site não estão no fiscal → 🔎 Diferenças</a>' : '');
    if (!ST.fisc.length) { box.innerHTML = ''; return; }
    const head = '<tr><th>Situação</th><th>E/S</th><th>Data emissão</th><th>Número</th><th>CNPJ/CPF</th><th>Destinatário / Remetente</th><th>CFOP</th><th>Operação</th><th style="text-align:right">Valor no fiscal</th><th style="text-align:right">Valor no site</th><th>Observação</th></tr>'
      + '<tr>' + thS('sit', [['site', SIT.site], ['valor_dif', SIT.valor_dif], ['nao_site', SIT.nao_site], ['remessa', SIT.remessa]], f, cb) + thS('es', [['E', 'Entrada'], ['S', 'Saída']], f, cb) + thF('data', 'data', f, cb) + thF('numero', 'número', f, cb) + thF('doc', 'CNPJ/CPF', f, cb) + thF('nome', 'nome', f, cb) + thF('cfop', 'CFOP', f, cb) + thS('op', Object.entries(OPS), f, cb) + thF('vf', 'valor', f, cb) + thF('vs', 'valor', f, cb) + thF('obs', 'obs.', f, cb) + '</tr>';
    const body = V.length ? V.map(l => '<tr><td style="color:' + SITCOR[l.sit] + ';font-weight:600;white-space:nowrap">' + SIT[l.sit] + '</td><td>' + (l.es === 'E' ? 'Entrada' : 'Saída') + '</td><td>' + br(l.data) + '</td><td>' + E(l.numero) + '</td><td style="font-family:var(--mono);font-size:11px;white-space:nowrap">' + E(fmtDoc(l.doc)) + '</td><td>' + E(l.nome) + '</td><td style="white-space:nowrap">' + E(fmtCfop(l.cfop)) + '</td><td>' + E(OPS[l.op] || '') + '</td><td style="text-align:right">' + (l.vf == null ? '—' : F(l.vf)) + '</td><td style="text-align:right' + (l.sit === 'valor_dif' ? ';color:var(--amber);font-weight:700' : '') + '">' + (l.vs == null ? '—' : F(l.vs)) + '</td><td style="font-size:11px;color:var(--slate)">' + E(l.obs) + '</td></tr>').join('')
      : '<tr><td colspan="11" style="padding:14px;color:var(--slate)">Nenhuma nota com esses filtros.</td></tr>';
    const tv = V.reduce((s, l) => s + (l.vs || 0), 0), tf = V.reduce((s, l) => s + (l.vf || 0), 0);
    box.innerHTML = '<div style="overflow-x:auto"><table class="tbl" style="width:100%;font-size:12px"><thead style="position:sticky;top:0;z-index:2">' + head + '</thead><tbody>' + body + '</tbody><tfoot><tr style="font-weight:700"><td colspan="8">' + V.length + ' nota(s) filtrada(s)</td><td style="text-align:right">' + F(tf) + '</td><td style="text-align:right">' + F(tv) + '</td><td></td></tr></tfoot></table></div>';
  }
  let _tmF = null;
  function filtro(k, v) { ST.f[k] = v; clearTimeout(_tmF); _tmF = setTimeout(corpo, 200); }
  function irMes(ym) { ST.ym = ym; ST.ok = false; render(); }
  function mes(n) { irMes(somaMes(ST.ym, n)); }
  // excluir livros de um ou vários meses (só os dados do livro; as notas do site não são tocadas)
  function mesesComLivro(eid) {
    const a0 = +fechYm().slice(0, 4), out = [];
    for (let a = a0 - 3; a <= a0 + 1; a++) for (let m = 1; m <= 12; m++) { const ym = a + '-' + String(m).padStart(2, '0'); infoLivro(eid, ym).forEach(i => out.push({ ym, lv: i.lv, n: i.n, arq: i.arq })); }
    return out;
  }
  function excluirLivros() {
    const L = mesesComLivro(ST.eid); if (!L.length) { toast('Nenhum livro fiscal importado nesta empresa.', 'err'); return; }
    let ov = document.getElementById('escfisDel'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'escfisDel';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99995;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:12px;width:min(560px,100%);max-height:90vh;overflow:auto;padding:16px 18px;box-shadow:var(--shadow-md)">'
      + '<div style="font-weight:700;font-size:15px;color:' + OURO + ';margin-bottom:4px">🗑 Excluir livros fiscais importados</div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px">Marque os livros que quer apagar. Só os dados do livro fiscal são apagados — as notas do site não são tocadas e dá para importar de novo depois.</div>'
      + '<label style="font-size:12px"><input type="checkbox" onchange="document.querySelectorAll(\'#escfisDel input[data-k]\').forEach(c=>c.checked=this.checked)"> marcar todos</label>'
      + '<table class="tbl" style="width:100%;font-size:12.5px;margin-top:6px"><thead><tr><th></th><th>Mês</th><th>Livro</th><th style="text-align:right">Notas</th><th>Arquivo</th></tr></thead><tbody>'
      + L.map(x => '<tr><td><input type="checkbox" data-k="' + x.ym + '|' + x.lv + '"' + (x.ym === ST.ym ? ' checked' : '') + '></td><td>' + MESES_L[+x.ym.slice(5) - 1] + '/' + x.ym.slice(0, 4) + '</td><td>' + LIVRO_NOME[x.lv] + '</td><td style="text-align:right">' + x.n + '</td><td style="font-size:11px;color:var(--slate)">' + E(x.arq) + '</td></tr>').join('')
      + '</tbody></table><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn bo" onclick="document.getElementById(\'escfisDel\').remove()">Cancelar</button><button class="btn bo" style="color:#dc2626;border-color:#dc2626" onclick="EscFis.excluirLivrosOk()">Excluir marcados</button></div></div>';
    document.body.appendChild(ov);
  }
  function excluirLivrosOk() {
    const ks = [...document.querySelectorAll('#escfisDel input[data-k]:checked')].map(c => c.dataset.k);
    if (!ks.length) { toast('Marque ao menos um livro.', 'err'); return; }
    if (!confirm('Excluir ' + ks.length + ' livro(s) fiscal(is) importado(s)?\n\n' + ks.map(k => { const [ym, lv] = k.split('|'); return LIVRO_NOME[lv] + ' ' + ym.slice(5) + '/' + ym.slice(0, 4); }).join('\n') + '\n\nAs notas do site não são tocadas.')) return;
    const yms = new Set(); ks.forEach(k => { const [ym, lv] = k.split('|'); apagarLivro(ST.eid, ym, lv); yms.add(ym); });
    yms.forEach(ym => S.s(kRes(ST.eid, ym), { soFiscal: null, soSite: null, em: '' }));
    document.getElementById('escfisDel').remove(); toast(ks.length + ' livro(s) excluído(s).', 'ok'); ST.ok = false; render();
  }

  // ── janela de diferenças do mês (2 abas) ──
  async function diferencas(ym) {
    if (ym && ym !== ST.ym) { ST.ym = ym; ST.ok = false; await render(); }
    else if (!ST.ok) await carregar();
    if (!ST.fisc.length && !confirm('Não há livro fiscal importado em ' + MESES_L[+ST.ym.slice(5) - 1] + '/' + ST.ym.slice(0, 4) + ' — todas as notas do site vão aparecer como "não está no fiscal". Abrir mesmo assim?')) return;
    ST.mf = { fisc: {}, site: {} }; ST.mSel = {}; ST.mDet = {};
    pendS().forEach(s => { ST.mDet[s.id] = s.det || ''; ST.mSel[s.id] = !!s.det; });
    let ov = document.getElementById('escfisModal'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'escfisModal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99990;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:12px;width:min(1400px,100%);max-height:94vh;display:flex;flex-direction:column;box-shadow:var(--shadow-md)"><div id="escfisModalCorpo" style="padding:14px 16px;overflow:auto"></div></div>';
    ov.addEventListener('mousedown', e => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov); modal();
  }
  function modal() {
    const el = document.getElementById('escfisModalCorpo'); if (!el) return;
    const [a, m] = ST.ym.split('-').map(Number), so = pendF(), ss = pendS();
    const ab = (k, t, n) => '<button onclick="EscFis.mAba(\'' + k + '\')" style="padding:8px 14px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:' + (ST.mAba === k ? OURO : 'var(--slate)') + ';border-bottom:2px solid ' + (ST.mAba === k ? OURO : 'transparent') + '">' + t + ' (' + n + ')</button>';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><b style="font-size:15px;color:' + OURO + '">📒 Escrita Fiscal — ' + MESES_L[m - 1] + '/' + a + '</b>'
      + '<span style="margin-left:auto;display:flex;gap:6px"><button class="btn bo bsm" onclick="EscFis.mMes(-1)" title="Mês anterior">‹</button><button class="btn bo bsm" onclick="EscFis.mMes(1)" title="Próximo mês">›</button><button class="action-btn action-btn-excel" onclick="EscFis.excelModal()">📊 Gerar Excel</button><button class="btn bo bsm" onclick="document.getElementById(\'escfisModal\').remove()">Fechar</button></span></div>'
      + '<div style="border-bottom:1px solid var(--border);margin-bottom:10px">' + ab('fisc', 'No fiscal, não no site', so.length) + ab('site', 'No site, não no fiscal', ss.length) + '</div><div id="escfisModalTab"></div>';
    modalTab();
  }
  const pendF = () => ST.fisc.filter(f => !f.par && opFisc(f).op !== 'remessa'), pendS = () => ST.site.filter(s => !s.par && s.op !== 'remessa');
  function modalLinhas(aba) {
    if (aba === 'fisc') return pendF().map(f => { return { sit: 'so_fiscal', es: f.es, data: f.data, numero: f.numero, doc: f.doc, nome: f.nome, cfop: f.cfop, op: opFisc(f).op, vs: null, vf: f.valor, obs: '', ref: f }; });
    return pendS().map(s => ({ sit: 'nao_fiscal', es: s.es, data: s.data, numero: s.numero, doc: s.doc, nome: s.nome, cfop: '', op: s.op, vs: s.valor, vf: null, obs: s.tipo.toUpperCase() + (s.natureza_operacao ? ' · ' + s.natureza_operacao : ''), ref: s }));
  }
  function modalTab() {
    const el = document.getElementById('escfisModalTab'); if (!el) return;
    const aba = ST.mAba, f = ST.mf[aba] = ST.mf[aba] || {}, cb = 'EscFis.mFiltro', V = filtrar(modalLinhas(aba), f);
    if (aba === 'fisc') {
      el.innerHTML = '<div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:6px"><button class="btn bp bsm" onclick="EscFis.gerarNoSite()" title="Cria no site (NF-e Entrada/Saída, NFS-e, CT-e) as notas filtradas desta lista, com os dados do livro fiscal. Remessa e nota de valor zero não entram.">➕ Gerar no site (' + V.filter(l => l.vf > 0).length + ')</button></div><div style="font-size:12px;color:var(--slate);margin-bottom:6px">Notas que estão no livro fiscal mas <b>não foram encontradas no site</b> (falta importar o XML no site, ou a nota está com outro número/CNPJ).</div>'
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

  // ── "Gerar no site": cria em notas_fiscais as notas que estão no livro fiscal e não no site (sem XML: status 'metadados'),
  // com 1 parcela (vencimento = emissão), igual à importação da UneCont. Tipo pelo CFOP/livro: serviço = NFS-e, transporte = CT-e, resto = NF-e.
  async function gerarNoSite() {
    const V = filtrar(modalLinhas('fisc'), ST.mf.fisc || {}).filter(l => l.vf > 0 && l.numero);
    if (!V.length) { toast('Nenhuma nota para gerar (remessa e valor zero não entram).', 'err'); return; }
    const tot = V.reduce((s, l) => s + l.vf, 0);
    if (!confirm('Criar no site ' + V.length + ' nota(s) do livro fiscal, total R$ ' + F(tot) + '?\n\nElas entram nas abas de notas (NF-e Entrada/Saída, NFS-e, CT-e) como nota SEM XML, com os dados do livro (número, data, CNPJ, valor) e 1 parcela vencendo na emissão.')) return;
    const cnE = cnpjEmp(ST.eid); let nomeE = ''; try { const e = S.emps().find(x => String(x.eid) === ST.eid); nomeE = (e && e.nome) || ''; } catch (e) { }
    const NAT = { compra_mercadoria: 'Compra de mercadoria', compra_uso_consumo: 'Compra para uso e consumo', venda: 'Venda', dev_venda: 'Devolucao de venda', dev_compra_mercadoria: 'Devolucao de compra', dev_compra_uso_consumo: 'Devolucao de compra (uso e consumo)' };
    const regs = V.map(l => {
      const f = l.ref, cl = opFisc(f), r = +dig(String(f.cfop || '').split('/')[0]).slice(1) || 0, ent = f.es === 'E', transp = r >= 350 && r <= 360;
      const tipo = transp ? 'cte' : (f.livro === 'V' || cl.op === 'servico') ? 'nfse' : 'nfe';
      const part = { doc: f.doc || null, nome: f.nome || null }, emp = { doc: cnE || null, nome: nomeE || null };
      const em = ent ? part : emp, de = ent ? emp : part;
      return { empresa_eid: ST.eid, tipo, chave_acesso: 'ESCFIS-' + f.livro + '-' + (f.doc || 'SEMDOC') + '-' + (f.serie || '0') + '-' + f.numero + '-' + f.data, numero: f.numero, serie: f.serie || null,
        modelo: tipo === 'nfse' ? 'NFSe' : tipo === 'cte' ? '57' : '55', cnpj_emitente: em.doc, nome_emitente: em.nome, cnpj_destinatario: de.doc, nome_destinatario: de.nome,
        direcao: ent ? 'compra' : 'venda', data_emissao: f.data, valor_total: R2(f.valor), xml_storage_path: null, status_captura: 'metadados',
        natureza_operacao: tipo === 'nfe' ? (NAT[cl.det] || (ent ? 'Compra' : 'Venda')) + ' (Escrita Fiscal, CFOP ' + fmtCfop(f.cfop) + ')' : null };
    });
    let ok = 0; const erros = [];
    const SEL = 'id,chave_acesso,valor_total,data_emissao,tipo,direcao';
    for (let k = 0; k < regs.length; k += 100) {
      const lote = regs.slice(k, k + 100);
      let { data: ins, error } = await _supaClient.from('notas_fiscais').upsert(lote, { onConflict: 'empresa_eid,tipo,chave_acesso' }).select(SEL);
      if (error) { ins = []; for (const r1 of lote) { const x = await _supaClient.from('notas_fiscais').upsert([r1], { onConflict: 'empresa_eid,tipo,chave_acesso' }).select(SEL); if (x.error) erros.push('NF ' + r1.numero + ': ' + x.error.message); else ins.push(...(x.data || [])); } }
      if (!ins || !ins.length) continue;
      const parc = ins.map(n => ({ nf_id: n.id, empresa_eid: ST.eid, numero_parcela: 1, data_vencimento: n.data_emissao, valor_parcela: n.valor_total, data_emissao: n.data_emissao, tipo: n.tipo, direcao: n.direcao }));
      const { error: eP } = await _supaClient.from('notas_fiscais_parcelas').upsert(parc, { onConflict: 'nf_id,numero_parcela' });
      if (eP) erros.push('parcelas: ' + eP.message); else ok += ins.length;
    }
    toast(ok + ' nota(s) criada(s) no site.' + (erros.length ? ' ' + erros.length + ' com erro: ' + erros.slice(0, 3).join(' | ') : ''), erros.length ? 'err' : 'ok');
    ST.ok = false; await render(); await diferencas();
  }

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
  // Nome padrão dos PDFs do Domínio na pasta Relatórios Fiscal: Entradas_<eid>_<MMAAAA>.pdf, Saídas_…, Serviços_…
  function infoNome(nome) {
    const m = nrm(nome).match(/^(ENTRADAS|SAIDAS|SERVICOS)_(\d+)_(\d{2})(\d{4})\.PDF$/);
    return m ? { lv: { ENTRADAS: 'E', SAIDAS: 'S', SERVICOS: 'V' }[m[1]], eid: String(+m[2]), ym: m[4] + '-' + m[3] } : null;
  }
  function importar() {
    let ov = document.getElementById('escfisImp'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'escfisImp';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99995;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:12px;width:min(540px,100%);padding:16px 18px;box-shadow:var(--shadow-md)">'
      + '<div style="font-weight:700;font-size:15px;color:' + OURO + ';margin-bottom:8px">📎 Anexar livro fiscal desta empresa</div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px">PDF do Domínio (Acompanhamento de Entradas / Saídas / Serviços), SPED EFD (.txt) ou planilha (.xlsx/.csv). Só os dados lidos ficam no site — o arquivo não é guardado. O livro já importado do mesmo mês é substituído.<br>Para importar de <b>todas as empresas</b> de uma vez, use o botão <b>📒 Importar Livros Fiscais (PDF)</b> na lista de Lançamentos Contábeis.</div>'
      + '<div style="font-size:12.5px;margin-bottom:10px"><b>Este arquivo é:</b><br><label><input type="radio" name="escfisTipo" value="" checked> descobrir sozinho</label> <label style="margin-left:6px"><input type="radio" name="escfisTipo" value="E"> Entradas</label> <label style="margin-left:6px"><input type="radio" name="escfisTipo" value="S"> Saídas</label> <label style="margin-left:6px"><input type="radio" name="escfisTipo" value="V"> Serviços</label></div>'
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
      try {
        const r = await lerArquivo(f, tipo);
        if (r.eid && r.eid !== ST.eid) { avisos.push(f.name + ': é da empresa ' + r.eid + ', não desta (' + ST.eid + ') — ignorado'); continue; }
        rows = rows.concat(r.rows); if (r.aviso) avisos.push(f.name + ': ' + r.aviso);
      } catch (e) { avisos.push(f.name + ': ' + e.message); }
    }
    rows = agrupar(rows.filter(r => r.data && r.livro && (r.numero || r.valor)));
    if (!rows.length) { msg.innerHTML = '<span style="color:var(--red)">Nenhuma nota reconhecida.' + (avisos.length ? '<br>' + avisos.map(E).join('<br>') : '') + '</span>'; return; }
    const grupos = {}; rows.forEach(r => { const k = r.data.slice(0, 7) + '|' + r.livro; (grupos[k] = grupos[k] || []).push(r); });
    const ks = Object.keys(grupos).sort(), ja = ks.filter(k => { const [ym, lv] = k.split('|'); const v = sOk(kMes(ST.eid, ym, lv)); return v && v.rows && v.rows.length; });
    const desc = ks.map(k => { const [ym, lv] = k.split('|'); return LIVRO_NOME[lv] + ' ' + ym.slice(5) + '/' + ym.slice(0, 4) + ': ' + grupos[k].length + ' nota(s), R$ ' + F(grupos[k].reduce((s, r) => s + r.valor, 0)); }).join('\n');
    if (!confirm('Livro fiscal lido:\n\n' + desc + (ja.length ? '\n\nJá existe livro importado em ' + ja.map(k => { const [ym, lv] = k.split('|'); return LIVRO_NOME[lv] + ' ' + ym; }).join(', ') + ' — será SUBSTITUÍDO.' : '') + (avisos.length ? '\n\nAvisos:\n' + avisos.join('\n') : '') + '\n\nGravar?')) return;
    const nomeArq = arqs.map(f => f.name).join(', ').slice(0, 120);
    ks.forEach(k => { const [ym, lv] = k.split('|'); gravarLivro(ST.eid, ym, lv, grupos[k], { arquivo: nomeArq }); });
    ov.remove(); toast('Livro fiscal importado: ' + rows.length + ' nota(s) em ' + [...new Set(ks.map(k => k.split('|')[0]))].length + ' mês(es).', 'ok');
    if (!ks.some(k => k.startsWith(ST.ym))) ST.ym = ks[0].split('|')[0]; ST.ok = false; render();
  }

  // ── importação em LOTE (todas as empresas) pela pasta fixa "Relatórios Fiscal" (subpastas Livros de Entradas / Saídas / Serviços) ──
  const CH_PASTA = 'raizLivrosFiscais';
  async function pastaRaiz(trocar) {
    if (!window.showDirectoryPicker) { toast('Este navegador não permite pasta fixa. Use o Chrome ou o Edge.', 'err'); return null; }
    let h = null;
    if (!trocar) {
      try { h = await _lancctbCarregarHandleGenerico(CH_PASTA); } catch (e) { h = null; }
      if (h) { let p = 'prompt'; try { p = await h.queryPermission({ mode: 'read' }); if (p !== 'granted') p = await h.requestPermission({ mode: 'read' }); } catch (e) { } if (p === 'granted') return h; }
    }
    toast('Escolha a pasta "Relatórios Fiscal" (a que tem Livros de Entradas, Livros de Saídas e Livros de Serviços). Ela fica fixa neste navegador.', 'ok');
    try { h = await window.showDirectoryPicker({ id: 'jjrLivrosFiscais', mode: 'read' }); } catch (e) { if (e.name !== 'AbortError') toast('Erro: ' + e.message, 'err'); return null; }
    await _lancctbSalvarHandleGenerico(CH_PASTA, h); atualizarBotaoLote(); return h;
  }
  async function listarPdfs(raiz) {
    const out = [];
    async function varre(dir, prof) {
      for await (const [nome, fh] of dir.entries()) {
        if (fh.kind === 'file') { const inf = infoNome(nome); if (inf) out.push({ nome, fh, ...inf }); }
        else if (prof < 1 && /^livros de (entradas|sa[ií]das|servi[cç]os)$/i.test(nome.trim())) await varre(fh, prof + 1);
      }
    }
    await varre(raiz, 0); return out;
  }
  async function atualizarBotaoLote() {
    const b = document.getElementById('escfisLoteFixar'); if (!b) return;
    let ok = false; try { const h = await _lancctbCarregarHandleGenerico(CH_PASTA); ok = !!h && (await h.queryPermission({ mode: 'read' })) === 'granted'; b.title = h ? 'Pasta fixa: "' + h.name + '"' + (ok ? '' : ' (falta reautorizar — clique em Importar)') + '. Clique para trocar.' : 'Fixar a pasta padrão dos livros fiscais'; } catch (e) { }
    b.textContent = ok ? '📌✓' : '📌';
  }
  async function importarLote() {
    const raiz = await pastaRaiz(false); if (!raiz) return;
    let arqs; try { arqs = await listarPdfs(raiz); } catch (e) { toast('Não consegui ler a pasta: ' + e.message, 'err'); return; }
    if (!arqs.length) { toast('Nenhum PDF no padrão Entradas_<código>_<MMAAAA>.pdf em "' + raiz.name + '". Confira se escolheu a pasta Relatórios Fiscal (📌 troca a pasta).', 'err'); return; }
    let emps = new Set(); try { emps = new Set((S.g('emps') || []).map(e => String(e.eid))); } catch (e) { }
    const yms = [...new Set(arqs.map(a => a.ym))].sort().reverse(), fy = fechYm();
    let ov = document.getElementById('escfisLote'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'escfisLote';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99995;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:var(--white);color:var(--ink);border-radius:12px;width:min(560px,100%);max-height:90vh;overflow:auto;padding:16px 18px;box-shadow:var(--shadow-md)">'
      + '<div style="font-weight:700;font-size:15px;color:' + OURO + ';margin-bottom:4px">📒 Importar Livros Fiscais (PDF) — todas as empresas</div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px">Pasta: <b>' + E(raiz.name) + '</b> · ' + arqs.length + ' PDF(s). A empresa e o mês vêm do nome do arquivo (Entradas_53_062026.pdf). Só os dados lidos ficam no site — os PDFs não são guardados. Arquivo já importado e sem alteração é pulado.</div>'
      + '<div style="font-size:12.5px;margin-bottom:6px"><b>Meses a importar:</b> <label style="font-size:11.5px;margin-left:6px"><input type="checkbox" onchange="document.querySelectorAll(\'#escfisLote input[data-ym]\').forEach(c=>c.checked=this.checked)"> todos</label></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px">' + yms.map(ym => { const n = arqs.filter(a => a.ym === ym).length; return '<label><input type="checkbox" data-ym="' + ym + '"' + (ym === fy || (yms.indexOf(ym) === 0 && !yms.includes(fy)) ? ' checked' : '') + '> ' + MESES_L[+ym.slice(5) - 1] + '/' + ym.slice(0, 4) + ' <span style="color:var(--slate)">(' + n + ')</span></label>'; }).join('') + '</div>'
      + '<label style="display:block;font-size:12px;margin-top:10px"><input type="checkbox" id="escfisLoteForcar"> reimportar mesmo os que já foram importados</label>'
      + '<div id="escfisLoteMsg" style="font-size:12px;margin-top:10px"></div>'
      + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn bo" onclick="document.getElementById(\'escfisLote\').remove()">Fechar</button><button class="btn bp" id="escfisLoteOk">Importar</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#escfisLoteOk').onclick = async () => {
      const sel = new Set([...ov.querySelectorAll('input[data-ym]:checked')].map(c => c.dataset.ym)), forcar = ov.querySelector('#escfisLoteForcar').checked;
      const lista = arqs.filter(a => sel.has(a.ym)); if (!lista.length) { toast('Marque ao menos um mês.', 'err'); return; }
      const btn = ov.querySelector('#escfisLoteOk'); btn.disabled = true; const msg = ov.querySelector('#escfisLoteMsg');
      const rep = { ok: [], pulados: 0, semEmp: [], erros: [], notas: 0 };
      for (let i = 0; i < lista.length; i++) {
        const a = lista[i]; msg.innerHTML = 'Lendo <b>' + E(a.nome) + '</b> (' + (i + 1) + ' de ' + lista.length + ')…';
        if (emps.size && !emps.has(a.eid)) { rep.semEmp.push(a.nome); continue; }
        try {
          const file = await a.fh.getFile(), atual = sOk(kMes(a.eid, a.ym, a.lv));
          if (!forcar && atual && atual.arquivo === a.nome && atual.tam === file.size && atual.mod === file.lastModified && atual.rows && atual.rows.length) { rep.pulados++; continue; }
          const r = await lerArquivo(file, a.lv);
          if (r.eid && r.eid !== a.eid) { rep.erros.push(a.nome + ': o cabeçalho do PDF é da empresa ' + r.eid); continue; }
          const rows = agrupar(r.rows.filter(x => x.data && (x.numero || x.valor)).map(x => Object.assign(x, { livro: a.lv, es: a.lv === 'E' ? 'E' : 'S' })));
          if (!rows.length) { rep.erros.push(a.nome + ': nenhuma nota reconhecida'); continue; }
          const fora = rows.filter(x => x.data.slice(0, 7) !== a.ym).length;
          gravarLivro(a.eid, a.ym, a.lv, rows, { arquivo: a.nome, tam: file.size, mod: file.lastModified, total: R2(rows.reduce((s, x) => s + x.valor, 0)), foraDoMes: fora });
          rep.ok.push(a.nome); rep.notas += rows.length;
        } catch (e) { rep.erros.push(a.nome + ': ' + e.message); }
      }
      btn.disabled = false;
      msg.innerHTML = '<b style="color:var(--green)">✓ ' + rep.ok.length + ' livro(s) importado(s), ' + rep.notas + ' nota(s).</b>' + (rep.pulados ? '<br>' + rep.pulados + ' já estavam importados e sem alteração (pulados).' : '')
        + (rep.semEmp.length ? '<br><span style="color:var(--amber)">' + rep.semEmp.length + ' de empresa não cadastrada no site: ' + E(rep.semEmp.slice(0, 8).join(', ')) + (rep.semEmp.length > 8 ? '…' : '') + '</span>' : '')
        + (rep.erros.length ? '<br><span style="color:var(--red)">' + rep.erros.length + ' com erro:<br>' + rep.erros.slice(0, 15).map(E).join('<br>') + '</span>' : '');
      if (ST.eid && document.getElementById('escfisTab')) { ST.ok = false; render(); }
    };
  }
  function botaoLoteHtml() {
    setTimeout(atualizarBotaoLote, 50);
    return '<span style="display:inline-flex;gap:0"><button class="btn bo bsm btn-neon" style="color:' + OURO + '" onclick="EscFis.importarLote()" title="Importa os livros fiscais (PDF do Domínio: Entradas, Saídas e Serviços) de TODAS as empresas, pela pasta fixa Relatórios Fiscal. A empresa e o mês vêm do nome do arquivo. Só os dados ficam no site, o PDF não.">📒 Importar Livros Fiscais (PDF)</button>'
      + '<button class="btn bo bsm" id="escfisLoteFixar" style="margin-left:2px" onclick="EscFis.fixarPasta()" title="Fixar a pasta padrão dos livros fiscais">📌</button></span>';
  }
  async function fixarPasta() { const h = await pastaRaiz(true); if (h) toast('Pasta padrão dos livros fiscais: "' + h.name + '".', 'ok'); }

  // várias linhas da mesma nota (uma por CFOP/alíquota) → 1 nota com a soma; CFOP = o de maior valor
  function agrupar(rows) {
    const m = new Map();
    rows.forEach(r => { const k = r.livro + '|' + r.es + '|' + (r.numero || '?' + r.data + r.valor) + '|' + (r.serie || '') + '|' + (r.doc || ''); const g = m.get(k); if (!g) { m.set(k, Object.assign({ _cf: { [r.cfop || '']: r.valor } }, r)); return; } g.valor = R2(g.valor + r.valor); g._cf[r.cfop || ''] = (g._cf[r.cfop || ''] || 0) + r.valor; if (!g.nome && r.nome) g.nome = r.nome; if (!g.doc && r.doc) g.doc = r.doc; });
    return [...m.values()].map(g => { const cfs = Object.entries(g._cf).filter(e => e[0]).sort((a, b) => b[1] - a[1]).map(e => e[0]); g.cfop = cfs.join('/'); delete g._cf; return g; });
  }
  const isoDe = v => {
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
    const s = String(v || '').trim(); let x = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (x) return x[3] + '-' + x[2] + '-' + x[1];
    x = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (x) return x[0]; x = s.match(/^(\d{2})(\d{2})(\d{4})$/); if (x) return x[3] + '-' + x[2] + '-' + x[1]; return '';
  };
  // livro da linha: escolhido no import > CFOP (1/2/3 = Entradas, 5/6/7 = Saídas)
  const livroDe = (cfop, tipo) => { if (tipo) return tipo; const c = dig(cfop); if (c.length === 4) return +c[0] <= 3 ? 'E' : 'S'; return ''; };
  const comLivro = (r, lv) => Object.assign(r, { livro: lv, es: lv === 'E' ? 'E' : lv ? 'S' : '' });
  async function lerArquivo(f, tipo) {
    const nome = f.name.toLowerCase(), inf = infoNome(f.name); if (inf && !tipo) tipo = inf.lv;
    if (nome.endsWith('.pdf')) { const r = await lerPdf(await f.arrayBuffer(), tipo); if (inf && !r.eid) r.eid = inf.eid; return r; }
    if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); let out = { rows: [] }; wb.SheetNames.forEach(sn => { const r = lerTabela(XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }), tipo); out.rows = out.rows.concat(r.rows); if (r.eid && !out.eid) out.eid = r.eid; if (r.aviso && !out.rows.length) out.aviso = r.aviso; }); return out; }
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
        const p = part[o.part] || {}, lv = ent ? 'E' : (reg === 'A100' ? 'V' : 'S');
        cur = comLivro({ data: o.data, numero: o.numero, serie: o.serie || '', doc: p.doc || '', nome: p.nome || '', cfop: o.cfop || '', valor: o.valor, _cfs: [] }, lv);
      } else if ((reg === 'C190' || reg === 'D190') && cur) cur._cfs.push([dig(c[3]), num(c[5])]);
    });
    fim();
    return { rows };
  }
  // Planilha/CSV: varre TODAS as linhas — acha o cabeçalho sozinho (e de novo em cada seção), a seção "Notas de Entrada/Saída/Serviços"
  // (modelo da Pride, 26/11/2026: uma aba com as duas seções) e o código da empresa em "Empresa: 0142 - …".
  // Número/CFOP que o Excel guarda como número (26.0, 1407.0) viram inteiro — sem isso "26.0" virava "260".
  function lerTabela(aoa, tipo) {
    const H = h => nrm(h).toLowerCase();
    const acha = (cab, testes) => { for (const t of testes) { const i = cab.findIndex(h => t(H(h))); if (i >= 0) return i; } return -1; };
    const inteiro = v => typeof v === 'number' ? String(Math.round(v)) : String(v == null ? '' : v);
    const cabecalho = cab => {
      const ix = {
        data: acha(cab, [h => /emiss/.test(h), h => /data (do )?doc|dt\.? ?doc/.test(h), h => /^data$|^dt$/.test(h), h => /^data/.test(h)]),
        numero: acha(cab, [h => /^(n[o°º.]?|num(ero)?|nota|nf|n\. ?doc|num\.? ?doc|numero (da )?nota|numero do documento|documento|doc)$/.test(h.replace(/[º°]/g, 'o')), h => /^n(umero|o|º)?\.? ?(doc|nf|nota)/.test(h)]),
        serie: acha(cab, [h => /^serie/.test(h)]),
        doc: acha(cab, [h => /cnpj|cpf/.test(h)]),
        nome: acha(cab, [h => /razao|fornecedor|cliente|remetente|destinatario|participante|emitente/.test(h), h => /^nome/.test(h)]),
        cfop: acha(cab, [h => /cfop/.test(h)]),
        valor: acha(cab, [h => /valor contabil|vl\.? ?contabil/.test(h), h => /valor total|vl\.? ?total|valor (do )?doc|vl\.? ?doc/.test(h), h => /^total$/.test(h), h => /^valor$/.test(h)]),
      };
      return (ix.data < 0 || ix.valor < 0 || (ix.numero < 0 && ix.doc < 0)) ? null : ix;
    };
    let ix = null, secao = '', eid = '', achouCab = false; const rows = [];
    for (let k = 0; k < aoa.length; k++) {
      const r = aoa[k] || [], txt = nrm(r.map(x => x == null ? '' : String(x)).join(' '));
      if (!txt) continue;
      if (!eid) { const m = txt.match(/EMPRESA:\s*0*(\d+)\s*-/); if (m) eid = String(+m[1]); }
      const sec = txt.match(/^(NOTAS (FISCAIS )?DE |LIVRO (DE )?(REGISTRO DE )?)?(ENTRADAS?|SAIDAS?|SERVICOS?)\b/);
      if (sec && r.filter(x => String(x == null ? '' : x).trim()).length <= 2) { secao = /^E/.test(sec[5]) ? 'E' : /^SA/.test(sec[5]) ? 'S' : 'V'; continue; }
      const novo = cabecalho(r.map(x => String(x == null ? '' : x))); if (novo) { ix = novo; achouCab = true; continue; }
      if (!ix) continue;
      const data = isoDe(r[ix.data]); if (!data) continue;
      const cfop = ix.cfop >= 0 ? dig(inteiro(r[ix.cfop])) : '';
      rows.push(comLivro({ data, numero: ix.numero >= 0 ? numNf(inteiro(r[ix.numero])) : '', serie: ix.serie >= 0 ? inteiro(r[ix.serie]).trim() : '', doc: ix.doc >= 0 ? dig(inteiro(r[ix.doc])) : '', nome: ix.nome >= 0 ? String(r[ix.nome] || '').trim() : '', cfop, valor: num(r[ix.valor]) }, tipo || secao || livroDe(cfop, '')));
    }
    if (!achouCab) return { rows: [], aviso: 'não achei o cabeçalho (preciso de colunas de data, número ou CNPJ/CPF e valor)' };
    const semLv = rows.filter(r => !r.livro).length;
    return { rows, eid, aviso: semLv ? semLv + ' linha(s) sem CFOP: escolha Entradas, Saídas ou Serviços ao importar' : '' };
  }
  // ── PDF ──
  async function linhasPdf(buf) {
    if (typeof pdfjsLib === 'undefined') throw new Error('leitor de PDF não carregado');
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise, out = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const tc = await (await pdf.getPage(p)).getTextContent(), L = [];
      tc.items.forEach(it => { const s = String(it.str || '').trim(); if (!s) return; const y = it.transform[5]; let l = L.find(l => Math.abs(l.y - y) <= 2); if (!l) { l = { y, t: [] }; L.push(l); } l.t.push({ x: it.transform[4], s }); });
      L.sort((a, b) => b.y - a.y).forEach(l => { l.t.sort((a, b) => a.x - b.x); l.p = p; out.push(l); });
    }
    return out;
  }
  // Domínio "ACOMPANHAMENTO DE ENTRADAS / SAÍDAS / SERVIÇOS": colunas achadas pela posição dos títulos (mudam um pouco de livro para livro)
  function lerDominio(linhas) {
    let lv = '', eid = '', hdr = null; const rows = [];
    const MONEY = /^-?\d{1,3}(?:\.\d{3})*,\d{2}/;
    for (const l of linhas) {
      const txt = l.t.map(t => t.s).join(' '), n = nrm(txt);
      if (!lv) { const m = n.match(/ACOMPANHAMENTO DE (ENTRADAS|SAIDAS|SERVICOS)/); if (m) lv = { ENTRADAS: 'E', SAIDAS: 'S', SERVICOS: 'V' }[m[1]]; }
      if (!eid && l.p === 1) { const m = txt.match(/^(\d+)\s+-\s+\S/); if (m && l.t[0].x < 10) eid = String(+m[1]); }
      if (/DATA EMISS/.test(n) && /VALOR CONT/.test(n)) {
        const pos = re => { const t = l.t.find(t => re.test(nrm(t.s))); return t ? t.x : null; };
        const esp = pos(/^ESPECIE$/), cods = l.t.filter(t => nrm(t.s) === 'CODIGO').map(t => t.x);
        hdr = { de: pos(/^DATA EMISS/), n: pos(/^NOTA$/), serie: pos(/^SERIE$/), esp, cod: cods.find(x => esp != null && x > esp) || null, nome: pos(/^(FORNECEDOR|CLIENTE|REMETENTE|DESTINATARIO|TOMADOR|PRESTADOR)$/), doc: pos(/^CNPJ/), ie: pos(/^INSC\.? EST/), cfop: pos(/^CFOP$/), v: pos(/^VALOR CONTABIL/) };
        if (hdr.de == null || hdr.n == null || hdr.v == null) hdr = null;
        continue;
      }
      if (!hdr) continue;
      const em = l.t.find(t => Math.abs(t.x - hdr.de) <= 15 && /^\d{2}\/\d{2}\/\d{4}$/.test(t.s)); if (!em) continue;
      const entre = (a, b) => l.t.filter(t => t.x >= a && t.x < b);
      const fimNota = hdr.serie != null ? hdr.serie - 2 : hdr.n + 15;
      const numero = (entre(hdr.n - 22, fimNota).find(t => /^\d+$/.test(t.s)) || {}).s || '';
      const serie = hdr.serie != null ? (entre(hdr.serie - 3, (hdr.esp || hdr.serie + 20) - 3)[0] || {}).s || '' : '';
      const iniNome = hdr.cod != null ? hdr.cod - 5 : (hdr.nome != null ? hdr.nome - 5 : null);
      const nome = iniNome != null && hdr.doc != null ? entre(iniNome, hdr.doc - 5).map(t => t.s).join(' ').replace(/^\d+\s+/, '').trim() : '';
      const docT = hdr.doc != null ? entre(hdr.doc - 8, (hdr.ie || hdr.doc + 65) - 3).find(t => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11,14}$/.test(t.s)) : null;
      let cfop = ''; if (hdr.cfop != null) { const c = entre(hdr.cfop - 10, hdr.cfop + 25).map(t => t.s.match(/^([1235-7])-(\d{3})/)).find(Boolean); if (c) cfop = c[1] + c[2]; }
      const vT = entre(hdr.v - 25, hdr.v + 45).find(t => MONEY.test(t.s)); if (!vT) continue;
      rows.push(comLivro({ data: isoDe(em.s), numero: numNf(numero), serie, doc: docT ? dig(docT.s) : '', nome, cfop, valor: num(vT.s.match(MONEY)[0]) }, lv));
    }
    return { ok: !!(lv && rows.length), lv, eid, rows };
  }
  async function lerPdf(buf, tipo) {
    const linhas = await linhasPdf(buf), d = lerDominio(linhas);
    if (d.ok) { if (tipo && tipo !== d.lv) d.rows.forEach(r => comLivro(r, tipo)); return { rows: d.rows, eid: d.eid }; }
    // modelo desconhecido: leitura genérica por linha (data + número + CNPJ/CPF + CFOP + valor) — conferir
    const rows = [];
    linhas.forEach(l => {
      const t = l.t.map(x => x.s).join(' ');
      const datas = [...t.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)].map(x => x[1]); if (!datas.length) return;
      const money = t.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/); if (!money) return;
      const cfopM = t.match(/\b([1-3]|[5-7])[.-](\d{3})\b/), cfop = cfopM ? cfopM[1] + cfopM[2] : '';
      const docM = t.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
      const pos = t.indexOf(datas[0]), depois = t.slice(pos + 10).match(/\b\d{1,9}\b/g) || [];
      rows.push(comLivro({ data: isoDe(datas[0]), numero: numNf(depois.find(x => !datas.join(' ').includes(x)) || ''), serie: '', doc: docM ? dig(docM[0]) : '', nome: '', cfop, valor: num(money[0]) }, livroDe(cfop, tipo)));
    });
    return { rows, aviso: 'PDF em modelo desconhecido, lido pelo modo genérico — confira os valores' + (rows.some(r => !r.livro) ? '; linhas sem CFOP: escolha Entradas, Saídas ou Serviços.' : '.') };
  }

  // ── Excel (todas as linhas filtradas, não só a tela) ──
  function planilha(L, nomeAba, titulo) {
    const cab = ['Situação', 'E/S', 'Data emissão', 'Número', 'CNPJ/CPF', 'Destinatário / Remetente', 'CFOP', 'Operação', 'Valor no fiscal', 'Valor no site', 'Observação'];
    const aoa = [['JJR CONSULTORIA CONTÁBIL'], [titulo], [], cab].concat(L.map(l => [SIT[l.sit], l.es === 'E' ? 'Entrada' : 'Saída', br(l.data), l.numero, fmtDoc(l.doc), l.nome, fmtCfop(l.cfop), OPS[l.op] || '', l.vf == null ? '' : l.vf, l.vs == null ? '' : l.vs, l.obs]));
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
    const fisc = ST.mAba === 'fisc';
    salvarXlsx([fisc ? planilha(filtrar(modalLinhas('fisc'), ST.mf.fisc || {}), 'No fiscal, nao no site', t + ' — no fiscal, não no site') : planilha(filtrar(modalLinhas('site'), ST.mf.site || {}), 'No site, nao no fiscal', t + ' — no site, não no fiscal')], 'Escrita_Fiscal_' + (fisc ? 'No_fiscal_nao_no_site_' : 'No_site_nao_no_fiscal_') + ST.eid + '_' + ST.ym + '.xlsx');
  }

  root.EscFis = {
    render: () => render(typeof _lancctbEidAtual !== 'undefined' ? _lancctbEidAtual : ST.eid), importar, processar, config, salvarConfig, diferencas, excel, excelModal, txt, gerarNoSite, excluirLivros, excluirLivrosOk, importarLote, fixarPasta, botaoLoteHtml,
    irMes, mes, filtro, mFiltro, mMes, mTodas,
    mAba: k => { ST.mAba = k; modal(); }, mMarca: (id, v) => { ST.mSel[id] = v; modalTab(); }, mDet: (id, v) => { ST.mDet[id] = v; if (!v) ST.mSel[id] = false; else ST.mSel[id] = true; modalTab(); },
    _t: { classCfop, classSite, confrontar, lerSped, lerTabela, agrupar, isoDe, lerDominio, infoNome, opFisc, lerArquivo, linhasPdf },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.EscFis;
})(typeof window !== 'undefined' ? window : globalThis);

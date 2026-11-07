/* FAST LUBE (empresa 163) — Registro Contábil PARTINDO DO FLUXO DE CAIXA (pedido do usuário 06-07/11/2026), só para Itaú (conta 1) e Banco do Brasil (conta 4).
   Modelo:
   • O extrato real (aba "Extrato Bancário") entra só como REFERÊNCIA (status 'referencia'): não vai pro Registro nem pro motor; serve para conferir o saldo.
   • O Fluxo de Caixa sobe por um botão dentro do Registro Contábil; o banco de cada linha vem da coluna Portador (ITAU / BANCO DO BRASIL). Cada linha vira uma linha do Registro (fonte 'fluxo').
   • Botões trazem do extrato os recebimentos e o que faltar (pagamentos que o fluxo não explica) para o saldo diário bater; nada do fluxo é tirado.
   • Coluna Saldo (corrente) ao lado do Valor; "Conciliar saldo" mostra dia a dia onde o Registro difere do extrato; "Excluir filtradas" apaga em lote o que está filtrado.
   Depende de funções globais do index.html (_supaClient, S, toast, _lancctb*). */
(function (root) {
  const EID = '163', CONTAS = { '1': 'ITAU', '4': 'BANCO DO BRASIL' };
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = v => Math.round(v * 100) / 100;
  const cents = v => Math.round(Number(v || 0) * 100);
  const fmt = v => { try { return _fmt(v); } catch (e) { return Number(v).toFixed(2); } };
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const eidAtual = () => String(_lancctbEidAtual);
  const contaAtual = () => String(_lancctbExtratoContaSel || '');
  const brData = d => String(d || '').split('-').reverse().join('/');
  root._flStatusExcluidos = () => ativo() ? '(reabsorvido,referencia)' : '(ignorado,reabsorvido,referencia)'; // Fast Lube: linha ignorada continua visível (apagada)
  root._flContaRef = (eid, conta) => String(eid) === EID && CONTAS[String(conta)] !== undefined;
  const ativo = () => root._flContaRef(eidAtual(), contaAtual());
  const dormir = ms => new Promise(r => setTimeout(r, ms));

  // ── portador do Fluxo → conta bancária ──
  function contaDoPortador(p) {
    const n = norm(p);
    if (n.indexOf('ITAU') >= 0) return 1;
    if (n.indexOf('BANCO DO BRASIL') >= 0 || /^BB\b/.test(n)) return 4;
    return null; // CARTEIRA e outros: não são banco → não vão pro Registro
  }
  // Histórico bancário das linhas vindas do Fluxo (pedido 07/11/2026): Razão social | Número X (Parcela N) | CNPJ/CPF n | Descrição da conta | Histórico | MATRIZ/FILIAL 003
  function unidadeCurta(u) { const m = String(u || '').match(/(MATRIZ|FILIAL\s*\d+)/i); return m ? m[1].toUpperCase().replace(/FILIAL\s*/, 'FILIAL ') : ''; }
  function histFluxo(f) {
    const p = [];
    const nome = String(f.cliente_fornecedor_nome || '').trim(); if (nome) p.push(nome);
    const num = String(f.numero || f.documento_numero || '').trim();
    if (num) { const pc = (f.parcela != null && String(f.parcela).trim() !== '') ? ' (Parcela ' + String(f.parcela).replace(/\.0+$/, '') + ')' : ''; p.push('Número ' + num + pc); }
    const doc = String(f.cnpj_cpf || '').trim(); if (doc) p.push('CNPJ/CPF ' + doc);
    const dc = String(f.descricao_conta_origem || '').trim(); if (dc) p.push(dc);
    const h = String(f.descricao || '').trim(); if (h) p.push(h);
    const u = unidadeCurta(f.unidade); if (u) p.push(u);
    return p.join(' | ') || null;
  }
  // regras "não trazer do fluxo" (o usuário vai definir): [{campo:'descricao_conta_origem'|'descricao'|'cliente_fornecedor_nome'|'unidade'|'forma_pagamento', contem:'texto'}]
  function excluidoPorRegra(f) {
    let regras = []; try { regras = S.g('fl_fluxo_regras_excluir_' + EID) || []; } catch (e) {}
    return regras.some(r => r && r.campo && r.contem && norm(f[r.campo]).indexOf(norm(r.contem)) >= 0);
  }
  const getExcl = () => { try { return new Set((S.g('fl_fluxo_excluidos_' + EID) || []).map(String)); } catch (e) { return new Set(); } };
  const setExcl = set => { try { S.s('fl_fluxo_excluidos_' + EID, [...set]); } catch (e) {} };

  // ── janelinha simples de resultado ──
  function janela(titulo, html, largura) {
    let el = document.getElementById('mFlInfo');
    if (!el) { el = document.createElement('div'); el.className = 'mb'; el.id = 'mFlInfo'; el.innerHTML = '<div class="modal" style="width:96%"></div>'; document.body.appendChild(el); }
    el.firstChild.style.maxWidth = (largura || 900) + 'px';
    el.firstChild.innerHTML = '<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>' + titulo + '</span><button onclick="closeModal(\'mFlInfo\')" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div>'
      + '<div style="max-height:70vh;overflow:auto">' + html + '</div><div class="ma"><button class="btn bo" onclick="closeModal(\'mFlInfo\')">Fechar</button></div>';
    openModal('mFlInfo');
  }

  // ── barra de botões do Registro ──
  root._flToolbarHtml = function () {
    if (!ativo()) return '';
    const n = (root.__regIdsFiltrados || []).length;
    return '<button class="btn bp" onclick="_flSubirFluxo()" title="Sobe o Fluxo de Caixa do mês (Excel). O banco de cada linha vem da coluna Portador: ITAU → Itaú, BANCO DO BRASIL → Banco do Brasil.">⬆ Subir Fluxo de Caixa</button>'
      + '<button class="btn bo" onclick="_flTrazerExtrato(\'receb\')" title="Traz do extrato bancário desta conta (aba Extrato Bancário) todos os RECEBIMENTOS (entradas) do período para o Registro.">⬇ Trazer recebimentos do extrato</button>'
      + '<button class="btn bo" onclick="_flTrazerExtrato(\'pag\')" title="Traz do extrato os PAGAMENTOS (saídas) que o Fluxo não explica (aplicações, tarifas, impostos...), para o saldo diário bater. Nada do Fluxo é tirado.">⬇ Trazer pagamentos do extrato</button>'
      + '<button class="btn bo" onclick="_flConciliarSaldo()" title="Compara, dia a dia, o saldo do extrato bancário com o saldo do Registro Contábil.">⚖ Conciliar saldo</button>'
      + '<button class="btn bo" onclick="_flIgnorarFiltradas()" title="Ignora todas as linhas filtradas: ficam apagadas, fora do saldo e do TXT, e o extrato pode trazer o pagamento delas de novo.">🚫 Ignorar filtradas (' + n + ')</button>'
      + '<button class="btn bo" style="color:#dc2626;border-color:#dc2626" onclick="_flExcluirFiltradas()" title="Exclui do Registro TODAS as linhas que estão filtradas na tela (não só a página atual).">🗑 Excluir filtradas (' + n + ')</button>';
  };

  // chips da regra: a Fast Lube ganha CNPJ/CPF e junta com " | " (outras empresas não mudam)
  root._flHistChipsExtra = () => (String(_lancctbEidAtual) === EID ? [{ tok: '{FLUXO_CNPJ}', rot: 'CNPJ/CPF (Fluxo)' }] : []);
  root._flHistJuntador = () => (String(_lancctbEidAtual) === EID ? ' | ' : ' ');
  // ── 1) subir o Fluxo ──
  root._flSubirFluxo = async function () {
    await abrirLancctbFluxoImportModal();
    const chk = document.getElementById('lancctbFluxoImportSoMesAtual'); if (chk) chk.checked = false; // o mês é o do arquivo, não o do Fechamento Atual
  };
  root._flAposImportarFluxo = async function () {
    if (eidAtual() !== EID) return;
    await converterFluxo();
    try { renderLancctbRegistroContabil(); } catch (e) {}
  };
  async function converterFluxo() {
    const { data: fx, error } = await _lancctbFetchTudo(() => _supaClient.from('fluxo_caixa_lancamentos')
      .select('id,empresa_eid,data,descricao,valor_saida,valor_entrada,cliente_fornecedor_nome,cnpj_cpf,documento_numero,numero,parcela,port_nom,descricao_conta_origem,unidade,forma_pagamento')
      .eq('empresa_eid', EID).is('lancamento_extrato_id', null).order('id', { ascending: true }));
    if (error) { toast('Fast Lube: não consegui ler o Fluxo: ' + error.message, 'err'); return null; }
    const excl = getExcl(), itens = []; let semBanco = 0, porRegra = 0, jaExc = 0, semValor = 0;
    (fx || []).forEach(f => {
      if (excl.has(String(f.id))) { jaExc++; return; }
      const c = contaDoPortador(f.port_nom); if (!c) { semBanco++; return; }
      if (excluidoPorRegra(f)) { porRegra++; return; }
      if (!(Number(f.valor_saida) > 0 || Number(f.valor_entrada) > 0)) { semValor++; return; }
      itens.push({ f, c });
    });
    let criadas = 0;
    for (let i = 0; i < itens.length; i += 300) {
      const lote = itens.slice(i, i + 300);
      const rows = lote.map(({ f, c }) => ({ empresa_eid: EID, conta_bancaria_id: c, data_pagamento: f.data, valor_saida: f.valor_saida || 0, valor_entrada: f.valor_entrada || 0, historico_bancario: histFluxo(f), documento: f.documento_numero || null, informacao: f.cliente_fornecedor_nome || null, origem_importacao: 'excel', hash_dedup: 'flx' + f.id, fonte: 'fluxo' }));
      const up = await _supaClient.from('lancamentos_extrato').upsert(rows, { onConflict: 'conta_bancaria_id,hash_dedup', ignoreDuplicates: true });
      if (up.error) { toast('Fast Lube: erro ao criar linhas do Registro: ' + up.error.message, 'err'); return null; }
      const hs = rows.map(r => r.hash_dedup);
      const sel = await _supaClient.from('lancamentos_extrato').select('id,hash_dedup').eq('empresa_eid', EID).in('hash_dedup', hs);
      if (sel.error) { toast('Fast Lube: erro ao ligar o Fluxo ao Registro: ' + sel.error.message, 'err'); return null; }
      const idPorHash = new Map((sel.data || []).map(x => [x.hash_dedup, x.id]));
      const lig = lote.filter(({ f }) => idPorHash.has('flx' + f.id)).map(({ f, c }) => ({ id: f.id, empresa_eid: EID, data: f.data, descricao: f.descricao || '(sem descrição)', lancamento_extrato_id: idPorHash.get('flx' + f.id), status_associado: 'associado', conta_bancaria_id: c }));
      for (let k = 0; k < lig.length; k += 200) {
        const u = await _supaClient.from('fluxo_caixa_lancamentos').upsert(lig.slice(k, k + 200), { onConflict: 'id' });
        if (u.error) { toast('Fast Lube: erro ao marcar o Fluxo como associado: ' + u.error.message, 'err'); return null; }
      }
      criadas += lig.length;
    }
    toast('Fast Lube: ' + criadas + ' linha(s) do Fluxo levadas ao Registro' + (semBanco ? ' · ' + semBanco + ' sem banco (ex.: CARTEIRA) ficaram de fora' : '') + (porRegra ? ' · ' + porRegra + ' barradas pela regra' : '') + (jaExc ? ' · ' + jaExc + ' já excluídas por você' : '') + '.', 'ok');
    return { criadas, semBanco, porRegra };
  }

  // reescreve o histórico bancário das linhas do Registro que vieram do Fluxo (as já convertidas antes da regra de concatenação)
  root._flRefazerHistoricos = async function () {
    const { data: fx } = await _lancctbFetchTudo(() => _supaClient.from('fluxo_caixa_lancamentos').select('id,data,descricao,cliente_fornecedor_nome,cnpj_cpf,documento_numero,numero,parcela,descricao_conta_origem,unidade,port_nom,lancamento_extrato_id').eq('empresa_eid', EID).not('lancamento_extrato_id', 'is', null).order('id', { ascending: true }));
    const rows = []; (fx || []).forEach(f => { const c = contaDoPortador(f.port_nom); if (!c) return; rows.push({ empresa_eid: EID, conta_bancaria_id: c, data_pagamento: f.data, hash_dedup: 'flx' + f.id, origem_importacao: 'excel', historico_bancario: histFluxo(f) }); });
    for (let i = 0; i < rows.length; i += 300) { const u = await _supaClient.from('lancamentos_extrato').upsert(rows.slice(i, i + 300), { onConflict: 'conta_bancaria_id,hash_dedup' }); if (u.error) { toast('Erro ao refazer históricos: ' + u.error.message, 'err'); return 0; } }
    return rows.length;
  };
  // ── 2) trazer do extrato (referência) ──
  function periodo() {
    let de = _lancctbRegistroDataDe || '', ate = _lancctbRegistroDataAte || '';
    const mes = _lancctbRegistroMes;
    if (!de && !ate && /^\d{4}-\d{2}$/.test(mes || '')) { const [a, m] = mes.split('-').map(Number); de = mes + '-01'; ate = mes + '-' + String(new Date(a, m, 0).getDate()).padStart(2, '0'); }
    return { de, ate };
  }
  async function carregarRef(conta, p) {
    const r = await _lancctbFetchTudo(() => {
      let q = _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_entrada,valor_saida,historico_bancario,documento,informacao').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('status_conciliacao', 'referencia');
      if (p.de) q = q.gte('data_pagamento', p.de); if (p.ate) q = q.lte('data_pagamento', p.ate);
      return q.order('data_pagamento', { ascending: true }).order('id', { ascending: true });
    });
    return r.data || [];
  }
  async function carregarRegistro(conta, de, ate, extra) {
    const r = await _lancctbFetchTudo(() => {
      let q = _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_entrada,valor_saida,fonte,status_conciliacao').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).not('status_conciliacao', 'in', '(ignorado,reabsorvido,referencia)');
      if (de) q = q.gte('data_pagamento', de); if (ate) q = q.lte('data_pagamento', ate);
      if (extra) q = extra(q);
      return q.order('data_pagamento', { ascending: true }).order('id', { ascending: true });
    });
    return r.data || [];
  }
  // subconjunto cuja soma (em centavos) é exatamente o alvo
  function subsetSum(itens, alvo) {
    const reach = new Map([[0, null]]);
    for (let k = 0; k < itens.length; k++) {
      const v = itens[k].c; if (v <= 0 || v > alvo) continue;
      const novos = [];
      for (const s of reach.keys()) { const ns = s + v; if (ns <= alvo && !reach.has(ns)) novos.push([ns, { prev: s, k }]); }
      novos.forEach(([ns, p]) => reach.set(ns, p));
      if (reach.has(alvo)) break;
      if (reach.size > 250000) return null;
    }
    if (!reach.has(alvo)) return null;
    const sel = []; let s = alvo; while (s !== 0) { const p = reach.get(s); sel.push(p.k); s = p.prev; }
    return sel;
  }
  root._flTrazerExtrato = async function (modo) {
    const comPagamentos = modo === 'pag', comRecebimentos = modo === 'receb';
    if (!ativo()) return;
    const conta = contaAtual(), p = periodo();
    const ref = await carregarRef(conta, p);
    if (!ref.length) { toast('Não há extrato bancário (aba Extrato Bancário) desta conta no período. Suba o extrato lá primeiro.', 'err'); return; }
    const novas = []; let nEnt = 0, nSai = 0, explicadas = 0, explicadasOutroDia = 0;
    if (comRecebimentos) ref.forEach(r => { if (Number(r.valor_entrada) > 0 && !(Number(r.valor_saida) > 0)) { novas.push({ r, fonte: 'extrato_receb', pref: 'flr' }); nEnt++; } });
    if (comPagamentos) {
      // linhas do Fluxo já no Registro (por dia) para "explicar" os débitos do extrato
      const d0 = p.de ? new Date(p.de + 'T12:00:00') : null, d1 = p.ate ? new Date(p.ate + 'T12:00:00') : null;
      const sh = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
      const fx = await carregarRegistro(conta, d0 ? sh(d0, -3) : '', d1 ? sh(d1, 3) : '', q => q.eq('fonte', 'fluxo').gt('valor_saida', 0));
      const porDia = {}; fx.forEach(f => { (porDia[f.data_pagamento] = porDia[f.data_pagamento] || []).push({ id: f.id, c: cents(f.valor_saida), usado: false }); });
      const disp = d => (porDia[d] || []).filter(x => !x.usado);
      const tentar = (dia, alvo) => {
        const it = disp(dia); if (!it.length) return false;
        const igual = it.find(x => x.c === alvo); if (igual) { igual.usado = true; return true; }
        const sel = subsetSum(it, alvo); if (!sel) return false; sel.forEach(k => { it[k].usado = true; }); return true;
      };
      const saidas = ref.filter(r => Number(r.valor_saida) > 0).sort((a, b) => cents(b.valor_saida) - cents(a.valor_saida));
      saidas.forEach(r => {
        const alvo = cents(r.valor_saida), dia = r.data_pagamento;
        if (tentar(dia, alvo)) { explicadas++; return; }
        for (const dd of [-1, 1, -2, 2, -3, 3]) { if (tentar(sh(new Date(dia + 'T12:00:00'), dd), alvo)) { explicadasOutroDia++; return; } }
        novas.push({ r, fonte: 'extrato_compl', pref: 'flc' }); nSai++;
      });
    }
    if (!novas.length) { toast('Nada a trazer: o extrato já está todo representado no Registro.', 'info'); return; }
    const rows = novas.map(({ r, fonte, pref }) => ({ empresa_eid: EID, conta_bancaria_id: Number(conta), data_pagamento: r.data_pagamento, valor_saida: r.valor_saida || 0, valor_entrada: r.valor_entrada || 0, historico_bancario: r.historico_bancario || null, documento: r.documento || null, informacao: r.informacao || null, origem_importacao: 'excel', hash_dedup: pref + r.id, fonte }));
    for (let i = 0; i < rows.length; i += 300) {
      const up = await _supaClient.from('lancamentos_extrato').upsert(rows.slice(i, i + 300), { onConflict: 'conta_bancaria_id,hash_dedup', ignoreDuplicates: true });
      if (up.error) { toast('Erro ao trazer do extrato: ' + up.error.message, 'err'); return; }
    }
    toast(comPagamentos ? 'Trazidos do extrato: ' + nSai + ' pagamento(s) que o Fluxo não explica (' + explicadas + ' já estavam no Fluxo' + (explicadasOutroDia ? ', ' + explicadasOutroDia + ' em dia próximo' : '') + '). Linhas já trazidas antes não duplicam.' : 'Trazidos do extrato: ' + nEnt + ' recebimento(s). Linhas já trazidas antes não duplicam.', 'ok');
    renderLancctbRegistroContabil();
  };

  // ── 3) conciliar saldo dia a dia ──
  root._flConciliarSaldo = async function () {
    if (!ativo()) return;
    const conta = contaAtual();
    const { data: ag } = await _supaClient.from('agencias_bancarias').select('saldo_inicial,banco_nome').eq('id', conta).maybeSingle();
    const ini = Number((ag && ag.saldo_inicial) || 0), p = periodo();
    const ref = await carregarRef(conta, { de: '', ate: p.ate });
    const reg = await carregarRegistro(conta, '', p.ate);
    if (!ref.length) { toast('Sem extrato bancário (referência) nesta conta para comparar.', 'err'); return; }
    const dias = new Map(); // dia -> {ref, reg}
    const soma = (lista, chave) => { let s = ini; const mov = {}; lista.forEach(l => { mov[l.data_pagamento] = (mov[l.data_pagamento] || 0) + cents(l.valor_entrada) - cents(l.valor_saida); }); Object.keys(mov).sort().forEach(d => { s += mov[d]; (dias.get(d) || dias.set(d, {}).get(d))[chave + 'Mov'] = mov[d]; }); };
    const ordem = new Set([...ref.map(l => l.data_pagamento), ...reg.map(l => l.data_pagamento)]); const lista = [...ordem].sort();
    const movRef = {}, movReg = {};
    ref.forEach(l => { movRef[l.data_pagamento] = (movRef[l.data_pagamento] || 0) + cents(l.valor_entrada) - cents(l.valor_saida); });
    reg.forEach(l => { movReg[l.data_pagamento] = (movReg[l.data_pagamento] || 0) + cents(l.valor_entrada) - cents(l.valor_saida); });
    let sR = cents(ini), sG = cents(ini); const linhas = []; let difs = 0;
    lista.forEach(d => { sR += movRef[d] || 0; sG += movReg[d] || 0; const dif = sG - sR; if (dif !== 0) difs++; if ((p.de ? d >= p.de : true)) linhas.push({ d, sR, sG, dif, mr: movRef[d] || 0, mg: movReg[d] || 0 }); });
    const fin = lista.length ? { sR, sG, dif: sG - sR } : { sR: cents(ini), sG: cents(ini), dif: 0 };
    const cor = v => v === 0 ? 'var(--teal)' : '#dc2626';
    let h = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;font-size:13px"><span>Saldo inicial: <b>R$ ' + fmt(ini) + '</b></span><span>Saldo final do EXTRATO: <b>R$ ' + fmt(fin.sR / 100) + '</b></span><span>Saldo final do REGISTRO: <b>R$ ' + fmt(fin.sG / 100) + '</b></span><span style="color:' + cor(fin.dif) + ';font-weight:700">Diferença: R$ ' + fmt(fin.dif / 100) + (fin.dif === 0 ? ' ✔ bateu' : '') + '</span></div>';
    const so = linhas.filter(x => x.dif !== 0);
    h += '<div style="font-size:12px;color:var(--slate);margin-bottom:6px">' + (so.length ? so.length + ' dia(s) com diferença (mostrando só esses). Positivo = Registro tem a MAIS que o extrato.' : 'Todos os dias do período batem.') + '</div>';
    if (so.length) h += '<table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:var(--ink2);color:#fff"><th style="padding:6px 8px;text-align:left">Dia</th><th style="padding:6px 8px;text-align:right">Mov. extrato</th><th style="padding:6px 8px;text-align:right">Mov. registro</th><th style="padding:6px 8px;text-align:right">Saldo extrato</th><th style="padding:6px 8px;text-align:right">Saldo registro</th><th style="padding:6px 8px;text-align:right">Diferença</th></tr></thead><tbody>'
      + so.slice(0, 400).map(x => '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 8px">' + brData(x.d) + '</td><td style="padding:5px 8px;text-align:right">' + fmt(x.mr / 100) + '</td><td style="padding:5px 8px;text-align:right">' + fmt(x.mg / 100) + '</td><td style="padding:5px 8px;text-align:right">' + fmt(x.sR / 100) + '</td><td style="padding:5px 8px;text-align:right">' + fmt(x.sG / 100) + '</td><td style="padding:5px 8px;text-align:right;color:' + cor(x.dif) + ';font-weight:600">' + fmt(x.dif / 100) + '</td></tr>').join('') + '</tbody></table>';
    janela('⚖ Conciliação de saldo — ' + E((ag && ag.banco_nome) || ''), h, 980);
  };

  // ── 4) coluna Saldo (corrente) ──
  async function injetarSaldo() {
    if (!ativo()) return;
    const tbl = document.querySelector('#lancctbRegistroScrollWrap table'); if (!tbl || tbl.dataset.flSaldo === '1') return;
    tbl.dataset.flSaldo = '1';
    const conta = contaAtual();
    const { data: ag } = await _supaClient.from('agencias_bancarias').select('saldo_inicial').eq('id', conta).maybeSingle();
    const reg = await carregarRegistro(conta, '', '');
    const igR = await _lancctbFetchTudo(() => _supaClient.from('lancamentos_extrato').select('id,fonte').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('status_conciliacao', 'ignorado'));
    const ign = new Set((igR.data || []).map(x => String(x.id)));
    const fontePorId = new Map(); reg.forEach(l => fontePorId.set(String(l.id), l.fonte)); (igR.data || []).forEach(l => fontePorId.set(String(l.id), l.fonte));
    const ROT = { fluxo: 'Fluxo de Caixa', extrato_receb: 'Extrato · recebimento', extrato_compl: 'Extrato · pagamento' };
    let s = cents((ag && ag.saldo_inicial) || 0); const mapa = new Map();
    reg.forEach(l => { s += cents(l.valor_entrada) - cents(l.valor_saida); mapa.set(String(l.id), s / 100); });
    if (!document.body.contains(tbl)) return;
    // Fast Lube não tem mais Fluxo de Caixa como item: tira a coluna "Fluxo de Caixa" do Registro
    { const h0 = tbl.querySelector('thead tr'), h1 = tbl.querySelector('thead tr:nth-child(2)'), cg0 = tbl.querySelector('colgroup');
      if (h0) { const idx = [...h0.children].findIndex(t => /^fluxo de caixa/i.test((t.textContent || '').trim()));
        if (idx >= 0) { const n = h0.children.length; h0.children[idx].remove(); if (h1 && h1.children.length === n) h1.children[idx].remove(); if (cg0 && cg0.children.length === n) cg0.children[idx].remove();
          tbl.querySelectorAll('tbody tr').forEach(tr => { if (tr.children.length === n) tr.children[idx].remove(); }); } } }
    const cg = tbl.querySelector('colgroup'); if (cg && cg.children[7]) { const c = document.createElement('col'); c.style.width = '15ch'; cg.insertBefore(c, cg.children[8]); }
    const heads = tbl.querySelectorAll('thead tr');
    if (heads[0] && heads[0].children[7]) { const th = document.createElement('th'); th.style.cssText = 'padding:8px 10px;min-width:130px;text-align:right;white-space:nowrap'; th.textContent = 'Saldo'; th.title = 'Saldo da conta após este lançamento (saldo inicial da conta + movimentos em ordem de data)'; heads[0].insertBefore(th, heads[0].children[8]); }
    if (heads[1] && heads[1].children[7]) { const th = document.createElement('th'); th.style.cssText = 'padding:4px 6px'; heads[1].insertBefore(th, heads[1].children[8]); }
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const cel = tr.children[7]; if (!cel) return;
      const td = document.createElement('td'); const rid = tr.dataset.rid;
      const v = rid ? mapa.get(String(rid)) : undefined;
      td.style.cssText = 'padding:7px 10px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (v != null && v < 0 ? '#dc2626' : 'var(--slate)');
      const eIgn = rid && ign.has(String(rid));
      td.innerHTML = (v != null ? 'R$ ' + fmt(v) : (eIgn ? '<i style="font-size:11px">ignorada</i>' : ''))
        + (rid ? ' <button class="icon-btn" style="padding:0 4px" title="' + (eIgn ? 'Voltar a considerar esta linha (volta como pendente)' : 'Ignorar esta linha: fica apagada, fora do saldo e do TXT') + '" onclick="event.stopPropagation();_flIgnorarLinha(' + rid + ',' + (eIgn ? 'false' : 'true') + ')">' + (eIgn ? '↩' : '🚫') + '</button>' : '');
      if (eIgn) { tr.style.opacity = '.42'; tr.style.textDecoration = 'line-through'; tr.title = 'Linha ignorada: fora do saldo e do TXT'; }
      tr.insertBefore(td, tr.children[8]);
    });
    // coluna ORIGEM (logo depois do PF/PJ, antes do Valor): de onde veio a linha
    const cg2 = tbl.querySelector('colgroup'); if (cg2 && cg2.children[6]) { const c = document.createElement('col'); c.style.width = '17ch'; cg2.insertBefore(c, cg2.children[7]); }
    if (heads[0] && heads[0].children[6]) { const th = document.createElement('th'); th.style.cssText = 'padding:8px 8px;text-align:left;white-space:nowrap'; th.textContent = 'Origem'; th.title = 'De onde veio esta linha: Fluxo de Caixa, ou extrato bancário (recebimento / pagamento trazido pelos botões)'; heads[0].insertBefore(th, heads[0].children[7]); }
    if (heads[1] && heads[1].children[6]) { const th = document.createElement('th'); th.style.cssText = 'padding:4px 6px'; heads[1].insertBefore(th, heads[1].children[7]); }
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const cel = tr.children[6]; if (!cel) return;
      const td = document.createElement('td'); const rid = tr.dataset.rid, f = rid ? fontePorId.get(String(rid)) : null;
      td.style.cssText = 'padding:7px 8px;font-size:11.5px;white-space:nowrap;color:' + (f === 'fluxo' ? 'var(--teal)' : 'var(--slate)');
      td.textContent = f ? (ROT[f] || f) : '';
      tr.insertBefore(td, tr.children[7]);
    });
    const w = parseInt(tbl.style.minWidth) || 0; if (w) tbl.style.minWidth = (w + 140 + 130) + 'px';
  }
  let obs = null, tmr = null;
  root._flPosRender = function () {
    if (!ativo()) { if (obs) obs.disconnect(); return; }
    const alvo = document.getElementById('lancctbConteudoAba'); if (!alvo) return;
    const rodar = () => { clearTimeout(tmr); tmr = setTimeout(() => { injetarSaldo().catch(e => console.warn('Saldo (Fast Lube):', e)); }, 250); };
    if (!obs) { obs = new MutationObserver(rodar); }
    obs.disconnect(); obs.observe(alvo, { childList: true, subtree: true });
    rodar();
  };

  // ── ignorar / voltar a considerar ──
  async function marcarIgnorado(ids, ignorar) {
    if (ignorar) {
      for (let i = 0; i < ids.length; i += 200) {
        const lote = ids.slice(i, i + 200);
        const { data: cls } = await _supaClient.from('lancamentos_extrato').select('id,valor_saida,status_conciliacao').in('id', lote).in('status_conciliacao', ['conciliado', 'parcial']);
        for (const x of (cls || [])) await _lancctbDesconciliarPorId(x.id, Number(x.valor_saida) > 0); // estorna a classificação (nunca apaga) e libera NF/comprovante
      }
    }
    for (let i = 0; i < ids.length; i += 200) {
      const lote = ids.slice(i, i + 200);
      const q = _supaClient.from('lancamentos_extrato').update({ status_conciliacao: ignorar ? 'ignorado' : 'pendente' }).in('id', lote);
      const r = await (ignorar ? q : q.eq('status_conciliacao', 'ignorado'));
      if (r.error) { toast('Erro: ' + r.error.message, 'err'); return false; }
    }
    return true;
  }
  root._flIgnorarLinha = async function (id, ignorar) {
    if (!(await marcarIgnorado([id], ignorar))) return;
    toast(ignorar ? 'Linha ignorada: fora do saldo e do TXT. Rode "Trazer recebimentos e pagamentos do extrato" de novo se quiser que o extrato assuma o lugar dela.' : 'Linha voltou a ser considerada (pendente).', 'ok');
    renderLancctbRegistroContabil();
  };
  root._flIgnorarFiltradas = async function () {
    const ids = (root.__regIdsFiltrados || []).slice(); if (!ids.length) { toast('Nenhuma linha filtrada.', 'err'); return; }
    if (!confirm('Ignorar as ' + ids.length + ' linha(s) filtradas? Elas ficam apagadas, fora do saldo e do TXT (dá para voltar uma a uma).')) return;
    if (!(await marcarIgnorado(ids, true))) return;
    toast(ids.length + ' linha(s) ignorada(s) ✓', 'ok'); renderLancctbRegistroContabil();
  };

  // ── 5) excluir tudo que está filtrado ──
  root._flExcluirFiltradas = async function () {
    if (!ativo()) return;
    const ids = (root.__regIdsFiltrados || []).slice(); const n = ids.length;
    if (!n) { toast('Nenhuma linha filtrada para excluir.', 'err'); return; }
    if (_lancctbExclusaoBloqueada(eidAtual(), _lancctbRegistroMes, 'as linhas do Registro')) return;
    if (!confirm('Excluir do Registro as ' + n + ' linha(s) que estão filtradas (todas as páginas)?\n\nVale para linhas que vieram do Fluxo ou do extrato. Se alguma já estava classificada, a classificação também é desfeita.\nAs linhas do Fluxo excluídas NÃO voltam num próximo upload do mesmo fluxo.')) return;
    const dig = prompt('Para confirmar, digite a quantidade de linhas que serão excluídas (' + n + '):'); if (String(dig || '').trim() !== String(n)) { toast('Número não confere — nada foi excluído.', 'err'); return; }
    toast('Excluindo ' + n + ' linha(s)…', 'info');
    const lotes = (fn) => _lancctbEmLotesDb(ids, 200, fn);
    // linhas do Fluxo ligadas: guarda que foram excluídas (não voltam) e desliga
    const lig = await _lancctbFetchPorIds(() => _supaClient.from('fluxo_caixa_lancamentos').select('id,lancamento_extrato_id').eq('empresa_eid', EID), 'lancamento_extrato_id', ids, () => false);
    const exc = getExcl(); (lig.data || []).forEach(f => exc.add(String(f.id))); setExcl(exc);
    await lotes(l => _supaClient.from('notas_fiscais_parcelas').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('comprovantes_bancarios').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('comprovantes_recebimento').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('comprovantes_salarios').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('fluxo_caixa_lancamentos').update({ lancamento_extrato_id: null, status_associado: 'nao_associado', conta_bancaria_id: null }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('aplicacoes_financeiras_movimentos').update({ lancamento_extrato_id: null }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('lancamentos_contabeis').delete().in('lancamento_extrato_id', l));
    const r = await lotes(l => _supaClient.from('lancamentos_extrato').delete().in('id', l));
    if (r && r.error) { toast('Erro ao excluir: ' + r.error.message, 'err'); return; }
    toast(n + ' linha(s) excluída(s) do Registro ✓', 'ok');
    renderLancctbRegistroContabil();
  };
})(window);

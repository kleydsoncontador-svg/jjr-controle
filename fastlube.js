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
  // lê TODAS as linhas de uma consulta paginando pelo id (estável; o paginador geral estava cortando ~1.000 linhas)
  async function todosPorId(build) {
    const out = []; let ultimo = 0;
    for (;;) {
      const r = await build().gt('id', ultimo).order('id', { ascending: true }).limit(1000);
      if (r.error) return { data: out, error: r.error };
      const d = r.data || []; out.push(...d);
      if (d.length < 1000) break;
      ultimo = d[d.length - 1].id;
    }
    return { data: out, error: null };
  }
  const porDataId = (a, b) => (a.data_pagamento < b.data_pagamento ? -1 : a.data_pagamento > b.data_pagamento ? 1 : a.id - b.id);

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
  // Os vínculos Fluxo ↔ linha do Registro da Fast Lube são intencionais: entram na lista de associações MANUAIS (as rotinas que revalidam/soltam preservam essa lista)
  function marcarManuais(ids) {
    try {
      const k = 'lancctb_fluxo_manual_' + EID, at = new Set((S.g(k) || []).map(Number)); let mudou = false;
      ids.forEach(i => { if (!at.has(Number(i))) { at.add(Number(i)); mudou = true; } });
      if (mudou) S.s(k, [...at]);
    } catch (e) {}
  }
  function desmarcarManuais(ids) {
    try { const k = 'lancctb_fluxo_manual_' + EID, rm = new Set(ids.map(Number)); S.s(k, (S.g(k) || []).filter(x => !rm.has(Number(x)))); } catch (e) {}
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
      + '<button class="btn bo" onclick="_flNovoAjuste()" title="Inclui uma linha de ajuste (histórico: Ajuste incluído para acerto do saldo diário). Fica em amarelo, com origem Ajuste manual; você pode editar ou excluir.">➕ Adicionar ajuste</button>'
      + '<button class="btn bo" onclick="_flAlterarDataFiltradas()" title="Muda a data de todas as linhas filtradas (só as não classificadas).">📅 Alterar data das filtradas (' + n + ')</button>'
      + '<button class="btn bo" onclick="_flAbrirRelatorios()" title="Relatórios gerados pelos botões de recebimentos e pagamentos do extrato (o que foi trazido, diferenças, avisos).">📑 Relatórios</button>'
      + '<button class="btn bo" onclick="_flConciliarSaldo()" title="Compara, dia a dia, o saldo do extrato bancário com o saldo do Registro Contábil.">⚖ Conciliar saldo</button>'
      + '<button class="btn bo" onclick="_flIgnorarFiltradas()" title="Ignora todas as linhas filtradas: ficam apagadas, fora do saldo e do TXT, e o extrato pode trazer o pagamento delas de novo.">🚫 Ignorar filtradas (' + n + ')</button>'
      + '<button class="btn bo" style="color:#dc2626;border-color:#dc2626" onclick="_flExcluirFiltradas()" title="Exclui do Registro TODAS as linhas que estão filtradas na tela (não só a página atual).">🗑 Excluir filtradas (' + n + ')</button>';
  };

  // chips da regra: a Fast Lube ganha CNPJ/CPF e junta com " | " (outras empresas não mudam)
  root._flHistChipsExtra = () => (String(_lancctbEidAtual) === EID ? [{ tok: '{FLUXO_CNPJ}', rot: 'CNPJ/CPF (Fluxo)' }] : []);
  root._flHistJuntador = () => (String(_lancctbEidAtual) === EID ? ' | ' : ' ');
  // ── regra em PARTES (Fast Lube): o histórico do Registro vem separado por " | "; a regra guarda as partes escolhidas (separadas por " | ")
  //    e vale para todo lançamento cujo histórico tenha TODAS as partes, em qualquer posição.
  root._flGatilhoBate = function (g, t) {
    g = String(g || ''); t = String(t || '');
    if (g.indexOf(' | ') >= 0 && String(_lancctbEidAtual) === EID) return g.split(' | ').map(x => x.trim().toLowerCase()).filter(Boolean).every(p => t.toLowerCase().indexOf(p) >= 0);
    return t.indexOf(g) >= 0;
  };
  root._flRegraChips = function (hist) {
    const velho = document.getElementById('flGatilhoPartes'); if (velho) velho.remove();
    if (String(_lancctbEidAtual) !== EID) return;
    const partes = String(hist || '').split(' | ').map(x => x.trim()).filter(Boolean);
    if (partes.length < 2) return;
    const campo = document.getElementById('lancctbRegraHistoricoGatilho'); if (!campo) return;
    const sel = []; // índices na ordem em que foram marcados
    const wrap = document.createElement('div'); wrap.id = 'flGatilhoPartes'; wrap.style.cssText = 'margin:6px 0 4px';
    wrap.innerHTML = '<div style="font-size:11px;color:var(--slate);margin-bottom:5px">Marque as partes do histórico (separadas por <b>|</b>) que devem aparecer, na ordem que quiser. A regra vale para todo lançamento que tiver <b>todas</b> as partes marcadas, em qualquer posição do histórico.</div><div style="display:flex;flex-wrap:wrap;gap:6px"></div>';
    const lista = wrap.lastChild;
    const atualizar = () => {
      campo.value = sel.map(i => partes[i]).join(' | ');
      [...lista.children].forEach((lb, i) => { const k = sel.indexOf(i); lb.querySelector('input').checked = k >= 0; lb.querySelector('.fln').textContent = k >= 0 ? String(k + 1) : ''; lb.querySelector('.fln').style.visibility = k >= 0 ? 'visible' : 'hidden'; lb.style.borderColor = k >= 0 ? 'var(--teal)' : 'var(--border)'; });
      try { _lancctbRegraAvaliarDas(); } catch (e) {}
    };
    partes.forEach((pt, i) => {
      const lb = document.createElement('label');
      lb.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;border:1px solid var(--border);border-radius:14px;padding:3px 10px 3px 7px;font-size:11.5px;max-width:100%';
      lb.title = pt;
      lb.innerHTML = '<input type="checkbox"><span class="fln" style="min-width:12px;font-weight:700;color:var(--teal);visibility:hidden"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px">' + E(pt) + '</span>';
      lb.querySelector('input').addEventListener('change', e => { const k = sel.indexOf(i); if (e.target.checked && k < 0) sel.push(i); else if (!e.target.checked && k >= 0) sel.splice(k, 1); atualizar(); });
      lista.appendChild(lb);
    });
    campo.insertAdjacentElement('afterend', wrap);
    campo.value = ''; // começa vazio: o usuário vai clicando nas partes que quer
    try { _lancctbRegraAvaliarDas(); } catch (e) {}
  };
  // Fast Lube: avisa em que banco e período o botão de processar vai agir (só o que está na tela; sem filtro de data = a conta inteira)
  root._flAvisoEscopo = function (nome) {
    if (!ativo()) return;
    const ag = (_lancctbRegistroAgenciasCache || []).find(a => String(a.id) === contaAtual());
    const banco = ag ? (_lancctbNomeBancoExibicao(ag.banco_nome) + (ag.conta_corrente ? ' Cc ' + ag.conta_corrente : '')) : 'conta ' + contaAtual();
    let per;
    if (_lancctbRegistroDataExata) per = 'o dia ' + brData(_lancctbRegistroDataExata);
    else if (_lancctbRegistroDataDe || _lancctbRegistroDataAte) per = 'de ' + (_lancctbRegistroDataDe ? brData(_lancctbRegistroDataDe) : 'o início') + ' até ' + (_lancctbRegistroDataAte ? brData(_lancctbRegistroDataAte) : 'o fim');
    else per = 'TODO o período (sem filtro de data)';
    const rot = String(nome || '').replace('_lancctbProcessar', '').replace(/FonteRegistro/, 'Pagamentos/Recebimentos');
    toast('Processando ' + rot + ' — ' + banco + ' — ' + per, 'info');
  };
  // ── filtro "Dias": todos / conciliados / não conciliados (Fast Lube). Dia conciliado = o saldo de fechamento do dia no Registro é igual ao do extrato.
  root.__flFiltroDias = root.__flFiltroDias || '';
  root._flFiltroDiasHtml = function () {
    if (!ativo()) return '';
    const v = root.__flFiltroDias;
    return '<select class="si" data-filtro="registro-dias" title="Mostra só os lançamentos dos dias cujo saldo (Registro × extrato) já bate, ou só dos que ainda não batem" onchange="__flFiltroDias=this.value;_lancctbRegistroPagina=0;renderLancctbRegistroContabil()">'
      + '<option value=""' + (v === '' ? ' selected' : '') + '>Todos os dias</option><option value="conc"' + (v === 'conc' ? ' selected' : '') + '>Dias conciliados</option><option value="nao"' + (v === 'nao' ? ' selected' : '') + '>Dias NÃO conciliados</option></select>';
  };
  root._flPrepararFiltroDias = async function () {
    root.__flDiasConc = null;
    if (!ativo() || !root.__flFiltroDias) return;
    const conta = contaAtual();
    const { data: ag } = await _supaClient.from('agencias_bancarias').select('saldo_inicial').eq('id', conta).maybeSingle();
    const ref = await carregarRef(conta, { de: '', ate: '' }), reg = await carregarRegistro(conta, '', '');
    const mv = l => { const m = {}; l.forEach(x => { m[x.data_pagamento] = (m[x.data_pagamento] || 0) + cents(x.valor_entrada) - cents(x.valor_saida); }); return m; };
    const mr = mv(ref), mg = mv(reg); let sr = cents((ag && ag.saldo_inicial) || 0), sg = sr; const conc = [];
    [...new Set([...Object.keys(mr), ...Object.keys(mg)])].sort().forEach(d => { sr += mr[d] || 0; sg += mg[d] || 0; if (sr === sg) conc.push(d); });
    root.__flDiasConc = conc;
  };
  root.__flFiltroOrigem = root.__flFiltroOrigem || '';
  root._flLimparFiltros = function () { root.__flFiltroOrigem = ''; };
  root._flAplicaFiltroDias = function (q) {
    if (ativo() && root.__flFiltroOrigem) q = q.eq('fonte', root.__flFiltroOrigem);
    const v = root.__flFiltroDias, conc = root.__flDiasConc;
    if (!ativo() || !v || !conc) return q;
    if (v === 'conc') return conc.length ? q.in('data_pagamento', conc) : q.eq('id', -1);
    return conc.length ? q.not('data_pagamento', 'in', '(' + conc.join(',') + ')') : q;
  };
  // ── 1) subir o Fluxo ──
  root._flSubirFluxo = async function () {
    await abrirLancctbFluxoImportModal();
    const chk = document.getElementById('lancctbFluxoImportSoMesAtual'); if (chk) chk.checked = false; // o mês é o do arquivo, não o do Fechamento Atual
  };
  root._flReligarFluxo = async function () { const r = await converterFluxo(); const { data: lig } = await todosPorId(() => _supaClient.from('fluxo_caixa_lancamentos').select('id').eq('empresa_eid', EID).not('lancamento_extrato_id', 'is', null)); marcarManuais((lig || []).map(x => x.id)); return r; };
  root._flAposImportarFluxo = async function () {
    if (eidAtual() !== EID) return;
    await converterFluxo();
    try { renderLancctbRegistroContabil(); } catch (e) {}
  };
  async function converterFluxo() {
    const { data: fx, error } = await todosPorId(() => _supaClient.from('fluxo_caixa_lancamentos')
      .select('id,empresa_eid,data,descricao,valor_saida,valor_entrada,cliente_fornecedor_nome,cnpj_cpf,documento_numero,numero,parcela,port_nom,descricao_conta_origem,unidade,forma_pagamento')
      .eq('empresa_eid', EID).is('lancamento_extrato_id', null));
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
      criadas += lig.length; marcarManuais(lig.map(x => x.id));
    }
    toast('Fast Lube: ' + criadas + ' linha(s) do Fluxo levadas ao Registro' + (semBanco ? ' · ' + semBanco + ' sem banco (ex.: CARTEIRA) ficaram de fora' : '') + (porRegra ? ' · ' + porRegra + ' barradas pela regra' : '') + (jaExc ? ' · ' + jaExc + ' já excluídas por você' : '') + '.', 'ok');
    return { criadas, semBanco, porRegra };
  }

  // reescreve o histórico bancário das linhas do Registro que vieram do Fluxo (as já convertidas antes da regra de concatenação)
  root._flRefazerHistoricos = async function () {
    const { data: fx } = await todosPorId(() => _supaClient.from('fluxo_caixa_lancamentos').select('id,data,descricao,cliente_fornecedor_nome,cnpj_cpf,documento_numero,numero,parcela,descricao_conta_origem,unidade,port_nom,lancamento_extrato_id').eq('empresa_eid', EID).not('lancamento_extrato_id', 'is', null));
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
    const r = await todosPorId(() => {
      let q = _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_entrada,valor_saida,historico_bancario,documento,informacao').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('status_conciliacao', 'referencia');
      if (p.de) q = q.gte('data_pagamento', p.de); if (p.ate) q = q.lte('data_pagamento', p.ate);
      return q;
    });
    return (r.data || []).sort(porDataId);
  }
  async function carregarRegistro(conta, de, ate, extra) {
    const r = await todosPorId(() => {
      let q = _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_entrada,valor_saida,fonte,status_conciliacao').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).not('status_conciliacao', 'in', '(ignorado,reabsorvido,referencia)');
      if (de) q = q.gte('data_pagamento', de); if (ate) q = q.lte('data_pagamento', ate);
      if (extra) q = extra(q);
      return q;
    });
    return (r.data || []).sort(porDataId);
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
  // há subconjunto dos itens (em centavos) que soma exatamente o alvo? programação dinâmica (0/1); devolve os índices ou null
  function exatoSubset(itens, alvo) {
    if (alvo === 0) return [];
    if (alvo < 0 || alvo > 60000000) return null;
    const via = new Int16Array(alvo + 1).fill(-1); via[0] = -2;
    for (let k = 0; k < itens.length; k++) { const c = itens[k].c; if (c <= 0 || c > alvo) continue; for (let t = alvo; t >= c; t--) { if (via[t] === -1 && via[t - c] !== -1) via[t] = k; } }
    if (via[alvo] === -1) return null;
    const sel = []; let t = alvo; while (t > 0) { const k = via[t]; sel.push(k); t -= itens[k].c; } return sel;
  }
  // ───────── CONCILIADOR DE PAGAMENTOS (preciso: só inclui o que falta; nunca tira nada do Fluxo; tudo fica explicado no histórico) ─────────
  // Por dia: (1) saída do extrato com o MESMO valor de uma linha do Fluxo = é a mesma saída, não traz; (2) saída do extrato (Sispag) = SOMA exata de linhas do Fluxo do dia = não traz;
  // (3) idem (1) em dia próximo (±3) só quando o valor é igual; (4) o que sobra do extrato: aplicações/tarifas/impostos... entram como linha do extrato;
  // sobra de Sispag com sobra de Fluxo no mesmo dia: entra só a DIFERENÇA, como "Conciliação", com a conta explicada no histórico; sobra de Fluxo maior que a do extrato é apenas avisada.
  // categorias do extrato: sispag / outros (podem casar com o Fluxo, por valor igual ou por SOMA exata de linhas) · aplic / banco (aplicações, tarifas, IOF, impostos do banco: nunca estão no Fluxo, entram sempre)
  const catExtrato = h => { h = String(h || '').toUpperCase(); if (/SISPAG/.test(h)) return 'sispag'; if (/APLIC/.test(h)) return 'aplic'; if (/\bTAR\b|TAR\/|TARIFA|\bIOF\b|DA REC|CONTR IMP|FIN VENDA|JUROS|CUSTAS/.test(h)) return 'banco'; return 'outros'; };
  const nomeCat = ls => [...new Set(ls.map(l => String(l.r.historico_bancario || '').trim()).filter(Boolean))].slice(0, 3).join(' / ') || 'Extrato';
  const listaValores = (vs, max) => { const f = x => fmt(x / 100); return vs.length <= max ? vs.map(f).join(' + ') : vs.slice(0, max).map(f).join(' + ') + ' + … (+' + (vs.length - max) + ')'; };
  async function conciliarPagamentos(conta, p, ref, novas, simular) {
    const sh = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    // 1) refaz do zero o que este botão já gerou e ainda está pendente (o já classificado fica e o dia correspondente não é mexido)
    const ant = await todosPorId(() => _supaClient.from('lancamentos_extrato').select('id,data_pagamento,status_conciliacao,fonte,hash_dedup').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).in('fonte', ['extrato_compl', 'conciliacao']));
    const noPer = x => (!p.de || x.data_pagamento >= p.de) && (!p.ate || x.data_pagamento <= p.ate);
    const apagar = (ant.data || []).filter(x => noPer(x) && x.status_conciliacao === 'pendente').map(x => x.id);
    for (let i = 0; !simular && i < apagar.length; i += 200) {
      const lote = apagar.slice(i, i + 200);
      for (const t of ['comprovantes_bancarios', 'comprovantes_recebimento', 'comprovantes_salarios', 'notas_fiscais_parcelas']) await _supaClient.from(t).update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', lote);
      await _supaClient.from('aplicacoes_financeiras_movimentos').update({ lancamento_extrato_id: null }).in('lancamento_extrato_id', lote);
      const d = await _supaClient.from('lancamentos_extrato').delete().in('id', lote); if (d.error) { toast('Erro ao refazer as linhas anteriores: ' + d.error.message, 'err'); return null; }
    }
    // dia FECHADO = já tem linha trazida e CLASSIFICADA (não se mexe). Linha que você IGNOROU não fecha o dia: ela só impede que o mesmo item seja trazido de novo.
    const diasFechados = new Set((ant.data || []).filter(x => noPer(x) && (x.status_conciliacao === 'conciliado' || x.status_conciliacao === 'parcial')).map(x => x.data_pagamento));
    const rejeitadas = new Set((ant.data || []).filter(x => x.status_conciliacao === 'ignorado').map(x => x.hash_dedup));
    // 2) Fluxo (Registro) por dia, e saídas do extrato por dia
    const fxr = await todosPorId(() => {
      let q = _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_saida,historico_bancario').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('fonte', 'fluxo').gt('valor_saida', 0).not('status_conciliacao', 'in', '(ignorado,reabsorvido,referencia)');
      const de0 = p.de ? sh(p.de, -3) : '', ate0 = p.ate ? sh(p.ate, 3) : '';
      if (de0) q = q.gte('data_pagamento', de0); if (ate0) q = q.lte('data_pagamento', ate0);
      return q;
    });
    const fx = fxr.data || [];
    const fluxoDia = {}; fx.forEach(f => { (fluxoDia[f.data_pagamento] = fluxoDia[f.data_pagamento] || []).push({ id: f.id, c: cents(f.valor_saida), usado: false, nome: String(f.historico_bancario || '').split(' | ')[0].slice(0, 60) }); });
    const extDia = {};
    ref.filter(r => Number(r.valor_saida) > 0 && !diasFechados.has(r.data_pagamento)).forEach(r => { (extDia[r.data_pagamento] = extDia[r.data_pagamento] || []).push({ r, c: cents(r.valor_saida), cat: catExtrato(r.historico_bancario), explicada: false, via: '' }); });
    const dias = Object.keys(extDia).sort();
    const livres = d => (fluxoDia[d] || []).filter(x => !x.usado);
    const casavel = l => l.cat === 'sispag' || l.cat === 'outros';
    // passada A: mesmo dia, mesmo valor
    dias.forEach(d => extDia[d].slice().sort((a, b) => b.c - a.c).forEach(l => { if (!casavel(l)) return; const f = livres(d).find(x => x.c === l.c); if (f) { f.usado = true; l.explicada = true; l.via = 'mesmo valor'; } }));
    // passada B: mesmo dia, a saída do extrato = SOMA exata de linhas do Fluxo (qualquer tipo, menos aplicação/tarifa)
    dias.forEach(d => extDia[d].filter(l => !l.explicada && casavel(l)).sort((a, b) => b.c - a.c).forEach(l => {
      const it = livres(d); if (!it.length) return; const sel = exatoSubset(it, l.c); if (sel) { sel.forEach(k => { it[k].usado = true; }); l.explicada = true; l.via = 'soma de ' + sel.length; }
    }));
    // passada B2 (inverso): UMA linha do Fluxo = SOMA exata de várias saídas Sispag do extrato do mesmo dia (ex.: folha pagos um a um no extrato e lançados juntos no Fluxo)
    const gruposDia = {};
    dias.forEach(d => livres(d).sort((a, b) => b.c - a.c).forEach(f => {
      const cand = extDia[d].filter(l => !l.explicada && l.cat === 'sispag'); if (cand.length < 2) return;
      const sel = exatoSubset(cand, f.c); if (!sel || sel.length < 2) return;
      sel.forEach(k => { cand[k].explicada = true; cand[k].via = 'soma p/ 1 do Fluxo'; }); f.usado = true;
      (gruposDia[d] = gruposDia[d] || []).push({ v: f.c, n: f.nome, qtd: sel.length });
    }));
    // passada C: dia próximo (±3): valor igual, depois soma de linhas de UM mesmo dia
    let outroDia = 0;
    dias.forEach(d => extDia[d].filter(l => !l.explicada && casavel(l)).forEach(l => { for (const dd of [-1, 1, -2, 2, -3, 3]) { const f = livres(sh(d, dd)).find(x => x.c === l.c); if (f) { f.usado = true; l.explicada = true; l.via = 'dia ' + (dd > 0 ? '+' : '') + dd; outroDia++; return; } } }));
    dias.forEach(d => extDia[d].filter(l => !l.explicada && casavel(l)).forEach(l => { for (const dd of [-1, 1, -2, 2, -3, 3]) { const it = livres(sh(d, dd)); if (!it.length) continue; const sel = exatoSubset(it, l.c); if (sel) { sel.forEach(k => { it[k].usado = true; }); l.explicada = true; l.via = 'soma dia ' + dd; outroDia++; return; } } }));
    // 3) o que sobra
    const rel = { linhasAdicionadas: 0, conciliacoes: [], excessos: [], explicadas: 0, outroDia, dias: dias.length, fechados: [...diasFechados].length, detalhe: [] };
    dias.forEach(d => {
      const ls = extDia[d];
      const ent = { dia: d, total: ls.length, cobertas: 0, add: [], conc: null, excesso: [], grupos: gruposDia[d] || [] }; rel.detalhe.push(ent);
      const sobra = ls.filter(l => !l.explicada), diretas = sobra.filter(l => !casavel(l)), pend = sobra.filter(l => casavel(l)), R = livres(d);
      const adiciona = l => { if (rejeitadas.has('flc' + l.r.id)) { ent.ignoradas = (ent.ignoradas || 0) + 1; return; } novas.push({ r: l.r, fonte: 'extrato_compl', pref: 'flc' }); rel.linhasAdicionadas++; ent.add.push({ v: l.c, h: String(l.r.historico_bancario || '') }); };
      diretas.forEach(adiciona);                                  // aplicações, tarifas, IOF, impostos do banco: só existem no extrato
      const Lp = pend.reduce((a, l) => a + l.c, 0), Rs = R.reduce((a, l) => a + l.c, 0);
      if (pend.length && !R.length) pend.forEach(adiciona);       // sobra do extrato e nada sobrando no Fluxo: só está no extrato
      else if (pend.length && R.length) {
        const dif = Lp - Rs;
        const grupoOk = () => { pend.forEach(l => { l.explicada = true; l.via = 'grupo'; }); };
        if (dif === 0) { grupoOk(); R.forEach(x => { x.usado = true; }); }          // o que sobrou dos dois lados fecha exatamente
        else if (dif < 0) {
          const selR = exatoSubset(R, Lp);                                           // existe um subconjunto do Fluxo que fecha com TODO o extrato pendente?
          if (selR) {
            grupoOk(); const us = new Set(selR); R.forEach((x, i) => { if (us.has(i)) x.usado = true; });
            const R2 = R.filter((x, i) => !us.has(i));
            if (R2.length) { rel.excessos.push({ dia: d, dif: -R2.reduce((a, x) => a + x.c, 0), ls: 0, rs: R2.reduce((a, x) => a + x.c, 0), fluxo: R2.length }); ent.excesso = R2.map(x => ({ v: x.c, n: x.nome })); }
          } else { rel.excessos.push({ dia: d, dif, ls: Lp, rs: Rs, fluxo: R.length }); ent.excesso = R.map(x => ({ v: x.c, n: x.nome })); ent.sobraSispag = Lp; }
        } else {
          const selP = exatoSubset(pend, Rs);                                        // existe um subconjunto do extrato pendente que fecha com TODO o Fluxo sem par?
          if (selP) { R.forEach(x => { x.usado = true; }); const us = new Set(selP); pend.forEach((l, i) => { if (us.has(i)) { l.explicada = true; l.via = 'grupo'; } else adiciona(l); }); }
          else {
            const hist = nomeCat(pend) + ' (extrato: ' + listaValores(pend.map(l => l.c), 8) + '; soma do Fluxo de Caixa: ' + listaValores(R.map(x => x.c), 10) + '; diferença ' + fmt(dif / 100) + ')';
            if (rejeitadas.has('flkk' + d + '|' + dif)) ent.ignoradas = (ent.ignoradas || 0) + 1;
            else {
              novas.push({ r: { id: 'k' + d + '|' + dif, data_pagamento: d, valor_saida: dif / 100, valor_entrada: 0, historico_bancario: hist, documento: null, informacao: null }, fonte: 'conciliacao', pref: 'flk' }); rel.linhasAdicionadas++;
              rel.conciliacoes.push({ dia: d, dif, ls: Lp, rs: Rs, hist }); ent.conc = { dif, ls: Lp, rs: Rs, hist, sisp: pend.map(l => ({ v: l.c, h: String(l.r.historico_bancario || '') })), fluxo: R.map(x => ({ v: x.c, n: x.nome })) };
            }
          }
        }
      } else if (!pend.length && R.length) { rel.excessos.push({ dia: d, dif: -Rs, ls: 0, rs: Rs, fluxo: R.length }); ent.excesso = R.map(x => ({ v: x.c, n: x.nome })); }
      ent.cobertas = ls.filter(l => l.explicada).length; rel.explicadas += ent.cobertas;
      ent.outroDia = ls.filter(l => /^(dia|soma dia)/.test(l.via || '')).map(l => ({ v: l.c, h: String(l.r.historico_bancario || ''), via: l.via }));
    });
    // dias que só têm Fluxo sem par e nenhum extrato
    Object.keys(fluxoDia).filter(d => !extDia[d] && (!p.de || d >= p.de) && (!p.ate || d <= p.ate)).sort().forEach(d => { const R = livres(d); if (R.length) { rel.excessos.push({ dia: d, dif: -R.reduce((a, x) => a + x.c, 0), ls: 0, rs: R.reduce((a, x) => a + x.c, 0), fluxo: R.length }); rel.detalhe.push({ dia: d, total: 0, cobertas: 0, add: [], conc: null, excesso: R.map(x => ({ v: x.c, n: x.nome })) }); } });
    return rel;
  }
  // dias cujo saldo de fechamento (Registro × extrato) já bate E que já receberam linhas do extrato (conciliados: não se reprocessa)
  async function todosDiasConciliados(conta) {
    const { data: ag } = await _supaClient.from('agencias_bancarias').select('saldo_inicial').eq('id', conta).maybeSingle();
    const ref = await carregarRef(conta, { de: '', ate: '' }), reg = await carregarRegistro(conta, '', '');
    const mv = l => { const m = {}; l.forEach(x => { m[x.data_pagamento] = (m[x.data_pagamento] || 0) + cents(x.valor_entrada) - cents(x.valor_saida); }); return m; };
    const mr = mv(ref), mg = mv(reg), proc = new Set(reg.filter(l => ['extrato_receb', 'extrato_compl', 'conciliacao'].includes(l.fonte)).map(l => l.data_pagamento));
    let sr = cents((ag && ag.saldo_inicial) || 0), sg = sr; const out = new Set();
    [...new Set([...Object.keys(mr), ...Object.keys(mg)])].sort().forEach(d => { sr += mr[d] || 0; sg += mg[d] || 0; if (sr === sg && proc.has(d)) out.add(d); });
    return out;
  }
  async function diasJaConciliados(conta, p) {
    const todos = await todosDiasConciliados(conta);
    return [...todos].filter(d => (!p.de || d >= p.de) && (!p.ate || d <= p.ate)).sort();
  }
  // calendário do mês: clica em 2 dias (início e fim); dias já conciliados ficam travados
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function escolherPeriodo(rotulo, conta) {
    return new Promise(resolve => {
      let el = document.getElementById('mFlCal');
      if (!el) { el = document.createElement('div'); el.className = 'mb'; el.id = 'mFlCal'; el.innerHTML = '<div class="modal" style="max-width:440px;width:96%"></div>'; document.body.appendChild(el); }
      const pad = n => String(n).padStart(2, '0'), iso = (a, m, d) => a + '-' + pad(m + 1) + '-' + pad(d);
      let base = _lancctbRegistroDataDe || (/^\d{4}-\d{2}$/.test(_lancctbRegistroMes || '') ? _lancctbRegistroMes + '-01' : '');
      if (!base) { try { base = S.fechAtual() + '-01'; } catch (e) { base = new Date().toISOString().slice(0, 8) + '01'; } }
      let ano = +base.slice(0, 4), mes = +base.slice(5, 7) - 1, ini = null, fim = null, bloq = new Set(), feito = false;
      const fechar = r => { if (feito) return; feito = true; closeModal('mFlCal'); resolve(r); };
      const temBloq = (a, b) => [...bloq].some(d => d >= a && d <= b);
      const desenhar = () => {
        const ult = new Date(ano, mes + 1, 0).getDate(), ini1 = new Date(ano, mes, 1).getDay();
        let g = ''; ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(x => { g += '<div style="text-align:center;font-size:11px;color:var(--slate);padding:2px 0">' + x + '</div>'; });
        for (let i = 0; i < ini1; i++) g += '<div></div>';
        for (let d = 1; d <= ult; d++) {
          const k = iso(ano, mes, d), b = bloq.has(k), sel = k === ini || k === fim, dentro = ini && fim && k > ini && k < fim;
          const est = 'padding:9px 0;border-radius:6px;border:1px solid var(--border);font-size:13px;cursor:' + (b ? 'not-allowed' : 'pointer') + ';background:' + (sel ? 'var(--teal)' : dentro ? 'rgba(20,184,166,.25)' : b ? 'rgba(148,163,184,.25)' : 'var(--white)') + ';color:' + (sel ? '#fff' : b ? 'var(--slate)' : 'var(--ink)') + (b ? ';text-decoration:line-through' : '');
          g += '<button type="button" data-d="' + k + '" title="' + (b ? 'Dia já conciliado (o saldo do Registro já bate com o extrato)' : '') + '" style="' + est + '">' + d + (b ? '🔒' : '') + '</button>';
        }
        el.firstChild.innerHTML = '<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>📅 ' + E(rotulo) + ' do extrato — escolha o período</span><button id="flCalX" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0"><button class="btn bo bsm" id="flCalPrev">‹</button><b style="text-transform:capitalize">' + MESES[mes] + ' de ' + ano + '</b><button class="btn bo bsm" id="flCalNext">›</button></div>'
          + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">' + g + '</div>'
          + '<div style="margin-top:10px;font-size:12.5px;color:var(--slate)" id="flCalTxt">' + (ini ? 'De <b>' + brData(ini) + '</b> até <b>' + brData(fim || ini) + '</b>' : 'Clique no dia inicial e depois no dia final (um clique só = um dia).') + ' <span style="opacity:.8">· 🔒 = dia já conciliado</span></div>'
          + '<div class="ma"><button class="btn bo" id="flCalMes">Mês inteiro</button><button class="btn bp" id="flCalOk">Trazer</button><button class="btn bo" id="flCalCancel">Cancelar</button></div>';
        el.querySelector('#flCalX').onclick = el.querySelector('#flCalCancel').onclick = () => fechar(null);
        el.querySelector('#flCalPrev').onclick = () => { mes--; if (mes < 0) { mes = 11; ano--; } desenhar(); };
        el.querySelector('#flCalNext').onclick = () => { mes++; if (mes > 11) { mes = 0; ano++; } desenhar(); };
        el.querySelector('#flCalMes').onclick = () => { ini = iso(ano, mes, 1); fim = iso(ano, mes, ult); if (temBloq(ini, fim)) { toast('Há dia(s) já conciliado(s) neste mês — escolha os dias ainda não conciliados.', 'err'); ini = fim = null; } desenhar(); };
        el.querySelector('#flCalOk').onclick = () => { if (!ini) { toast('Clique no dia inicial (e no final).', 'err'); return; } fechar({ de: ini, ate: fim || ini }); };
        el.querySelectorAll('button[data-d]').forEach(b => { b.onclick = () => {
          const k = b.dataset.d; if (bloq.has(k)) { toast('Este dia já está conciliado (o saldo do Registro já bate com o extrato).', 'err'); return; }
          if (!ini || (ini && fim)) { ini = k; fim = null; } else if (k < ini) { fim = ini; ini = k; } else fim = k;
          if (fim && temBloq(ini, fim)) { toast('O período inclui dia(s) já conciliado(s).', 'err'); fim = null; }
          desenhar();
        }; });
      };
      desenhar(); openModal('mFlCal');
      todosDiasConciliados(conta).then(set => { bloq = set; if (!feito) desenhar(); }).catch(() => {});
    });
  }
  // simulação (não grava nada): devolve o que o botão de pagamentos faria no período — usada para conferir o motor
  root._flSimularPagamentos = async function (de, ate) {
    const conta = contaAtual(), p = { de, ate }, ref = await carregarRef(conta, p), novas = [];
    const rel = await conciliarPagamentos(conta, p, ref, novas, true);
    return { rel, novas: novas.map(x => ({ fonte: x.fonte, v: x.r.valor_saida, h: String(x.r.historico_bancario || '').slice(0, 110) })) };
  };
  root._flTrazerExtrato = async function (modo) {
    const comPagamentos = modo === 'pag', comRecebimentos = modo === 'receb';
    if (!ativo()) return;
    const conta = contaAtual();
    const escolha = await escolherPeriodo(comPagamentos ? 'Pagamentos' : 'Recebimentos', conta);
    if (!escolha) return;
    const p = { de: escolha.de, ate: escolha.ate };
    // trava de segurança (o calendário já marca os dias conciliados; isto cobre qualquer escape)
    const bloq = await diasJaConciliados(conta, p);
    if (bloq.length) { janela('🔒 Dia(s) já conciliado(s)', '<div style="font-size:13px">O saldo do Registro destes dias já bate com o extrato bancário, então não reprocesso:</div><div style="margin:8px 0;font-weight:700">' + bloq.slice(0, 40).map(brData).join(' · ') + '</div>', 640); return; }
    const ref = await carregarRef(conta, p);
    if (!ref.length) { toast('Não há extrato bancário (aba Extrato Bancário) desta conta no período. Suba o extrato lá primeiro.', 'err'); return; }
    const novas = []; let nEnt = 0, nSai = 0, explicadas = 0, explicadasOutroDia = 0;
    if (comRecebimentos) ref.forEach(r => { if (Number(r.valor_entrada) > 0 && !(Number(r.valor_saida) > 0)) { novas.push({ r, fonte: 'extrato_receb', pref: 'flr' }); nEnt++; } });
    let relatorio = null;
    if (comPagamentos) {
      relatorio = await conciliarPagamentos(conta, p, ref, novas);
      if (!relatorio) return;
      nSai = relatorio.linhasAdicionadas;
    }
    if (!novas.length) { registrarRel(comPagamentos, conta, p, 0, relatorio, 0); toast('Nada a trazer: o Registro já cobre este período. Veja o relatório em 📑 Relatórios.', 'info'); renderLancctbRegistroContabil(); return; }
    const rows = novas.map(({ r, fonte, pref }) => ({ empresa_eid: EID, conta_bancaria_id: Number(conta), data_pagamento: r.data_pagamento, valor_saida: r.valor_saida || 0, valor_entrada: r.valor_entrada || 0, historico_bancario: r.historico_bancario || null, documento: r.documento || null, informacao: r.informacao || null, origem_importacao: 'excel', hash_dedup: pref + r.id, fonte }));
    for (let i = 0; i < rows.length; i += 300) {
      const up = await _supaClient.from('lancamentos_extrato').upsert(rows.slice(i, i + 300), { onConflict: 'conta_bancaria_id,hash_dedup', ignoreDuplicates: true });
      if (up.error) { toast('Erro ao trazer do extrato: ' + up.error.message, 'err'); return; }
    }
    toast(comPagamentos ? 'Trazidos do extrato: ' + nSai + ' pagamento(s) que o Fluxo não cobre. Linhas já trazidas antes não duplicam.' : 'Trazidos do extrato: ' + nEnt + ' recebimento(s). Linhas já trazidas antes não duplicam.', 'ok');
    registrarRel(comPagamentos, conta, p, comPagamentos ? nSai : nEnt, relatorio, novas.reduce((a, x) => a + Number(x.r.valor_entrada || 0) + Number(x.r.valor_saida || 0), 0));
    renderLancctbRegistroContabil();
  };
  // ───────── relatórios guardados ─────────
  const RELKEY = 'fl_relatorios_' + EID;
  const lerRel = () => { try { return S.g(RELKEY) || []; } catch (e) { return []; } };
  const nomeBanco = c => { const ag = (_lancctbRegistroAgenciasCache || []).find(a => String(a.id) === String(c)); return ag ? (_lancctbNomeBancoExibicao(ag.banco_nome) + (ag.conta_corrente ? ' Cc ' + ag.conta_corrente : '')) : 'conta ' + c; };
  function registrarRel(pag, conta, p, trouxe, r, valorTotal) {
    try {
      const l = lerRel();
      l.unshift({ id: Date.now(), em: new Date().toISOString(), tipo: pag ? 'Pagamentos' : 'Recebimentos', conta, banco: nomeBanco(conta), de: p.de, ate: p.ate, trouxe, valor: valorTotal || 0, rel: r ? { dias: r.dias, explicadas: r.explicadas, outroDia: r.outroDia, linhasAdicionadas: r.linhasAdicionadas, fechados: r.fechados, detalhe: r.detalhe } : null });
      S.s(RELKEY, l.slice(0, 120));
    } catch (e) { console.warn('Relatório não guardado:', e); }
  }
  function htmlRel(x) {
    const r = x.rel, v$ = c => 'R$ ' + fmt(c / 100), li = t => '<div style="margin:2px 0 2px 14px">• ' + t + '</div>';
    if (!r) return '<div style="font-size:13px">Trouxe <b>' + x.trouxe + '</b> recebimento(s) do extrato para o Registro' + (x.valor ? ', somando <b>R$ ' + fmt(x.valor) + '</b>' : '') + '.</div>';
    const det = r.detalhe || [];
    let h = '<div style="font-size:13px;margin-bottom:8px">' + (r.linhasAdicionadas ? 'Trouxe <b>' + r.linhasAdicionadas + '</b> linha(s) do extrato para o Registro' : 'Não precisei trazer nada do extrato') + '. Nenhuma linha do Fluxo de Caixa foi tirada ou alterada.</div>';
    if (!det.length) return h + '<div style="font-size:12.5px;color:var(--slate)">Não havia saída no extrato neste período.</div>';
    det.forEach(d => {
      const alerta = d.excesso && d.excesso.length, temAdd = d.add && d.add.length || d.conc;
      const chip = alerta ? '<span style="color:#b45309;font-weight:700">⚠ precisa da sua atenção</span>' : (temAdd ? '<span style="color:var(--teal);font-weight:700">➕ trouxe linhas do extrato</span>' : '<span style="color:var(--teal);font-weight:700">✔ nada a trazer</span>');
      h += '<div style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:8px"><div style="font-weight:700;margin-bottom:4px">Dia ' + brData(d.dia) + ' — ' + chip + '</div><div style="font-size:12.5px;line-height:1.45">';
      if (d.total) h += 'O extrato tem <b>' + d.total + '</b> saída(s) neste dia. <b>' + d.cobertas + '</b> já estavam no Fluxo de Caixa (por isso não trouxe de novo, para não contar duas vezes).<br>';
      if (d.grupos && d.grupos.length) h += 'Alguns pagamentos do Fluxo aparecem no extrato <b>divididos em várias saídas Sispag</b> (a soma fecha exatamente), por isso não trouxe de novo:' + d.grupos.map(g => li(v$(g.v) + (g.n ? ' — ' + E(g.n) : '') + ' = ' + g.qtd + ' saídas do extrato')).join('') + '<br>';
      if (d.add && d.add.length) h += 'Estas saídas estavam <b>só no extrato</b> (o Fluxo não tem), então trouxe para o Registro:' + d.add.map(a => li(v$(a.v) + ' — ' + E(a.h))).join('') ;
      if (d.outroDia && d.outroDia.length) h += '<div style="margin-top:4px">Estas saídas do extrato só bateram com pagamentos do Fluxo de <b>outro dia</b> (até 3 dias de diferença):' + d.outroDia.map(o => li(v$(o.v) + ' — ' + E(o.h) + ' (' + E(o.via) + ')')).join('') + '</div>';
      if (d.ignoradas) h += '<div style="margin-top:4px;color:var(--slate)">Você tinha ignorado ' + d.ignoradas + ' linha(s) do extrato deste dia — não trouxe de novo.</div>';
      if (d.conc) h += '<div style="margin-top:4px">Os pagamentos <b>Sispag</b> do extrato (' + v$(d.conc.ls) + ') não fecharam exatamente com o que o Fluxo tem neste dia (' + v$(d.conc.rs) + '). Para o saldo do dia bater, incluí <b>uma linha de Conciliação de ' + v$(d.conc.dif) + '</b> (a diferença). O histórico dela mostra as somas.</div>';
      if (alerta) h += '<div style="margin-top:4px;color:#b45309"><b>O Fluxo tem pagamento(s) neste dia que NÃO aparece(m) no extrato do banco</b> (total ' + v$(d.excesso.reduce((a, e) => a + e.v, 0)) + '):' + d.excesso.slice(0, 12).map(e => li(v$(e.v) + (e.n ? ' — ' + E(e.n) : ''))).join('') + (d.excesso.length > 12 ? li('… e mais ' + (d.excesso.length - 12)) : '') + '<span style="color:var(--slate)">Pode ter sido pago em outro dia ou por outro banco. Se NÃO saiu deste banco, clique em 🚫 nessa linha (ela sai do saldo) — ou em ✏️ para mudar a data — e traga os pagamentos de novo.</span></div>';
      h += '</div></div>';
    });
    return h;
  }
  root._flTeste = { exatoSubset, htmlRel };
  root._flAbrirRelatorios = function () {
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    const lista = lerRel(), dt = d => { try { return new Date(d).toLocaleString('pt-BR'); } catch (e) { return ''; } };
    el.innerHTML = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px"><button class="btn bo bsm" onclick="renderLancctbRegistroContabil()">← Voltar ao Registro Contábil</button><div style="font-size:1.15rem;font-weight:700">📑 Relatórios gerados — Fast Lube</div></div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px">Cada vez que você traz recebimentos ou pagamentos do extrato, o resultado fica guardado aqui (banco, período, o que foi trazido e os avisos).</div>'
      + (lista.length ? lista.map(x => '<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:10px;max-width:1100px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:6px"><div><b>' + E(x.tipo) + ' — ' + E(x.banco) + ' — ' + brData(x.de) + (x.ate && x.ate !== x.de ? ' a ' + brData(x.ate) : '') + '</b></div><div style="font-size:11.5px;color:var(--slate)">gerado em ' + dt(x.em) + ' <button class="icon-btn" title="Apagar este relatório" onclick="_flApagarRel(' + x.id + ')">🗑</button></div></div>' + htmlRel(x) + '</div>').join('') : '<div style="color:var(--slate);padding:20px">Nenhum relatório ainda.</div>');
  };
  root._flApagarRel = function (id) { if (!confirm('Apagar este relatório?')) return; try { S.s(RELKEY, lerRel().filter(x => x.id !== id)); } catch (e) {} root._flAbrirRelatorios(); };

  // ───────── ajuste manual, editar data, excluir ajuste ─────────
  function dialogoForm(titulo, corpo, aoSalvar) {
    let el = document.getElementById('mFlForm');
    if (!el) { el = document.createElement('div'); el.className = 'mb'; el.id = 'mFlForm'; el.innerHTML = '<div class="modal" style="width:96%;max-width:520px"></div>'; document.body.appendChild(el); }
    el.firstChild.innerHTML = '<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>' + titulo + '</span><button id="flFormX" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div><div style="margin:8px 0">' + corpo + '</div><div class="ma"><button class="btn bp" id="flFormOk">Salvar</button><button class="btn bo" id="flFormCancel">Cancelar</button></div>';
    const fechar = () => closeModal('mFlForm');
    el.querySelector('#flFormX').onclick = el.querySelector('#flFormCancel').onclick = fechar;
    el.querySelector('#flFormOk').onclick = async () => { const r = await aoSalvar(el); if (r !== false) fechar(); };
    openModal('mFlForm'); return el;
  }
  const num = t => { const x = parseFloat(String(t || '').replace(/\./g, '').replace(',', '.')); return isNaN(x) ? 0 : x; };
  const ESTI = 'width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--white);color:var(--ink);font:inherit';
  const HIST_AJUSTE = 'Ajuste incluído para acerto do saldo diário';
  async function difDia(conta, dia) {
    const { data: ag } = await _supaClient.from('agencias_bancarias').select('saldo_inicial').eq('id', conta).maybeSingle();
    const ref = await carregarRef(conta, { de: '', ate: dia }), reg = await carregarRegistro(conta, '', dia);
    const liq = l => l.reduce((a, x) => a + cents(x.valor_entrada) - cents(x.valor_saida), 0);
    return liq(ref) - liq(reg); // extrato − Registro ao fim do dia (centavos)
  }
  root._flNovoAjuste = async function () {
    if (!ativo()) return;
    const conta = contaAtual();
    const dia = _lancctbRegistroDataExata || ((_lancctbRegistroDataDe && _lancctbRegistroDataDe === _lancctbRegistroDataAte) ? _lancctbRegistroDataDe : '') || _lancctbRegistroDataDe || '';
    let sug = null; if (dia) { try { sug = await difDia(conta, dia); } catch (e) {} }
    const tipo0 = sug != null && sug > 0 ? 'entrada' : 'saida', val0 = sug ? fmt(Math.abs(sug) / 100) : '';
    dialogoForm('➕ Adicionar ajuste — ' + E(nomeBanco(conta)),
      '<div style="font-size:12px;color:var(--slate);margin-bottom:8px">A linha entra com origem <b>Ajuste manual</b> (em amarelo) e dá para editar ou excluir depois.' + (sug != null ? '<br>Diferença do dia ' + brData(dia) + ' (extrato − Registro): <b>R$ ' + fmt(sug / 100) + '</b> ' + (sug === 0 ? '(já bate)' : '(valor sugerido abaixo)') : '') + '</div>'
      + '<label style="font-size:12px">Data</label><input id="flAjData" type="date" value="' + E(dia) + '" style="' + ESTI + '">'
      + '<label style="font-size:12px;display:block;margin-top:8px">Tipo</label><select id="flAjTipo" style="' + ESTI + '"><option value="saida"' + (tipo0 === 'saida' ? ' selected' : '') + '>Saída (pagamento)</option><option value="entrada"' + (tipo0 === 'entrada' ? ' selected' : '') + '>Entrada (recebimento)</option></select>'
      + '<label style="font-size:12px;display:block;margin-top:8px">Valor (R$)</label><input id="flAjValor" value="' + E(val0) + '" placeholder="0,00" style="' + ESTI + '">'
      + '<label style="font-size:12px;display:block;margin-top:8px">Histórico bancário</label><textarea id="flAjHist" rows="2" style="' + ESTI + '">' + HIST_AJUSTE + '</textarea>',
      async el => {
        const d = el.querySelector('#flAjData').value, t = el.querySelector('#flAjTipo').value, v = num(el.querySelector('#flAjValor').value), h = el.querySelector('#flAjHist').value.trim() || HIST_AJUSTE;
        if (!d) { toast('Escolha a data.', 'err'); return false; }
        if (!(v > 0)) { toast('Informe o valor.', 'err'); return false; }
        const r = await _supaClient.from('lancamentos_extrato').insert({ empresa_eid: EID, conta_bancaria_id: Number(conta), data_pagamento: d, valor_saida: t === 'saida' ? v : 0, valor_entrada: t === 'entrada' ? v : 0, historico_bancario: h, origem_importacao: 'manual', hash_dedup: 'flm' + Date.now() + Math.random().toString(36).slice(2, 7), fonte: 'ajuste_manual', status_conciliacao: 'pendente' });
        if (r.error) { toast('Erro ao incluir o ajuste: ' + r.error.message, 'err'); return false; }
        toast('Ajuste incluído ✓', 'ok'); renderLancctbRegistroContabil();
      });
  };
  root._flEditarLinha = async function (id) {
    const { data: x } = await _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte,status_conciliacao').eq('id', id).maybeSingle(); if (!x) return;
    if (x.status_conciliacao === 'conciliado' || x.status_conciliacao === 'parcial') { toast('Esta linha já está classificada. Desclassifique antes de editar.', 'err'); return; }
    const aj = x.fonte === 'ajuste_manual', ent = Number(x.valor_entrada) > 0;
    dialogoForm('✏️ Editar linha' + (aj ? ' (ajuste manual)' : ''),
      '<label style="font-size:12px">Data</label><input id="flEdData" type="date" value="' + E(x.data_pagamento) + '" style="' + ESTI + '">'
      + (aj ? '<label style="font-size:12px;display:block;margin-top:8px">Tipo</label><select id="flEdTipo" style="' + ESTI + '"><option value="saida"' + (!ent ? ' selected' : '') + '>Saída</option><option value="entrada"' + (ent ? ' selected' : '') + '>Entrada</option></select><label style="font-size:12px;display:block;margin-top:8px">Valor (R$)</label><input id="flEdValor" value="' + fmt(ent ? x.valor_entrada : x.valor_saida) + '" style="' + ESTI + '"><label style="font-size:12px;display:block;margin-top:8px">Histórico bancário</label><textarea id="flEdHist" rows="2" style="' + ESTI + '">' + E(x.historico_bancario || '') + '</textarea>' : '<div style="font-size:12px;color:var(--slate);margin-top:8px">' + E(String(x.historico_bancario || '').slice(0, 160)) + '</div>'),
      async el => {
        const d = el.querySelector('#flEdData').value; if (!d) { toast('Escolha a data.', 'err'); return false; }
        const up = { data_pagamento: d };
        if (aj) { const t = el.querySelector('#flEdTipo').value, v = num(el.querySelector('#flEdValor').value); if (!(v > 0)) { toast('Informe o valor.', 'err'); return false; } up.valor_saida = t === 'saida' ? v : 0; up.valor_entrada = t === 'entrada' ? v : 0; up.historico_bancario = el.querySelector('#flEdHist').value.trim() || HIST_AJUSTE; }
        const r = await _supaClient.from('lancamentos_extrato').update(up).eq('id', id); if (r.error) { toast('Erro ao salvar: ' + r.error.message, 'err'); return false; }
        toast('Linha atualizada ✓', 'ok'); renderLancctbRegistroContabil();
      });
  };
  root._flExcluirAjuste = async function (id) {
    if (!confirm('Excluir este ajuste manual?')) return;
    for (const t of ['comprovantes_bancarios', 'comprovantes_recebimento', 'comprovantes_salarios', 'notas_fiscais_parcelas']) await _supaClient.from(t).update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).eq('lancamento_extrato_id', id);
    await _supaClient.from('lancamentos_contabeis').delete().eq('lancamento_extrato_id', id);
    const r = await _supaClient.from('lancamentos_extrato').delete().eq('id', id).eq('fonte', 'ajuste_manual');
    if (r.error) { toast('Erro ao excluir: ' + r.error.message, 'err'); return; }
    toast('Ajuste excluído.', 'ok'); renderLancctbRegistroContabil();
  };
  root._flAlterarDataFiltradas = function () {
    const ids = (root.__regIdsFiltrados || []).slice(); if (!ids.length) { toast('Nenhuma linha filtrada.', 'err'); return; }
    dialogoForm('📅 Alterar data das filtradas (' + ids.length + ')', '<div style="font-size:12px;color:var(--slate);margin-bottom:8px">A nova data vale para as ' + ids.length + ' linha(s) filtradas (todas as páginas). Linhas já classificadas não são alteradas — desclassifique antes.</div><label style="font-size:12px">Nova data</label><input id="flBulkData" type="date" style="' + ESTI + '">',
      async el => {
        const d = el.querySelector('#flBulkData').value; if (!d) { toast('Escolha a nova data.', 'err'); return false; }
        let feitas = 0;
        for (let i = 0; i < ids.length; i += 200) { const r = await _supaClient.from('lancamentos_extrato').update({ data_pagamento: d }).in('id', ids.slice(i, i + 200)).in('status_conciliacao', ['pendente', 'ignorado']).select('id'); if (r.error) { toast('Erro: ' + r.error.message, 'err'); return false; } feitas += (r.data || []).length; }
        toast(feitas + ' linha(s) com a data alterada para ' + brData(d) + (feitas < ids.length ? ' · ' + (ids.length - feitas) + ' já classificada(s) não foram alteradas' : ''), 'ok'); renderLancctbRegistroContabil();
      });
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
    const igR = await todosPorId(() => _supaClient.from('lancamentos_extrato').select('id,fonte').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('status_conciliacao', 'ignorado'));
    const ign = new Set((igR.data || []).map(x => String(x.id)));
    const fontePorId = new Map(); reg.forEach(l => fontePorId.set(String(l.id), l.fonte)); (igR.data || []).forEach(l => fontePorId.set(String(l.id), l.fonte));
    const ROT = { fluxo: 'Fluxo de Caixa', extrato_receb: 'Extrato · recebimento', extrato_compl: 'Extrato · pagamento', conciliacao: 'Conciliação', ajuste_manual: 'Ajuste manual' };
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
        + (rid && fontePorId.get(String(rid)) === 'ajuste_manual' ? ' <button class="icon-btn" style="padding:0 3px" title="Excluir este ajuste" onclick="event.stopPropagation();_flExcluirAjuste(' + rid + ')">🗑</button>' : '')
        + (rid ? ' <button class="icon-btn" style="padding:0 4px" title="' + (eIgn ? 'Voltar a considerar esta linha (volta como pendente)' : 'Ignorar esta linha: fica apagada, fora do saldo e do TXT') + '" onclick="event.stopPropagation();_flIgnorarLinha(' + rid + ',' + (eIgn ? 'false' : 'true') + ')">' + (eIgn ? '↩' : '🚫') + '</button>' : '');
      { const dc = tr.children[1]; if (rid && dc && !dc.querySelector('.fl-ed')) dc.insertAdjacentHTML('beforeend', ' <button class="icon-btn fl-ed" style="padding:0 3px;float:right" title="Editar a data desta linha' + (fontePorId.get(String(rid)) === 'ajuste_manual' ? ' (e valor/histórico do ajuste)' : '') + '" onclick="event.stopPropagation();_flEditarLinha(' + rid + ')">✏️</button>'); } // lápis ao lado da data
      if (rid && fontePorId.get(String(rid)) === 'ajuste_manual') { tr.style.setProperty('background', 'rgba(250,204,21,.30)', 'important'); [...tr.children].forEach(c => { c.style.background = 'transparent'; }); tr.title = 'Ajuste manual (incluído para acerto do saldo diário)'; }
      if (eIgn) { tr.style.opacity = '.42'; tr.style.textDecoration = 'line-through'; tr.title = 'Linha ignorada: fora do saldo e do TXT'; }
      tr.insertBefore(td, tr.children[8]);
    });
    // coluna ORIGEM (logo depois do PF/PJ, antes do Valor): de onde veio a linha
    const cg2 = tbl.querySelector('colgroup'); if (cg2 && cg2.children[6]) { const c = document.createElement('col'); c.style.width = '17ch'; cg2.insertBefore(c, cg2.children[7]); }
    if (heads[0] && heads[0].children[6]) { const th = document.createElement('th'); th.style.cssText = 'padding:8px 8px;text-align:left;white-space:nowrap'; th.textContent = 'Origem'; th.title = 'De onde veio esta linha: Fluxo de Caixa, ou extrato bancário (recebimento / pagamento trazido pelos botões)'; heads[0].insertBefore(th, heads[0].children[7]); }
    if (heads[1] && heads[1].children[6]) { const th = document.createElement('th'); th.style.cssText = 'padding:4px 6px';
      const op = [['', 'Todas'], ['fluxo', 'Fluxo de Caixa'], ['extrato_receb', 'Extrato · recebimento'], ['extrato_compl', 'Extrato · pagamento'], ['conciliacao', 'Conciliação'], ['ajuste_manual', 'Ajuste manual']];
      th.innerHTML = '<select class="si" data-filtro="registro-origem" style="width:100%;font-size:11px" onchange="__flFiltroOrigem=this.value;_lancctbRegistroPagina=0;renderLancctbRegistroContabil()">' + op.map(o => '<option value="' + o[0] + '"' + (root.__flFiltroOrigem === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
      heads[1].insertBefore(th, heads[1].children[7]); }
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
  (function () { const st = document.createElement('style'); st.textContent = 'body[data-fl="1"] #lancctbRegraBuscaFluxoWrap{display:none !important}'; document.head.appendChild(st); })();
  root._flPosRender = function () {
    try { document.body.dataset.fl = (eidAtual() === EID) ? '1' : ''; } catch (e) {}
    try { if (eidAtual() === EID) { const b = document.querySelector('.action-bar-sticky [data-etapa="fluxo"]'); if (b) b.style.display = 'none'; } } catch (e) {}
    if (!ativo()) { if (obs) obs.disconnect(); return; }
    const alvo = document.getElementById('lancctbConteudoAba'); if (!alvo) return;
    // a barra de saldo (saldo inicial / entradas / saídas / saldo final) às vezes era apagada por uma atualização da tela que chegava depois: se ficar vazia, preenche de novo
    const garantirBarraSaldo = () => { const slot = document.getElementById('lancctbSaldoRegSlot'); if (!slot || slot.innerHTML.trim() !== '') return; const agora = Date.now(); if (agora - (root.__flSaldoTs || 0) < 3000) return; root.__flSaldoTs = agora; _lancctbRegistroSaldoPreencher(0).catch(() => {}); };
    const rodar = () => { clearTimeout(tmr); tmr = setTimeout(() => { injetarSaldo().catch(e => console.warn('Saldo (Fast Lube):', e)); garantirBarraSaldo(); try { const bf = document.querySelector('.action-bar-sticky [data-etapa="fluxo"]'); if (bf) bf.style.display = 'none'; } catch (e) {} }, 250); };
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
    if (!confirm('Excluir do Registro as ' + n + ' linha(s) que estão filtradas (todas as páginas)?\n\nVale para linhas que vieram do Fluxo ou do extrato. Se alguma já estava classificada, a classificação também é desfeita.\nAs linhas do Fluxo ligadas a elas também são apagadas do sistema (o arquivo do Fluxo continua com você, para subir de novo).')) return;
    const dig = prompt('Para confirmar, digite a quantidade de linhas que serão excluídas (' + n + '):'); if (String(dig || '').trim() !== String(n)) { toast('Número não confere — nada foi excluído.', 'err'); return; }
    toast('Excluindo ' + n + ' linha(s)…', 'info');
    const lotes = (fn) => _lancctbEmLotesDb(ids, 200, fn);
    // linhas do Fluxo ligadas: guarda que foram excluídas (não voltam) e desliga
    const lig = await _lancctbFetchPorIds(() => _supaClient.from('fluxo_caixa_lancamentos').select('id,lancamento_extrato_id').eq('empresa_eid', EID), 'lancamento_extrato_id', ids, () => false);
    const fluxoIds = (lig.data || []).map(f => f.id);
    await lotes(l => _supaClient.from('notas_fiscais_parcelas').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('comprovantes_bancarios').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('comprovantes_recebimento').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('comprovantes_salarios').update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('fluxo_caixa_lancamentos').update({ lancamento_extrato_id: null, status_associado: 'nao_associado', conta_bancaria_id: null }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('aplicacoes_financeiras_movimentos').update({ lancamento_extrato_id: null }).in('lancamento_extrato_id', l));
    await lotes(l => _supaClient.from('lancamentos_contabeis').delete().in('lancamento_extrato_id', l));
    const r = await lotes(l => _supaClient.from('lancamentos_extrato').delete().in('id', l));
    if (r && r.error) { toast('Erro ao excluir: ' + r.error.message, 'err'); return; }
    if (fluxoIds.length) {
      for (let i = 0; i < fluxoIds.length; i += 200) { const d = await _supaClient.from('fluxo_caixa_lancamentos').delete().in('id', fluxoIds.slice(i, i + 200)); if (d.error) { toast('Registro limpo, mas não consegui apagar as linhas do Fluxo: ' + d.error.message, 'err'); break; } }
      desmarcarManuais(fluxoIds);
    }
    toast(n + ' linha(s) excluída(s) do Registro' + (fluxoIds.length ? ' (e ' + fluxoIds.length + ' do Fluxo)' : '') + ' ✓', 'ok');
    renderLancctbRegistroContabil();
  };
})(window);

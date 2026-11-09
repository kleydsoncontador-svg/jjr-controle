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
      + '<button class="btn bo" style="color:#0f9d00;border-color:#14c200;font-weight:700;text-shadow:0 0 5px rgba(20,194,0,.55);box-shadow:0 0 8px rgba(20,194,0,.5)" onclick="_flTrazerExtrato(\'receb\')" title="Traz do extrato bancário desta conta (aba Extrato Bancário) todos os RECEBIMENTOS (entradas) do período para o Registro.">⬇ Trazer recebimentos do extrato</button>'
      + '<button class="btn bo" style="color:#ff2a2a;border-color:#ff2a2a;font-weight:700;text-shadow:0 0 6px #ff2a2a,0 0 12px rgba(255,42,42,.7);box-shadow:0 0 8px rgba(255,42,42,.45)" onclick="_flTrazerExtrato(\'pag\')" title="Traz do extrato os PAGAMENTOS (saídas) que o Fluxo não explica (aplicações, tarifas, impostos...), para o saldo diário bater. Nada do Fluxo é tirado.">⬇ Trazer pagamentos do extrato</button>'
      + '<button class="btn bo" onclick="_flNovoAjuste()" title="Inclui uma linha de ajuste (histórico: Ajuste incluído para acerto do saldo diário). Fica em amarelo, com origem Ajuste manual; você pode editar ou excluir.">➕ Adicionar ajuste</button>'
      + '<button class="btn bo" onclick="_flAlterarDataFiltradas()" title="Muda a data de todas as linhas filtradas (só as não classificadas).">📅 Alterar data das filtradas (' + n + ')</button>'
      + '<button class="btn bo" onclick="_flAbrirIgnorados()" title="Linhas que você ignorou (do Fluxo ou do extrato). Dá para resgatar para o mesmo banco, para o outro banco, ou mudar a data.">🚫 Ignorados</button>'
      + '<button class="btn bo" onclick="_flConsolidarTributos()" title="Soma numa linha só as parcelas de IRPJ (F03-IRPJ) e CSLL (F04-CSLL) lançadas no mesmo dia. Isto também é feito sozinho ao subir o Fluxo.">∑ Consolidar IRPJ/CSLL</button>'
      + '<button class="btn bo" onclick="_flAbrirValores()" title="Valores que foram corrigidos (✏️ ao lado do valor, ou ajuste automático de centavos em tributos): original, novo, quem e quando.">💲 Valores alterados</button>'
      + '<button class="btn bo" onclick="_flExcelRelatorio(\'todos\')" title="Gera um Excel para o cliente com 5 abas: Ajustes e conciliações, Datas alteradas, Valores alterados, Ignorados e Fluxo × extrato por dia. Mostra o que foi preciso fazer para chegar ao saldo do extrato.">📊 Excel p/ cliente</button>'
      + '<button class="btn bo" onclick="_flAbrirDatas()" title="Lançamentos cuja data foi alterada em relação à data de origem (Fluxo ou extrato): quando, quem, data original e nova. Dá para voltar à data original.">📆 Datas alteradas</button>'
      + '<button class="btn bo" onclick="_flAbrirRelatorios()" title="Relatórios gerados pelos botões de recebimentos e pagamentos do extrato (o que foi trazido, diferenças, avisos).">📑 Relatórios</button>'
      + '<button class="btn bo" onclick="_flConciliarSaldo()" title="Compara, dia a dia, o saldo do extrato bancário com o saldo do Registro Contábil.">⚖ Conciliar saldo</button>'
      + '<button class="btn bo" onclick="_flIgnorarFiltradas()" title="Ignora todas as linhas filtradas: ficam apagadas, fora do saldo e do TXT, e o extrato pode trazer o pagamento delas de novo.">🚫 Ignorar filtradas (' + n + ')</button>'
      + '<button class="btn bo" style="color:#dc2626;border-color:#dc2626" onclick="_flExcluirFiltradas()" title="Exclui do Registro TODAS as linhas que estão filtradas na tela (não só a página atual).">🗑 Excluir filtradas (' + n + ')</button>';
  };

  // chips da regra: a Fast Lube ganha CNPJ/CPF e junta com " | " (outras empresas não mudam)
  root._flHistChipsExtra = () => (String(_lancctbEidAtual) === EID ? [{ tok: '{FLUXO_CNPJ}', rot: 'CNPJ/CPF (Fluxo)' }] : []);
  root._flHistJuntador = () => ' '; // Histórico Utilizado personalizado: só espaço entre os campos (sem a barra vertical |)
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
  root.__flFiltroDif = root.__flFiltroDif || '';
  root._flLimparFiltros = function () { root.__flFiltroOrigem = ''; root.__flFiltroDif = ''; };
  const idsValorAlterado = () => { try { return [...new Set((S.g('fl_valores_alterados_163') || []).map(x => x.id).filter(Boolean))]; } catch (e) { return []; } };
  root._flAplicaFiltroDias = function (q) {
    if (ativo() && root.__flFiltroOrigem) q = q.eq('fonte', root.__flFiltroOrigem);
    if (ativo() && root.__flFiltroDif) {                                  // coluna DIF.: onde houve diferença/correção
      const f = root.__flFiltroDif, ids = idsValorAlterado();
      const marc = Object.keys((S.g('fl_dif_marcas_163') || {})).map(Number).filter(Boolean);
      if (f === 'conc') q = marc.length ? q.or('fonte.eq.conciliacao,id.in.(' + marc.join(',') + ')') : q.eq('fonte', 'conciliacao');
      else if (f === 'ajuste') q = q.eq('fonte', 'ajuste_manual');
      else if (f === 'valor') q = ids.length ? q.in('id', ids) : q.eq('id', -1);
      else { const todos = ids.concat(marc); q = todos.length ? q.or('fonte.in.(conciliacao,ajuste_manual),id.in.(' + todos.join(',') + ')') : q.in('fonte', ['conciliacao', 'ajuste_manual']); }
    }
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
  // ───────── CONSOLIDAR IRPJ / CSLL: o cliente manda "parcelas" do mesmo tributo no mesmo dia (mesmo código F03-IRPJ / F04-CSLL): vira UMA linha com a soma ─────────
  const COD_TRIB = /\bF\d{2}-(IRPJ|CSLL|CSSL)\b/i;
  async function consolidarTributos(simular) {
    const regs = (await todosPorId(() => _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,data_pagamento,valor_saida,historico_bancario,documento').eq('empresa_eid', EID).eq('fonte', 'fluxo').gt('valor_saida', 0).eq('status_conciliacao', 'pendente'))).data || [];
    const grupos = {};
    regs.forEach(r => { const m = String(r.historico_bancario || '').match(COD_TRIB); if (!m) return; const k = r.conta_bancaria_id + '|' + r.data_pagamento + '|' + m[1].toUpperCase().replace('CSSL', 'CSLL'); (grupos[k] = grupos[k] || []).push(r); });
    const lista = Object.values(grupos).filter(g => g.length > 1).map(g => g.sort((a, b) => a.id - b.id));
    if (simular || !lista.length) return lista;
    const logV = [], logC = [];
    for (const g of lista) {
      const keep = g[0], outros = g.slice(1), ids = outros.map(x => x.id), total = g.reduce((a, x) => a + cents(x.valor_saida), 0);
      const hist = String(keep.historico_bancario || '') + ' | CONSOLIDADO: ' + g.length + ' lançamentos do Fluxo somados (' + g.map(x => fmt(x.valor_saida)).join(' + ') + ')';
      const u = await _supaClient.from('lancamentos_extrato').update({ valor_saida: total / 100, historico_bancario: hist }).eq('id', keep.id).eq('status_conciliacao', 'pendente'); if (u.error) throw new Error(u.error.message);
      const lig = await _supaClient.from('fluxo_caixa_lancamentos').select('id').in('lancamento_extrato_id', ids);
      const fids = (lig.data || []).map(f => f.id);
      // as outras linhas do Fluxo ficam guardadas no sistema, mas soltas e marcadas como 'não trazer' (assim o Registro mostra UMA linha só, sem abrir em várias)
      if (fids.length) { await _supaClient.from('fluxo_caixa_lancamentos').update({ lancamento_extrato_id: null, status_associado: 'nao_associado', conta_bancaria_id: null }).in('id', fids); const ex = getExcl(); fids.forEach(i => ex.add(String(i))); setExcl(ex); desmarcarManuais(fids); }
      for (const t of ['notas_fiscais_parcelas', 'comprovantes_bancarios', 'comprovantes_recebimento', 'comprovantes_salarios']) await _supaClient.from(t).update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', ids);
      await _supaClient.from('lancamentos_contabeis').delete().in('lancamento_extrato_id', ids);
      const d = await _supaClient.from('lancamentos_extrato').delete().in('id', ids); if (d.error) throw new Error(d.error.message);
      logV.push({ id: keep.id, em: new Date().toISOString(), por: quemFez(), dia: keep.data_pagamento, nome: String(keep.historico_bancario || '').split(' | ')[0].slice(0, 60) + ' (' + (String(keep.historico_bancario || '').match(COD_TRIB) || [''])[0] + ')', de: Number(keep.valor_saida), para: total / 100, via: 'consolidação: ' + g.length + ' parcelas do mesmo tributo somadas numa linha' });
      logC.push({ em: new Date().toISOString(), dia: keep.data_pagamento, mantida: keep.id, linhas: g.map(x => ({ id: x.id, v: Number(x.valor_saida), h: x.historico_bancario, doc: x.documento })) });
    }
    gravarLogValor(logV);
    try { S.s('fl_consolidados_163', logC.concat(S.g('fl_consolidados_163') || []).slice(0, 500)); } catch (e) {}
    return lista;
  }
  root._flConsolidarTributos = async function () {
    if (!ativo()) return;
    const l = await consolidarTributos(true);
    if (!l.length) { toast('Nada a consolidar: não há IRPJ/CSLL em parcelas no mesmo dia.', 'info'); return; }
    if (!confirm('Somar em UMA linha as parcelas de IRPJ/CSLL do mesmo dia?\n\n' + l.length + ' grupo(s), ' + l.reduce((a, g) => a + g.length, 0) + ' linhas viram ' + l.length + '.\nOs valores originais ficam guardados (página Valores alterados).')) return;
    try { const r = await consolidarTributos(false); toast(r.length + ' grupo(s) consolidado(s) ✓', 'ok'); } catch (e) { toast('Erro ao consolidar: ' + e.message, 'err'); }
    renderLancctbRegistroContabil();
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
    let consol = 0; try { consol = (await consolidarTributos(false)).length; } catch (e) { console.warn('Consolidar IRPJ/CSLL:', e); }
    if (consol) toast('Fast Lube: ' + consol + ' grupo(s) de IRPJ/CSLL (parcelas do mesmo dia) somados em uma linha só.', 'ok');
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
  // Histórico das partes da folha: "Pagamento ref. Salário 06/2026 - NOME", com o tipo e a competência do RELATÓRIO DA FOLHA (aba Folha / folha_liquidos), achado por valor + nome.
  // Quem não é achado no relatório fica com um texto neutro (sem a palavra "Sispag Salários", que casava com a Regra de adiantamento de férias): o Processar FOPAG identifica depois.
  const ROT_FOLHA = { salario: 'salário', adiantamento: 'adiantamento', ferias: 'férias', rescisao: 'rescisão' }; // minúsculo: é o texto que a aba Folha reconhece para marcar a pessoa como conciliada
  async function histPartesFolha(dia, partes) {
    const normN = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
    const y = +dia.slice(0, 4), m = +dia.slice(5, 7), d = +dia.slice(8, 10), pad = n => String(n).padStart(2, '0');
    const mAnt = m === 1 ? (y - 1) + '-12' : y + '-' + pad(m - 1), mCur = y + '-' + pad(m);
    const tent = d <= 10 ? [['salario', mAnt], ['salario', mCur]] : d <= 14 ? [['salario', mAnt], ['adiantamento', mCur]] : [['adiantamento', mCur], ['adiantamento', mAnt], ['salario', mAnt]];
    const rows = (await todosPorId(() => _supaClient.from('folha_liquidos').select('id,tipo,competencia,nome,cpf,valor').eq('empresa_eid', EID).in('competencia', [mAnt, mCur]))).data || [];
    const usados = new Set();
    return partes.map(pt => {
      const nm = normN(pt.nome), v = Math.round(Number(pt.valor) * 100);
      for (const [tipo, comp] of tent.concat([['ferias', mAnt], ['ferias', mCur], ['rescisao', mAnt], ['rescisao', mCur]])) {
        let c = rows.find(r => !usados.has(r.id) && r.tipo === tipo && r.competencia === comp && Math.round(Number(r.valor) * 100) === v && (!nm || normN(r.nome).indexOf(nm) === 0 || nm.indexOf(normN(r.nome)) === 0));
        if (!c && nm) { const p1 = nm.split(' ')[0], viz = rows.filter(r => !usados.has(r.id) && r.tipo === tipo && r.competencia === comp && Math.round(Number(r.valor) * 100) === v && normN(r.nome).split(' ')[0] === p1); if (viz.length === 1) c = viz[0]; } // nome do comprovante abreviado/diferente: mesmo valor + mesmo 1º nome + único no relatório
        if (c) { usados.add(c.id); return { historico: 'Pagamento ref. ' + (ROT_FOLHA[tipo] || tipo) + ' ' + comp.slice(5) + '/' + comp.slice(0, 4) + ' - ' + c.nome, nome: c.nome, cpf: c.cpf || pt.cpf || null, tipo, competencia: comp.slice(5) + '/' + comp.slice(0, 4) }; }
      }
      return { historico: 'Folha a identificar' + (pt.nome ? ' - ' + pt.nome : ''), nome: pt.nome, cpf: pt.cpf || null, tipo: null, competencia: null };
    });
  }
  root._flHistPartesFolha = histPartesFolha;
  // Contas da folha (as mesmas de sempre): salário 187 · adiantamento de salário 724 · férias 567 · rescisão/homologação 647 · diferença = "Diferença de folha" das Contas padrão. Quem tem conta já sai classificado.
  const CONTA_FOLHA = { salario: '187', adiantamento: '724', ferias: '567', rescisao: '647' };
  async function aplicarContasFolha(dia, itens) {
    const padrao = (() => { try { return S.g('lancctb_contas_padrao_' + EID) || {}; } catch (e) { return {}; } })();
    const nums = Object.values(CONTA_FOLHA).concat(padrao.dif_folha ? [String(padrao.dif_folha)] : []);
    const pc = (await _supaClient.from('plano_contas').select('id,numero_conta').eq('empresa_eid', EID).in('numero_conta', nums)).data || [];
    const idDe = n => { const c = pc.find(x => String(x.numero_conta) === String(n)); return c ? c.id : null; };
    const comp = (+dia.slice(8, 10) > 10) ? dia.slice(5, 7) + '/' + dia.slice(0, 4) : (dia.slice(5, 7) === '01' ? '12/' + (+dia.slice(0, 4) - 1) : String(+dia.slice(5, 7) - 1).padStart(2, '0') + '/' + dia.slice(0, 4)); // dia até 10 = salário do mês anterior; depois = adiantamento do mês
    // PENSÃO ALIMENTÍCIA: quem está na lista (S 'fl_folha_pensao_163') não é diferença de folha: vai na conta 653 (Pensão alimentícia a pagar) com o histórico "Pagamento ref. pensão alimentícia - NOME"
    let pensao = []; try { pensao = S.g('fl_folha_pensao_163'); } catch (e) {}
    if (!Array.isArray(pensao) || !pensao.length) { pensao = ['TAINA RAIANE DE BRITO OLIVEIRA', 'REGILAINE ROCHA DA SILVA']; try { S.s('fl_folha_pensao_163', pensao); } catch (e) {} }
    const nN = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(), listaP = pensao.map(nN);
    const pensaoId = (await _supaClient.from('plano_contas').select('id').eq('empresa_eid', EID).eq('numero_conta', '653').maybeSingle()).data;
    return itens.map(it => {
      if (!it.tipo_folha && pensaoId && listaP.some(n => n && nN(it.nome).indexOf(n.split(' ').slice(0, 2).join(' ')) === 0)) { const h = 'Pagamento ref. pensão alimentícia - ' + (it.nome || ''); return Object.assign({}, it, { historico: h, denominacao: h, resumo: h, gatilho: h, tipo_folha: 'pensao', conta_contabil_id: pensaoId.id }); }
      if (it.tipo_folha) return Object.assign({}, it, { conta_contabil_id: idDe(CONTA_FOLHA[it.tipo_folha]) || it.conta_contabil_id || null });
      const dif = idDe(padrao.dif_folha); // sem identificar no relatório: vai para a conta da DIFERENÇA (padrão), com o texto de diferença
      return Object.assign({}, it, { historico: 'Diferença folha ' + (it.competencia || comp) + ' - ' + (it.nome || ''), denominacao: 'Diferença folha', resumo: 'Diferença folha', gatilho: 'Diferença folha', conta_contabil_id: dif || null });
    });
  }
  root._flAplicarContasFolha = aplicarContasFolha;
  async function conciliarPagamentos(conta, p, ref, novas, simular, diasSel) {
    const sh = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    // 1) refaz do zero o que este botão já gerou e ainda está pendente (o já classificado fica e o dia correspondente não é mexido)
    const ant = await todosPorId(() => _supaClient.from('lancamentos_extrato').select('id,data_pagamento,status_conciliacao,fonte,hash_dedup,valor_saida,valor_entrada').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).in('fonte', ['extrato_compl', 'conciliacao']));
    const noPer = x => (!p.de || x.data_pagamento >= p.de) && (!p.ate || x.data_pagamento <= p.ate) && (!diasSel || diasSel.has(x.data_pagamento));
    const apagar = (ant.data || []).filter(x => noPer(x) && x.status_conciliacao === 'pendente').map(x => x.id);
    for (let i = 0; !simular && i < apagar.length; i += 200) {
      const lote = apagar.slice(i, i + 200);
      for (const t of ['comprovantes_bancarios', 'comprovantes_recebimento', 'comprovantes_salarios', 'notas_fiscais_parcelas']) await _supaClient.from(t).update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).in('lancamento_extrato_id', lote);
      await _supaClient.from('aplicacoes_financeiras_movimentos').update({ lancamento_extrato_id: null }).in('lancamento_extrato_id', lote);
      const d = await _supaClient.from('lancamentos_extrato').delete().in('id', lote); if (d.error) { toast('Erro ao refazer as linhas anteriores: ' + d.error.message, 'err'); return null; }
    }
    // dia FECHADO = já tem linha trazida e CLASSIFICADA (não se mexe). Linha que você IGNOROU não fecha o dia: ela só impede que o mesmo item seja trazido de novo.
    const diasFechados = new Set((ant.data || []).filter(x => noPer(x) && (x.status_conciliacao === 'conciliado' || x.status_conciliacao === 'parcial')).map(x => x.data_pagamento));
    // O que já está no Registro e NÃO será refeito (classificado, ou fora dos dias escolhidos): conta como presente e não é trazido de novo — mas o dia continua sendo processado (novas diferenças são tratadas).
    const apagarSet = new Set(apagar), presentes = (ant.data || []).filter(x => !apagarSet.has(x.id) && x.status_conciliacao !== 'ignorado');
    const trazidas = new Set(presentes.map(x => x.hash_dedup)), presenteDia = {};
    presentes.forEach(x => { presenteDia[x.data_pagamento] = (presenteDia[x.data_pagamento] || 0) + cents(x.valor_saida) - cents(x.valor_entrada); });
    const rejeitadas = new Set((ant.data || []).filter(x => x.status_conciliacao === 'ignorado').map(x => x.hash_dedup));
    // 2) Fluxo (Registro) por dia, e saídas do extrato por dia
    const fxr = await todosPorId(() => {
      let q = _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_saida,historico_bancario,status_conciliacao').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('fonte', 'fluxo').gt('valor_saida', 0).not('status_conciliacao', 'in', '(ignorado,reabsorvido,referencia)');
      const de0 = p.de ? sh(p.de, -3) : '', ate0 = p.ate ? sh(p.ate, 3) : '';
      if (de0) q = q.gte('data_pagamento', de0); if (ate0) q = q.lte('data_pagamento', ate0);
      return q;
    });
    const fx = fxr.data || [];
    const fluxoDia = {}; fx.forEach(f => { (fluxoDia[f.data_pagamento] = fluxoDia[f.data_pagamento] || []).push({ id: f.id, c: cents(f.valor_saida), usado: false, h: String(f.historico_bancario || ''), cls: f.status_conciliacao === 'conciliado' || f.status_conciliacao === 'parcial', nome: String(f.historico_bancario || '').split(' | ')[0].slice(0, 60) }); });
    // ICMS PARTILHADO: o valor certo é o da aba ICMS (guia). A mesma NF pode ter MAIS DE UMA linha na aba (ex.: Partilhado + ST, comum em Alagoas) e pode ser paga em duas guias:
    // cada linha do Fluxo casa com UMA linha da aba (a de valor mais próximo, até R$ 1,00) e cada linha da aba é usada uma só vez. Sem par claro, o valor não é mexido.
    const ajustesIcms = [], icmsOk = new Set();
    if (typeof _lancctbIcmsLer === 'function') {
      const cacheIcms = {}, lerIcms = m => { if (!(m in cacheIcms)) { try { cacheIcms[m] = _lancctbIcmsLer(EID, m) || []; } catch (e) { cacheIcms[m] = []; } } return cacheIcms[m]; };
      const porNf = {}, itens = [];
      Object.keys(fluxoDia).filter(d => (!p.de || d >= p.de) && (!p.ate || d <= p.ate) && (!diasSel || diasSel.has(d))).forEach(d => fluxoDia[d].forEach(x => {
        if (x.cls || !/PARTILHAD/i.test(x.h)) return; const m = x.h.match(/N[úu]mero\s+(\d+)/); if (!m) return;
        const mes = d.slice(0, 7), ant = new Date(d.slice(0, 4), +d.slice(5, 7) - 2, 1), mesAnt = ant.getFullYear() + '-' + String(ant.getMonth() + 1).padStart(2, '0');
        if (!porNf[m[1]]) { porNf[m[1]] = []; [mes, mesAnt].forEach(k => lerIcms(k).forEach(z => { if (String(z.doc).replace(/\D/g, '') === m[1] && !porNf[m[1]].some(y => y.id === z.id)) porNf[m[1]].push({ id: z.id, tipo: z.tipo, v: cents(z.valor), usada: false }); })); }
        itens.push({ x, d, nf: m[1] });
      }));
      const casa = (it, exato) => { const L = (porNf[it.nf] || []).filter(r => !r.usada && r.v); let best = null; L.forEach(r => { const dif = Math.abs(r.v - it.x.c); if (exato ? dif === 0 : dif <= 100) if (!best || dif < best.dif) best = { r, dif }; }); return best; };
      itens.forEach(it => { const b = casa(it, true); if (b) { b.r.usada = true; it.fim = b.r; icmsOk.add(it.x.id); } });                // 1º: quem já tem o valor exato de uma linha da aba
      itens.forEach(it => { if (it.fim) return; const b = casa(it, false); if (!b) return; b.r.usada = true; it.fim = b.r; icmsOk.add(it.x.id); if (b.r.v !== it.x.c) { ajustesIcms.push({ id: it.x.id, dia: it.d, de: it.x.c, para: b.r.v, nome: it.x.nome, nf: it.nf, tipo: b.r.tipo, linhas: (porNf[it.nf] || []).length }); it.x.c = b.r.v; } });
    }
    const extDia = {};
    ref.filter(r => Number(r.valor_saida) > 0).forEach(r => { const ja = trazidas.has('flc' + r.id); (extDia[r.data_pagamento] = extDia[r.data_pagamento] || []).push({ r, c: cents(r.valor_saida), cat: catExtrato(r.historico_bancario), explicada: ja, via: ja ? 'já trazida' : '' }); });
    const dias = Object.keys(extDia).sort();
    const livres = d => (fluxoDia[d] || []).filter(x => !x.usado);
    const casavel = l => l.cat === 'sispag' || l.cat === 'outros';
    // passada A: mesmo dia, mesmo valor
    dias.forEach(d => extDia[d].slice().sort((a, b) => b.c - a.c).forEach(l => { if (!casavel(l) && l.cat !== 'banco') return; /* imposto/tarifa do banco também casa quando o valor é IGUAL ao de uma linha do Fluxo no mesmo dia (ex.: 'Contr Imp' = pagamento de importação já lançado no Fluxo) */ const f = livres(d).find(x => x.c === l.c); if (f) { f.usado = true; l.explicada = true; l.via = 'mesmo valor'; } }));
    // passada A2 (tributos): o cliente erra centavos (até R$ 1,00) em IPTU/ICMS/IRPJ/CSLL/PIS/COFINS/FGTS...: a saída do extrato casa com a linha do Fluxo de imposto de valor MUITO próximo.
    // O pagador que já teve esse ajuste fica na memória (fl_tol_pagadores_163) e passa a valer mesmo sem a palavra do imposto no nome.
    const TRIB = /IPTU|PREFEITURA|ICMS|IRPJ|CSLL|\bPIS\b|COFINS|FGTS|\bGPS\b|DARF|GNRE|\bINSS\b|\bISS\b|IMPOSTO|TRIBUT|\bDAS\b|\bGP\d/i;
    const chavePag = h => String(h || '').split(' | ')[0].toUpperCase().replace(/[0-9]+/g, '').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
    let tolMem = {}; try { tolMem = S.g('fl_tol_pagadores_163') || {}; } catch (e) {}
    const ajustesCent = [];
    dias.forEach(d => extDia[d].filter(l => !l.explicada && casavel(l)).sort((a, b) => b.c - a.c).forEach(l => {
      let melhor = null;
      livres(d).forEach(x => { if (x.cls) return; const dif = Math.abs(x.c - l.c); if (dif === 0 || dif > 100) return; if (!(TRIB.test(x.h) || tolMem[chavePag(x.h)])) return; if (!melhor || dif < melhor.dif) melhor = { x, dif }; });
      if (melhor) { melhor.x.usado = true; l.explicada = true; l.via = 'tributo (centavos)'; if (!icmsOk.has(melhor.x.id)) ajustesCent.push({ id: melhor.x.id, dia: d, de: melhor.x.c, para: l.c, nome: melhor.x.nome, chave: chavePag(melhor.x.h), h: melhor.x.h }); }
    }));
    // passada B: mesmo dia, a saída do extrato = SOMA exata de linhas do Fluxo (qualquer tipo, menos aplicação/tarifa)
    dias.forEach(d => extDia[d].filter(l => !l.explicada && casavel(l)).sort((a, b) => b.c - a.c).forEach(l => {
      const it = livres(d); if (!it.length) return; const sel = exatoSubset(it, l.c); if (sel) { sel.forEach(k => { it[k].usado = true; }); l.explicada = true; l.via = 'soma de ' + sel.length; }
    }));
    // passada B2 (inverso): UMA linha do Fluxo = SOMA exata de várias saídas Sispag do extrato do mesmo dia (ex.: folha pagos um a um no extrato e lançados juntos no Fluxo)
    const gruposDia = {}, composicoes = [];
    dias.forEach(d => livres(d).sort((a, b) => b.c - a.c).forEach(f => {
      const cand = extDia[d].filter(l => !l.explicada && l.cat === 'sispag'); if (cand.length < 2) return;
      const sel = exatoSubset(cand, f.c); if (!sel || sel.length < 2) return;
      sel.forEach(k => { cand[k].explicada = true; cand[k].via = 'soma p/ 1 do Fluxo'; }); f.usado = true;
      (gruposDia[d] = gruposDia[d] || []).push({ v: f.c, n: f.nome, qtd: sel.length });
      // folha/adiantamento (A01-SALARIOS) = soma EXATA de vários Sispag Salários: vira pagamento composto (1 crédito do banco com o valor cheio + 1 débito por Sispag)
      if (/A01-SALARIO|FOLHA|ADIANTAMENTO/i.test(f.h || '')) composicoes.push({ id: f.id, dia: d, total: f.c, nome: f.nome, partes: sel.map(k => ({ c: cand[k].c, h: String(cand[k].r.historico_bancario || 'Sispag Salários') })) });
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
      const adiciona = l => { if (rejeitadas.has('flc' + l.r.id)) { ent.ignoradas = (ent.ignoradas || 0) + 1; ent.ignV = (ent.ignV || 0) + l.c; return; } novas.push({ r: l.r, fonte: 'extrato_compl', pref: 'flc' }); rel.linhasAdicionadas++; ent.add.push({ v: l.c, h: String(l.r.historico_bancario || '') }); };
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
    // FECHAMENTO DO DIA: o que o extrato pagou no dia × o que o Registro terá (Fluxo + linhas trazidas). Qualquer diferença vira UMA linha de Conciliação (saída se faltou, entrada se sobrou), explicada no histórico — o saldo do dia passa a bater.
    dias.forEach(d => {
      const ent = rel.detalhe.find(x => x.dia === d); if (!ent) return;
      const A = extDia[d].reduce((a, l) => a + l.c, 0), regF = (fluxoDia[d] || []).reduce((a, x) => a + x.c, 0);
      const regN = novas.filter(n => n.r.data_pagamento === d && (n.fonte === 'extrato_compl' || n.fonte === 'conciliacao')).reduce((a, n) => a + cents(n.r.valor_saida) - cents(n.r.valor_entrada), 0);
      const dif = A - regF - regN - (presenteDia[d] || 0) - (ent.ignV || 0); if (!dif) return;
      // diferença = EXATAMENTE pagamentos do extrato que o Fluxo só tinha em OUTRO dia: traz esses pagamentos do extrato como eles são (histórico do próprio Sispag), sem 'Conciliação' nem explicação
      if (dif > 0) {
        const cand = extDia[d].filter(l => /^(dia|soma dia|soma de|soma p\/ 1|grupo)/.test(l.via || '')), selX = cand.length ? exatoSubset(cand, dif) : null;
        if (selX) { selX.forEach(k => { const l = cand[k]; if (rejeitadas.has('flc' + l.r.id)) { ent.ignoradas = (ent.ignoradas || 0) + 1; return; } novas.push({ r: l.r, fonte: 'extrato_compl', pref: 'flc' }); rel.linhasAdicionadas++; ent.add.push({ v: l.c, h: String(l.r.historico_bancario || '') }); l.via = 'trazida (valor exato)'; }); return; }
      }
      if (rejeitadas.has('flkk' + d + '|' + dif)) { ent.ignoradas = (ent.ignoradas || 0) + 1; return; }
      const outros = (ent.outroDia || []), sobras = livres(d);
      const hist = 'Conciliação do dia ' + brData(d) + ': o extrato pagou R$ ' + fmt(A / 100) + ' e o Registro tinha R$ ' + fmt((regF + regN) / 100) + ' (diferença ' + fmt(Math.abs(dif) / 100) + ').'
        + (outros.length ? ' Pagos neste dia no extrato, mas lançados no Fluxo em outro dia: ' + listaValores(outros.map(o => cents(o.v / 100)), 6) + '.' : '')
        + (sobras.length ? ' Lançados no Fluxo sem pagamento igual no extrato deste dia: ' + sobras.slice(0, 6).map(x => x.nome + ' ' + fmt(x.c / 100)).join(' + ') + (sobras.length > 6 ? ' + …' : '') + '.' : '');
      novas.push({ r: { id: 'k' + d + '|' + dif, data_pagamento: d, valor_saida: dif > 0 ? dif / 100 : 0, valor_entrada: dif < 0 ? -dif / 100 : 0, historico_bancario: hist, documento: null, informacao: null }, fonte: 'conciliacao', pref: 'flk' }); rel.linhasAdicionadas++;
      rel.conciliacoes.push({ dia: d, dif, ls: A, rs: regF + regN, hist }); ent.conc = { dif, ls: A, rs: regF + regN, hist, sisp: [], fluxo: sobras.map(x => ({ v: x.c, n: x.nome })) };
      ent.excesso = [];
      sobras.forEach(x => { rel.marcasDif = rel.marcasDif || {}; rel.marcasDif[x.id] = d; });   // linhas do Fluxo sem par que entraram na explicação da Conciliação: ficam marcadas na coluna DIF.
    });
    // dias SEM nenhuma saída no extrato mas com Fluxo sem par (inclui datas antigas, de meses sem extrato): o saldo não bate com Fluxo a mais, então entra uma Conciliação (ENTRADA) do total, explicada
    {
      const outros = {};
      if (p.de) {
        const ant = (await todosPorId(() => _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_saida,historico_bancario').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('fonte', 'fluxo').gt('valor_saida', 0).not('status_conciliacao', 'in', '(ignorado,reabsorvido,referencia)').lt('data_pagamento', sh(p.de, -3)))).data || [];
        ant.forEach(f => { (outros[f.data_pagamento] = outros[f.data_pagamento] || []).push({ id: f.id, c: cents(f.valor_saida), nome: String(f.historico_bancario || '').split(' | ')[0].slice(0, 60) }); });
        Object.keys(fluxoDia).filter(d => d < p.de).forEach(d => { const L = livres(d); if (L.length) outros[d] = (outros[d] || []).concat(L); });
      }
      Object.keys(fluxoDia).filter(d => (!p.de || d >= p.de) && (!p.ate || d <= p.ate) && (!diasSel || diasSel.has(d))).forEach(d => { const L = livres(d); if (L.length) outros[d] = L; });
      const cand = Object.keys(outros).filter(d => !extDia[d] && !diasFechados.has(d)).sort(), comExt = new Set();
      for (let k = 0; k < cand.length; k += 100) { const r = await _supaClient.from('lancamentos_extrato').select('data_pagamento').eq('empresa_eid', EID).eq('conta_bancaria_id', conta).eq('status_conciliacao', 'referencia').gt('valor_saida', 0).in('data_pagamento', cand.slice(k, k + 100)); (r.data || []).forEach(x => comExt.add(x.data_pagamento)); }
      cand.forEach(d => {
        const R = outros[d], Rs = R.reduce((a, x) => a + x.c, 0); if (!Rs) return;
        if (comExt.has(d)) { rel.excessos.push({ dia: d, dif: -Rs, ls: 0, rs: Rs, fluxo: R.length }); rel.detalhe.push({ dia: d, total: 0, cobertas: 0, add: [], conc: null, excesso: R.map(x => ({ v: x.c, n: x.nome })) }); return; }
        if (rejeitadas.has('flkk' + d + '|' + (-Rs))) return;
        const hist = 'Conciliação do dia ' + brData(d) + ': não há pagamento no extrato neste dia, mas o Fluxo lançou R$ ' + fmt(Rs / 100) + ': ' + R.slice(0, 6).map(x => x.nome + ' ' + fmt(x.c / 100)).join(' + ') + (R.length > 6 ? ' + …(' + R.length + ' lançamentos)' : '') + '.';
        novas.push({ r: { id: 'k' + d + '|' + (-Rs), data_pagamento: d, valor_saida: 0, valor_entrada: Rs / 100, historico_bancario: hist, documento: null, informacao: null }, fonte: 'conciliacao', pref: 'flk' }); rel.linhasAdicionadas++;
        rel.conciliacoes.push({ dia: d, dif: -Rs, ls: 0, rs: Rs, hist }); rel.marcasDif = rel.marcasDif || {}; R.forEach(x => { rel.marcasDif[x.id] = d; }); dias.push(d);
        rel.detalhe.push({ dia: d, total: 0, cobertas: 0, add: [], conc: { dif: -Rs, ls: 0, rs: Rs, hist, sisp: [], fluxo: R.map(x => ({ v: x.c, n: x.nome })) }, excesso: [] });
      });
    }
    if (!simular) {
      try { const dset = new Set(dias), antM = S.g('fl_dif_marcas_163') || {}, novoM = {}; Object.keys(antM).forEach(k => { if (!dset.has(antM[k])) novoM[k] = antM[k]; }); Object.assign(novoM, rel.marcasDif || {}); S.s('fl_dif_marcas_163', novoM); } catch (e) {}
    }
    rel.composicoes = composicoes;
    if (!simular && composicoes.length) {
      let nOk = 0;
      for (const cp of composicoes) {
        try {
          const { data: x } = await _supaClient.from('lancamentos_extrato').select('id,historico_bancario,composicao_tributo,status_conciliacao').eq('id', cp.id).maybeSingle();
          if (!x || x.status_conciliacao !== 'pendente' || (x.composicao_tributo || []).length) continue;
          // amarra cada Sispag ao COMPROVANTE do mesmo dia e valor (ainda não usado): traz quem foi pago (nome/CPF) para o Processar FOPAG identificar salário/diferença/adiantamento
          const cps = ((await _supaClient.from('comprovantes_bancarios').select('id,valor_pago,cliente_fornecedor_nome,cnpj_cpf,status_conciliacao,lancamento_extrato_id').eq('empresa_eid', EID).eq('data_pagamento', cp.dia)).data) || [];
          const livresC = cps.filter(c => c.status_conciliacao === 'pendente' && !c.lancamento_extrato_id), usadosC = new Set();
          const base = cp.partes.map(pt => { const c = livresC.find(k => !usadosC.has(k.id) && Math.round(Number(k.valor_pago) * 100) === pt.c); if (c) usadosC.add(c.id); return { valor: pt.c / 100, nome: c ? c.cliente_fornecedor_nome : null, cpf: c ? c.cnpj_cpf : null, comprovante_id: c ? c.id : null, h: pt.h }; });
          const hs = await histPartesFolha(cp.dia, base);
          const itens = await aplicarContasFolha(cp.dia, base.map((b, i) => ({ codigo: null, denominacao: hs[i].historico, valor: b.valor, resumo: hs[i].historico, competencia: hs[i].competencia, gatilho: hs[i].historico, historico: hs[i].historico, origem: 'folha', tipo_folha: hs[i].tipo, comprovante_id: b.comprovante_id, nome: hs[i].nome || b.nome, cpf: hs[i].cpf || b.cpf })));
          const marca = '[PAGAMENTO COMPOSTO: ' + cp.nome + ' = ' + cp.partes.length + ' Sispag Salários] ';
          const u = await _supaClient.from('lancamentos_extrato').update({ historico_bancario: marca + String(x.historico_bancario || ''), origem_importacao: 'tributo_composicao', composicao_tributo: itens }).eq('id', cp.id).eq('status_conciliacao', 'pendente');
          if (!u.error) { nOk++; try { if (typeof _lancctbPagCompostoPostarSePronto === 'function') await _lancctbPagCompostoPostarSePronto(cp.id); } catch (e) {} }
        } catch (e) { console.warn('Composição da folha:', e); }
      }
      rel.composicoesAplicadas = nOk;
    }
    rel.ajustesIcms = ajustesIcms;
    if (!simular && ajustesIcms.length) {
      const logI = [];
      for (const a of ajustesIcms) { const r = await _supaClient.from('lancamentos_extrato').update({ valor_saida: a.para / 100 }).eq('id', a.id).eq('fonte', 'fluxo').eq('status_conciliacao', 'pendente'); if (!r.error) logI.push({ id: a.id, em: new Date().toISOString(), por: quemFez(), dia: a.dia, nome: a.nome, de: a.de / 100, para: a.para / 100, via: 'ICMS Partilhado: valor confirmado na aba ICMS (NF ' + a.nf + (a.linhas > 1 ? ', ' + a.linhas + ' linhas na aba: ' + a.tipo : '') + ')' }); }
      gravarLogValor(logI);
    }
    rel.ajustesCent = ajustesCent;
    if (!simular && ajustesCent.length) {
      const log = []; let ok = 0;
      for (const a of ajustesCent) {
        const r = await _supaClient.from('lancamentos_extrato').update({ valor_saida: a.para / 100 }).eq('id', a.id).eq('fonte', 'fluxo').in('status_conciliacao', ['pendente']);
        if (!r.error) { ok++; log.push({ id: a.id, em: new Date().toISOString(), por: quemFez(), dia: a.dia, nome: a.nome, de: a.de / 100, para: a.para / 100, via: 'tributo: ajuste de centavos pelo extrato' }); tolMem[a.chave] = (tolMem[a.chave] || 0) + 1; }
      }
      try { S.s('fl_tol_pagadores_163', tolMem); } catch (e) {}
      gravarLogValor(log); rel.ajustesAplicados = ok;
    }
    return rel;
  }
  const LOGVALOR = 'fl_valores_alterados_163';
  const gravarLogValor = es => { if (!es.length) return; try { S.s(LOGVALOR, es.concat(S.g(LOGVALOR) || []).slice(0, 3000)); } catch (e) {} };
  // dias cujo saldo de fechamento (Registro × extrato) já bate E que já receberam linhas do extrato (conciliados: não se reprocessa)
  async function todosDiasConciliados(conta) {
    const { data: ag } = await _supaClient.from('agencias_bancarias').select('saldo_inicial').eq('id', conta).maybeSingle();
    const ref = await carregarRef(conta, { de: '', ate: '' }), reg = await carregarRegistro(conta, '', '');
    const mv = l => { const m = {}; l.forEach(x => { m[x.data_pagamento] = (m[x.data_pagamento] || 0) + cents(x.valor_entrada) - cents(x.valor_saida); }); return m; };
    const mr = mv(ref), mg = mv(reg), proc = new Set(reg.filter(l => ['extrato_receb', 'extrato_compl', 'conciliacao'].includes(l.fonte)).map(l => l.data_pagamento));
    let sr = cents((ag && ag.saldo_inicial) || 0), sg = sr; const out = new Set();
    [...new Set([...Object.keys(mr), ...Object.keys(mg)])].sort().forEach(d => { sr += mr[d] || 0; sg += mg[d] || 0; if (sr === sg && proc.has(d)) out.add(d); });
    out.mov = new Set(Object.keys(mr)); // dias que têm movimento no extrato
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
      let ano = +base.slice(0, 4), mes = +base.slice(5, 7) - 1, bloq = new Set(), mov = null, feito = false;
      const sel = new Set(); let ancora = null; // sel = dias escolhidos; ancora = 1º clique à espera do 2º (intervalo)
      const fechar = r => { if (feito) return; feito = true; closeModal('mFlCal'); resolve(r); };
      const diasEntre = (a, b) => { const o = []; for (let d = new Date(a + 'T12:00:00'); d.toISOString().slice(0, 10) <= b; d.setDate(d.getDate() + 1)) o.push(d.toISOString().slice(0, 10)); return o; };
      const resumo = () => {
        if (!sel.size) return 'Clique no dia inicial e depois no final (ctrl+clique escolhe dias soltos). Clique num dia escolhido para tirá-lo.';
        const ds = [...sel].sort(), seguidos = diasEntre(ds[0], ds[ds.length - 1]).filter(x => !bloq.has(x)).length === ds.length;
        return seguidos ? 'De <b>' + brData(ds[0]) + '</b> até <b>' + brData(ds[ds.length - 1]) + '</b> (' + ds.length + ' dia(s))' : '<b>' + ds.length + '</b> dia(s) escolhido(s): ' + ds.slice(0, 12).map(x => x.slice(8) + '/' + x.slice(5, 7)).join(', ') + (ds.length > 12 ? ' …' : '');
      };
      const desenhar = () => {
        const ult = new Date(ano, mes + 1, 0).getDate(), ini1 = new Date(ano, mes, 1).getDay();
        let g = ''; ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(x => { g += '<div style="text-align:center;font-size:11px;color:var(--slate);padding:2px 0">' + x + '</div>'; });
        for (let i = 0; i < ini1; i++) g += '<div></div>';
        for (let d = 1; d <= ult; d++) {
          const k = iso(ano, mes, d), b = bloq.has(k), on = sel.has(k);
          const est = 'padding:9px 0;border-radius:6px;border:1px solid var(--border);font-size:13px;cursor:' + (b ? 'not-allowed' : 'pointer') + ';background:' + (on ? 'var(--teal)' : b ? 'rgba(148,163,184,.25)' : 'var(--white)') + ';color:' + (on ? '#fff' : b ? 'var(--slate)' : 'var(--ink)') + (b ? ';text-decoration:line-through' : '');
          g += '<button type="button" data-d="' + k + '" title="' + (b ? 'Dia já conciliado (o saldo do Registro já bate com o extrato)' : (on ? 'Clique para tirar este dia' : '')) + '" style="' + est + '">' + d + (b ? '🔒' : '') + '</button>';
        }
        el.firstChild.innerHTML = '<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>📅 ' + E(rotulo) + ' do extrato — escolha os dias</span><button id="flCalX" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0"><button class="btn bo bsm" id="flCalPrev">‹</button><b style="text-transform:capitalize">' + MESES[mes] + ' de ' + ano + '</b><button class="btn bo bsm" id="flCalNext">›</button></div>'
          + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">' + g + '</div>'
          + '<div style="margin-top:10px;font-size:12.5px;color:var(--slate)" id="flCalTxt">' + resumo() + ' <span style="opacity:.8">· 🔒 = dia já conciliado</span></div>'
          + '<div class="ma"><button class="btn bo" id="flCalMes" title="Escolhe todos os dias do mês que ainda não estão conciliados (pula os 🔒). Depois você pode clicar em um dia para tirá-lo.">Mês inteiro</button><button class="btn bo" id="flCalLimpa">Limpar</button><button class="btn bp" id="flCalOk">Trazer</button><button class="btn bo" id="flCalCancel">Cancelar</button></div>';
        el.querySelector('#flCalX').onclick = el.querySelector('#flCalCancel').onclick = () => fechar(null);
        el.querySelector('#flCalPrev').onclick = () => { mes--; if (mes < 0) { mes = 11; ano--; } desenhar(); };
        el.querySelector('#flCalNext').onclick = () => { mes++; if (mes > 11) { mes = 0; ano++; } desenhar(); };
        el.querySelector('#flCalLimpa').onclick = () => { sel.clear(); ancora = null; desenhar(); };
        el.querySelector('#flCalMes').onclick = () => {
          sel.clear(); ancora = null;
          for (let d = 1; d <= ult; d++) { const k = iso(ano, mes, d); if (!bloq.has(k) && (!mov || mov.has(k))) sel.add(k); }
          if (!sel.size) toast('Neste mês todos os dias com movimento já estão conciliados.', 'info');
          desenhar();
        };
        el.querySelector('#flCalOk').onclick = () => { if (!sel.size) { toast('Escolha ao menos um dia (ou "Mês inteiro").', 'err'); return; } const ds = [...sel].sort(); fechar({ de: ds[0], ate: ds[ds.length - 1], dias: ds }); };
        el.querySelectorAll('button[data-d]').forEach(b => { b.onclick = ev => {
          const k = b.dataset.d; if (bloq.has(k)) { toast('Este dia já está conciliado (o saldo do Registro já bate com o extrato).', 'err'); return; }
          if (ev.ctrlKey || ev.metaKey) { if (sel.has(k)) sel.delete(k); else sel.add(k); ancora = null; }
          else if (ancora) { diasEntre(ancora < k ? ancora : k, ancora < k ? k : ancora).filter(x => !bloq.has(x)).forEach(x => sel.add(x)); ancora = null; }
          else if (sel.has(k)) sel.delete(k);
          else { sel.add(k); ancora = k; }
          desenhar();
        }; });
      };
      desenhar(); openModal('mFlCal');
      todosDiasConciliados(conta).then(set => { bloq = set; mov = set.mov || null; if (!feito) desenhar(); }).catch(() => {});
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
    const p = { de: escolha.de, ate: escolha.ate }, diasSel = new Set(escolha.dias || []);
    // trava de segurança (o calendário já marca os dias conciliados; isto cobre qualquer escape)
    const bloq = (await diasJaConciliados(conta, p)).filter(d => diasSel.has(d));
    if (bloq.length) { janela('🔒 Dia(s) já conciliado(s)', '<div style="font-size:13px">O saldo do Registro destes dias já bate com o extrato bancário, então não reprocesso:</div><div style="margin:8px 0;font-weight:700">' + bloq.slice(0, 40).map(brData).join(' · ') + '</div>', 640); return; }
    const ref = (await carregarRef(conta, p)).filter(r => diasSel.has(r.data_pagamento));
    if (!ref.length) { toast('Não há extrato bancário (aba Extrato Bancário) desta conta nos dias escolhidos. Suba o extrato lá primeiro.', 'err'); return; }
    const novas = []; let nEnt = 0, nSai = 0, explicadas = 0, explicadasOutroDia = 0;
    if (comRecebimentos) ref.forEach(r => { if (Number(r.valor_entrada) > 0 && !(Number(r.valor_saida) > 0)) { novas.push({ r, fonte: 'extrato_receb', pref: 'flr' }); nEnt++; } });
    let relatorio = null;
    if (comPagamentos) {
      relatorio = await conciliarPagamentos(conta, p, ref, novas, false, diasSel);
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
    if (r.ajustesCent && r.ajustesCent.length) h += '<div style="font-size:12.5px;margin:6px 0;padding:6px 8px;border:1px solid var(--border);border-radius:6px"><b>Tributos com diferença de centavos</b> (' + (r.ajustesAplicados != null ? 'valor corrigido pelo extrato' : 'simulação') + '):' + r.ajustesCent.map(a => li(brData(a.dia) + ' · ' + E(a.nome) + ': Fluxo ' + v$(a.de) + ' → extrato ' + v$(a.para))).join('') + '</div>';
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
      if (d.conc) h += '<div style="margin-top:4px">As saídas do extrato neste dia (' + v$(d.conc.ls) + ') não fecharam exatamente com o que o Registro tem (' + v$(d.conc.rs) + '). Para o saldo do dia bater, incluí <b>uma linha de Conciliação de ' + v$(Math.abs(d.conc.dif)) + (d.conc.dif < 0 ? ' como ENTRADA (o Fluxo tinha saída a mais)' : ' como saída') + '</b> (a diferença). O histórico dela explica o motivo.</div>';
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

  // ───────── datas alteradas: registro das mudanças + detecção pela data de origem ─────────
  const LOGDATA = 'fl_datas_alteradas_' + EID;
  const lerLogData = () => { try { return S.g(LOGDATA) || []; } catch (e) { return []; } };
  const gravarLogData = es => { if (!es.length) return; try { S.s(LOGDATA, es.concat(lerLogData()).slice(0, 3000)); } catch (e) {} };
  const quemFez = () => { try { return (currentUser && (currentUser.nome || currentUser.name || currentUser.email)) || ''; } catch (e) { return ''; } };
  const entLog = (x, para, via) => ({ id: x.id, em: new Date().toISOString(), por: quemFez(), conta: x.conta_bancaria_id, fonte: x.fonte || '', v: Number(x.valor_entrada) > 0 ? Number(x.valor_entrada) : -Number(x.valor_saida || 0), h: String(x.historico_bancario || '').slice(0, 200), de: x.data_pagamento, para, via });
  root.__flDat = root.__flDat || { rows: [], f: { banco: '', via: '', texto: '' } };
  root._flAbrirDatas = async function () {
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    el.innerHTML = '<div style="padding:20px;color:var(--slate)">Procurando as datas alteradas…</div>';
    root.__flDat.rows = await carregarDatasAlteradas(); desenharDatas();
  };
  async function carregarDatasAlteradas() {
    const regs = (await todosPorId(() => _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte,hash_dedup,status_conciliacao,updated_at').eq('empresa_eid', EID).in('conta_bancaria_id', [1, 4]).in('fonte', ['fluxo', 'extrato_receb', 'extrato_compl', 'ajuste_manual']))).data || [];
    const idsFx = [], idsRef = [];
    regs.forEach(r => { const h = r.hash_dedup || ''; if (h.indexOf('flx') === 0) idsFx.push(+h.slice(3)); else if (h.indexOf('flr') === 0 || h.indexOf('flc') === 0) idsRef.push(+h.slice(3)); });
    const dataFx = new Map(), dataRef = new Map();
    for (let i = 0; i < idsFx.length; i += 200) { const r = await _supaClient.from('fluxo_caixa_lancamentos').select('id,data').in('id', idsFx.slice(i, i + 200)); (r.data || []).forEach(x => dataFx.set(x.id, x.data)); }
    for (let i = 0; i < idsRef.length; i += 200) { const r = await _supaClient.from('lancamentos_extrato').select('id,data_pagamento').in('id', idsRef.slice(i, i + 200)); (r.data || []).forEach(x => dataRef.set(x.id, x.data_pagamento)); }
    const logPorLinha = new Map(); lerLogData().forEach(e => { if (!logPorLinha.has(e.id)) logPorLinha.set(e.id, e); });
    const lista = [];
    regs.forEach(r => {
      const h = r.hash_dedup || ''; let orig = null;
      if (h.indexOf('flx') === 0) orig = dataFx.get(+h.slice(3)); else if (h.indexOf('flr') === 0 || h.indexOf('flc') === 0) orig = dataRef.get(+h.slice(3));
      const l = logPorLinha.get(r.id);
      if (!orig && l) orig = l.de;                                  // ajuste manual: só pelo registro de alterações
      if (!orig || orig === r.data_pagamento) return;
      lista.push({ id: r.id, em: (l && l.em) || r.updated_at, por: (l && l.por) || '', via: (l && l.via) || 'detectada (data diferente da origem)', de: orig, para: r.data_pagamento, conta: r.conta_bancaria_id, fonte: r.fonte, v: Number(r.valor_entrada) > 0 ? Number(r.valor_entrada) : -Number(r.valor_saida || 0), h: String(r.historico_bancario || ''), status: r.status_conciliacao });
    });
    return lista.sort((a, b) => String(b.em || '').localeCompare(String(a.em || '')));
  }
  function datasFiltradas() {
    const f = root.__flDat.f, t = norm(f.texto);
    return root.__flDat.rows.filter(x => (!f.banco || String(x.conta) === f.banco) && (!f.via || (f.via === 'det' ? /^detectada/.test(x.via) : !/^detectada/.test(x.via))) && (!t || norm(x.h).indexOf(t) >= 0));
  }
  function desenharDatas() {
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    const g = root.__flDat, lista = datasFiltradas(), mostra = lista.slice(0, 400), f = g.f, dt = d => { try { return new Date(d).toLocaleString('pt-BR'); } catch (e) { return ''; } };
    const est = 'padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--white);color:var(--ink)';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px"><button class="btn bo bsm" onclick="renderLancctbRegistroContabil()">← Voltar ao Registro Contábil</button><div style="font-size:1.15rem;font-weight:700">📆 Lançamentos com data alterada — Fast Lube</div></div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px;max-width:1000px">Mostra as linhas do Registro cuja data é diferente da data de origem (a do Fluxo de Caixa ou a do extrato). Quando a alteração foi feita pelo site, aparece quem fez e como. Dá para <b>voltar à data original</b> (só linhas ainda não classificadas).</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><select style="' + est + '" onchange="__flDat.f.banco=this.value;_flDatasRedesenhar()"><option value="">Todos os bancos</option><option value="1"' + (f.banco === '1' ? ' selected' : '') + '>Itaú</option><option value="4"' + (f.banco === '4' ? ' selected' : '') + '>Banco do Brasil</option></select>'
      + '<select style="' + est + '" onchange="__flDat.f.via=this.value;_flDatasRedesenhar()"><option value="">Todas</option><option value="reg"' + (f.via === 'reg' ? ' selected' : '') + '>Feitas pelo site (com quem/quando)</option><option value="det"' + (f.via === 'det' ? ' selected' : '') + '>Detectadas pela data de origem</option></select>'
      + '<input style="' + est + ';width:240px" placeholder="🔎 texto do histórico" value="' + E(f.texto) + '" oninput="__flDat.f.texto=this.value;_flDatasRedesenhar(true)">'
      + '<button class="btn bo bsm" onclick="_flReverterDatas()" ' + (lista.some(x => x.status === 'pendente' || x.status === 'ignorado') ? '' : 'disabled') + ' title="Volta TODAS as linhas filtradas (ainda não classificadas) para a data original">↩ Voltar à data original (' + lista.filter(x => x.status === 'pendente' || x.status === 'ignorado').length + ')</button></div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:4px">' + lista.length + ' linha(s) com data alterada' + (lista.length > mostra.length ? ' — mostrando as primeiras ' + mostra.length : '') + '</div>'
      + '<div style="overflow:auto;max-height:calc(100vh - 360px);border:1px solid var(--border);border-radius:6px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead style="position:sticky;top:0;background:var(--ink2);color:#fff"><tr><th style="padding:6px 8px;text-align:left">Alterada em</th><th style="padding:6px 8px;text-align:left">Por</th><th style="padding:6px 8px;text-align:left">Banco</th><th style="padding:6px 8px;text-align:left">Origem</th><th style="padding:6px 8px;text-align:right">Valor</th><th style="padding:6px 8px;text-align:left">Histórico bancário</th><th style="padding:6px 8px;text-align:left;white-space:nowrap">Data original → Data atual</th><th style="padding:6px 8px;text-align:left">Como</th><th style="padding:6px 8px"></th></tr></thead><tbody>'
      + (mostra.length ? mostra.map(x => '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 8px;white-space:nowrap;font-size:11.5px">' + dt(x.em) + '</td><td style="padding:5px 8px;font-size:11.5px">' + E(x.por || '—') + '</td><td style="padding:5px 8px;white-space:nowrap">' + E(BANCOS[String(x.conta)] || x.conta) + '</td><td style="padding:5px 8px;white-space:nowrap;font-size:11.5px">' + E(ORIGENS[x.fonte] || '—') + '</td><td style="padding:5px 8px;text-align:right;white-space:nowrap;color:' + (x.v >= 0 ? 'var(--teal)' : '#dc2626') + '">' + (x.v >= 0 ? '+' : '−') + ' R$ ' + fmt(Math.abs(x.v)) + '</td><td style="padding:5px 8px;font-size:11.5px;line-height:1.3;max-width:640px">' + E(x.h) + '</td><td style="padding:5px 8px;white-space:nowrap"><b>' + brData(x.de) + '</b> → <b>' + brData(x.para) + '</b></td><td style="padding:5px 8px;font-size:11.5px">' + E(x.via) + '</td><td style="padding:5px 8px">' + ((x.status === 'pendente' || x.status === 'ignorado') ? '<button class="btn bo bsm" title="Voltar esta linha à data original" onclick="_flReverterDatas(' + x.id + ')">↩</button>' : '<span title="Já classificada: desclassifique para mudar a data" style="font-size:11px;color:var(--slate)">classificada</span>') + '</td></tr>').join('') : '<tr><td colspan="9" style="padding:20px;text-align:center;color:var(--slate)">Nenhuma linha com data diferente da origem.</td></tr>')
      + '</tbody></table></div>';
  }
  root._flDatasRedesenhar = function (mantemFoco) {
    const a = document.activeElement, ph = a && a.getAttribute && a.getAttribute('placeholder'), pos = a && a.selectionStart; desenharDatas();
    if (mantemFoco && ph) { const n = [...document.querySelectorAll('#lancctbConteudoAba input')].find(i => i.getAttribute('placeholder') === ph); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
  };
  root._flReverterDatas = async function (idUnico) {
    const alvo = (idUnico ? root.__flDat.rows.filter(x => x.id === idUnico) : datasFiltradas()).filter(x => x.status === 'pendente' || x.status === 'ignorado');
    if (!alvo.length) { toast('Nenhuma linha para reverter.', 'err'); return; }
    if (!confirm('Voltar ' + alvo.length + ' linha(s) para a data original?')) return;
    let feitas = 0; const logs = [];
    for (let i = 0; i < alvo.length; i += 20) {
      await Promise.all(alvo.slice(i, i + 20).map(async x => { const r = await _supaClient.from('lancamentos_extrato').update({ data_pagamento: x.de }).eq('id', x.id).in('status_conciliacao', ['pendente', 'ignorado']).select('id'); if (!r.error && (r.data || []).length) { feitas++; logs.push({ id: x.id, em: new Date().toISOString(), por: quemFez(), conta: x.conta, fonte: x.fonte, v: x.v, h: x.h.slice(0, 200), de: x.para, para: x.de, via: 'voltou à data original' }); } }));
    }
    gravarLogData(logs);
    toast(feitas + ' linha(s) voltaram à data original ✓', 'ok'); root._flAbrirDatas();
  };

  // ───────── página "Ignorados": resgatar linhas ignoradas (mesmo banco, outro banco, outra data) ─────────
  const BANCOS = { '1': 'Itaú', '4': 'Banco do Brasil' };
  const ORIGENS = { fluxo: 'Fluxo de Caixa', extrato_receb: 'Extrato · recebimento', extrato_compl: 'Extrato · pagamento', conciliacao: 'Conciliação', ajuste_manual: 'Ajuste manual' };
  root.__flIgn = root.__flIgn || { rows: [], f: { banco: '', origem: '', texto: '', de: '', ate: '', valor: '' }, sel: new Set() };
  root._flAbrirIgnorados = async function () {
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    el.innerHTML = '<div style="padding:20px;color:var(--slate)">Carregando as linhas ignoradas…</div>';
    const r = await todosPorId(() => _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte').eq('empresa_eid', EID).in('conta_bancaria_id', [1, 4]).eq('status_conciliacao', 'ignorado'));
    root.__flIgn.rows = (r.data || []).sort(porDataId); root.__flIgn.sel = new Set(); desenharIgnorados();
  };
  function ignFiltradas() {
    const f = root.__flIgn.f, t = norm(f.texto), v = f.valor ? num(f.valor) : 0;
    return root.__flIgn.rows.filter(x => (!f.banco || String(x.conta_bancaria_id) === f.banco) && (!f.origem || (x.fonte || '') === f.origem) && (!f.de || x.data_pagamento >= f.de) && (!f.ate || x.data_pagamento <= f.ate)
      && (!t || norm(x.historico_bancario).indexOf(t) >= 0) && (!v || Math.abs(Number(x.valor_saida || x.valor_entrada) - v) < 0.005));
  }
  function desenharIgnorados() {
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    const g = root.__flIgn, lista = ignFiltradas(), mostra = lista.slice(0, 400), f = g.f;
    const sel = x => 'style="padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--white);color:var(--ink)"';
    const opB = '<option value="">Todos os bancos</option>' + Object.keys(BANCOS).map(k => '<option value="' + k + '"' + (f.banco === k ? ' selected' : '') + '>' + BANCOS[k] + '</option>').join('');
    const opO = '<option value="">Todas as origens</option>' + Object.keys(ORIGENS).map(k => '<option value="' + k + '"' + (f.origem === k ? ' selected' : '') + '>' + ORIGENS[k] + '</option>').join('');
    let h = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px"><button class="btn bo bsm" onclick="renderLancctbRegistroContabil()">← Voltar ao Registro Contábil</button><div style="font-size:1.15rem;font-weight:700">🚫 Lançamentos ignorados — Fast Lube</div></div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px;max-width:980px">Aqui ficam as linhas que você ignorou (fora do saldo e do TXT). Se ela faltar em outro banco, ou em outra data, <b>resgate</b>: ela volta como pendente no banco e na data que você escolher.</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">'
      + '<select ' + sel() + ' onchange="__flIgn.f.banco=this.value;_flIgnRedesenhar()">' + opB + '</select><select ' + sel() + ' onchange="__flIgn.f.origem=this.value;_flIgnRedesenhar()">' + opO + '</select>'
      + '<input style="width:220px;padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--white);color:var(--ink)" placeholder="🔎 texto do histórico" value="' + E(f.texto) + '" oninput="__flIgn.f.texto=this.value;_flIgnRedesenhar(true)"><input style="width:110px;padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--white);color:var(--ink)" placeholder="valor" value="' + E(f.valor) + '" oninput="__flIgn.f.valor=this.value;_flIgnRedesenhar(true)">'
      + '<span style="font-size:11.5px;color:var(--slate)">de</span><input type="date" ' + sel() + ' value="' + E(f.de) + '" onchange="__flIgn.f.de=this.value;_flIgnRedesenhar()"><span style="font-size:11.5px;color:var(--slate)">até</span><input type="date" ' + sel() + ' value="' + E(f.ate) + '" onchange="__flIgn.f.ate=this.value;_flIgnRedesenhar()"></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;max-width:980px"><b style="font-size:12.5px">Resgatar selecionadas (' + g.sel.size + '):</b>'
      + '<select id="flIgnBanco" ' + sel() + '><option value="">no mesmo banco</option><option value="1">para o Itaú</option><option value="4">para o Banco do Brasil</option></select>'
      + '<span style="font-size:11.5px;color:var(--slate)">na data</span><input id="flIgnData" type="date" ' + sel() + ' title="Deixe em branco para manter a data da linha"><span style="font-size:11px;color:var(--slate)">(em branco = mantém a data)</span>'
      + '<button class="btn bp bsm" onclick="_flResgatar()" ' + (g.sel.size ? '' : 'disabled') + '>↩ Resgatar</button></div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:4px">' + lista.length + ' linha(s) ignorada(s)' + (lista.length > mostra.length ? ' — mostrando as primeiras ' + mostra.length + ' (refine o filtro)' : '') + '</div>'
      + '<div style="overflow:auto;max-height:calc(100vh - 380px);border:1px solid var(--border);border-radius:6px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead style="position:sticky;top:0;background:var(--ink2);color:#fff"><tr><th style="padding:6px 8px"><input type="checkbox" onchange="_flIgnSelTodos(this.checked)"></th><th style="padding:6px 8px;text-align:left">Banco</th><th style="padding:6px 8px;text-align:left">Data</th><th style="padding:6px 8px;text-align:left">Origem</th><th style="padding:6px 8px;text-align:right">Valor</th><th style="padding:6px 8px;text-align:left">Histórico bancário</th><th style="padding:6px 8px"></th></tr></thead><tbody>'
      + (mostra.length ? mostra.map(x => { const ent = Number(x.valor_entrada) > 0; return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 8px;text-align:center"><input type="checkbox" ' + (g.sel.has(x.id) ? 'checked' : '') + ' onchange="_flIgnSel(' + x.id + ',this.checked)"></td><td style="padding:5px 8px;white-space:nowrap">' + E(BANCOS[String(x.conta_bancaria_id)] || x.conta_bancaria_id) + '</td><td style="padding:5px 8px;white-space:nowrap">' + brData(x.data_pagamento) + '</td><td style="padding:5px 8px;white-space:nowrap;font-size:11.5px">' + E(ORIGENS[x.fonte] || '—') + '</td><td style="padding:5px 8px;text-align:right;white-space:nowrap;color:' + (ent ? 'var(--teal)' : '#dc2626') + '">' + (ent ? '+' : '−') + ' R$ ' + fmt(ent ? x.valor_entrada : x.valor_saida) + '</td><td style="padding:5px 8px;font-size:11.5px;line-height:1.3;max-width:760px">' + E(String(x.historico_bancario || '')) + '</td><td style="padding:5px 8px;text-align:center"><button class="btn bo bsm" title="Resgatar só esta linha, no mesmo banco e na mesma data" onclick="_flResgatar(' + x.id + ')">↩</button></td></tr>'; }).join('') : '<tr><td colspan="7" style="padding:20px;text-align:center;color:var(--slate)">Nenhuma linha ignorada com esses filtros.</td></tr>')
      + '</tbody></table></div>';
    el.innerHTML = h;
  }
  root._flIgnRedesenhar = function (mantemFoco) {
    const a = document.activeElement, id = a && a.getAttribute && a.getAttribute('placeholder'), pos = a && a.selectionStart; desenharIgnorados();
    if (mantemFoco && id) { const n = [...document.querySelectorAll('#lancctbConteudoAba input')].find(i => i.getAttribute('placeholder') === id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
  };
  root._flIgnSel = function (id, on) { const s0 = root.__flIgn.sel; if (on) s0.add(id); else s0.delete(id); const b = document.querySelector('#lancctbConteudoAba b'); desenharIgnorados(); };
  root._flIgnSelTodos = function (on) { const s0 = root.__flIgn.sel; ignFiltradas().slice(0, 400).forEach(x => { if (on) s0.add(x.id); else s0.delete(x.id); }); desenharIgnorados(); };
  root._flResgatar = async function (idUnico) {
    const g = root.__flIgn, ids = idUnico ? [idUnico] : [...g.sel]; if (!ids.length) { toast('Marque as linhas que quer resgatar.', 'err'); return; }
    const banco = idUnico ? '' : (document.getElementById('flIgnBanco') || {}).value || '', data = idUnico ? '' : (document.getElementById('flIgnData') || {}).value || '';
    const rot = (banco ? ' para o ' + BANCOS[banco] : ' no mesmo banco') + (data ? ', com a data ' + brData(data) : ', mantendo a data');
    if (!confirm('Resgatar ' + ids.length + ' linha(s)' + rot + '? Elas voltam como pendentes e entram no saldo.')) return;
    let feitas = 0;
    for (let i = 0; i < ids.length; i += 200) {
      const lote = ids.slice(i, i + 200), up = { status_conciliacao: 'pendente' }; if (banco) up.conta_bancaria_id = Number(banco); if (data) up.data_pagamento = data;
      const r = await _supaClient.from('lancamentos_extrato').update(up).in('id', lote).eq('status_conciliacao', 'ignorado').select('id');
      if (r.error) { toast('Erro ao resgatar: ' + r.error.message, 'err'); return; }
      feitas += (r.data || []).length;
      if (data) { const mapa = new Map(g.rows.map(x => [x.id, x])); gravarLogData((r.data || []).map(row => mapa.get(row.id)).filter(a => a && a.data_pagamento !== data).map(a => entLog(a, data, 'resgate (🚫 Ignorados)'))); }
      if (banco) await _supaClient.from('fluxo_caixa_lancamentos').update({ conta_bancaria_id: Number(banco) }).in('lancamento_extrato_id', lote);
    }
    logIgnorados(ids, 'resgatou (página Ignorados)');
    toast(feitas + ' linha(s) resgatada(s)' + rot + ' ✓', 'ok');
    root.__flIgn.rows = root.__flIgn.rows.filter(x => ids.indexOf(x.id) < 0); root.__flIgn.sel = new Set(); desenharIgnorados();
  };

  // ───────── página "Valores alterados" + Excel para o cliente ─────────
  const dtBr = d => { try { return d ? new Date(d).toLocaleString('pt-BR') : ''; } catch (e) { return ''; } };
  const tipoValor = x => /^(tributo|ICMS)/i.test(x.via || '') ? 'Automático' : /^consolid/i.test(x.via || '') ? 'Consolidação' : 'Manual';
  // banco de cada linha alterada (o registro não guarda a conta: busca pelo id da linha)
  async function bancosDosValores(lista) {
    const ids = [...new Set(lista.map(x => x.id).filter(Boolean))], m = new Map();
    for (let i = 0; i < ids.length; i += 200) { const r = await _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,historico_bancario').in('id', ids.slice(i, i + 200)); (r.data || []).forEach(x => { m.set(x.id, x.conta_bancaria_id); m.set('h' + x.id, x.historico_bancario); }); }
    return m;
  }
  const NOME_BANCO = { '1': 'Itaú', '4': 'Banco do Brasil' };
  root._flAbrirValores = async function () {
    const el = document.getElementById('lancctbConteudoAba'); if (!el) return;
    const lista = (S.g('fl_valores_alterados_163') || []), c = 'padding:5px 8px';
    el.innerHTML = '<div style="padding:20px;color:var(--slate)">Carregando os valores alterados…</div>';
    const bm = await bancosDosValores(lista), bco = x => NOME_BANCO[String(x.conta || bm.get(x.id))] || '', hbc = x => String(bm.get('h' + x.id) || x.nome || '');
    el.innerHTML = '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px"><button class="btn bo bsm" onclick="renderLancctbRegistroContabil()">← Voltar ao Registro Contábil</button><div style="font-size:1.15rem;font-weight:700">💲 Valores alterados — Fast Lube</div><button class="btn bo bsm" onclick="_flExcelRelatorio(\'valores\')">📊 Gerar Excel</button></div>'
      + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px;max-width:980px">Linhas do Fluxo cujo valor foi corrigido para bater com o extrato (✏️ ao lado do valor, ou ajuste automático de centavos em tributos). O valor original fica guardado aqui.</div>'
      + '<div style="overflow:auto;max-height:calc(100vh - 260px);border:1px solid var(--border);border-radius:6px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead style="position:sticky;top:0;background:var(--ink2);color:#fff"><tr><th style="' + c + ';text-align:left">Quando</th><th style="' + c + ';text-align:left">Quem</th><th style="' + c + ';text-align:left">Banco</th><th style="' + c + ';text-align:left">Dia</th><th style="' + c + ';text-align:left">Histórico bancário</th><th style="' + c + ';text-align:right">Valor no Fluxo</th><th style="' + c + ';text-align:right">Valor correto</th><th style="' + c + ';text-align:right">Diferença</th><th style="' + c + ';text-align:left">Tipo</th><th style="' + c + ';text-align:left">Como</th></tr></thead><tbody>'
      + (lista.length ? lista.map(x => '<tr style="border-bottom:1px solid var(--border)"><td style="' + c + ';white-space:nowrap">' + E(dtBr(x.em)) + '</td><td style="' + c + '">' + E(x.por || '') + '</td><td style="' + c + ';white-space:nowrap">' + E(bco(x)) + '</td><td style="' + c + ';white-space:nowrap">' + brData(x.dia) + '</td><td style="' + c + ';font-size:11.5px;line-height:1.3;max-width:620px">' + E(hbc(x)) + '</td><td style="' + c + ';text-align:right">R$ ' + fmt(x.de) + '</td><td style="' + c + ';text-align:right">R$ ' + fmt(x.para) + '</td><td style="' + c + ';text-align:right;color:' + (x.para - x.de < 0 ? '#dc2626' : 'var(--teal)') + '">' + fmt(x.para - x.de) + '</td><td style="' + c + ';font-weight:600;color:' + (tipoValor(x) === 'Automático' ? '#d97706' : 'var(--ink)') + '">' + tipoValor(x) + '</td><td style="' + c + ';font-size:11.5px">' + E(x.via || '') + '</td></tr>').join('') : '<tr><td colspan="10" style="padding:20px;text-align:center;color:var(--slate)">Nenhum valor foi alterado até agora.</td></tr>')
      + '</tbody></table></div>';
  };
  root._flExcelRelatorio = async function (qual) {
    if (typeof XLSX === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    toast('Montando o Excel…', 'info');
    const B = { '1': 'Itaú', '4': 'Banco do Brasil' }, ROT = { fluxo: 'Fluxo de Caixa', extrato_receb: 'Extrato · recebimento', extrato_compl: 'Extrato · pagamento', conciliacao: 'Conciliação', ajuste_manual: 'Ajuste manual' };
    const dBr = d => d ? brData(d) : '';
    const wb = XLSX.utils.book_new(), add = (nome, cab, linhas, larg) => { const ws = XLSX.utils.aoa_to_sheet([cab].concat(linhas.length ? linhas : [['(nada a informar)']])); ws['!cols'] = (larg || cab.map(() => 18)).map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, nome); };
    const sel = 'id,conta_bancaria_id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte,status_conciliacao';
    if (qual === 'todos' || qual === 'ajustes') {
      const r = (await todosPorId(() => _supaClient.from('lancamentos_extrato').select(sel).eq('empresa_eid', EID).in('conta_bancaria_id', [1, 4]).in('fonte', ['ajuste_manual', 'conciliacao']).neq('status_conciliacao', 'ignorado'))).data || [];
      add('Ajustes e conciliações', ['Banco', 'Data', 'Tipo', 'Entrada', 'Saída', 'Histórico'], r.sort(porDataId).map(x => [B[String(x.conta_bancaria_id)] || x.conta_bancaria_id, dBr(x.data_pagamento), ROT[x.fonte] || x.fonte, Number(x.valor_entrada) || '', Number(x.valor_saida) || '', String(x.historico_bancario || '')]), [16, 12, 16, 14, 14, 110]);
    }
    if (qual === 'todos' || qual === 'datas') {
      const d = await carregarDatasAlteradas();
      add('Datas alteradas', ['Banco', 'Data original', 'Data nova', 'Valor', 'Lançamento', 'Quando', 'Quem', 'Como'], d.map(x => [B[String(x.conta)] || x.conta, dBr(x.de), dBr(x.para), x.v, String(x.h || ''), dtBr(x.em), x.por || '', x.via || '']), [16, 14, 12, 14, 80, 18, 18, 30]);
    }
    if (qual === 'todos' || qual === 'valores') {
      const v = S.g('fl_valores_alterados_163') || [], bm = await bancosDosValores(v);
      add('Valores alterados', ['Banco', 'Dia', 'Histórico bancário', 'Valor no Fluxo', 'Valor correto', 'Diferença', 'Tipo', 'Quando', 'Quem', 'Como'], v.map(x => [NOME_BANCO[String(x.conta || bm.get(x.id))] || '', dBr(x.dia), String(bm.get('h' + x.id) || x.nome || ''), x.de, x.para, Math.round((x.para - x.de) * 100) / 100, tipoValor(x), dtBr(x.em), x.por || '', x.via || '']), [16, 12, 120, 16, 16, 12, 14, 18, 18, 50]);
    }
    if (qual === 'todos' || qual === 'ignorados') {
      const r = (await todosPorId(() => _supaClient.from('lancamentos_extrato').select(sel).eq('empresa_eid', EID).in('conta_bancaria_id', [1, 4]).eq('status_conciliacao', 'ignorado'))).data || [];
      add('Ignorados', ['Banco', 'Data', 'Origem', 'Entrada', 'Saída', 'Histórico'], r.sort(porDataId).map(x => [B[String(x.conta_bancaria_id)] || x.conta_bancaria_id, dBr(x.data_pagamento), ROT[x.fonte] || x.fonte, Number(x.valor_entrada) || '', Number(x.valor_saida) || '', String(x.historico_bancario || '')]), [16, 12, 22, 14, 14, 110]);
    }
    if (qual === 'todos') {
      // Fluxo × extrato por dia, no mês filtrado na tela: onde o Fluxo do cliente não bate com o extrato
      const conta = contaAtual(), p = { de: _lancctbRegistroDataDe || '', ate: _lancctbRegistroDataAte || '' };
      const ref = await carregarRef(conta, p), reg = await carregarRegistro(conta, p.de, p.ate);
      const dias = {}; const ac = (d, k, v) => { (dias[d] = dias[d] || { re: 0, rs: 0, ge: 0, gs: 0 })[k] += v; };
      ref.forEach(x => { ac(x.data_pagamento, 're', cents(x.valor_entrada)); ac(x.data_pagamento, 'rs', cents(x.valor_saida)); });
      reg.filter(x => x.fonte === 'fluxo').forEach(x => { ac(x.data_pagamento, 'ge', cents(x.valor_entrada)); ac(x.data_pagamento, 'gs', cents(x.valor_saida)); });
      add('Fluxo x extrato por dia', ['Banco', 'Dia', 'Entradas extrato', 'Entradas Fluxo', 'Diferença entradas', 'Saídas extrato', 'Saídas Fluxo', 'Diferença saídas'], Object.keys(dias).sort().map(d => { const x = dias[d]; return [nomeBanco(conta), dBr(d), x.re / 100, x.ge / 100, (x.re - x.ge) / 100, x.rs / 100, x.gs / 100, (x.rs - x.gs) / 100]; }), [16, 12, 18, 18, 18, 18, 18, 18]);
    }
    XLSX.writeFile(wb, 'Fast Lube - ' + (qual === 'todos' ? 'ajustes para o cliente' : qual) + ' - ' + new Date().toISOString().slice(0, 10) + '.xlsx');
    toast('Excel gerado ✓', 'ok');
  };

  // ───────── ajuste manual, editar data, excluir ajuste ─────────
  function dialogoForm(titulo, corpo, aoSalvar, comSemAprender) {
    let el = document.getElementById('mFlForm');
    if (!el) { el = document.createElement('div'); el.className = 'mb'; el.id = 'mFlForm'; el.innerHTML = '<div class="modal" style="width:96%;max-width:520px"></div>'; document.body.appendChild(el); }
    el.firstChild.innerHTML = '<div class="mt" style="display:flex;justify-content:space-between;align-items:center"><span>' + titulo + '</span><button id="flFormX" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--slate)">✕</button></div><div style="margin:8px 0">' + corpo + '</div><div class="ma"><button class="btn bp" id="flFormOk">' + (comSemAprender ? 'Salvar e aprender' : 'Salvar') + '</button>' + (comSemAprender ? '<button class="btn bo" id="flFormSemAp" title="Corrige só esta linha, sem guardar o pagador na memória (correção pontual)">Salvar sem aprender</button>' : '') + '<button class="btn bo" id="flFormCancel">Cancelar</button></div>';
    const fechar = () => closeModal('mFlForm');
    el.querySelector('#flFormX').onclick = el.querySelector('#flFormCancel').onclick = fechar;
    el.querySelector('#flFormOk').onclick = async () => { const r = await aoSalvar(el, true); if (r !== false) fechar(); };
    const sa = el.querySelector('#flFormSemAp'); if (sa) sa.onclick = async () => { const r = await aoSalvar(el, false); if (r !== false) fechar(); };
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
    const { data: x } = await _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte,status_conciliacao').eq('id', id).maybeSingle(); if (!x) return;
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
        if (up.data_pagamento !== x.data_pagamento) gravarLogData([entLog(x, up.data_pagamento, 'edição da linha (✏️)')]);
        toast('Linha atualizada ✓', 'ok'); renderLancctbRegistroContabil();
      });
  };
  root._flEditarValor = async function (id) {
    const { data: x } = await _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte,status_conciliacao').eq('id', id).maybeSingle(); if (!x) return;
    if (x.status_conciliacao === 'conciliado' || x.status_conciliacao === 'parcial') { toast('Esta linha já está classificada. Desclassifique antes de editar o valor.', 'err'); return; }
    const ent = Number(x.valor_entrada) > 0, atual = ent ? Number(x.valor_entrada) : Number(x.valor_saida);
    dialogoForm('✏️ Corrigir valor (linha do Fluxo)',
      '<div style="font-size:12px;color:var(--slate);margin-bottom:8px">' + E(String(x.historico_bancario || '').slice(0, 160)) + '<br>Dia ' + brData(x.data_pagamento) + ' · valor no Fluxo: <b>R$ ' + fmt(atual) + '</b><br>A correção fica registrada (valor original guardado) <br><b>Salvar e aprender</b>: o sistema lembra deste pagador. <b>Salvar sem aprender</b>: correção pontual, nada é guardado na memória.</div>'
      + '<label style="font-size:12px">Valor correto (R$)</label><input id="flEdVal" value="' + fmt(atual) + '" style="' + ESTI + '">',
      async (el, aprender) => {
        const v = num(el.querySelector('#flEdVal').value); if (!(v > 0)) { toast('Informe o valor.', 'err'); return false; }
        if (Math.round(v * 100) === Math.round(atual * 100)) return;
        const r = await _supaClient.from('lancamentos_extrato').update(ent ? { valor_entrada: v } : { valor_saida: v }).eq('id', id).in('status_conciliacao', ['pendente']);
        if (r.error) { toast('Erro ao salvar: ' + r.error.message, 'err'); return false; }
        gravarLogValor([{ id, em: new Date().toISOString(), por: quemFez(), dia: x.data_pagamento, nome: String(x.historico_bancario || '').split(' | ')[0].slice(0, 60), de: atual, para: v, via: aprender ? 'edição manual (✏️ do valor)' : 'edição manual (✏️ do valor) — pontual, sem aprender' }]);
        try { const m = S.g('fl_tol_pagadores_163') || {}, k = String(x.historico_bancario || '').split(' | ')[0].toUpperCase().replace(/[0-9]+/g, '').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim(); if (aprender && k && Math.abs(v - atual) <= 1) { m[k] = (m[k] || 0) + 1; S.s('fl_tol_pagadores_163', m); } } catch (e) {}
        toast('Valor corrigido ✓ (original R$ ' + fmt(atual) + ' guardado no registro)', 'ok'); renderLancctbRegistroContabil();
      }, true);
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
        let feitas = 0; const logs = [];
        for (let i = 0; i < ids.length; i += 200) { const antes = new Map(((await _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte').in('id', ids.slice(i, i + 200)).in('status_conciliacao', ['pendente', 'ignorado'])).data || []).map(x => [x.id, x])); const r = await _supaClient.from('lancamentos_extrato').update({ data_pagamento: d }).in('id', ids.slice(i, i + 200)).in('status_conciliacao', ['pendente', 'ignorado']).select('id'); (r.data || []).forEach(row => { const a = antes.get(row.id); if (a && a.data_pagamento !== d) logs.push(entLog(a, d, 'alteração em lote (📅)')); }); if (r.error) { toast('Erro: ' + r.error.message, 'err'); return false; } feitas += (r.data || []).length; }
        gravarLogData(logs);
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
    { const cgD = tbl.querySelector('colgroup'); if (cgD && cgD.children[1]) cgD.children[1].style.width = '15ch'; const fd = tbl.querySelector('input[data-filtro="registro-data"]'); if (fd) { fd.style.minWidth = '118px'; fd.style.padding = '2px 3px'; } } // filtro de Data: abre mais (mostra a data inteira)
    const cg = tbl.querySelector('colgroup'); if (cg && cg.children[7]) { const c = document.createElement('col'); c.style.width = '19ch'; cg.insertBefore(c, cg.children[8]); }
    const heads = tbl.querySelectorAll('thead tr');
    if (heads[0] && heads[0].children[7]) { const th = document.createElement('th'); th.style.cssText = 'padding:8px 10px;min-width:150px;text-align:right;white-space:nowrap'; th.textContent = 'Saldo'; th.title = 'Saldo da conta após este lançamento (saldo inicial da conta + movimentos em ordem de data)'; heads[0].insertBefore(th, heads[0].children[8]); }
    if (heads[1] && heads[1].children[7]) { const th = document.createElement('th'); th.style.cssText = 'padding:4px 6px'; heads[1].insertBefore(th, heads[1].children[8]); }
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      const cel = tr.children[7]; if (!cel) return;
      const td = document.createElement('td'); const rid = tr.dataset.rid;
      const v = rid ? mapa.get(String(rid)) : undefined;
      td.style.cssText = 'padding:7px 10px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;color:' + (v != null && v < 0 ? '#dc2626' : 'var(--slate)');
      const eIgn = rid && ign.has(String(rid));
      const bt = 'padding:1px 7px;font-size:10.5px;line-height:1.5;border:1px solid var(--border);border-radius:4px;background:transparent;cursor:pointer;white-space:nowrap';
      const ehAj = rid && fontePorId.get(String(rid)) === 'ajuste_manual';
      td.innerHTML = '<div>' + (v != null ? 'R$ ' + fmt(v) : (eIgn ? '<i style="font-size:11px">ignorada</i>' : '')) + '</div>'
        + (rid ? '<div style="display:flex;gap:4px;justify-content:flex-end;margin-top:3px">'
          + '<button style="' + bt + ';color:var(--slate)" title="' + (eIgn ? 'Voltar a considerar esta linha (volta como pendente)' : 'Ignorar esta linha: fica apagada, fora do saldo e do TXT') + '" onclick="event.stopPropagation();_flIgnorarLinha(' + rid + ',' + (eIgn ? 'false' : 'true') + ')">' + (eIgn ? 'Voltar' : 'Ignorar') + '</button>'
          + '<button style="' + bt + ';color:#dc2626;border-color:#dc2626" title="' + (ehAj ? 'Excluir este ajuste' : 'Excluir esta linha do Registro (pede confirmação)') + '" onclick="event.stopPropagation();' + (ehAj ? '_flExcluirAjuste(' : '_flExcluirLinha(') + rid + ')">Excluir</button></div>' : '');
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
      const cv = tr.children[8]; // lapisinho minúsculo ao lado do VALOR, só nas linhas que vieram do Fluxo
      if (rid && f === 'fluxo' && cv && !cv.querySelector('.fl-edv')) cv.insertAdjacentHTML('beforeend', ' <span class="fl-edv" style="cursor:pointer;font-size:9px;opacity:.65;margin-left:2px" title="Corrigir o valor desta linha do Fluxo (ex.: centavos de imposto)" onclick="event.stopPropagation();_flEditarValor(' + rid + ')">✏️</span>');
    });
    // coluna DIF. (logo depois da Origem): marca as linhas que são/trazem uma diferença — Conciliação, Ajuste manual, Valor corrigido — e dá para filtrar
    { const cg3 = tbl.querySelector('colgroup'); if (cg3 && cg3.children[7]) { const c = document.createElement('col'); c.style.width = '11ch'; cg3.insertBefore(c, cg3.children[8]); }
      if (heads[0] && heads[0].children[7]) { const th = document.createElement('th'); th.style.cssText = 'padding:8px 8px;text-align:left;white-space:nowrap'; th.textContent = 'DIF.'; th.title = 'Diferença: Conciliação do dia, Ajuste manual ou Valor corrigido (Fluxo ≠ extrato)'; heads[0].insertBefore(th, heads[0].children[8]); }
      if (heads[1] && heads[1].children[7]) { const th = document.createElement('th'); th.style.cssText = 'padding:4px 6px';
        const op = [['', 'Todas'], ['dif', 'Com diferença'], ['conc', 'Conciliação'], ['ajuste', 'Ajuste manual'], ['valor', 'Valor corrigido']];
        th.innerHTML = '<select class="si" data-filtro="registro-dif" style="width:100%;font-size:11px" onchange="__flFiltroDif=this.value;_lancctbRegistroPagina=0;renderLancctbRegistroContabil()">' + op.map(o => '<option value="' + o[0] + '"' + (root.__flFiltroDif === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
        heads[1].insertBefore(th, heads[1].children[8]); }
      const marcasDif = S.g('fl_dif_marcas_163') || {};
      const vAlt = new Map(); (S.g('fl_valores_alterados_163') || []).forEach(x => { if (x.id && !vAlt.has(String(x.id))) vAlt.set(String(x.id), x.para - x.de); });
      tbl.querySelectorAll('tbody tr').forEach(tr => {
        if (!tr.children[7]) return; const rid = tr.dataset.rid, f = rid ? fontePorId.get(String(rid)) : null, va = rid ? vAlt.get(String(rid)) : undefined;
        const td = document.createElement('td'); td.style.cssText = 'padding:7px 8px;font-size:11.5px;white-space:nowrap;font-weight:600';
        if (f === 'conciliacao') { td.textContent = '⚖ Conciliação'; td.style.color = '#d97706'; }
        else if (f === 'ajuste_manual') { td.textContent = '✎ Ajuste'; td.style.color = '#ca8a04'; }
        else if (rid && marcasDif[String(rid)]) { td.textContent = '⚖ na conciliação'; td.style.color = '#d97706'; td.title = 'Linha do Fluxo sem pagamento igual no extrato deste dia: entrou na explicação da Conciliação'; }
        else if (va !== undefined) { td.innerHTML = '💲 ' + (va > 0 ? '+' : '') + fmt(va) + '<div style="font-size:9px;font-weight:400;opacity:.8;line-height:1">Ajustado</div>'; td.style.color = '#0ea5e9'; td.title = 'Valor corrigido: diferença em relação ao valor original do Fluxo'; }
        tr.insertBefore(td, tr.children[8]);
      }); }
    const w = parseInt(tbl.style.minWidth) || 0; if (w) tbl.style.minWidth = (w + 140 + 150 + 110 + 40) + 'px';
  }
  // ── saldo do DIA filtrado: Registro × extrato (banco) e a diferença, logo abaixo da barra de saldo ──
  let diaBusy = false, diaCache = { k: '', ts: 0, h: '' };
  async function injetarSaldoDia() {
    const slot = document.getElementById('lancctbSaldoRegSlot'); if (!slot) return;
    const dia = _lancctbRegistroDataExata || ((_lancctbRegistroDataDe && _lancctbRegistroDataDe === _lancctbRegistroDataAte) ? _lancctbRegistroDataDe : '');
    let box = document.getElementById('flSaldoDia');
    if (!dia) { if (box) box.remove(); return; }
    const conta = contaAtual(), k = conta + '|' + dia;
    if (diaBusy) return;
    if (!(diaCache.k === k && Date.now() - diaCache.ts < 6000)) {
      diaBusy = true;
      try {
        const { data: ag } = await _supaClient.from('agencias_bancarias').select('saldo_inicial').eq('id', conta).maybeSingle();
        const ref = await carregarRef(conta, { de: '', ate: dia }), reg = await carregarRegistro(conta, '', dia);
        const liq = l => l.reduce((a, x) => a + cents(x.valor_entrada) - cents(x.valor_saida), 0), ini = cents((ag && ag.saldo_inicial) || 0);
        const sR = ini + liq(ref), sG = ini + liq(reg), dif = sG - sR, cor = dif === 0 ? 'var(--teal)' : '#dc2626';
        const chip = (t, v, c) => '<span style="display:inline-block;margin-right:14px"><span style="font-size:11px;color:var(--slate)">' + t + '</span> <b style="color:' + (c || 'var(--ink)') + '">' + v + '</b></span>';
        diaCache = { k, ts: Date.now(), h: '<span style="font-size:12px;font-weight:700;margin-right:14px">📅 Saldo no fim de ' + brData(dia) + '</span>' + chip('Registro contábil', 'R$ ' + fmt(sG / 100)) + chip('Banco (extrato)', 'R$ ' + fmt(sR / 100)) + chip('Diferença', (dif === 0 ? 'bate ✓' : 'R$ ' + fmt(dif / 100) + (dif > 0 ? ' (Registro a MAIS)' : ' (Registro a MENOS)')), cor) };
      } finally { diaBusy = false; }
    }
    if (!box) { box = document.createElement('div'); box.id = 'flSaldoDia'; box.style.cssText = 'margin:6px 0;padding:6px 10px;border:1px solid var(--border);border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:2px'; slot.insertAdjacentElement('afterend', box); }
    if (box.innerHTML !== diaCache.h) box.innerHTML = diaCache.h;
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
    const rodar = () => { clearTimeout(tmr); tmr = setTimeout(() => { injetarSaldo().catch(e => console.warn('Saldo (Fast Lube):', e)); injetarSaldoDia().catch(e => console.warn('Saldo do dia:', e)); garantirBarraSaldo(); try { const bf = document.querySelector('.action-bar-sticky [data-etapa="fluxo"]'); if (bf) bf.style.display = 'none'; } catch (e) {} }, 250); };
    if (!obs) { obs = new MutationObserver(rodar); }
    obs.disconnect(); obs.observe(alvo, { childList: true, subtree: true });
    rodar();
  };

  // ── ignorar / voltar a considerar ──
  // registro de quem ignorou/resgatou o quê (auditoria: se uma linha voltar a ficar pendente, dá para saber quando e por quem)
  async function logIgnorados(ids, acao) {
    try {
      const rows = []; for (let i = 0; i < ids.length; i += 200) { const r = await _supaClient.from('lancamentos_extrato').select('id,conta_bancaria_id,data_pagamento,valor_entrada,valor_saida,historico_bancario').in('id', ids.slice(i, i + 200)); (r.data || []).forEach(x => rows.push(x)); }
      const em = new Date().toISOString(), por = quemFez();
      const novos = rows.map(x => ({ id: x.id, em, por, acao, conta: x.conta_bancaria_id, dia: x.data_pagamento, v: Number(x.valor_entrada) > 0 ? Number(x.valor_entrada) : -Number(x.valor_saida || 0), h: String(x.historico_bancario || '').slice(0, 90) }));
      S.s('fl_ignorados_log_163', novos.concat(S.g('fl_ignorados_log_163') || []).slice(0, 3000));
    } catch (e) {}
  }
  async function marcarIgnorado(ids, ignorar) {
    logIgnorados(ids, ignorar ? 'ignorou' : 'voltou a considerar');
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
  root._flExcluirLinha = async function (id) {
    if (!ativo()) return;
    if (_lancctbExclusaoBloqueada(eidAtual(), _lancctbRegistroMes, 'a linha do Registro')) return;
    const { data: x } = await _supaClient.from('lancamentos_extrato').select('id,data_pagamento,valor_entrada,valor_saida,historico_bancario,fonte,status_conciliacao').eq('id', id).maybeSingle(); if (!x) { toast('Linha não encontrada.', 'err'); return; }
    const v = Number(x.valor_entrada) > 0 ? '+ R$ ' + fmt(x.valor_entrada) : '− R$ ' + fmt(x.valor_saida);
    if (!confirm('Excluir esta linha do Registro?\n\n' + brData(x.data_pagamento) + ' · ' + v + '\n' + String(x.historico_bancario || '').slice(0, 140) + '\n\n' + (x.fonte === 'fluxo' ? 'Ela veio do Fluxo: o lançamento do Fluxo é mantido, mas não volta para o Registro.' : 'Se rodar "Trazer … do extrato" de novo, ela pode ser trazida outra vez (para impedir, use Ignorar).') + (x.status_conciliacao === 'conciliado' || x.status_conciliacao === 'parcial' ? '\nEla está classificada: a classificação também é desfeita.' : ''))) return;
    for (const t of ['notas_fiscais_parcelas', 'comprovantes_bancarios', 'comprovantes_recebimento', 'comprovantes_salarios']) await _supaClient.from(t).update({ lancamento_extrato_id: null, status_conciliacao: 'pendente' }).eq('lancamento_extrato_id', id);
    await _supaClient.from('aplicacoes_financeiras_movimentos').update({ lancamento_extrato_id: null }).eq('lancamento_extrato_id', id);
    const lig = await _supaClient.from('fluxo_caixa_lancamentos').select('id').eq('lancamento_extrato_id', id);
    await _supaClient.from('fluxo_caixa_lancamentos').update({ lancamento_extrato_id: null, status_associado: 'nao_associado', conta_bancaria_id: null }).eq('lancamento_extrato_id', id);
    await _supaClient.from('lancamentos_contabeis').delete().eq('lancamento_extrato_id', id);
    const r = await _supaClient.from('lancamentos_extrato').delete().eq('id', id);
    if (r.error) { toast('Erro ao excluir: ' + r.error.message, 'err'); return; }
    const fl = (lig.data || []).map(f => f.id); if (fl.length) { const ex = getExcl(); fl.forEach(i => ex.add(String(i))); setExcl(ex); desmarcarManuais(fl); }
    toast('Linha excluída do Registro ✓', 'ok'); renderLancctbRegistroContabil();
  };
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

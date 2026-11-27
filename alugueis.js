/* ALUGUÉIS PAGOS (pedido do usuário 27/11/2026).
   Nos Lançamentos Contábeis, todo PAGAMENTO (saída do banco) lançado numa conta de aluguel do plano de contas (descrição com
   "ALUGU…": despesa de aluguel ou aluguéis a pagar; receitas e "a receber" ficam fora) entra na lista "🏠 Aluguéis pagos":
   data, banco de onde saiu, valor, locador, total do locador no mês e o IRRF que incidiria pela TABELA PROGRESSIVA MENSAL da
   pessoa física (mesmo motor das Calculadoras: Lei 15.191/2025 + redução da Lei 15.270/2025 a partir de 2026; desconto
   simplificado quando mais vantajoso). Só pessoa física sofre retenção pela tabela; locador pessoa jurídica não.
   O tipo do locador (PF/PJ) é marcado na lista e fica salvo por empresa (dados_app alug_locador_<eid>).
   Quadro amarelo no canto superior direito: avisa quando, no mês do fechamento ou no anterior, um aluguel pago a PF (ou a
   locador ainda não classificado) passa do limite e incidiria IR, ou quando o valor mudou em relação ao mês anterior.
   "Ciente" guarda o aviso em dados_app alug_ciente_<eid> (não volta a aparecer). Também abre pela tela Despesas com Locação. */
(function (root) {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const R2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const nrm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  // 27/11: imposto do aluguel (IRRF a recolher), software e maquininha de cartão não entram
  const ehContaAluguel = d => { const n = nrm(d); return /ALUGU/.test(n) && !/RECEITA|RECEBER|RECEBID|A RECEB|IRRF|IMPOSTO|RECOLHER|SOFTWARE|LICENCA|MAQUINAS DE CARTAO/.test(n); };
  const contaPF = d => /(^|[^A-Z])(PF|PESSOA FISICA)([^A-Z]|$)/.test(nrm(d)); // conta "ALUGUEL - PF" do plano = locador pessoa física
  const PJ_PROVAVEL = /\b(LTDA|S\.?\/?A|EIRELI|EPP|ME|MEI|COMERCIO|COM|LOCACAO|LOCACOES|LOCADORA|RENTAL|INDUSTRIA|SERVICOS|DISTRIBUIDORA|EQUIPAMENTOS|TRANSPORTES|ENGENHARIA|SOLUCOES|MOVIMENTACAO|CONSTRUCOES|CONSTRUTORA|EMPREENDIMENTOS|PARTICIPACOES|TECNICA|LOGISTICA|MAQUINAS|GUINDASTES|CIA|GRUPO|TECNOLOGIA)\b/;
  const ST = { eid: '', ano: new Date().getFullYear(), mes: 0, dados: null, cache: {} };

  function locadorDe(l) {
    if (l.cliente_fornecedor_nome) return nrm(l.cliente_fornecedor_nome);
    let h = String(l.historico || '').trim();
    h = h.replace(/^pagamento\s+(?:ref\.?\s*)?(?:relativo\s+(?:ao?|à)\s+)?(?:(?:a|à|ao|de|do|da)\s+)?/i, '').replace(/^(?:aluguel|aluguéis|alugueis)\s+(?:de\s+\S+\s*)?[-–:]\s*/i, '');
    if (h.includes('/')) h = h.slice(h.indexOf('/') + 1);
    h = h.replace(/\s*>\s*.*$/, '').replace(/^(fatura|fat|nf|nfs-?e|boleto|parcela)\.?\s*n?[º°o.]?\s*\d+\s*[-–:]\s*/i, '').replace(/\s*[-–]\s*(nf|fat|fatura|parcela|ref)\b.*$/i, '');
    return nrm(h) || 'NÃO IDENTIFICADO';
  }
  const tiposGet = eid => { let v = null; try { v = S.g('alug_locador_' + eid); } catch (e) { } return (v && typeof v === 'object') ? v : {}; };
  const cienteGet = eid => { let v = null; try { v = S.g('alug_ciente_' + eid); } catch (e) { } return (v && typeof v === 'object') ? v : {}; };
  function tipoLocador(eid, loc, doc) {
    const t = tiposGet(eid)[loc]; if (t) return t;
    const d = String(doc || '').replace(/\D/g, ''); if (d.length === 11) return 'pf'; if (d.length === 14) return 'pj';
    // contrato cadastrado em Despesas com Locação (locador, imobiliária ou identificação parecidos com o nome do pagamento)
    try { const cs = typeof getAlugueis === 'function' ? getAlugueis('despesasLocacao', eid) : []; for (const c of cs || []) { const nomes = [c.contraparteNome, c.intermediadorNome, c.nome].map(nrm).filter(x => x.length >= 4); if (nomes.some(n => loc.includes(n) || n.includes(loc))) return String(c.pessoaTipo || '').toUpperCase() === 'PF' ? 'pf' : 'pj'; } } catch (e) { }
    return PJ_PROVAVEL.test(loc) ? 'pj?' : '?';
  }
  function irDoMes(ym, total) {
    if (!root.JJRCalc) return null;
    const r = root.JJRCalc.calcular('irrf_pf', { competencia: ym, rendimentos: R2(total).toFixed(2), dependentes: 0 });
    return r && r.ok ? r.resultado.irrf / 100 : null;
  }

  // busca os pagamentos de aluguel do período (ano inteiro + dezembro anterior, para comparar com o mês anterior)
  async function carregar(eid, ano) {
    const { data: pcs } = await _supaClient.from('plano_contas').select('id,numero_conta,classificacao,descricao').eq('empresa_eid', String(eid)).ilike('descricao', '%alugu%');
    const contas = (pcs || []).filter(p => ehContaAluguel(p.descricao)); const porId = new Map(contas.map(c => [c.id, c]));
    if (!contas.length) return { contas: [], linhas: [] };
    const { data: ls, error } = await _lancctbFetchTudo(() => _supaClient.from('lancamentos_contabeis').select('id,lote_id,data,valor,historico,cliente_fornecedor_nome,cnpj_cpf,conta_contabil_id,lancamento_extrato_id,estornado')
      .eq('empresa_eid', String(eid)).eq('tipo', 'D').in('conta_contabil_id', contas.map(c => c.id)).not('lancamento_extrato_id', 'is', null)
      .gte('data', (ano - 1) + '-12-01').lte('data', ano + '-12-31').order('data').order('id'));
    if (error) throw error;
    const vivos = (ls || []).filter(l => !l.estornado);
    // banco = partida de crédito do mesmo lote
    const lotes = [...new Set(vivos.map(l => l.lote_id).filter(Boolean))], bancoLote = new Map(), contaIds = new Set();
    for (let i = 0; i < lotes.length; i += 150) {
      const { data: cs } = await _supaClient.from('lancamentos_contabeis').select('lote_id,conta_contabil_id').in('lote_id', lotes.slice(i, i + 150)).eq('tipo', 'C');
      (cs || []).forEach(c => { if (!bancoLote.has(c.lote_id)) { bancoLote.set(c.lote_id, c.conta_contabil_id); contaIds.add(c.conta_contabil_id); } });
    }
    const nomeConta = new Map(); const ids = [...contaIds].filter(Boolean);
    for (let i = 0; i < ids.length; i += 200) { const { data: pc2 } = await _supaClient.from('plano_contas').select('id,descricao').in('id', ids.slice(i, i + 200)); (pc2 || []).forEach(p => nomeConta.set(p.id, p.descricao)); }
    const linhas = vivos.map(l => ({ id: l.id, data: l.data, ym: String(l.data).slice(0, 7), valor: R2(l.valor), historico: l.historico || '', doc: l.cnpj_cpf || '', locador: locadorDe(l), conta: (porId.get(l.conta_contabil_id) || {}).descricao || '', banco: nomeConta.get(bancoLote.get(l.lote_id)) || '' }));
    return { contas, linhas };
  }
  // por mês e locador: total, tipo, IR pela tabela e variação em relação ao mês anterior
  function analisar(eid, linhas) {
    const grupos = {};
    linhas.forEach(l => { const k = l.ym + '|' + l.locador; const g = grupos[k] = grupos[k] || { ym: l.ym, locador: l.locador, total: 0, n: 0, doc: l.doc, contaPF: false }; g.total = R2(g.total + l.valor); g.n++; if (!g.doc && l.doc) g.doc = l.doc; if (contaPF(l.conta)) g.contaPF = true; });
    Object.values(grupos).forEach(g => {
      g.tipo = tiposGet(eid)[g.locador] || (g.contaPF ? 'pf' : tipoLocador(eid, g.locador, g.doc));
      g.ir = (g.tipo === 'pj' || g.tipo === 'pj?') ? null : irDoMes(g.ym, g.total);
      const [a, m] = g.ym.split('-').map(Number), ant = m === 1 ? (a - 1) + '-12' : a + '-' + String(m - 1).padStart(2, '0');
      const p = grupos[ant + '|' + g.locador]; g.anterior = p ? p.total : null; g.mudou = p ? Math.abs(p.total - g.total) >= 0.01 : false;
    });
    return grupos;
  }
  const situacao = g => g.tipo === 'pj' ? ['PJ — não retém pela tabela', '#64748b', 'var(--bg)'] : g.tipo === 'pj?' ? ['Provável PJ — confirme', '#64748b', 'var(--bg)']
    : g.ir == null ? ['Tabela de IR não cadastrada', '#b45309', '#fef3c7'] : g.ir > 0 ? [(g.tipo === 'pf' ? 'INCIDE IR' : 'Incide IR se for PF') + ' — R$ ' + F(g.ir), '#991b1b', '#fee2e2'] : ['Isento pela tabela', '#166534', '#dcfce7'];

  // ── lista (tela cheia) ──
  async function abrir(eid) {
    ST.eid = String(eid || (typeof _lancctbEidAtual !== 'undefined' ? _lancctbEidAtual : '')); if (!ST.eid) { toast('Abra uma empresa primeiro.', 'err'); return; }
    try { const f = String(S.fechAtual() || ''); if (/^\d{4}-\d{2}/.test(f)) { ST.ano = +f.slice(0, 4); } } catch (e) { }
    let ov = document.getElementById('alugModal'); if (!ov) { ov = document.createElement('div'); ov.id = 'alugModal'; ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow:auto'; document.body.appendChild(ov); }
    ov.innerHTML = '<div id="alugBox" style="background:var(--white);color:var(--ink);border-radius:10px;width:100%;max-width:1400px;padding:16px 18px"><div style="padding:30px;text-align:center;color:var(--slate)">⏳ Buscando os pagamentos de aluguel…</div></div>';
    await recarregar();
  }
  async function recarregar() {
    try { ST.dados = await carregar(ST.eid, ST.ano); } catch (e) { document.getElementById('alugBox').innerHTML = '<div style="color:#dc2626;padding:20px">Erro: ' + E(e.message || e) + '</div>'; return; }
    desenhar();
  }
  function desenhar() {
    const box = document.getElementById('alugBox'); if (!box) return;
    const emp = (S.emps() || []).find(e => String(e.eid) === ST.eid) || {};
    const D = ST.dados || { contas: [], linhas: [] }, G = analisar(ST.eid, D.linhas);
    const linhas = D.linhas.filter(l => l.ym.startsWith(String(ST.ano)) && (!ST.mes || +l.ym.slice(5) === ST.mes));
    let h = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><b style="font-size:16px">🏠 Aluguéis pagos</b><span style="color:var(--slate);font-size:13px">#' + E(ST.eid) + ' ' + E(emp.nome || '') + '</span>'
      + '<select class="si" onchange="Alugueis.ano(this.value)">' + [ST.ano - 1, ST.ano, ST.ano + 1].map(a => '<option' + (a === ST.ano ? ' selected' : '') + '>' + a + '</option>').join('') + '</select>'
      + '<select class="si" onchange="Alugueis.mes(this.value)"><option value="0">Todos os meses</option>' + MESES.map((m, i) => '<option value="' + (i + 1) + '"' + (ST.mes === i + 1 ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>'
      + '<span style="margin-left:auto;display:flex;gap:6px"><button class="action-btn action-btn-excel" onclick="Alugueis.excel()">📊 Gerar Excel</button><button class="btn bo bsm" onclick="document.getElementById(\'alugModal\').remove()">✕ Fechar</button></span></div>';
    h += '<div style="font-size:12px;color:var(--slate);margin-bottom:10px;line-height:1.5">Entram os <b>pagamentos</b> (saída do banco) lançados nas contas de aluguel: ' + (D.contas.length ? D.contas.map(c => E((c.numero_conta || '') + ' ' + c.descricao)).join(' · ') : '<b style="color:#dc2626">nenhuma conta com "aluguel" no plano de contas desta empresa</b>') + '. '
      + 'O IR é o da <b>tabela progressiva mensal da pessoa física</b> (mesma das Calculadoras), sobre a soma do mês por locador. Só há retenção se o <b>locador for pessoa física</b> — marque PF ou PJ na coluna "Locador é" (fica salvo). '
      + 'O valor considerado é o que saiu do banco: se já houve retenção, o aluguel bruto é maior. IPTU, condomínio e taxa de administração pagos pelo locador podem ser deduzidos da base.</div>';
    if (!linhas.length) { box.innerHTML = h + '<div style="padding:20px;border:1px dashed var(--border);border-radius:8px;color:var(--slate)">Nenhum pagamento de aluguel em ' + (ST.mes ? MESES[ST.mes - 1] + '/' : '') + ST.ano + '.</div>'; return; }
    const th = (t, al) => '<th style="padding:6px 8px;text-align:' + (al || 'left') + ';background:var(--ink2);color:#fff;font-size:11.5px;white-space:nowrap;position:sticky;top:0">' + t + '</th>';
    h += '<div style="overflow:auto;max-height:calc(100vh - 230px);border:1px solid var(--border);border-radius:6px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr>' + th('Data') + th('Banco') + th('Valor pago', 'right') + th('Locador') + th('Histórico') + th('Locador é', 'center') + th('Total do locador no mês', 'right') + th('IR pela tabela (PF)', 'right') + th('Situação') + '</tr></thead><tbody>';
    const meses = [...new Set(linhas.map(l => l.ym))].sort();
    meses.forEach(ym => {
      const ls = linhas.filter(l => l.ym === ym), tot = R2(ls.reduce((s, l) => s + l.valor, 0));
      h += '<tr><td colspan="9" style="padding:6px 8px;background:var(--bg);font-weight:700">' + MESES[+ym.slice(5) - 1] + '/' + ym.slice(0, 4) + ' — ' + ls.length + ' pagamento(s), total R$ ' + F(tot) + '</td></tr>';
      const visto = new Set();
      ls.forEach(l => {
        const g = G[ym + '|' + l.locador], [txt, cor, bg] = situacao(g), prim = !visto.has(l.locador); visto.add(l.locador);
        h += '<tr style="border-bottom:1px solid var(--border)"><td style="padding:5px 8px;white-space:nowrap">' + String(l.data).split('-').reverse().join('/') + '</td><td style="padding:5px 8px;font-size:11.5px">' + E(l.banco) + '</td><td style="padding:5px 8px;text-align:right;font-variant-numeric:tabular-nums">R$ ' + F(l.valor) + '</td>'
          + '<td style="padding:5px 8px;font-weight:600">' + E(l.locador) + (l.doc ? '<div style="font-size:10.5px;color:var(--slate)">' + E(l.doc) + '</div>' : '') + '</td><td style="padding:5px 8px;font-size:11.5px;color:var(--slate)">' + E(l.historico) + '<div style="font-size:10.5px">' + E(l.conta) + '</div></td>'
          + '<td style="padding:5px 8px;text-align:center">' + (prim ? '<select class="si" style="font-size:11.5px" onchange="Alugueis.tipo(' + JSON.stringify(l.locador).replace(/"/g, '&quot;') + ',this.value)"><option value=""' + (g.tipo === '?' || g.tipo === 'pj?' ? ' selected' : '') + '>' + (g.tipo === 'pj?' ? 'Provável PJ' : 'Não sei') + '</option><option value="pf"' + (g.tipo === 'pf' ? ' selected' : '') + '>Pessoa física</option><option value="pj"' + (g.tipo === 'pj' ? ' selected' : '') + '>Pessoa jurídica</option></select>' : '') + '</td>'
          + '<td style="padding:5px 8px;text-align:right;font-variant-numeric:tabular-nums">' + (prim ? 'R$ ' + F(g.total) + (g.mudou ? '<div style="font-size:10.5px;color:#b45309" title="Valor diferente do mês anterior">antes: R$ ' + F(g.anterior) + '</div>' : '') : '') + '</td>'
          + '<td style="padding:5px 8px;text-align:right;font-weight:700;color:' + (g.ir > 0 ? '#991b1b' : 'inherit') + '">' + (prim && g.ir != null ? 'R$ ' + F(g.ir) : '') + '</td>'
          + '<td style="padding:5px 8px">' + (prim ? '<span style="background:' + bg + ';color:' + cor + ';font-weight:700;font-size:11px;padding:2px 7px;border-radius:4px;white-space:nowrap">' + E(txt) + '</span>' : '') + '</td></tr>';
      });
    });
    box.innerHTML = h + '</tbody></table></div>';
  }
  function tipo(loc, v) {
    const eid = ST.eid, t = tiposGet(eid); if (v) t[loc] = v; else delete t[loc];
    try { S.s('alug_locador_' + eid, t); } catch (e) { }
    delete ST.cache[eid]; desenhar(); toast('Locador ' + (v === 'pf' ? 'marcado como pessoa física' : v === 'pj' ? 'marcado como pessoa jurídica' : 'sem classificação') + ' — vale para os próximos pagamentos.', 'ok');
  }
  async function excel() {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const D = ST.dados || { linhas: [] }, G = analisar(ST.eid, D.linhas), emp = (S.emps() || []).find(e => String(e.eid) === ST.eid) || {};
    const ls = D.linhas.filter(l => l.ym.startsWith(String(ST.ano)) && (!ST.mes || +l.ym.slice(5) === ST.mes));
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('Aluguéis pagos ' + ST.ano);
    ws.columns = [{ width: 12 }, { width: 30 }, { width: 14 }, { width: 36 }, { width: 50 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 30 }];
    ws.mergeCells('A1:I1'); ws.getCell('A1').value = 'JJR CONSULTORIA CONTÁBIL SS'; ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F7B6C' } };
    ws.mergeCells('A2:I2'); ws.getCell('A2').value = 'Aluguéis pagos — ' + (emp.nome || ST.eid) + ' — ' + (ST.mes ? MESES[ST.mes - 1] + '/' : '') + ST.ano + ' (IR pela tabela progressiva mensal da pessoa física)'; ws.getCell('A2').font = { bold: true };
    const hr = ws.getRow(4); ['Data', 'Banco', 'Valor pago', 'Locador', 'Histórico', 'Locador é', 'Total do locador no mês', 'IR pela tabela (PF)', 'Situação'].forEach((t, i) => { const c = hr.getCell(i + 1); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; });
    let r = 5; ls.forEach(l => { const g = G[l.ym + '|' + l.locador]; const row = ws.getRow(r++); [new Date(l.data + 'T12:00:00'), l.banco, l.valor, l.locador, l.historico, g.tipo === 'pf' ? 'Pessoa física' : g.tipo === 'pj' ? 'Pessoa jurídica' : g.tipo === 'pj?' ? 'Provável PJ' : 'Não informado', g.total, g.ir, situacao(g)[0]].forEach((v, i) => { row.getCell(i + 1).value = v; }); row.getCell(1).numFmt = 'dd/mm/yyyy'; [3, 7, 8].forEach(c => row.getCell(c).numFmt = '#,##0.00'); });
    const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Alugueis_pagos_' + ST.eid + '_' + ST.ano + '.xlsx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ── aviso amarelo no canto superior direito ──
  async function verificar(eid) {
    eid = String(eid || ''); if (!eid || typeof _supaClient === 'undefined' || !_supaClient) return;
    const agora = Date.now(), c = ST.cache[eid]; if (c && agora - c < 60000) return; ST.cache[eid] = agora;
    let f = ''; try { f = String(S.fechAtual() || ''); } catch (e) { } if (!/^\d{4}-\d{2}/.test(f)) { const d = new Date(); f = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
    const ym = f.slice(0, 7), [a, m] = ym.split('-').map(Number), ant = m === 1 ? (a - 1) + '-12' : a + '-' + String(m - 1).padStart(2, '0');
    let D; try { D = await carregar(eid, a); } catch (e) { return; }
    const G = analisar(eid, D.linhas), ciente = cienteGet(eid), avisos = [];
    Object.values(G).forEach(g => {
      if (g.ym !== ym && g.ym !== ant) return; if (g.tipo === 'pj' || g.tipo === 'pj?') return;
      if (g.ir > 0) { const k = 'ir|' + g.ym + '|' + g.locador + '|' + Math.round(g.total * 100); if (!ciente[k]) avisos.push({ k, t: MESES[+g.ym.slice(5) - 1] + '/' + g.ym.slice(0, 4) + ' — <b>' + E(g.locador) + '</b>: aluguel de R$ ' + F(g.total) + ' incidiria IR de <b>R$ ' + F(g.ir) + '</b>' + (g.tipo === 'pf' ? '' : ' (se o locador for pessoa física)') }); }
      if (g.mudou) { const k = 'dif|' + g.ym + '|' + g.locador + '|' + Math.round(g.total * 100); if (!ciente[k]) avisos.push({ k, t: MESES[+g.ym.slice(5) - 1] + '/' + g.ym.slice(0, 4) + ' — <b>' + E(g.locador) + '</b>: aluguel diferente do mês anterior (R$ ' + F(g.anterior) + ' → R$ ' + F(g.total) + ')' }); }
    });
    mostrarAviso(eid, avisos);
  }
  function mostrarAviso(eid, avisos) {
    let el = document.getElementById('alugAviso'); if (!avisos.length) { if (el && el.dataset.eid === eid) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'alugAviso'; document.body.appendChild(el); }
    el.dataset.eid = eid; el._avisos = avisos;
    el.style.cssText = 'position:fixed;top:64px;right:16px;z-index:9500;max-width:420px;background:#fef3c7;color:#1f2937;border:2px solid #f59e0b;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:12px 14px;font-size:12.5px;line-height:1.45';
    el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:13.5px;color:#92400e">🏠 Aluguel — atenção</b><button onclick="document.getElementById(\'alugAviso\').remove()" title="Fechar (volta a aparecer depois)" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;color:#92400e">✕</button></div>'
      + avisos.slice(0, 6).map(a => '<div style="margin:3px 0">• ' + a.t + '</div>').join('') + (avisos.length > 6 ? '<div>… e mais ' + (avisos.length - 6) + '</div>' : '')
      + '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px"><button class="btn bo bsm" style="background:#fff;color:#92400e;border-color:#f59e0b" onclick="Alugueis.ciente()">Ciente</button><button class="btn bp bsm" onclick="Alugueis.abrir(\'' + E(eid) + '\')">Ver aluguéis pagos</button></div>';
  }
  function ciente() {
    const el = document.getElementById('alugAviso'); if (!el) return; const eid = el.dataset.eid, c = cienteGet(eid);
    (el._avisos || []).forEach(a => { c[a.k] = new Date().toISOString().slice(0, 10); });
    const ks = Object.keys(c); if (ks.length > 400) ks.sort((x, y) => c[x] < c[y] ? -1 : 1).slice(0, ks.length - 400).forEach(k => delete c[k]);
    try { S.s('alug_ciente_' + eid, c); } catch (e) { } el.remove();
  }
  root.Alugueis = { abrir, abrirEmp: abrir, verificar, ciente, tipo, excel, ano: a => { ST.ano = +a; recarregar(); }, mes: m => { ST.mes = +m; desenhar(); }, _locador: locadorDe, _analisar: analisar, _carregar: carregar };
})(window);

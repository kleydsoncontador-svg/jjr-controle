/* TXT das retenções das NFS-e tomadas (pedido do usuário 27/11/2026).
   Aba NFS-e Tomado: caixinha de seleção antes da data (uma, algumas, a página toda ou todas as filtradas) e o botão
   "🧾 TXT das retenções". Ao gerar, pergunta quais retenções (ISS, PIS, COFINS, CSLL, IRRF ou todas) e as contas:
   débito = conta de fornecedor padrão da empresa; crédito = conta de cada imposto retido a recolher.
   Contas lembradas por empresa em dados_app "lancctb_ret_txt_<eid>". Retenção que não é descontada do Valor Líquido
   (veio vazia na UneCont ou regra "não descontar") fica de fora do TXT. Layout |6100| (gerarTxtMisterContador). */
(function (root) {
  const KEYS = ['iss', 'pis', 'cofins', 'csll', 'irrf', 'inss'];
  const NOMES = { iss: 'ISS', pis: 'PIS', cofins: 'COFINS', csll: 'CSLL', irrf: 'IRRF', inss: 'INSS' };
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let ctx = '', sel = new Map(); // nf_id → nf
  const eidAtual = () => (typeof _lancctbEidAtual !== 'undefined' ? String(_lancctbEidAtual) : '');
  const abaAtual = () => (typeof _lancctbAbaAtiva !== 'undefined' ? _lancctbAbaAtiva : '');
  const leitura = () => (typeof _lancctbUltimaLeitura !== 'undefined' && Array.isArray(_lancctbUltimaLeitura) ? _lancctbUltimaLeitura : []);
  function garantirCtx() { const c = eidAtual() + '|' + abaAtual(); if (c !== ctx) { ctx = c; sel = new Map(); } }
  const nfDe = x => Object.assign({}, x.nf, { id: x.p.nf_id });
  function ativo(aba) { return !!(aba && aba.tipoDoc === 'nfse' && aba.direcaoNf === 'compra'); }
  function marcado(nfId) { garantirCtx(); return sel.has(String(nfId)); }
  function paginaToda() { garantirCtx(); const L = leitura(); return L.length > 0 && L.every(x => sel.has(String(x.p.nf_id))); }
  function rotuloBotao() { return '🧾 TXT das retenções' + (sel.size ? ' (' + sel.size + ' selecionada' + (sel.size > 1 ? 's' : '') + ')' : ''); }
  function atualizarUi() {
    const b = document.getElementById('lancctbRetTxtBtn'); if (b) b.textContent = rotuloBotao();
    const h = document.getElementById('lancctbRetSelTodos'); if (h) h.checked = paginaToda();
    const l = document.getElementById('lancctbRetSelLimpar'); if (l) l.style.display = sel.size ? '' : 'none';
  }
  function alternar(nfId, on) {
    garantirCtx(); const k = String(nfId);
    const it = leitura().find(x => String(x.p.nf_id) === k);
    if (on && it) sel.set(k, nfDe(it)); else sel.delete(k);
    document.querySelectorAll('.lancctbRetSelChk[data-nf="' + k + '"]').forEach(c => { c.checked = !!on; });
    atualizarUi();
  }
  function alternarPagina(on) {
    garantirCtx();
    leitura().forEach(x => { if (on) sel.set(String(x.p.nf_id), nfDe(x)); else sel.delete(String(x.p.nf_id)); });
    document.querySelectorAll('.lancctbRetSelChk').forEach(c => { c.checked = !!on; });
    atualizarUi();
  }
  function limpar() { sel = new Map(); document.querySelectorAll('.lancctbRetSelChk').forEach(c => { c.checked = false; }); atualizarUi(); }
  // todas as NFs que batem com os filtros da tela (todas as páginas) — mesma busca do Excel
  async function selecionarFiltradas(btn) {
    garantirCtx();
    const aba = LANCCTB_ABAS.find(a => a.id === abaAtual()); if (!ativo(aba)) return;
    const eid = eidAtual(); const txt = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ buscando…'; }
    try {
      const { data: parcelas, error } = await _lancctbFetchTudo(() => {
        let q = _supaClient.from('notas_fiscais_parcelas')
          .select('id,nf_id,numero_parcela,data_vencimento,data_emissao,valor_parcela,status_conciliacao,notas_fiscais!inner(numero,cnpj_emitente,nome_emitente,cnpj_destinatario,nome_destinatario,direcao,tipo,modelo,empresa_eid,data_emissao,valor_total,iss_valor,pis_valor,cofins_valor,csll_valor,irrf_valor,inss_valor,ret_une_vazias,natureza_operacao,cod_servico,desc_servico,chave_acesso)')
          .eq('empresa_eid', eid).eq('tipo', aba.tipoDoc).eq('direcao', aba.direcaoNf);
        q = _lancctbNotasAplicarFiltrosServidor(q, 'notas_fiscais.nome_emitente', 'notas_fiscais.cnpj_emitente', true);
        return q.order('data_emissao', { ascending: true }).order('id', { ascending: true });
      });
      if (error) { toast('Erro ao buscar as NFs: ' + error.message, 'err'); return; }
      let todas = (parcelas || []).map(p => ({ p, nf: p.notas_fiscais, nomeTerc: p.notas_fiscais.nome_emitente, cnpjTerc: p.notas_fiscais.cnpj_emitente, qtdParcelas: 1 }));
      todas = _lancctbNotasAplicarFiltrosCliente(todas, true);
      todas.forEach(x => sel.set(String(x.p.nf_id), nfDe(x)));
      document.querySelectorAll('.lancctbRetSelChk').forEach(c => { c.checked = sel.has(String(c.dataset.nf)); });
      toast(sel.size + ' NFS-e selecionada(s) (todas as filtradas).', 'ok');
    } finally { if (btn) { btn.disabled = false; btn.textContent = txt; } atualizarUi(); }
  }
  function botoesHtml() {
    garantirCtx();
    return '<button class="btn bo bsm" onclick="RetTxt.selecionarFiltradas(this)" title="Marca TODAS as NFS-e que batem com os filtros da tela (todas as páginas), para o TXT das retenções">☑ Selecionar filtradas</button>'
      + '<button class="btn bo bsm" id="lancctbRetSelLimpar" style="' + (sel.size ? '' : 'display:none') + '" onclick="RetTxt.limpar()" title="Desmarca todas">✕ Limpar seleção</button>'
      + '<button class="btn bo bsm" id="lancctbRetTxtBtn" onclick="RetTxt.gerar()" title="TXT de lançamentos das retenções das NFS-e marcadas na caixinha: débito na conta de fornecedor, crédito na conta de cada imposto retido. Você escolhe ISS, PIS, COFINS, CSLL, IRRF, INSS ou todos.">' + rotuloBotao() + '</button>';
  }
  const cfgChave = eid => 'lancctb_ret_txt_' + eid;
  function cfgGet(eid) { let v = null; try { v = S.g(cfgChave(eid)); } catch (e) {} return (v && typeof v === 'object') ? v : {}; }
  // o que entra no TXT por imposto: só retenção > 0 que É descontada do Valor Líquido
  function resumo(lista) {
    const r = {}; KEYS.forEach(k => { r[k] = { qtd: 0, total: 0, fora: 0 }; });
    lista.forEach(nf => { const ign = _lancctbRetIgnPara(nf); KEYS.forEach(k => { const v = Number(nf[k + '_valor']) || 0; if (v <= 0) return; if (ign[k]) { r[k].fora++; return; } r[k].qtd++; r[k].total = Math.round((r[k].total + v) * 100) / 100; }); });
    return r;
  }
  async function gerar() {
    garantirCtx();
    if (!sel.size) { toast('Marque as NFS-e na caixinha antes da data (ou use "Selecionar filtradas").', 'err'); return; }
    const eid = eidAtual(), lista = [...sel.values()], res = resumo(lista), cfg = cfgGet(eid);
    const escolha = await new Promise(resolve => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
      const linhas = KEYS.map(k => '<tr style="border-bottom:1px solid var(--border)">'
        + '<td style="padding:6px 4px"><label style="display:flex;gap:6px;align-items:center;cursor:pointer;font-weight:700"><input type="checkbox" class="rtxtImp" value="' + k + '" ' + (res[k].qtd ? 'checked' : 'disabled') + '> ' + NOMES[k] + '</label></td>'
        + '<td style="padding:6px 4px;font-size:12px;text-align:right;font-variant-numeric:tabular-nums">' + res[k].qtd + ' NF · R$ ' + _fmt(res[k].total) + (res[k].fora ? '<div style="font-size:10.5px;color:var(--slate)">' + res[k].fora + ' não descontada(s) — fora</div>' : '') + '</td>'
        + '<td style="padding:6px 4px"><input class="fi rtxtConta" data-k="' + k + '" value="' + E(cfg[k] || '') + '" placeholder="conta crédito" style="width:120px"></td></tr>').join('');
      ov.innerHTML = '<div style="background:var(--white,#fff);color:var(--ink,#111);border-radius:10px;max-width:520px;width:100%;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.4)">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:4px">TXT das retenções — ' + lista.length + ' NFS-e selecionada(s)</div>'
        + '<div style="font-size:12px;color:var(--slate);margin-bottom:10px">Quais retenções você quer gerar? Uma linha por NFS-e e por imposto: <b>débito</b> na conta de fornecedor, <b>crédito</b> na conta do imposto retido.</div>'
        + '<label style="display:flex;gap:6px;align-items:center;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="checkbox" id="rtxtTodos"> <b>Todos</b></label>'
        + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--slate)"><th style="text-align:left;padding:4px">Retenção</th><th style="text-align:right;padding:4px">Entra no TXT</th><th style="text-align:left;padding:4px">Conta crédito</th></tr></thead><tbody>' + linhas + '</tbody></table></div>'
        + '<label style="display:block;font-size:12px;margin-top:12px">Conta débito — fornecedor (padrão da empresa)<input class="fi" id="rtxtForn" value="' + E(cfg.forn || '') + '" placeholder="ex.: 20000" style="width:100%"></label>'
        + '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn bo" id="rtxtCancel">Cancelar</button><button class="btn bp" id="rtxtOk">Gerar TXT</button></div></div>';
      document.body.appendChild(ov);
      const chks = [...ov.querySelectorAll('.rtxtImp')].filter(c => !c.disabled);
      const todos = ov.querySelector('#rtxtTodos');
      todos.checked = chks.length > 0 && chks.every(c => c.checked);
      todos.onchange = () => chks.forEach(c => { c.checked = todos.checked; });
      chks.forEach(c => { c.onchange = () => { todos.checked = chks.every(x => x.checked); }; });
      ov.querySelector('#rtxtCancel').onclick = () => { ov.remove(); resolve(null); };
      ov.querySelector('#rtxtOk').onclick = () => {
        const imps = chks.filter(c => c.checked).map(c => c.value);
        if (!imps.length) { toast('Escolha pelo menos uma retenção.', 'err'); return; }
        const contas = {}; ov.querySelectorAll('.rtxtConta').forEach(i => { contas[i.dataset.k] = i.value.trim(); });
        const forn = ov.querySelector('#rtxtForn').value.trim();
        if (!/^\d+$/.test(forn)) { toast('Informe a conta de fornecedor (só números).', 'err'); return; }
        const falta = imps.filter(k => !/^\d+$/.test(contas[k] || ''));
        if (falta.length) { toast('Informe a conta crédito de: ' + falta.map(k => NOMES[k]).join(', ') + ' (só números).', 'err'); return; }
        ov.remove(); resolve({ imps, contas, forn });
      };
    });
    if (!escolha) return;
    const novoCfg = Object.assign({}, cfg, { forn: escolha.forn }); KEYS.forEach(k => { if (escolha.contas[k]) novoCfg[k] = escolha.contas[k]; });
    try { S.s(cfgChave(eid), novoCfg); } catch (e) {}
    const br = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
    const ord = lista.slice().sort((a, b) => String(a.data_emissao || '').localeCompare(String(b.data_emissao || '')) || String(a.numero || '').localeCompare(String(b.numero || ''), 'pt', { numeric: true }));
    const linhas = []; let fora = 0;
    ord.forEach(nf => {
      const ign = _lancctbRetIgnPara(nf);
      escolha.imps.forEach(k => {
        const v = Math.round((Number(nf[k + '_valor']) || 0) * 100) / 100; if (v <= 0) return;
        if (ign[k]) { fora++; return; }
        linhas.push({ data: br(nf.data_emissao), debito: escolha.forn, credito: escolha.contas[k], valor: v,
          historico: 'Retenção de ' + NOMES[k] + ' s/ NF ' + (nf.numero || '') + (nf.nome_emitente ? ' - ' + nf.nome_emitente : '') });
      });
    });
    if (!linhas.length) { toast('Nenhuma retenção a gerar nas NFS-e selecionadas' + (fora ? ' (' + fora + ' não são descontadas do líquido).' : '.'), 'err'); return; }
    const emp = S.emps().find(e => String(e.eid) === eid);
    const cnpj = String((emp && (emp.cnpjNum || emp.cnpj)) || '').replace(/\D/g, '');
    const hoje = new Date().toISOString().slice(0, 10);
    const nomeArq = 'Retencoes_' + escolha.imps.map(k => NOMES[k]).join('-') + '_' + String((emp && emp.nome) || eid).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) + '_' + hoje + '.txt';
    const salvou = await _lancctbSalvarTxtNaPastaTransfRede(nomeArq, gerarTxtMisterContador(cnpj, linhas));
    if (!salvou) baixarTxtMisterContador(cnpj, linhas, nomeArq);
    const total = Math.round(linhas.reduce((a, x) => a + x.valor, 0) * 100) / 100;
    toast('TXT gerado: ' + linhas.length + ' lançamento(s), total R$ ' + _fmt(total) + (fora ? ' — ' + fora + ' retenção(ões) não descontada(s) ficaram de fora' : '') + (salvou ? '. Salvo na pasta escolhida.' : '. Baixado pelo navegador.'), 'ok');
  }
  root.RetTxt = { ativo, marcado, paginaToda, alternar, alternarPagina, limpar, selecionarFiltradas, botoesHtml, gerar, resumo };
})(window);

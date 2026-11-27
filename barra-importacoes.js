/* Barra dourada de importações mensais (pedido do usuário 27/11/2026).
   No dia 1 de cada mês (caia em fim de semana ou não), a faixa do topo fica dourada com texto preto em negrito listando
   as importações em lote que ainda faltam: NF de todas as empresas, UneCont, Folha e Tributos.
   Cada item some quando o botão correspondente termina de importar; sem nenhum item, a barra volta ao normal.
   Mês de referência = "Fechamento atual" (NF e UneCont emitidas no mês; Folha competência do mês ou do anterior;
   Tributos que vencem no mês). Vale a partir do fechamento de 11/2026 → primeiro aviso em 01/12/2026.
   Guardado em dados_app, chave "barra_importacoes": { "<tarefa>|AAAA-MM-DD": { em, por } } (AAAA-MM-DD = data do aviso).
   App instalado (PWA): com a barra de título escondida (Window Controls Overlay), a faixa aparece DENTRO da barra verde do
   topo da janela; no navegador comum aparece como uma faixa dourada no topo da página, só quando há pendência. */
(function (root) {
  const INICIO = '2026-12-01';
  const CHAVE = 'barra_importacoes';
  // dias do mês em que cada aviso aparece (de novo). UneCont tem 2 datas — a 2ª é configurável aqui.
  const TAREFAS = [
    { id: 'nf', rotulo: 'Importar NF de todas as empresas', dias: [1], abrir: () => root.abrirLancctbImportarMesTodasModal && root.abrirLancctbImportarMesTodasModal() },
    { id: 'une', rotulo: 'Importar UneCont', dias: [1], abrir: () => root.abrirLancctbUnecontModal && root.abrirLancctbUnecontModal() },
    { id: 'folha', rotulo: 'Importar Folha', dias: [1], abrir: () => root._lancctbFolhaAbrirImportar && root._lancctbFolhaAbrirImportar() },
    { id: 'trib', rotulo: 'Importar Tributos', dias: [1], abrir: () => root._lancctbTributosAbrirImportar && root._lancctbTributosAbrirImportar() }
  ];
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p2 = n => String(n).padStart(2, '0');
  const hoje = () => { if (root._barraImpHojeTeste) return root._barraImpHojeTeste; const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  const estado = () => { try { const v = S.g(CHAVE); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; } catch (e) { return {}; } };
  // data do último aviso da tarefa que já chegou (no mês corrente), ou null
  function avisoAtual(t) {
    const h = hoje(), ym = h.slice(0, 7), dia = +h.slice(8, 10);
    const ds = t.dias.filter(d => d <= dia).sort((a, b) => b - a);
    if (!ds.length) return null;
    const iso = ym + '-' + p2(ds[0]);
    return iso >= INICIO ? iso : null;
  }
  function pendentes() {
    const st = estado();
    return TAREFAS.filter(t => { const a = avisoAtual(t); return a && !st[t.id + '|' + a]; });
  }
  function refTxt() {
    try { const f = S.fechAtual(); if (f) return typeof fmtMes === 'function' ? fmtMes(f) : f; } catch (e) {}
    return '';
  }
  function marcar(id) {
    const t = TAREFAS.find(x => x.id === id); if (!t) return;
    const a = avisoAtual(t); if (!a) return;
    const st = estado(); const k = id + '|' + a; if (st[k]) return;
    st[k] = { em: new Date().toISOString(), por: (typeof currentUser !== 'undefined' && currentUser && (currentUser.nome || currentUser.login)) || '' };
    // mantém só os 120 registros mais recentes
    const ks = Object.keys(st).sort((x, y) => x.split('|')[1] < y.split('|')[1] ? 1 : -1);
    ks.slice(120).forEach(x => delete st[x]);
    try { S.s(CHAVE, st); } catch (e) { console.warn('barra importações: não salvou', e); }
    render();
  }
  function abrir(id) {
    const t = TAREFAS.find(x => x.id === id); if (!t) return;
    try { t.abrir(); } catch (e) { console.warn('barra importações: abrir', e); }
  }
  function garantirEl() {
    let el = document.getElementById('jjrTopBar');
    if (!el) {
      el = document.createElement('div'); el.id = 'jjrTopBar';
      el.innerHTML = '<span class="jtb-titulo"><img src="assets/icon-192.png" alt="">JJR Controle Contábil</span><div class="jtb-ouro" id="jjrTopBarOuro"></div>';
      document.body.insertBefore(el, document.body.firstChild);
    }
    return el;
  }
  function render() {
    if (!document.body) return;
    const el = garantirEl(), ouro = document.getElementById('jjrTopBarOuro');
    const pend = pendentes();
    el.classList.toggle('tem-pend', pend.length > 0);
    document.documentElement.classList.toggle('jtb-pend', pend.length > 0);
    if (!pend.length) { ouro.innerHTML = ''; return; }
    const ref = refTxt();
    ouro.innerHTML = pend.map(t => '<button type="button" onclick="BarraImp.abrir(\'' + t.id + '\')" title="Abre o botão &quot;' + E(t.rotulo) + '&quot; da lista de Lançamentos Contábeis' + (ref ? ' — mês de referência: fechamento atual ' + E(ref) : '') + '">' + E(t.rotulo) + '</button>').join('<span class="jtb-sep">|</span>')
      + (ref ? '<span class="jtb-ref">ref. ' + E(ref) + '</span>' : '');
  }
  root.BarraImp = { render, marcar, abrir, pendentes, TAREFAS, INICIO };
  // redesenha ao carregar, a cada minuto (virada do dia) e quando a barra de título do app muda de tamanho
  function iniciar() {
    render();
    setInterval(render, 30000); // pega a virada do dia e os dados que chegam do Supabase depois do carregamento
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    try { if (navigator.windowControlsOverlay) navigator.windowControlsOverlay.addEventListener('geometrychange', render); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);

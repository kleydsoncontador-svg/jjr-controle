/* IRREGULARIDADES — SIEG (pedido do usuário 28/11/2026).
   O robô "SIEG Irregularidades" (atalho na área de trabalho, C:\Users\kleyd\sieg_irregularidades) passa por todos os clientes da
   SIEG só consultando e baixa, de quem tem irregularidade, os PDFs "CADIN" e "Diagnóstico Fiscal" para
   X:\03 - CONTABIL\Documentação Suporte para Conciliação\Relatórios Fiscal\SIEG - Irregularidades
   ("<Empresa> - <Tipo> - DD-MM-AAAA HHhMM.pdf") + um resumo "_verificacao <data>.json" com a situação de cada cliente.
   Este módulo lê a pasta (botão "Importar relatórios da SIEG"), lê os PDFs SEM IA (pdf.js, posição do texto; as páginas vêm
   deitadas, rot 90) e mantém uma LISTAGEM só das empresas com irregularidade (incluídas automaticamente).
   Regras do usuário: NUNCA apagar. A mesma irregularidade no mês seguinte = mesma linha, "atualizada em <data>", com o
   histórico dos valores. Quando some (ou a empresa fica "Sem irregularidades"), a linha fica "Regularizada em <data>"
   (pode ter sido pagamento ou entrega de declaração). Dados em dados_app "sieg_irreg"; o PDF nunca vai para o Supabase. */
(function (root) {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = v => (v == null || v === '') ? '' : (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = t => { const s = String(t || '').replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? null : n; };
  const dig = s => String(s || '').replace(/\D/g, '');
  const brIso = d => { const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
  const isoBr = d => d ? String(d).slice(0, 10).split('-').reverse().join('/') : '';
  const KEY = 'sieg_irreg', PASTA = 'siegIrregPasta';
  const ST = { eid: '', soAbertas: true };

  // ── leitura do PDF: linhas reconstruídas (página deitada → agrupa pela coordenada x) ──
  async function linhasDoPdf(pdf) {
    const out = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const pg = await pdf.getPage(p), tc = await pg.getTextContent(), rot = (pg.rotate || 0) % 180 !== 0;
      const g = {};
      tc.items.filter(i => String(i.str).trim()).forEach(i => { const k = Math.round(rot ? i.transform[4] : -i.transform[5]); const o = rot ? i.transform[5] : i.transform[4]; (g[k] = g[k] || []).push([o, String(i.str).trim()]); });
      // junta linhas muito próximas (±2) — o mesmo "registro" às vezes sai com 1 ponto de diferença
      const ks = Object.keys(g).map(Number).sort((a, b) => a - b), juntas = [];
      ks.forEach(k => { const u = juntas[juntas.length - 1]; if (u && k - u.k <= 2) u.itens.push(...g[k]); else juntas.push({ k, itens: [...g[k]] }); });
      juntas.forEach(j => out.push(j.itens.sort((a, b) => a[0] - b[0]).map(x => x[1])));
    }
    return out;
  }
  const ehData = t => /^\d{2}\/\d{2}\/\d{4}$/.test(t), ehValor = t => /^-?[\d.]*\d,\d{2}$/.test(t);
  const ehPA = t => /^(\d{2}\/\d{4}|\d{4}|[A-Za-zçÇ]+\/\d{4})$/.test(t);
  // CNPJ da empresa: "CNPJ: 00.000.000/0000-00" (o "Autor pedido"/"Contratante" do cabeçalho é a contabilidade, não a empresa)
  const cnpjDe = linhas => {
    for (const l of linhas) { const m = l.join(' ').match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/); if (m) return dig(m[1]); }
    for (const l of linhas) { const t = l.join(' '); if (/Autor pedido|Contratante/i.test(t)) continue; const m = t.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/); if (m) return dig(m[1]); }
    return '';
  };
  function lerCadin(linhas) {
    const r = { tipo: 'CADIN', cnpj: cnpjDe(linhas), situacao: '', incluidoEm: '', emitidoEm: '', itens: [] }; let secao = '';
    linhas.forEach(l => {
      const t = l.join(' ');
      const m = t.match(/INCLU[ÍI]DO PELA RFB EM (\d{2}\/\d{2}\/\d{4})/i); if (m) { r.situacao = 'Incluído pela RFB'; r.incluidoEm = brIso(m[1]); }
      else if (/N[ÃA]O INCLU[ÍI]DO/i.test(t) && !r.situacao) r.situacao = 'Não incluído pela RFB';
      if (/Data de emiss[ãa]o do relat/i.test(t)) { const d = l.find(ehData); if (d) r.emitidoEm = brIso(d); }
      if (/Deve ser regularizado para exclus/i.test(t)) secao = 'Já incluído — regularizar para sair do CADIN';
      else if (/Motivar[áa]/i.test(t)) secao = 'Comunicado — pode levar à inclusão/manutenção se não regularizar (Lei 10.522/2002)';
      const datas = l.filter(ehData), vals = l.filter(ehValor), pa = l.find(ehPA);
      if (secao && datas.length >= 2 && vals.length >= 1 && pa) {
        const receita = l.filter(x => !ehData(x) && !ehValor(x) && x !== pa && !/^\[\d\]/.test(x)).join(' ').trim();
        // ordem visual: Receita | PA | Vencimento | Saldo | Comunicado | Informações
        r.itens.push({ tipo: 'CADIN', secao, receita, pa, venc: brIso(datas[0]), comunicado: brIso(datas[datas.length - 1]), saldo: num(vals[0]) });
      }
    });
    return r;
  }
  // Diagnóstico Fiscal (Relatório de Situação Fiscal do Integra Contador): várias seções, cada uma com o próprio cabeçalho de colunas
  // (Fontana: Receita|PA|Vcto|Vl. Original|Sdo. Devedor|Multa|Juros|Sdo. Dev. Cons.|Situação · Accurare: Receita|PA|Vcto|Vl.Original|Sdo.Devedor|Situação)
  const ROT_COL = [[/Vl\.?\s*Original/i, 'original'], [/Sdo\.?\s*Dev(edor)?\.?\s*Cons/i, 'consolidado'], [/Sdo\.?\s*Devedor/i, 'saldo'], [/Multa/i, 'multa'], [/Juros/i, 'juros']];
  function colunasDoCabecalho(t) {
    const achados = []; let resto = t;
    ROT_COL.forEach(([re, k]) => { const m = resto.match(re); if (m) { achados.push([resto.indexOf(m[0]), k]); resto = resto.slice(0, m.index) + ' '.repeat(m[0].length) + resto.slice(m.index + m[0].length); } });
    return achados.sort((a, b) => a[0] - b[0]).map(x => x[1]);
  }
  function lerDiagnostico(linhas) {
    const r = { tipo: 'Diagnóstico Fiscal', cnpj: cnpjDe(linhas), emitidoEm: '', itens: [], textos: [] }; let orgao = 'Receita Federal', secao = '', cols = [];
    linhas.forEach(l => {
      const t = l.join(' '), tt = t.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!r.emitidoEm) { const m = t.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/); if (m) r.emitidoEm = brIso(m[1]); }
      if (/Diagn[óo]stico Fiscal na Procuradoria/i.test(tt)) { orgao = 'PGFN'; secao = ''; return; }
      if (/Diagn[óo]stico Fiscal na Receita/i.test(tt)) { orgao = 'Receita Federal'; secao = ''; return; }
      if (/_{5,}/.test(t) && !/Dados Cadastrais|S[óo]cios|Certid[ãa]o|Final do Relat/i.test(tt) && tt.length > 3) { secao = tt.replace(/^Pend[êe]ncia\s*-\s*/i, ''); cols = []; return; }
      if (/N[ãa]o foram detectadas/i.test(tt)) { r.textos.push(orgao + ': ' + tt); return; }
      if (/^Receita\b/i.test(tt) && /PA|Exerc/i.test(tt)) { cols = colunasDoCabecalho(tt); return; }
      if (!secao) return;
      const iPa = l.findIndex(x => /^(\d{2}\/\d{4}|\d{4})$/.test(x)), vals = l.filter(ehValor), datas = l.filter(ehData);
      if (iPa > 0 && vals.length >= 1) {
        const receita = l.slice(0, iPa).join(' ').replace(/\s+/g, ' ').trim();
        const iUltVal = l.map((x, i) => ehValor(x) ? i : -1).filter(i => i >= 0).pop();
        const situacao = l.slice(iUltVal + 1).filter(x => !ehData(x)).join(' ').replace(/Situa[çc][ãa]o:?/i, '').trim();
        const it = { tipo: orgao === 'PGFN' ? 'PGFN' : 'Receita Federal', secao, receita, pa: l[iPa], venc: brIso(datas[0] || ''), situacao };
        const ks = cols.length ? cols : ['original', 'saldo', 'multa', 'juros', 'consolidado'];
        vals.forEach((v, i) => { if (ks[i]) it[ks[i]] = num(v); });
        r.itens.push(it);
      } else if (/omiss|declara|processo/i.test(secao) && tt.length > 6 && !/^(CNPJ|Receita|Per[íi]odo)/i.test(tt)) {
        // pendência sem valores (ex.: omissão de declaração): guarda a linha como está
        r.itens.push({ tipo: orgao === 'PGFN' ? 'PGFN' : 'Receita Federal', secao, receita: tt.slice(0, 160), pa: '', venc: '' });
      }
    });
    return r;
  }
  async function lerArquivoPdf(file) {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const linhas = await linhasDoPdf(pdf), txt = linhas.map(l => l.join(' ')).join('\n');
    if (/Cadin/i.test(txt) && /Relat[óo]rio de Inclus/i.test(txt)) return lerCadin(linhas);
    if (/INFORMA[ÇC][ÕO]ES DE APOIO|Diagn[óo]stico Fiscal/i.test(txt)) return lerDiagnostico(linhas);
    return { tipo: '?', cnpj: cnpjDe(linhas), itens: [] };
  }

  // ── dados ──
  const dados = () => { let v = null; try { v = S.g(KEY); } catch (e) { } return (v && typeof v === 'object') ? Object.assign({ verificacoes: [], empresas: {} }, v) : { verificacoes: [], empresas: {} }; };
  const salvar = d => { try { S.s(KEY, d); } catch (e) { toast('Não salvou: ' + e.message, 'err'); } };
  const chaveLinha = i => [i.tipo, i.receita, i.pa, i.venc, i.secao && i.tipo === 'CADIN' ? '' : ''].join('|');
  const eidDoCnpj = cnpj => { const e = (S.g('emps') || []).find(x => dig(x.cnpjNum || x.cnpj) === cnpj) || (S.g('emps') || []).find(x => dig(x.cnpjNum || x.cnpj).slice(0, 8) === cnpj.slice(0, 8)); return e ? String(e.eid) : ''; };

  function aplicarVerificacao(d, verif, lidos) {
    const quando = String(verif.verificado_em || '').slice(0, 10);
    (verif.clientes || []).forEach(c => {
      const cnpj = dig(c.cnpj); if (!cnpj) return;
      let emp = d.empresas[cnpj];
      if (c.status === 'ok') {
        if (emp) { let n = 0; Object.values(emp.linhas || {}).forEach(l => { if (l.aberta) { l.aberta = false; l.regularizadaEm = quando; n++; } }); emp.status = 'ok'; emp.ultimaVerif = quando; if (n) (emp.eventos = emp.eventos || []).push({ data: quando, texto: n + ' irregularidade(s) regularizada(s) — a SIEG não mostra mais pendência' }); }
        return;
      }
      if (c.status !== 'com') return;
      emp = d.empresas[cnpj] = emp || { nome: c.nome, eid: '', linhas: {}, eventos: [], primeira: quando };
      emp.nome = c.nome || emp.nome; emp.eid = emp.eid || eidDoCnpj(cnpj); emp.status = 'com'; emp.ultimaVerif = quando; emp.itensSieg = c.itens || [];
      const vistos = new Set();
      (c.arquivos || []).forEach(a => {
        const r = lidos[a.arquivo]; if (!r) return;
        if (r.tipo === 'CADIN') emp.cadin = { situacao: r.situacao, incluidoEm: r.incluidoEm, em: quando };
        if (r.emitidoEm) (emp.relatorios = emp.relatorios || {})[r.tipo] = r.emitidoEm; // data de emissão do relatório na SIEG (pode ser antiga)
        if (r.textos && r.textos.length) emp.obs = r.textos;
        r.itens.forEach(i => {
          const k = chaveLinha(i); vistos.add(k);
          const l = emp.linhas[k];
          if (!l) { emp.linhas[k] = Object.assign({}, i, { primeira: quando, ultima: quando, aberta: true, hist: [{ data: quando, saldo: i.saldo, consolidado: i.consolidado }] }); }
          else { Object.assign(l, i, { ultima: quando, aberta: true, regularizadaEm: '' }); if (!(l.hist || []).some(h => h.data === quando)) (l.hist = l.hist || []).push({ data: quando, saldo: i.saldo, consolidado: i.consolidado }); }
        });
      });
      // o que estava aberto e não apareceu nos PDFs desta vez = regularizado (só quando os PDFs foram lidos)
      // só regulariza o grupo (CADIN / Diagnóstico) que foi lido agora ou que a SIEG não lista mais — nunca quando o download daquele PDF deu erro
      const lidosTipos = new Set((c.arquivos || []).filter(a => lidos[a.arquivo]).map(a => lidos[a.arquivo].tipo === 'CADIN' ? 'CADIN' : 'DIAG'));
      const errTxt = (c.erros || []).join(' ').toLowerCase(), nomesSieg = (c.itens || []).map(i => String(i.nome).toLowerCase()).join(' ');
      const pode = g => lidosTipos.has(g) || (g === 'CADIN' ? (!/cadin/.test(nomesSieg) && !/cadin/.test(errTxt)) : (!/diagn/.test(nomesSieg) && !/diagn/.test(errTxt)));
      Object.entries(emp.linhas).forEach(([k, l]) => { const g = l.tipo === 'CADIN' ? 'CADIN' : 'DIAG'; if (l.aberta && !vistos.has(k) && pode(g)) { l.aberta = false; l.regularizadaEm = quando; } });
    });
  }

  async function importar() {
    if (!window.showDirectoryPicker) { toast('Use o Chrome ou o Edge para ler a pasta.', 'err'); return; }
    let h = null; try { h = await _lancctbCarregarHandleGenerico(PASTA); } catch (e) { }
    if (!h) { try { h = await window.showDirectoryPicker({ mode: 'read' }); await _lancctbSalvarHandleGenerico(PASTA, h); } catch (e) { return; } }
    try { let p = await h.queryPermission({ mode: 'read' }); if (p !== 'granted') p = await h.requestPermission({ mode: 'read' }); if (p !== 'granted') { toast('Sem permissão para ler a pasta.', 'err'); return; } } catch (e) { toast('Não consegui abrir a pasta: ' + e.message, 'err'); return; }
    const arqs = {}; for await (const [nome, it] of h.entries()) if (it.kind === 'file') arqs[nome] = it;
    const d = dados(), feitas = new Set((d.verificacoes || []).map(v => v.arquivo));
    const jsons = Object.keys(arqs).filter(n => /^_verificacao .*\.json$/i.test(n) && !feitas.has(n));
    if (!jsons.length) { toast('Nenhuma verificação nova na pasta. Rode antes o atalho "SIEG Irregularidades".', 'info'); return; }
    const verifs = []; for (const n of jsons) { try { verifs.push({ n, v: JSON.parse(await (await arqs[n].getFile()).text()) }); } catch (e) { } }
    verifs.sort((a, b) => String(a.v.verificado_em).localeCompare(String(b.v.verificado_em)));
    let pdfs = 0, erros = 0;
    for (const { n, v } of verifs) {
      const lidos = {};
      for (const c of v.clientes || []) for (const a of c.arquivos || []) { const fh = arqs[a.arquivo]; if (!fh) continue; try { lidos[a.arquivo] = await lerArquivoPdf(await fh.getFile()); pdfs++; } catch (e) { erros++; console.warn('Irregularidades: PDF', a.arquivo, e); } }
      aplicarVerificacao(d, v, lidos);
      const cs = v.clientes || [];
      d.verificacoes.push({ arquivo: n, data: String(v.verificado_em || '').slice(0, 16), clientes: cs.length, com: cs.filter(c => c.status === 'com').length, sem: cs.filter(c => c.status === 'ok').length });
    }
    // inclui sozinho na listagem do módulo as empresas com irregularidade (pedido do usuário)
    const semCad = []; try { const ad = ensureMenuAdicionadasMigrado('irregularidades'); let mud = false; Object.entries(d.empresas).forEach(([cnpj, e]) => { if (e.status !== 'com') return; e.eid = e.eid || eidDoCnpj(cnpj); if (!e.eid) { semCad.push(e.nome); return; } if (!ad[e.eid]) { ad[e.eid] = true; mud = true; } }); if (mud) setMenuAdicionadas('irregularidades', ad); } catch (e) { console.warn('Irregularidades: lista', e); }
    salvar(d); render();
    if (semCad.length) toast('Com irregularidade na SIEG mas sem cadastro no site: ' + semCad.slice(0, 5).join(', ') + (semCad.length > 5 ? '…' : ''), 'info');
    toast(verifs.length + ' verificação(ões) importada(s), ' + pdfs + ' PDF(s) lido(s)' + (erros ? ', ' + erros + ' com erro (veja o console)' : '') + '.', erros ? 'err' : 'ok');
  }
  async function trocarPasta() { try { const h = await window.showDirectoryPicker({ mode: 'read' }); await _lancctbSalvarHandleGenerico(PASTA, h); toast('Pasta guardada: ' + h.name, 'ok'); } catch (e) { } }

  // ── tela (padrão das listagens de empresas: lista com filtros → empresa) ──
  const cnpjDoEid = eid => { const e = (S.g('emps') || []).find(x => String(x.eid) === String(eid)); return e ? dig(e.cnpjNum || e.cnpj) : ''; };
  function resumoEmp(emp) { const ls = Object.values(emp.linhas || {}), ab = ls.filter(l => l.aberta); return { abertas: ab.length, total: ls.length, consolidado: ab.reduce((s, l) => s + (Number(l.consolidado != null ? l.consolidado : l.saldo) || 0), 0) }; }
  function topoHtml() {
    const d = dados(), uv = (d.verificacoes || []).slice(-1)[0];
    return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">'
      + '<button class="btn bp bsm" onclick="Irregularidades.importar()" title="Lê a pasta SIEG - Irregularidades (PDFs + resumo que o robô gerou) e inclui sozinho na lista as empresas com irregularidade">📥 Importar relatórios da SIEG</button>'
      + '<button class="btn bo bsm" onclick="Irregularidades.trocarPasta()" title="Escolher a pasta X:\\03 - CONTABIL\\Documentação Suporte para Conciliação\\Relatórios Fiscal\\SIEG - Irregularidades">📁 Pasta</button>'
      + '<button class="action-btn action-btn-excel" onclick="Irregularidades.excel()">📊 Gerar Excel</button></div>'
      + '<div style="font-size:12px;color:var(--slate)">' + (uv ? 'Última verificação importada: <b>' + E(String(uv.data).replace('T', ' ')) + '</b> — ' + uv.clientes + ' cliente(s) na SIEG, ' + uv.com + ' com irregularidade, ' + uv.sem + ' sem.' : 'Rode o atalho <b>"SIEG Irregularidades"</b> da área de trabalho e depois clique em <b>Importar relatórios da SIEG</b>.') + '</div>';
  }
  function abrir() {
    const la = document.getElementById('irregListaArea'), rt = document.getElementById('irregRoot'), tp = document.getElementById('irregTopo');
    if (la) la.style.display = ''; if (rt) rt.style.display = 'none'; if (tp) tp.innerHTML = topoHtml();
    if (typeof prepararAdicionarEmpresa === 'function') prepararAdicionarEmpresa('irregularidades');
  }
  function render() { if (ST.eid) renderEmp(); else abrir(); }
  function abrirEmp(eid) {
    ST.eid = String(eid); const la = document.getElementById('irregListaArea'), rt = document.getElementById('irregRoot');
    if (la) la.style.display = 'none'; if (rt) rt.style.display = ''; renderEmp();
  }
  function voltar() { ST.eid = ''; abrir(); }
  function renderEmp() {
    const el = document.getElementById('irregRoot'); if (!el) return;
    const empC = (S.g('emps') || []).find(x => String(x.eid) === ST.eid) || {}, cnpj = cnpjDoEid(ST.eid), d = dados(), emp = d.empresas[cnpj];
    let h = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><button class="btn bo bsm" onclick="Irregularidades.voltar()">← Empresas</button><b style="font-size:15px">#' + E(ST.eid) + ' ' + E(empC.nome || '') + '</b><span style="font-family:var(--mono);font-size:12px;color:var(--slate)">' + E(empC.cnpj || '') + '</span>'
      + '<label style="margin-left:auto;font-size:12.5px;display:flex;gap:5px;align-items:center"><input type="checkbox" ' + (ST.soAbertas ? 'checked' : '') + ' onchange="Irregularidades.soAbertas(this.checked)"> só em aberto</label></div>';
    if (!emp) { el.innerHTML = h + '<div style="padding:16px;border:1px dashed var(--border);border-radius:8px;color:var(--slate)">Nenhuma irregularidade importada para esta empresa (CNPJ ' + E(cnpj) + '). Rode o atalho "SIEG Irregularidades" e importe os relatórios.</div>'; return; }
    const r = resumoEmp(emp);
    h += '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:8px;font-size:12.5px">'
      + (emp.cadin && emp.cadin.incluidoEm ? '<span style="background:#fee2e2;color:#991b1b;font-weight:700;padding:3px 8px;border-radius:4px">CADIN: incluída pela RFB em ' + isoBr(emp.cadin.incluidoEm) + '</span>' : (emp.cadin ? '<span>CADIN: ' + E(emp.cadin.situacao || '—') + '</span>' : ''))
      + '<span>Última verificação: <b>' + isoBr(emp.ultimaVerif) + '</b></span>'
      + Object.entries(emp.relatorios || {}).map(([t, dt]) => { const velho = emp.ultimaVerif && (new Date(emp.ultimaVerif) - new Date(dt)) / 864e5 > 30; return '<span style="' + (velho ? 'background:#fee2e2;color:#991b1b;font-weight:700;padding:2px 6px;border-radius:4px' : 'color:var(--slate)') + '" title="Data em que a SIEG emitiu o relatório' + (velho ? ' — mais de 30 dias antes da verificação: pode estar desatualizado' : '') + '">' + E(t) + ' emitido em ' + isoBr(dt) + (velho ? ' ⚠' : '') + '</span>'; }).join('')
      + ((emp.itensSieg || []).length ? '<span style="color:var(--slate)">Na SIEG: ' + emp.itensSieg.map(i => E(i.nome) + ' (' + i.qtd + ')').join(' · ') + '</span>' : '')
      + '<b style="margin-left:auto;color:#dc2626">Em aberto: R$ ' + F(r.consolidado) + '</b></div>';
    const ls = Object.entries(emp.linhas || {}).filter(([, l]) => !ST.soAbertas || l.aberta).sort((a, b) => (b[1].aberta - a[1].aberta) || String(a[1].venc).localeCompare(String(b[1].venc)) || String(a[1].receita).localeCompare(String(b[1].receita)));
    const th = (t, al) => '<th style="padding:7px 8px;text-align:' + (al || 'left') + ';white-space:nowrap">' + t + '</th>';
    h += '<div class="tw" style="overflow-x:auto"><table class="data" style="width:100%;font-size:12.5px"><thead><tr>' + th('Descrição') + th('Origem / consequência') + th('Competência') + th('Vencimento original') + th('Valor original', 'right') + th('Saldo atualizado', 'right') + th('Situação') + th('Observação') + th('', 'right') + '</tr></thead><tbody>';
    if (!ls.length) h += '<tr><td colspan="9" style="padding:14px;color:var(--slate)">Nenhuma irregularidade ' + (ST.soAbertas ? 'em aberto' : '') + '.</td></tr>';
    ls.forEach(([k, l]) => {
      const atual = l.consolidado != null ? l.consolidado : l.saldo;
      const sit = l.aberta ? (l.pagoManual ? 'Marcado pago em ' + isoBr(l.pagoManual) + ' — ainda aparece na SIEG' : (l.primeira !== l.ultima ? 'Em aberto — a mesma desde ' + isoBr(l.primeira) + ', atualizada em ' + isoBr(l.ultima) : 'Em aberto')) : (l.pagoManual && !l.regularizadaEm ? 'Pago (marcado em ' + isoBr(l.pagoManual) + ')' : 'Regularizada em ' + isoBr(l.regularizadaEm));
      const corSit = l.aberta ? (l.pagoManual ? 'background:#dbeafe;color:#1e40af' : 'background:#fef3c7;color:#92400e') : 'background:#dcfce7;color:#166534';
      const origem = l.tipo === 'CADIN' ? 'CADIN — ' + (l.secao || '') + (l.comunicado ? ' (comunicado em ' + isoBr(l.comunicado) + ')' : '') : (l.tipo + (l.secao ? ' — ' + l.secao : '') + (l.situacao ? ' · ' + l.situacao : ''));
      const kk = E(k).replace(/'/g, '&#39;');
      h += '<tr style="' + (l.aberta ? '' : 'opacity:.65') + '"><td style="padding:7px 8px">' + E(l.receita) + '</td><td style="padding:7px 8px;font-size:11.5px">' + E(origem) + '</td><td style="padding:7px 8px;font-family:var(--mono)">' + E(l.pa) + '</td><td style="padding:7px 8px;font-family:var(--mono)">' + isoBr(l.venc) + '</td>'
        + '<td style="padding:7px 8px;text-align:right;font-family:var(--mono)">' + (l.original != null ? 'R$ ' + F(l.original) : (l.tipo === 'CADIN' && l.saldo != null ? 'R$ ' + F(l.saldo) : '—')) + '</td>'
        + '<td style="padding:7px 8px;text-align:right;font-family:var(--mono);color:#dc2626;font-weight:600">' + (atual != null ? 'R$ ' + F(atual) : '—') + '</td>'
        + '<td style="padding:7px 8px"><span style="' + corSit + ';font-weight:700;font-size:11px;padding:2px 7px;border-radius:4px;white-space:nowrap">' + E(sit) + '</span></td><td style="padding:7px 8px;font-size:11.5px">' + E(l.obs || '—') + '</td>'
        + '<td style="padding:7px 8px;text-align:right;white-space:nowrap">' + (l.aberta && !l.pagoManual ? '<button class="btn bsm" style="background:#0F7B6C;color:#fff;border:none" onclick="Irregularidades.pago(\'' + kk + '\')" title="Marcar como pago (a linha continua até a SIEG confirmar)">✓ Pago</button> ' : '')
        + '<button class="btn bo bsm" onclick="Irregularidades.hist(\'' + kk + '\')" title="Histórico do saldo a cada verificação">📊</button> <button class="btn bo bsm" onclick="Irregularidades.editar(\'' + kk + '\')" title="Escrever observação">✏️</button></td></tr>';
    });
    (emp.eventos || []).forEach(ev => { h += '<tr><td colspan="9" style="padding:7px 8px;font-weight:700;color:#166534">✔ ' + isoBr(ev.data) + ' — ' + E(ev.texto) + '</td></tr>'; });
    h += '</tbody></table></div>';
    if ((emp.obs || []).length) h += '<div style="font-size:12px;color:var(--slate);margin-top:8px">' + emp.obs.map(E).join('<br>') + '</div>';
    h += '<div style="font-size:11.5px;color:var(--slate);margin-top:8px">Saldo atualizado = saldo devedor consolidado (com multa e juros até a data do relatório). Nada é apagado: a mesma irregularidade no mês seguinte fica na mesma linha, atualizada; quando some da SIEG vira "Regularizada". CADIN — Lei 10.522/2002: depois de regularizado, a exclusão ocorre em até 5 dias úteis (art. 2º, § 5º).</div>';
    el.innerHTML = h;
  }
  function linhaAtual(k) { const d = dados(), cnpj = cnpjDoEid(ST.eid), emp = d.empresas[cnpj]; return { d, l: emp && emp.linhas ? emp.linhas[k] : null }; }
  function pago(k) { const { d, l } = linhaAtual(k); if (!l) return; if (!confirm('Marcar como pago? A linha continua na lista até a próxima verificação da SIEG confirmar.')) return; l.pagoManual = new Date().toISOString().slice(0, 10); salvar(d); renderEmp(); }
  function editar(k) { const { d, l } = linhaAtual(k); if (!l) return; const v = prompt('Observação:', l.obs || ''); if (v == null) return; l.obs = v.trim(); salvar(d); renderEmp(); }
  function hist(k) { const { l } = linhaAtual(k); if (!l) return; alert((l.receita || '') + ' ' + (l.pa || '') + '\n\n' + (l.hist || []).map(x => isoBr(x.data) + ': saldo R$ ' + F(x.saldo) + (x.consolidado != null ? ' · consolidado R$ ' + F(x.consolidado) : '')).join('\n') + (l.regularizadaEm ? '\n\nRegularizada em ' + isoBr(l.regularizadaEm) : '')); }
  async function excel() {
    if (typeof ExcelJS === 'undefined') { toast('Biblioteca de Excel não carregada.', 'err'); return; }
    const d = dados(), wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('Irregularidades');
    ws.columns = [10, 40, 18, 14, 40, 30, 10, 12, 14, 14, 12, 12, 14, 14, 30].map(w => ({ width: w }));
    ws.mergeCells('A1:O1'); ws.getCell('A1').value = 'JJR CONSULTORIA CONTÁBIL SS'; ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F7B6C' } };
    ws.mergeCells('A2:O2'); ws.getCell('A2').value = 'Irregularidades (SIEG — CADIN e Diagnóstico Fiscal)'; ws.getCell('A2').font = { bold: true };
    const hr = ws.getRow(4); ['ID', 'Empresa', 'CNPJ', 'Origem', 'Seção', 'Receita', 'Período', 'Vencimento', 'Valor original', 'Saldo devedor', 'Multa', 'Juros', 'Consolidado', 'Comunicado CADIN', 'Situação'].forEach((t, i) => { const c = hr.getCell(i + 1); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; });
    let r = 5; Object.entries(d.empresas || {}).forEach(([cnpj, e]) => Object.values(e.linhas || {}).forEach(l => { const row = ws.getRow(r++); [e.eid, e.nome, cnpj, l.tipo, l.secao, l.receita, l.pa, isoBr(l.venc), l.original, l.saldo, l.multa, l.juros, l.consolidado, isoBr(l.comunicado), l.aberta ? 'Em aberto (atualizada em ' + isoBr(l.ultima) + ')' : 'Regularizada em ' + isoBr(l.regularizadaEm)].forEach((v, i) => { row.getCell(i + 1).value = v; }); [9, 10, 11, 12, 13].forEach(c => row.getCell(c).numFmt = '#,##0.00'); }));
    const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Irregularidades_SIEG.xlsx'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  root.Irregularidades = { render, abrir, abrirEmp, voltar, importar, trocarPasta, excel, pago, editar, hist, soAbertas: v => { ST.soAbertas = v; renderEmp(); }, _linhas: linhasDoPdf, _cadin: lerCadin, _diag: lerDiagnostico, _aplicar: aplicarVerificacao };
})(typeof window !== 'undefined' ? window : globalThis);

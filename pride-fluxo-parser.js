/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * FLUXO DE CAIXA — PRIDE SURGERY (eid 142) — leitor SEM IA dos relatórios do ERP "VM-Financeiro"
 *   • "Relatório de Documentos Pagos por Dia"      → saídas   (CSV: Pagos_AAAA-MM.csv    | PDF)
 *   • "Relatório de Documentos Recebidos por Dia"  → entradas (CSV: Recebidos_AAAA-MM.csv | PDF)
 * Pedido do usuário 21/10/2026: "aprenda a ler os pagamentos e recebimentos, fluxos, da PRIDE; eles mandam em Excel e às vezes em PDF".
 *
 * Regras aprendidas (confirmadas com os arquivos de jul/ago/set 2026):
 *  - DATA do Fluxo = data do PAGAMENTO/RECEBIMENTO (CSV: "Pagto"/"Recebimento"; PDF: o dia que agrupa os documentos). "Entrada" é a data em que o documento entrou no sistema — não é a data do dinheiro.
 *  - Valor Pago/Recebido = Valor + Var(+) − Var(−) (conferido em todas as linhas). Var(+) = juros/multa, Var(−) = desconto/abatimento.
 *  - Série "IM" = lançamento interno (folha, adiantamentos, tarifas, impostos…): o "Docto" é um número inventado (ex.: 28022025) e "Des" é a ordem do lançamento recorrente (26, 27, 28…) — NÃO são nota fiscal nem parcela, então ficam vazios.
 *    Nelas o "fornecedor" é na prática a CLASSIFICAÇÃO da despesa (FOLHA DE PAGAMENTO - SALARIOS, TAXAS DIVERSAS, IRPJ A RECOLHER…): vai também em "Descrição da conta" pra dar pra criar Regra por ela.
 *  - Séries 1, 2, 5 (compras) e E1 (vendas) são NF: Docto = nº da NF, Des/Desdob = parcela.
 *  - Ref = forma de pagamento (BO boleto, PX pix, DB débito, CC cartão, AF antecipação/financiamento, DP depósito).
 *  - O PDF vem GIRADO (cada documento é uma coluna; os campos são linhas) e NÃO traz CNPJ; nomes longos vêm cortados pelo sistema. O CSV traz CNPJ e razão social completa. Os totais por dia do PDF (valor e quantidade) conferem a leitura.
 * Funciona no navegador (window.PrideFluxo) e no Node (module.exports) — os testes rodam em Node.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const cents = s => { s = String(s == null ? '' : s).trim(); if (!s) return 0; const neg = /^-|-$/.test(s); const t = s.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.'); const v = Math.round(parseFloat(t || '0') * 100); return neg ? -Math.abs(v) : v; };
  const dataIso = s => { const m = String(s || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
  const brl = c => { const neg = c < 0; c = Math.abs(c); return (neg ? '-' : '') + String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + String(c % 100).padStart(2, '0'); };
  const SERIES_NF = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', 'E1', 'E2', 'U', 'A1']);
  const ehNf = serie => SERIES_NF.has(String(serie || '').toUpperCase());
  const FORMAS = { BO: 'Boleto', PX: 'Pix', DB: 'Débito', CC: 'Cartão', AF: 'Antecipação/Financ.', DP: 'Depósito', CH: 'Cheque', TD: 'TED/DOC', DI: 'Dinheiro' };

  // ───────────── CSV ─────────────
  function decodificar(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) { t = new TextDecoder('windows-1252').decode(u8); }
    return t.replace(/^﻿/, '');
  }
  // CSV simples com aspas; separador detectado pelo cabeçalho (; , tab). NUNCA converte nada — tudo fica como texto (o SheetJS lia 01/07/2026 como 7 de janeiro e 999,92 como 99992).
  function parseCsv(texto) {
    const linhas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!linhas.length) return [];
    const cab = linhas[0]; const cont = c => (cab.match(new RegExp(c === '\t' ? '\\t' : '\\' + c, 'g')) || []).length;
    const sep = [';', '\t', ','].map(c => [c, cont(c)]).sort((a, b) => b[1] - a[1])[0][0];
    return linhas.map(l => {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < l.length; i++) { const ch = l[i];
        if (q) { if (ch === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
        else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch; }
      out.push(cur); return out;
    });
  }
  // Detecta o relatório pelo cabeçalho. Devolve 'pagos' | 'recebidos' | null
  function detectarMatriz(matriz) {
    if (!matriz || !matriz.length) return null;
    const h = matriz[0].map(norm);
    const tem = n => h.includes(n);
    if (tem('docto') && tem('ref') && tem('valor pago') && tem('pagto') && (tem('razao social') || tem('nome fantasia'))) return 'pagos';
    if (tem('docto') && tem('desdob') && tem('ref') && tem('valor recebido') && tem('recebimento')) return 'recebidos';
    return null;
  }
  function chaveDe(r, seq) { return ['pg', r.tipo, r.data, r.serie, r.docto, r.desdob, r.pago, r.nome, r.ref, r.obs, seq].join('|'); }
  function registrosDeMatriz(matriz, tipo) {
    const h = matriz[0].map(norm); const ix = n => h.indexOf(n); const ixs = (...ns) => { for (const n of ns) { const i = ix(n); if (i >= 0) return i; } return -1; };
    const pg = tipo === 'pagos';
    const c = {
      serie: ixs('s', 'serie'), docto: ix('docto'), des: ixs('des', 'desdob'), ref: ix('ref'), emissao: ix('emissao'), venc: ix('vencimento'),
      varMais: ixs('var(+)', 'variacao(+)'), varMenos: ixs('var(-)', 'variacao(-)'), valor: ix('valor'), obs: ixs('obs', 'observacao'),
      pago: pg ? ix('valor pago') : ix('valor recebido'), data: pg ? ix('pagto') : ix('recebimento'),
      codigo: ixs('cod. fornecedor', 'cod. cliente'), nome: ixs('razao social', 'razao social cliente'), cnpj: ixs('cnpj', 'cnpj cliente'), fantasia: ixs('nome fantasia', 'nome fantasia cliente'),
    };
    const g = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : '');
    const regs = [], vistos = new Map(), erros = [];
    for (let i = 1; i < matriz.length; i++) {
      const r = matriz[i]; if (!r || r.every(x => !String(x || '').trim())) continue;
      const data = dataIso(g(r, c.data));
      if (!data) { erros.push(`Linha ${i + 1}: data inválida "${g(r, c.data)}"`); continue; }
      const reg = { tipo: pg ? 'saida' : 'entrada', data, serie: g(r, c.serie), docto: g(r, c.docto), desdob: g(r, c.des), ref: g(r, c.ref).toUpperCase(), emissao: dataIso(g(r, c.emissao)), vencimento: dataIso(g(r, c.venc)),
        valor: cents(g(r, c.valor)), varMais: cents(g(r, c.varMais)), varMenos: cents(g(r, c.varMenos)), pago: cents(g(r, c.pago)), obs: g(r, c.obs), nome: g(r, c.nome), cnpj: g(r, c.cnpj).replace(/\D/g, ''), codigo: g(r, c.codigo), fantasia: g(r, c.fantasia), origem: 'csv' };
      if (reg.valor + reg.varMais - reg.varMenos !== reg.pago) erros.push(`Linha ${i + 1}: Valor + Var(+) − Var(−) não fecha com ${pg ? 'Valor Pago' : 'Valor Recebido'} (${brl(reg.valor)} + ${brl(reg.varMais)} − ${brl(reg.varMenos)} ≠ ${brl(reg.pago)})`);
      const k0 = chaveDe(reg, 0), n = (vistos.get(k0) || 0) + 1; vistos.set(k0, n); reg.chave = chaveDe(reg, n);
      regs.push(reg);
    }
    return { tipo, registros: regs, erros };
  }

  // ───────────── PDF (girado) ─────────────
  // paginas: [[{str,x,y,w}, …], …] (coordenadas do pdf.js: x = transform[4], y = transform[5]).
  const reData = /^\d{2}\/\d{2}\/\d{4}$/, reMoney = /^-?[\d.]*\d,\d{2}$/;
  function pdfParsear(paginas) {
    const avisos = [], regs = []; let tipo = null; const dias = new Map(); let diaAnterior = null, yRefAnt = null, yObsAnt = null; let gerais = null;
    paginas.forEach((its0, pi) => {
      const its = its0.map(i => ({ s: String(i.str || '').trim(), x: Math.round(i.x), y: Math.round(i.y), w: Math.round(i.w || 0) })).filter(i => i.s);
      const txt = its.map(i => i.s).join(' ');
      if (!tipo) tipo = /Documentos Pagos por Dia/i.test(txt) ? 'pagos' : /Documentos Recebidos por Dia/i.test(txt) ? 'recebidos' : null;
      if (!tipo) return;
      const med = a => { a = a.slice().sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : null; };
      // páginas de continuação (documentos de um dia que não coube na anterior) vêm SEM a coluna de rótulos — usa as posições da página anterior
      const yRef = med(its.filter(i => i.s === 'Ref').map(i => i.y)) ?? yRefAnt, yObs = med(its.filter(i => i.s === 'Obs').map(i => i.y)) ?? yObsAnt;
      yRefAnt = yRef; yObsAnt = yObs;
      { const g = its.find(i => /^Totais Gerais/i.test(i.s)); if (g) { const col = its.filter(i => Math.abs(i.x - g.x) <= 6).sort((a, b) => a.y - b.y); const mm = col.filter(i => reMoney.test(i.s)); const qq = col.filter(i => /^\d+$/.test(i.s)); gerais = { totalPdf: cents((mm[mm.length - 1] || {}).s), qtdPdf: qq.length ? parseInt(qq[qq.length - 1].s, 10) : null }; } }
      if (yRef == null) return;
      // cabeçalhos de dia: a data fica logo acima/ao lado do "Dia:" (mesmo x)
      const diaLabels = its.filter(i => i.s === 'Dia:');
      const heads = diaLabels.map(l => { const d = its.filter(i => reData.test(i.s) && Math.abs(i.x - l.x) <= 6 && i.y > l.y).sort((a, b) => a.y - b.y)[0]; return d ? { x: l.x, data: dataIso(d.s) } : null; }).filter(Boolean).sort((a, b) => a.x - b.x);
      const diaDoX = x => { let h = null; heads.forEach(hh => { if (hh.x < x) h = hh; }); return h ? h.data : diaAnterior; };
      // colunas de documento: itens na faixa do "Ref" (menos o rótulo e os totais do dia)
      const colunas = [...new Set(its.filter(i => Math.abs(i.y - yRef) <= 5 && i.s !== 'Ref' && !/^Totais/i.test(i.s) && /^[A-Z]{2}$/.test(i.s)).map(i => i.x))].sort((a, b) => a - b);
      const colunasTot = its.filter(i => /^Totais do Dia/i.test(i.s)).map(i => i.x).sort((a, b) => a - b);
      const daColuna = (x, tol = 3) => its.filter(i => Math.abs(i.x - x) <= tol).sort((a, b) => a.y - b.y);
      colunas.forEach(x => {
        const col = daColuna(x); const data = diaDoX(x);
        const ref = col.find(i => Math.abs(i.y - yRef) <= 5 && /^[A-Z]{2}$/.test(i.s)).s;
        const serie = (col.find(i => i.y < 45) || {}).s || '';
        const money = col.filter(i => reMoney.test(i.s) && i.y > 380).sort((a, b) => a.y - b.y);
        const datas = col.filter(i => reData.test(i.s)).sort((a, b) => a.y - b.y);
        const reg = { tipo: tipo === 'pagos' ? 'saida' : 'entrada', data, serie, ref, origem: 'pdf', pagina: pi + 1 };
        if (money.length !== 4) { avisos.push(`Página ${pi + 1}, coluna x=${x}: esperava 4 valores (Valor, Var+, Var−, ${tipo === 'pagos' ? 'Pago' : 'Recebido'}) e achei ${money.length}.`); }
        reg.valor = cents((money[0] || {}).s); reg.varMais = cents((money[1] || {}).s); reg.varMenos = cents((money[2] || {}).s); reg.pago = cents((money[3] || {}).s);
        reg.emissao = dataIso((datas[0] || {}).s); reg.vencimento = dataIso((datas[1] || {}).s);
        // Docto/Des
        if (tipo === 'pagos') { const d = col.find(i => /^\S+\/\d+$/.test(i.s) && i.y > 200 && i.y < 240); if (d) { const p = d.s.split('/'); reg.docto = p[0]; reg.desdob = p[1]; } else { reg.docto = ''; reg.desdob = ''; } }
        else { const zona = col.filter(i => i.y > 235 && i.y < yRef - 5).sort((a, b) => a.y - b.y); const nums = zona.filter(i => /^\d+$/.test(i.s)); reg.docto = (nums[0] || {}).s || ''; reg.desdob = (nums[1] || {}).s || ''; }
        // nome (cliente/fornecedor) e códigos: faixa baixa da coluna
        const baixo = col.filter(i => i.y >= 45 && i.y < 200 && !reData.test(i.s));
        const nomes = baixo.filter(i => !/^\d+$/.test(i.s)); const cods = baixo.filter(i => /^\d+$/.test(i.s));
        reg.nome = nomes.map(i => i.s).join(' ').trim(); reg.codigo = (cods[0] || {}).s || '';
        reg.obs = yObs == null ? '' : col.filter(i => i.y >= yObs - 3 && !reMoney.test(i.s) && !reData.test(i.s)).map(i => i.s).join(' ').trim();
        reg.cnpj = ''; reg.fantasia = '';
        regs.push(reg);
      });
      // totais do dia (conferência): valor pago/recebido e quantidade de documentos
      colunasTot.forEach(x => {
        const col = daColuna(x, 4); const data = diaDoX(x); if (!data) return;
        const money = col.filter(i => reMoney.test(i.s) && i.y > 380).sort((a, b) => a.y - b.y);
        const qtd = col.find(i => /^\d+$/.test(i.s) && i.y > 100 && i.y < 200);
        const d = dias.get(data) || { data, totalPdf: 0, qtdPdf: 0, achou: false }; d.achou = true;
        d.totalPdf += cents((money[money.length - 1] || {}).s); d.qtdPdf += qtd ? parseInt(qtd.s, 10) : 0; dias.set(data, d);
      });
      if (heads.length) diaAnterior = heads[heads.length - 1].data;
    });
    if (!tipo) return null;
    // datas dos registros sem dia (ficaram antes do 1º cabeçalho da 1ª página) → erro
    const semData = regs.filter(r => !r.data); if (semData.length) avisos.push(`${semData.length} documento(s) sem o dia de pagamento identificado.`);
    const lidos = regs.filter(r => r.data);
    const conferencia = [...dias.values()].sort((a, b) => a.data.localeCompare(b.data)).map(d => { const doDia = lidos.filter(r => r.data === d.data); const totalLido = doDia.reduce((s, r) => s + r.pago, 0); return Object.assign(d, { qtdLido: doDia.length, totalLido, ok: totalLido === d.totalPdf && doDia.length === d.qtdPdf }); });
    const dif = conferencia.filter(d => !d.ok);
    if (dif.length) avisos.push('Totais do dia que NÃO fecham com a leitura: ' + dif.map(d => `${d.data.split('-').reverse().join('/')} (PDF ${d.qtdPdf} doc. R$ ${brl(d.totalPdf)} × lido ${d.qtdLido} doc. R$ ${brl(d.totalLido)})`).join('; '));
    if (gerais) { const tot = lidos.reduce((s, r) => s + r.pago, 0); if (gerais.totalPdf && gerais.totalPdf !== tot) avisos.push(`Total geral do PDF R$ ${brl(gerais.totalPdf)} × lido R$ ${brl(tot)}.`); }
    const sem = conferencia.length === 0; if (sem) avisos.push('O PDF não trouxe os totais por dia — a leitura não pôde ser conferida.');
    const vistos = new Map();
    lidos.forEach(r => { if (r.valor + r.varMais - r.varMenos !== r.pago) avisos.push(`Documento de ${r.data} ${r.nome}: Valor + Var(+) − Var(−) não fecha com o valor pago.`); const k0 = chaveDe(r, 0), n = (vistos.get(k0) || 0) + 1; vistos.set(k0, n); r.chave = chaveDe(r, n); });
    return { tipo, registros: lidos, conferencia, gerais, avisos, paginas: paginas.length };
  }

  // ───────────── do registro do ERP para a linha do Fluxo ─────────────
  function paraFluxo(r) {
    const nf = ehNf(r.serie);
    const classificacao = !nf ? (r.nome || '') : '';
    return {
      data: r.data, descricao: r.obs || r.nome || '(sem descrição)', cliente_fornecedor_nome: r.nome || null, cnpj_cpf: r.cnpj || null,
      documento_numero: nf && r.docto ? r.docto : null, numero: nf && r.docto ? r.docto : null, parcela: nf && /^\d+$/.test(r.desdob || '') ? parseInt(r.desdob, 10) : null,
      descricao_conta_origem: classificacao || null, forma_pagamento: r.ref || null, data_vencimento: r.vencimento || null,
      valor_saida: r.tipo === 'saida' ? r.pago / 100 : 0, valor_entrada: r.tipo === 'entrada' ? r.pago / 100 : 0,
      valor_juros: r.tipo === 'saida' ? r.varMais / 100 : 0, valor_desconto: r.tipo === 'saida' ? r.varMenos / 100 : 0, valor_multa: 0, chave_importacao: r.chave,
    };
  }

  const API = { norm, cents, brl, dataIso, decodificar, parseCsv, detectarMatriz, registrosDeMatriz, pdfParsear, paraFluxo, ehNf, FORMAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PrideFluxo = API;
})(typeof window !== 'undefined' ? window : globalThis);

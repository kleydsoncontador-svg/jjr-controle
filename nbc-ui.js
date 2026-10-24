/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * NORMAS BRASILEIRAS DE CONTABILIDADE (NBC) — módulo do site  (pedido do usuário 24/10/2026)
 * Estrutura: 3 seções do CFC (Normas Completas · Normas Simplificadas para PMEs · Normas Específicas); cada norma tem a ÚLTIMA REVISÃO vigente,
 * um botão "Atualizar versão (IA)" e uma caixa com a ÚLTIMA SUBSTITUIÇÃO (como era antes × como ficou). O TEXTO das normas NÃO é carregado nesta etapa.
 * Dados em dados_app: chave "nbc_normas" = { secoes:{ completas:[…], pmes:[…], especificas:[…] } }. A IA só PROPÕE; nada muda sem o usuário confirmar.
 * Depende do site: S, esc, toast, currentUser, isAdmin, SUPABASE_URL/SUPABASE_ANON_KEY.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KEY = 'nbc_normas';
  const SECOES = [
    { id: 'completas', nome: 'Normas Completas', url: 'https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/normas-completas/' },
    { id: 'pmes', nome: 'Normas Simplificadas para PMEs', url: 'https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/normas-simplificadas-para-pmes/' },
    { id: 'especificas', nome: 'Normas Específicas', url: 'https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/normas-especificas/' },
  ];
  // Lista inicial = o que aparece na página "Normas Completas" do CFC (tabela do CFC conferida em 24/10/2026). As outras duas seções começam vazias (cadastre pelo "+ Adicionar norma" ou peça à IA).
  const N = (codigo, nome, rev, dou, cpc, iasb) => ({ id: 'n_' + codigo.replace(/\W+/g, '_').toLowerCase(), codigo, nome, revisao: rev, dou, cpc, iasb, url: '', historico: [], texto: '' });
  const SEED_COMPLETAS = [
    N('NBC TG ESTRUTURA CONCEITUAL', 'Estrutura Conceitual para Relatório Financeiro', '', '13/12/2019', 'CPC 00R2', 'Framework'),
    N('NBC TG 01', 'Redução ao Valor Recuperável de Ativos', 'R4', '22/12/2017', 'CPC 01R1', 'IAS 36'),
    N('NBC TG 02', 'Efeitos das Mudanças nas Taxas de Câmbio e Conversão de Demonstrações Contábeis', 'R3', '22/12/2017', 'CPC 02R2', 'IAS 21'),
    N('NBC TG 03', 'Demonstração dos Fluxos de Caixa', 'R3', '22/12/2016', 'CPC 03R2', 'IAS 7'),
    N('NBC TG 04', 'Ativo Intangível', 'R4', '22/12/2017', 'CPC 04R1', 'IAS 38'),
    N('NBC TG 05', 'Divulgação sobre Partes Relacionadas', 'R3', '01/12/2014', 'CPC 05R1', 'IAS 24'),
    N('NBC TG 06', 'Arrendamentos', 'R3', '22/12/2017', 'CPC 06R2', 'IFRS 16'),
    N('NBC TG 07', 'Subvenção e Assistência Governamentais', 'R2', '22/12/2017', 'CPC 07R1', 'IAS 20'),
    N('NBC TG 09', 'Demonstração do Valor Adicionado (DVA)', 'R1', '08/03/2024', 'CPC 09R1', 'Não há'),
    N('NBC TG 10', 'Pagamento Baseado em Ações', 'R3', '22/12/2017', 'CPC 10R1', 'IFRS 2'),
    N('NBC TG 12', 'Ajuste a Valor Presente', 'R1', '03/11/2023', 'CPC 12R1', 'Não há'),
    N('NBC TG 15', 'Combinação de Negócios', 'R4', '22/12/2017', 'CPC 15 R1', 'IFRS 3'),
    N('NBC TG 16', 'Estoques', 'R2', '22/12/2017', 'CPC 16R1', 'IAS 2'),
    N('NBC TG 18', 'Investimento em Coligada e em Empreendimento Controlado em Conjunto', 'R4', '22/12/2017', 'CPC 18R2', 'IAS 28'),
    N('NBC TG 19', 'Negócios em Conjunto', 'R2', '06/11/2015', 'CPC 19R2', 'IFRS 11'),
    N('NBC TG 20', 'Custos de Empréstimos', 'R2', '22/12/2017', 'CPC 20R1', 'IAS 23'),
    N('NBC TG 21', 'Demonstração Intermediária', 'R4', '22/12/2017', 'CPC 21R1', 'IAS 34'),
    N('NBC TG 22', 'Informações por Segmento', 'R2', '06/11/2015', 'CPC 22', 'IFRS 8'),
    N('NBC TG 23', 'Políticas Contábeis, Mudança de Estimativa e Retificação de Erro', 'R2', '22/12/2017', 'CPC 23', 'IAS 8'),
    N('NBC TG 24', 'Evento Subsequente', 'R2', '22/12/2017', 'CPC 24', 'IAS 10'),
    N('NBC TG 25', 'Provisões, Passivos Contingentes e Ativos Contingentes', 'R2', '22/12/2017', 'CPC 25', 'IAS 37'),
    N('NBC TG 26', 'Apresentação das Demonstrações Contábeis', 'R5', '22/12/2017', 'CPC 26R1', 'IAS 1'),
    N('NBC TG 27', 'Ativo Imobilizado', 'R4', '22/12/2017', 'CPC 27', 'IAS 16'),
    N('NBC TG 28', 'Propriedade para Investimento', 'R4', '22/12/2017', 'CPC 28', 'IAS 40'),
    N('NBC TG 29', 'Ativo Biológico e Produto Agrícola', 'R2', '06/11/2015', 'CPC 29', 'IAS 41'),
    N('NBC TG 31', 'Ativo Não Circulante Mantido para Venda e Operação Descontinuada', 'R4', '22/12/2017', 'CPC 31', 'IFRS 5'),
    N('NBC TG 32', 'Tributos sobre o Lucro', 'R4', '22/12/2017', 'CPC 32', 'IAS 12'),
    N('NBC TG 33', 'Benefícios a Empregados', 'R2', '06/11/2015', 'CPC 33R1', 'IAS 19'),
    N('NBC TG 35', 'Demonstrações Separadas', 'R2', '26/12/2014', 'CPC 35R2', 'IAS 27'),
    N('NBC TG 36', 'Demonstrações Consolidadas', 'R3', '06/11/2015', 'CPC 36R3', 'IFRS 10'),
    N('NBC TG 37', 'Adoção Inicial das Normas Internacionais de Contabilidade', 'R5', '22/12/2017', 'CPC 37R1', 'IFRS 1'),
    N('NBC TG 39', 'Instrumentos Financeiros: Apresentação', 'R5', '22/12/2017', 'CPC 39', 'IAS 32'),
    N('NBC TG 40', 'Instrumentos Financeiros: Evidenciação', 'R3', '22/12/2017', 'CPC 40R1', 'IFRS 7'),
    N('NBC TG 41', 'Resultado por Ação', 'R2', '22/12/2017', 'CPC 41', 'IAS 33'),
    N('NBC TG 42', 'Contabilidade em Economia Hiperinflacionária', '', '21/12/2018', 'CPC 42', 'IAS 29'),
    N('NBC TG 43', 'Adoção Inicial das NBC Ts Convergidas em 2009', '', '1.315/10', 'CPC 43R1', 'Não há'),
    N('NBC TG 44', 'Demonstrações Combinadas', '', '26/06/2013', 'CPC 44', 'Não há'),
    N('NBC TG 45', 'Divulgação de Participações em Outras Entidades', 'R3', '22/12/2017', 'CPC 45', 'IFRS 12'),
    N('NBC TG 46', 'Mensuração do Valor Justo', 'R2', '22/12/2017', 'CPC 46', 'IFRS 13'),
    N('NBC TG 47', 'Receita de Contrato com Cliente', '', '22/12/2016', 'CPC 47', 'IFRS 15'),
    N('NBC TG 48', 'Instrumentos Financeiros', '', '22/12/2016', 'CPC 48', 'IFRS 9'),
    N('NBC TG 49', 'Contabilização e Relatório Contábil de Planos de Benefícios de Aposentadoria', '', '24/05/2018', 'CPC 49', 'IAS 26'),
    N('NBC TG 50', 'Contratos de Seguro', '', '02/09/2021', 'CPC 50', 'IFRS 17'),
    N('NBC TG 51', 'Apresentação e Divulgação nas Demonstrações Contábeis', '', '25/02/2026', 'CPC 51', 'IFRS 18'),
    N('NBC TG 900', 'Entidades em Liquidação', '', '20/04/2021', 'CPC Entidades em Liquidação', 'Não há'),
    N('ITG 01', 'Contratos de Concessão', 'R1', '22/12/2017', 'ICPC 01R1', 'IAS12'),
    N('ITG 07', 'Distribuição de Lucros in Natura', 'R1', '20/12/2013', 'ICPC 07', 'IAS 17'),
    N('ITG 08', 'Contabilização da Proposta de Pagamento de Dividendos', '', '1.398/12', 'ICPC 08 R1', 'Não há'),
    N('ITG 09', 'Demonstrações Contábeis Individuais, Demonstrações Separadas, Demonstrações Consolidadas e Aplicação do Método de Equivalência Patrimonial', 'R2', '03/10/2024', 'ICPC 09 R3', 'Não há'),
    N('ITG 10', 'Interpretação sobre a Aplicação Inicial ao Ativo Imobilizado e à Propriedade para Investimento', '', '1.263/09', 'ICPC 10', 'Não há'),
    N('ITG 12', 'Mudanças em Passivos por Desativação, Restauração e Outros Passivos Similares', '', '1.265/09', 'ICPC 12', 'IFRIC 1'),
    N('ITG 13', 'Direitos a Participações Decorrentes de Fundos de Desativação, Restauração e Reabilitação Ambiental', 'R2', '22/12/2017', 'ICPC 13', 'IAS 5'),
    N('ITG 15', 'Passivos Decorrentes de Participação em Mercado Específico – Resíduos de Equipamentos Eletroeletrônicos', '', '1.289/10', 'ICPC 15', 'IAS 6'),
    N('ITG 16', 'Extinção de Passivos Financeiros com Instrumentos Patrimoniais', 'R2', '22/12/2017', 'ICPC 16', 'IAS 19'),
    N('ITG 17', 'Contratos de Concessão: Evidenciação', '', '1.375/11', 'ICPC 17', 'SIC 29'),
    N('ITG 18', 'Custos de Remoção de Estéril de Mina de Superf Fase de Produção', '', '19/09/2013', 'ICPC 18', 'IFRIC 20'),
    N('ITG 19', 'Tributos', '', '01/12/2014', 'ICPC 19', 'IFRIC 21'),
    N('ITG 20', 'Limite de ativo de benefício definido, requisitos de custeio (funding) mínimo e sua interação', '', '28/11/2014', 'ICPC 20', 'IFRIC 14'),
    N('ITG 21', 'Transação em Moeda Estrangeira e Adiantamento', '', '22/12/2017', 'ICPC 21', 'IFRIC 22'),
    N('ITG 22', 'Incerteza sobre Tratamento de Tributos sobre o Lucro', '', '21/12/2018', 'ICPC 22', 'IFRIC 23'),
    N('ITG 23', 'Aplicação da Abordagem de Atualização Monetária Prevista na NBCTG 42', '', '21/12/2018', 'ICPC 23', 'IFRIC 7'),
    N('CTG 01', 'Entidades de Incorporação Imobiliária', '', '1.154/09', 'OCPC 01', 'Não há'),
    N('CTG 04', 'Aplicação da Interpretação Técnica ITG 02 – Contrato de Construção do Setor Imobiliário', '', '1.317/10', 'OCPC 04', 'Não há'),
    N('CTG 05', 'Contratos de Concessão', '', '1.318/10', 'OCPC 05', 'Não há'),
    N('CTG 06', 'Apresentação de Informações Financeiras Pro Forma', '', '26/06/2013', 'OCPC 06', 'Não há'),
    N('CTG 07', 'Evidenciação na divulgação dos relatórios contábil-financeiros de propósito geral', 'R1', '03/11/2023', 'OCPC 07', 'Não há'),
    N('CTG 08', 'Reconhecimento de determinados ativos e passivos nos relatórios contábil-financeiros de propósito geral das distribuidoras de energia elétrica emitidos de acordo com as normas brasileiras e internacionais de contabilidade', '', '12/12/2014', 'OCPC 08', 'Não há'),
    N('CTG 09', 'Correlação à Estrutura Conceitual Básica do Relato Integrado', '', '28/12/2020', 'OCPC 09', 'Não há'),
    N('OTG 2003', 'OTG 2003 – Orientações sobre a aplicação da ITG 2003 (R1) - Entidade Desportiva', 'R1', '', '', ''),
    N('CTG 10', 'Créditos de Carbono (tCO2e), Permissões de emissão (allowances) e Crédito de Descarbonização (CBIO)', '', '16/12/2024', 'OCPC 10', 'Não há'),
  ];
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const ehAdmin = () => { try { return !!currentUser && isAdmin(currentUser); } catch (e) { return false; } };
  const hoje = () => new Date().toLocaleDateString('pt-BR');
  const est = { aba: 'completas', busca: '', ocupado: false };

  // Lê do banco; se ainda não existir NÃO grava nada (evita sobrescrever a nuvem com o padrão antes de ela carregar) — só grava quando o usuário muda algo.
  function ler() {
    const d = S.g(KEY);
    const ok = d && typeof d === 'object' && !Array.isArray(d) && d.secoes && typeof d.secoes === 'object';
    const base = ok ? JSON.parse(JSON.stringify(d)) : { secoes: { completas: JSON.parse(JSON.stringify(SEED_COMPLETAS)), pmes: [], especificas: [] } };
    SECOES.forEach(s => { if (!Array.isArray(base.secoes[s.id])) base.secoes[s.id] = []; });
    return base;
  }
  function gravar(d) { S.s(KEY, d); }

  const CSS = `
.nbc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.nbc-tab{border:1px solid var(--border);background:var(--white);color:var(--ink);border-radius:8px;padding:8px 14px;font:600 13px var(--sans);cursor:pointer}
.nbc-tab.on{background:var(--teal-bg);border-color:var(--teal);color:var(--teal)}
.nbc-tab small{font-weight:500;color:var(--slate);margin-left:4px}
.nbc-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.nbc-card{border:1px solid var(--border);background:var(--white);border-radius:10px;padding:12px 14px;margin-bottom:10px}
.nbc-top{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
.nbc-cod{font:700 14px var(--mono);color:var(--ink)}
.nbc-rev{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:999px;background:var(--teal-bg);border:1px solid var(--teal);color:var(--teal);font:700 11px var(--mono)}
.nbc-nome{font-size:13px;margin-top:2px;color:var(--ink)}
.nbc-meta{font-size:11.5px;color:var(--slate);margin-top:3px}
.nbc-acoes{display:flex;gap:6px;flex-wrap:wrap}
.nbc-sub{margin-top:10px;border-left:3px solid var(--teal);background:var(--bg);border-radius:6px;padding:8px 10px;font-size:12px;line-height:1.45}
.nbc-sub.vazio{border-left-color:var(--border);color:var(--slate)}
.nbc-sub b{color:var(--ink)}
.nbc-txt{margin-top:8px;font-size:11.5px;color:var(--slate);font-style:italic}
.nbc-hist{font-size:11.5px;margin-top:6px}
.nbc-hist div{padding:3px 0;border-top:1px dashed var(--border)}
.nbc-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px}
.nbc-box{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:18px 20px;width:min(560px,96vw);max-height:92vh;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.4)}
.nbc-box label{display:block;font-size:11px;font-weight:700;color:var(--slate);letter-spacing:.03em;margin:8px 0 3px}
.nbc-box input{width:100%;box-sizing:border-box}
`;
  function css() { if (document.getElementById('nbcCss')) return; const st = document.createElement('style'); st.id = 'nbcCss'; st.textContent = CSS; document.head.appendChild(st); }

  // ───────────────────────────── tela ─────────────────────────────
  window.renderNbc = function () {
    css(); const root = document.getElementById('nbcRoot'); if (!root) return;
    const d = ler(); const sec = SECOES.find(s => s.id === est.aba) || SECOES[0]; const todas = d.secoes[sec.id];
    const t = est.busca.trim().toLowerCase();
    const lista = t ? todas.filter(n => [n.codigo, n.nome, n.cpc, n.iasb, n.revisao].join(' ').toLowerCase().includes(t)) : todas;
    root.innerHTML = `
      <div class="nbc-tabs">${SECOES.map(s => `<button class="nbc-tab ${s.id === sec.id ? 'on' : ''}" onclick="nbcAba('${s.id}')">${E(s.nome)}<small>${d.secoes[s.id].length}</small></button>`).join('')}</div>
      <div class="nbc-bar">
        <input class="fi" style="max-width:320px" placeholder="🔎 buscar norma, CPC ou IASB…" value="${E(est.busca)}" oninput="nbcBusca(this.value)">
        <button class="btn bo bsm" onclick="window.open('${E(sec.url)}','_blank','noopener')" title="Abrir esta lista no site do CFC">↗ Ver no site do CFC</button>
        ${ehAdmin() ? `<button class="btn bp bsm" onclick="nbcEditar('${sec.id}','')">+ Adicionar norma</button>` : ''}
        <button class="btn btn-ia-gemini bsm" onclick="nbcAtualizarSecao('${sec.id}')" ${est.ocupado ? 'disabled' : ''} title="Pede à IA para conferir, no site do CFC, se alguma norma desta seção mudou de revisão. Nada muda sem você confirmar.">🤖 Verificar atualizações da seção</button>
      </div>
      <div id="nbcMsg" style="font-size:12.5px;color:var(--slate);margin-bottom:8px"></div>
      ${lista.length ? lista.map(n => cardHtml(sec, n)).join('') : `<div class="nbc-card" style="color:var(--slate);font-size:13px">${t ? 'Nenhuma norma encontrada com esse filtro.' : 'Nenhuma norma cadastrada nesta seção ainda. Use “+ Adicionar norma” ou “Verificar atualizações da seção”.'}</div>`}`;
  };
  function cardHtml(sec, n) {
    const h = n.historico || []; const u = h.length ? h[h.length - 1] : null;
    const link = n.url || sec.url;
    return `<div class="nbc-card" id="nbc_${E(n.id)}">
      <div class="nbc-top">
        <div style="min-width:0;flex:1">
          <div><span class="nbc-cod">${E(n.codigo)}</span>${n.revisao ? `<span class="nbc-rev" title="Última revisão (versão vigente)">${E(n.revisao)}</span>` : ''}</div>
          <div class="nbc-nome">${E(n.nome)}</div>
          <div class="nbc-meta">${n.dou ? 'DOU ' + E(n.dou) : 'DOU não informado'}${n.cpc ? ' · ' + E(n.cpc) : ''}${n.iasb ? ' · ' + E(n.iasb) : ''}</div>
        </div>
        <div class="nbc-acoes">
          <button class="btn btn-ia-gemini bsm" onclick="nbcAtualizarUma('${sec.id}','${E(n.id)}')" ${est.ocupado ? 'disabled' : ''}>🔄 Atualizar versão (IA)</button>
          <button class="btn bo bsm" onclick="window.open('${E(link)}','_blank','noopener')" title="Abrir no site do CFC">↗ CFC</button>
          ${ehAdmin() ? `<button class="btn bo bsm" onclick="nbcEditar('${sec.id}','${E(n.id)}')" title="Editar">✏️</button><button class="btn bo bsm" onclick="nbcExcluir('${sec.id}','${E(n.id)}')" title="Remover da lista" style="color:#dc2626">🗑️</button>` : ''}
        </div>
      </div>
      ${u ? `<div class="nbc-sub"><b>Última substituição:</b> de <b>${E(u.de || '—')}</b> para <b>${E(u.para || '—')}</b> em ${E(u.data || '')}${u.dou ? ' (DOU ' + E(u.dou) + ')' : ''}.
          ${u.antes ? `<div><b>Como era:</b> ${E(u.antes)}</div>` : ''}${u.depois ? `<div><b>Como ficou:</b> ${E(u.depois)}</div>` : ''}${u.resumo ? `<div>${E(u.resumo)}</div>` : ''}${u.fonte ? `<div style="font-size:11px"><a href="${E(u.fonte)}" target="_blank" rel="noopener">fonte</a></div>` : ''}
          ${h.length > 1 ? `<details class="nbc-hist"><summary style="cursor:pointer;color:var(--slate)">Histórico completo (${h.length} substituições)</summary>${h.slice().reverse().map(x => `<div>${E(x.data)} — ${E(x.de || '—')} → ${E(x.para || '—')}${x.resumo ? ': ' + E(x.resumo) : ''}</div>`).join('')}</details>` : ''}</div>`
        : `<div class="nbc-sub vazio">Nenhuma substituição registrada desde o cadastro. Versão vigente: <b>${E(n.revisao || 'sem revisão numerada')}</b>${n.dou ? ' (DOU ' + E(n.dou) + ')' : ''}. Quando a IA achar uma revisão nova, esta caixa mostra como era antes e como ficou.</div>`}
      <div class="nbc-txt">📄 Texto da norma: ainda não carregado (será incluído numa etapa seguinte).</div>
    </div>`;
  }
  window.nbcAba = function (a) { est.aba = a; est.busca = ''; window.renderNbc(); };
  window.nbcBusca = function (v) { est.busca = v; clearTimeout(window.__nbcT); window.__nbcT = setTimeout(window.renderNbc, 250); };

  // ───────────────────────────── cadastro manual ─────────────────────────────
  window.nbcEditar = function (secId, id) {
    if (!ehAdmin()) return; const d = ler(); const n = id ? d.secoes[secId].find(x => x.id === id) : null; const v = n || { codigo: '', nome: '', revisao: '', dou: '', cpc: '', iasb: '', url: '' };
    document.getElementById('nbcOv')?.remove(); const ov = document.createElement('div'); ov.id = 'nbcOv'; ov.className = 'nbc-ov'; ov.onclick = e => { if (e.target === ov) ov.remove(); };
    const f = (k, l, ph) => `<label>${l}</label><input class="fi" id="nbcF_${k}" value="${E(v[k] || '')}" placeholder="${E(ph || '')}">`;
    ov.innerHTML = `<div class="nbc-box"><h3 style="margin:0 0 6px;font-size:16px">${n ? 'Editar norma' : 'Adicionar norma'}</h3>
      ${f('codigo', 'CÓDIGO (ex.: NBC TG 01)', 'NBC TG 01')}${f('nome', 'NOME DA NORMA')}${f('revisao', 'ÚLTIMA REVISÃO (ex.: R4)')}${f('dou', 'DOU (data da publicação)', 'dd/mm/aaaa')}${f('cpc', 'CORRELAÇÃO CPC', 'CPC 01R1')}${f('iasb', 'CORRELAÇÃO IASB', 'IAS 36')}${f('url', 'LINK DA NORMA NO CFC (opcional)')}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn bo" onclick="document.getElementById('nbcOv').remove()">Cancelar</button><button class="btn bp" onclick="nbcSalvar('${secId}','${E(id || '')}')">Salvar</button></div></div>`;
    document.body.appendChild(ov);
  };
  window.nbcSalvar = function (secId, id) {
    if (!ehAdmin()) return; const g = k => (document.getElementById('nbcF_' + k) || {}).value.trim();
    const codigo = g('codigo'), nome = g('nome'); if (!codigo || !nome) { toast('Informe o código e o nome da norma.', 'err'); return; }
    const d = ler(); const lista = d.secoes[secId]; let n = id ? lista.find(x => x.id === id) : null;
    if (!n) { n = { id: 'n_' + Date.now().toString(36), historico: [], texto: '' }; lista.push(n); }
    const revAnt = n.revisao || '', revNova = g('revisao');
    Object.assign(n, { codigo, nome, revisao: revNova, dou: g('dou'), cpc: g('cpc'), iasb: g('iasb'), url: g('url') });
    if (id && revAnt !== revNova) {   // mudou a revisão à mão: registra a substituição (o usuário descreve o que mudou)
      const txt = prompt('A revisão mudou de "' + (revAnt || '—') + '" para "' + (revNova || '—') + '".\nDescreva em uma frase o que mudou (opcional):', '') || '';
      n.historico = (n.historico || []).concat([{ data: hoje(), de: revAnt, para: revNova, dou: n.dou, antes: revAnt ? 'Revisão ' + revAnt : '', depois: revNova ? 'Revisão ' + revNova : '', resumo: txt, fonte: n.url || '', por: (currentUser && (currentUser.nome || currentUser.login)) || '', origem: 'manual' }]);
    }
    gravar(d); document.getElementById('nbcOv')?.remove(); toast('Norma salva.', 'ok'); window.renderNbc();
  };
  window.nbcExcluir = function (secId, id) {
    if (!ehAdmin() || !confirm('Remover esta norma da lista? (o texto/histórico dela também deixa de aparecer)')) return;
    const d = ler(); d.secoes[secId] = d.secoes[secId].filter(x => x.id !== id); gravar(d); window.renderNbc();
  };

  // ───────────────────────────── atualização por IA (a IA só PROPÕE; o usuário confirma) ─────────────────────────────
  // Função do Supabase: "nbc-atualizar-norma" (fonte em supabase/functions/nbc-atualizar-norma/index.ts). Enquanto não for publicada, o botão avisa e nada acontece.
  async function consultarIA(sec, itens) {
    let resp;
    try { resp = await fetch(SUPABASE_URL + '/functions/v1/nbc-atualizar-norma', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }, body: JSON.stringify({ hoje: new Date().toISOString().slice(0, 10), secao: sec.nome, fonte_url: sec.url, itens: itens.map(n => ({ codigo: n.codigo, nome: n.nome, revisao: n.revisao || '', dou: n.dou || '' })) }) }); }
    catch (e) { throw new Error('Não foi possível chamar a IA: a função "nbc-atualizar-norma" ainda não foi publicada no Supabase (ou está sem conexão). Nada foi alterado.'); }
    if (resp.status === 404) throw new Error('A atualização por IA ainda não foi ativada (a função "nbc-atualizar-norma" não está publicada no Supabase).');
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok || dados.error) throw new Error(dados.error || ('HTTP ' + resp.status));
    return dados;   // { resumo, usou_busca_web, propostas:[{codigo, revisao_nova, dou_nova, antes, depois, resumo, fonte}] }
  }
  async function rodar(secId, ids) {
    if (!ehAdmin()) { toast('Somente administrador atualiza as normas.', 'err'); return; }
    if (est.ocupado) return; const sec = SECOES.find(s => s.id === secId); const d = ler(); const itens = d.secoes[secId].filter(n => !ids || ids.includes(n.id));
    if (!itens.length) { toast('Nenhuma norma para verificar.', 'err'); return; }
    est.ocupado = true; window.renderNbc(); const msg = () => document.getElementById('nbcMsg'); if (msg()) msg().textContent = 'Consultando o site do CFC pela IA… pode levar até um minuto.';
    try {
      const r = await consultarIA(sec, itens); const props = (r.propostas || []).filter(p => p && p.codigo && p.revisao_nova); let aplicadas = 0;
      for (const p of props) {
        const d2 = ler(); const n = d2.secoes[secId].find(x => x.codigo.toLowerCase().replace(/\s+/g, '') === String(p.codigo).toLowerCase().replace(/\s+/g, ''));
        if (!n || String(n.revisao || '') === String(p.revisao_nova)) continue;
        const ok = confirm(n.codigo + ' — ' + n.nome + '\n\nRevisão atual: ' + (n.revisao || '—') + '\nNova revisão encontrada: ' + p.revisao_nova + (p.dou_nova ? ' (DOU ' + p.dou_nova + ')' : '') + '\n\nComo era: ' + (p.antes || '—') + '\nComo ficou: ' + (p.depois || '—') + (p.resumo ? '\n\n' + p.resumo : '') + '\n\nFonte: ' + (p.fonte || 'não informada') + '\n\nAplicar esta atualização?');
        if (!ok) continue;
        n.historico = (n.historico || []).concat([{ data: hoje(), de: n.revisao || '', para: p.revisao_nova, dou: p.dou_nova || '', antes: p.antes || '', depois: p.depois || '', resumo: p.resumo || '', fonte: p.fonte || '', por: (currentUser && (currentUser.nome || currentUser.login)) || '', origem: 'ia' }]);
        n.revisao = p.revisao_nova; if (p.dou_nova) n.dou = p.dou_nova; gravar(d2); aplicadas++;
      }
      est.ocupado = false; window.renderNbc();
      const m2 = document.getElementById('nbcMsg'); if (m2) m2.innerHTML = (aplicadas ? `<b>${aplicadas} norma(s) atualizada(s).</b> ` : (props.length ? 'Nenhuma atualização aplicada. ' : 'Nenhuma revisão nova encontrada — tudo na última versão. ')) + E(r.resumo || '') + (r.usou_busca_web === false ? ' <span style="color:#a16207">(sem busca na internet — confira nas fontes)</span>' : '');
    } catch (e) { est.ocupado = false; window.renderNbc(); const m3 = document.getElementById('nbcMsg'); if (m3) m3.innerHTML = '<span style="color:var(--red)">' + E(e.message || e) + '</span>'; }
  }
  window.nbcAtualizarUma = (secId, id) => rodar(secId, [id]);
  window.nbcAtualizarSecao = secId => rodar(secId, null);
})();

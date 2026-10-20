/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * CALCULADORAS JJR — MOTOR DETERMINÍSTICO  (pedido do usuário 20/10/2026)
 *
 * Regras de ouro:
 *  1. IA NÃO CALCULA. Este arquivo não chama IA nem rede — só aritmética e parâmetros.
 *  2. Valores monetários em CENTAVOS INTEIROS; taxas em decimais exatos (BigInt); arredondamento único, explícito e centralizado
 *     (meio para cima, "half away from zero") — função qRound. Nunca float para dinheiro.
 *  3. Parâmetros legais ficam em CONJUNTOS VERSIONADOS POR VIGÊNCIA (CALC_SEED_SETS + os aprovados em Bases Legais). A competência
 *     escolhe o conjunto. Sem conjunto para a data: NÃO calcula ("Parâmetros legais não cadastrados para esta competência.").
 *  4. Todo resultado traz MEMÓRIA DE CÁLCULO, parâmetros usados (conjunto/versão/vigência), bases legais e avisos.
 * Funciona no navegador (window.JJRCalc) e no Node (module.exports) — os testes de regressão rodam em Node.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ───────────────────────────── aritmética exata ─────────────────────────────
  const BI = BigInt;
  function mdc(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a || 1n; }
  function Q(n, d) { n = BI(n); d = d === undefined ? 1n : BI(d); if (d < 0n) { n = -n; d = -d; } const g = mdc(n, d); return { n: n / g, d: d / g }; }
  const qAdd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const qSub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const qMul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const qNeg = a => Q(-a.n, a.d);
  // Arredondamento ÚNICO do sistema: meio para cima (afastando do zero), em centavos inteiros.
  function qRound(q) { const neg = q.n < 0n; const a = neg ? -q.n : q.n; const r = (2n * a + q.d) / (2n * q.d); return Number(neg ? -r : r); }
  // taxa decimal exata a partir de texto: "0.075" | "0,075" | número
  function dec(x) {
    let s = String(x).trim().replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error('Decimal inválido: ' + x);
    const neg = s[0] === '-'; if (neg) s = s.slice(1);
    const [i, f = ''] = s.split('.');
    return Q((neg ? -1n : 1n) * BI(i + f), 10n ** BI(f.length));
  }
  // percentual em texto ("8", "8,8", "7.5") → taxa exata (8% = 0.08)
  function pct(x) { return qMul(dec(x), Q(1, 100)); }
  // dinheiro: "1.234,56" | "1234.56" | 1234.56 | centavos já inteiros? → NUNCA recebe centavos; recebe reais. Devolve centavos inteiros.
  function cents(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') { if (!isFinite(v)) return 0; return Math.round(v * 100 + (v < 0 ? -1e-9 : 1e-9)); }
    let s = String(v).trim().replace(/R\$\s*/i, '').replace(/\s/g, '');
    if (!s) return 0;
    let neg = false; if (s[0] === '-') { neg = true; s = s.slice(1); } if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    if (!/^\d+(\.\d+)?$/.test(s)) throw new Error('Valor monetário inválido: ' + v);
    const q = dec(s); const r = qRound(qMul(q, Q(100))); return neg ? -r : r;
  }
  const brl = c => { const neg = c < 0; c = Math.abs(c); const s = String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + String(c % 100).padStart(2, '0'); return (neg ? '-' : '') + s; };
  const mulC = (c, rate) => qRound(qMul(Q(c), rate));        // centavos × taxa → centavos (arredonda)
  const mulQ = (c, rate) => qMul(Q(c), rate);                  // centavos × taxa → racional (soma antes de arredondar)
  const max0 = x => (x > 0 ? x : 0);

  // ───────────────────────────── bases legais ─────────────────────────────
  // fonte/verificação: itens marcados "informada pelo usuário" foram cadastrados a partir do pedido de 20/10/2026 — SEM conferência independente na norma.
  const V_USR = 'Cadastrada conforme informação do usuário (20/10/2026); conferir na fonte oficial';
  const CALC_BASES = [
    { id: 'LEI_15270_2025', calcs: ['irrf_pf', 'salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao'], norma: 'Lei', numero: '15.270/2025', artigo: '(a conferir)', assunto: 'Isenção/redução do IRPF — redutor mensal a partir de 2026', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LEI_9250_1995', calcs: ['irrf_pf', 'salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao', 'pensao'], norma: 'Lei', numero: '9.250/1995', artigo: 'arts. 4º e 8º', assunto: 'Deduções do IRPF: dependentes, pensão alimentícia, previdência oficial', vig_ini: '1996-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: 'Base geral das deduções legais. Artigos a conferir.' },
    { id: 'TAB_IRRF_2026', calcs: ['irrf_pf', 'salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao'], norma: 'Tabela progressiva mensal do IRRF', numero: '2026', artigo: '—', assunto: 'Faixas, deduções, dependente (189,59) e desconto simplificado (607,20)', vig_ini: '2026-01-01', vig_fim: '2026-12-31', fonte: 'https://www.gov.br/receitafederal', ultima_verificacao: null, obs: V_USR },
    { id: 'TAB_INSS_2026', calcs: ['salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao'], norma: 'Portaria Interministerial de reajuste do RGPS — tabela de contribuição 2026', numero: '(nº a confirmar)', artigo: '—', assunto: 'Faixas progressivas do empregado (7,5/9/12/14%) e teto de R$ 8.475,55', vig_ini: '2026-01-01', vig_fim: '2026-12-31', fonte: 'https://www.gov.br/inss', ultima_verificacao: null, obs: V_USR },
    { id: 'LEI_8212_1991', calcs: ['pro_labore'], norma: 'Lei', numero: '8.212/1991', artigo: '(a conferir)', assunto: 'Contribuição do contribuinte individual (11% sobre o pró-labore, até o teto)', vig_ini: '1991-07-24', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LEI_9249_1995', calcs: ['lucro_presumido'], norma: 'Lei', numero: '9.249/1995', artigo: 'arts. 15 e 20', assunto: 'Percentuais de presunção do IRPJ (art. 15) e da CSLL (art. 20)', vig_ini: '1996-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LEI_9430_1996', calcs: ['lucro_presumido'], norma: 'Lei', numero: '9.430/1996', artigo: '(regras do Lucro Presumido)', assunto: 'Apuração trimestral, adicional do IRPJ, receitas que integram a base', vig_ini: '1997-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LC_224_2025', calcs: ['lucro_presumido'], norma: 'Lei Complementar', numero: '224/2025', artigo: 'art. 4º', assunto: 'Acréscimo de 10% sobre o percentual de presunção na parcela da receita bruta acima do limite', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR + '. IRPJ: efeitos a partir do 1º trimestre/2026. CSLL: efeitos a partir do 2º trimestre/2026.' },
    { id: 'DEC_12808_2025', calcs: ['lucro_presumido'], norma: 'Decreto', numero: '12.808/2025', artigo: 'art. 12', assunto: 'Regulamentação da majoração do Lucro Presumido', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'RFB_LP_2026', calcs: ['lucro_presumido'], norma: 'Normas da Receita Federal que regulamentam a alteração', numero: '(a cadastrar)', artigo: '—', assunto: 'Limite anual proporcional da CSLL em 2026 (R$ 3.750.000,00 — três trimestres sujeitos à nova regra)', vig_ini: '2026-01-01', vig_fim: '2026-12-31', fonte: 'https://www.gov.br/receitafederal', ultima_verificacao: null, obs: V_USR },
    { id: 'CF_155', calcs: ['itcmd'], norma: 'Constituição Federal', numero: '1988', artigo: 'art. 155', assunto: 'Competência estadual do ITCMD e regras de competência territorial', vig_ini: '1988-10-05', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LC_227_2026', calcs: ['itcmd'], norma: 'Lei Complementar', numero: '227/2026', artigo: '(a conferir)', assunto: 'Normas gerais do ITCMD; alíquotas progressivas pelo valor do quinhão/legado/doação (limite máximo fixado pelo Senado); avaliação de participações societárias não negociadas em mercado organizado', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR + '. O valor efetivamente usado respeita a legislação ESTADUAL vigente na data do fato gerador.' },
    { id: 'SP_LEI_10705_2000', calcs: ['itcmd'], uf: 'SP', norma: 'Lei Estadual (SP)', numero: '10.705/2000', artigo: '(a conferir)', assunto: 'ITCMD paulista', vig_ini: '2001-01-01', vig_fim: null, fonte: 'https://www.al.sp.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'SP_DEC_46655_2002', calcs: ['itcmd'], uf: 'SP', norma: 'Decreto Estadual (SP)', numero: '46.655/2002', artigo: '(a conferir)', assunto: 'Regulamento do ITCMD paulista (alíquota 4%, isenção de doação até 2.500 UFESPs, doações no ano civil)', vig_ini: '2002-04-01', vig_fim: null, fonte: 'https://legislacao.fazenda.sp.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'SP_UFESP_2026', calcs: ['itcmd'], uf: 'SP', norma: 'UFESP do exercício', numero: '2026', artigo: '—', assunto: '1 UFESP = R$ 38,42 em 2026', vig_ini: '2026-01-01', vig_fim: '2026-12-31', fonte: 'https://legislacao.fazenda.sp.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LEI_8981_1995', calcs: ['mutuo'], norma: 'Lei', numero: '8.981/1995', artigo: '(a conferir)', assunto: 'Retenção na fonte sobre rendimentos (tabela regressiva por prazo)', vig_ini: '1995-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR + ' — o conjunto regressivo 22,5/20/17,5/15% foi informado sem citar o artigo.' },
    { id: 'IOF_CREDITO', calcs: ['mutuo'], norma: 'Decreto do IOF (operações de crédito)', numero: '(a cadastrar)', artigo: '—', assunto: 'Alíquota diária, adicional e limite de dias do IOF-crédito — NÃO cadastrados', vig_ini: null, vig_fim: null, fonte: 'https://www.gov.br/receitafederal', ultima_verificacao: null, obs: 'Sem valores cadastrados: o IOF do mútuo só calcula depois que você cadastrar o conjunto de parâmetros (Bases Legais → Cadastrar parâmetros).' },
    { id: 'CLT_RESCISAO', calcs: ['ferias', 'decimo_terceiro', 'rescisao'], norma: 'CLT e legislação complementar', numero: 'Decreto-Lei 5.452/1943; Lei 4.090/1962 (13º); Lei 8.036/1990 (FGTS); Lei 12.506/2011 (aviso prévio)', artigo: '(a conferir por rubrica)', assunto: 'Verbas rescisórias, férias, 13º, aviso prévio proporcional, FGTS e multa', vig_ini: null, vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: 'Matriz de incidência da rescisão cadastrada como versão inicial — conferir cada rubrica antes de usar.' },
    { id: 'PLR_TABELA', calcs: ['plr'], norma: 'Tabela de tributação exclusiva da PLR', numero: '(a cadastrar)', artigo: '—', assunto: 'Tabela da PLR — NÃO cadastrada', vig_ini: null, vig_fim: null, fonte: 'https://www.gov.br/receitafederal', ultima_verificacao: null, obs: 'Sem a tabela cadastrada para a competência, a PLR não calcula.' },
  ];

  // ───────────────────────────── conjuntos de parâmetros (versionados por vigência) ─────────────────────────────
  // Equivale a calculator_parameter_sets + calculator_parameters: cada conjunto tem calculator_key, valid_from, valid_to, version, status, created_at/by e a lista de parâmetros (valor, unidade, descrição).
  const NOW0 = '2026-10-20';
  const P = (value, unit, description) => ({ value, unit: unit || '', description: description || '' });
  const CALC_SEED_SETS = [
    {
      id: 'IRRF_2026', calculator_key: 'irrf_pf', valid_from: '2026-01-01', valid_to: '2026-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (pedido do usuário)',
      bases: ['TAB_IRRF_2026', 'LEI_15270_2025', 'LEI_9250_1995'],
      params: {
        faixas: P([
          { ate: '2428.80', aliq: '0', ded: '0' },
          { ate: '2826.65', aliq: '0.075', ded: '182.16' },
          { ate: '3751.05', aliq: '0.15', ded: '394.16' },
          { ate: '4664.68', aliq: '0.225', ded: '675.49' },
          { ate: null, aliq: '0.275', ded: '908.73' }], 'R$ / taxa', 'Tabela progressiva mensal (base até o limite; alíquota; parcela a deduzir)'),
        dependente: P('189.59', 'R$', 'Dedução por dependente'),
        desconto_simplificado: P('607.20', 'R$', 'Desconto simplificado mensal'),
        redutor_limite1: P('5000.00', 'R$', 'Rendimentos até este valor: redução de até redutor_max1, limitada ao imposto'),
        redutor_max1: P('312.89', 'R$', 'Redução máxima na 1ª faixa do redutor'),
        redutor_limite2: P('7350.00', 'R$', 'Acima deste valor não há redução'),
        redutor_const2: P('978.62', 'R$', 'Redução = const2 − coef2 × rendimentos tributáveis'),
        redutor_coef2: P('0.133145', 'fator', 'Coeficiente do redutor entre limite1 e limite2'),
        redutor_aplica_13: P(false, 'bool', 'Aplicar o redutor ao 13º salário? (não informado — mantido desligado até confirmação)'),
      },
    },
    {
      id: 'INSS_2026', calculator_key: 'inss_empregado', valid_from: '2026-01-01', valid_to: '2026-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (pedido do usuário)',
      bases: ['TAB_INSS_2026'],
      params: {
        faixas: P([{ ate: '1621.00', aliq: '0.075' }, { ate: '2902.84', aliq: '0.09' }, { ate: '4354.27', aliq: '0.12' }, { ate: '8475.55', aliq: '0.14' }], 'R$ / taxa', 'Faixas progressivas — calculadas faixa a faixa, nunca salário × alíquota única'),
        teto: P('8475.55', 'R$', 'Teto do salário de contribuição'),
      },
    },
    {
      id: 'INSS_CI_2026', calculator_key: 'inss_contribuinte_individual', valid_from: '2026-01-01', valid_to: '2026-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (pedido do usuário)',
      bases: ['LEI_8212_1991', 'TAB_INSS_2026'],
      params: { aliquota: P('0.11', 'taxa', 'Retenção do contribuinte individual (pró-labore)'), teto: P('8475.55', 'R$', 'Teto do RGPS (base máxima)') },
    },
    {
      id: 'LUCRO_PRESUMIDO_2026', calculator_key: 'lucro_presumido', valid_from: '2026-01-01', valid_to: '2026-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (pedido do usuário)',
      bases: ['LEI_9249_1995', 'LEI_9430_1996', 'LC_224_2025', 'DEC_12808_2025', 'RFB_LP_2026'],
      params: {
        limite_trimestral: P('1250000.00', 'R$', 'Limite da receita bruta por TRIMESTRE sujeito aos coeficientes normais (R$ 5.000.000,00 / ano ÷ 4) — não é limite mensal'),
        limite_anual: P('5000000.00', 'R$', 'Limite anual de referência'),
        acrescimo_presuncao: P('0.10', 'fator', 'Acréscimo SOBRE o percentual de presunção (32% → 35,20%; 8% → 8,80%) — não são 10 pontos percentuais'),
        irpj_majoracao_desde: P({ ano: 2026, trimestre: 1 }, '', 'IRPJ: majoração desde o 1º trimestre/2026'),
        csll_majoracao_desde: P({ ano: 2026, trimestre: 2 }, '', 'CSLL: majoração somente a partir do 2º trimestre/2026'),
        csll_limite_anual_2026: P('3750000.00', 'R$', 'Limite anual proporcional da CSLL em 2026 (3 trimestres) — informativo; o limite por trimestre segue 1.250.000'),
        irpj_aliquota: P('0.15', 'taxa', 'IRPJ'),
        irpj_adicional_aliquota: P('0.10', 'taxa', 'Adicional do IRPJ'),
        irpj_adicional_limite_mensal: P('20000.00', 'R$', 'Parcela da base do IRPJ isenta do adicional, por mês do período (trimestre completo = 60.000,00)'),
        csll_aliquotas: P({ comum: '0.09' }, 'taxa', 'CSLL por tipo de contribuinte — só "comum" cadastrado; financeiras e outras exigem cadastro'),
        atividades: P({
          comercio: { nome: 'Comércio', irpj: '8', csll: '12' },
          industria: { nome: 'Indústria', irpj: '8', csll: '12' },
          servicos: { nome: 'Serviços em geral', irpj: '32', csll: '32' },
          transporte_cargas: { nome: 'Transporte de cargas', irpj: '8', csll: '12' },
          transporte_passageiros: { nome: 'Transporte de passageiros', irpj: '16', csll: '12' },
          servicos_hospitalares: { nome: 'Serviços hospitalares', irpj: '8', csll: '12' },
          revenda_combustiveis: { nome: 'Revenda de combustíveis', irpj: '1.6', csll: '12' },
        }, '% de presunção', 'Percentuais de presunção por atividade (Lei 9.249/95 arts. 15 e 20). Atividade "outra" aceita percentuais próprios.'),
      },
    },
    {
      id: 'ITCMD_SP_2026', calculator_key: 'itcmd', uf: 'SP', valid_from: '2026-01-01', valid_to: '2026-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (pedido do usuário)',
      bases: ['CF_155', 'LC_227_2026', 'SP_LEI_10705_2000', 'SP_DEC_46655_2002', 'SP_UFESP_2026'],
      params: {
        aliquota: P('0.04', 'taxa', 'Alíquota do ITCMD em São Paulo'),
        ufesp: P('38.42', 'R$', '1 UFESP em 2026'),
        isencao_doacao_ufesp: P('2500', 'UFESP', 'Doação isenta (hipótese de isenção) até este valor, observadas as condições da lei paulista'),
        doacoes_periodo: P('ano_civil', '', 'Doações sucessivas entre o mesmo doador e o mesmo donatário: somam-se as do ano civil'),
        sucessivas_base: P('nova_doacao', '', 'Quando o acumulado passa do limite: o imposto incide sobre a doação atual (regra a confirmar na legislação paulista)'),
        usufruto_nua_propriedade: P(null, '', 'NÃO cadastrado para SP'),
        causa_mortis_isencoes: P(null, '', 'Isenções de causa mortis NÃO cadastradas para SP'),
      },
    },
    {
      id: 'IRRF_JUROS_REGRESSIVO', calculator_key: 'mutuo_irrf_juros', valid_from: '2005-01-01', valid_to: null, version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (pedido do usuário)',
      bases: ['LEI_8981_1995'],
      params: { faixas: P([{ ate_dias: 180, aliq: '0.225' }, { ate_dias: 360, aliq: '0.20' }, { ate_dias: 720, aliq: '0.175' }, { ate_dias: null, aliq: '0.15' }], 'dias / taxa', 'Tabela regressiva por prazo (informada pelo usuário)') },
    },
  ];

  // conjuntos aprovados em Bases Legais (guardados no site) entram aqui em tempo de execução
  const EXTRAS = [];
  function registrarSets(lista) { EXTRAS.length = 0; (lista || []).forEach(s => EXTRAS.push(s)); }
  function todosSets() { return CALC_SEED_SETS.concat(EXTRAS); }
  const ERRO_PARAM = 'Parâmetros legais não cadastrados para esta competência.';
  // Escolhe o conjunto ativo cuja vigência contém a data (e a UF, quando houver); desempata pela maior versão.
  function acharSet(calculatorKey, dataISO, uf) {
    const d = String(dataISO).slice(0, 10);
    const c = todosSets().filter(s => s.calculator_key === calculatorKey && s.status === 'ativo'
      && s.valid_from <= d && (!s.valid_to || d <= s.valid_to) && (!uf || !s.uf || s.uf === uf) && (!uf || s.uf === uf || !todosSets().some(x => x.calculator_key === calculatorKey && x.uf === uf)));
    c.sort((a, b) => (b.version - a.version) || (b.valid_from < a.valid_from ? -1 : 1));
    return c[0] || null;
  }
  const pv = (set, k) => set.params[k] && set.params[k].value;
  const refSet = s => ({ id: s.id, calculator_key: s.calculator_key, version: s.version, valid_from: s.valid_from, valid_to: s.valid_to, uf: s.uf || null });
  const basesDe = sets => { const ids = new Set(); sets.forEach(s => (s.bases || []).forEach(b => ids.add(b))); return CALC_BASES.filter(b => ids.has(b.id)); };
  const data1 = comp => { const m = String(comp || '').match(/^(\d{4})-(\d{2})/); if (!m) throw new Error('Competência inválida (use AAAA-MM)'); return m[1] + '-' + m[2] + '-01'; };

  // ───────────────────────────── memória de cálculo ─────────────────────────────
  function Mem() {
    const L = [];
    return {
      L,
      t(r) { L.push({ k: 'titulo', r }); },
      l(r, v, op, nota) { L.push({ k: 'linha', r, v, op: op || '', nota: nota || '' }); },
      s(r, v, nota) { L.push({ k: 'subtotal', r, v, nota: nota || '' }); },
      tot(r, v) { L.push({ k: 'total', r, v }); },
      i(r, v) { L.push({ k: 'inteiro', r, v }); },
      n(r) { L.push({ k: 'nota', r }); },
      txt(r, v) { L.push({ k: 'texto', r, v }); },
    };
  }
  const ERR = (msg, extra) => Object.assign({ ok: false, erro: msg }, extra || {});

  // ───────────────────────────── INSS do empregado (progressivo por faixa) ─────────────────────────────
  function inssProgressivo(baseC, set, mem) {
    const faixas = pv(set, 'faixas'), teto = cents(pv(set, 'teto'));
    const b = Math.min(baseC, teto);
    if (mem) { mem.l('Base de contribuição informada', baseC); if (baseC > teto) mem.n('Base limitada ao teto de ' + brl(teto) + ' (diferença de ' + brl(baseC - teto) + ' não contribui).'); }
    let acc = Q(0), ant = 0;
    faixas.forEach(f => {
      const lim = cents(f.ate);
      if (b > ant) {
        const parte = Math.min(b, lim) - ant; const q = mulQ(parte, dec(f.aliq)); acc = qAdd(acc, q);
        if (mem) mem.l('Faixa até ' + brl(lim) + ': ' + brl(parte) + ' × ' + (Number(f.aliq) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%', qRound(q), '+', 'cada faixa mostrada arredondada; o total é arredondado uma só vez');
        ant = lim;
      }
    });
    const valor = qRound(acc);
    if (mem) mem.s('INSS (soma das faixas, arredondada)', valor);
    return { valor, baseUsada: b, teto };
  }

  // ───────────────────────────── IRRF mensal (motor central) ─────────────────────────────
  // inp: rendimentos (c), previdencia (c), dependentes (n), pensao (c), outras (c), maisVantajosa (bool), aplicaRedutor (bool, padrão true)
  function irrfMensal(dataISO, inp, mem) {
    const set = acharSet('irrf_pf', dataISO);
    if (!set) return ERR(ERRO_PARAM, { detalhe: 'IRRF PF — competência ' + String(dataISO).slice(0, 7) });
    const rend = inp.rendimentos || 0, prev = inp.previdencia || 0, ndep = inp.dependentes || 0, pens = inp.pensao || 0, outras = inp.outras || 0;
    const depUn = cents(pv(set, 'dependente')), depTot = depUn * ndep, simpl = cents(pv(set, 'desconto_simplificado'));
    const legais = prev + depTot + pens + outras;
    const usar = inp.maisVantajosa !== false;
    let modo = 'legais', ded = legais;
    if (usar && simpl > legais) { modo = 'simplificado'; ded = simpl; }
    const base = max0(rend - ded);
    const faixas = pv(set, 'faixas');
    let fx = faixas.find(f => f.ate === null || base <= cents(f.ate)) || faixas[faixas.length - 1];
    const aliq = dec(fx.aliq), parc = cents(fx.ded);
    const bruto = Math.max(0, qRound(qSub(mulQ(base, aliq), Q(parc))));
    // redutor (2026): limitado ao próprio imposto, nunca negativo
    let reducao = 0, redDesc = 'sem redução';
    const aplicaRed = inp.aplicaRedutor !== false;
    if (aplicaRed) {
      const l1 = cents(pv(set, 'redutor_limite1')), l2 = cents(pv(set, 'redutor_limite2'));
      if (rend <= l1) { reducao = Math.min(bruto, cents(pv(set, 'redutor_max1'))); redDesc = 'rendimentos até ' + brl(l1) + ': redução de até ' + brl(cents(pv(set, 'redutor_max1'))) + ', limitada ao imposto'; }
      else if (rend <= l2) {
        const r = max0(qRound(qSub(Q(cents(pv(set, 'redutor_const2'))), mulQ(rend, dec(pv(set, 'redutor_coef2'))))));
        reducao = Math.min(bruto, r); redDesc = brl(cents(pv(set, 'redutor_const2'))) + ' − (' + pv(set, 'redutor_coef2') + ' × ' + brl(rend) + ') = ' + brl(r) + (r > bruto ? ' (limitada ao imposto)' : '');
      } else redDesc = 'rendimentos acima de ' + brl(l2) + ': sem redução';
    } else redDesc = 'redutor não aplicado nesta verba';
    const final = bruto - reducao;
    if (mem) {
      mem.t('IRRF — competência ' + String(dataISO).slice(0, 7) + ' (conjunto ' + set.id + ' v' + set.version + ')');
      mem.l('Rendimentos tributáveis', rend);
      mem.l('(−) Previdência oficial', prev, '−'); mem.l('(−) Dependentes: ' + ndep + ' × ' + brl(depUn), depTot, '−');
      mem.l('(−) Pensão alimentícia', pens, '−'); mem.l('(−) Outras deduções legais', outras, '−');
      mem.s('Deduções legais (soma)', legais);
      mem.l('Desconto simplificado mensal', simpl);
      mem.txt('Dedução adotada', modo === 'simplificado' ? 'DESCONTO SIMPLIFICADO (mais vantajoso: ' + brl(simpl) + ' > ' + brl(legais) + ')' : (usar ? 'DEDUÇÕES LEGAIS (mais vantajosas: ' + brl(legais) + ' ≥ ' + brl(simpl) + ')' : 'DEDUÇÕES LEGAIS (opção do usuário)'));
      mem.l('Base de cálculo (rendimentos − dedução)', base);
      mem.txt('Faixa', fx.ate === null ? 'acima de ' + brl(cents(faixas[faixas.length - 2].ate)) : 'até ' + brl(cents(fx.ate)));
      mem.l('Base × alíquota ' + (Number(fx.aliq) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%', qRound(mulQ(base, aliq)), '×');
      mem.l('(−) Parcela a deduzir', parc, '−');
      mem.s('Imposto pela tabela', bruto);
      mem.l('(−) Redução 2026 — ' + redDesc, reducao, '−');
      mem.tot('IRRF a reter', final);
    }
    return { ok: true, valor: final, imposto_tabela: bruto, reducao, base, modo, deducao: ded, aliquota: fx.aliq, set };
  }

  // ───────────────────────────── calculadora: IRRF PF ─────────────────────────────
  function calcIRRF(inp) {
    const comp = inp.competencia, d = data1(comp), mem = Mem();
    const r = irrfMensal(d, { rendimentos: cents(inp.rendimentos), previdencia: cents(inp.previdencia), dependentes: parseInt(inp.dependentes || 0, 10), pensao: cents(inp.pensao), outras: cents(inp.outras), maisVantajosa: inp.maisVantajosa !== false }, mem);
    if (!r.ok) return r;
    return { ok: true, resultado: { irrf: r.valor, base: r.base, modo_deducao: r.modo }, memoria: mem.L, parametros: [refSet(r.set)], bases: basesDe([r.set]), avisos: [] };
  }

  // ───────────────────────────── calculadora: salário líquido ─────────────────────────────
  function calcSalarioLiquido(inp) {
    const d = data1(inp.competencia), mem = Mem();
    const sInss = acharSet('inss_empregado', d); if (!sInss) return ERR(ERRO_PARAM, { detalhe: 'INSS empregado — competência ' + d.slice(0, 7) });
    const proventos = [['Salário', 'salario'], ['Horas extras', 'horasExtras'], ['Comissões', 'comissoes'], ['Adicionais', 'adicionais'], ['Outros proventos', 'outrosProventos']];
    mem.t('Proventos'); let bruto = 0;
    proventos.forEach(([r, k]) => { const v = cents(inp[k]); bruto += v; mem.l(r, v, '+'); });
    mem.s('Total bruto', bruto);
    mem.t('INSS (progressivo por faixa)'); const inss = inssProgressivo(bruto, sInss, mem);
    const pens = cents(inp.pensao);
    const ir = irrfMensal(d, { rendimentos: bruto, previdencia: inss.valor, dependentes: parseInt(inp.dependentes || 0, 10), pensao: pens, outras: 0, maisVantajosa: inp.maisVantajosa !== false }, mem);
    if (!ir.ok) return ir;
    mem.t('Demais descontos');
    const desc = [['Vale-transporte', 'vt'], ['Vale-refeição', 'vr'], ['Plano de saúde', 'planoSaude'], ['Adiantamento', 'adiantamento'], ['Outros descontos', 'outrosDescontos']];
    let outros = 0; desc.forEach(([r, k]) => { const v = cents(inp[k]); outros += v; mem.l(r, v, '−'); });
    mem.l('Pensão alimentícia (valor informado)', pens, '−');
    const liquido = bruto - inss.valor - ir.valor - outros - pens;
    mem.t('Resultado');
    mem.l('Bruto', bruto); mem.l('(−) INSS', inss.valor, '−'); mem.l('(−) IRRF', ir.valor, '−'); mem.l('(−) Demais descontos', outros + pens, '−');
    mem.tot('LÍQUIDO', liquido);
    return { ok: true, resultado: { bruto, inss: inss.valor, irrf: ir.valor, descontos: outros + pens, liquido }, memoria: mem.L, parametros: [refSet(sInss), refSet(ir.set)], bases: basesDe([sInss, ir.set]), avisos: [] };
  }

  // ───────────────────────────── calculadora: pró-labore ─────────────────────────────
  function calcProLabore(inp) {
    const d = data1(inp.competencia), mem = Mem();
    const sCI = acharSet('inss_contribuinte_individual', d); if (!sCI) return ERR(ERRO_PARAM, { detalhe: 'INSS contribuinte individual — competência ' + d.slice(0, 7) });
    const bruto = cents(inp.proLabore), jaUsada = cents(inp.baseJaUtilizadaTeto), outrasContrib = cents(inp.outrasContribuicoes);
    const teto = cents(pv(sCI, 'teto')), aliq = dec(pv(sCI, 'aliquota'));
    mem.t('Pró-labore'); mem.l('Pró-labore bruto', bruto);
    mem.t('INSS do contribuinte individual (' + (Number(pv(sCI, 'aliquota')) * 100) + '%)');
    const folga = max0(teto - jaUsada); const base = Math.min(bruto, folga);
    mem.l('Teto do RGPS', teto); mem.l('(−) Base já utilizada do teto em outra fonte', jaUsada, '−'); mem.s('Base ainda disponível sob o teto', folga);
    mem.l('Base de contribuição (menor entre pró-labore e disponível)', base);
    const inss = mulC(base, aliq);
    mem.l('Base × ' + (Number(pv(sCI, 'aliquota')) * 100) + '%', inss, '×'); mem.s('INSS retido', inss);
    const ir = irrfMensal(d, { rendimentos: bruto, previdencia: inss + outrasContrib, dependentes: parseInt(inp.dependentes || 0, 10), pensao: cents(inp.pensao), outras: 0, maisVantajosa: inp.maisVantajosa !== false }, mem);
    if (!ir.ok) return ir;
    const outros = cents(inp.outrosDescontos), pens = cents(inp.pensao);
    mem.t('Resultado'); mem.l('Pró-labore', bruto); mem.l('(−) INSS', inss, '−'); mem.l('(−) IRRF', ir.valor, '−'); mem.l('(−) Pensão', pens, '−'); mem.l('(−) Outros descontos', outros, '−');
    const liquido = bruto - inss - ir.valor - pens - outros; mem.tot('LÍQUIDO', liquido);
    const avisos = outrasContrib ? ['As outras contribuições previdenciárias do mês (' + brl(outrasContrib) + ') foram tratadas como previdência oficial dedutível no IRRF.'] : [];
    return { ok: true, resultado: { bruto, inss, irrf: ir.valor, liquido }, memoria: mem.L, parametros: [refSet(sCI), refSet(ir.set)], bases: basesDe([sCI, ir.set]), avisos };
  }

  // ───────────────────────────── pensão alimentícia ─────────────────────────────
  function calcPensao(inp) {
    const mem = Mem(); const rend = cents(inp.rendimento), inss = cents(inp.inss), irrf = cents(inp.irrf), outros = cents(inp.outrosDescontos);
    let base = 0, desc = '';
    const modo = inp.modo || 'bruto';
    if (modo === 'fixo') { const v = cents(inp.valorFixo); mem.t('Pensão — valor fixo'); mem.tot('PENSÃO', v); return { ok: true, resultado: { pensao: v, base: null }, memoria: mem.L, parametros: [], bases: CALC_BASES.filter(b => b.id === 'LEI_9250_1995'), avisos: [] }; }
    if (modo === 'bruto') { base = rend; desc = 'Rendimento bruto'; }
    else if (modo === 'bruto_menos_inss') { base = rend - inss; desc = 'Bruto − INSS'; }
    else if (modo === 'liquido') { base = rend - inss - irrf - outros; desc = 'Líquido (bruto − INSS − IRRF − outros descontos)'; }
    else if (modo === 'personalizada') { base = cents(inp.basePersonalizada); desc = 'Base determinada judicialmente'; }
    else return ERR('Modo de base da pensão desconhecido.');
    base = max0(base);
    const p = pct(inp.percentual); const v = mulC(base, p);
    mem.t('Pensão alimentícia'); mem.l('Base: ' + desc, base); mem.l('× Percentual ' + String(inp.percentual).replace('.', ',') + '%', v, '×'); mem.tot('PENSÃO', v);
    return { ok: true, resultado: { pensao: v, base }, memoria: mem.L, parametros: [], bases: CALC_BASES.filter(b => b.id === 'LEI_9250_1995'), avisos: [] };
  }

  // ───────────────────────────── Lucro Presumido (IRPJ + CSLL, trimestral) ─────────────────────────────
  // inp: ano, trimestre, atividades:[{tipo, receita, irpj?, csll?}], receitasFinanceiras, ganhosCapital, outrasAdicoes, irrfCompensar, csllRetida, outrasAntecipacoesIrpj, outrasAntecipacoesCsll, tipoCsll ('comum')
  function calcLucroPresumido(inp) {
    const ano = parseInt(inp.ano, 10), tri = parseInt(inp.trimestre, 10);
    if (![1, 2, 3, 4].includes(tri) || !ano) return ERR('Informe o ano e o trimestre (1 a 4).');
    const fimTri = ano + '-' + String(tri * 3).padStart(2, '0') + '-' + (tri === 1 || tri === 4 ? '31' : '30');
    const set = acharSet('lucro_presumido', fimTri); if (!set) return ERR(ERRO_PARAM, { detalhe: 'Lucro Presumido — ' + tri + 'º trimestre/' + ano });
    const mem = Mem(), avisos = [];
    const lim = cents(pv(set, 'limite_trimestral')), acr = dec(pv(set, 'acrescimo_presuncao'));
    const cDesde = pv(set, 'csll_majoracao_desde'), iDesde = pv(set, 'irpj_majoracao_desde');
    const aplica = d => (ano > d.ano) || (ano === d.ano && tri >= d.trimestre);
    const majIRPJ = aplica(iDesde), majCSLL = aplica(cDesde);
    const alCSLLtab = pv(set, 'csll_aliquotas'); const tipoC = inp.tipoCsll || 'comum';
    if (!alCSLLtab[tipoC]) return ERR('Alíquota da CSLL não cadastrada para este tipo de contribuinte. Cadastre em Bases Legais → Cadastrar parâmetros.');
    const ativ = pv(set, 'atividades');
    const itens = (inp.atividades || []).map(a => {
      const rec = cents(a.receita); const def = ativ[a.tipo];
      let pi, pc, nome;
      if (a.tipo === 'outra') { pi = String(a.irpj).replace(',', '.'); pc = String(a.csll).replace(',', '.'); nome = a.nome || 'Outra atividade'; }
      else if (def) { pi = def.irpj; pc = def.csll; nome = def.nome; }
      else throw new Error('Atividade desconhecida: ' + a.tipo);
      return { nome, rec, pi: pct(pi), pc: pct(pc), piTxt: pi, pcTxt: pc };
    }).filter(i => i.rec > 0);
    if (!itens.length) return ERR('Informe a receita bruta de ao menos uma atividade.');
    const recTot = itens.reduce((s, i) => s + i.rec, 0);
    // limite distribuído proporcionalmente à participação de cada atividade na receita bruta do trimestre (o resíduo de arredondamento vai para a maior)
    let usados = 0; itens.forEach(i => { i.lim = Math.min(i.rec, mulC(Math.min(lim, recTot), Q(i.rec, recTot))); usados += i.lim; });
    const tetoTotal = Math.min(lim, recTot); const resto = tetoTotal - usados;
    if (resto !== 0) { const maior = itens.slice().sort((a, b) => b.rec - a.rec)[0]; maior.lim = Math.max(0, Math.min(maior.rec, maior.lim + resto)); }
    itens.forEach(i => { i.exc = i.rec - i.lim; });

    mem.t('Receita bruta do trimestre'); itens.forEach(i => mem.l(i.nome, i.rec, '+')); mem.s('Receita sujeita aos coeficientes de presunção', recTot);
    mem.t('Limite da majoração (por TRIMESTRE — não é limite mensal)');
    mem.l('Limite trimestral (R$ 5.000.000,00 ÷ 4)', lim); mem.txt('Receita do trimestre', recTot > lim ? 'ACIMA do limite em ' + brl(recTot - lim) : 'dentro do limite — sem majoração');
    if (itens.length > 1 && recTot > lim) { mem.n('Mais de uma atividade: o limite é distribuído pela participação de cada atividade na receita do trimestre.'); itens.forEach(i => mem.l('Limite da atividade ' + i.nome + ' (' + (i.rec * 100 / recTot).toFixed(2).replace('.', ',') + '%)', i.lim)); }

    function base(tipo, maj) {
      const L = []; let total = Q(0);
      itens.forEach(i => {
        const normal = tipo === 'irpj' ? i.pi : i.pc; const majorada = qMul(normal, qAdd(Q(1), acr));
        const parteNormal = mulQ(maj ? i.lim : i.rec, normal); total = qAdd(total, parteNormal);
        L.push({ r: i.nome + ' — ' + brl(maj ? i.lim : i.rec) + ' × ' + (tipo === 'irpj' ? i.piTxt : i.pcTxt).replace('.', ',') + '%', v: qRound(parteNormal) });
        if (maj && i.exc > 0) { const pm = mulQ(i.exc, majorada); total = qAdd(total, pm); const pctM = qRound(qMul(majorada, Q(10000))); L.push({ r: i.nome + ' (excedente) — ' + brl(i.exc) + ' × ' + (pctM / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%', v: qRound(pm) }); }
      });
      return { L, total: qRound(total) };
    }
    const fin = cents(inp.receitasFinanceiras), gc = cents(inp.ganhosCapital), oa = cents(inp.outrasAdicoes);
    const adicoes = fin + gc + oa;
    // IRPJ
    mem.t('IRPJ — ' + (majIRPJ ? 'regra NOVA (majoração vigente desde ' + iDesde.trimestre + 'º tri/' + iDesde.ano + ')' : 'regra anterior (sem majoração)'));
    const bi = base('irpj', majIRPJ); bi.L.forEach(x => mem.l(x.r, x.v, '+')); mem.s('Base presumida (receitas × coeficientes)', bi.total);
    mem.t('Receitas somadas INTEGRALMENTE à base (fora do limite da majoração)');
    mem.l('Receitas financeiras', fin, '+'); mem.l('Ganhos de capital', gc, '+'); mem.l('Outras adições integrais', oa, '+');
    const baseIRPJ = bi.total + adicoes; mem.s('BASE DE CÁLCULO DO IRPJ', baseIRPJ);
    const irpjNormal = mulC(baseIRPJ, dec(pv(set, 'irpj_aliquota')));
    mem.l('IRPJ normal: ' + brl(baseIRPJ) + ' × ' + Number(pv(set, 'irpj_aliquota')) * 100 + '%', irpjNormal, '×');
    const limAdic = cents(pv(set, 'irpj_adicional_limite_mensal')) * 3;
    mem.n('Adicional: 10% sobre a parte da BASE DO IRPJ acima de ' + brl(limAdic) + ' (R$ 20.000,00 × 3 meses). Não confundir com o limite de R$ 1.250.000,00 da RECEITA.');
    const excAdic = max0(baseIRPJ - limAdic); const adicional = mulC(excAdic, dec(pv(set, 'irpj_adicional_aliquota')));
    mem.l('Base − limite do adicional = ' + brl(excAdic) + ' × 10%', adicional, '+');
    const irpjTotal = irpjNormal + adicional; mem.s('IRPJ antes das compensações', irpjTotal);
    const irrf = cents(inp.irrfCompensar), antI = cents(inp.outrasAntecipacoesIrpj);
    mem.l('(−) IRRF a compensar', irrf, '−'); mem.l('(−) Outras antecipações do IRPJ', antI, '−');
    const irpjSaldo = irpjTotal - irrf - antI; mem.tot(irpjSaldo >= 0 ? 'IRPJ A PAGAR' : 'IRPJ — SALDO NEGATIVO (a compensar)', irpjSaldo);
    // CSLL
    mem.t('CSLL — ' + (majCSLL ? 'regra NOVA (majoração vigente desde ' + cDesde.trimestre + 'º tri/' + cDesde.ano + ')' : 'regra anterior SEM majoração (a majoração da CSLL só vale a partir do ' + cDesde.trimestre + 'º trimestre/' + cDesde.ano + ')'));
    const bc = base('csll', majCSLL); bc.L.forEach(x => mem.l(x.r, x.v, '+')); mem.s('Base presumida (receitas × coeficientes)', bc.total);
    mem.l('Receitas financeiras', fin, '+'); mem.l('Ganhos de capital', gc, '+'); mem.l('Outras adições integrais', oa, '+');
    const baseCSLL = bc.total + adicoes; mem.s('BASE DE CÁLCULO DA CSLL', baseCSLL);
    const csll = mulC(baseCSLL, dec(alCSLLtab[tipoC])); mem.l('CSLL: ' + brl(baseCSLL) + ' × ' + Number(alCSLLtab[tipoC]) * 100 + '%', csll, '×');
    const csllRet = cents(inp.csllRetida), antC = cents(inp.outrasAntecipacoesCsll);
    mem.l('(−) CSLL retida a compensar', csllRet, '−'); mem.l('(−) Outras antecipações da CSLL', antC, '−');
    const csllSaldo = csll - csllRet - antC; mem.tot(csllSaldo >= 0 ? 'CSLL A PAGAR' : 'CSLL — SALDO NEGATIVO (a compensar)', csllSaldo);
    if (ano === 2026) avisos.push('CSLL 2026: limite anual proporcional de ' + brl(cents(pv(set, 'csll_limite_anual_2026'))) + ' (três trimestres sujeitos à nova regra). O 1º trimestre/2026 NÃO tem majoração da CSLL.');
    if (alCSLLtab && tipoC === 'comum') avisos.push('CSLL calculada à alíquota da empresa comum. Entidades financeiras e outras atividades têm alíquota própria — não cadastradas.');
    return { ok: true, resultado: { baseIRPJ, irpj: irpjTotal, irpjAPagar: max0(irpjSaldo), irpjSaldo, baseCSLL, csll, csllAPagar: max0(csllSaldo), csllSaldo, majoracaoIRPJ: majIRPJ, majoracaoCSLL: majCSLL }, memoria: mem.L, parametros: [refSet(set)], bases: basesDe([set]), avisos };
  }

  // ───────────────────────────── ITCMD ─────────────────────────────
  // Passo 1: UF competente (não basta perguntar "qual estado?").
  function ufCompetente(p) {
    const tipo = p.tipo, bem = p.tipoBem;
    if (bem === 'imovel') return { uf: p.ufImovel, just: 'Bem imóvel: competente a UF onde o imóvel está situado (CF, art. 155, §1º, I).' };
    if (tipo === 'causa_mortis') return { uf: p.ufInventario || p.ufDomicilioFalecido, just: 'Causa mortis de bem móvel, título ou crédito: UF onde se processa o inventário/arrolamento ou, se for o caso, onde tinha domicílio o falecido (CF, art. 155, §1º, II).' };
    if (p.ufDomicilioDoador === 'EXT' || !p.ufDomicilioDoador) return { uf: p.ufDomicilioDonatario, just: 'Doação de bem móvel/título/crédito com doador no exterior ou sem domicílio informado: UF do domicílio do donatário (CF, art. 155, §1º, III).' };
    return { uf: p.ufDomicilioDoador, just: 'Doação de bem móvel, título ou crédito: UF do domicílio do doador (CF, art. 155, §1º, II).' };
  }
  // valuation simples de quotas: o usuário informa os componentes; nada é estimado sozinho
  function valorQuotas(q) {
    const pl = cents(q.patrimonioLiquido), aa = cents(q.ajusteAtivos), ap = cents(q.ajustePassivos), gw = cents(q.goodwill), outra = cents(q.outraMetodologia);
    if (outra) return { valor: outra, comp: [['Valor da empresa por outra metodologia tecnicamente idônea', outra]] };
    const total = pl + aa - ap + gw; const part = mulC(total, pct(q.percentualParticipacao || '100'));
    return { valor: part, comp: [['Patrimônio líquido contábil', pl], ['(+) Ajustes de ativos a valor de mercado', aa], ['(−) Ajustes de passivos', ap], ['(+) Fundo de comércio / goodwill', gw], ['= Valor da empresa', total], ['× ' + String(q.percentualParticipacao || '100').replace('.', ',') + '% (participação transmitida)', part]] };
  }
  function calcITCMD(inp) {
    const dataFG = String(inp.dataFatoGerador || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFG)) return ERR('Informe a data do fato gerador.');
    const comp = ufCompetente(inp);
    if (!comp.uf) return ERR('Não foi possível identificar a UF competente — informe o domicílio do doador/falecido ou a UF do imóvel.');
    const mem = Mem(), avisos = [];
    mem.t('1. UF competente'); mem.txt('UF competente identificada', comp.uf); mem.n(comp.just);
    if (inp.usufruto || inp.nuaPropriedade) {
      const sUf = acharSet('itcmd', dataFG, comp.uf);
      if (!sUf || pv(sUf, 'usufruto_nua_propriedade') === null || pv(sUf, 'usufruto_nua_propriedade') === undefined) return ERR('Regra de usufruto/nua-propriedade não cadastrada para ' + comp.uf + ' na data do fato gerador. Cadastre em Bases Legais → Cadastrar parâmetros.', { uf: comp.uf });
    }
    const set = acharSet('itcmd', dataFG, comp.uf);
    if (!set || set.uf !== comp.uf) return ERR(ERRO_PARAM, { detalhe: 'ITCMD — UF ' + comp.uf + ', fato gerador ' + dataFG + '. Nunca aplicamos a regra de outro Estado.', uf: comp.uf });
    const aliq = dec(pv(set, 'aliquota')), ufesp = cents(pv(set, 'ufesp'));
    let valorBem = cents(inp.valorBem);
    mem.t('2. Bem / direito');
    if (inp.tipoBem === 'quotas') { const vq = valorQuotas(inp.quotas || {}); valorBem = vq.valor; vq.comp.forEach(([r, v]) => mem.l(r, v)); mem.s('Valor da participação (avaliação informada pelo usuário)', valorBem); avisos.push('Quotas societárias: o sistema não estima valor de empresa — usa os componentes que você informou (LC 227/2026 traz regra nacional de avaliação).'); }
    else mem.l('Valor do bem/direito', valorBem);
    const pctTrans = String(inp.percentualTransmitido === undefined || inp.percentualTransmitido === '' ? '100' : inp.percentualTransmitido);
    const transmitido = inp.tipoBem === 'quotas' ? valorBem : mulC(valorBem, pct(pctTrans));
    if (inp.tipoBem !== 'quotas') mem.l('× ' + pctTrans.replace('.', ',') + '% transmitido', transmitido, '×');
    const out = { uf: comp.uf, tipo: inp.tipo, set: refSet(set) };
    if (inp.tipo === 'causa_mortis') {
      mem.t('3. Quinhões — cálculo INDIVIDUAL por herdeiro/legatário');
      let herd = (inp.herdeiros || []).filter(h => h.nome || h.quinhao); const n = parseInt(inp.numHerdeiros || 0, 10);
      if (!herd.length) { const k = n || 1; const parte = Math.floor(transmitido / k); herd = Array.from({ length: k }, (_, i) => ({ nome: 'Herdeiro ' + (i + 1), quinhaoC: parte + (i === 0 ? transmitido - parte * k : 0) })); }
      else herd = herd.map(h => ({ nome: h.nome || 'Herdeiro', quinhaoC: cents(h.quinhao) }));
      const soma = herd.reduce((s, h) => s + h.quinhaoC, 0);
      if (soma !== transmitido) avisos.push('A soma dos quinhões (' + brl(soma) + ') difere do valor transmitido (' + brl(transmitido) + ').');
      let totalImp = 0; const linhas = [];
      herd.forEach(h => { const imp = mulC(h.quinhaoC, aliq); totalImp += imp; linhas.push({ nome: h.nome, quinhao: h.quinhaoC, imposto: imp }); mem.l(h.nome + ': quinhão ' + brl(h.quinhaoC) + ' × ' + Number(pv(set, 'aliquota')) * 100 + '%', imp, '+'); });
      mem.tot('ITCMD TOTAL (soma dos herdeiros)', totalImp);
      avisos.push('Isenções de causa mortis de ' + comp.uf + ' não estão cadastradas — nenhuma isenção foi aplicada.');
      Object.assign(out, { itcmd: totalImp, herdeiros: linhas, base: transmitido, aliquota: pv(set, 'aliquota') });
      return { ok: true, resultado: out, memoria: mem.L, parametros: [refSet(set)], bases: basesDe([set]).concat(CALC_BASES.filter(b => b.id === 'CF_155' || b.id === 'LC_227_2026')), avisos };
    }
    // doação
    mem.t('3. Doação — isenção e doações sucessivas');
    const isenUfesp = parseInt(pv(set, 'isencao_doacao_ufesp'), 10), limIsen = isenUfesp * ufesp;
    mem.l('UFESP do exercício (' + dataFG.slice(0, 4) + ')', ufesp); mem.l(isenUfesp + ' UFESPs × ' + brl(ufesp) + ' (limite indicativo da isenção)', limIsen);
    const ant = cents(inp.doacoesAnteriores), acum = ant + transmitido;
    mem.l('Doações anteriores (mesmo doador e mesmo donatário, no ano civil)', ant); mem.l('Doação atual', transmitido); mem.s('Total acumulado', acum);
    let itcmd = 0, situacao, baseTrib = 0;
    if (acum <= limIsen) { situacao = 'POSSÍVEL ISENÇÃO'; mem.txt('Situação', 'POSSÍVEL ISENÇÃO — acumulado (' + brl(acum) + ') ≤ limite (' + brl(limIsen) + '). Confirme as demais condições legais antes de deixar de recolher.'); mem.tot('ITCMD', 0); avisos.push('Isenção condicionada: confirme doador/donatário, período e demais condições da legislação paulista. A calculadora não zera o imposto sem alertar.'); }
    else { situacao = 'TRIBUTADA'; baseTrib = transmitido; itcmd = mulC(baseTrib, aliq); mem.txt('Situação', 'TRIBUTADA — acumulado (' + brl(acum) + ') acima do limite (' + brl(limIsen) + ')'); mem.l('Base tributável (doação atual)', baseTrib); mem.l('× alíquota ' + Number(pv(set, 'aliquota')) * 100 + '%', itcmd, '×'); mem.tot('ITCMD', itcmd);
      if (ant > 0) avisos.push('Doações sucessivas: o acumulado do ano ultrapassou o limite. A calculadora aplica a alíquota sobre a doação atual — confirme na legislação paulista se o imposto deve incidir sobre o total acumulado (parâmetro sucessivas_base).'); }
    Object.assign(out, { itcmd, situacao, base: baseTrib, isencao_limite: limIsen, acumulado: acum, aliquota: pv(set, 'aliquota') });
    return { ok: true, resultado: out, memoria: mem.L, parametros: [refSet(set)], bases: basesDe([set]), avisos };
  }

  // ───────────────────────────── Mútuo / IOF / juros / IRRF ─────────────────────────────
  function diasEntre(a, b) { const d1 = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)), d2 = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)); return Math.round((d2 - d1) / 864e5); }
  function calcMutuo(inp) {
    const ini = String(inp.dataLiberacao || '').slice(0, 10), fim = String(inp.dataVencimento || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || fim < ini) return ERR('Informe a data de liberação e a data de vencimento (vencimento não pode ser anterior).');
    const principal = cents(inp.principal), mem = Mem(), avisos = [], sets = [];
    const dias = diasEntre(ini, fim); const mutuante = inp.mutuante, mutuario = inp.mutuario;
    let juros = cents(inp.valorJuros);
    if (!juros && inp.taxaJuros) { juros = mulC(principal, pct(inp.taxaJuros)); }
    mem.t('Operação'); mem.l('Principal', principal); mem.i('Prazo (dias corridos)', dias); mem.l('Juros', juros);
    mem.txt('Mutuante → Mutuário', mutuante + ' → ' + mutuario + (inp.mesmoGrupo ? ' (mesmo grupo econômico)' : ''));
    if (inp.mesmoGrupo) mem.n('Pertencer ao mesmo grupo econômico NÃO dispensa o IOF automaticamente.');
    if (mutuante === 'PF' && mutuario === 'PF') return ERR('Mútuo PF → PF: tratar em módulo próprio conforme a natureza da operação.');
    let iofC = null, iofMsg = '';
    // IOF — só quando o mutuante é PJ (PJ→PJ e PJ→PF)
    if (mutuante === 'PJ') {
      if (inp.contaCorrente) iofMsg = 'Conta corrente: o IOF depende do saldo devedor diário — não calculado por esta versão.';
      else {
        const sIof = acharSet('iof_credito', ini);
        if (!sIof) iofMsg = 'IOF: ' + ERRO_PARAM + ' Cadastre o conjunto "iof_credito" em Bases Legais → Cadastrar parâmetros.';
        else {
          sets.push(sIof);
          const modoSimples = inp.mutuarioSimples && pv(sIof, 'taxa_diaria_simples') !== undefined;
          if (inp.mutuarioSimples && !modoSimples) iofMsg = 'IOF: parâmetros do mutuário Simples não cadastrados no conjunto vigente.';
          else if (inp.principalDefinido === false) iofMsg = 'IOF com principal NÃO definido (modo prazo): não suportado nesta versão.';
          else {
            const taxa = dec(pv(sIof, modoSimples ? 'taxa_diaria_simples' : 'taxa_diaria')), adic = dec(pv(sIof, 'adicional') || '0'), limDias = parseInt(pv(sIof, 'limite_dias') || 365, 10);
            const dt = Math.min(dias, limDias);
            mem.t('IOF (conjunto ' + sIof.id + ' v' + sIof.version + ')');
            const diario = qRound(qMul(mulQ(principal, taxa), Q(dt)));
            mem.l('Principal × taxa diária × ' + dt + ' dias tributáveis (limite ' + limDias + ')', diario, '×');
            const ad = mulC(principal, adic); mem.l('(+) Adicional sobre o principal', ad, '+');
            iofC = diario + ad; mem.tot('IOF', iofC);
          }
        }
      }
    } else mem.n('Mutuante PF: não se aplica IOF automaticamente como operação concedida por PJ.');
    // IRRF sobre os JUROS (nunca sobre o principal) quando o mutuário PJ paga juros
    let irrfC = null;
    if (mutuario === 'PJ' && juros > 0) {
      const sR = acharSet('mutuo_irrf_juros', fim);
      if (!sR) avisos.push('IRRF dos juros: ' + ERRO_PARAM);
      else {
        sets.push(sR); const faixas = pv(sR, 'faixas'); const fx = faixas.find(f => f.ate_dias === null || dias <= f.ate_dias);
        mem.t('IRRF sobre os JUROS (tabela regressiva por prazo)'); mem.l('Base = juros (a devolução do principal não entra)', juros);
        irrfC = mulC(juros, dec(fx.aliq)); mem.l('Alíquota para ' + dias + ' dias: ' + Number(fx.aliq) * 100 + '%', irrfC, '×'); mem.tot('IRRF sobre juros', irrfC);
        if (mutuante === 'PJ') avisos.push('Mutuante PJ: a retenção sobre juros é antecipação compensável do IRPJ do mutuante — confira o enquadramento.');
      }
    }
    if (iofMsg) avisos.push(iofMsg);
    return { ok: true, resultado: { dias, juros, iof: iofC, irrf_juros: irrfC }, memoria: mem.L, parametros: sets.map(refSet), bases: basesDe(sets).concat(CALC_BASES.filter(b => b.id === 'IOF_CREDITO' && !sets.some(s => s.calculator_key === 'iof_credito'))), avisos };
  }

  // ───────────────────────────── PLR (tabela exclusiva, versionada) ─────────────────────────────
  function calcPLR(inp) {
    const d = data1(inp.competencia); const set = acharSet('plr', d);
    if (!set) return ERR(ERRO_PARAM, { detalhe: 'PLR — tabela de tributação exclusiva não cadastrada para ' + d.slice(0, 7) + '. Cadastre em Bases Legais → Cadastrar parâmetros.' });
    const mem = Mem(); const total = cents(inp.plrAnterior) + cents(inp.plrAtual); const jaRet = cents(inp.irJaRetido);
    mem.t('PLR — tributação exclusiva (tabela do conjunto ' + set.id + ' v' + set.version + ')'); mem.l('PLR anterior no ano', cents(inp.plrAnterior), '+'); mem.l('PLR atual', cents(inp.plrAtual), '+'); mem.s('Total no ano', total);
    const fx = pv(set, 'faixas').find(f => f.ate === null || total <= cents(f.ate));
    const imp = max0(qRound(qSub(mulQ(total, dec(fx.aliq)), Q(cents(fx.ded)))));
    mem.l('Total × alíquota ' + Number(fx.aliq) * 100 + '% − parcela ' + brl(cents(fx.ded)), imp); mem.l('(−) IR já retido', jaRet, '−'); mem.tot('IR a reter agora', max0(imp - jaRet));
    return { ok: true, resultado: { ir: max0(imp - jaRet) }, memoria: mem.L, parametros: [refSet(set)], bases: basesDe([set]), avisos: [] };
  }

  // ───────────────────────────── Férias ─────────────────────────────
  function calcFerias(inp) {
    const d = data1(inp.competencia), mem = Mem();
    const sI = acharSet('inss_empregado', d); if (!sI) return ERR(ERRO_PARAM, { detalhe: 'INSS empregado — ' + d.slice(0, 7) });
    const rem = cents(inp.remuneracao), med = cents(inp.medias), dias = parseInt(inp.diasFerias || 30, 10), diasAbono = parseInt(inp.diasAbono || 0, 10);
    if (dias < 5 || dias > 30) return ERR('Dias de férias deve estar entre 5 e 30.'); if (diasAbono < 0 || diasAbono > 10) return ERR('O abono pecuniário é de até 10 dias.');
    const mensal = rem + med; const valDia = Q(mensal, 30);
    mem.t('Remuneração de referência'); mem.l('Remuneração', rem, '+'); mem.l('Médias (variáveis)', med, '+'); mem.s('Base mensal', mensal);
    const ferias = qRound(qMul(valDia, Q(dias))); const terco = mulC(ferias, Q(1, 3));
    mem.t('Verbas'); mem.l('Férias: ' + dias + ' dias × (base ÷ 30)', ferias, '+'); mem.l('1/3 constitucional', terco, '+');
    const abono = diasAbono ? qRound(qMul(valDia, Q(diasAbono))) : 0; const tercoAbono = mulC(abono, Q(1, 3));
    if (diasAbono) { mem.l('Abono pecuniário: ' + diasAbono + ' dias', abono, '+'); mem.l('1/3 do abono', tercoAbono, '+'); }
    const tributavel = ferias + terco; mem.s('Verbas que sofrem INSS e IRRF (férias + 1/3)', tributavel); if (diasAbono) mem.n('Abono pecuniário e seu 1/3 são indenizatórios: não entram na base de INSS/IRRF.');
    mem.t('INSS'); const inss = inssProgressivo(tributavel, sI, mem);
    const pens = cents(inp.pensao);
    const ir = irrfMensal(d, { rendimentos: tributavel, previdencia: inss.valor, dependentes: parseInt(inp.dependentes || 0, 10), pensao: pens, outras: 0, maisVantajosa: inp.maisVantajosa !== false }, mem);
    if (!ir.ok) return ir;
    const outros = cents(inp.outrosDescontos);
    mem.t('Resultado'); mem.l('Férias + 1/3 + abono + 1/3 do abono', tributavel + abono + tercoAbono); mem.l('(−) INSS', inss.valor, '−'); mem.l('(−) IRRF', ir.valor, '−'); mem.l('(−) Pensão', pens, '−'); mem.l('(−) Outros descontos', outros, '−');
    const liquido = tributavel + abono + tercoAbono - inss.valor - ir.valor - pens - outros; mem.tot('LÍQUIDO DAS FÉRIAS', liquido);
    return { ok: true, resultado: { ferias, terco, abono, tercoAbono, inss: inss.valor, irrf: ir.valor, liquido }, memoria: mem.L, parametros: [refSet(sI), refSet(ir.set)], bases: basesDe([sI, ir.set]), avisos: ['Cálculo ISOLADO das férias. Se forem pagas no mesmo mês da folha, INSS e IRRF devem considerar todas as verbas do mês (use também Salário líquido).', 'Versão inicial da matriz de incidência — conferir as rubricas.'] };
  }

  // ───────────────────────────── 13º salário ─────────────────────────────
  // avos: mês com pelo menos 15 dias computáveis = 1 avo
  function avosAno(admissaoISO, ano) {
    let a = 12;
    if (admissaoISO && +admissaoISO.slice(0, 4) === ano) {
      const m = +admissaoISO.slice(5, 7), dd = +admissaoISO.slice(8, 10); const diasMes = new Date(ano, m, 0).getDate();
      const diasComp = diasMes - dd + 1; a = 12 - m + 1 - (diasComp >= 15 ? 0 : 1);
    } else if (admissaoISO && +admissaoISO.slice(0, 4) > ano) a = 0;
    return Math.max(0, Math.min(12, a));
  }
  function calc13(inp) {
    const d = data1(inp.competencia), ano = +d.slice(0, 4), mem = Mem();
    const sI = acharSet('inss_empregado', d); if (!sI) return ERR(ERRO_PARAM, { detalhe: 'INSS empregado — ' + d.slice(0, 7) });
    const rem = cents(inp.remuneracao), med = cents(inp.medias); const avos = inp.avos !== undefined && inp.avos !== '' ? parseInt(inp.avos, 10) : avosAno(inp.dataAdmissao, ano);
    if (avos < 0 || avos > 12) return ERR('Avos deve ficar entre 0 e 12.');
    const bruto = qRound(qMul(Q(rem + med, 12), Q(avos)));
    mem.t('13º salário'); mem.l('Remuneração + médias', rem + med); mem.l('÷ 12 × ' + avos + ' avos (mês com 15 dias ou mais = 1 avo)', bruto, '×'); mem.s('13º bruto', bruto);
    const primeira = inp.primeiraParcela !== undefined && inp.primeiraParcela !== '' ? cents(inp.primeiraParcela) : Math.floor(bruto / 2);
    mem.l('1ª parcela (sem descontos)' + (inp.primeiraParcela !== undefined && inp.primeiraParcela !== '' ? ' — já paga' : ' — 50% do bruto'), primeira, '−');
    mem.t('INSS e IRRF do 13º — tratados SEPARADAMENTE da folha mensal'); const inss = inssProgressivo(bruto, sI, mem);
    const pens = cents(inp.pensao);
    const ir = irrfMensal(d, { rendimentos: bruto, previdencia: inss.valor, dependentes: parseInt(inp.dependentes || 0, 10), pensao: pens, outras: 0, maisVantajosa: inp.maisVantajosa !== false, aplicaRedutor: !!pv(acharSet('irrf_pf', d) || { params: {} }, 'redutor_aplica_13') }, mem);
    if (!ir.ok) return ir;
    const segunda = bruto - primeira - inss.valor - ir.valor - pens;
    mem.t('Resultado'); mem.l('13º bruto', bruto); mem.l('(−) 1ª parcela', primeira, '−'); mem.l('(−) INSS', inss.valor, '−'); mem.l('(−) IRRF', ir.valor, '−'); mem.l('(−) Pensão', pens, '−'); mem.tot('2ª PARCELA (líquida)', segunda);
    return { ok: true, resultado: { bruto, primeira, inss: inss.valor, irrf: ir.valor, segunda, avos }, memoria: mem.L, parametros: [refSet(sI), refSet(ir.set)], bases: basesDe([sI, ir.set]), avisos: ['O redutor do IRRF 2026 não foi aplicado ao 13º (parâmetro redutor_aplica_13 = não). Confirmar na norma.', 'Versão inicial — conferir.'] };
  }

  // ───────────────────────────── Rescisão ─────────────────────────────
  // Matriz de incidência por rubrica (versão inicial — conferir antes de usar).
  const MATRIZ_RESCISAO = {
    saldo_salario: { nome: 'Saldo de salário', inss: true, irrf: true, fgts: true, base: 'CLT art. 457; Lei 8.212/91 art. 28' },
    aviso_indenizado: { nome: 'Aviso prévio indenizado', inss: false, irrf: false, fgts: true, base: 'CLT art. 487 §1º; Lei 12.506/2011; Súmula 305 TST' },
    decimo_proporcional: { nome: '13º proporcional', inss: true, irrf: true, fgts: true, base: 'Lei 4.090/62; tributação separada' },
    ferias_vencidas: { nome: 'Férias vencidas + 1/3', inss: false, irrf: false, fgts: false, base: 'CLT arts. 129-145; férias indenizadas' },
    ferias_proporcionais: { nome: 'Férias proporcionais + 1/3', inss: false, irrf: false, fgts: false, base: 'CLT art. 146 parágrafo único; férias indenizadas' },
  };
  const TIPOS_RESC = {
    sem_justa_causa: { nome: 'Dispensa sem justa causa', aviso: 'indenizado_cheio', decimo: true, feriasProp: true, multa: '0.40' },
    pedido_demissao: { nome: 'Pedido de demissão', aviso: 'nenhum', decimo: true, feriasProp: true, multa: null },
    justa_causa: { nome: 'Justa causa', aviso: 'nenhum', decimo: false, feriasProp: false, multa: null },
    acordo_484a: { nome: 'Acordo (art. 484-A)', aviso: 'indenizado_metade', decimo: true, feriasProp: true, multa: '0.20' },
    termino_contrato: { nome: 'Término de contrato', aviso: 'nenhum', decimo: true, feriasProp: true, multa: null },
    rescisao_indireta: { nome: 'Rescisão indireta', aviso: 'indenizado_cheio', decimo: true, feriasProp: true, multa: '0.40' },
  };
  function calcRescisao(inp) {
    const adm = String(inp.dataAdmissao || '').slice(0, 10), des = String(inp.dataDesligamento || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(adm) || !/^\d{4}-\d{2}-\d{2}$/.test(des) || des < adm) return ERR('Informe as datas de admissão e de desligamento.');
    const tipo = TIPOS_RESC[inp.tipo]; if (!tipo) return ERR('Tipo de rescisão desconhecido.');
    const d = des.slice(0, 7) + '-01', mem = Mem();
    const sI = acharSet('inss_empregado', d); if (!sI) return ERR(ERRO_PARAM, { detalhe: 'INSS empregado — ' + d.slice(0, 7) });
    const sal = cents(inp.salario), med = cents(inp.medias); const mensal = sal + med; const valDia = Q(mensal, 30);
    const anosCompl = (() => { let a = +des.slice(0, 4) - +adm.slice(0, 4); if (des.slice(5) < adm.slice(5)) a--; return Math.max(0, a); })();
    // aviso prévio proporcional (Lei 12.506): 30 dias + 3 por ano completo, máximo 90
    const diasAvisoCheio = Math.min(90, 30 + 3 * anosCompl);
    let diasAviso = 0; if (tipo.aviso === 'indenizado_cheio') diasAviso = diasAvisoCheio; else if (tipo.aviso === 'indenizado_metade') diasAviso = Math.floor(diasAvisoCheio / 2);
    if (inp.avisoModo === 'trabalhado' || inp.avisoModo === 'nao_ha') diasAviso = 0;
    // data fictícia (projeção do aviso indenizado integra o tempo de serviço — 13º e férias proporcionais)
    const addDias = (iso, n) => { const t = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)); return t.toISOString().slice(0, 10); };
    const dataProj = diasAviso ? addDias(des, diasAviso) : des;
    const linhas = []; // {rub, valor}
    // saldo de salário
    const diaDes = +des.slice(8, 10); const saldoSal = qRound(qMul(valDia, Q(Math.min(30, diaDes))));
    mem.t('Dados'); mem.l('Salário + médias (mensal)', mensal); mem.i('Anos completos de serviço', anosCompl); mem.txt('Tipo', tipo.nome);
    mem.t('Verbas — cada rubrica com a sua própria incidência');
    linhas.push({ rub: 'saldo_salario', valor: saldoSal }); mem.l('Saldo de salário: ' + Math.min(30, diaDes) + ' dias × (base ÷ 30)', saldoSal, '+');
    let aviso = 0; if (diasAviso) { aviso = qRound(qMul(valDia, Q(diasAviso))); linhas.push({ rub: 'aviso_indenizado', valor: aviso }); mem.l('Aviso prévio indenizado: ' + diasAviso + ' dias' + (tipo.aviso === 'indenizado_metade' ? ' (metade — art. 484-A)' : ''), aviso, '+'); }
    // avos do 13º no ano da data projetada
    const anoP = +dataProj.slice(0, 4); const inicio13 = (+adm.slice(0, 4) === anoP) ? adm : anoP + '-01-01';
    const a13 = tipo.decimo ? (() => { const mP = +dataProj.slice(5, 7), dP = +dataProj.slice(8, 10); const mI = +inicio13.slice(5, 7), dI = +inicio13.slice(8, 10); let av = 0; for (let m = mI; m <= mP; m++) { const dm = new Date(anoP, m, 0).getDate(); const ini = (m === mI ? dI : 1), fim = (m === mP ? dP : dm); if (fim - ini + 1 >= 15) av++; } return av; })() : 0;
    let dec13 = 0; if (a13) { dec13 = qRound(qMul(Q(mensal, 12), Q(a13))); linhas.push({ rub: 'decimo_proporcional', valor: dec13 }); mem.l('13º proporcional: ' + a13 + '/12 avos' + (diasAviso ? ' (com projeção do aviso)' : ''), dec13, '+'); }
    // férias vencidas
    const nVenc = parseInt(inp.periodosVencidos || 0, 10); let fv = 0;
    if (nVenc > 0) { const base = mensal; const um = base + mulC(base, Q(1, 3)); fv = um * nVenc; linhas.push({ rub: 'ferias_vencidas', valor: fv }); mem.l('Férias vencidas: ' + nVenc + ' período(s) × (base + 1/3)', fv, '+'); }
    // férias proporcionais: avos desde o último aniversário da admissão até a data projetada
    let fp = 0, aFer = 0;
    if (tipo.feriasProp) {
      const anivBase = (() => { let y = +dataProj.slice(0, 4); let c = y + adm.slice(4); if (c > dataProj) c = (y - 1) + adm.slice(4); return c; })();
      const ini = nVenc > 0 || true ? anivBase : adm; let av = 0; let cur = ini;
      for (let k = 0; k < 12; k++) { const prox = (() => { const y = +cur.slice(0, 4), m = +cur.slice(5, 7); const t = new Date(Date.UTC(y, m, +cur.slice(8, 10))); return t.toISOString().slice(0, 10); })(); if (prox <= addDias(dataProj, 1)) { av++; cur = prox; } else break; }
      const resto = diasEntre(cur, addDias(dataProj, 1)); if (resto >= 15) av++;
      aFer = Math.min(12, av);
      if (aFer) { const base = qRound(qMul(Q(mensal, 12), Q(aFer))); fp = base + mulC(base, Q(1, 3)); linhas.push({ rub: 'ferias_proporcionais', valor: fp }); mem.l('Férias proporcionais: ' + aFer + '/12 avos + 1/3' + (diasAviso ? ' (com projeção do aviso)' : ''), fp, '+'); }
    }
    // tributos por rubrica
    mem.t('Incidências por rubrica (matriz)');
    let baseInssMensal = 0, baseIrrfMensal = 0, baseInss13 = 0, baseIrrf13 = 0, baseFgts = 0;
    linhas.forEach(l => { const m = MATRIZ_RESCISAO[l.rub]; mem.txt(m.nome, (m.inss ? 'INSS ' : 'sem INSS ') + '· ' + (m.irrf ? 'IRRF ' : 'sem IRRF ') + '· ' + (m.fgts ? 'FGTS' : 'sem FGTS') + '  [' + m.base + ']');
      if (l.rub === 'decimo_proporcional') { if (m.inss) baseInss13 += l.valor; if (m.irrf) baseIrrf13 += l.valor; } else { if (m.inss) baseInssMensal += l.valor; if (m.irrf) baseIrrfMensal += l.valor; }
      if (m.fgts) baseFgts += l.valor; });
    const resD = { inss: 0, irrf: 0 };
    const pens = cents(inp.pensao), ndep = parseInt(inp.dependentes || 0, 10);
    let inssM = 0, irM = null, inss13 = 0, ir13 = null; const sets = [sI];
    if (baseInssMensal) { mem.t('INSS sobre o saldo de salário'); inssM = inssProgressivo(baseInssMensal, sI, mem).valor; }
    if (baseIrrfMensal) { irM = irrfMensal(d, { rendimentos: baseIrrfMensal, previdencia: inssM, dependentes: ndep, pensao: pens, outras: 0, maisVantajosa: inp.maisVantajosa !== false }, mem); if (!irM.ok) return irM; sets.push(irM.set); }
    if (baseInss13) { mem.t('INSS sobre o 13º (separado)'); inss13 = inssProgressivo(baseInss13, sI, mem).valor; }
    if (baseIrrf13) { ir13 = irrfMensal(d, { rendimentos: baseIrrf13, previdencia: inss13, dependentes: ndep, pensao: 0, outras: 0, maisVantajosa: inp.maisVantajosa !== false, aplicaRedutor: false }, mem); if (!ir13.ok) return ir13; }
    // FGTS
    mem.t('FGTS'); const fgtsDep = mulC(baseFgts, pct('8')); mem.l('Depósito rescisório: ' + brl(baseFgts) + ' × 8%', fgtsDep, '×');
    let multa = 0; const saldoFgts = cents(inp.saldoFgts);
    if (tipo.multa) { multa = mulC(saldoFgts + fgtsDep, dec(tipo.multa)); mem.l('Multa rescisória ' + Number(tipo.multa) * 100 + '% sobre (saldo ' + brl(saldoFgts) + ' + depósito ' + brl(fgtsDep) + ')', multa, '×'); }
    const bruto = linhas.reduce((s, l) => s + l.valor, 0);
    const outros = cents(inp.outrosDescontos);
    mem.t('Resultado'); mem.l('Total das verbas', bruto); mem.l('(−) INSS', inssM + inss13, '−'); mem.l('(−) IRRF', (irM ? irM.valor : 0) + (ir13 ? ir13.valor : 0), '−'); mem.l('(−) Pensão', pens, '−'); mem.l('(−) Adiantamentos/descontos', outros, '−');
    const liquido = bruto - inssM - inss13 - (irM ? irM.valor : 0) - (ir13 ? ir13.valor : 0) - pens - outros;
    mem.tot('LÍQUIDO DA RESCISÃO (sem FGTS)', liquido); mem.l('FGTS depositado na rescisão', fgtsDep); mem.l('Multa do FGTS', multa);
    return { ok: true, resultado: { verbas: linhas, bruto, inss: inssM + inss13, irrf: (irM ? irM.valor : 0) + (ir13 ? ir13.valor : 0), liquido, fgts: fgtsDep, multa_fgts: multa }, memoria: mem.L, parametros: sets.map(refSet), bases: basesDe(sets).concat(CALC_BASES.filter(b => b.id === 'CLT_RESCISAO')), avisos: ['VERSÃO INICIAL: a matriz de incidência e os tipos de rescisão devem ser conferidos rubrica por rubrica antes do uso profissional.', 'Aviso prévio proporcional pela Lei 12.506/2011 (30 dias + 3 por ano completo, até 90). O aviso indenizado integra o tempo de serviço para 13º e férias proporcionais.'] };
  }

  // ───────────────────────────── catálogo ─────────────────────────────
  const CATALOGO = [
    { key: 'irrf_pf', cat: 'FEDERAL', nome: 'IRRF — Pessoa Física', fn: calcIRRF },
    { key: 'salario_liquido', cat: 'TRABALHISTA', nome: 'Salário líquido', fn: calcSalarioLiquido },
    { key: 'pro_labore', cat: 'FINANCEIRO / SOCIETÁRIO', nome: 'Pró-labore líquido', fn: calcProLabore },
    { key: 'ferias', cat: 'TRABALHISTA', nome: 'Férias', fn: calcFerias },
    { key: 'decimo_terceiro', cat: 'TRABALHISTA', nome: '13º salário', fn: calc13 },
    { key: 'rescisao', cat: 'TRABALHISTA', nome: 'Rescisão trabalhista', fn: calcRescisao },
    { key: 'plr', cat: 'TRABALHISTA', nome: 'PLR — tributação exclusiva', fn: calcPLR },
    { key: 'pensao', cat: 'TRABALHISTA', nome: 'Pensão alimentícia', fn: calcPensao },
    { key: 'mutuo', cat: 'FINANCEIRO / SOCIETÁRIO', nome: 'Mútuo — IOF / juros / IRRF', fn: calcMutuo },
    { key: 'lucro_presumido', cat: 'TRIBUTÁRIO PJ', nome: 'Lucro Presumido — IRPJ e CSLL', fn: calcLucroPresumido },
    { key: 'itcmd', cat: 'ESTADUAL', nome: 'ITCMD — Doação e Causa mortis', fn: calcITCMD },
  ];
  const EM_BREVE = [
    ['TRIBUTÁRIO PJ', 'PIS/COFINS cumulativo'], ['TRIBUTÁRIO PJ', 'Simples Nacional (RBT12, alíquota efetiva, DAS)'], ['ESTADUAL', 'DIFAL'], ['ESTADUAL', 'ICMS-ST'],
    ['FEDERAL', 'Ganho de capital PF'], ['FEDERAL', 'Ganho de capital PJ'], ['CONTÁBIL / PATRIMONIAL', 'Depreciação fiscal'], ['FEDERAL', 'Variação patrimonial PF'],
    ['FINANCEIRO / SOCIETÁRIO', 'Juros / multa / Selic'], ['TRABALHISTA', 'FGTS'], ['TRABALHISTA', 'Horas extras e DSR'], ['TRABALHISTA', 'Adicional noturno'],
    ['TRABALHISTA', 'Insalubridade e periculosidade'], ['TRABALHISTA', 'Custo da folha'], ['TRIBUTÁRIO PJ', 'Planejamento tributário'],
  ];
  const CATEGORIAS = ['FEDERAL', 'TRABALHISTA', 'FINANCEIRO / SOCIETÁRIO', 'TRIBUTÁRIO PJ', 'ESTADUAL', 'CONTÁBIL / PATRIMONIAL'];

  // valida um conjunto de parâmetros antes de aceitar (cadastro manual / aprovação de proposta)
  function validarSet(s) {
    const erros = [];
    ['id', 'calculator_key', 'valid_from', 'version', 'status', 'params'].forEach(k => { if (s[k] === undefined || s[k] === null || s[k] === '') erros.push('Falta o campo "' + k + '".'); });
    if (s.valid_from && !/^\d{4}-\d{2}-\d{2}$/.test(s.valid_from)) erros.push('valid_from deve ser AAAA-MM-DD.');
    if (s.valid_to && !/^\d{4}-\d{2}-\d{2}$/.test(s.valid_to)) erros.push('valid_to deve ser AAAA-MM-DD (ou vazio).');
    if (s.valid_to && s.valid_from && s.valid_to < s.valid_from) erros.push('valid_to anterior a valid_from.');
    if (s.params && typeof s.params === 'object') Object.entries(s.params).forEach(([k, p]) => { if (!p || typeof p !== 'object' || !('value' in p)) erros.push('Parâmetro "' + k + '" precisa do formato {"value":...,"unit":"","description":""}.'); });
    return erros;
  }

  const API = { cents, brl, dec, pct, Q, qRound, qAdd, qMul, mulC, avosAno, acharSet, registrarSets, todosSets, CALC_SEED_SETS, CALC_BASES, CATALOGO, EM_BREVE, CATEGORIAS, ERRO_PARAM, MATRIZ_RESCISAO, TIPOS_RESC, validarSet, irrfMensal, inssProgressivo, ufCompetente, diasEntre,
    calcular(key, inp) { const c = CATALOGO.find(x => x.key === key); if (!c) return ERR('Calculadora desconhecida.'); try { return c.fn(inp || {}); } catch (e) { return ERR('Entrada inválida: ' + (e && e.message || e)); } } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.JJRCalc = API;
})(typeof window !== 'undefined' ? window : globalThis);

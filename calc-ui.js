/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * CALCULADORAS JJR — TELA  (pedido do usuário 20/10/2026)
 * Depende de calc-motor.js (window.JJRCalc) e das funções do site: S, esc, toast, currentUser, isAdmin, SUPABASE_URL/KEY.
 * A IA só aparece no botão "🤖 Pesquisar atualizações" dentro de Bases Legais — NUNCA calcula nem altera parâmetro sozinha.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const C = window.JJRCalc;
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const LS = { sets: 'calc_param_sets', hist: 'calc_historico', prop: 'calc_propostas', verif: 'calc_bases_verif' };
  const lerLista = k => { const v = S.g(k); return Array.isArray(v) ? v : []; };
  const ehAdmin = () => { try { return !!currentUser && isAdmin(currentUser); } catch (e) { return false; } };
  const hoje = () => new Date().toISOString().slice(0, 10);
  const mesAtual = () => hoje().slice(0, 7);
  const uf27 = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const OPC_UF = [['', '—']].concat(uf27.map(u => [u, u]));

  // ───────────────────────────── formulários ─────────────────────────────
  // tipos: money | int | pct | text | month | date | select | bool ; "quando" mostra o campo só se a função devolver true
  const F = {
    irrf_pf: { titulo: 'IRRF — Pessoa Física', desc: 'Imposto de renda retido na fonte sobre rendimentos do trabalho, com a tabela e o redutor da competência.', campos: [
      { k: 'competencia', l: 'Competência', t: 'month', def: mesAtual },
      { k: 'rendimentos', l: 'Rendimentos tributáveis (R$)', t: 'money' },
      { k: 'previdencia', l: 'Previdência oficial (INSS) (R$)', t: 'money' },
      { k: 'dependentes', l: 'Nº de dependentes', t: 'int', def: 0 },
      { k: 'pensao', l: 'Pensão alimentícia (R$)', t: 'money' },
      { k: 'outras', l: 'Outras deduções legais (R$)', t: 'money' },
      { k: 'maisVantajosa', l: 'Usar automaticamente a dedução mais vantajosa', t: 'bool', def: true }],
      resumo: r => [['IRRF a reter', r.irrf, 1], ['Base de cálculo', r.base], ['Dedução adotada', r.modo_deducao === 'simplificado' ? 'Desconto simplificado' : 'Deduções legais']] },
    salario_liquido: { titulo: 'Salário líquido', desc: 'Bruto → INSS progressivo → IRRF (mesmo motor da calculadora de IRRF) → demais descontos.', campos: [
      { k: 'competencia', l: 'Competência', t: 'month', def: mesAtual },
      { k: 'salario', l: 'Salário (R$)', t: 'money' }, { k: 'horasExtras', l: 'Horas extras (R$)', t: 'money' }, { k: 'comissoes', l: 'Comissões (R$)', t: 'money' }, { k: 'adicionais', l: 'Adicionais (R$)', t: 'money' }, { k: 'outrosProventos', l: 'Outros proventos (R$)', t: 'money' },
      { k: 'dependentes', l: 'Nº de dependentes', t: 'int', def: 0 }, { k: 'pensao', l: 'Pensão alimentícia (R$)', t: 'money' },
      { k: 'vt', l: 'Vale-transporte (R$)', t: 'money' }, { k: 'vr', l: 'Vale-refeição (R$)', t: 'money' }, { k: 'planoSaude', l: 'Plano de saúde (R$)', t: 'money' }, { k: 'adiantamento', l: 'Adiantamento (R$)', t: 'money' }, { k: 'outrosDescontos', l: 'Outros descontos (R$)', t: 'money' },
      { k: 'maisVantajosa', l: 'Usar automaticamente a dedução mais vantajosa no IRRF', t: 'bool', def: true }],
      resumo: r => [['Líquido', r.liquido, 1], ['Bruto', r.bruto], ['INSS', r.inss], ['IRRF', r.irrf], ['Demais descontos', r.descontos]] },
    pro_labore: { titulo: 'Pró-labore líquido', desc: 'INSS de 11% do contribuinte individual até o teto do RGPS (considerando base já usada em outra fonte) e IRRF.', campos: [
      { k: 'competencia', l: 'Competência', t: 'month', def: mesAtual },
      { k: 'proLabore', l: 'Pró-labore bruto (R$)', t: 'money' },
      { k: 'baseJaUtilizadaTeto', l: 'Base já utilizada do teto em outra fonte (R$)', t: 'money' },
      { k: 'outrasContribuicoes', l: 'Outras contribuições previdenciárias no mês (R$)', t: 'money' },
      { k: 'dependentes', l: 'Nº de dependentes', t: 'int', def: 0 }, { k: 'pensao', l: 'Pensão alimentícia (R$)', t: 'money' }, { k: 'outrosDescontos', l: 'Outros descontos (R$)', t: 'money' },
      { k: 'maisVantajosa', l: 'Usar automaticamente a dedução mais vantajosa no IRRF', t: 'bool', def: true }],
      resumo: r => [['Líquido', r.liquido, 1], ['Pró-labore', r.bruto], ['INSS', r.inss], ['IRRF', r.irrf]] },
    ferias: { titulo: 'Férias', desc: 'Férias + 1/3, abono pecuniário e descontos de INSS e IRRF (abono e seu 1/3 não sofrem desconto).', campos: [
      { k: 'competencia', l: 'Competência do pagamento', t: 'month', def: mesAtual },
      { k: 'remuneracao', l: 'Remuneração mensal (R$)', t: 'money' }, { k: 'medias', l: 'Médias de variáveis (R$)', t: 'money' },
      { k: 'diasFerias', l: 'Dias de férias (5 a 30)', t: 'int', def: 30 }, { k: 'diasAbono', l: 'Dias de abono pecuniário (0 a 10)', t: 'int', def: 0 },
      { k: 'dependentes', l: 'Nº de dependentes', t: 'int', def: 0 }, { k: 'pensao', l: 'Pensão alimentícia (R$)', t: 'money' }, { k: 'outrosDescontos', l: 'Outros descontos (R$)', t: 'money' },
      { k: 'maisVantajosa', l: 'Usar automaticamente a dedução mais vantajosa no IRRF', t: 'bool', def: true }],
      resumo: r => [['Líquido das férias', r.liquido, 1], ['Férias', r.ferias], ['1/3 constitucional', r.terco], ['Abono + 1/3', r.abono + r.tercoAbono], ['INSS', r.inss], ['IRRF', r.irrf]] },
    decimo_terceiro: { titulo: '13º salário', desc: 'Avos (mês com 15 dias ou mais conta), 1ª parcela e 2ª parcela com INSS e IRRF tratados separados da folha.', campos: [
      { k: 'competencia', l: 'Competência da 2ª parcela', t: 'month', def: () => mesAtual().slice(0, 4) + '-12' },
      { k: 'remuneracao', l: 'Remuneração mensal (R$)', t: 'money' }, { k: 'medias', l: 'Médias de variáveis (R$)', t: 'money' },
      { k: 'dataAdmissao', l: 'Data de admissão (se no ano)', t: 'date' }, { k: 'avos', l: 'Avos (deixe vazio para calcular pela admissão)', t: 'int', def: '' },
      { k: 'primeiraParcela', l: '1ª parcela já paga (R$) — vazio = 50% do bruto', t: 'money' },
      { k: 'dependentes', l: 'Nº de dependentes', t: 'int', def: 0 }, { k: 'pensao', l: 'Pensão alimentícia (R$)', t: 'money' },
      { k: 'maisVantajosa', l: 'Usar automaticamente a dedução mais vantajosa no IRRF', t: 'bool', def: true }],
      resumo: r => [['2ª parcela líquida', r.segunda, 1], ['13º bruto', r.bruto], ['1ª parcela', r.primeira], ['INSS', r.inss], ['IRRF', r.irrf], ['Avos', String(r.avos) + '/12']] },
    rescisao: { titulo: 'Rescisão trabalhista', desc: 'Cada verba com a sua própria incidência de INSS, IRRF e FGTS (matriz por rubrica). Versão inicial — confira as rubricas.', campos: [
      { k: 'competencia', l: 'Competência', t: 'month', def: mesAtual },
      { k: 'tipo', l: 'Tipo de rescisão', t: 'select', opts: Object.entries(C.TIPOS_RESC).map(([k, v]) => [k, v.nome]) },
      { k: 'dataAdmissao', l: 'Data de admissão', t: 'date' }, { k: 'dataDesligamento', l: 'Data de desligamento', t: 'date' },
      { k: 'salario', l: 'Salário (R$)', t: 'money' }, { k: 'medias', l: 'Médias de variáveis (R$)', t: 'money' },
      { k: 'avisoModo', l: 'Aviso prévio', t: 'select', opts: [['padrao', 'Conforme o tipo (indenizado quando devido)'], ['trabalhado', 'Trabalhado / cumprido'], ['nao_ha', 'Não há']] },
      { k: 'periodosVencidos', l: 'Períodos de férias vencidas', t: 'int', def: 0 }, { k: 'saldoFgts', l: 'Saldo do FGTS (R$) — para a multa', t: 'money' },
      { k: 'dependentes', l: 'Nº de dependentes', t: 'int', def: 0 }, { k: 'pensao', l: 'Pensão alimentícia (R$)', t: 'money' }, { k: 'outrosDescontos', l: 'Adiantamentos / outros descontos (R$)', t: 'money' },
      { k: 'maisVantajosa', l: 'Usar automaticamente a dedução mais vantajosa no IRRF', t: 'bool', def: true }],
      resumo: r => [['Líquido (sem FGTS)', r.liquido, 1], ['Total das verbas', r.bruto], ['INSS', r.inss], ['IRRF', r.irrf], ['FGTS da rescisão', r.fgts], ['Multa do FGTS', r.multa_fgts]] },
    plr: { titulo: 'PLR — tributação exclusiva', desc: 'Tributação exclusiva na fonte pela tabela anual própria da PLR (nunca a do salário nem o redutor mensal). Tabelas cadastradas: janeiro/2025 em diante.', campos: [
      { k: 'competencia', l: 'Competência', t: 'month', def: mesAtual }, { k: 'plrAtual', l: 'PLR atual (R$)', t: 'money' }, { k: 'plrAnterior', l: 'PLR já paga no ano (R$)', t: 'money' }, { k: 'irJaRetido', l: 'IR já retido sobre a PLR do ano (R$)', t: 'money' }, { k: 'pensaoPLR', l: 'Pensão alimentícia judicial correspondente à PLR (R$) — dedutível da base', t: 'money' }],
      resumo: r => [['IR a reter agora', r.ir, 1]] },
    pensao: { titulo: 'Pensão alimentícia', desc: 'Percentual sobre a base escolhida, ou valor fixo.', campos: [
      { k: 'modo', l: 'Base da pensão', t: 'select', def: 'bruto', opts: [['bruto', 'Rendimento bruto'], ['bruto_menos_inss', 'Bruto menos INSS'], ['liquido', 'Líquido (bruto − INSS − IRRF − outros)'], ['personalizada', 'Base personalizada (decisão judicial)'], ['fixo', 'Valor fixo']] },
      { k: 'rendimento', l: 'Rendimento bruto (R$)', t: 'money', quando: v => ['bruto', 'bruto_menos_inss', 'liquido'].includes(v.modo) },
      { k: 'inss', l: 'INSS (R$)', t: 'money', quando: v => ['bruto_menos_inss', 'liquido'].includes(v.modo) },
      { k: 'irrf', l: 'IRRF (R$)', t: 'money', quando: v => v.modo === 'liquido' },
      { k: 'outrosDescontos', l: 'Outros descontos (R$)', t: 'money', quando: v => v.modo === 'liquido' },
      { k: 'basePersonalizada', l: 'Base personalizada (R$)', t: 'money', quando: v => v.modo === 'personalizada' },
      { k: 'percentual', l: 'Percentual (%)', t: 'pct', quando: v => v.modo !== 'fixo' },
      { k: 'valorFixo', l: 'Valor fixo (R$)', t: 'money', quando: v => v.modo === 'fixo' }],
      resumo: r => [['Pensão', r.pensao, 1], ['Base', r.base == null ? '—' : r.base]] },
    mutuo: { titulo: 'Mútuo — IOF, juros e IRRF', desc: 'IOF-crédito (principal definido, parcela única) a partir de 11/06/2025: alíquota diária × dias (até 365) + 0,38%. IRRF incide sobre os juros (nunca sobre o principal), pela tabela regressiva.', campos: [
      { k: 'mutuante', l: 'Quem empresta (mutuante)', t: 'select', def: 'PF', opts: [['PF', 'Pessoa física'], ['PJ', 'Pessoa jurídica']] },
      { k: 'mutuario', l: 'Quem recebe (mutuário)', t: 'select', def: 'PJ', opts: [['PF', 'Pessoa física'], ['PJ', 'Pessoa jurídica']] },
      { k: 'mesmoGrupo', l: 'Mesmo grupo econômico', t: 'bool', def: false },
      { k: 'principal', l: 'Principal (R$)', t: 'money' }, { k: 'dataLiberacao', l: 'Data de liberação', t: 'date' }, { k: 'dataVencimento', l: 'Data de vencimento (opcional — da parcela única ou da 1ª parcela; vazio = prazo indeterminado, IOF por 365 dias)', t: 'date' }, { k: 'numParcelas', l: 'Número de parcelas (opcional — vazio = pagamento único)', t: 'int', def: '' },
      { k: 'valorJuros', l: 'Juros totais do período (R$)', t: 'money' }, { k: 'taxaJuros', l: '…ou taxa de juros do período (%) — usada se os juros acima estiverem vazios', t: 'pct' },
      { k: 'mutuarioSimples', l: 'Mutuário optante pelo Simples Nacional / MEI', t: 'bool', def: false, quando: v => v.mutuante === 'PJ' },
      { k: 'contaCorrente', l: 'Operação em conta corrente (saldo devedor diário)', t: 'bool', def: false, quando: v => v.mutuante === 'PJ' },
      { k: 'mutuarioImune', l: 'Mutuário é entidade imune/isenta (terceiro setor) — juros limitados a 100% da Selic', t: 'bool', def: false, quando: v => v.mutuante === 'PF' && v.mutuario === 'PJ' }],
      resumo: r => [['Dias', r.dias == null ? 'indeterminado (IOF: 365)' : String(r.dias)], ['Parcelas', r.parcelas > 1 ? r.parcelas + ' mensais' : 'pagamento único'], ['Juros', r.juros], ['IOF', r.iof == null ? 'não calculado' : r.iof, 1], ['IRRF sobre os juros', r.irrf_juros == null ? 'não calculado / não se aplica' : r.irrf_juros, 1], ['Selic acumulada no período', r.selic_acumulada == null ? '—' : r.selic_acumulada], ['Juros mínimos (100% da Selic)', r.juros_minimos == null ? '—' : r.juros_minimos], ['Juros máximos (Lei de Usura, PF→PJ)', r.juros_maximos == null ? '—' : r.juros_maximos]] },
    jcp: { titulo: 'JCP — Juros sobre o Capital Próprio', desc: 'TJLP pro rata dia sobre o patrimônio líquido, limite de 50%, IRRF e economia fiscal. Só calcula se a TJLP de todos os trimestres do período estiver cadastrada (4º tri/2026 ainda não).', campos: [
      { k: 'dataInicio', l: 'Início do período', t: 'date', def: () => new Date().getFullYear() + '-01-01' }, { k: 'dataFim', l: 'Fim do período', t: 'date', def: () => new Date().getFullYear() + '-06-30' },
      { k: 'dataPagamento', l: 'Data do pagamento/crédito (define o IRRF) — vazio = fim do período', t: 'date' },
      { k: 'regime', l: 'Regime da empresa', t: 'select', def: 'lucro_real', opts: [['lucro_real', 'Lucro Real (JCP dedutível)'], ['lucro_presumido', 'Lucro Presumido / outro (não dedutível)']] },
      { k: 'capitalSocial', l: 'Capital social integralizado (R$)', t: 'money' }, { k: 'reservasCapital', l: 'Reservas de capital — só as do art. 13 §2º e art. 14 p.ú. da Lei 6.404 (R$)', t: 'money' }, { k: 'reservasLucros', l: 'Reservas de lucros, exceto a de incentivo fiscal (R$)', t: 'money' },
      { k: 'lucrosAcumuladosAnteriores', l: 'Lucros acumulados de exercícios anteriores (R$)', t: 'money' }, { k: 'acoesTesouraria', l: 'Ações em tesouraria (R$) — valor positivo', t: 'money' }, { k: 'prejuizosAcumulados', l: 'Prejuízos acumulados (R$) — valor positivo', t: 'money' },
      { k: 'lucroPeriodo', l: 'Lucro do período antes da dedução dos juros (R$) — base do limite de 50%', t: 'money' },
      { k: 'lucrosReservasLimite', l: 'Lucros acumulados + reservas de lucros p/ o limite (R$) — vazio = soma dos campos acima', t: 'money' },
      { k: 'valorDeliberado', l: 'Valor deliberado a pagar (R$) — vazio = máximo dedutível', t: 'money' },
      { k: 'beneficiario', l: 'Beneficiário', t: 'select', def: 'padrao', opts: [['padrao', 'Sócio/acionista residente'], ['paraiso_fiscal', 'Residente em país com tributação favorecida']] }],
      resumo: r => [['JCP máximo dedutível', r.maxDedutivel, 1], ['IRRF a reter', r.irrf, 1], ['Líquido ao beneficiário', r.liquido], ['Valor pago/creditado', r.pago], ['JCP teórico (base × TJLP)', r.teorico], ['Limite de 50%', r.limite], ['Base (PL ajustado)', r.base], ['Economia IRPJ+CSLL (estimada)', r.economia]] },
    dist_lucros: { titulo: 'Distribuição de lucros — IRRF 10% (acima de R$ 50 mil por mês)', desc: 'Lei 15.270/2025 (art. 6º-A da Lei 9.250): a partir de 01/2026, lucros e dividendos pagos por uma mesma empresa a uma mesma pessoa física residente acima de R$ 50.000 no mês sofrem IRRF de 10% sobre o TOTAL (não só o excedente). Até R$ 50.000 no mês o sócio recebe líquido, sem retenção. Calcula a partir do valor bruto ou do líquido que o sócio precisa receber.', campos: [
      { k: 'competencia', l: 'Mês do pagamento/crédito', t: 'month', def: mesAtual },
      { k: 'beneficiario', l: 'Beneficiário', t: 'select', def: 'pf_residente', opts: [['pf_residente', 'Pessoa física residente no Brasil'], ['exterior', 'Residente/domiciliado no exterior (10% sem piso)'], ['exterior_isento', 'Governo estrangeiro (reciprocidade), fundo soberano ou entidade de previdência no exterior (isento)']] },
      { k: 'modo', l: 'Calcular a partir do…', t: 'select', def: 'bruto', opts: [['bruto', 'Valor BRUTO a distribuir'], ['liquido', 'Valor LÍQUIDO que o sócio deve receber']] },
      { k: 'valorBruto', l: 'Valor bruto a distribuir (R$)', t: 'money', quando: v => v.modo !== 'liquido' },
      { k: 'valorLiquido', l: 'Valor líquido que o sócio deve receber (R$)', t: 'money', quando: v => v.modo === 'liquido' },
      { k: 'jaPagoMes', l: 'Já pago/creditado NESTE MÊS, pela mesma empresa à mesma pessoa, antes deste pagamento (R$) — só a parte não isenta', t: 'money', quando: v => v.beneficiario === 'pf_residente' },
      { k: 'irJaRetido', l: 'IRRF já retido nesse mês sobre esses pagamentos (R$) — vazio = calcula pela regra', t: 'money', quando: v => v.beneficiario === 'pf_residente' },
      { k: 'parteIsenta', l: 'Parte DESTE pagamento que é lucro apurado até 2025, aprovado até 31/12/2025 e pago nos termos aprovados (R$) — isenta', t: 'money', quando: v => v.beneficiario !== 'exterior_isento' }],
      resumo: r => [['IRRF a reter agora', r.ir, 1], ['Líquido ao sócio', r.liquido, 1], ['Valor bruto do pagamento', r.bruto], ['Total do mês sujeito ao teste', r.totalMes == null ? '—' : r.totalMes], ['IRRF devido no mês', r.devidoMes], ['Máximo bruto SEM retenção neste mês', r.folga == null ? '—' : r.folga]] },
    comparativo: { titulo: 'COMPARATIVO — pagar uma pessoa física: qual forma pesa menos de imposto?', desc: 'Informe o valor LÍQUIDO (o que o sócio recebe) ou o BRUTO — só um dos campos. A tela calcula esse pagamento como Pró-labore, JCP, Distribuição de lucros e Mútuo (cada uma com o mesmo motor das calculadoras próprias) e ordena, do mais ao menos vantajoso tributariamente, pelos tributos líquidos totais ÷ custo líquido da empresa (impostos do sócio + encargos da empresa − economia de IRPJ/CSLL). Compara só o imposto; cada forma exige os seus requisitos legais.', campos: [
      { k: 'competencia', l: 'Mês do pagamento', t: 'month', def: mesAtual },
      { k: 'valorLiquido', l: 'Valor LÍQUIDO que o sócio recebe (R$) — o bruto de cada forma é calculado', t: 'money' },
      { k: 'valorBruto', l: 'Valor BRUTO pago/creditado (R$) — o mesmo valor em todas as formas', t: 'money' },
      { k: 'regime', l: 'Regime da empresa', t: 'select', def: 'lucro_real', opts: [['lucro_real', 'Lucro Real'], ['lucro_presumido', 'Lucro Presumido'], ['simples', 'Simples Nacional']] },
      { k: 'dependentes', l: 'Nº de dependentes do sócio (pró-labore)', t: 'int', def: 0 },
      { k: 'limiteJCP', l: 'JCP: máximo dedutível (R$) — opcional, vem da calculadora JCP', t: 'money' },
      { k: 'dataVencimentoMutuo', l: 'Mútuo: data de vencimento (opcional — vazio = prazo indeterminado, IOF por 365 dias)', t: 'date' },
      { k: 'taxaJurosMutuo', l: 'Mútuo: taxa de juros do período (%) — opcional', t: 'pct' }],
      resumo: r => [['Mais vantajosa', r.melhor, 1], ['Menos vantajosa', r.pior], [r.modo === 'liquido' ? 'Líquido ao sócio (efetivado)' : 'Valor pago (bruto)', r.valor]],
      extra: res => rankingHtml(res),
      tabela: res => ({ nome: 'Ranking', cab: ['Posição', 'Forma', 'Bruto necessário', 'Líquido ao sócio', 'Tributos retidos do sócio', 'Encargos da empresa', 'Economia IRPJ/CSLL', 'Custo líquido da empresa', 'Tributos líquidos totais', 'Carga efetiva (%)', 'Observação'], intCols: [0], pctCols: [9], linhas: res.ranking.map(o => [o.posicao, o.nome, o.bruto / 100, o.liquidoSocio / 100, o.socioTributos / 100, o.empresaEncargos / 100, o.empresaEconomia / 100, o.custoEmpresa / 100, o.tributosLiquidos / 100, o.cargaBp / 10000, o.detalhe + (o.naoRemuneracao ? ' | NÃO é remuneração: precisa ser devolvido' : '')]).concat(res.indisponiveis.map(x => ['—', x.nome, '', '', '', '', '', '', '', '', 'Fora da comparação: ' + x.motivo])) }) },
    lucro_presumido: { titulo: 'Lucro Presumido — IRPJ e CSLL', desc: 'Apuração trimestral com a majoração de 10% sobre o percentual de presunção acima de R$ 1.250.000 por trimestre (IN RFB 2.305/2025, art. 15, com ajuste do 4º trimestre pela receita acumulada do ano).', campos: [
      { k: 'ano', l: 'Ano', t: 'int', def: () => new Date().getFullYear() },
      { k: 'trimestre', l: 'Trimestre', t: 'select', def: '1', opts: [['1', '1º trimestre'], ['2', '2º trimestre'], ['3', '3º trimestre'], ['4', '4º trimestre']] },
      { k: '_atividades', t: 'atividades' },
      { k: 'ra1', l: 'Receita bruta total do 1º trimestre (R$) — para o limite proporcional e o ajuste do 4º trimestre', t: 'money', quando: v => parseInt(v.trimestre, 10) > 1 },
      { k: 'ra2', l: 'Receita bruta total do 2º trimestre (R$)', t: 'money', quando: v => parseInt(v.trimestre, 10) > 2 },
      { k: 'ra3', l: 'Receita bruta total do 3º trimestre (R$)', t: 'money', quando: v => parseInt(v.trimestre, 10) > 3 },
      { k: 'compensarSobraLimite', l: 'Considerar a sobra de limite dos trimestres anteriores (IN RFB 2.305, art. 15, § 4º — opcional)', t: 'bool', def: false, quando: v => parseInt(v.trimestre, 10) > 1 },
      { k: 'cotaPrimeiroTriCsll', l: 'CSLL 2026: a cota do 1º trimestre compõe o limite? (leitura de que a noventena não reduz o limite anual de R$ 5 mi — padrão: não)', t: 'bool', def: false, quando: v => parseInt(v.trimestre, 10) > 1 && parseInt(v.ano, 10) === 2026 },
      { k: 'dataAbertura', l: 'Data de abertura da empresa (opcional) — só importa se foi aberta no mesmo ano; trimestres antes da abertura não geram limite', t: 'date', def: '' },
      { k: 'trimestresAtividade', l: 'Trimestres em atividade no ano (início/encerramento — § 9º) — vazio = padrão', t: 'int', def: '', quando: v => parseInt(v.trimestre, 10) > 3 },
      { k: 'receitasFinanceiras', l: 'Receitas financeiras (R$) — somadas integralmente', t: 'money' }, { k: 'ganhosCapital', l: 'Ganhos de capital (R$) — somados integralmente', t: 'money' }, { k: 'outrasAdicoes', l: 'Outras adições integrais (R$)', t: 'money' },
      { k: 'irrfCompensar', l: 'IRRF a compensar (R$)', t: 'money' }, { k: 'csllRetida', l: 'CSLL retida a compensar (R$)', t: 'money' },
      { k: 'outrasAntecipacoesIrpj', l: 'Outras antecipações do IRPJ (R$)', t: 'money' }, { k: 'outrasAntecipacoesCsll', l: 'Outras antecipações da CSLL (R$)', t: 'money' }],
      resumo: r => [['IRPJ a pagar', r.irpjAPagar, 1], ['CSLL a pagar', r.csllAPagar, 1], ['Base do IRPJ', r.baseIRPJ], ['Base da CSLL', r.baseCSLL], ['IRPJ total (antes das compensações)', r.irpj], ['CSLL total (antes das compensações)', r.csll], ['Majoração do IRPJ', r.majoracaoIRPJ ? 'aplicada' : 'não se aplica'], ['Majoração da CSLL', r.majoracaoCSLL ? 'aplicada' : 'não se aplica']] },
    itcmd: { titulo: 'ITCMD — Doação e Causa mortis', desc: 'Primeiro define a UF competente (e justifica); só depois calcula com os parâmetros daquela UF e daquela data. SP já cadastrado.', campos: [
      { k: 'tipo', l: 'Fato gerador', t: 'select', def: 'doacao', opts: [['doacao', 'Doação'], ['causa_mortis', 'Causa mortis (herança/legado)']] },
      { k: 'dataFatoGerador', l: 'Data do fato gerador', t: 'date', def: hoje },
      { k: 'tipoBem', l: 'Tipo do bem', t: 'select', def: 'dinheiro', opts: [['dinheiro', 'Dinheiro / bem móvel / título'], ['imovel', 'Imóvel'], ['quotas', 'Quotas / ações societárias']] },
      { k: 'ufImovel', l: 'UF onde o imóvel está situado', t: 'select', opts: OPC_UF, quando: v => v.tipoBem === 'imovel' },
      { k: 'ufDomicilioDoador', l: 'UF do domicílio do doador', t: 'select', opts: OPC_UF.concat([['EXT', 'Exterior']]), def: 'SP', quando: v => v.tipo === 'doacao' },
      { k: 'ufDomicilioDonatario', l: 'UF do domicílio do donatário', t: 'select', opts: OPC_UF, quando: v => v.tipo === 'doacao' },
      { k: 'ufInventario', l: 'UF onde se processa o inventário', t: 'select', opts: OPC_UF, def: 'SP', quando: v => v.tipo === 'causa_mortis' },
      { k: 'valorBem', l: 'Valor do bem / direito (R$)', t: 'money', quando: v => v.tipoBem !== 'quotas' },
      { k: 'percentualTransmitido', l: '% transmitido', t: 'pct', def: '100', quando: v => v.tipoBem !== 'quotas' },
      { k: '_quotas', t: 'quotas', quando: v => v.tipoBem === 'quotas' },
      { k: 'doacoesAnteriores', l: 'Doações anteriores (mesmo doador e donatário, no ano civil) (R$)', t: 'money', quando: v => v.tipo === 'doacao' },
      { k: '_herdeiros', t: 'herdeiros', quando: v => v.tipo === 'causa_mortis' },
      { k: 'usufruto', l: 'Há usufruto ou nua-propriedade', t: 'bool', def: false }],
      resumo: r => r.herdeiros ? [['ITCMD total', r.itcmd, 1], ['UF competente', r.uf]] : [['ITCMD', r.itcmd, 1], ['Situação', r.situacao], ['UF competente', r.uf], ['Base tributável', r.base], ['Limite de isenção', r.isencao_limite]] },
  };

  // ───────────────────────────── estilo ─────────────────────────────
  function injetarCss() {
    if (document.getElementById('calcCss')) return;
    const st = document.createElement('style'); st.id = 'calcCss';
    st.textContent = `
.calc-wrap{display:grid;grid-template-columns:250px minmax(0,1fr);gap:16px;align-items:start}
@media(max-width:900px){.calc-wrap{grid-template-columns:1fr}.calc-nav{position:static;max-height:none;flex-direction:row;flex-wrap:wrap;gap:6px}.calc-item{width:auto}.calc-cat{width:100%}}
.calc-soon{display:flex;flex-direction:column;gap:6px}
.calc-nav{position:sticky;top:8px;display:flex;flex-direction:column;gap:10px;max-height:calc(100vh - 90px);overflow:auto;padding-right:2px}
.calc-cat{font-size:10px;font-weight:700;letter-spacing:.09em;color:var(--slate);margin:6px 2px 2px}
.calc-item{display:block;width:100%;text-align:left;border:1px solid var(--border);background:var(--white);border-radius:var(--r);padding:8px 10px;font:500 12.5px var(--sans);color:var(--ink);cursor:pointer}
.calc-item:hover{border-color:var(--teal)}
.calc-item.on{background:var(--teal-bg);border-color:var(--teal);color:var(--teal)}
.calc-item.soon{opacity:.55;cursor:default;border-style:dashed}
.calc-item.soon:hover{border-color:var(--border)}
.calc-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r2);padding:16px 18px;box-shadow:var(--shadow);margin-bottom:14px}
.calc-h{font:700 17px var(--sans);color:var(--ink);margin:0 0 3px}
.calc-sub{font-size:12.5px;color:var(--slate);margin-bottom:12px;max-width:80ch}
.calc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px 14px}
.calc-grid .cf{display:flex;flex-direction:column;gap:3px}
.calc-grid .cf.bool{flex-direction:row;align-items:center;gap:8px;padding-top:18px}
.calc-grid .cf.bool input{width:auto}
.calc-sfx{position:relative;display:block}.calc-sfx input{width:100%;padding-right:26px;box-sizing:border-box}.calc-sfx>span{position:absolute;right:9px;top:50%;transform:translateY(-50%);color:var(--slate);font-size:13px;pointer-events:none}
.calc-item.cmp{background:#111;color:#fff;border-color:#111;font-weight:700;letter-spacing:.06em}
html.dark-mode .calc-item.cmp{background:#fff;color:#111;border-color:#fff}
.calc-item.cmp:hover{border-color:var(--teal)}
.calc-item.cmp.on{box-shadow:0 0 0 2px var(--teal)}
.calc-rank td.n{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.calc-rank tr.rk-best td{background:var(--teal-bg)}
.calc-rank tr.rk-worst td{opacity:.9}
.calc-cal{display:grid;grid-template-columns:repeat(6,minmax(86px,1fr));gap:6px}
@media(max-width:700px){.calc-cal{grid-template-columns:repeat(3,minmax(86px,1fr))}}
.calc-mes{border:1px solid var(--border);border-radius:var(--r);padding:6px 8px;background:var(--bg);line-height:1.25}
.calc-mes small{display:block;font-size:10.5px;color:var(--slate);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.calc-mes b{display:block;font:700 14px var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}
.calc-mes i{display:block;font:normal 11.5px var(--mono);color:var(--slate)}
.calc-mes.vazio{opacity:.45}
.calc-tabgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;align-items:start}
.calc-tabcab{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.calc-sec{grid-column:1/-1;border-top:1px dashed var(--border);padding-top:10px;margin-top:2px}
.calc-sec h4{margin:0 0 6px;font:600 12px var(--sans);color:var(--ink3)}
.calc-row{display:flex;gap:8px;align-items:flex-end;margin-bottom:6px;flex-wrap:wrap}
.calc-row .fi{width:auto;flex:1;min-width:120px}
.calc-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.calc-resumo{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:12px}
.calc-kpi{border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;background:var(--bg)}
.calc-kpi.hl{background:var(--teal-bg);border-color:var(--teal)}
.calc-kpi small{display:block;font-size:10.5px;color:var(--slate);font-weight:600;letter-spacing:.03em}
.calc-kpi b{font:700 17px var(--mono);font-variant-numeric:tabular-nums;color:var(--ink)}
.calc-kpi.hl b{color:var(--teal)}
.calc-det{border-top:1px solid var(--border);padding:8px 0}
.calc-det>summary{cursor:pointer;font:600 13px var(--sans);color:var(--ink)}
.calc-mem{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px}
.calc-mem td{padding:3px 6px;border-bottom:1px solid var(--border);vertical-align:top}
.calc-mem td.v{text-align:right;font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.calc-mem tr.titulo td{background:var(--bg);font-weight:700;color:var(--ink3);padding-top:7px}
.calc-mem tr.subtotal td{font-weight:600}
.calc-mem tr.total td{font-weight:700;background:var(--teal-bg);color:var(--teal)}
.calc-mem tr.nota td{color:var(--slate);font-style:italic}
.calc-erro{background:var(--red-bg);color:var(--red);border:1px solid var(--red);border-radius:var(--r);padding:10px 12px;font-size:13px}
.calc-aviso{background:var(--amber-bg);color:#92400E;border-radius:var(--r);padding:7px 10px;font-size:12px;margin-top:6px}
.calc-tag{display:inline-block;font-size:10px;font-weight:700;border-radius:4px;padding:1px 6px;margin-left:4px}
.calc-tag.warn{background:var(--amber-bg);color:#92400E}.calc-tag.ok{background:var(--green-bg);color:var(--green)}
.calc-tbl{width:100%;border-collapse:collapse;font-size:12px}
.calc-tbl th{text-align:left;font-size:10.5px;color:var(--slate);padding:4px 6px;border-bottom:1px solid var(--border)}
.calc-tbl td{padding:5px 6px;border-bottom:1px solid var(--border);vertical-align:top}
.calc-prop{border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;margin-bottom:8px;background:var(--bg)}
.calc-prop dl{display:grid;grid-template-columns:150px 1fr;gap:3px 10px;margin:6px 0;font-size:12.5px}
.calc-prop dt{font-size:10.5px;font-weight:700;color:var(--slate);letter-spacing:.04em}
.calc-prop dd{margin:0;word-break:break-word}
.btn-calc-ia{display:inline-flex;align-items:center;gap:6px}
.calc-ta{width:100%;min-height:240px;font:12px var(--mono);border:1px solid var(--border);border-radius:var(--r);padding:8px;background:var(--white);color:var(--ink)}
`;
    document.head.appendChild(st);
  }

  // ───────────────────────────── estado ─────────────────────────────
  const est = { aba: 'calc', key: 'irrf_pf', ultimo: null, ultimoInp: null, ativ: [], herd: [], iaBusy: false };

  function carregarSets() { C.registrarSets(lerLista(LS.sets).filter(s => s.status === 'ativo')); }

  // ───────────────────────────── render principal ─────────────────────────────
  window.renderCalculadoras = function () {
    injetarCss(); carregarSets();
    const root = document.getElementById('calcRoot'); if (!root) return;
    const nav = [];
    C.CATEGORIAS.forEach(cat => {
      const impl = C.CATALOGO.filter(c => c.cat === cat);
      if (!impl.length) return;
      nav.push(`<div class="calc-cat">${E(cat)}</div>`);
      impl.forEach(c => nav.push(`<button class="calc-item ${c.key === 'comparativo' ? 'cmp' : ''} ${est.aba === 'calc' && est.key === c.key ? 'on' : ''}" onclick="calcAbrir('${c.key}')">${E(c.nome)}</button>`));
    });
    nav.push(`<details class="calc-soon"><summary class="calc-cat" style="cursor:pointer">EM BREVE (${C.EM_BREVE.length})</summary>${C.EM_BREVE.map(x => `<div class="calc-item soon" title="Arquitetura preparada; ainda sem parâmetros e testes cadastrados">${E(x[1])}</div>`).join('')}</details>`);
    nav.push('<div class="calc-cat">GERAL</div>');
    nav.push(`<button class="calc-item ${est.aba === 'bases' ? 'on' : ''}" onclick="calcAba('bases')">📚 Bases Legais e parâmetros</button>`);
    nav.push(`<button class="calc-item ${est.aba === 'hist' ? 'on' : ''}" onclick="calcAba('hist')">🗂️ Cálculos salvos</button>`);
    nav.push('<div class="calc-cat">TABELAS 2021 A 2026</div>');
    nav.push(`<button class="calc-item ${est.aba === 'tab_irrf' ? 'on' : ''}" onclick="calcAba('tab_irrf')">📊 Tabela do IRRF</button>`);
    nav.push(`<button class="calc-item ${est.aba === 'tab_inss' ? 'on' : ''}" onclick="calcAba('tab_inss')">📊 Tabela do INSS</button>`);
    nav.push(`<button class="calc-item ${est.aba === 'tab_selic' ? 'on' : ''}" onclick="calcAba('tab_selic')">📊 Taxa SELIC acumulada no período (ou 100% do CDI)</button>`);
    root.innerHTML = `<div class="calc-wrap"><div class="calc-nav">${nav.join('')}</div><div id="calcMain"></div></div>`;
    renderAbaAtual();
  };
  function renderAbaAtual() { if (est.aba === 'bases') renderBases(); else if (est.aba === 'hist') renderHistorico(); else if (est.aba === 'tab_irrf' || est.aba === 'tab_inss') renderTabela(est.aba); else if (est.aba === 'tab_selic') renderSelic(); else renderCalc(); }
  window.calcAba = function (a) { est.aba = a; window.renderCalculadoras(); };
  window.calcAbrir = function (k) { est.aba = 'calc'; est.key = k; est.ultimo = null; est.ativ = []; est.herd = []; window.renderCalculadoras(); };

  // ───────────────────────────── formulário ─────────────────────────────
  // Máscara de valor em reais enquanto digita: 100000 → 100.000 ; ao sair do campo completa os centavos → 100.000,00 (pedido do usuário 22/10/2026). O motor entende "1.234,56".
  function maskMoney(str, fim) {
    let s = String(str == null ? '' : str).replace(/[^\d,.]/g, '');
    let dec = null, int;
    const iv = s.indexOf(',');
    if (iv >= 0) { int = s.slice(0, iv).replace(/\D/g, ''); dec = s.slice(iv + 1).replace(/\D/g, '').slice(0, 2); }
    else { const m = s.match(/^(.*)\.(\d{1,2})$/); if (m && (m[1].match(/\./g) || []).length === 0) { int = m[1].replace(/\D/g, ''); dec = m[2]; } else int = s.replace(/\D/g, ''); }
    int = int.replace(/^0+(?=\d)/, '');
    if (int === '' && dec === null) return '';
    if (int === '') int = '0';
    const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (fim) return milhar + ',' + String(dec == null ? '' : dec).padEnd(2, '0');
    return milhar + (dec === null ? '' : ',' + dec);
  }
  window.calcMaskMoney = function (el) {
    const antes = el.value, pos = el.selectionStart == null ? antes.length : el.selectionStart;
    const sig = antes.slice(0, pos).replace(/[^\d,]/g, '').length; // dígitos+vírgula antes do cursor
    const novo = maskMoney(antes, false); if (novo === antes) return; el.value = novo;
    let cnt = 0, p = 0; while (p < novo.length && cnt < sig) { if (/[\d,]/.test(novo[p])) cnt++; p++; }
    try { el.setSelectionRange(p, p); } catch (e) { }
  };
  window.calcFmtMoney = function (el) { el.value = maskMoney(el.value, true); };
  const MASK = 'data-m="money" oninput="calcMaskMoney(this)" onblur="calcFmtMoney(this)"';
  const sfx = (inp, s) => `<span class="calc-sfx">${inp}<span>${s}</span></span>`;
  function campoHtml(c) {
    const id = 'cf_' + c.k; const def = typeof c.def === 'function' ? c.def() : (c.def === undefined ? '' : c.def);
    if (c.t === 'atividades') return '<div class="calc-sec" id="calcAtivBox"></div>';
    if (c.t === 'quotas') return `<div class="calc-sec" id="calcQuotasBox"><h4>Avaliação da participação societária (informe os componentes — o sistema não estima o valor da empresa)</h4><div class="calc-grid">${[
      ['q_patrimonioLiquido', 'Patrimônio líquido contábil (R$)'], ['q_ajusteAtivos', 'Ajustes de ativos a valor de mercado (R$)'], ['q_ajustePassivos', 'Ajustes de passivos (R$)'], ['q_goodwill', 'Fundo de comércio / goodwill (R$)'], ['q_outraMetodologia', 'OU valor da empresa por outra metodologia (R$)'], ['q_percentualParticipacao', '% de participação transmitida']
    ].map(([k, l]) => `<div class="cf"><label class="fl">${l}</label>${k === 'q_percentualParticipacao' ? sfx(`<input class="fi" id="cf_${k}" inputmode="decimal" value="100">`, '%') : `<input class="fi" id="cf_${k}" inputmode="decimal" placeholder="0,00" ${MASK}>`}</div>`).join('')}</div></div>`;
    if (c.t === 'herdeiros') return '<div class="calc-sec" id="calcHerdBox"></div>';
    let inp;
    if (c.t === 'bool') return `<div class="cf bool" data-k="${c.k}"><input type="checkbox" id="${id}" ${def ? 'checked' : ''} onchange="calcRefreshQuando()"><label class="fl" for="${id}">${E(c.l)}</label></div>`;
    if (c.t === 'select') inp = `<select class="fi" id="${id}" onchange="calcRefreshQuando()">${c.opts.map(([v, l]) => `<option value="${E(v)}" ${String(def) === String(v) ? 'selected' : ''}>${E(l)}</option>`).join('')}</select>`;
    else if (c.t === 'month') inp = `<input class="fi" type="month" id="${id}" value="${E(def)}">`;
    else if (c.t === 'date') inp = `<input class="fi" type="date" id="${id}" value="${E(def)}">`;
    else if (c.t === 'int') inp = `<input class="fi" id="${id}" inputmode="numeric" value="${E(def)}">`;
    else if (c.t === 'money') inp = `<input class="fi" id="${id}" inputmode="decimal" value="${E(def)}" placeholder="0,00" ${MASK}>`;
    else if (c.t === 'pct') inp = sfx(`<input class="fi" id="${id}" inputmode="decimal" value="${E(def)}" placeholder="0">`, '%');
    else inp = `<input class="fi" id="${id}" inputmode="decimal" value="${E(def)}">`;
    return `<div class="cf" data-k="${c.k}"><label class="fl" for="${id}">${E(c.l)}</label>${inp}</div>`;
  }
  // Empresa do cálculo (opcional): uma empresa cadastrada no site (lista), uma empresa avulsa digitada, ou vazio.
  function empresaRotulo(e) { return '#' + e.eid + ' - ' + e.nome; }
  function empresaCampoHtml() {
    if (est.empresa === undefined) { const g = (typeof _empresaGlobal !== 'undefined' && _empresaGlobal) ? S.emps().find(e => String(e.eid) === String(_empresaGlobal)) : null; est.empresa = g ? empresaRotulo(g) : ''; }
    const emps = (S.emps() || []).slice().sort((a, b) => Number(a.eid) - Number(b.eid));
    return `<div class="calc-grid" style="margin-bottom:8px"><div class="fg" style="grid-column:1/-1"><label class="fl">Empresa (opcional) — escolha uma cadastrada no site ou digite outra; pode ficar vazio</label>
      <input id="calcEmpresa" class="fi" list="calcEmpresaLista" autocomplete="off" placeholder="Buscar empresa cadastrada ou digitar um nome avulso…" value="${E(est.empresa)}" oninput="calcEmpresaSet(this.value)"><datalist id="calcEmpresaLista">${emps.map(e => `<option value="${E(empresaRotulo(e))}"></option>`).join('')}</datalist></div></div>`;
  }
  window.calcEmpresaSet = function (v) { est.empresa = v; };
  function empresaAtual() {
    const t = String(est.empresa || '').trim(); if (!t) return null;
    const e = (S.emps() || []).find(x => empresaRotulo(x) === t);
    return e ? { eid: String(e.eid), nome: e.nome } : { eid: '', nome: t };
  }
  function renderCalc() {
    const f = F[est.key]; const main = document.getElementById('calcMain');
    main.innerHTML = `<div class="calc-card"><h2 class="calc-h">${E(f.titulo)}</h2><div class="calc-sub">${E(f.desc)}</div>
      ${empresaCampoHtml()}<div class="calc-grid" id="calcForm">${f.campos.map(campoHtml).join('')}</div>
      <div class="calc-acts"><button class="btn bp" onclick="calcCalcular()">Calcular</button><button class="btn bo" onclick="calcLimpar()">Limpar</button><button class="btn bo" onclick="calcImprimir()">🖨️ Imprimir / PDF</button><button class="btn bo" onclick="calcExcel()">📊 Excel</button></div></div>
      <div id="calcResultado"></div>`;
    if (f.campos.some(c => c.t === 'atividades')) { if (!est.ativ.length) est.ativ = [{ tipo: 'comercio', receita: '' }]; renderAtiv(); }
    if (f.campos.some(c => c.t === 'herdeiros')) { if (!est.herd.length) est.herd = [{ nome: '', quinhao: '' }]; renderHerd(); }
    calcRefreshQuando();
    if (est.ultimo) mostrarResultado(est.ultimo, est.ultimoInp);
  }
  window.calcRefreshQuando = function () {
    const f = F[est.key]; if (!f) return; const v = valores(true);
    f.campos.forEach(c => { if (!c.quando) return; const show = !!c.quando(v);
      const el = c.t === 'quotas' ? document.getElementById('calcQuotasBox') : c.t === 'herdeiros' ? document.getElementById('calcHerdBox') : document.querySelector('#calcForm [data-k="' + c.k + '"]');
      if (el) el.style.display = show ? '' : 'none'; });
  };
  function valores(bruto) {
    const f = F[est.key], v = {};
    f.campos.forEach(c => { if (c.t.startsWith('_') || ['atividades', 'quotas', 'herdeiros'].includes(c.t)) return; const el = document.getElementById('cf_' + c.k); if (!el) return; v[c.k] = c.t === 'bool' ? el.checked : el.value; });
    return v;
  }
  function renderAtiv() {
    const box = document.getElementById('calcAtivBox'); if (!box) return;
    const set = C.acharSet('lucro_presumido', (document.getElementById('cf_ano')?.value || new Date().getFullYear()) + '-12-31');
    const ativ = set ? set.params.atividades.value : { comercio: { nome: 'Comércio' }, servicos: { nome: 'Serviços' } };
    const opts = Object.entries(ativ).map(([k, a]) => [k, a.nome]).concat([['outra', 'Outra (informar percentuais)']]);
    box.innerHTML = '<h4>Receita bruta do trimestre por atividade</h4>' + est.ativ.map((a, i) => `<div class="calc-row">
      <div style="flex:2;min-width:180px"><label class="fl">Atividade</label><select class="fi" style="width:100%" onchange="calcAtivSet(${i},'tipo',this.value)">${opts.map(([k, n]) => `<option value="${k}" ${a.tipo === k ? 'selected' : ''}>${E(n)}</option>`).join('')}</select></div>
      <div><label class="fl">Receita bruta (R$)</label><input class="fi" inputmode="decimal" value="${E(a.receita)}" oninput="calcMaskMoney(this);calcAtivSet(${i},'receita',this.value,1)" onblur="calcFmtMoney(this);calcAtivSet(${i},'receita',this.value,1)" placeholder="0,00"></div>
      ${a.tipo === 'outra' ? `<div><label class="fl">Presunção IRPJ</label>${sfx(`<input class="fi" value="${E(a.irpj || '')}" oninput="calcAtivSet(${i},'irpj',this.value,1)">`, '%')}</div><div><label class="fl">Presunção CSLL</label>${sfx(`<input class="fi" value="${E(a.csll || '')}" oninput="calcAtivSet(${i},'csll',this.value,1)">`, '%')}</div><div><label class="fl">Nome</label><input class="fi" value="${E(a.nome || '')}" oninput="calcAtivSet(${i},'nome',this.value,1)"></div>` : ''}
      ${est.ativ.length > 1 ? `<button class="btn bo bsm" onclick="calcAtivDel(${i})">remover</button>` : ''}</div>`).join('') + '<button class="btn bo bsm" onclick="calcAtivAdd()">+ atividade</button>';
  }
  window.calcAtivSet = (i, k, v, semRender) => { est.ativ[i][k] = v; if (!semRender) renderAtiv(); };
  window.calcAtivAdd = () => { est.ativ.push({ tipo: 'servicos', receita: '' }); renderAtiv(); };
  window.calcAtivDel = i => { est.ativ.splice(i, 1); renderAtiv(); };
  function renderHerd() {
    const box = document.getElementById('calcHerdBox'); if (!box) return;
    box.innerHTML = '<h4>Herdeiros / legatários — cada quinhão é calculado individualmente (deixe em branco para dividir igualmente)</h4>' + est.herd.map((h, i) => `<div class="calc-row">
      <div style="flex:2"><label class="fl">Nome</label><input class="fi" value="${E(h.nome)}" oninput="calcHerdSet(${i},'nome',this.value)"></div>
      <div><label class="fl">Quinhão (R$)</label><input class="fi" inputmode="decimal" value="${E(h.quinhao)}" placeholder="0,00" oninput="calcMaskMoney(this);calcHerdSet(${i},'quinhao',this.value)" onblur="calcFmtMoney(this);calcHerdSet(${i},'quinhao',this.value)"></div>
      ${est.herd.length > 1 ? `<button class="btn bo bsm" onclick="calcHerdDel(${i})">remover</button>` : ''}</div>`).join('') + '<button class="btn bo bsm" onclick="calcHerdAdd()">+ herdeiro</button>';
  }
  window.calcHerdSet = (i, k, v) => { est.herd[i][k] = v; };
  window.calcHerdAdd = () => { est.herd.push({ nome: '', quinhao: '' }); renderHerd(); };
  window.calcHerdDel = i => { est.herd.splice(i, 1); renderHerd(); };
  window.calcLimpar = function () { est.ultimo = null; est.ativ = []; est.herd = []; renderCalc(); };

  // ───────────────────────────── calcular ─────────────────────────────
  window.calcCalcular = function () {
    const f = F[est.key]; const v = valores();
    if (est.key === 'lucro_presumido') { v.atividades = est.ativ.map(a => ({ tipo: a.tipo, receita: a.receita, irpj: a.irpj, csll: a.csll, nome: a.nome }));
      v.receitasAnteriores = [v.ra1, v.ra2, v.ra3]; }
    if (est.key === 'itcmd') {
      v.quotas = { patrimonioLiquido: g('q_patrimonioLiquido'), ajusteAtivos: g('q_ajusteAtivos'), ajustePassivos: g('q_ajustePassivos'), goodwill: g('q_goodwill'), outraMetodologia: g('q_outraMetodologia'), percentualParticipacao: g('q_percentualParticipacao') || '100' };
      v.herdeiros = est.herd.map(h => ({ nome: h.nome, quinhao: h.quinhao })).filter(h => h.nome || h.quinhao);
      if (v.herdeiros.length && v.herdeiros.some(h => !h.quinhao)) v.herdeiros = []; // sem quinhões completos → divisão igual
      v.numHerdeiros = est.herd.length;
    }
    if (est.key === 'rescisao') { /* avisoModo 'padrao' = conforme o tipo */ if (v.avisoModo === 'padrao') v.avisoModo = ''; }
    const r = C.calcular(est.key, v); est.ultimo = r; est.ultimoInp = v; mostrarResultado(r, v);
  };
  function g(id) { return (document.getElementById('cf_' + id) || {}).value || ''; }
  const brl = n => 'R$ ' + C.brl(n);
  function fmtV(x) { return typeof x === 'number' ? brl(x) : E(x); }
  function memHtml(mem) {
    return '<table class="calc-mem"><tbody>' + mem.map(l => {
      if (l.k === 'titulo') return `<tr class="titulo"><td colspan="2">${E(l.r)}</td></tr>`;
      if (l.k === 'nota') return `<tr class="nota"><td colspan="2">${E(l.r)}</td></tr>`;
      if (l.k === 'texto') return `<tr><td>${E(l.r)}</td><td class="v">${E(l.v)}</td></tr>`;
      if (l.k === 'inteiro') return `<tr><td>${E(l.r)}</td><td class="v">${E(l.v)}</td></tr>`;
      return `<tr class="${l.k}"><td>${E(l.r)}${l.nota ? ` <small style="color:var(--slate)">(${E(l.nota)})</small>` : ''}</td><td class="v">${(l.op === '−' ? '− ' : l.op === '+' ? '+ ' : l.op === '×' ? '' : '') + brl(l.v)}</td></tr>`;
    }).join('') + '</tbody></table>';
  }
  function paramsHtml(ps) {
    if (!ps || !ps.length) return '<div style="font-size:12.5px;color:var(--slate)">Esta calculadora não depende de parâmetros versionados.</div>';
    return '<table class="calc-tbl"><thead><tr><th>Conjunto</th><th>Calculadora</th><th>Versão</th><th>Vigência</th></tr></thead><tbody>' + ps.map(p => `<tr><td>${E(p.id)}${p.uf ? ' (' + p.uf + ')' : ''}</td><td>${E(p.calculator_key)}</td><td>v${p.version}</td><td>${E(p.valid_from)} → ${E(p.valid_to || 'em vigor')}</td></tr>`).join('') + '</tbody></table>';
  }
  function basesHtml(bs) {
    if (!bs || !bs.length) return '<div style="font-size:12.5px;color:var(--slate)">Sem bases legais associadas.</div>';
    const ver = (S.g(LS.verif) && typeof S.g(LS.verif) === 'object') ? S.g(LS.verif) : {};
    return '<div style="overflow-x:auto"><table class="calc-tbl"><thead><tr><th>Norma</th><th>Nº</th><th>Artigo</th><th>Assunto</th><th>Vigência</th><th>Fonte oficial</th><th>Última verificação</th><th>Observação</th></tr></thead><tbody>' + bs.map(b => {
      const vv = ver[b.id] || null; const uv = vv ? vv.data + ' (' + E(vv.por || '') + ')' : (b.ultima_verificacao || '<span class="calc-tag warn">não conferida na fonte</span>');
      return `<tr><td>${E(b.norma)}</td><td>${E(b.numero)}</td><td>${E(b.artigo)}</td><td>${E(b.assunto)}</td><td>${E(b.vig_ini || '—')} → ${E(b.vig_fim || 'em vigor')}</td><td><a href="${E(b.fonte)}" target="_blank" rel="noopener">${E(b.fonte.replace(/^https?:\/\//, ''))}</a></td><td>${uv}</td><td>${E(b.obs || '')}</td></tr>`;
    }).join('') + '</tbody></table></div>';
  }
  function mostrarResultado(r, inp) {
    const el = document.getElementById('calcResultado'); if (!el) return; const f = F[est.key];
    if (!r.ok) { el.innerHTML = `<div class="calc-card"><div class="calc-erro"><b>${E(r.erro)}</b>${r.detalhe ? '<div style="margin-top:4px;font-size:12px">' + E(r.detalhe) + '</div>' : ''}</div>${r.erro === C.ERRO_PARAM ? '<div style="font-size:12px;color:var(--slate);margin-top:8px">Cadastre ou aprove o conjunto de parâmetros da competência em <a href="#" onclick="calcAba(\'bases\');return false">Bases Legais e parâmetros</a>. Nenhum valor foi calculado.</div>' : ''}</div>`; return; }
    const kp = f.resumo(r.resultado).map(([l, v, hl]) => `<div class="calc-kpi ${hl ? 'hl' : ''}"><small>${E(l).toUpperCase()}</small><b>${fmtV(v)}</b></div>`).join('');
    el.innerHTML = `<div class="calc-card"><h3 class="calc-h" style="font-size:15px">Resultado</h3><div class="calc-resumo">${kp}</div>
      ${f.extra ? f.extra(r.resultado) : ''}
      ${(r.avisos || []).map(a => `<div class="calc-aviso">⚠️ ${E(a)}</div>`).join('')}
      <details class="calc-det" open><summary>Memória de cálculo</summary>${memHtml(r.memoria)}</details>
      <details class="calc-det"><summary>Parâmetros utilizados</summary>${paramsHtml(r.parametros)}</details>
      <details class="calc-det"><summary>📚 Bases Legais</summary>${basesHtml(r.bases)}</details>
      <details class="calc-det"><summary>Observações</summary><div style="font-size:12.5px;color:var(--ink3);padding-top:6px">Cálculo determinístico: nenhuma IA participa. Os parâmetros são os da competência informada (conjunto e versão acima), e uma mudança futura de lei não altera cálculos já salvos. Valores em reais, arredondados uma única vez (meio para cima) ao final de cada tributo.</div></details>
      <div class="calc-acts"><button class="btn bp" onclick="calcSalvar()">💾 Salvar cálculo</button><button class="btn bo" onclick="calcImprimir()">🖨️ Imprimir / PDF</button><button class="btn bo" onclick="calcExcel()">📊 Excel</button></div></div>`;
  }
  // ranking do COMPARATIVO (tela e impressão)
  function rankingHtml(res) {
    const pc = bp => (bp / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; const n = res.ranking.length;
    return `<div class="calc-rank" style="margin:6px 0 12px"><h3 class="calc-h" style="font-size:15px">Do mais vantajoso ao menos vantajoso (tributariamente)</h3><div style="overflow-x:auto"><table class="calc-tbl"><thead><tr><th>#</th><th>Forma de pagamento</th><th>Bruto necessário</th><th>Líquido ao sócio</th><th>Tributos do sócio</th><th>Encargos da empresa</th><th>Economia IRPJ/CSLL</th><th>Custo líquido da empresa</th><th>Tributos líquidos</th><th>Carga efetiva</th></tr></thead><tbody>${res.ranking.map((o, i) => `<tr class="${i === 0 ? 'rk-best' : (i === n - 1 && n > 1 ? 'rk-worst' : '')}"><td><b>${o.posicao}º</b></td><td><b>${E(o.nome)}</b>${i === 0 ? ' <span class="calc-tag ok">mais vantajosa</span>' : ''}${i === n - 1 && n > 1 ? ' <span class="calc-tag warn">menos vantajosa</span>' : ''}${o.naoRemuneracao ? ' <span class="calc-tag warn">não é remuneração: tem que devolver</span>' : ''}<div style="font-size:11px;color:#667">${E(o.detalhe)}</div></td><td class="n">${brl(o.bruto)}</td><td class="n">${brl(o.liquidoSocio)}</td><td class="n">${brl(o.socioTributos)}</td><td class="n">${brl(o.empresaEncargos)}</td><td class="n">${brl(o.empresaEconomia)}</td><td class="n">${brl(o.custoEmpresa)}</td><td class="n">${brl(o.tributosLiquidos)}</td><td class="n"><b>${pc(o.cargaBp)}</b></td></tr>`).join('')}</tbody></table></div>${res.indisponiveis.length ? '<div class="calc-aviso">Fora da comparação: ' + res.indisponiveis.map(x => '<b>' + E(x.nome) + '</b> — ' + E(x.motivo)).join(' · ') + '</div>' : ''}<div style="font-size:11.5px;color:#667">Carga efetiva = tributos líquidos ÷ custo líquido da empresa. Negativa = a economia de IRPJ/CSLL da empresa supera o imposto do sócio.</div></div>`;
  }

  // ───────────────────────────── salvar / imprimir ─────────────────────────────
  window.calcSalvar = function () {
    const r = est.ultimo; if (!r || !r.ok) return;
    const lista = lerLista(LS.hist); const quem = (currentUser && (currentUser.nome || currentUser.login)) || '';
    lista.unshift({ id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: new Date().toISOString(), por: quem, empresa: empresaAtual(), calc: est.key, titulo: F[est.key].titulo, entrada: est.ultimoInp, resultado: r.resultado, memoria: r.memoria, parametros: r.parametros, bases: (r.bases || []).map(b => b.id), avisos: r.avisos || [], oculto: false });
    S.s(LS.hist, lista.slice(0, 400)); toast('Cálculo salvo com a versão dos parâmetros usada.', 'ok');
  };
  function resumoHtml(f, r) {
    if (!f || !r.resultado) return '';
    return '<table class="calc-tbl"><tbody>' + f.resumo(r.resultado).map(([l, v]) => `<tr><td>${E(l)}</td><td class="v"><b>${fmtV(v)}</b></td></tr>`).join('') + '</tbody></table>' + (f.extra ? f.extra(r.resultado) : '');
  }
  function empresaTxt(o) { return o ? ((o.eid ? '#' + o.eid + ' - ' : '') + o.nome) : ''; }
  function htmlImpressao(titulo, r, entrada, quando, f, empresa) {
    return `<!doctype html><meta charset="utf-8"><title>${E(titulo)}</title><style>body{font:13px Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px}h3{font-size:14px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:3px 6px;text-align:left;vertical-align:top;font-size:12px}td.v,td.n{text-align:right;font-family:monospace;white-space:nowrap}tr.titulo td{background:#eee;font-weight:bold}tr.total td{font-weight:bold;background:#e3f3f0}tr.rk-best td{background:#e3f3f0}small{color:#666}.calc-tag{border:1px solid #999;border-radius:3px;padding:0 4px;font-size:10px}.calc-aviso{margin:6px 0}</style>
      <h1>${E(titulo)}</h1>${empresa ? '<p><b>Empresa:</b> ' + E(empresaTxt(empresa)) + '</p>' : ''}<p><small>Calculadoras JJR — ${E(quando)} — cálculo determinístico, sem IA</small></p>${resumoHtml(f, r)}<h3>Memória de cálculo</h3>${memHtml(r.memoria)}<h3>Parâmetros utilizados</h3>${paramsHtml(r.parametros)}<h3>Bases legais</h3>${basesHtml(r.bases)}${(r.avisos || []).map(a => '<p>⚠️ ' + E(a) + '</p>').join('')}`;
  }
  function abrirImpressao(html) { const w = window.open('', '_blank'); if (!w) { toast('Libere pop-ups para imprimir.', 'err'); return; } w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
  window.calcImprimir = function () { if (!est.ultimo) calcCalcular(); const r = est.ultimo; if (!r || !r.ok) { toast('Preencha os dados e corrija o erro indicado para poder imprimir.', 'err'); return; } abrirImpressao(htmlImpressao(F[est.key].titulo, r, est.ultimoInp, new Date().toLocaleString('pt-BR'), F[est.key], empresaAtual())); };

  // ───── Excel (todas as calculadoras, o cálculo salvo e as tabelas) — SheetJS (XLSX) já carregado no site ─────
  const numR = v => typeof v === 'number' ? v / 100 : v;               // centavos → reais
  const semTags = t => String(t == null ? '' : t).replace(/<[^>]+>/g, '');
  function xlsxSheet(aoa, o) {
    o = o || {}; const ws = XLSX.utils.aoa_to_sheet(aoa); const ref = ws['!ref']; if (!ref) return ws; const rg = XLSX.utils.decode_range(ref);
    const larg = []; for (let c = rg.s.c; c <= rg.e.c; c++) larg[c] = 8;
    for (let R = rg.s.r; R <= rg.e.r; R++) for (let c = rg.s.c; c <= rg.e.c; c++) { const cell = ws[XLSX.utils.encode_cell({ r: R, c })]; if (!cell) continue;
      if (cell.t === 'n') { cell.z = (o.pctCols || []).includes(c) ? '0.00%' : ((o.intCols || []).includes(c) ? '0' : '#,##0.00'); larg[c] = Math.max(larg[c], 14); }
      else larg[c] = Math.max(larg[c], Math.min(70, String(cell.v == null ? '' : cell.v).length + 2)); }
    ws['!cols'] = larg.map(w => ({ wch: w })); return ws;
  }
  function nomeArquivo(t) { return String(t).split(/[:?]/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) + '_' + hoje(); }
  function baixarXlsx(wb, titulo) { try { XLSX.writeFile(wb, nomeArquivo(titulo) + '.xlsx'); toast('Excel gerado.', 'ok'); } catch (e) { toast('Não foi possível gerar o Excel: ' + (e.message || e), 'err'); } }
  function addSheet(wb, nome, aoa, o) { XLSX.utils.book_append_sheet(wb, xlsxSheet(aoa, o), nome.slice(0, 31)); }
  function memAoa(mem) {
    const a = [['Descrição', 'Valor (R$)', 'Operação / nota']];
    (mem || []).forEach(l => { if (l.k === 'titulo') a.push([l.r]); else if (l.k === 'nota') a.push([l.r]); else if (l.k === 'texto' || l.k === 'inteiro') a.push([l.r, l.v]); else a.push([l.r, numR(l.v), (l.op || '') + (l.nota ? ' ' + l.nota : '') + (l.k === 'subtotal' ? ' (subtotal)' : l.k === 'total' ? ' (TOTAL)' : '')]); });
    return a;
  }
  function montarWorkbook(titulo, f, r, entrada, quando, empresa) {
    const wb = XLSX.utils.book_new(); const ver = (S.g(LS.verif) && typeof S.g(LS.verif) === 'object') ? S.g(LS.verif) : {};
    const res = [[titulo]].concat(empresa ? [['Empresa', empresaTxt(empresa)]] : [], [['Gerado em', quando], ['Cálculo determinístico, sem IA'], [], ['Resumo', 'Valor']]);
    if (f && r.resultado) f.resumo(r.resultado).forEach(([l, v]) => res.push([l, numR(v)]));
    addSheet(wb, 'Resumo', res);
    if (f && f.tabela && r.resultado) { const t = f.tabela(r.resultado); addSheet(wb, t.nome, [t.cab].concat(t.linhas), t); }
    if (f && entrada) { const en = [['Dado informado', 'Valor']]; f.campos.forEach(c => { if (c.l && entrada[c.k] !== undefined && entrada[c.k] !== '') en.push([c.l, typeof entrada[c.k] === 'boolean' ? (entrada[c.k] ? 'Sim' : 'Não') : entrada[c.k]]); }); addSheet(wb, 'Dados informados', en); }
    addSheet(wb, 'Memória de cálculo', memAoa(r.memoria));
    addSheet(wb, 'Parâmetros', [['Conjunto', 'Calculadora', 'Versão', 'Vigência']].concat((r.parametros || []).map(p => [p.id + (p.uf ? ' (' + p.uf + ')' : ''), p.calculator_key, 'v' + p.version, p.valid_from + ' → ' + (p.valid_to || 'em vigor')])));
    addSheet(wb, 'Bases legais', [['Norma', 'Nº', 'Artigo', 'Assunto', 'Vigência', 'Fonte oficial', 'Última verificação', 'Observação']].concat((r.bases || []).map(b => { const vv = ver[b.id]; return [b.norma, b.numero, b.artigo, b.assunto, (b.vig_ini || '—') + ' → ' + (b.vig_fim || 'em vigor'), b.fonte, vv ? vv.data + ' (' + (vv.por || '') + ')' : (b.ultima_verificacao || 'não conferida na fonte'), b.obs || '']; })));
    if ((r.avisos || []).length) addSheet(wb, 'Avisos', [['Avisos']].concat(r.avisos.map(a => [a])));
    return wb;
  }
  window.calcExcel = function () { if (!est.ultimo) calcCalcular(); const r = est.ultimo; if (!r || !r.ok) { toast('Preencha os dados e corrija o erro indicado para gerar o Excel.', 'err'); return; } baixarXlsx(montarWorkbook(F[est.key].titulo, F[est.key], r, est.ultimoInp, new Date().toLocaleString('pt-BR'), empresaAtual()), F[est.key].titulo); };
  function dadosHist(id) { const h = lerLista(LS.hist).find(x => x.id === id); if (!h) return null; return { h, f: F[h.calc], r: { ok: true, resultado: h.resultado, memoria: h.memoria, parametros: h.parametros, bases: (h.bases || []).map(b => C.CALC_BASES.find(x => x.id === b)).filter(Boolean), avisos: h.avisos || [] } }; }
  window.calcHistImprimir = function (id) { const d = dadosHist(id); if (!d) return; abrirImpressao(htmlImpressao(d.h.titulo, d.r, d.h.entrada, new Date(d.h.ts).toLocaleString('pt-BR'), d.f, d.h.empresa)); };
  window.calcHistExcel = function (id) { const d = dadosHist(id); if (!d) return; baixarXlsx(montarWorkbook(d.h.titulo, d.f, d.r, d.h.entrada, new Date(d.h.ts).toLocaleString('pt-BR'), d.h.empresa), d.h.titulo); };

  // ───────────────────────────── histórico ─────────────────────────────
  function renderHistorico() {
    const main = document.getElementById('calcMain'); const lista = lerLista(LS.hist).filter(h => !h.oculto);
    main.innerHTML = `<div class="calc-card"><h2 class="calc-h">🗂️ Cálculos salvos</h2><div class="calc-sub">Cada cálculo guarda a entrada, o resultado, a memória e a versão dos parâmetros usada. Reabrir mostra exatamente o que foi calculado na época — não recalcula.</div>
      ${lista.length ? `<div style="overflow-x:auto"><table class="calc-tbl"><thead><tr><th>Data</th><th>Empresa</th><th>Calculadora</th><th>Por</th><th>Parâmetros</th><th></th></tr></thead><tbody>${lista.map(h => `<tr><td>${E(new Date(h.ts).toLocaleString('pt-BR'))}</td><td>${h.empresa ? E((h.empresa.eid ? '#' + h.empresa.eid + ' - ' : '') + h.empresa.nome) : '—'}</td><td>${E(h.titulo)}</td><td>${E(h.por)}</td><td>${(h.parametros || []).map(p => E(p.id) + ' v' + p.version).join(', ') || '—'}</td><td style="white-space:nowrap"><button class="btn bo bsm" onclick="calcHistAbrir('${h.id}')">abrir</button> <button class="btn bo bsm" onclick="calcHistOcultar('${h.id}')">ocultar</button> <button class="btn bo bsm" style="color:#dc2626;border-color:#dc2626" onclick="calcHistExcluir('${h.id}')">excluir</button></td></tr>`).join('')}</tbody></table></div>` : '<div style="color:var(--slate);font-size:13px">Nenhum cálculo salvo ainda.</div>'}</div><div id="calcHistVer"></div>`;
  }
  window.calcHistAbrir = function (id) {
    const h = lerLista(LS.hist).find(x => x.id === id); if (!h) return;
    const bs = (h.bases || []).map(b => C.CALC_BASES.find(x => x.id === b)).filter(Boolean);
    document.getElementById('calcHistVer').innerHTML = `<div class="calc-card"><h3 class="calc-h" style="font-size:15px">${E(h.titulo)} — ${E(new Date(h.ts).toLocaleString('pt-BR'))}</h3><div class="calc-sub">${h.empresa ? 'Empresa: <b>' + E((h.empresa.eid ? '#' + h.empresa.eid + ' - ' : '') + h.empresa.nome) + '</b> · ' : ''}Cálculo salvo por ${E(h.por)}. Não é recalculado.</div><div class="calc-acts" style="margin:0 0 8px"><button class="btn bo bsm" onclick="calcHistImprimir('${h.id}')">🖨️ Imprimir / PDF</button><button class="btn bo bsm" onclick="calcHistExcel('${h.id}')">📊 Excel</button></div>${F[h.calc] && F[h.calc].extra && h.resultado && h.resultado.ranking ? F[h.calc].extra(h.resultado) : ''}${memHtml(h.memoria)}<details class="calc-det"><summary>Parâmetros utilizados</summary>${paramsHtml(h.parametros)}</details><details class="calc-det"><summary>📚 Bases Legais</summary>${basesHtml(bs)}</details>${(h.avisos || []).map(a => `<div class="calc-aviso">⚠️ ${E(a)}</div>`).join('')}</div>`;
    document.getElementById('calcHistVer').scrollIntoView({ behavior: 'smooth' });
  };
  window.calcHistExcluir = function (id) {
    const l = lerLista(LS.hist); const h = l.find(x => x.id === id); if (!h) return;
    if (!confirm('Excluir este cálculo salvo (' + h.titulo + ', ' + new Date(h.ts).toLocaleString('pt-BR') + ')? Isso apaga a entrada, o resultado e a memória guardados e não dá para desfazer. Para só tirar da lista, use "ocultar".')) return;
    S.s(LS.hist, l.filter(x => x.id !== id)); renderHistorico(); toast('Cálculo excluído.', 'ok');
  };
  window.calcHistOcultar = function (id) { const l = lerLista(LS.hist); const h = l.find(x => x.id === id); if (!h) return; h.oculto = true; S.s(LS.hist, l); renderHistorico(); toast('Cálculo ocultado da lista (continua guardado).', 'ok'); };

  // ───────────────────────────── bases legais, parâmetros e IA ─────────────────────────────
  function valorTxt(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
  function renderBases() {
    const main = document.getElementById('calcMain'); const adm = ehAdmin();
    const sets = C.todosSets(); const props = lerLista(LS.prop).filter(p => p.status === 'pendente'); const ver = (S.g(LS.verif) && typeof S.g(LS.verif) === 'object') ? S.g(LS.verif) : {};
    main.innerHTML = `<div class="calc-card"><h2 class="calc-h">📚 Bases Legais e parâmetros</h2><div class="calc-sub">Os parâmetros legais ficam em conjuntos versionados por vigência; a competência do cálculo escolhe o conjunto, sem retroatividade. A IA só entra aqui, no botão abaixo — ela <b>propõe</b>, nunca altera. Uma proposta só vira parâmetro depois de aprovada por um administrador, e vira uma NOVA versão.</div>
      <div class="calc-acts" style="margin-top:0"><button class="btn btn-ia-gemini btn-calc-ia" id="calcBtnIa" onclick="calcPesquisarIA()" ${est.iaBusy ? 'disabled' : ''}>🤖 Pesquisar atualizações</button>${adm ? '<button class="btn bo" onclick="calcCadastrar()">+ Cadastrar parâmetros</button>' : ''}</div><div id="calcIaMsg" style="font-size:12.5px;margin-top:8px;color:var(--slate)"></div></div>
      ${props.length ? `<div class="calc-card"><h3 class="calc-h" style="font-size:15px">Propostas da IA aguardando decisão</h3>${props.map(propHtml).join('')}</div>` : ''}
      <div id="calcCadBox"></div>
      <div class="calc-card"><h3 class="calc-h" style="font-size:15px">Conjuntos de parâmetros</h3><div style="overflow-x:auto"><table class="calc-tbl"><thead><tr><th>Conjunto</th><th>Calculadora</th><th>Versão</th><th>Vigência</th><th>Situação</th><th>Criado</th><th></th></tr></thead><tbody>${sets.map(s => `<tr><td><b>${E(s.id)}</b>${s.uf ? ' (' + s.uf + ')' : ''}</td><td>${E(s.calculator_key)}</td><td>v${s.version}</td><td>${E(s.valid_from)} → ${E(s.valid_to || 'em vigor')}</td><td><span class="calc-tag ok">${E(s.status)}</span></td><td>${E(s.created_at || '')} ${E(s.created_by || '')}</td><td><button class="btn bo bsm" onclick="calcVerSet('${E(s.id)}')">ver</button></td></tr>`).join('')}</tbody></table></div><div id="calcSetVer"></div></div>
      <div class="calc-card"><h3 class="calc-h" style="font-size:15px">Bases legais cadastradas</h3><div style="overflow-x:auto"><table class="calc-tbl"><thead><tr><th>Norma</th><th>Nº</th><th>Artigo</th><th>Assunto</th><th>Vigência</th><th>Fonte oficial</th><th>Última verificação</th><th>Observação</th>${adm ? '<th></th>' : ''}</tr></thead><tbody>${C.CALC_BASES.map(b => { const vv = ver[b.id]; return `<tr><td>${E(b.norma)}</td><td>${E(b.numero)}</td><td>${E(b.artigo)}</td><td>${E(b.assunto)}</td><td>${E(b.vig_ini || '—')} → ${E(b.vig_fim || 'em vigor')}</td><td><a href="${E(b.fonte)}" target="_blank" rel="noopener">${E(b.fonte.replace(/^https?:\/\//, ''))}</a></td><td>${vv ? E(vv.data) + ' (' + E(vv.por || '') + ')' : '<span class="calc-tag warn">não conferida na fonte</span>'}</td><td>${E(b.obs || '')}</td>${adm ? `<td><button class="btn bo bsm" onclick="calcMarcarVerificada('${b.id}')">marcar conferida hoje</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div></div>`;
  }
  window.calcVerSet = function (id) { const s = C.todosSets().find(x => x.id === id); if (!s) return; document.getElementById('calcSetVer').innerHTML = `<pre style="font:11.5px var(--mono);background:var(--bg);padding:10px;border-radius:var(--r);overflow:auto;max-height:340px;margin-top:10px">${E(JSON.stringify(s, null, 2))}</pre>`; };
  window.calcMarcarVerificada = function (id) { if (!ehAdmin()) return; const v = (S.g(LS.verif) && typeof S.g(LS.verif) === 'object') ? Object.assign({}, S.g(LS.verif)) : {}; v[id] = { data: hoje(), por: (currentUser && (currentUser.nome || currentUser.login)) || '' }; S.s(LS.verif, v); renderBases(); };

  function propHtml(p) {
    const adm = ehAdmin();
    return `<div class="calc-prop"><b>${E(p.calculator_key)}</b> — ${E(p.parametro)}<dl>
      <dt>PARÂMETRO ATUAL</dt><dd>${E(p.atual_txt || '—')}</dd><dt>NOVO SUGERIDO</dt><dd><b>${E(p.novo_txt)}</b></dd><dt>BASE LEGAL</dt><dd>${E(p.base_legal || '—')}</dd><dt>VIGÊNCIA</dt><dd>${E(p.vigencia_inicial || '—')}</dd><dt>FONTE</dt><dd>${p.fonte ? `<a href="${E(p.fonte)}" target="_blank" rel="noopener">${E(p.fonte)}</a>` : '—'}</dd>${p.observacao ? `<dt>OBSERVAÇÃO</dt><dd>${E(p.observacao)}</dd>` : ''}</dl>
      <div class="calc-acts" style="margin-top:6px">${adm ? `<button class="btn bp bsm" onclick="calcProposta('${p.id}','aprovar')">Aprovar</button>` : '<small style="color:var(--slate)">Só administrador aprova.</small>'}<button class="btn bo bsm" onclick="calcProposta('${p.id}','ignorar')">Ignorar</button></div></div>`;
  }
  window.calcProposta = function (id, acao) {
    const lista = lerLista(LS.prop); const p = lista.find(x => x.id === id); if (!p) return;
    if (acao === 'ignorar') { p.status = 'ignorada'; p.decidido_em = new Date().toISOString(); S.s(LS.prop, lista); renderAbaAtual(); return; }
    if (!ehAdmin()) { toast('Somente administrador aprova.', 'err'); return; }
    const atual = C.acharSet(p.calculator_key, p.vigencia_inicial || hoje(), p.uf || undefined) || C.todosSets().filter(s => s.calculator_key === p.calculator_key && s.status === 'ativo').sort((a, b) => b.version - a.version)[0];
    if (!atual) { toast('Não existe conjunto atual desta calculadora para basear a nova versão. Cadastre manualmente.', 'err'); return; }
    if (!atual.params[p.parametro]) { toast('O parâmetro "' + p.parametro + '" não existe no conjunto atual — cadastre manualmente.', 'err'); return; }
    let novo; try { novo = JSON.parse(p.novo_json); } catch (e) { toast('O valor sugerido não está em formato válido — cadastre manualmente.', 'err'); return; }
    if (Array.isArray(atual.params[p.parametro].value) !== Array.isArray(novo) || (typeof atual.params[p.parametro].value !== typeof novo)) { toast('O tipo do valor sugerido não bate com o do parâmetro atual — cadastre manualmente.', 'err'); return; }
    if (!p.vigencia_inicial || !/^\d{4}-\d{2}-\d{2}$/.test(p.vigencia_inicial)) { toast('A proposta não trouxe a vigência inicial (AAAA-MM-DD). Cadastre manualmente.', 'err'); return; }
    if (!confirm('Criar NOVA versão do conjunto ' + atual.id + ' com ' + p.parametro + ' = ' + p.novo_txt + ', valendo a partir de ' + p.vigencia_inicial + '?\n\nOs cálculos de competências anteriores continuam usando a versão atual. Esta ação é registrada.')) return;
    const nova = JSON.parse(JSON.stringify(atual)); nova.version = Math.max.apply(null, C.todosSets().filter(s => s.calculator_key === atual.calculator_key && (s.uf || '') === (atual.uf || '')).map(s => s.version)) + 1;
    nova.id = atual.id.replace(/_V\d+$/, '') + '_V' + nova.version; nova.valid_from = p.vigencia_inicial; nova.valid_to = (atual.valid_to && p.vigencia_inicial <= atual.valid_to) ? atual.valid_to : null; nova.status = 'ativo'; nova.created_at = hoje(); nova.created_by = (currentUser && (currentUser.nome || currentUser.login)) || '';
    nova.params[p.parametro].value = novo; nova.origem = 'proposta IA aprovada (' + (p.fonte || 'sem fonte') + ')';
    const sets = lerLista(LS.sets); sets.push(nova); S.s(LS.sets, sets);
    p.status = 'aprovada'; p.decidido_em = new Date().toISOString(); p.set_criado = nova.id; S.s(LS.prop, lista);
    carregarSets(); toast('Nova versão ' + nova.id + ' criada.', 'ok'); renderAbaAtual();
  };

  window.calcCadastrar = function () {
    if (!ehAdmin()) return; const box = document.getElementById('calcCadBox');
    const modelo = { id: 'IOF_CREDITO_2026', calculator_key: 'iof_credito', valid_from: '2026-01-01', valid_to: null, version: 1, status: 'ativo', created_by: (currentUser && currentUser.nome) || '', bases: ['IOF_CREDITO'], params: { taxa_diaria: { value: '0.000082', unit: 'taxa/dia', description: 'EXEMPLO — troque pelo valor da norma' }, taxa_diaria_simples: { value: '0.000041', unit: 'taxa/dia', description: 'EXEMPLO — mutuário Simples/MEI' }, adicional: { value: '0.0038', unit: 'taxa', description: 'EXEMPLO — adicional sobre o principal' }, limite_dias: { value: 365, unit: 'dias', description: 'EXEMPLO — limite de dias tributáveis' } } };
    box.innerHTML = `<div class="calc-card"><h3 class="calc-h" style="font-size:15px">Cadastrar conjunto de parâmetros</h3><div class="calc-sub">Cole o conjunto em JSON. O modelo abaixo é de IOF e traz valores de EXEMPLO — substitua pelos da norma antes de salvar. O conjunto entra como nova versão com vigência própria; nunca altera os existentes.</div><textarea class="calc-ta" id="calcCadTxt">${E(JSON.stringify(modelo, null, 2))}</textarea><div class="calc-acts"><button class="btn bp" onclick="calcCadSalvar()">Validar e salvar</button><button class="btn bo" onclick="document.getElementById('calcCadBox').innerHTML=''">Cancelar</button></div><div id="calcCadMsg" style="margin-top:8px"></div></div>`;
  };
  window.calcCadSalvar = function () {
    if (!ehAdmin()) return; const msg = document.getElementById('calcCadMsg'); let s;
    try { s = JSON.parse(document.getElementById('calcCadTxt').value); } catch (e) { msg.innerHTML = '<div class="calc-erro">JSON inválido: ' + E(e.message) + '</div>'; return; }
    const erros = C.validarSet(s); if (C.todosSets().some(x => x.id === s.id)) erros.push('Já existe um conjunto com o id "' + s.id + '". Use outro id/versão.');
    if (/EXEMPLO/.test(JSON.stringify(s))) erros.push('O conjunto ainda contém a palavra EXEMPLO nas descrições — troque pelos valores e descrições reais.');
    if (erros.length) { msg.innerHTML = '<div class="calc-erro">' + erros.map(E).join('<br>') + '</div>'; return; }
    s.created_at = hoje(); s.created_by = s.created_by || (currentUser && currentUser.nome) || '';
    const sets = lerLista(LS.sets); sets.push(s); S.s(LS.sets, sets); carregarSets(); toast('Conjunto ' + s.id + ' cadastrado.', 'ok'); renderBases();
  };

  const FOCOS = {
    irrf: { chaves: ['irrf_pf'], txt: 'FOCO: tabela mensal do IRRF de pessoa física. Confira, mês a mês, de janeiro/2021 a dezembro/2026, se cada conjunto está correto (faixas, alíquotas, parcela a deduzir, dedução por dependente, desconto simplificado mensal e a redução da Lei 15.270/2025 a partir de 01/2026). Se algum valor estiver errado, ou se houve mudança NO MEIO da vigência de um conjunto, proponha com "vigencia_inicial" = o primeiro dia do mês em que o valor correto passou a valer. Ignore os demais conjuntos.' },
    inss: { chaves: ['inss_empregado', 'inss_contribuinte_individual'], txt: 'FOCO: tabela de contribuição do INSS (empregado/avulso/doméstico e contribuinte individual). Confira, mês a mês, de janeiro/2021 a dezembro/2026, se cada conjunto está correto (limites das faixas, alíquotas e teto; em 2023 houve mudança em maio por causa do salário mínimo). Se algum valor estiver errado, ou se houve mudança NO MEIO da vigência de um conjunto, proponha com "vigencia_inicial" = o primeiro dia do mês em que o valor correto passou a valer. Ignore os demais conjuntos.' },
  };
  // ───────────────────────────── Tabelas do IRRF e do INSS (2021 a 2026, mês a mês) ─────────────────────────────
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesBR = iso => MESES[+iso.slice(5, 7) - 1] + '/' + iso.slice(0, 4);
  const vigTxt = s => mesBR(s.valid_from) + ' → ' + (s.valid_to ? mesBR(s.valid_to) : 'em vigor');
  const rs = v => 'R$ ' + C.brl(C.cents(v));
  const pc = v => (Number(v) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + '%';
  const pv2 = (s, k) => s.params[k] && s.params[k].value;
  function setsTab(chaves) { return C.todosSets().filter(s => chaves.includes(s.calculator_key) && s.status === 'ativo' && (s.valid_to || '9999-12-31') >= '2021-01-01' && s.valid_from <= '2026-12-31').sort((a, b) => a.valid_from < b.valid_from ? 1 : a.valid_from > b.valid_from ? -1 : b.version - a.version); }
  function situacaoSet(s) {
    const ver = (S.g(LS.verif) && typeof S.g(LS.verif) === 'object') ? S.g(LS.verif) : {}; const bs = (s.bases || []).filter(id => /^TAB_/.test(id)).map(id => C.CALC_BASES.find(b => b.id === id)).filter(Boolean); // só a base da própria tabela decide "conferida"
    const ok = bs.length && bs.every(b => ver[b.id] || b.ultima_verificacao); return ok ? '<span class="calc-tag ok">conferida na fonte</span>' : '<span class="calc-tag warn">não conferida na fonte</span>';
  }
  const fonteSet = s => { const b = (s.bases || []).map(id => C.CALC_BASES.find(x => x.id === id)).filter(Boolean).find(x => /TAB_/.test(x.id)); return b ? `<a href="${E(b.fonte)}" target="_blank" rel="noopener">${E(b.norma + ' ' + b.numero)}</a>` : '—'; };
  function irrfCard(s) {
    const fx = pv2(s, 'faixas'); let ant = null;
    const linhas = fx.map(f => { const t = `<tr><td>${f.ate === null ? 'Acima de ' + rs(ant) : (ant === null ? 'Até ' + rs(f.ate) : 'De ' + rs(ant) + ' até ' + rs(f.ate))}</td><td>${Number(f.aliq) === 0 ? 'isento' : pc(f.aliq)}</td><td>${rs(f.ded)}</td></tr>`; ant = f.ate; return t; }).join('');
    const simpl = C.cents(pv2(s, 'desconto_simplificado')), temRed = pv2(s, 'redutor_limite1') !== undefined;
    return `<div class="calc-card"><div class="calc-tabcab"><h3 class="calc-h" style="font-size:15px;margin:0">${E(vigTxt(s))}</h3><div>${situacaoSet(s)} <small style="color:var(--slate)">${E(s.id)} v${s.version}</small></div></div>
      <div class="calc-tabgrid"><table class="calc-tbl"><thead><tr><th>Base de cálculo mensal</th><th>Alíquota</th><th>Parcela a deduzir</th></tr></thead><tbody>${linhas}</tbody></table>
      <dl class="calc-prop" style="margin:0"><dt>DEPENDENTE</dt><dd>${rs(pv2(s, 'dependente'))} por dependente</dd><dt>DESCONTO SIMPLIFICADO MENSAL</dt><dd>${simpl ? rs(pv2(s, 'desconto_simplificado')) : 'não existia nesta época'}</dd><dt>REDUÇÃO DA LEI 15.270/2025</dt><dd>${temRed ? 'até ' + rs(pv2(s, 'redutor_max1')) + ' para rendimentos até ' + rs(pv2(s, 'redutor_limite1')) + '; entre esse valor e ' + rs(pv2(s, 'redutor_limite2')) + ': ' + rs(pv2(s, 'redutor_const2')) + ' − ' + pv2(s, 'redutor_coef2') + ' × rendimentos' : 'não existia (vale a partir de 01/2026)'}</dd><dt>FONTE</dt><dd>${fonteSet(s)}</dd></dl></div></div>`;
  }
  function inssLinhas() {
    const emp = setsTab(['inss_empregado']), ci = setsTab(['inss_contribuinte_individual']);
    return emp.map(s => { const c = ci.find(x => x.valid_from === s.valid_from) || ci.find(x => x.valid_from <= s.valid_from && (!x.valid_to || x.valid_to >= s.valid_from)); return { s, c }; });
  }
  function renderTabela(aba) {
    const main = document.getElementById('calcMain'); const irrf = aba === 'tab_irrf'; const foco = irrf ? 'irrf' : 'inss';
    const chaves = FOCOS[foco].chaves; const props = lerLista(LS.prop).filter(p => p.status === 'pendente' && chaves.includes(p.calculator_key));
    const cab = `<div class="calc-card"><h2 class="calc-h">📊 Tabela do ${irrf ? 'IRRF (imposto de renda retido — pessoa física)' : 'INSS (contribuição do segurado)'} — 2021 a 2026</h2><div class="calc-sub">Cada linha vale a partir do mês indicado, e o cálculo escolhe a tabela pela competência (sem retroatividade). O botão abaixo pede à IA para conferir mês a mês nas fontes oficiais: ela <b>propõe</b>, nunca altera — só um administrador aprova, e a aprovação cria uma NOVA versão.</div>
      <div class="calc-acts" style="margin-top:0"><button class="btn btn-ia-gemini btn-calc-ia" id="calcBtnIa" onclick="calcPesquisarIA('${foco}')" ${est.iaBusy ? 'disabled' : ''}>🤖 Atualizar com IA</button><button class="btn bo" onclick="calcTabImprimir()">🖨️ Imprimir / PDF</button><button class="btn bo" onclick="calcTabExcel()">📊 Excel</button></div><div id="calcIaMsg" style="font-size:12.5px;margin-top:8px;color:var(--slate)"></div></div>
      ${props.length ? `<div class="calc-card"><h3 class="calc-h" style="font-size:15px">Propostas da IA aguardando decisão</h3>${props.map(propHtml).join('')}</div>` : ''}`;
    let corpo;
    if (irrf) corpo = setsTab(chaves).map(irrfCard).join('');
    else {
      const L = inssLinhas(); const ref = L.length ? pv2(L[0].s, 'faixas') : [];
      corpo = `<div class="calc-card"><div style="overflow-x:auto"><table class="calc-tbl"><thead><tr><th>Vigência</th>${ref.map(f => `<th>Até (${pc(f.aliq)})</th>`).join('')}<th>Teto do salário de contribuição</th><th>Contribuinte individual (pró-labore)</th><th>Conjunto</th><th>Situação</th></tr></thead><tbody>${L.map(({ s, c }) => `<tr><td><b>${E(vigTxt(s))}</b></td>${pv2(s, 'faixas').map(f => `<td>${rs(f.ate)}</td>`).join('')}<td>${rs(pv2(s, 'teto'))}</td><td>${c ? pc(pv2(c, 'aliquota')) + ' até ' + rs(pv2(c, 'teto')) : '—'}</td><td>${E(s.id)} v${s.version}</td><td>${situacaoSet(s)}</td></tr>`).join('')}</tbody></table></div><div style="font-size:12px;color:var(--slate);margin-top:8px">As faixas são progressivas: cada alíquota incide só sobre a parte do salário dentro da faixa (nunca o salário inteiro × uma alíquota). O 13º não se soma à remuneração do mês.</div></div>`;
    }
    main.innerHTML = cab + '<div id="calcTabConteudo">' + corpo + '</div>';
  }
  function tabAoa() {
    if (est.aba === 'tab_selic') return selicAoa();
    if (est.aba === 'tab_irrf') {
      const a = [['Vigência', 'Conjunto', 'Faixa', 'Base até (R$)', 'Alíquota (%)', 'Parcela a deduzir (R$)', 'Dependente (R$)', 'Desconto simplificado (R$)', 'Redução Lei 15.270', 'Situação']];
      setsTab(['irrf_pf']).forEach(s => { const fx = pv2(s, 'faixas'); fx.forEach((f, i) => a.push([vigTxt(s), s.id + ' v' + s.version, (i + 1) + 'ª', f.ate === null ? 'acima' : Number(f.ate), Number(f.aliq), Number(f.ded), Number(pv2(s, 'dependente')), Number(pv2(s, 'desconto_simplificado')), pv2(s, 'redutor_limite1') !== undefined ? 'sim' : 'não existia', semTags(situacaoSet(s))])); });
      return { nome: 'IRRF 2021-2026', aoa: a, pctCols: [4] };
    }
    const L = inssLinhas(); const ref = L.length ? pv2(L[0].s, 'faixas') : [];
    const a = [['Vigência'].concat(ref.map(f => 'Até (' + pc(f.aliq) + ')')).concat(['Teto (R$)', 'Contribuinte individual (%)', 'CI: teto (R$)', 'Conjunto', 'Situação'])];
    L.forEach(({ s, c }) => a.push([vigTxt(s)].concat(pv2(s, 'faixas').map(f => Number(f.ate))).concat([Number(pv2(s, 'teto')), c ? Number(pv2(c, 'aliquota')) : '', c ? Number(pv2(c, 'teto')) : '', s.id + ' v' + s.version, semTags(situacaoSet(s))])));
    return { nome: 'INSS 2021-2026', aoa: a, pctCols: [ref.length + 2] };
  }
  window.calcTabExcel = function () { const t = tabAoa(); const wb = XLSX.utils.book_new(); addSheet(wb, t.nome, t.aoa, t); baixarXlsx(wb, t.nome); };
  window.calcTabImprimir = function () { const t = tabAoa(); const el = document.getElementById('calcTabConteudo'); if (!el) return; abrirImpressao(`<!doctype html><meta charset="utf-8"><title>${E(t.nome)}</title><style>body{font:13px Arial,sans-serif;margin:24px;color:#111}h1{font-size:18px}table{border-collapse:collapse;width:100%;margin:6px 0 12px}td,th{border-bottom:1px solid #ddd;padding:3px 6px;text-align:left;vertical-align:top;font-size:12px}.calc-card{border:1px solid #ccc;padding:8px 10px;margin:8px 0;page-break-inside:avoid}.calc-tag{border:1px solid #999;border-radius:3px;padding:0 4px;font-size:10px}.calc-tabgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.calc-cal{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}.calc-mes{border:1px solid #ccc;padding:3px 5px;font-size:11px}.calc-mes small{display:block;color:#666}.calc-mes b{display:block}.calc-mes i{display:block;font-style:normal;color:#666}dt{font-size:10px;font-weight:bold;color:#666;margin-top:6px}dd{margin:0}h3{margin:0 0 6px;font-size:14px}</style><h1>${E(t.nome)}</h1><p><small>Calculadoras JJR — ${E(new Date().toLocaleString('pt-BR'))}</small></p>${el.innerHTML}`); };

  // ───────────────────────────── Selic / CDI acumulados (BCB, séries 4390 e 4391) — calendário por ano, desde 01/2021 ─────────────────────────────
  const pad2 = n => String(n).padStart(2, '0');
  const pp = x => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + '%';
  const setSelic = () => C.acharSet('mutuo_juros', hoje()) || C.acharSet('mutuo_juros', '2021-01-01');
  function selicAno(ano, mapa) { let f = 1, n = 0; for (let m = 1; m <= 12; m++) { const v = mapa[ano + '-' + pad2(m)]; if (v !== undefined) { f *= 1 + Number(v) / 100; n++; } } return { pct: (f - 1) * 100, n }; }
  function calendarioHtml(set) {
    const sel = (set && pv2(set, 'selic_mensal')) || {}, cdi = (set && pv2(set, 'cdi_mensal')) || {}; const ano0 = 2021, ano1 = +hoje().slice(0, 4), mesCorr = hoje().slice(0, 7); let h = '';
    for (let a = ano1; a >= ano0; a--) {
      const sa = selicAno(a, sel), ca = selicAno(a, cdi);
      h += `<div class="calc-card"><div class="calc-tabcab"><h3 class="calc-h" style="font-size:15px;margin:0">${a}</h3><div style="font-size:12.5px;color:var(--slate)">${sa.n ? 'Selic no ano: <b>' + pp(sa.pct) + '</b>' + (sa.n < 12 ? ' (' + sa.n + ' meses)' : '') : 'sem dados'}${ca.n ? ' · CDI no ano: <b>' + pp(ca.pct) + '</b>' + (ca.n < 12 ? ' (' + ca.n + ' meses)' : '') : ''}</div></div><div class="calc-cal">`;
      for (let m = 1; m <= 12; m++) {
        const ym = a + '-' + pad2(m), v = sel[ym], c = cdi[ym];
        h += `<div class="calc-mes ${v === undefined ? 'vazio' : ''}"><small>${MESES[m - 1]}/${String(a).slice(2)}</small>${v === undefined ? `<b>—</b><i>${ym === mesCorr ? 'em andamento' : (ym > mesCorr ? 'ainda não' : 'não cadastrado')}</i>` : `<b>${pp(v)}</b><i>CDI ${c === undefined ? '—' : pp(c)}</i>`}</div>`;
      }
      h += '</div></div>';
    }
    return h;
  }
  function selicDetalhe(set, ini, fim) {
    const sel = pv2(set, 'selic_mensal') || {}, cdi = pv2(set, 'cdi_mensal') || {}; const linhas = []; let cur = ini;
    while (cur < fim) { const ym = cur.slice(0, 7), prox = C.somaMeses(ym + '-01', 1), fimMes = prox < fim ? prox : fim; linhas.push({ ym, usados: C.diasEntre(cur, fimMes), dm: C.diasEntre(ym + '-01', prox), s: sel[ym], c: cdi[ym] }); cur = fimMes; }
    return linhas;
  }
  function renderSelic() {
    const main = document.getElementById('calcMain'); const set = setSelic(); const adm = ehAdmin();
    const sel = (set && pv2(set, 'selic_mensal')) || {}; const ult = Object.keys(sel).sort().pop();
    const ini0 = est.selicIni || (hoje().slice(0, 4) + '-01-01'), fim0 = est.selicFim || (hoje().slice(0, 7) + '-01');
    main.innerHTML = `<div class="calc-card"><h2 class="calc-h">📊 Taxa SELIC acumulada no período (ou 100% do CDI)</h2><div class="calc-sub">Série oficial do Banco Central (SGS 4390 — Selic e 4391 — CDI, acumulados no mês), desde 01/2021. Serve de referência para os juros do mútuo: a PJ que empresta deve cobrar ao menos a Selic acumulada (ou 100% do CDI). Os meses fechados ficam visíveis no calendário abaixo, ano a ano. ${ult ? 'Última competência cadastrada: <b>' + MESES[+ult.slice(5) - 1] + '/' + ult.slice(0, 4) + '</b> (' + E(set.id) + ' v' + set.version + ').' : ''}</div>
      <div class="calc-grid"><div class="cf"><label class="fl" for="cs_ini">Data inicial (inclusive)</label><input class="fi" type="date" id="cs_ini" value="${E(ini0)}" min="2021-01-01"></div><div class="cf"><label class="fl" for="cs_fim">Data final (exclusive — ex.: o vencimento)</label><input class="fi" type="date" id="cs_fim" value="${E(fim0)}"></div><div class="cf"><label class="fl" for="cs_prin">Principal (R$) — opcional, para ver os juros mínimos</label><input class="fi" id="cs_prin" inputmode="decimal" placeholder="0,00" ${MASK}></div></div>
      <div class="calc-acts"><button class="btn bp" onclick="calcSelicCalcular()">Calcular acumulado</button><button class="btn btn-ia-gemini btn-calc-ia" onclick="calcSelicAtualizar()" id="calcBtnBcb">🔄 Atualizar pelo Banco Central</button><button class="btn bo" onclick="calcTabImprimir()">🖨️ Imprimir / PDF</button><button class="btn bo" onclick="calcTabExcel()">📊 Excel</button></div><div id="calcSelicMsg" style="font-size:12.5px;margin-top:8px;color:var(--slate)">${adm ? 'A atualização busca os meses fechados que faltam na API oficial do BCB e <b>salva</b> como nova versão da série (não apaga nada).' : 'Só administrador atualiza a série.'}</div></div>
      <div id="calcTabConteudo"><div id="calcSelicRes"></div>${calendarioHtml(set)}</div>`;
    if (est.selicRes) document.getElementById('calcSelicRes').innerHTML = est.selicRes;
  }
  window.calcSelicCalcular = function () {
    const set = setSelic(); const g2 = id => (document.getElementById(id) || {}).value || ''; const ini = g2('cs_ini'), fim = g2('cs_fim'), prin = C.cents(g2('cs_prin')); est.selicIni = ini; est.selicFim = fim;
    const el = document.getElementById('calcSelicRes'); const erro = m => { el.innerHTML = `<div class="calc-card"><div class="calc-erro">${E(m)}</div></div>`; est.selicRes = el.innerHTML; };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return erro('Informe a data inicial e a final.');
    if (fim <= ini) return erro('A data final precisa ser posterior à inicial.');
    if (ini < '2021-01-01') return erro('A série cadastrada começa em 01/2021.');
    const a = C.selicAcumulada(set, ini, fim, 'selic_mensal'), b = C.selicAcumulada(set, ini, fim, 'cdi_mensal'); const dias = C.diasEntre(ini, fim);
    const faltam = a.faltando.length ? a.faltando : b.faltando; const det = selicDetalhe(set, ini, fim);
    const kp = (l, v, hl) => `<div class="calc-kpi ${hl ? 'hl' : ''}"><small>${E(l).toUpperCase()}</small><b>${v}</b></div>`;
    el.innerHTML = `<div class="calc-card"><h3 class="calc-h" style="font-size:15px">Acumulado de ${ini.split('-').reverse().join('/')} a ${fim.split('-').reverse().join('/')} (${dias} dias)</h3>${faltam.length ? `<div class="calc-aviso">⚠️ Série sem dados para ${faltam.map(x => MESES[+x.slice(5) - 1] + '/' + x.slice(0, 4)).join(', ')} — o acumulado não pôde ser calculado. Use “Atualizar pelo Banco Central” depois que o mês fechar.</div>` : `<div class="calc-resumo">${kp('Selic acumulada', pp((a.fator - 1) * 100), 1)}${kp('CDI acumulado', pp((b.fator - 1) * 100))}${prin ? kp('Juros a 100% da Selic', brl(Math.round(prin * (a.fator - 1))), 1) + kp('Juros a 100% do CDI', brl(Math.round(prin * (b.fator - 1)))) : ''}</div>`}
      <div style="overflow-x:auto"><table class="calc-tbl"><thead><tr><th>Mês</th><th>Dias usados</th><th>Selic no mês</th><th>CDI no mês</th></tr></thead><tbody>${det.map(l => `<tr><td>${MESES[+l.ym.slice(5) - 1]}/${l.ym.slice(0, 4)}</td><td>${l.usados} de ${l.dm}${l.usados < l.dm ? ' (parcial)' : ''}</td><td>${l.s === undefined ? '—' : pp(l.s)}</td><td>${l.c === undefined ? '—' : pp(l.c)}</td></tr>`).join('')}</tbody></table></div>
      <div style="font-size:12px;color:var(--slate);margin-top:6px">Meses fechados são compostos; o mês parcial entra proporcional aos dias corridos (aproximação — o BCB usa dias úteis). Guarde o extrato oficial da Selic/CDI do período junto com a memória de cálculo do mútuo.</div></div>`;
    est.selicRes = el.innerHTML;
  };
  window.calcSelicAtualizar = async function () {
    if (!ehAdmin()) { toast('Somente administrador atualiza a série.', 'err'); return; }
    const btn = document.getElementById('calcBtnBcb'), msg = document.getElementById('calcSelicMsg'); if (btn) btn.disabled = true; if (msg) msg.textContent = 'Consultando o Banco Central…';
    try {
      const d = new Date(), dd = pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
      const [a, b] = await Promise.all([4390, 4391].map(c => fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.' + c + '/dados?formato=json&dataInicial=01/01/2021&dataFinal=' + dd).then(r => { if (!r.ok) throw new Error('BCB respondeu HTTP ' + r.status); return r.json(); })));
      const atual = setSelic(); if (!atual) throw new Error('Série de Selic não encontrada.');
      const nova = JSON.parse(JSON.stringify(atual)); const mesCorr = hoje().slice(0, 7);
      const juntar = (mapa, arr) => { let n = 0; arr.forEach(x => { const ym = String(x.data).slice(6) + '-' + String(x.data).slice(3, 5); if (ym >= mesCorr || !/^\d{4}-\d{2}$/.test(ym)) return; const v = parseFloat(String(x.valor).replace(',', '.')); if (!isFinite(v)) return; if (mapa[ym] === undefined) { mapa[ym] = String(x.valor).replace(',', '.'); n++; } }); return n; };
      const n1 = juntar(nova.params.selic_mensal.value, a), n2 = juntar(nova.params.cdi_mensal.value, b);
      if (!n1 && !n2) { if (msg) msg.textContent = 'Já está atualizado: nenhum mês fechado novo no Banco Central.'; if (btn) btn.disabled = false; return; }
      nova.version = Math.max.apply(null, C.todosSets().filter(s => s.calculator_key === 'mutuo_juros').map(s => s.version)) + 1;
      nova.id = atual.id.replace(/_V\d+$/, '') + '_V' + nova.version; nova.status = 'ativo'; nova.created_at = hoje(); nova.created_by = (currentUser && (currentUser.nome || currentUser.login)) || ''; nova.origem = 'Banco Central — SGS 4390 e 4391 (atualização pelo botão)';
      const sets = lerLista(LS.sets); sets.push(nova); S.s(LS.sets, sets); carregarSets();
      toast('Série atualizada: ' + Math.max(n1, n2) + ' mês(es) novo(s) salvo(s).', 'ok'); renderSelic();
      const m2 = document.getElementById('calcSelicMsg'); if (m2) m2.innerHTML = '✅ Salvo como <b>' + E(nova.id) + '</b>: ' + Math.max(n1, n2) + ' mês(es) novo(s) da fonte oficial do BCB.';
    } catch (e) { if (msg) msg.innerHTML = '<span style="color:var(--red)">Não foi possível atualizar: ' + E(e.message || e) + '</span>'; if (btn) btn.disabled = false; }
  };
  function selicAoa() {
    const set = setSelic(); const sel = (set && pv2(set, 'selic_mensal')) || {}, cdi = (set && pv2(set, 'cdi_mensal')) || {}; const a = [['Ano', 'Mês', 'Selic no mês (%)', 'CDI no mês (%)']];
    Object.keys(sel).sort().forEach(ym => a.push([+ym.slice(0, 4), MESES[+ym.slice(5) - 1], Number(sel[ym]) / 100, cdi[ym] === undefined ? '' : Number(cdi[ym]) / 100]));
    return { nome: 'Selic e CDI mensais', aoa: a, pctCols: [2, 3], intCols: [0] };
  }

  window.calcPesquisarIA = async function (foco) {
    foco = FOCOS[foco] ? foco : '';
    if (est.iaBusy) return; est.iaBusy = true; const msg = document.getElementById('calcIaMsg'), btn = document.getElementById('calcBtnIa');
    if (btn) btn.disabled = true; if (msg) msg.textContent = 'Pesquisando em fontes oficiais… pode levar até um minuto.';
    try {
      const atuais = C.todosSets().filter(s => s.status === 'ativo' && (!foco || FOCOS[foco].chaves.includes(s.calculator_key))).map(s => ({ conjunto: s.id, calculator_key: s.calculator_key, uf: s.uf || null, versao: s.version, vigencia: s.valid_from + ' → ' + (s.valid_to || 'em vigor'), parametros: Object.fromEntries(Object.entries(s.params).map(([k, p]) => [k, p.value])) }));
      const resp = await fetch(SUPABASE_URL + '/functions/v1/calc-pesquisar-atualizacoes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }, body: JSON.stringify({ hoje: hoje(), conjuntos: atuais, foco: foco ? FOCOS[foco].txt : '' }) });
      const dados = await resp.json().catch(() => ({}));
      if (!resp.ok || dados.error) throw new Error(dados.error || ('HTTP ' + resp.status));
      const lista = lerLista(LS.prop); let novas = 0;
      (dados.propostas || []).forEach(p => {
        const atual = C.todosSets().filter(s => s.calculator_key === p.calculator_key && s.status === 'ativo').sort((a, b) => b.version - a.version)[0];
        const atualVal = atual && atual.params[p.parametro] ? atual.params[p.parametro].value : undefined;
        const novoJson = JSON.stringify(p.novo_valor); if (novoJson === undefined || novoJson === 'null') return;
        if (atualVal !== undefined && valorTxt(atualVal) === novoJson) return; // igual ao atual → não é novidade
        const dup = lista.some(x => x.status === 'pendente' && x.calculator_key === p.calculator_key && x.parametro === p.parametro && x.novo_json === novoJson && x.vigencia_inicial === p.vigencia_inicial);
        if (dup) return;
        lista.push({ id: 'p' + Date.now().toString(36) + novas, criado_em: new Date().toISOString(), status: 'pendente', calculator_key: String(p.calculator_key || ''), uf: p.uf || '', parametro: String(p.parametro || ''), atual_txt: atualVal === undefined ? 'não cadastrado' : valorTxt(atualVal), novo_txt: novoJson, novo_json: novoJson, base_legal: String(p.base_legal || ''), vigencia_inicial: String(p.vigencia_inicial || ''), fonte: String(p.fonte || ''), observacao: String(p.observacao || '') });
        novas++;
      });
      S.s(LS.prop, lista);
      est.iaBusy = false; renderAbaAtual();
      const m2 = document.getElementById('calcIaMsg'); if (m2) m2.innerHTML = (novas ? `<b>${novas} proposta(s) nova(s)</b> abaixo, aguardando decisão.` : 'Nenhuma mudança nova encontrada.') + (dados.resumo ? ' ' + E(dados.resumo) : '') + (dados.usou_busca_web === false ? ' <span class="calc-tag warn">sem busca na internet — resposta só do conhecimento do modelo, confira nas fontes</span>' : '');
      return;
    } catch (e) { if (msg) msg.innerHTML = '<span style="color:var(--red)">Não foi possível pesquisar: ' + E(e.message || e) + '</span>'; }
    est.iaBusy = false; if (btn) btn.disabled = false;
  };
})();

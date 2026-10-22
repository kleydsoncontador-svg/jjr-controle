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
const V_SEC = 'Conferida em 20/10/2026 em sites especializados (fonte SECUNDÁRIA, não oficial); conferir no texto oficial';
  const V_USR = 'Cadastrada conforme informação do usuário (20/10/2026); conferir na fonte oficial';
  const CALC_BASES = [
    { id: 'LEI_15270_2025', calcs: ['irrf_pf', 'salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao'], norma: 'Lei', numero: '15.270/2025 (de 26/11/2025)', artigo: 'art. 2º: Lei 9.250, art. 3º-A, caput e §§ 1º a 3º', assunto: 'Redução mensal do IRPF a partir de janeiro/2026: rendimentos até R$ 5.000,00 → redução de até R$ 312,89 (imposto zero); de R$ 5.000,01 a R$ 7.350,00 → R$ 978,62 − (0,133145 × rendimentos tributáveis); acima de R$ 7.350,00 → nenhuma. Limitada ao imposto pela tabela (§ 1º). Aplica-se também ao imposto exclusivo na fonte do 13º salário (§ 3º).', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15270.htm', ultima_verificacao: '2026-10-20 (texto oficial do Planalto)', obs: 'Texto lido no Planalto. Mesma lei: retenção de 10% sobre dividendos acima de R$ 50.000/mês por PF (art. 6º-A, Lei 9.250) — ver a calculadora "Distribuição de lucros".' },
    { id: 'LEI_9250_6A', calcs: ['dist_lucros'], norma: 'Lei 15.270/2025, art. 2º (acrescenta o art. 6º-A à Lei 9.250/1995)', numero: '15.270/2025 (de 26/11/2025) — Lei 9.250/1995, art. 6º-A', artigo: 'art. 6º-A, caput e §§ 1º, 2º e 3º', assunto: 'A partir de janeiro/2026: lucros e dividendos pagos, creditados, empregados ou entregues por uma MESMA pessoa jurídica a uma MESMA pessoa física residente no Brasil, em montante superior a R$ 50.000,00 em um mesmo mês, sofrem retenção do IRPF na fonte à alíquota de 10% sobre o TOTAL do valor pago (§ 1º: vedadas quaisquer deduções); com mais de um pagamento no mês, a retenção é recalculada pelo total do mês (§ 2º). Não se sujeitam (§ 3º): lucros de resultados apurados até 2025, cuja distribuição tenha sido aprovada até 31/12/2025 e que sejam exigíveis nos termos da legislação civil ou empresarial, pagos nos termos originalmente previstos no ato de aprovação.', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15270.htm', ultima_verificacao: '2026-10-22 (texto oficial do Planalto)', obs: 'Texto lido no Planalto. A lei NÃO diz se a parcela isenta do § 3º conta para o teste de R$ 50.000 no mês (parâmetro isenta_compoe_limite = NÃO) nem se o IRRF é definitivo ou antecipação. A IN RFB 2.299/2025 e o "Perguntas e Respostas" da Receita NÃO foram lidos no texto oficial (só resumo em fonte secundária: a Receita entende que a retenção alcança também sócios de optantes pelo Simples Nacional — há controvérsia pelo art. 14 da LC 123/2006).' },
    { id: 'LEI_9249_10', calcs: ['dist_lucros'], norma: 'Lei 15.270/2025, art. 3º (nova redação do art. 10 da Lei 9.249/1995)', numero: '15.270/2025 — Lei 9.249/1995, art. 10', artigo: 'art. 10, caput (ressalva dos arts. 6º-A e 16-A da Lei 9.250), § 4º e § 5º', assunto: 'Lucros e dividendos pagos, creditados, entregues, empregados ou REMETIDOS AO EXTERIOR: IRRF de 10% (§ 4º), sem piso mensal. Não se sujeitam (§ 5º): I – resultados apurados até 2025 com distribuição aprovada até 31/12/2025, exigíveis e pagos nos termos originalmente previstos; II – pagos a governos estrangeiros (com reciprocidade), fundos soberanos (Lei 11.312, art. 3º, § 5º) e entidades no exterior de previdência. Art. 10-A: crédito opcional ao beneficiário no exterior (não calculado aqui).', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15270.htm', ultima_verificacao: '2026-10-22 (texto oficial do Planalto)', obs: 'Texto lido no Planalto. Tributação mínima anual (Lei 9.250, art. 16-A; rendimentos anuais acima de R$ 600.000; alíquota até 10%) é outra apuração e NÃO é calculada aqui.' },
    { id: 'LEI_9250_1995', calcs: ['irrf_pf', 'salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao', 'pensao'], norma: 'Lei', numero: '9.250/1995', artigo: 'arts. 4º e 8º', assunto: 'Deduções do IRPF: dependentes, pensão alimentícia, previdência oficial', vig_ini: '1996-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: 'Base geral das deduções legais. Artigos a conferir.' },
    { id: 'TAB_IRRF_2026', calcs: ['irrf_pf', 'salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao'], norma: 'Leis 15.191/2025 (art. 2º, nova redação do art. 1º, XII, da Lei 11.482/2007) e 9.250/1995 (art. 4º, III, "i" e § 2º)', numero: '15.191/2025 e 9.250/1995', artigo: 'Lei 15.191 art. 2º; Lei 9.250 art. 4º, III, "i" e § 2º (redação da Lei 14.663/2023)', assunto: 'Tabela progressiva mensal desde maio/2025: até 2.428,80 (0%); até 2.826,65 (7,5% − 182,16); até 3.751,05 (15% − 394,16); até 4.664,68 (22,5% − 675,49); acima (27,5% − 908,73). Dependente R$ 189,59 (desde abril/2015). Desconto simplificado mensal = 25% da faixa de alíquota zero = R$ 607,20.', vig_ini: '2025-05-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/leis/l9250.htm', ultima_verificacao: '2026-10-20 (texto oficial do Planalto)', obs: 'Tudo lido no texto oficial do Planalto. O simplificado de R$ 607,20 é derivado: 25% × R$ 2.428,80 (a lei define o percentual, não o valor).' },
    { id: 'TAB_INSS_2026', calcs: ['salario_liquido', 'pro_labore', 'ferias', 'decimo_terceiro', 'rescisao'], norma: 'Portaria Interministerial MPS/MF nº 13, de 9/1/2026 (DOU 12/1/2026), Anexo II — tabela publicada pelo INSS', numero: '13/2026', artigo: 'Anexo II', assunto: 'Empregado, doméstico e avulso: até 1.621,00 (7,5%); 1.621,01 a 2.902,84 (9%); 2.902,85 a 4.354,27 (12%); 4.354,28 a 8.475,55 (14%) — alíquotas progressivas; teto R$ 8.475,55. O 13º não se soma à remuneração mensal para enquadramento.', vig_ini: '2026-01-01', vig_fim: '2026-12-31', fonte: 'https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal', ultima_verificacao: '2026-10-20 (página oficial do INSS, atualizada em 13/1/2026)', obs: 'Faixas e teto lidos na página oficial do INSS, que cita a Portaria 13/2026. O texto da portaria no DOU não foi lido.' },
    { id: 'LEI_8212_1991', calcs: ['pro_labore'], norma: 'Lei', numero: '8.212/1991 e 10.666/2003 (art. 4º: a empresa arrecada e recolhe a contribuição do contribuinte individual)', artigo: 'Lei 8.212 (a conferir); Lei 10.666 art. 4º', assunto: 'Contribuição do contribuinte individual sobre o pró-labore (11%, até o teto). A tabela do INSS lista 11% como alíquota do Plano Simplificado; o desconto de 11% pela empresa não foi conferido no artigo da Lei 8.212', vig_ini: '1991-07-24', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LEI_9249_1995', calcs: ['lucro_presumido'], norma: 'Lei', numero: '9.249/1995', artigo: 'arts. 15 e 20', assunto: 'Percentuais de presunção do IRPJ (art. 15) e da CSLL (art. 20)', vig_ini: '1996-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LEI_9430_1996', calcs: ['lucro_presumido'], norma: 'Lei', numero: '9.430/1996', artigo: '(regras do Lucro Presumido)', assunto: 'Apuração trimestral, adicional do IRPJ, receitas que integram a base', vig_ini: '1997-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LC_224_2025', calcs: ['lucro_presumido'], norma: 'Lei Complementar', numero: '224/2025 (de 26/12/2025)', artigo: 'art. 4º, § 4º, VII e § 5º, I e II; art. 14', assunto: 'Acréscimo de 10% sobre os percentuais de presunção, somente sobre a parcela da receita bruta TOTAL que exceder R$ 5.000.000,00 no ano-calendário; limite aplicado proporcionalmente a cada período de apuração, PERMITIDO O AJUSTE NOS PERÍODOS SEGUINTES; acréscimo proporcional às receitas de cada atividade', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm', ultima_verificacao: '2026-10-20 (texto oficial do Planalto)', obs: 'Art. 14: vigência na publicação; efeitos em 1º/1/2026 (IRPJ) e no 1º dia do 4º mês seguinte à publicação = 1º/4/2026 para tributos sujeitos à anterioridade nonagesimal (CSLL). O ajuste "nos períodos seguintes" NÃO está implementado (limite de R$ 1.250.000 por trimestre, sem compensação). Há liminares individuais e ADIs no STF (7920, 7936, 7944, 7982) contestando a majoração; nenhuma decisão do STF suspendendo foi localizada.' },
    { id: 'DEC_12808_2025', calcs: ['lucro_presumido'], norma: 'Decreto', numero: '12.808/2025', artigo: 'art. 12', assunto: 'Regulamentação da majoração do Lucro Presumido', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'RFB_LP_2026', calcs: ['lucro_presumido'], norma: 'Instrução Normativa RFB', numero: '2.305/2025 (31/12/2025), art. 15, com a redação da IN RFB 2.306/2026 (22/1/2026, DOU 23/1/2026)', artigo: 'art. 14 e art. 15, caput e §§ 1º a 9º', assunto: 'Majoração do Lucro Presumido: limite de R$ 1.250.000 por trimestre (§ 2º); trimestre acima do limite: presunção +10% sobre o excedente (§ 3º); sobra pode ser considerada nos trimestres seguintes (§ 4º); no 4º trimestre verifica-se o limite anual com a receita acumulada, hipóteses I, II e III (§ 5º); atividades diversas: proporção por atividade (§ 6º); restituição/compensação do crédito com Selic (§§ 7º e 8º); início/encerramento de atividade: limite anual proporcional aos trimestres em atividade (§ 9º)', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.normaslegais.com.br/legislacao/instrucao-normativa-rfb-2306-2025.htm', ultima_verificacao: '2026-10-20 (texto da IN 2.306 em portal de legislação; o texto no site da Receita não foi lido)', obs: 'Lido o texto integral da IN 2.306/2026 (art. 15 §§ 1º a 9º). O limite anual da CSLL em 2026 (R$ 3.750.000 = 3 trimestres) é a aplicação do § 9º/limite proporcional pelos 3 trimestres de vigência da CSLL — confirmar com a Receita. O recálculo opcional dos trimestres anteriores (§ 5º, I-b e II-b) NÃO é feito pela calculadora (ela mostra as parcelas).' },
    { id: 'LEI_9249_JCP', calcs: ['jcp'], norma: 'Lei', numero: '9.249/1995', artigo: 'art. 9º, caput, §§ 1º, 2º, 3º, 8º, 8º-A, 8º-C, 11 e 12', assunto: 'JCP: dedutível no lucro real (e na CSLL, § 11), pago/creditado individualizadamente, limitado à variação pro rata dia da TJLP sobre as contas do PL (§ 8º: capital social integralizado; reservas de capital do § 2º do art. 13 e p.ú. do art. 14 da Lei 6.404; reservas de lucros exceto a de incentivo fiscal do art. 195-A; ações em tesouraria; lucros ou prejuízos acumulados). § 1º: exige lucros (antes da dedução dos juros) OU lucros acumulados e reservas de lucros ≥ 2× os juros (= limite de 50%). § 8º-A: não contam variações positivas do PL por atos entre partes dependentes sem ingresso efetivo de ativos. § 8º-C: regras valem desde 1º/1/2024.', vig_ini: '1996-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm', ultima_verificacao: '2026-10-20 (texto oficial do Planalto)', obs: 'Texto lido no Planalto. A lei diz "lucros computados antes da dedução dos juros" — não menciona CSLL/IRPJ no limite; por isso o lucro do período é um campo informado. O divisor de dias da TJLP (365) NÃO consta na lei (só "pro rata dia").' },
    { id: 'LC_224_JCP', calcs: ['jcp'], norma: 'Lei Complementar', numero: '224/2025', artigo: 'art. 8º (nova redação do § 2º do art. 9º da Lei 9.249/1995); art. 14, III', assunto: 'IRRF sobre JCP: 17,5% na data do pagamento ou crédito (era 15%)', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm', ultima_verificacao: '2026-10-20 (texto oficial do Planalto)', obs: 'Texto lido no Planalto; efeitos desde 1º/1/2026. § 3º: o IRRF é antecipação para beneficiário PJ do lucro real; tributação definitiva para PF e PJ fora do lucro real. A alíquota de 25% para país com tributação favorecida NÃO está no art. 9º — não foi confirmada.' },
    { id: 'IN_RFB_2296_2025', calcs: ['jcp'], norma: 'Instrução Normativa RFB', numero: '2.296/2025 (de 4/12/2025)', artigo: '(a conferir)', assunto: 'Base do JCP: na conta de lucros acumulados entram só os lucros de exercícios anteriores, já encerrados e incorporados ao patrimônio líquido; o lucro do exercício corrente fica fora da base', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.gov.br/receitafederal', ultima_verificacao: '2026-10-20 (fonte secundária)', obs: V_SEC + '. A Econet não detalhou as demais contas do PL.' },
    { id: 'TJLP_BCB', calcs: ['jcp'], norma: 'Taxa de Juros de Longo Prazo — série SGS 256 do Banco Central (api.bcb.gov.br)', numero: '2025: 7,97% / 8,65% / 8,96% / 9,07%; 2026: 9,19% / 9,13% / 9,14% / 9,29% (1º ao 4º trimestre, % a.a.)', artigo: '—', assunto: 'TJLP trimestral usada na base do JCP', vig_ini: '2025-01-01', vig_fim: '2026-12-31', fonte: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.256/dados?formato=json', ultima_verificacao: '2026-10-20 (fonte oficial) (API do Banco Central, consultada em 20/10/2026)', obs: 'Valores lidos diretamente da série oficial do Banco Central. O 2º trimestre/2026 também consta no Comunicado BCB nº 44.994.' },
    { id: 'CF_155', calcs: ['itcmd'], norma: 'Constituição Federal', numero: '1988', artigo: 'art. 155', assunto: 'Competência estadual do ITCMD e regras de competência territorial', vig_ini: '1988-10-05', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR },
    { id: 'LC_227_2026', calcs: ['itcmd'], norma: 'Lei Complementar', numero: '227/2026', artigo: '(a conferir)', assunto: 'Normas gerais do ITCMD; alíquotas progressivas pelo valor do quinhão/legado/doação (limite máximo fixado pelo Senado); avaliação de participações societárias não negociadas em mercado organizado', vig_ini: '2026-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR + '. O valor efetivamente usado respeita a legislação ESTADUAL vigente na data do fato gerador.' },
    { id: 'SP_LEI_10705_2000', calcs: ['itcmd'], uf: 'SP', norma: 'Lei Estadual (SP)', numero: '10.705/2000', artigo: 'art. 6º, II, "a" (isenção de doação até 2.500 UFESPs); art. 16 (alíquota de 4%)', assunto: 'ITCMD paulista', vig_ini: '2001-01-01', vig_fim: null, fonte: 'https://legislacao.fazenda.sp.gov.br', ultima_verificacao: '2026-10-20 (Resposta à Consulta 33778/2026 da SEFAZ-SP)', obs: 'Artigos citados pela própria SEFAZ-SP na Resposta à Consulta Tributária 33778/2026.' },
    { id: 'SP_DEC_46655_2002', calcs: ['itcmd'], uf: 'SP', norma: 'Decreto Estadual (SP)', numero: '46.655/2002', artigo: 'art. 12, § 3º (doações sucessivas somadas no ano civil)', assunto: 'Regulamento do ITCMD paulista', vig_ini: '2002-04-01', vig_fim: null, fonte: 'https://legislacao.fazenda.sp.gov.br', ultima_verificacao: '2026-10-20 (Resposta à Consulta 33778/2026 da SEFAZ-SP)', obs: 'Também: a doação isenta continua com obrigação de declarar (Portaria CAT 15/2003, arts. 12-A e 18). A resposta oficial NÃO diz se, ultrapassado o limite, o imposto incide só sobre a doação atual ou sobre o acumulado; fonte secundária diz que incide sobre o total — conferir.' },
    { id: 'SP_UFESP_2026', calcs: ['itcmd'], uf: 'SP', norma: 'Comunicado DICAR nº 88, de 17/12/2025 (DOE 18/12/2025)', numero: '88/2025', artigo: '—', assunto: 'UFESP de 1º/1 a 31/12/2026 = R$ 38,42 (limite de isenção de doação: 2.500 UFESPs = R$ 96.050,00)', vig_ini: '2026-01-01', vig_fim: '2026-12-31', fonte: 'https://legislacao.fazenda.sp.gov.br/Paginas/Comunicado-DICAR-88-de-2025.aspx', ultima_verificacao: '2026-10-20 (site oficial da Fazenda de SP)', obs: 'Valor lido no próprio comunicado da Secretaria da Fazenda de SP.' },
    { id: 'LEI_8981_1995', calcs: ['mutuo'], norma: 'Lei', numero: '8.981/1995', artigo: '(a conferir)', assunto: 'Retenção na fonte sobre rendimentos (tabela regressiva por prazo)', vig_ini: '1995-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: V_USR + ' — o conjunto regressivo 22,5/20/17,5/15% foi informado sem citar o artigo.' },
    { id: 'IOF_CREDITO', calcs: ['mutuo'], norma: 'Decreto 6.306/2007 (Regulamento do IOF), art. 7º, I, "b", VI, §§ 1º, 15, com a redação do Decreto 12.499/2025', numero: '6.306/2007; 12.499/2025 (11/6/2025)', artigo: 'art. 7º, I "b" (principal definido: 0,0082% ao dia para PJ e PF); VI (Simples/MEI, operação até R$ 30.000: 0,00274% ao dia); § 1º (limite de 365 dias); § 15 (adicional de 0,38%, qualquer prazo)', assunto: 'IOF-crédito: alíquota diária × principal × dias (máximo 365) + adicional de 0,38% sobre o principal', vig_ini: '2025-06-11', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm', ultima_verificacao: '2026-10-20 (texto oficial do Planalto / página da Receita Federal)', obs: 'Texto consolidado lido no Planalto. SITUAÇÃO JURÍDICA: o Decreto Legislativo 176/2025 sustou os decretos 12.466 e 12.499; o STF, em medida CAUTELAR na ADC 96 (16/7/2025), restabeleceu a eficácia do Decreto 12.499 retroativamente a 11/6/2025 (exceto risco sacado/forfait) — fonte secundária para o conteúdo da decisão; nenhum decreto de 2026 alterando as alíquotas foi localizado. Pode mudar com o julgamento de mérito.' },
    { id: 'LEI_9779_13', calcs: ['mutuo'], norma: 'Lei', numero: '9.779/1999', artigo: 'art. 13, caput e §§ 1º a 3º', assunto: 'Mútuo entre pessoas jurídicas ou entre pessoa jurídica e pessoa física sujeita-se ao IOF como as operações de instituições financeiras; fato gerador na concessão do crédito; responsável pela cobrança e recolhimento é a PESSOA JURÍDICA que concede o crédito; recolhimento até o 3º dia útil da semana seguinte', vig_ini: '1999-01-01', vig_fim: null, fonte: 'https://www.planalto.gov.br/ccivil_03/leis/l9779.htm', ultima_verificacao: '2026-10-20 (texto oficial do Planalto / página da Receita Federal)', obs: 'Texto lido no Planalto. O caput fala em mútuo "entre pessoa jurídica e pessoa física" (nos dois sentidos), mas o § 2º só nomeia como responsável a PJ que concede o crédito — por isso mútuo concedido por PF a PJ fica SEM IOF automático nesta calculadora (conforme a regra informada pelo usuário); a leitura literal do caput é ambígua.' },
    { id: 'CLT_RESCISAO', calcs: ['ferias', 'decimo_terceiro', 'rescisao'], norma: 'CLT e legislação complementar', numero: 'Decreto-Lei 5.452/1943; Lei 4.090/1962 (13º); Lei 8.036/1990 (FGTS); Lei 12.506/2011 (aviso prévio)', artigo: '(a conferir por rubrica)', assunto: 'Verbas rescisórias, férias, 13º, aviso prévio proporcional, FGTS e multa', vig_ini: null, vig_fim: null, fonte: 'https://www.planalto.gov.br', ultima_verificacao: null, obs: 'Matriz de incidência da rescisão cadastrada como versão inicial — conferir cada rubrica antes de usar.' },
    { id: 'PLR_TABELA', calcs: ['plr'], norma: 'Lei 10.101/2000, art. 3º, §§ 5º a 11 e Anexo — tabela anual reajustada; valores publicados pela Receita Federal', numero: '10.101/2000 (redação da Lei 12.832/2013)', artigo: 'art. 3º, § 5º (tributação exclusiva na fonte, em separado, no ano do recebimento, pela tabela anual do Anexo); § 7º (mais de uma parcela: recalcula pelo total do ano e deduz o já retido); § 8º e 9º (pagamento acumulado de mais de um ano); § 10 (pensão alimentícia judicial dedutível da base); § 11 (tabela reajustada pelo mesmo percentual da tabela mensal)', assunto: 'PLR: tabela anual — a partir de maio/2025: isento até R$ 8.214,40; 7,5% (R$ 616,08) até 9.922,28; 15% (R$ 1.360,25) até 13.167,00; 22,5% (R$ 2.347,78) até 16.380,38; 27,5% (R$ 3.166,80) acima. De janeiro a abril/2025: isento até 7.640,80, parcelas 573,06 / 1.317,23 / 2.304,76 / 3.123,78', vig_ini: '2025-01-01', vig_fim: null, fonte: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026', ultima_verificacao: '2026-10-20 (texto oficial do Planalto / página da Receita Federal)', obs: 'Lei lida no Planalto; valores lidos na página "Tabelas" (2026) da Receita Federal, que ainda traz "a partir de maio de 2025" como a tabela vigente. Anos anteriores a 2025 NÃO estão cadastrados. Os valores seguem a tabela mensal do IRPF: quando ela mudar, cadastre nova versão.' },
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
        redutor_aplica_13: P(true, 'bool', 'A redução também se aplica ao imposto exclusivo na fonte do 13º salário (Lei 9.250, art. 3º-A, § 3º, incluído pela Lei 15.270/2025)'),
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
      id: 'JCP_IRRF_ATE_2025', calculator_key: 'jcp_irrf', valid_from: '1996-01-01', valid_to: '2025-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (conferido em fonte secundária)',
      bases: ['LEI_9249_JCP'],
      params: { aliquota: P('0.15', 'taxa', 'IRRF sobre o JCP até 31/12/2025'), aliquota_paraiso: P('0.25', 'taxa', 'NÃO CONFIRMADA em norma (não consta no art. 9º da Lei 9.249) — conferir antes de usar') },
    },
    {
      id: 'JCP_IRRF_2026', calculator_key: 'jcp_irrf', valid_from: '2026-01-01', valid_to: null, version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (conferido em fonte secundária)',
      bases: ['LC_224_JCP'],
      params: { aliquota: P('0.175', 'taxa', 'IRRF sobre o JCP a partir de 1º/1/2026 (LC 224/2025)'), aliquota_paraiso: P('0.25', 'taxa', 'NÃO CONFIRMADA em norma (não consta no art. 9º da Lei 9.249) — conferir antes de usar') },
    },
    {
      id: 'JCP_BASE_2025', calculator_key: 'jcp_base', valid_from: '2025-01-01', valid_to: '2025-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (TJLP oficial do Banco Central)',
      bases: ['LEI_9249_JCP', 'TJLP_BCB'],
      params: {
        tjlp_trimestres: P({ '2025-1': '0.0797', '2025-2': '0.0865', '2025-3': '0.0896', '2025-4': '0.0907' }, '% a.a. (decimal)', 'TJLP por trimestre — série SGS 256 do Banco Central, lida em 20/10/2026'),
        divisor_dias_ano: P(365, 'dias', 'TJLP aplicada pro rata dia = taxa × dias/365. O divisor NÃO consta na lei — confira'),
        limite_pct: P('0.5', 'taxa', 'Dedução limitada a 50% do lucro (antes da dedução dos juros) ou 50% de lucros acumulados + reservas de lucros (o maior) — Lei 9.249, art. 9º, § 1º'),
        aliquota_irpj: P('0.15', 'taxa', 'IRPJ — usado só na economia fiscal estimada (sem o adicional de 10%)'),
        aliquota_csll: P('0.09', 'taxa', 'CSLL — usado só na economia fiscal estimada'),
      },
    },
    {
      id: 'JCP_BASE_2026', calculator_key: 'jcp_base', valid_from: '2026-01-01', valid_to: '2026-12-31', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (conferido em fonte secundária)',
      bases: ['LEI_9249_JCP', 'IN_RFB_2296_2025', 'TJLP_BCB'],
      params: {
        tjlp_trimestres: P({ '2026-1': '0.0919', '2026-2': '0.0913', '2026-3': '0.0914', '2026-4': '0.0929' }, '% a.a. (decimal)', 'TJLP por trimestre — série SGS 256 do Banco Central, lida em 20/10/2026'),
        divisor_dias_ano: P(365, 'dias', 'TJLP aplicada pro rata dia = taxa × dias/365. O divisor NÃO foi confirmado em norma — confira'),
        limite_pct: P('0.5', 'taxa', 'Dedução limitada a 50% do lucro do período ou 50% de lucros acumulados + reservas de lucros (o maior)'),
        aliquota_irpj: P('0.15', 'taxa', 'IRPJ — usado só na economia fiscal estimada (sem o adicional de 10%)'),
        aliquota_csll: P('0.09', 'taxa', 'CSLL — usado só na economia fiscal estimada'),
      },
    },
    {
      id: 'IOF_CREDITO_2025_06', calculator_key: 'iof_credito', valid_from: '2025-06-11', valid_to: null, version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (Decreto 6.306/2007 consolidado no Planalto)',
      bases: ['IOF_CREDITO', 'LEI_9779_13'],
      params: {
        taxa_diaria: P('0.000082', 'taxa/dia', 'Mutuário pessoa jurídica, principal definido: 0,0082% ao dia (art. 7º, I, "b", 1 — redação do Decreto 12.499/2025)'),
        taxa_diaria_pf: P('0.000082', 'taxa/dia', 'Mutuário pessoa física, principal definido: 0,0082% ao dia (art. 7º, I, "b", 2)'),
        taxa_diaria_simples: P('0.0000274', 'taxa/dia', 'Mutuário optante pelo Simples Nacional/MEI, operação de até R$ 30.000 (art. 7º, VI): 0,00274% ao dia'),
        limite_simples: P('30000.00', 'R$', 'Valor máximo da operação para a taxa reduzida do Simples/MEI'),
        adicional: P('0.0038', 'taxa', 'Alíquota adicional de 0,38% sobre o principal, independentemente do prazo (art. 7º, § 15)'),
        limite_dias: P(365, 'dias', 'O IOF não excede a alíquota diária × principal × 365 dias, mais o adicional (art. 7º, § 1º)'),
      },
    },
    {
      id: 'DIST_LUCROS_2026', calculator_key: 'dist_lucros', valid_from: '2026-01-01', valid_to: null, version: 1, status: 'ativo', created_at: '2026-10-22', created_by: 'seed (texto oficial da Lei 15.270/2025)',
      bases: ['LEI_9250_6A', 'LEI_9249_10'],
      params: {
        limite_mensal: P('50000.00', 'R$', 'Montante mensal, por pagador e por beneficiário, ACIMA do qual há retenção (Lei 9.250, art. 6º-A, caput). Até R$ 50.000,00 no mês: sem retenção'),
        aliquota: P('0.10', 'taxa', 'IRRF de 10% sobre o TOTAL pago no mês, sem deduções (art. 6º-A, caput e § 1º)'),
        aliquota_exterior: P('0.10', 'taxa', 'Lucros/dividendos remetidos ao exterior: 10% (Lei 9.249, art. 10, § 4º), sem piso mensal'),
        isenta_compoe_limite: P(false, 'bool', 'A parcela isenta do § 3º conta para o teste de R$ 50.000 no mês? A lei não diz; adotado NÃO — conferir na IN RFB 2.299/2025'),
      },
    },
    {
      id: 'PLR_ATE_ABR_2025', calculator_key: 'plr', valid_from: '2025-01-01', valid_to: '2025-04-30', version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (tabela da Receita Federal)',
      bases: ['PLR_TABELA'],
      params: { faixas: P([{ ate: '7640.80', aliq: '0', ded: '0' }, { ate: '9922.28', aliq: '0.075', ded: '573.06' }, { ate: '13167.00', aliq: '0.15', ded: '1317.23' }, { ate: '16380.38', aliq: '0.225', ded: '2304.76' }, { ate: null, aliq: '0.275', ded: '3123.78' }], 'R$ / taxa', 'Tabela anual da PLR — janeiro a abril de 2025') },
    },
    {
      id: 'PLR_2025_05', calculator_key: 'plr', valid_from: '2025-05-01', valid_to: null, version: 1, status: 'ativo', created_at: NOW0, created_by: 'seed (tabela da Receita Federal)',
      bases: ['PLR_TABELA'],
      params: { faixas: P([{ ate: '8214.40', aliq: '0', ded: '0' }, { ate: '9922.28', aliq: '0.075', ded: '616.08' }, { ate: '13167.00', aliq: '0.15', ded: '1360.25' }, { ate: '16380.38', aliq: '0.225', ded: '2347.78' }, { ate: null, aliq: '0.275', ded: '3166.80' }], 'R$ / taxa', 'Tabela anual da PLR — a partir de maio de 2025 (vigente em 2026 segundo a Receita)') },
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
    // IN RFB 2.305/2025, art. 15 (redação da IN 2.306/2026): limite proporcional de R$ 1.250.000 por trimestre (§ 2º); sobra dos trimestres anteriores pode ser considerada (§ 4º);
    // no 4º trimestre verifica-se o limite anual com a receita acumulada (§ 5º, I a III); início/encerramento de atividade: limite anual proporcional aos trimestres em atividade (§ 9º).
    function limitePara(tipo) {
      const desde = tipo === 'irpj' ? iDesde : cDesde; const maj = tipo === 'irpj' ? majIRPJ : majCSLL;
      const o = { maj, E: 0, disp: lim, nota: [] };
      if (!maj) return o;
      const firstQ = ano > desde.ano ? 1 : desde.trimestre;
      const nAtiv = inp.trimestresAtividade ? parseInt(inp.trimestresAtividade, 10) : (5 - firstQ); const AL = nAtiv * lim;
      const prior = []; let faltam = false;
      for (let q = firstQ; q < tri; q++) { const v = (inp.receitasAnteriores || [])[q - 1]; if (v === undefined || v === null || v === '') { faltam = true; prior.push(null); } else prior.push(cents(v)); }
      const comp = !!inp.compensarSobraLimite && !faltam;
      let pool = 0; const Ek = [];
      prior.forEach(R => { if (R === null) { Ek.push(null); return; } const av = lim + (comp ? pool : 0); Ek.push(max0(R - av)); pool = comp ? max0(av - R) : 0; });
      o.disp = lim + (comp ? pool : 0); o.comp = comp; o.pool = comp ? pool : 0; o.AL = AL; o.nAtiv = nAtiv;
      let E = max0(recTot - o.disp);
      if (tri === 4) {
        if (faltam) o.nota.push('4º trimestre: informe a receita bruta dos trimestres anteriores para aplicar o ajuste anual do art. 15, § 5º (sem isso foi aplicado só o limite do trimestre).');
        else {
          const A = prior.reduce((x, v) => x + v, 0) + recTot, AE = max0(A - AL), S = Ek.reduce((x, v) => x + v, 0);
          o.q4 = { A, AL, AE, S, Ek, prior };
          if (A < AL) { o.caso = 'I'; E = 0; } else if (AE < S) { o.caso = 'II'; E = 0; } else { o.caso = 'III'; E = Math.min(E, AE - S); }
        }
      }
      o.E = Math.min(E, recTot); return o;
    }
    const lI = limitePara('irpj'), lC = limitePara('csll');
    function distribui(tipo, E) {
      const limTot = recTot - E; let usados = 0;
      itens.forEach(i => { i['lim_' + tipo] = Math.min(i.rec, mulC(limTot, Q(i.rec, recTot))); usados += i['lim_' + tipo]; });
      const resto = limTot - usados;
      if (resto !== 0) { const maior = itens.slice().sort((x, y) => y.rec - x.rec)[0]; maior['lim_' + tipo] = Math.max(0, Math.min(maior.rec, maior['lim_' + tipo] + resto)); }
      itens.forEach(i => { i['exc_' + tipo] = i.rec - i['lim_' + tipo]; });
    }
    distribui('irpj', lI.E); distribui('csll', lC.E);

    mem.t('Receita bruta do trimestre'); itens.forEach(i => mem.l(i.nome, i.rec, '+')); mem.s('Receita sujeita aos coeficientes de presunção', recTot);
    mem.t('Limite da majoração (IN RFB 2.305/2025, art. 15) — por TRIMESTRE, não mensal');
    mem.l('Limite proporcional do trimestre (R$ 5.000.000,00 ÷ 4)', lim);
    function memLimite(rot, L) {
      if (!L.maj) { mem.txt(rot, 'sem majoração neste trimestre'); return; }
      if (L.comp) { mem.l(rot + ' — sobra de limite dos trimestres anteriores (art. 15, § 4º)', L.pool, '+'); }
      mem.l(rot + ' — limite disponível no trimestre', L.disp);
      mem.txt(rot + ' — receita do trimestre', recTot > L.disp ? 'acima do limite em ' + brl(recTot - L.disp) : 'dentro do limite');
      if (L.q4) {
        mem.n(rot + ' — 4º trimestre (art. 15, § 5º): receita acumulada ' + brl(L.q4.A) + '; limite anual (' + L.nAtiv + ' trimestre(s) em atividade × ' + brl(lim) + ') ' + brl(L.q4.AL) + '; parcela excedente anual ' + brl(L.q4.AE) + '; soma das parcelas excedentes dos trimestres anteriores ' + brl(L.q4.S) + '.');
        if (L.caso === 'I') mem.n(rot + ' — hipótese I (receita acumulada inferior ao limite anual): NÃO incide o acréscimo de 10% no 4º trimestre.');
        if (L.caso === 'II') mem.n(rot + ' — hipótese II (excedente anual menor que a soma dos excedentes anteriores): NÃO incide o acréscimo no 4º trimestre.');
        if (L.caso === 'III') mem.n(rot + ' — hipótese III (excedente anual maior): a parcela excedente do 4º trimestre fica limitada a ' + brl(Math.min(max0(recTot - L.disp), max0(L.q4.AE - L.q4.S))) + '.');
      }
      L.nota.forEach(n => mem.n(n));
    }
    memLimite('IRPJ', lI);
    if (JSON.stringify([lC.E, lC.disp, lC.caso]) !== JSON.stringify([lI.E, lI.disp, lI.caso]) || lC.maj !== lI.maj) memLimite('CSLL', lC);
    if (itens.length > 1 && (lI.E > 0 || lC.E > 0)) { mem.n('Mais de uma atividade (art. 15, § 6º): o limite é distribuído pela participação de cada atividade na receita do trimestre.'); itens.forEach(i => mem.l('Limite da atividade ' + i.nome + ' (' + (i.rec * 100 / recTot).toFixed(2).replace('.', ',') + '%)', i.lim_irpj)); }
    // avisos sobre o ajuste do 4º trimestre que a calculadora NÃO faz (recálculo dos trimestres anteriores)
    [['IRPJ', lI], ['CSLL', lC]].forEach(([rot, L]) => {
      if (L.caso === 'I' && L.q4.S > 0) avisos.push(rot + ' — art. 15, § 5º, I, b: a empresa PODE recalcular os trimestres anteriores sem o acréscimo de 10% (parcelas excedentes somadas: ' + brl(L.q4.S) + ') e deduzir a diferença do ' + rot + ' do 4º trimestre. Esse recálculo exige os dados de cada trimestre e NÃO foi feito aqui.');
      if (L.caso === 'II') { const adj = L.q4.Ek.map((E, i) => E === null ? null : (L.q4.S > 0 ? qRound(qMul(Q(E, L.q4.S), Q(L.q4.AE))) : 0)); avisos.push(rot + ' — art. 15, § 5º, II, b: a empresa PODE recalcular os trimestres anteriores com parcela excedente proporcional (' + adj.map((v, i) => v === null ? '' : (i + 1) + 'º tri: ' + brl(v)).filter(Boolean).join('; ') + ', em vez de ' + L.q4.Ek.map((v, i) => v === null ? '' : (i + 1) + 'º tri: ' + brl(v)).filter(Boolean).join('; ') + ') e deduzir a diferença do 4º trimestre. Esse recálculo NÃO foi feito aqui.'); }
    });

    function base(tipo, maj) {
      const L = []; let total = Q(0);
      itens.forEach(i => {
        const normal = tipo === 'irpj' ? i.pi : i.pc; const majorada = qMul(normal, qAdd(Q(1), acr));
        const parteNormal = mulQ(maj ? i['lim_' + tipo] : i.rec, normal); total = qAdd(total, parteNormal);
        L.push({ r: i.nome + ' — ' + brl(maj ? i['lim_' + tipo] : i.rec) + ' × ' + (tipo === 'irpj' ? i.piTxt : i.pcTxt).replace('.', ',') + '%', v: qRound(parteNormal) });
        if (maj && i['exc_' + tipo] > 0) { const pm = mulQ(i['exc_' + tipo], majorada); total = qAdd(total, pm); const pctM = qRound(qMul(majorada, Q(10000))); L.push({ r: i.nome + ' (excedente) — ' + brl(i['exc_' + tipo]) + ' × ' + (pctM / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%', v: qRound(pm) }); }
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
    if (majIRPJ || majCSLL) avisos.push('Há liminares individuais na Justiça Federal e ADIs no STF (7920, 7936, 7944, 7982) contestando a majoração de 10%. O cálculo aplica a lei em vigor; se a empresa tem decisão favorável, a base muda — confira o andamento.');
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
      if (ant > 0) { const alt = mulC(acum, aliq); mem.n('ATENÇÃO — se o imposto incidir sobre o TOTAL acumulado no ano (' + brl(acum) + ' × alíquota), o valor seria ' + brl(alt) + ' (diferença de ' + brl(alt - itcmd) + ').'); avisos.push('Doações sucessivas: o acumulado do ano ultrapassou o limite. A calculadora aplica a alíquota sobre a doação atual. A resposta oficial da SEFAZ-SP (Consulta 33778/2026) não esclarece se o imposto incide só sobre esta doação ou sobre o acumulado, e fonte secundária diz que é sobre o total — a memória mostra o valor alternativo.'); } }
    Object.assign(out, { itcmd, situacao, base: baseTrib, isencao_limite: limIsen, acumulado: acum, aliquota: pv(set, 'aliquota') });
    return { ok: true, resultado: out, memoria: mem.L, parametros: [refSet(set)], bases: basesDe([set]), avisos };
  }

  // ───────────────────────────── Mútuo / IOF / juros / IRRF ─────────────────────────────
  function diasEntre(a, b) { const d1 = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10)), d2 = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)); return Math.round((d2 - d1) / 864e5); }
  // soma meses a uma data AAAA-MM-DD mantendo o dia (dia 31 em mês curto → último dia do mês)
  function somaMeses(iso, n) { const a = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1, d = +iso.slice(8, 10); const t = m + n, ano = a + Math.floor(t / 12), mes = ((t % 12) + 12) % 12; const ult = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate(); return ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(Math.min(d, ult)).padStart(2, '0'); }
  function calcMutuo(inp) {
    // Pedido do usuário 22/10/2026: nº de parcelas e data de vencimento OPCIONAIS. Sem vencimento (e sem parcelas) = prazo indeterminado → IOF por 365 dias sobre o principal (Decreto 6.306, art. 7º, § 14).
    // Com N parcelas (N ≥ 2): principal dividido em N partes iguais (resto de centavos na última), vencimentos MENSAIS a partir da data informada (1ª parcela); IOF = Σ principal da parcela × alíquota diária × dias da liberação ao vencimento de cada uma (art. 7º, I, "b": "o valor do principal de cada uma das parcelas"), até 365 dias (§ 1º), + adicional de 0,38% uma vez sobre o principal.
    const ini = String(inp.dataLiberacao || '').slice(0, 10), fimRaw = String(inp.dataVencimento || '').slice(0, 10);
    const temFim = /^\d{4}-\d{2}-\d{2}$/.test(fimRaw), fim = temFim ? fimRaw : '';
    const nParc = (inp.numParcelas === undefined || inp.numParcelas === null || String(inp.numParcelas).trim() === '') ? 1 : parseInt(inp.numParcelas, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ini)) return ERR('Informe a data de liberação.');
    if (temFim && fim < ini) return ERR('A data de vencimento não pode ser anterior à data de liberação.');
    if (!(nParc >= 1 && nParc <= 360)) return ERR('Número de parcelas inválido (use de 1 a 360, ou deixe vazio para pagamento único).');
    if (nParc > 1 && !temFim) return ERR('Para mais de uma parcela, informe a data de vencimento da 1ª parcela (as demais vencem mês a mês).');
    const indeterminado = !temFim, parcelado = nParc > 1;
    const principal = cents(inp.principal), mem = Mem(), avisos = [], sets = [];
    const dias = temFim ? diasEntre(ini, fim) : null; const mutuante = inp.mutuante, mutuario = inp.mutuario;
    let juros = cents(inp.valorJuros);
    if (!juros && inp.taxaJuros) { juros = mulC(principal, pct(inp.taxaJuros)); }
    mem.t('Operação'); mem.l('Principal', principal);
    if (indeterminado) mem.txt('Prazo', 'indeterminado (sem data de vencimento) — o IOF usa 365 dias (art. 7º, § 14)');
    else if (parcelado) mem.txt('Pagamento', nParc + ' parcelas mensais de principal; 1ª em ' + fim.split('-').reverse().join('/') + ' (' + dias + ' dias da liberação)');
    else mem.i('Prazo (dias corridos)', dias);
    mem.l('Juros', juros);
    mem.txt('Mutuante → Mutuário', mutuante + ' → ' + mutuario + (inp.mesmoGrupo ? ' (mesmo grupo econômico)' : ''));
    if (inp.mesmoGrupo) mem.n('Pertencer ao mesmo grupo econômico NÃO dispensa o IOF automaticamente.');
    if (mutuante === 'PF' && mutuario === 'PF') return ERR('Mútuo PF → PF: tratar em módulo próprio conforme a natureza da operação.');
    let iofC = null, iofMsg = '', detParc = [];
    // IOF — só quando o mutuante é PJ (PJ→PJ e PJ→PF)
    if (mutuante === 'PJ') {
      if (inp.contaCorrente) iofMsg = 'Conta corrente: o IOF depende do saldo devedor diário — não calculado por esta versão.';
      else {
        const sIof = acharSet('iof_credito', ini);
        if (!sIof) iofMsg = 'IOF: ' + ERRO_PARAM + ' (o IOF só está cadastrado a partir de 11/06/2025; antes dessa data cadastre o conjunto "iof_credito" em Bases Legais).';
        else {
          sets.push(sIof);
          if (inp.principalDefinido === false) iofMsg = 'IOF com principal NÃO definido (soma dos saldos devedores diários): não suportado nesta versão.';
          else {
            const limS = pv(sIof, 'limite_simples') !== undefined ? cents(pv(sIof, 'limite_simples')) : null;
            const usaSimples = !!inp.mutuarioSimples && mutuario === 'PJ' && pv(sIof, 'taxa_diaria_simples') !== undefined && limS !== null && principal <= limS;
            const chave = usaSimples ? 'taxa_diaria_simples' : (mutuario === 'PF' && pv(sIof, 'taxa_diaria_pf') !== undefined ? 'taxa_diaria_pf' : 'taxa_diaria');
            const taxa = dec(pv(sIof, chave)), adic = dec(pv(sIof, 'adicional') || '0'), limDias = parseInt(pv(sIof, 'limite_dias') || 365, 10);
            const dt = indeterminado ? limDias : Math.min(dias, limDias);
            mem.t('IOF (conjunto ' + sIof.id + ' v' + sIof.version + ')');
            mem.txt('Alíquota diária aplicada', (Number(pv(sIof, chave)) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 5 }) + '% ao dia' + (usaSimples ? ' (Simples/MEI, operação até ' + brl(limS) + ')' : (mutuario === 'PF' ? ' (mutuário pessoa física)' : ' (mutuário pessoa jurídica)')));
            if (inp.mutuarioSimples && !usaSimples) mem.n('Taxa reduzida do Simples não aplicada: ' + (mutuario !== 'PJ' ? 'mutuário não é PJ.' : 'a operação passa de ' + brl(limS || 0) + '.'));
            let diario;
            if (parcelado) {
              // parcelas iguais de principal; o resto de centavos fica na última; um único arredondamento no total do IOF diário
              const base = Math.floor(principal / nParc), resto = principal - base * nParc; let acc = Q(0); detParc = [];
              for (let i = 1; i <= nParc; i++) {
                const pP = base + (i === nParc ? resto : 0), ven = somaMeses(fim, i - 1), dd = diasEntre(ini, ven), dtI = Math.min(dd, limDias);
                const exato = qMul(mulQ(pP, taxa), Q(dtI)); acc = qAdd(acc, exato);
                detParc.push({ n: i, vencimento: ven, dias: dd, dias_tributaveis: dtI, principal: pP, iof_diario: qRound(exato) });
              }
              diario = qRound(acc);
              mem.t('IOF por parcela de principal (' + nParc + ' parcelas — art. 7º, I, "b")');
              detParc.forEach(p => mem.l('Parcela ' + p.n + ' — vence ' + p.vencimento.split('-').reverse().join('/') + ': ' + brl(p.principal) + ' × alíquota × ' + p.dias_tributaveis + ' dias' + (p.dias > limDias ? ' (limitado a ' + limDias + ')' : ''), p.iof_diario, '+'));
              mem.s('IOF diário total (soma exata das parcelas, arredondada uma só vez)', diario);
              mem.n('Principal dividido em ' + nParc + ' partes iguais (resto de centavos na última) e vencimentos mensais — premissa da calculadora; se o contrato tiver outra distribuição, o IOF muda.');
            } else {
              diario = qRound(qMul(mulQ(principal, taxa), Q(dt)));
              mem.l('Principal × alíquota diária × ' + dt + ' dias tributáveis (limite de ' + limDias + ' dias)' + (indeterminado ? ' — prazo indeterminado (§ 14)' : ''), diario, '×');
            }
            const ad = mulC(principal, adic); mem.l('(+) Adicional de ' + (Number(pv(sIof, 'adicional')) * 100).toLocaleString('pt-BR') + '% sobre o principal', ad, '+');
            iofC = diario + ad; mem.tot('IOF', iofC);
            avisos.push(parcelado ? 'IOF calculado por parcela de principal (art. 7º, I, "b"), com principal dividido em partes iguais e vencimentos mensais. Liberação do crédito em parcelas (art. 7º, IV) não é calculada aqui.' : (indeterminado ? 'Sem data de vencimento: IOF calculado por 365 dias sobre o principal (art. 7º, § 14, prazo indeterminado com principal definido); o IRRF sobre juros exige o prazo e não foi calculado.' : 'IOF calculado para pagamento em parcela única com principal definido. Para pagamento em várias parcelas informe o número de parcelas; liberação do crédito em parcelas (art. 7º, IV) não é calculada aqui.'));
            avisos.push('As alíquotas vigentes decorrem do Decreto 12.499/2025, restabelecido por MEDIDA CAUTELAR do STF (ADC 96); o julgamento de mérito pode mudar o quadro.');
            avisos.push('O IOF é recolhido pela pessoa jurídica que concede o crédito, até o 3º dia útil da semana seguinte à concessão (Lei 9.779/1999, art. 13, § 3º).');
          }
        }
      }
    } else { mem.n('Mutuante PF: não há pessoa jurídica concedente para ser responsável pelo IOF (Lei 9.779/1999, art. 13, § 2º) — sem IOF automático.'); avisos.push('Mútuo concedido por pessoa física: o caput do art. 13 da Lei 9.779/1999 cita mútuo "entre pessoa jurídica e pessoa física" sem distinguir o sentido; esta calculadora segue a regra informada (sem IOF automático). Confirme o entendimento da Receita para o seu caso.'); }
    // IRRF sobre os JUROS (nunca sobre o principal) quando o mutuário PJ paga juros
    let irrfC = null;
    if (mutuario === 'PJ' && juros > 0 && (indeterminado || parcelado)) avisos.push('IRRF sobre juros NÃO calculado: ' + (parcelado ? 'com várias parcelas a lei não define como os juros se distribuem entre elas (a alíquota depende do prazo de cada pagamento).' : 'sem data de vencimento não há prazo para a tabela regressiva.'));
    else if (mutuario === 'PJ' && juros > 0) {
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
    return { ok: true, resultado: { dias, juros, iof: iofC, irrf_juros: irrfC, parcelas: nParc, parcelasDetalhe: detParc }, memoria: mem.L, parametros: sets.map(refSet), bases: basesDe(sets).concat(CALC_BASES.filter(b => b.id === 'IOF_CREDITO' && !sets.some(s => s.calculator_key === 'iof_credito'))), avisos };
  }

  // ───────────────────────────── PLR (tabela exclusiva, versionada) ─────────────────────────────
  function calcPLR(inp) {
    const d = data1(inp.competencia); const set = acharSet('plr', d);
    if (!set) return ERR(ERRO_PARAM, { detalhe: 'PLR — tabela de tributação exclusiva não cadastrada para ' + d.slice(0, 7) + '. Cadastre em Bases Legais → Cadastrar parâmetros.' });
    const mem = Mem(); const brutoAno = cents(inp.plrAnterior) + cents(inp.plrAtual); const pensPLR = cents(inp.pensaoPLR); const total = max0(brutoAno - pensPLR); const jaRet = cents(inp.irJaRetido);
    mem.t('PLR — tributação exclusiva (tabela do conjunto ' + set.id + ' v' + set.version + ')'); mem.l('PLR anterior no ano', cents(inp.plrAnterior), '+'); mem.l('PLR atual', cents(inp.plrAtual), '+'); mem.l('(−) Pensão alimentícia judicial correspondente à PLR (art. 3º, § 10)', pensPLR, '−'); mem.s('Base: total da PLR no ano (as parcelas do ano são somadas — § 7º)', total);
    const fx = pv(set, 'faixas').find(f => f.ate === null || total <= cents(f.ate));
    const imp = max0(qRound(qSub(mulQ(total, dec(fx.aliq)), Q(cents(fx.ded)))));
    mem.l('Total × alíquota ' + Number(fx.aliq) * 100 + '% − parcela ' + brl(cents(fx.ded)), imp); mem.l('(−) IR já retido', jaRet, '−'); mem.tot('IR a reter agora', max0(imp - jaRet));
    return { ok: true, resultado: { ir: max0(imp - jaRet), imposto_ano: imp, base: total }, memoria: mem.L, parametros: [refSet(set)], bases: basesDe([set]), avisos: ['Tributação exclusiva na fonte, em separado dos demais rendimentos (Lei 10.101, art. 3º, § 5º): não use o redutor mensal da Lei 15.270, que se aplica a rendimentos sujeitos ao ajuste mensal e ao 13º.', 'PLR paga acumuladamente de mais de um ano-calendário (§§ 8º e 9º) tem tratamento próprio — não calculado aqui.', 'A tabela é a vigente na data do pagamento (a Receita ainda divulga a de maio/2025 como atual); se ela mudar, cadastre nova versão.'] };
  }

  // ───────────────────────────── Distribuição de lucros — IRRF 10% (Lei 15.270/2025, art. 6º-A da Lei 9.250) ─────────────────────────────
  // Pedido do usuário 22/10/2026: "faltou o cálculo da distribuição de lucros — isenção até R$ 50 mil pagos líquidos e tributação a partir de um valor maior, com 10% de IRRF".
  // Dois modos: parte do BRUTO a distribuir, ou do LÍQUIDO que o sócio precisa receber (acha o bruto menor que entrega esse líquido).
  function calcDistLucros(inp) {
    const d = data1(inp.competencia); const set = acharSet('dist_lucros', d);
    if (!set) return ERR(ERRO_PARAM, { detalhe: 'Distribuição de lucros — a retenção de 10% existe a partir de janeiro/2026 (Lei 9.250, art. 6º-A); antes disso a distribuição é isenta (Lei 9.249, art. 10, redação anterior), e essa regra antiga não está cadastrada.' });
    const mem = Mem(), benef = inp.beneficiario || 'pf_residente', modo = inp.modo || 'bruto';
    if (!['pf_residente', 'exterior', 'exterior_isento'].includes(benef)) return ERR('Beneficiário inválido.');
    const limite = cents(pv(set, 'limite_mensal')), aliq = dec(pv(set, 'aliquota')), aliqExt = dec(pv(set, 'aliquota_exterior')), isentaCompoe = !!pv(set, 'isenta_compoe_limite');
    const A = benef === 'pf_residente' ? cents(inp.jaPagoMes) : 0, E = benef === 'exterior_isento' ? 0 : cents(inp.parteIsenta);
    const informouRet = inp.irJaRetido !== undefined && inp.irJaRetido !== '' && inp.irJaRetido !== null;
    const jaRet = benef !== 'pf_residente' ? 0 : (informouRet ? cents(inp.irJaRetido) : (A > limite ? mulC(A, aliq) : 0));
    if (A < 0 || E < 0 || jaRet < 0) return ERR('Valores não podem ser negativos.');
    // retenção sobre UM pagamento de bruto B
    const calc = B => {
      const T = max0(B - E);
      if (benef === 'exterior_isento') return { T: 0, teste: 0, devido: 0, retAgora: 0 };
      if (benef === 'exterior') { const dev = mulC(T, aliqExt); return { T, teste: T, devido: dev, retAgora: dev }; }
      const teste = A + T + (isentaCompoe ? E : 0);
      const devido = teste > limite ? mulC(A + T, aliq) : 0;
      return { T, teste, devido, retAgora: max0(devido - jaRet) };
    };
    const maxSemRet = benef !== 'pf_residente' ? null : max0(isentaCompoe ? limite - A : limite - A + E);
    let B;
    if (modo === 'liquido') {
      const N = cents(inp.valorLiquido); if (!(N > 0)) return ERR('Informe o valor líquido que o sócio deve receber.');
      if (benef === 'exterior_isento' || (benef === 'pf_residente' && N <= maxSemRet)) B = N;
      else {
        // líquido = B − retenção(B); retenção linear acima do limite → B = (N + base_extra) ÷ (1 − alíquota); arredonda PARA CIMA e confere
        const a = benef === 'exterior' ? aliqExt : aliq; const den = qSub(Q(1), a);
        const base0 = benef === 'exterior' ? qNeg(mulQ(E, a)) : qSub(mulQ(A - E, a), Q(jaRet));
        const num = qAdd(Q(N), base0), q = qMul(num, Q(den.d, den.n));
        B = q.n <= 0n ? 0 : Number((q.n + q.d - 1n) / q.d);
        for (let i = 0; i < 6 && B - calc(B).retAgora < N; i++) B += 1;
        for (let i = 0; i < 6 && B > 0 && (B - 1) - calc(B - 1).retAgora >= N && (benef !== 'pf_residente' || calc(B - 1).retAgora > 0); i++) B -= 1;
      }
      if (benef === 'pf_residente' && B <= maxSemRet && N > maxSemRet) B = N; // proteção
    } else B = cents(inp.valorBruto);
    if (!(B > 0)) return ERR('Informe o valor a distribuir.');
    if (E > B) return ERR('A parte isenta não pode ser maior que o valor do pagamento.');
    const r = calc(B), liquido = B - r.retAgora;
    mem.t('Distribuição de lucros — retenção na fonte (conjunto ' + set.id + ' v' + set.version + ')');
    if (modo === 'liquido') mem.l('Líquido que o sócio deve receber (informado)', cents(inp.valorLiquido), '+');
    mem.l(modo === 'liquido' ? 'Bruto necessário para entregar esse líquido' : 'Valor bruto deste pagamento', B, '+');
    if (benef === 'exterior_isento') {
      mem.n('Beneficiário no exterior enquadrado no art. 10, § 5º, II (governo estrangeiro com reciprocidade, fundo soberano ou entidade de previdência): sem retenção.');
    } else if (benef === 'exterior') {
      if (E) mem.l('(−) Parte isenta (art. 10, § 5º, I)', E, '−');
      mem.s('Base da retenção (sem piso mensal, sem deduções)', r.T); mem.l('IRRF = ' + (Number(aliqExt.n) * 100 / Number(aliqExt.d)) + '% × base', r.devido);
    } else {
      mem.l('(−) Parte isenta (§ 3º: apurado até 2025, aprovado até 31/12/2025)', E, '−'); mem.s('Parte deste pagamento sujeita ao art. 6º-A', r.T);
      mem.l('(+) Já pago/creditado no mês (mesma empresa → mesma pessoa)', A, '+'); mem.s('Total do mês sujeito ao teste', A + r.T);
      mem.txt('Limite mensal sem retenção', 'R$ ' + brl(limite));
      if (r.teste > limite) {
        mem.n('Total do mês ACIMA de R$ ' + brl(limite) + ': retenção de ' + (Number(aliq.n) * 100 / Number(aliq.d)) + '% sobre o TOTAL do mês (não só sobre o excedente), sem deduções.');
        mem.l('IRRF devido no mês = ' + (Number(aliq.n) * 100 / Number(aliq.d)) + '% × R$ ' + brl(A + r.T), r.devido); mem.l('(−) IRRF já retido no mês' + (informouRet ? '' : ' (calculado pela regra sobre o já pago)'), jaRet, '−');
      } else mem.n('Total do mês até R$ ' + brl(limite) + ': SEM retenção — o sócio recebe o valor integral (líquido = bruto).');
    }
    mem.tot('IRRF A RETER AGORA', r.retAgora); mem.tot('LÍQUIDO AO SÓCIO neste pagamento', liquido);
    const avisos = [];
    if (benef === 'pf_residente') {
      avisos.push('A retenção é de 10% sobre o TOTAL pago no mês, não só sobre o que passa de R$ 50.000 (art. 6º-A, caput e § 1º). Por isso há um "degrau": pagar R$ 50.000,00 entrega R$ 50.000,00 líquidos; pagar R$ 50.000,01 entrega cerca de R$ 45.000,01. O teste é por MÊS, por empresa pagadora e por pessoa.');
      avisos.push('Mais de um pagamento no mês, da mesma empresa à mesma pessoa: a retenção é recalculada pelo total do mês (§ 2º) — informe o já pago e o já retido.');
      avisos.push('Lucros apurados até 2025 e com distribuição aprovada até 31/12/2025 ficam de fora (§ 3º), se exigíveis e pagos nos termos originalmente aprovados — informe só a parte isenta. Adotado: essa parte NÃO conta para o teste de R$ 50.000 (a lei não esclarece; conferir na IN RFB 2.299/2025, que não foi lida no texto oficial).');
      avisos.push('Tributação mínima anual (art. 16-A: rendimentos acima de R$ 600.000/ano) é outra apuração e NÃO é calculada aqui. A Receita entende que a retenção alcança também sócios de empresas do Simples Nacional (fonte secundária; há controvérsia pelo art. 14 da LC 123/2006).');
    } else if (benef === 'exterior') avisos.push('Beneficiário no exterior: 10% sobre o valor total, SEM piso de R$ 50.000 (Lei 9.249, art. 10, § 4º). Isenções do § 5º; crédito opcional do art. 10-A não calculado.');
    return { ok: true, resultado: { bruto: B, ir: r.retAgora, liquido, base: r.T, totalMes: benef === 'pf_residente' ? A + r.T : null, devidoMes: r.devido, folga: maxSemRet }, memoria: mem.L, parametros: [refSet(set)], bases: basesDe([set]), avisos };
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
    return { ok: true, resultado: { bruto, primeira, inss: inss.valor, irrf: ir.valor, segunda, avos }, memoria: mem.L, parametros: [refSet(sI), refSet(ir.set)], bases: basesDe([sI, ir.set]), avisos: ['O redutor de 2026 vale também para o 13º (Lei 9.250, art. 3º-A, § 3º). A lei não diz qual "rendimento" entra na fórmula para o 13º: foi usado o valor bruto do 13º — confirme na regulamentação da Receita.', 'Versão inicial — conferir.'] };
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
    if (baseIrrf13) { ir13 = irrfMensal(d, { rendimentos: baseIrrf13, previdencia: inss13, dependentes: ndep, pensao: 0, outras: 0, maisVantajosa: inp.maisVantajosa !== false, aplicaRedutor: !!pv(acharSet('irrf_pf', d) || { params: {} }, 'redutor_aplica_13') }, mem); if (!ir13.ok) return ir13; }
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


  // ───────────────────────────── JCP — Juros sobre o Capital Próprio ─────────────────────────────
  const somaDias = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
  // TJLP pro rata dia por trimestre civil: soma de (dias do trimestre / divisor) × TJLP do trimestre
  function fatorTJLP(ini, fim, set) {
    const tj = pv(set, 'tjlp_trimestres'), div = parseInt(pv(set, 'divisor_dias_ano'), 10);
    const linhas = []; let fator = Q(0), cur = ini;
    while (cur <= fim) {
      const y = +cur.slice(0, 4), m = +cur.slice(5, 7), qn = Math.ceil(m / 3);
      const fimQ = y + '-' + String(qn * 3).padStart(2, '0') + '-' + (qn === 1 || qn === 4 ? '31' : '30');
      const ate = fimQ < fim ? fimQ : fim; const dias = diasEntre(cur, ate) + 1; const key = y + '-' + qn;
      if (!tj[key]) return { faltando: qn + 'º trimestre/' + y };
      fator = qAdd(fator, qMul(Q(dias, div), dec(tj[key]))); linhas.push({ key, qn, y, dias, taxa: tj[key], div });
      cur = somaDias(ate, 1);
    }
    return { fator, linhas };
  }
  function calcJCP(inp) {
    const ini = String(inp.dataInicio || '').slice(0, 10), fim = String(inp.dataFim || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || fim < ini) return ERR('Informe o início e o fim do período (o fim não pode ser anterior ao início).');
    if (ini.slice(0, 4) !== fim.slice(0, 4)) return ERR('Calcule um ano-calendário por vez (o período deve ficar dentro do mesmo ano).');
    const sB = acharSet('jcp_base', fim); if (!sB) return ERR(ERRO_PARAM, { detalhe: 'JCP (TJLP, limite) — período até ' + fim });
    const pag = String(inp.dataPagamento || '').slice(0, 10) || fim;
    const sI = acharSet('jcp_irrf', pag); if (!sI) return ERR(ERRO_PARAM, { detalhe: 'IRRF sobre JCP — data de pagamento ' + pag });
    const tj = fatorTJLP(ini, fim, sB); if (tj.faltando) return ERR('TJLP do ' + tj.faltando + ' não cadastrada. Confirme a taxa no Banco Central e cadastre em Bases Legais → Cadastrar parâmetros.', { detalhe: 'Sem a TJLP o JCP não calcula.' });
    const mem = Mem(), avisos = [];
    const capital = cents(inp.capitalSocial), resCap = cents(inp.reservasCapital), resLuc = cents(inp.reservasLucros), lucAnt = cents(inp.lucrosAcumuladosAnteriores), tes = cents(inp.acoesTesouraria), prej = cents(inp.prejuizosAcumulados);
    mem.t('1. Base: contas do patrimônio líquido');
    mem.l('Capital social integralizado', capital, '+'); mem.l('Reservas de capital (§ 2º do art. 13 e p.ú. do art. 14 da Lei 6.404)', resCap, '+'); mem.l('Reservas de lucros (exceto a de incentivo fiscal, art. 195-A da Lei 6.404)', resLuc, '+');
    mem.l('Lucros acumulados de exercícios ANTERIORES (o lucro do exercício corrente fica fora — IN RFB 2.296/2025, fonte secundária)', lucAnt, '+');
    mem.l('(−) Ações em tesouraria', tes, '−'); mem.l('(−) Prejuízos acumulados', prej, '−');
    const pl = capital + resCap + resLuc + lucAnt - tes - prej; mem.s('Base de cálculo (PL ajustado)', pl);
    if (pl <= 0) return ERR('A base do patrimônio líquido ficou zerada ou negativa — não há JCP a calcular.');
    mem.t('2. JCP teórico = base × TJLP pro rata dia');
    mem.txt('Período', ini + ' a ' + fim);
    tj.linhas.forEach(l => mem.l(l.qn + 'º tri/' + l.y + ': TJLP ' + (Number(l.taxa) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + '% a.a. × ' + l.dias + '/' + l.div + ' dias', qRound(mulQ(pl, qMul(Q(l.dias, l.div), dec(l.taxa)))), '+', 'parcela mostrada arredondada'));
    const teorico = qRound(mulQ(pl, tj.fator)); mem.s('JCP teórico (soma, arredondada uma só vez)', teorico);
    mem.t('3. Limite de dedução: o maior entre 50% do lucro do período e 50% de (lucros acumulados + reservas de lucros)');
    const lucroPer = cents(inp.lucroPeriodo); const lucReservas = inp.lucrosReservasLimite !== undefined && inp.lucrosReservasLimite !== '' ? cents(inp.lucrosReservasLimite) : (resLuc + lucAnt);
    const lp = parseFloat(pv(sB, 'limite_pct')) ; const pL = dec(pv(sB, 'limite_pct'));
    const l1 = mulC(max0(lucroPer), pL), l2 = mulC(max0(lucReservas), pL);
    mem.l('Lucro do período informado (antes da dedução do JCP): ' + brl(lucroPer) + ' × ' + (lp * 100) + '%', l1, '×'); mem.l('Lucros acumulados + reservas de lucros: ' + brl(lucReservas) + ' × ' + (lp * 100) + '%', l2, '×');
    const limite = Math.max(l1, l2); mem.s('Limite de dedução (o maior)', limite);
    const maxJcp = Math.min(teorico, limite); mem.tot('JCP MÁXIMO DEDUTÍVEL (menor entre o teórico e o limite)', maxJcp);
    const deliberado = cents(inp.valorDeliberado); const pago = deliberado > 0 ? deliberado : maxJcp;
    mem.t('4. Valor pago ou creditado');
    if (deliberado > 0) { mem.l('Valor deliberado', deliberado); if (deliberado > maxJcp) { mem.l('Excedente sobre o máximo dedutível', deliberado - maxJcp, '−'); avisos.push('O valor deliberado (' + brl(deliberado) + ') passa do máximo dedutível (' + brl(maxJcp) + '). O excedente não é dedutível.'); } }
    else mem.n('Sem valor deliberado: considerado o máximo dedutível.');
    const dedutivel = inp.regime === 'lucro_real' ? Math.min(pago, maxJcp) : 0;
    mem.t('5. IRRF (conjunto ' + sI.id + ' v' + sI.version + ')');
    const aliq = dec(pv(sI, inp.beneficiario === 'paraiso_fiscal' ? 'aliquota_paraiso' : 'aliquota'));
    const irrf = mulC(pago, aliq); mem.l(brl(pago) + ' × ' + (Number(pv(sI, inp.beneficiario === 'paraiso_fiscal' ? 'aliquota_paraiso' : 'aliquota')) * 100) + '%' + (inp.beneficiario === 'paraiso_fiscal' ? ' (país com tributação favorecida)' : ''), irrf, '×'); mem.l('Líquido ao beneficiário', pago - irrf);
    let econ = 0;
    if (inp.regime === 'lucro_real') { mem.t('6. Economia fiscal estimada na empresa (informativa)'); econ = mulC(dedutivel, dec(pv(sB, 'aliquota_irpj'))) + mulC(dedutivel, dec(pv(sB, 'aliquota_csll'))); mem.l('Dedutível × (IRPJ ' + Number(pv(sB, 'aliquota_irpj')) * 100 + '% + CSLL ' + Number(pv(sB, 'aliquota_csll')) * 100 + '%)', econ, '+', 'sem o adicional de 10% do IRPJ'); }
    else avisos.push('Regime diferente de Lucro Real: o JCP NÃO é dedutível do IRPJ/CSLL; a retenção na fonte continua incidindo sobre o valor pago.');
    avisos.push('Dedução exige pagamento/crédito individualizado. A lei fala em "lucros computados antes da dedução dos juros" (§ 1º do art. 9º) — informe o lucro do período nesse conceito.');
    avisos.push('Art. 9º, § 8º-A (Lei 14.789/2023): variações positivas do PL por atos entre partes dependentes sem ingresso efetivo de ativos NÃO entram na base — a calculadora não identifica isso; retire manualmente.');
    avisos.push('A lei manda aplicar a TJLP "pro rata dia", sem fixar o divisor; foi usado 365 (parâmetro divisor_dias_ano) — não confirmado em norma.');
    if (inp.beneficiario === 'paraiso_fiscal') avisos.push('A alíquota de 25% para país com tributação favorecida NÃO foi confirmada em norma (não consta no art. 9º da Lei 9.249).');
    return { ok: true, resultado: { base: pl, teorico, limite, maxDedutivel: maxJcp, pago, irrf, liquido: pago - irrf, dedutivel, economia: econ }, memoria: mem.L, parametros: [refSet(sB), refSet(sI)], bases: basesDe([sB, sI]), avisos };
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
    { key: 'jcp', cat: 'FINANCEIRO / SOCIETÁRIO', nome: 'JCP — Juros sobre Capital Próprio', fn: calcJCP },
    { key: 'dist_lucros', cat: 'FINANCEIRO / SOCIETÁRIO', nome: 'Distribuição de lucros — IRRF 10%', fn: calcDistLucros },
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

  const API = { somaMeses, cents, brl, dec, pct, Q, qRound, qAdd, qMul, mulC, avosAno, acharSet, registrarSets, todosSets, CALC_SEED_SETS, CALC_BASES, CATALOGO, EM_BREVE, CATEGORIAS, ERRO_PARAM, MATRIZ_RESCISAO, TIPOS_RESC, validarSet, irrfMensal, inssProgressivo, ufCompetente, diasEntre,
    calcular(key, inp) { const c = CATALOGO.find(x => x.key === key); if (!c) return ERR('Calculadora desconhecida.'); try { return c.fn(inp || {}); } catch (e) { return ERR('Entrada inválida: ' + (e && e.message || e)); } } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.JJRCalc = API;
})(typeof window !== 'undefined' ? window : globalThis);

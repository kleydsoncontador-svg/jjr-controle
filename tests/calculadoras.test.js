// Testes de regressão das Calculadoras JJR (motor determinístico). Rodar: node tests/calculadoras.test.js
// Cada caso fixa: calculadora + competência + conjunto de parâmetros (versão). Mudou o valor → o teste acusa.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const C = require('../calc-motor.js');
let ok = 0, fail = 0;
function t(nome, fn) { try { fn(); ok++; } catch (e) { fail++; console.log('FALHOU:', nome, '\n   ', e.message); } }
const c = C.cents;

// ── 1. IRRF e INSS contra a referência independente (Python Decimal) ──
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'calc_referencia.json'), 'utf8'));
ref.forEach(r => {
  t('INSS ' + r.rend, () => { const x = C.calcular('salario_liquido', { competencia: '2026-03', salario: r.rend }); assert.strictEqual(x.resultado.inss, c(r.inss)); });
  t('IRRF sem previdência ' + r.rend, () => { const x = C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: r.rend, previdencia: '0', dependentes: 0 }); assert.strictEqual(x.resultado.irrf, c(r.irrf_sem_prev)); });
  t('IRRF com INSS e 2 dependentes ' + r.rend, () => { const x = C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: r.rend, previdencia: r.inss, dependentes: 2 }); assert.strictEqual(x.resultado.irrf, c(r.irrf_com_inss_2dep)); });
});

// ── 2. Dinheiro: nunca float ──
t('cents 1.234,56', () => assert.strictEqual(c('1.234,56'), 123456));
t('cents 0,1+0,2 exato', () => assert.strictEqual(c('0,1') + c('0,2'), c('0,3')));
t('cents 1.005 arredonda meio p/ cima', () => assert.strictEqual(c('1,005'), 101));
t('brl', () => assert.strictEqual(C.brl(123456789), '1.234.567,89'));

// ── 3. Parâmetros por competência ──
t('sem parâmetro para 2024 → não calcula', () => { const x = C.calcular('irrf_pf', { competencia: '2024-05', rendimentos: '5000' }); assert.strictEqual(x.ok, false); assert.strictEqual(x.erro, C.ERRO_PARAM); });
t('sem parâmetro p/ Lucro Presumido 2024', () => { const x = C.calcular('lucro_presumido', { ano: 2024, trimestre: 1, atividades: [{ tipo: 'comercio', receita: '100' }] }); assert.strictEqual(x.ok, false); });
t('resultado informa o conjunto/versão usados', () => { const x = C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: '5000' }); assert.strictEqual(x.parametros[0].id, 'IRRF_2026'); assert.strictEqual(x.parametros[0].version, 1); });
t('conjunto novo aprovado vence pela versão maior e não é retroativo', () => {
  const novo = JSON.parse(JSON.stringify(C.CALC_SEED_SETS.find(s => s.id === 'IRRF_2026'))); novo.id = 'IRRF_2026_V2'; novo.version = 2; novo.valid_from = '2026-07-01'; novo.params.dependente.value = '200.00';
  C.registrarSets([novo]);
  assert.strictEqual(C.acharSet('irrf_pf', '2026-06-01').id, 'IRRF_2026');
  assert.strictEqual(C.acharSet('irrf_pf', '2026-07-01').id, 'IRRF_2026_V2');
  C.registrarSets([]);
});
t('validarSet acusa campo faltando', () => assert.ok(C.validarSet({ id: 'x' }).length > 0));

// ── 4. IRRF: redutor ──
t('redutor limitado ao imposto (nunca negativo)', () => { const x = C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: '3000', previdencia: '0', dependentes: 0, maisVantajosa: false }); assert.ok(x.resultado.irrf >= 0); });
t('acima de 7.350 não há redutor', () => { const x = C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: '9000', previdencia: '0' }); const m = x.memoria.find(l => l.r && l.r.includes('Redução 2026')); assert.strictEqual(m.v, 0); });
t('dedução mais vantajosa: simplificado quando maior', () => { const x = C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: '4000', previdencia: '100' }); assert.strictEqual(x.resultado.modo_deducao, 'simplificado'); });
t('dedução mais vantajosa: legais quando maiores', () => { const x = C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: '8000', previdencia: '900' }); assert.strictEqual(x.resultado.modo_deducao, 'legais'); });

// ── 5. Pró-labore ──
t('pró-labore 11% até o teto', () => { const x = C.calcular('pro_labore', { competencia: '2026-03', proLabore: '10000' }); assert.strictEqual(x.resultado.inss, c('932.31')); });
t('pró-labore com teto já consumido em outra fonte', () => { const x = C.calcular('pro_labore', { competencia: '2026-03', proLabore: '5000', baseJaUtilizadaTeto: '8475.55' }); assert.strictEqual(x.resultado.inss, 0); });
t('pró-labore abaixo do teto', () => { const x = C.calcular('pro_labore', { competencia: '2026-03', proLabore: '3000' }); assert.strictEqual(x.resultado.inss, c('330.00')); });

// ── 6. Pensão ──
t('pensão % do bruto', () => { const x = C.calcular('pensao', { rendimento: '5000', percentual: '30', modo: 'bruto' }); assert.strictEqual(x.resultado.pensao, c('1500.00')); });
t('pensão % do líquido', () => { const x = C.calcular('pensao', { rendimento: '5000', inss: '501.51', irrf: '0', percentual: '30', modo: 'liquido' }); assert.strictEqual(x.resultado.pensao, c('1349.55')); });
t('pensão valor fixo', () => { const x = C.calcular('pensao', { modo: 'fixo', valorFixo: '800' }); assert.strictEqual(x.resultado.pensao, c('800.00')); });

// ── 7. Lucro Presumido — exemplos do pedido ──
const lp = (ano, tri, ativ, extra) => C.calcular('lucro_presumido', Object.assign({ ano, trimestre: tri, atividades: ativ }, extra || {}));
t('LP comércio 1.500.000 (2º tri/2026): base IRPJ 122.000, base CSLL 183.000', () => { const x = lp(2026, 2, [{ tipo: 'comercio', receita: '1500000' }]); assert.strictEqual(x.resultado.baseIRPJ, c('122000')); assert.strictEqual(x.resultado.baseCSLL, c('183000')); });
t('LP serviços 2.000.000 (2º tri/2026): base 664.000', () => { const x = lp(2026, 2, [{ tipo: 'servicos', receita: '2000000' }]); assert.strictEqual(x.resultado.baseIRPJ, c('664000')); });
t('LP 1º tri/2026: IRPJ majorado, CSLL SEM majoração', () => { const x = lp(2026, 1, [{ tipo: 'comercio', receita: '1500000' }]); assert.strictEqual(x.resultado.baseIRPJ, c('122000')); assert.strictEqual(x.resultado.baseCSLL, c('180000')); assert.strictEqual(x.resultado.majoracaoCSLL, false); });
t('LP IRPJ: 15% + adicional 10% sobre o que passa de 60.000', () => { const x = lp(2026, 2, [{ tipo: 'comercio', receita: '1500000' }]); assert.strictEqual(x.resultado.irpj, c('18300') + c('6200')); });
t('LP várias atividades: limite proporcional (comércio 1.440.000 + serviços 360.000)', () => { const x = lp(2026, 2, [{ tipo: 'comercio', receita: '1440000' }, { tipo: 'servicos', receita: '360000' }]);
  // limite 1.250.000 → comércio 1.000.000 / serviços 250.000; excedentes 440.000 e 110.000
  const esperado = c('1000000') * 8 / 100 + Math.round(c('440000') * 0.088) + c('250000') * 32 / 100 + Math.round(c('110000') * 0.352);
  assert.strictEqual(x.resultado.baseIRPJ, esperado); });
t('LP dentro do limite: sem majoração', () => { const x = lp(2026, 2, [{ tipo: 'comercio', receita: '1000000' }]); assert.strictEqual(x.resultado.baseIRPJ, c('80000')); });
t('LP receitas financeiras somam integralmente fora do limite', () => { const x = lp(2026, 2, [{ tipo: 'comercio', receita: '1000000' }], { receitasFinanceiras: '10000' }); assert.strictEqual(x.resultado.baseIRPJ, c('90000')); });
t('LP IRRF a compensar reduz o IRPJ a pagar', () => { const x = lp(2026, 2, [{ tipo: 'comercio', receita: '1000000' }], { irrfCompensar: '1000' }); assert.strictEqual(x.resultado.irpjSaldo, c('12000') + c('2000') - c('1000')); });
t('LP limite é trimestral (1.250.000), não mensal', () => { const x = lp(2026, 2, [{ tipo: 'comercio', receita: '1250000' }]); assert.strictEqual(x.resultado.baseIRPJ, c('100000')); });

// ── 8. ITCMD SP ──
const itd = o => C.calcular('itcmd', Object.assign({ dataFatoGerador: '2026-05-10', tipo: 'doacao', tipoBem: 'dinheiro', ufDomicilioDoador: 'SP' }, o));
t('ITCMD doação 200.000 → 8.000', () => assert.strictEqual(itd({ valorBem: '200000' }).resultado.itcmd, c('8000')));
t('ITCMD doação 80.000 → possível isenção', () => { const x = itd({ valorBem: '80000' }); assert.strictEqual(x.resultado.situacao, 'POSSÍVEL ISENÇÃO'); assert.strictEqual(x.resultado.itcmd, 0); });
t('ITCMD limite = 2.500 UFESP × 38,42 = 96.050', () => assert.strictEqual(itd({ valorBem: '80000' }).resultado.isencao_limite, c('96050')));
t('ITCMD doações anteriores no ano somam e perdem a isenção', () => { const x = itd({ valorBem: '80000', doacoesAnteriores: '30000' }); assert.strictEqual(x.resultado.situacao, 'TRIBUTADA'); });
t('ITCMD imóvel: UF do imóvel manda', () => { const x = itd({ tipoBem: 'imovel', ufImovel: 'SP', ufDomicilioDoador: 'RJ', valorBem: '200000' }); assert.strictEqual(x.resultado.uf, 'SP'); });
t('ITCMD UF sem parâmetros → não calcula e não usa regra de SP', () => { const x = itd({ ufDomicilioDoador: 'RJ', valorBem: '200000' }); assert.strictEqual(x.ok, false); });
t('ITCMD causa mortis: cálculo por herdeiro', () => { const x = C.calcular('itcmd', { dataFatoGerador: '2026-05-10', tipo: 'causa_mortis', tipoBem: 'dinheiro', ufInventario: 'SP', valorBem: '300000', herdeiros: [{ nome: 'A', quinhao: '100000' }, { nome: 'B', quinhao: '200000' }] }); assert.strictEqual(x.resultado.itcmd, c('12000')); assert.strictEqual(x.resultado.herdeiros.length, 2); });
t('ITCMD quotas: usa valor informado, % transmitido', () => { const x = itd({ tipoBem: 'quotas', quotas: { patrimonioLiquido: '1000000', ajusteAtivos: '200000', ajustePassivos: '0', goodwill: '0', percentualParticipacao: '50' } }); assert.strictEqual(x.resultado.itcmd, c('24000')); });
t('ITCMD usufruto sem regra cadastrada → não calcula', () => { const x = itd({ valorBem: '200000', usufruto: true }); assert.strictEqual(x.ok, false); });

// ── 9. Mútuo ──
const mu = o => C.calcular('mutuo', Object.assign({ dataLiberacao: '2026-01-10', dataVencimento: '2026-07-10', principal: '100000', mutuante: 'PF', mutuario: 'PJ', valorJuros: '6000' }, o));
t('Mútuo PF→PJ: IRRF só sobre juros, 181 dias → 20%', () => { const x = mu({}); assert.strictEqual(x.resultado.dias, 181); assert.strictEqual(x.resultado.irrf_juros, c('1200')); });
t('Mútuo prazo > 720 dias → 15%', () => { const x = mu({ dataVencimento: '2028-06-01' }); assert.strictEqual(x.resultado.irrf_juros, c('900')); });
t('Mútuo PF→PF → módulo próprio', () => assert.strictEqual(mu({ mutuario: 'PF' }).ok, false));
t('Mútuo IOF calcula quando o conjunto é cadastrado', () => {
  C.registrarSets([{ id: 'IOF_TESTE', calculator_key: 'iof_credito', valid_from: '2026-01-01', valid_to: null, version: 1, status: 'ativo', params: { taxa_diaria: { value: '0.000082' }, adicional: { value: '0.0038' }, limite_dias: { value: 365 } }, bases: [] }]);
  const x = mu({ mutuante: 'PJ' }); C.registrarSets([]);
  assert.strictEqual(x.resultado.iof, Math.round(10000000 * 0.000082 * 181) + Math.round(10000000 * 0.0038)); });

// ── 10. PLR ──

// ── 11. Férias / 13º / Rescisão ──
t('Férias 30 dias: base + 1/3', () => { const x = C.calcular('ferias', { competencia: '2026-03', remuneracao: '3000', diasFerias: 30 }); assert.strictEqual(x.resultado.ferias, c('3000')); assert.strictEqual(x.resultado.terco, c('1000')); });
t('Férias com abono: abono e 1/3 fora de INSS/IRRF', () => { const a = C.calcular('ferias', { competencia: '2026-03', remuneracao: '3000', diasFerias: 20, diasAbono: 10 }); assert.strictEqual(a.resultado.abono, c('1000')); const b = C.calcular('ferias', { competencia: '2026-03', remuneracao: '3000', diasFerias: 20 }); assert.strictEqual(a.resultado.inss, b.resultado.inss); });
t('13º: avos pela admissão (≥15 dias = 1 avo)', () => { assert.strictEqual(C.avosAno('2026-03-16', 2026), 10); assert.strictEqual(C.avosAno('2026-03-17', 2026), 10); assert.strictEqual(C.avosAno('2026-03-18', 2026), 9); assert.strictEqual(C.avosAno('2020-01-01', 2026), 12); });
t('13º: bruto = base/12 × avos e 1ª parcela 50%', () => { const x = C.calcular('decimo_terceiro', { competencia: '2026-12', remuneracao: '3000', avos: 12 }); assert.strictEqual(x.resultado.bruto, c('3000')); assert.strictEqual(x.resultado.primeira, c('1500')); });
t('Rescisão sem justa causa traz FGTS e multa 40%', () => { const x = C.calcular('rescisao', { competencia: '2026-06', tipo: 'sem_justa_causa', dataAdmissao: '2022-02-01', dataDesligamento: '2026-06-15', salario: '3000', saldoFgts: '10000' }); assert.strictEqual(x.ok, true); assert.ok(x.resultado.multa_fgts > 0); });
t('Rescisão justa causa: sem 13º nem férias proporcionais', () => { const x = C.calcular('rescisao', { competencia: '2026-06', tipo: 'justa_causa', dataAdmissao: '2022-02-01', dataDesligamento: '2026-06-15', salario: '3000' }); assert.ok(!x.resultado.verbas.some(v => v.rub === 'decimo_proporcional' || v.rub === 'ferias_proporcionais')); });
t('Rescisão: aviso indenizado não sofre INSS/IRRF (matriz)', () => assert.strictEqual(C.MATRIZ_RESCISAO.aviso_indenizado.inss, false));
t('Rescisão acordo 484-A: aviso pela metade, multa 20%', () => { const a = C.calcular('rescisao', { competencia: '2026-06', tipo: 'acordo_484a', dataAdmissao: '2022-02-01', dataDesligamento: '2026-06-15', salario: '3000', saldoFgts: '10000' }); const b = C.calcular('rescisao', { competencia: '2026-06', tipo: 'sem_justa_causa', dataAdmissao: '2022-02-01', dataDesligamento: '2026-06-15', salario: '3000', saldoFgts: '10000' }); const av = x => x.resultado.verbas.find(v => v.rub === 'aviso_indenizado').valor; assert.ok(Math.abs(av(a) * 2 - av(b)) <= 1); assert.ok(a.resultado.multa_fgts < b.resultado.multa_fgts); });


// ── 13. JCP (referência independente em Python Decimal: PL 1.300.000, 1º semestre/2026 → 59.049,56) ──
const jcp = o => C.calcular('jcp', Object.assign({ dataInicio: '2026-01-01', dataFim: '2026-06-30', capitalSocial: '1000000', reservasLucros: '200000', lucrosAcumuladosAnteriores: '100000', lucroPeriodo: '300000', regime: 'lucro_real', dataPagamento: '2026-07-10' }, o));
t('JCP teórico = PL × TJLP pro rata dia', () => assert.strictEqual(jcp({}).resultado.teorico, c('59049.56')));
t('JCP IRRF 17,5% em 2026', () => assert.strictEqual(jcp({}).resultado.irrf, Math.round(c('59049.56') * 0.175)));
t('JCP IRRF 15% para pagamento até 2025', () => assert.strictEqual(jcp({ dataPagamento: '2025-12-20' }).resultado.irrf, Math.round(c('59049.56') * 0.15)));
t('JCP beneficiário em paraíso fiscal 25%', () => assert.strictEqual(jcp({ beneficiario: 'paraiso_fiscal' }).resultado.irrf, Math.round(c('59049.56') * 0.25)));
t('JCP limitado a 50% quando o lucro é pequeno e não há reservas', () => { const x = jcp({ reservasLucros: '0', lucrosAcumuladosAnteriores: '0', capitalSocial: '1300000', lucroPeriodo: '40000' }); assert.strictEqual(x.resultado.limite, c('20000')); assert.strictEqual(x.resultado.maxDedutivel, c('20000')); });
t('JCP valor deliberado acima do máximo avisa o excedente', () => { const x = jcp({ valorDeliberado: '70000' }); assert.strictEqual(x.resultado.pago, c('70000')); assert.strictEqual(x.resultado.dedutivel, c('59049.56')); assert.ok(x.avisos.some(a => a.includes('passa do máximo'))); });
t('JCP fora do Lucro Real não é dedutível', () => assert.strictEqual(jcp({ regime: 'lucro_presumido' }).resultado.dedutivel, 0));
t('JCP 4º trimestre/2026 (TJLP 9,29% oficial do BCB)', () => assert.strictEqual(jcp({ dataInicio: '2026-10-01', dataFim: '2026-12-31', lucroPeriodo: '1000000' }).resultado.teorico, c('30440.66')));
t('JCP ano de 2025 inteiro (TJLP oficial 2025)', () => assert.strictEqual(jcp({ dataInicio: '2025-01-01', dataFim: '2025-12-31', dataPagamento: '2025-12-20', lucroPeriodo: '1000000' }).resultado.teorico, c('112662.27')));
t('JCP ano sem TJLP cadastrada (2027) → não calcula', () => { const x = jcp({ dataInicio: '2027-01-01', dataFim: '2027-03-31', dataPagamento: '2027-03-31' }); assert.strictEqual(x.ok, false); });
t('JCP período em dois anos → recusa', () => assert.strictEqual(jcp({ dataInicio: '2026-07-01', dataFim: '2027-03-31' }).ok, false));
t('JCP lucros do exercício corrente ficam fora da base (só anteriores)', () => assert.strictEqual(jcp({}).resultado.base, c('1300000')));
t('INSS: contribuição máxima do empregado = 988,09', () => assert.strictEqual(C.calcular('salario_liquido', { competencia: '2026-03', salario: '20000' }).resultado.inss, c('988.09')));
t('ITCMD: acumulado acima do limite mostra o valor alternativo (sobre o total)', () => { const x = itd({ valorBem: '80000', doacoesAnteriores: '30000' }); assert.ok(x.memoria.some(l => l.k === 'nota' && l.r.includes('TOTAL acumulado'))); });
t('Lucro Presumido majorado avisa das liminares/ADIs', () => assert.ok(lp(2026, 2, [{ tipo: 'comercio', receita: '1500000' }]).avisos.some(a => a.includes('ADIs'))));


// ── 14. Conferido no texto oficial (Lei 15.270, art. 3º-A) ──
t('IRRF: rendimento até R$ 5.000,00 → imposto zero (usando a dedução mais vantajosa)', () => { ['1000', '3000', '4999.99', '5000'].forEach(r => assert.strictEqual(C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: r }).resultado.irrf, 0, r)); });
t('IRRF: 5.000,01 ainda zera (redução contínua) e 6.000 paga 394,54', () => { assert.strictEqual(C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: '5000.01' }).resultado.irrf, 0); assert.strictEqual(C.calcular('irrf_pf', { competencia: '2026-03', rendimentos: '6000' }).resultado.irrf, c('394.54')); });
t('13º: o redutor 2026 também se aplica (§ 3º do art. 3º-A)', () => { const x = C.calcular('decimo_terceiro', { competencia: '2026-12', remuneracao: '6000', avos: 12 }); assert.strictEqual(x.resultado.irrf, c('385.10')); assert.strictEqual(C.calcular('decimo_terceiro', { competencia: '2026-12', remuneracao: '5000', avos: 12 }).resultado.irrf, 0); });


// ── 15. Lucro Presumido pela IN RFB 2.305/2025, art. 15 (redação da IN 2.306/2026) — valores calculados à mão ──
const lpX = (tri, rec, ant, extra) => C.calcular('lucro_presumido', Object.assign({ ano: 2026, trimestre: tri, atividades: [{ tipo: 'comercio', receita: rec }], receitasAnteriores: ant }, extra || {}));
t('LP § 4º: sobra do 1º trimestre amplia o limite do 2º (IRPJ 128.800; CSLL ainda 196.200)', () => { const x = lpX(2, '1600000', ['1000000'], { compensarSobraLimite: true }); assert.strictEqual(x.resultado.baseIRPJ, c('128800')); assert.strictEqual(x.resultado.baseCSLL, c('196200')); });
t('LP sem compensar a sobra: IRPJ 130.800', () => assert.strictEqual(lpX(2, '1600000', ['1000000'], { compensarSobraLimite: false }).resultado.baseIRPJ, c('130800')));
t('LP § 5º, I (4º tri, receita anual abaixo do limite): sem acréscimo no 4º trimestre', () => { const x = lpX(4, '1500000', ['1000000', '1000000', '1000000']); assert.strictEqual(x.resultado.baseIRPJ, c('120000')); assert.strictEqual(x.resultado.baseCSLL, c('180000')); });
t('LP § 5º, II (excedente anual menor que o dos trimestres anteriores): sem acréscimo no 4º', () => { const x = lpX(4, '1000000', ['1500000', '1500000', '1000000']); assert.strictEqual(x.resultado.baseIRPJ, c('80000')); });
t('LP § 5º, III: excedente do 4º trimestre limitado a (excedente anual − anteriores)', () => { const x = lpX(4, '3000000', ['1000000', '1000000', '1000000']); assert.strictEqual(x.resultado.baseIRPJ, c('248000')); assert.strictEqual(x.resultado.baseCSLL, c('375000')); });
t('LP 4º trimestre sem os trimestres anteriores informados: avisa e usa só o limite do trimestre', () => { const x = lpX(4, '1500000', undefined); assert.strictEqual(x.resultado.baseIRPJ, c('122000')); });


// ── 16. IOF do mútuo (Decreto 6.306 art. 7º com Decreto 12.499/2025) e PLR (tabela da Receita) — valores calculados à mão ──
const iof = o => C.calcular('mutuo', Object.assign({ dataLiberacao: '2026-01-10', dataVencimento: '2026-07-10', principal: '100000', mutuante: 'PJ', mutuario: 'PJ' }, o));
t('IOF PJ→PJ: 100.000 × 0,0082% × 181 dias + 0,38% = 1.864,20', () => assert.strictEqual(iof({}).resultado.iof, c('1864.20')));
t('IOF PJ→PF usa a mesma taxa diária (0,0082%)', () => assert.strictEqual(iof({ mutuario: 'PF' }).resultado.iof, c('1864.20')));
t('IOF Simples/MEI até R$ 30.000: 0,00274% ao dia → 175,19', () => assert.strictEqual(iof({ principal: '20000', mutuarioSimples: true }).resultado.iof, c('175.19')));
t('IOF Simples acima de R$ 30.000 cai na taxa de PJ: 745,68', () => assert.strictEqual(iof({ principal: '40000', mutuarioSimples: true }).resultado.iof, c('745.68')));
t('IOF limita a 365 dias: 100.000 por 729 dias = 3.373,00', () => assert.strictEqual(iof({ dataLiberacao: '2026-01-01', dataVencimento: '2027-12-31' }).resultado.iof, c('3373.00')));
t('IOF antes de 11/06/2025 não está cadastrado → não calcula e avisa', () => { const x = iof({ dataLiberacao: '2025-01-10', dataVencimento: '2025-05-10' }); assert.strictEqual(x.resultado.iof, null); assert.ok(x.avisos.some(a => a.includes('11/06/2025'))); });
t('IOF: mútuo de PF para PJ fica sem IOF automático e avisa da ambiguidade', () => { const x = iof({ mutuante: 'PF' }); assert.strictEqual(x.resultado.iof, null); assert.ok(x.avisos.some(a => a.includes('art. 13'))); });
const plr = (comp, atual, extra) => C.calcular('plr', Object.assign({ competencia: comp, plrAtual: atual }, extra || {}));
t('PLR 2026: até R$ 8.214,40 é isenta', () => { assert.strictEqual(plr('2026-03', '8000').resultado.ir, 0); assert.strictEqual(plr('2026-03', '8214.40').resultado.ir, 0); });
t('PLR 2026: 10.000 → 15% − 1.360,25 = 139,75', () => assert.strictEqual(plr('2026-03', '10000').resultado.ir, c('139.75')));
t('PLR 2026: 20.000 → 27,5% − 3.166,80 = 2.333,20', () => assert.strictEqual(plr('2026-03', '20000').resultado.ir, c('2333.20')));
t('PLR em duas parcelas: recalcula pelo total e deduz o já retido', () => assert.strictEqual(plr('2026-09', '5000', { plrAnterior: '10000', irJaRetido: '139.75' }).resultado.ir, c('887.47')));
t('PLR jan–abr/2025 usa a tabela antiga (isento só até 7.640,80)', () => assert.strictEqual(plr('2025-03', '8000').resultado.ir, c('26.94')));
t('PLR: pensão alimentícia judicial reduz a base (art. 3º, § 10)', () => assert.strictEqual(plr('2026-03', '20000', { pensaoPLR: '5000' }).resultado.ir, c('1027.22')));
t('PLR 2024: tabela não cadastrada → não calcula', () => assert.strictEqual(plr('2024-06', '10000').ok, false));

// ── 17. Distribuição de lucros — retenção de 10% acima de R$ 50.000/mês (Lei 15.270/2025, art. 6º-A) — valores calculados à mão ──
const dl = (o) => C.calcular('dist_lucros', Object.assign({ competencia: '2026-03', beneficiario: 'pf_residente' }, o));
t('Lucros: até R$ 50.000,00 no mês → sem retenção, líquido = bruto', () => { const x = dl({ valorBruto: '50000' }); assert.strictEqual(x.resultado.ir, 0); assert.strictEqual(x.resultado.liquido, c('50000')); });
t('Lucros: R$ 50.000,01 → 10% sobre o TOTAL = 5.000,00 (o "degrau")', () => { const x = dl({ valorBruto: '50000.01' }); assert.strictEqual(x.resultado.ir, c('5000.00')); assert.strictEqual(x.resultado.liquido, c('45000.01')); });
t('Lucros: R$ 100.000 → IRRF 10.000, líquido 90.000 (não só o excedente)', () => { const x = dl({ valorBruto: '100000' }); assert.strictEqual(x.resultado.ir, c('10000')); assert.strictEqual(x.resultado.liquido, c('90000')); });
t('Lucros: 2 pagamentos de 30.000 no mês → o 2º retém 6.000 (recalcula pelo total de 60.000)', () => { const x = dl({ valorBruto: '30000', jaPagoMes: '30000' }); assert.strictEqual(x.resultado.ir, c('6000')); assert.strictEqual(x.resultado.liquido, c('24000')); });
t('Lucros: já pago 60.000 (retido 6.000 pela regra) + 10.000 → devido 7.000, retém só 1.000', () => { const x = dl({ valorBruto: '10000', jaPagoMes: '60000' }); assert.strictEqual(x.resultado.ir, c('1000')); assert.strictEqual(x.resultado.devidoMes, c('7000')); });
t('Lucros: IRRF já retido informado é abatido', () => { const x = dl({ valorBruto: '10000', jaPagoMes: '60000', irJaRetido: '6000' }); assert.strictEqual(x.resultado.ir, c('1000')); });
t('Lucros: parte isenta (apurada até 2025) fora do teste: 80.000 com 40.000 isentos → sem retenção', () => { const x = dl({ valorBruto: '80000', parteIsenta: '40000' }); assert.strictEqual(x.resultado.ir, 0); assert.strictEqual(x.resultado.liquido, c('80000')); });
t('Lucros: 100.000 com 40.000 isentos → 10% sobre 60.000 = 6.000', () => { const x = dl({ valorBruto: '100000', parteIsenta: '40000' }); assert.strictEqual(x.resultado.ir, c('6000')); assert.strictEqual(x.resultado.liquido, c('94000')); });
t('Lucros (partindo do líquido): 45.000 líquidos → bruto 45.000, sem retenção', () => { const x = dl({ modo: 'liquido', valorLiquido: '45000' }); assert.strictEqual(x.resultado.bruto, c('45000')); assert.strictEqual(x.resultado.ir, 0); });
t('Lucros (partindo do líquido): 50.000 líquidos → bruto 50.000 (no limite, sem retenção)', () => { const x = dl({ modo: 'liquido', valorLiquido: '50000' }); assert.strictEqual(x.resultado.bruto, c('50000')); assert.strictEqual(x.resultado.ir, 0); });
t('Lucros (partindo do líquido): 90.000 líquidos → bruto 100.000, IRRF 10.000', () => { const x = dl({ modo: 'liquido', valorLiquido: '90000' }); assert.strictEqual(x.resultado.bruto, c('100000')); assert.strictEqual(x.resultado.ir, c('10000')); });
t('Lucros (partindo do líquido): 50.001 líquidos → bruto 55.556,67, retém 5.555,67 e entrega ≥ 50.001', () => { const x = dl({ modo: 'liquido', valorLiquido: '50001' }); assert.strictEqual(x.resultado.bruto, c('55556.67')); assert.strictEqual(x.resultado.ir, c('5555.67')); assert.ok(x.resultado.liquido >= c('50001')); });
t('Lucros (partindo do líquido) com 30.000 já pagos no mês: 30.000 líquidos → bruto 36.666,67, IRRF 6.666,67', () => { const x = dl({ modo: 'liquido', valorLiquido: '30000', jaPagoMes: '30000' }); assert.strictEqual(x.resultado.bruto, c('36666.67')); assert.strictEqual(x.resultado.ir, c('6666.67')); assert.strictEqual(x.resultado.liquido, c('30000')); });
t('Lucros: residente no exterior → 10% SEM piso (10.000 → 1.000)', () => { const x = dl({ beneficiario: 'exterior', valorBruto: '10000' }); assert.strictEqual(x.resultado.ir, c('1000')); assert.strictEqual(x.resultado.liquido, c('9000')); });
t('Lucros: exterior enquadrado no § 5º, II (governo/fundo soberano/previdência) → sem retenção', () => { const x = dl({ beneficiario: 'exterior_isento', valorBruto: '10000' }); assert.strictEqual(x.resultado.ir, 0); });
t('Lucros: antes de 2026 não calcula (retenção só vale desde 01/2026)', () => { const x = dl({ competencia: '2025-12', valorBruto: '100000' }); assert.strictEqual(x.ok, false); });
t('Lucros: parte isenta maior que o pagamento é erro', () => assert.strictEqual(dl({ valorBruto: '1000', parteIsenta: '2000' }).ok, false));
t('Lucros: traz memória, parâmetros e as duas bases legais', () => { const x = dl({ valorBruto: '60000' }); assert.ok(x.memoria.length > 5); assert.strictEqual(x.parametros[0].id, 'DIST_LUCROS_2026'); assert.ok(x.bases.some(b => b.id === 'LEI_9250_6A') && x.bases.some(b => b.id === 'LEI_9249_10')); });

// ── 12. Toda calculadora devolve memória, parâmetros e bases ──
t('memória e bases presentes', () => { const x = C.calcular('salario_liquido', { competencia: '2026-03', salario: '5000' }); assert.ok(x.memoria.length > 5); assert.ok(x.bases.length > 0); assert.ok(x.parametros.length > 0); });
t('entrada inválida não quebra', () => assert.strictEqual(C.calcular('irrf_pf', { competencia: 'abc' }).ok, false));

console.log('\nCalculadoras JJR — ' + ok + ' ok, ' + fail + ' falhas');
process.exit(fail ? 1 : 0);

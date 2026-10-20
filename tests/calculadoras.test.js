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
t('Mútuo PJ→PJ sem parâmetro de IOF → avisa, não inventa', () => { const x = mu({ mutuante: 'PJ' }); assert.strictEqual(x.resultado.iof, null); assert.ok(x.avisos.some(a => a.includes('IOF'))); });
t('Mútuo PF→PF → módulo próprio', () => assert.strictEqual(mu({ mutuario: 'PF' }).ok, false));
t('Mútuo IOF calcula quando o conjunto é cadastrado', () => {
  C.registrarSets([{ id: 'IOF_TESTE', calculator_key: 'iof_credito', valid_from: '2026-01-01', valid_to: null, version: 1, status: 'ativo', params: { taxa_diaria: { value: '0.000082' }, adicional: { value: '0.0038' }, limite_dias: { value: 365 } }, bases: [] }]);
  const x = mu({ mutuante: 'PJ' }); C.registrarSets([]);
  assert.strictEqual(x.resultado.iof, Math.round(10000000 * 0.000082 * 181) + Math.round(10000000 * 0.0038)); });

// ── 10. PLR ──
t('PLR sem tabela cadastrada → não calcula', () => assert.strictEqual(C.calcular('plr', { competencia: '2026-03', plrAtual: '10000' }).ok, false));

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
t('JCP 4º trimestre/2026: sem TJLP cadastrada → não calcula', () => { const x = jcp({ dataInicio: '2026-10-01', dataFim: '2026-12-31' }); assert.strictEqual(x.ok, false); assert.ok(x.erro.includes('TJLP')); });
t('JCP período em dois anos → recusa', () => assert.strictEqual(jcp({ dataInicio: '2026-07-01', dataFim: '2027-03-31' }).ok, false));
t('JCP lucros do exercício corrente ficam fora da base (só anteriores)', () => assert.strictEqual(jcp({}).resultado.base, c('1300000')));
t('INSS: contribuição máxima do empregado = 988,09', () => assert.strictEqual(C.calcular('salario_liquido', { competencia: '2026-03', salario: '20000' }).resultado.inss, c('988.09')));
t('ITCMD: acumulado acima do limite mostra o valor alternativo (sobre o total)', () => { const x = itd({ valorBem: '80000', doacoesAnteriores: '30000' }); assert.ok(x.memoria.some(l => l.k === 'nota' && l.r.includes('TOTAL acumulado'))); });
t('Lucro Presumido majorado avisa das liminares/ADIs', () => assert.ok(lp(2026, 2, [{ tipo: 'comercio', receita: '1500000' }]).avisos.some(a => a.includes('ADIs'))));

// ── 12. Toda calculadora devolve memória, parâmetros e bases ──
t('memória e bases presentes', () => { const x = C.calcular('salario_liquido', { competencia: '2026-03', salario: '5000' }); assert.ok(x.memoria.length > 5); assert.ok(x.bases.length > 0); assert.ok(x.parametros.length > 0); });
t('entrada inválida não quebra', () => assert.strictEqual(C.calcular('irrf_pf', { competencia: 'abc' }).ok, false));

console.log('\nCalculadoras JJR — ' + ok + ' ok, ' + fail + ' falhas');
process.exit(fail ? 1 : 0);

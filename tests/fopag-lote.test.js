// node tests/fopag-lote.test.js — casamento por lote do Processar FOPAG (caso real Fast Lube / Itaú / 07/2026, pedido de 28/10/2026)
const assert = require('assert');
const { casarLote, resolverLotes } = require('../fopag-lote.js');
let ok = 0, falhas = 0;
function t(nome, fn) { try { fn(); ok++; } catch (e) { falhas++; console.log('FALHOU: ' + nome + '\n  ' + e.message); } }

// Relatório de ADIANTAMENTO 07/2026: 42 pessoas, R$ 56.746,45
const rep = [];
const add = (nome, valor, n) => { for (let i = 0; i < (n || 1); i++) rep.push({ nome: n && n > 1 ? nome + ' ' + (i + 1) : nome, cpf: '', valor, tipo: 'empregado' }); };
add('REP1200', 1200, 4); add('REP1120', 1120, 3); add('REP1618', 1618, 2); add('REP1440', 1440, 2); add('REP840', 840, 2); add('REP1000', 1000, 3);
add('DEBORA GARCIA VIANA', 2000); add('PAULA CRISTINA SCACHETTI SANTOS', 720); add('PATRICIA YOKO ASAKA', 2600);
let somaC = rep.reduce((s, p) => s + Math.round(p.valor * 100), 0);
const faltam = 42 - rep.length; // 23 pessoas com valores únicos
const alvoC = 5674645 - somaC;
let usados = 0;
for (let i = 0; i < faltam; i++) {
  let c = i < faltam - 1 ? 91000 + i * 1313 : alvoC - usados;
  usados += c; rep.push({ nome: 'UNICO' + i, cpf: '', valor: c / 100, tipo: 'empregado' });
}
const relAdiant = { chave: 'adiantamento|07-2026|56746.45', tipo: 'adiantamento', competencia: '07-2026', prioridade: 0, pessoas: rep };
// Relatório de SALÁRIO 06/2026 (concorrente): mesma Paula com 1.200 (salário), Débora 3.000 etc.
const relSalario = { chave: 'salario|06-2026|x', tipo: 'salario', competencia: '06-2026', prioridade: 1, pessoas: [
  { nome: 'PAULA CRISTINA SCACHETTI SANTOS', valor: 1200, tipo: 'empregado' }, { nome: 'DEBORA GARCIA VIANA', valor: 3000, tipo: 'empregado' }, { nome: 'OUTRO', valor: 1500, tipo: 'empregado' }] };

// Banco 20/07: os 42 valores do relatório + mais UM de 1.000,00 = 43 linhas, R$ 57.746,45
const lote20 = []; let idSeq = 100;
rep.forEach(p => lote20.push({ id: idSeq++, valor: p.valor }));
lote20.push({ id: idSeq++, valor: 1000 });
const lote17 = [{ id: 1, valor: 3358.53 }, { id: 2, valor: 4754.75 }];
const lote21 = [165, 146.4, 165, 157.8, 165, 88.38, 61].map((v, i) => ({ id: 500 + i, valor: v }));

t('banco 20/07 = 43 linhas, R$ 57.746,45', () => { assert.strictEqual(lote20.length, 43); assert.strictEqual(Math.round(lote20.reduce((s, l) => s + l.valor * 100, 0)), 5774645); });
t('relatório = 42 pessoas, R$ 56.746,45', () => { assert.strictEqual(rep.length, 42); assert.strictEqual(Math.round(rep.reduce((s, p) => s + p.valor * 100, 0)), 5674645); });

const consumidos = new Set();
const lotes = [{ chave: '2026-07-17', linhas: lote17 }, { chave: '2026-07-20', linhas: lote20 }, { chave: '2026-07-21', linhas: lote21 }];
const res = resolverLotes(lotes, () => [relSalario, relAdiant], consumidos);
const r20 = res.find(x => x.chave === '2026-07-20');

t('TESTE A: 42 conciliadas como ADIANTAMENTO e 1 residual de R$ 1.000,00', () => {
  assert.ok(r20); assert.strictEqual(r20.resultado.relatorio.tipo, 'adiantamento');
  assert.strictEqual(r20.resultado.atribuicoes.length, 42); assert.strictEqual(r20.resultado.residuais.length, 1);
  const resid = lote20.find(l => l.id === r20.resultado.residuais[0]); assert.strictEqual(resid.valor, 1000);
  const tot = r20.resultado.atribuicoes.reduce((s, a) => s + Math.round(lote20.find(l => l.id === a.id).valor * 100), 0); assert.strictEqual(tot, 5674645);
});
t('TESTE B: Débora R$ 2.000,00 vai para o pagamento EXATO de 20/07 (nada de separar de 4.754,75)', () => {
  const idx = rep.findIndex(p => p.nome.startsWith('DEBORA'));
  const a = r20.resultado.atribuicoes.find(x => x.pessoaIdx === idx); assert.ok(a);
  assert.strictEqual(lote20.find(l => l.id === a.id).valor, 2000);
  assert.ok(consumidos.has(relAdiant.chave + '|' + idx));
  assert.ok(!res.find(x => x.chave === '2026-07-17'), 'lote de 17/07 não pode consumir relatório');
});
t('TESTE C: R$ 1.200 — 4 no relatório e 4 no banco → as 4 classificadas, sem inventar nome', () => {
  const as = r20.resultado.atribuicoes.filter(a => lote20.find(l => l.id === a.id).valor === 1200);
  assert.strictEqual(as.length, 4); assert.ok(as.every(a => a.repetido && a.pessoaIdx === null));
});
t('TESTE D: R$ 1.000 — 3 no relatório e 4 no banco → 3 classificadas e 1 pendente', () => {
  const as = r20.resultado.atribuicoes.filter(a => lote20.find(l => l.id === a.id).valor === 1000);
  assert.strictEqual(as.length, 3);
  assert.strictEqual(r20.resultado.residuais.filter(id => lote20.find(l => l.id === id).valor === 1000).length, 1);
});
t('valores repetidos 1.120 / 1.618 / 1.440 / 840: todas classificadas', () => {
  [[1120, 3], [1618, 2], [1440, 2], [840, 2]].forEach(([v, n]) => assert.strictEqual(r20.resultado.atribuicoes.filter(a => lote20.find(l => l.id === a.id).valor === v).length, n));
});
t('TESTE E: Paula R$ 720,00 é o adiantamento (D 724) — nunca usa um R$ 1.200 pelo salário de outro relatório', () => {
  const idx = rep.findIndex(p => p.nome.startsWith('PAULA'));
  const a = r20.resultado.atribuicoes.find(x => x.pessoaIdx === idx); assert.ok(a); assert.strictEqual(lote20.find(l => l.id === a.id).valor, 720);
  assert.ok(!r20.resultado.atribuicoes.some(x => x.relatorioSalario));
  assert.strictEqual(r20.resultado.relatorio.tipo, 'adiantamento');
});
t('Patrícia R$ 2.600,00 identificada pelo relatório (Fluxo não sobrepõe)', () => {
  const idx = rep.findIndex(p => p.nome.startsWith('PATRICIA'));
  const a = r20.resultado.atribuicoes.find(x => x.pessoaIdx === idx); assert.ok(a); assert.strictEqual(lote20.find(l => l.id === a.id).valor, 2600);
});
t('TESTE F: 21/07 (R$ 948,58) não consome o adiantamento', () => { assert.ok(!res.find(x => x.chave === '2026-07-21')); });
t('cada pessoa do relatório é consumida UMA vez só', () => {
  const nomeados = r20.resultado.atribuicoes.filter(a => !a.repetido).map(a => a.pessoaIdx);
  assert.strictEqual(new Set(nomeados).size, nomeados.length);
});
t('lote pequeno (1 pagamento) não é tratado como lote: cai nos caminhos individuais', () => {
  assert.strictEqual(casarLote([{ id: 1, valor: 2000 }], [relAdiant], new Set()), null);
});
t('repetição de relatório já consumido: segundo lote com os mesmos valores não reaproveita', () => {
  const r2 = casarLote(lote20, [relAdiant], consumidos); assert.strictEqual(r2, null);
});

console.log('Processar FOPAG por lote — ' + ok + ' ok, ' + falhas + ' falhas');
process.exit(falhas ? 1 : 0);

// Processar FOPAG — casamento por LOTE BANCÁRIO (pedido do usuário 28/10/2026, Fast Lube / Itaú / 07/2026).
// Antes de olhar pessoa por pessoa, o lote (empresa + banco + data + histórico "Sispag Salários") é comparado, como MULTICONJUNTO de valores em centavos,
// com cada relatório da folha. O relatório com maior cobertura documental fica com as ocorrências exatas; valor repetido NÃO é erro (conta-se ocorrências).
// Função pura, sem acesso a banco/tela — testada em tests/fopag-lote.test.js.
(function (root) {
  'use strict';

  function cents(v) { return Math.round(Number(v) * 100); }

  // lote: [{id, valor}]  ·  relatorios: [{chave, tipo, competencia, prioridade, pessoas:[{nome,cpf,valor,tipo}]}]
  // consumidos: Set de "chave|indiceDaPessoa" já usados (por outro lote ou por pagamento anterior)
  // Devolve null quando nenhum relatório cobre o lote o bastante.
  function casarLote(lote, relatorios, consumidos, opcoes) {
    var minLinhas = (opcoes && opcoes.minLinhas) || 3;
    var cobMin = (opcoes && opcoes.coberturaMin) || 0.8;
    var banco = new Map();
    lote.forEach(function (l) { var c = cents(l.valor); if (!banco.has(c)) banco.set(c, []); banco.get(c).push(l.id); });
    banco.forEach(function (ids) { ids.sort(function (a, b) { return a - b; }); });

    var melhor = null;
    (relatorios || []).forEach(function (r) {
      var rep = new Map(), disp = 0;
      (r.pessoas || []).forEach(function (p, i) {
        if (consumidos.has(r.chave + '|' + i)) return;
        disp++;
        var c = cents(p.valor); if (!rep.has(c)) rep.set(c, []); rep.get(c).push(i);
      });
      if (!disp) return;
      var matched = 0;
      rep.forEach(function (idxs, c) { if (banco.has(c)) matched += Math.min(idxs.length, banco.get(c).length); });
      if (matched < minLinhas) return;
      var cobRel = matched / disp;
      if (cobRel < cobMin) return;
      var c2 = { r: r, matched: matched, cobRel: cobRel, cobLote: matched / lote.length, rep: rep };
      if (!melhor || c2.matched > melhor.matched || (c2.matched === melhor.matched && (c2.cobRel > melhor.cobRel ||
        (c2.cobRel === melhor.cobRel && (c2.r.prioridade || 0) < (melhor.r.prioridade || 0))))) melhor = c2;
    });
    if (!melhor) return null;

    var atribuicoes = [], residuais = [], consumo = [];
    banco.forEach(function (ids, c) {
      var idxs = melhor.rep.get(c) || [];
      var m = Math.min(ids.length, idxs.length);
      ids.forEach(function (id, k) {
        if (k >= m) { residuais.push(id); return; }
        if (idxs.length === 1) atribuicoes.push({ id: id, pessoaIdx: idxs[0], repetido: false, grupo: idxs.slice() });
        else atribuicoes.push({ id: id, pessoaIdx: null, repetido: true, grupo: idxs.slice() }); // quem é quem entre valores iguais não se sabe — nunca inventa nome
      });
      // só marca as pessoas como usadas quando TODAS as ocorrências do valor foram pagas neste lote (senão não dá pra dizer quem sobrou)
      if (m > 0 && m === idxs.length) idxs.forEach(function (i) { consumo.push(melhor.r.chave + '|' + i); });
    });
    return { relatorio: melhor.r, atribuicoes: atribuicoes, residuais: residuais, consumo: consumo, matched: melhor.matched, cobRelatorio: melhor.cobRel, cobLote: melhor.cobLote };
  }

  // lotes: [{chave, linhas:[{id,valor}]}] · relatoriosDoLote(chave) → relatórios · consumidos: Set (alterado)
  // Resolve primeiro o lote de MAIOR cobertura (um relatório não é roubado por outro lote depois).
  function resolverLotes(lotes, relatoriosDoLote, consumidos, opcoes) {
    var restantes = lotes.slice(), saida = [];
    for (;;) {
      var melhor = null;
      restantes.forEach(function (lt) {
        var res = casarLote(lt.linhas, relatoriosDoLote(lt.chave), consumidos, opcoes);
        if (res && (!melhor || res.matched > melhor.res.matched || (res.matched === melhor.res.matched && res.cobRelatorio > melhor.res.cobRelatorio))) melhor = { lt: lt, res: res };
      });
      if (!melhor) break;
      melhor.res.consumo.forEach(function (k) { consumidos.add(k); });
      saida.push({ chave: melhor.lt.chave, resultado: melhor.res });
      restantes = restantes.filter(function (x) { return x !== melhor.lt; });
    }
    return saida;
  }

  var api = { casarLote: casarLote, resolverLotes: resolverLotes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JJRFopagLote = api;
})(typeof window !== 'undefined' ? window : globalThis);

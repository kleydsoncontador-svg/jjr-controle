/* Explicações em linguagem simples para cada resultado das Análises Contábeis (pedido do usuário 05/11/2026: "explicação de cada resultado, para o cliente leigo; se der, uma sugestão").
   AnExplica.de(linha) -> { t: "o que significa", s: "sugestão" } ou null. Cada índice tem faixas: o texto muda conforme o valor.
   As faixas seguem a interpretação usual da análise de balanços (Assaf Neto, Marion, Matarazzo, material do Sebrae e de portais de contabilidade) — são REFERÊNCIAS: o ideal varia por setor,
   e os valores aqui são do balancete acumulado do exercício (não anualizados). Para mudar uma faixa, edite a função do índice correspondente abaixo. */
(function (root) {
  const n = (x, d) => Number(x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const R = c => 'R$ ' + n(Math.abs(c) / 100, 2);          // valores em R$ vêm em centavos
  const NA = (motivo) => [motivo || 'Não foi possível calcular com os dados deste balancete.', ''];
  const SETOR = ' O ideal varia conforme o ramo da empresa.';

  const T = {
    'Índice de Liquidez Geral': v => v === null ? NA() :
      v < 0.5 ? ['Para cada R$ 1,00 que a empresa deve no total (curto e longo prazo), ela tem só R$ ' + n(v, 2) + ' em dinheiro, valores a receber e bens que viram dinheiro. Se tivesse que pagar tudo, faltaria bastante.', 'Alongar os prazos das dívidas, reforçar o caixa (aporte dos sócios, vender estoque parado) e evitar novas dívidas até melhorar.']
      : v < 1 ? ['Para cada R$ 1,00 de dívidas totais a empresa tem R$ ' + n(v, 2) + ' de bens e direitos: ainda é menos do que deve. Não é necessariamente grave se as dívidas vencem a longo prazo, mas pede atenção.', 'Acompanhar mês a mês e buscar reduzir dívidas ou aumentar o capital próprio.']
      : v < 1.5 ? ['Para cada R$ 1,00 de dívidas totais a empresa tem R$ ' + n(v, 2) + ': cobre tudo o que deve, com alguma folga.', 'Manter o controle das dívidas e do caixa.']
      : ['Para cada R$ 1,00 de dívidas totais a empresa tem R$ ' + n(v, 2) + ': folga grande para pagar tudo o que deve.', 'Verificar se há dinheiro parado que poderia render ou ser investido no negócio.'],

    'Índice de Liquidez Corrente': v => v === null ? NA() :
      v < 0.8 ? ['No curto prazo (próximos 12 meses) a empresa tem só R$ ' + n(v, 2) + ' para cada R$ 1,00 que precisa pagar. Há risco de faltar dinheiro para as contas do dia a dia.', 'Cobrar clientes em dia, negociar prazo com fornecedores/bancos, vender estoque parado ou pedir aporte aos sócios.']
      : v < 1 ? ['No curto prazo a empresa tem R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar: está um pouco abaixo do necessário, o caixa fica apertado.', 'Antecipar recebimentos e alongar prazos de pagamento para ganhar fôlego.']
      : v < 1.5 ? ['No curto prazo a empresa tem R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar: situação equilibrada, mas com pouca sobra.', 'Manter o acompanhamento do caixa; evitar assumir novas dívidas de curto prazo.']
      : v < 2.5 ? ['No curto prazo a empresa tem R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar: situação confortável.', 'Manter. Se a sobra continuar crescendo, avaliar usar o excedente no negócio.']
      : ['No curto prazo a empresa tem R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar: muita folga, o que pode significar dinheiro, estoque ou clientes "parados" além do necessário.', 'Verificar se vale investir, abater dívidas caras ou distribuir lucros.'],

    'Índice de Liquidez Seca': v => v === null ? NA() :
      v < 0.5 ? ['Sem contar o estoque (que pode demorar a virar dinheiro), a empresa tem só R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar no curto prazo. Depende muito de vender o estoque para quitar as contas.', 'Acelerar a venda do estoque, cobrar clientes e negociar prazos com fornecedores.']
      : v < 1 ? ['Sem contar o estoque, a empresa tem R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar no curto prazo: precisa vender estoque para fechar as contas.', 'Reduzir estoques parados e antecipar recebimentos.']
      : v < 1.5 ? ['Mesmo sem contar o estoque, a empresa tem R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar no curto prazo: paga suas contas sem depender de vender mercadoria.', 'Manter.']
      : ['Mesmo sem contar o estoque, a empresa tem R$ ' + n(v, 2) + ' para cada R$ 1,00 a pagar no curto prazo: folga grande.', 'Avaliar se há dinheiro parado que poderia ser aplicado ou reinvestido.'],

    'Índice de Liquidez Imediata': v => v === null ? NA() :
      v < 0.05 ? ['Só com o dinheiro em caixa e bancos, a empresa cobre R$ ' + n(v, 2) + ' de cada R$ 1,00 que vence no curto prazo: quase nada em caixa.', 'Manter uma reserva de caixa para imprevistos; ela é a primeira defesa contra atrasos de clientes.']
      : v < 0.3 ? ['Só com o dinheiro em caixa e bancos, a empresa cobre R$ ' + n(v, 2) + ' de cada R$ 1,00 do curto prazo. É comum, pois a empresa conta com os recebimentos do dia a dia.', 'Avaliar manter uma reserva equivalente a pelo menos 1 mês de despesas.']
      : v < 1 ? ['Só com o dinheiro em caixa e bancos, a empresa cobre R$ ' + n(v, 2) + ' de cada R$ 1,00 do curto prazo: boa reserva.', 'Manter.']
      : ['O dinheiro em caixa e bancos já cobre todas as dívidas de curto prazo (R$ ' + n(v, 2) + ' para cada R$ 1,00).', 'Verificar se o caixa parado poderia render mais (aplicações) ou ser reinvestido.'],

    'Índice de Solvência Geral': v => v === null ? NA() :
      v < 1 ? ['Tudo o que a empresa tem (R$ ' + n(v, 2) + ' para cada R$ 1,00 de dívida) vale menos do que ela deve: o patrimônio dos sócios está negativo (passivo a descoberto).', 'Plano de recuperação: gerar lucro, reduzir dívidas e, se possível, aporte de capital dos sócios.']
      : v < 1.2 ? ['Tudo o que a empresa tem vale R$ ' + n(v, 2) + ' para cada R$ 1,00 de dívida: cobre as dívidas, mas com margem pequena.', 'Evitar novas dívidas e fortalecer o lucro.']
      : ['Tudo o que a empresa tem vale R$ ' + n(v, 2) + ' para cada R$ 1,00 de dívida: tem margem confortável para quitar tudo o que deve.', 'Manter.'],

    'Capital Circulante Líquido (CCL)': v => v === null ? NA() :
      v < 0 ? ['O que a empresa tem para receber/usar em até 12 meses é MENOR em ' + R(v) + ' do que as contas que vencem nesse prazo: falta dinheiro de curto prazo.', 'Alongar dívidas, vender estoque parado, cobrar clientes ou pedir aporte aos sócios.']
      : v === 0 ? ['O curto prazo está exatamente empatado: sem folga.', 'Criar uma reserva de caixa.']
      : ['O que a empresa tem para receber/usar em até 12 meses supera em ' + R(v) + ' as contas que vencem nesse prazo: é a folga financeira de curto prazo (capital de giro líquido).', 'Manter essa folga e acompanhá-la todo mês.'],

    'Índice de Capital de Terceiros': v => v === null ? NA() :
      v > 100 ? ['As dívidas somam ' + n(v, 0) + '% de todo o dinheiro que financia a empresa. Passa de 100% porque o patrimônio líquido (capital dos sócios) está NEGATIVO: a empresa deve mais do que tem.', 'Priorizar lucro, renegociação de dívidas e aporte de capital.']
      : v <= 50 ? ['Do dinheiro que financia a empresa, ' + n(v, 0) + '% é de terceiros (fornecedores, bancos, governo) e o restante é dos sócios: predomina o capital próprio.', 'Manter.']
      : v <= 70 ? ['Do dinheiro que financia a empresa, ' + n(v, 0) + '% é de terceiros: equilibrado, mas já depende bastante de dívidas.', 'Evitar aumentar a dependência de terceiros.']
      : ['Do dinheiro que financia a empresa, ' + n(v, 0) + '% é de terceiros: dependência alta, o que aumenta o risco e o custo dos juros.', 'Reduzir dívidas, reter lucros e/ou aumentar o capital dos sócios.'],

    'Índice de Endividamento Geral': v => v === null ? NA() :
      v > 100 ? ['As dívidas (' + n(v, 0) + '% do que a empresa tem) são maiores do que todos os seus bens e direitos: patrimônio líquido negativo.', 'Renegociar dívidas, gerar lucro e avaliar aporte dos sócios.']
      : v <= 40 ? ['As dívidas representam ' + n(v, 0) + '% de tudo o que a empresa tem: endividamento baixo, a maior parte dos bens é dos sócios.', 'Manter.']
      : v <= 60 ? ['As dívidas representam ' + n(v, 0) + '% de tudo o que a empresa tem: nível moderado.', 'Acompanhar para não crescer além disso.']
      : ['As dívidas representam ' + n(v, 0) + '% de tudo o que a empresa tem: endividamento alto, sobra pouco para os sócios.', 'Priorizar a redução das dívidas mais caras.'],

    'Índice de Endividamento Corrente': v => v === null ? NA() :
      v <= 30 ? ['As dívidas que vencem em até 12 meses equivalem a ' + n(v, 0) + '% de tudo o que a empresa tem: pressão de curto prazo baixa.', 'Manter.']
      : v <= 60 ? ['As dívidas que vencem em até 12 meses equivalem a ' + n(v, 0) + '% de tudo o que a empresa tem: pressão moderada sobre o caixa.', 'Acompanhar o fluxo de caixa dos próximos meses.']
      : ['As dívidas que vencem em até 12 meses equivalem a ' + n(v, 0) + '% de tudo o que a empresa tem: pressão forte sobre o caixa.', 'Tentar alongar prazos e renegociar o que vence primeiro.'],

    'Índice de Dívida a Curto Prazo (composição do endividamento)': v => v === null ? NA('A empresa não tem dívidas registradas.') :
      v <= 40 ? ['Do total das dívidas, ' + n(v, 0) + '% vence em até 12 meses: a maior parte vence mais adiante, o que dá conforto ao caixa.', 'Manter.']
      : v <= 70 ? ['Do total das dívidas, ' + n(v, 0) + '% vence em até 12 meses: distribuição mediana.', 'Se possível, trocar dívidas curtas por prazos maiores.']
      : ['Do total das dívidas, ' + n(v, 0) + '% vence em até 12 meses: quase tudo vence logo, o que pressiona o caixa.', 'Alongar o prazo das dívidas e planejar o caixa dos próximos meses.'],

    'Grau de Endividamento (participação de capitais de terceiros)': v => v === null ? NA('Não se aplica: o patrimônio líquido está zero ou negativo (a empresa deve mais do que tem), então não há como comparar a dívida com o capital dos sócios.') :
      v < 0.5 ? ['Para cada R$ 1,00 de capital dos sócios, a empresa deve R$ ' + n(v, 2) + ' a terceiros: pouco endividada.', 'Manter. Há espaço para financiar crescimento, se necessário.']
      : v < 1 ? ['Para cada R$ 1,00 de capital dos sócios, a empresa deve R$ ' + n(v, 2) + ' a terceiros: o capital próprio ainda é maior que as dívidas.', 'Manter o equilíbrio.']
      : v < 2 ? ['Para cada R$ 1,00 de capital dos sócios, a empresa deve R$ ' + n(v, 2) + ' a terceiros: dívidas maiores que o capital próprio, nível normal em muitos negócios.', 'Cuidar para que o lucro cubra os juros.']
      : ['Para cada R$ 1,00 de capital dos sócios, a empresa deve R$ ' + n(v, 2) + ' a terceiros: endividamento alto em relação ao capital próprio.', 'Reduzir dívidas e reter lucros para fortalecer o patrimônio.'],

    'Índice de Garantia de Capital de Terceiros': v => v === null ? NA() :
      v < 0 ? ['O patrimônio dos sócios está negativo: não há capital próprio para garantir as dívidas.', 'Recuperar o patrimônio com lucros, redução de dívidas e/ou aporte de capital.']
      : v < 0.5 ? ['Para cada R$ 1,00 de dívidas, os sócios têm só R$ ' + n(v, 2) + ' de capital próprio como garantia: garantia baixa.', 'Fortalecer o capital próprio (reter lucros).']
      : v < 1 ? ['Para cada R$ 1,00 de dívidas, os sócios têm R$ ' + n(v, 2) + ' de capital próprio: garantia razoável.', 'Manter.']
      : ['Para cada R$ 1,00 de dívidas, os sócios têm R$ ' + n(v, 2) + ' de capital próprio: o capital dos sócios cobre as dívidas, garantia boa.', 'Manter.'],

    'Índice de Capital Próprio sobre Passivo Total': v => v === null ? NA() :
      v < 0 ? ['O capital próprio é negativo: o que a empresa deve é maior do que tudo o que tem.', 'Priorizar lucros e aportes para recompor o patrimônio.']
      : v < 30 ? ['Só ' + n(v, 0) + '% do dinheiro que financia a empresa é dos sócios; o resto vem de dívidas: pouca reserva própria.', 'Reter lucros e reduzir dívidas.']
      : v < 50 ? ['' + n(v, 0) + '% do que financia a empresa é dos sócios: equilíbrio entre capital próprio e de terceiros.', 'Manter.']
      : ['' + n(v, 0) + '% do que financia a empresa é dos sócios: estrutura sólida, com predominância de capital próprio.', 'Manter.'],

    'Índice de Imobilização do Patrimônio Líquido': v => v === null ? NA('Não se aplica: o patrimônio líquido está zero ou negativo.') :
      v <= 50 ? ['Só ' + n(v, 0) + '% do capital dos sócios está preso em bens duráveis (imóveis, máquinas, veículos): sobra bastante capital próprio para o dia a dia (capital de giro).', 'Manter essa flexibilidade.']
      : v <= 100 ? ['' + n(v, 0) + '% do capital dos sócios está preso em bens duráveis: ainda sobra um pouco para o dia a dia, mas com margem menor.', 'Evitar novos investimentos em bens sem fonte própria de recursos.']
      : ['O capital dos sócios (' + n(v, 0) + '%) não cobre os bens duráveis da empresa: parte deles foi comprada com dívidas, e sobra nada do capital próprio para o dia a dia.', 'Alongar prazos das dívidas ligadas aos bens e evitar novos investimentos fixos sem recursos próprios.'],

    'Índice de Imobilização de Recursos Não Correntes': v => v === null ? NA() :
      v <= 100 ? ['Os bens duráveis (' + n(v, 0) + '% dos recursos de longo prazo) estão financiados por capital próprio e dívidas de longo prazo: estrutura segura.', 'Manter.']
      : ['Os bens duráveis (' + n(v, 0) + '% dos recursos de longo prazo) estão em parte financiados por dívidas de curto prazo: risco, porque o dinheiro vence antes de o bem gerar retorno.', 'Trocar dívidas curtas por longas ou capitalizar a empresa.'],

    'Índice de Giro do Ativo': v => v === null ? NA() :
      ['No período, a empresa vendeu R$ ' + n(v, 2) + ' para cada R$ 1,00 aplicado em bens e direitos (acumulado, sem anualizar).' + (v < 0.5 ? ' É um giro baixo: o ativo "trabalha" pouco.' : v < 1.5 ? ' É um giro mediano.' : ' É um giro alto: o ativo trabalha bastante.') + SETOR,
       v < 0.5 ? 'Vender mais com a mesma estrutura ou desfazer-se de ativos que não geram receita.' : 'Acompanhar a evolução mês a mês.'],

    'Margem Operacional': v => v === null ? NA('Sem receita líquida no período.') :
      v < 0 ? ['A operação do negócio dá PREJUÍZO: para cada R$ 100 vendidos, perde-se R$ ' + n(Math.abs(v), 0) + ' antes de juros e impostos sobre o lucro.', 'Rever preços, custos e despesas fixas com urgência.']
      : v < 5 ? ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' do negócio em si (antes de juros e impostos sobre o lucro): margem apertada.', 'Rever preços, descontos, custos e despesas.']
      : v < 15 ? ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' do negócio em si: margem razoável.' + SETOR, 'Manter o controle das despesas.']
      : v <= 40 ? ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' do negócio em si: margem boa.' + SETOR, 'Manter.']
      : ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' do negócio em si: margem muito alta, acima do usual.', 'Confira se todos os custos e despesas do período foram lançados na contabilidade.'],

    'Margem Líquida': v => v === null ? NA('Sem receita líquida no período.') :
      v < 0 ? ['A empresa teve PREJUÍZO no período: para cada R$ 100 vendidos, perdeu R$ ' + n(Math.abs(v), 1) + ' no final.', 'Rever preços, custos, despesas e encargos financeiros.']
      : v < 5 ? ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' de lucro no final, depois de tudo: lucro pequeno.', 'Buscar aumentar margem (preços, custos) ou volume de vendas.']
      : v < 15 ? ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' de lucro no final: lucro razoável.' + SETOR, 'Manter.']
      : v <= 40 ? ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' de lucro no final: lucro bom.' + SETOR, 'Manter.']
      : ['Para cada R$ 100 vendidos, sobram R$ ' + n(v, 1) + ' de lucro no final: muito alto, acima do usual.', 'Confira se todos os custos, despesas e impostos do período foram lançados.'],

    'Rentabilidade do Ativo (ROA)': v => v === null ? NA() :
      v < 0 ? ['No período, a empresa perdeu ' + n(Math.abs(v), 1) + '% do valor aplicado em seus bens e direitos.', 'Recuperar a lucratividade do negócio.']
      : ['No período (acumulado, sem anualizar), a empresa lucrou ' + n(v, 1) + '% sobre tudo o que tem aplicado em bens e direitos.' + (v < 5 ? ' É um retorno baixo.' : v < 15 ? ' É um retorno razoável.' : ' É um bom retorno.'), v < 5 ? 'Comparar com o que esse dinheiro renderia numa aplicação segura; buscar melhorar margem e giro.' : 'Manter.'],

    'Rentabilidade do Patrimônio Líquido (ROE)': v => v === null ? NA('Não se aplica: o patrimônio líquido está zero ou negativo.') :
      v < 0 ? ['No período, os sócios perderam ' + n(Math.abs(v), 1) + '% do capital investido no negócio.', 'Recuperar o lucro; avaliar se o negócio compensa frente a outras aplicações.']
      : ['No período (acumulado, sem anualizar), o capital dos sócios rendeu ' + n(v, 1) + '% em lucro.' + (v < 5 ? ' É pouco: pode render mais numa aplicação segura.' : ' Compare com o que uma aplicação segura renderia no mesmo período.'), 'Se o ROE for menor que o retorno de uma renda fixa, o negócio rende menos que simplesmente investir o dinheiro.'],

    'Retorno sobre o Patrimônio Líquido Médio': v => v === null ? NA('Informe o PL do início do período (balancete de dezembro do ano anterior) para calcular.') :
      ['Igual ao ROE, mas usando o patrimônio médio do período: o capital dos sócios rendeu ' + n(v, 1) + '% no período.', 'Compare com o retorno de uma aplicação segura.'],

    'Prazo Médio de Recebimento': v => v === null ? NA() :
      v <= 1 ? ['Os clientes pagam praticamente à vista (' + n(v, 1) + ' dia(s) em média).', 'Manter.']
      : v <= 30 ? ['Os clientes levam em média ' + n(v, 1) + ' dias para pagar: prazo curto, bom para o caixa.', 'Manter.']
      : v <= 60 ? ['Os clientes levam em média ' + n(v, 1) + ' dias para pagar: a empresa financia as vendas por esse tempo.', 'Comparar com o prazo que a própria empresa tem para pagar fornecedores.']
      : ['Os clientes levam em média ' + n(v, 1) + ' dias para pagar: prazo longo, o dinheiro das vendas demora a entrar.', 'Cobrar em dia, dar desconto para pagamento à vista ou antecipar recebíveis.'],

    'Prazo Médio de Renovação dos Estoques': v => v === null ? NA() :
      v === 0 ? ['A empresa não tem estoque (ou ele é irrelevante).', '']
      : v <= 30 ? ['O estoque se renova em cerca de ' + n(v, 1) + ' dias: giro rápido.', 'Manter.']
      : v <= 90 ? ['O estoque leva em média ' + n(v, 1) + ' dias para ser vendido: giro mediano.', 'Evitar comprar além do necessário.']
      : ['O estoque leva em média ' + n(v, 1) + ' dias para ser vendido: giro lento, dinheiro parado em mercadoria.', 'Fazer promoções de itens parados e ajustar o volume das compras.'],

    'Prazo Médio de Pagamento': v => v === null ? NA() :
      v <= 15 ? ['A empresa paga os fornecedores em cerca de ' + n(v, 1) + ' dias: paga rápido, usa pouco o prazo que poderia ter.', 'Negociar prazos maiores com os fornecedores para aliviar o caixa.']
      : v <= 45 ? ['A empresa leva em média ' + n(v, 1) + ' dias para pagar os fornecedores: prazo equilibrado.', 'Manter.']
      : ['A empresa leva em média ' + n(v, 1) + ' dias para pagar os fornecedores: usa bastante o prazo deles (ajuda o caixa).', 'Cuidar para não atrasar pagamentos e perder desconto ou crédito.'],

    'Ciclo Operacional': v => v === null ? NA() :
      ['Passam-se em média ' + n(v, 1) + ' dias entre comprar a mercadoria e receber do cliente.' + (v > 90 ? ' É um ciclo longo.' : ''), v > 90 ? 'Reduzir o prazo de estoque e de recebimento.' : 'Manter.'],

    'Ciclo de Caixa (ciclo financeiro)': v => v === null ? NA() :
      v < 0 ? ['Os fornecedores financiam a operação: a empresa recebe dos clientes ' + n(Math.abs(v), 1) + ' dias ANTES de pagar quem forneceu. Isso é bom para o caixa.', 'Manter.']
      : v <= 30 ? ['A empresa precisa bancar ' + n(v, 1) + ' dias de operação com recursos próprios ou de empréstimo: prazo curto.', 'Manter.']
      : ['A empresa precisa bancar ' + n(v, 1) + ' dias de operação com recursos próprios ou de empréstimo: prazo longo, exige bastante capital de giro.', 'Reduzir estoque e prazo de recebimento, ou negociar mais prazo com fornecedores.'],

    'Fator de Insolvência': v => v === null ? NA() :
      v > 0 ? ['Resultado positivo (' + n(v, 2) + '): pelo modelo de Kanitz, a empresa está na faixa "solvente", com baixa chance de dificuldades para pagar as dívidas.', 'Manter. É um modelo antigo e serve só de indicativo.']
      : v >= -3 ? ['Resultado entre -3 e 0 (' + n(v, 2) + '): faixa de "penumbra" do modelo de Kanitz: situação indefinida, merece atenção.', 'Acompanhar liquidez, endividamento e lucro nos próximos balancetes.']
      : ['Resultado abaixo de -3 (' + n(v, 2) + '): faixa de "insolvência" do modelo de Kanitz: risco alto de dificuldades para pagar as dívidas.', 'Plano de ação imediato: reduzir dívidas, melhorar o caixa e o lucro. É um modelo antigo, serve como alerta.'],

    // ── análises extras ──
    'Margem líquida': v => T['Margem Líquida'](v),
    'Giro do ativo': v => T['Índice de Giro do Ativo'](v),
    'Multiplicador de alavancagem': v => v === null ? NA('Não se aplica: patrimônio líquido zero ou negativo.') :
      ['Para cada R$ 1,00 de capital dos sócios, a empresa tem R$ ' + n(v, 2) + ' em bens e direitos. Quanto maior, mais a empresa usa dívidas para crescer (alavancagem): turbina o lucro, mas aumenta o risco.', v > 3 ? 'Nível alto de alavancagem: cuidado com os juros.' : 'Nível normal.'],
    'ROE = margem × giro × alavancagem': v => T['Rentabilidade do Patrimônio Líquido (ROE)'](v),
    'Necessidade de capital de giro (NCG)': v => v === null ? NA() :
      v > 0 ? ['O dia a dia da operação (clientes + estoques − fornecedores) "consome" ' + R(v) + ' de dinheiro que precisa vir de capital próprio ou empréstimo.', 'Reduzir estoque e prazo de recebimento, ou negociar mais prazo com fornecedores.']
      : ['O dia a dia da operação gera ' + R(v) + ' de folga: clientes, estoques e fornecedores juntos financiam a empresa.', 'Manter.'],
    'Capital de giro (CDG)': v => v === null ? NA() :
      v > 0 ? ['Os recursos de longo prazo (capital dos sócios + dívidas longas) superam o que está investido em bens duráveis em ' + R(v) + ': esse valor sobra para financiar o dia a dia.', 'Manter.']
      : ['Os recursos de longo prazo não bastam para cobrir os bens duráveis: faltam ' + R(v) + ' que acabam sendo pagos com dívidas de curto prazo.', 'Alongar dívidas ou capitalizar a empresa.'],
    'Saldo de tesouraria (T)': v => v === null ? NA() :
      v >= 0 ? ['A empresa tem folga financeira de ' + R(v) + ' (o capital de giro cobre a necessidade de giro): sobra dinheiro em caixa/aplicações.', 'Manter.']
      : ['Falta ' + R(v) + ': a empresa financia a operação com dívidas de curto prazo (como cheque especial e empréstimos curtos). É um sinal de alerta.', 'Trocar dívidas curtas por longas e reforçar o capital de giro.'],
    'Margem de contribuição': v => v === null ? NA() : ['É o que sobra das vendas depois dos custos e despesas que variam com elas (' + R(v) + '): esse valor paga as despesas fixas e, se ainda sobrar, vira lucro.', v < 0 ? 'Negativa: cada venda piora o resultado. Rever preço e custos urgentemente.' : 'Quanto maior, mais fácil cobrir as despesas fixas.'],
    'Índice da margem de contribuição': v => v === null ? NA() : ['De cada R$ 100 vendidos, R$ ' + n(v, 1) + ' sobram para pagar despesas fixas e gerar lucro.', v < 20 ? 'Margem baixa: rever preços e custos variáveis.' : 'Manter.'],
    'Custos e despesas fixos': v => v === null ? NA() : ['São as despesas que a empresa paga mesmo sem vender nada (' + R(v) + ').', 'Quanto menores, mais rápido a empresa chega ao ponto de equilíbrio.'],
    'Ponto de equilíbrio contábil (em receita)': v => v === null ? NA('Não calculado: a margem de contribuição não cobre nada (ou não há despesas variáveis informadas).') : ['É quanto a empresa precisa vender no período (' + R(v) + ') para pagar todos os custos e despesas e ficar no zero a zero.', 'Vendas acima desse valor viram lucro; abaixo, prejuízo.'],
    'Ponto de equilíbrio financeiro (em receita)': v => v === null ? NA() : ['É quanto precisa vender (' + R(v) + ') para pagar as contas em dinheiro (desconsidera a depreciação, que não sai do caixa).', 'Se as vendas ficarem abaixo disso, o caixa fica no vermelho.'],
    'Ponto de equilíbrio econômico (em receita)': v => v === null ? NA() : ['É quanto precisa vender (' + R(v) + ') para cobrir as despesas e ainda ter o lucro mínimo que os sócios querem.', 'Use como meta de vendas.'],
    'Margem de segurança': v => v === null ? NA() : v < 0 ? ['As vendas estão ABAIXO do ponto de equilíbrio (' + n(v, 1) + '%): a empresa está no prejuízo.', 'Aumentar vendas ou cortar custos fixos.'] : ['As vendas podem cair ' + n(v, 1) + '% antes de a empresa entrar no prejuízo.', v < 10 ? 'Margem de segurança baixa: cuidado com quedas de venda.' : 'Boa folga.'],
    'Ponto de equilíbrio mensal médio': v => v === null ? NA() : ['Em média, a empresa precisa vender ' + R(v) + ' por mês para ficar no zero a zero.', 'Compare com a venda mensal real.'],
    'Dias de vendas para atingir o equilíbrio': v => v === null ? NA() : ['Em ' + n(v, 0) + ' dia(s) de venda do período a empresa já cobre todos os seus custos; daí em diante o dinheiro vira lucro.', 'Quanto menor, melhor.'],
    'Grau de alavancagem operacional (GAO)': v => v === null ? NA() : ['Se as vendas subirem 1%, o lucro operacional sobe cerca de ' + n(v, 1) + '% (e cai na mesma proporção se as vendas caírem). Quanto maior, mais sensível o lucro às vendas.', v > 5 ? 'Alto: lucro muito sensível; cuidado com queda de vendas.' : 'Nível normal.'],

    // ── EBITDA / EVA ──
    'EBIT (resultado antes dos juros e do IR/CSLL)': v => v === null ? NA() : v < 0 ? ['A operação deu prejuízo de ' + R(v) + ' antes de juros e impostos sobre o lucro.', 'Rever preços, custos e despesas.'] : ['A operação gerou ' + R(v) + ' de resultado antes de juros e impostos sobre o lucro.', 'Compare com o período anterior.'],
    'EBITDA (LAJIDA)': v => v === null ? NA() : v < 0 ? ['A operação consumiu ' + R(v) + ' em caixa antes de juros, impostos e depreciação.', 'Corrigir a operação antes de tudo.'] : ['É o "caixa" gerado só pelo negócio (' + R(v) + '), antes de juros, impostos e depreciação.', 'Quanto maior, mais fácil pagar dívidas e investir.'],
    'Margem EBITDA': v => v === null ? NA() : ['De cada R$ 100 vendidos, R$ ' + n(v, 1) + ' viram caixa operacional.', v < 10 ? 'Margem baixa.' : 'Manter.'],
    'Margem EBIT': v => v === null ? NA() : ['De cada R$ 100 vendidos, R$ ' + n(v, 1) + ' sobram da operação antes de juros e impostos sobre o lucro.', v < 5 ? 'Margem baixa.' : 'Manter.'],
    'NOPAT (lucro operacional após impostos)': v => v === null ? NA() : ['É o lucro da operação depois dos impostos, sem considerar juros: ' + R(v) + '.', 'Base para saber se o negócio paga o custo do capital.'],
    'Capital investido': v => v === null ? NA() : ['É o total de dinheiro (dos sócios e de dívidas que cobram juros) aplicado no negócio: ' + R(v) + '.', ''],
    'Capital empregado': v => v === null ? NA() : ['É o dinheiro de longo prazo (sócios + dívidas longas) usado no negócio: ' + R(v) + '.', ''],
    'ROIC (retorno sobre o capital investido)': v => v === null ? NA() : ['Cada R$ 100 aplicados no negócio geraram R$ ' + n(v, 1) + ' de lucro operacional após impostos (no período).', 'Se for menor que o custo do dinheiro (WACC), o negócio destrói valor.'],
    'ROCE (retorno sobre o capital empregado)': v => v === null ? NA() : ['Cada R$ 100 de recursos de longo prazo geraram R$ ' + n(v, 1) + ' de lucro operacional (no período).', 'Compare com o custo das dívidas e do capital dos sócios.'],
    'ROE (retorno sobre o patrimônio líquido)': v => T['Rentabilidade do Patrimônio Líquido (ROE)'](v),
    'ROA (retorno sobre o ativo)': v => T['Rentabilidade do Ativo (ROA)'](v),
    'WACC (custo médio ponderado de capital)': v => v === null ? NA('Informe o custo do capital próprio (Ke) e da dívida (Kd) para calcular.') : ['É o "preço" médio do dinheiro usado no negócio: ' + n(v, 1) + '% ao ano (mistura o que os sócios esperam ganhar e os juros das dívidas).', 'O negócio só cria valor se render mais do que isso.'],
    'EVA (valor econômico agregado)': v => v === null ? NA('Informe Ke e Kd para calcular.') : v < 0 ? ['O negócio rendeu menos do que o custo do dinheiro usado nele: destruiu ' + R(v) + ' de valor.', 'Melhorar a margem, o giro ou reduzir o capital parado.'] : ['O negócio rendeu mais do que o custo do dinheiro usado nele: criou ' + R(v) + ' de valor.', 'Manter.'],
    'Spread (ROIC − WACC)': v => v === null ? NA() : v < 0 ? ['O retorno do negócio está ' + n(Math.abs(v), 1) + ' ponto(s) percentual(is) abaixo do custo do dinheiro: não está compensando.', 'Melhorar a rentabilidade ou diminuir o capital aplicado.'] : ['O retorno do negócio está ' + n(v, 1) + ' ponto(s) percentual(is) acima do custo do dinheiro: compensa.', 'Manter.'],
    'Dívida líquida': v => v === null ? NA() : v < 0 ? ['A empresa tem mais dinheiro em caixa/aplicações do que dívidas com juros (sobram ' + R(v) + '): posição de caixa líquido.', 'Manter.'] : ['As dívidas com juros, descontado o caixa, somam ' + R(v) + '.', 'Reduzir usando o caixa excedente, se houver.'],
    'Dívida líquida ÷ EBITDA': v => v === null ? NA() : v < 0 ? ['Mais caixa que dívida: sem dívida líquida.', 'Manter.'] : v < 2 ? ['A empresa pagaria a dívida líquida com ' + n(v, 1) + ' ano(s) do caixa que gera: endividamento confortável.', 'Manter.'] : v < 4 ? ['A empresa precisaria de ' + n(v, 1) + ' ano(s) do caixa que gera para quitar a dívida líquida: atenção.', 'Não aumentar a dívida.'] : ['A empresa precisaria de ' + n(v, 1) + ' ano(s) do caixa que gera para quitar a dívida líquida: endividamento pesado.', 'Priorizar a redução da dívida.'],
    'Cobertura de juros': v => v === null ? NA('Sem despesas de juros no período.') : v < 1 ? ['O resultado da operação (' + n(v, 1) + 'x) não cobre os juros: a empresa paga juros com o próprio capital.', 'Reduzir dívidas caras com urgência.'] : v < 3 ? ['O resultado da operação cobre os juros ' + n(v, 1) + ' vez(es): cobertura apertada.', 'Evitar mais dívidas.'] : ['O resultado da operação cobre os juros ' + n(v, 1) + ' vezes: folga confortável.', 'Manter.']
  };
  T['Liquidez Seca (variante sem despesas antecipadas)'] = T['Índice de Liquidez Seca'];

  root.AnExplica = {
    de: function (linha) {
      if (!linha || !linha.nome) return null;
      const f = T[linha.nome]; if (!f) return null;
      try { const r = f(linha.valor === undefined ? null : linha.valor); return r ? { t: r[0] || '', s: r[1] || '' } : null; } catch (e) { return null; }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

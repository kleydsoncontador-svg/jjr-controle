/* Mapas mentais curados — lote 1 (normas das aulas do BKR Recife e as de uso mais comum no escritório).
   Montados a partir da explicação publicada em nbc-conteudo-*.js. Material de apoio ao estudo: vale sempre a norma original.
   n(texto, filhos, tipo, detalhe) — tipo: 'sim' | 'nao' | 'res' | 'nota' | 'alerta' */
(function () {
  window.NBC_MAPAS = window.NBC_MAPAS || {};
  const n = (t, f, k, d) => { const o = { t }; if (f && f.length) o.f = f; if (k) o.k = k; if (d) o.d = d; return o; };
  const M = (cod, raiz) => { window.NBC_MAPAS[cod] = { autor: 'JJR — a partir da explicação publicada e das aulas de referência', raiz }; };

  M('NBC TG ESTRUTURA CONCEITUAL', n('Estrutura Conceitual — a “constituição” da contabilidade', [
    n('Objetivo', [n('Dar informação útil a investidores, credores e outros para decidir sobre fornecer recursos à entidade')]),
    n('Características qualitativas', [
      n('Fundamentais', [n('Relevância (muda decisões; valor preditivo e confirmatório)'), n('Representação fidedigna (completa, neutra, livre de erro)')]),
      n('De melhoria', [n('Comparabilidade'), n('Verificabilidade'), n('Tempestividade'), n('Compreensibilidade')])]),
    n('Elementos das demonstrações', [
      n('Posição patrimonial', [n('Ativo — recurso econômico controlado, resultado de evento passado'), n('Passivo — obrigação presente de transferir recurso econômico'), n('Patrimônio líquido — interesse residual')]),
      n('Desempenho', [n('Receita — aumento de ativo ou redução de passivo que aumenta o PL'), n('Despesa — redução de ativo ou aumento de passivo que reduz o PL')])]),
    n('Reconhecimento e baixa', [n('Reconhece quando traz informação relevante e fidedigna'), n('Baixa quando o item deixa de atender à definição')]),
    n('Mensuração', [n('Custo histórico'), n('Valor corrente: valor justo, valor em uso / cumprimento, custo corrente')]),
    n('Apresentação e divulgação', [n('Comunicar com eficácia: classificar, agregar, compensar com critério')]),
    n('Conceitos de capital e manutenção de capital', [n('Capital financeiro × capital físico')])
  ]));

  M('NBC TG 01', n('Redução ao valor recuperável de ativos (impairment)', [
    n('Regra de ouro', [n('Valor contábil NÃO pode superar o valor recuperável', null, 'res')]),
    n('Quando testar', [
      n('A cada fechamento: há sinal de perda?', [n('Externos: queda de mercado, juros maiores, valor de mercado da empresa abaixo do PL'), n('Internos: obsolescência, dano físico, ociosidade, desempenho pior que o previsto')]),
      n('Teste OBRIGATÓRIO todo ano (mesmo sem sinal)', [n('Intangível de vida útil indefinida'), n('Intangível ainda não disponível para uso'), n('Ágio (goodwill) de combinação de negócios')])]),
    n('Valor recuperável = o MAIOR entre', [n('Valor justo líquido de despesas de venda'), n('Valor em uso (valor presente dos fluxos de caixa futuros)'), n('Basta um dos dois superar o valor contábil para NÃO haver perda', null, 'nota')]),
    n('Ativo sozinho não gera caixa independente?', [n('Teste na UGC (menor grupo que gera entradas de caixa independentes)'), n('Ágio é alocado às UGCs que se beneficiam da combinação')]),
    n('Se há perda', [n('Vai para o resultado (ou reduz o superávit de reavaliação)'), n('Em UGC: reduz primeiro o ágio, depois os demais ativos proporcionalmente')]),
    n('Reversão da perda', [n('Só se mudaram as estimativas usadas'), n('Limite: o valor que o ativo teria sem a perda (líquido da depreciação)'), n('ÁGIO NUNCA REVERTE', null, 'alerta')])
  ]));

  M('NBC TG 04', n('Ativo intangível', [
    n('O que é', [n('Ativo não monetário identificável, sem substância física (software, marcas, patentes, licenças)'), n('3 requisitos', [n('Identificável (separável ou direito legal/contratual)'), n('Controlado pela entidade'), n('Gera benefícios econômicos futuros')])]),
    n('Reconhecimento', [n('Provável benefício futuro + custo mensurável com confiança')]),
    n('Como entrou na empresa', [
      n('Comprado separadamente → pelo custo de aquisição'),
      n('Em combinação de negócios → pelo valor justo'),
      n('Gerado internamente', [
        n('FASE DE PESQUISA → despesa', null, 'nao'),
        n('FASE DE DESENVOLVIMENTO → pode virar ativo se demonstrar tudo', [n('Viabilidade técnica'), n('Intenção de concluir e usar/vender'), n('Capacidade de usar/vender'), n('Como gerará benefícios'), n('Recursos disponíveis para concluir'), n('Mensuração confiável do gasto')], 'sim'),
        n('NÃO se ativa: marcas, títulos, listas de clientes e ágio gerados internamente', null, 'alerta')])]),
    n('Depois do reconhecimento', [
      n('Modelo do custo (ou reavaliação, só com mercado ativo)'),
      n('Vida útil DEFINIDA → amortiza; revisa vida útil e método a cada exercício', null, 'sim'),
      n('Vida útil INDEFINIDA → não amortiza; teste de impairment todo ano (TG 01)', null, 'nao')]),
    n('Baixa', [n('Na alienação ou quando não há benefício futuro; ganho/perda no resultado')])
  ]));

  M('NBC TG 27', n('Ativo imobilizado', [
    n('Reconhecimento', [n('Tangível usado na produção, fornecimento, aluguel ou administração por MAIS de um período'), n('Provável benefício futuro + custo confiável'), n('Peças de reposição: imobilizado se uso > 1 ano; senão estoque')]),
    n('Custo inicial', [
      n('Entra', [n('Preço de compra + impostos não recuperáveis − descontos'), n('Custos para colocar em condições de uso (instalação, frete, testes)'), n('Estimativa de desmontagem, remoção e restauração do local')], 'sim'),
      n('Não entra (vai para despesa)', [n('Abertura de nova instalação, treinamento, custos administrativos e perdas operacionais iniciais')], 'nao')]),
    n('Gastos posteriores', [n('Manutenção do dia a dia → despesa'), n('Substituição de parte relevante → capitaliza e baixa a parte antiga'), n('Inspeção/revisão periódica obrigatória → capitaliza')]),
    n('Depois do reconhecimento', [n('Modelo do custo: custo − depreciação − impairment'), n('Modelo de reavaliação: valor justo; reavalia toda a classe; superávit vai a ORA')]),
    n('Depreciação', [
      n('Cada componente relevante é depreciado separadamente'),
      n('Base = custo − valor residual'),
      n('Começa quando está disponível para uso; para na baixa ou ao virar “mantido para venda”'),
      n('Método reflete o consumo dos benefícios (linear, saldos decrescentes, unidades produzidas)'),
      n('Terrenos não se depreciam', null, 'alerta'),
      n('Revisar vida útil, residual e método ao menos todo ano; mudança = estimativa (TG 23)', null, 'nota')]),
    n('Impairment', [n('Testar conforme TG 01')]),
    n('Baixa', [n('Na venda ou quando não há benefício futuro'), n('Ganho/perda = valor líquido recebido − valor contábil; vai ao resultado')])
  ]));

  M('NBC TG 28', n('Propriedade para investimento', [
    n('O que é', [n('Terreno ou edifício mantido para ganhar ALUGUEL e/ou VALORIZAÇÃO'), n('Não é: uso próprio (TG 27) nem venda no curso normal (estoque, TG 16)', null, 'alerta')]),
    n('Casos limítrofes', [n('Parte própria + parte alugada: separa se puder ser vendida/alugada separadamente'), n('Serviços auxiliares insignificantes ao inquilino: continua PI')]),
    n('Custo inicial', [n('Preço de compra + gastos diretamente atribuíveis (impostos não recuperáveis, honorários)')]),
    n('Escolha da política (vale para TODAS as PI)', [
      n('Modelo do VALOR JUSTO', [n('Sem depreciação'), n('Variação do valor justo vai ao RESULTADO'), n('Valor justo da data do balanço')], 'sim'),
      n('Modelo do CUSTO', [n('Como o imobilizado: depreciação + impairment'), n('Divulga o valor justo em nota')], 'sim')]),
    n('Transferências (mudança de uso)', [n('Início de uso próprio → imobilizado'), n('Início de desenvolvimento para venda → estoque'), n('Fim do uso próprio → PI'), n('Início de aluguel a terceiros → PI')]),
    n('Baixa', [n('Na venda ou quando deixa de ser usado; ganho/perda no resultado')])
  ]));

  M('NBC TG 31', n('Ativo não circulante mantido para venda e operação descontinuada', [
    n('Quando classificar como “mantido para venda”', [
      n('O valor contábil será recuperado PRINCIPALMENTE pela venda, não pelo uso'),
      n('Disponível para venda imediata nas condições atuais'),
      n('Venda ALTAMENTE PROVÁVEL', [n('Administração comprometida com o plano'), n('Programa ativo para achar comprador'), n('Preço razoável em relação ao valor justo'), n('Expectativa de concluir em até 1 ano')])]),
    n('Mensuração', [n('O MENOR entre valor contábil e valor justo líquido das despesas de venda', null, 'res'), n('Perda por redução vai ao resultado')]),
    n('Para de depreciar/amortizar', null, 'nao'),
    n('Apresentação', [n('Separado no balanço (ativo e passivos relacionados), circulante')]),
    n('Operação descontinuada', [n('Componente já baixado ou mantido para venda E que seja linha de negócio ou região geográfica principal e separada (ou controlada adquirida só para revenda)'), n('DRE: resultado em UMA linha (após impostos)')]),
    n('Se deixar de ser “para venda”', [n('Volta a ser classificado como antes'), n('Mede pelo menor entre o valor contábil antes (ajustado por depreciação que teria) e o valor recuperável')]),
    n('Divulgação em nota')
  ]));

  M('NBC TG 23', n('Políticas contábeis, mudança de estimativa e retificação de erro', [
    n('Escolher a política', [n('Existe norma para a transação? → aplica a norma'), n('Não existe? → julgamento da administração: informação relevante e confiável (hierarquia dos itens 10 a 12)')]),
    n('Consistência', [n('Mesma política para transações semelhantes')]),
    n('Três situações — qual é a sua?', [
      n('MUDANÇA DE POLÍTICA', [n('Só se exigida por norma ou se gerar informação mais relevante e confiável'), n('Aplicação RETROSPECTIVA: ajusta saldo inicial do PL e comparativos'), n('Se impraticável: aplica a partir do período mais antigo possível')], 'res'),
      n('MUDANÇA DE ESTIMATIVA', [n('Aplicação PROSPECTIVA: afeta o resultado do período e dos futuros'), n('Exemplos: vida útil, provisão para devedores duvidosos, valor residual')], 'res'),
      n('ERRO', [n('Correção RETROSPECTIVA: reapresenta comparativos e saldos iniciais'), n('Não passa pelo resultado do período corrente como se fosse mudança de estimativa')], 'res')]),
    n('Na dúvida entre política e estimativa', [n('Trata como mudança de ESTIMATIVA', null, 'alerta')]),
    n('Erro × estimativa', [n('Erro = falha no uso de informação que existia e deveria ser usada (cálculo, fato mal interpretado, fraude)'), n('Estimativa = ajuste porque surgiu informação nova')]),
    n('Divulgação', [n('Natureza, valor do ajuste, períodos afetados')])
  ]));

  M('NBC TG 25', n('Provisões, passivos contingentes e ativos contingentes', [
    n('Quando reconhecer PROVISÃO (as 3 condições juntas)', [n('Obrigação presente (legal ou construtiva) por evento passado'), n('Saída de recursos PROVÁVEL (mais provável que não)'), n('Estimativa confiável do valor')], 'sim'),
    n('Probabilidade de perda → tratamento', [
      n('PROVÁVEL', [n('Provisão no balanço + nota explicativa')], 'res'),
      n('POSSÍVEL', [n('Passivo contingente: só divulga em nota')], 'nota'),
      n('REMOTA', [n('Nada a registrar nem divulgar')], 'nao')]),
    n('Ativo contingente', [n('Não reconhece'), n('Divulga se a entrada for provável'), n('Se virar praticamente certo → deixa de ser contingente e reconhece')]),
    n('Mensuração', [n('Melhor estimativa do desembolso necessário'), n('Considera risco e incerteza'), n('Valor presente se o efeito do prazo for material'), n('Ganho esperado na venda de ativo NÃO reduz a provisão')]),
    n('Casos especiais', [
      n('Contrato oneroso', [n('Provisão pelo MENOR custo entre cumprir e rescindir')]),
      n('Reestruturação', [n('Só com plano formal detalhado E expectativa válida nos afetados (anúncio)')]),
      n('Reembolso esperado (seguro)', [n('Ativo separado só se praticamente certo; limitado ao valor da provisão')])]),
    n('Depois', [n('Revisar a cada balanço'), n('Usar a provisão somente para o fim para o qual foi criada')])
  ]));

  M('NBC TG 26', n('Apresentação das demonstrações contábeis', [
    n('Conjunto completo', [n('Balanço patrimonial'), n('Demonstração do resultado e do resultado abrangente'), n('Demonstração das mutações do patrimônio líquido'), n('Demonstração dos fluxos de caixa'), n('Notas explicativas'), n('DVA (quando exigida, NBC TG 09)')]),
    n('Princípios', [n('Apresentação adequada: cumprir as normas'), n('Continuidade operacional'), n('Regime de competência'), n('Consistência de apresentação entre períodos'), n('Materialidade e agregação'), n('Compensação só quando permitida'), n('Informação comparativa do período anterior')]),
    n('Balanço', [n('Circulante × não circulante (realização/liquidação em até 12 meses ou no ciclo operacional)'), n('Linhas mínimas: imobilizado, intangível, estoques, clientes, caixa, fornecedores, provisões, PL…')]),
    n('Resultado', [n('Receita, custos, despesas, resultado financeiro, tributos'), n('Outros resultados abrangentes (ORA): o que não passa pelo resultado e pode ou não ser reclassificado')]),
    n('Notas explicativas', [n('Base de elaboração'), n('Políticas contábeis significativas'), n('Informações adicionais por linha das demonstrações'), n('Julgamentos e incertezas de estimativas')])
  ]));

  M('NBC TG 20', n('Custos de empréstimos', [
    n('Regra geral', [n('Custo diretamente atribuível à aquisição, construção ou produção de ATIVO QUALIFICÁVEL → capitaliza', null, 'sim'), n('Demais custos de empréstimo → despesa', null, 'nao')]),
    n('Ativo qualificável', [n('Exige tempo substancial para ficar pronto para uso ou venda'), n('Ex.: obra, fábrica, estoque de ciclo longo, intangível em desenvolvimento')]),
    n('Quanto capitalizar', [n('Empréstimo ESPECÍFICO: custo real do período − rendimento de aplicação temporária'), n('Empréstimo GERAL: taxa média ponderada × gasto com o ativo'), n('Nunca mais que o custo efetivamente incorrido no período', null, 'alerta')]),
    n('Quando', [n('Começa: há gastos com o ativo + custos de empréstimo + atividades em andamento'), n('Suspende: interrupção prolongada do desenvolvimento ativo'), n('Termina: ativo substancialmente pronto')]),
    n('Divulgação', [n('Valor capitalizado e taxa de capitalização')])
  ]));

  M('NBC TG 15', n('Combinação de negócios', [
    n('Método da aquisição — passos', [n('1. Identificar o adquirente'), n('2. Determinar a data da aquisição (quando obtém o controle)'), n('3. Reconhecer e medir ativos identificáveis, passivos assumidos e participação de não controladores'), n('4. Reconhecer o ágio ou o ganho por compra vantajosa')]),
    n('Mensuração', [n('Ativos e passivos a VALOR JUSTO na data da aquisição (exceções previstas)'), n('Contraprestação = valor justo do que foi entregue (inclui parcela contingente)'), n('Participação de não controladores: valor justo OU proporção dos ativos líquidos (escolha por operação)')]),
    n('Resultado final', [
      n('Contraprestação + NCI + participação anterior > ativos líquidos a valor justo', [n('= ÁGIO por expectativa de rentabilidade futura (não amortiza; teste anual TG 01)')], 'sim'),
      n('Ativos líquidos > o pago', [n('= COMPRA VANTAJOSA: reavalia tudo e, se persistir, ganho no resultado')], 'nao')]),
    n('Custos da transação', [n('Honorários e consultoria → despesa'), n('Custo de emitir dívida/ações → segue as normas de instrumentos financeiros/PL')], 'alerta'),
    n('Período de mensuração', [n('Até 1 ano para concluir valores provisórios; ajustes retrospectivos')]),
    n('Por etapas', [n('Participação anterior é remensurada ao valor justo, com ganho/perda no resultado')])
  ]));

  M('NBC TG 05', n('Divulgação sobre partes relacionadas', [
    n('Quem é parte relacionada', [n('Pessoa/familiar: controla, controla em conjunto, tem influência significativa ou é pessoal-chave da administração'), n('Entidade: mesmo grupo, coligada, joint venture, plano de benefício pós-emprego, controlada por pessoa-chave')]),
    n('O que divulgar', [
      n('Controle: nome da controladora e da controladora final — SEMPRE, mesmo sem transações', null, 'res'),
      n('Remuneração do pessoal-chave', [n('Curto prazo, pós-emprego, longo prazo, rescisão e pagamento em ações — no total e por categoria')]),
      n('Transações e saldos', [n('Natureza do relacionamento, valor, saldos, prazos e condições, garantias, provisões para créditos duvidosos')])]),
    n('Cuidados', [n('Só diga “condições de mercado” se puder comprovar', null, 'alerta'), n('Itens de mesma natureza podem ser agrupados, exceto se separar for necessário'), n('Isenções para entidades ligadas ao governo')])
  ]));

  M('NBC TG 33', n('Benefícios a empregados', [
    n('Curto prazo', [n('Despesa conforme o serviço é prestado (competência)'), n('Ausências remuneradas: acumulativas (provisiona) × não acumulativas (só quando ocorrem)'), n('PLR e bônus: obrigação legal/construtiva + estimativa confiável')]),
    n('Pós-emprego', [
      n('Contribuição definida', [n('Despesa = contribuição devida no período'), n('Risco com o empregado')], 'sim'),
      n('Benefício definido', [n('Passivo líquido = valor presente da obrigação − valor justo dos ativos do plano (com limite de ativo)'), n('Custo do serviço e juros líquidos → resultado'), n('Remensurações (ganhos/perdas atuariais) → ORA, sem reclassificar', null, 'res')], 'sim')]),
    n('Outros de longo prazo', [n('Parecido com benefício definido, mas remensurações vão ao RESULTADO')]),
    n('Rescisão', [n('Reconhece quando a entidade não pode mais retirar a oferta, ou ao reconhecer custos de reestruturação (TG 25) — o que ocorrer primeiro')])
  ]));

  M('NBC TG 12', n('Ajuste a valor presente', [
    n('Ideia', [n('Dinheiro daqui a muito tempo vale menos que hoje → traz os fluxos a valor presente, separando os juros embutidos')]),
    n('Onde se aplica', [n('Contas a receber e a pagar de longo prazo'), n('Empréstimos e financiamentos sem juros ou com juros fora do mercado'), n('Curto prazo: só se o efeito for relevante')]),
    n('Taxa de desconto', [n('Reflete prazo e risco; usa taxa de mercado de operação similar ou a taxa implícita')]),
    n('Efeito contábil', [n('Venda a prazo: receita a valor presente; juros → receita financeira ao longo do prazo (taxa efetiva)'), n('Compra a prazo: custo a valor presente; juros → despesa financeira')]),
    n('Relevância', [n('Se imaterial, dispensa o ajuste no curto prazo', null, 'nota')]),
    n('Combina com', [n('TG 47 (receita), TG 06 (arrendamento), TG 48 (instrumentos financeiros)')])
  ]));

  M('NBC TG 18', n('Investimento em coligada, controlada e joint venture — equivalência patrimonial', [
    n('Quando usar', [n('Influência significativa (poder de participar das decisões; presume-se a partir de 20% dos votos)'), n('Controlada em demonstrações individuais; joint venture')]),
    n('Método', [n('Inicial: pelo custo'), n('Depois: ajusta pela PARTICIPAÇÃO no resultado da investida (vai ao resultado) e no ORA (vai ao ORA)'), n('Dividendos recebidos REDUZEM o investimento (não são receita)', null, 'alerta')]),
    n('Ágio e mais-valia', [n('Diferença entre o custo e a participação no valor justo líquido dos ativos da investida'), n('Mais-valia dos ativos: realiza conforme depreciação/baixa'), n('Ágio por expectativa: fica no investimento, sem amortização'), n('Compra vantajosa → ganho')]),
    n('Lucros não realizados', [n('Elimina a parte do investidor em vendas entre as empresas (estoque ainda não vendido)')]),
    n('Perdas', [n('Reconhece até zerar o investimento; depois, só se houver obrigação'), n('Lucros futuros: só volta a reconhecer após compensar as perdas não reconhecidas')]),
    n('Impairment e uniformidade', [n('Teste de impairment do investimento (TG 01)'), n('Mesma data-base e políticas contábeis uniformes')])
  ]));

  M('NBC TG 06', n('Arrendamentos (equivalente à IFRS 16)', [
    n('Existe arrendamento?', [n('O contrato transfere o DIREITO DE CONTROLAR o uso de um ativo identificado por um período, em troca de pagamento')]),
    n('Arrendatário (quem aluga) — modelo único', [
      n('No início', [n('Passivo de arrendamento = valor presente dos pagamentos (taxa implícita ou taxa incremental)'), n('Ativo de direito de uso = passivo + pagamentos iniciais + custos diretos + restauração')]),
      n('Depois', [n('Ativo: depreciação (prazo menor entre vida útil e contrato) + impairment'), n('Passivo: juros (despesa financeira) e redução pelos pagamentos')]),
      n('Reavaliação do passivo', [n('Mudança de prazo, de opção de compra/renovação ou de índice/taxa → remensura e ajusta o ativo')]),
      n('Isenções (despesa linear)', [n('Curto prazo (até 12 meses)'), n('Ativo de baixo valor')], 'nota')]),
    n('Arrendador (quem aluga para outro)', [n('Financeiro: transfere substancialmente os riscos e benefícios → baixa o ativo e reconhece recebível'), n('Operacional: mantém o ativo e reconhece a receita de aluguel linearmente')]),
    n('Venda com retroarrendamento', [n('Verifica se houve venda (TG 47); ajusta ao valor justo')])
  ]));

  M('NBC TG 47', n('Receita de contrato com cliente — 5 passos', [
    n('Passo 1 — Identificar o contrato', [n('Aprovado, direitos e condições de pagamento identificáveis, substância comercial, cobrança provável')]),
    n('Passo 2 — Identificar as obrigações de desempenho', [n('Bens/serviços distintos prometidos'), n('Série de bens/serviços substancialmente iguais conta como uma obrigação')]),
    n('Passo 3 — Determinar o preço da transação', [n('Valor fixo + variável (estimativa restrita) + componente de financiamento significativo + contraprestação não monetária − valores pagos ao cliente')]),
    n('Passo 4 — Alocar o preço', [n('Proporcionalmente ao preço de venda individual (stand-alone) de cada obrigação')]),
    n('Passo 5 — Reconhecer quando cumprir', [
      n('Ao longo do tempo — se ocorrer UMA das três', [n('Cliente recebe e consome os benefícios enquanto a entidade executa'), n('A entidade cria/melhora ativo que o cliente controla'), n('Ativo sem uso alternativo + direito a pagamento pelo desempenho já feito')], 'sim'),
      n('Em um momento — transferência do controle', [n('Indicadores: direito a pagamento, título legal, posse, riscos e benefícios, aceitação')], 'sim')]),
    n('Principal × agente', [n('Principal: controla o bem/serviço antes → receita BRUTA'), n('Agente: só intermedeia → receita LÍQUIDA (comissão)')]),
    n('Saldos do contrato', [n('Ativo de contrato, passivo de contrato (adiantamento) e contas a receber')])
  ]));

  M('NBC TG 46', n('Mensuração do valor justo', [
    n('Definição', [n('PREÇO DE SAÍDA: o que se receberia ao vender um ativo ou pagaria ao transferir um passivo, em transação ordenada entre participantes do mercado, na data de mensuração')]),
    n('Onde', [n('Mercado principal (maior volume) — ou o mais vantajoso, se não houver principal')]),
    n('Como pensar', [n('Premissas dos participantes do mercado (não da entidade)'), n('Características do ativo (local, condição)'), n('Ativo não financeiro: maior e melhor uso')]),
    n('Custos de transação', [n('Não integram o valor justo', null, 'alerta')]),
    n('Técnicas de avaliação', [n('Abordagem de mercado'), n('Abordagem de custo'), n('Abordagem de receita (fluxos descontados)'), n('Maximizar dados observáveis, minimizar os não observáveis')]),
    n('Hierarquia', [n('Nível 1: preço cotado em mercado ativo para o mesmo item', null, 'sim'), n('Nível 2: dados observáveis (preços semelhantes, curvas de juros)', null, 'sim'), n('Nível 3: dados NÃO observáveis (premissas da entidade)', null, 'nao')]),
    n('Divulgação', [n('Nível da hierarquia, técnicas e dados usados; conciliação do nível 3')])
  ]));

  M('NBC TG 32', n('Tributos sobre o lucro (IR e CSLL) — corrente e diferido', [
    n('Imposto CORRENTE', [n('O que é devido (ou a recuperar) sobre o lucro tributável do período')]),
    n('Imposto DIFERIDO — nasce da diferença entre base contábil e base fiscal', [
      n('Diferença temporária TRIBUTÁVEL', [n('→ PASSIVO fiscal diferido (pagará imposto no futuro)')], 'nao'),
      n('Diferença temporária DEDUTÍVEL, prejuízo fiscal e crédito não usado', [n('→ ATIVO fiscal diferido, só se for provável lucro tributável futuro')], 'sim')]),
    n('Mensuração', [n('Pela alíquota que se espera vigente quando o ativo for realizado ou o passivo liquidado'), n('Não se desconta a valor presente')]),
    n('Onde reconhecer', [n('Segue a origem: resultado, ORA ou patrimônio líquido')]),
    n('Compensação', [n('Só se há direito legal de compensar e intenção de liquidar pelo líquido')]),
    n('Divulgação', [n('Conciliação da despesa com a alíquota nominal; composição dos diferidos')])
  ]));

  M('NBC TG 10', n('Pagamento baseado em ações', [
    n('Ideia central', [n('Reconhecer o custo/despesa conforme recebe os serviços ou bens, contra PL (ações) ou passivo (dinheiro)')]),
    n('Liquidado em AÇÕES (patrimonial)', [n('Mede pelo valor justo na DATA DA OUTORGA'), n('Não remensura depois'), n('Contrapartida: patrimônio líquido')], 'sim'),
    n('Liquidado em DINHEIRO', [n('Passivo mensurado a valor justo e REMENSURADO a cada data de balanço até liquidar'), n('Variações vão ao resultado')], 'sim'),
    n('Condições de aquisição (vesting)', [n('De serviço ou de desempenho'), n('Condições de mercado entram no valor justo'), n('Condições fora do mercado ajustam a quantidade esperada de instrumentos')]),
    n('Terceiros que não são empregados', [n('Valor justo dos bens/serviços recebidos')]),
    n('Modificação e cancelamento', [n('No mínimo, continua reconhecendo o valor justo da outorga original')]),
    n('Divulgação', [n('Natureza do plano, movimentação, métodos de avaliação e despesa do período')])
  ]));
})();

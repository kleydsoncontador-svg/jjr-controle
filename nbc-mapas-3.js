/* Mapas mentais curados — lote 2. Mesmo formato do lote 1 (nbc-mapas-2.js).
   Material de apoio ao estudo, feito a partir da explicação publicada: vale sempre a norma original. */
(function () {
  window.NBC_MAPAS = window.NBC_MAPAS || {};
  const n = (t, f, k, d) => { const o = { t }; if (f && f.length) o.f = f; if (k) o.k = k; if (d) o.d = d; return o; };
  const M = (cod, raiz) => { window.NBC_MAPAS[cod] = { autor: 'JJR — a partir da explicação publicada e das aulas de referência', raiz }; };

  M('NBC TG 02', n('Efeitos das mudanças nas taxas de câmbio e conversão', [
    n('Moeda funcional', [n('É a moeda do principal ambiente econômico em que a entidade opera (vendas, custos, financiamento)')]),
    n('Transação em moeda estrangeira', [
      n('Primeiro registro: taxa à vista da DATA DA TRANSAÇÃO'),
      n('No fechamento do balanço', [n('Itens MONETÁRIOS (caixa, clientes, fornecedores, empréstimos) → taxa de fechamento', null, 'res'), n('Não monetários pelo custo histórico → mantém a taxa da transação', null, 'res'), n('Não monetários a valor justo → taxa da data da mensuração do valor justo', null, 'res')]),
      n('Variação cambial', [n('Vai ao RESULTADO (receita/despesa financeira)')])]),
    n('Converter para outra moeda de apresentação', [n('Ativos e passivos → taxa de fechamento'), n('Receitas e despesas → taxa da data da transação (ou média do período)'), n('Diferenças de conversão → ORA, em “ajuste acumulado de conversão”', null, 'res'), n('Reclassifica para o resultado quando baixar a operação no exterior', null, 'nota')]),
    n('Investimento líquido em operação no exterior', [n('Variação cambial de itens monetários que fazem parte do investimento → ORA nas demonstrações consolidadas')]),
    n('Moeda de apresentação', [n('Pode ser qualquer moeda; no Brasil, em regra o real')]),
    n('Economia hiperinflacionária', [n('Ver TG 42')])
  ]));

  M('NBC TG 03', n('Demonstração dos fluxos de caixa (DFC)', [
    n('Caixa e equivalentes', [n('Caixa + aplicações de curtíssimo prazo, alta liquidez, risco insignificante de mudança de valor (em geral até 3 meses da aquisição)')]),
    n('Três atividades', [n('OPERACIONAIS — principais atividades geradoras de receita'), n('INVESTIMENTO — aquisição e venda de ativos de longo prazo e outros investimentos'), n('FINANCIAMENTO — capital próprio e empréstimos')]),
    n('Fluxo operacional: dois métodos', [n('DIRETO: recebimentos e pagamentos brutos', null, 'sim'), n('INDIRETO: parte do lucro e ajusta (depreciação, variações de capital de giro…)', null, 'sim'), n('Os dois chegam ao mesmo total', null, 'nota')]),
    n('Juros e dividendos — escolher a classificação e manter', [n('Juros e dividendos RECEBIDOS: operacional ou investimento'), n('Juros PAGOS: operacional ou financiamento'), n('Dividendos PAGOS: financiamento ou operacional')]),
    n('Tributos sobre o lucro', [n('Em regra, atividades operacionais')]),
    n('Transações que não usam caixa', [n('Fora da DFC; divulgadas em nota (ex.: compra de ativo financiada)')]),
    n('Fluxos pelo valor líquido', [n('Só em casos permitidos (giro rápido, valores altos, prazos curtos; recebimentos por conta de clientes)')]),
    n('Conciliação', [n('Caixa final da DFC = caixa e equivalentes do balanço')])
  ]));

  M('NBC TG 07', n('Subvenção e assistência governamentais', [
    n('Quando reconhecer', [n('Há razoável segurança de que a entidade cumprirá as condições E receberá a subvenção')]),
    n('Regra de ouro', [n('Vai ao RESULTADO, de forma sistemática, nos períodos em que reconhece os custos que a subvenção pretende compensar', null, 'res'), n('Nunca direto no patrimônio líquido', null, 'alerta')]),
    n('Subvenção relacionada a ATIVOS', [n('Receita diferida OU dedução do valor do ativo'), n('No resultado ao longo da vida útil (via depreciação)')]),
    n('Subvenção relacionada a RESULTADO', [n('Receita (outras receitas) OU redução da despesa relacionada')]),
    n('Empréstimo com juros subsidiados', [n('Juros abaixo do mercado: a diferença entre o valor recebido e o valor a taxa de mercado é a subvenção')]),
    n('Se precisar devolver', [n('Tratada como mudança de estimativa (TG 23)')]),
    n('No Brasil', [n('Quando aplicável, o lucro correspondente é destinado à reserva de incentivos fiscais (Lei das S.A.)')]),
    n('Divulgação', [n('Política, natureza, valores e condições não cumpridas')])
  ]));

  M('NBC TG 09', n('Demonstração do valor adicionado (DVA)', [
    n('O que mostra', [n('Quanto de riqueza a empresa criou e para quem ela foi distribuída')]),
    n('Quem apresenta', [n('Obrigatória para companhias abertas; demais, quando exigido ou por escolha')]),
    n('1ª parte — GERAÇÃO da riqueza', [
      n('Receitas (vendas, outras receitas, constituição/reversão de PCLD)'),
      n('(−) Insumos adquiridos de terceiros (custos, materiais, energia, serviços)'),
      n('= Valor adicionado BRUTO'), n('(−) Depreciação, amortização e exaustão'), n('= Valor adicionado LÍQUIDO produzido'),
      n('(+) Valor adicionado recebido em transferência (equivalência patrimonial, receitas financeiras)'), n('= Valor adicionado TOTAL a distribuir', null, 'res')]),
    n('2ª parte — DISTRIBUIÇÃO', [n('Pessoal (salários, encargos, benefícios)'), n('Impostos, taxas e contribuições'), n('Remuneração de capitais de terceiros (juros, aluguéis)'), n('Remuneração de capitais próprios (JCP, dividendos, lucros retidos, não controladores)')]),
    n('Cuidados', [n('Os números vêm da contabilidade (não é um cálculo à parte)'), n('Total distribuído = valor adicionado total', null, 'alerta'), n('Na consolidação, elimina as transações entre as empresas do grupo')])
  ]));

  M('NBC TG 16', n('Estoques', [
    n('Regra de mensuração', [n('O MENOR entre o CUSTO e o VALOR REALIZÁVEL LÍQUIDO', null, 'res')]),
    n('Custo', [
      n('Entra', [n('Aquisição: preço + impostos NÃO recuperáveis + transporte, seguro e manuseio − descontos'), n('Transformação: mão de obra direta + custos indiretos de produção (fixos alocados pela capacidade normal)')], 'sim'),
      n('Não entra (despesa do período)', [n('Perdas anormais de materiais e mão de obra'), n('Armazenagem (salvo se necessária ao processo)'), n('Despesas administrativas e de venda')], 'nao')]),
    n('Fórmulas de custeio', [n('Itens não intercambiáveis ou de projetos: identificação ESPECÍFICA'), n('Demais: PEPS (primeiro a entrar, primeiro a sair) ou CUSTO MÉDIO PONDERADO'), n('UEPS (último a entrar, primeiro a sair) NÃO é permitido', null, 'alerta')]),
    n('Valor realizável líquido (VRL)', [n('Preço estimado de venda − custos estimados para concluir e vender'), n('Se o custo > VRL → reduz ao VRL (perda no resultado)')]),
    n('Reversão', [n('Se o VRL voltar a subir, reverte a redução, limitada ao valor da perda original')]),
    n('Baixa', [n('Ao vender, o custo vai para o CPV no mesmo período da receita')])
  ]));

  M('NBC TG 19', n('Negócios em conjunto', [
    n('O que é um acordo em conjunto', [n('Duas ou mais partes com CONTROLE CONJUNTO por contrato: decisões relevantes exigem consentimento unânime')]),
    n('Duas classificações', [
      n('OPERAÇÃO EM CONJUNTO', [n('As partes têm direitos sobre os ativos e obrigações pelos passivos'), n('Cada parte reconhece SEUS ativos, passivos, receitas e despesas (e a sua parte dos conjuntos)')], 'sim'),
      n('EMPREENDIMENTO CONTROLADO EM CONJUNTO (joint venture)', [n('As partes têm direitos sobre os ATIVOS LÍQUIDOS do negócio'), n('Contabiliza pela equivalência patrimonial (TG 18)')], 'sim')]),
    n('Como classificar', [n('Estrutura legal (existe veículo separado?)'), n('Termos contratuais'), n('Outros fatos e circunstâncias')]),
    n('Venda de ativo ao acordo', [n('Reconhece só a parte do ganho/perda relativa à participação dos outros')]),
    n('Parte sem controle conjunto', [n('Segue o mesmo tratamento se tiver direitos/obrigações; senão, TG 48 ou TG 18')]),
    n('Divulgação', [n('Ver TG 45')])
  ]));

  M('NBC TG 21', n('Demonstração intermediária (trimestres e semestres)', [
    n('Conteúdo mínimo', [n('Balanço, resultado, mutações do PL e fluxo de caixa — podem ser condensados'), n('Notas selecionadas sobre eventos e transações significativos')]),
    n('Mesmas políticas das demonstrações anuais', null, 'res'),
    n('Cada período intermediário é um período autônomo', [n('Reconhece e mede como se fosse o fim de um período, não como “fatia do ano”')]),
    n('Sazonalidade e custos desiguais', [n('Receita sazonal ou cíclica: não antecipa nem posterga'), n('Custos desiguais ao longo do ano: mesmo critério das anuais')]),
    n('Tributos sobre o lucro', [n('Pela melhor estimativa da alíquota EFETIVA anual aplicada ao lucro do período')]),
    n('Eventos significativos', [n('Explicar em nota (perdas por redução, reestruturações, aquisições, litígios)')]),
    n('Materialidade', [n('Avaliada em relação aos dados do período intermediário')])
  ]));

  M('NBC TG 22', n('Informações por segmento', [
    n('Quem apresenta', [n('Entidades com instrumentos negociados em mercado (ou em processo de registro)')]),
    n('Segmento operacional', [n('Componente que gera receitas e despesas'), n('Cujo resultado é revisado pelo principal gestor das decisões operacionais'), n('E tem informação financeira separada')]),
    n('Abordagem da administração', [n('Os segmentos seguem a forma como a gestão acompanha o negócio (relatório interno)')]),
    n('Segmento REPORTÁVEL', [n('Receita ≥ 10% da receita total de todos os segmentos'), n('Resultado ≥ 10% do maior entre o lucro total e o prejuízo total dos segmentos'), n('Ativo ≥ 10% do ativo total'), n('Reportáveis devem cobrir pelo menos 75% da receita externa')]),
    n('Agregação', [n('Segmentos com características econômicas semelhantes podem ser agregados')]),
    n('Divulgar', [n('Resultado, ativos e passivos (se informados à gestão), receitas, despesas relevantes'), n('Conciliações com os totais das demonstrações'), n('Informações gerais e por produto, região e principais clientes')])
  ]));

  M('NBC TG 24', n('Evento subsequente', [
    n('O que é', [n('Fato ocorrido ENTRE a data do balanço e a data da autorização para emitir as demonstrações')]),
    n('Dois tipos', [
      n('Evento que AJUSTA', [n('Dá evidência de condição que JÁ existia no balanço'), n('Exemplos: sentença que confirma obrigação; cliente falido que já estava inadimplente; venda de estoque abaixo do custo; descoberta de erro ou fraude'), n('→ ajusta os valores reconhecidos', null, 'res')], 'sim'),
      n('Evento que NÃO ajusta', [n('Condição que surgiu DEPOIS do balanço'), n('Exemplos: incêndio; queda do valor de mercado de investimento; aquisição de empresa'), n('→ só divulga natureza e efeito estimado, se material', null, 'res')], 'nao')]),
    n('Dividendos declarados depois', [n('Não são passivo na data do balanço'), n('Divulgar em nota')]),
    n('Continuidade operacional', [n('Se depois do balanço a administração decide liquidar ou encerrar, NÃO se usa a base de continuidade', null, 'alerta')]),
    n('Data de autorização', [n('Divulgar quem autorizou e quando')])
  ]));

  M('NBC TG 29', n('Ativo biológico e produto agrícola', [
    n('Conceitos', [n('Ativo biológico = animal ou planta vivos (gado, lavoura, floresta)'), n('Produto agrícola = o que foi colhido (leite, cana colhida, madeira cortada)'), n('Plantas portadoras (que só produzem frutos) → tratadas como imobilizado (TG 27)')]),
    n('Mensuração do ativo biológico', [n('VALOR JUSTO menos despesas de venda — no reconhecimento inicial e a cada balanço', null, 'res'), n('Exceção: valor justo sem confiabilidade → custo − depreciação − perdas')]),
    n('Ganhos e perdas', [n('Variação do valor justo menos despesas de venda → RESULTADO do período')]),
    n('Produto agrícola colhido', [n('Mede pelo valor justo menos despesas de venda no ponto da colheita'), n('Depois disso, vira estoque (TG 16) com esse valor como custo')]),
    n('Subvenção do governo', [n('Relacionada a ativo biológico mensurado a valor justo: resultado quando as condições forem atendidas')]),
    n('Divulgação', [n('Descrição, quantidades, premissas, conciliação da variação do saldo')])
  ]));

  M('NBC TG 36', n('Demonstrações consolidadas', [
    n('Controle — os 3 elementos juntos', [n('Poder sobre a investida (direitos que dão a capacidade de dirigir as atividades relevantes)'), n('Exposição ou direitos a retornos VARIÁVEIS'), n('Capacidade de usar o poder para afetar esses retornos')], 'res'),
    n('Quem consolida', [n('A controladora (exceções: algumas controladoras intermediárias e entidades de investimento)')]),
    n('Procedimentos', [n('Soma linha a linha ativos, passivos, receitas e despesas'), n('Elimina o investimento da controladora contra o PL da controlada'), n('Elimina saldos e transações entre as empresas do grupo'), n('Elimina lucros não realizados em estoques e ativos do grupo')]),
    n('Participação de não controladores', [n('Aparece no patrimônio líquido, separada da parte dos controladores'), n('Resultado e ORA também são divididos')]),
    n('Uniformidade', [n('Mesmas políticas contábeis'), n('Mesma data-base (diferença máxima de 3 meses, com ajustes)')]),
    n('Mudanças na participação', [n('SEM perda de controle → transação de patrimônio líquido', null, 'sim'), n('PERDA de controle → baixa ativos, passivos e NCI; reconhece ganho/perda; remensura a participação restante a valor justo', null, 'nao')])
  ]));

  M('NBC TG 35', n('Demonstrações separadas', [
    n('O que são', [n('Demonstrações da própria controladora/investidor (a “matriz”), apresentadas além ou no lugar das consolidadas')]),
    n('Como medir os investimentos em controladas, coligadas e JV', [n('Pelo custo; ou conforme instrumentos financeiros (TG 48); ou pela EQUIVALÊNCIA PATRIMONIAL'), n('No Brasil, nas demonstrações individuais a equivalência patrimonial é exigida', null, 'alerta')]),
    n('Dividendos', [n('Reconhece quando surge o direito de recebê-los (no custo ou valor justo)')]),
    n('Reorganizações no grupo', [n('Cuidado com a mensuração quando a nova controladora é formada dentro do grupo')]),
    n('Relação com a consolidação', [n('As separadas NÃO substituem as consolidadas (TG 36)')]),
    n('Divulgação', [n('Informar que são demonstrações separadas, lista dos investimentos e o método usado')])
  ]));

  M('NBC TG 37', n('Adoção inicial das normas internacionais', [
    n('Quem é adotante inicial', [n('Quem apresenta, pela primeira vez, demonstrações em conformidade com as normas internacionais, com declaração EXPLÍCITA e SEM RESSALVAS')]),
    n('Datas', [n('Data de transição = início do primeiro período comparativo'), n('Balanço de abertura na data de transição')]),
    n('Balanço patrimonial de abertura', [n('Reconhece todos os ativos e passivos exigidos pelas normas'), n('Não reconhece o que as normas não permitem'), n('Reclassifica e mede conforme as normas vigentes'), n('Ajuste vai para lucros acumulados (ou outra rubrica do PL)')]),
    n('Políticas', [n('Usa as políticas VIGENTES no fim do primeiro período de relato, de forma retroativa')]),
    n('Exceções e isenções', [n('Exceções OBRIGATÓRIAS (ex.: estimativas)', null, 'nao'), n('Isenções OPCIONAIS (ex.: custo atribuído, combinações anteriores)', null, 'sim')]),
    n('Conciliações', [n('Do PL e do resultado: da norma anterior para a nova')])
  ]));

  M('NBC TG 39', n('Instrumentos financeiros — apresentação (emissor)', [
    n('Passivo ou patrimônio líquido?', [n('Há obrigação CONTRATUAL de entregar caixa ou outro ativo financeiro? → PASSIVO', null, 'nao'), n('Não há essa obrigação → PATRIMÔNIO LÍQUIDO', null, 'sim')]),
    n('Ações resgatáveis', [n('Resgate obrigatório ou à escolha do titular → passivo')]),
    n('Instrumento composto (ex.: debênture conversível)', [n('Separa a parte PASSIVO (valor justo de dívida sem conversão) da parte PL (o que sobra)')]),
    n('Ações em tesouraria', [n('Deduzidas do PL; nenhum ganho ou perda vai ao resultado')]),
    n('Juros, dividendos, ganhos e perdas', [n('Seguem a classificação: de passivo → resultado; de PL → direto no PL')]),
    n('Compensação no balanço', [n('Só com direito legal exequível E intenção de liquidar pelo líquido ou simultaneamente', null, 'alerta')]),
    n('Derivativos sobre ações da própria entidade', [n('Regra do “fixo por fixo”: valor fixo de caixa por número fixo de ações → PL; senão → passivo')])
  ]));

  M('NBC TG 40', n('Instrumentos financeiros — divulgação', [
    n('Importância dos instrumentos', [n('Posição patrimonial e desempenho; categorias; políticas contábeis')]),
    n('Valor justo', [n('Comparação com o valor contábil e hierarquia (TG 46)')]),
    n('Natureza e extensão dos riscos', [
      n('Risco de CRÉDITO', [n('Exposição máxima, garantias, qualidade do crédito, perdas esperadas (TG 48)')]),
      n('Risco de LIQUIDEZ', [n('Análise de vencimentos dos passivos financeiros e como gerencia')]),
      n('Risco de MERCADO', [n('Análise de sensibilidade: juros, câmbio e outros preços')])]),
    n('Contabilidade de hedge', [n('Estratégia, instrumentos, valores e efeitos')]),
    n('Transferências de ativos financeiros', [n('Securitização e cessão: ativos baixados ou mantidos e envolvimento continuado')])
  ]));

  M('NBC TG 41', n('Resultado por ação', [
    n('Quem aplica', [n('Entidades com ações ordinárias (ou potenciais) negociadas em mercado, ou em processo de oferta')]),
    n('Básico', [n('Lucro atribuível aos acionistas ordinários ÷ média ponderada das ações ordinárias em circulação'), n('Numerador ajustado por dividendos preferenciais')], 'sim'),
    n('Média ponderada', [n('Ações ponderadas pelo tempo em que ficaram em circulação no período')]),
    n('Diluído', [n('Ajusta numerador e denominador pelos potenciais efeitos de opções, bônus de subscrição e conversíveis')], 'sim'),
    n('Antidilutivo', [n('Se aumenta o lucro por ação (ou reduz o prejuízo por ação), NÃO entra no cálculo', null, 'alerta')]),
    n('Bonificação e desdobramento', [n('Ajusta retroativamente TODOS os períodos apresentados')]),
    n('Apresentação', [n('Básico e diluído na demonstração do resultado, para cada classe de ação ordinária')])
  ]));

  M('NBC TG 42', n('Economia hiperinflacionária', [
    n('Quando há hiperinflação (julgamento com indicadores)', [n('População prefere guardar riqueza em ativos não monetários ou moeda estrangeira'), n('Preços fixados em moeda estável; juros, salários e preços atrelados a índice'), n('Vendas a prazo com perda de poder de compra embutida'), n('Inflação acumulada em 3 anos perto ou acima de 100%')]),
    n('Reapresentação na unidade de medida corrente do fim do período', [
      n('Itens MONETÁRIOS → não reapresenta'),
      n('Itens NÃO monetários a custo → corrige por índice geral de preços'),
      n('Itens a valor corrente → já estão na unidade corrente'),
      n('Patrimônio líquido → corrige os componentes')]),
    n('Ganho ou perda monetária líquido', [n('Vai ao resultado e é divulgado')]),
    n('Resultado e fluxo de caixa', [n('Todos os itens expressos na unidade de medida corrente do fim do período')]),
    n('Operação no exterior', [n('Aplica ao converter demonstrações de entidade em economia hiperinflacionária')]),
    n('Fim da hiperinflação', [n('Os valores reapresentados passam a ser o custo para o período seguinte')])
  ]));

  M('NBC TG 45', n('Divulgação de participações em outras entidades', [
    n('Julgamentos e premissas significativos', [n('Como concluiu que há controle, controle conjunto ou influência significativa')]),
    n('Controladas', [n('Composição do grupo e participação de não controladores'), n('Restrições significativas à transferência de recursos')]),
    n('Acordos em conjunto e coligadas', [n('Natureza, riscos e informações financeiras resumidas')]),
    n('Entidades estruturadas não consolidadas', [n('Natureza, exposição ao risco e perda máxima')]),
    n('Mudanças na participação', [n('Efeito de mudanças que não resultam em perda de controle e da perda de controle')]),
    n('Entidades de investimento', [n('Divulgações específicas')])
  ]));

  M('NBC TG 44', n('Demonstrações combinadas', [
    n('O que são', [n('Demonstrações de um conjunto de entidades sob controle comum, mesmo sem uma controladora que as consolide')]),
    n('Como fazer', [n('Soma as demonstrações das entidades'), n('Elimina saldos e transações entre elas'), n('Elimina participações cruzadas'), n('Patrimônio combinado em vez de capital de uma controladora')]),
    n('Políticas uniformes', [n('Mesmas políticas contábeis e mesma data-base')]),
    n('Para que serve', [n('Registro de companhia, financiamento, reorganização, operações de grupo familiar')]),
    n('Diferença para as consolidadas', [n('Consolidada: existe controladora (TG 36). Combinada: entidades irmãs sob controle comum')])
  ]));

  M('NBC TG 51', n('Apresentação e divulgação nas demonstrações (equivalente à IFRS 18)', [
    n('Demonstração do resultado em categorias', [n('OPERACIONAL (padrão: o que não é das outras)'), n('INVESTIMENTO'), n('FINANCIAMENTO'), n('Tributos sobre o lucro e operações descontinuadas')]),
    n('Subtotais obrigatórios', [n('Resultado OPERACIONAL'), n('Resultado antes de financiamento e tributos sobre o lucro'), n('Resultado do período')], 'res'),
    n('Medidas de desempenho definidas pela administração (MPMs)', [n('Divulgadas em nota, com conciliação ao subtotal exigido pela norma')]),
    n('Agregação e desagregação', [n('Princípios para agrupar itens e evitar rubrica “outros” excessiva')]),
    n('Natureza × função', [n('Despesas operacionais por função (CPV, vendas) com divulgação por natureza quando exigida')]),
    n('Empresas com atividades financeiras', [n('Regras específicas para classificar investimentos e financiamento')]),
    n('Vigência', [n('A norma tem vigência futura (IFRS 18: períodos a partir de 2027) — conferir a data adotada no Brasil', null, 'nota')])
  ]));

  M('NBC TG 900', n('Entidades em liquidação', [
    n('Quando se aplica', [n('A entidade deixa de operar normalmente e está sendo liquidada')]),
    n('Base de liquidação (no lugar da continuidade)', [n('Ativos pelo VALOR DE REALIZAÇÃO'), n('Passivos pelo VALOR A LIQUIDAR'), n('Custos esperados da liquidação são reconhecidos')]),
    n('Demonstrações específicas', [n('Ativos líquidos em liquidação e suas mudanças')]),
    n('Mudança de base', [n('Se a entidade volta a operar, retorna à base de continuidade')]),
    n('Divulgação', [n('Base adotada, motivos e premissas')])
  ]));
})();

/* Mapas mentais curados — lote 3: normas consultadas no texto vigente publicado pelo CFC (www2.cfc.org.br/sisweb/sre).
   Itens citados vêm do texto da norma. Material de apoio ao estudo: vale sempre a norma original. */
(function () {
  window.NBC_MAPAS = window.NBC_MAPAS || {};
  const n = (t, f, k, d) => { const o = { t }; if (f && f.length) o.f = f; if (k) o.k = k; if (d) o.d = d; return o; };
  const M = (cod, raiz) => { window.NBC_MAPAS[cod] = { autor: 'JJR — montado a partir do texto da norma publicado pelo CFC', raiz }; };

  M('NBC TG 1002', n('Contabilidade para microentidades', [
    n('Quem pode usar', [
      n('Entidades com fins de lucro e receita bruta de até R$ 4.800.000,00 por ano (Intro P2)', null, 'sim'),
      n('Passou do limite por 2 anos seguidos → migra para a NBC TG 1001, 1000 ou normas completas (P3)'),
      n('Aplicação PARCIAL é vedada (P8)', null, 'alerta'),
      n('Não pode: entidade com responsabilidade pública de prestação de contas (companhia aberta, banco, fundo) (P9)', null, 'nao'),
      n('Vigência: exercícios iniciados a partir de 1º/1/2023 (adoção antecipada em 2022)', null, 'nota')]),
    n('Demonstrações obrigatórias (3.6)', [n('Balanço patrimonial'), n('Demonstração do resultado do exercício'), n('Demonstração de lucros ou prejuízos acumulados (pode ser coluna da DMPL — 6.2)'), n('Comparativo com o ano anterior'), n('Notas explicativas NÃO são obrigatórias, mas são incentivadas (3.7)')]),
    n('Mensuração', [
      n('Ativos e passivos financeiros: valor original da transação; desconto a valor presente só acima de 1 ano e se material (Seção 11)'),
      n('Estoques: o menor entre custo e preço de venda estimado menos despesas de venda; PEPS ou custo médio (13.1, 13.5)'),
      n('Imobilizado: custo − depreciação linear, vida útil conforme a Receita Federal (Seção 17)'),
      n('Intangível: custo − amortização, prazo máximo de 5 anos (18.4 e 18.5)'),
      n('Investimentos societários: SÓ pelo custo, sem equivalência (14.1)'),
      n('Provisões: melhor estimativa, revisada a cada balanço (21.6 e 21.7)'),
      n('Receita: transferência de riscos e benefícios; pode reconhecer pela nota fiscal se não distorcer (23.4 e 23.7)'),
      n('Tributos: apurados no Simples Nacional, despesa contra o passivo (29.2)')]),
    n('Ajustes', [n('Mudança de política e correção de erro: vão a lucros/prejuízos acumulados e reapresenta os comparativos (10.2, 10.3, 10.6)'), n('Mudança de estimativa: prospectiva (10.4)')]),
    n('O que a entidade precisa fazer', [n('Declaração explícita e sem reservas de conformidade com a norma + informar a atividade (3.2)'), n('Divulgar incerteza relevante sobre continuidade (3.3)'), n('Sem escrituração formal no início: balanço especial de abertura com base em inventário (35.7)')])
  ]));

  M('NBC TG 1001', n('Contabilidade para pequenas empresas', [
    n('Quem pode usar', [
      n('Entidades com fins de lucro e receita bruta anual ENTRE R$ 4,8 milhões E R$ 78 milhões (P2)', null, 'sim'),
      n('Passou de R$ 78 milhões por 2 anos seguidos → NBC TG 1000 ou normas completas (P3)'),
      n('Pode voltar depois de 2 anos abaixo do limite (P4)'),
      n('Migração voluntária: permanece ao menos 2 anos na norma escolhida (P5)'),
      n('Aplicação parcial é vedada (P5)', null, 'alerta'),
      n('Não pode: companhias abertas, bancos, fundos e outras com responsabilidade pública (P6)', null, 'nao')]),
    n('Demonstrações obrigatórias', [n('Balanço patrimonial (Seção 4)'), n('Demonstração do resultado (Seção 5)'), n('Mutações do PL — ou só lucros/prejuízos acumulados quando for a única movimentação (6.2)'), n('Fluxo de caixa pelo método INDIRETO (7.6)'), n('Notas explicativas (Seção 8)'), n('Comparativo com o exercício anterior; regime de competência (exceto fluxo de caixa)')]),
    n('Mensuração', [
      n('Instrumentos financeiros: custo amortizado; perda esperada de crédito (11.5, 11.10)'),
      n('Estoques: menor entre custo e valor de venda estimado menos despesas (13.1); PEPS ou média (13.8)'),
      n('Imobilizado: custo; depreciação linear; teste de recuperabilidade ao fim do exercício; pode usar critérios fiscais de depreciação com divulgação (17.2, 17.8, 17.12, 17.14)'),
      n('Intangível: pesquisa e desenvolvimento são DESPESA; vida útil finita, em regra até 10 anos (18.3, 18.5, 18.6)'),
      n('Ágio: amortização em até 10 anos; compra vantajosa vai ao resultado (19.10, 19.11)'),
      n('Investimentos: equivalência para controladas, controladas em conjunto e coligadas (influência presumida com 20%); demais ao custo (14.4, 14.5, 14.15)'),
      n('Receita: valor de mercado da contraprestação; produto na transferência de riscos e benefícios; serviços conforme prestados; longo prazo por percentual de conclusão (23.2 a 23.6)'),
      n('Provisões: obrigação presente + saída provável + valor estimável; passivo contingente só divulga (21.2, 21.8, 21.9)')]),
    n('Mudanças', [n('Mudança de política: retrospectiva (10.6)'), n('Mudança de estimativa: prospectiva (10.7)')]),
    n('Vigência', [n('Exercícios iniciados a partir de 1º/1/2023 (adoção antecipada em 2022)')], 'nota')
  ]));

  M('NBC TG 1000', n('Contabilidade para pequenas e médias empresas (PMEs)', [
    n('Quem pode usar (Seção 1)', [
      n('Entidade SEM obrigação pública de prestação de contas e que elabora demonstrações para fins gerais a usuários externos (1.2)', null, 'sim'),
      n('Tem obrigação pública: instrumentos negociados em mercado (ou em emissão) ou ativos mantidos em condição fiduciária para amplo grupo de terceiros — bancos, seguradoras (1.3)', null, 'nao'),
      n('No Brasil: S.A. fechada e sociedades que não sejam de grande porte (Lei 11.638/07) podem ser PME (1.3b)'),
      n('Controlada pode usar se ela própria não tiver obrigação pública; a controladora avalia a sua situação (1.6 e 1.7)')]),
    n('Um documento só', [n('A norma é autossuficiente: as mudanças das normas completas só valem quando incorporadas a ela')]),
    n('Estrutura em seções', [
      n('1 a 3: escopo, conceitos e apresentação geral'),
      n('4 a 8: balanço, resultado, mutações do PL, fluxos de caixa e notas'),
      n('9 e 10: consolidadas e separadas; políticas, estimativas e erros'),
      n('11 a 16: instrumentos financeiros, estoques, investimentos, joint ventures, propriedade para investimento'),
      n('17 a 21: imobilizado, intangível, combinação e ágio, arrendamentos, provisões'),
      n('22 a 35: PL, receitas, subvenção, custos de empréstimos, ações, impairment, benefícios, tributos, câmbio, hiperinflação, eventos subsequentes, partes relacionadas, atividades especializadas, adoção inicial')]),
    n('Conjunto completo de demonstrações (3.17)', [n('Balanço patrimonial'), n('Demonstração do resultado e do resultado abrangente'), n('Mutações do PL (ou lucros/prejuízos acumulados)'), n('Fluxos de caixa'), n('Notas explicativas'), n('Comparativo do período anterior (3.14)')]),
    n('Mensuração', [
      n('Estoques: menor entre custo e preço de venda estimado menos custos para concluir e vender'),
      n('Imobilizado: modelo do custo (custo depreciado ou valor recuperável, o menor); reavaliação só se a lei permitir'),
      n('Instrumentos financeiros básicos: custo amortizado menos perdas; os demais, valor justo no resultado'),
      n('Tributos diferidos: sempre não circulantes (4.2)')]),
    n('Declaração de conformidade', [n('Só é válida se TODOS os requisitos da norma forem atendidos (3.3)', null, 'alerta')])
  ]));

  M('NBC TG 49', n('Planos de benefícios de aposentadoria — contabilização do próprio plano', [
    n('Alcance', [n('O plano é uma entidade que reporta, separada do empregador/patrocinador'), n('Complementa a TG 33, que trata do custo desses benefícios no EMPREGADOR (item 4)'), n('Cobre contribuição definida, benefício definido e contribuição variável; planos híbridos tratam-se como benefício definido')]),
    n('Contribuição DEFINIDA', [n('Benefício depende das contribuições e dos rendimentos'), n('Demonstração dos ativos líquidos disponíveis para benefícios + descrição da política de custeio'), n('Avaliação atuarial normalmente não é necessária')], 'sim'),
    n('Benefício DEFINIDO', [
      n('Demonstração: ativos líquidos + valor presente atuarial dos benefícios prometidos (VPABP) + superávit ou déficit', [n('VPABP separado em benefícios adquiridos e não adquiridos')]),
      n('Atuário: avaliação periódica; em geral a cada, no máximo, 3 anos; usar a mais recente e divulgar a data'),
      n('Três formatos aceitos: (a) demonstração completa; (b) VPABP em nota; (c) relatório atuarial separado referenciado')], 'sim'),
    n('Mensuração dos investimentos', [n('Valor justo (títulos negociáveis = valor de mercado)'), n('Títulos de resgate fixo para casar obrigações: podem ir pelo valor de resgate'), n('Sem valor justo confiável: divulgar o motivo')]),
    n('Divulgação mínima', [n('Mudanças nos ativos líquidos, políticas contábeis significativas e descrição do plano'), n('Investimento único > 5% dos ativos líquidos'), n('Para benefício definido: VPABP, premissas atuariais e método')]),
    n('Vigência', [n('Exercícios iniciados a partir de 1º/1/2019')], 'nota')
  ]));

  M('NBC TG 50', n('Contratos de seguro (equivalente à IFRS 17)', [
    n('O que é', [n('Uma parte aceita RISCO DE SEGURO SIGNIFICATIVO da outra e concorda em indenizá-la se um evento futuro incerto a afetar adversamente'), n('Exclusões: garantias de fabricante, garantias financeiras (salvo escolha) (item 7)', null, 'nota')]),
    n('Agregação (itens 14 a 24)', [n('Carteira = contratos com riscos semelhantes gerenciados juntos'), n('Dividir em: onerosos no início; sem chance significativa de ficarem onerosos; demais'), n('Contratos com mais de 1 ano de intervalo de emissão não ficam no mesmo grupo'), n('Grupos NÃO são reavaliados depois do reconhecimento inicial')]),
    n('Reconhecimento (25)', [n('O primeiro entre: início da cobertura, vencimento do primeiro pagamento do segurado ou grupo se tornar oneroso')]),
    n('Modelo GERAL de mensuração (32 a 46)', [
      n('Fluxos de caixa de cumprimento', [n('Estimativas dos fluxos futuros'), n('Ajuste a valor presente'), n('Ajuste de risco não financeiro')]),
      n('MARGEM CONTRATUAL DE SEGURO (CSM) = lucro ainda não auferido, liberado ao resultado conforme a cobertura é prestada', null, 'res'),
      n('Passivo = cobertura remanescente + sinistros ocorridos (40)')], 'sim'),
    n('Abordagem de alocação do prêmio — PAA (53 a 59)', [n('Simplificação permitida se a cobertura de cada contrato é de até 1 ano, ou se não difere significativamente do modelo geral'), n('Custos de aquisição podem ir a despesa se a cobertura é de até 1 ano')], 'sim'),
    n('Contratos ONEROSOS (47 a 52)', [n('Saída líquida no início → perda reconhecida IMEDIATAMENTE no resultado (CSM zerada)'), n('Cria um componente de perda que controla a reversão')], 'nao'),
    n('Participação direta (45, 87, 89)', [n('Segurado participa de itens subjacentes identificados; a CSM varia com o valor justo desses itens')]),
    n('Resseguro mantido (60 a 70A)', [n('Lógica análoga, com ganho ou custo líquido; não pode ser oneroso (68)')]),
    n('Apresentação e divulgação', [n('Apresenta separado ativos e passivos de seguro e de resseguro (78)'), n('Receita de seguro exclui componentes de investimento (83, 85)'), n('Divulga conciliações, julgamentos, riscos e nível de confiança do ajuste de risco')]),
    n('Vigência', [n('Exercícios iniciados a partir de 1º/1/2023; revoga a NBC TG 11')], 'nota')
  ]));
})();

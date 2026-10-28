/* Mapas mentais curados — lote 4: interpretações e comunicados técnicos consultados no texto vigente publicado pelo CFC.
   Os números entre parênteses são os itens da norma. Material de apoio ao estudo: vale sempre a norma original. */
(function () {
  window.NBC_MAPAS = window.NBC_MAPAS || {};
  const n = (t, f, k, d) => { const o = { t }; if (f && f.length) o.f = f; if (k) o.k = k; if (d) o.d = d; return o; };
  const M = (cod, raiz) => { window.NBC_MAPAS[cod] = { autor: 'JJR — montado a partir do texto da norma publicado pelo CFC', raiz }; };

  M('ITG 2000', n('Escrituração contábil', [
    n('Alcance (2)', [n('Todas as entidades, de qualquer natureza ou porte, sem prejuízo de outras exigências legais')]),
    n('Formalidades (3 a 13)', [
      n('Segue os Princípios de Contabilidade (3); detalhe compatível com a necessidade dos usuários; a ITG não fixa plano de contas (4)'),
      n('Idioma e moeda nacionais, ordem cronológica, sem lacunas, rasuras ou alterações, com base em documentos (5)'),
      n('Cada lançamento traz: data, conta debitada, conta creditada, histórico (ou código de histórico padronizado), valor e identificação que une as partes do mesmo lançamento (6)'),
      n('Número de identificação do lançamento ligado ao documento (7)'),
      n('Livros em papel: encadernados, folhas numeradas, termos de abertura e encerramento assinados pelo representante legal e por contador com CRC (9)'),
      n('Livros digitais: assinados digitalmente pela entidade e pelo contador e autenticados no registro público (10)'),
      n('A escrituração e as demonstrações são de responsabilidade EXCLUSIVA de contador legalmente habilitado (12)', null, 'alerta'),
      n('As demonstrações são transcritas no Diário e assinadas pelo representante legal e pelo contador (13)')]),
    n('Livros Diário e Razão (14 a 19)', [n('Diário registra todas as operações e fatos que alteram o patrimônio, em ordem cronológica, com referência aos documentos (14)'), n('Escrituração digital dispensa impressão e encadernação, mas exige guardar o arquivo digital autenticado (16)'), n('Registros auxiliares são permitidos (17)')]),
    n('Filiais (20 a 25)', [n('Pode haver escrituração descentralizada, desde que todas as unidades alimentem um único sistema contábil (20 a 22)'), n('Mesmo nível de detalhe da matriz; saldos entre unidades são eliminados na consolidação (23 e 24)')]),
    n('Documentação contábil (26 a 28)', [n('Documentos, livros e papéis, internos ou externos, que sustentam os lançamentos (26)'), n('Pode digitalizar o papel, com assinatura do responsável e do contador, e entregar ao registro público (28)')]),
    n('Contas de compensação (29 e 30)', [n('Direitos e obrigações que podem afetar o patrimônio no futuro; obrigatórias só quando o regulador exigir')]),
    n('Correção de lançamentos (31 a 36)', [
      n('Três formas: ESTORNO, TRANSFERÊNCIA e COMPLEMENTAÇÃO (31)', [n('Estorno: cancela o lançamento errado por inteiro (33)'), n('Transferência: leva o valor da conta errada para a certa (34)'), n('Complementação: aumenta ou diminui um valor já lançado (35)')], 'res'),
      n('O histórico da correção diz o motivo, a data e o local do lançamento original (32)'),
      n('Lançamento tardio: informa a data real do fato e o motivo do atraso (36)')])
  ]));

  M('ITG 2002', n('Entidade sem finalidade de lucros', [
    n('Alcance', [n('Fundações privadas, associações, organizações sociais e religiosas, entidades sindicais (2 e 3)'), n('Fora: conselhos de profissões liberais de inscrição compulsória (4)'), n('O que a ITG não trata segue a NBC TG 1000 ou as normas completas (4)')]),
    n('Reconhecimento', [
      n('Receitas e despesas pela COMPETÊNCIA (8 e 9)'),
      n('Doações e subvenções para custeio e investimento: resultado, conforme NBC TG 07 (9A)'),
      n('Imunidade tributária NÃO é subvenção: não vira receita no resultado (9B)', null, 'alerta'),
      n('Enquanto os requisitos não são atendidos, a contrapartida fica em conta específica do passivo'),
      n('Recursos com destinação específica (convênios, editais) em contas próprias e segregadas'),
      n('Gratuidades reconhecidas de forma segregada; por serviços, pelo valor efetivamente praticado'),
      n('Trabalho voluntário: pelo valor justo do serviço, como se tivesse havido desembolso (19)')]),
    n('Patrimônio', [n('Capital vira PATRIMÔNIO SOCIAL; lucro/prejuízo vira SUPERÁVIT/DÉFICIT'), n('O resultado é incorporado ao patrimônio social'), n('A parte do superávit com restrição de uso fica em conta específica do PL'), n('Dotação inicial da fundação = doação patrimonial')]),
    n('Demonstrações (22 a 25)', [n('Balanço, resultado, mutações do PL, fluxos de caixa e notas (NBC TG 26 ou Seção 3 da TG 1000)'), n('A DRE destaca gratuidades e trabalho voluntário, detalhados em nota por tipo de atividade'), n('Na DFC, doações ficam nas atividades operacionais')]),
    n('Notas explicativas (27)', [n('Contexto operacional, critérios de receita e despesa, subvenções e recursos restritos, eventos subsequentes, seguros, depreciação e gratuidades com dados quantitativos'), n('Relação dos tributos objeto de renúncia fiscal')]),
    n('Contas de compensação (26)', [n('Facultativas: isenções, gratuidades e outras informações')], 'nota')
  ]));

  M('ITG 2004', n('Entidade cooperativa', [
    n('Alcance (2 a 4)', [n('Todas as cooperativas, sem conflitar com BCB, ANS, ANEEL etc.; o que não está na ITG segue TG 1000 ou normas completas'), n('Atua por meio de atos cooperativos, prestando serviços aos associados sem objetivo de lucro')]),
    n('Ato cooperativo × não cooperativo (5 a 7)', [n('Ato cooperativo: interesse econômico do cooperado, conforme a lei'), n('Receitas, custos e despesas de atos NÃO cooperativos são registrados à parte'), n('A escrituração é SEGREGADA, por atividade, produto ou serviço, e a Demonstração de Sobras ou Perdas mostra cada resultado em separado', null, 'res')]),
    n('Investimentos (8 a 11)', [n('Em outra cooperativa: custo, com resultados por competência'), n('Em não cooperativa complementar: TG 18 e TG 19')]),
    n('Assistência técnica, educacional e social (12)', [n('Dispêndios vão ao resultado por competência e podem ser absorvidos pela reserva específica')]),
    n('Operações com associados (14 a 17)', [n('Estoques, contas a receber e a pagar em contas individualizadas'), n('Produto recebido a preço a fixar: estoque próprio a valor justo, contra passivo'), n('Ajuste de preço depois da baixa: ingresso ou dispêndio operacional')]),
    n('Patrimônio líquido (18 a 22)', [n('Capital social em quotas-partes individualizadas'), n('Associado demitido, eliminado ou excluído: valor passa para “capital a restituir” no passivo'), n('Sobras ou perdas ficam à disposição da Assembleia Geral'), n('Distribuição estatutária de sobras: passivo no fim do exercício'), n('Rateio de perdas entre associados: individual, no ativo')]),
    n('Notas explicativas (24)', [n('Saldos e transações com associados e não associados'), n('Fundos e reservas: natureza, finalidade e uso'), n('Perdas registradas no ativo: composição, forma e prazo'), n('Juros sobre quotas-partes, se previstos no estatuto')])
  ]));

  M('ITG 22', n('Incerteza sobre tratamento de tributos sobre o lucro (IFRIC 23)', [
    n('Quando se aplica', [n('A aceitação de um tratamento fiscal pela autoridade é INCERTA; complementa a TG 32 (1 a 4)')]),
    n('Passo 1 — considerar separado ou em conjunto? (6 e 7)', [n('Escolhe a abordagem que melhor prevê a resolução da incerteza')]),
    n('Passo 2 — premissa sobre a fiscalização (8)', [n('Presume que a autoridade examinará tudo o que pode examinar, com pleno conhecimento das informações')]),
    n('Passo 3 — a autoridade provavelmente aceita o tratamento? (9 a 12)', [
      n('SIM', [n('Lucro tributável, bases, prejuízos e alíquotas seguem o tratamento usado ou planejado na declaração')], 'sim'),
      n('NÃO (não é provável)', [n('Reflete o efeito da incerteza, por tratamento'), n('Método que melhor prevê a resolução: VALOR MAIS PROVÁVEL (resultados binários ou concentrados) ou VALOR ESPERADO (média ponderada pelas probabilidades)'), n('Julgamentos consistentes entre imposto corrente e diferido')], 'nao')]),
    n('Mudança de fatos e circunstâncias (13 e 14)', [n('Reavalia o julgamento; é mudança de ESTIMATIVA (TG 23)'), n('Eventos após o período seguem a TG 24'), n('Ex.: ação da autoridade, mudança de regra, fim do prazo de fiscalização; silêncio da autoridade, sozinho, dificilmente é mudança (A1 a A3)')]),
    n('Divulgação (A4 e A5)', [n('Julgamentos e premissas (TG 26)'), n('Se aceitação é provável, avaliar divulgar o efeito potencial como passivo contingente (TG 32, item 88)')]),
    n('Vigência e transição', [n('Exercícios iniciados a partir de 1º/1/2019'), n('Retrospectiva (TG 23) ou efeito cumulativo no saldo de abertura de lucros acumulados, sem reapresentar comparativos')], 'nota')
  ]));

  M('ITG 21', n('Transação em moeda estrangeira e adiantamento', [
    n('O problema', [n('TG 02 manda registrar a transação pela taxa à vista da data da transação'), n('Com pagamento/recebimento ANTECIPADO surge um ativo ou passivo NÃO monetário antes da receita/despesa — qual é a “data da transação”?')]),
    n('Resposta (consenso, itens 8 e 9)', [n('A data da transação é a data em que a entidade reconhece, pela primeira vez, o ativo ou passivo não monetário do adiantamento', null, 'res'), n('Vários adiantamentos → uma data de transação para CADA um', null, 'res')]),
    n('Alcance (4 a 6)', [n('Vale para qualquer adiantamento em moeda estrangeira, não só de receita'), n('Não se aplica se o item relacionado é medido a valor justo (ex.: ágio da TG 15), nem a tributos sobre o lucro e contratos de seguro')]),
    n('Transição', [n('Vigência: exercícios iniciados a partir de 1º/1/2018'), n('Retrospectiva (TG 23) ou prospectiva a partir do início do período de adoção')], 'nota')
  ]));

  M('CTG 2002', n('Laudo de avaliação emitido por profissional da contabilidade', [
    n('Quando é exigido', [n('Lei das S.A.: integralização de capital com bens, aumento de capital, incorporação, cisão, fusão, constituição de companhia fechada'), n('Código Civil, arts. 1.113 a 1.122: transformação, incorporação, fusão e cisão'), n('Outros reguladores')]),
    n('Tipos de laudo', [n('Patrimônio líquido contábil (todo o balanço)'), n('Acervo líquido contábil (ativos e passivos selecionados)'), n('Ajustado a preço de mercado (valor justo, TG 46)')]),
    n('Quem pode e independência', [n('Contador, auditor independente e perito contábil; seguem as normas de independência e conflito de interesses'), n('Quem escritura a entidade (ou outra do mesmo grupo) está IMPEDIDO de emitir o laudo (2)', null, 'nao'), n('Auditor das demonstrações pode emitir laudo a valor CONTÁBIL, mas NÃO a preço de mercado (3 e 4)', null, 'alerta')]),
    n('Trabalho', [n('Exame, vistoria, indagação, arbitramento, mensuração, avaliação e certificação (17)'), n('Verificar existência, avaliação, integridade, direitos e obrigações (7)'), n('Especialista externo: avaliar competência e objetividade (TA 620); a responsabilidade pelo laudo continua integral (34)')]),
    n('Documentação', [n('Permite a outro profissional experiente entender os procedimentos e conclusões'), n('Guardar laudo e documentação por 5 anos'), n('Representação formal da administração')]),
    n('Conclusão e limitações', [n('A RESSALVA não é admitida no laudo (28 a 32)', null, 'alerta'), n('Incerteza relevante: parágrafo de ÊNFASE'), n('Limitação conhecida antes de aceitar impede o trabalho; descoberta depois exige carta aos contratantes (25 e 26)'), n('PL negativo, por si só, não impede o laudo (33)')]),
    n('Estrutura mínima (35)', [n('Destinatário; dados do profissional (CRC, CPF/CNPJ); objetivo e data-base; metodologia; responsabilidades da administração e do profissional; conclusão com valores; local, data e assinatura; anexos e notas')])
  ]));
})();
